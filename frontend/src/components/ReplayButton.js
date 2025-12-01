// Simple "Replay transaction" button that calls onReplay()

export default function ReplayButton({ disabled, onReplay }) {
  return (
    <button
      onClick={onReplay}
      disabled={disabled}
      style={{
        marginTop: 8,
        padding: "6px 12px",
        borderRadius: 6,
        border: "1px solid #d1d5db",
        background: disabled ? "#e5e7eb" : "#f3f4f6",
        cursor: disabled ? "not-allowed" : "pointer",
        fontSize: 13,
      }}
    >
      🔁 Replay Transaction
    </button>
  );
}
