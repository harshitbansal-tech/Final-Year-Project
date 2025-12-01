// frontend/src/pages/admin.js
import { useState } from "react";
import AdminTable from "../components/AdminTable";
import AdminCharts from "../components/AdminCharts";

export default function AdminPage() {
  const apiBase = process.env.NEXT_PUBLIC_BACKEND_URL || "";
  const [clearing, setClearing] = useState(false);
  const [message, setMessage] = useState(null);

  async function handleClear() {
    if (typeof window === "undefined") return;

    const ok = confirm("Clear ALL metrics? This cannot be undone.");
    if (!ok) return;

    try {
      setClearing(true);
      setMessage(null);

      const res = await fetch(`${apiBase}/api/metrics/clear`, {
        method: "POST"
      });

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }

      setMessage("✅ Metrics cleared — refresh the page to update.");
    } catch (err) {
      console.error("Clear metrics failed:", err);
      setMessage(`❌ Error: ${err.message}`);
    } finally {
      setClearing(false);
    }
  }

  return (
    <div style={{ padding: 20, fontFamily: "Inter, Arial, sans-serif" }}>
      <header
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 20
        }}
      >
        <h2 style={{ margin: 0 }}>Admin Dashboard</h2>

        <a href="/" style={{ marginRight: 12 }}>
          Back to Dashboard
        </a>
      </header>

      <main
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 420px",
          gap: 20
        }}
      >
        <section>
          <AdminTable apiBase={apiBase} />
        </section>

        <aside>
          <AdminCharts apiBase={apiBase} />

          <div style={{ marginTop: 12 }}>
            <button
              onClick={handleClear}
              disabled={clearing}
              style={{
                padding: "6px 12px",
                background: clearing ? "#aaa" : "#e53935",
                color: "white",
                border: "none",
                borderRadius: 6,
                cursor: clearing ? "default" : "pointer"
              }}
            >
              {clearing ? "Clearing…" : "Clear Metrics"}
            </button>

            {message && (
              <div style={{ marginTop: 8, fontSize: 13 }}>
                {message}
              </div>
            )}
          </div>
        </aside>
      </main>
    </div>
  );
}
