# =============================================================================
# terraform.tfvars — concrete sandbox values
# =============================================================================

aws_region  = "us-east-1"
name_prefix = "tgt"
owner_tag   = "dkeeno"

vpc_name_tag                = "tgt-vpc"
private_subnet_name_pattern = "tgt-prv-*" # actual cluster-iac convention (not tgt-private-*)
bastion_security_group_name = "tgt-bastion-sg"

cluster_identifier = "tgt-docdb"
engine_version     = "5.0.0"
instance_class     = "db.t3.medium"
instance_count     = 1 # single-AZ for sandbox
master_username    = "docdbadmin"

backup_retention_days = 1
skip_final_snapshot   = true
deletion_protection   = false
