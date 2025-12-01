export default function TxHealthScore({ gasGwei, blockAgeSec }) {
  // Normalize values
  const gas = Number(gasGwei || 0);
  const age = Number(blockAgeSec || 0);

  let score = 100;

  if (gas > 50) score -= 30;
  if (gas > 100) score -= 50;

  if (age > 30) score -= 20;
  if (age > 120) score -= 40;

  if (score < 0) score = 0;

  const color =
    score > 75 ? "#10b981" : score > 50 ? "#f59e0b" : "#ef4444";

  return (
    <div
      style={{
        fontSize: 13,
        display: "flex",
        alignItems: "center",
        gap: 8,
      }}
    >
      <div>Health Score:</div>
      <div
        style={{
          padding: "3px 8px",
          borderRadius: 6,
          background: color,
          color: "white",
          fontWeight: 600,
        }}
      >
        {score}
      </div>
    </div>
  );
}
