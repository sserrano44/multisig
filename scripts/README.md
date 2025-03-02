# MultiSigWallet Scripts

This directory contains scripts for deploying and interacting with the MultiSigWallet contract.

## Deployment Scripts

### deploy.js (Interactive)

An interactive script that deploys the MultiSigWallet contract with user-specified parameters.

#### Features

- Interactive CLI interface
- Validates inputs for number of signers and required approvals
- Validates Ethereum addresses
- Prevents duplicate signer addresses
- Confirms deployment details before proceeding
- Automatically verifies contract on Etherscan (for non-local networks)
- Provides a detailed deployment summary

#### Usage

To run the deployment script:

```bash
npx hardhat run scripts/deploy.js --network <network-name>
```

Where `<network-name>` is one of the networks configured in your `hardhat.config.js` file (e.g., `hardhat`, `localhost`, `sepolia`).

#### Example Interaction

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

#### Notes

- The script enforces the maximum owner count of 7 as defined in the contract.
- If you press Enter when prompted for a signer address, the deployer's address will be used.
- The script validates that the required approvals is greater than 0 and less than or equal to the number of signers.
- Contract verification on Etherscan is attempted automatically for non-local networks.

### deploy-cli.js (Command-line Arguments)

A non-interactive script that deploys the MultiSigWallet contract using command-line arguments.

#### Features

- Accepts command-line arguments for deployment parameters
- Supports specifying a number of signers or a list of specific addresses
- Validates inputs and Ethereum addresses
- Prevents duplicate signer addresses
- Automatically verifies contract on Etherscan (for non-local networks)
- Provides a detailed deployment summary

#### Usage

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

#### Examples

```bash
# Deploy with 3 signers (using deployer's address) and 2 required approvals
npx hardhat run scripts/deploy-cli.js --network sepolia -- --signers 3 --required 2

# Deploy with specific signer addresses and 2 required approvals
npx hardhat run scripts/deploy-cli.js --network sepolia -- --signers 0x123...,0x456...,0x789... --required 2

# Deploy with default values (1 signer, 1 required approval)
npx hardhat run scripts/deploy-cli.js --network sepolia
```

## Transaction Scripts

### submit-transaction.js

An interactive script that allows users to submit different types of transactions to a deployed MultiSigWallet contract.

#### Features

- Supports three types of transactions:
  - ETH transfers
  - ERC-20 token transfers
  - Custom contract interactions
- Validates inputs and Ethereum addresses
- Encodes function calls for ERC-20 transfers and custom contract interactions
- Displays transaction details before submission
- Shows confirmation status after submission

#### Usage

To run the transaction submission script:

```bash
npx hardhat run scripts/submit-transaction.js --network <network-name>
```

#### Example Interaction

```
MultiSigWallet Transaction Submission Script
===========================================

Connected with account: 0x5B38Da6a701c568545dCfcB03FcB875f56beddC4

Enter the MultiSigWallet contract address: 0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0

Account 0x5B38Da6a701c568545dCfcB03FcB875f56beddC4 is a signer of this MultiSigWallet.

Select transaction type:
1. ETH transfer
2. ERC-20 token transfer
3. Custom contract interaction
Enter your choice (1-3): 2

ERC-20 Token Transfer
--------------------
Enter token contract address: 0xabc...
Enter recipient address: 0xdef...
Enter amount (in tokens): 100

Transaction Details:
------------------
Type: ERC-20 Token Transfer
Destination: 0xabc...
Value: 0 ETH
Data: 0xa9059cbb000000000000000000000000def...0000000000000000000000000000000000000000000000056bc75e2d63100000

Submit this transaction? (y/n): y

Submitting transaction...
Transaction submitted with ID: 1
Transaction hash: 0x789...

This transaction requires 2 confirmations to be executed.
You have already confirmed it by submitting. Additional signers need to confirm it.
Current confirmation count: 1
Additional confirmations needed: 1
```

### confirm-transaction.js

An interactive script that allows signers to confirm or revoke confirmations for transactions in a deployed MultiSigWallet contract.

#### Features

- Validates that the connected account is a signer of the MultiSigWallet
- Displays transaction details
- Shows current confirmation status
- Allows signers to confirm or revoke confirmations
- Handles already confirmed and executed transactions

#### Usage

To run the transaction confirmation script:

```bash
npx hardhat run scripts/confirm-transaction.js --network <network-name>
```

#### Example Interaction

```
MultiSigWallet Transaction Confirmation Script
============================================

Connected with account: 0xAb8483F64d9C6d1EcF9b849Ae677dD3315835cb2

Enter the MultiSigWallet contract address: 0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0

Account 0xAb8483F64d9C6d1EcF9b849Ae677dD3315835cb2 is a signer of this MultiSigWallet.

Enter the transaction ID to confirm: 1

Transaction Details:
------------------
Destination: 0xabc...
Value: 0 ETH
Executed: false

Confirmation count: 1 of 2 required
Confirmed by:
- 0x5B38Da6a701c568545dCfcB03FcB875f56beddC4

Do you want to confirm this transaction? (y/n): y

Confirming transaction...
Transaction confirmed successfully!
Transaction hash: 0x123...

Transaction was executed! (Transaction ID: 1)
```

### list-transactions.js

An interactive script that lists all transactions in a deployed MultiSigWallet contract and allows signers to confirm or revoke confirmations.

#### Features

- Displays MultiSigWallet information (address, required confirmations, owners, etc.)
- Filters transactions by status (all, pending, executed)
- Shows detailed transaction information
- Decodes ERC-20 transfer data when possible
- Allows signers to confirm or revoke confirmations for transactions

#### Usage

To run the transaction list script:

```bash
npx hardhat run scripts/list-transactions.js --network <network-name>
```

#### Example Interaction

```
MultiSigWallet Transaction List Script
=====================================

Connected with account: 0x5B38Da6a701c568545dCfcB03FcB875f56beddC4

Enter the MultiSigWallet contract address: 0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0

MultiSigWallet Information:
---------------------------
Address: 0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0
Required confirmations: 2
Number of owners: 3
Total transactions: 2
Connected account is a signer: Yes

Filter options:
1. All transactions
2. Pending transactions only
3. Executed transactions only
Enter your choice (1-3): 1

Found 2 transactions with the selected filters.

Transactions:
-------------

Transaction ID: 0
Destination: 0x4B20993Bc481177ec7E8f571ceCaE8A9e22C02db
Value: 0.1 ETH
Data: Empty (0x)
Executed: Yes
Confirmations: 2 of 2 required
Confirmed by:
- 0x5B38Da6a701c568545dCfcB03FcB875f56beddC4 (you)
- 0xAb8483F64d9C6d1EcF9b849Ae677dD3315835cb2

--------------------------------------------------

Transaction ID: 1
Destination: 0xabc...
Value: 0 ETH
Data: ERC-20 Transfer: 100000000000000000000 tokens to 0xdef...
Executed: Yes
Confirmations: 2 of 2 required
Confirmed by:
- 0x5B38Da6a701c568545dCfcB03FcB875f56beddC4 (you)
- 0xAb8483F64d9C6d1EcF9b849Ae677dD3315835cb2

Do you want to confirm or revoke a transaction? (c/r/n): n
