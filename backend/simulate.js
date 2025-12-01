// backend/simulate.js
// Fake micropayment simulator for stress-test + analytics

const { randomUUID } = require("crypto");
const { insertMetric } = require("./db");

/**
 * Create one realistic fake metric row compatible with db.js schema.
 */
function makeFakeMetric() {
  const chains = ["sepolia", "optimism", "polygonAmoy", "zksync"];
  const chain = chains[Math.floor(Math.random() * chains.length)];

  const now = Date.now();
  const latencyMs = Math.floor(Math.random() * 1500); // 0–1500 ms
  const sendTs = now - latencyMs;
  const settledTs = now;

  // random tiny payment
  const amountEth = Math.random() * 0.01; // up to 0.01 ETH
  const amountWei = BigInt(Math.floor(amountEth * 1e18));

  // random tiny gas cost
  const costEth = Math.random() * 0.0001;
  const l2CostWei = BigInt(Math.floor(costEth * 1e18));

  return {
    txHash: "0x" + randomUUID().replace(/-/g, "").padEnd(64, "0"),
    chain,
    sendTs,
    settledTs,
    latencyMs,
    status: "settled",
    amountWei: amountWei.toString(),
    l2CostWei: l2CostWei.toString(),
    l1CostWei: "0",
    token: "native",
  };
}

/**
 * Run N simulated micropayments:
 *  - writes each metric to SQLite (via insertMetric)
 *  - optionally emits each one to all connected sockets as "txStatus"
 *
 * @param {number} count
 * @param {import("socket.io").Server} io
 * @returns {{ ok: boolean, count: number }}
 */
function runSimulation(count = 200, io) {
  const n = Number(count) > 0 ? Number(count) : 0;

  for (let i = 0; i < n; i++) {
    const metric = makeFakeMetric();

    // 1) store in DB (analytics dashboard)
    insertMetric(metric);

    // 2) push to live feed if Socket.IO is present
    if (io) {
      io.emit("txStatus", metric);
    }
  }

  return { ok: true, count: n };
}

module.exports = { runSimulation };
