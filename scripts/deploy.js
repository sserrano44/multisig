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

// Maximum number of owners allowed
const MAX_OWNER_COUNT = 7;

async function main() {
  console.log("MultiSigWallet Deployment Script");
  console.log("================================");
  
  // Get deployer account
  const [deployer] = await ethers.getSigners();
  console.log(`Deploying from account: ${deployer.address}`);
  
  // Get number of signers
  let numSigners;
  while (true) {
    const input = await question(`\nEnter the number of signers (1-${MAX_OWNER_COUNT}): `);
    numSigners = parseInt(input);
    
    if (isNaN(numSigners) || numSigners < 1 || numSigners > MAX_OWNER_COUNT) {
      console.log(`Please enter a valid number between 1 and ${MAX_OWNER_COUNT}.`);
      continue;
    }
    
    break;
  }
  
  // Get signer addresses
  const signers = [];
  const signerSet = new Set(); // To check for duplicates
  
  for (let i = 0; i < numSigners; i++) {
    while (true) {
      const input = await question(`Enter address for signer ${i + 1} (or press Enter to use deployer address): `);
      
      // Use deployer address if input is empty
      const address = input.trim() === "" ? deployer.address : input.trim();
      
      if (!isValidAddress(address)) {
        console.log("Please enter a valid Ethereum address.");
        continue;
      }
      
      if (address === ethers.constants.AddressZero) {
        console.log("Zero address is not allowed as a signer.");
        continue;
      }
      
      if (signerSet.has(address)) {
        console.log("This address is already added as a signer. Please enter a different address.");
        continue;
      }
      
      signers.push(address);
      signerSet.add(address);
      break;
    }
  }
  
  // Get required approvals
  let requiredApprovals;
  while (true) {
    const input = await question(`\nEnter the required number of approvals (1-${numSigners}): `);
    requiredApprovals = parseInt(input);
    
    if (isNaN(requiredApprovals) || requiredApprovals < 1 || requiredApprovals > numSigners) {
      console.log(`Please enter a valid number between 1 and ${numSigners}.`);
      continue;
    }
    
    break;
  }
  
  // Display deployment details
  console.log("\nDeployment Details:");
  console.log("------------------");
  console.log(`Number of signers: ${numSigners}`);
  console.log("Signer addresses:");
  signers.forEach((address, index) => {
    console.log(`  ${index + 1}. ${address}`);
  });
  console.log(`Required approvals: ${requiredApprovals}`);
  
  // Confirm deployment
  const confirm = await question("\nDeploy with these parameters? (y/n): ");
  if (confirm.toLowerCase() !== "y") {
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
  
  // Display deployment summary
  console.log("\nDeployment Summary:");
  console.log("------------------");
  console.log(`Network: ${network.name}`);
  console.log(`Contract address: ${multiSigWallet.address}`);
  console.log(`Number of signers: ${numSigners}`);
  console.log(`Required approvals: ${requiredApprovals}`);
  
  // Verify contract on Etherscan if not on a local network
  if (network.name !== "hardhat" && network.name !== "localhost") {
    console.log("\nVerifying contract on Etherscan...");
    try {
      await hre.run("verify:verify", {
        address: multiSigWallet.address,
        constructorArguments: [signers, requiredApprovals],
      });
      console.log("Contract verified on Etherscan!");
    } catch (error) {
      console.log("Error verifying contract on Etherscan:", error.message);
    }
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
