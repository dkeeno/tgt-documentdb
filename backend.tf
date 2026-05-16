# =============================================================================
# backend.tf — S3 + DynamoDB remote state
# =============================================================================
#
# Reuses the project-wide bootstrap bucket + lock table. UNIQUE state KEY
# per stack. NOT colocated with tgt-rds-postgres state — independent
# lifecycle, independent destroys.

terraform {
  backend "s3" {
    bucket         = "sbx-tfstate-784916389752-us-east-1"
    key            = "tgt-iac/tgt-documentdb.tfstate"
    region         = "us-east-1"
    dynamodb_table = "sbx-tfstate-locks"
    encrypt        = true
  }
}
