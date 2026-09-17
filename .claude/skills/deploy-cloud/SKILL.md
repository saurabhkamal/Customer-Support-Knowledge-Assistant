---
name: deploy-cloud
description: Deploy the cska Customer Support Knowledge Assistant (FastAPI backend + Next.js frontend) to AWS, Azure, or GCP using Terraform and container images. Use when asked to deploy, provision infrastructure, set up CI/CD, roll back a release, or troubleshoot a cloud environment for this project. Covers AWS App Runner, Azure Container Apps, and Cloud Run, plus GitHub Actions OIDC.
---

# Deploying cska to AWS, Azure, or GCP

Read `.claude/rules/cloud-deployment.md` before acting. Those rules bind this procedure; where they
conflict with anything below, they win.

Deploy **one cloud at a time**, and **`dev` before `prod`**, always.

---

## Target architecture

Two services, not three. nginx is a local-development concern and does not go to the cloud — every
platform below provides ingress, TLS, and routing natively.

```
Internet → [provider ingress + managed TLS]
             → frontend  (public, Next.js :3000)
                  └─ route handler proxies /api/* → backend, attaching X-API-Key server-side
             → backend   (INTERNAL INGRESS ONLY, FastAPI :8000)
                  → Supabase Postgres · Neo4j Aura · OpenAI
```

Two non-negotiables, both verified at the end of every deploy:

1. **The backend is never publicly reachable.** Only the frontend service calls it.
2. **The API key never reaches the browser.** It is a runtime, server-only env var on the frontend.

Supabase and Neo4j Aura are managed and external. They are never provisioned, migrated, or
destroyed by this skill.

---

## Phase 0 — Preflight (do this every time, it is cheap)

Stop and report if any check fails. Do not proceed on a partial preflight.

1. **Repo is clean and current** — `git status` clean, on `main` or a deliberate feature branch,
   synced with `origin`. Nothing deploys from uncommitted state.

2. **Code blockers are resolved.** Confirm in the working tree, do not assume:
   - Root `Dockerfile` (empty, 0 bytes) is deleted — cloud builders auto-detect it and fail.
   - `.dockerignore` exists at root and in `frontend/`, and excludes `.env`, `venv/`,
     `node_modules/`, `__pycache__/`, `.next/`, `backend/logs/`, `.git/`.
     **An image containing `.env` is a secret leak — check this before any registry push.**
   - The frontend server-side proxy is intact: `app/api/[...path]/route.ts` exists, no
     `NEXT_PUBLIC_` secret anywhere, `next.config.ts` still sets `skipTrailingSlashRedirect: true`,
     and nginx does not route `/api/` to the backend. See the FIXED section in CLAUDE.md.
   - `BACKEND_URL` and `BACKEND_API_KEY` are set as **runtime** env on the frontend service.
   - `APP_USERNAME`, `APP_PASSWORD_HASH`, `SESSION_SECRET` are set as **runtime** env on the
     frontend service — the dashboard login gate (`proxy.ts`). A missing `SESSION_SECRET` doesn't
     fail the build; it fails every login attempt at runtime, so confirm it's actually present in
     the deployed environment, not just in a local `.env.local`.
   - `NEO4J_URI` uses `neo4j+s://`, not `neo4j+ssc://`.
   - `requirements.txt` BOM stripped, `slowapi` pinned.
   - `frontend/next.config.ts` sets `output: "standalone"` and the Dockerfile is multi-stage.

3. **Authenticated to the right account** — run the §1 verification command for the target cloud
   and *show the user the account/subscription/project ID*. Deploying to the wrong account is
   easy and expensive.

4. **Secrets are staged in the cloud's secret store**, not in a tfvars file, not in the image.
   Five backend secrets: `DATABASE_URL`, `NEO4J_URI`, `NEO4J_USERNAME`, `NEO4J_PASSWORD`,
   `OPENAI_API_KEY`. Four frontend secrets: `BACKEND_API_KEY`, `APP_USERNAME`,
   `APP_PASSWORD_HASH`, `SESSION_SECRET`. Verify by listing names only — `APP_PASSWORD_HASH` is
   a hash, not a plaintext password, but still never worth printing.

5. **Budget alert exists** in the target cloud. Create it before the app, not after.

6. **Region chosen to match the data.** Supabase and Neo4j Aura already live in a region; every
   `/ask` makes multiple round trips to both, so a mismatched region adds latency to every request.
   Confirm the region with the user rather than defaulting.

7. **Rollback path known** — for a redeploy, record the currently-running revision/task-definition
   identifier before changing anything.

---

## Phase 1 — Build and push

```bash
TAG=$(git rev-parse --short HEAD)
```

Build both images tagged with the commit SHA. **Never deploy `:latest`** — it makes rollback
ambiguous and makes "what is running in prod?" unanswerable.

Build for `linux/amd64` explicitly. Apple Silicon and some Windows setups default to `arm64`, which
produces an image that pulls fine and then crash-loops on an amd64 platform with an
exec-format error that is not obvious from the logs.

```bash
docker build --platform linux/amd64 -f backend/Dockerfile  -t <registry>/cska-backend:$TAG  .
docker build --platform linux/amd64 -f frontend/Dockerfile -t <registry>/cska-frontend:$TAG ./frontend
```

Before pushing, confirm the image does not contain `.env`:

```bash
docker run --rm <registry>/cska-backend:$TAG ls -a /app | grep -i '^\.env$' && echo "LEAK — do not push"
```

Push, then capture the immutable digest (`@sha256:...`) and deploy by digest.

---

## Phase 2 — Provision (Terraform)

```
infra/
├── modules/          # shared, cloud-agnostic wiring where practical
├── aws/{dev,prod}/
├── azure/{dev,prod}/
└── gcp/{dev,prod}/
```

Remote state, separate per cloud and per environment, per rule §5. Run `init` → `validate` →
`fmt` → `plan`. **Read the plan.** A plan that destroys or replaces something unexpected is a
🔴 stop condition, not a prompt to add `-auto-approve`.

In `dev`, apply if the plan is clean. In `prod`, present the plan summary and cost delta, then wait.

### AWS — App Runner

Chosen over ECS Fargate + ALB specifically **because this deployment is temporary** (stood up to
demo, then torn down) — see the note in project memory on deployment purpose. ECS + ALB cannot
scale to zero: the ALB alone bills a fixed ~$17–22/mo whether or not anyone is looking at it, and
Fargate tasks bill continuously. App Runner bills per-request with idle-cheap billing, which suits
something that runs for a day or two and then gets destroyed. The path-routing the ALB used to
justify is also now moot — the Next.js proxy already does that routing, so the ALB would only be
providing TLS, which App Runner provides natively anyway.

- **ECR** — two repos, scan-on-push on, lifecycle policy to expire untagged images.
- **Backend service** — private ingress via a **VPC ingress connection**, reachable only from
  inside the VPC — not from the public internet. This is the App Runner equivalent of Cloud Run's
  `--ingress internal` / Container Apps' `ingress.external = false`.
- **Frontend service** — public ingress (App Runner's default), calls the backend over the VPC
  ingress connection using its private endpoint URL as `BACKEND_URL`.
- **Networking** — App Runner needs a VPC connector to reach the backend's private ingress and to
  reach Secrets Manager via VPC endpoint if avoiding public egress; in `dev`, public egress
  (App Runner's default outbound path) to Supabase/Neo4j/OpenAI is fine and avoids a NAT gateway
  entirely — there is no NAT bill on this path, which is a real cost advantage over the ECS design.
- **Secrets Manager** — referenced in each service's runtime environment secrets configuration,
  never baked into the image or the `apprunner.yaml`.
- **Health check** — App Runner's built-in health check on `/health`, with a startup grace period
  generous enough for `create_all` to reach Postgres on cold start (Known Issue #4 in CLAUDE.md).
  Too short and the instance is recycled mid-startup and crash-loops.
- **Auto scaling configuration** — set max size explicitly; App Runner's concurrency-based scaling
  still needs an upper bound so a traffic spike (or a bug) can't scale unboundedly.
- **CloudWatch Logs** — App Runner ships logs there automatically; set retention (default is
  never-expire, which bills forever).

### Azure — Container Apps

- **ACR** — Basic tier is sufficient. Build with `az acr build` to skip the local push.
- **Container Apps Environment** — one per env, both apps inside it.
- **Backend app** — `ingress.external = false`. It gets an internal FQDN reachable only from within
  the environment. This single setting is what keeps the backend private; verify it after deploy.
- **Frontend app** — `ingress.external = true`, target port 3000. Azure supplies TLS on the
  `*.azurecontainerapps.io` hostname automatically.
- **Key Vault** — secrets referenced via the Container App's managed identity. Grant the identity
  `Key Vault Secrets User`, not Officer, at runtime.
- **Scaling** — `min_replicas = 0` in dev. Set `max_replicas` explicitly; never leave it unbounded.
- **Probes** — liveness and readiness on `/health`, with an `initialDelaySeconds` that accommodates
  the import-time DB connection.

### GCP — Cloud Run

The cleanest fit of the three: Cloud Run is scale-to-zero, TLS-terminated, and private-by-default.

- **Artifact Registry** — one Docker repo, e.g. `cska`.
- **Backend service** — `--ingress internal` and `--no-allow-unauthenticated`. The frontend's
  service account is granted `roles/run.invoker` on it and calls it with an OIDC identity token.
  Two independent layers keeping the backend private.
- **Frontend service** — `--allow-unauthenticated`, port 3000.
- **Secret Manager** — mounted via `--set-secrets`. Runtime service accounts get
  `roles/secretmanager.secretAccessor` on the specific secrets, not project-wide.
- **Service accounts** — one per service, purpose-built. Never the default compute SA, which is
  broadly privileged.
- **Scaling** — `--min-instances 0` in dev, `--max-instances` always set.
- **Startup probe** on `/health` with a raised failure threshold, again for the import-time DB connect.

---

## Phase 3 — Verify

The deploy is **not done** until all nine pass. Report each explicitly.

1. `GET https://<frontend-url>/` **307-redirects to `/login`** — a bare 200 here means the login
   gate (`proxy.ts`) isn't running, not that the deploy is healthier.
2. Logging in at `/login` with the real credentials succeeds and lands back on `/`.
3. `GET /health` on the backend returns `{"status":"ok"}` — reached *through* the frontend or from
   inside the network, never from a public backend URL.
4. **The backend is not publicly reachable.** Attempt to curl the backend's direct URL from outside.
   It must fail — connection refused, 403, or DNS not resolving. **If it returns 200, the deploy is
   a security failure: roll back immediately.**
5. **No API key in the client bundle.** Fetch the deployed frontend's JS and grep for the key
   prefix. Any match means Known Issue #1 has regressed — roll back. Same check for the login
   password: it should never appear anywhere except as `APP_PASSWORD_HASH` in the secret store.
6. **`/api/*` without a session cookie returns 401 JSON, not a redirect.** Confirms `proxy.ts` is
   guarding the API proxy itself, not just page navigation — this is the check that would have
   caught a login screen that looks real but doesn't actually block data access.
7. One authenticated end-to-end path works: load a record list; confirm Postgres is reached.
8. One `/ask` call returns a grounded answer — this exercises pgvector, Neo4j, and OpenAI together,
   and is the only check that proves all three external dependencies are wired correctly.
9. Logs are clean for 2 minutes, and no container is restarting. A crash-loop can look like a
   working deploy for the first 30 seconds.

---

## Phase 4 — CI/CD (GitHub Actions, OIDC)

Use **OIDC federation** in every cloud. Do not store long-lived cloud keys in GitHub secrets — a
leaked repo secret is a permanent credential; an OIDC token is short-lived and scoped.

- AWS — IAM OIDC provider + role with trust policy on `token.actions.githubusercontent.com`
- Azure — workload identity federation on an app registration
- GCP — Workload Identity Federation pool + provider

Scope the trust policy to **this repo and specific branch/environment**. A trust policy scoped to
`repo:*` lets any repository in the org assume the role.

Pipeline: lint/test → build → push by SHA → deploy `dev` → verify (Phase 3) → **manual approval
gate** → deploy `prod` → verify. Use a GitHub Environment with required reviewers for the prod gate;
that gate is the enforcement of rule §3, so it is not optional.

---

## Rollback

Know the previous revision before deploying. All three platforms roll back by pointing at the
prior immutable revision — which only works because images are tagged by digest, not `:latest`.

- **AWS** — `aws apprunner update-service` back to the previous image digest/tag.
- **Azure** — `az containerapp revision activate` on the prior revision; deactivate the bad one.
- **GCP** — `gcloud run services update-traffic --to-revisions=<prev>=100`.

Roll back first, diagnose second. Do not debug a broken deploy while it is serving traffic.

---

## Troubleshooting

| Symptom | Likely cause |
|---|---|
| Container starts then exits immediately | `create_all` at import can't reach Postgres (Known Issue #5); or Supabase is not accepting the cloud egress IP |
| `exec format error` | Image built for arm64 — rebuild with `--platform linux/amd64` |
| Health check fails but the app logs look fine | Grace period too short for the import-time DB connect; the platform kills it mid-startup |
| Neo4j TLS handshake failures | `neo4j+ssc://` left in config, or Aura not reachable from this egress — fix properly, do not downgrade to `ssc` |
| Frontend loads, all API calls 401 | Proxy route handler isn't attaching `X-API-Key`, or the key was rotated in the store but the revision wasn't restarted |
| Frontend loads, API calls 404/502 | Backend internal DNS name wrong, or frontend SA lacks `run.invoker` (GCP) / SG rule missing (AWS) |
| Works in dev, fails in prod | Nearly always a secret present in dev's store but missing in prod's |
| Sudden OpenAI spend | Check Known Issue #1 — an exposed key is the most likely cause |
