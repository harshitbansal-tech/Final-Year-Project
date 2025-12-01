// backend/routes/payments.js
// Simple native payment endpoint that calls PaymentProcessor.payNative

const express = require("express");
const { ethers } = require("ethers");
const { insertMetric } = require("../db");

module.exports = function (micropay, signer, defaultChain = "sepolia") {
  const router = express.Router();

  if (!micropay || !signer) {
    console.warn("[payments] Micropay contract or signer not available");
  }

  // POST /api/payments/native
  // body: { to, amountEth }
  router.post("/native", async (req, res) => {
    try {
      if (!micropay || !signer) {
        return res.status(500).json({
          ok: false,
          error: "Micropay contract or signer not configured on backend",
        });
      }

      const { to, amountEth } = req.body || {};
      if (!to || !ethers.isAddress(to)) {
        return res.status(400).json({ ok: false, error: "Invalid 'to' address" });
      }

      const amt = Number(amountEth);
      if (!amt || amt <= 0) {
        return res.status(400).json({ ok: false, error: "Invalid 'amountEth'" });
      }

      const valueWei = ethers.parseEther(String(amountEth));

      const sendTs = Date.now();
      const tx = await micropay.payNative(to, { value: valueWei });

      // Optionally wait for confirmation
      const receipt = await tx.wait();

      const settledTs = Date.now();
      const latencyMs = settledTs - sendTs;

      // Store a simple metric row
      insertMetric({
        txHash: receipt.hash,
        chain: defaultChain,
        sendTs,
        settledTs,
        latencyMs,
        status: receipt.status === 1 ? "settled" : "failed",
        amountWei: valueWei.toString(),
        l2CostWei: (receipt.gasUsed * receipt.effectiveGasPrice).toString(),
        l1CostWei: "0",
        token: "native",
      });

      res.json({
        ok: true,
        txHash: receipt.hash,
        status: receipt.status === 1 ? "success" : "failed",
      });
    } catch (err) {
      console.error("[payments/native] error:", err);
      res.status(500).json({
        ok: false,
        error: err.message || String(err),
      });
    }
  });

  return router;
};
