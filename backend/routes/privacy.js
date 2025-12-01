// backend/routes/privacy.js
// Simple AOM-lite style privacy demo using in-memory commitments.
// Not production, just to show the concept.

const express = require("express");
const { ethers } = require("ethers");

// In-memory store: secretHash -> { amountEth, chain, claimed, createdAt }
const deposits = new Map();

module.exports = function (signer, providers) {
  const router = express.Router();

  // POST /api/privacy/deposit
  // body: { secretHash, amountEth, chain }
  router.post("/deposit", async (req, res) => {
    try {
      const { secretHash, amountEth = "0.001", chain = "sepolia" } = req.body || {};

      if (!secretHash || !/^0x[0-9a-fA-F]{64}$/.test(secretHash)) {
        return res
          .status(400)
          .json({ ok: false, error: "secretHash must be a 32-byte hex string" });
      }

      const amtNum = Number(amountEth);
      if (!amtNum || amtNum <= 0) {
        return res.status(400).json({ ok: false, error: "Invalid amountEth" });
      }

      // For demo, we DO NOT automatically send on-chain funds here.
      // Instead we just record a commitment in memory.
      deposits.set(secretHash, {
        secretHash,
        amountEth: amtNum,
        chain,
        claimed: false,
        createdAt: Date.now(),
      });

      res.json({
        ok: true,
        secretHash,
        amountEth: amtNum,
        chain,
        note: "Commitment stored in-memory only. This is a privacy UX demo.",
      });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message || String(err) });
    }
  });

  // POST /api/privacy/claim
  // body: { secret }
  router.post("/claim", async (req, res) => {
    try {
      const { secret } = req.body || {};
      if (!secret || typeof secret !== "string") {
        return res.status(400).json({ ok: false, error: "secret required" });
      }

      const secretHash = ethers.keccak256(ethers.toUtf8Bytes(secret));

      const deposit = deposits.get(secretHash);
      if (!deposit) {
        return res.status(404).json({
          ok: false,
          error: "No deposit found for this secret",
        });
      }
      if (deposit.claimed) {
        return res.status(400).json({
          ok: false,
          error: "Already claimed",
        });
      }

      // Mark as claimed
      deposit.claimed = true;
      deposits.set(secretHash, deposit);

      // OPTIONAL: you could send funds using signer here in a real version.
      // We only simulate for safety.
      res.json({
        ok: true,
        secretHash,
        amountEth: deposit.amountEth,
        chain: deposit.chain,
        message:
          "Claim accepted in the demo in-memory store. In a real version this would trigger an on-chain transfer.",
      });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message || String(err) });
    }
  });

  // GET /api/privacy/deposits (for debugging/admin)
  router.get("/deposits", (req, res) => {
    const all = Array.from(deposits.values());
    res.json({ ok: true, deposits: all });
  });

  return router;
};
