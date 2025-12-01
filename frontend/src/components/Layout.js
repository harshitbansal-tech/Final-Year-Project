// Layout wrapper used by all pages
import Link from "next/link";

export default function Layout({ children }) {
  return (
    <div style={{ padding: 20, fontFamily: "Inter, sans-serif" }}>
      <nav
        style={{
          display: "flex",
          gap: 16,
          marginBottom: 24,
          fontSize: 14,
        }}
      >
        <Link href="/">Home</Link>
        <Link href="/payments">Payments</Link>
        <Link href="/networks">Networks</Link>
        <Link href="/analytics">Analytics</Link>
        <Link href="/ai">AI</Link>
        <Link href="/stress-test">Stress Test</Link>
      </nav>

      <div style={{ maxWidth: 900, margin: "0 auto" }}>{children}</div>
    </div>
  );
}
