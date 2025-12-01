// frontend/src/constants/networkConfig.js

// Optional: single env-based address for sepolia (you can still override per-chain)
const DEFAULT_CONTRACT =
  process.env.NEXT_PUBLIC_PAYMENT_PROCESSOR_ADDRESS ||
  "00x80bCabCD6dd7D914884a421aE72Cf050d2235713";

export const networkConfig = {
  sepolia: {
    chainId: 11155111,
    name: "Ethereum Sepolia",
    rpcUrl:
      process.env.NEXT_PUBLIC_SEPOLIA_RPC ||
      "wss://sepolia.infura.io/ws/v3/3c612c80cec749bbbe6916740407af78",
    contractAddress: DEFAULT_CONTRACT,
    blockExplorer: "https://sepolia.etherscan.io",
    nativeCurrency: { name: "Sepolia ETH", symbol: "ETH", decimals: 18 },
  },
  optimism: {
    chainId: 11155420, // Optimism Sepolia
    name: "Optimism Sepolia",
    rpcUrl:
      process.env.NEXT_PUBLIC_OPTIMISM_RPC ||
      "wss://optimism-sepolia.infura.io/ws/v3/3c612c80cec749bbbe6916740407af78",
    blockExplorer: "https://sepolia-optimism.etherscan.io",
    contractAddress:"0x80bCabCD6dd7D914884a421aE72Cf050d2235713",
    nativeCurrency: { name: "Optimism ETH", symbol: "ETH", decimals: 18 },
  },
  zksync: {
    chainId: 300, // zkSync Era Sepolia
    name: "zkSync Era Sepolia",
    rpcUrl:
      process.env.NEXT_PUBLIC_ZKSYNC_RPC ||
      "https://sepolia.era.zksync.dev",
    blockExplorer: "https://sepolia.explorer.zksync.io",
    contractAddress: "0x80bCabCD6dd7D914884a421aE72Cf050d2235713",
    nativeCurrency: { name: "zkSync ETH", symbol: "ETH", decimals: 18 },
  },
  polygonAmoy: {
    chainId: 80002, // Polygon Amoy
    name: "Polygon Amoy",
    rpcUrl:
      process.env.NEXT_PUBLIC_POLYGON_RPC ||
      "https://rpc-amoy.polygon.technology",
    blockExplorer: "https://amoy.polygonscan.com",
    contractAddress:
      process.env.NEXT_PUBLIC_POLYGON_PAYMENT_PROCESSOR_ADDRESS || "",
    nativeCurrency: { name: "MATIC", symbol: "MATIC", decimals: 18 },
  },
};
