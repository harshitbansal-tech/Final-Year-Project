// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

contract PaymentProcessorV2 is ReentrancyGuard {
    event NativePaid(address indexed from, address indexed to, uint256 amount);
    event BatchNativePaid(address indexed payer, uint256 total, uint256 batchSize);

    /// @notice Allow contract to receive ETH directly
    receive() external payable {}

    /// @notice Single native micropayment (what your frontend is calling)
    function payNative(address to) external payable nonReentrant {
        require(msg.value > 0, "No value sent");

        (bool sent, ) = payable(to).call{value: msg.value}("");
        require(sent, "Transfer failed");

        emit NativePaid(msg.sender, to, msg.value);
    }

    /// @notice Batch native micropayments
    function batchPayNative(
        address[] calldata recipients,
        uint256[] calldata amounts
    ) external payable nonReentrant {
        require(recipients.length == amounts.length, "Mismatched arrays");

        uint256 total = 0;
        for (uint256 i = 0; i < amounts.length; i++) {
            total += amounts[i];
        }
        require(total == msg.value, "Incorrect msg.value");

        for (uint256 i = 0; i < recipients.length; i++) {
            (bool sent, ) = payable(recipients[i]).call{value: amounts[i]}("");
            require(sent, "Transfer failed");
        }

        emit BatchNativePaid(msg.sender, msg.value, recipients.length);
    }
}
