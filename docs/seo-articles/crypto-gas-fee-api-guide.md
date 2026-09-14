---
title: "Crypto Gas Fee APIs: Estimate and Optimize Transaction Costs (2026)"
meta_description: "How to fetch real-time gas prices for Ethereum, Polygon, Arbitrum, and other chains. Compare gas estimation APIs and build gas-aware applications."
keywords: "gas fee API, Ethereum gas price API, gas estimation API, EIP-1559 gas API, crypto transaction fee API"
---

# Crypto Gas Fee APIs: Estimate and Optimize Transaction Costs (2026)

Gas fees are a critical UX concern for any dApp. This guide covers how to fetch accurate gas estimates, implement EIP-1559 fee strategies, and build gas-aware applications.

## Ethereum Gas (EIP-1559)

```javascript
import { ethers } from 'ethers';

const provider = new ethers.JsonRpcProvider(process.env.ETH_RPC_URL);

// Get fee data
const feeData = await provider.getFeeData();
console.log('Base fee:', ethers.formatUnits(feeData.gasPrice, 'gwei'), 'Gwei');
console.log('Max fee:', ethers.formatUnits(feeData.maxFeePerGas, 'gwei'), 'Gwei');
console.log('Priority fee:', ethers.formatUnits(feeData.maxPriorityFeePerGas, 'gwei'), 'Gwei');

// Estimate gas for a transaction
const gasEstimate = await provider.estimateGas({
  to: '0xRecipient',
  value: ethers.parseEther('0.01')
});
console.log('Gas units:', gasEstimate.toString());

// Total fee estimate
const totalFee = gasEstimate * feeData.maxFeePerGas;
console.log('Max cost:', ethers.formatEther(totalFee), 'ETH');
```

## Etherscan Gas Oracle

```javascript
const res = await fetch(
  `https://api.etherscan.io/api?module=gastracker&action=gasoracle&apikey=${process.env.ETHERSCAN_KEY}`
);
const { result } = await res.json();
console.log('Safe:', result.SafeGasPrice, 'Gwei');
console.log('Propose:', result.ProposeGasPrice, 'Gwei');
console.log('Fast:', result.FastGasPrice, 'Gwei');
console.log('Base fee:', result.suggestBaseFee, 'Gwei');
```

## Native RPC Fee History

Prefer your existing chain RPC provider for fee estimation. `eth_feeHistory`
is standardized across EIP-1559 networks, avoids a vendor-specific dependency,
and lets you choose a percentile appropriate to your application.

```javascript
const history = await provider.send('eth_feeHistory', [
  '0x5',
  'latest',
  [10, 50, 90],
]);

const latestBaseFee = BigInt(history.baseFeePerGas.at(-1));
const medianPriorityFee = BigInt(history.reward.at(-1)[1]);
const maxFeePerGas = latestBaseFee * 2n + medianPriorityFee;

console.log('Base fee:', ethers.formatUnits(latestBaseFee, 'gwei'), 'Gwei');
console.log('Priority fee:', ethers.formatUnits(medianPriorityFee, 'gwei'), 'Gwei');
console.log('Suggested max fee:', ethers.formatUnits(maxFeePerGas, 'gwei'), 'Gwei');
```

## Mempool.space (Bitcoin)

```javascript
const fees = await fetch('https://mempool.space/api/v1/fees/recommended').then(r => r.json());
console.log('Fastest fee:', fees.fastestFee, 'sat/vB'); // ~10 min
console.log('Half hour:', fees.halfHourFee, 'sat/vB');
console.log('Hour fee:', fees.hourFee, 'sat/vB');
console.log('Economy:', fees.economyFee, 'sat/vB');
console.log('Minimum:', fees.minimumFee, 'sat/vB');
```

## Multi-Chain Gas Comparison

```javascript
async function getGasForChain(chainName, rpcUrl) {
  const provider = new ethers.JsonRpcProvider(rpcUrl);
  const feeData = await provider.getFeeData();
  const ethTransferGas = 21000n;
  const costInGwei = ethTransferGas * feeData.gasPrice / 1_000_000_000n;
  return { chain: chainName, gweiPerGas: ethers.formatUnits(feeData.gasPrice, 'gwei'), transferCostGwei: costInGwei.toString() };
}

const chains = [
  { name: 'Ethereum', rpc: process.env.ETH_RPC },
  { name: 'Polygon', rpc: process.env.POLYGON_RPC },
  { name: 'Arbitrum', rpc: process.env.ARB_RPC },
  { name: 'Base', rpc: process.env.BASE_RPC },
];

const gasCosts = await Promise.all(chains.map(c => getGasForChain(c.name, c.rpc)));
gasCosts.sort((a, b) => parseFloat(a.gweiPerGas) - parseFloat(b.gweiPerGas)).forEach(c => {
  console.log(`${c.chain}: ${parseFloat(c.gweiPerGas).toFixed(3)} Gwei`);
});
```

## Gas-Aware Transaction Sending

```javascript
async function sendWithGasStrategy(tx, strategy = 'standard') {
  const feeData = await provider.getFeeData();
  const base = feeData.lastBaseFeePerGas;

  const multipliers = { slow: 1.0, standard: 1.2, fast: 1.5 };
  const m = multipliers[strategy];

  return signer.sendTransaction({
    ...tx,
    maxFeePerGas: base * BigInt(Math.floor(m * 100)) / 100n + ethers.parseUnits('1', 'gwei'),
    maxPriorityFeePerGas: ethers.parseUnits(strategy === 'fast' ? '2' : '1', 'gwei')
  });
}
```
