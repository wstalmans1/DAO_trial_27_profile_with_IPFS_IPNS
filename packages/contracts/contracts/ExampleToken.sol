// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title ExampleToken
 * @author Your Name
 * @notice This is an example ERC20 token contract with comprehensive NatSpec documentation
 * @dev This contract demonstrates proper NatSpec usage for documentation generation
 * @custom:security-contact security@example.com
 */
contract ExampleToken is ERC20, Ownable {
    /// @notice Maximum supply of tokens that can ever be minted
    /// @dev Set to 1 billion tokens with 18 decimals
    uint256 public constant MAX_SUPPLY = 1_000_000_000 * 10**18;

    /// @notice Address of the treasury where fees are collected
    /// @dev Can be updated by the owner
    address public treasury;

    /// @notice Emitted when the treasury address is updated
    /// @param oldTreasury The previous treasury address
    /// @param newTreasury The new treasury address
    event TreasuryUpdated(address indexed oldTreasury, address indexed newTreasury);

    /// @notice Emitted when tokens are minted
    /// @param to The address that received the tokens
    /// @param amount The amount of tokens minted
    event TokensMinted(address indexed to, uint256 amount);

    /**
     * @notice Constructs the ExampleToken contract
     * @dev Initializes the ERC20 token with name "Example Token" and symbol "EXT"
     * @param initialOwner The address that will be set as the initial owner
     * @param initialTreasury The initial treasury address for fee collection
     */
    constructor(address initialOwner, address initialTreasury) ERC20("Example Token", "EXT") Ownable(initialOwner) {
        require(initialTreasury != address(0), "ExampleToken: treasury cannot be zero address");
        treasury = initialTreasury;
    }

    /**
     * @notice Mints tokens to a specified address
     * @dev Only the owner can mint tokens, and the total supply cannot exceed MAX_SUPPLY
     * @param to The address to mint tokens to
     * @param amount The amount of tokens to mint
     * @return success True if the minting was successful
     */
    function mint(address to, uint256 amount) external onlyOwner returns (bool success) {
        require(to != address(0), "ExampleToken: cannot mint to zero address");
        require(totalSupply() + amount <= MAX_SUPPLY, "ExampleToken: would exceed max supply");
        
        _mint(to, amount);
        emit TokensMinted(to, amount);
        return true;
    }

    /**
     * @notice Updates the treasury address
     * @dev Only the owner can update the treasury address
     * @param newTreasury The new treasury address
     */
    function updateTreasury(address newTreasury) external onlyOwner {
        require(newTreasury != address(0), "ExampleToken: treasury cannot be zero address");
        address oldTreasury = treasury;
        treasury = newTreasury;
        emit TreasuryUpdated(oldTreasury, newTreasury);
    }

    /**
     * @notice Returns the current treasury address
     * @dev This is a view function that doesn't modify state
     * @return The current treasury address
     */
    function getTreasury() external view returns (address) {
        return treasury;
    }

    /**
     * @notice Returns the maximum supply of tokens
     * @dev This is a view function that returns the constant MAX_SUPPLY
     * @return The maximum supply of tokens
     */
    function getMaxSupply() external pure returns (uint256) {
        return MAX_SUPPLY;
    }
}
