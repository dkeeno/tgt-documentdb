// =============================================================================
// 03-seed-customers-and-products.js — CRM accounts + product catalog
// =============================================================================
//
// Subset of the same fictional company set as the PostgreSQL stack — chosen
// to give the orders seed (next file) something to reference. Different
// _ids: docs use account_number / sku as the natural key.
//
// Customer doc embeds:
//   contacts[]  — multiple per account, with primary flag
//   billing[]   — invoicing addresses
//   metadata    — free-form per-account tags

print("=== Switching to enterprise_corp ===");
db = db.getSiblingDB('enterprise_corp');

const now = new Date();

// ----------- products ------------------------------------------------------
const products = [
  { sku: "HX-100001", name: "Helix Atlas Industrial Mixer M-200",     description: "Heavy-duty 200L industrial mixer for chemical processing.",   category: "industrial",  list_price: 18500.00, cost: 11000.00, weight_kg: 145.0, is_active: true,  tags: ["mixer","industrial","chemical"],         specs: { capacity_l: 200, voltage_v: 480, motor_kw: 7.5 } },
  { sku: "HX-100002", name: "Helix Atlas Conveyor Belt CB-Pro",       description: "Modular conveyor belt, 10m configurable.",                    category: "industrial",  list_price:  7200.00, cost:  4100.00, weight_kg:  62.0, is_active: true,  tags: ["conveyor","industrial"],                  specs: { length_m: 10, max_load_kg: 250 } },
  { sku: "HX-100003", name: "Helix Atlas Pressure Vessel PV-50",      description: "50-bar stainless steel pressure vessel.",                     category: "industrial",  list_price: 24000.00, cost: 14500.00, weight_kg: 410.0, is_active: true,  tags: ["pressure","vessel","industrial"],         specs: { max_bar: 50, volume_l: 2000, material: "316L SS" } },
  { sku: "HX-100004", name: "Helix Atlas Hydraulic Press HP-15T",     description: "15-ton bench-mount hydraulic press.",                         category: "industrial",  list_price:  3850.00, cost:  2150.00, weight_kg:  88.0, is_active: true,  tags: ["press","hydraulic"],                      specs: { force_t: 15, stroke_mm: 250 } },
  { sku: "HX-100005", name: "Helix Atlas Servo Motor SM-3kW",         description: "Industrial servo motor, 3kW continuous.",                     category: "industrial",  list_price:  1450.00, cost:   720.00, weight_kg:  18.5, is_active: true,  tags: ["motor","servo"],                          specs: { power_kw: 3.0, rpm_max: 3000 } },
  { sku: "HX-100006", name: "Helix Atlas Filtration Unit FU-Compact", description: "Compact filtration unit, 5 micron rating.",                   category: "industrial",  list_price:  2100.00, cost:  1080.00, weight_kg:  24.0, is_active: true,  tags: ["filter","filtration"],                    specs: { micron: 5, flow_lpm: 60 } },
  { sku: "HX-100007", name: "Helix Atlas Conveyor Roller (10-pack)",  description: "Replacement rollers for CB-Pro conveyors.",                   category: "industrial",  list_price:   340.00, cost:   125.00, weight_kg:   8.5, is_active: true,  tags: ["conveyor","spare"],                       specs: { count: 10 } },
  { sku: "HX-200001", name: "Helix Atlas Smart Thermostat T-Wave",    description: "Wi-Fi-enabled smart thermostat for residential HVAC.",        category: "consumer",    list_price:   189.00, cost:    62.00, weight_kg:   0.3, is_active: true,  tags: ["thermostat","smart-home"],                specs: { wifi: true, zigbee: true } },
  { sku: "HX-200002", name: "Helix Atlas Air Purifier AP-Tower",      description: "HEPA + activated carbon air purifier, 600 sq.ft coverage.",   category: "consumer",    list_price:   329.00, cost:   115.00, weight_kg:   8.0, is_active: true,  tags: ["purifier","smart-home"],                  specs: { coverage_sqft: 600, hepa: true } },
  { sku: "HX-200003", name: "Helix Atlas Coffee Maker CM-Brew",       description: "12-cup programmable coffee maker.",                           category: "consumer",    list_price:    89.00, cost:    32.00, weight_kg:   3.5, is_active: true,  tags: ["kitchen"],                                specs: { cups: 12 } },
  { sku: "HX-200004", name: "Helix Atlas Robot Vacuum RV-Nav",        description: "LiDAR-guided robot vacuum with auto-empty base.",             category: "consumer",    list_price:   649.00, cost:   245.00, weight_kg:   4.5, is_active: true,  tags: ["vacuum","smart-home"],                    specs: { lidar: true, auto_empty: true } },
  { sku: "HX-200005", name: "Helix Atlas Standing Desk SD-Pro",       description: "Electric height-adjustable standing desk.",                   category: "consumer",    list_price:   499.00, cost:   210.00, weight_kg:  35.0, is_active: true,  tags: ["furniture","office"],                     specs: { height_min_cm: 70, height_max_cm: 125 } },
  { sku: "HX-200006", name: "Helix Atlas Air Fryer AF-XL",            description: "8L XL air fryer with 12 presets.",                            category: "consumer",    list_price:   149.00, cost:    52.00, weight_kg:   6.8, is_active: true,  tags: ["kitchen"],                                specs: { capacity_l: 8 } },
  { sku: "HX-300001", name: "HAIL Installation Service — Standard",   description: "On-site installation, up to 4 hours, 1 technician.",          category: "service",     list_price:   450.00, cost:   180.00, weight_kg:   0.0, is_active: true,  tags: ["service","install"],                      specs: { hours: 4, technicians: 1 } },
  { sku: "HX-300002", name: "HAIL Installation Service — Complex",    description: "Complex install, up to 8 hours, 2 technicians.",              category: "service",     list_price:  1200.00, cost:   480.00, weight_kg:   0.0, is_active: true,  tags: ["service","install"],                      specs: { hours: 8, technicians: 2 } },
  { sku: "HX-300003", name: "HAIL Annual Maintenance Plan — Tier 1",  description: "Quarterly preventive maintenance for industrial equipment.",  category: "service",     list_price:  2400.00, cost:   720.00, weight_kg:   0.0, is_active: true,  tags: ["service","maintenance","annual"],         specs: { visits_per_year: 4 } },
  { sku: "HX-300004", name: "HAIL Annual Maintenance Plan — Tier 2",  description: "Monthly maintenance + 24x7 priority support.",                category: "service",     list_price:  6800.00, cost:  2200.00, weight_kg:   0.0, is_active: true,  tags: ["service","maintenance","annual","priority"], specs: { visits_per_year: 12, priority_support: true } },
  { sku: "HX-300005", name: "HAIL Training Workshop — Half Day",      description: "Half-day on-site training, up to 8 attendees.",               category: "service",     list_price:   950.00, cost:   340.00, weight_kg:   0.0, is_active: true,  tags: ["service","training"],                     specs: { hours: 4, max_attendees: 8 } },
];

print("=== Upserting products ===");
products.forEach(p => {
  p.created_at = now;
  p.updated_at = now;
  db.products.replaceOne({ sku: p.sku }, p, { upsert: true });
});
print(`  ${db.products.countDocuments()} products`);

// ----------- customers (with embedded contacts + billing) ------------------
const customers = [
  { account_number: "ACC-00001", legal_name: "Pacific Northwest Refining Corp.", trading_name: "PNR",     industry: "Energy",      country_code: "US", segment: "enterprise", annual_revenue: 4200000000, employee_count: 8500, status: "active", credit_limit: 500000,
    contacts: [
      { first_name: "Margaret", last_name: "Holloway", email: "margaret.holloway@pnr.example",  phone: "+1-206-555-0011", title: "Director of Procurement", is_primary: true,  opted_in: true },
      { first_name: "Steven",   last_name: "Park",     email: "steven.park@pnr.example",        phone: "+1-206-555-0012", title: "VP Operations",            is_primary: false, opted_in: true },
    ],
    billing: [{ street: "1500 Industrial Way", city: "Seattle", state: "WA", zip: "98108", country_code: "US" }],
    metadata: { renewals_due: "2026-09", account_tier: "platinum" }
  },
  { account_number: "ACC-00002", legal_name: "Midwest Grain & Storage Inc.",      trading_name: "MGS",     industry: "Agriculture",country_code: "US", segment: "enterprise", annual_revenue:  780000000, employee_count: 1900, status: "active", credit_limit: 300000,
    contacts: [{ first_name: "Donna", last_name: "Schroeder", email: "donna.schroeder@mgs.example", phone: "+1-312-555-0014", title: "CFO", is_primary: true, opted_in: true }],
    billing: [{ street: "4400 W Industrial Blvd", city: "Chicago", state: "IL", zip: "60604", country_code: "US" }],
    metadata: {}
  },
  { account_number: "ACC-00003", legal_name: "Bayswater Brewing Company",         trading_name: "Bayswater", industry: "Food & Bev", country_code: "GB", segment: "mid_market", annual_revenue: 145000000, employee_count: 620, status: "active", credit_limit: 150000,
    contacts: [
      { first_name: "Oliver", last_name: "Knight",  email: "oliver.knight@bayswater.example", phone: "+44-20-7946-0023", title: "Head of Production", is_primary: true,  opted_in: true },
      { first_name: "Alice",  last_name: "Martin",  email: "alice.martin@bayswater.example",  phone: "+44-20-7946-0024", title: "Operations Manager", is_primary: false, opted_in: false },
    ],
    billing: [{ street: "122 Bayswater Rd", city: "London", country_code: "GB" }],
    metadata: { gdpr_compliance: true }
  },
  { account_number: "ACC-00006", legal_name: "Tokyo Precision Industries Co. Ltd.", trading_name: "TPI",  industry: "Electronics", country_code: "JP", segment: "enterprise", annual_revenue: 980000000, employee_count: 2400, status: "active", credit_limit: 250000,
    contacts: [{ first_name: "Hiroshi", last_name: "Tanaka", email: "hiroshi.tanaka@tpi.example", phone: "+81-3-5550-0042", title: "VP Engineering", is_primary: true, opted_in: true }],
    billing: [{ street: "2-1 Marunouchi", city: "Tokyo", country_code: "JP" }],
    metadata: { language: "ja", needs_translation: true }
  },
  { account_number: "ACC-00010", legal_name: "Greater Boston Hospital Network",   trading_name: "GBHN",   industry: "Healthcare", country_code: "US", segment: "enterprise", annual_revenue: 1100000000, employee_count: 5200, status: "active", credit_limit: 200000,
    contacts: [{ first_name: "Patricia", last_name: "Goldstein", email: "patricia.goldstein@gbhn.example", phone: "+1-617-555-0078", title: "Facilities Director", is_primary: true, opted_in: true }],
    billing: [{ street: "55 Fruit St", city: "Boston", state: "MA", zip: "02114", country_code: "US" }],
    metadata: { hipaa_baa_signed: true }
  },
  { account_number: "ACC-00015", legal_name: "Rio de Janeiro Steel Works",        trading_name: "RJSW",   industry: "Metals",     country_code: "BR", segment: "enterprise", annual_revenue:  620000000, employee_count: 1850, status: "active", credit_limit: 175000,
    contacts: [{ first_name: "Luiz", last_name: "Silva", email: "luiz.silva@rjsw.example", phone: "+55-21-5550-0114", title: "Plant Manager", is_primary: true, opted_in: true }],
    billing: [{ street: "Av. Brasil 1500", city: "Rio de Janeiro", country_code: "BR" }],
    metadata: { language: "pt-BR" }
  },
  { account_number: "ACC-00017", legal_name: "Berlin Tech Manufacturing GmbH",    trading_name: "BTM",    industry: "Electronics",country_code: "DE", segment: "enterprise", annual_revenue:  540000000, employee_count: 1500, status: "active", credit_limit: 180000,
    contacts: [{ first_name: "Klaus", last_name: "Schmidt", email: "klaus.schmidt@btm.example", phone: "+49-30-5550-0133", title: "Head of Manufacturing", is_primary: true, opted_in: true }],
    billing: [{ street: "Friedrichstrasse 88", city: "Berlin", country_code: "DE" }],
    metadata: {}
  },
  { account_number: "ACC-00023", legal_name: "Cairo Pharmaceutical Manufacturing",trading_name: "CPM",    industry: "Pharma",     country_code: "EG", segment: "mid_market", annual_revenue:   96000000, employee_count:  520, status: "active", credit_limit: 110000,
    contacts: [{ first_name: "Nour", last_name: "Hassan", email: "nour.hassan@cpm.example", phone: "+20-2-5550-0193", title: "Production Manager", is_primary: true, opted_in: true }],
    billing: [{ street: "Industrial Zone Blk 4", city: "Cairo", country_code: "EG" }],
    metadata: {}
  },
  { account_number: "ACC-00025", legal_name: "Shanghai Industrial Robotics Co.",  trading_name: "SIR",    industry: "Robotics",   country_code: "CN", segment: "enterprise", annual_revenue:  880000000, employee_count: 2700, status: "active", credit_limit: 240000,
    contacts: [{ first_name: "Wei-Ling", last_name: "Chen", email: "weiling.chen@sir.example", phone: "+86-21-5550-0215", title: "Procurement Director", is_primary: true, opted_in: true }],
    billing: [{ street: "1188 Lujiazui Ring Rd", city: "Shanghai", country_code: "CN" }],
    metadata: { language: "zh-CN" }
  },
  { account_number: "ACC-00031", legal_name: "Munich Aerospace Components GmbH",  trading_name: "MAC",    industry: "Aerospace",  country_code: "DE", segment: "enterprise", annual_revenue:  780000000, employee_count: 2050, status: "active", credit_limit: 220000,
    contacts: [{ first_name: "Stefan", last_name: "Hofmann", email: "stefan.hofmann@mac.example", phone: "+49-89-5550-0274", title: "Director of Sourcing", is_primary: true, opted_in: true }],
    billing: [{ street: "Maximilianstrasse 25", city: "Munich", country_code: "DE" }],
    metadata: { iso_certifications: ["AS9100","ISO9001"] }
  },
  { account_number: "ACC-00039", legal_name: "Dublin Pharma Manufacturing",       trading_name: "DPM",    industry: "Pharma",     country_code: "IE", segment: "enterprise", annual_revenue:  560000000, employee_count: 1280, status: "active", credit_limit: 180000,
    contacts: [{ first_name: "Aoife", last_name: "Ryan", email: "aoife.ryan@dpm.example", phone: "+353-1-555-0352", title: "Manufacturing Director", is_primary: true, opted_in: true }],
    billing: [{ street: "45 Belfield Rd", city: "Dublin", country_code: "IE" }],
    metadata: { gmp_compliant: true }
  },
  { account_number: "ACC-00028", legal_name: "Buenos Aires Bottling Group",       trading_name: "BABG",   industry: "Food & Bev", country_code: "AR", segment: "mid_market", annual_revenue:   52000000, employee_count:  280, status: "suspended", credit_limit:  30000,
    contacts: [{ first_name: "Lucia", last_name: "Sanchez", email: "lucia.sanchez@babg.example", phone: "+54-11-5550-0248", title: "CFO", is_primary: true, opted_in: false }],
    billing: [{ street: "Av. Corrientes 4500", city: "Buenos Aires", country_code: "AR" }],
    metadata: { hold_reason: "payment_overdue_60d", hold_set_at: ISODate("2026-04-01") }
  },
];

print("=== Upserting customers ===");
customers.forEach(c => {
  c.created_at = now;
  c.updated_at = now;
  db.customers.replaceOne({ account_number: c.account_number }, c, { upsert: true });
});
print(`  ${db.customers.countDocuments()} customers (${db.customers.countDocuments({ status: "active" })} active)`);

print("=== CRM seed done ===");
