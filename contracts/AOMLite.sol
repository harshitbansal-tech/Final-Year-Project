// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @title AOMLite — very small anonymity-on-message style demo (deposit by hash, claim by secret)
/// @notice Demo-only. Not private / not audited. Do not use on mainnet with real funds.
contract AOMLite {
    // mapping from hash -> amount (wei)
    mapping(bytes32 => uint256) public deposits;
    mapping(bytes32 => address) public depositors;

    event Deposited(bytes32 indexed hash, address indexed from, uint256 amount);
    event Claimed(bytes32 indexed hash, address indexed to, uint256 amount);

    /// @notice deposit ETH under a hash (keccak256(secret))
    function deposit(bytes32 hash) external payable {
        require(msg.value > 0, "zero value");
        require(deposits[hash] == 0, "already deposited");

        deposits[hash] = msg.value;
        depositors[hash] = msg.sender;

        emit Deposited(hash, msg.sender, msg.value);
    }

    /// @notice claim funds by presenting the secret which hashes to a stored hash, and send to `to`
    /// @param secret the preimage which when hashed equals the deposit key
    /// @param to the recipient receiving the funds
    function claim(bytes calldata secret, address payable to) external {
        bytes32 h = keccak256(secret);
        uint256 amount = deposits[h];
        require(amount > 0, "no deposit");
        // delete first to avoid reentrancy / double-claim
        delete deposits[h];
        address depos = depositors[h];
        depositors[h] = address(0);

        // transfer ETH to `to`
        (bool ok,) = to.call{ value: amount }("");
        require(ok, "transfer failed");

        emit Claimed(h, to, amount);
    }
}
