const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("MultiSigWallet", function () {
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

  describe("Deployment", function () {
    it("Should set the correct owners", async function () {
      const owners = await multiSigWallet.getOwners();
      expect(owners.length).to.equal(signers.length);
      
      for (let i = 0; i < signers.length; i++) {
        expect(owners[i]).to.equal(signers[i]);
        expect(await multiSigWallet.isOwner(signers[i])).to.equal(true);
      }
    });

    it("Should set the correct required approvals", async function () {
      const required = await multiSigWallet.required();
      expect(required).to.equal(requiredApprovals);
    });

    it("Should reject deployment with invalid parameters", async function () {
      // No owners
      await expect(
        MultiSigWallet.deploy([], 0)
      ).to.be.reverted;
      
      // Required > owners
      await expect(
        MultiSigWallet.deploy([deployer.address], 2)
      ).to.be.reverted;
      
      // Required = 0
      await expect(
        MultiSigWallet.deploy([deployer.address, signer2.address], 0)
      ).to.be.reverted;
      
      // Too many owners (MAX_OWNER_COUNT = 7)
      const tooManyOwners = [
        deployer.address,
        signer2.address,
        signer3.address,
        signer4.address,
        nonOwner.address,
        ethers.Wallet.createRandom().address,
        ethers.Wallet.createRandom().address,
        ethers.Wallet.createRandom().address
      ];
      
      await expect(
        MultiSigWallet.deploy(tooManyOwners, 4)
      ).to.be.reverted;
      
      // Duplicate owners
      await expect(
        MultiSigWallet.deploy([deployer.address, deployer.address], 1)
      ).to.be.revertedWith("InvalidOwner");
      
      // Zero address owner
      await expect(
        MultiSigWallet.deploy([deployer.address, ethers.constants.AddressZero], 1)
      ).to.be.revertedWith("InvalidOwner");
    });
  });

  describe("Receiving ETH", function () {
    it("Should accept ETH transfers", async function () {
      const amount = ethers.utils.parseEther("1.0");
      
      // Send ETH to the contract
      await deployer.sendTransaction({
        to: multiSigWallet.address,
        value: amount
      });
      
      // Check contract balance
      const balance = await ethers.provider.getBalance(multiSigWallet.address);
      expect(balance).to.equal(amount);
    });

    it("Should emit Deposit event when receiving ETH", async function () {
      const amount = ethers.utils.parseEther("1.0");
      
      // Send ETH to the contract and check for Deposit event
      await expect(
        deployer.sendTransaction({
          to: multiSigWallet.address,
          value: amount
        })
      ).to.emit(multiSigWallet, "Deposit")
        .withArgs(deployer.address, amount);
    });
  });

  describe("Basic Transaction Flow", function () {
    it("Should allow an owner to submit and confirm a transaction", async function () {
      const destination = signer3.address;
      const value = ethers.utils.parseEther("0");
      const data = "0x";
      
      // Submit transaction
      const tx = await multiSigWallet.connect(deployer).submitTransaction(
        destination,
        value,
        data
      );
      
      const receipt = await tx.wait();
      
      // Check for Submission event
      const submissionEvent = receipt.events.find(event => event.event === "Submission");
      expect(submissionEvent).to.not.be.undefined;
      
      const transactionId = submissionEvent.args.transactionId;
      expect(transactionId).to.equal(0); // First transaction should have ID 0
      
      // Check for Confirmation event (submitter automatically confirms)
      const confirmationEvent = receipt.events.find(event => event.event === "Confirmation");
      expect(confirmationEvent).to.not.be.undefined;
      expect(confirmationEvent.args.sender).to.equal(deployer.address);
      expect(confirmationEvent.args.transactionId).to.equal(transactionId);
      
      // Check transaction details
      const transaction = await multiSigWallet.transactions(transactionId);
      expect(transaction.destination).to.equal(destination);
      expect(transaction.value).to.equal(value);
      expect(transaction.data).to.equal(data);
      expect(transaction.executed).to.equal(false);
      
      // Check confirmation status
      const isConfirmed = await multiSigWallet.confirmations(transactionId, deployer.address);
      expect(isConfirmed).to.equal(true);
      
      // Check confirmation count
      const confirmationCount = await multiSigWallet.getConfirmationCount(transactionId);
      expect(confirmationCount).to.equal(1);
    });

    it("Should execute a transaction when enough confirmations are received", async function () {
      const destination = signer3.address;
      const value = ethers.utils.parseEther("0");
      const data = "0x";
      
      // Fund the contract
      await deployer.sendTransaction({
        to: multiSigWallet.address,
        value: ethers.utils.parseEther("1.0")
      });
      
      // Submit transaction (deployer confirms)
      const tx = await multiSigWallet.connect(deployer).submitTransaction(
        destination,
        value,
        data
      );
      
      const receipt = await tx.wait();
      const submissionEvent = receipt.events.find(event => event.event === "Submission");
      const transactionId = submissionEvent.args.transactionId;
      
      // Second signer confirms
      const confirmTx = await multiSigWallet.connect(signer2).confirmTransaction(transactionId);
      const confirmReceipt = await confirmTx.wait();
      
      // Check for Execution event
      const executionEvent = confirmReceipt.events.find(event => event.event === "Execution");
      expect(executionEvent).to.not.be.undefined;
      expect(executionEvent.args.transactionId).to.equal(transactionId);
      
      // Check transaction executed status
      const transaction = await multiSigWallet.transactions(transactionId);
      expect(transaction.executed).to.equal(true);
    });

    it("Should not execute a transaction without enough confirmations", async function () {
      const destination = signer3.address;
      const value = ethers.utils.parseEther("0");
      const data = "0x";
      
      // Submit transaction (deployer confirms)
      const tx = await multiSigWallet.connect(deployer).submitTransaction(
        destination,
        value,
        data
      );
      
      const receipt = await tx.wait();
      const submissionEvent = receipt.events.find(event => event.event === "Submission");
      const transactionId = submissionEvent.args.transactionId;
      
      // Check transaction executed status
      const transaction = await multiSigWallet.transactions(transactionId);
      expect(transaction.executed).to.equal(false);
      
      // Try to execute directly
      await expect(
        multiSigWallet.executeTransaction(transactionId)
      ).to.not.emit(multiSigWallet, "Execution");
      
      // Check transaction is still not executed
      const transactionAfter = await multiSigWallet.transactions(transactionId);
      expect(transactionAfter.executed).to.equal(false);
    });
  });

  describe("Transaction Confirmation", function () {
    let transactionId;
    
    beforeEach(async function () {
      // Submit a transaction
      const tx = await multiSigWallet.connect(deployer).submitTransaction(
        signer3.address,
        ethers.utils.parseEther("0"),
        "0x"
      );
      
      const receipt = await tx.wait();
      const submissionEvent = receipt.events.find(event => event.event === "Submission");
      transactionId = submissionEvent.args.transactionId;
    });
    
    it("Should allow an owner to confirm a transaction", async function () {
      // Deployer already confirmed in submitTransaction
      // Second signer confirms
      await expect(
        multiSigWallet.connect(signer2).confirmTransaction(transactionId)
      ).to.emit(multiSigWallet, "Confirmation")
        .withArgs(signer2.address, transactionId);
      
      // Check confirmation status
      const isConfirmed = await multiSigWallet.confirmations(transactionId, signer2.address);
      expect(isConfirmed).to.equal(true);
      
      // Check confirmation count
      const confirmationCount = await multiSigWallet.getConfirmationCount(transactionId);
      expect(confirmationCount).to.equal(2);
      
      // Check confirmations list
      const confirmations = await multiSigWallet.getConfirmations(transactionId);
      expect(confirmations.length).to.equal(2);
      expect(confirmations).to.include(deployer.address);
      expect(confirmations).to.include(signer2.address);
    });
    
    it("Should not allow a non-owner to confirm a transaction", async function () {
      await expect(
        multiSigWallet.connect(nonOwner).confirmTransaction(transactionId)
      ).to.be.reverted;
    });
    
    it("Should not allow an owner to confirm a transaction twice", async function () {
      await expect(
        multiSigWallet.connect(deployer).confirmTransaction(transactionId)
      ).to.be.reverted;
    });
    
    it("Should allow an owner to revoke a confirmation", async function () {
      await expect(
        multiSigWallet.connect(deployer).revokeConfirmation(transactionId)
      ).to.emit(multiSigWallet, "Revocation")
        .withArgs(deployer.address, transactionId);
      
      // Check confirmation status
      const isConfirmed = await multiSigWallet.confirmations(transactionId, deployer.address);
      expect(isConfirmed).to.equal(false);
      
      // Check confirmation count
      const confirmationCount = await multiSigWallet.getConfirmationCount(transactionId);
      expect(confirmationCount).to.equal(0);
    });
    
    it("Should not allow revoking a non-confirmed transaction", async function () {
      await expect(
        multiSigWallet.connect(signer2).revokeConfirmation(transactionId)
      ).to.be.reverted;
    });
  });

  describe("Transaction Queries", function () {
    beforeEach(async function () {
      // Submit multiple transactions
      for (let i = 0; i < 3; i++) {
        await multiSigWallet.connect(deployer).submitTransaction(
          signer3.address,
          ethers.utils.parseEther(i.toString()),
          "0x"
        );
      }
      
      // Confirm and execute the second transaction
      await multiSigWallet.connect(signer2).confirmTransaction(1);
    });
    
    it("Should return the correct transaction count", async function () {
      // Total transaction count
      const transactionCount = await multiSigWallet.transactionCount();
      
      // Pending transactions
      const pendingCount = await multiSigWallet.getTransactionCount(true, false);
      
      // Executed transactions
      const executedCount = await multiSigWallet.getTransactionCount(false, true);
      
      // All transactions
      const allCount = await multiSigWallet.getTransactionCount(true, true);
      
      // Check that the counts are consistent
      expect(pendingCount.add(executedCount)).to.equal(allCount);
      expect(allCount).to.equal(transactionCount);
    });
    
    it("Should return the correct transaction IDs", async function () {
      // Get transaction count
      const transactionCount = await multiSigWallet.transactionCount();
      
      // Get pending and executed counts
      const pendingCount = await multiSigWallet.getTransactionCount(true, false);
      const executedCount = await multiSigWallet.getTransactionCount(false, true);
      
      // Get all transaction IDs
      const transactionIds = await multiSigWallet.getTransactionIds(0, transactionCount, true, true);
      expect(transactionIds.length).to.equal(transactionCount);
      
      // Get pending transaction IDs
      const pendingIds = await multiSigWallet.getTransactionIds(0, pendingCount, true, false);
      expect(pendingIds.length).to.equal(pendingCount);
      
      // Get executed transaction IDs
      const executedIds = await multiSigWallet.getTransactionIds(0, executedCount, false, true);
      expect(executedIds.length).to.equal(executedCount);
      
      // Check that all IDs are unique
      const allIds = [...pendingIds, ...executedIds].map(id => id.toString());
      const uniqueIds = [...new Set(allIds)];
      expect(uniqueIds.length).to.equal(allIds.length);
    });
  });
});
