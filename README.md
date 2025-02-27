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
    GOERLI_RPC_URL=<your-goerli-rpc-url>
    PRIVATE_KEY=<your-private-key>
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

To deploy the contracts, you can use the Hardhat scripts. For example:
```shell
npx hardhat run scripts/deploy.js
```

### Hardhat Tasks

You can also try running some of the following Hardhat tasks:
```shell
npx hardhat help
npx hardhat node
```

## License

This project is licensed under the GPL-3.0-or-later License.