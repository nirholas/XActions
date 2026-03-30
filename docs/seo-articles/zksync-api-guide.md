---
title: "zkSync Era API Guide: Zero-Knowledge Rollup Development (2026)"
meta_description: "Build on zkSync Era — setup, RPC endpoints, zkSync SDK, account abstraction, and paymasters for gasless transactions."
keywords: "zkSync API, zkSync Era RPC, zkSync developer guide, zero-knowledge rollup API, zkSync account abstraction"
---

# zkSync Era API Guide: Zero-Knowledge Rollup Development (2026)

zkSync Era is a ZK rollup with full EVM compatibility, native account abstraction, and paymaster support for gasless UX.

## RPC and Setup

```javascript
import { Provider, Wallet } from 'zksync-ethers';
import { ethers } from 'ethers';

const provider = new Provider('https://mainnet.era.zksync.io');
// Chain ID: 324

// Standard ethers.js also works
const ethersProvider = new ethers.JsonRpcProvider('https://mainnet.era.zksync.io');
```

## Balances

```javascript
// ETH balance
const balance = await provider.getBalance('0xAddress');
console.log(ethers.formatEther(balance), 'ETH');

// ERC-20 balance
const tokenBalance = await provider.getBalance('0xAddress', 'latest', '0xTokenAddress');
console.log(ethers.formatUnits(tokenBalance, 6), 'USDC');
```

## Sending Transactions

```javascript
const wallet = new Wallet(process.env.PRIVATE_KEY, provider);

// ETH transfer
const tx = await wallet.transfer({
  to: '0xRecipient',
  amount: ethers.parseEther('0.01')
});
await tx.wait();

// ERC-20 transfer
const erc20Tx = await wallet.transfer({
  to: '0xRecipient',
  amount: ethers.parseUnits('100', 6),
  token: '0xTokenAddress'
});
```

## Account Abstraction + Paymasters

```javascript
import { utils } from 'zksync-ethers';

// Use a paymaster to sponsor gas (user pays in ERC-20 or free)
const paymasterParams = utils.getPaymasterParams('0xPaymasterAddress', {
  type: 'ApprovalBased',
  token: '0xUSDCAddress',
  minimalAllowance: ethers.parseUnits('1', 6),
  innerInput: new Uint8Array()
});

const tx = await wallet.transfer({
  to: '0xRecipient',
  amount: ethers.parseEther('0.01'),
  customData: {
    gasPerPubdata: utils.DEFAULT_GAS_PER_PUBDATA_LIMIT,
    paymasterParams
  }
});
```

## Deploy a Contract

```javascript
import { ContractFactory } from 'zksync-ethers';

const factory = new ContractFactory(abi, bytecode, wallet);
const contract = await factory.deploy(/* constructor args */);
await contract.waitForDeployment();
console.log('Deployed at:', await contract.getAddress());
```

## Explorer API (zkSync Era block explorer)

```javascript
const BASE = 'https://block-explorer-api.mainnet.zksync.io/api';

// Account transactions
const txns = await fetch(
  `${BASE}?module=account&action=txlist&address=0xAddress&sort=desc`
).then(r => r.json());

// Token transfers
const transfers = await fetch(
  `${BASE}?module=account&action=tokentx&address=0xAddress&sort=desc`
).then(r => r.json());
```

## Bridge (L1 → zkSync)

```javascript
import { L1Signer, Provider } from 'zksync-ethers';

const l1Provider = new ethers.JsonRpcProvider(process.env.ETH_RPC_URL);
const zkProvider = new Provider('https://mainnet.era.zksync.io');
const l1Signer = L1Signer.from(wallet.connect(l1Provider), zkProvider);

// Deposit ETH to zkSync
const deposit = await l1Signer.deposit({
  token: utils.ETH_ADDRESS,
  amount: ethers.parseEther('0.01')
});
await deposit.wait();
```
