// frontend/src/components/CrossChainTransfer.js
import React, { useEffect, useState } from "react";
import { initSocket } from "../utils/socket";
import { initProvider, getSigner } from "../utils/ethersProvider";
import { networkConfig } from "../constants/networkConfig";
import { ethers } from "ethers";

/**
 * CrossChainTransfer
 *
 * Props: none required. The component handles:
 *  - selecting fromChain and toChain
 *  - requesting a quote from backend (/api/crosschain/quote)
 *  - showing route, fees, ETA, FX
 *  - submitting a simulated settlement (/api/crosschain/settle)
 *  - listening for txStatus events for the returned txHash
 */
export default function CrossChainTransfer() {
  const [fromChain, setFromChain] = useState("optimism");
  const [toChain, setToChain] = useState("zksync");
  const [amount, setAmount] = useState("0.001");
  const [quote, setQuote] = useState(null);
  const [loadingQuote, setLoadingQuote] = useState(false);
  const [settleResult, setSettleResult] = useState(null);
  const [socketMsgs, setSocketMsgs] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const s = initSocket();
    s.on("txStatus", (data) => {
      setSocketMsgs((prev) => [data, ...prev].slice(0, 50));
    });
    s.on("crosschain:arrived", (obj) => {
      // optional: show toast / update UI when arrival happens
      console.log("crosschain arrived:", obj);
    });
    return () => {
      s.off("txStatus");
      s.off("crosschain:arrived");
    };
  }, []);

  async function fetchQuote() {
    try {
      setLoadingQuote(true);
      setQuote(null);
      const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/crosschain/quote`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ amountEth: amount, fromChain, toChain, toCurrency: "usd" })
      });
      const json = await res.json();
      if (!json.ok) {
        alert("Quote failed: " + (json.error || "unknown"));
        setLoadingQuote(false);
        return;
      }
      setQuote(json.quote);
    } catch (e) {
      console.error("fetchQuote err", e);
      alert("Quote error: " + e.message);
    } finally {
      setLoadingQuote(false);
    }
  }

  async function submitSettlement() {
    try {
      setIsSubmitting(true);
      // amountWei
      const amountWei = ethers.parseEther(String(amount)).toString();

      const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/crosschain/settle`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ amountWei, fromChain, toChain, toAddress: "demo-recipient-addr", quote })
      });
      const json = await res.json();
      if (!json.ok) {
        alert("Settle failed: " + (json.error || "unknown"));
        setIsSubmitting(false);
        return;
      }
      setSettleResult(json);
      // notify user what txHash will be (simulated)
      alert(`Enqueued cross-chain tx: ${json.txHash} — ETA ${json.estimatedLatencySec}s`);
    } catch (e) {
      console.error("submitSettlement err", e);
      alert("Settle error: " + e.message);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div style={{ border: "1px solid #eee", padding: 14 }}>
      <h4>Cross-Chain Micropayment (Simulated)</h4>

      <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
        <div>
          <label>From</label><br />
          <select value={fromChain} onChange={(e) => setFromChain(e.target.value)}>
            {Object.keys(networkConfig).map((k) =>
              <option key={k} value={k}>{networkConfig[k].name}</option>
            )}
          </select>
        </div>

        <div>
          <label>To</label><br />
          <select value={toChain} onChange={(e) => setToChain(e.target.value)}>
            {Object.keys(networkConfig).map((k) =>
              <option key={k} value={k}>{networkConfig[k].name}</option>
            )}
          </select>
        </div>

        <div>
          <label>Amount (ETH)</label><br />
          <input value={amount} onChange={(e) => setAmount(e.target.value)} style={{ width: 110 }} />
        </div>
      </div>

      <div style={{ display: "flex", gap: 8 }}>
        <button onClick={fetchQuote} disabled={loadingQuote}>Get Quote</button>
        <button onClick={submitSettlement} disabled={!quote || isSubmitting}>
          {isSubmitting ? "Submitting..." : "Send Cross-Chain (Simulated)"}
        </button>
      </div>

      {quote && (
        <div style={{ marginTop: 12, background: "#fafafa", padding: 8 }}>
          <div><b>Route:</b> {quote.route.join(" → ")}</div>
          <div><b>Bridge Fee:</b> {quote.bridgeFeeEth} ETH</div>
          <div><b>Local Send Cost:</b> {quote.sendCostEth} ETH</div>
          <div><b>Estimated Latency:</b> {quote.estimatedLatencySec}s</div>
          <div><b>Total Fee:</b> {quote.totalFeeEth} ETH</div>
          <div><b>FX Rate (USD / ETH):</b> ${quote.fxRateUsdPerEth}</div>
          <div><b>Total Cost (amount + fees):</b> ~${quote.totalCostUsd}</div>
          <div style={{ marginTop: 8 }}>
            <b>Breakdown</b>
            <ul>
              {quote.breakdown.map((b, i) => (
                <li key={i}>{b.from} → {b.to}: fee {b.hopFeeEth} ETH, latency {b.hopLatencySec}s</li>
              ))}
            </ul>
          </div>
        </div>
      )}

      <div style={{ marginTop: 12 }}>
        <h5>Live Events</h5>
        <div style={{ maxHeight: 160, overflow: "auto", border: "1px solid #f2f2f2", padding: 8 }}>
          {socketMsgs.map((m) => (
            <div key={m.txHash} style={{ padding: 6, borderBottom: "1px solid #eee" }}>
              <div><b>{m.chain}</b> — {m.txHash}</div>
              <div style={{ fontSize: 12 }}>status: {m.status} — latency: {m.latencyMs || "N/A"} ms</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
