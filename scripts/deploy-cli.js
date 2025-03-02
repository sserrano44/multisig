const { ethers, network } = require("hardhat");
const { parseArgs } = require("util");

// Maximum number of owners allowed
const MAX_OWNER_COUNT = 7;

// Validate Ethereum address
function isValidAddress(address) {
  return ethers.utils.isAddress(address);
}

async function main() {
  console.log("MultiSigWallet CLI Deployment Script");
  console.log("===================================");
  
  // Parse command-line arguments
  const options = {
    signers: {
      type: "string",
      short: "s",
    },
    required: {
      type: "string",
      short: "r",
    },
  };
  
  const { values, positionals } = parseArgs({
    args: process.argv.slice(2),
    options,
    allowPositionals: true,
  });
  
  // Get deployer account
  const [deployer] = await ethers.getSigners();
  console.log(`Deploying from account: ${deployer.address}`);
  
  // Process signers argument
  let signers = [];
  const signerSet = new Set(); // To check for duplicates
  
  if (values.signers) {
    // Check if signers is a number or a comma-separated list of addresses
    if (/^\d+$/.test(values.signers)) {
      // It's a number, use deployer address for that many signers
      const numSigners = parseInt(values.signers);
      
      if (numSigners < 1 || numSigners > MAX_OWNER_COUNT) {
        console.error(`Number of signers must be between 1 and ${MAX_OWNER_COUNT}.`);
        process.exit(1);
      }
      
      for (let i = 0; i < numSigners; i++) {
        signers.push(deployer.address);
        signerSet.add(deployer.address);
      }
    } else {
      // It's a comma-separated list of addresses
      const addressList = values.signers.split(",");
      
      if (addressList.length < 1 || addressList.length > MAX_OWNER_COUNT) {
        console.error(`Number of signers must be between 1 and ${MAX_OWNER_COUNT}.`);
        process.exit(1);
      }
      
      for (const address of addressList) {
        const trimmedAddress = address.trim();
        
        if (!isValidAddress(trimmedAddress)) {
          console.error(`Invalid Ethereum address: ${trimmedAddress}`);
          process.exit(1);
        }
        
        if (trimmedAddress === ethers.constants.AddressZero) {
          console.error("Zero address is not allowed as a signer.");
          process.exit(1);
        }
        
        if (signerSet.has(trimmedAddress)) {
          console.error(`Duplicate signer address: ${trimmedAddress}`);
          process.exit(1);
        }
        
        signers.push(trimmedAddress);
        signerSet.add(trimmedAddress);
      }
    }
  } else {
    // Default to 1 signer (deployer)
    signers = [deployer.address];
    signerSet.add(deployer.address);
  }
  
  // Process required approvals argument
  let requiredApprovals = 1; // Default to 1
  
  if (values.required) {
    requiredApprovals = parseInt(values.required);
    
    if (isNaN(requiredApprovals) || requiredApprovals < 1 || requiredApprovals > signers.length) {
      console.error(`Required approvals must be between 1 and ${signers.length}.`);
      process.exit(1);
    }
  }
  
  // Display deployment details
  console.log("\nDeployment Details:");
  console.log("------------------");
  console.log(`Number of signers: ${signers.length}`);
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
  
  // Display deployment summary
  console.log("\nDeployment Summary:");
  console.log("------------------");
  console.log(`Network: ${network.name}`);
  console.log(`Contract address: ${multiSigWallet.address}`);
  console.log(`Number of signers: ${signers.length}`);
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
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
