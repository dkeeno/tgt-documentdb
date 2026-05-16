# =============================================================================
# variables.tf — input declarations
# =============================================================================

# ----- Project identity -----

variable "aws_region" {
  description = "AWS region (must match the existing VPC)."
  type        = string
  default     = "us-east-1"
}

variable "aws_account_id" {
  description = "AWS account ID (used to construct the bootstrap state-bucket name in bastion-iam.tf)."
  type        = string
  default     = "784916389752"
}

variable "name_prefix" {
  description = "Resource name prefix."
  type        = string
  default     = "tgt"
}

variable "owner_tag" {
  description = "Free-text owner tag (default_tags)."
  type        = string
  default     = "dkeeno"
}

# ----- Network discovery (reuses cluster VPC, no new VPC created) -----

variable "vpc_name_tag" {
  description = "Name tag of the existing VPC. Looked up via data.aws_vpc."
  type        = string
  default     = "tgt-vpc"
}

variable "private_subnet_name_pattern" {
  description = "Name-tag wildcard for private subnets (DocumentDB subnet group needs 2+ AZs). Actual tgt-cluster-iac convention is 'tgt-prv-*'."
  type        = string
  default     = "tgt-prv-*"
}

variable "bastion_security_group_name" {
  description = "Bastion SG name — granted ingress to 27017 for mongosh access."
  type        = string
  default     = "tgt-bastion-sg"
}

# ----- DocumentDB cluster sizing -----

variable "cluster_identifier" {
  description = "DocumentDB cluster ID. Becomes part of the endpoint hostname."
  type        = string
  default     = "tgt-docdb"
}

variable "engine_version" {
  description = "DocumentDB engine version. 5.0.0 is the latest as of 2026-05; supports MongoDB 5.0 wire protocol."
  type        = string
  default     = "5.0.0"
}

variable "instance_class" {
  description = "Smallest supported DocumentDB instance. db.t3.medium is the min for the cluster."
  type        = string
  default     = "db.t3.medium"
}

variable "instance_count" {
  description = "Number of DocumentDB instances in the cluster. 1 = single-AZ (sandbox); 3+ = HA. Each costs ~$54/mo."
  type        = number
  default     = 1
  validation {
    condition     = var.instance_count >= 1 && var.instance_count <= 5
    error_message = "instance_count must be between 1 and 5."
  }
}

variable "master_username" {
  description = "DocumentDB master username. 'admin' / 'rdsadmin' are reserved."
  type        = string
  default     = "docdbadmin"
}

variable "backup_retention_days" {
  description = "Daily snapshots retained. 1 day = sandbox minimum (still allows PITR)."
  type        = number
  default     = 1
}

variable "skip_final_snapshot" {
  description = "On destroy, skip final snapshot (sandbox: true)."
  type        = bool
  default     = true
}

variable "deletion_protection" {
  description = "Block accidental destroy (sandbox: false)."
  type        = bool
  default     = false
}
