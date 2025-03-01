require("@nomicfoundation/hardhat-toolbox");
require("@nomicfoundation/hardhat-ledger");
require("dotenv").config();

const SEPOLIA_RPC_URL = process.env.SEPOLIA_RPC_URL;
const ETHERSCAN_KEY = process.env.ETHERSCAN_KEY;

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  defaultNetwork: "hardhat",
  networks: {
    sepolia: {
      url: SEPOLIA_RPC_URL,
      ledgerAccounts: [
        process.env.LEDGER_ACCOUNT,
      ],
      chainId: 11155111,
      gasPrice: 100000000000,
    },
  },
  etherscan: {
    apiKey: ETHERSCAN_KEY,
  },
  gasReporter: {
    enabled: false,
  },
  solidity: {
    compilers: [
      {
        version: "0.8.16",
        settings: {
          optimizer: {
            enabled: true,
            runs: 1000,
          },
        },
      },
      {
        version: "0.4.15",
        settings: {
          optimizer: {
            enabled: true,
            runs: 1000,
          },
        },
      },
    ],
  },
};
