// backend/fx.js
// ETH → fiat conversion using CoinGecko Simple Price API
// - Uses in-memory caching to avoid rate limits
// - If CoinGecko returns 429 or fails, falls back to static rates
//
// Requires Node 18+ for global fetch.
// If you're on older Node, install node-fetch and uncomment the next line:
// const fetch = require("node-fetch");

const COINGECKO_URL =
  "https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd,eur,inr";

// In-memory cache to reduce CoinGecko calls
let lastFetchTs = 0;
let lastPrices = null;
let lastFailureTs = 0;

// How long a successful price stays valid (ms)
const CACHE_TTL_MS = 2 * 60 * 1000; // 2 minutes
// After a failure, how long we wait before trying CoinGecko again
const FAILURE_COOLDOWN_MS = 5 * 60 * 1000; // 5 minutes

// Static fallback rates so the app still works if CoinGecko is down or rate-limited
const FALLBACK_RATES = {
  usd: 3000,
  eur: 2800,
  inr: 250000,
};

async function fetchPricesFromCoinGecko() {
  const now = Date.now();

  // 1) Use cached prices if still fresh
  if (lastPrices && now - lastFetchTs < CACHE_TTL_MS) {
    return lastPrices;
  }

  // 2) If we recently failed, don't hammer CoinGecko – just throw and let caller use fallback
  if (lastFailureTs && now - lastFailureTs < FAILURE_COOLDOWN_MS) {
    throw new Error("CoinGecko in cooldown after previous failure");
  }

  // 3) Try to fetch fresh prices
  const res = await fetch(COINGECKO_URL);
  if (!res.ok) {
    // Remember failure time so we don't keep hitting 429 over and over
    lastFailureTs = now;
    throw new Error(`CoinGecko HTTP ${res.status}`);
  }

  const json = await res.json();
  if (!json || !json.ethereum) {
    lastFailureTs = now;
    throw new Error("Unexpected CoinGecko response format");
  }

  // Success: update cache and clear failure flag
  lastPrices = json.ethereum; // { usd: number, eur: number, inr: number }
  lastFetchTs = now;
  lastFailureTs = 0;
  return lastPrices;
}

/**
 * Convert amountEth (number) to fiat using CoinGecko spot price.
 * If CoinGecko fails (429, network, etc.), uses FALLBACK_RATES.
 *
 * @param {number} amountEth
 * @param {string} toCurrency - "usd" | "eur" | "inr"
 * @returns {Promise<number>} fiat value
 */
async function convertEth(amountEth, toCurrency = "usd") {
  const amt = Number(amountEth);
  if (!amt || amt <= 0) {
    throw new Error("Invalid amountEth");
  }

  const key = String(toCurrency).toLowerCase();

  try {
    const prices = await fetchPricesFromCoinGecko();
    const rate = prices[key];

    if (typeof rate !== "number") {
      throw new Error(`Unsupported currency from CoinGecko: ${toCurrency}`);
    }

    return amt * rate;
  } catch (err) {
    // 👇 This is where 429 (and other errors) are caught
    console.warn("[FX] CoinGecko failed, using static fallback:", err.message);

    const fallbackRate = FALLBACK_RATES[key] || FALLBACK_RATES.usd;
    return amt * fallbackRate;
  }
}

module.exports = { convertEth };
