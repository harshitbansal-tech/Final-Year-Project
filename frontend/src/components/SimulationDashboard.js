// frontend/src/components/SimulationDashboard.js
import { useState } from "react";

const API_BASE = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:4000";

export default function SimulationDashboard() {
  const [count, setCount] = useState(200);
  const [running, setRunning] = useState(false);
  const [message, setMessage] = useState("");

  async function startSimulation() {
    try {
      setRunning(true);
      setMessage("");

      const res = await fetch(`${API_BASE}/api/simulate/run`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ count }),
      });

      const json = await res.json();
      if (!res.ok || json.error) {
        throw new Error(json.error || "Failed to start simulation");
      }

      setMessage(
        `Started simulation of ${json.count || count} virtual micropayments. Check the live feed & analytics.`
      );
    } catch (e) {
      setMessage(e.message || "Failed to start simulation");
    } finally {
      setRunning(false);
    }
  }

  return (
    <div>
      <div style={{ marginBottom: 10 }}>
        <label className="label">Number of virtual micropayments</label>
        <input
          type="number"
          min={1}
          max={2000}
          className="input"
          value={count}
          onChange={(e) => setCount(Number(e.target.value) || 0)}
          style={{ maxWidth: 160 }}
        />
        <div className="text-xs">
          These are simulated – no real funds are moved, but analytics + live feed update.
        </div>
      </div>

      <button
        className="btn-primary"
        onClick={startSimulation}
        disabled={running || count <= 0}
      >
        {running ? "Starting…" : "Start Stress Test"}
      </button>

      {message && (
        <div
          style={{
            marginTop: 8,
            fontSize: 12,
            color: message.startsWith("Failed") ? "var(--danger)" : "var(--text-soft)",
          }}
        >
          {message}
        </div>
      )}
    </div>
  );
}
