// backend/routes/fees.js
const express = require("express");
const { ethers } = require("ethers");

module.exports = function (providers) {
  const router = express.Router();

  // Per-chain fallback gas prices (in gwei)
  function fallbackGasPrice(chain) {
    const gwei = (n) => ethers.parseUnits(n.toString(), "gwei");

    switch (chain) {
      case "sepolia":
        return gwei(3); // Ethereum Sepolia
      case "optimism":
        return gwei(0.001); // Optimism Sepolia
      case "zksync":
        return gwei(0.002); // zkSync Era Sepolia
      case "polygonAmoy":
        return gwei(30); // Polygon Amoy
      default:
        return gwei(5); // sane default
    }
  }

  // GET /api/fee/predict?chain=sepolia&to=0x...&amountEth=0.001
  router.get("/predict", async (req, res) => {
    try {
      const { chain, to, amountEth, mockEthPrice } = req.query;

      if (!chain || !providers[chain]) {
        return res.status(400).json({ ok: false, error: "invalid chain" });
      }

      const amountNum = Number(amountEth);
      if (!amountEth || isNaN(amountNum) || amountNum <= 0) {
        return res.status(400).json({ ok: false, error: "invalid amount" });
      }

      const provider = providers[chain];

      // 1️⃣ fee data
      let gasPrice = null;
      try {
        const feeData = await provider.getFeeData();
        if (feeData) {
          gasPrice =
            feeData.gasPrice ||
            feeData.maxFeePerGas ||
            feeData.maxPriorityFeePerGas ||
            null;
        }
      } catch (_) {
        gasPrice = null;
      }

      // 2️⃣ fallback per chain if missing or zero
      if (!gasPrice || gasPrice <= 0n) {
        gasPrice = fallbackGasPrice(chain);
      }

      // 3️⃣ estimate gas with safe fallback
      let estimateGas;
      try {
        estimateGas = await provider.estimateGas({
          to: to || "0x000000000000000000000000000000000000dEaD",
          value: ethers.parseEther(String(amountEth)),
        });
      } catch (_) {
        estimateGas = 21000n;
      }

      const feeWei = gasPrice * estimateGas;
      const feeEth = Number(ethers.formatEther(feeWei));

      const ethPrice = Number(mockEthPrice || 3000);
      const feeUsd = feeEth * ethPrice;

      res.json({
        ok: true,
        chain,
        gasPriceWei: gasPrice.toString(),
        estimateGas: Number(estimateGas.toString()),
        feeEth,
        feeUsd,
        etaSec: Math.floor(Math.random() * 25) + 5,
      });
    } catch (err) {
      res
        .status(500)
        .json({ ok: false, error: err.message || String(err) });
    }
  });

  return router;
};
