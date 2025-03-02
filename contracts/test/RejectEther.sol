// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity 0.8.16;

// Contract that rejects ETH
contract RejectEther {
  // Reject any ETH sent to this contract
  receive() external payable {
    revert("ETH not accepted");
  }
}
