// backend/crosschain/bridgeSimulator.js
// Simple, deterministic cross-chain quote estimator for demo purposes.
// Returns an object: { route, bridgeFeeEth, estimatedLatencySec, fxRateUsdPerEth, totalCostUsd, breakdown }

const fx = require("../fx"); // expects fetchRates and convertEth
const BN = (v) => BigInt(v);

const DEFAULT_BRIDGE_BASE_FEE_ETH = 0.00005; // demo base fee
const PERCENTAGE_FEE = 0.0015; // 0.15% slippage / fee
const NETWORK_LATENCIES = {
  sepolia: 8, // seconds (L1)
  optimism: 3,
  zksync: 4,
  polygonAmoy: 3
};

function buildDefaultRoute(fromChain, toChain) {
  // For demo, prefer direct route (fromChain -> toChain)
  // If from === to, route is [from]
  if (fromChain === toChain) return [fromChain];
  // route via L1 for cross-rollup: fromChain -> sepolia -> toChain
  return [fromChain, "sepolia", toChain];
}

async function getCrosschainQuote({ amountEth, fromChain, toChain, toCurrency = "usd" }) {
  // Basic input normalization
  amountEth = Number(amountEth);
  if (isNaN(amountEth) || amountEth <= 0) throw new Error("Invalid amountEth");

  const route = buildDefaultRoute(fromChain, toChain);

  // fetch ETH->USD (or target fiat) rate
  const rates = await fx.fetchRates(); // returns { usd, eur, inr }
  const rateUsdPerEth = rates.usd || 0;

  // Compute fees & latencies across route
  // For demo: each bridge hop (chain change) applies base fee + percentage slippage
  let totalBridgeFeeEth = 0;
  let totalLatency = 0;
  const breakdown = [];

  for (let i = 0; i < route.length - 1; i++) {
    const src = route[i];
    const dst = route[i + 1];

    // Bridge fee: base + percent of amount
    const hopBaseFee = DEFAULT_BRIDGE_BASE_FEE_ETH;
    const hopPercentageFee = amountEth * PERCENTAGE_FEE;
    const hopFee = hopBaseFee + hopPercentageFee;

    // Latency: sum src + dst network latencies + 2 sec processing
    const hopLatency = (NETWORK_LATENCIES[src] || 5) + (NETWORK_LATENCIES[dst] || 5) + 2;

    breakdown.push({
      from: src,
      to: dst,
      hopFeeEth: hopFee,
      hopLatencySec: hopLatency
    });

    totalBridgeFeeEth += hopFee;
    totalLatency += hopLatency;
  }

  // Also include local send cost (small L2 gas cost estimate) as "sendCost"
  // For demo assume sendCost ~ 0.00001 ETH
  const localSendCostEth = 0.00001;
  const totalFeeEth = totalBridgeFeeEth + localSendCostEth;
  const totalCostUsd = (amountEth + totalFeeEth) * rateUsdPerEth;

  return {
    route,
    amountEth,
    bridgeFeeEth: Number(totalBridgeFeeEth.toFixed(12)),
    sendCostEth: Number(localSendCostEth.toFixed(12)),
    totalFeeEth: Number(totalFeeEth.toFixed(12)),
    estimatedLatencySec: Math.round(totalLatency),
    fxRateUsdPerEth: rateUsdPerEth,
    totalCostUsd: Number(totalCostUsd.toFixed(6)),
    breakdown
  };
}

module.exports = { getCrosschainQuote };
