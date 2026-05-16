# =============================================================================
# documentdb.tf — DocumentDB cluster + cluster instance(s) + parameter group
# =============================================================================
#
# Architecture:
#   - aws_docdb_cluster: the logical cluster (replica set rs0). Holds the
#     master endpoint, backup config, encryption.
#   - aws_docdb_cluster_instance: each writer/reader. Sandbox uses 1
#     (writer only). Bumping instance_count adds replicas in different AZs.
#   - aws_docdb_subnet_group: requires 2+ subnets in different AZs (even
#     for single-instance clusters — DocumentDB enforces this for failover
#     readiness, even though no failover happens with 1 instance).
#   - aws_docdb_cluster_parameter_group: enable TLS (default-on but
#     explicit), enable audit logs, enable profiler.
#
# Cost: 1× db.t3.medium = ~$54/mo. Storage = $0.10/GB/month.

# ---------- Cluster parameter group ----------
resource "aws_docdb_cluster_parameter_group" "v5" {
  name        = "${var.name_prefix}-docdb-params"
  family      = "docdb5.0"
  description = "Custom params for ${var.name_prefix} sandbox DocumentDB: TLS on, audit on, profiler on slow queries."

  # Force TLS — clients connect with tls=true. (Default-on; setting it
  # explicitly so it's visible in the param group.)
  parameter {
    name  = "tls"
    value = "enabled"
  }

  # Enable audit logging — writes events to CloudWatch when
  # enabled_cloudwatch_logs_exports includes "audit" (set on cluster below).
  parameter {
    name  = "audit_logs"
    value = "enabled"
  }

  # Enable the slow-query profiler. Logs operations > 100ms.
  parameter {
    name  = "profiler"
    value = "enabled"
  }

  parameter {
    name  = "profiler_threshold_ms"
    value = "100"
  }

  lifecycle {
    create_before_destroy = true
  }
}

# ---------- Subnet group ----------
resource "aws_docdb_subnet_group" "this" {
  name        = "${var.name_prefix}-docdb-subnets"
  description = "Private subnets for ${var.name_prefix} sandbox DocumentDB (2+ AZs required)."
  subnet_ids  = data.aws_subnets.private.ids

  tags = {
    Name = "${var.name_prefix}-docdb-subnets"
  }
}

# ---------- Cluster ----------
resource "aws_docdb_cluster" "this" {
  cluster_identifier = var.cluster_identifier
  engine             = "docdb"
  engine_version     = var.engine_version
  master_username    = var.master_username
  master_password    = random_password.master.result
  port               = 27017

  # Network
  db_subnet_group_name            = aws_docdb_subnet_group.this.name
  vpc_security_group_ids          = [aws_security_group.docdb.id]
  db_cluster_parameter_group_name = aws_docdb_cluster_parameter_group.v5.name

  # Backup
  backup_retention_period = var.backup_retention_days
  preferred_backup_window = "03:00-04:00" # UTC; 03:00 = lowest US ops impact

  # Encryption at rest with default AWS-managed KMS key
  storage_encrypted = true

  # Logs to CloudWatch — both audit and profiler streams.
  enabled_cloudwatch_logs_exports = ["audit", "profiler"]

  # Sandbox knobs
  skip_final_snapshot = var.skip_final_snapshot
  deletion_protection = var.deletion_protection
  apply_immediately   = true

  tags = {
    Name = "${var.name_prefix}-docdb"
  }

  # Patch versions are auto-rolled in maintenance windows — don't diff on them.
  lifecycle {
    ignore_changes = [engine_version]
  }
}

# ---------- Cluster instance(s) ----------
# Each instance is one EC2-equivalent host running DocumentDB. The first
# is the writer; additional ones become readers (round-robin).
resource "aws_docdb_cluster_instance" "this" {
  count              = var.instance_count
  cluster_identifier = aws_docdb_cluster.this.id
  identifier         = "${var.cluster_identifier}-${count.index + 1}"
  instance_class     = var.instance_class
  apply_immediately  = true

  # Auto patch upgrades during the maintenance window.
  auto_minor_version_upgrade = true

  tags = {
    Name = "${var.cluster_identifier}-${count.index + 1}"
    role = count.index == 0 ? "writer" : "reader"
  }
}
