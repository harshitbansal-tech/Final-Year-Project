// backend/routes/fxSpread.js
const express = require("express");
const { convertEth } = require("../fx");

module.exports = function makeFxSpreadRouter() {
  const router = express.Router();

  // Return ETH price in USD/EUR/INR in one call.
  router.get("/spread", async (req, res) => {
    try {
      const amountEth = Number(req.query.amountEth || 1);

      const usd = await convertEth(amountEth, "usd");
      const eur = await convertEth(amountEth, "eur");
      const inr = await convertEth(amountEth, "inr");

      res.json({
        amountEth,
        currencies: [
          { currency: "USD", value: usd },
          { currency: "EUR", value: eur },
          { currency: "INR", value: inr },
        ],
      });
    } catch (e) {
      console.error("❌ /fx/spread error:", e);
      res.status(500).json({ error: e.message || String(e) });
    }
  });

  return router;
};
