// =============================================================================
// 05-seed-tickets-and-audit.js — support tickets + audit_log entries
// =============================================================================
//
// Support tickets demonstrate:
//   - embedded events[] subarray (each ticket carries its own audit trail)
//   - SLA fields (priority, sla_due_at)
//   - assignment to support team (employee_number reference)
//
// Audit log entries demonstrate:
//   - the structure auto-purged by the TTL index (changed_at + 365d)
//   - cross-collection event tracking with collection_name + document_id

print("=== Switching to enterprise_corp ===");
db = db.getSiblingDB('enterprise_corp');

const now = new Date();

// Helper: ISO offset N days into past/future
function daysFromNow(n) { return new Date(Date.now() + n * 24 * 60 * 60 * 1000); }

// ----------- support_tickets ----------------------------------------------
const tickets = [
  {
    ticket_number:    "TKT-2026-0001",
    customer_account: "ACC-00006",
    subject:          "M-200 mixer drive belt slipping under load",
    description:      "After 8 weeks of use the drive belt slips at >180L fill. Need on-site inspection.",
    category:         "hardware_failure",
    priority:         "high",
    status:           "open",
    assigned_to:      "E000074",  // Pavel Horák
    created_at:       daysFromNow(-2),
    sla_due_at:       daysFromNow(2),
    events: [
      { at: daysFromNow(-2),     by: "ACC-00006:hiroshi.tanaka@tpi.example", type: "created",   note: "Customer-submitted via portal" },
      { at: daysFromNow(-1.95),  by: "system",                                 type: "auto_route",note: "Routed to APAC support based on customer region" },
      { at: daysFromNow(-1.5),   by: "E000074",                                type: "assigned",  note: "Pavel picked up; gathering serial + service history" },
      { at: daysFromNow(-1),     by: "E000074",                                type: "comment",   note: "Awaiting customer to confirm drive belt SKU" },
    ],
  },
  {
    ticket_number:    "TKT-2026-0002",
    customer_account: "ACC-00010",
    subject:          "PV-50 pressure vessel — gauge inconsistent readings",
    description:      "Pressure gauge on PV-50 shows 3-5% variance vs calibrated reference.",
    category:         "calibration",
    priority:         "medium",
    status:           "in_progress",
    assigned_to:      "E000075",  // Hala Fakhouri
    created_at:       daysFromNow(-7),
    sla_due_at:       daysFromNow(7),
    events: [
      { at: daysFromNow(-7),  by: "ACC-00010:patricia.goldstein@gbhn.example", type: "created",   note: "Customer escalation" },
      { at: daysFromNow(-6),  by: "E000075",                                    type: "assigned",  note: "Hala on it" },
      { at: daysFromNow(-5),  by: "E000075",                                    type: "comment",   note: "Walked customer through gauge zero-cal procedure; will re-check in 48h" },
      { at: daysFromNow(-3),  by: "ACC-00010:patricia.goldstein@gbhn.example", type: "comment",   note: "Re-cal didn't help; pressure varies after warmup" },
      { at: daysFromNow(-2),  by: "E000075",                                    type: "escalation",note: "Routing to engineering for warranty replacement" },
    ],
  },
  {
    ticket_number:    "TKT-2026-0003",
    customer_account: "ACC-00003",
    subject:          "Conveyor roller pack — short shipment",
    description:      "Order delivered 8 of 12 rollers from PN HX-100007.",
    category:         "shipping",
    priority:         "medium",
    status:           "resolved",
    assigned_to:      "E000074",
    resolved_at:      daysFromNow(-15),
    created_at:       daysFromNow(-20),
    resolution:       "Replacement 4-pack shipped DHL Priority 2026-04-25",
    events: [
      { at: daysFromNow(-20), by: "ACC-00003:oliver.knight@bayswater.example", type: "created",  note: "Customer reported short ship" },
      { at: daysFromNow(-19), by: "E000074",                                    type: "comment",  note: "Cross-checked warehouse — 4 units never picked. Logistics ticket #L-4421 raised." },
      { at: daysFromNow(-17), by: "E000074",                                    type: "comment",  note: "Replacement shipped; tracking 1Z9994W90357483921" },
      { at: daysFromNow(-15), by: "E000074",                                    type: "resolved", note: "Customer confirmed receipt and acceptance" },
    ],
  },
  {
    ticket_number:    "TKT-2026-0004",
    customer_account: "ACC-00031",
    subject:          "AS9100 documentation request — installation cert",
    description:      "MAC needs ISO/AS9100-compliant installation certification PDFs for the Q2 audit.",
    category:         "documentation",
    priority:         "low",
    status:           "open",
    assigned_to:      "E000073",  // Lakshmi Subramanian
    created_at:       daysFromNow(-3),
    sla_due_at:       daysFromNow(11),
    events: [
      { at: daysFromNow(-3), by: "ACC-00031:stefan.hofmann@mac.example", type: "created",  note: "Customer audit prep" },
      { at: daysFromNow(-2), by: "E000073",                               type: "assigned", note: "Pulling install records from PSA database" },
    ],
  },
  {
    ticket_number:    "TKT-2026-0005",
    customer_account: "ACC-00023",
    subject:          "Mixer M-200 GMP validation report request",
    description:      "Pharma audit — need OQ/IQ/PQ documentation for M-200 install.",
    category:         "documentation",
    priority:         "high",
    status:           "in_progress",
    assigned_to:      "E000073",
    created_at:       daysFromNow(-5),
    sla_due_at:       daysFromNow(2),
    events: [
      { at: daysFromNow(-5), by: "ACC-00023:nour.hassan@cpm.example", type: "created",   note: "Pharma manufacturing audit triggered" },
      { at: daysFromNow(-4), by: "E000073",                            type: "assigned",  note: "Pulling validation pack" },
      { at: daysFromNow(-3), by: "E000073",                            type: "comment",   note: "OQ + IQ docs ready; PQ outstanding from install team" },
      { at: daysFromNow(-2), by: "E000073",                            type: "escalation",note: "Pinged install team — needs response by tomorrow" },
    ],
  },
  {
    ticket_number:    "TKT-2026-0006",
    customer_account: "ACC-00015",
    subject:          "Hydraulic press leak — slow oil weep",
    description:      "Slow oil weep at piston seal on HP-15T. Not service-affecting yet.",
    category:         "hardware_failure",
    priority:         "low",
    status:           "open",
    assigned_to:      "E000074",
    created_at:       daysFromNow(-8),
    sla_due_at:       daysFromNow(20),
    events: [
      { at: daysFromNow(-8), by: "ACC-00015:luiz.silva@rjsw.example", type: "created",  note: "Plant manager noted weep during weekly inspection" },
      { at: daysFromNow(-7), by: "E000074",                            type: "assigned", note: "Diagnosing remotely first" },
    ],
  },
  {
    ticket_number:    "TKT-2026-0007",
    customer_account: "ACC-00002",
    subject:          "Conveyor belt — vibration at 60% speed",
    description:      "CB-Pro line 3 develops vibration at ~60% of rated speed. No alarm tripped.",
    category:         "performance",
    priority:         "medium",
    status:           "resolved",
    assigned_to:      "E000074",
    resolved_at:      daysFromNow(-1),
    created_at:       daysFromNow(-10),
    resolution:       "Belt tensioner re-adjusted on-site; vibration eliminated. Recommended quarterly tensioner check.",
    events: [
      { at: daysFromNow(-10), by: "ACC-00002:donna.schroeder@mgs.example", type: "created",  note: "Customer noticed during routine ops" },
      { at: daysFromNow(-9),  by: "E000074",                                type: "assigned", note: "Will dispatch field tech" },
      { at: daysFromNow(-4),  by: "E000074",                                type: "comment",  note: "Field visit scheduled 2026-05-12" },
      { at: daysFromNow(-1),  by: "E000074",                                type: "resolved", note: "On-site adjustment successful" },
    ],
  },
];

print("=== Upserting support_tickets ===");
tickets.forEach(t => {
  t.updated_at = now;
  db.support_tickets.replaceOne({ ticket_number: t.ticket_number }, t, { upsert: true });
});
print(`  ${db.support_tickets.countDocuments()} tickets, ${db.support_tickets.countDocuments({ status: "open" })} open, ${db.support_tickets.countDocuments({ status: "in_progress" })} in_progress, ${db.support_tickets.countDocuments({ status: "resolved" })} resolved`);

// ----------- audit_log -----------------------------------------------------
// Synthetic audit events covering employee + customer + order changes.
// In real life these would be written by application middleware; the seed
// is just to populate enough rows to demo the TTL + per-document history index.
print("=== Inserting audit_log events ===");

const auditEvents = [
  // Employee promotion + salary change
  { collection_name: "employees", document_id: "E000011", changed_at: daysFromNow(-30), operation: "update", changed_by_user: "hr.admin@hail.example", before: { base_salary: 142000, position: { title: "Software Engineer" } }, after: { base_salary: 155000, position: { title: "Senior Software Engineer" } }, note: "Promotion to Senior" },
  { collection_name: "employees", document_id: "E000099", changed_at: daysFromNow(-145), operation: "update", changed_by_user: "hr.admin@hail.example", before: { is_active: true,  terminated_at: null }, after: { is_active: false, terminated_at: ISODate("2025-12-19") }, note: "Termination — voluntary" },
  // Customer credit limit change
  { collection_name: "customers", document_id: "ACC-00028", changed_at: daysFromNow(-40), operation: "update", changed_by_user: "credit.team@hail.example", before: { status: "active",   credit_limit:  72000 }, after: { status: "suspended", credit_limit: 30000 }, note: "Suspended for 60d AR overdue" },
  { collection_name: "customers", document_id: "ACC-00010", changed_at: daysFromNow(-92), operation: "update", changed_by_user: "sales.ops@hail.example",   before: { credit_limit: 150000 }, after: { credit_limit: 200000 }, note: "Credit increase per Q1 review" },
  // Order status changes
  { collection_name: "orders", document_id: "SO-2026-100001", changed_at: daysFromNow(-50), operation: "update", changed_by_user: "fulfillment@hail.example", before: { status: "shipped" }, after: { status: "delivered" }, note: "POD received via DHL" },
  { collection_name: "orders", document_id: "SO-2026-100006", changed_at: daysFromNow(-7),  operation: "update", changed_by_user: "ACC-00017:klaus.schmidt@btm.example", before: { status: "open" }, after: { status: "cancelled" }, note: "Customer-requested cancel" },
  { collection_name: "orders", document_id: "SO-2026-100011", changed_at: daysFromNow(-85), operation: "update", changed_by_user: "credit.team@hail.example", before: { status: "open" }, after: { status: "cancelled" }, note: "Auto-cancel: customer suspension" },
  // Product price change
  { collection_name: "products", document_id: "HX-100004", changed_at: daysFromNow(-22), operation: "update", changed_by_user: "pricing.team@hail.example", before: { list_price: 3650.00 }, after: { list_price: 3850.00 }, note: "Q2 price adjustment +5.5%" },
  { collection_name: "products", document_id: "HX-200004", changed_at: daysFromNow(-22), operation: "update", changed_by_user: "pricing.team@hail.example", before: { list_price: 599.00 },  after: { list_price: 649.00 },  note: "Q2 price adjustment +8.3%" },
  // Old events that will eventually be auto-purged by TTL (when changed_at < now - 365d)
  { collection_name: "employees", document_id: "E000011", changed_at: daysFromNow(-365), operation: "create", changed_by_user: "hr.admin@hail.example", before: null, after: { hired_at: ISODate("2020-01-13") }, note: "Hire" },
  { collection_name: "employees", document_id: "E000017", changed_at: daysFromNow(-360), operation: "create", changed_by_user: "hr.admin@hail.example", before: null, after: { hired_at: ISODate("2021-01-11") }, note: "Hire" },
];

// Use insertMany — audit log is append-only, no updates.
db.audit_log.insertMany(auditEvents);
print(`  ${db.audit_log.countDocuments()} audit events`);

// ----------- summary -------------------------------------------------------
print("=== Final inventory ===");
db.getCollectionNames().sort().forEach(c => {
  print(`  ${c}: ${db[c].countDocuments()} documents`);
});
print("=== DocumentDB seed complete ===");
