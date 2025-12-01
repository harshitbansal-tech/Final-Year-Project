// backend/privacy.js
const fs = require("fs");
const path = require("path");
const { ethers } = require("ethers");

const DATA_DIR = path.join(__dirname, "data");
const STORE_FILE = path.join(DATA_DIR, "privacy.json");

let contract = null;
let signer = null;
let provider = null;
let onChainMode = false;

// ensure data dir exists
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

// load store from disk (fallback)
function loadStore() {
  try {
    if (!fs.existsSync(STORE_FILE)) {
      const initial = { deposits: [] };
      fs.writeFileSync(STORE_FILE, JSON.stringify(initial, null, 2));
      return initial;
    }
    const raw = fs.readFileSync(STORE_FILE, "utf8");
    return JSON.parse(raw);
  } catch (e) {
    console.error("privacy.loadStore error", e);
    return { deposits: [] };
  }
}

function saveStore(store) {
  fs.writeFileSync(STORE_FILE, JSON.stringify(store, null, 2));
}

/**
 * Initialize privacy helper.
 * @param {Object} opts
 *   - provider: ethers provider (optional)
 *   - signer: ethers Signer (optional) - used to send on-chain tx
 *   - contractAddress: address of deployed AOMLite contract (optional)
 */
function init({ provider: _provider, signer: _signer, contractAddress } = {}) {
  provider = _provider || null;
  signer = _signer || null;

  if (provider && signer && contractAddress) {
    // instantiate contract
    const abi = [
      "function deposit(bytes32 hash) payable",
      "function claim(bytes calldata secret, address to)",
      "event Deposited(bytes32 indexed hash, address indexed from, uint256 amount)",
      "event Claimed(bytes32 indexed hash, address indexed to, uint256 amount)",
    ];
    contract = new ethers.Contract(contractAddress, abi, signer);
    onChainMode = true;
    console.log("privacy: running in ON-CHAIN mode, contract:", contractAddress);
  } else {
    contract = null;
    onChainMode = false;
    console.log("privacy: running in FALLBACK (JSON) mode");
  }
}

// deposit: tries to call contract.deposit(hash) with value; if not available, store locally
async function deposit({ hash, amountWei, from, chain, io } = {}) {
  if (!hash || !amountWei) throw new Error("Missing hash or amountWei");

  if (onChainMode && contract) {
    // call on-chain deposit
    const tx = await contract.deposit(hash, { value: ethers.BigInt(amountWei) });
    const receipt = await tx.wait();

    // return receipt and mark as onchain
    return { onChain: true, txHash: receipt.transactionHash, receipt };
  } else {
    // fallback: write to JSON store
    const store = loadStore();
    const entry = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      hash: hash,
      amountWei: String(amountWei),
      from: from || null,
      chain: chain || null,
      ts: Date.now(),
      claimed: false,
      claimTs: null,
      claimTo: null
    };
    store.deposits.unshift(entry);
    saveStore(store);

    // optionally emit via io
    try {
      io?.emit?.("privacy:deposited", entry);
    } catch (e) {}

    return { onChain: false, entry };
  }
}

// claim: tries to call contract.claim(secret, to); fallback: check JSON store for matching hash and mark claimed.
async function claim({ secret, to, io } = {}) {
  if (!secret || !to) throw new Error("Missing secret or to");

  const hash = ethers.keccak256(ethers.toUtf8Bytes(secret));

  if (onChainMode && contract) {
    // call on-chain claim via signer (server will run claim)
    const tx = await contract.claim(ethers.toUtf8Bytes(secret), to);
    const receipt = await tx.wait();
    return { onChain: true, txHash: receipt.transactionHash, receipt };
  } else {
    // fallback: mark deposit as claimed
    const store = loadStore();
    const idx = store.deposits.findIndex((d) => d.hash === hash && !d.claimed);
    if (idx === -1) throw new Error("No matching deposit found or already claimed (fallback store)");

    store.deposits[idx].claimed = true;
    store.deposits[idx].claimTs = Date.now();
    store.deposits[idx].claimTo = to;
    saveStore(store);

    const entry = store.deposits[idx];
    try { io?.emit?.("privacy:claimed", entry); } catch (e) {}
    return { onChain: false, entry };
  }
}

function listDeposits({ includeClaimed = true } = {}) {
  if (onChainMode && contract && provider) {
    // reading on-chain deposits requires knowing hashes — we cannot list unknown hashes on-chain.
    // So in on-chain mode, we return a message indicating limited visibility.
    // For full visibility, you should index events (Deposited / Claimed) using an event log indexer.
    return { onChain: true, message: "On-chain mode: please query chain events or use an indexer (not implemented)" };
  } else {
    const store = loadStore();
    return { onChain: false, deposits: includeClaimed ? store.deposits : store.deposits.filter(d => !d.claimed) };
  }
}

module.exports = { init, deposit, claim, listDeposits };
