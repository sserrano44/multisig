// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity 0.8.16;

// Test contract for function calls
contract TestContract {
  uint public value;
  
  function setValue(uint _value) external {
    value = _value;
  }
  
  function revertFunction() external pure {
    revert("Function reverted");
  }
}
