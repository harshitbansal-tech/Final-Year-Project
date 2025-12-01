// frontend/src/components/FXSpreadVisualizer.js
import { useState, useEffect } from "react";
import {
  LineChart,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  Line,
  CartesianGrid,
  ResponsiveContainer,
} from "recharts";

const API_BASE = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:4000";

export default function FXSpreadVisualizer() {
  const [data, setData] = useState([]);
  const [error, setError] = useState("");

  async function fetchSpread() {
    try {
      setError("");

      // ✅ Use the /spread endpoint that returns USD/EUR/INR together
      const res = await fetch(`${API_BASE}/api/fx/spread?amountEth=1`);
      const json = await res.json();

      if (!res.ok || json.error) {
        throw new Error(json.error || "Failed to load FX data");
      }

      const currencies = json.currencies || [];
      const entry = {
        timestamp: new Date().toLocaleTimeString(),
        USD: currencies.find((c) => c.currency === "USD")?.value ?? null,
        EUR: currencies.find((c) => c.currency === "EUR")?.value ?? null,
        INR: currencies.find((c) => c.currency === "INR")?.value ?? null,
      };

      // ignore if everything is null
      if (entry.USD == null && entry.EUR == null && entry.INR == null) {
        return;
      }

      // ✅ correct spread syntax, keep last 30 points
      setData((prev) => [...prev.slice(-30), entry]);
    } catch (e) {
      console.error("FX spread error:", e);
      setError(e.message || "Failed to load FX spread");
    }
  }

  useEffect(() => {
    fetchSpread();
    const id = setInterval(fetchSpread, 10000); // every 10s
    return () => clearInterval(id);
  }, []);

  return (
    <div className="card-soft" style={{ borderRadius: "var(--radius-md)" }}>
      <div className="card-header">
        <div>
          <div className="card-title">💱 FX Spread Visualizer</div>
          <div className="card-subtitle">
            Live ETH → USD/EUR/INR snapshot, refreshed every 10 seconds.
          </div>
        </div>
      </div>

      {error && (
        <div className="text-xs" style={{ color: "var(--danger)" }}>
          {error}
        </div>
      )}

      <div style={{ width: "100%", height: 240 }}>
        {data.length === 0 ? (
          <div className="text-xs">Waiting for FX data…</div>
        ) : (
          <ResponsiveContainer>
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="timestamp" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="USD" name="USD" dot={false} />
              <Line type="monotone" dataKey="EUR" name="EUR" dot={false} />
              <Line type="monotone" dataKey="INR" name="INR" dot={false} />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
