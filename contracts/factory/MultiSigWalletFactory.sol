pragma solidity 0.8.16;

import "./Factory.sol";
import "../MultiSigWallet.sol";

/// @title Multisignature wallet factory - Allows creation of multisig wallet.
/// @author Stefan George - <stefan.george@consensys.net>
contract MultiSigWalletFactory is Factory {
    /// @dev Allows verified creation of multisignature wallet.
    /// @param _owners List of initial owners.
    /// @param _required Number of required confirmations.
    /// @return Returns wallet address.
    function create(address[] calldata _owners, uint256 _required)
        external
        returns (address)
    {
        address wallet = address(new MultiSigWallet(_owners, _required));
        register(wallet);

        return wallet;
    }
}