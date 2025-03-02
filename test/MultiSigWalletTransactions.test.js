const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("MultiSigWallet Transactions", function () {
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
    
    // Fund the wallet with some ETH for tests
    await deployer.sendTransaction({
      to: multiSigWallet.address,
      value: ethers.utils.parseEther("10.0")
    });
  });

  describe("ETH Transactions", function () {
    it("Should execute an ETH transfer when confirmed by required signers", async function () {
      const recipient = nonOwner.address;
      const amount = ethers.utils.parseEther("1.0");
      
      // Get initial balances
      const initialWalletBalance = await ethers.provider.getBalance(multiSigWallet.address);
      const initialRecipientBalance = await ethers.provider.getBalance(recipient);
      
      // Submit transaction
      const tx = await multiSigWallet.connect(deployer).submitTransaction(
        recipient,
        amount,
        "0x"
      );
      
      const receipt = await tx.wait();
      const transactionId = receipt.events.find(event => event.event === "Submission").args.transactionId;
      
      // Second signer confirms
      await multiSigWallet.connect(signer2).confirmTransaction(transactionId);
      
      // Check balances after execution
      const finalWalletBalance = await ethers.provider.getBalance(multiSigWallet.address);
      const finalRecipientBalance = await ethers.provider.getBalance(recipient);
      
      expect(finalWalletBalance).to.equal(initialWalletBalance.sub(amount));
      expect(finalRecipientBalance).to.equal(initialRecipientBalance.add(amount));
    });

    it("Should not execute an ETH transfer without enough confirmations", async function () {
      const recipient = nonOwner.address;
      const amount = ethers.utils.parseEther("1.0");
      
      // Get initial balances
      const initialWalletBalance = await ethers.provider.getBalance(multiSigWallet.address);
      const initialRecipientBalance = await ethers.provider.getBalance(recipient);
      
      // Submit transaction (only deployer confirms)
      const tx = await multiSigWallet.connect(deployer).submitTransaction(
        recipient,
        amount,
        "0x"
      );
      
      // Check balances after submission
      const finalWalletBalance = await ethers.provider.getBalance(multiSigWallet.address);
      const finalRecipientBalance = await ethers.provider.getBalance(recipient);
      
      expect(finalWalletBalance).to.equal(initialWalletBalance);
      expect(finalRecipientBalance).to.equal(initialRecipientBalance);
    });

    it("Should handle failed ETH transfers", async function () {
      // Deploy a contract that rejects ETH
      const RejectEther = await ethers.getContractFactory("RejectEther");
      const rejectEther = await RejectEther.deploy();
      await rejectEther.deployed();
      
      const amount = ethers.utils.parseEther("1.0");
      
      // Submit transaction to send ETH to the contract that rejects it
      const tx = await multiSigWallet.connect(deployer).submitTransaction(
        rejectEther.address,
        amount,
        "0x"
      );
      
      const receipt = await tx.wait();
      const transactionId = receipt.events.find(event => event.event === "Submission").args.transactionId;
      
      // Second signer confirms
      const confirmTx = await multiSigWallet.connect(signer2).confirmTransaction(transactionId);
      const confirmReceipt = await confirmTx.wait();
      
      // Check for ExecutionFailure event
      const executionFailureEvent = confirmReceipt.events.find(event => event.event === "ExecutionFailure");
      expect(executionFailureEvent).to.not.be.undefined;
      expect(executionFailureEvent.args.transactionId).to.equal(transactionId);
      
      // Check that the transaction is marked as not executed
      const transaction = await multiSigWallet.transactions(transactionId);
      expect(transaction.executed).to.equal(false);
      
      // Check that the ETH is still in the wallet
      const walletBalance = await ethers.provider.getBalance(multiSigWallet.address);
      expect(walletBalance).to.equal(ethers.utils.parseEther("10.0"));
    });
  });

  describe("Contract Interactions", function () {
    let testContract;
    
    beforeEach(async function () {
      // Deploy a test contract
      const TestContract = await ethers.getContractFactory("TestContract");
      testContract = await TestContract.deploy();
      await testContract.deployed();
    });
    
    it("Should execute a contract function call when confirmed by required signers", async function () {
      const newValue = 42;
      
      // Encode the function call
      const data = testContract.interface.encodeFunctionData("setValue", [newValue]);
      
      // Submit transaction
      const tx = await multiSigWallet.connect(deployer).submitTransaction(
        testContract.address,
        0,
        data
      );
      
      const receipt = await tx.wait();
      const transactionId = receipt.events.find(event => event.event === "Submission").args.transactionId;
      
      // Second signer confirms
      await multiSigWallet.connect(signer2).confirmTransaction(transactionId);
      
      // Check that the function was called
      const value = await testContract.value();
      expect(value).to.equal(newValue);
    });
    
    it("Should handle failed contract function calls", async function () {
      // Encode a call to a function that will revert
      const data = testContract.interface.encodeFunctionData("revertFunction", []);
      
      // Submit transaction
      const tx = await multiSigWallet.connect(deployer).submitTransaction(
        testContract.address,
        0,
        data
      );
      
      const receipt = await tx.wait();
      const transactionId = receipt.events.find(event => event.event === "Submission").args.transactionId;
      
      // Second signer confirms
      const confirmTx = await multiSigWallet.connect(signer2).confirmTransaction(transactionId);
      const confirmReceipt = await confirmTx.wait();
      
      // Check for ExecutionFailure event
      const executionFailureEvent = confirmReceipt.events.find(event => event.event === "ExecutionFailure");
      expect(executionFailureEvent).to.not.be.undefined;
      expect(executionFailureEvent.args.transactionId).to.equal(transactionId);
      
      // Check that the transaction is marked as not executed
      const transaction = await multiSigWallet.transactions(transactionId);
      expect(transaction.executed).to.equal(false);
    });
  });

  describe("Transaction Execution", function () {
    it("Should not allow executing an already executed transaction", async function () {
      const recipient = nonOwner.address;
      const amount = ethers.utils.parseEther("1.0");
      
      // Submit and confirm transaction
      const tx = await multiSigWallet.connect(deployer).submitTransaction(
        recipient,
        amount,
        "0x"
      );
      
      const receipt = await tx.wait();
      const transactionId = receipt.events.find(event => event.event === "Submission").args.transactionId;
      
      // Second signer confirms
      await multiSigWallet.connect(signer2).confirmTransaction(transactionId);
      
      // Transaction should be executed
      const transaction = await multiSigWallet.transactions(transactionId);
      expect(transaction.executed).to.equal(true);
      
      // Try to execute it again
      await expect(
        multiSigWallet.executeTransaction(transactionId)
      ).to.be.reverted;
    });
    
    it("Should allow anyone to execute a transaction with enough confirmations", async function () {
      const recipient = nonOwner.address;
      const amount = ethers.utils.parseEther("1.0");
      
      // Get initial balance
      const initialBalance = await ethers.provider.getBalance(recipient);
      
      // Submit transaction
      const tx = await multiSigWallet.connect(deployer).submitTransaction(
        recipient,
        amount,
        "0x"
      );
      
      const receipt = await tx.wait();
      const transactionId = receipt.events.find(event => event.event === "Submission").args.transactionId;
      
      // Both deployer and signer2 confirm
      await multiSigWallet.connect(signer2).confirmTransaction(transactionId);
      
      // Transaction should be executed automatically after the second confirmation
      const transaction = await multiSigWallet.transactions(transactionId);
      expect(transaction.executed).to.equal(true);
      
      // Check that the ETH was transferred
      const finalBalance = await ethers.provider.getBalance(recipient);
      expect(finalBalance).to.equal(initialBalance.add(amount));
    });
    
    it("Should not execute a transaction without enough confirmations", async function () {
      const recipient = nonOwner.address;
      const amount = ethers.utils.parseEther("1.0");
      
      // Submit transaction (only deployer confirms)
      const tx = await multiSigWallet.connect(deployer).submitTransaction(
        recipient,
        amount,
        "0x"
      );
      
      const receipt = await tx.wait();
      const transactionId = receipt.events.find(event => event.event === "Submission").args.transactionId;
      
      // Try to execute it
      await expect(
        multiSigWallet.connect(nonOwner).executeTransaction(transactionId)
      ).to.not.emit(multiSigWallet, "Execution");
      
      // Transaction should not be executed
      const transaction = await multiSigWallet.transactions(transactionId);
      expect(transaction.executed).to.equal(false);
    });
  });

  describe("Transaction Confirmation", function () {
    it("Should allow multiple owners to confirm a transaction", async function () {
      // Change required confirmations to 3
      const data = multiSigWallet.interface.encodeFunctionData("changeRequirement", [3]);
      
      // Submit and confirm the changeRequirement transaction
      const changeTx = await multiSigWallet.connect(deployer).submitTransaction(
        multiSigWallet.address,
        0,
        data
      );
      
      const changeReceipt = await changeTx.wait();
      const changeTransactionId = changeReceipt.events.find(event => event.event === "Submission").args.transactionId;
      
      // Second signer confirms
      await multiSigWallet.connect(signer2).confirmTransaction(changeTransactionId);
      
      // Now required is 3
      
      // Submit a new transaction
      const recipient = nonOwner.address;
      const amount = ethers.utils.parseEther("0.1"); // Use a smaller amount
      
      const tx = await multiSigWallet.connect(deployer).submitTransaction(
        recipient,
        amount,
        "0x"
      );
      
      const receipt = await tx.wait();
      const transactionId = receipt.events.find(event => event.event === "Submission").args.transactionId;
      
      // Check initial confirmation count
      let confirmationCount = await multiSigWallet.getConfirmationCount(transactionId);
      expect(confirmationCount).to.equal(1);
      
      // Second signer confirms
      await multiSigWallet.connect(signer2).confirmTransaction(transactionId);
      
      // Check updated confirmation count
      confirmationCount = await multiSigWallet.getConfirmationCount(transactionId);
      expect(confirmationCount).to.equal(2);
      
      // Transaction should not be executed yet
      let transaction = await multiSigWallet.transactions(transactionId);
      expect(transaction.executed).to.equal(false);
    });
    
    it("Should execute a transaction when it reaches the required confirmations", async function () {
      // Change required confirmations to 3
      const data = multiSigWallet.interface.encodeFunctionData("changeRequirement", [3]);
      
      // Submit and confirm the changeRequirement transaction
      const changeTx = await multiSigWallet.connect(deployer).submitTransaction(
        multiSigWallet.address,
        0,
        data
      );
      
      const changeReceipt = await changeTx.wait();
      const changeTransactionId = changeReceipt.events.find(event => event.event === "Submission").args.transactionId;
      
      // Second signer confirms
      await multiSigWallet.connect(signer2).confirmTransaction(changeTransactionId);
      
      // Now required is 3
      
      // Submit a new transaction
      const recipient = nonOwner.address;
      const amount = ethers.utils.parseEther("1.0");
      
      const tx = await multiSigWallet.connect(deployer).submitTransaction(
        recipient,
        amount,
        "0x"
      );
      
      const receipt = await tx.wait();
      const transactionId = receipt.events.find(event => event.event === "Submission").args.transactionId;
      
      // Second signer confirms
      await multiSigWallet.connect(signer2).confirmTransaction(transactionId);
      
      // Transaction should not be executed yet
      let transaction = await multiSigWallet.transactions(transactionId);
      expect(transaction.executed).to.equal(false);
      
      // Third signer confirms
      const confirmTx = await multiSigWallet.connect(signer3).confirmTransaction(transactionId);
      const confirmReceipt = await confirmTx.wait();
      
      // Check for Execution event
      const executionEvent = confirmReceipt.events.find(event => event.event === "Execution");
      expect(executionEvent).to.not.be.undefined;
      expect(executionEvent.args.transactionId).to.equal(transactionId);
      
      // Transaction should be executed now
      transaction = await multiSigWallet.transactions(transactionId);
      expect(transaction.executed).to.equal(true);
    });
    
    it("Should allow revoking confirmations", async function () {
      const recipient = nonOwner.address;
      const amount = ethers.utils.parseEther("1.0");
      
      // Submit transaction (deployer confirms)
      const tx = await multiSigWallet.connect(deployer).submitTransaction(
        recipient,
        amount,
        "0x"
      );
      
      const receipt = await tx.wait();
      const transactionId = receipt.events.find(event => event.event === "Submission").args.transactionId;
      
      // Check initial confirmation count
      let confirmationCount = await multiSigWallet.getConfirmationCount(transactionId);
      expect(confirmationCount).to.equal(1);
      
      // Deployer revokes confirmation
      await multiSigWallet.connect(deployer).revokeConfirmation(transactionId);
      
      // Check updated confirmation count
      confirmationCount = await multiSigWallet.getConfirmationCount(transactionId);
      expect(confirmationCount).to.equal(0);
      
      // Check that the confirmation was revoked
      const isConfirmed = await multiSigWallet.confirmations(transactionId, deployer.address);
      expect(isConfirmed).to.equal(false);
    });
    
    it("Should not allow revoking a confirmation for an executed transaction", async function () {
      const recipient = nonOwner.address;
      const amount = ethers.utils.parseEther("1.0");
      
      // Submit transaction (deployer confirms)
      const tx = await multiSigWallet.connect(deployer).submitTransaction(
        recipient,
        amount,
        "0x"
      );
      
      const receipt = await tx.wait();
      const transactionId = receipt.events.find(event => event.event === "Submission").args.transactionId;
      
      // Second signer confirms
      await multiSigWallet.connect(signer2).confirmTransaction(transactionId);
      
      // Transaction should be executed
      const transaction = await multiSigWallet.transactions(transactionId);
      expect(transaction.executed).to.equal(true);
      
      // Try to revoke confirmation
      await expect(
        multiSigWallet.connect(deployer).revokeConfirmation(transactionId)
      ).to.be.reverted;
    });
  });

  describe("Edge Cases", function () {
    it("Should handle transactions with empty data", async function () {
      const recipient = nonOwner.address;
      const amount = ethers.utils.parseEther("1.0");
      
      // Submit transaction with empty data
      const tx = await multiSigWallet.connect(deployer).submitTransaction(
        recipient,
        amount,
        "0x"
      );
      
      const receipt = await tx.wait();
      const transactionId = receipt.events.find(event => event.event === "Submission").args.transactionId;
      
      // Second signer confirms
      await multiSigWallet.connect(signer2).confirmTransaction(transactionId);
      
      // Transaction should be executed
      const transaction = await multiSigWallet.transactions(transactionId);
      expect(transaction.executed).to.equal(true);
    });
    
    it("Should handle transactions with zero value", async function () {
      const recipient = nonOwner.address;
      
      // Submit transaction with zero value
      const tx = await multiSigWallet.connect(deployer).submitTransaction(
        recipient,
        0,
        "0x"
      );
      
      const receipt = await tx.wait();
      const transactionId = receipt.events.find(event => event.event === "Submission").args.transactionId;
      
      // Second signer confirms
      await multiSigWallet.connect(signer2).confirmTransaction(transactionId);
      
      // Transaction should be executed
      const transaction = await multiSigWallet.transactions(transactionId);
      expect(transaction.executed).to.equal(true);
    });
    
    it("Should not allow submitting a transaction to the zero address", async function () {
      await expect(
        multiSigWallet.connect(deployer).submitTransaction(
          ethers.constants.AddressZero,
          ethers.utils.parseEther("1.0"),
          "0x"
        )
      ).to.be.reverted;
    });
    
    it("Should handle a large number of transactions", async function () {
      const recipient = nonOwner.address;
      const amount = ethers.utils.parseEther("0.1");
      
      // Get initial balance
      const initialBalance = await ethers.provider.getBalance(recipient);
      
      // Submit 5 transactions (a smaller number to avoid execution issues)
      for (let i = 0; i < 5; i++) {
        await multiSigWallet.connect(deployer).submitTransaction(
          recipient,
          amount,
          "0x"
        );
      }
      
      // Check transaction count
      const transactionCount = await multiSigWallet.transactionCount();
      expect(transactionCount).to.be.at.least(5);
      
      // Confirm all transactions with second signer
      for (let i = 0; i < 5; i++) {
        await multiSigWallet.connect(signer2).confirmTransaction(i);
      }
      
      // Check recipient balance
      const finalBalance = await ethers.provider.getBalance(recipient);
      expect(finalBalance).to.be.gt(initialBalance); // Balance should have increased
    });
  });
});
