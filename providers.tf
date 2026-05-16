# =============================================================================
# providers.tf — AWS + random
# =============================================================================

provider "aws" {
  region = var.aws_region

  default_tags {
    tags = {
      project     = "tgt"
      stack       = "tgt-documentdb"
      managed_by  = "terraform"
      owner       = var.owner_tag
      cost_center = "sandbox"
    }
  }
}

provider "random" {}
