// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

contract PaymentProcessor is ReentrancyGuard {
    event NativePaid(address indexed from, address indexed to, uint256 amount);
    event TokenPaid(address indexed token, address indexed from, address indexed to, uint256 amount);
    event BatchNativePaid(address indexed from, uint256 count, uint256 totalAmount);

    /// @notice Allows contract to receive ETH (required for L2 testnets + top-ups)
    receive() external payable {}

    /// @notice Single native micropayment
    function payNative(address to) external payable nonReentrant {
        require(msg.value > 0, "No value sent");

        (bool success, ) = payable(to).call{value: msg.value}("");
        require(success, "Native transfer failed");

        emit NativePaid(msg.sender, to, msg.value);
    }

    /// @notice Batch native micropayments
    function batchPayNative(address[] calldata recipients, uint256[] calldata amounts)
        external
        payable
        nonReentrant
    {
        require(recipients.length == amounts.length, "Length mismatch");
        uint256 total = 0;

        for (uint256 i = 0; i < amounts.length; i++) {
            total += amounts[i];
        }

        require(msg.value == total, "Incorrect total msg.value");

        for (uint256 i = 0; i < recipients.length; i++) {
            (bool success, ) = payable(recipients[i]).call{value: amounts[i]}("");
            require(success, "Payment failed");
        }

        emit BatchNativePaid(msg.sender, recipients.length, total);
    }

    /// @notice ERC-20 transfer using msg.sender’s allowance
    function payToken(address token, address to, uint256 amount)
        external
        nonReentrant
    {
        require(amount > 0, "Zero amount");

        bool ok = IERC20(token).transferFrom(msg.sender, to, amount);
        require(ok, "Token transfer failed");

        emit TokenPaid(token, msg.sender, to, amount);
    }
}
