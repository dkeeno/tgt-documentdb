# tgt-documentdb

Standalone Terraform stack provisioning a single-instance Amazon DocumentDB cluster (MongoDB 5.0 wire-compatible) and a fictional enterprise database `enterprise_corp` for the same company used by the PostgreSQL stack — **Helix Atlas Industrial Ltd**.

> **Isolated stack:** no connection to the apps (`online-shop` / `art-gallery`) or to the GitOps pipeline. Created purely as a NoSQL playground / demo, side-by-side with `tgt-rds-postgres`.

## What's in the database

| Collection | Purpose | Docs (after seed) |
|---|---|---|
| `departments`    | Org units (flat, parent_code self-reference) | 8 |
| `employees`      | Workforce. Embedded position, skills[], emergency_contact, location | ~31 |
| `customers`      | Accounts. Embedded contacts[], billing[], metadata | 12 |
| `products`       | Catalog with embedded specs subdoc | 18 |
| `orders`         | Sales orders with embedded line_items[] subarray | 11 |
| `support_tickets`| Tickets with embedded events[] audit trail | 7 |
| `audit_log`      | Append-only TTL-bounded change events | 11 |

**Indexes:** unique on natural keys (`employee_number`, `account_number`, `sku`, `order_number`, `ticket_number`), text on people/companies, compound for common access patterns, partial indexes for `is_active=true`, TTL on `audit_log.changed_at` (365d).

## Apply the stack

Per HARD RULE `feedback_pr_only_no_direct_main`: ship via PR + GitHub Actions when wired. Until then:

```sh
cd github-terraform-aws/tgt-iac/tgt-documentdb

terraform init
terraform plan -out=tfplan
terraform apply tfplan
```

Apply takes ~12-15 min (DocumentDB cluster + first instance is the slow piece).

## Seed the database

DocumentDB is VPC-only; access through SSM port-forward via the bastion. **Requires `mongosh` installed locally** (`brew install mongosh`).

```sh
# 1. Get the master password
export DOCDB_PWD=$(aws secretsmanager get-secret-value \
  --secret-id tgt-docdb-master-credentials \
  --region us-east-1 \
  --query SecretString --output text | jq -r .password)

# 2. Open SSM port-forward through the bastion (LEAVE THIS RUNNING)
BASTION_ID=$(aws ec2 describe-instances --region us-east-1 \
  --filters Name=tag:Name,Values=tgt-bastion-01 Name=instance-state-name,Values=running \
  --query "Reservations[0].Instances[0].InstanceId" --output text)
DOCDB_HOST=$(terraform output -raw endpoint)
aws ssm start-session \
  --target $BASTION_ID \
  --region us-east-1 \
  --document-name AWS-StartPortForwardingSessionToRemoteHost \
  --parameters "{\"host\":[\"$DOCDB_HOST\"],\"portNumber\":[\"27017\"],\"localPortNumber\":[\"27018\"]}"

# 3. Download the AWS CA bundle (DocumentDB enforces TLS)
curl -sSL -o global-bundle.pem \
  https://truststore.pki.rds.amazonaws.com/global/global-bundle.pem

# 4. In ANOTHER terminal, run the seed scripts in order
cd seed
URI="mongodb://docdbadmin:$DOCDB_PWD@localhost:27018/admin?tls=true&tlsAllowInvalidHostnames=true&retryWrites=false&directConnection=true"
for f in $(ls 0*.js | sort); do
  echo "=== Applying $f ==="
  mongosh "$URI" --tlsCAFile ../global-bundle.pem --quiet --file "$f"
done
```

(`tlsAllowInvalidHostnames=true` is required because the cert CN matches the cluster endpoint, not `localhost`. The CA bundle still validates the chain.)

## Verify

```sh
mongosh "$URI" --tlsCAFile global-bundle.pem --quiet --eval '
  db = db.getSiblingDB("enterprise_corp");
  db.getCollectionNames().forEach(c => print(c + " -> " + db[c].countDocuments()));
  print("---");
  print("Active employees:    " + db.employees.countDocuments({ is_active: true }));
  print("Active customers:    " + db.customers.countDocuments({ status: "active" }));
  print("Open tickets:        " + db.support_tickets.countDocuments({ status: { $in: ["open","in_progress"] } }));
  print("Total order revenue: " + db.orders.aggregate([
    { $match: { status: { $nin: ["cancelled"] } } },
    { $group: { _id: null, total: { $sum: "$total_amount" } } }
  ]).toArray()[0].total);
'
```

## Sample analytical queries

```js
// 1. Pipeline value by sales rep
db.orders.aggregate([
  { $match: { status: { $nin: ["cancelled"] } } },
  { $group: { _id: "$customer_account", revenue: { $sum: "$total_amount" }, orders: { $sum: 1 } } },
  { $sort: { revenue: -1 } },
  { $limit: 5 }
]);

// 2. Text search: find people with "engineering" skills
db.employees.find({ $text: { $search: "Engineering" } }).limit(5);

// 3. Open tickets overdue (sla_due_at in past, status not resolved)
db.support_tickets.find({
  status: { $in: ["open","in_progress"] },
  sla_due_at: { $lt: new Date() }
});

// 4. Customers in a specific country with recent orders
db.customers.aggregate([
  { $match: { country_code: "DE" } },
  { $lookup: {
      from: "orders",
      localField: "account_number",
      foreignField: "customer_account",
      as: "orders"
  }},
  { $project: {
      _id: 0,
      account_number: 1,
      legal_name: 1,
      order_count: { $size: "$orders" },
      total_revenue: { $sum: "$orders.total_amount" }
  }}
]);

// 5. Product sales mix (denormalized — pulls from line_items)
db.orders.aggregate([
  { $match: { status: { $nin: ["cancelled"] } } },
  { $unwind: "$line_items" },
  { $group: {
      _id: "$line_items.sku",
      name: { $first: "$line_items.name" },
      units: { $sum: "$line_items.quantity" },
      revenue: { $sum: "$line_items.line_total" }
  }},
  { $sort: { revenue: -1 } }
]);
```

## Cost

| Component | Monthly |
|---|---|
| DocumentDB db.t3.medium × 1 instance | ~$54 |
| Storage (10 GB minimum) | ~$1 |
| Backup storage (1-day retention) | <$1 |
| Secrets Manager | $0.40 |
| **Total** | **~$56/mo** |

(Add $54/mo per additional instance if you scale to multi-AZ.)

## Tear down

```sh
terraform destroy
# When prompted: yes
```

Takes ~10 min. With `skip_final_snapshot = true` (sandbox default), no snapshot retained.
