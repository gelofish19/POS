const http = require("http");
const fs = require("fs");
const path = require("path");
const { DatabaseSync } = require("node:sqlite");
const bcrypt = require("bcryptjs");

const PORT = Number(process.env.PORT || 4173);
const ROOT = __dirname;
const DB_PATH = process.env.POS_DB_PATH || path.join(ROOT, "pos.sqlite");

const MIME_TYPES = {
  ".html": "text/html; charset=UTF-8",
  ".css": "text/css; charset=UTF-8",
  ".js": "application/javascript; charset=UTF-8",
  ".json": "application/json; charset=UTF-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon"
};

const PAYMENT_METHODS = new Set(["Cash", "GCash", "Bank Transfer", "Card"]);

const DEFAULT_STAFF = [
  { id: "u1", username: "admin", name: "Admin", role: "Admin", pin: "1234" },
  { id: "u2", username: "cashier1", name: "Cashier 1", role: "Cashier", pin: "1234" }
];

const DEFAULT_SERVICES = [
  { id: "EL01", name: "Smart Load", category: "Load", subcategory: "Smart-Regular", price: 20, active: true },
  { id: "EL02", name: "Globe Load", category: "Load", subcategory: "Globe-Regular", price: 30, active: true },
  { id: "PR01", name: "Printing B/W", category: "Printing", price: 5, active: true },
  { id: "PR02", name: "Printing Color", category: "Printing", price: 15, active: true }
];

const db = new DatabaseSync(DB_PATH);
db.exec("PRAGMA foreign_keys = ON;");
initSchema();
seedDefaultsIfEmpty();
normalizeLoadCatalog();
ensurePrintCatalog();
ensureBillsCatalog();
normalizeBillsUtilityTypes();

function initSchema() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS app_meta (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS staff_users (
      id TEXT PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      role TEXT NOT NULL,
      pin_hash TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS services (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      category TEXT NOT NULL,
      subcategory TEXT NOT NULL DEFAULT '',
      sub_subcategory TEXT NOT NULL DEFAULT '',
      current_price REAL NOT NULL CHECK (current_price > 0),
      price_mode TEXT NOT NULL DEFAULT 'fixed' CHECK (price_mode IN ('fixed', 'ask')),
      active INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0, 1)),
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS service_price_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      service_id TEXT NOT NULL,
      action TEXT NOT NULL,
      previous_price REAL,
      price REAL NOT NULL,
      changed_by_staff_id TEXT,
      changed_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (service_id) REFERENCES services(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS transactions (
      id TEXT PRIMARY KEY,
      tx_date TEXT NOT NULL,
      tx_time TEXT NOT NULL,
      staff_id TEXT NOT NULL,
      payment_method TEXT NOT NULL,
      total REAL NOT NULL CHECK (total >= 0),
      reference_number TEXT,
      customer_name TEXT,
      customer_phone TEXT,
      cash_received REAL,
      change_due REAL,
      is_deleted INTEGER NOT NULL DEFAULT 0 CHECK (is_deleted IN (0, 1)),
      deleted_at TEXT,
      deleted_by_staff_id TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (staff_id) REFERENCES staff_users(id)
    );

    CREATE TABLE IF NOT EXISTS cash_movements (
      id TEXT PRIMARY KEY,
      entry_date TEXT NOT NULL,
      entry_time TEXT NOT NULL,
      staff_id TEXT NOT NULL,
      movement_type TEXT NOT NULL CHECK (movement_type IN ('in', 'out')),
      amount REAL NOT NULL CHECK (amount > 0),
      note TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (staff_id) REFERENCES staff_users(id)
    );

    CREATE TABLE IF NOT EXISTS transaction_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      transaction_id TEXT NOT NULL,
      service_id TEXT,
      service_name TEXT NOT NULL,
      unit_price REAL NOT NULL CHECK (unit_price > 0),
      qty INTEGER NOT NULL CHECK (qty > 0),
      line_total REAL NOT NULL CHECK (line_total >= 0),
      FOREIGN KEY (transaction_id) REFERENCES transactions(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS audit_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      entity_type TEXT NOT NULL,
      entity_id TEXT NOT NULL,
      action TEXT NOT NULL,
      staff_id TEXT,
      details TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS inventory_products (
      id TEXT PRIMARY KEY,
      product_name TEXT NOT NULL,
      sku TEXT UNIQUE,
      category TEXT NOT NULL DEFAULT '',
      unit TEXT NOT NULL DEFAULT 'pc',
      actual_cost REAL NOT NULL DEFAULT 0 CHECK (actual_cost >= 0),
      selling_price REAL NOT NULL DEFAULT 0 CHECK (selling_price >= 0),
      stock_qty REAL NOT NULL DEFAULT 0,
      reorder_level REAL NOT NULL DEFAULT 0 CHECK (reorder_level >= 0),
      supplier TEXT NOT NULL DEFAULT '',
      linked_service_id TEXT,
      is_active INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1)),
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (linked_service_id) REFERENCES services(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS inventory_movements (
      id TEXT PRIMARY KEY,
      product_id TEXT NOT NULL,
      movement_type TEXT NOT NULL CHECK (movement_type IN ('adjustment', 'sale_deduction', 'restock')),
      qty_change REAL NOT NULL,
      previous_qty REAL NOT NULL,
      new_qty REAL NOT NULL,
      note TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      created_by TEXT,
      FOREIGN KEY (product_id) REFERENCES inventory_products(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(tx_date);
    CREATE INDEX IF NOT EXISTS idx_cash_movements_date ON cash_movements(entry_date);
    CREATE INDEX IF NOT EXISTS idx_transaction_items_tx ON transaction_items(transaction_id);
    CREATE INDEX IF NOT EXISTS idx_price_history_service ON service_price_history(service_id, changed_at DESC);
    CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON audit_logs(entity_type, entity_id, created_at DESC);
    CREATE UNIQUE INDEX IF NOT EXISTS idx_inventory_products_sku_unique ON inventory_products(sku) WHERE sku IS NOT NULL AND trim(sku) <> '';
    CREATE INDEX IF NOT EXISTS idx_inventory_products_category ON inventory_products(category);
    CREATE INDEX IF NOT EXISTS idx_inventory_products_active ON inventory_products(is_active);
    CREATE INDEX IF NOT EXISTS idx_inventory_movements_product_date ON inventory_movements(product_id, created_at DESC);
  `);

  const serviceCols = db.prepare("PRAGMA table_info(services)").all();
  if (!serviceCols.some((col) => col.name === "subcategory")) {
    db.exec("ALTER TABLE services ADD COLUMN subcategory TEXT NOT NULL DEFAULT '';");
  }
  if (!serviceCols.some((col) => col.name === "sub_subcategory")) {
    db.exec("ALTER TABLE services ADD COLUMN sub_subcategory TEXT NOT NULL DEFAULT '';");
  }
  if (!serviceCols.some((col) => col.name === "price_mode")) {
    db.exec("ALTER TABLE services ADD COLUMN price_mode TEXT NOT NULL DEFAULT 'fixed';");
    db.exec("UPDATE services SET price_mode = 'fixed' WHERE price_mode IS NULL OR trim(price_mode) = '';");
  }
  if (!serviceCols.some((col) => col.name === "sort_order")) {
    db.exec("ALTER TABLE services ADD COLUMN sort_order INTEGER NOT NULL DEFAULT 0;");
    const rows = db.prepare("SELECT id, category, subcategory, sub_subcategory, rowid FROM services ORDER BY category ASC, subcategory ASC, sub_subcategory ASC, name ASC, rowid ASC").all();
    const byGroup = new Map();
    const update = db.prepare("UPDATE services SET sort_order = ? WHERE id = ?");
    for (const row of rows) {
      const key = `${String(row.category || "").trim()}::${String(row.subcategory || "").trim()}::${String(row.sub_subcategory || "").trim()}`;
      const next = (byGroup.get(key) || 0) + 1;
      byGroup.set(key, next);
      update.run(next, row.id);
    }
  }

  const transactionCols = db.prepare("PRAGMA table_info(transactions)").all();
  if (!transactionCols.some((col) => col.name === "reference_number")) {
    db.exec("ALTER TABLE transactions ADD COLUMN reference_number TEXT;");
  }
  if (!transactionCols.some((col) => col.name === "is_deleted")) {
    db.exec("ALTER TABLE transactions ADD COLUMN is_deleted INTEGER NOT NULL DEFAULT 0;");
  }
  if (!transactionCols.some((col) => col.name === "deleted_at")) {
    db.exec("ALTER TABLE transactions ADD COLUMN deleted_at TEXT;");
  }
  if (!transactionCols.some((col) => col.name === "deleted_by_staff_id")) {
    db.exec("ALTER TABLE transactions ADD COLUMN deleted_by_staff_id TEXT;");
  }

  db.exec("CREATE INDEX IF NOT EXISTS idx_transactions_deleted ON transactions(is_deleted, tx_date);");

  const inventoryCols = db.prepare("PRAGMA table_info(inventory_products)").all();
  if (inventoryCols.length > 0) {
    if (!inventoryCols.some((col) => col.name === "linked_service_id")) {
      db.exec("ALTER TABLE inventory_products ADD COLUMN linked_service_id TEXT;");
    }
    if (!inventoryCols.some((col) => col.name === "is_active")) {
      db.exec("ALTER TABLE inventory_products ADD COLUMN is_active INTEGER NOT NULL DEFAULT 1;");
      db.exec("UPDATE inventory_products SET is_active = 1 WHERE is_active IS NULL;");
    }
    if (!inventoryCols.some((col) => col.name === "created_at")) {
      db.exec("ALTER TABLE inventory_products ADD COLUMN created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP;");
    }
    if (!inventoryCols.some((col) => col.name === "updated_at")) {
      db.exec("ALTER TABLE inventory_products ADD COLUMN updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP;");
    }
  }
}

function logAudit(entityType, entityId, action, staffId = "", details = null) {
  const normalizedStaff = String(staffId || "").trim() || null;
  const detailsJson = details ? JSON.stringify(details) : null;
  db.prepare(`
      INSERT INTO audit_logs (entity_type, entity_id, action, staff_id, details)
      VALUES (?, ?, ?, ?, ?)
    `).run(String(entityType || "").trim(), String(entityId || "").trim(), String(action || "").trim(), normalizedStaff, detailsJson);
}

function uniquePreserve(values) {
  const out = [];
  const seen = new Set();
  for (const raw of values || []) {
    const v = String(raw || "").trim();
    if (!v || seen.has(v)) continue;
    seen.add(v);
    out.push(v);
  }
  return out;
}

function getNextServiceSortOrder(category, subcategory = "", subSubcategory = "") {
  const row = db.prepare("SELECT COALESCE(MAX(sort_order), 0) AS maxSort FROM services WHERE category = ? AND subcategory = ? AND sub_subcategory = ?")
    .get(String(category || "").trim(), String(subcategory || "").trim(), String(subSubcategory || "").trim());
  return Number(row?.maxSort || 0) + 1;
}

function seedDefaultsIfEmpty() {
  const hasStaff = db.prepare("SELECT 1 FROM staff_users LIMIT 1").get();
  if (!hasStaff) {
    const insertStaff = db.prepare(
      "INSERT INTO staff_users (id, username, name, role, pin_hash) VALUES (?, ?, ?, ?, ?)"
    );
    for (const user of DEFAULT_STAFF) {
      insertStaff.run(user.id, user.username, user.name, user.role, bcrypt.hashSync(user.pin, 10));
    }
  }

  const hasServices = db.prepare("SELECT 1 FROM services LIMIT 1").get();
  if (!hasServices) {
    const insertService = db.prepare(
      "INSERT INTO services (id, name, category, subcategory, sub_subcategory, current_price, active, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
    );
    const insertHistory = db.prepare(
      "INSERT INTO service_price_history (service_id, action, previous_price, price, changed_by_staff_id, changed_at) VALUES (?, ?, ?, ?, ?, ?)"
    );
    const now = new Date().toISOString();
    for (const service of DEFAULT_SERVICES) {
      insertService.run(
        service.id,
        service.name,
        service.category,
        String(service.subcategory || ""),
        String(service.subSubcategory || ""),
        Number(service.price),
        service.active ? 1 : 0,
        getNextServiceSortOrder(service.category, String(service.subcategory || ""), String(service.subSubcategory || ""))
      );
      insertHistory.run(service.id, "create", null, Number(service.price), "system", now);
    }
  }
}

function inferLoadSubcategory(name) {
  const text = String(name || "").trim();
  const lowered = text.toLowerCase();
  let network = "Load";
  if (lowered.startsWith("smart")) network = "Smart";
  else if (lowered.startsWith("globe")) network = "Globe";
  else if (lowered.startsWith("dito")) network = "DITO";
  else if (lowered.startsWith("gomo")) network = "GOMO";
  else if (lowered.startsWith("tm")) network = "TM";
  else if (lowered.startsWith("tnt")) network = "TNT";
  else if (lowered.startsWith("sun")) network = "Sun";

  const isPromo = /(promo|magic|go\+|go |go\d|go\d|\bunli\b|level-up|no expiry|data\+|surf|allnet|combo|bundle)/i.test(text);
  return `${network}-${isPromo ? "Promo" : "Regular"}`;
}

function normalizeLoadCatalog() {
  const now = new Date().toISOString();
  db.exec("BEGIN TRANSACTION;");
  try {
    db.prepare("UPDATE services SET category = 'Load', updated_at = ? WHERE category = 'Eloading'").run(now);

    const loadRows = db.prepare("SELECT id, name, subcategory, sub_subcategory FROM services WHERE category = 'Load'").all();
    const updateSub = db.prepare("UPDATE services SET subcategory = ?, sub_subcategory = ?, updated_at = ? WHERE id = ?");
    for (const row of loadRows) {
      const rawSub = String(row.subcategory || "").trim() || inferLoadSubcategory(row.name);
      const existingSubSub = String(row.sub_subcategory || "").trim();
      if (rawSub.includes("-")) {
        const [network, tier] = rawSub.split("-");
        updateSub.run((network || "Load").trim(), (tier || existingSubSub || "Regular").trim(), now, row.id);
      } else {
        updateSub.run(rawSub, existingSubSub, now, row.id);
      }
    }

    const extraLoadOffers = [
      { name: "Smart Regular Load 10", subcategory: "Smart-Regular", price: 10 },
      { name: "Smart Promo Data 99", subcategory: "Smart-Promo", price: 99 },
      { name: "Globe Regular Load 20", subcategory: "Globe-Regular", price: 20 },
      { name: "Globe Promo Go+99", subcategory: "Globe-Promo", price: 99 },
      { name: "DITO Regular Load 50", subcategory: "DITO-Regular", price: 50 },
      { name: "DITO Promo Level-Up 99", subcategory: "DITO-Promo", price: 99 },
      { name: "GOMO Regular Load 199", subcategory: "GOMO-Regular", price: 199 },
      { name: "GOMO Promo No Expiry 399", subcategory: "GOMO-Promo", price: 399 },
      { name: "TM Regular Load 30", subcategory: "TM-Regular", price: 30 },
      { name: "TM Promo EasySurf 99", subcategory: "TM-Promo", price: 99 },
      { name: "TNT Regular Load 20", subcategory: "TNT-Regular", price: 20 },
      { name: "TNT Promo Panalo 99", subcategory: "TNT-Promo", price: 99 },
      { name: "Sun Regular Load 50", subcategory: "Sun-Regular", price: 50 },
      { name: "Sun Promo Data 199", subcategory: "Sun-Promo", price: 199 }
    ];

    const existsByName = db.prepare("SELECT id FROM services WHERE category = 'Load' AND lower(name) = lower(?) LIMIT 1");
    const countRow = db.prepare("SELECT COUNT(*) AS count FROM services").get();
    let nextNum = Number(countRow?.count || 0) + 1;
    const insertService = db.prepare(
      "INSERT INTO services (id, name, category, subcategory, sub_subcategory, current_price, active, sort_order, updated_at) VALUES (?, ?, 'Load', ?, ?, ?, 1, ?, ?)"
    );
    const insertHistory = db.prepare(
      "INSERT INTO service_price_history (service_id, action, previous_price, price, changed_by_staff_id, changed_at) VALUES (?, 'create', NULL, ?, 'system', ?)"
    );
    for (const offer of extraLoadOffers) {
      const existing = existsByName.get(offer.name);
      if (existing) continue;
      const id = `LD${String(nextNum).padStart(3, "0")}`;
      nextNum += 1;
      const [network, tier] = String(offer.subcategory || "Load-Regular").split("-");
      insertService.run(
        id,
        offer.name,
        (network || "Load").trim(),
        (tier || "Regular").trim(),
        Number(offer.price),
        getNextServiceSortOrder("Load", (network || "Load").trim(), (tier || "Regular").trim()),
        now
      );
      insertHistory.run(id, Number(offer.price), now);
    }

    const taxonomy = getMergedTaxonomy();
    if (taxonomy.categories.includes("Eloading")) {
      taxonomy.categories = taxonomy.categories.filter((c) => c !== "Eloading");
    }
    if (!taxonomy.categories.includes("Load")) {
      taxonomy.categories.push("Load");
    }
    taxonomy.categories.sort((a, b) => a.localeCompare(b));
    const combinedSubs = new Set([
      ...(taxonomy.subcategories.Load || []),
      ...(taxonomy.subcategories.Eloading || []),
      ...extraLoadOffers.map((o) => o.subcategory),
      ...loadRows.map((r) => {
        const base = String(r.subcategory || "").trim() || inferLoadSubcategory(r.name);
        if (base.includes("-")) return base.split("-")[0].trim();
        return base;
      })
    ]);
    delete taxonomy.subcategories.Eloading;
    taxonomy.subcategories.Load = [...combinedSubs].filter(Boolean).sort((a, b) => a.localeCompare(b));
    saveStoredTaxonomy(taxonomy);

    db.exec("COMMIT;");
  } catch (error) {
    db.exec("ROLLBACK;");
    throw error;
  }
}

function ensureBillsCatalog() {
  const billServices = [
    // Utilities
    { name: "Meralco", subcategory: "Utilities", price: 10 },
    { name: "VECO", subcategory: "Utilities", price: 10 },
    { name: "Davao Light", subcategory: "Utilities", price: 10 },
    { name: "MORE Power", subcategory: "Utilities", price: 10 },
    { name: "BENECO", subcategory: "Utilities", price: 10 },
    { name: "MWSI / Manila Water", subcategory: "Utilities", price: 10 },
    { name: "Maynilad", subcategory: "Utilities", price: 10 },
    { name: "PrimeWater", subcategory: "Utilities", price: 10 },
    { name: "Laguna Water", subcategory: "Utilities", price: 10 },
    { name: "Happy Well", subcategory: "Utilities", price: 10 },

    // Telecom
    { name: "Smart Postpaid", subcategory: "Telecom", price: 10 },
    { name: "Globe Postpaid", subcategory: "Telecom", price: 10 },
    { name: "DITO Postpaid", subcategory: "Telecom", price: 10 },
    { name: "Sun Postpaid", subcategory: "Telecom", price: 10 },
    { name: "TM / TNT Bills", subcategory: "Telecom", price: 10 },

    // Internet & Cable
    { name: "PLDT", subcategory: "Internet & Cable", price: 10 },
    { name: "Converge", subcategory: "Internet & Cable", price: 10 },
    { name: "Globe At Home", subcategory: "Internet & Cable", price: 10 },
    { name: "Sky", subcategory: "Internet & Cable", price: 10 },
    { name: "Cignal", subcategory: "Internet & Cable", price: 10 },
    { name: "Cablelink", subcategory: "Internet & Cable", price: 10 },
    { name: "Parasat", subcategory: "Internet & Cable", price: 10 },
    { name: "ComClark", subcategory: "Internet & Cable", price: 10 },

    // Government
    { name: "BIR", subcategory: "Government", price: 10 },
    { name: "SSS", subcategory: "Government", price: 10 },
    { name: "Pag-IBIG", subcategory: "Government", price: 10 },
    { name: "PhilHealth", subcategory: "Government", price: 10 },
    { name: "LTO", subcategory: "Government", price: 10 },
    { name: "NBI", subcategory: "Government", price: 10 },
    { name: "MMDA", subcategory: "Government", price: 10 },
    { name: "PRC", subcategory: "Government", price: 10 },

    // Loans & Financing
    { name: "Home Credit", subcategory: "Loans & Financing", price: 10 },
    { name: "AEON Credit", subcategory: "Loans & Financing", price: 10 },
    { name: "Billease", subcategory: "Loans & Financing", price: 10 },
    { name: "Tala", subcategory: "Loans & Financing", price: 10 },
    { name: "JuanHand", subcategory: "Loans & Financing", price: 10 },
    { name: "Cashalo", subcategory: "Loans & Financing", price: 10 },

    // Banks & Cards
    { name: "BDO Credit Card", subcategory: "Banks & Cards", price: 10 },
    { name: "BPI Credit Card", subcategory: "Banks & Cards", price: 10 },
    { name: "Metrobank Card", subcategory: "Banks & Cards", price: 10 },
    { name: "RCBC Bankard", subcategory: "Banks & Cards", price: 10 },
    { name: "UnionBank Card", subcategory: "Banks & Cards", price: 10 },
    { name: "Security Bank Card", subcategory: "Banks & Cards", price: 10 },
    { name: "EastWest Card", subcategory: "Banks & Cards", price: 10 },
    { name: "PNB Card", subcategory: "Banks & Cards", price: 10 },

    // Insurance
    { name: "Sun Life", subcategory: "Insurance", price: 10 },
    { name: "PRU Life UK", subcategory: "Insurance", price: 10 },
    { name: "AXA Philippines", subcategory: "Insurance", price: 10 },
    { name: "Manulife", subcategory: "Insurance", price: 10 },
    { name: "AIA Philippines", subcategory: "Insurance", price: 10 },
    { name: "FWD Life", subcategory: "Insurance", price: 10 },
    { name: "Insular Life", subcategory: "Insurance", price: 10 },
    { name: "Philam Life", subcategory: "Insurance", price: 10 },

    // Real Estate
    { name: "Ayala Land", subcategory: "Real Estate", price: 10 },
    { name: "SMDC", subcategory: "Real Estate", price: 10 },
    { name: "Megaworld", subcategory: "Real Estate", price: 10 },
    { name: "DMCI Homes", subcategory: "Real Estate", price: 10 },
    { name: "Filinvest Land", subcategory: "Real Estate", price: 10 },
    { name: "Robinsons Land", subcategory: "Real Estate", price: 10 },

    // Education
    { name: "AMA University", subcategory: "Education", price: 10 },
    { name: "Mapua", subcategory: "Education", price: 10 },
    { name: "STI", subcategory: "Education", price: 10 },
    { name: "Lyceum", subcategory: "Education", price: 10 },
    { name: "FEU", subcategory: "Education", price: 10 },
    { name: "National University", subcategory: "Education", price: 10 },
    { name: "Arellano University", subcategory: "Education", price: 10 },

    // Healthcare
    { name: "Maxicare", subcategory: "Healthcare", price: 10 },
    { name: "Medicard", subcategory: "Healthcare", price: 10 },
    { name: "Intellicare", subcategory: "Healthcare", price: 10 },
    { name: "Kaiser", subcategory: "Healthcare", price: 10 },

    // Transport & Travel
    { name: "Cebu Pacific", subcategory: "Transport & Travel", price: 10 },
    { name: "Philippine Airlines", subcategory: "Transport & Travel", price: 10 },
    { name: "AirAsia", subcategory: "Transport & Travel", price: 10 },
    { name: "2GO Travel", subcategory: "Transport & Travel", price: 10 },
    { name: "SLEX RFID", subcategory: "Transport & Travel", price: 10 },
    { name: "NLEX RFID", subcategory: "Transport & Travel", price: 10 },
    { name: "Autosweep RFID", subcategory: "Transport & Travel", price: 10 },

    // Memberships & Others
    { name: "Pag-IBIG MP2", subcategory: "Memberships & Others", price: 10 },
    { name: "Cable TV Misc", subcategory: "Memberships & Others", price: 10 },
    { name: "Homeowners Association", subcategory: "Memberships & Others", price: 10 }
  ];

  const now = new Date().toISOString();
  db.exec("BEGIN TRANSACTION;");
  try {
    const existsByName = db.prepare("SELECT id FROM services WHERE category = 'Bills' AND lower(name) = lower(?) LIMIT 1");
    const countRow = db.prepare("SELECT COUNT(*) AS count FROM services").get();
    let nextNum = Number(countRow?.count || 0) + 1;
    const insertService = db.prepare(
      "INSERT INTO services (id, name, category, subcategory, sub_subcategory, current_price, active, sort_order, updated_at) VALUES (?, ?, 'Bills', ?, '', ?, 1, ?, ?)"
    );
    const insertHistory = db.prepare(
      "INSERT INTO service_price_history (service_id, action, previous_price, price, changed_by_staff_id, changed_at) VALUES (?, 'create', NULL, ?, 'system', ?)"
    );
    for (const offer of billServices) {
      const existing = existsByName.get(offer.name);
      if (existing) continue;
      const id = `BL${String(nextNum).padStart(3, "0")}`;
      nextNum += 1;
      const sortOrder = getNextServiceSortOrder("Bills", offer.subcategory);
      insertService.run(id, offer.name, offer.subcategory, Number(offer.price), sortOrder, now);
      insertHistory.run(id, Number(offer.price), now);
    }

    const taxonomy = getMergedTaxonomy();
    if (!taxonomy.categories.includes("Bills")) taxonomy.categories.push("Bills");
    const existingSubs = Array.isArray(taxonomy.subcategories.Bills) ? taxonomy.subcategories.Bills : [];
    const nextSubs = uniquePreserve(existingSubs.concat(billServices.map((b) => b.subcategory)));
    taxonomy.subcategories.Bills = nextSubs;
    saveStoredTaxonomy(taxonomy);

    db.exec("COMMIT;");
  } catch (error) {
    db.exec("ROLLBACK;");
    throw error;
  }
}

function ensurePrintCatalog() {
  const printServices = [
    // Document/Text Only
    { name: "Short", subcategory: "Document/Text Only", subSubcategory: "Black & White", price: 3 },
    { name: "A4", subcategory: "Document/Text Only", subSubcategory: "Black & White", price: 4 },
    { name: "Long", subcategory: "Document/Text Only", subSubcategory: "Black & White", price: 5 },
    { name: "Short", subcategory: "Document/Text Only", subSubcategory: "Colored", price: 5 },
    { name: "A4", subcategory: "Document/Text Only", subSubcategory: "Colored", price: 6 },
    { name: "Long", subcategory: "Document/Text Only", subSubcategory: "Colored", price: 10 },

    // Text With Picture
    { name: "Short", subcategory: "Text With Picture", subSubcategory: "Black & White", price: 5 },
    { name: "A4", subcategory: "Text With Picture", subSubcategory: "Black & White", price: 6 },
    { name: "Long", subcategory: "Text With Picture", subSubcategory: "Black & White", price: 7 },
    { name: "Short (Range ₱7-₱15)", subcategory: "Text With Picture", subSubcategory: "Colored", price: 7, priceMode: "ask" },
    { name: "A4 (Range ₱10-₱20)", subcategory: "Text With Picture", subSubcategory: "Colored", price: 10, priceMode: "ask" },
    { name: "Long (Range ₱15-₱25)", subcategory: "Text With Picture", subSubcategory: "Colored", price: 15, priceMode: "ask" },

    // Picture/Image Only
    { name: "Short", subcategory: "Picture/Image Only", subSubcategory: "Black & White", price: 10 },
    { name: "A4", subcategory: "Picture/Image Only", subSubcategory: "Black & White", price: 15 },
    { name: "Long", subcategory: "Picture/Image Only", subSubcategory: "Black & White", price: 20 },
    { name: "Short", subcategory: "Picture/Image Only", subSubcategory: "Partially Colored", price: 15 },
    { name: "A4", subcategory: "Picture/Image Only", subSubcategory: "Partially Colored", price: 20 },
    { name: "Long", subcategory: "Picture/Image Only", subSubcategory: "Partially Colored", price: 25 },
    { name: "Short", subcategory: "Picture/Image Only", subSubcategory: "Full Colored", price: 20 },
    { name: "A4", subcategory: "Picture/Image Only", subSubcategory: "Full Colored", price: 25 },
    { name: "Long", subcategory: "Picture/Image Only", subSubcategory: "Full Colored", price: 30 },

    // Photocopy
    { name: "Short", subcategory: "Photocopy", subSubcategory: "Black & White", price: 3 },
    { name: "A4", subcategory: "Photocopy", subSubcategory: "Black & White", price: 4 },
    { name: "Long", subcategory: "Photocopy", subSubcategory: "Black & White", price: 5 },
    { name: "B2B Add-on", subcategory: "Photocopy", subSubcategory: "Black & White", price: 2 },
    { name: "Short", subcategory: "Photocopy", subSubcategory: "Partially Colored", price: 5 },
    { name: "A4", subcategory: "Photocopy", subSubcategory: "Partially Colored", price: 6 },
    { name: "Long", subcategory: "Photocopy", subSubcategory: "Partially Colored", price: 7 },
    { name: "B2B Add-on", subcategory: "Photocopy", subSubcategory: "Partially Colored", price: 3 },
    { name: "Short", subcategory: "Photocopy", subSubcategory: "Full Colored", price: 8 },
    { name: "A4", subcategory: "Photocopy", subSubcategory: "Full Colored", price: 9 },
    { name: "Long", subcategory: "Photocopy", subSubcategory: "Full Colored", price: 10 },
    { name: "B2B Add-on", subcategory: "Photocopy", subSubcategory: "Full Colored", price: 5 },

    // Rush ID Picture
    { name: "1x1 (8 pcs)", subcategory: "Rush ID Picture", subSubcategory: "Singles", price: 30 },
    { name: "2x2 (6 pcs)", subcategory: "Rush ID Picture", subSubcategory: "Singles", price: 40 },
    { name: "Passport Size (4 pcs)", subcategory: "Rush ID Picture", subSubcategory: "Singles", price: 30 },
    { name: "Package 1: 1x1 (4 pcs), 2x2 (2 pcs)", subcategory: "Rush ID Picture", subSubcategory: "Packages", price: 40 },
    { name: "Package 2: 1x1 (8 pcs), 2x2 (4 pcs)", subcategory: "Rush ID Picture", subSubcategory: "Packages", price: 50 },
    { name: "Package 3: 1x1 (4 pcs), 2x2 (2 pcs), Passport (2 pcs)", subcategory: "Rush ID Picture", subSubcategory: "Packages", price: 60 },

    // Photo Printing
    { name: "Wallet/2r (2.5 x 3.5)", subcategory: "Photo Printing", subSubcategory: "Sizes", price: 7 },
    { name: "3r (3.5 x 5)", subcategory: "Photo Printing", subSubcategory: "Sizes", price: 10 },
    { name: "4r (4 x 6)", subcategory: "Photo Printing", subSubcategory: "Sizes", price: 15 },
    { name: "5r (5 x 7)", subcategory: "Photo Printing", subSubcategory: "Sizes", price: 20 },
    { name: "8r (8 x 10)", subcategory: "Photo Printing", subSubcategory: "Sizes", price: 40 },
    { name: "A4 (8.3 x 11.7)", subcategory: "Photo Printing", subSubcategory: "Sizes", price: 50 },

    // Scan / Sticker / Laminate
    { name: "Up to A4 size (per page)", subcategory: "Scan", subSubcategory: "General", price: 10 },
    { name: "A4 Sticker", subcategory: "Sticker", subSubcategory: "General", price: 50 },
    { name: "Cold Laminate Add-on", subcategory: "Sticker", subSubcategory: "General", price: 10 },
    { name: "ID Size", subcategory: "Laminate", subSubcategory: "General", price: 20 },
    { name: "3r", subcategory: "Laminate", subSubcategory: "General", price: 30 },
    { name: "4r", subcategory: "Laminate", subSubcategory: "General", price: 35 },
    { name: "5r", subcategory: "Laminate", subSubcategory: "General", price: 40 },
    { name: "A4", subcategory: "Laminate", subSubcategory: "General", price: 50 },

    // Other Services Offered (mostly manual pricing)
    { name: "Tracing Pads", subcategory: "Other Services", subSubcategory: "Customized Items", price: 10, priceMode: "ask" },
    { name: "Cursive Pad", subcategory: "Other Services", subSubcategory: "Customized Items", price: 10, priceMode: "ask" },
    { name: "Notepads", subcategory: "Other Services", subSubcategory: "Customized Items", price: 10, priceMode: "ask" },
    { name: "Wedding Invitation", subcategory: "Other Services", subSubcategory: "Invitations", price: 10, priceMode: "ask" },
    { name: "Baptismal Invitation", subcategory: "Other Services", subSubcategory: "Invitations", price: 10, priceMode: "ask" },
    { name: "Birthday Invitation", subcategory: "Other Services", subSubcategory: "Invitations", price: 10, priceMode: "ask" },
    { name: "Calling Card", subcategory: "Other Services", subSubcategory: "General", price: 10, priceMode: "ask" },
    { name: "Sticker (Custom)", subcategory: "Other Services", subSubcategory: "General", price: 10, priceMode: "ask" },
    { name: "Mini Calendar / Desk Calendar", subcategory: "Other Services", subSubcategory: "General", price: 10, priceMode: "ask" },
    { name: "Resume", subcategory: "Other Services", subSubcategory: "General", price: 10, priceMode: "ask" },
    { name: "Typing Jobs", subcategory: "Other Services", subSubcategory: "General", price: 10, priceMode: "ask" },
    { name: "Tarpaulin & Flyers Layout", subcategory: "Other Services", subSubcategory: "General", price: 10, priceMode: "ask" },
    { name: "Research / Editing", subcategory: "Other Services", subSubcategory: "General", price: 10, priceMode: "ask" }
  ];

  const now = new Date().toISOString();
  db.exec("BEGIN TRANSACTION;");
  try {
    db.prepare("UPDATE services SET category = 'Print', updated_at = ? WHERE category = 'Printing'").run(now);

    const existsByTuple = db.prepare(`
      SELECT id FROM services
      WHERE category = 'Print'
        AND lower(name) = lower(?)
        AND lower(COALESCE(subcategory, '')) = lower(?)
        AND lower(COALESCE(sub_subcategory, '')) = lower(?)
      LIMIT 1
    `);
    const countRow = db.prepare("SELECT COUNT(*) AS count FROM services").get();
    let nextNum = Number(countRow?.count || 0) + 1;
    const insertService = db.prepare(
      "INSERT INTO services (id, name, category, subcategory, sub_subcategory, current_price, price_mode, active, sort_order, updated_at) VALUES (?, ?, 'Print', ?, ?, ?, ?, 1, ?, ?)"
    );
    const insertHistory = db.prepare(
      "INSERT INTO service_price_history (service_id, action, previous_price, price, changed_by_staff_id, changed_at) VALUES (?, 'create', NULL, ?, 'system', ?)"
    );

    for (const offer of printServices) {
      const sub = String(offer.subcategory || "").trim();
      const subsub = String(offer.subSubcategory || "").trim();
      const existing = existsByTuple.get(offer.name, sub, subsub);
      if (existing) continue;
      const id = `PR${String(nextNum).padStart(3, "0")}`;
      nextNum += 1;
      const price = Number(offer.price);
      const priceMode = String(offer.priceMode || "fixed").toLowerCase() === "ask" ? "ask" : "fixed";
      const sortOrder = getNextServiceSortOrder("Print", sub, subsub);
      insertService.run(id, offer.name, sub, subsub, price, priceMode, sortOrder, now);
      insertHistory.run(id, price, now);
    }

    const taxonomy = getMergedTaxonomy();
    if (!taxonomy.categories.includes("Print")) taxonomy.categories.push("Print");
    taxonomy.categories = taxonomy.categories.filter((c, i, arr) => arr.indexOf(c) === i).sort((a, b) => a.localeCompare(b));

    const subList = uniquePreserve(printServices.map((p) => p.subcategory));
    const mergedSubs = uniquePreserve([...(taxonomy.subcategories.Print || []), ...subList]);
    taxonomy.subcategories.Print = mergedSubs;

    taxonomy.subSubcategories = taxonomy.subSubcategories || {};
    for (const sub of mergedSubs) {
      const key = `Print::${sub}`;
      const existing = Array.isArray(taxonomy.subSubcategories[key]) ? taxonomy.subSubcategories[key] : [];
      const fromOffers = printServices.filter((p) => p.subcategory === sub).map((p) => p.subSubcategory).filter(Boolean);
      taxonomy.subSubcategories[key] = uniquePreserve(existing.concat(fromOffers));
    }
    saveStoredTaxonomy(taxonomy);

    db.exec("COMMIT;");
  } catch (error) {
    db.exec("ROLLBACK;");
    throw error;
  }
}

function inferUtilityType(name) {
  const text = String(name || "").trim().toLowerCase();
  if (!text) return "Other";
  if (
    text.includes("water")
    || text.includes("maynilad")
    || text.includes("primewater")
    || text.includes("mwsi")
    || text.includes("happy well")
  ) {
    return "Water";
  }
  if (
    text.includes("electric")
    || text.includes("power")
    || text.includes("light")
    || text.includes("meralco")
    || text.includes("veco")
    || text.includes("beneco")
  ) {
    return "Electric";
  }
  return "Other";
}

function normalizeBillsUtilityTypes() {
  const now = new Date().toISOString();
  db.exec("BEGIN TRANSACTION;");
  try {
    const rows = db.prepare("SELECT id, name FROM services WHERE category = 'Bills' AND subcategory = 'Utilities'").all();
    const update = db.prepare("UPDATE services SET sub_subcategory = ?, updated_at = ? WHERE id = ?");
    const bucketSet = new Set();
    for (const row of rows) {
      const kind = inferUtilityType(row.name);
      bucketSet.add(kind);
      update.run(kind, now, row.id);
    }

    const taxonomy = getMergedTaxonomy();
    if (!taxonomy.categories.includes("Bills")) taxonomy.categories.push("Bills");
    const billSubs = new Set(taxonomy.subcategories?.Bills || []);
    billSubs.add("Utilities");
    taxonomy.subcategories.Bills = [...billSubs].sort((a, b) => a.localeCompare(b));
    const key = "Bills::Utilities";
    const existing = Array.isArray(taxonomy.subSubcategories?.[key]) ? taxonomy.subSubcategories[key] : [];
    taxonomy.subSubcategories = taxonomy.subSubcategories || {};
    taxonomy.subSubcategories[key] = uniquePreserve(existing.concat([...bucketSet])).sort((a, b) => a.localeCompare(b));
    saveStoredTaxonomy(taxonomy);

    db.exec("COMMIT;");
  } catch (error) {
    db.exec("ROLLBACK;");
    throw error;
  }
}

function formatDateKey(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function formatTimeKey(date) {
  return date.toLocaleTimeString("en-PH", { hour: "2-digit", minute: "2-digit", hour12: false });
}

function isDateKey(value) {
  return /^\d{4}-\d{2}-\d{2}$/.test(String(value || "").trim());
}

function toMoneyNumber(value) {
  return Number((Number(value || 0)).toFixed(2));
}

function getReportRangeFromQuery(urlObj) {
  const startDateRaw = String(urlObj.searchParams.get("startDate") || "").trim();
  const endDateRaw = String(urlObj.searchParams.get("endDate") || "").trim();
  const defaultDate = formatDateKey(new Date());

  const startDate = startDateRaw || defaultDate;
  const endDate = endDateRaw || defaultDate;

  if (!isDateKey(startDate) || !isDateKey(endDate)) {
    return { error: "startDate and endDate must be YYYY-MM-DD." };
  }
  if (startDate > endDate) {
    return { error: "startDate must be on or before endDate." };
  }
  return { startDate, endDate };
}

function buildReportsPayload(startDate, endDate) {
  const rangeArgs = [startDate, endDate];
  const totals = db.prepare(`
      SELECT
        COUNT(*) AS transactionCount,
        COALESCE(SUM(total), 0) AS totalSales
      FROM transactions
      WHERE tx_date BETWEEN ? AND ? AND is_deleted = 0
    `).get(...rangeArgs);

  const itemTotals = db.prepare(`
      SELECT COALESCE(SUM(i.line_total), 0) AS totalFromItems
      FROM transaction_items i
      JOIN transactions t ON t.id = i.transaction_id
      WHERE t.tx_date BETWEEN ? AND ? AND t.is_deleted = 0
    `).get(...rangeArgs);

  const salesByService = db.prepare(`
      SELECT
        i.service_id AS service_id,
        i.service_name AS service_name,
        COALESCE(SUM(i.qty), 0) AS qty,
        COALESCE(SUM(i.line_total), 0) AS sales
      FROM transaction_items i
      JOIN transactions t ON t.id = i.transaction_id
      WHERE t.tx_date BETWEEN ? AND ? AND t.is_deleted = 0
      GROUP BY i.service_name, i.service_id
      ORDER BY sales DESC, qty DESC, i.service_name ASC
    `).all(...rangeArgs).map((row) => ({
      serviceId: row.service_id || null,
      serviceName: String(row.service_name || ""),
      qty: Number(row.qty || 0),
      sales: toMoneyNumber(row.sales || 0)
    }));

  const paymentBreakdown = db.prepare(`
      SELECT
        payment_method AS payment_method,
        COUNT(*) AS transaction_count,
        COALESCE(SUM(total), 0) AS sales
      FROM transactions
      WHERE tx_date BETWEEN ? AND ? AND is_deleted = 0
      GROUP BY payment_method
      ORDER BY sales DESC, payment_method ASC
    `).all(...rangeArgs).map((row) => ({
      paymentMethod: row.payment_method,
      transactionCount: Number(row.transaction_count || 0),
      sales: toMoneyNumber(row.sales || 0)
    }));

  const cashMovementRows = db.prepare(`
      SELECT
        movement_type AS movement_type,
        COUNT(*) AS entry_count,
        COALESCE(SUM(amount), 0) AS total_amount
      FROM cash_movements
      WHERE entry_date BETWEEN ? AND ?
      GROUP BY movement_type
    `).all(...rangeArgs);
  const cashIn = cashMovementRows.find((row) => row.movement_type === "in");
  const cashOut = cashMovementRows.find((row) => row.movement_type === "out");
  const cashMovements = {
    cashIn: {
      entryCount: Number(cashIn?.entry_count || 0),
      total: toMoneyNumber(cashIn?.total_amount || 0)
    },
    cashOut: {
      entryCount: Number(cashOut?.entry_count || 0),
      total: toMoneyNumber(cashOut?.total_amount || 0)
    }
  };
  cashMovements.net = toMoneyNumber(cashMovements.cashIn.total - cashMovements.cashOut.total);

  const cashMovementEntries = db.prepare(`
      SELECT id, entry_date, entry_time, staff_id, movement_type, amount, note
      FROM cash_movements
      WHERE entry_date BETWEEN ? AND ?
      ORDER BY entry_date DESC, created_at DESC, id DESC
      LIMIT 250
    `).all(...rangeArgs).map((row) => ({
      id: row.id,
      date: row.entry_date,
      time: row.entry_time,
      staffId: row.staff_id,
      type: row.movement_type,
      amount: toMoneyNumber(row.amount || 0),
      note: row.note || ""
    }));

  const cashSales = db.prepare(`
      SELECT
        COALESCE(SUM(total), 0) AS sales,
        COALESCE(SUM(cash_received), 0) AS received,
        COALESCE(SUM(change_due), 0) AS change_due
      FROM transactions
      WHERE tx_date BETWEEN ? AND ? AND payment_method = 'Cash' AND is_deleted = 0
    `).get(...rangeArgs);
  const cashSalesTotals = {
    sales: toMoneyNumber(cashSales.sales || 0),
    received: toMoneyNumber(cashSales.received || 0),
    changeDue: toMoneyNumber(cashSales.change_due || 0)
  };

  const totalSales = toMoneyNumber(totals.totalSales || 0);
  const totalFromItems = toMoneyNumber(itemTotals.totalFromItems || 0);
  const totalFromServiceBreakdown = toMoneyNumber(
    salesByService.reduce((sum, row) => sum + Number(row.sales || 0), 0)
  );
  const totalFromPaymentBreakdown = toMoneyNumber(
    paymentBreakdown.reduce((sum, row) => sum + Number(row.sales || 0), 0)
  );
  const cashSalesReconstructed = toMoneyNumber(cashSalesTotals.received - cashSalesTotals.changeDue);
  const tolerance = 0.01;
  const checks = {
    transactionsVsItems: {
      matches: Math.abs(totalSales - totalFromItems) <= tolerance,
      delta: toMoneyNumber(totalSales - totalFromItems)
    },
    transactionsVsServiceBreakdown: {
      matches: Math.abs(totalSales - totalFromServiceBreakdown) <= tolerance,
      delta: toMoneyNumber(totalSales - totalFromServiceBreakdown)
    },
    transactionsVsPaymentBreakdown: {
      matches: Math.abs(totalSales - totalFromPaymentBreakdown) <= tolerance,
      delta: toMoneyNumber(totalSales - totalFromPaymentBreakdown)
    },
    cashSalesReceivedMinusChange: {
      matches: Math.abs(cashSalesTotals.sales - cashSalesReconstructed) <= tolerance,
      delta: toMoneyNumber(cashSalesTotals.sales - cashSalesReconstructed)
    },
    cashMovementNet: {
      matches: Number.isFinite(cashMovements.net),
      delta: 0
    }
  };
  const errors = Object.entries(checks)
    .filter(([, value]) => !value.matches)
    .map(([name, value]) => `${name} mismatch (${value.delta})`);

  return {
    range: { startDate, endDate },
    totals: {
      totalSales,
      transactionCount: Number(totals.transactionCount || 0)
    },
    salesByService,
    topServices: salesByService.slice(0, 5),
    paymentBreakdown,
    cashMovements,
    cashMovementEntries,
    cashSales: cashSalesTotals,
    validation: {
      ok: errors.length === 0,
      checks,
      errors
    }
  };
}

function normalizePayment(value) {
  if (typeof value !== "string") return null;
  const normalized = value.trim().toLowerCase();
  if (normalized === "cash") return "Cash";
  if (normalized === "gcash") return "GCash";
  if (normalized === "bank" || normalized === "bank transfer") return "Bank Transfer";
  if (normalized === "card") return "Card";
  const proper = value.trim();
  if (PAYMENT_METHODS.has(proper)) return proper;
  return null;
}

function readJsonBody(request) {
  return new Promise((resolve, reject) => {
    let body = "";
    request.on("data", (chunk) => {
      body += chunk;
      if (body.length > 1024 * 1024) {
        reject(new Error("Payload too large."));
      }
    });
    request.on("end", () => {
      if (!body.trim()) {
        resolve({});
        return;
      }
      try {
        resolve(JSON.parse(body));
      } catch {
        reject(new Error("Invalid JSON payload."));
      }
    });
    request.on("error", reject);
  });
}

function sendJson(response, statusCode, payload) {
  response.writeHead(statusCode, {
    "Content-Type": "application/json; charset=UTF-8",
    "Cache-Control": "no-cache"
  });
  response.end(JSON.stringify(payload));
}

function sendFile(filePath, response) {
  fs.readFile(filePath, (error, data) => {
    if (error) {
      response.writeHead(error.code === "ENOENT" ? 404 : 500, {
        "Content-Type": "text/plain; charset=UTF-8"
      });
      response.end(error.code === "ENOENT" ? "File not found." : "Server error.");
      return;
    }

    const extension = path.extname(filePath).toLowerCase();
    response.writeHead(200, {
      "Content-Type": MIME_TYPES[extension] || "application/octet-stream",
      "Cache-Control": "no-cache"
    });
    response.end(data);
  });
}

function parseIdFromPath(urlPath, prefix) {
  if (!urlPath.startsWith(prefix)) return null;
  const encoded = urlPath.slice(prefix.length);
  if (!encoded) return null;
  return decodeURIComponent(encoded);
}

function getServiceHistory(serviceId) {
  return db.prepare(`
      SELECT action, previous_price AS previousPrice, price, changed_by_staff_id AS changedByStaffId, changed_at AS changedAt
      FROM service_price_history
      WHERE service_id = ?
      ORDER BY changed_at DESC, id DESC
    `).all(serviceId);
}

function mapServiceRow(row) {
  return {
    id: row.id,
    name: row.name,
    category: row.category,
    subcategory: row.subcategory || "",
    subSubcategory: row.sub_subcategory || "",
    priceMode: (row.price_mode === "ask") ? "ask" : "fixed",
    sortOrder: Number(row.sort_order || 0),
    price: Number(row.current_price),
    active: Boolean(row.active),
    updatedAt: row.updated_at,
    history: getServiceHistory(row.id)
  };
}

function listServices() {
  const rows = db.prepare(`
      SELECT id, name, category, subcategory, sub_subcategory, price_mode, sort_order, current_price, active, updated_at
      FROM services
      ORDER BY category ASC, subcategory ASC, sub_subcategory ASC, sort_order ASC, name ASC
    `).all();
  return rows.map(mapServiceRow);
}

function toFiniteNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function nowIso() {
  return new Date().toISOString();
}

function mapInventoryRow(row) {
  return {
    id: row.id,
    product_name: row.product_name,
    sku: row.sku || "",
    category: row.category || "",
    unit: row.unit || "pc",
    actual_cost: Number(row.actual_cost || 0),
    selling_price: Number(row.selling_price || 0),
    stock_qty: Number(row.stock_qty || 0),
    reorder_level: Number(row.reorder_level || 0),
    supplier: row.supplier || "",
    linked_service_id: row.linked_service_id || null,
    linked_service_name: row.linked_service_name || "",
    is_active: Boolean(row.is_active),
    created_at: row.created_at,
    updated_at: row.updated_at,
    gross_profit_per_unit: Number((Number(row.selling_price || 0) - Number(row.actual_cost || 0)).toFixed(2)),
    inventory_value: Number((Number(row.stock_qty || 0) * Number(row.actual_cost || 0)).toFixed(2))
  };
}

function listInventoryProducts() {
  const rows = db.prepare(`
    SELECT p.*, s.name AS linked_service_name
    FROM inventory_products p
    LEFT JOIN services s ON s.id = p.linked_service_id
    ORDER BY p.product_name COLLATE NOCASE ASC, p.id ASC
  `).all();
  return rows.map(mapInventoryRow);
}

function listInventoryMovements(limit = 200) {
  return db.prepare(`
      SELECT id, product_id, movement_type, qty_change, previous_qty, new_qty, note, created_at, created_by
      FROM inventory_movements
      ORDER BY created_at DESC, id DESC
      LIMIT ?
    `).all(Number(limit));
}

function createInventoryMovement({ productId, movementType, qtyChange, previousQty, newQty, note = "", createdBy = "" }) {
  const id = `IM-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  db.prepare(`
      INSERT INTO inventory_movements (id, product_id, movement_type, qty_change, previous_qty, new_qty, note, created_by, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
    id,
    productId,
    movementType,
    Number(qtyChange),
    Number(previousQty),
    Number(newQty),
    String(note || "").trim() || null,
    String(createdBy || "").trim() || null,
    nowIso()
  );
}

function setMeta(key, value) {
  db.prepare("INSERT INTO app_meta (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value")
    .run(key, value);
}

function getMeta(key) {
  const row = db.prepare("SELECT value FROM app_meta WHERE key = ?").get(key);
  return row ? row.value : null;
}

function getStoredTaxonomy() {
  const raw = getMeta("service_taxonomy_v1");
  if (!raw) return { categories: [], subcategories: {}, subSubcategories: {} };
  try {
    const parsed = JSON.parse(raw);
    const categories = Array.isArray(parsed.categories) ? parsed.categories.map((v) => String(v || "").trim()).filter(Boolean) : [];
    const subcategories = parsed.subcategories && typeof parsed.subcategories === "object" ? parsed.subcategories : {};
    const subSubcategories = parsed.subSubcategories && typeof parsed.subSubcategories === "object" ? parsed.subSubcategories : {};
    return { categories, subcategories, subSubcategories };
  } catch {
    return { categories: [], subcategories: {}, subSubcategories: {} };
  }
}

function saveStoredTaxonomy(taxonomy) {
  const categories = uniquePreserve(taxonomy.categories || []);
  const subcategories = {};
  const subSubcategories = {};
  for (const category of categories) {
    const list = Array.isArray(taxonomy.subcategories?.[category]) ? taxonomy.subcategories[category] : [];
    const clean = uniquePreserve(list);
    subcategories[category] = clean;
    for (const subcategory of clean) {
      const key = `${category}::${subcategory}`;
      const childList = Array.isArray(taxonomy.subSubcategories?.[key]) ? taxonomy.subSubcategories[key] : [];
      subSubcategories[key] = uniquePreserve(childList);
    }
  }
  setMeta("service_taxonomy_v1", JSON.stringify({ categories, subcategories, subSubcategories }));
}

function deriveTaxonomyFromServices() {
  const rows = db.prepare("SELECT category, subcategory, sub_subcategory FROM services").all();
  const categories = [...new Set(rows.map((r) => String(r.category || "").trim()).filter(Boolean))].sort((a, b) => a.localeCompare(b));
  const subcategories = {};
  const subSubcategories = {};
  for (const category of categories) {
    const subList = [...new Set(rows
      .filter((r) => String(r.category || "").trim() === category)
      .map((r) => String(r.subcategory || "").trim())
      .filter(Boolean))]
      .sort((a, b) => a.localeCompare(b));
    subcategories[category] = subList;
    for (const subcategory of subList) {
      const key = `${category}::${subcategory}`;
      subSubcategories[key] = [...new Set(rows
        .filter((r) => String(r.category || "").trim() === category && String(r.subcategory || "").trim() === subcategory)
        .map((r) => String(r.sub_subcategory || "").trim())
        .filter(Boolean))]
        .sort((a, b) => a.localeCompare(b));
    }
  }
  return { categories, subcategories, subSubcategories };
}

function getMergedTaxonomy() {
  const stored = getStoredTaxonomy();
  const derived = deriveTaxonomyFromServices();
  const storedOrdered = uniquePreserve(stored.categories || []);
  const extraCats = derived.categories.filter((c) => !storedOrdered.includes(c)).sort((a, b) => a.localeCompare(b));
  const categories = [...storedOrdered, ...extraCats];
  const subcategories = {};
  const subSubcategories = {};
  for (const category of categories) {
    const storedSubs = uniquePreserve(stored.subcategories?.[category] || []);
    const extraSubs = (derived.subcategories?.[category] || []).filter((s) => !storedSubs.includes(s)).sort((a, b) => a.localeCompare(b));
    const mergedSubs = [...storedSubs, ...extraSubs];
    subcategories[category] = mergedSubs;
    for (const subcategory of mergedSubs) {
      const key = `${category}::${subcategory}`;
      const storedSubSub = uniquePreserve(stored.subSubcategories?.[key] || []);
      const extraSubSub = (derived.subSubcategories?.[key] || []).filter((s) => !storedSubSub.includes(s)).sort((a, b) => a.localeCompare(b));
      subSubcategories[key] = [...storedSubSub, ...extraSubSub];
    }
  }
  return { categories, subcategories, subSubcategories };
}

function runInTransaction(work) {
  db.exec("BEGIN");
  try {
    const result = work();
    db.exec("COMMIT");
    return result;
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
}

async function handleApi(request, response, urlObj) {
  const { pathname } = urlObj;

  if (request.method === "GET" && pathname === "/api/health") {
    sendJson(response, 200, { ok: true, dbPath: DB_PATH });
    return;
  }

  if (request.method === "GET" && pathname === "/api/auth/staff") {
    const staff = db.prepare("SELECT id, username, name, role FROM staff_users ORDER BY username ASC").all();
    sendJson(response, 200, { staff });
    return;
  }

  if (request.method === "POST" && pathname === "/api/auth/login") {
    const body = await readJsonBody(request);
    const staffId = typeof body.staffId === "string" ? body.staffId.trim() : "";
    const pin = typeof body.pin === "string" ? body.pin.trim() : "";
    if (!staffId || !pin) {
      sendJson(response, 400, { error: "staffId and pin are required." });
      return;
    }

    const user = db.prepare("SELECT id, username, name, role, pin_hash FROM staff_users WHERE id = ?").get(staffId);
    if (!user || !bcrypt.compareSync(pin, user.pin_hash)) {
      sendJson(response, 401, { error: "Invalid PIN." });
      return;
    }

    sendJson(response, 200, {
      staff: { id: user.id, username: user.username, name: user.name, role: user.role }
    });
    return;
  }

  if (request.method === "GET" && pathname === "/api/dashboard/today-summary") {
    const today = formatDateKey(new Date());
    const sales = db.prepare(`
      SELECT
        COALESCE(SUM(total), 0) AS totalSales,
        COUNT(*) AS transactionCount
      FROM transactions
      WHERE tx_date = ? AND is_deleted = 0
    `).get(today);
    const itemCount = db.prepare(`
      SELECT COALESCE(SUM(i.qty), 0) AS itemCount
      FROM transaction_items i
      JOIN transactions t ON t.id = i.transaction_id
      WHERE t.tx_date = ? AND t.is_deleted = 0
    `).get(today);
    sendJson(response, 200, {
      date: today,
      totalSales: Number(sales.totalSales || 0),
      transactionCount: Number(sales.transactionCount || 0),
      itemCount: Number(itemCount.itemCount || 0)
    });
    return;
  }

  if (request.method === "GET" && pathname === "/api/reports") {
    const range = getReportRangeFromQuery(urlObj);
    if (range.error) {
      sendJson(response, 400, { error: range.error });
      return;
    }
    sendJson(response, 200, buildReportsPayload(range.startDate, range.endDate));
    return;
  }

  if (request.method === "POST" && pathname === "/api/cash-movements") {
    const body = await readJsonBody(request);
    const staffId = String(body.staffId || "").trim();
    const movementType = String(body.type || "").trim().toLowerCase();
    const amount = Number(body.amount);
    const note = typeof body.note === "string" ? body.note.trim() : "";

    if (!staffId) {
      sendJson(response, 400, { error: "staffId is required." });
      return;
    }
    if (movementType !== "in" && movementType !== "out") {
      sendJson(response, 400, { error: "type must be in or out." });
      return;
    }
    if (!Number.isFinite(amount) || amount <= 0) {
      sendJson(response, 400, { error: "amount must be a positive number." });
      return;
    }
    const staff = db.prepare("SELECT id FROM staff_users WHERE id = ?").get(staffId);
    if (!staff) {
      sendJson(response, 404, { error: "Staff not found." });
      return;
    }

    const now = new Date();
    const id = `CM-${now.getTime()}`;
    const entryDate = formatDateKey(now);
    const entryTime = formatTimeKey(now);
    const normalizedAmount = toMoneyNumber(amount);
    db.prepare(`
      INSERT INTO cash_movements (id, entry_date, entry_time, staff_id, movement_type, amount, note)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(id, entryDate, entryTime, staffId, movementType, normalizedAmount, note || null);

    sendJson(response, 201, {
      entry: {
        id,
        date: entryDate,
        time: entryTime,
        staffId,
        type: movementType,
        amount: normalizedAmount,
        note
      }
    });
    return;
  }

  if (request.method === "GET" && pathname === "/api/inventory") {
    sendJson(response, 200, { items: listInventoryProducts() });
    return;
  }

  if (request.method === "GET" && pathname === "/api/inventory/movements") {
    const limit = Number(urlObj.searchParams.get("limit") || 200);
    sendJson(response, 200, { items: listInventoryMovements(Number.isFinite(limit) ? limit : 200) });
    return;
  }

  if (request.method === "POST" && pathname === "/api/inventory") {
    const body = await readJsonBody(request);
    const productName = String(body.product_name || body.name || "").trim();
    const sku = String(body.sku || "").trim();
    const category = String(body.category || "").trim();
    const unit = String(body.unit || "pc").trim() || "pc";
    const actualCost = toFiniteNumber(body.actual_cost ?? body.unitCost, NaN);
    const sellingPrice = toFiniteNumber(body.selling_price ?? body.sellingPrice, NaN);
    const stockQty = toFiniteNumber(body.stock_qty ?? body.onHand, NaN);
    const reorderLevel = toFiniteNumber(body.reorder_level ?? body.reorderLevel, 0);
    const supplier = String(body.supplier || "").trim();
    const linkedServiceId = String(body.linked_service_id ?? body.linkedServiceId ?? "").trim() || null;
    const isActive = Object.prototype.hasOwnProperty.call(body, "is_active")
      ? Boolean(body.is_active)
      : (Object.prototype.hasOwnProperty.call(body, "active") ? Boolean(body.active) : true);
    const createdBy = String(body.created_by || body.changedByStaffId || "system").trim() || "system";

    if (!productName) {
      sendJson(response, 400, { error: "product_name is required." });
      return;
    }
    if (!Number.isFinite(actualCost) || actualCost < 0 || !Number.isFinite(sellingPrice) || sellingPrice < 0) {
      sendJson(response, 400, { error: "actual_cost and selling_price must be valid non-negative numbers." });
      return;
    }
    if (!Number.isFinite(stockQty) || !Number.isFinite(reorderLevel) || reorderLevel < 0) {
      sendJson(response, 400, { error: "stock_qty and reorder_level must be valid numbers." });
      return;
    }
    if (sku) {
      const existingSku = db.prepare("SELECT id FROM inventory_products WHERE sku = ?").get(sku);
      if (existingSku) {
        sendJson(response, 409, { error: "SKU already exists." });
        return;
      }
    }
    if (linkedServiceId) {
      const svc = db.prepare("SELECT id FROM services WHERE id = ?").get(linkedServiceId);
      if (!svc) {
        sendJson(response, 404, { error: "Linked service not found." });
        return;
      }
    }

    const id = `INV-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const now = nowIso();
    runInTransaction(() => {
      db.prepare(`
        INSERT INTO inventory_products
        (id, product_name, sku, category, unit, actual_cost, selling_price, stock_qty, reorder_level, supplier, linked_service_id, is_active, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        id, productName, sku || null, category, unit, Number(actualCost), Number(sellingPrice),
        Number(stockQty), Number(reorderLevel), supplier, linkedServiceId, isActive ? 1 : 0, now, now
      );
      createInventoryMovement({
        productId: id,
        movementType: "restock",
        qtyChange: Number(stockQty),
        previousQty: 0,
        newQty: Number(stockQty),
        note: "Initial stock",
        createdBy
      });
    });
    const row = db.prepare(`
      SELECT p.*, s.name AS linked_service_name
      FROM inventory_products p
      LEFT JOIN services s ON s.id = p.linked_service_id
      WHERE p.id = ?
    `).get(id);
    sendJson(response, 201, { item: mapInventoryRow(row) });
    return;
  }

  if (request.method === "PATCH" && pathname === "/api/inventory/bulk-stock-adjust") {
    const body = await readJsonBody(request);
    const ids = Array.isArray(body.ids) ? body.ids.map((v) => String(v || "").trim()).filter(Boolean) : [];
    const delta = toFiniteNumber(body.delta, NaN);
    const note = String(body.note || "").trim();
    const createdBy = String(body.created_by || body.changedByStaffId || "system").trim() || "system";
    if (ids.length === 0) {
      sendJson(response, 400, { error: "ids are required." });
      return;
    }
    if (!Number.isFinite(delta) || delta === 0) {
      sendJson(response, 400, { error: "delta must be a non-zero number." });
      return;
    }
    runInTransaction(() => {
      const getItem = db.prepare("SELECT id, stock_qty FROM inventory_products WHERE id = ?");
      const updateQty = db.prepare("UPDATE inventory_products SET stock_qty = ?, updated_at = ? WHERE id = ?");
      const now = nowIso();
      for (const id of ids) {
        const item = getItem.get(id);
        if (!item) continue;
        const previousQty = Number(item.stock_qty || 0);
        const nextQty = Number((previousQty + delta).toFixed(4));
        updateQty.run(nextQty, now, id);
        createInventoryMovement({
          productId: id,
          movementType: delta > 0 ? "restock" : "adjustment",
          qtyChange: Number(delta),
          previousQty,
          newQty: nextQty,
          note: note || "Bulk stock adjustment",
          createdBy
        });
      }
    });
    sendJson(response, 200, { ok: true });
    return;
  }

  if (request.method === "DELETE" && pathname.startsWith("/api/inventory/")) {
    const id = parseIdFromPath(pathname, "/api/inventory/");
    if (!id || id === "bulk-stock-adjust" || id === "movements") {
      sendJson(response, 404, { error: "Not found." });
      return;
    }
    const exists = db.prepare("SELECT id FROM inventory_products WHERE id = ?").get(id);
    if (!exists) {
      sendJson(response, 404, { error: "Product not found." });
      return;
    }
    runInTransaction(() => {
      db.prepare("DELETE FROM inventory_products WHERE id = ?").run(id);
    });
    sendJson(response, 200, { ok: true });
    return;
  }

  if (request.method === "PATCH" && pathname.startsWith("/api/inventory/")) {
    const id = parseIdFromPath(pathname, "/api/inventory/");
    if (!id || id === "bulk-stock-adjust" || id === "movements") {
      sendJson(response, 404, { error: "Not found." });
      return;
    }
    const body = await readJsonBody(request);
    const current = db.prepare("SELECT * FROM inventory_products WHERE id = ?").get(id);
    if (!current) {
      sendJson(response, 404, { error: "Product not found." });
      return;
    }

    const updates = [];
    const params = [];
    const now = nowIso();
    const createdBy = String(body.created_by || body.changedByStaffId || "system").trim() || "system";
    let movement = null;

    const patchText = (dbCol, raw) => {
      if (typeof raw !== "string") return;
      updates.push(`${dbCol} = ?`);
      params.push(raw.trim());
    };

    if (Object.prototype.hasOwnProperty.call(body, "product_name") || Object.prototype.hasOwnProperty.call(body, "name")) {
      const next = String((body.product_name ?? body.name) || "").trim();
      if (!next) {
        sendJson(response, 400, { error: "product_name cannot be empty." });
        return;
      }
      updates.push("product_name = ?");
      params.push(next);
    }
    if (Object.prototype.hasOwnProperty.call(body, "sku")) {
      const sku = String(body.sku || "").trim();
      if (sku) {
        const clash = db.prepare("SELECT id FROM inventory_products WHERE sku = ? AND id <> ?").get(sku, id);
        if (clash) {
          sendJson(response, 409, { error: "SKU already exists." });
          return;
        }
      }
      updates.push("sku = ?");
      params.push(sku || null);
    }
    patchText("category", body.category);
    patchText("unit", body.unit);
    patchText("supplier", body.supplier);
    if (Object.prototype.hasOwnProperty.call(body, "linked_service_id") || Object.prototype.hasOwnProperty.call(body, "linkedServiceId")) {
      const linkedServiceId = String(body.linked_service_id ?? body.linkedServiceId ?? "").trim() || null;
      if (linkedServiceId) {
        const svc = db.prepare("SELECT id FROM services WHERE id = ?").get(linkedServiceId);
        if (!svc) {
          sendJson(response, 404, { error: "Linked service not found." });
          return;
        }
      }
      updates.push("linked_service_id = ?");
      params.push(linkedServiceId);
    }
    if (Object.prototype.hasOwnProperty.call(body, "is_active") || Object.prototype.hasOwnProperty.call(body, "active")) {
      const nextActive = Object.prototype.hasOwnProperty.call(body, "is_active") ? Boolean(body.is_active) : Boolean(body.active);
      updates.push("is_active = ?");
      params.push(nextActive ? 1 : 0);
    }

    const setNumeric = (dbCol, incoming, allowNegative = false) => {
      if (!Object.prototype.hasOwnProperty.call(body, incoming)) return null;
      const parsed = toFiniteNumber(body[incoming], NaN);
      if (!Number.isFinite(parsed) || (!allowNegative && parsed < 0)) {
        return { error: `${incoming} must be a valid ${allowNegative ? "" : "non-negative "}number.` };
      }
      updates.push(`${dbCol} = ?`);
      params.push(Number(parsed));
      return Number(parsed);
    };

    const nextActualCost = setNumeric("actual_cost", "actual_cost");
    if (nextActualCost && nextActualCost.error) {
      sendJson(response, 400, { error: nextActualCost.error });
      return;
    }
    const nextSellingPrice = setNumeric("selling_price", "selling_price");
    if (nextSellingPrice && nextSellingPrice.error) {
      sendJson(response, 400, { error: nextSellingPrice.error });
      return;
    }
    const nextActualCostAlt = setNumeric("actual_cost", "unitCost");
    if (nextActualCostAlt && nextActualCostAlt.error) {
      sendJson(response, 400, { error: nextActualCostAlt.error });
      return;
    }
    const nextSellingPriceAlt = setNumeric("selling_price", "sellingPrice");
    if (nextSellingPriceAlt && nextSellingPriceAlt.error) {
      sendJson(response, 400, { error: nextSellingPriceAlt.error });
      return;
    }
    const nextReorder = setNumeric("reorder_level", "reorder_level");
    if (nextReorder && nextReorder.error) {
      sendJson(response, 400, { error: nextReorder.error });
      return;
    }
    const nextReorderAlt = setNumeric("reorder_level", "reorderLevel");
    if (nextReorderAlt && nextReorderAlt.error) {
      sendJson(response, 400, { error: nextReorderAlt.error });
      return;
    }

    const hasStockQty = Object.prototype.hasOwnProperty.call(body, "stock_qty") || Object.prototype.hasOwnProperty.call(body, "onHand");
    if (hasStockQty) {
      const incoming = Object.prototype.hasOwnProperty.call(body, "stock_qty") ? body.stock_qty : body.onHand;
      const nextQty = toFiniteNumber(incoming, NaN);
      if (!Number.isFinite(nextQty)) {
        sendJson(response, 400, { error: "stock_qty must be a valid number." });
        return;
      }
      updates.push("stock_qty = ?");
      params.push(Number(nextQty));
      const prev = Number(current.stock_qty || 0);
      if (Number(nextQty) !== prev) {
        movement = {
          movementType: Number(nextQty) > prev ? "restock" : "adjustment",
          qtyChange: Number((Number(nextQty) - prev).toFixed(4)),
          previousQty: prev,
          newQty: Number(nextQty),
          note: String(body.note || "Inline stock update").trim() || "Inline stock update",
          createdBy
        };
      }
    }

    if (updates.length === 0) {
      sendJson(response, 400, { error: "No valid fields to update." });
      return;
    }
    updates.push("updated_at = ?");
    params.push(now, id);

    runInTransaction(() => {
      db.prepare(`UPDATE inventory_products SET ${updates.join(", ")} WHERE id = ?`).run(...params);
      if (movement) {
        createInventoryMovement({
          productId: id,
          ...movement
        });
      }
    });

    const row = db.prepare(`
      SELECT p.*, s.name AS linked_service_name
      FROM inventory_products p
      LEFT JOIN services s ON s.id = p.linked_service_id
      WHERE p.id = ?
    `).get(id);
    sendJson(response, 200, { item: mapInventoryRow(row) });
    return;
  }

  if (request.method === "GET" && pathname === "/api/services/taxonomy") {
    sendJson(response, 200, { taxonomy: getMergedTaxonomy() });
    return;
  }

  if (request.method === "POST" && pathname === "/api/services/taxonomy/category") {
    const body = await readJsonBody(request);
    const name = String(body.name || "").trim();
    if (!name) {
      sendJson(response, 400, { error: "Category name is required." });
      return;
    }
    const taxonomy = getMergedTaxonomy();
    if (!taxonomy.categories.includes(name)) taxonomy.categories.push(name);
    taxonomy.categories.sort((a, b) => a.localeCompare(b));
    taxonomy.subcategories[name] = taxonomy.subcategories[name] || [];
    saveStoredTaxonomy(taxonomy);
    sendJson(response, 200, { taxonomy: getMergedTaxonomy() });
    return;
  }

  if (request.method === "PATCH" && pathname === "/api/services/taxonomy/category") {
    const body = await readJsonBody(request);
    const oldName = String(body.oldName || "").trim();
    const newName = String(body.newName || "").trim();
    if (!oldName || !newName) {
      sendJson(response, 400, { error: "oldName and newName are required." });
      return;
    }
    const now = new Date().toISOString();
    runInTransaction(() => {
      db.prepare("UPDATE services SET category = ?, updated_at = ? WHERE category = ?").run(newName, now, oldName);
      const taxonomy = getMergedTaxonomy();
      const categories = taxonomy.categories.filter((c) => c !== oldName);
      if (!categories.includes(newName)) categories.push(newName);
      const movedSubs = taxonomy.subcategories[oldName] || [];
      const nextSubs = new Set([...(taxonomy.subcategories[newName] || []), ...movedSubs]);
      const migratedSubSub = { ...(taxonomy.subSubcategories || {}) };
      for (const sub of movedSubs) {
        const oldKey = `${oldName}::${sub}`;
        const newKey = `${newName}::${sub}`;
        const oldChildren = Array.isArray(migratedSubSub[oldKey]) ? migratedSubSub[oldKey] : [];
        const newChildren = Array.isArray(migratedSubSub[newKey]) ? migratedSubSub[newKey] : [];
        migratedSubSub[newKey] = uniquePreserve(newChildren.concat(oldChildren));
        delete migratedSubSub[oldKey];
      }
      delete taxonomy.subcategories[oldName];
      taxonomy.categories = categories.sort((a, b) => a.localeCompare(b));
      taxonomy.subcategories[newName] = [...nextSubs].sort((a, b) => a.localeCompare(b));
      taxonomy.subSubcategories = migratedSubSub;
      saveStoredTaxonomy(taxonomy);
    });
    sendJson(response, 200, { taxonomy: getMergedTaxonomy() });
    return;
  }

  if (request.method === "DELETE" && pathname === "/api/services/taxonomy/category") {
    const body = await readJsonBody(request);
    const name = String(body.name || "").trim();
    if (!name) {
      sendJson(response, 400, { error: "Category name is required." });
      return;
    }
    const now = new Date().toISOString();
    runInTransaction(() => {
      db.prepare("UPDATE services SET category = 'Uncategorized', subcategory = '', sub_subcategory = '', updated_at = ? WHERE category = ?").run(now, name);
      const taxonomy = getMergedTaxonomy();
      taxonomy.categories = taxonomy.categories.filter((c) => c !== name);
      delete taxonomy.subcategories[name];
      const nextSubSub = {};
      for (const [k, v] of Object.entries(taxonomy.subSubcategories || {})) {
        if (!k.startsWith(`${name}::`)) nextSubSub[k] = v;
      }
      taxonomy.subSubcategories = nextSubSub;
      if (!taxonomy.categories.includes("Uncategorized")) taxonomy.categories.push("Uncategorized");
      taxonomy.categories.sort((a, b) => a.localeCompare(b));
      taxonomy.subcategories.Uncategorized = taxonomy.subcategories.Uncategorized || [];
      saveStoredTaxonomy(taxonomy);
    });
    sendJson(response, 200, { taxonomy: getMergedTaxonomy() });
    return;
  }

  if (request.method === "POST" && pathname === "/api/services/taxonomy/subcategory") {
    const body = await readJsonBody(request);
    const category = String(body.category || "").trim();
    const name = String(body.name || "").trim();
    if (!category || !name) {
      sendJson(response, 400, { error: "category and subcategory name are required." });
      return;
    }
    const taxonomy = getMergedTaxonomy();
    if (!taxonomy.categories.includes(category)) taxonomy.categories.push(category);
    taxonomy.categories.sort((a, b) => a.localeCompare(b));
    const set = new Set(taxonomy.subcategories[category] || []);
    set.add(name);
    taxonomy.subcategories[category] = [...set].sort((a, b) => a.localeCompare(b));
    saveStoredTaxonomy(taxonomy);
    sendJson(response, 200, { taxonomy: getMergedTaxonomy() });
    return;
  }

  if (request.method === "PATCH" && pathname === "/api/services/taxonomy/subcategory") {
    const body = await readJsonBody(request);
    const category = String(body.category || "").trim();
    const oldName = String(body.oldName || "").trim();
    const newName = String(body.newName || "").trim();
    if (!category || !oldName || !newName) {
      sendJson(response, 400, { error: "category, oldName, and newName are required." });
      return;
    }
    const now = new Date().toISOString();
    runInTransaction(() => {
      db.prepare("UPDATE services SET subcategory = ?, updated_at = ? WHERE category = ? AND subcategory = ?")
        .run(newName, now, category, oldName);
      const taxonomy = getMergedTaxonomy();
      const set = new Set(taxonomy.subcategories[category] || []);
      set.delete(oldName);
      set.add(newName);
      taxonomy.subcategories[category] = [...set].sort((a, b) => a.localeCompare(b));
      const oldKey = `${category}::${oldName}`;
      const newKey = `${category}::${newName}`;
      const oldChildren = Array.isArray(taxonomy.subSubcategories?.[oldKey]) ? taxonomy.subSubcategories[oldKey] : [];
      const newChildren = Array.isArray(taxonomy.subSubcategories?.[newKey]) ? taxonomy.subSubcategories[newKey] : [];
      taxonomy.subSubcategories = taxonomy.subSubcategories || {};
      taxonomy.subSubcategories[newKey] = uniquePreserve(newChildren.concat(oldChildren));
      delete taxonomy.subSubcategories[oldKey];
      saveStoredTaxonomy(taxonomy);
    });
    sendJson(response, 200, { taxonomy: getMergedTaxonomy() });
    return;
  }

  if (request.method === "DELETE" && pathname === "/api/services/taxonomy/subcategory") {
    const body = await readJsonBody(request);
    const category = String(body.category || "").trim();
    const name = String(body.name || "").trim();
    if (!category || !name) {
      sendJson(response, 400, { error: "category and subcategory name are required." });
      return;
    }
    const now = new Date().toISOString();
    runInTransaction(() => {
      db.prepare("UPDATE services SET subcategory = '', sub_subcategory = '', updated_at = ? WHERE category = ? AND subcategory = ?")
        .run(now, category, name);
      const taxonomy = getMergedTaxonomy();
      taxonomy.subcategories[category] = (taxonomy.subcategories[category] || []).filter((s) => s !== name);
      taxonomy.subSubcategories = taxonomy.subSubcategories || {};
      delete taxonomy.subSubcategories[`${category}::${name}`];
      saveStoredTaxonomy(taxonomy);
    });
    sendJson(response, 200, { taxonomy: getMergedTaxonomy() });
    return;
  }

  if (request.method === "PATCH" && pathname === "/api/services/taxonomy/subcategory/transfer") {
    const body = await readJsonBody(request);
    const fromCategory = String(body.fromCategory || "").trim();
    const fromSubcategory = String(body.fromSubcategory || "").trim();
    const toCategory = String(body.toCategory || "").trim();
    const toSubcategory = String(body.toSubcategory || "").trim();
    if (!fromCategory || !fromSubcategory || !toCategory || !toSubcategory) {
      sendJson(response, 400, { error: "fromCategory, fromSubcategory, toCategory, and toSubcategory are required." });
      return;
    }
    const now = new Date().toISOString();
    runInTransaction(() => {
      db.prepare("UPDATE services SET category = ?, subcategory = ?, updated_at = ? WHERE category = ? AND subcategory = ?")
        .run(toCategory, toSubcategory, now, fromCategory, fromSubcategory);
      const taxonomy = getMergedTaxonomy();
      if (!taxonomy.categories.includes(toCategory)) taxonomy.categories.push(toCategory);
      taxonomy.categories.sort((a, b) => a.localeCompare(b));
      taxonomy.subcategories[fromCategory] = (taxonomy.subcategories[fromCategory] || []).filter((s) => s !== fromSubcategory);
      const targetSet = new Set(taxonomy.subcategories[toCategory] || []);
      targetSet.add(toSubcategory);
      taxonomy.subcategories[toCategory] = [...targetSet].sort((a, b) => a.localeCompare(b));
      const oldKey = `${fromCategory}::${fromSubcategory}`;
      const newKey = `${toCategory}::${toSubcategory}`;
      const oldChildren = Array.isArray(taxonomy.subSubcategories?.[oldKey]) ? taxonomy.subSubcategories[oldKey] : [];
      const newChildren = Array.isArray(taxonomy.subSubcategories?.[newKey]) ? taxonomy.subSubcategories[newKey] : [];
      taxonomy.subSubcategories = taxonomy.subSubcategories || {};
      taxonomy.subSubcategories[newKey] = uniquePreserve(newChildren.concat(oldChildren));
      delete taxonomy.subSubcategories[oldKey];
      saveStoredTaxonomy(taxonomy);
    });
    sendJson(response, 200, { taxonomy: getMergedTaxonomy() });
    return;
  }

  if (request.method === "POST" && pathname === "/api/services/taxonomy/subsubcategory") {
    const body = await readJsonBody(request);
    const category = String(body.category || "").trim();
    const subcategory = String(body.subcategory || "").trim();
    const name = String(body.name || "").trim();
    if (!category || !subcategory || !name) {
      sendJson(response, 400, { error: "category, subcategory, and name are required." });
      return;
    }
    const taxonomy = getMergedTaxonomy();
    if (!taxonomy.categories.includes(category)) taxonomy.categories.push(category);
    taxonomy.categories.sort((a, b) => a.localeCompare(b));
    taxonomy.subcategories[category] = uniquePreserve([...(taxonomy.subcategories[category] || []), subcategory]).sort((a, b) => a.localeCompare(b));
    const key = `${category}::${subcategory}`;
    const set = new Set(taxonomy.subSubcategories?.[key] || []);
    set.add(name);
    taxonomy.subSubcategories = taxonomy.subSubcategories || {};
    taxonomy.subSubcategories[key] = [...set].sort((a, b) => a.localeCompare(b));
    saveStoredTaxonomy(taxonomy);
    sendJson(response, 200, { taxonomy: getMergedTaxonomy() });
    return;
  }

  if (request.method === "PATCH" && pathname === "/api/services/taxonomy/subsubcategory") {
    const body = await readJsonBody(request);
    const category = String(body.category || "").trim();
    const subcategory = String(body.subcategory || "").trim();
    const oldName = String(body.oldName || "").trim();
    const newName = String(body.newName || "").trim();
    if (!category || !subcategory || !oldName || !newName) {
      sendJson(response, 400, { error: "category, subcategory, oldName, and newName are required." });
      return;
    }
    const now = new Date().toISOString();
    runInTransaction(() => {
      db.prepare("UPDATE services SET sub_subcategory = ?, updated_at = ? WHERE category = ? AND subcategory = ? AND sub_subcategory = ?")
        .run(newName, now, category, subcategory, oldName);
      const taxonomy = getMergedTaxonomy();
      const key = `${category}::${subcategory}`;
      const set = new Set(taxonomy.subSubcategories?.[key] || []);
      set.delete(oldName);
      set.add(newName);
      taxonomy.subSubcategories = taxonomy.subSubcategories || {};
      taxonomy.subSubcategories[key] = [...set].sort((a, b) => a.localeCompare(b));
      saveStoredTaxonomy(taxonomy);
    });
    sendJson(response, 200, { taxonomy: getMergedTaxonomy() });
    return;
  }

  if (request.method === "DELETE" && pathname === "/api/services/taxonomy/subsubcategory") {
    const body = await readJsonBody(request);
    const category = String(body.category || "").trim();
    const subcategory = String(body.subcategory || "").trim();
    const name = String(body.name || "").trim();
    if (!category || !subcategory || !name) {
      sendJson(response, 400, { error: "category, subcategory, and name are required." });
      return;
    }
    const now = new Date().toISOString();
    runInTransaction(() => {
      db.prepare("UPDATE services SET sub_subcategory = '', updated_at = ? WHERE category = ? AND subcategory = ? AND sub_subcategory = ?")
        .run(now, category, subcategory, name);
      const taxonomy = getMergedTaxonomy();
      const key = `${category}::${subcategory}`;
      taxonomy.subSubcategories = taxonomy.subSubcategories || {};
      taxonomy.subSubcategories[key] = (taxonomy.subSubcategories[key] || []).filter((s) => s !== name);
      saveStoredTaxonomy(taxonomy);
    });
    sendJson(response, 200, { taxonomy: getMergedTaxonomy() });
    return;
  }

  if (request.method === "PATCH" && pathname === "/api/services/taxonomy/order") {
    const body = await readJsonBody(request);
    const scope = String(body.scope || "").trim();
    const order = Array.isArray(body.order) ? body.order.map((v) => String(v || "").trim()).filter(Boolean) : [];
    const category = String(body.category || "").trim();
    const subcategory = String(body.subcategory || "").trim();
    if (!scope || order.length === 0) {
      sendJson(response, 400, { error: "scope and order are required." });
      return;
    }
    const taxonomy = getMergedTaxonomy();
    if (scope === "categories") {
      const rest = taxonomy.categories.filter((c) => !order.includes(c));
      taxonomy.categories = [...order, ...rest];
      saveStoredTaxonomy(taxonomy);
      sendJson(response, 200, { taxonomy: getMergedTaxonomy() });
      return;
    }
    if (scope === "subcategories") {
      if (!category) {
        sendJson(response, 400, { error: "category is required for subcategory order." });
        return;
      }
      const current = taxonomy.subcategories[category] || [];
      const rest = current.filter((s) => !order.includes(s));
      taxonomy.subcategories[category] = [...order, ...rest];
      saveStoredTaxonomy(taxonomy);
      sendJson(response, 200, { taxonomy: getMergedTaxonomy() });
      return;
    }
    if (scope === "subsubcategories") {
      if (!category || !subcategory) {
        sendJson(response, 400, { error: "category and subcategory are required for child subcategory order." });
        return;
      }
      const key = `${category}::${subcategory}`;
      const current = taxonomy.subSubcategories?.[key] || [];
      const rest = current.filter((s) => !order.includes(s));
      taxonomy.subSubcategories = taxonomy.subSubcategories || {};
      taxonomy.subSubcategories[key] = [...order, ...rest];
      saveStoredTaxonomy(taxonomy);
      sendJson(response, 200, { taxonomy: getMergedTaxonomy() });
      return;
    }
    sendJson(response, 400, { error: "Invalid scope." });
    return;
  }

  if (request.method === "GET" && pathname === "/api/services") {
    sendJson(response, 200, { services: listServices(), taxonomy: getMergedTaxonomy() });
    return;
  }

  if (request.method === "POST" && pathname === "/api/services") {
    const body = await readJsonBody(request);
    const name = String(body.name || "").trim();
    const category = String(body.category || "").trim();
    const subcategory = String(body.subcategory || "").trim();
    const subSubcategory = String(body.subSubcategory || "").trim();
    const priceMode = String(body.priceMode || "fixed").trim().toLowerCase() === "ask" ? "ask" : "fixed";
    const price = Number(body.price);
    const changedByStaffId = body.changedByStaffId ? String(body.changedByStaffId) : "system";
    if (!name || !category || !Number.isFinite(price) || price <= 0) {
      sendJson(response, 400, { error: "name, category, and positive price are required." });
      return;
    }

    const existingCount = db.prepare("SELECT COUNT(*) AS count FROM services").get();
    const newId = `SV${String(Number(existingCount.count) + 1).padStart(2, "0")}`;
    const now = new Date().toISOString();
    runInTransaction(() => {
      db.prepare("INSERT INTO services (id, name, category, subcategory, sub_subcategory, current_price, price_mode, active, sort_order, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?, ?)")
        .run(newId, name, category, subcategory, subSubcategory, price, priceMode, getNextServiceSortOrder(category, subcategory, subSubcategory), now);
      db.prepare("INSERT INTO service_price_history (service_id, action, previous_price, price, changed_by_staff_id, changed_at) VALUES (?, 'create', NULL, ?, ?, ?)")
        .run(newId, price, changedByStaffId, now);
    });

    const row = db.prepare("SELECT id, name, category, subcategory, sub_subcategory, price_mode, sort_order, current_price, active, updated_at FROM services WHERE id = ?").get(newId);
    sendJson(response, 201, { service: mapServiceRow(row) });
    return;
  }

  if (request.method === "PATCH" && pathname === "/api/services/order") {
    const body = await readJsonBody(request);
    const orderedIds = Array.isArray(body.ids) ? body.ids.map((v) => String(v || "").trim()).filter(Boolean) : [];
    if (orderedIds.length === 0) {
      sendJson(response, 400, { error: "ids are required." });
      return;
    }
    const now = new Date().toISOString();
    runInTransaction(() => {
      const update = db.prepare("UPDATE services SET sort_order = ?, updated_at = ? WHERE id = ?");
      orderedIds.forEach((id, index) => {
        update.run(index + 1, now, id);
      });
    });
    sendJson(response, 200, { ok: true });
    return;
  }

  if (request.method === "PATCH" && pathname === "/api/services/toggle-active-bulk") {
    const body = await readJsonBody(request);
    const ids = Array.isArray(body.ids) ? body.ids.map((v) => String(v || "").trim()).filter(Boolean) : [];
    if (ids.length === 0 || typeof body.active !== "boolean") {
      sendJson(response, 400, { error: "ids and active are required." });
      return;
    }
    const nextActive = body.active ? 1 : 0;
    const changedByStaffId = body.changedByStaffId ? String(body.changedByStaffId) : "system";
    const now = new Date().toISOString();
    let updated = 0;
    runInTransaction(() => {
      const getService = db.prepare("SELECT id, active, current_price FROM services WHERE id = ?");
      const update = db.prepare("UPDATE services SET active = ?, updated_at = ? WHERE id = ?");
      const insertHistory = db.prepare("INSERT INTO service_price_history (service_id, action, previous_price, price, changed_by_staff_id, changed_at) VALUES (?, ?, NULL, ?, ?, ?)");
      for (const id of ids) {
        const service = getService.get(id);
        if (!service) continue;
        if (Number(service.active) === nextActive) continue;
        update.run(nextActive, now, id);
        insertHistory.run(id, nextActive ? "enable" : "disable", Number(service.current_price), changedByStaffId, now);
        updated += 1;
      }
    });
    sendJson(response, 200, { ok: true, updated });
    return;
  }

  if (request.method === "PATCH" && pathname.startsWith("/api/services/") && pathname.endsWith("/toggle-active")) {
    const serviceId = parseIdFromPath(pathname, "/api/services/");
    if (!serviceId || !serviceId.endsWith("/toggle-active")) {
      sendJson(response, 404, { error: "Not found." });
      return;
    }
    const id = serviceId.slice(0, -"/toggle-active".length);
    const body = await readJsonBody(request);
    const service = db.prepare("SELECT id, active, current_price FROM services WHERE id = ?").get(id);
    if (!service) {
      sendJson(response, 404, { error: "Service not found." });
      return;
    }

    const nextActive = typeof body.active === "boolean" ? body.active : !Boolean(service.active);
    const now = new Date().toISOString();
    const changedByStaffId = body.changedByStaffId ? String(body.changedByStaffId) : "system";
    runInTransaction(() => {
      db.prepare("UPDATE services SET active = ?, updated_at = ? WHERE id = ?")
        .run(nextActive ? 1 : 0, now, id);
      db.prepare("INSERT INTO service_price_history (service_id, action, previous_price, price, changed_by_staff_id, changed_at) VALUES (?, ?, NULL, ?, ?, ?)")
        .run(id, nextActive ? "enable" : "disable", Number(service.current_price), changedByStaffId, now);
    });

    const row = db.prepare("SELECT id, name, category, subcategory, sub_subcategory, price_mode, sort_order, current_price, active, updated_at FROM services WHERE id = ?").get(id);
    sendJson(response, 200, { service: mapServiceRow(row) });
    return;
  }

  if (request.method === "DELETE" && pathname.startsWith("/api/services/")) {
    const id = parseIdFromPath(pathname, "/api/services/");
    if (!id || id.endsWith("/toggle-active")) {
      sendJson(response, 404, { error: "Not found." });
      return;
    }
    const service = db.prepare("SELECT id FROM services WHERE id = ?").get(id);
    if (!service) {
      sendJson(response, 404, { error: "Service not found." });
      return;
    }
    runInTransaction(() => {
      db.prepare("DELETE FROM services WHERE id = ?").run(id);
    });
    sendJson(response, 200, { ok: true });
    return;
  }

  if (request.method === "PATCH" && pathname.startsWith("/api/services/")) {
    const id = parseIdFromPath(pathname, "/api/services/");
    if (!id) {
      sendJson(response, 404, { error: "Not found." });
      return;
    }
    const body = await readJsonBody(request);
    const service = db.prepare("SELECT id, name, category, subcategory, sub_subcategory, price_mode, sort_order, current_price, active FROM services WHERE id = ?").get(id);
    if (!service) {
      sendJson(response, 404, { error: "Service not found." });
      return;
    }

    const updates = [];
    const params = [];
    const changedByStaffId = body.changedByStaffId ? String(body.changedByStaffId) : "system";
    const now = new Date().toISOString();

    if (typeof body.name === "string" && body.name.trim()) {
      updates.push("name = ?");
      params.push(body.name.trim());
    }
    if (typeof body.category === "string" && body.category.trim()) {
      updates.push("category = ?");
      params.push(body.category.trim());
    }
    if (typeof body.subcategory === "string") {
      updates.push("subcategory = ?");
      params.push(body.subcategory.trim());
    }
    if (typeof body.subSubcategory === "string") {
      updates.push("sub_subcategory = ?");
      params.push(body.subSubcategory.trim());
    }
    if (Object.prototype.hasOwnProperty.call(body, "priceMode")) {
      const mode = String(body.priceMode || "").trim().toLowerCase();
      if (!["fixed", "ask"].includes(mode)) {
        sendJson(response, 400, { error: "priceMode must be fixed or ask." });
        return;
      }
      updates.push("price_mode = ?");
      params.push(mode);
    }

    let newPrice = null;
    if (Object.prototype.hasOwnProperty.call(body, "price")) {
      const parsed = Number(body.price);
      if (!Number.isFinite(parsed) || parsed <= 0) {
        sendJson(response, 400, { error: "price must be a positive number." });
        return;
      }
      newPrice = parsed;
      updates.push("current_price = ?");
      params.push(parsed);
    }

    if (updates.length === 0) {
      sendJson(response, 400, { error: "No valid fields to update." });
      return;
    }

    updates.push("updated_at = ?");
    const nextCategory = (typeof body.category === "string" && body.category.trim()) ? body.category.trim() : service.category;
    const nextSubcategory = (typeof body.subcategory === "string") ? body.subcategory.trim() : (service.subcategory || "");
    const nextSubSubcategory = (typeof body.subSubcategory === "string") ? body.subSubcategory.trim() : (service.sub_subcategory || "");
    if (nextCategory !== service.category || nextSubcategory !== (service.subcategory || "") || nextSubSubcategory !== (service.sub_subcategory || "")) {
      updates.push("sort_order = ?");
      params.push(getNextServiceSortOrder(nextCategory, nextSubcategory, nextSubSubcategory));
    }

    params.push(now, id);

    runInTransaction(() => {
      db.prepare(`UPDATE services SET ${updates.join(", ")} WHERE id = ?`).run(...params);
      if (newPrice !== null && Number(service.current_price) !== newPrice) {
        db.prepare("INSERT INTO service_price_history (service_id, action, previous_price, price, changed_by_staff_id, changed_at) VALUES (?, 'price', ?, ?, ?, ?)")
          .run(id, Number(service.current_price), newPrice, changedByStaffId, now);
      }
    });

    const row = db.prepare("SELECT id, name, category, subcategory, sub_subcategory, price_mode, sort_order, current_price, active, updated_at FROM services WHERE id = ?").get(id);
    sendJson(response, 200, { service: mapServiceRow(row) });
    return;
  }

  if (request.method === "POST" && pathname === "/api/transactions") {
    const body = await readJsonBody(request);
    const staffId = String(body.staffId || "").trim();
    const paymentMethod = normalizePayment(body.paymentMethod);
    const customerBody = body.customer && typeof body.customer === "object" ? body.customer : {};
    const referenceNumber = [
      body.referenceNumber,
      body.paymentReference,
      body.reference,
      customerBody.referenceNumber,
      customerBody.reference
    ]
      .map((v) => (typeof v === "string" ? v.trim() : ""))
      .find((v) => Boolean(v)) || "";
    const items = Array.isArray(body.items) ? body.items : [];
    const customerName = typeof customerBody.name === "string" ? customerBody.name.trim() : "";
    const customerPhone = typeof customerBody.phone === "string" ? customerBody.phone.trim() : "";

    if (!staffId) {
      sendJson(response, 400, { error: "staffId is required." });
      return;
    }
    if (!paymentMethod) {
      sendJson(response, 400, { error: "Payment method must be Cash, GCash, Bank Transfer, or Card." });
      return;
    }
    if ((paymentMethod === "GCash" || paymentMethod === "Bank Transfer") && !referenceNumber) {
      sendJson(response, 400, { error: "Reference number is required for this payment method." });
      return;
    }
    if (items.length === 0) {
      sendJson(response, 400, { error: "At least one item is required." });
      return;
    }

    const staff = db.prepare("SELECT id FROM staff_users WHERE id = ?").get(staffId);
    if (!staff) {
      sendJson(response, 404, { error: "Staff not found." });
      return;
    }

    let total = 0;
    const normalizedItems = [];
    for (const item of items) {
      const qty = Number(item.qty);
      const unitPrice = Number(item.price);
      const serviceName = String(item.name || "").trim();
      if (!serviceName || !Number.isFinite(qty) || qty <= 0 || !Number.isFinite(unitPrice) || unitPrice <= 0) {
        sendJson(response, 400, { error: "Each item requires name, positive qty, and positive price." });
        return;
      }
      const lineTotal = qty * unitPrice;
      total += lineTotal;
      normalizedItems.push({
        serviceId: item.id ? String(item.id) : null,
        inventoryProductId: item.inventoryProductId ? String(item.inventoryProductId).trim() : null,
        serviceName,
        qty,
        unitPrice,
        lineTotal
      });
    }

    let cashReceived = null;
    let changeDue = null;
    if (paymentMethod === "Cash") {
      cashReceived = Number(body.cashReceived);
      if (!Number.isFinite(cashReceived) || cashReceived < total) {
        sendJson(response, 400, { error: "Cash received is not enough." });
        return;
      }
      changeDue = cashReceived - total;
    }

    const now = new Date();
    const txId = `TX-${now.getTime()}`;
    const txDate = formatDateKey(now);
    const txTime = formatTimeKey(now);
    runInTransaction(() => {
      db.prepare(`
        INSERT INTO transactions (id, tx_date, tx_time, staff_id, payment_method, total, reference_number, customer_name, customer_phone, cash_received, change_due)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        txId,
        txDate,
        txTime,
        staffId,
        paymentMethod,
        total,
        referenceNumber || null,
        customerName || null,
        customerPhone || null,
        cashReceived,
        changeDue
      );
      const insertItem = db.prepare(`
        INSERT INTO transaction_items (transaction_id, service_id, service_name, unit_price, qty, line_total)
        VALUES (?, ?, ?, ?, ?, ?)
      `);
      for (const item of normalizedItems) {
        insertItem.run(txId, item.serviceId, item.serviceName, item.unitPrice, item.qty, item.lineTotal);
      }

      // Inventory hook point: if transaction items carry inventoryProductId, deduct stock and log movement.
      const getInventory = db.prepare("SELECT id, stock_qty FROM inventory_products WHERE id = ?");
      const updateInventory = db.prepare("UPDATE inventory_products SET stock_qty = ?, updated_at = ? WHERE id = ?");
      for (const item of normalizedItems) {
        const productId = String(item.inventoryProductId || "").trim();
        if (!productId) continue;
        const product = getInventory.get(productId);
        if (!product) continue;
        const previousQty = Number(product.stock_qty || 0);
        const qtyToDeduct = Number(item.qty || 0);
        const newQty = Number((previousQty - qtyToDeduct).toFixed(4));
        updateInventory.run(newQty, nowIso(), productId);
        createInventoryMovement({
          productId,
          movementType: "sale_deduction",
          qtyChange: Number((-Math.abs(qtyToDeduct)).toFixed(4)),
          previousQty,
          newQty,
          note: `Sale ${txId}`,
          createdBy: staffId
        });
      }
    });

    sendJson(response, 201, {
      transaction: {
        id: txId,
        date: txDate,
        time: txTime,
        staffId,
        paymentMethod,
        total,
        referenceNumber,
        items: normalizedItems,
        customer: { name: customerName, phone: customerPhone },
        cashReceived,
        change: changeDue
      }
    });
    return;
  }

  if (request.method === "DELETE" && pathname.startsWith("/api/transactions/")) {
    const id = parseIdFromPath(pathname, "/api/transactions/");
    if (!id) {
      sendJson(response, 404, { error: "Not found." });
      return;
    }
    const existing = db.prepare("SELECT id, is_deleted FROM transactions WHERE id = ?").get(id);
    if (!existing) {
      sendJson(response, 404, { error: "Transaction not found." });
      return;
    }
    if (Number(existing.is_deleted || 0) === 1) {
      sendJson(response, 200, { ok: true, deletedId: id, alreadyDeleted: true });
      return;
    }
    const staffId = String(urlObj.searchParams.get("staffId") || "").trim();
    const deletedAt = new Date().toISOString();
    runInTransaction(() => {
      db.prepare("UPDATE transactions SET is_deleted = 1, deleted_at = ?, deleted_by_staff_id = ? WHERE id = ?")
        .run(deletedAt, staffId || null, id);
      logAudit("transaction", id, "soft_delete", staffId, { source: "single-delete" });
    });
    sendJson(response, 200, { ok: true, deletedId: id });
    return;
  }

  if (request.method === "POST" && pathname === "/api/transactions/delete-batch") {
    const body = await readJsonBody(request);
    const ids = Array.isArray(body.ids)
      ? body.ids.map((v) => String(v || "").trim()).filter(Boolean)
      : [];
    const staffId = String(body.staffId || "").trim();
    if (ids.length === 0) {
      sendJson(response, 400, { error: "ids are required." });
      return;
    }
    let deletedCount = 0;
    const deletedAt = new Date().toISOString();
    runInTransaction(() => {
      const del = db.prepare("UPDATE transactions SET is_deleted = 1, deleted_at = ?, deleted_by_staff_id = ? WHERE id = ? AND is_deleted = 0");
      for (const id of ids) {
        const result = del.run(deletedAt, staffId || null, id);
        deletedCount += Number(result.changes || 0);
        if (Number(result.changes || 0) > 0) {
          logAudit("transaction", id, "soft_delete", staffId, { source: "batch-delete" });
        }
      }
    });
    sendJson(response, 200, { ok: true, deletedCount, requestedCount: ids.length });
    return;
  }

  if (request.method === "POST" && pathname === "/api/transactions/restore-batch") {
    const body = await readJsonBody(request);
    const ids = Array.isArray(body.ids)
      ? body.ids.map((v) => String(v || "").trim()).filter(Boolean)
      : [];
    const staffId = String(body.staffId || "").trim();
    if (ids.length === 0) {
      sendJson(response, 400, { error: "ids are required." });
      return;
    }
    let restoredCount = 0;
    runInTransaction(() => {
      const restore = db.prepare("UPDATE transactions SET is_deleted = 0, deleted_at = NULL, deleted_by_staff_id = NULL WHERE id = ? AND is_deleted = 1");
      for (const id of ids) {
        const result = restore.run(id);
        restoredCount += Number(result.changes || 0);
        if (Number(result.changes || 0) > 0) {
          logAudit("transaction", id, "restore", staffId, { source: "batch-restore" });
        }
      }
    });
    sendJson(response, 200, { ok: true, restoredCount, requestedCount: ids.length });
    return;
  }

  if (request.method === "GET" && pathname === "/api/transactions") {
    const date = urlObj.searchParams.get("date");
    const startDateParam = urlObj.searchParams.get("startDate");
    const endDateParam = urlObj.searchParams.get("endDate");
    const referenceFilter = String(urlObj.searchParams.get("reference") || "").trim();
    const paymentMethodFilterRaw = String(urlObj.searchParams.get("paymentMethod") || "").trim();
    const paymentMethodFilter = paymentMethodFilterRaw ? normalizePayment(paymentMethodFilterRaw) : null;
    if (paymentMethodFilterRaw && !paymentMethodFilter) {
      sendJson(response, 400, { error: "Invalid payment method." });
      return;
    }
    const statusRaw = String(urlObj.searchParams.get("status") || "active").trim().toLowerCase();
    const status = (statusRaw === "all" || statusRaw === "deleted" || statusRaw === "active") ? statusRaw : "active";
    let targetDate = null;
    let rangeStart = null;
    let rangeEnd = null;
    if (date) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        sendJson(response, 400, { error: "date must be YYYY-MM-DD." });
        return;
      }
      targetDate = date;
    }
    if (startDateParam || endDateParam) {
      if (targetDate) {
        sendJson(response, 400, { error: "Use either date or startDate/endDate, not both." });
        return;
      }
      rangeStart = String(startDateParam || "").trim();
      rangeEnd = String(endDateParam || "").trim();
      if (!rangeStart || !rangeEnd || !isDateKey(rangeStart) || !isDateKey(rangeEnd)) {
        sendJson(response, 400, { error: "startDate and endDate must be YYYY-MM-DD." });
        return;
      }
      if (rangeStart > rangeEnd) {
        sendJson(response, 400, { error: "startDate must be on or before endDate." });
        return;
      }
    }

    const clauses = [];
    const args = [];
    if (targetDate) {
      clauses.push("t.tx_date = ?");
      args.push(targetDate);
    } else if (rangeStart && rangeEnd) {
      clauses.push("t.tx_date BETWEEN ? AND ?");
      args.push(rangeStart, rangeEnd);
    }
    if (referenceFilter) {
      clauses.push("lower(COALESCE(t.reference_number, '')) LIKE lower(?)");
      args.push(`%${referenceFilter}%`);
    }
    if (paymentMethodFilter) {
      clauses.push("lower(COALESCE(t.payment_method, '')) = lower(?)");
      args.push(paymentMethodFilter);
    }
    if (status === "active") clauses.push("t.is_deleted = 0");
    if (status === "deleted") clauses.push("t.is_deleted = 1");

    const whereSql = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
    const txRows = db.prepare(`
        SELECT
          t.id,
          t.tx_date,
          t.tx_time,
          t.staff_id,
          s.name AS staff_name,
          t.payment_method,
          t.total,
          t.reference_number,
          t.customer_name,
          t.customer_phone,
          t.cash_received,
          t.change_due,
          t.is_deleted,
          t.deleted_at,
          t.deleted_by_staff_id
        FROM transactions t
        JOIN staff_users s ON s.id = t.staff_id
        ${whereSql}
        ORDER BY t.created_at DESC
      `).all(...args);
    const itemQuery = db.prepare(`
      SELECT service_id, service_name, unit_price, qty, line_total
      FROM transaction_items
      WHERE transaction_id = ?
      ORDER BY id ASC
    `);
    const transactions = txRows.map((row) => ({
      id: row.id,
      date: row.tx_date,
      time: row.tx_time,
      staffId: row.staff_id,
      staffName: row.staff_name,
      payment: row.payment_method,
      total: Number(row.total),
      referenceNumber: row.reference_number || "",
      isDeleted: Number(row.is_deleted || 0) === 1,
      deletedAt: row.deleted_at || null,
      deletedByStaffId: row.deleted_by_staff_id || null,
      customer: {
        name: row.customer_name || "",
        phone: row.customer_phone || ""
      },
      cashReceived: row.cash_received === null ? null : Number(row.cash_received),
      change: row.change_due === null ? null : Number(row.change_due),
      items: itemQuery.all(row.id).map((i) => ({
        id: i.service_id,
        name: i.service_name,
        price: Number(i.unit_price),
        qty: Number(i.qty),
        lineTotal: Number(i.line_total)
      }))
    }));
    sendJson(response, 200, { transactions });
    return;
  }

  if (request.method === "POST" && pathname === "/api/migrations/localstorage") {
    const body = await readJsonBody(request);
    const alreadyMigrated = getMeta("migrated_from_localstorage") === "1";
    if (alreadyMigrated) {
      sendJson(response, 200, { migrated: false, reason: "already_migrated" });
      return;
    }

    const staffUsers = Array.isArray(body.staffUsers || body.pos_staff_users) ? (body.staffUsers || body.pos_staff_users) : [];
    const services = Array.isArray(body.services || body.pos_services) ? (body.services || body.pos_services) : [];
    const transactions = Array.isArray(body.transactions || body.pos_transactions) ? (body.transactions || body.pos_transactions) : [];
    const hasData = staffUsers.length > 0 || services.length > 0 || transactions.length > 0;

    if (!hasData) {
      setMeta("migrated_from_localstorage", "1");
      sendJson(response, 200, { migrated: false, reason: "no_legacy_data" });
      return;
    }

    runInTransaction(() => {
      db.exec("DELETE FROM inventory_movements;");
      db.exec("DELETE FROM inventory_products;");
      db.exec("DELETE FROM transaction_items;");
      db.exec("DELETE FROM transactions;");
      db.exec("DELETE FROM cash_movements;");
      db.exec("DELETE FROM service_price_history;");
      db.exec("DELETE FROM services;");
      db.exec("DELETE FROM staff_users;");

      const insertStaff = db.prepare("INSERT INTO staff_users (id, username, name, role, pin_hash) VALUES (?, ?, ?, ?, ?)");
      for (const staff of staffUsers) {
        const id = String(staff.id || "").trim();
        const username = String(staff.username || "").trim();
        const name = String(staff.name || "").trim();
        const role = String(staff.role || "Cashier").trim();
        if (!id || !username || !name) continue;
        const pinHash = typeof staff.pinHash === "string"
          ? staff.pinHash
          : bcrypt.hashSync(String(staff.pin || "1234"), 10);
        insertStaff.run(id, username, name, role, pinHash);
      }

      const insertService = db.prepare(
        "INSERT INTO services (id, name, category, subcategory, sub_subcategory, current_price, active, sort_order, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)"
      );
      const insertHistory = db.prepare(
        "INSERT INTO service_price_history (service_id, action, previous_price, price, changed_by_staff_id, changed_at) VALUES (?, ?, ?, ?, ?, ?)"
      );
      const nowIso = new Date().toISOString();
      const byGroup = new Map();
      for (const service of services) {
        const id = String(service.id || "").trim();
        const name = String(service.name || "").trim();
        const category = String(service.category || "").trim();
        const subcategory = String(service.subcategory || "").trim();
        const subSubcategory = String(service.subSubcategory || "").trim();
        const price = Number(service.price);
        const active = Boolean(service.active);
        if (!id || !name || !category || !Number.isFinite(price) || price <= 0) continue;
        const key = `${category}::${subcategory}::${subSubcategory}`;
        const nextSort = (byGroup.get(key) || 0) + 1;
        byGroup.set(key, nextSort);
        insertService.run(id, name, category, subcategory, subSubcategory, price, active ? 1 : 0, nextSort, nowIso);

        const history = Array.isArray(service.history) ? service.history : [];
        if (history.length > 0) {
          for (const event of history) {
            const action = String(event.action || "price").trim();
            const priceToStore = Number(
              Object.prototype.hasOwnProperty.call(event, "to")
                ? event.to
                : Object.prototype.hasOwnProperty.call(event, "price")
                  ? event.price
                  : price
            );
            if (!Number.isFinite(priceToStore) || priceToStore <= 0) continue;
            const previous = Object.prototype.hasOwnProperty.call(event, "from") ? Number(event.from) : null;
            insertHistory.run(
              id,
              action,
              Number.isFinite(previous) ? previous : null,
              priceToStore,
              event.by ? String(event.by) : "migration",
              event.at ? String(event.at) : nowIso
            );
          }
        } else {
          insertHistory.run(id, "create", null, price, "migration", nowIso);
        }
      }

      const insertTx = db.prepare(`
        INSERT INTO transactions (id, tx_date, tx_time, staff_id, payment_method, total, reference_number, customer_name, customer_phone, cash_received, change_due)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      const insertTxItem = db.prepare(`
        INSERT INTO transaction_items (transaction_id, service_id, service_name, unit_price, qty, line_total)
        VALUES (?, ?, ?, ?, ?, ?)
      `);
      for (const tx of transactions) {
        const staffId = String(tx.staffId || "").trim();
        const txId = String(tx.id || `TX-${Date.now()}-${Math.random().toString(16).slice(2)}`).trim();
        const payment = normalizePayment(tx.payment || tx.paymentMethod || "");
        const total = Number(tx.total);
        if (!staffId || !payment || !Number.isFinite(total) || total < 0) continue;
        const txDate = /^\d{4}-\d{2}-\d{2}$/.test(String(tx.date || "")) ? String(tx.date) : formatDateKey(new Date());
        const txTime = String(tx.time || "00:00");
        insertTx.run(
          txId,
          txDate,
          txTime,
          staffId,
          payment,
          total,
          tx.referenceNumber ? String(tx.referenceNumber).trim() : (tx.reference ? String(tx.reference).trim() : null),
          tx.customer?.name ? String(tx.customer.name).trim() : null,
          tx.customer?.phone ? String(tx.customer.phone).trim() : null,
          Object.prototype.hasOwnProperty.call(tx, "cashReceived") ? Number(tx.cashReceived) : null,
          Object.prototype.hasOwnProperty.call(tx, "change") ? Number(tx.change) : null
        );
        const items = Array.isArray(tx.items) ? tx.items : [];
        for (const item of items) {
          const unitPrice = Number(item.price);
          const qty = Number(item.qty);
          const serviceName = String(item.name || "").trim();
          if (!serviceName || !Number.isFinite(unitPrice) || unitPrice <= 0 || !Number.isFinite(qty) || qty <= 0) continue;
          insertTxItem.run(txId, item.id ? String(item.id) : null, serviceName, unitPrice, qty, unitPrice * qty);
        }
      }

      setMeta("migrated_from_localstorage", "1");
    });

    sendJson(response, 200, { migrated: true });
    return;
  }

  sendJson(response, 404, { error: "Not found." });
}

function createServer() {
  return http.createServer(async (request, response) => {
    try {
      const urlObj = new URL(request.url, `http://${request.headers.host || "localhost"}`);
      if (urlObj.pathname.startsWith("/api/")) {
        await handleApi(request, response, urlObj);
        return;
      }

      const requestPath = urlObj.pathname === "/" ? "index.html" : urlObj.pathname.replace(/^\/+/, "");
      const safePath = path.normalize(requestPath).replace(/^(\.\.[/\\])+/, "");
      const filePath = path.join(ROOT, safePath);
      if (!filePath.startsWith(ROOT)) {
        response.writeHead(403, { "Content-Type": "text/plain; charset=UTF-8" });
        response.end("Forbidden.");
        return;
      }
      sendFile(filePath, response);
    } catch (error) {
      sendJson(response, 500, { error: error.message || "Server error." });
    }
  });
}

const server = createServer();

server.on("error", (error) => {
  if (error.code === "EADDRINUSE") {
    console.error("");
    console.error(`Cannot start POS: port ${PORT} is already in use.`);
    console.error("Fix option 1 (recommended): close the app using that port.");
    console.error(`  netstat -ano | findstr :${PORT}`);
    console.error("  taskkill /PID <PID_FROM_NETSTAT> /F");
    console.error("Fix option 2: run POS on another port.");
    console.error(`  set PORT=4174 && node \"${path.join(ROOT, "server.js")}\"`);
    console.error("");
    process.exit(1);
  }

  console.error("Failed to start POS server:", error.message);
  process.exit(1);
});

server.listen(PORT, () => {
  console.log(`Neighborhood POS is running at http://localhost:${PORT}`);
  console.log(`SQLite DB: ${DB_PATH}`);
});
