// frontend/src/utils/csv.js
export function downloadCsv(filename, rows) {
  if (!rows || rows.length === 0) {
    const blob = new Blob([""], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
    return;
  }

  const keys = Object.keys(rows[0]);
  const header = keys.join(",") + "\n";
  const lines = rows.map((r) =>
    keys
      .map((k) => {
        const v = r[k] === null || r[k] === undefined ? "" : String(r[k]);
        // escape quotes
        return `"${v.replace(/"/g, '""')}"`;
      })
      .join(",")
  );
  const csv = header + lines.join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
