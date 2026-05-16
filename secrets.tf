# =============================================================================
# secrets.tf — generated master password + Secrets Manager record
# =============================================================================
#
# Same pattern as tgt-rds-postgres. Generates a strong password at apply
# time, stores both username + password (and the cluster endpoint) in a
# Secrets Manager JSON blob.
#
# DocumentDB master-password forbidden chars: / @ " (and space). Override
# default special set to exclude them.

resource "random_password" "master" {
  length           = 32
  special          = true
  override_special = "!#$%&*()-_=+[]{}<>:?"
}

resource "aws_secretsmanager_secret" "master" {
  name                    = "${var.name_prefix}-docdb-master-credentials"
  description             = "Master credentials for ${var.name_prefix}-docdb DocumentDB cluster."
  recovery_window_in_days = 0 # sandbox — destroy → secret gone immediately
}

resource "aws_secretsmanager_secret_version" "master_v1" {
  secret_id = aws_secretsmanager_secret.master.id
  secret_string = jsonencode({
    username = var.master_username
    password = random_password.master.result
    engine   = "documentdb"
    host     = aws_docdb_cluster.this.endpoint
    port     = aws_docdb_cluster.this.port
    # Default authdb for DocumentDB is the master user's own DB (admin in MongoDB terms).
    authdb = "admin"
    # Connection string ready for mongosh / drivers. Note SSL is required.
    conn_string = "mongodb://${var.master_username}:${random_password.master.result}@${aws_docdb_cluster.this.endpoint}:${aws_docdb_cluster.this.port}/?tls=true&replicaSet=rs0&readPreference=secondaryPreferred&retryWrites=false"
  })
}
