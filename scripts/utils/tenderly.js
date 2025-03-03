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

/**
 * Simulates the confirmation of all remaining signers and transaction execution
 * @param {Object} transaction - The transaction object from the multisig wallet
 * @param {Object} multiSigWallet - The MultiSigWallet contract instance
 * @param {number} transactionId - The ID of the transaction
 * @param {string} currentSigner - Address of the current signer
 * @returns {Promise<boolean>} - Returns true if simulation was successful, false otherwise
 */
async function simulateFullExecutionPath(transaction, multiSigWallet, transactionId, currentSigner) {
  try {
    const { TENDERLY_ACCOUNT_SLUG, TENDERLY_PROJECT_SLUG, TENDERLY_ACCESS_KEY } = process.env;
    
    if (!TENDERLY_ACCOUNT_SLUG || !TENDERLY_PROJECT_SLUG || !TENDERLY_ACCESS_KEY) {
      console.log("\nTenderly environment variables not found. Please add TENDERLY_ACCOUNT_SLUG, TENDERLY_PROJECT_SLUG, and TENDERLY_ACCESS_KEY to your .env file.");
      return false;
    }

    console.log("\n====== Simulating Full Execution Path ======");
    
    // Get network info
    const network = await ethers.provider.getNetwork();
    const networkId = network.chainId.toString();
    
    // Get current gas price
    const gasPrice = await ethers.provider.getGasPrice();
    
    // Get all owners and required confirmations
    const owners = await multiSigWallet.getOwners();
    const requiredConfirmations = await multiSigWallet.required();
    const requiredNumber = parseInt(requiredConfirmations.toString());
    
    // Get current confirmations and confirmers
    const currentConfirmers = await multiSigWallet.getConfirmations(transactionId);
    const currentConfirmations = currentConfirmers.length;
    
    console.log(`\nTransaction ID: ${transactionId}`);
    console.log(`Current confirmations: ${currentConfirmations}/${requiredNumber}`);
    
    // If already executed, nothing to simulate
    if (transaction.executed) {
      console.log("\nTransaction already executed - nothing to simulate.");
      return true;
    }
    
    // Get remaining signers who haven't confirmed yet
    const remainingSigners = owners.filter(
      owner => !currentConfirmers.includes(owner) && owner !== currentSigner
    );
    
    // Calculate how many more confirmations are needed
    const alreadyConfirmed = currentConfirmers.includes(currentSigner);
    const confirmedCount = currentConfirmations + (alreadyConfirmed ? 0 : 1);
    const neededCount = Math.max(0, requiredNumber - confirmedCount);
    
    if (remainingSigners.length < neededCount) {
      console.log(`\n⚠️ Not enough remaining signers (${remainingSigners.length}) to reach required confirmations (${requiredNumber})`);
      return false;
    }
    
    // Build the bundle of simulations
    const simulationBundle = {
      simulations: []
    };
    
    // First add current signer's confirmation if not already confirmed
    if (!alreadyConfirmed) {
      console.log(`\nAdding current signer (${currentSigner}) to simulation`);
      
      const confirmTxData = multiSigWallet.interface.encodeFunctionData(
        "confirmTransaction",
        [transactionId]
      );
      
      simulationBundle.simulations.push({
        network_id: networkId,
        from: currentSigner,
        to: multiSigWallet.address,
        gas: 1000000,
        gas_price: gasPrice.toString(),
        value: "0",
        input: confirmTxData,
        simulation_type: "full",
        save: true
      });
    }
    
    // Then add remaining signers needed for threshold
    if (neededCount > 0) {
      const signersNeeded = remainingSigners.slice(0, neededCount);
      console.log(`\nNeeded ${neededCount} more confirmations from: ${signersNeeded.join(', ').substring(0, 60)}${signersNeeded.join(', ').length > 60 ? '...' : ''}`);
      
      for (let i = 0; i < neededCount; i++) {
        const signer = remainingSigners[i];
        
        const confirmTxData = multiSigWallet.interface.encodeFunctionData(
          "confirmTransaction",
          [transactionId]
        );
        
        simulationBundle.simulations.push({
          network_id: networkId,
          from: signer,
          to: multiSigWallet.address,
          gas: 1000000,
          gas_price: gasPrice.toString(),
          value: "0",
          input: confirmTxData,
          simulation_type: "full",
          save: true
        });
      }
    }
    
    // If we have enough confirmations, add an explicit executeTransaction call
    if (neededCount === 0 && !transaction.executed) {
      console.log("\nAll required confirmations will be present, adding executeTransaction call");
      
      const executeTxData = multiSigWallet.interface.encodeFunctionData(
        "executeTransaction",
        [transactionId]
      );
      
      simulationBundle.simulations.push({
        network_id: networkId,
        from: currentSigner,
        to: multiSigWallet.address,
        gas: 5000000, // Higher gas limit for execution
        gas_price: gasPrice.toString(),
        value: "0",
        input: executeTxData,
        simulation_type: "full",
        save: true
      });
    }
    
    if (simulationBundle.simulations.length === 0) {
      console.log("\nNo transactions to simulate.");
      return true;
    }
    
    console.log(`\nSimulating bundle with ${simulationBundle.simulations.length} transaction(s)...`);
    
    // Make API call to Tenderly for the bundled simulation
    const bundleResponse = await axios.post(
      `https://api.tenderly.co/api/v1/account/${TENDERLY_ACCOUNT_SLUG}/project/${TENDERLY_PROJECT_SLUG}/simulate-bundle`,
      simulationBundle,
      {
        headers: {
          'X-Access-Key': TENDERLY_ACCESS_KEY,
          'Content-Type': 'application/json'
        }
      }
    );
    
    const bundleResult = bundleResponse.data;
    
    console.log("\n====== Bundled Simulation Results ======");
    
    if (!bundleResult.simulation_results || bundleResult.simulation_results.length === 0) {
      console.log("\nNo simulation results returned.");
      return false;
    }
    
    // Process simulation results
    let executionDetected = false;
    let executionFailureDetected = false;
    let failureReason = null;
    
    for (let i = 0; i < bundleResult.simulation_results.length; i++) {
      const simResult = bundleResult.simulation_results[i];
      
      // Skip if there's no simulation object
      if (!simResult.simulation) continue;
      
      // Check if simulation failed
      if (!simResult.simulation.status) {
        console.log(`\nSimulation ${i+1} failed: ${simResult.simulation.error_message || "Unknown error"}`);
        failureReason = simResult.simulation.error_message;
        continue;
      }
      
      // Check if transaction failed
      if (simResult.transaction && !simResult.transaction.status) {
        console.log(`\nTransaction in simulation ${i+1} failed: ${simResult.transaction.error_message || "Unknown error"}`);
        failureReason = simResult.transaction.error_message;
        continue;
      }
      
      // Check for execution events
      const logs = simResult.transaction?.transaction_info?.logs || [];
      
      for (const log of logs) {
        if (log.name === "Execution" && log.inputs?.some(input => input.value === transactionId.toString() || 
                                                       parseInt(input.value) === parseInt(transactionId))) {
          executionDetected = true;
          console.log(`\nExecution detected in simulation ${i+1}`);
        } else if (log.name === "ExecutionFailure" && log.inputs?.some(input => input.value === transactionId.toString() || 
                                                              parseInt(input.value) === parseInt(transactionId))) {
          executionFailureDetected = true;
          console.log(`\nExecution failure detected in simulation ${i+1}`);
        }
      }
    }
    
    // Report final result
    if (executionDetected) {
      console.log("\n✅ The transaction would execute successfully!");
    } else if (executionFailureDetected) {
      console.log("\n❌ The transaction would execute but fail!");
      if (failureReason) {
        console.log(`Reason: ${failureReason}`);
      }
    } else {
      if (neededCount === 0) {
        console.log("\n⚠️ All confirmations would be present but no execution was detected.");
        console.log("This could mean the transaction was already executed or cannot be executed.");
      } else {
        console.log(`\nSimulation completed. Additional confirmations still needed.`);
        console.log(`Current: ${confirmedCount}, Required: ${requiredNumber}`);
      }
    }
    
    // Provide dashboard link
    console.log(`\nView details: https://dashboard.tenderly.co/${TENDERLY_ACCOUNT_SLUG}/${TENDERLY_PROJECT_SLUG}/simulator`);
    
    return true;
    
  } catch (error) {
    console.log(`\nError simulating full execution path: ${error.message}`);
    if (error.response) {
      console.log(`Status: ${error.response.status}`);
    }
    return false;
  }
}

/**
 * Analyzes the execution outcome of a multisig transaction
 * @param {Object} simulationResult - The simulation result from Tenderly
 * @param {Object} transaction - The transaction object from the multisig wallet
 */
async function analyzeExecutionOutcome(simulationResult, transaction) {
  try {
    // Parse the destination function call if available
    if (transaction.data && transaction.data.length >= 10) {
      const functionSelector = transaction.data.slice(0, 10);
      console.log(`\nFunction selector: ${functionSelector}`);
      
      // Common known selectors - can be expanded
      const knownSelectors = {
        '0xa9059cbb': 'transfer(address,uint256)',
        '0x095ea7b3': 'approve(address,uint256)',
        '0x23b872dd': 'transferFrom(address,address,uint256)',
        '0x7065cb48': 'addOwner(address)',
        '0x173825d9': 'removeOwner(address)',
        '0xe20056e6': 'replaceOwner(address,address)',
        '0xba51a6df': 'changeRequirement(uint256)'
      };
      
      if (knownSelectors[functionSelector]) {
        console.log(`Function identified: ${knownSelectors[functionSelector]}`);
      }
    }
    
    // Display detailed outcome
    console.log("\nTransaction details:");
    console.log(`To: ${transaction.destination}`);
    console.log(`Value: ${ethers.utils.formatEther(transaction.value)} ETH`);
    
    // Display events from the underlying contract call
    const logs = simulationResult.transaction && 
                simulationResult.transaction.transaction_info && 
                simulationResult.transaction.transaction_info.logs 
                  ? simulationResult.transaction.transaction_info.logs 
                  : [];
    
    if (logs.length > 0) {
      // Filter out multisig wallet internal events
      const multisigEvents = ['Confirmation', 'Execution', 'ExecutionFailure'];
      const externalEvents = logs.filter(log => 
        !multisigEvents.includes(log.name)
      );
      
      if (externalEvents.length > 0) {
        console.log("\nEvents from executed contract call:");
        for (const event of externalEvents) {
          console.log(event);
          console.log(`- ${event.name || 'Unnamed Event'}`);
          if (event.inputs) {
            for (const input of event.inputs) {
              console.log(`  ${input.name}: ${input.value}`);
            }
          }
        }
      }
    }
    
    // Display balance changes
    if (simulationResult.transaction && 
        simulationResult.transaction.balance_changes && 
        simulationResult.transaction.balance_changes.length > 0) {
      console.log("\nBalance changes from execution:");
      for (const change of simulationResult.transaction.balance_changes) {
        console.log(`- Address: ${change.address}`);
        console.log(`  Change: ${ethers.utils.formatEther(change.delta)} ETH`);
      }
    }
    
    // Display gas used
    if (simulationResult.transaction) {
      console.log(`\nTotal gas used: ${simulationResult.transaction.gas_used}`);
    }
    
  } catch (error) {
    console.log(`\nError analyzing execution outcome: ${error.message}`);
  }
}

module.exports = {
  simulateWithTenderly,
  simulateFullExecutionPath
}; 