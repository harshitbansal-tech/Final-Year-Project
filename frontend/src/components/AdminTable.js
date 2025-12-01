// frontend/src/components/AdminTable.js
import React, { useState, useEffect, useMemo } from "react";

// tiny helper for CSV export
function downloadCsv(filename, rows) {
  const header = Object.keys(rows[0] || {});
  const csv =
    header.join(",") +
    "\n" +
    rows
      .map((r) =>
        header
          .map((k) => {
            const v = r[k] == null ? "" : String(r[k]);
            return `"${v.replace(/"/g, '""')}"`;
          })
          .join(",")
      )
      .join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default function AdminTable({ apiBase }) {
  const [rows, setRows] = useState([]);
  const [chainFilter, setChainFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(50);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!apiBase) return;
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apiBase]);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch(`${apiBase}/api/metrics/all`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      const data = Array.isArray(json) ? json : json.data || [];
      setRows(data);
      setPage(1);
    } catch (e) {
      console.error("AdminTable load error:", e);
      setRows([]);
    } finally {
      setLoading(false);
    }
  }

  const chainOptions = useMemo(() => {
    const set = new Set();
    rows.forEach((r) => r.chain && set.add(r.chain));
    return Array.from(set);
  }, [rows]);

  const filteredRows = useMemo(() => {
    if (chainFilter === "all") return rows;
    return rows.filter((r) => r.chain === chainFilter);
  }, [rows, chainFilter]);

  const total = filteredRows.length;
  const totalPages = Math.max(1, Math.ceil(total / perPage));
  const pageSafe = Math.min(page, totalPages);
  const start = (pageSafe - 1) * perPage;
  const end = start + perPage;
  const pageRows = filteredRows.slice(start, end);

  function exportAll() {
    if (!filteredRows.length) {
      alert("No data to export");
      return;
    }
    downloadCsv("metrics.csv", filteredRows);
  }

  if (!apiBase) {
    return (
      <div className="card-soft">
        <div className="card-title">Recent Transactions</div>
        <div className="text-xs text-muted">
          Set <code>NEXT_PUBLIC_BACKEND_URL</code> to view metrics.
        </div>
      </div>
    );
  }

  return (
    <div className="card-soft">
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          marginBottom: 8,
          alignItems: "center",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span className="text-xs">Chain:</span>
          <select
            className="input"
            style={{ maxWidth: 160, fontSize: 12 }}
            value={chainFilter}
            onChange={(e) => {
              setChainFilter(e.target.value);
              setPage(1);
            }}
          >
            <option value="all">All chains</option>
            {chainOptions.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          <span className="text-xs">
            Showing {pageRows.length} of {total} tx
          </span>
        </div>

        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={load} disabled={loading} className="btn-ghost">
            {loading ? "Loading…" : "Refresh"}
          </button>
          <button onClick={exportAll} className="btn-ghost">
            Export CSV
          </button>
        </div>
      </div>

      <div style={{ maxHeight: 420, overflow: "auto" }}>
        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
            fontFamily: "monospace",
            fontSize: 11,
          }}
        >
          <thead>
            <tr
              style={{ textAlign: "left", borderBottom: "1px solid #1f2937" }}
            >
              <th>TxHash</th>
              <th>Chain</th>
              <th>Status</th>
              <th>Latency (ms)</th>
              <th>Amount (ETH)</th>
              <th>L2 Cost (wei)</th>
              <th>Sent</th>
            </tr>
          </thead>
          <tbody>
            {pageRows.map((r) => (
              <tr
                key={r.id || r.txHash}
                style={{ borderBottom: "1px solid #111827" }}
              >
                <td
                  style={{
                    maxWidth: 220,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  <a
                    href="#"
                    onClick={(e) => {
                      e.preventDefault();
                      if (navigator.clipboard) {
                        navigator.clipboard.writeText(r.txHash || "");
                      }
                      alert("Copied txHash");
                    }}
                  >
                    {r.txHash}
                  </a>
                </td>
                <td>{r.chain || "-"}</td>
                <td>{r.status || "-"}</td>
                <td>{r.latencyMs ?? "-"}</td>
                <td>
                  {r.amountWei
                    ? (Number(r.amountWei) / 1e18).toFixed(6)
                    : "-"}
                </td>
                <td>{r.l2CostWei ?? "-"}</td>
                <td>
                  {r.sendTs ? new Date(r.sendTs).toLocaleString() : "-"}
                </td>
              </tr>
            ))}

            {pageRows.length === 0 && (
              <tr>
                <td colSpan={7} style={{ textAlign: "center", padding: 20 }}>
                  {loading
                    ? "Loading..."
                    : "No metrics yet. Run the Stress Test or send/track a transaction."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          marginTop: 8,
          alignItems: "center",
        }}
      >
        <div>
          <button
            className="btn-ghost"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={pageSafe <= 1}
          >
            Prev
          </button>
          <span style={{ margin: "0 8px", fontSize: 12 }}>
            Page {pageSafe} / {totalPages}
          </span>
          <button
            className="btn-ghost"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={pageSafe >= totalPages}
          >
            Next
          </button>
        </div>

        <div className="text-xs">
          Per page:{" "}
          <select
            className="input"
            style={{ width: 70, display: "inline-block" }}
            value={perPage}
            onChange={(e) => {
              setPerPage(Number(e.target.value));
              setPage(1);
            }}
          >
            {[10, 25, 50, 100].map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}
