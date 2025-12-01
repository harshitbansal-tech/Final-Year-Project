// backend/db.js
const Database = require("better-sqlite3");

// Single file DB in project root
const db = new Database("micropay.db");

// Ensure metrics table exists
db.prepare(`
  CREATE TABLE IF NOT EXISTS metrics (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    txHash      TEXT,
    chain       TEXT,
    sendTs      INTEGER,
    settledTs   INTEGER,
    latencyMs   INTEGER,
    status      TEXT,
    amountWei   TEXT,
    l2CostWei   TEXT,
    l1CostWei   TEXT,
    token       TEXT
  )
`).run();

/**
 * Insert a metric row.
 * Missing fields are defaulted to sane values so frontend never crashes.
 */
function insertMetric(m = {}) {
  const stmt = db.prepare(`
    INSERT INTO metrics
      (txHash, chain, sendTs, settledTs, latencyMs, status,
       amountWei, l2CostWei, l1CostWei, token)
    VALUES
      (@txHash, @chain, @sendTs, @settledTs, @latencyMs, @status,
       @amountWei, @l2CostWei, @l1CostWei, @token)
  `);

  stmt.run({
    txHash: m.txHash || "",
    chain: m.chain || "sepolia",
    sendTs: m.sendTs || Date.now(),
    settledTs: m.settledTs || m.sendTs || Date.now(),
    latencyMs: m.latencyMs != null ? m.latencyMs : 0,
    status: m.status || "settled",
    amountWei: m.amountWei || "0",
    l2CostWei: m.l2CostWei || "0",
    l1CostWei: m.l1CostWei || "0",
    token: m.token || "native",
  });
}

/**
 * Summary per chain:
 * - count
 * - avgLatency (ms)
 * - avgCostWei (average l2CostWei)
 */
function getSummary() {
  const stmt = db.prepare(`
    SELECT
      chain,
      COUNT(*)                      AS count,
      AVG(latencyMs)                AS avgLatency,
      AVG(CAST(l2CostWei AS REAL))  AS avgCostWei
    FROM metrics
    GROUP BY chain
  `);
  return stmt.all();
}

/**
 * All metrics (latest first), capped to a limit
 */
function getAllMetrics(limit = 500) {
  const stmt = db.prepare(`
    SELECT *
    FROM metrics
    ORDER BY id DESC
    LIMIT ?
  `);
  return stmt.all(limit);
}

/**
 * Clear all metrics from the table
 */
function clearMetrics() {
  db.prepare(`DELETE FROM metrics`).run();
}

module.exports = {
  db,
  insertMetric,
  getSummary,
  getAllMetrics,
  clearMetrics,
};
