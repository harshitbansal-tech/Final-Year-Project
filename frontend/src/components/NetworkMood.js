export default function NetworkMood({ mood }) {
  const emoji =
    mood === "happy"
      ? "🟢"
      : mood === "stressed"
      ? "🟡"
      : mood === "angry"
      ? "🔴"
      : "⚪";

  const label =
    mood === "happy"
      ? "Healthy"
      : mood === "stressed"
      ? "Delayed"
      : mood === "angry"
      ? "Unreachable"
      : "Unknown";

  return (
    <div style={{ fontSize: 15 }}>
      <span style={{ marginRight: 6 }}>{emoji}</span>
      {label}
    </div>
  );
}
