output "frontend_url" {
  description = "Public URL — this is what you actually visit"
  value       = "https://${aws_apprunner_service.frontend.service_url}"
}

output "backend_private_url" {
  description = "Backend's private endpoint — reachable only from inside the VPC, never from a browser"
  value       = "https://${aws_apprunner_vpc_ingress_connection.backend.domain_name}"
}

output "backend_ecr_repository" {
  value = data.aws_ecr_repository.backend.repository_url
}

output "frontend_ecr_repository" {
  value = data.aws_ecr_repository.frontend.repository_url
}
