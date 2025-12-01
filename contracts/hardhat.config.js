require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();

module.exports = {
  solidity: "0.8.20",
  networks: {
    localhost: { url: "http://127.0.0.1:8545" },

    sepolia: {
      url: process.env.SEPOLIA_RPC,
      accounts: [process.env.PRIVATE_KEY],
    },

    optimismSepolia: {
      url: process.env.OPTIMISM_RPC,
      accounts: [process.env.PRIVATE_KEY],
    },

    zksync: {
      url: process.env.ZKSYNC_RPC,
      accounts: [process.env.PRIVATE_KEY],
    },

    polygonAmoy: {
      url: process.env.POLYGON_RPC,
      accounts: [process.env.PRIVATE_KEY],
    },
  },
};
