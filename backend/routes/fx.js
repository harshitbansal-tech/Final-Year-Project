// backend/routes/fx.js
const express = require("express");
const { convertEth } = require("../fx"); // ✅ this uses the CoinGecko-based converter

module.exports = function () {
  const router = express.Router();

  // GET /api/fx/convert?amountEth=1&to=usd
  router.get("/convert", async (req, res) => {
    try {
      const { amountEth = "1", to = "usd" } = req.query;
      const amtNum = Number(amountEth);
      if (!amtNum || amtNum <= 0) {
        return res.status(400).json({ error: "Invalid amountEth" });
      }

      const value = await convertEth(amtNum, to);
      res.json({
        amountEth: amtNum,
        currency: to.toUpperCase(),
        value,
      });
    } catch (err) {
      res.status(500).json({ error: err.message || String(err) });
    }
  });

  // GET /api/fx/spread?amountEth=1
  // returns ETH converted to USD/EUR/INR together
  router.get("/spread", async (req, res) => {
    try {
      const { amountEth = "1" } = req.query;
      const amtNum = Number(amountEth);
      if (!amtNum || amtNum <= 0) {
        return res.status(400).json({ error: "Invalid amountEth" });
      }

      const [usd, eur, inr] = await Promise.all([
        convertEth(amtNum, "usd"),
        convertEth(amtNum, "eur"),
        convertEth(amtNum, "inr"),
      ]);

      res.json({
        amountEth: amtNum,
        currencies: [
          { currency: "USD", value: usd },
          { currency: "EUR", value: eur },
          { currency: "INR", value: inr },
        ],
      });
    } catch (err) {
      res.status(500).json({ error: err.message || String(err) });
    }
  });

  return router;
};
