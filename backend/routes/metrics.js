// backend/routes/metrics.js
// Metrics summary + full list + clear

const express = require("express");
const {
  getSummary,
  getAllMetrics,
  clearMetrics,
} = require("../db");

module.exports = function () {
  const router = express.Router();

  // GET /api/metrics/summary
  router.get("/summary", (req, res) => {
    try {
      const summary = getSummary();
      res.json({ ok: true, summary });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message || String(err) });
    }
  });

  // GET /api/metrics/all
  router.get("/all", (req, res) => {
    try {
      const all = getAllMetrics();
      res.json({ ok: true, metrics: all });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message || String(err) });
    }
  });

  // POST /api/metrics/clear
  router.post("/clear", (req, res) => {
    try {
      clearMetrics();
      res.json({ ok: true, cleared: true });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message || String(err) });
    }
  });

  return router;
};
