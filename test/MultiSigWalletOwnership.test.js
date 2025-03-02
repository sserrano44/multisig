const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("MultiSigWallet Ownership Management", function () {
  let MultiSigWallet;
  let multiSigWallet;
  let deployer, signer2, signer3, signer4, signer5, nonOwner;
  let signers;
  let requiredApprovals;

  beforeEach(async function () {
    // Get signers
    [deployer, signer2, signer3, signer4, signer5, nonOwner] = await ethers.getSigners();
    
    // Set up initial signers and required approvals
    signers = [deployer.address, signer2.address, signer3.address];
    requiredApprovals = 2;
    
    // Deploy the contract
    MultiSigWallet = await ethers.getContractFactory("MultiSigWallet");
    multiSigWallet = await MultiSigWallet.deploy(signers, requiredApprovals);
    await multiSigWallet.deployed();
  });

  // Helper function to create and execute a wallet transaction
  async function executeWalletTransaction(functionName, params) {
    // Encode the function call
    const data = multiSigWallet.interface.encodeFunctionData(functionName, params);
    
    // Submit the transaction
    const tx = await multiSigWallet.connect(deployer).submitTransaction(
      multiSigWallet.address, // destination is the wallet itself
      0, // no ETH value
      data
    );
    
    const receipt = await tx.wait();
    const submissionEvent = receipt.events.find(event => event.event === "Submission");
    const transactionId = submissionEvent.args.transactionId;
    
    // Second signer confirms to reach required confirmations
    await multiSigWallet.connect(signer2).confirmTransaction(transactionId);
    
    return transactionId;
  }

  describe("Adding Owners", function () {
    it("Should allow adding a new owner through wallet transaction", async function () {
      // New owner is not an owner yet
      expect(await multiSigWallet.isOwner(signer4.address)).to.equal(false);
      
      // Execute addOwner through the wallet
      await executeWalletTransaction("addOwner", [signer4.address]);
      
      // Check that the new owner was added
      expect(await multiSigWallet.isOwner(signer4.address)).to.equal(true);
      
      // Check owners array
      const owners = await multiSigWallet.getOwners();
      expect(owners.length).to.equal(4);
      expect(owners).to.include(signer4.address);
    });

    it("Should emit OwnerAddition event when adding an owner", async function () {
      // Submit and confirm the transaction
      const data = multiSigWallet.interface.encodeFunctionData("addOwner", [signer4.address]);
      const tx = await multiSigWallet.connect(deployer).submitTransaction(
        multiSigWallet.address,
        0,
        data
      );
      
      const receipt = await tx.wait();
      const transactionId = receipt.events.find(event => event.event === "Submission").args.transactionId;
      
      // Second confirmation should execute the transaction
      const confirmTx = await multiSigWallet.connect(signer2).confirmTransaction(transactionId);
      const confirmReceipt = await confirmTx.wait();
      
      // Check for OwnerAddition event
      const ownerAdditionEvent = confirmReceipt.events.find(event => event.event === "OwnerAddition");
      expect(ownerAdditionEvent).to.not.be.undefined;
      expect(ownerAdditionEvent.args.owner).to.equal(signer4.address);
    });

    it("Should not allow adding an owner directly (not through wallet)", async function () {
      await expect(
        multiSigWallet.connect(deployer).addOwner(signer4.address)
      ).to.be.reverted;
    });

    it("Should not allow adding an existing owner", async function () {
      // Try to add signer2 who is already an owner
      const data = multiSigWallet.interface.encodeFunctionData("addOwner", [signer2.address]);
      
      // Submit the transaction
      const tx = await multiSigWallet.connect(deployer).submitTransaction(
        multiSigWallet.address,
        0,
        data
      );
      
      const receipt = await tx.wait();
      const transactionId = receipt.events.find(event => event.event === "Submission").args.transactionId;
      
      // Second confirmation should try to execute but fail
      await expect(
        multiSigWallet.connect(signer2).confirmTransaction(transactionId)
      ).to.not.emit(multiSigWallet, "OwnerAddition");
      
      // Transaction should not be executed
      const transaction = await multiSigWallet.transactions(transactionId);
      expect(transaction.executed).to.equal(false);
    });

    it("Should not allow adding the zero address as an owner", async function () {
      // Try to add zero address
      const data = multiSigWallet.interface.encodeFunctionData("addOwner", [ethers.constants.AddressZero]);
      
      // Submit and confirm the transaction
      const tx = await multiSigWallet.connect(deployer).submitTransaction(
        multiSigWallet.address,
        0,
        data
      );
      
      const receipt = await tx.wait();
      const transactionId = receipt.events.find(event => event.event === "Submission").args.transactionId;
      
      // Second confirmation should try to execute but fail
      await expect(
        multiSigWallet.connect(signer2).confirmTransaction(transactionId)
      ).to.not.emit(multiSigWallet, "OwnerAddition");
      
      // Transaction should not be executed
      const transaction = await multiSigWallet.transactions(transactionId);
      expect(transaction.executed).to.equal(false);
    });

    it("Should not allow exceeding MAX_OWNER_COUNT", async function () {
      // Add owners until we reach MAX_OWNER_COUNT (which is 7)
      // We start with 3 owners, so we need to add 4 more
      for (let i = 0; i < 4; i++) {
        const newOwner = ethers.Wallet.createRandom().address;
        await executeWalletTransaction("addOwner", [newOwner]);
      }
      
      // Now we have 7 owners, try to add one more
      const oneMoreOwner = ethers.Wallet.createRandom().address;
      const data = multiSigWallet.interface.encodeFunctionData("addOwner", [oneMoreOwner]);
      
      // Submit and confirm the transaction
      const tx = await multiSigWallet.connect(deployer).submitTransaction(
        multiSigWallet.address,
        0,
        data
      );
      
      const receipt = await tx.wait();
      const transactionId = receipt.events.find(event => event.event === "Submission").args.transactionId;
      
      // Second confirmation should try to execute but fail
      await expect(
        multiSigWallet.connect(signer2).confirmTransaction(transactionId)
      ).to.not.emit(multiSigWallet, "OwnerAddition");
      
      // Transaction should not be executed
      const transaction = await multiSigWallet.transactions(transactionId);
      expect(transaction.executed).to.equal(false);
      
      // Check owner count is still 7
      const owners = await multiSigWallet.getOwners();
      expect(owners.length).to.equal(7);
    });
  });

  describe("Removing Owners", function () {
    it("Should allow removing an owner through wallet transaction", async function () {
      // signer3 is initially an owner
      expect(await multiSigWallet.isOwner(signer3.address)).to.equal(true);
      
      // Execute removeOwner through the wallet
      await executeWalletTransaction("removeOwner", [signer3.address]);
      
      // Check that the owner was removed
      expect(await multiSigWallet.isOwner(signer3.address)).to.equal(false);
      
      // Check owners array
      const owners = await multiSigWallet.getOwners();
      expect(owners.length).to.equal(2);
      expect(owners).to.not.include(signer3.address);
    });

    it("Should emit OwnerRemoval event when removing an owner", async function () {
      // Submit and confirm the transaction
      const data = multiSigWallet.interface.encodeFunctionData("removeOwner", [signer3.address]);
      const tx = await multiSigWallet.connect(deployer).submitTransaction(
        multiSigWallet.address,
        0,
        data
      );
      
      const receipt = await tx.wait();
      const transactionId = receipt.events.find(event => event.event === "Submission").args.transactionId;
      
      // Second confirmation should execute the transaction
      const confirmTx = await multiSigWallet.connect(signer2).confirmTransaction(transactionId);
      const confirmReceipt = await confirmTx.wait();
      
      // Check for OwnerRemoval event
      const ownerRemovalEvent = confirmReceipt.events.find(event => event.event === "OwnerRemoval");
      expect(ownerRemovalEvent).to.not.be.undefined;
      expect(ownerRemovalEvent.args.owner).to.equal(signer3.address);
    });

    it("Should not allow removing an owner directly (not through wallet)", async function () {
      await expect(
        multiSigWallet.connect(deployer).removeOwner(signer3.address)
      ).to.be.reverted;
    });

    it("Should not allow removing a non-owner", async function () {
      // Try to remove nonOwner who is not an owner
      const data = multiSigWallet.interface.encodeFunctionData("removeOwner", [nonOwner.address]);
      
      // Submit the transaction
      const tx = await multiSigWallet.connect(deployer).submitTransaction(
        multiSigWallet.address,
        0,
        data
      );
      
      const receipt = await tx.wait();
      const transactionId = receipt.events.find(event => event.event === "Submission").args.transactionId;
      
      // Second confirmation should try to execute but fail
      await expect(
        multiSigWallet.connect(signer2).confirmTransaction(transactionId)
      ).to.not.emit(multiSigWallet, "OwnerRemoval");
      
      // Transaction should not be executed
      const transaction = await multiSigWallet.transactions(transactionId);
      expect(transaction.executed).to.equal(false);
    });

    it("Should adjust required confirmations if necessary when removing an owner", async function () {
      // Initially we have 3 owners and 2 required confirmations
      
      // Remove signer3
      await executeWalletTransaction("removeOwner", [signer3.address]);
      
      // Now we have 2 owners, required should still be 2
      let required = await multiSigWallet.required();
      expect(required).to.equal(2);
      
      // Add signer4 and signer5 to have 4 owners
      await executeWalletTransaction("addOwner", [signer4.address]);
      await executeWalletTransaction("addOwner", [signer5.address]);
      
      // Change required to 3
      await executeWalletTransaction("changeRequirement", [3]);
      
      // Now we have 4 owners and 3 required confirmations
      required = await multiSigWallet.required();
      expect(required).to.equal(3);
      
      // Remove signer2 - this should not need to adjust required since 3 <= 3
      await executeWalletTransaction("removeOwner", [signer2.address]);
      
      // Get the new required value
      const newRequired = await multiSigWallet.required();
      
      // Now we have 3 owners, required should still be 3
      expect(newRequired).to.equal(3);
    });
  });

  describe("Replacing Owners", function () {
    it("Should allow replacing an owner through wallet transaction", async function () {
      // signer3 is initially an owner, signer4 is not
      expect(await multiSigWallet.isOwner(signer3.address)).to.equal(true);
      expect(await multiSigWallet.isOwner(signer4.address)).to.equal(false);
      
      // Execute replaceOwner through the wallet
      await executeWalletTransaction("replaceOwner", [signer3.address, signer4.address]);
      
      // Check that the owner was replaced
      expect(await multiSigWallet.isOwner(signer3.address)).to.equal(false);
      expect(await multiSigWallet.isOwner(signer4.address)).to.equal(true);
      
      // Check owners array
      const owners = await multiSigWallet.getOwners();
      expect(owners.length).to.equal(3);
      expect(owners).to.not.include(signer3.address);
      expect(owners).to.include(signer4.address);
    });

    it("Should emit OwnerRemoval and OwnerAddition events when replacing an owner", async function () {
      // Submit and confirm the transaction
      const data = multiSigWallet.interface.encodeFunctionData("replaceOwner", [signer3.address, signer4.address]);
      const tx = await multiSigWallet.connect(deployer).submitTransaction(
        multiSigWallet.address,
        0,
        data
      );
      
      const receipt = await tx.wait();
      const transactionId = receipt.events.find(event => event.event === "Submission").args.transactionId;
      
      // Second confirmation should execute the transaction
      const confirmTx = await multiSigWallet.connect(signer2).confirmTransaction(transactionId);
      const confirmReceipt = await confirmTx.wait();
      
      // Check for OwnerRemoval event
      const ownerRemovalEvent = confirmReceipt.events.find(event => event.event === "OwnerRemoval");
      expect(ownerRemovalEvent).to.not.be.undefined;
      expect(ownerRemovalEvent.args.owner).to.equal(signer3.address);
      
      // Check for OwnerAddition event
      const ownerAdditionEvent = confirmReceipt.events.find(event => event.event === "OwnerAddition");
      expect(ownerAdditionEvent).to.not.be.undefined;
      expect(ownerAdditionEvent.args.owner).to.equal(signer4.address);
    });

    it("Should not allow replacing an owner directly (not through wallet)", async function () {
      await expect(
        multiSigWallet.connect(deployer).replaceOwner(signer3.address, signer4.address)
      ).to.be.reverted;
    });

    it("Should not allow replacing a non-owner", async function () {
      // Try to replace nonOwner who is not an owner
      const data = multiSigWallet.interface.encodeFunctionData("replaceOwner", [nonOwner.address, signer4.address]);
      
      // Submit the transaction
      const tx = await multiSigWallet.connect(deployer).submitTransaction(
        multiSigWallet.address,
        0,
        data
      );
      
      const receipt = await tx.wait();
      const transactionId = receipt.events.find(event => event.event === "Submission").args.transactionId;
      
      // Second confirmation should try to execute but fail
      await expect(
        multiSigWallet.connect(signer2).confirmTransaction(transactionId)
      ).to.not.emit(multiSigWallet, "OwnerRemoval");
      
      // Transaction should not be executed
      const transaction = await multiSigWallet.transactions(transactionId);
      expect(transaction.executed).to.equal(false);
    });

    it("Should not allow replacing with an existing owner", async function () {
      // Try to replace signer3 with signer2 who is already an owner
      const data = multiSigWallet.interface.encodeFunctionData("replaceOwner", [signer3.address, signer2.address]);
      
      // Submit the transaction
      const tx = await multiSigWallet.connect(deployer).submitTransaction(
        multiSigWallet.address,
        0,
        data
      );
      
      const receipt = await tx.wait();
      const transactionId = receipt.events.find(event => event.event === "Submission").args.transactionId;
      
      // Second confirmation should try to execute but fail
      await expect(
        multiSigWallet.connect(signer2).confirmTransaction(transactionId)
      ).to.not.emit(multiSigWallet, "OwnerRemoval");
      
      // Transaction should not be executed
      const transaction = await multiSigWallet.transactions(transactionId);
      expect(transaction.executed).to.equal(false);
    });
  });

  describe("Changing Required Confirmations", function () {
    it("Should allow changing the required confirmations through wallet transaction", async function () {
      // Initially required is 2
      expect(await multiSigWallet.required()).to.equal(2);
      
      // Execute changeRequirement through the wallet
      await executeWalletTransaction("changeRequirement", [3]);
      
      // Check that the required confirmations was changed
      expect(await multiSigWallet.required()).to.equal(3);
    });

    it("Should emit RequirementChange event when changing required confirmations", async function () {
      // Submit and confirm the transaction
      const data = multiSigWallet.interface.encodeFunctionData("changeRequirement", [3]);
      const tx = await multiSigWallet.connect(deployer).submitTransaction(
        multiSigWallet.address,
        0,
        data
      );
      
      const receipt = await tx.wait();
      const transactionId = receipt.events.find(event => event.event === "Submission").args.transactionId;
      
      // Second confirmation should execute the transaction
      const confirmTx = await multiSigWallet.connect(signer2).confirmTransaction(transactionId);
      const confirmReceipt = await confirmTx.wait();
      
      // Check for RequirementChange event
      const requirementChangeEvent = confirmReceipt.events.find(event => event.event === "RequirementChange");
      expect(requirementChangeEvent).to.not.be.undefined;
      expect(requirementChangeEvent.args.required).to.equal(3);
    });

    it("Should not allow changing required confirmations directly (not through wallet)", async function () {
      await expect(
        multiSigWallet.connect(deployer).changeRequirement(3)
      ).to.be.reverted;
    });

    it("Should not allow setting required confirmations to 0", async function () {
      // Try to set required to 0
      const data = multiSigWallet.interface.encodeFunctionData("changeRequirement", [0]);
      
      // Submit the transaction
      const tx = await multiSigWallet.connect(deployer).submitTransaction(
        multiSigWallet.address,
        0,
        data
      );
      
      const receipt = await tx.wait();
      const transactionId = receipt.events.find(event => event.event === "Submission").args.transactionId;
      
      // Second confirmation should try to execute but fail
      await expect(
        multiSigWallet.connect(signer2).confirmTransaction(transactionId)
      ).to.not.emit(multiSigWallet, "RequirementChange");
      
      // Transaction should not be executed
      const transaction = await multiSigWallet.transactions(transactionId);
      expect(transaction.executed).to.equal(false);
    });

    it("Should not allow setting required confirmations greater than owner count", async function () {
      // Try to set required to 4 (we only have 3 owners)
      const data = multiSigWallet.interface.encodeFunctionData("changeRequirement", [4]);
      
      // Submit the transaction
      const tx = await multiSigWallet.connect(deployer).submitTransaction(
        multiSigWallet.address,
        0,
        data
      );
      
      const receipt = await tx.wait();
      const transactionId = receipt.events.find(event => event.event === "Submission").args.transactionId;
      
      // Second confirmation should try to execute but fail
      await expect(
        multiSigWallet.connect(signer2).confirmTransaction(transactionId)
      ).to.not.emit(multiSigWallet, "RequirementChange");
      
      // Transaction should not be executed
      const transaction = await multiSigWallet.transactions(transactionId);
      expect(transaction.executed).to.equal(false);
    });
  });
});
