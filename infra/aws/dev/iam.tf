# "Access role" — what App Runner assumes to pull the image from ECR.
# Separate from the "instance role" below, which is what the running
# container itself uses to call other AWS APIs (Secrets Manager).
resource "aws_iam_role" "apprunner_access" {
  name = "cska-${var.environment}-apprunner-access"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Service = "build.apprunner.amazonaws.com" }
      Action    = "sts:AssumeRole"
    }]
  })
}

resource "aws_iam_role_policy_attachment" "apprunner_access_ecr" {
  role       = aws_iam_role.apprunner_access.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSAppRunnerServicePolicyForECRAccess"
}

# Instance role: what the backend container itself can do at runtime.
# Scoped to only the 5 secrets it actually reads — not the frontend's 4,
# not anything else in the account.
resource "aws_iam_role" "backend_instance" {
  name = "cska-${var.environment}-backend-instance"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Service = "tasks.apprunner.amazonaws.com" }
      Action    = "sts:AssumeRole"
    }]
  })
}

resource "aws_iam_role_policy" "backend_secrets" {
  name = "read-own-secrets"
  role = aws_iam_role.backend_instance.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect   = "Allow"
      Action   = "secretsmanager:GetSecretValue"
      Resource = [for s in data.aws_secretsmanager_secret.backend : s.arn]
    }]
  })
}

# Same pattern for the frontend, scoped to its own 4 secrets only.
resource "aws_iam_role" "frontend_instance" {
  name = "cska-${var.environment}-frontend-instance"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Service = "tasks.apprunner.amazonaws.com" }
      Action    = "sts:AssumeRole"
    }]
  })
}

resource "aws_iam_role_policy" "frontend_secrets" {
  name = "read-own-secrets"
  role = aws_iam_role.frontend_instance.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect   = "Allow"
      Action   = "secretsmanager:GetSecretValue"
      Resource = [for s in data.aws_secretsmanager_secret.frontend : s.arn]
    }]
  })
}
