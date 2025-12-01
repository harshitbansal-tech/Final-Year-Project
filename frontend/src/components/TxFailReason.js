// Interprets a raw error message into a friendly explanation.

export default function TxFailReason({ rawError }) {
  if (!rawError) return null;

  const msg = String(rawError || "").toLowerCase();

  let reason = "Unknown error. Check the transaction on the block explorer.";
  let suggestion =
    "Verify you are on the correct testnet, have enough balance, and the contract address is correct.";

  if (msg.includes("user denied") || msg.includes("user rejected")) {
    reason = "You rejected the transaction in your wallet.";
    suggestion = "Try again and click 'Confirm' in your wallet popup.";
  } else if (msg.includes("insufficient funds")) {
    reason = "Insufficient balance to cover value + gas.";
    suggestion = "Reduce the amount or get more testnet ETH for this network.";
  } else if (msg.includes("execution reverted")) {
    reason = "The contract reverted the transaction.";
    suggestion =
      "Ensure the recipient address is valid and the contract supports this operation. Check require() conditions in the contract.";
  } else if (msg.includes("nonce too low")) {
    reason = "Nonce mismatch for this account.";
    suggestion =
      "Wait for pending transactions to confirm, or reset nonce in your wallet settings.";
  } else if (msg.includes("replacement transaction underpriced")) {
    reason = "Replacement transaction gas price too low.";
    suggestion =
      "Increase the gas price or wait for the original transaction to confirm.";
  }

  return (
    <div
      style={{
        marginTop: 10,
        padding: 8,
        borderRadius: 8,
        border: "1px solid #fecaca",
        background: "#fef2f2",
        fontSize: 12,
      }}
    >
      <div style={{ fontWeight: 600, marginBottom: 4 }}>Why did it fail?</div>
      <div style={{ marginBottom: 2 }}>{reason}</div>
      <div style={{ color: "#6b7280" }}>{suggestion}</div>
      <details style={{ marginTop: 4 }}>
        <summary style={{ cursor: "pointer" }}>Raw error</summary>
        <pre
          style={{
            marginTop: 4,
            fontSize: 11,
            whiteSpace: "pre-wrap",
            wordBreak: "break-word",
          }}
        >
{rawError}
        </pre>
      </details>
    </div>
  );
}
