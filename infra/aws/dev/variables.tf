variable "aws_profile" {
  description = "AWS CLI profile to use"
  type        = string
  default     = "cska-deploy"
}

variable "aws_region" {
  description = "AWS region — matches Supabase's region so /ask doesn't round-trip continents"
  type        = string
  default     = "ap-northeast-1"
}

variable "environment" {
  description = "Environment name, used in resource naming and tags"
  type        = string
  default     = "dev"
}

variable "image_tag" {
  description = "Commit-SHA tag of the images already pushed to ECR (see Phase 1). Never \"latest\"."
  type        = string
}

variable "account_id" {
  description = "AWS account ID, used to build ECR image URIs"
  type        = string
  default     = "566801649228"
}
