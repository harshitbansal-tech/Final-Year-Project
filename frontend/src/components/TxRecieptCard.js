// Small receipt card for a single micropayment

export default function TxReceiptCard({
  chain,
  to,
  amountEth,
  txHash,
  timestamp,
}) {
  if (!txHash) return null;

  const explorer =
    chain === "sepolia"
      ? "https://sepolia.etherscan.io/tx/"
      : chain === "optimism"
      ? "https://sepolia-optimism.etherscan.io/tx/"
      : chain === "polygonAmoy"
      ? "https://www.oklink.com/amoy/tx/"
      : "";

  const dateText = timestamp
    ? new Date(timestamp).toLocaleString()
    : new Date().toLocaleString();

  return (
    <div
      style={{
        marginTop: 12,
        border: "1px solid #e5e7eb",
        borderRadius: 8,
        padding: 10,
        fontSize: 12,
        background: "#f9fafb",
      }}
    >
      <div style={{ fontWeight: 600, marginBottom: 6 }}>Micropayment Receipt</div>
      <div>
        <b>Network:</b> {chain || "Unknown"}
      </div>
      <div>
        <b>To:</b>{" "}
        <span style={{ fontFamily: "monospace" }}>
          {to || "Not captured"}
        </span>
      </div>
      <div>
        <b>Amount:</b> {amountEth} ETH
      </div>
      <div>
        <b>Time:</b> {dateText}
      </div>
      <div style={{ marginTop: 4 }}>
        <b>Tx Hash:</b>{" "}
        <span style={{ fontFamily: "monospace" }}>
          {txHash}
        </span>
      </div>
      {explorer && (
        <div style={{ marginTop: 4 }}>
          <a
            href={`${explorer}${txHash}`}
            target="_blank"
            rel="noreferrer"
            style={{ textDecoration: "underline" }}
          >
            View on explorer ↗
          </a>
        </div>
      )}
    </div>
  );
}
