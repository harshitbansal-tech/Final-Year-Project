// frontend/src/pages/ai.js
import { useState } from "react";
import Layout from "../components/Layout";


export default function AIPage() {
  const [chain, setChain] = useState("sepolia");
  const [txHash, setTxHash] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");

  async function handleExplain() {
    try {
      setLoading(true);
      setError("");
      setResult(null);

      if (!txHash || !txHash.startsWith("0x") || txHash.length < 66) {
        setError("Please enter a valid transaction hash (0x… with 66+ characters).");
        setLoading(false);
        return;
      }

      const base = process.env.NEXT_PUBLIC_BACKEND_URL;
      const url =
        `${base}/api/ai/tx-explain` +
        `?chain=${encodeURIComponent(chain)}` +
        `&txHash=${encodeURIComponent(txHash)}`;

      const res = await fetch(url);
      const json = await res.json();

      if (!res.ok || json.error || json.ok === false) {
        throw new Error(json.error || "Failed to explain transaction");
      }

      setResult(json);
    } catch (e) {
      setError(e.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Layout>
      {/* Header */}
      <section style={{ marginBottom: 18 }}>
        <h1 style={{ margin: "0 0 4px" }}>AI Transaction Explainer</h1>
        <p className="text-muted" style={{ margin: 0 }}>
          Paste any supported testnet transaction hash and get a human-readable summary:
          who paid whom, how much, gas spent, and whether it succeeded or failed.
        </p>
      </section>

      <section
        className="card"
        style={{
          maxWidth: 780,
          display: "grid",
          gridTemplateColumns: "minmax(0, 1.4fr) minmax(0, 1fr)",
          gap: 18,
        }}
      >
        {/* Left: form */}
        <div>
          <div className="card-header" style={{ marginBottom: 8 }}>
            <div>
              <div className="card-title">Analyze a Transaction</div>
              <div className="card-subtitle">
                Works on Sepolia-based testnets. Use hashes from your own payments or any
                public transaction on the selected chain.
              </div>
            </div>
            <span className="badge badge-accent">AI Assistant</span>
          </div>

          <div className="field" style={{ marginBottom: 10 }}>
            <label className="label">Network</label>
            <select
              value={chain}
              onChange={(e) => setChain(e.target.value)}
              className="input"
              style={{ maxWidth: 260 }}
            >
              <option value="sepolia">Ethereum Sepolia</option>
              <option value="optimism">Optimism Sepolia</option>
              <option value="zksync">zkSync Era Sepolia</option>
              <option value="polygonAmoy">Polygon Amoy</option>
            </select>
          </div>

          <div className="field" style={{ marginBottom: 10 }}>
            <label className="label">Transaction Hash</label>
            <input
              type="text"
              value={txHash}
              onChange={(e) => setTxHash(e.target.value.trim())}
              placeholder="0x…"
              className="input"
              style={{
                fontFamily: "monospace",
                borderRadius: "var(--radius-md)",
              }}
            />
            <div className="text-xs">
              Copy-paste the full hash from the block explorer, including the leading{" "}
              <code>0x</code>.
            </div>
          </div>

          <button
            onClick={handleExplain}
            disabled={loading}
            className="btn-primary"
            style={{ marginTop: 6 }}
          >
            {loading ? "Analyzing…" : "Explain Transaction"}
          </button>

          {error && (
            <div
              style={{
                marginTop: 10,
                fontSize: 12,
                color: "var(--danger)",
                whiteSpace: "pre-wrap",
              }}
            >
              {error}
            </div>
          )}
        </div>

        {/* Right: explanation panel */}
        <div className="card-soft" style={{ borderRadius: "var(--radius-md)" }}>
          <div className="card-header" style={{ marginBottom: 4 }}>
            <div>
              <div className="card-title" style={{ fontSize: 14 }}>
                AI Summary
              </div>
              <div className="card-subtitle">
                Status, parties involved, on-chain value and a plain-language breakdown.
              </div>
            </div>
          </div>

          {!result && !error && (
            <div className="text-xs">
              No transaction analyzed yet. Paste a hash on the left and click{" "}
              <b>“Explain Transaction”</b>.
            </div>
          )}

          {result && result.summary && (
            <div style={{ fontSize: 13 }}>
              {/* Status row */}
              <div style={{ marginBottom: 8 }}>
                <span className="badge badge-soft" style={{ marginRight: 6 }}>
                  Status
                </span>
                <span
                  className={
                    result.summary.status === "success"
                      ? "badge badge-success"
                      : result.summary.status === "failed"
                      ? "badge badge-danger"
                      : "badge badge-soft"
                  }
                >
                  {result.summary.status}
                </span>
              </div>

              {/* Key fields */}
              <div className="kv-row">
                <span>From</span>
                <span style={{ fontFamily: "monospace" }}>
                  {result.summary.from}
                </span>
              </div>
              <div className="kv-row">
                <span>To</span>
                <span style={{ fontFamily: "monospace" }}>
                  {result.summary.to || "Contract creation / unknown"}
                </span>
              </div>
              <div className="kv-row">
                <span>Value</span>
                <span>{result.summary.valueEth} ETH</span>
              </div>
              <div className="kv-row">
                <span>Block</span>
                <span>
                  {result.summary.blockNumber != null
                    ? result.summary.blockNumber
                    : "pending"}
                </span>
              </div>

              {/* Explanation */}
              <div style={{ marginTop: 10 }}>
                <div style={{ fontSize: 12, marginBottom: 4 }}>Explanation</div>
                <p
                  style={{
                    margin: 0,
                    whiteSpace: "pre-wrap",
                    fontSize: 13,
                  }}
                >
                  {result.explanation}
                </p>
              </div>
            </div>
          )}
        </div>
      </section>
    </Layout>
  );
}
