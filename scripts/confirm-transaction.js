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

async function main() {
  console.log("MultiSigWallet Transaction Confirmation Script");
  console.log("============================================");
  
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
  
  // Check if the connected account is a signer of the MultiSigWallet
  try {
    const isOwner = await multiSigWallet.isOwner(signer.address);
    if (!isOwner) {
      console.log(`Error: The connected account (${signer.address}) is not a signer of this MultiSigWallet.`);
      console.log("Only signers can confirm transactions.");
      rl.close();
      return;
    }
    console.log(`Account ${signer.address} is a signer of this MultiSigWallet.`);
  } catch (error) {
    console.log(`Error checking if account is a signer: ${error.message}`);
    rl.close();
    return;
  }
  
  // Get transaction ID
  let transactionId;
  while (true) {
    const input = await question("\nEnter the transaction ID to confirm: ");
    transactionId = parseInt(input);
    
    if (isNaN(transactionId) || transactionId < 0) {
      console.log("Please enter a valid transaction ID (non-negative integer).");
      continue;
    }
    
    break;
  }
  
  // Get transaction details
  try {
    const transaction = await multiSigWallet.transactions(transactionId);
    
    console.log("\nTransaction Details:");
    console.log("------------------");
    console.log(`Destination: ${transaction.destination}`);
    console.log(`Value: ${ethers.utils.formatEther(transaction.value)} ETH`);
    console.log(`Executed: ${transaction.executed}`);
    
    if (transaction.executed) {
      console.log("\nThis transaction has already been executed.");
      
      const confirmationStatus = await multiSigWallet.confirmations(transactionId, signer.address);
      if (confirmationStatus) {
        console.log("You have already confirmed this transaction.");
      } else {
        console.log("You have not confirmed this transaction.");
        console.log("Note: Confirming an executed transaction has no effect.");
      }
      
      rl.close();
      return;
    }
    
    // Get confirmation status
    const confirmationStatus = await multiSigWallet.confirmations(transactionId, signer.address);
    if (confirmationStatus) {
      console.log("\nYou have already confirmed this transaction.");
      
      // Ask if they want to revoke the confirmation
      const revoke = await question("Do you want to revoke your confirmation? (y/n): ");
      if (revoke.toLowerCase() === "y") {
        console.log("\nRevoking confirmation...");
        
        try {
          const tx = await multiSigWallet.revokeConfirmation(transactionId);
          const receipt = await tx.wait();
          
          console.log("Confirmation revoked successfully!");
          console.log(`Transaction hash: ${receipt.transactionHash}`);
        } catch (error) {
          console.log(`Error revoking confirmation: ${error.message}`);
        }
      }
      
      rl.close();
      return;
    }
    
    // Get confirmation count and required confirmations
    const confirmationCount = await multiSigWallet.getConfirmationCount(transactionId);
    const required = await multiSigWallet.required();
    
    console.log(`\nConfirmation count: ${confirmationCount} of ${required} required`);
    
    // Get list of confirmations
    const confirmations = await multiSigWallet.getConfirmations(transactionId);
    if (confirmations.length > 0) {
      console.log("Confirmed by:");
      for (const confirmer of confirmations) {
        console.log(`- ${confirmer}`);
      }
    }
    
    // Ask if they want to confirm the transaction
    const confirm = await question("\nDo you want to confirm this transaction? (y/n): ");
    if (confirm.toLowerCase() !== "y") {
      console.log("Confirmation cancelled.");
      rl.close();
      return;
    }
    
    // Confirm the transaction
    console.log("\nConfirming transaction...");
    
    try {
      const tx = await multiSigWallet.confirmTransaction(transactionId);
      const receipt = await tx.wait();
      
      console.log("Transaction confirmed successfully!");
      console.log(`Transaction hash: ${receipt.transactionHash}`);
      
      // Check if the transaction was executed
      const executionEvent = receipt.events.find(event => event.event === "Execution");
      if (executionEvent) {
        console.log(`\nTransaction was executed! (Transaction ID: ${transactionId})`);
      } else {
        // Get updated confirmation count
        const newConfirmationCount = await multiSigWallet.getConfirmationCount(transactionId);
        console.log(`\nCurrent confirmation count: ${newConfirmationCount} of ${required} required`);
        
        if (newConfirmationCount >= required) {
          // Check if the transaction was executed but the event wasn't captured
          const updatedTransaction = await multiSigWallet.transactions(transactionId);
          if (updatedTransaction.executed) {
            console.log(`Transaction was executed! (Transaction ID: ${transactionId})`);
          } else {
            console.log("Transaction has enough confirmations but wasn't executed. It might have failed.");
          }
        } else {
          console.log(`Additional confirmations needed: ${required - newConfirmationCount}`);
        }
      }
    } catch (error) {
      console.log(`Error confirming transaction: ${error.message}`);
    }
  } catch (error) {
    console.log(`Error getting transaction details: ${error.message}`);
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
