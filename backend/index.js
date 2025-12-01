/***********************************************************
 *  Micropay L2 Backend — FINAL CONSOLIDATED VERSION
 ***********************************************************/

require("dotenv").config();
const express = require("express");
const { ethers } = require("ethers");
const http = require("http");
const cors = require("cors");
const { Server } = require("socket.io");

// Local modules
const {
  insertMetric,
  getSummary,
  getAllMetrics,
  clearMetrics,
} = require("./db");
const { runSimulation } = require("./simulate");

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

/***********************************************************
 * 1️⃣ PROVIDERS — MULTI RPC
 ***********************************************************/
const providerUrls = {
  sepolia: process.env.SEPOLIA_RPC,
  optimism: process.env.OPTIMISM_RPC,
  zksync: process.env.ZKSYNC_RPC,
  polygonAmoy: process.env.POLYGON_RPC,
};

const providers = {};

for (const [chain, url] of Object.entries(providerUrls)) {
  if (url) {
    providers[chain] = new ethers.JsonRpcProvider(url);
    console.log(`🔌 Provider ready → ${chain}`);
  } else {
    console.warn(`⚠️ Missing RPC for ${chain}`);
  }
}

/***********************************************************
 * 2️⃣ SIGNER (Sepolia default)
 ***********************************************************/
let signer = null;

if (process.env.PRIVATE_KEY && providers.sepolia) {
  try {
    signer = new ethers.Wallet(process.env.PRIVATE_KEY, providers.sepolia);
    console.log("🔑 Signer loaded (Sepolia)");
  } catch (err) {
    console.warn("⚠️ Signer error:", err.message);
  }
} else {
  console.warn("⚠️ Signer NOT loaded — missing PRIVATE_KEY or SEPOLIA_RPC");
}

/***********************************************************
 * 3️⃣ MICROPAY CONTRACT (PaymentProcessor/PaymentProcessorV2)
 ***********************************************************/
let micropay = null;

if (signer && process.env.MICROPAY_ADDRESS) {
  try {
    const abi = [
      "function payNative(address to) payable",
      "function batchPayNative(address[] recipients, uint256[] amounts) payable",
      "event NativePaid(address indexed from, address indexed to, uint256 amount)",
    ];

    micropay = new ethers.Contract(
      process.env.MICROPAY_ADDRESS,
      abi,
      signer
    );
    console.log("📦 Micropay contract connected:", process.env.MICROPAY_ADDRESS);
  } catch (err) {
    console.warn("⚠️ Contract load failed:", err.message);
  }
} else {
  console.warn("⚠️ Micropay not connected — missing signer or MICROPAY_ADDRESS");
}

/***********************************************************
 * 4️⃣ BASIC HEALTH
 ***********************************************************/
app.get("/", (req, res) => {
  res.send("✅ Micropay L2 backend is Online");
});

/***********************************************************
 * 5️⃣ METRICS API (inline) — summary, all, clear
 ***********************************************************/
app.get("/api/metrics/summary", (req, res) => {
  try {
    res.json(getSummary());
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/metrics/all", (req, res) => {
  try {
    const limit = Number(req.query.limit || 500);
    res.json(getAllMetrics(limit));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/metrics/clear", (req, res) => {
  try {
    clearMetrics();
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/***********************************************************
 * 6️⃣ SIMULATION — Fake Tx Load (Stress Test)
 ***********************************************************/
/***********************************************************
 * 6️⃣ SIMULATION — Fake Tx Load (Stress Test)
 ***********************************************************/
app.post("/api/simulate/run", (req, res) => {
  try {
    const { count = 200 } = req.body || {};
    const result = runSimulation(count, io);
    // result = { ok: true, count: N }
    res.json(result);
  } catch (err) {
    console.error("[simulate.run] error:", err);
    res.status(500).json({ ok: false, error: err.message });
  }
});


/***********************************************************
 * 7️⃣ NETWORK STATUS (inline)
 ***********************************************************/
app.get("/api/network/status", async (req, res) => {
  const out = {};

  for (const [chain, provider] of Object.entries(providers)) {
    if (!provider) {
      out[chain] = { status: "unreachable", error: "RPC not configured" };
      continue;
    }

    try {
      const block = await provider.getBlock("latest").catch((e) => {
        console.warn(`[network.status] ${chain} getBlock error:`, e?.message);
        return null;
      });

      let gasPriceBigInt = null;
      let feeData = null;

      try {
        feeData = await provider.getFeeData();
        if (feeData) {
          gasPriceBigInt =
            feeData.gasPrice ||
            feeData.maxFeePerGas ||
            feeData.maxPriorityFeePerGas ||
            null;
        }
      } catch (e) {
        console.warn(
          `[network.status] ${chain} getFeeData not available:`,
          e?.message
        );
      }

      if (gasPriceBigInt == null) {
        try {
          const raw = provider.send
            ? await provider.send("eth_gasPrice", [])
            : null;
          if (raw) gasPriceBigInt = BigInt(raw);
        } catch (e) {
          console.warn(
            `[network.status] ${chain} eth_gasPrice fallback failed:`,
            e?.message
          );
        }
      }

      const now = Math.floor(Date.now() / 1000);
      const ts = block?.timestamp ?? now;
      const ageSec = now - ts;

      let gasGwei = null;
      if (gasPriceBigInt != null) {
        try {
          gasGwei = Number(gasPriceBigInt) / 1e9;
        } catch {
          gasGwei = null;
        }
      }

      out[chain] = {
        blockNumber: block?.number ?? null,
        timestamp: ts,
        gasPriceWei: gasPriceBigInt != null ? gasPriceBigInt.toString() : null,
        gasGwei,
        ageSec,
        status:
          block && ageSec < 60
            ? "healthy"
            : block
            ? "delayed"
            : "unreachable",
      };
    } catch (err) {
      out[chain] = {
        status: "unreachable",
        error: err?.message || String(err),
      };
    }
  }

  res.json(out);
});

/***********************************************************
 * 8️⃣ FX (CoinGecko-based convert + spread)
 ***********************************************************/
try {
  const fxRouterFactory = require("./routes/fx");
  const fxRouter = fxRouterFactory();
  app.use("/api/fx", fxRouter);
  console.log("💱 FX router active");
} catch (err) {
  console.warn("⚠️ FX router missing:", err.message);
}

/***********************************************************
 * 9️⃣ FEE PREDICTOR
 ***********************************************************/
try {
  const feeRouterFactory = require("./routes/fees");
  const feeRouter = feeRouterFactory(providers);
  app.use("/api/fee", feeRouter);
  console.log("⛽ Fee predictor active");
} catch (err) {
  console.warn("⚠️ Fee router missing:", err.message);
}

/***********************************************************
 * 🔟 CROSSCHAIN (optional)
 ***********************************************************/
try {
  const crosschainRouterFactory = require("./routes/crosschain");
  const crosschainRouter = crosschainRouterFactory(io, providers);
  app.use("/api/crosschain", crosschainRouter);
  console.log("🔀 Crosschain router active");
} catch (err) {
  console.warn("⚠️ Crosschain router missing:", err.message);
}

/***********************************************************
 * 1️⃣1️⃣ PRIVACY (optional)
 ***********************************************************/
try {
  const privacyRouterFactory = require("./routes/privacy");
  const privacyRouter = privacyRouterFactory(signer, providers);
  app.use("/api/privacy", privacyRouter);
  console.log("🕵 Privacy router active");
} catch (err) {
  console.warn("⚠️ Privacy router missing:", err.message);
}

/***********************************************************
 * 1️⃣2️⃣ AI EXPLAINER (optional)
 ***********************************************************/
try {
  const aiRouterFactory = require("./routes/ai");
  const aiRouter = aiRouterFactory(providers);
  app.use("/api/ai", aiRouter);
  console.log("🤖 AI router active");
} catch (err) {
  console.warn("⚠️ AI router missing:", err.message);
}

/***********************************************************
 * 1️⃣3️⃣ PAYMENTS ROUTER (optional — backend send)
 ***********************************************************/
try {
  const paymentsRouterFactory = require("./routes/payments");
  const paymentsRouter = paymentsRouterFactory(micropay, signer, "sepolia");
  app.use("/api/payments", paymentsRouter);
  console.log("💸 Payments router active");
} catch (err) {
  console.warn("⚠️ Payments router missing:", err.message);
}

/***********************************************************
 * 1️⃣4️⃣ SOCKET.IO LIVE TX STREAM + METRICS
 ***********************************************************/
io.on("connection", (socket) => {
  console.log("🔗 Socket connected");

  socket.on("trackTx", async (txHash) => {
    try {
      if (!signer) throw new Error("Signer unavailable");

      const receipt = await signer.provider.waitForTransaction(txHash);
      if (!receipt) throw new Error("Transaction not found");

      const block = await signer.provider.getBlock(receipt.blockNumber);
      const sendTs = block.timestamp * 1000;
      const settledTs = Date.now();
      const latencyMs = settledTs - sendTs;

      const l2CostWei =
        receipt.gasUsed && receipt.effectiveGasPrice
          ? (receipt.gasUsed * receipt.effectiveGasPrice).toString()
          : "0";

      const metric = {
        txHash,
        chain: "sepolia", // you can extend this to detect chain dynamically
        sendTs,
        settledTs,
        latencyMs,
        status: receipt.status === 1 ? "settled" : "failed",
        amountWei: receipt.value ? receipt.value.toString() : "0",
        l2CostWei,
        l1CostWei: "0",
        token: "native",
      };

      insertMetric(metric);
      socket.emit("txStatus", metric);
    } catch (err) {
      socket.emit("txStatus", {
        txHash,
        status: "failed",
        error: err.message,
      });
    }
  });

  socket.on("disconnect", () => console.log("❎ Socket disconnected"));
});

/***********************************************************
 * 1️⃣5️⃣ START SERVER
 ***********************************************************/
const PORT = process.env.PORT || 4000;

server.listen(PORT, () => {
  console.log(`🚀 Backend running at http://localhost:${PORT}`);
});
