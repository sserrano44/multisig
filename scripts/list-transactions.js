const { ethers } = require("hardhat");
const readline = require("readline");

// Create readline interface for user input
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Promise wrapper for readline question
function question(query) {
  return new Promise(resolve => {
    rl.question(query, resolve);
  });
}

// Validate Ethereum address
function isValidAddress(address) {
  return ethers.utils.isAddress(address);
}

// Format transaction data for display
function formatTransactionData(data) {
  if (!data || data === "0x") {
    return "Empty (0x)";
  }
  
  // Try to decode ERC-20 transfer
  try {
    const erc20Interface = new ethers.utils.Interface([
      "function transfer(address to, uint256 amount) returns (bool)"
    ]);
    
    const decoded = erc20Interface.parseTransaction({ data });
    if (decoded.name === "transfer") {
      return `ERC-20 Transfer: ${ethers.utils.formatUnits(decoded.args.amount, 18)} tokens to ${decoded.args.to}`;
    }
  } catch (error) {
    // Not an ERC-20 transfer, continue
  }
  
  // Return the raw data
  return data.length > 66 ? `${data.substring(0, 66)}...` : data;
}

async function main() {
  console.log("MultiSigWallet Transaction List Script");
  console.log("=====================================");
  
  // Get signer account
  const [signer] = await ethers.getSigners();
  console.log(`\nConnected with account: ${signer.address}`);
  
  // Get MultiSigWallet address
  let multiSigAddress;
  while (true) {
    multiSigAddress = await question("\nEnter the MultiSigWallet contract address: ");
    
    if (!isValidAddress(multiSigAddress)) {
      console.log("Please enter a valid Ethereum address.");
      continue;
    }
    
    break;
  }
  
  // Connect to the MultiSigWallet contract
  const MultiSigWallet = await ethers.getContractFactory("MultiSigWallet");
  const multiSigWallet = await MultiSigWallet.attach(multiSigAddress);
  
  // Get MultiSigWallet information
  try {
    const required = await multiSigWallet.required();
    const owners = await multiSigWallet.getOwners();
    const transactionCount = await multiSigWallet.transactionCount();
    const isOwner = await multiSigWallet.isOwner(signer.address);
    
    console.log("\nMultiSigWallet Information:");
    console.log("---------------------------");
    console.log(`Address: ${multiSigAddress}`);
    console.log(`Required confirmations: ${required}`);
    console.log(`Number of owners: ${owners.length}`);
    console.log(`Total transactions: ${transactionCount}`);
    console.log(`Connected account is a signer: ${isOwner ? "Yes" : "No"}`);
    
    // Get filter options
    console.log("\nFilter options:");
    console.log("1. All transactions");
    console.log("2. Pending transactions only");
    console.log("3. Executed transactions only");
    
    let filterOption;
    while (true) {
      const choice = await question("Enter your choice (1-3): ");
      filterOption = parseInt(choice);
      
      if (isNaN(filterOption) || filterOption < 1 || filterOption > 3) {
        console.log("Please enter a valid choice (1-3).");
        continue;
      }
      
      break;
    }
    
    // Set filter parameters
    const includePending = filterOption === 1 || filterOption === 2;
    const includeExecuted = filterOption === 1 || filterOption === 3;
    
    // Get transaction IDs based on filter
    const transactionIds = await multiSigWallet.getTransactionIds(0, transactionCount, includePending, includeExecuted);
    
    console.log(`\nFound ${transactionIds.length} transactions with the selected filters.`);
    
    if (transactionIds.length === 0) {
      console.log("No transactions to display.");
      rl.close();
      return;
    }
    
    console.log("\nTransactions:");
    console.log("-------------");
    
    // Display transactions
    for (let i = 0; i < transactionIds.length; i++) {
      const txId = transactionIds[i];
      const transaction = await multiSigWallet.transactions(txId);
      
      console.log(`\nTransaction ID: ${txId}`);
      console.log(`Destination: ${transaction.destination}`);
      console.log(`Value: ${ethers.utils.formatEther(transaction.value)} ETH`);
      console.log(`Data: ${formatTransactionData(transaction.data)}`);
      console.log(`Executed: ${transaction.executed ? "Yes" : "No"}`);
      
      // Get confirmation count and confirmations
      const confirmationCount = await multiSigWallet.getConfirmationCount(txId);
      const confirmations = await multiSigWallet.getConfirmations(txId);
      
      console.log(`Confirmations: ${confirmationCount} of ${required} required`);
      
      if (confirmations.length > 0) {
        console.log("Confirmed by:");
        for (const confirmer of confirmations) {
          console.log(`- ${confirmer}${confirmer === signer.address ? " (you)" : ""}`);
        }
      }
      
      if (i < transactionIds.length - 1) {
        console.log("\n--------------------------------------------------");
      }
    }
    
    // Ask if they want to confirm or revoke a transaction
    if (isOwner) {
      const action = await question("\nDo you want to confirm or revoke a transaction? (c/r/n): ");
      
      if (action.toLowerCase() === "c" || action.toLowerCase() === "r") {
        // Get transaction ID
        let txId;
        while (true) {
          const input = await question("Enter the transaction ID: ");
          txId = parseInt(input);
          
          if (isNaN(txId) || txId < 0 || txId >= transactionCount) {
            console.log(`Please enter a valid transaction ID (0-${transactionCount - 1}).`);
            continue;
          }
          
          break;
        }
        
        // Get transaction details
        const transaction = await multiSigWallet.transactions(txId);
        
        if (action.toLowerCase() === "c") {
          // Confirm transaction
          if (transaction.executed) {
            console.log("This transaction has already been executed and cannot be confirmed.");
          } else {
            const isConfirmed = await multiSigWallet.confirmations(txId, signer.address);
            if (isConfirmed) {
              console.log("You have already confirmed this transaction.");
            } else {
              console.log("\nConfirming transaction...");
              
              try {
                const tx = await multiSigWallet.confirmTransaction(txId);
                const receipt = await tx.wait();
                
                console.log("Transaction confirmed successfully!");
                console.log(`Transaction hash: ${receipt.transactionHash}`);
                
                // Check if the transaction was executed
                const executionEvent = receipt.events.find(event => event.event === "Execution");
                if (executionEvent) {
                  console.log(`\nTransaction was executed! (Transaction ID: ${txId})`);
                }
              } catch (error) {
                console.log(`Error confirming transaction: ${error.message}`);
              }
            }
          }
        } else if (action.toLowerCase() === "r") {
          // Revoke confirmation
          if (transaction.executed) {
            console.log("This transaction has already been executed and confirmations cannot be revoked.");
          } else {
            const isConfirmed = await multiSigWallet.confirmations(txId, signer.address);
            if (!isConfirmed) {
              console.log("You have not confirmed this transaction, so there is nothing to revoke.");
            } else {
              console.log("\nRevoking confirmation...");
              
              try {
                const tx = await multiSigWallet.revokeConfirmation(txId);
                const receipt = await tx.wait();
                
                console.log("Confirmation revoked successfully!");
                console.log(`Transaction hash: ${receipt.transactionHash}`);
              } catch (error) {
                console.log(`Error revoking confirmation: ${error.message}`);
              }
            }
          }
        }
      }
    }
  } catch (error) {
    console.log(`Error getting MultiSigWallet information: ${error.message}`);
  }
  
  rl.close();
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    rl.close();
    process.exit(1);
  });
