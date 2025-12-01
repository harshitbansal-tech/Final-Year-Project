// backend/routes/network.js
const express = require("express");
const { ethers } = require("ethers");

module.exports = function (providers) {
  const router = express.Router();

  // Simple "mood" classification based on age
  function classifyStatus(ageSec, hasBlock) {
    if (!hasBlock) return { status: "unreachable", mood: "angry" }; // 🔴
    if (ageSec < 30) return { status: "healthy", mood: "happy" };   // 🟢
    if (ageSec < 120) return { status: "delayed", mood: "stressed" }; // 🟡
    return { status: "stalled", mood: "angry" };                    // 🔴
  }

  // GET /api/network/status
  router.get("/status", async (req, res) => {
    const out = {};

    for (const [chain, provider] of Object.entries(providers)) {
      if (!provider) {
        out[chain] = {
          status: "unreachable",
          mood: "angry",
          error: "RPC not configured",
        };
        continue;
      }

      try {
        const now = Math.floor(Date.now() / 1000);

        // latest block (may be null)
        const block = await provider.getBlock("latest").catch((e) => {
          console.warn(`[network.status] ${chain} getBlock error:`, e?.message);
          return null;
        });

        // fee data
        let gasPriceBigInt = null;
        try {
          const feeData = await provider.getFeeData();
          if (feeData) {
            gasPriceBigInt =
              feeData.gasPrice ||
              feeData.maxFeePerGas ||
              feeData.maxPriorityFeePerGas ||
              null;
          }
        } catch (e) {
          console.warn(
            `[network.status] ${chain} getFeeData error:`,
            e?.message
          );
        }

        // fallback to eth_gasPrice
        if (gasPriceBigInt == null) {
          try {
            const raw = await provider.send?.("eth_gasPrice", []);
            if (raw) gasPriceBigInt = BigInt(raw);
          } catch (e) {
            console.warn(
              `[network.status] ${chain} eth_gasPrice fallback error:`,
              e?.message
            );
          }
        }

        const ts = block?.timestamp ?? now;
        const ageSec = now - ts;
        const { status, mood } = classifyStatus(ageSec, !!block);

        out[chain] = {
          blockNumber: block?.number ?? null,
          timestamp: ts,
          ageSec,
          gasPriceWei:
            gasPriceBigInt != null ? gasPriceBigInt.toString() : null,
          gasPriceGwei:
            gasPriceBigInt != null
              ? (Number(gasPriceBigInt) / 1e9).toFixed(3)
              : null,
          status,
          mood, // "happy" | "stressed" | "angry"
        };
      } catch (err) {
        out[chain] = {
          status: "unreachable",
          mood: "angry",
          error: err?.message || String(err),
        };
      }
    }

    res.json(out);
  });

  return router;
};
