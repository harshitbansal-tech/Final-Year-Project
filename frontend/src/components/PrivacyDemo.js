// frontend/src/components/PrivacyDemo.js
import React, { useEffect, useState } from "react";
import { ethers } from "ethers";

export default function PrivacyDemo({ defaultChain = "sepolia" }) {
  const [secret, setSecret] = useState("");
  const [hash, setHash] = useState("");
  const [amount, setAmount] = useState("0.001");
  const [deposits, setDeposits] = useState([]);
  const [recipient, setRecipient] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    refreshList();
  }, []);

  function genSecret() {
    const s = ethers.hexlify(ethers.randomBytes(16));
    setSecret(s);
    const h = ethers.keccak256(ethers.toUtf8Bytes(s));
    setHash(h);
  }

  function computeHashFromSecret(s) {
    try {
      const h = ethers.keccak256(ethers.toUtf8Bytes(s));
      setHash(h);
    } catch (e) {
      setHash("");
    }
  }

  async function deposit() {
    if (!secret) return alert("Provide or generate a secret first");
    setLoading(true);
    try {
      const amountWei = ethers.parseEther(amount).toString();
      const body = { secret, amountWei, from: null, chain: defaultChain };
      const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/privacy/deposit`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!json.ok) {
        alert("Deposit failed: " + (json.error || JSON.stringify(json)));
      } else {
        alert("Deposit recorded: " + (json.result.txHash || json.result.entry?.id || "ok"));
        refreshList();
      }
    } catch (e) {
      console.error("deposit err", e);
      alert("Deposit error: " + e.message);
    } finally {
      setLoading(false);
    }
  }

  async function claim() {
    if (!secret) return alert("Need secret to claim");
    if (!recipient) return alert("Provide recipient address");
    setLoading(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/privacy/claim`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ secret, to: recipient }),
      });
      const json = await res.json();
      if (!json.ok) {
        alert("Claim failed: " + (json.error || JSON.stringify(json)));
      } else {
        alert("Claim success: " + (json.result.txHash || json.result.entry?.id || "ok"));
        refreshList();
      }
    } catch (e) {
      console.error("claim err", e);
      alert("Claim error: " + e.message);
    } finally {
      setLoading(false);
    }
  }

  async function refreshList() {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/privacy/list`);
      const json = await res.json();
      if (json.deposits) setDeposits(json.deposits);
      else setDeposits([]);
    } catch (e) {
      console.error("refreshList error", e);
      setDeposits([]);
    }
  }

  return (
    <div style={{ border: "1px solid #eee", padding: 12, borderRadius: 8, marginTop: 12 }}>
      <h4>🔒 Privacy (AOM-lite) Demo</h4>

      <div style={{ marginBottom: 8 }}>
        <button onClick={genSecret}>Generate Secret</button>
        <span style={{ marginLeft: 8, fontFamily: "monospace" }}>{secret || "<none>"}</span>
      </div>

      <div style={{ marginBottom: 8 }}>
        <label>Or enter secret:</label><br />
        <input style={{ width: "100%" }} value={secret} onChange={(e) => { setSecret(e.target.value); computeHashFromSecret(e.target.value); }} />
      </div>

      <div style={{ marginBottom: 8 }}>
        <label>Hash:</label><br />
        <input style={{ width: "100%" }} value={hash} readOnly />
      </div>

      <div style={{ marginBottom: 8 }}>
        <label>Amount (ETH):</label><br />
        <input value={amount} onChange={(e) => setAmount(e.target.value)} />
      </div>

      <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
        <button onClick={deposit} disabled={loading}>Deposit</button>
        <button onClick={refreshList} disabled={loading}>Refresh List</button>
      </div>

      <hr />

      <div style={{ marginBottom: 8 }}>
        <label>Recipient address for claim:</label><br />
        <input style={{ width: "100%" }} value={recipient} onChange={(e) => setRecipient(e.target.value)} placeholder="0xReceiver..." />
      </div>

      <div style={{ display: "flex", gap: 8 }}>
        <button onClick={claim} disabled={loading}>Claim with Secret</button>
      </div>

      <hr />

      <div>
        <h5>Deposits (fallback store)</h5>
        {deposits.length === 0 && <div>No deposits yet</div>}
        <div style={{ maxHeight: 220, overflow: "auto" }}>
          {deposits.map((d) => (
            <div key={d.id || d.hash} style={{ padding: 8, borderBottom: "1px solid #f2f2f2" }}>
              <div style={{ fontSize: 12 }}>
                <b>{d.id || d.hash}</b> — {d.claimed ? "CLAIMED" : "UNCLAIMED"}
              </div>
              <div style={{ fontSize: 12 }}>
                hash: <span style={{ fontFamily: "monospace" }}>{d.hash}</span>
              </div>
              <div style={{ fontSize: 12 }}>
                amount: {d.amountWei ? (Number(d.amountWei) / 1e18).toFixed(6) + " ETH" : "?"}
              </div>
              <div style={{ fontSize: 12 }}>
                from: {d.from || "-"} | ts: {d.ts ? new Date(d.ts).toLocaleString() : "-"}
              </div>
              {d.claimed && <div style={{ fontSize: 12 }}>claimed to: {d.claimTo} at {d.claimTs ? new Date(d.claimTs).toLocaleString() : "-"}</div>}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
