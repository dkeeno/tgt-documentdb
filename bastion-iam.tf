# =============================================================================
# bastion-iam.tf — let the bastion role read THIS stack's secret + seed drops
# =============================================================================
#
# The seed job (.github/workflows/terraform.yml) uses SSM SendCommand to
# make the bastion run mongosh against the new DocumentDB cluster. For
# that the bastion needs:
#
#   1. secretsmanager:GetSecretValue on the master credentials secret
#      created by this stack
#   2. s3:GetObject on the bootstrap state bucket prefix where the seed
#      bundle is dropped per-run
#
# Granted as INLINE policies on the existing bastion role (cluster-iac
# owns the role itself; we attach narrow per-secret policies). Destroying
# THIS stack removes the grant cleanly.

# Discover the bastion role created by tgt-cluster-iac.
data "aws_iam_role" "bastion" {
  name = "tgt-bastion-role"
}

# Bootstrap state bucket — used as a transient seed drop zone.
locals {
  state_bucket_name = "tgt-tfstate-${var.aws_account_id}-${var.aws_region}"
}

# 1. Read this stack's master secret
resource "aws_iam_role_policy" "bastion_read_docdb_secret" {
  name = "tgt-docdb-secret-read"
  role = data.aws_iam_role.bastion.name

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect   = "Allow"
        Action   = ["secretsmanager:GetSecretValue", "secretsmanager:DescribeSecret"]
        Resource = aws_secretsmanager_secret.master.arn
      },
    ]
  })
}

# 2. Read seed drop zones in the state bucket. Scoped to the seed-drops/
#    prefix specifically for THIS stack — bastion can't fetch terraform
#    state files or other stacks' drops.
resource "aws_iam_role_policy" "bastion_read_seed_drops" {
  name = "tgt-docdb-seed-drops-read"
  role = data.aws_iam_role.bastion.name

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect   = "Allow"
        Action   = ["s3:GetObject"]
        Resource = "arn:aws:s3:::${local.state_bucket_name}/seed-drops/tgt-docdb-*"
      },
      {
        Effect   = "Allow"
        Action   = ["s3:ListBucket"]
        Resource = "arn:aws:s3:::${local.state_bucket_name}"
        Condition = {
          StringLike = {
            "s3:prefix" = ["seed-drops/tgt-docdb-*", "seed-drops/tgt-docdb-*/*"]
          }
        }
      },
    ]
  })
}
