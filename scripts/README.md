# MultiSigWallet Deployment Scripts

This directory contains scripts for deploying the MultiSigWallet contract.

## deploy.js (Interactive)

An interactive script that deploys the MultiSigWallet contract with user-specified parameters.

### Features

- Interactive CLI interface
- Validates inputs for number of signers and required approvals
- Validates Ethereum addresses
- Prevents duplicate signer addresses
- Confirms deployment details before proceeding
- Automatically verifies contract on Etherscan (for non-local networks)
- Provides a detailed deployment summary

### Usage

To run the deployment script:

```bash
npx hardhat run scripts/deploy.js --network <network-name>
```

Where `<network-name>` is one of the networks configured in your `hardhat.config.js` file (e.g., `hardhat`, `localhost`, `sepolia`).

### Example Interaction

```
MultiSigWallet Deployment Script
================================
Deploying from account: 0x5B38Da6a701c568545dCfcB03FcB875f56beddC4

Enter the number of signers (1-7): 3

Enter address for signer 1 (or press Enter to use deployer address): 0x5B38Da6a701c568545dCfcB03FcB875f56beddC4
Enter address for signer 2 (or press Enter to use deployer address): 0xAb8483F64d9C6d1EcF9b849Ae677dD3315835cb2
Enter address for signer 3 (or press Enter to use deployer address): 0x4B20993Bc481177ec7E8f571ceCaE8A9e22C02db

Enter the required number of approvals (1-3): 2

Deployment Details:
------------------
Number of signers: 3
Signer addresses:
  1. 0x5B38Da6a701c568545dCfcB03FcB875f56beddC4
  2. 0xAb8483F64d9C6d1EcF9b849Ae677dD3315835cb2
  3. 0x4B20993Bc481177ec7E8f571ceCaE8A9e22C02db
Required approvals: 2

Deploy with these parameters? (y/n): y

Deploying MultiSigWallet...

MultiSigWallet deployed to: 0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0
Transaction hash: 0x...

Deployment Summary:
------------------
Network: hardhat
Contract address: 0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0
Number of signers: 3
Required approvals: 2
```

### Notes

- The script enforces the maximum owner count of 7 as defined in the contract.
- If you press Enter when prompted for a signer address, the deployer's address will be used.
- The script validates that the required approvals is greater than 0 and less than or equal to the number of signers.
- Contract verification on Etherscan is attempted automatically for non-local networks.

## test-deploy.js (Testing)

A script for testing the deployment and basic functionality of the MultiSigWallet contract without requiring user input.

### Features

- Automatically deploys the MultiSigWallet with 3 signers and 2 required approvals
- Uses the Hardhat default signers for testing
- Verifies the contract state after deployment
- Tests transaction submission and confirmation
- Checks confirmation status and counts

### Usage

To run the test deployment script:

```bash
npx hardhat run scripts/test-deploy.js
```

This script is intended to be run on the Hardhat network for testing purposes. It will:

1. Deploy the MultiSigWallet contract with 3 signers and 2 required approvals
2. Verify the contract state (owners and required approvals)
3. Submit a test transaction from the first signer
4. Confirm the transaction with the second signer
5. Check if the transaction is confirmed
6. Get the confirmation count and list of confirmations

This is useful for quickly verifying that the contract deployment and basic functionality work as expected before deploying to a testnet or mainnet.

## deploy-cli.js (Command-line Arguments)

A non-interactive script that deploys the MultiSigWallet contract using command-line arguments.

### Features

- Accepts command-line arguments for deployment parameters
- Supports specifying a number of signers or a list of specific addresses
- Validates inputs and Ethereum addresses
- Prevents duplicate signer addresses
- Automatically verifies contract on Etherscan (for non-local networks)
- Provides a detailed deployment summary

### Usage

To run the CLI deployment script:

```bash
npx hardhat run scripts/deploy-cli.js --network <network-name> -- --signers <number-or-addresses> --required <number>
```

Where:
- `<network-name>` is one of the networks configured in your `hardhat.config.js` file
- `--signers` can be either:
  - A number (e.g., `3`) to use the deployer's address for that many signers
  - A comma-separated list of Ethereum addresses (e.g., `0x123...,0x456...,0x789...`)
- `--required` is the number of required approvals

### Examples

```bash
# Deploy with 3 signers (using deployer's address) and 2 required approvals
npx hardhat run scripts/deploy-cli.js --network sepolia -- --signers 3 --required 2

# Deploy with specific signer addresses and 2 required approvals
npx hardhat run scripts/deploy-cli.js --network sepolia -- --signers 0x123...,0x456...,0x789... --required 2

# Deploy with default values (1 signer, 1 required approval)
npx hardhat run scripts/deploy-cli.js --network sepolia
```

