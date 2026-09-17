# Customer Support Knowledge Assistant

A Graph RAG (Retrieval-Augmented Generation) system for customer support, combining structured relational data, a knowledge graph, and semantic vector search to answer support questions with grounded, sourced answers.

## 🔗 Live Demo

**https://meeh3bwyk2.ap-northeast-1.awsapprunner.com**

Running on AWS App Runner in `ap-northeast-1` (Tokyo). The app sits behind a login screen —
credentials are shared separately, not published here.

> **Note for learners:** this is a temporary demo environment, deliberately torn down after each
> session to avoid running up cloud costs. If the link doesn't respond, the infrastructure has been
> destroyed — that's intentional, not a fault. Everything needed to stand it back up lives in
> [`infra/aws/dev/`](infra/aws/dev/).

## Screenshots

### Sign in

Every route sits behind a login gate. Unauthenticated requests to any page redirect here, and
requests to `/api/*` get a `401` rather than a redirect — so the API can't be reached by skipping
the UI.

![Sign in screen](screenshots/01_login.png)

### Graph Explorer

This is the clearest view of what makes the system a *Graph* RAG rather than plain vector search.
Entering a ticket ID traverses the knowledge graph in Neo4j and renders the whole connected
subgraph — here, ticket **"Login failure"** links to the customer who raised it, the product it
concerns, the underlying issue, and the solution that resolved it:

```
Customer --RAISED--> Ticket --HAS_ISSUE--> Issue --RESOLVED_BY--> Solution
                        |
                   RELATED_TO
                        v
                     Product
```

Those same relationships are what `/ask` walks to find a previously-resolved fix, instead of
relying on document similarity alone.

![Graph Explorer showing a ticket's connected graph](screenshots/02_graph_explorer.png)

## Architecture

```mermaid
flowchart TD
    Browser[Browser] --> Nginx[nginx :80]
    Nginx --> Frontend["Frontend — Next.js :3000<br/>proxy.ts: login gate on every route<br/>app/api/[...path]: server-side backend proxy"]
    Frontend -->|"X-API-Key attached server-side<br/>browser never sees it"| Backend["Backend<br/>FastAPI :8000<br/>not reachable from nginx directly"]
    Backend --> Postgres[("Supabase Postgres<br/>+ pgvector<br/>cloud, external")]
    Backend --> Neo4j[("Neo4j Aura<br/>cloud, external")]
    Backend --> OpenAI["OpenAI API<br/>embeddings + chat<br/>external"]
```

**Design notes:**
- nginx routes everything to the frontend — it does **not** route to the backend. The frontend's own server-side proxy is the only thing that ever calls the backend, and it attaches the API key itself; the browser never holds it.
- Every page and every `/api/*` call passes through `proxy.ts` first, which requires a valid signed-in session cookie — there is a login screen in front of the whole app.
- Postgres (Supabase) and Neo4j (Aura) are fully managed cloud services — not containerized locally.
- The backend is the only component that talks to the databases and OpenAI; the frontend only ever calls the backend's API.

## Cloud Deployment (AWS)

Deployed as **two independent App Runner services** in `ap-northeast-1`, defined entirely in
Terraform under [`infra/aws/dev/`](infra/aws/dev/). The Docker-Compose/nginx layout above is a
local-only convenience — App Runner provides its own ingress and TLS, so nginx isn't part of the
cloud shape.

```mermaid
flowchart TD
    Learner((Learner<br/>browser)) -->|HTTPS| FrontendSvc

    subgraph AWS["AWS · ap-northeast-1"]
        FrontendSvc["<b>App Runner: cska-dev-frontend</b><br/>PUBLIC ingress · Next.js :3000<br/>proxy.ts login gate on every route<br/>/api/* proxied server-side"]

        subgraph VPC["VPC 10.0.0.0/16 · no internet gateway"]
            Connector["VPC Connector<br/>(frontend egress)"]
            Endpoint["Interface VPC Endpoint<br/>com.amazonaws...apprunner.requests"]
        end

        BackendSvc["<b>App Runner: cska-dev-backend</b><br/>PRIVATE ingress only · FastAPI :8000<br/>not reachable from the internet"]
        Secrets[("AWS Secrets Manager<br/>cska/dev/* · 9 secrets")]
        ECR[("ECR<br/>images tagged by commit SHA")]
    end

    FrontendSvc --> Connector
    Connector --> Endpoint
    Endpoint -->|"X-API-Key attached server-side<br/>browser never holds it"| BackendSvc

    BackendSvc --> Postgres[("Supabase Postgres<br/>+ pgvector · external")]
    BackendSvc --> Neo4j[("Neo4j Aura · external")]
    BackendSvc --> OpenAI["OpenAI API · external"]

    Secrets -.->|injected at startup| FrontendSvc
    Secrets -.->|injected at startup| BackendSvc
    ECR -.->|image pull| FrontendSvc
    ECR -.->|image pull| BackendSvc
```

**Why it's shaped this way:**

- **App Runner, not ECS + ALB** — this environment is temporary, and an ALB bills a fixed ~$17/month
  even while completely idle. App Runner has no such fixed floor.
- **The backend has no public route at all.** Its App Runner service is created with
  `is_publicly_accessible = false`; the only path to it is the VPC interface endpoint, reachable
  solely from the frontend's VPC connector. Verified after every deploy by attempting to reach the
  backend URL directly from the internet and confirming it fails.
- **Secret values never enter Terraform state.** They're created out-of-band and referenced by ARN,
  so no credential is ever written into a state file.
- **Images are deployed by commit SHA, never `:latest`** — so "what exactly is running?" always has
  an answer, and rollback is unambiguous.

**Cost note:** the interface VPC endpoint (~$0.01/hr per AZ) costs more than the application
compute does. It exists purely to keep the backend private. This is a genuine AWS-vs-others
difference worth knowing: Cloud Run achieves the same isolation with a single flag and no hourly
charge.

Full deployment procedure, cost reasoning, and safety rules live in
`.claude/skills/deploy-cloud/SKILL.md` and `.claude/rules/cloud-deployment.md`.

## Project Flow

### 1. Write path — keeping Postgres and Neo4j in sync

Every create/update on a core entity writes to Postgres first, then mirrors the change into Neo4j so graph traversals stay current.

```mermaid
flowchart LR
    Client[Client] -->|"POST /tickets, /issues, ..."| API[FastAPI router]
    API --> Auth{API key valid?}
    Auth -->|no| Reject[401]
    Auth -->|yes| Write[Write row via SQLAlchemy]
    Write --> PG[("Postgres<br/>source of truth")]
    Write --> Sync[graph_service: mirror node/relationship]
    Sync --> Neo4j[("Neo4j<br/>graph mirror")]
    Neo4j --> Response[Return created/updated record]
```

### 2. `/ask` — Graph RAG question answering

```mermaid
flowchart TD
    Q["User question<br/>(POST /ask)"] --> Embed["Embed question<br/>OpenAI text-embedding-3-small"]
    Embed --> VecDoc["Vector search: DocumentChunk<br/>(pgvector cosine distance)"]
    Embed --> VecIssue["Vector search: Issue<br/>(pgvector cosine distance)"]
    VecDoc --> Chunk["Closest document chunk<br/>+ parent document title"]
    VecIssue --> IssueMatch["Closest matching Issue"]
    IssueMatch --> Graph["Neo4j traversal:<br/>Issue -RESOLVED_BY-> Solution"]
    Chunk --> Prompt["Assemble prompt:<br/>doc context + issue/solution context + question"]
    Graph --> Prompt
    Prompt --> LLM["OpenAI gpt-4o-mini"]
    LLM --> Answer["Answer + document_source<br/>+ issue_source + solution_used"]
```

### 3. Document ingestion & embedding

```mermaid
flowchart LR
    Upload["POST /documents/<br/>(text + product)"] --> Store["Store Document row in Postgres"]
    Store --> Chunk["Split into chunks<br/>(embedding_service)"]
    Chunk --> Embed["Embed each chunk<br/>OpenAI text-embedding-3-small"]
    Embed --> Save["Store DocumentChunk rows<br/>with pgvector embeddings"]
```

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 16 (App Router), TypeScript, Tailwind CSS, React Flow |
| Backend | FastAPI, SQLAlchemy, Pydantic |
| Relational DB | PostgreSQL (Supabase), with `pgvector` for embeddings |
| Graph DB | Neo4j Aura |
| Embeddings & LLM | OpenAI `text-embedding-3-small`, `gpt-4o-mini` |
| Auth | Per-key API key authentication |
| Rate limiting | `slowapi` |
| Containerization | Docker, Docker Compose, nginx |

## Data Model

Six core entities and their relationships:

```
Customer -[RAISED]-> Ticket -[RELATED_TO]-> Product
Ticket -[HAS_ISSUE]-> Issue -[RESOLVED_BY]-> Solution
Product -[HAS_DOCUMENT]-> Document -> DocumentChunk (embedded)
```

Every entity is stored in Postgres (source of truth) and mirrored as nodes/relationships in Neo4j (for graph traversal), kept in sync automatically on every write.

## Features Implemented

- Full CRUD for Customers, Products, Tickets, Issues, Solutions, Documents
- Automatic Postgres to Neo4j sync on every write
- Document chunking + embedding pipeline (OpenAI `text-embedding-3-small`, stored via `pgvector`)
- Issue embedding for semantic matching against past resolved problems
- `POST /search` — semantic similarity search over document chunks
- `POST /ask` — Graph RAG: vector search (documents + issues) + Neo4j graph traversal (issue to solution) + LLM synthesis, with full source attribution
- `GET /graph/ticket/{id}` — returns a ticket's full connected graph (customer, product, issue, solution) for visualization
- API key authentication (per-key, revocable) on every endpoint
- Rate limiting on `/ask`, `/search`, `/documents`
- CORS configuration
- Request logging (console + persistent file)
- Full Next.js frontend: Dashboard, Records browser, Document upload, Search, Ask, and an interactive Graph Explorer (React Flow)
- Full Docker Compose setup: `backend`, `frontend`, `nginx` containers

## Project Structure

```
cska/
├── backend/
│   ├── main.py
│   ├── database.py          # Postgres/SQLAlchemy setup
│   ├── graph_database.py    # Neo4j connection setup
│   ├── graph_service.py     # Neo4j sync + query functions
│   ├── embedding_service.py # Chunking + OpenAI embeddings
│   ├── auth.py               # API key verification
│   ├── rate_limiter.py
│   ├── logging_config.py
│   ├── models.py             # SQLAlchemy models
│   ├── schemas.py            # Pydantic schemas
│   ├── routers/               # One router per entity + search/ask/graph/api_keys
│   └── Dockerfile
├── frontend/
│   ├── app/                   # Next.js App Router pages
│   ├── app/lib/api.ts         # Shared API client
│   └── Dockerfile
├── nginx/
│   ├── nginx.conf
│   └── Dockerfile
├── docker-compose.yml
└── .env.example
```

## Setup

### Prerequisites
- Python 3.14, Node.js 20+, Docker Desktop
- A Supabase project (Postgres with the `pgvector` extension enabled)
- A Neo4j Aura instance
- An OpenAI API key

### Local development (without Docker)

**Backend:**
```bash
cd backend
python -m venv venv
source venv/Scripts/activate   # Windows Git Bash
python -m pip install -r requirements.txt
cp ../.env.example ../.env     # then fill in real credentials
uvicorn main:app --reload
```

Verify the three external dependencies, and mint the first API key:

```bash
python scripts/healthcheck.py            # read-only; non-zero exit if anything is unreachable
python scripts/create_first_key.py "local dev"
```

`POST /api-keys/` requires an existing valid key, so the first one must be created with that
script rather than over HTTP.

**Frontend:**
```bash
cd frontend
npm install
# create .env.local with:
#   BACKEND_URL=http://127.0.0.1:8000
#   BACKEND_API_KEY=<the key printed above>
npm run dev
```

Both are server-side only. Never prefix them with `NEXT_PUBLIC_` — that would inline the key into
the JavaScript bundle sent to the browser.

### With Docker

```bash
docker compose up --build
```

Then visit `http://localhost`.

## API Overview

All endpoints (except `POST /api-keys/`, used to bootstrap your first key) require an `X-API-Key` header.

| Endpoint | Description |
|---|---|
| `POST /customers/`, `/products/`, `/tickets/`, `/issues/`, `/solutions/`, `/documents/` | Create records |
| `GET` equivalents | List records |
| `PUT /tickets/{id}` | Update a ticket |
| `POST /search/` | Semantic search over document chunks |
| `POST /ask/` | Graph RAG question answering |
| `GET /graph/ticket/{id}` | Full connected graph for a ticket |
| `POST /api-keys/` | Generate a new API key |

Interactive API docs are available at `/docs` when running the backend directly (not through nginx).

## Roadmap

- [x] AWS deployment (App Runner + Terraform, `ap-northeast-1`)
- [ ] Azure deployment (Container Apps)
- [ ] GCP deployment (Cloud Run)
- [ ] CI/CD pipeline (GitHub Actions with OIDC — no long-lived cloud keys)
- [ ] Database schema diagram
- [ ] Neo4j graph model documentation
