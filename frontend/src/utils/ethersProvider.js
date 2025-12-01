// frontend/src/utils/ethersProvider.js
import { ethers } from "ethers";
import { networkConfig } from "../constants/networkConfig";

let provider = null;
let signer = null;
let activeChain = null;

/** Normalize chainId (number or string) to lowercase hex string */
function normalizeChainId(id) {
  if (typeof id === "string") {
    return id.startsWith("0x")
      ? id.toLowerCase()
      : "0x" + Number(id).toString(16).toLowerCase();
  }
  if (typeof id === "number") {
    return "0x" + id.toString(16).toLowerCase();
  }
  throw new Error("Invalid chainId type: " + typeof id);
}

/** Coinbase-first provider detection */
function detectProvider() {
  if (typeof window === "undefined") return null;

  const eth = window.ethereum;

  // Coinbase Wallet extension v10+ usually sets this flag
  if (eth && eth.isCoinbaseWallet) return eth;

  // Some older variants expose a separate object
  if (window.coinbaseWalletExtension) return window.coinbaseWalletExtension;

  // Fallback to any injected provider
  if (eth) return eth;

  return null;
}

/**
 * Initialize connection and switch/add the chain (Coinbase-friendly).
 * @param {string} chainKey - key from networkConfig (e.g. "sepolia", "optimism")
 */
export async function initProvider(chainKey = "sepolia") {
  const ethProvider = detectProvider();
  if (!ethProvider) {
    throw new Error(
      "No Coinbase Wallet detected — please install or open the Coinbase Wallet extension."
    );
  }

  const target = networkConfig[chainKey];
  if (!target) {
    throw new Error("Unknown network key: " + chainKey);
  }

  if (typeof target.chainId === "undefined") {
    throw new Error(
      `Missing chainId in networkConfig for "${chainKey}". Check constants/networkConfig.js`
    );
  }

  const chainIdHex = normalizeChainId(target.chainId);

  // 1) Request account access first (Coinbase-friendly)
  try {
    await ethProvider.request({
      method: "eth_requestAccounts",
      params: [],
    });
  } catch (err) {
    console.error("Account request rejected:", err);
    throw new Error(
      "Please connect your Coinbase Wallet to this site and try again."
    );
  }

  // 2) Try to switch to the target chain
  try {
    await ethProvider.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: chainIdHex }],
    });
  } catch (err) {
    // Coinbase sometimes returns -32603 for unknown chain; handle both
    if (err.code === 4902 || err.code === -32603) {
      try {
        await ethProvider.request({
          method: "wallet_addEthereumChain",
          params: [
            {
              chainId: chainIdHex,
              chainName: target.name,
              rpcUrls: [target.rpcUrl],
              blockExplorerUrls: target.blockExplorer
                ? [target.blockExplorer]
                : [],
              nativeCurrency:
                target.nativeCurrency || {
                  name: "ETH",
                  symbol: "ETH",
                  decimals: 18,
                },
            },
          ],
        });
      } catch (addErr) {
        console.error("Failed to add chain:", addErr);
        throw new Error(
          "Please add the network manually in Coinbase Wallet. (Add chain error: " +
            (addErr.message || addErr) +
            ")"
        );
      }
    } else {
      console.error("Network switch failed:", err);
      throw new Error(
        "Network switch failed in Coinbase Wallet: " + (err.message || err)
      );
    }
  }

  // 3) Create ethers.js BrowserProvider & signer
  provider = new ethers.BrowserProvider(ethProvider);
  signer = await provider.getSigner();
  activeChain = chainKey;

  const address = await signer.getAddress();

  return {
    provider,
    signer,
    chain: chainKey,
    address,
  };
}

export function getProvider() {
  if (!provider) {
    throw new Error("Provider not initialized — call initProvider() first.");
  }
  return provider;
}

export function getSigner() {
  if (!signer) {
    throw new Error("Signer not initialized — call initProvider() first.");
  }
  return signer;
}

export async function getAddress() {
  if (!signer) {
    throw new Error("Signer not initialized — call initProvider() first.");
  }
  return signer.getAddress();
}

export function getActiveChain() {
  return activeChain;
}
