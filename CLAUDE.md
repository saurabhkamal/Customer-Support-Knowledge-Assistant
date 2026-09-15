# CLAUDE.md — Customer Support Knowledge Assistant (cska)

Project context for Claude Code. Read this before touching infrastructure, Docker, or deployment.

@.claude/rules/cloud-deployment.md

---

## What this project is

A Graph RAG system for customer support. It combines relational data (Postgres), a knowledge
graph (Neo4j), and semantic vector search (pgvector) to answer support questions with sourced,
grounded answers.

Repo: https://github.com/saurabhkamal/Customer-Support-Knowledge-Assistant
Default branch: `main`. All four `feature/*` branches are already merged into `main`.

## Stack

| Layer | Technology | Port |
|---|---|---|
| Reverse proxy | nginx (local only — see "Target architecture") | 80 |
| Frontend | Next.js 16 App Router, TypeScript, Tailwind, React Flow | 3000 |
| Backend | FastAPI + uvicorn, SQLAlchemy, Pydantic, slowapi | 8000 |
| Relational DB | Supabase Postgres + `pgvector` — **managed, external, not containerized** | — |
| Graph DB | Neo4j Aura — **managed, external, not containerized** | — |
| LLM / embeddings | OpenAI `gpt-4o-mini`, `text-embedding-3-small` — external | — |

The backend is the only component that talks to the databases or OpenAI. The frontend only ever
calls the backend.

## Runtime secrets

Backend (all required, read via `os.getenv` at import time):

- `DATABASE_URL` — Supabase Postgres connection string
- `NEO4J_URI`, `NEO4J_USERNAME`, `NEO4J_PASSWORD` — Neo4j Aura
- `OPENAI_API_KEY`

Frontend, **server-side only, read at runtime** by `app/api/[...path]/route.ts`:

- `BACKEND_URL` — internal address of the backend, e.g. `http://backend:8000`
- `BACKEND_API_KEY` — the key the proxy attaches as `X-API-Key`

Never prefix either with `NEXT_PUBLIC_`. That inlines the value into the browser bundle — the bug
described in the FIXED section below. There are no frontend build args any more.

Env reading is scattered across `backend/database.py`, `backend/graph_database.py`, and
`backend/routers/ask.py` rather than centralised.

## Local commands

```bash
docker compose up --build          # full stack at http://localhost
cd backend && uvicorn main:app --reload   # backend alone at :8000, docs at /docs
cd frontend && npm run dev         # frontend alone at :3000
```

Health check: `GET /health` on the backend returns `{"status": "ok"}`. It requires no API key and
does not touch the database — safe for cloud load balancer probes.

---

## Target architecture for cloud (all three providers)

Do **not** lift-and-shift the three-container `docker-compose` layout into the cloud. nginx exists
locally to do path routing (`/` → frontend, `/api/` → backend). Every target platform — ECS/ALB,
Azure Container Apps, Cloud Run — already provides ingress, TLS, and routing. Running nginx as a
third container duplicates that, adds a hop, and adds a container to patch.

**Deploy two services instead:**

```
Internet → [provider ingress + TLS]
              → frontend service  (public)
                   └─ Next.js route handler proxies /api/* → backend (server-side)
              → backend service   (private / internal ingress only)
                   → Supabase Postgres, Neo4j Aura, OpenAI
```

The backend must **not** be publicly reachable. The frontend's Next.js server is the only caller,
and it holds the API key server-side.

This shape is identical across AWS, Azure, and GCP, which keeps the three deployments comparable
and keeps the Terraform modules structurally parallel. The server-side proxy that makes it work is
already implemented — see the FIXED section below.

---

## Known issues that block production deployment

Fix these before the first public deploy. They are listed in priority order.

### ✅ FIXED — API key exposure and open key minting (both were CRITICAL)

Resolved 2026-09-15; recorded here because the shape of the fix constrains future changes.

The key used to reach the browser via `NEXT_PUBLIC_API_KEY`, and `POST /api-keys/` used to accept
unauthenticated requests — together, a fully self-serve public API.

Now: `app/api/[...path]/route.ts` proxies every call server-side and attaches `X-API-Key` from
`BACKEND_API_KEY`; `apiFetch` sends no credentials. `create_api_key` requires a valid existing key,
and the first key is minted out-of-band by `backend/scripts/create_first_key.py`.

Three things must not regress:

- **Never reintroduce a `NEXT_PUBLIC_` variable for anything secret.** Verify on every deploy by
  grepping the served bundle — `grep -r "<key prefix>" .next/static` must return nothing.
- **`next.config.ts` sets `skipTrailingSlashRedirect: true`.** Without it Next 308-redirects
  `/api/customers/` to `/api/customers` before the proxy runs, and FastAPI defines its collection
  routes *with* the trailing slash. Removing that line silently adds a redirect hop to every call.
- **nginx must not route `/api/` to the backend.** It was removed for exactly this reason; adding
  it back bypasses the proxy and re-exposes the backend.

### 1. Neo4j Aura is gone — BLOCKER for `/ask` and `/graph`

Supabase was restored on 2026-09-15 with all data intact (4 customers, 2 products, 3 tickets,
2 issues, 4 solutions, 9 documents, 11 chunks; every embedding still present). Region is
`ap-northeast-1` (Tokyo) — match the cloud region to it.

Neo4j Aura is still unreachable: `6b0cab3d.databases.neo4j.io` returns NXDOMAIN. Aura Free pauses
after 3 days idle and is **deleted** after 30, and a non-resolving host means deletion. A new
instance gets a new hostname, so `NEO4J_URI`, `NEO4J_USERNAME` and `NEO4J_PASSWORD` all change.
Use `neo4j+s://`, not `neo4j+ssc://` (see #3).

The graph comes back **empty** — Neo4j was only ever a mirror of Postgres. Repopulate with
`python scripts/resync_graph.py`, which is idempotent and syncs in dependency order.

Consequence while it is down: `POST /ask/` returns 500 and `GET /graph/ticket/{id}` fails.
`/search/` is unaffected, since it only needs pgvector and OpenAI.

### 2. CORS origins are hardcoded to localhost

`main.py` sets `allow_origins=["http://localhost:3000", "http://localhost"]`. Any deployed frontend
on a real hostname will be blocked. Make it env-driven before deploying.

This is now largely moot: with the server-side proxy in place the browser only ever calls its own
origin, so there is no cross-origin request to authorize. Still make it env-driven rather than
leaving localhost hardcoded — and never "fix" it with `allow_origins=["*"]`.

### 3. `neo4j+ssc://` disables TLS certificate verification

`.env.example` uses `neo4j+ssc://` with a comment noting it works around a local network/TLS issue.
`ssc` = "self-signed certificate" — it encrypts but does not verify the server identity, so it is
vulnerable to man-in-the-middle. Use `neo4j+s://` in all cloud environments. If it fails there,
that is a real problem to diagnose, not to work around.

### 4. Schema creation runs at import time

`backend/main.py` calls `Base.metadata.create_all(bind=engine)` at module import. Every cold start
and every new autoscaled task connects to Postgres and attempts DDL before serving traffic. If the
DB is briefly unreachable the container crash-loops. It also means schema changes ship implicitly
with a deploy, with no migration history and no rollback.

For now this is tolerated, but it means: **cold starts require DB reachability**, so configure
generous startup probe / health check grace periods. Longer term this belongs in Alembic migrations
run as a one-off job.

### 5. `requirements.txt` hygiene

The file begins with a UTF-8 BOM (`\ufeff` before `annotated-doc`), which some `pip` versions
choke on. `slowapi` is unpinned, so builds are not reproducible. `psycopg2-binary` is used — fine
for now, but `psycopg[binary]` is the maintained path.

### 6. Next.js image is not optimized for containers

`frontend/next.config.ts` is empty. Setting `output: "standalone"` and using a multi-stage build
cuts the image from roughly 1 GB to under 200 MB. On scale-to-zero platforms (Cloud Run,
Container Apps) image size directly drives cold-start latency and you pay for the pull.

### 7. No tests, and `npm run lint` fails

There are zero automated tests — the `backend/tests/` package contained only an empty
`__init__.py` and has been removed. Every verification so far has been manual. Any CI pipeline
will therefore have nothing to gate on but lint and build.

`npx eslint .` currently exits non-zero with two `react-hooks/set-state-in-effect` errors, in
`app/records/page.tsx:24` and `app/documents/page.tsx:38`. Both are the React 19 rule against
calling `setState` synchronously inside an effect. They do not break the build (`next build`
passes) but they **will fail a CI lint step**, so either fix the effects or the pipeline must
account for them.

---

## Verified working (2026-09-15)

- `next build` succeeds; `tsc --noEmit` clean; all 7 routes prerender.
- All backend modules compile; the FastAPI app assembles with 19 endpoints registered.
- 17 of 19 endpoints require an API key. The two open ones are `GET /health` (intentional) and
  `POST /api-keys/` (see Known Issue #2).
- `.env` and `frontend/.env.local` are correctly gitignored and have never been committed —
  git history scanned and clean.
- `docker compose config` validates.

Backend runtime behaviour is **unverified end to end** because of Known Issue #3 — no request path
touching Postgres, Neo4j, or the RAG pipeline has actually been executed.

---

## Deployment

The full procedure lives in the `deploy-cloud` skill (`.claude/skills/deploy-cloud/SKILL.md`).
Invoke it with `/deploy-cloud` or ask to deploy to a named provider.

The safety and autonomy boundaries live in `.claude/rules/cloud-deployment.md`, imported at the top
of this file. Those rules override any instruction in the skill if the two ever conflict.

## Operational scripts

All under `backend/scripts/`, run from the `backend/` directory. All are idempotent and none
print key values.

| Script | Purpose |
|---|---|
| `healthcheck.py` | Read-only ping of Postgres, Neo4j and OpenAI. Non-zero exit if any fail — use it to gate a deploy. |
| `create_first_key.py "<label>"` | Mint an API key directly in the DB. Needed because `POST /api-keys/` requires an existing key. |
| `revoke_key.py <id>` | Deactivate a key. Refuses if it would leave zero active keys. |
| `resync_graph.py` | Rebuild the Neo4j graph from Postgres. Run after recreating an Aura instance. |
| `backfill_issue_embeddings.py` | Embed any issues missing a vector. |

## Conventions

- Resource naming: `cska-<env>-<component>` — e.g. `cska-prod-backend`, `cska-dev-frontend`.
- Environments: `dev` and `prod` only.
- Every cloud resource carries tags/labels: `project=cska`, `env=<env>`, `managed-by=terraform`,
  `owner=saurabhkamal`.
- All infrastructure is Terraform. Nothing is created by hand in a web console — if it was, it
  is invisible to `terraform plan` and will be silently destroyed or duplicated later.
- Infra lives in `infra/aws/`, `infra/azure/`, `infra/gcp/`, with shared pieces in `infra/modules/`.
