// Shows how the value of a small ETH amount changes across currencies

export default function FxImpactChart({ amountEth = 0.001, fxData }) {
  // fxData: { USD: number, EUR: number, INR: number }
  if (!fxData) return null;

  const values = [
    { code: "USD", value: fxData.USD ?? 0 },
    { code: "EUR", value: fxData.EUR ?? 0 },
    { code: "INR", value: fxData.INR ?? 0 },
  ];

  const max = Math.max(...values.map((v) => v.value || 0), 1);

  return (
    <div style={{ fontSize: 13 }}>
      <div style={{ marginBottom: 6 }}>
        FX impact for <b>{amountEth}</b> ETH
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {values.map((v) => (
          <div key={v.code} style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ width: 38 }}>{v.code}</div>
            <div
              style={{
                flex: 1,
                height: 8,
                borderRadius: 999,
                background: "#e5e7eb",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  height: "100%",
                  width: `${(v.value / max) * 100}%`,
                  background: "#3b82f6",
                  transition: "width 0.3s ease",
                }}
              />
            </div>
            <div style={{ width: 70, textAlign: "right" }}>
              {v.value ? v.value.toFixed(2) : "-"}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
