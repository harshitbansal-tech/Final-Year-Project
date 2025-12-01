import Layout from "../components/Layout";
import SimulationDashboard from "../components/SimulationDashboard";


export default function StressTestPage() {
  return (
    <Layout>
      {/* Page header */}
      <section style={{ marginBottom: 18 }}>
        <h1 style={{ margin: "0 0 4px" }}>Micropayment Stress Test</h1>
        <p className="text-muted" style={{ margin: 0 }}>
          Simulate bursts of micropayments using Socket.IO and see real-time
          throughput, latency and network health.
        </p>
      </section>

      {/* About card */}
      <section className="card card-highlight">
        <div className="card-header">
          <div>
            <div className="card-title">Network Load Simulator</div>
            <div className="card-subtitle">
              Sends a stream of simulated transactions and measures:
            </div>
          </div>
          <span className="badge badge-accent">Realtime</span>
        </div>

        <ul style={{ marginTop: 8, fontSize: 14, lineHeight: 1.5 }}>
          <li>Latency trends (pending → settled)</li>
          <li>Gas cost over time</li>
          <li>Live feed through Socket.IO</li>
          <li>No real funds used</li>
        </ul>
      </section>

      {/* Simulator section */}
      <section style={{ marginTop: 20 }}>
        <div className="card">
          <div className="card-header">
            <div className="card-title">Run Stress Simulation</div>
            <div className="card-subtitle">
              Default load: <b>200 virtual micropayments</b>
            </div>
          </div>

          <SimulationDashboard />
        </div>
      </section>
    </Layout>
  );
}
