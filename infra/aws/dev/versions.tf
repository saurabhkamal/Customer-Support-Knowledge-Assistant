terraform {
  required_version = ">= 1.5"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }

  # Bucket and lock table are created out-of-band via CLI, not by this
  # config, for the same reason secrets are staged out-of-band: bootstrapping
  # a backend from the backend it would live in is a chicken-and-egg problem.
  backend "s3" {
    bucket         = "cska-dev-tfstate-566801649228"
    key            = "aws/dev/terraform.tfstate"
    region         = "ap-northeast-1"
    dynamodb_table = "cska-dev-tflock"
    encrypt        = true
  }
}
