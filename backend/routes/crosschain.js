// backend/routes/crosschain.js
const express = require("express");
const { ethers } = require("ethers");

module.exports = function (io, providers) {
  const router = express.Router();

  // Helper: get approximate gas price in gwei for a chain
  async function getGasInfo(chain) {
    const provider = providers[chain];
    if (!provider) {
      return { gasGwei: null, ok: false, error: "no provider" };
    }

    try {
      const feeData = await provider.getFeeData();
      let gasPrice =
        feeData?.gasPrice ||
        feeData?.maxFeePerGas ||
        feeData?.maxPriorityFeePerGas ||
        null;

      if (!gasPrice) {
        const raw = provider.send ? await provider.send("eth_gasPrice", []) : null;
        if (raw) gasPrice = BigInt(raw);
      }

      if (!gasPrice) {
        return { gasGwei: null, ok: false, error: "no gasPrice" };
      }

      return {
        gasGwei: Number(gasPrice) / 1e9,
        gasWei: gasPrice.toString(),
        ok: true,
      };
    } catch (e) {
      return { gasGwei: null, ok: false, error: e.message };
    }
  }

  // GET /api/crosschain/quote?from=sepolia&to=optimism&amountEth=0.001
  router.get("/quote", async (req, res) => {
    try {
      const { from, to, amountEth } = req.query;

      if (!from || !to) {
        return res.status(400).json({ error: "from/to required" });
      }
      if (!providers[from] || !providers[to]) {
        return res.status(400).json({ error: "unknown chain(s)" });
      }

      const amt = Number(amountEth || "0");
      if (!amt || amt <= 0) {
        return res.status(400).json({ error: "invalid amountEth" });
      }

      const [srcGas, dstGas] = await Promise.all([
        getGasInfo(from),
        getGasInfo(to),
      ]);

      const bridgeFeeBps = 15; // 0.15% mock fee
      const slippageBps = 5;   // 0.05% mock slippage

      const srcLatencySec = 5 + Math.floor(Math.random() * 15);
      const dstLatencySec = 5 + Math.floor(Math.random() * 15);
      const totalLatencySec = srcLatencySec + dstLatencySec;

      const amountOut = amt * (1 - (bridgeFeeBps + slippageBps) / 10000);

      res.json({
        from,
        to,
        amountInEth: amt,
        amountOutEth: amountOut,
        bridgeFeeBps,
        slippageBps,
        src: srcGas,
        dst: dstGas,
        latency: {
          srcSec: srcLatencySec,
          dstSec: dstLatencySec,
          totalSec: totalLatencySec,
        },
      });
    } catch (err) {
      res.status(500).json({ error: err.message || String(err) });
    }
  });

  // Example: simple route scoring for UI tuning
  // GET /api/crosschain/routes?amountEth=0.001
  router.get("/routes", async (req, res) => {
    try {
      const { amountEth = "0.001" } = req.query;
      const amt = Number(amountEth);
      if (!amt || amt <= 0) {
        return res.status(400).json({ error: "invalid amountEth" });
      }

      const chains = Object.keys(providers);
      const routes = [];

      for (const src of chains) {
        for (const dst of chains) {
          if (src === dst) continue;

          const [srcGas, dstGas] = await Promise.all([
            getGasInfo(src),
            getGasInfo(dst),
          ]);

          const score =
            (srcGas.gasGwei || 100) +
            (dstGas.gasGwei || 100) +
            Math.random() * 10;

          routes.push({
            from: src,
            to: dst,
            gasScore: score,
            srcGas,
            dstGas,
          });
        }
      }

      routes.sort((a, b) => a.gasScore - b.gasScore);

      res.json({
        amountEth: amt,
        routes,
      });
    } catch (err) {
      res.status(500).json({ error: err.message || String(err) });
    }
  });

  return router;
};
