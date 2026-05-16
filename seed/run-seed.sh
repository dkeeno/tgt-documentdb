#!/usr/bin/env bash
# =============================================================================
# run-seed.sh — orchestration script run on the bastion via SSM SendCommand
# =============================================================================
#
# Called from .github/workflows/terraform.yml (seed job). Expects four
# environment variables set by the caller:
#   DOCDB_HOST   — DocumentDB cluster endpoint hostname (no port)
#   SECRET_ARN   — Secrets Manager ARN holding the master credentials JSON
#   AWS_REGION   — AWS region for the secret lookup
#   SEED_DROP    — local directory containing the .js files + this script
#
# DocumentDB enforces TLS — the script downloads the AWS CA bundle and
# passes it to mongosh. tlsAllowInvalidHostnames=true is required because
# the cert CN matches the cluster endpoint, not "localhost"; the CA
# bundle still validates the certificate chain.
#
# Idempotent — every seed file uses upserts and `createIndex` (no-op when
# the index already exists), so re-runs converge cleanly.

set -euo pipefail

: "${DOCDB_HOST:?DOCDB_HOST not set}"
: "${SECRET_ARN:?SECRET_ARN not set}"
: "${AWS_REGION:?AWS_REGION not set}"
: "${SEED_DROP:?SEED_DROP not set}"

echo "=== Installing mongosh on Amazon Linux 2023 ==="
# mongosh ships in the official MongoDB yum repo. Add the repo file once,
# then `dnf install` is fast and idempotent.
if ! command -v mongosh >/dev/null 2>&1; then
  sudo tee /etc/yum.repos.d/mongodb-org-7.0.repo >/dev/null <<'EOF'
[mongodb-org-7.0]
name=MongoDB Repository
baseurl=https://repo.mongodb.org/yum/amazon/2023/mongodb-org/7.0/x86_64/
gpgcheck=1
enabled=1
gpgkey=https://pgp.mongodb.com/server-7.0.asc
EOF
  sudo dnf install -y mongodb-mongosh 2>&1 | tail -5
fi
mongosh --version

echo ""
echo "=== Downloading AWS CA bundle for TLS verification ==="
CA_BUNDLE="$SEED_DROP/global-bundle.pem"
curl -sSL -o "$CA_BUNDLE" https://truststore.pki.rds.amazonaws.com/global/global-bundle.pem
echo "CA bundle: $(wc -c < "$CA_BUNDLE") bytes"

echo ""
echo "=== Fetching master credentials from Secrets Manager ==="
# Use python3 (preinstalled on AL2023) instead of jq to avoid a dnf install.
DOCDB_USER=$(aws secretsmanager get-secret-value \
  --secret-id "$SECRET_ARN" --region "$AWS_REGION" \
  --query SecretString --output text \
  | python3 -c "import sys,json; print(json.load(sys.stdin)['username'])")
DOCDB_PWD=$(aws secretsmanager get-secret-value \
  --secret-id "$SECRET_ARN" --region "$AWS_REGION" \
  --query SecretString --output text \
  | python3 -c "import sys,json; print(json.load(sys.stdin)['password'])")
echo "Username: $DOCDB_USER (password fetched, length=${#DOCDB_PWD})"

# Build the host-only URI; pass credentials via CLI flags so special
# characters in the password (slashes, '@', etc.) don't break URI parsing.
# directConnection=true forces mongosh to talk to the writer endpoint
# (DocumentDB is wire-compatible but topology discovery differs slightly).
URI="mongodb://${DOCDB_HOST}:27017/admin?tls=true&tlsAllowInvalidHostnames=true&retryWrites=false&directConnection=true"

# Common mongosh flags (also masks the password from the rendered URI).
MONGO_ARGS=(
  --tlsCAFile "$CA_BUNDLE"
  --username  "$DOCDB_USER"
  --password  "$DOCDB_PWD"
  --quiet
)

echo ""
echo "=== Applying seed scripts in order ==="
cd "$SEED_DROP"
for f in $(ls -1 0*.js | sort); do
  echo "--- $f ---"
  mongosh "$URI" "${MONGO_ARGS[@]}" --file "$f"
done

echo ""
echo "=== Verifying ==="
mongosh "$URI" "${MONGO_ARGS[@]}" --eval '
  db = db.getSiblingDB("enterprise_corp");
  db.getCollectionNames().sort().forEach(c => print(c + " -> " + db[c].countDocuments() + " docs"));
  print("---");
  print("Active employees: " + db.employees.countDocuments({ is_active: true }));
  print("Active customers: " + db.customers.countDocuments({ status: "active" }));
  print("Open tickets:     " + db.support_tickets.countDocuments({ status: { $in: ["open","in_progress"] } }));
'

echo ""
echo "=== Cleanup ==="
unset DOCDB_PWD
echo "=== Seed complete ==="
