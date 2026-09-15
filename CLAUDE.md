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

Frontend build args (baked at image build time, not runtime):

- `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_API_KEY` — **see Known Issue #1; this is being removed**

There is no `config.py` content — it is an empty file. Env reading is scattered across
`backend/database.py`, `backend/graph_database.py`, and `backend/routers/ask.py`.

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
and keeps the Terraform modules structurally parallel. It also fixes Known Issue #1 as a
side effect rather than as a separate patch.

---

## Known issues that block production deployment

Fix these before the first public deploy. They are listed in priority order.

### 1. The backend API key is exposed to the public internet — CRITICAL

`frontend/app/lib/api.ts` reads `process.env.NEXT_PUBLIC_API_KEY`. Next.js inlines every
`NEXT_PUBLIC_*` variable into the JavaScript bundle sent to the browser. `frontend/Dockerfile`
bakes it in at build time via `ARG`/`ENV`, so it is also embedded in the image layers.

Consequence once deployed to a public URL: anyone can open DevTools, read the key, and call the
API directly — draining OpenAI credits and reading/writing the Postgres and Neo4j data. Rate
limiting does not help; `slowapi` limits per IP, and an attacker rotates IPs.

Fix: move the call server-side. Add a Next.js route handler (e.g. `app/api/[...path]/route.ts`)
that forwards to the backend and attaches `X-API-Key` from a **server-only** env var (no
`NEXT_PUBLIC_` prefix, injected at runtime, not build time). `apiFetch` then calls the relative
path `/api/...` with no key at all. The key never reaches the browser or the image.

Treat the current key as compromised the moment it is deployed — rotate it via `POST /api-keys/`
and deactivate the old one.

### 2. `POST /api-keys/` requires no authentication — CRITICAL

`routers/api_keys.py::create_api_key` has no `verify_api_key` dependency. Anyone who can reach the
backend can mint themselves a valid, active API key and then call every other endpoint.

This makes the entire API-key scheme ineffective if the backend is ever publicly reachable, and it
is strictly worse than a leaked key: rotating keys does not help, because an attacker simply mints
a new one. It is also why the backend-internal-only architecture above is a hard requirement rather
than a nicety.

Fix before public deploy: require an existing valid key to create another (`Depends(verify_api_key)`),
and bootstrap the very first key out-of-band — a one-off script run against the DB, not an open
endpoint.

### 3. Both external databases are currently unreachable — BLOCKER

Verified 2026-09-15. Nothing can be deployed or tested until these are restored:

- **Supabase** — `db.pgiajkwtkjawloptjmjx.supabase.co` returns NXDOMAIN; the shared pooler
  (`aws-0-ap-northeast-1`) answers but reports `FATAL: (ENOTFOUND) tenant/user ... not found`.
  Consistent with a free-tier project that has been paused or deleted for inactivity.
- **Neo4j Aura** — `6b0cab3d.databases.neo4j.io` returns NXDOMAIN. Aura Free pauses after 3 days
  idle and is **deleted** after 30. A non-resolving host suggests deletion, not a pause.

The backend cannot start in this state: `create_all` runs at import (see #5) and will raise
`OperationalError`. Note the Supabase region was `ap-northeast-1` (Tokyo) — pick the cloud region
to match whatever the restored instances use.

### 4. CORS origins are hardcoded to localhost

`main.py` sets `allow_origins=["http://localhost:3000", "http://localhost"]`. Any deployed frontend
on a real hostname will be blocked. Make it env-driven before deploying.

Note this becomes largely moot once Known Issue #1 is fixed: with the Next.js server-side proxy the
browser only ever calls its own origin, so there is no cross-origin request to authorize. Do not
"fix" it by setting `allow_origins=["*"]` — combined with #2 that is a fully open API.

### 5. `neo4j+ssc://` disables TLS certificate verification

`.env.example` uses `neo4j+ssc://` with a comment noting it works around a local network/TLS issue.
`ssc` = "self-signed certificate" — it encrypts but does not verify the server identity, so it is
vulnerable to man-in-the-middle. Use `neo4j+s://` in all cloud environments. If it fails there,
that is a real problem to diagnose, not to work around.

### 6. Schema creation runs at import time

`backend/main.py` calls `Base.metadata.create_all(bind=engine)` at module import. Every cold start
and every new autoscaled task connects to Postgres and attempts DDL before serving traffic. If the
DB is briefly unreachable the container crash-loops. It also means schema changes ship implicitly
with a deploy, with no migration history and no rollback.

For now this is tolerated, but it means: **cold starts require DB reachability**, so configure
generous startup probe / health check grace periods. Longer term this belongs in Alembic migrations
run as a one-off job.

### 7. `requirements.txt` hygiene

The file begins with a UTF-8 BOM (`\ufeff` before `annotated-doc`), which some `pip` versions
choke on. `slowapi` is unpinned, so builds are not reproducible. `psycopg2-binary` is used — fine
for now, but `psycopg[binary]` is the maintained path.

### 8. Next.js image is not optimized for containers

`frontend/next.config.ts` is empty. Setting `output: "standalone"` and using a multi-stage build
cuts the image from roughly 1 GB to under 200 MB. On scale-to-zero platforms (Cloud Run,
Container Apps) image size directly drives cold-start latency and you pay for the pull.

### 9. No tests, and `npm run lint` fails

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

## Conventions

- Resource naming: `cska-<env>-<component>` — e.g. `cska-prod-backend`, `cska-dev-frontend`.
- Environments: `dev` and `prod` only.
- Every cloud resource carries tags/labels: `project=cska`, `env=<env>`, `managed-by=terraform`,
  `owner=saurabhkamal`.
- All infrastructure is Terraform. Nothing is created by hand in a web console — if it was, it
  is invisible to `terraform plan` and will be silently destroyed or duplicated later.
- Infra lives in `infra/aws/`, `infra/azure/`, `infra/gcp/`, with shared pieces in `infra/modules/`.
