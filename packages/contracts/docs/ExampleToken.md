# Solidity API

## ExampleToken

This is an example ERC20 token contract with comprehensive NatSpec documentation

_This contract demonstrates proper NatSpec usage for documentation generation_

### MAX_SUPPLY

```solidity
uint256 MAX_SUPPLY
```

Maximum supply of tokens that can ever be minted

_Set to 1 billion tokens with 18 decimals_

### treasury

```solidity
address treasury
```

Address of the treasury where fees are collected

_Can be updated by the owner_

### TreasuryUpdated

```solidity
event TreasuryUpdated(address oldTreasury, address newTreasury)
```

Emitted when the treasury address is updated

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| oldTreasury | address | The previous treasury address |
| newTreasury | address | The new treasury address |

### TokensMinted

```solidity
event TokensMinted(address to, uint256 amount)
```

Emitted when tokens are minted

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| to | address | The address that received the tokens |
| amount | uint256 | The amount of tokens minted |

### constructor

```solidity
constructor(address initialOwner, address initialTreasury) public
```

Constructs the ExampleToken contract

_Initializes the ERC20 token with name "Example Token" and symbol "EXT"_

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| initialOwner | address | The address that will be set as the initial owner |
| initialTreasury | address | The initial treasury address for fee collection |

### mint

```solidity
function mint(address to, uint256 amount) external returns (bool success)
```

Mints tokens to a specified address

_Only the owner can mint tokens, and the total supply cannot exceed MAX_SUPPLY_

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| to | address | The address to mint tokens to |
| amount | uint256 | The amount of tokens to mint |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| success | bool | True if the minting was successful |

### updateTreasury

```solidity
function updateTreasury(address newTreasury) external
```

Updates the treasury address

_Only the owner can update the treasury address_

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| newTreasury | address | The new treasury address |

### getTreasury

```solidity
function getTreasury() external view returns (address)
```

Returns the current treasury address

_This is a view function that doesn't modify state_

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | address | The current treasury address |

### getMaxSupply

```solidity
function getMaxSupply() external pure returns (uint256)
```

Returns the maximum supply of tokens

_This is a view function that returns the constant MAX_SUPPLY_

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | uint256 | The maximum supply of tokens |

