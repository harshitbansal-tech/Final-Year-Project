export default function FeeMeter({ costEth }) {
  // costEth is a number in ETH
  // we simply map it to 3 categories
  let level = 1;

  if (costEth < 0.0001) level = 1;        // cheap
  else if (costEth < 0.0003) level = 2;   // moderate
  else level = 3;                         // expensive

  return (
    <div
      style={{
        display: "flex",
        gap: 8,
        fontSize: 13,
        alignItems: "center",
      }}
    >
      <span>Cost:</span>
      <div style={{ display: "flex", gap: 6 }}>
        <div
          style={{
            width: 16,
            height: 16,
            borderRadius: 4,
            background: level >= 1 ? "#10b981" : "#eee",
          }}
        />
        <div
          style={{
            width: 16,
            height: 16,
            borderRadius: 4,
            background: level >= 2 ? "#f59e0b" : "#eee",
          }}
        />
        <div
          style={{
            width: 16,
            height: 16,
            borderRadius: 4,
            background: level >= 3 ? "#ef4444" : "#eee",
          }}
        />
      </div>
      <span style={{ color: "#555" }}>{costEth.toFixed(6)} ETH</span>
    </div>
  );
}
