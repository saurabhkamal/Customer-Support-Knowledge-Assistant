provider "aws" {
  region  = var.aws_region
  profile = var.aws_profile

  default_tags {
    tags = {
      project    = "cska"
      env        = var.environment
      managed-by = "terraform"
      owner      = "saurabhkamal"
    }
  }
}
