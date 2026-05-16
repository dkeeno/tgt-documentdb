// =============================================================================
// 04-seed-orders.js — sales orders with embedded line items
// =============================================================================
//
// Document model: each order is one document with a line_items[] subarray.
// No separate order_items collection — that would be the relational pattern.
// References to customers/products are by natural key (account_number / sku).

print("=== Switching to enterprise_corp ===");
db = db.getSiblingDB('enterprise_corp');

const now = new Date();

// Helper: round line_total = qty * unit_price * (1 - discount_pct/100)
function lineTotal(qty, price, discountPct) {
  return Math.round(qty * price * (1 - (discountPct || 0) / 100) * 100) / 100;
}

const orders = [
  {
    order_number:     "SO-2026-100001",
    customer_account: "ACC-00002",
    ordered_at:       ISODate("2026-03-21T14:32:00Z"),
    status:           "delivered",
    currency:         "USD",
    notes:            "Net-30",
    shipping:         { street: "4400 W Industrial Blvd", city: "Chicago", state: "IL", zip: "60604", country_code: "US" },
    billing:          { street: "4400 W Industrial Blvd", city: "Chicago", state: "IL", zip: "60604", country_code: "US" },
    line_items: [
      { sku: "HX-100002", name: "Conveyor Belt CB-Pro",       quantity:  6, unit_price: 7200.00, discount_pct: 5.0, line_total: lineTotal( 6, 7200.00, 5.0) },
      { sku: "HX-100007", name: "Conveyor Roller (10-pack)",  quantity: 12, unit_price:  340.00, discount_pct: 0.0, line_total: lineTotal(12,  340.00, 0.0) },
    ],
  },
  {
    order_number:     "SO-2026-100002",
    customer_account: "ACC-00003",
    ordered_at:       ISODate("2026-04-29T09:21:00Z"),
    status:           "confirmed",
    currency:         "GBP",
    notes:            "Walk-up — repeat customer",
    shipping:         { street: "122 Bayswater Rd", city: "London", country_code: "GB" },
    billing:          { street: "122 Bayswater Rd", city: "London", country_code: "GB" },
    line_items: [
      { sku: "HX-100006", name: "Filtration Unit FU-Compact", quantity: 2, unit_price: 2100.00, discount_pct: 0.0, line_total: lineTotal(2, 2100.00, 0.0) },
      { sku: "HX-300001", name: "Installation Service",        quantity: 1, unit_price:  450.00, discount_pct: 0.0, line_total: lineTotal(1,  450.00, 0.0) },
    ],
  },
  {
    order_number:     "SO-2026-100003",
    customer_account: "ACC-00006",
    ordered_at:       ISODate("2026-04-15T11:05:00Z"),
    status:           "delivered",
    currency:         "USD",
    notes:            "TPI cleanroom — high-priority install",
    shipping:         { street: "2-1 Marunouchi", city: "Tokyo", country_code: "JP" },
    billing:          { street: "2-1 Marunouchi", city: "Tokyo", country_code: "JP" },
    line_items: [
      { sku: "HX-100001", name: "Industrial Mixer M-200",      quantity: 4, unit_price: 18500.00, discount_pct: 5.0, line_total: lineTotal(4, 18500.00, 5.0) },
      { sku: "HX-300002", name: "Installation Service Complex",quantity: 2, unit_price:  1200.00, discount_pct: 0.0, line_total: lineTotal(2,  1200.00, 0.0) },
    ],
  },
  {
    order_number:     "SO-2026-100004",
    customer_account: "ACC-00010",
    ordered_at:       ISODate("2026-04-12T13:24:00Z"),
    status:           "shipped",
    currency:         "USD",
    notes:            "GBHN sterilization equipment",
    shipping:         { street: "55 Fruit St", city: "Boston", state: "MA", zip: "02114", country_code: "US" },
    billing:          { street: "55 Fruit St", city: "Boston", state: "MA", zip: "02114", country_code: "US" },
    line_items: [
      { sku: "HX-100003", name: "Pressure Vessel PV-50", quantity: 2, unit_price: 24000.00, discount_pct: 5.0, line_total: lineTotal(2, 24000.00, 5.0) },
      { sku: "HX-100006", name: "Filtration Unit",       quantity: 4, unit_price:  2100.00, discount_pct: 0.0, line_total: lineTotal(4,  2100.00, 0.0) },
      { sku: "HX-300004", name: "Maintenance Plan Tier 2", quantity: 1, unit_price: 6800.00, discount_pct: 0.0, line_total: lineTotal(1, 6800.00, 0.0) },
    ],
  },
  {
    order_number:     "SO-2026-100005",
    customer_account: "ACC-00015",
    ordered_at:       ISODate("2026-02-13T15:18:00Z"),
    status:           "delivered",
    currency:         "USD",
    notes:            "RJSW steel press maintenance + parts",
    shipping:         { street: "Av. Brasil 1500", city: "Rio de Janeiro", country_code: "BR" },
    billing:          { street: "Av. Brasil 1500", city: "Rio de Janeiro", country_code: "BR" },
    line_items: [
      { sku: "HX-300004", name: "Maintenance Plan Tier 2",   quantity:  1, unit_price: 6800.00, discount_pct: 0.0, line_total: lineTotal(1, 6800.00, 0.0) },
      { sku: "HX-100004", name: "Hydraulic Press HP-15T",     quantity: 12, unit_price: 3850.00, discount_pct: 5.0, line_total: lineTotal(12, 3850.00, 5.0) },
      { sku: "HX-300001", name: "Installation Service",       quantity:  8, unit_price:  450.00, discount_pct: 0.0, line_total: lineTotal( 8,  450.00, 0.0) },
    ],
  },
  {
    order_number:     "SO-2026-100006",
    customer_account: "ACC-00017",
    ordered_at:       ISODate("2026-05-05T16:18:00Z"),
    status:           "cancelled",
    currency:         "EUR",
    notes:            "Cust requested cancel — duplicate PO",
    shipping:         { street: "Friedrichstrasse 88", city: "Berlin", country_code: "DE" },
    billing:          { street: "Friedrichstrasse 88", city: "Berlin", country_code: "DE" },
    line_items: [
      { sku: "HX-100002", name: "Conveyor Belt CB-Pro", quantity: 4, unit_price: 7200.00, discount_pct: 0.0, line_total: lineTotal(4, 7200.00, 0.0) },
    ],
  },
  {
    order_number:     "SO-2026-100007",
    customer_account: "ACC-00023",
    ordered_at:       ISODate("2026-01-23T14:02:00Z"),
    status:           "delivered",
    currency:         "USD",
    notes:            "CPM sterile mixer set",
    shipping:         { street: "Industrial Zone Blk 4", city: "Cairo", country_code: "EG" },
    billing:          { street: "Industrial Zone Blk 4", city: "Cairo", country_code: "EG" },
    line_items: [
      { sku: "HX-100001", name: "Industrial Mixer M-200", quantity: 6, unit_price: 18500.00, discount_pct: 5.0, line_total: lineTotal(6, 18500.00, 5.0) },
      { sku: "HX-300001", name: "Installation Service",    quantity: 4, unit_price:   450.00, discount_pct: 0.0, line_total: lineTotal(4,   450.00, 0.0) },
    ],
  },
  {
    order_number:     "SO-2026-100008",
    customer_account: "ACC-00025",
    ordered_at:       ISODate("2026-05-02T13:02:00Z"),
    status:           "open",
    currency:         "USD",
    notes:            "SIR robot arm components — pending PO confirmation",
    shipping:         { street: "1188 Lujiazui Ring Rd", city: "Shanghai", country_code: "CN" },
    billing:          { street: "1188 Lujiazui Ring Rd", city: "Shanghai", country_code: "CN" },
    line_items: [
      { sku: "HX-100005", name: "Servo Motor SM-3kW", quantity: 24, unit_price: 1450.00, discount_pct: 8.0, line_total: lineTotal(24, 1450.00, 8.0) },
    ],
  },
  {
    order_number:     "SO-2026-100009",
    customer_account: "ACC-00031",
    ordered_at:       ISODate("2026-04-22T10:14:00Z"),
    status:           "shipped",
    currency:         "EUR",
    notes:            "MAC aerospace press refresh",
    shipping:         { street: "Maximilianstrasse 25", city: "Munich", country_code: "DE" },
    billing:          { street: "Maximilianstrasse 25", city: "Munich", country_code: "DE" },
    line_items: [
      { sku: "HX-100004", name: "Hydraulic Press HP-15T", quantity:  6, unit_price: 3850.00, discount_pct: 0.0, line_total: lineTotal( 6, 3850.00, 0.0) },
      { sku: "HX-300002", name: "Installation Service Complex", quantity: 2, unit_price: 1200.00, discount_pct: 0.0, line_total: lineTotal(2, 1200.00, 0.0) },
      { sku: "HX-300003", name: "Maintenance Plan Tier 1", quantity: 1, unit_price: 2400.00, discount_pct: 0.0, line_total: lineTotal(1, 2400.00, 0.0) },
    ],
  },
  {
    order_number:     "SO-2026-100010",
    customer_account: "ACC-00039",
    ordered_at:       ISODate("2026-02-21T14:50:00Z"),
    status:           "delivered",
    currency:         "EUR",
    notes:            "DPM pharma cleanroom pumps + maintenance",
    shipping:         { street: "45 Belfield Rd", city: "Dublin", country_code: "IE" },
    billing:          { street: "45 Belfield Rd", city: "Dublin", country_code: "IE" },
    line_items: [
      { sku: "HX-100006", name: "Filtration Unit FU-Compact",  quantity: 8, unit_price: 2100.00, discount_pct: 0.0, line_total: lineTotal(8, 2100.00, 0.0) },
      { sku: "HX-300003", name: "Maintenance Plan Tier 1",     quantity: 2, unit_price: 2400.00, discount_pct: 0.0, line_total: lineTotal(2, 2400.00, 0.0) },
      { sku: "HX-300004", name: "Maintenance Plan Tier 2",     quantity: 1, unit_price: 6800.00, discount_pct: 0.0, line_total: lineTotal(1, 6800.00, 0.0) },
    ],
  },
  {
    order_number:     "SO-2026-100011",
    customer_account: "ACC-00028",
    ordered_at:       ISODate("2026-02-15T09:00:00Z"),
    status:           "cancelled",
    currency:         "USD",
    notes:            "Account suspended for non-payment; refund processed",
    shipping:         { street: "Av. Corrientes 4500", city: "Buenos Aires", country_code: "AR" },
    billing:          { street: "Av. Corrientes 4500", city: "Buenos Aires", country_code: "AR" },
    line_items: [
      { sku: "HX-100007", name: "Conveyor Roller (10-pack)", quantity: 6, unit_price: 340.00, discount_pct: 0.0, line_total: lineTotal(6, 340.00, 0.0) },
    ],
  },
];

// Compute total_amount per order from line totals (denormalized for fast reads).
print("=== Upserting orders ===");
orders.forEach(o => {
  o.total_amount = Math.round(o.line_items.reduce((sum, li) => sum + li.line_total, 0) * 100) / 100;
  o.created_at = now;
  o.updated_at = now;
  db.orders.replaceOne({ order_number: o.order_number }, o, { upsert: true });
});
print(`  ${db.orders.countDocuments()} orders (${db.orders.countDocuments({ status: "delivered" })} delivered)`);

// Sanity: total revenue across non-cancelled orders
const revenue = db.orders.aggregate([
  { $match: { status: { $nin: ["cancelled"] } } },
  { $group: { _id: null, total: { $sum: "$total_amount" } } }
]).toArray();
print(`  Total non-cancelled revenue: ${revenue[0] ? revenue[0].total : 0}`);

print("=== Orders seed done ===");
