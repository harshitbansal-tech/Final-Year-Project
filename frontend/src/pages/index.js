// frontend/src/pages/index.js
import { useEffect, useState } from "react";
import Link from "next/link";


import Layout from "../components/Layout";
import NetworkMood from "../components/NetworkMood";
import TxHealthScore from "../components/TxHealthScore";
import FXSpreadVisualizer from "../components/FXSpreadVisualizer";

import { initProvider } from "../utils/ethersProvider";
import { networkConfig } from "../constants/networkConfig";

const BACKEND = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:4000";

export default function HomePage() {
  const [selectedNetwork, setSelectedNetwork] = useState("sepolia");
  const [address, setAddress] = useState(null);

  const [netStatus, setNetStatus] = useState({});
  const [statusLoading, setStatusLoading] = useState(false);
  const [statusError, setStatusError] = useState("");

  const [bestChain, setBestChain] = useState(null);
  const [bestChainCost, setBestChainCost] = useState(null);

  // Load selected network from localStorage on mount
  useEffect(() => {
    if (typeof window === "undefined") return;
    const saved = window.localStorage.getItem("selectedNetwork");
    if (saved && networkConfig[saved]) {
      setSelectedNetwork(saved);
    }
  }, []);

  // Auto-detect currently connected account (if any)
  useEffect(() => {
    if (typeof window === "undefined" || !window.ethereum) return;

    (async () => {
      try {
        const accs = await window.ethereum.request({ method: "eth_accounts" });
        if (accs && accs.length > 0) {
          setAddress(accs[0]);
        }
      } catch (err) {
        console.warn("Account detection failed:", err);
      }
    })();

    const onAccountsChanged = (accs) => {
      setAddress(accs[0] || null);
    };
    window.ethereum.on?.("accountsChanged", onAccountsChanged);

    return () => {
      window.ethereum?.removeListener?.("accountsChanged", onAccountsChanged);
    };
  }, []);

  // Fetch network status periodically
  useEffect(() => {
    let timerId;
    async function loadStatus() {
      try {
        setStatusLoading(true);
        setStatusError("");
        const res = await fetch(`${BACKEND}/api/network/status`);
        const json = await res.json();
        if (!res.ok || json.error) {
          throw new Error(json.error || "Failed to load network status");
        }
        setNetStatus(json);
      } catch (err) {
        console.error("Network status error:", err);
        setStatusError(err.message || String(err));
      } finally {
        setStatusLoading(false);
      }
    }

    loadStatus();
    timerId = setInterval(loadStatus, 10000); // refresh every 10s

    return () => clearInterval(timerId);
  }, []);

  // Compute "cheapest" chain based on current gas
  useEffect(() => {
    if (!netStatus || Object.keys(netStatus).length === 0) {
      setBestChain(null);
      setBestChainCost(null);
      return;
    }

    let best = null;
    let bestScore = Infinity;

    for (const [chain, info] of Object.entries(netStatus)) {
      if (!info) continue;
      if (!info.gasPriceGwei && !info.gasGwei && !info.gasPriceWei) continue;

      // Prefer gasPriceGwei from /api/network/status, fall back to gasGwei, fall back to parsing from wei
      let gweiValue = null;
      if (
        typeof info.gasPriceGwei === "string" ||
        typeof info.gasPriceGwei === "number"
      ) {
        gweiValue = Number(info.gasPriceGwei);
      } else if (typeof info.gasGwei === "number") {
        gweiValue = info.gasGwei;
      } else if (info.gasPriceWei) {
        try {
          gweiValue = Number(info.gasPriceWei) / 1e9;
        } catch {
          gweiValue = null;
        }
      }

      if (!gweiValue || !isFinite(gweiValue) || gweiValue <= 0) continue;

      // simple heuristic: network fee ≈ 21000 * gasPrice
      const estFeeEth = (21000 * gweiValue) / 1e9;

      // prefer healthy/delayed chains
      const penalty =
        info.status === "healthy" ? 1 : info.status === "delayed" ? 1.2 : 2;

      const score = estFeeEth * penalty;

      if (score < bestScore) {
        bestScore = score;
        best = { chain, estFeeEth };
      }
    }

    if (best) {
      setBestChain(best.chain);
      setBestChainCost(best.estFeeEth);
    } else {
      setBestChain(null);
      setBestChainCost(null);
    }
  }, [netStatus]);

  async function handleConnect() {
    try {
      const { address } = await initProvider(selectedNetwork);
      setAddress(address);
    } catch (err) {
      alert("Wallet connection failed: " + (err.message || String(err)));
    }
  }

  function handleSelectNetwork(e) {
    const key = e.target.value;
    if (!networkConfig[key]) return;
    setSelectedNetwork(key);
    if (typeof window !== "undefined") {
      window.localStorage.setItem("selectedNetwork", key);
    }
  }

  async function handlePickCheapest() {
    if (!bestChain) {
      alert("No cheapest chain available yet. Check network status.");
      return;
    }
    try {
      setSelectedNetwork(bestChain);
      if (typeof window !== "undefined") {
        window.localStorage.setItem("selectedNetwork", bestChain);
      }
      await initProvider(bestChain);
      alert(
        `Switched to ${networkConfig[bestChain].name} as the cheapest option.`
      );
    } catch (err) {
      alert(
        "Could not switch to cheapest chain: " + (err.message || String(err))
      );
    }
  }

  const short = (addr = "") =>
    addr ? addr.slice(0, 6) + "..." + addr.slice(-4) : "";

  return (
    <Layout>
      {/* Hero / top strip */}
      <section
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: 16,
          alignItems: "center",
          marginBottom: 24,
        }}
      >
        <div>
          <h1 style={{ margin: "0 0 4px" }}>Overview</h1>
          <p className="text-muted" style={{ margin: 0 }}>
            Live snapshot of your multi-L2 micropayments environment — network
            health, cheapest chain and quick entry points.
          </p>
        </div>

        <div
          className="card-soft"
          style={{ minWidth: 260, padding: 10, marginRight: 0 }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              marginBottom: 4,
            }}
          >
            <span className="text-xs">Active Network</span>
            <span className="badge badge-soft">
              {networkConfig[selectedNetwork]?.name || selectedNetwork}
            </span>
          </div>

          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <select
              value={selectedNetwork}
              onChange={handleSelectNetwork}
              className="input"
              style={{ fontSize: 12 }}
            >
              {Object.entries(networkConfig).map(([key, cfg]) => (
                <option key={key} value={key}>
                  {cfg.name}
                </option>
              ))}
            </select>
          </div>

          <div style={{ marginTop: 8 }}>
            {address ? (
              <>
                <div
                  style={{
                    fontSize: 12,
                    fontFamily: "monospace",
                    marginBottom: 2,
                  }}
                >
                  {short(address)}
                </div>
                <div className="text-xs">Coinbase Wallet connected</div>
              </>
            ) : (
              <button
                className="btn-primary"
                style={{ marginTop: 4, width: "100%" }}
                onClick={handleConnect}
              >
                Connect Coinbase Wallet
              </button>
            )}
          </div>
        </div>
      </section>

      {/* Smart router + quick links */}
      <section
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(0, 1.4fr) minmax(0, 1fr)",
          gap: 18,
          marginBottom: 22,
        }}
      >
        {/* Smart Cheapest Chain Selector */}
        <div className="card">
          <div className="card-header">
            <div>
              <div className="card-title">Smart Cheapest Chain</div>
              <div className="card-subtitle">
                We estimate gas for a simple transfer on every network and
                combine it with health status to recommend the best chain at
                this moment.
              </div>
            </div>
            <span className="badge badge-accent">Router Preview</span>
          </div>

          <div style={{ fontSize: 13, marginBottom: 8 }}>
            {statusLoading && <span>Checking network fees…</span>}
            {statusError && (
              <span style={{ color: "#fca5a5" }}>Error: {statusError}</span>
            )}
            {!statusLoading && !statusError && bestChain && (
              <span>
                Best right now:&nbsp;
                <b>{networkConfig[bestChain]?.name || bestChain}</b>
                {bestChainCost != null && (
                  <>
                    {" "}
                    · ~{bestChainCost.toFixed(6)} ETH gas for a basic transfer
                  </>
                )}
              </span>
            )}
            {!statusLoading && !statusError && !bestChain && (
              <span>No gas data yet. Is the backend running?</span>
            )}
          </div>

          <div
            style={{
              display: "flex",
              gap: 10,
              alignItems: "center",
              marginTop: 4,
            }}
          >
            <button
              onClick={handlePickCheapest}
              className="btn-primary"
              style={{ fontSize: 13 }}
            >
              🔍 Pick Cheapest Chain & Connect
            </button>
            <div className="text-xs">
              This will switch your wallet to the chain we consider the lowest
              cost & healthiest.
            </div>
          </div>
        </div>

        {/* Quick navigation */}
        <div className="card-soft">
          <div className="card-header" style={{ marginBottom: 6 }}>
            <div>
              <div className="card-title">Quick Navigation</div>
              <div className="card-subtitle">
                Jump directly into a specific workflow: sending, monitoring,
                analytics or AI assistance.
              </div>
            </div>
          </div>

          <ul
            style={{
              listStyle: "none",
              padding: 0,
              margin: 0,
              fontSize: 13,
              display: "flex",
              flexDirection: "column",
              gap: 6,
            }}
          >
            <li>
              <Link href="/payments">
                <span className="badge badge-soft">💸</span>{" "}
                <span style={{ marginLeft: 6 }}>Send Micropayment</span>
              </Link>
            </li>
            <li>
              <Link href="/networks">
                <span className="badge badge-soft">🌐</span>{" "}
                <span style={{ marginLeft: 6 }}>Network Health & Gas</span>
              </Link>
            </li>
            <li>
              <Link href="/analytics">
                <span className="badge badge-soft">📊</span>{" "}
                <span style={{ marginLeft: 6 }}>Analytics & Metrics</span>
              </Link>
            </li>
            <li>
              <Link href="/ai">
                <span className="badge badge-soft">🤖</span>{" "}
                <span style={{ marginLeft: 6 }}>AI Transaction Explainer</span>
              </Link>
            </li>
            <li>
              <Link href="/stress-test">
                <span className="badge badge-soft">🔥</span>{" "}
                <span style={{ marginLeft: 6 }}>Stress Test Simulator</span>
              </Link>
            </li>
          </ul>
        </div>
      </section>

      {/* Network overview + FX panel */}
      <section
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(0, 1.5fr) minmax(0, 1fr)",
          gap: 18,
        }}
      >
        {/* Network overview */}
        <div className="card-soft">
          <div className="card-header" style={{ marginBottom: 4 }}>
            <div>
              <div className="card-title">Network Overview</div>
              <div className="card-subtitle">
                Live status, gas and health score for each configured testnet.
              </div>
            </div>
          </div>

          {statusLoading && (
            <div className="text-xs">Loading network status…</div>
          )}
          {statusError && (
            <div
              style={{ fontSize: 12, color: "#fca5a5", whiteSpace: "pre-wrap" }}
            >
              {statusError}
            </div>
          )}

          {!statusLoading && !statusError && (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {Object.entries(networkConfig).map(([key, cfg]) => {
                const info = netStatus[key] || {};
                const gasGwei =
                  info.gasPriceGwei != null
                    ? Number(info.gasPriceGwei)
                    : info.gasGwei != null
                    ? Number(info.gasGwei)
                    : null;

                return (
                  <div
                    key={key}
                    className="card-soft"
                    style={{
                      borderRadius: 10,
                      padding: 10,
                      border: "1px solid rgba(31,41,55,0.7)",
                      boxShadow: "none",
                      background:
                        "radial-gradient(circle at top left, rgba(37,99,235,0.08), transparent 55%), rgba(15,23,42,0.96)",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        gap: 10,
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: 600, fontSize: 13 }}>
                          {cfg.name}
                        </div>
                        <div
                          style={{
                            fontSize: 11,
                            color: "var(--text-soft)",
                            marginTop: 2,
                          }}
                        >
                          Block: {info.blockNumber ?? "—"} · Age:{" "}
                          {info.ageSec != null ? `${info.ageSec}s` : "—"} · Gas:{" "}
                          {gasGwei != null ? `${gasGwei.toFixed(3)} gwei` : "—"}
                        </div>
                      </div>
                      <div style={{ textAlign: "right" }}>
                        <NetworkMood mood={info.mood || info.status || "unknown"} />
                        <div style={{ marginTop: 4 }}>
                          <TxHealthScore
                            gasGwei={gasGwei || 0}
                            blockAgeSec={info.ageSec || 0}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* FX impact / spread */}
        <div className="card-soft">
          <FXSpreadVisualizer />
        </div>
      </section>
    </Layout>
  );
}
