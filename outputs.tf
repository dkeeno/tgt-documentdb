# =============================================================================
# outputs.tf — connection values + seed cheat sheet
# =============================================================================

output "cluster_identifier" {
  description = "DocumentDB cluster ID."
  value       = aws_docdb_cluster.this.cluster_identifier
}

output "endpoint" {
  description = "Cluster writer endpoint (hostname only)."
  value       = aws_docdb_cluster.this.endpoint
}

output "reader_endpoint" {
  description = "Reader endpoint (round-robin across replicas; same as writer when instance_count=1)."
  value       = aws_docdb_cluster.this.reader_endpoint
}

output "port" {
  description = "Cluster port (default 27017)."
  value       = aws_docdb_cluster.this.port
}

output "master_username" {
  description = "Master username."
  value       = aws_docdb_cluster.this.master_username
}

output "master_secret_arn" {
  description = "Secrets Manager ARN holding {username,password,host,port,authdb,conn_string} JSON."
  value       = aws_secretsmanager_secret.master.arn
}

output "security_group_id" {
  description = "DocumentDB cluster security group."
  value       = aws_security_group.docdb.id
}

# -----------------------------------------------------------------------------
# Connect + seed cheat sheet
# -----------------------------------------------------------------------------
output "next_steps" {
  description = "How to seed + connect."
  value       = <<-EOT

    DocumentDB cluster ready.

    1) Fetch the master password from Secrets Manager:
         export DOCDB_PWD=$(aws secretsmanager get-secret-value \
           --secret-id ${aws_secretsmanager_secret.master.arn} \
           --region ${var.aws_region} \
           --query SecretString --output text | jq -r .password)

    2) Open SSM port-forward through the bastion (LEAVE THIS RUNNING):
         BASTION_ID=$(aws ec2 describe-instances --region ${var.aws_region} \
           --filters Name=tag:Name,Values=tgt-bastion-01 Name=instance-state-name,Values=running \
           --query "Reservations[0].Instances[0].InstanceId" --output text)
         aws ssm start-session \
           --target $BASTION_ID \
           --region ${var.aws_region} \
           --document-name AWS-StartPortForwardingSessionToRemoteHost \
           --parameters '{"host":["${aws_docdb_cluster.this.endpoint}"],"portNumber":["27017"],"localPortNumber":["27018"]}'

    3) Download the AWS rds-combined CA bundle (DocumentDB requires TLS):
         curl -sSL -o global-bundle.pem \
           https://truststore.pki.rds.amazonaws.com/global/global-bundle.pem

    4) In ANOTHER terminal, run the seed scripts in order:
         for f in seed/01-*.js seed/02-*.js seed/03-*.js seed/04-*.js seed/05-*.js; do
           echo "=== Applying $f ==="
           mongosh "mongodb://${var.master_username}:$DOCDB_PWD@localhost:27018/admin?tls=true&tlsAllowInvalidHostnames=true&retryWrites=false&directConnection=true" \
             --tlsCAFile global-bundle.pem \
             --quiet \
             --file "$f"
         done

       (tlsAllowInvalidHostnames=true is needed because the cert CN
       matches the actual cluster endpoint, not 'localhost'.)

    5) Verify:
         mongosh "mongodb://${var.master_username}:$DOCDB_PWD@localhost:27018/admin?tls=true&tlsAllowInvalidHostnames=true&retryWrites=false&directConnection=true" \
           --tlsCAFile global-bundle.pem \
           --eval 'use enterprise_corp; db.getCollectionNames().forEach(c => print(c + " -> " + db[c].countDocuments()))'

    See README.md for the full collection inventory.
  EOT
}
