# Multisig Project

This project demonstrates a multisignature wallet implementation using Solidity and Hardhat. It includes contracts for a basic multisig wallet, a multisig wallet with a daily limit, and factories to create instances of these wallets.

## Project Structure

```
.gitignore
contracts/
    factory/
        Factory.sol
        MultiSigWalletFactory.sol
        MultiSigWalletWithDailyLimitFactory.sol
    MultiSigWallet.sol
    MultiSigWalletWithDailyLimit.sol
hardhat.config.js
package.json
README.md
scripts/
    deploy.js
    deploy-cli.js
    README.md
```

### Contracts

- **MultiSigWallet.sol**: A basic multisignature wallet that requires multiple parties to agree on transactions before execution.
- **MultiSigWalletWithDailyLimit.sol**: An extension of the basic multisig wallet that allows an owner to withdraw a daily limit without multisig.
- **Factory.sol**: A base factory contract for creating instances of other contracts.
- **MultiSigWalletFactory.sol**: A factory contract for creating instances of the basic multisig wallet.
- **MultiSigWalletWithDailyLimitFactory.sol**: A factory contract for creating instances of the multisig wallet with a daily limit.

## Setup

1. Clone the repository:
    ```shell
    git clone git@github.com:sserrano44/multisig-code.git
    cd multisig-code
    ```

2. Install dependencies:
    ```shell
    npm install
    ```

3. Create a `.env` file in the root directory and add the following environment variables:
    ```plaintext
    SEPOLIA_RPC_URL=<your-sepolia-rpc-url>
    LEDGER_ACCOUNT=<your-ledger-address>
    ETHERSCAN_KEY=<your-etherscan-key>
    ```

## Usage

### Compile Contracts

To compile the contracts, run:
```shell
npx hardhat compile
```

### Run Tests

To run the tests, execute:
```shell
npx hardhat test
```

To run the tests with gas reporting, execute:
```shell
REPORT_GAS=true npx hardhat test
```

### Deploy Contracts

This project includes two deployment scripts:

#### Interactive Deployment

To deploy the contracts interactively, run:
```shell
npx hardhat run scripts/deploy.js --network <network-name>
```

This script will prompt you for:
- Number of signers (1-7)
- Addresses for each signer (or use deployer address)
- Required number of approvals

#### Command-line Deployment

To deploy using command-line arguments:
```shell
npx hardhat run scripts/deploy-cli.js --network <network-name> -- --signers <number-or-addresses> --required <number>
```

Examples:
```shell
# Deploy with 3 signers (using deployer's address) and 2 required approvals
npx hardhat run scripts/deploy-cli.js --network sepolia -- --signers 3 --required 2

# Deploy with specific signer addresses and 2 required approvals
npx hardhat run scripts/deploy-cli.js --network sepolia -- --signers 0x123...,0x456...,0x789... --required 2
```

#### Test Deployment

To test the deployment and basic functionality without user input:
```shell
npx hardhat run scripts/test-deploy.js
```

This script automatically:
- Deploys the MultiSigWallet with 3 signers and 2 required approvals
- Verifies the contract state
- Tests transaction submission and confirmation
- Checks confirmation status and counts

For more details on all deployment scripts, see [scripts/README.md](scripts/README.md).

### Hardhat Tasks

You can also try running some of the following Hardhat tasks:
```shell
npx hardhat help
npx hardhat node
```

## License

This project is licensed under the GPL-3.0-or-later License.
