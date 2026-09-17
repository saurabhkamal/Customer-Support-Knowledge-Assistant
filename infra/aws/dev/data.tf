# Everything here already exists (created out-of-band in Phase 0/1). Terraform
# only reads it — it never manages the ECR repos or the secret values
# themselves, so no credential ever enters Terraform state.

data "aws_availability_zones" "available" {
  state = "available"
}

data "aws_ecr_repository" "backend" {
  name = "cska-${var.environment}-backend"
}

data "aws_ecr_repository" "frontend" {
  name = "cska-${var.environment}-frontend"
}

locals {
  backend_secret_names = [
    "DATABASE_URL", "NEO4J_URI", "NEO4J_USERNAME", "NEO4J_PASSWORD", "OPENAI_API_KEY",
  ]
  frontend_secret_names = [
    "BACKEND_API_KEY", "APP_USERNAME", "APP_PASSWORD_HASH", "SESSION_SECRET",
  ]
}

data "aws_secretsmanager_secret" "backend" {
  for_each = toset(local.backend_secret_names)
  name     = "cska/${var.environment}/${each.value}"
}

data "aws_secretsmanager_secret" "frontend" {
  for_each = toset(local.frontend_secret_names)
  name     = "cska/${var.environment}/${each.value}"
}
