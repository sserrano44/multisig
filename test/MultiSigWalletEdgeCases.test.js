const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("MultiSigWallet Edge Cases", function () {
  let MultiSigWallet;
  let multiSigWallet;
  let deployer, signer2, signer3, signer4, nonOwner;
  let signers;
  let requiredApprovals;

  beforeEach(async function () {
    // Get signers
    [deployer, signer2, signer3, signer4, nonOwner] = await ethers.getSigners();
    
    // Set up initial signers and required approvals
    signers = [deployer.address, signer2.address, signer3.address];
    requiredApprovals = 2;
    
    // Deploy the contract
    MultiSigWallet = await ethers.getContractFactory("MultiSigWallet");
    multiSigWallet = await MultiSigWallet.deploy(signers, requiredApprovals);
    await multiSigWallet.deployed();
  });

  describe("Error Conditions", function () {
    it("Should revert when a non-owner tries to submit a transaction", async function () {
      await expect(
        multiSigWallet.connect(nonOwner).submitTransaction(
          signer4.address,
          ethers.utils.parseEther("1.0"),
          "0x"
        )
      ).to.be.reverted;
    });

    it("Should revert when a non-owner tries to confirm a transaction", async function () {
      // Submit a transaction
      const tx = await multiSigWallet.connect(deployer).submitTransaction(
        signer4.address,
        ethers.utils.parseEther("1.0"),
        "0x"
      );
      
      const receipt = await tx.wait();
      const transactionId = receipt.events.find(event => event.event === "Submission").args.transactionId;
      
      // Non-owner tries to confirm
      await expect(
        multiSigWallet.connect(nonOwner).confirmTransaction(transactionId)
      ).to.be.reverted;
    });

    it("Should revert when a non-owner tries to revoke a confirmation", async function () {
      // Submit a transaction
      const tx = await multiSigWallet.connect(deployer).submitTransaction(
        signer4.address,
        ethers.utils.parseEther("1.0"),
        "0x"
      );
      
      const receipt = await tx.wait();
      const transactionId = receipt.events.find(event => event.event === "Submission").args.transactionId;
      
      // Non-owner tries to revoke
      await expect(
        multiSigWallet.connect(nonOwner).revokeConfirmation(transactionId)
      ).to.be.reverted;
    });

    it("Should revert when trying to confirm a non-existent transaction", async function () {
      // Try to confirm a transaction that doesn't exist
      await expect(
        multiSigWallet.connect(deployer).confirmTransaction(999)
      ).to.be.reverted;
    });

    it("Should revert when trying to revoke a confirmation for a non-existent transaction", async function () {
      // Try to revoke a confirmation for a transaction that doesn't exist
      await expect(
        multiSigWallet.connect(deployer).revokeConfirmation(999)
      ).to.be.reverted;
    });

    it("Should revert when trying to execute a non-existent transaction", async function () {
      // Try to execute a transaction that doesn't exist
      try {
        await multiSigWallet.connect(deployer).executeTransaction(999);
        // If we get here, the transaction didn't revert
        expect.fail("Transaction should have reverted");
      } catch (error) {
        // Transaction reverted as expected
        expect(error.message).to.include("revert");
      }
    });

    it("Should revert when trying to confirm an already confirmed transaction", async function () {
      // Submit a transaction (deployer confirms automatically)
      const tx = await multiSigWallet.connect(deployer).submitTransaction(
        signer4.address,
        ethers.utils.parseEther("1.0"),
        "0x"
      );
      
      const receipt = await tx.wait();
      const transactionId = receipt.events.find(event => event.event === "Submission").args.transactionId;
      
      // Deployer tries to confirm again
      await expect(
        multiSigWallet.connect(deployer).confirmTransaction(transactionId)
      ).to.be.reverted;
    });

    it("Should revert when trying to revoke a non-confirmed transaction", async function () {
      // Submit a transaction (deployer confirms automatically)
      const tx = await multiSigWallet.connect(deployer).submitTransaction(
        signer4.address,
        ethers.utils.parseEther("1.0"),
        "0x"
      );
      
      const receipt = await tx.wait();
      const transactionId = receipt.events.find(event => event.event === "Submission").args.transactionId;
      
      // Signer2 tries to revoke (but hasn't confirmed)
      await expect(
        multiSigWallet.connect(signer2).revokeConfirmation(transactionId)
      ).to.be.reverted;
    });

    it("Should revert when trying to execute an already executed transaction", async function () {
      // Fund the wallet
      await deployer.sendTransaction({
        to: multiSigWallet.address,
        value: ethers.utils.parseEther("1.0")
      });
      
      // Submit a transaction
      const tx = await multiSigWallet.connect(deployer).submitTransaction(
        signer4.address,
        ethers.utils.parseEther("0.1"),
        "0x"
      );
      
      const receipt = await tx.wait();
      const transactionId = receipt.events.find(event => event.event === "Submission").args.transactionId;
      
      // Second signer confirms (this will execute the transaction)
      await multiSigWallet.connect(signer2).confirmTransaction(transactionId);
      
      // Verify the transaction is executed
      const transaction = await multiSigWallet.transactions(transactionId);
      expect(transaction.executed).to.equal(true);
      
      // Try to execute again
      try {
        await multiSigWallet.connect(deployer).executeTransaction(transactionId);
        // If we get here, the transaction didn't revert
        expect.fail("Transaction should have reverted");
      } catch (error) {
        // Transaction reverted as expected
        expect(error.message).to.include("revert");
      }
    });

    it("Should revert when trying to revoke a confirmation for an executed transaction", async function () {
      // Fund the wallet
      await deployer.sendTransaction({
        to: multiSigWallet.address,
        value: ethers.utils.parseEther("1.0")
      });
      
      // Submit a transaction
      const tx = await multiSigWallet.connect(deployer).submitTransaction(
        signer4.address,
        ethers.utils.parseEther("0.1"),
        "0x"
      );
      
      const receipt = await tx.wait();
      const transactionId = receipt.events.find(event => event.event === "Submission").args.transactionId;
      
      // Second signer confirms (this will execute the transaction)
      await multiSigWallet.connect(signer2).confirmTransaction(transactionId);
      
      // Verify the transaction is executed
      const transaction = await multiSigWallet.transactions(transactionId);
      expect(transaction.executed).to.equal(true);
      
      // Try to revoke confirmation
      try {
        await multiSigWallet.connect(deployer).revokeConfirmation(transactionId);
        // If we get here, the transaction didn't revert
        expect.fail("Transaction should have reverted");
      } catch (error) {
        // Transaction reverted as expected
        expect(error.message).to.include("revert");
      }
    });
  });

  describe("Boundary Conditions", function () {
    it("Should handle the minimum number of signers (1)", async function () {
      // Deploy with 1 signer
      const singleSigner = await ethers.getContractFactory("MultiSigWallet");
      const singleSignerWallet = await singleSigner.deploy([deployer.address], 1);
      await singleSignerWallet.deployed();
      
      // Fund the wallet
      await deployer.sendTransaction({
        to: singleSignerWallet.address,
        value: ethers.utils.parseEther("1.0")
      });
      
      // Submit a transaction (should be executed immediately)
      const tx = await singleSignerWallet.connect(deployer).submitTransaction(
        signer4.address,
        ethers.utils.parseEther("0.1"),
        "0x"
      );
      
      const receipt = await tx.wait();
      
      // Find the Submission event
      const submissionEvent = receipt.events.find(event => event.event === "Submission");
      expect(submissionEvent).to.not.be.undefined;
      
      // Find the Execution event
      const executionEvent = receipt.events.find(event => event.event === "Execution");
      expect(executionEvent).to.not.be.undefined;
      
      // Check that the transaction is executed
      const transactionId = submissionEvent.args.transactionId;
      const transaction = await singleSignerWallet.transactions(transactionId);
      expect(transaction.executed).to.equal(true);
    });

    it("Should handle the maximum number of signers (7)", async function () {
      // Create 7 signers
      const maxSigners = [
        deployer.address,
        signer2.address,
        signer3.address,
        signer4.address,
        nonOwner.address,
        ethers.Wallet.createRandom().address,
        ethers.Wallet.createRandom().address
      ];
      
      // Deploy with 7 signers
      const maxSignerWallet = await ethers.getContractFactory("MultiSigWallet");
      const wallet = await maxSignerWallet.deploy(maxSigners, 4);
      await wallet.deployed();
      
      // Check the number of owners
      const owners = await wallet.getOwners();
      expect(owners.length).to.equal(7);
      
      // Check the required confirmations
      const required = await wallet.required();
      expect(required).to.equal(4);
    });

    it("Should handle the minimum required confirmations (1)", async function () {
      // Deploy with 3 signers but only 1 required confirmation
      const minRequired = await ethers.getContractFactory("MultiSigWallet");
      const wallet = await minRequired.deploy(signers, 1);
      await wallet.deployed();
      
      // Fund the wallet
      await deployer.sendTransaction({
        to: wallet.address,
        value: ethers.utils.parseEther("1.0")
      });
      
      // Submit a transaction (should be executed immediately)
      const tx = await wallet.connect(deployer).submitTransaction(
        signer4.address,
        ethers.utils.parseEther("0.1"),
        "0x"
      );
      
      const receipt = await tx.wait();
      
      // Find the Submission event
      const submissionEvent = receipt.events.find(event => event.event === "Submission");
      expect(submissionEvent).to.not.be.undefined;
      
      // Find the Execution event
      const executionEvent = receipt.events.find(event => event.event === "Execution");
      expect(executionEvent).to.not.be.undefined;
      
      // Check that the transaction is executed
      const transactionId = submissionEvent.args.transactionId;
      const transaction = await wallet.transactions(transactionId);
      expect(transaction.executed).to.equal(true);
    });

    it("Should handle the maximum required confirmations (equal to number of signers)", async function () {
      // Deploy with 3 signers and 3 required confirmations
      const maxRequired = await ethers.getContractFactory("MultiSigWallet");
      const wallet = await maxRequired.deploy(signers, 3);
      await wallet.deployed();
      
      // Fund the wallet
      await deployer.sendTransaction({
        to: wallet.address,
        value: ethers.utils.parseEther("1.0")
      });
      
      // Submit a transaction
      const tx = await wallet.connect(deployer).submitTransaction(
        signer4.address,
        ethers.utils.parseEther("0.1"),
        "0x"
      );
      
      const receipt = await tx.wait();
      const transactionId = receipt.events.find(event => event.event === "Submission").args.transactionId;
      
      // Second signer confirms
      await wallet.connect(signer2).confirmTransaction(transactionId);
      
      // Transaction should not be executed yet
      let transaction = await wallet.transactions(transactionId);
      expect(transaction.executed).to.equal(false);
      
      // Third signer confirms
      const confirmTx = await wallet.connect(signer3).confirmTransaction(transactionId);
      const confirmReceipt = await confirmTx.wait();
      
      // Check for Execution event
      const executionEvent = confirmReceipt.events.find(event => event.event === "Execution");
      expect(executionEvent).to.not.be.undefined;
      
      // Transaction should be executed now
      transaction = await wallet.transactions(transactionId);
      expect(transaction.executed).to.equal(true);
    });

    it("Should handle transactions with large ETH values", async function () {
      // Fund the wallet with a large amount of ETH
      await deployer.sendTransaction({
        to: multiSigWallet.address,
        value: ethers.utils.parseEther("1000.0")
      });
      
      // Submit a transaction with a large value
      const largeValue = ethers.utils.parseEther("999.0");
      
      const tx = await multiSigWallet.connect(deployer).submitTransaction(
        signer4.address,
        largeValue,
        "0x"
      );
      
      const receipt = await tx.wait();
      const transactionId = receipt.events.find(event => event.event === "Submission").args.transactionId;
      
      // Get initial balance
      const initialBalance = await ethers.provider.getBalance(signer4.address);
      
      // Second signer confirms
      await multiSigWallet.connect(signer2).confirmTransaction(transactionId);
      
      // Check that the large value was transferred
      const finalBalance = await ethers.provider.getBalance(signer4.address);
      expect(finalBalance).to.equal(initialBalance.add(largeValue));
    });

    it("Should handle transactions with large data payloads", async function () {
      // Create a large data payload (a long bytes array)
      const largeData = "0x" + "ff".repeat(10000); // 10KB of data
      
      // Submit a transaction with the large data
      const tx = await multiSigWallet.connect(deployer).submitTransaction(
        signer4.address,
        0,
        largeData
      );
      
      const receipt = await tx.wait();
      const transactionId = receipt.events.find(event => event.event === "Submission").args.transactionId;
      
      // Check that the transaction was stored correctly
      const transaction = await multiSigWallet.transactions(transactionId);
      expect(transaction.data).to.equal(largeData);
      
      // Second signer confirms
      await multiSigWallet.connect(signer2).confirmTransaction(transactionId);
      
      // Transaction should be executed
      const executedTransaction = await multiSigWallet.transactions(transactionId);
      expect(executedTransaction.executed).to.equal(true);
    });
  });

  describe("Gas Usage", function () {
    it("Should measure gas usage for submitting a transaction", async function () {
      // Submit a transaction
      const tx = await multiSigWallet.connect(deployer).submitTransaction(
        signer4.address,
        ethers.utils.parseEther("1.0"),
        "0x"
      );
      
      const receipt = await tx.wait();
      
      // Log gas used
      console.log(`Gas used for submitTransaction: ${receipt.gasUsed.toString()}`);
      
      // Ensure gas usage is reasonable
      expect(receipt.gasUsed.toNumber()).to.be.lessThan(500000);
    });

    it("Should measure gas usage for confirming a transaction", async function () {
      // Submit a transaction
      const tx = await multiSigWallet.connect(deployer).submitTransaction(
        signer4.address,
        ethers.utils.parseEther("1.0"),
        "0x"
      );
      
      const receipt = await tx.wait();
      const transactionId = receipt.events.find(event => event.event === "Submission").args.transactionId;
      
      // Confirm the transaction
      const confirmTx = await multiSigWallet.connect(signer2).confirmTransaction(transactionId);
      const confirmReceipt = await confirmTx.wait();
      
      // Log gas used
      console.log(`Gas used for confirmTransaction: ${confirmReceipt.gasUsed.toString()}`);
      
      // Ensure gas usage is reasonable
      expect(confirmReceipt.gasUsed.toNumber()).to.be.lessThan(500000);
    });

    it("Should measure gas usage for revoking a confirmation", async function () {
      // Submit a transaction
      const tx = await multiSigWallet.connect(deployer).submitTransaction(
        signer4.address,
        ethers.utils.parseEther("1.0"),
        "0x"
      );
      
      const receipt = await tx.wait();
      const transactionId = receipt.events.find(event => event.event === "Submission").args.transactionId;
      
      // Revoke the confirmation
      const revokeTx = await multiSigWallet.connect(deployer).revokeConfirmation(transactionId);
      const revokeReceipt = await revokeTx.wait();
      
      // Log gas used
      console.log(`Gas used for revokeConfirmation: ${revokeReceipt.gasUsed.toString()}`);
      
      // Ensure gas usage is reasonable
      expect(revokeReceipt.gasUsed.toNumber()).to.be.lessThan(500000);
    });
  });
});
