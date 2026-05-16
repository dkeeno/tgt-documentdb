# =============================================================================
# vpc-data.tf — discover existing VPC + private subnets + bastion SG
# =============================================================================
#
# Identical pattern to tgt-rds-postgres/vpc-data.tf. Read-only against
# resources owned by the cluster-iac stack. If those tags ever change,
# update terraform.tfvars to match.

data "aws_vpc" "this" {
  filter {
    name   = "tag:Name"
    values = [var.vpc_name_tag]
  }
}

data "aws_subnets" "private" {
  filter {
    name   = "vpc-id"
    values = [data.aws_vpc.this.id]
  }
  filter {
    name   = "tag:Name"
    values = [var.private_subnet_name_pattern]
  }
}

data "aws_security_group" "bastion" {
  name   = var.bastion_security_group_name
  vpc_id = data.aws_vpc.this.id
}
