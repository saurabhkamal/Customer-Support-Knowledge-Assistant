# Minimal networking, just enough for App Runner's private-ingress pattern:
# the backend is reachable only from inside this VPC, and the frontend is the
# only thing given a path into it (via the connector below).

resource "aws_vpc" "main" {
  cidr_block           = "10.0.0.0/16"
  enable_dns_support   = true
  enable_dns_hostnames = true
  tags                 = { Name = "cska-${var.environment}-vpc" }
}

resource "aws_subnet" "private" {
  count             = 2
  vpc_id            = aws_vpc.main.id
  cidr_block        = "10.0.${count.index}.0/24"
  availability_zone = data.aws_availability_zones.available.names[count.index]
  tags              = { Name = "cska-${var.environment}-private-${count.index}" }
}

# Security group for the App Runner VPC endpoint (backend's private front door).
# Only traffic originating inside this VPC can reach it.
resource "aws_security_group" "vpc_endpoint" {
  name        = "cska-${var.environment}-apprunner-endpoint"
  description = "Allows traffic from within the VPC to the App Runner private endpoint"
  vpc_id      = aws_vpc.main.id

  ingress {
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = [aws_vpc.main.cidr_block]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

# The VPC endpoint App Runner uses to expose a service privately.
# private_dns_enabled is deliberately omitted: this specific endpoint service
# (apprunner.requests) doesn't offer a private DNS name — AWS rejects the
# create call outright if this is set to true.
resource "aws_vpc_endpoint" "apprunner" {
  vpc_id             = aws_vpc.main.id
  service_name       = "com.amazonaws.${var.aws_region}.apprunner.requests"
  vpc_endpoint_type  = "Interface"
  subnet_ids         = aws_subnet.private[*].id
  security_group_ids = [aws_security_group.vpc_endpoint.id]
}

# Security group for the frontend's egress connector. Attaching a VPC
# connector moves the service's networking inside this VPC entirely — that
# includes App Runner's own health-check probe reaching the container, not
# just the container's own outbound calls. An egress-only group here left
# the health check with no inbound path in, which is what actually failed:
# the container logs showed it starting and listening on 3000 just fine,
# only the platform's probe couldn't reach it.
resource "aws_security_group" "vpc_connector" {
  name        = "cska-${var.environment}-apprunner-connector-v2"
  description = "SG for frontend App Runner VPC connector v2"
  vpc_id      = aws_vpc.main.id

  # Scoping this to the VPC CIDR (10.0.0.0/16) didn't let the health check
  # through, so App Runner's probe is evidently not sourced from an address
  # inside that range. Widened to any source on this port instead. This is
  # not a real public exposure: this VPC has no internet gateway or public
  # route at all, so nothing outside the VPC can reach this port regardless
  # of what the security group itself allows.
  ingress {
    from_port   = 3000
    to_port     = 3000
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

# Lets the frontend service reach into this VPC to call the backend.
resource "aws_apprunner_vpc_connector" "frontend_egress" {
  vpc_connector_name = "cska-${var.environment}-frontend-connector"
  subnets            = aws_subnet.private[*].id
  security_groups    = [aws_security_group.vpc_connector.id]
}
