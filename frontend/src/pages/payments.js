// frontend/src/pages/payments.js
import { useState } from "react";
import { ethers } from "ethers";
import Layout from "../components/Layout";
import { initProvider } from "../utils/ethersProvider";
import { networkConfig } from "../constants/networkConfig";


export default function PaymentsPage() {
  const [chainKey, setChainKey] = useState("sepolia");
  const [to, setTo] = useState("");
  const [amount, setAmount] = useState("0.0001");
  const [status, setStatus] = useState("");
  const [txHash, setTxHash] = useState("");

  async function handleSend() {
    try {
      setStatus("⏳ Connecting wallet…");
      setTxHash("");

      if (!to || !ethers.isAddress(to)) {
        setStatus("❌ Enter a valid recipient address (0x…).");
        return;
      }

      const amtNum = Number(amount);
      if (!amtNum || amtNum <= 0) {
        setStatus("❌ Enter a valid amount greater than 0.");
        return;
      }

      const { signer } = await initProvider(chainKey);

      const cfg = networkConfig[chainKey];
      if (!cfg || !cfg.contractAddress) {
        setStatus("❌ Contract address not configured for this network.");
        return;
      }

      const contract = new ethers.Contract(
        cfg.contractAddress,
        ["function payNative(address to) external payable"],
        signer
      );

      setStatus("🚀 Sending transaction…");
      const tx = await contract.payNative(to, {
        value: ethers.parseEther(String(amount)),
      });

      setTxHash(tx.hash);
      setStatus("⏳ Waiting for confirmation…");

      await tx.wait();

      setStatus("✅ Transaction confirmed!");
    } catch (err) {
      console.error(err);
      setStatus(`❌ ${err.message || "Failed to send transaction."}`);
    }
  }

  const explorerBase =
    chainKey === "sepolia"
      ? "https://sepolia.etherscan.io/tx/"
      : chainKey === "optimism"
      ? "https://sepolia-optimism.etherscan.io/tx/"
      : chainKey === "polygonAmoy"
      ? "https://www.oklink.com/amoy/tx/"
      : "";

  const isError = status.startsWith("❌");

  return (
    <Layout>
      {/* Header */}
      <section style={{ marginBottom: 18 }}>
        <h1 style={{ margin: "0 0 4px" }}>Send Micropayment</h1>
        <p className="text-muted" style={{ margin: 0 }}>
          Send a small native payment via the <code>PaymentProcessor</code> contract
          on your selected L2 testnet.
        </p>
      </section>

      {/* Main card */}
      <section
        className="card"
        style={{
          maxWidth: 560,
        }}
      >
        <div className="card-header">
          <div>
            <div className="card-title">Payment Parameters</div>
            <div className="card-subtitle">
              Choose a network, recipient and amount. This will execute{" "}
              <code>payNative(to)</code> on the configured contract.
            </div>
          </div>
          <span className="badge badge-accent">Live Demo</span>
        </div>

        {/* Fields */}
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {/* Network */}
          <div className="field">
            <label className="label">Network</label>
            <select
              value={chainKey}
              onChange={(e) => setChainKey(e.target.value)}
              className="input"
              style={{ maxWidth: 260 }}
            >
              <option value="sepolia">Ethereum Sepolia</option>
              <option value="optimism">Optimism Sepolia</option>
              <option value="zksync">zkSync Era Sepolia</option>
              <option value="polygonAmoy">Polygon Amoy</option>
            </select>
            <div className="text-xs">
              Make sure your Coinbase Wallet is on the same network before sending.
            </div>
          </div>

          {/* Recipient */}
          <div className="field">
            <label className="label">Recipient Address</label>
            <input
              type="text"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              placeholder="0x…"
              className="input"
              style={{ fontFamily: "monospace", borderRadius: "var(--radius-md)" }}
            />
            <div className="text-xs">
              Any valid EVM address on the selected testnet. Use your own second wallet
              or a friend’s address.
            </div>
          </div>

          {/* Amount */}
          <div className="field">
            <label className="label">
              Amount ({chainKey === "polygonAmoy" ? "MATIC" : "ETH"})
            </label>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              step="0.0001"
              min="0"
              className="input"
            />
            <div className="text-xs">
              For a safety margin, keep it small: e.g. <b>0.0001</b>.
            </div>
          </div>
        </div>

        {/* Action + status */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 8,
            marginTop: 16,
          }}
        >
          <button onClick={handleSend} className="btn-primary">
            Send Payment
          </button>

          {status && (
            <div
              style={{
                fontSize: 13,
                marginTop: 4,
                color: isError ? "var(--danger)" : "var(--text-soft)",
                whiteSpace: "pre-wrap",
              }}
            >
              {status}
            </div>
          )}

          {txHash && (
            <div
              style={{
                marginTop: 4,
                paddingTop: 6,
                borderTop: "1px solid rgba(31,41,55,0.7)",
                fontSize: 12,
              }}
            >
              <div style={{ marginBottom: 2 }}>
                <span className="badge badge-soft" style={{ marginRight: 6 }}>
                  Tx Hash
                </span>
                <span style={{ fontFamily: "monospace" }}>{txHash}</span>
              </div>
              {explorerBase && (
                <a
                  href={`${explorerBase}${txHash}`}
                  target="_blank"
                  rel="noreferrer"
                  style={{
                    fontSize: 12,
                    color: "#93c5fd",
                    textDecoration: "none",
                  }}
                >
                  View on explorer ↗
                </a>
              )}
            </div>
          )}
        </div>
      </section>
    </Layout>
  );
}
