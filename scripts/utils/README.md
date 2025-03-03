# Utility Scripts

This directory contains utility functions used across the MultiSig wallet scripts.

## Tenderly Integration

The `tenderly.js` file provides integration with Tenderly's simulation API, allowing users to preview transaction execution before confirming transactions on-chain.

### Simulation of confirmTransaction

The Tenderly integration simulates the actual `confirmTransaction()` call that the signer will make to the multisig contract. This allows signers to:

1. Verify that their confirmation transaction will succeed
2. See how much gas it will cost
3. Know if their confirmation will trigger execution of the underlying transaction
4. Preview any events that will be emitted

### Prerequisites

To use the Tenderly simulation feature, you need to:

1. Create a Tenderly account at [tenderly.co](https://tenderly.co)
2. Create a project in Tenderly dashboard
3. Generate an API access key

Once you have these, add the following environment variables to your `.env` file:

```
TENDERLY_ACCOUNT_SLUG=your-account-name
TENDERLY_PROJECT_SLUG=your-project-name
TENDERLY_ACCESS_KEY=your-access-key
```

### Features

The Tenderly simulation API provides:

- Transaction execution preview (success/failure)
- Gas usage estimation
- ETH balance changes
- Prediction of whether the transaction will be executed
- Detailed error messages if the transaction would fail

This simulation happens in Tenderly's environment without actually executing the transaction on-chain, making it a safe way to preview transaction outcomes before committing to them.

### Usage

The `simulateWithTenderly` function is used in the multisig wallet scripts to provide transaction preview capabilities before confirming transactions.

```javascript
const { simulateWithTenderly } = require('./utils/tenderly');

// Later in your code
const simulationResult = await simulateWithTenderly(
  transaction,
  multiSigWallet,
  transactionId,
  signerAddress
);
```

For more details on Tenderly's simulation capabilities, see the [official documentation](https://docs.tenderly.co/simulations/single-simulations). 