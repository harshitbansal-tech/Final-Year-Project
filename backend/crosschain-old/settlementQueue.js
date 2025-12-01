// backend/crosschain/settlementQueue.js
// Simple in-memory queue that simulates cross-chain settlement arrival after delay.
// Emits txStatus via the `io` passed in. Persists metrics via db.insertMetric.

const { randomBytes } = require("crypto");
const { insertMetric } = require("../db");
const fx = require("../fx");

const pending = []; // in-memory queue, persisted metrics written after settlement

function newTxHash() {
  return "0x" + randomBytes(12).toString("hex");
}

/**
 * enqueueCrosschain
 *  - stores the request
 *  - schedules a delayed settlement to simulate bridging latency
 *  - emits socket events:
 *     * initial: { txHash, chain: fromChain, status: 'queued', ... }
 *     * arrival: { txHash, chain: toChain, status: 'settled', ... }
 *
 * @param {Object} params:
 *    { fromChain, toChain, amountWei, toAddress, quote, io }
 */
async function enqueueCrosschain({ fromChain, toChain, amountWei, toAddress, quote = {}, io }) {
  const txHash = newTxHash();
  const sendTs = Date.now();
  const amountEth = Number(amountWei) / 1e18;

  // initial queued metric on source chain
  const queuedMetric = {
    txHash,
    chain: fromChain,
    sendTs,
    settledTs: null,
    latencyMs: null,
    status: "queued",
    amountWei: amountWei.toString(),
    l2CostWei: "0",
    l1CostWei: "0",
    token: "native",
    meta: { toAddress, toChain, quote }
  };

  // persist queued metric (optional)
  try {
    insertMetric(queuedMetric);
  } catch (e) {
    // fail-safe: log but continue
    console.error("insertMetric (queued) failed:", e?.message || e);
  }

  // Emit queued event via socket
  if (io && io.emit) {
    io.emit("txStatus", queuedMetric);
  }

  // schedule settlement after estimated latency (quote.estimatedLatencySec)
  const latencyMs = (quote?.estimatedLatencySec || 10) * 1000;
  const settleDelay = Math.max(2000, latencyMs); // min 2s for demo

  // For demo, simulate some arrival variance
  const jitter = Math.round(Math.random() * 2000 - 1000);
  const finalDelay = Math.max(1000, settleDelay + jitter);

  // push to pending for bookkeeping
  pending.push({ txHash, fromChain, toChain, amountWei, toAddress, sendTs, finalDelay });

  // schedule settlement
  setTimeout(async () => {
    const settledTs = Date.now();
    const latencyMs = settledTs - sendTs;

    // compute simple l2Cost and l1Cost demo numbers
    const l2CostWei = (BigInt(21000) * BigInt(1000000000)).toString(); // 21000 Gwei-ish, placeholder
    const l1CostWei = "0";

    const arrivalMetric = {
      txHash,
      chain: toChain,
      sendTs,
      settledTs,
      latencyMs,
      status: "settled",
      amountWei: amountWei.toString(),
      l2CostWei,
      l1CostWei,
      token: "native",
      meta: { fromChain }
    };

    // persist settled metric
    try {
      insertMetric(arrivalMetric);
    } catch (e) {
      console.error("insertMetric (settled) failed:", e?.message || e);
    }

    // emit via socket
    if (io && io.emit) {
      io.emit("txStatus", arrivalMetric);
      io.emit("crosschain:arrived", { txHash, fromChain, toChain, amountWei, settledTs });
    }
  }, finalDelay);

  return { txHash, estimatedLatencySec: Math.round(finalDelay / 1000) };
}

module.exports = { enqueueCrosschain };
