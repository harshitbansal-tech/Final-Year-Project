// frontend/src/components/AdminCharts.js
import React, { useEffect, useState } from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  LineChart,
  Line,
  CartesianGrid,
  Legend,
} from "recharts";

export default function AdminCharts({ apiBase }) {
  const [summary, setSummary] = useState([]);
  const [throughput, setThroughput] = useState([]);

  useEffect(() => {
    if (!apiBase) return;
    loadSummary();
    loadThroughput();
    const id = setInterval(() => {
      loadSummary();
      loadThroughput();
    }, 10_000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apiBase]);

  async function loadSummary() {
    try {
      const res = await fetch(`${apiBase}/api/metrics/summary`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      const rows = Array.isArray(json) ? json : json.data || [];

      const mapped = rows.map((r) => ({
        chain: r.chain,
        avgLatency: Number(r.avgLatency || 0),
        avgCostEth: Number(r.avgCostWei || 0) / 1e18,
      }));

      setSummary(mapped);
    } catch (e) {
      console.error("loadSummary error", e);
      setSummary([]);
    }
  }

  async function loadThroughput() {
    try {
      const res = await fetch(`${apiBase}/api/metrics/all`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      const rows = Array.isArray(json) ? json : json.data || [];

      const buckets = {};
      rows.forEach((r) => {
        const t = r.settledTs || r.sendTs || Date.now();
        const minute = new Date(t).toISOString().slice(0, 16); // YYYY-MM-DDTHH:MM
        buckets[minute] = (buckets[minute] || 0) + 1;
      });

      const series = Object.entries(buckets)
        .map(([time, count]) => ({ time, count }))
        .sort((a, b) => a.time.localeCompare(b.time));

      setThroughput(series);
    } catch (e) {
      console.error("loadThroughput error", e);
      setThroughput([]);
    }
  }

  if (!apiBase) {
    return (
      <div className="card-soft">
        <div className="card-title">Latency & Throughput</div>
        <div className="text-xs text-muted">
          Set <code>NEXT_PUBLIC_BACKEND_URL</code> to use analytics.
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div className="card-soft" style={{ height: 220 }}>
        <div className="card-title" style={{ marginBottom: 6 }}>
          Latency & Fee by Chain
        </div>
        <ResponsiveContainer>
          <BarChart data={summary}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="chain" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Bar dataKey="avgLatency" name="Avg Latency (ms)" />
            <Bar dataKey="avgCostEth" name="Avg Fee (ETH)" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="card-soft" style={{ height: 180 }}>
        <div className="card-title" style={{ marginBottom: 6 }}>
          Throughput Over Time
        </div>
        <ResponsiveContainer>
          <LineChart data={throughput}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="time" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Line
              type="monotone"
              dataKey="count"
              name="Tx / minute"
              dot={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
