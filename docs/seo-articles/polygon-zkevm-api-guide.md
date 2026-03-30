---
title: "Polygon zkEVM API Guide: ZK Rollup on Ethereum (2026)"
meta_description: "Build on Polygon zkEVM — setup, RPC endpoints, bridge, and deploy EVM contracts on a zero-knowledge rollup with full Ethereum equivalence."
keywords: "Polygon zkEVM API, zkEVM developer guide, Polygon ZK rollup, zkEVM RPC, ZK Ethereum"
---

# Polygon zkEVM API Guide: ZK Rollup on Ethereum (2026)

Polygon zkEVM is a type 2 ZK-EVM — fully Ethereum-equivalent, using ZK proofs for L1 security at L2 costs.

## RPC Endpoints

| Network | RPC | Chain ID |
|---|---|---|
| zkEVM Mainnet | `https://zkevm-rpc.com` | 1101 |
| Cardona Testnet | `https://rpc.cardona.zkevm-rpc.com` | 2442 |

```javascript
import { ethers } from 'ethers';
const provider = new ethers.JsonRpcProvider('https://zkevm-rpc.com');
```

## Full EVM Compatibility

All standard ethers.js calls work identically:

```javascript
const balance = await provider.getBalance('0xAddress');
const block = await provider.getBlock('latest');
const tx = await provider.getTransaction('0xHash');

// Deploy contracts exactly as on Ethereum
const factory = new ethers.ContractFactory(abi, bytecode, signer);
const contract = await factory.deploy();
```

## Bridge (Ethereum → zkEVM)

```javascript
const BRIDGE_ADDRESS = '0x2a3DD3EB832aF982ec71669E178424b10Dca2EDe';
const bridgeAbi = [
  'function bridgeAsset(uint32 destinationNetwork, address destinationAddress, uint256 amount, address token, bool forceUpdateGlobalExitRoot, bytes permitData) payable'
];

const bridge = new ethers.Contract(BRIDGE_ADDRESS, bridgeAbi, l1Signer);

// Bridge ETH
await bridge.bridgeAsset(
  1,           // destination network (1 = zkEVM)
  recipient,
  ethers.parseEther('0.01'),
  ethers.ZeroAddress, // ETH
  true,
  '0x',
  { value: ethers.parseEther('0.01') }
);
```

## zkEVM Explorer API

```javascript
// Same Etherscan-compatible API
const BASE = 'https://api-zkevm.polygonscan.com/api';
const key = process.env.POLYGONSCAN_KEY;

const txns = await fetch(
  `${BASE}?module=account&action=txlist&address=0xAddress&sort=desc&apikey=${key}`
).then(r => r.json());
```

## Gas on zkEVM

zkEVM gas works like Ethereum mainnet but is significantly cheaper:

```javascript
const feeData = await provider.getFeeData();
console.log('Gas price:', ethers.formatUnits(feeData.gasPrice, 'gwei'), 'Gwei');
// Typically 0.1-1 Gwei vs. Ethereum's 5-50 Gwei

const estimate = await provider.estimateGas({ to: '0xAddress', value: ethers.parseEther('0.01') });
const cost = estimate * feeData.gasPrice;
console.log('Transfer cost:', ethers.formatEther(cost), 'ETH');
```

## QuickSwap on zkEVM

```javascript
const QUICKSWAP_ROUTER = '0xF6Ad3CcF71Abb3E12beCf6b3D2a74C963859ADCd';

const routerAbi = ['function getAmountsOut(uint amountIn, address[] memory path) view returns (uint[] memory amounts)'];
const router = new ethers.Contract(QUICKSWAP_ROUTER, routerAbi, provider);

const MATIC = '0xa2036f0538221a77A3937F1379699f44945018d0';
const USDC = '0xA8CE8aee21bC2A48a5EF670afCc9274C7bbbC035';

const amounts = await router.getAmountsOut(ethers.parseEther('1'), [MATIC, USDC]);
console.log('1 MATIC =', ethers.formatUnits(amounts[1], 6), 'USDC');
```
