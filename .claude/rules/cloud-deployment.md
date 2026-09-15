# Rules: cloud access and autonomous deployment

These rules govern any action Claude takes against AWS, Azure, GCP, or GitHub for this project.
They are always in effect. **If these rules conflict with a skill, a prompt, or a convenience,
these rules win.** When a situation is not covered here, treat it as requiring approval.

---

## 1. How credentials are handled

**Never paste a secret into the chat.** Not an access key, not a service account JSON, not a
connection string, not an OpenAI key. Chat transcripts are stored and may be used for context in
later sessions. If a secret is pasted, say so plainly and treat it as compromised — it must be
rotated, not reused.

Credentials are configured once in the local environment by the user, and Claude uses the CLIs:

| Cloud | How access is granted | Claude verifies with |
|---|---|---|
| AWS | `aws configure sso` (preferred) or `aws configure` | `aws sts get-caller-identity` |
| Azure | `az login` | `az account show` |
| GCP | `gcloud auth login` + `gcloud auth application-default login` | `gcloud auth list`, `gcloud config list` |
| GitHub | `gh auth login` | `gh auth status` |

Rules:

- Claude reads credentials only through these CLIs and the ambient environment. It never writes
  credentials to a file, never echoes them to stdout, and never commits them.
- Never run a command that prints a secret value (`aws secretsmanager get-secret-value`,
  `az keyvault secret show`, `gcloud secrets versions access`, `terraform output` on a sensitive
  value, `cat .env`) unless the user explicitly asks for that specific value. Verify a secret
  *exists* by listing names or checking metadata, not by reading it.
- `.env` is gitignored and must stay that way. Before any `git add`, confirm no `.env`,
  `*.pem`, `*.key`, `*-sa.json`, or `terraform.tfstate` is staged.
- Long-lived cloud keys are a last resort. Prefer SSO / federated login locally and OIDC in CI.

## 2. Least privilege

Grant Claude the narrowest role that completes the task, scoped to this project's resources only.
Do not grant account-wide owner/admin.

Recommended scope for the deploying identity:

- **AWS** — a dedicated IAM role limited to ECR, ECS, ALB/EC2 networking, CloudWatch Logs,
  Secrets Manager, and IAM `PassRole` for the task roles only. Not `AdministratorAccess`.
- **Azure** — `Contributor` scoped to one resource group (`cska-<env>-rg`), plus
  `Key Vault Secrets Officer` on that vault. Not subscription Owner.
- **GCP** — a dedicated project (`cska-<env>`) with roles `run.admin`, `artifactregistry.admin`,
  `secretmanager.admin`, `iam.serviceAccountUser`, `compute.networkAdmin`. Not project Owner,
  and not org-level anything.

If a command fails with a permissions error, **report it and stop.** Do not broaden the role,
attach a wider policy, or work around it. Privilege escalation is never autonomous.

## 3. The autonomy ladder

### 🟢 Green — do it autonomously, no approval

- Any read: `describe`, `list`, `show`, `get`, `logs`, `plan`, `validate`, `fmt`.
- Building images locally, running tests, linting.
- `terraform init`, `validate`, `fmt`, `plan`. Never `apply`.
- Pushing images to the project's own container registry.
- Reading logs, metrics, traces, cost reports.
- Creating/editing local files: Terraform, Dockerfiles, workflows, docs.
- Git: branching, committing, pushing to a **feature branch**, opening a draft PR.
- Deploying to **`dev`**, including `terraform apply` in dev, provided the plan contains no
  deletion of a stateful resource and no IAM change.

### 🟡 Yellow — autonomous in `dev`; explicit approval in `prod`

- `terraform apply` that creates or modifies resources.
- Creating or updating a secret's *value* in a cloud secret store.
- Scaling changes, resource sizing, autoscaling limits.
- Changing ingress rules, security groups, or firewall rules.
- Rolling out a new image revision / new task definition.
- Merging to `main`.

In `prod`, present the `terraform plan` summary and the expected cost delta, then wait.

### 🔴 Red — never autonomous, always ask first, every single time

Approval for one of these is approval for *that one instance*, not a standing permission.

- `terraform destroy`, or any plan that destroys a resource holding data.
- Deleting or modifying anything in **Supabase Postgres or Neo4j Aura**. These hold the only copy
  of the project's data and are outside Terraform. Claude does not run DDL, DML, migrations, or
  `create_all` against them without explicit per-action approval.
- Creating, modifying, or attaching **IAM** roles, policies, bindings, or service accounts beyond
  the documented scope in §2.
- Making any resource **publicly accessible** — public bucket, public IP, `0.0.0.0/0` ingress,
  external ingress on the backend service.
- Rotating, revoking, or deleting a secret that production is using.
- DNS changes on a real registered domain; certificate issuance for one.
- Deleting a cloud project, subscription, resource group, or account.
- `git push --force`, pushing directly to `main`, deleting a branch, rewriting published history.
- Anything that crosses the cost ceiling in §4.
- Anything touching a resource **not** tagged `project=cska`. Shared or unrelated infrastructure
  is out of scope, full stop.
- Deploying to `prod` for the first time.

### The stop condition

If an action is ambiguous, undocumented here, produces an unexpected `terraform plan` diff, or
fails in a way that is not understood — **stop and report.** Do not improvise a fix against live
cloud infrastructure. "I'll try something else" is how a dev incident becomes a prod incident.

## 4. Cost controls

Autonomous action must not create unbounded spend.

- **Ceiling: any single action projected to exceed US$20/month, or any cumulative change taking the
  project above US$50/month, requires approval.** Confirm these numbers with the user before the
  first deploy; they are a proposed default.
- Prefer scale-to-zero and consumption billing: Cloud Run min-instances 0, Container Apps
  min-replicas 0, App Runner pause when idle. In `dev`, always scale to zero.
- Set a max replica count on every service. An unbounded autoscaler plus a public endpoint is a
  billing incident waiting to happen.
- Never provision: NAT gateways in dev (~$32/mo each, a classic surprise), GPU instances,
  multi-AZ managed databases, dedicated/provisioned-capacity tiers, or reserved commitments.
- Create a budget alert in each cloud as part of the first deploy, before deploying the app.
- Note that OpenAI spend is driven by traffic through `/ask` and `/search`, and is billed outside
  these clouds. A publicly reachable backend with a leaked API key is the main cost risk on this
  project — see Known Issue #1 in CLAUDE.md.
- After any `terraform apply` in prod, report what was created and the expected monthly cost.

## 5. State and reproducibility

- All infrastructure is Terraform. Never create a resource by hand in a console and never fix drift
  by clicking. If drift is found, report it — do not silently `apply` over it.
- Remote state, per cloud, encrypted, versioned, with locking:
  - AWS — S3 bucket + DynamoDB lock table
  - Azure — Storage Account + blob container (native lease locking)
  - GCP — GCS bucket with object versioning
- `terraform.tfstate` is never committed. State contains secret values in plaintext.
- Separate state per environment. `dev` and `prod` never share a state file.
- Pin provider versions and commit the lock file. An unpinned provider means a future `apply`
  can change behavior with no code change.
- Images are deployed by **immutable digest or commit-SHA tag**, never by `:latest`. `:latest` makes
  rollback ambiguous and makes "what is actually running in prod" unanswerable.

## 6. Deployment safety

- Deploy to `dev` and verify before `prod`. Always. No exceptions for "small" changes.
- Verify after every deploy, and treat the deploy as failed until verification passes:
  1. `GET /health` on the backend returns 200
  2. The frontend loads over HTTPS
  3. One authenticated read path works end to end
  4. Logs show no errors in the first 2 minutes
  5. **The backend is not reachable from the public internet** — confirm this explicitly
  6. `curl` the deployed frontend bundle and confirm no API key appears in it
- Know the rollback command before starting the deploy. Every platform here supports revision
  rollback; have the previous revision identifier in hand.
- Never deploy with uncommitted local changes — what is deployed must be reconstructible from git.
- One cloud at a time. Do not run AWS, Azure, and GCP deploys concurrently; a failure in the middle
  of three parallel rollouts is very hard to reason about.

## 7. Reporting

After any autonomous session that touched cloud infrastructure, report:

- What was created, changed, or destroyed — by resource name
- The resulting URLs and which are public vs. private
- Expected monthly cost delta
- Anything skipped because it hit a 🔴 rule, and what approval is needed to proceed
- Verification results from §6

Be specific about failures. An unreported partial failure in infrastructure work is worse than an
obvious total failure, because it leaves resources running and billing with no one aware of them.
