const { ethers } = require("hardhat");
const axios = require("axios");

/**
 * Simulates the confirmTransaction call to the multisig wallet using Tenderly API
 * @param {Object} transaction - The transaction object from the multisig wallet
 * @param {Object} multiSigWallet - The MultiSigWallet contract instance
 * @param {number} transactionId - The ID of the transaction
 * @param {string} signerAddress - Address of the signer confirming the transaction
 * @returns {Promise<boolean>} - Returns true if simulation was successful, false otherwise
 */
async function simulateWithTenderly(transaction, multiSigWallet, transactionId, signerAddress) {
  try {
    const { TENDERLY_ACCOUNT_SLUG, TENDERLY_PROJECT_SLUG, TENDERLY_ACCESS_KEY } = process.env;
    
    if (!TENDERLY_ACCOUNT_SLUG || !TENDERLY_PROJECT_SLUG || !TENDERLY_ACCESS_KEY) {
      console.log("\nTenderly environment variables not found. Please add TENDERLY_ACCOUNT_SLUG, TENDERLY_PROJECT_SLUG, and TENDERLY_ACCESS_KEY to your .env file.");
      return false;
    }

    console.log("\nSimulating confirmTransaction call with Tenderly...");
    
    // Get network ID from the network name
    const network = await ethers.provider.getNetwork();
    const networkId = network.chainId.toString();
    
    // Encode the function call to confirmTransaction(uint256 transactionId)
    const confirmTxData = multiSigWallet.interface.encodeFunctionData(
      "confirmTransaction",
      [transactionId]
    );
    
    // Get the current gas price
    const gasPrice = await ethers.provider.getGasPrice();
    
    // Get the transaction data for simulation
    const simulationData = {
      network_id: networkId,
      from: signerAddress,
      to: multiSigWallet.address,
      gas: 1000000,  // High gas limit for simulation
      gas_price: gasPrice.toString(),
      value: "0",  // No ETH sent with confirmation
      input: confirmTxData,
      simulation_type: "full",
      save: true
    };

    console.log("\nSimulation request details:");
    console.log(`Network ID: ${networkId}`);
    console.log(`From: ${signerAddress}`);
    console.log(`To (MultiSig): ${multiSigWallet.address}`);
    console.log(`Transaction ID: ${transactionId}`);

    // Make API call to Tenderly
    const simulationResponse = await axios.post(
      `https://api.tenderly.co/api/v1/account/${TENDERLY_ACCOUNT_SLUG}/project/${TENDERLY_PROJECT_SLUG}/simulate`,
      simulationData,
      {
        headers: {
          'X-Access-Key': TENDERLY_ACCESS_KEY
        }
      }
    );

    const simulationResult = simulationResponse.data;
    
    // Display simulation results
    console.log("\n====== Tenderly Simulation Results ======");
    console.log(`Simulation of confirmTransaction(${transactionId})`);
    console.log(`Status: ${simulationResult.transaction.status ? 'Success ✅' : 'Failed ❌'}`);
    
    if (simulationResult.transaction.status) {
      console.log(`Gas used: ${simulationResult.transaction.gas_used}`);
      
      // Check if the transaction will be executed as a result of this confirmation
      const requiredConfirmations = await multiSigWallet.required();
      const currentConfirmations = await multiSigWallet.getConfirmationCount(transactionId);
      
      // Account for the confirmation being simulated - properly handle BigNumber
      const requiredNumber = parseInt(requiredConfirmations.toString());
      const currentNumber = parseInt(currentConfirmations.toString());

      const confirmationAfterThis = currentNumber + 1;
      
      if (confirmationAfterThis >= requiredNumber && !transaction.executed) {
        console.log("\n⚠️ This confirmation will trigger execution of the multisig transaction!");
      } else {
        console.log(`\nConfirmations after this: ${confirmationAfterThis}/${requiredNumber} required`);
      }
      
      // Display events emitted
      if (simulationResult.transaction.transaction_info && 
          simulationResult.transaction.transaction_info.logs && 
          simulationResult.transaction.transaction_info.logs.length > 0) {
        console.log("\nEvents that will be emitted:");
        for (const log of simulationResult.transaction.transaction_info.logs) {
          if (log.name) {
            console.log(`- ${log.name}`);
          }
        }
      }
      
      // Display balance changes if available
      if (simulationResult.transaction.balance_changes && simulationResult.transaction.balance_changes.length > 0) {
        console.log("\nBalance Changes from confirmation transaction:");
        for (const change of simulationResult.transaction.balance_changes) {
          console.log(`- Address: ${change.address}`);
          console.log(`  Change: ${ethers.utils.formatEther(change.delta)} ETH`);
        }
      }
    } else {
      console.log("\nTransaction would fail with error:");
      console.log(simulationResult.transaction.error_message);
    }
    
    console.log("\nFor detailed simulation results, check Tenderly dashboard.");
    return true;
  } catch (error) {
    console.log(`\nError simulating transaction with Tenderly: ${error.message}`);
    if (error.response) {
      console.log(`Status: ${error.response.status}`);
      console.log(`Details: ${JSON.stringify(error.response.data)}`);
    }
    return false;
  }
}

module.exports = {
  simulateWithTenderly
}; 