// frontend/src/pages/networks.js

import Layout from "../components/Layout";
import NetworkStatusWidget from "../components/NetworkStatusWidget";
import FXSpreadVisualizer from "../components/FXSpreadVisualizer";

export default function NetworksPage() {
  return (
    <Layout>
      {/* Header */}
      <section style={{ marginBottom: 18 }}>
        <h1 style={{ margin: "0 0 4px" }}>Network Health & FX</h1>
        <p className="text-muted" style={{ margin: 0 }}>
          Live view of block height, block age, gas prices, and ETH → fiat spreads
          across your configured L2 testnets.
        </p>
      </section>

      {/* Two-column layout */}
      <section
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(0, 1.45fr) minmax(0, 1fr)",
          gap: 18,
        }}
      >
        {/* Network status card */}
        <div className="card-soft">
          <div className="card-header" style={{ marginBottom: 4 }}>
            <div>
              <div className="card-title">Network Status</div>
              <div className="card-subtitle">
                RPC connectivity, block freshness and gas environment for each
                configured chain.
              </div>
            </div>
          </div>
          <NetworkStatusWidget />
        </div>

        {/* FX impact card */}
        <div className="card-soft">
          <div className="card-header" style={{ marginBottom: 4 }}>
            <div>
              <div className="card-title">FX Impact</div>
              <div className="card-subtitle">
                ETH → USD/EUR/INR real-time view to understand the fiat impact of
                your gas spend and micropayment flows.
              </div>
            </div>
          </div>
          <FXSpreadVisualizer />
        </div>
      </section>
    </Layout>
  );
}
