// frontend/components/FeePredictor.js
import { useState } from "react";

export default function FeePredictor({ chain, to, amountEth }) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  async function fetchEstimate() {
    // reset state
    setError(null);
    setResult(null);

    // ✅ Frontend validation: chain, to, amountEth must exist
    if (!chain) {
      setError("Missing chain");
      return;
    }

    if (!to || to.length === 0) {
      setError("Missing recipient address");
      return;
    }

    if (!amountEth || String(amountEth).trim().length === 0) {
      setError("Missing amount");
      return;
    }

    const amtNum = Number(amountEth);
    if (Number.isNaN(amtNum) || amtNum <= 0) {
      setError("Invalid amount");
      return;
    }

    setLoading(true);

    try {
      const url =
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/fee/predict` +
        `?chain=${encodeURIComponent(chain)}` +
        `&to=${encodeURIComponent(to)}` +
        `&amountEth=${encodeURIComponent(amountEth)}`;

      const res = await fetch(url);
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }

      const json = await res.json();

      if (json.ok === false || json.error) {
        throw new Error(json.error || "Fee predictor error");
      }

      setResult(json);
    } catch (e) {
      console.error("Error fetching prediction:", e);
      setError(e.message || "Error fetching prediction");
    } finally {
      setLoading(false);
    }
  }

  // Helper for gas price display
  function renderGasPrice(r) {
    if (!r) return "N/A";

    if (r.gasGwei != null) {
      return `${Number(r.gasGwei).toFixed(2)} gwei`;
    }

    if (r.gasPriceWei != null) {
      const gwei = Number(r.gasPriceWei) / 1e9;
      if (!Number.isNaN(gwei)) {
        return `${gwei.toFixed(2)} gwei`;
      }
      return `${r.gasPriceWei} wei`;
    }

    return "N/A";
  }

  return (
    <div
      style={{
        border: "1px solid #ddd",
        padding: 12,
        borderRadius: 8,
        marginTop: 12,
      }}
    >
      <h4>⛽ Smart Fee Predictor</h4>

      <div style={{ fontSize: 13, marginBottom: 10, color: "#666" }}>
        Estimates fee before sending — gas, USD cost & ETA
      </div>

      <button
        onClick={fetchEstimate}
        disabled={loading}
        style={{
          padding: "6px 12px",
          marginBottom: 10,
          background: "#0070f3",
          color: "white",
          borderRadius: 6,
          border: "none",
          cursor: loading ? "default" : "pointer",
          opacity: loading ? 0.7 : 1,
        }}
      >
        {loading ? "Estimating..." : "Estimate Fee"}
      </button>

      {error && (
        <div style={{ color: "red", fontSize: 13, marginTop: 8 }}>{error}</div>
      )}

      {result && (
        <div
          style={{
            marginTop: 10,
            background: "#fafafa",
            padding: 12,
            borderRadius: 6,
          }}
        >
          <div>
            <b>Fee:</b>{" "}
            {result.feeEth != null
              ? `${Number(result.feeEth).toFixed(6)} ETH`
              : "N/A"}{" "}
            {result.feeUsd != null &&
              `(≈ $${Number(result.feeUsd).toFixed(2)})`}
          </div>

          <div>
            <b>Gas Price:</b> {renderGasPrice(result)}
          </div>

          <div>
            <b>Gas Units:</b>{" "}
            {result.estimateGas != null ? result.estimateGas : "N/A"}
          </div>

          <div>
            <b>ETA:</b> {result.etaSec != null ? `${result.etaSec}s` : "N/A"}
          </div>
        </div>
      )}
    </div>
  );
}
