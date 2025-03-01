const { ethers } = require("hardhat");

async function main() {
  console.log("MultiSigWallet Test Deployment Script");
  console.log("=====================================");
  
  // Get signers
  const [deployer, signer2, signer3] = await ethers.getSigners();
  console.log(`Deployer address: ${deployer.address}`);
  console.log(`Signer 2 address: ${signer2.address}`);
  console.log(`Signer 3 address: ${signer3.address}`);
  
  // Deploy the contract with 3 signers and 2 required approvals
  console.log("\nDeploying MultiSigWallet...");
  
  const signers = [deployer.address, signer2.address, signer3.address];
  const requiredApprovals = 2;
  
  const MultiSigWallet = await ethers.getContractFactory("MultiSigWallet");
  const multiSigWallet = await MultiSigWallet.deploy(signers, requiredApprovals);
  
  await multiSigWallet.deployed();
  
  console.log(`\nMultiSigWallet deployed to: ${multiSigWallet.address}`);
  console.log(`Transaction hash: ${multiSigWallet.deployTransaction.hash}`);
  
  // Verify the contract state
  console.log("\nVerifying contract state...");
  
  const owners = await multiSigWallet.getOwners();
  const required = await multiSigWallet.required();
  
  console.log(`\nOwners: ${owners.join(", ")}`);
  console.log(`Required approvals: ${required}`);
  
  // Test a transaction submission
  console.log("\nSubmitting a test transaction...");
  
  // Use signer3's address as the destination instead of zero address
  const tx = await multiSigWallet.connect(deployer).submitTransaction(
    signer3.address, // destination (using a valid address)
    ethers.utils.parseEther("0"), // value
    "0x" // data
  );
  
  const receipt = await tx.wait();
  
  // Find the Submission event
  const submissionEvent = receipt.events.find(event => event.event === "Submission");
  const transactionId = submissionEvent.args.transactionId;
  
  console.log(`Transaction submitted with ID: ${transactionId}`);
  
  // Confirm the transaction with the second signer
  console.log("\nConfirming the transaction with the second signer...");
  
  const confirmTx = await multiSigWallet.connect(signer2).confirmTransaction(transactionId);
  await confirmTx.wait();
  
  // Check if the transaction is confirmed
  const isConfirmed = await multiSigWallet.isConfirmed(transactionId);
  console.log(`Transaction is confirmed: ${isConfirmed}`);
  
  // Get confirmation count
  const confirmationCount = await multiSigWallet.getConfirmationCount(transactionId);
  console.log(`Confirmation count: ${confirmationCount}`);
  
  // Get confirmations
  const confirmations = await multiSigWallet.getConfirmations(transactionId);
  console.log(`Confirmations: ${confirmations.join(", ")}`);
  
  console.log("\nTest deployment and transaction submission completed successfully!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
