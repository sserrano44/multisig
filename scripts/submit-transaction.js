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

// Validate amount (must be a positive number)
function isValidAmount(amount) {
  const num = parseFloat(amount);
  return !isNaN(num) && num >= 0;
}

async function main() {
  console.log("MultiSigWallet Transaction Submission Script");
  console.log("===========================================");
  
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
      console.log("Only signers can submit transactions.");
      rl.close();
      return;
    }
    console.log(`Account ${signer.address} is a signer of this MultiSigWallet.`);
  } catch (error) {
    console.log(`Error checking if account is a signer: ${error.message}`);
    rl.close();
    return;
  }
  
  // Get transaction type
  console.log("\nSelect transaction type:");
  console.log("1. ETH transfer");
  console.log("2. ERC-20 token transfer");
  console.log("3. Custom contract interaction");
  
  let transactionType;
  while (true) {
    const choice = await question("Enter your choice (1-3): ");
    transactionType = parseInt(choice);
    
    if (isNaN(transactionType) || transactionType < 1 || transactionType > 3) {
      console.log("Please enter a valid choice (1-3).");
      continue;
    }
    
    break;
  }
  
  let destination;
  let value = ethers.utils.parseEther("0"); // Default to 0 ETH
  let data = "0x"; // Default to empty data
  
  // Process based on transaction type
  if (transactionType === 1) {
    // ETH transfer
    console.log("\nETH Transfer");
    console.log("------------");
    
    // Get recipient address
    while (true) {
      const recipient = await question("Enter recipient address: ");
      
      if (!isValidAddress(recipient)) {
        console.log("Please enter a valid Ethereum address.");
        continue;
      }
      
      if (recipient === ethers.constants.AddressZero) {
        console.log("Zero address is not allowed as a recipient.");
        continue;
      }
      
      destination = recipient;
      break;
    }
    
    // Get ETH amount
    while (true) {
      const amount = await question("Enter amount (in ETH): ");
      
      if (!isValidAmount(amount)) {
        console.log("Please enter a valid amount.");
        continue;
      }
      
      value = ethers.utils.parseEther(amount);
      break;
    }
  } else if (transactionType === 2) {
    // ERC-20 token transfer
    console.log("\nERC-20 Token Transfer");
    console.log("--------------------");
    
    // Get token contract address
    let tokenAddress;
    while (true) {
      tokenAddress = await question("Enter token contract address: ");
      
      if (!isValidAddress(tokenAddress)) {
        console.log("Please enter a valid Ethereum address.");
        continue;
      }
      
      if (tokenAddress === ethers.constants.AddressZero) {
        console.log("Zero address is not allowed as a token address.");
        continue;
      }
      
      destination = tokenAddress;
      break;
    }
    
    // Get recipient address
    let recipient;
    while (true) {
      recipient = await question("Enter recipient address: ");
      
      if (!isValidAddress(recipient)) {
        console.log("Please enter a valid Ethereum address.");
        continue;
      }
      
      if (recipient === ethers.constants.AddressZero) {
        console.log("Zero address is not allowed as a recipient.");
        continue;
      }
      
      break;
    }
    
    // Get token amount
    let amount;
    while (true) {
      amount = await question("Enter amount (in tokens): ");
      
      if (!isValidAmount(amount)) {
        console.log("Please enter a valid amount.");
        continue;
      }
      
      break;
    }
    
    // Create ERC-20 transfer data
    const erc20Interface = new ethers.utils.Interface([
      "function transfer(address to, uint256 amount) returns (bool)"
    ]);
    
    // Convert token amount to wei (assuming 18 decimals)
    const tokenAmount = ethers.utils.parseUnits(amount, 18);
    
    // Encode the function call
    data = erc20Interface.encodeFunctionData("transfer", [recipient, tokenAmount]);
  } else if (transactionType === 3) {
    // Custom contract interaction
    console.log("\nCustom Contract Interaction");
    console.log("--------------------------");
    
    // Get contract address
    while (true) {
      const contractAddress = await question("Enter contract address: ");
      
      if (!isValidAddress(contractAddress)) {
        console.log("Please enter a valid Ethereum address.");
        continue;
      }
      
      if (contractAddress === ethers.constants.AddressZero) {
        console.log("Zero address is not allowed as a contract address.");
        continue;
      }
      
      destination = contractAddress;
      break;
    }
    
    // Get ETH value (if any)
    while (true) {
      const amount = await question("Enter ETH value (if any, in ETH): ");
      
      if (!isValidAmount(amount)) {
        console.log("Please enter a valid amount.");
        continue;
      }
      
      value = ethers.utils.parseEther(amount);
      break;
    }
    
    // Get function signature
    const functionSignature = await question("Enter function signature (e.g., 'transfer(address,uint256)'): ");
    
    // Get function parameters
    const params = await question("Enter function parameters as comma-separated values: ");
    
    // Parse parameters
    const paramList = params.split(",").map(param => param.trim());
    
    try {
      // Create interface from function signature
      const iface = new ethers.utils.Interface([`function ${functionSignature}`]);
      
      // Extract function name
      const functionName = functionSignature.substring(0, functionSignature.indexOf("("));
      
      // Encode the function call
      data = iface.encodeFunctionData(functionName, paramList);
    } catch (error) {
      console.log(`Error encoding function call: ${error.message}`);
      console.log("Using raw data input instead.");
      
      // Get raw data
      data = await question("Enter raw transaction data (hex): ");
      if (!data.startsWith("0x")) {
        data = "0x" + data;
      }
    }
  }
  
  // Display transaction details
  console.log("\nTransaction Details:");
  console.log("------------------");
  console.log(`Type: ${transactionType === 1 ? "ETH Transfer" : transactionType === 2 ? "ERC-20 Token Transfer" : "Custom Contract Interaction"}`);
  console.log(`Destination: ${destination}`);
  console.log(`Value: ${ethers.utils.formatEther(value)} ETH`);
  console.log(`Data: ${data}`);
  
  // Confirm submission
  const confirm = await question("\nSubmit this transaction? (y/n): ");
  if (confirm.toLowerCase() !== "y") {
    console.log("Transaction submission cancelled.");
    rl.close();
    return;
  }
  
  // Submit the transaction
  console.log("\nSubmitting transaction...");
  
  try {
    const tx = await multiSigWallet.submitTransaction(destination, value, data);
    const receipt = await tx.wait();
    
    // Find the Submission event
    const submissionEvent = receipt.events.find(event => event.event === "Submission");
    const transactionId = submissionEvent.args.transactionId;
    
    console.log(`Transaction submitted with ID: ${transactionId}`);
    console.log(`Transaction hash: ${receipt.transactionHash}`);
    
    // Get required confirmations
    const required = await multiSigWallet.required();
    console.log(`\nThis transaction requires ${required} confirmations to be executed.`);
    console.log("You have already confirmed it by submitting. Additional signers need to confirm it.");
    
    // Get confirmation count
    const confirmationCount = await multiSigWallet.getConfirmationCount(transactionId);
    console.log(`Current confirmation count: ${confirmationCount}`);
    
    if (confirmationCount < required) {
      console.log(`Additional confirmations needed: ${required - confirmationCount}`);
    } else {
      console.log("Transaction has enough confirmations and should be executed.");
      
      // Check if it was executed
      const transaction = await multiSigWallet.transactions(transactionId);
      if (transaction.executed) {
        console.log("Transaction was executed successfully!");
      } else {
        console.log("Transaction has enough confirmations but wasn't executed. It might have failed.");
      }
    }
  } catch (error) {
    console.log(`Error submitting transaction: ${error.message}`);
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
