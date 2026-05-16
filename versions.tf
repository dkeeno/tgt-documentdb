# =============================================================================
# versions.tf — Terraform + provider version pinning
# =============================================================================
#
# DocumentDB is provisioned via the standard `aws` provider — no separate
# documentdb-only provider exists. Same pinning style as the sibling
# tgt-rds-postgres stack.

terraform {
  required_version = ">= 1.10.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.80"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.6"
    }
  }
}
