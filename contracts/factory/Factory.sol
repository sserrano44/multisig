pragma solidity 0.8.16;

contract Factory {
    event ContractInstantiation(address indexed sender, address instantiation);

    mapping(address => bool) public isInstantiation;
    mapping(address => address[]) public instantiations;

    /// @dev Returns number of instantiations by creator.
    /// @param creator Contract creator.
    /// @return Returns number of instantiations by creator.
    function getInstantiationCount(address creator)
        external
        view
        returns (uint256)
    {
        return instantiations[creator].length;
    }

    /// @dev Registers contract in factory registry.
    /// @param instantiation Address of contract instantiation.
    function register(address instantiation)
        internal
    {
        isInstantiation[instantiation] = true;
        instantiations[msg.sender].push(instantiation);
        emit ContractInstantiation(msg.sender, instantiation);
    }
}