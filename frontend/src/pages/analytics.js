// frontend/src/pages/analytics.js
import React from "react";
import Layout from "../components/Layout";
import AdminTable from "../components/AdminTable";
import AdminCharts from "../components/AdminCharts";


export default function AnalyticsPage() {
  const apiBase = process.env.NEXT_PUBLIC_BACKEND_URL || "";

  async function handleClearMetrics() {
    if (
      !confirm(
        "Clear all metrics from the backend? This will remove all stored analytics and cannot be undone."
      )
    ) {
      return;
    }
    await fetch(`${apiBase}/api/metrics/clear`, {
      method: "POST",
    });
    alert("Metrics cleared. Refresh the page to reload data.");
  }

  return (
    <Layout>
      {/* Header */}
      <section
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 16,
          marginBottom: 16,
        }}
      >
        <div>
          <h1 style={{ margin: "0 0 4px" }}>Analytics Dashboard</h1>
          <p className="text-muted" style={{ margin: 0 }}>
            Aggregated metrics for your micropayments: latency, gas cost and network
            distribution across L2 testnets.
          </p>
        </div>
      </section>

      {/* Main content */}
      <main
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(0, 1.45fr) minmax(0, 1fr)",
          gap: 18,
        }}
      >
        {/* Left: recent tx table */}
        <section className="card-soft" style={{ minHeight: 220 }}>
          <div className="card-header">
            <div>
              <div className="card-title">Recent Transactions</div>
              <div className="card-subtitle">
                Last recorded micropayments including chain, timestamp, latency and
                effective cost.
              </div>
            </div>
          </div>
          <AdminTable apiBase={apiBase} />
        </section>

        {/* Right: charts + maintenance */}
        <aside style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div className="card-soft" style={{ minHeight: 180 }}>
            <div className="card-header">
              <div>
                <div className="card-title">Metrics Overview</div>
                <div className="card-subtitle">
                  High-level view of average latency and gas cost per chain over time.
                </div>
              </div>
            </div>
            <AdminCharts apiBase={apiBase} />
          </div>

          <div className="card-soft" style={{ fontSize: 13 }}>
            <div className="card-header" style={{ marginBottom: 4 }}>
              <div>
                <div className="card-title" style={{ fontSize: 14 }}>
                  Maintenance
                </div>
                <div className="card-subtitle">
                  Use this when you want to reset analytics and re-run experiments or
                  demos from a clean slate.
                </div>
              </div>
            </div>
            <button
              onClick={handleClearMetrics}
              className="btn-ghost"
              style={{
                borderColor: "rgba(248, 113, 113, 0.85)",
                color: "#fecaca",
                background: "rgba(127, 29, 29, 0.38)",
              }}
            >
              🧹 Clear All Metrics
            </button>
          </div>
        </aside>
      </main>
    </Layout>
  );
}
