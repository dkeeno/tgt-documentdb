# =============================================================================
# security-group.tf — DocumentDB network access
# =============================================================================
#
# DocumentDB has NO publicly_accessible flag — it's VPC-only by design.
# Access is gated by SG. Default: bastion SG only.

resource "aws_security_group" "docdb" {
  name_prefix = "${var.name_prefix}-docdb-"
  description = "Inbound 27017 from bastion only. DocumentDB is VPC-only by design."
  vpc_id      = data.aws_vpc.this.id

  tags = {
    Name = "${var.name_prefix}-docdb-sg"
  }

  lifecycle {
    create_before_destroy = true
  }
}

resource "aws_security_group_rule" "docdb_from_bastion" {
  type                     = "ingress"
  from_port                = 27017
  to_port                  = 27017
  protocol                 = "tcp"
  security_group_id        = aws_security_group.docdb.id
  source_security_group_id = data.aws_security_group.bastion.id
  description              = "MongoDB wire protocol from tgt bastion (mongosh-via-SSM seeding)"
}
