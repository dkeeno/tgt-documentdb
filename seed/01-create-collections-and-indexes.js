// =============================================================================
// 01-create-collections-and-indexes.js — top-level structure for enterprise_corp
// =============================================================================
//
// What: creates the `enterprise_corp` database (DocumentDB auto-creates on
//       first write, but we create the collections explicitly to attach
//       schema validators), and adds all indexes up-front so subsequent
//       seed inserts use the correct indexes from the first document.
//
// Order: run FIRST. All later seed scripts assume these collections + indexes exist.
//
// Idempotency: uses createCollection({ ... validator }) once, then ensures
//              indexes via createIndex (no-op if same key+options exist).
//
// Collections in this database:
//   employees       — workforce records
//   departments     — org units
//   customers       — accounts
//   products        — catalog
//   orders          — sales orders w/ embedded line_items
//   support_tickets — help-desk tickets w/ embedded events
//   audit_log       — TTL-bounded change events

print("=== Switching to enterprise_corp database ===");
db = db.getSiblingDB('enterprise_corp');

// ----------- helper: create-or-keep a collection ---------------------------
// DocumentDB does NOT support JSON Schema validators (Mongo $jsonSchema
// operator). So we create plain collections; validation happens at the
// application layer (here: the seed scripts themselves). Same effect
// for the demo, slightly less defensive than full Mongo.
function ensureCollection(name) {
  const exists = db.getCollectionNames().includes(name);
  if (!exists) {
    db.createCollection(name);
    print(`  created collection: ${name}`);
  } else {
    print(`  kept    collection: ${name}`);
  }
}

print("=== Ensuring collections ===");
[ "employees", "departments", "customers", "products",
  "orders", "support_tickets", "audit_log" ].forEach(ensureCollection);

// ----------- indexes -------------------------------------------------------
// Index strategy:
//   - Unique indexes on natural keys (employee_number, account_number, sku)
//   - Compound indexes for the common access patterns
//   - Text index on customers.legal_name + employees.full_name for search
//   - TTL index on audit_log.changed_at — auto-expires old events
//   - Partial indexes where applicable (active employees, open tickets)

print("=== Indexes: employees ===");
db.employees.createIndex({ employee_number: 1 }, { unique: true, name: "uq_employee_number" });
db.employees.createIndex({ email: 1 }, { unique: true, name: "uq_email" });
db.employees.createIndex({ department_code: 1, is_active: 1 }, { name: "ix_dept_active" });
db.employees.createIndex({ manager_id: 1 }, { name: "ix_manager" });
// DocumentDB compat: text index can't include array-element paths ("multikey").
// Real MongoDB allows {"skills.name": "text"} but DocDB rejects with
// "text index does not support multikey paths" at INSERT time on docs with
// non-empty `skills` arrays. Index `full_name` only; to search skills,
// use $elemMatch or aggregation $unwind instead.
//
// Drop the (possibly bad) prior index by name first so re-runs converge
// when the spec changes — createIndex is a no-op if same name+spec, but
// throws on same-name-different-spec.
try { db.employees.dropIndex("tx_search"); } catch (e) { /* didn't exist */ }
db.employees.createIndex({ full_name: "text" }, { name: "tx_search" });
// Partial: active employees only
db.employees.createIndex(
  { hired_at: -1 },
  { partialFilterExpression: { is_active: true }, name: "ix_active_hired_desc" }
);

print("=== Indexes: departments ===");
db.departments.createIndex({ code: 1 }, { unique: true, name: "uq_dept_code" });
db.departments.createIndex({ parent_code: 1 }, { name: "ix_dept_parent" });

print("=== Indexes: customers ===");
db.customers.createIndex({ account_number: 1 }, { unique: true, name: "uq_account_number" });
db.customers.createIndex({ legal_name: "text", trading_name: "text", industry: "text" }, { name: "tx_customer_search" });
db.customers.createIndex({ segment: 1, status: 1 }, { name: "ix_segment_status" });
db.customers.createIndex({ country_code: 1 }, { name: "ix_country" });
// Partial: active customers only — for dashboards filtering on status='active'
db.customers.createIndex(
  { account_number: 1 },
  { partialFilterExpression: { status: "active" }, name: "ix_active_account" }
);

print("=== Indexes: products ===");
db.products.createIndex({ sku: 1 }, { unique: true, name: "uq_sku" });
db.products.createIndex({ category: 1, is_active: 1 }, { name: "ix_category_active" });
db.products.createIndex({ tags: 1 }, { name: "ix_tags" });
db.products.createIndex({ name: "text", description: "text" }, { name: "tx_product_search" });

print("=== Indexes: orders ===");
db.orders.createIndex({ order_number: 1 }, { unique: true, name: "uq_order_number" });
db.orders.createIndex({ customer_account: 1, ordered_at: -1 }, { name: "ix_customer_recent" });
db.orders.createIndex({ status: 1, ordered_at: -1 }, { name: "ix_status_recent" });
db.orders.createIndex({ "line_items.sku": 1 }, { name: "ix_line_sku" });
// Geo-style index on shipping country for regional analytics
db.orders.createIndex({ "shipping.country_code": 1, ordered_at: -1 }, { name: "ix_shipping_country" });

print("=== Indexes: support_tickets ===");
db.support_tickets.createIndex({ ticket_number: 1 }, { unique: true, name: "uq_ticket_number" });
db.support_tickets.createIndex({ status: 1, priority: 1, created_at: -1 }, { name: "ix_status_priority_recent" });
db.support_tickets.createIndex({ customer_account: 1, status: 1 }, { name: "ix_customer_status" });
db.support_tickets.createIndex({ assigned_to: 1, status: 1 }, { name: "ix_assignee_status" });

print("=== Indexes: audit_log (with TTL) ===");
// Standard secondary
db.audit_log.createIndex({ collection_name: 1, document_id: 1, changed_at: -1 }, { name: "ix_doc_history" });
db.audit_log.createIndex({ changed_by_user: 1, changed_at: -1 }, { name: "ix_user_history" });
// TTL: auto-purge audit events older than 365 days (avoid unbounded growth).
// expireAfterSeconds counts from the value of changed_at on each doc.
db.audit_log.createIndex(
  { changed_at: 1 },
  { expireAfterSeconds: 60 * 60 * 24 * 365, name: "ttl_changed_at_365d" }
);

print("=== Done: collections + indexes ===");
print("Inventory:");
db.getCollectionNames().forEach(c => {
  const idxs = db[c].getIndexes().map(i => i.name);
  print(`  ${c}: indexes = [${idxs.join(", ")}]`);
});
