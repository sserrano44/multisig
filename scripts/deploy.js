const { ethers, network } = require("hardhat");
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
  console.log("MultiSigWallet Deployment Script");
  console.log("================================");
  
  // Get deployer account
  const [deployer] = await ethers.getSigners();
  console.log(`Deploying from account: ${deployer.address}`);
  
  // Get the number of signers
  let numSigners;
  const MAX_OWNER_COUNT = 7; // From the contract
  
  while (true) {
    const numSignersInput = await question(`Enter the number of signers (1-${MAX_OWNER_COUNT}): `);
    numSigners = parseInt(numSignersInput);
    
    if (!isNaN(numSigners) && numSigners > 0 && numSigners <= MAX_OWNER_COUNT) {
      break;
    }
    console.log(`Please enter a valid number between 1 and ${MAX_OWNER_COUNT}.`);
  }
  
  // Get signer addresses
  const signers = [];
  const signerAddresses = new Set();
  
  for (let i = 0; i < numSigners; i++) {
    let signerAddress;
    
    while (true) {
      signerAddress = await question(`Enter address for signer ${i + 1} (or press Enter to use deployer address): `);
      
      // Use deployer address if empty
      if (signerAddress.trim() === "") {
        signerAddress = deployer.address;
        console.log(`Using deployer address: ${deployer.address}`);
      }
      
      // Validate address
      if (!isValidAddress(signerAddress)) {
        console.log("Please enter a valid Ethereum address.");
        continue;
      }
      
      // Check for duplicates
      if (signerAddresses.has(signerAddress)) {
        console.log("This address is already added as a signer. Please use a different address.");
        continue;
      }
      
      break;
    }
    
    signers.push(signerAddress);
    signerAddresses.add(signerAddress);
  }
  
  // Get required approvals
  let requiredApprovals;
  
  while (true) {
    const requiredApprovalsInput = await question(`Enter the required number of approvals (1-${numSigners}): `);
    requiredApprovals = parseInt(requiredApprovalsInput);
    
    if (!isNaN(requiredApprovals) && requiredApprovals > 0 && requiredApprovals <= numSigners) {
      break;
    }
    console.log(`Please enter a valid number between 1 and ${numSigners}.`);
  }
  
  // Confirm deployment details
  console.log("\nDeployment Details:");
  console.log("------------------");
  console.log(`Number of signers: ${numSigners}`);
  console.log("Signer addresses:");
  signers.forEach((address, index) => {
    console.log(`  ${index + 1}. ${address}`);
  });
  console.log(`Required approvals: ${requiredApprovals}`);
  
  const confirmDeploy = await question("\nDeploy with these parameters? (y/n): ");
  
  if (confirmDeploy.toLowerCase() !== 'y') {
    console.log("Deployment cancelled.");
    rl.close();
    return;
  }
  
  // Deploy the contract
  console.log("\nDeploying MultiSigWallet...");
  
  const MultiSigWallet = await ethers.getContractFactory("MultiSigWallet");
  const multiSigWallet = await MultiSigWallet.deploy(signers, requiredApprovals);
  
  await multiSigWallet.deployed();
  
  console.log(`\nMultiSigWallet deployed to: ${multiSigWallet.address}`);
  console.log(`Transaction hash: ${multiSigWallet.deployTransaction.hash}`);
  
  // Verify contract on Etherscan if not on local network
  if (network.name !== "hardhat" && network.name !== "localhost") {
    console.log("\nWaiting for block confirmations before verification...");
    // Wait for 5 block confirmations
    await multiSigWallet.deployTransaction.wait(5);
    
    console.log("Verifying contract on Etherscan...");
    try {
      await hre.run("verify:verify", {
        address: multiSigWallet.address,
        constructorArguments: [signers, requiredApprovals],
      });
      console.log("Contract verified on Etherscan!");
    } catch (error) {
      console.log("Error verifying contract:", error.message);
    }
  }
  
  // Log deployment summary
  console.log("\nDeployment Summary:");
  console.log("------------------");
  console.log(`Network: ${network.name}`);
  console.log(`Contract address: ${multiSigWallet.address}`);
  console.log(`Number of signers: ${numSigners}`);
  console.log(`Required approvals: ${requiredApprovals}`);
  
  rl.close();
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
