// frontend/components/NetworkStatusWidget.js
import { useEffect, useState } from "react";
import NetworkMood from "./NetworkMood";

export default function NetworkStatusWidget() {
  const [status, setStatus] = useState(null);
  const [error, setError] = useState(null);

  async function load() {
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/network/status`
      );
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }
      const json = await res.json();
      setStatus(json);
      setError(null);
    } catch (err) {
      console.error("Failed to load network status:", err);
      setError(err.message || "Failed to load network status");
    }
  }

  useEffect(() => {
    load();
    const id = setInterval(load, 5000); // refresh every 5s
    return () => clearInterval(id);
  }, []);

  if (error && !status) {
    return (
      <div style={{ border: "1px solid #eee", padding: 12, marginTop: 12 }}>
        <h4>Live Network Status</h4>
        <div style={{ color: "red" }}>Error: {error}</div>
      </div>
    );
  }

  if (!status) {
    return (
      <div style={{ border: "1px solid #eee", padding: 12, marginTop: 12 }}>
        <h4>Live Network Status</h4>
        <div>Loading network status...</div>
      </div>
    );
  }

  return (
    <div style={{ border: "1px solid #eee", padding: 12, marginTop: 12 }}>
      <h4>Live Network Status</h4>

      {Object.entries(status).map(([chainKey, data]) => {
        if (!data) return null;

        const ageSec =
          typeof data.ageSec === "number"
            ? data.ageSec
            : data.timestamp
            ? Math.floor((Date.now() / 1000) - data.timestamp)
            : null;

        // Gas in gwei from new API (gasPriceGwei) or fallback
        let gasGwei = null;
        if (data.gasPriceGwei != null) {
          gasGwei = Number(data.gasPriceGwei);
        } else if (data.gasGwei != null) {
          gasGwei = Number(data.gasGwei);
        } else if (data.gasPriceWei) {
          try {
            gasGwei = Number(data.gasPriceWei) / 1e9;
          } catch {
            gasGwei = null;
          }
        }

        // Status badge based on data.status
        let badgeText = "Unknown";
        let badgeColor = "#9ca3af";

        if (data.status === "healthy") {
          badgeText = "Healthy";
          badgeColor = "#16a34a";
        } else if (data.status === "delayed") {
          badgeText = "Delayed";
          badgeColor = "#f59e0b";
        } else if (data.status === "stalled" || data.status === "unreachable") {
          badgeText = "Down";
          badgeColor = "#ef4444";
        }

        return (
          <div
            key={chainKey}
            style={{
              borderBottom: "1px solid #eee",
              padding: "8px 0",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                marginBottom: 4,
              }}
            >
              <b>{chainKey.toUpperCase()}</b>
              <span
                style={{
                  padding: "2px 6px",
                  borderRadius: 999,
                  fontSize: 11,
                  background: badgeColor,
                  color: "#fff",
                }}
              >
                {badgeText}
              </span>
              <div style={{ marginLeft: "auto", fontSize: 12 }}>
                <NetworkMood mood={data.mood || "unknown"} />
              </div>
            </div>

            <div style={{ fontSize: 12, lineHeight: 1.5 }}>
              Block: {data.blockNumber ?? "N/A"}
              <br />
              Gas Price:{" "}
              {gasGwei != null && isFinite(gasGwei)
                ? `${gasGwei.toFixed(2)} gwei`
                : "N/A"}
              <br />
              Age: {ageSec != null ? `${ageSec}s` : "N/A"}
            </div>

            {data.error && (
              <div style={{ color: "red", fontSize: 12, marginTop: 4 }}>
                Error: {data.error}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
