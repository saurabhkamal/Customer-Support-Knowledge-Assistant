# Shared, bounded auto-scaling profile for both services. max_size is set
# explicitly per rule §4 — an unbounded autoscaler plus a public endpoint is
# a billing incident waiting to happen, even on a temporary demo.
resource "aws_apprunner_auto_scaling_configuration_version" "shared" {
  auto_scaling_configuration_name = "cska-${var.environment}-scaling"
  max_concurrency                 = 50
  min_size                        = 1
  max_size                        = 2
}

# ---- Backend: private ingress only ----

resource "aws_apprunner_service" "backend" {
  service_name = "cska-${var.environment}-backend"

  source_configuration {
    auto_deployments_enabled = false # redeploys happen by re-applying with a new image_tag, not automatically on every ECR push

    authentication_configuration {
      access_role_arn = aws_iam_role.apprunner_access.arn
    }

    image_repository {
      image_identifier      = "${data.aws_ecr_repository.backend.repository_url}:${var.image_tag}"
      image_repository_type = "ECR"

      image_configuration {
        port = "8000"
        runtime_environment_secrets = {
          for name in local.backend_secret_names :
          name => data.aws_secretsmanager_secret.backend[name].arn
        }
      }
    }
  }

  instance_configuration {
    cpu               = "256"
    memory            = "512"
    instance_role_arn = aws_iam_role.backend_instance.arn
  }

  health_check_configuration {
    protocol            = "HTTP"
    path                = "/health"
    interval            = 10
    timeout             = 5
    healthy_threshold   = 1
    unhealthy_threshold = 5 # generous: create_all() at import needs Postgres reachable before the port opens
  }

  network_configuration {
    ingress_configuration {
      is_publicly_accessible = false
    }
    egress_configuration {
      egress_type = "DEFAULT" # backend calls out to Supabase/Neo4j/OpenAI over the public internet; it doesn't need to reach into this VPC itself
    }
  }

  auto_scaling_configuration_arn = aws_apprunner_auto_scaling_configuration_version.shared.arn
}

# What actually makes the backend reachable from inside the VPC, and from
# nowhere else. Without this resource the service exists but nothing —
# not even the frontend — could reach it.
resource "aws_apprunner_vpc_ingress_connection" "backend" {
  name        = "cska-${var.environment}-backend-ingress"
  service_arn = aws_apprunner_service.backend.arn

  ingress_vpc_configuration {
    vpc_id          = aws_vpc.main.id
    vpc_endpoint_id = aws_vpc_endpoint.apprunner.id
  }
}

# ---- Frontend: public ingress, reaches the backend through the VPC connector ----

resource "aws_apprunner_service" "frontend" {
  service_name = "cska-${var.environment}-frontend"

  source_configuration {
    auto_deployments_enabled = false

    authentication_configuration {
      access_role_arn = aws_iam_role.apprunner_access.arn
    }

    image_repository {
      image_identifier      = "${data.aws_ecr_repository.frontend.repository_url}:${var.image_tag}"
      image_repository_type = "ECR"

      image_configuration {
        port = "3000"

        runtime_environment_variables = {
          # The backend's private endpoint, reachable only via the VPC
          # connector below — never a public URL.
          BACKEND_URL = "https://${aws_apprunner_vpc_ingress_connection.backend.domain_name}"
        }

        runtime_environment_secrets = {
          for name in local.frontend_secret_names :
          name => data.aws_secretsmanager_secret.frontend[name].arn
        }
      }
    }
  }

  instance_configuration {
    cpu               = "256"
    memory            = "512"
    instance_role_arn = aws_iam_role.frontend_instance.arn
  }

  # Explicit HTTP check instead of relying on App Runner's default TCP
  # check — /login always returns 200 with no auth required, so it's a
  # valid target even before anyone has signed in.
  health_check_configuration {
    protocol            = "HTTP"
    path                = "/login"
    interval            = 10
    timeout             = 5
    healthy_threshold   = 1
    unhealthy_threshold = 5
  }

  network_configuration {
    ingress_configuration {
      is_publicly_accessible = true
    }
    egress_configuration {
      egress_type       = "VPC" # must route through the VPC to reach the backend's private ingress
      vpc_connector_arn  = aws_apprunner_vpc_connector.frontend_egress.arn
    }
  }

  auto_scaling_configuration_arn = aws_apprunner_auto_scaling_configuration_version.shared.arn
}
