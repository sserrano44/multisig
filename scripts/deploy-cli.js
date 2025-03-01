const { ethers, network } = require("hardhat");

// Parse command line arguments
function parseArgs() {
  const args = {};
  const argv = process.argv.slice(2);
  
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    
    if (arg.startsWith('--')) {
      const key = arg.slice(2);
      const value = argv[i + 1];
      
      if (value && !value.startsWith('--')) {
        args[key] = value;
        i++;
      } else {
        args[key] = true;
      }
    }
  }
  
  return args;
}

// Validate Ethereum address
function isValidAddress(address) {
  return ethers.utils.isAddress(address);
}

async function main() {
  console.log("MultiSigWallet CLI Deployment Script");
  console.log("====================================");
  
  // Get deployer account
  const [deployer] = await ethers.getSigners();
  console.log(`Deploying from account: ${deployer.address}`);
  
  // Parse command line arguments
  const args = parseArgs();
  const MAX_OWNER_COUNT = 7; // From the contract
  
  // Get signers
  let signers = [];
  let numSigners = 0;
  
  if (args.signers) {
    // Check if signers is a number or a comma-separated list of addresses
    if (!isNaN(parseInt(args.signers))) {
      // It's a number, generate that many signers using the deployer
      numSigners = parseInt(args.signers);
      
      if (numSigners <= 0 || numSigners > MAX_OWNER_COUNT) {
        console.error(`Number of signers must be between 1 and ${MAX_OWNER_COUNT}.`);
        process.exit(1);
      }
      
      // Use deployer address for all signers
      for (let i = 0; i < numSigners; i++) {
        signers.push(deployer.address);
      }
      
      console.log(`Using deployer address for all ${numSigners} signers.`);
    } else {
      // It's a comma-separated list of addresses
      signers = args.signers.split(',');
      numSigners = signers.length;
      
      if (numSigners > MAX_OWNER_COUNT) {
        console.error(`Number of signers cannot exceed ${MAX_OWNER_COUNT}.`);
        process.exit(1);
      }
      
      // Validate addresses
      const signerAddresses = new Set();
      for (let i = 0; i < signers.length; i++) {
        const address = signers[i].trim();
        
        if (!isValidAddress(address)) {
          console.error(`Invalid Ethereum address: ${address}`);
          process.exit(1);
        }
        
        if (signerAddresses.has(address)) {
          console.error(`Duplicate signer address: ${address}`);
          process.exit(1);
        }
        
        signers[i] = address;
        signerAddresses.add(address);
      }
    }
  } else {
    // Default to 1 signer (deployer)
    signers = [deployer.address];
    numSigners = 1;
    console.log("No signers specified. Using deployer as the only signer.");
  }
  
  // Get required approvals
  let requiredApprovals = 1; // Default to 1
  
  if (args.required) {
    requiredApprovals = parseInt(args.required);
    
    if (isNaN(requiredApprovals) || requiredApprovals <= 0 || requiredApprovals > numSigners) {
      console.error(`Required approvals must be between 1 and ${numSigners}.`);
      process.exit(1);
    }
  } else {
    console.log("No required approvals specified. Using default: 1");
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
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
