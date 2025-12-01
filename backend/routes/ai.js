// backend/routes/ai.js
// Real AI-powered transaction explainer using Hugging Face Inference API

const express = require("express");
const { ethers } = require("ethers");

// Use global fetch if Node >= 18, otherwise fall back to node-fetch (dynamic import)
const _fetch =
  typeof fetch === "function"
    ? fetch
    : (...args) =>
        import("node-fetch").then(({ default: fetchImpl }) =>
          fetchImpl(...args)
        );

/**
 * Build a compact JSON-friendly summary for the frontend and for the LLM.
 */
function buildSummary(chainKey, tx, receipt, block) {
  const valueEth = tx?.value ? Number(ethers.formatEther(tx.value)) : 0;
  const gasUsed = receipt?.gasUsed ? receipt.gasUsed.toString() : null;
  const gasPriceWei = receipt?.effectiveGasPrice
    ? receipt.effectiveGasPrice.toString()
    : null;

  let status = "pending";
  if (receipt) {
    if (receipt.status === 1) status = "success";
    else if (receipt.status === 0) status = "failed";
  }

  return {
    chain: chainKey,
    txHash: tx?.hash ?? null,
    status,
    from: tx?.from ?? null,
    to: tx?.to ?? null,
    valueEth,
    gasUsed,
    gasPriceWei,
    gasPriceGwei:
      gasPriceWei != null ? Number(gasPriceWei) / 1e9 : null,
    blockNumber:
      receipt?.blockNumber ?? tx?.blockNumber ?? null,
    timestamp: block?.timestamp ?? null,
  };
}

/**
 * Turn the summary into a prompt for the LLM.
 */
function buildPrompt(summary) {
  const { chain, status, from, to, valueEth, blockNumber, gasUsed, gasPriceGwei } =
    summary;

  const baseJson = JSON.stringify(summary, null, 2);

  return `
You are an expert blockchain analyst explaining transactions on EVM chains in simple language.

Here is the normalized transaction data (JSON):

${baseJson}

Explain to a non-technical student:

1. What happened in this transaction in 2–3 sentences.
2. Clearly say if it was SUCCESSFUL, FAILED, or still PENDING, and why.
3. Who paid whom and approximately how much (in ETH terms, not wei).
4. Comment on gas usage (is it small/normal/high given it looks like a simple transfer or contract call?).

Keep it under 10 sentences. Avoid jargon like "opcodes" or "EVM"; use plain English.
`.trim();
}

/**
 * Call Hugging Face Inference API to generate the explanation text.
 */
async function callHuggingFaceLLM(prompt) {
  const apiKey = process.env.HUGGINGFACE_API_KEY;
  const model =
    process.env.HUGGINGFACE_MODEL ||
    "mistralai/Mistral-7B-Instruct-v0.2";

  if (!apiKey) {
    throw new Error(
      "HUGGINGFACE_API_KEY not set in backend .env (server-side)"
    );
  }

  const url = `https://api-inference.huggingface.co/models/${model}`;

  const res = await _fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      inputs: prompt,
      parameters: {
        max_new_tokens: 320,
        temperature: 0.3,
        top_p: 0.9,
      },
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(
      `Hugging Face API error ${res.status}: ${text.slice(0, 300)}`
    );
  }

  const data = await res.json();

  // HF text-generation typically returns an array with generated_text
  let explanation;
  if (Array.isArray(data) && data[0]?.generated_text) {
    explanation = data[0].generated_text;
  } else if (data?.generated_text) {
    explanation = data.generated_text;
  } else if (Array.isArray(data) && data[0]?.summary_text) {
    explanation = data[0].summary_text;
  } else {
    explanation = typeof data === "string" ? data : JSON.stringify(data);
  }

  // If the model echoes the prompt, try to strip it off
  if (explanation.startsWith(prompt)) {
    explanation = explanation.slice(prompt.length).trim();
  }

  return explanation.trim();
}

/**
 * Exported router factory — index.js calls aiRouterFactory(providers).
 */
module.exports = function aiRouterFactory(providers) {
  const router = express.Router();

  /**
   * GET /api/ai/tx-explain?chain=sepolia&txHash=0x...
   */
  router.get("/tx-explain", async (req, res) => {
    try {
      const { chain = "sepolia", txHash } = req.query;

      if (!txHash || typeof txHash !== "string" || !txHash.startsWith("0x")) {
        return res
          .status(400)
          .json({ ok: false, error: "Invalid or missing txHash" });
      }

      const provider = providers[chain];
      if (!provider) {
        return res
          .status(400)
          .json({ ok: false, error: `Unsupported chain: ${chain}` });
      }

      // 1) Fetch raw on-chain data
      const tx = await provider.getTransaction(txHash);
      if (!tx) {
        return res
          .status(404)
          .json({ ok: false, error: "Transaction not found" });
      }

      let receipt = null;
      try {
        receipt = await provider.getTransactionReceipt(txHash);
      } catch (_) {
        // ignore; tx may still be pending
      }

      let block = null;
      const blockNumber = receipt?.blockNumber ?? tx.blockNumber;
      if (blockNumber != null) {
        try {
          block = await provider.getBlock(blockNumber);
        } catch (_) {
          // ignore
        }
      }

      // 2) Build summary for both frontend & LLM
      const summary = buildSummary(chain, tx, receipt, block);

      // 3) Build prompt & call Hugging Face
      let explanation;
      try {
        const prompt = buildPrompt(summary);
        explanation = await callHuggingFaceLLM(prompt);
      } catch (llmErr) {
        console.warn("[AI] Hugging Face call failed:", llmErr.message);
        // Fallback to a simple hard-coded explanation if HF fails
        const statusLabel =
          summary.status === "success"
            ? "succeeded"
            : summary.status === "failed"
            ? "failed"
            : "is still pending";
        explanation = `This ${chain} transaction ${statusLabel}. The sender ${
          summary.from || "unknown"
        } attempted to send approximately ${
          summary.valueEth ?? 0
        } ETH to ${summary.to || "a contract or unknown address"}. 
Gas usage was ${
          summary.gasUsed || "unknown"
        }, and the effective gas price was approximately ${
          summary.gasPriceGwei != null
            ? summary.gasPriceGwei.toFixed(2) + " gwei"
            : "unknown"
        }.`;
      }

      res.json({
        ok: true,
        summary,
        explanation,
      });
    } catch (err) {
      console.error("[AI] tx-explain error:", err);
      res.status(500).json({
        ok: false,
        error: err.message || String(err),
      });
    }
  });

  return router;
};
