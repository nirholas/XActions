---
title: "Mempool APIs: Monitor Pending Transactions and MEV (2026)"
meta_description: "How to access the Ethereum and Bitcoin mempool — track pending transactions, gas spikes, sandwich attacks, and MEV opportunities with standard Ethereum JSON-RPC and Mempool.space."
keywords: "mempool API, pending transaction API, MEV API, eth_feeHistory, Ethereum mempool data"
---

# Mempool APIs: Monitor Pending Transactions and MEV (2026)

The mempool is where transactions wait before being included in a block. Monitoring it reveals gas spikes, large pending transactions, and MEV opportunities.

## Ethereum Mempool via JSON-RPC

Every Ethereum node speaks the same JSON-RPC, so you can watch the mempool without a vendor SDK: point `ETH_WSS_URL` at your own node or any provider that exposes pending transactions. A self-hosted node sees its whole mempool; hosted endpoints often expose a filtered stream or none, so check your provider's docs.

```javascript
import { ethers } from 'ethers';

const provider = new ethers.WebSocketProvider(process.env.ETH_WSS_URL);
const WATCH = '0xYourAddress'.toLowerCase();
const CONTRACT = '0xContractAddress'.toLowerCase();
const iface = new ethers.Interface(contractAbi);

// eth_subscribe("newPendingTransactions") under the hood
provider.on('pending', async (txHash) => {
  const tx = await provider.getTransaction(txHash);
  if (!tx) return; // already mined or dropped

  const gwei = Number(tx.maxFeePerGas ?? tx.gasPrice) / 1e9;
  const eth = Number(ethers.formatEther(tx.value));

  // Watch an address
  if (tx.from.toLowerCase() === WATCH || tx.to?.toLowerCase() === WATCH) {
    console.log(`Pending TX: ${tx.hash} @ ${gwei.toFixed(1)} Gwei`);
    const receipt = await tx.wait();
    console.log('Confirmed:', tx.hash, 'in block', receipt.blockNumber);
  }

  // Watch a contract for pending calls
  if (tx.to?.toLowerCase() === CONTRACT) {
    console.log('Pending contract call:', iface.parseTransaction(tx)?.name);
  }

  // Large transfers
  if (eth > 50) {
    console.log(`Pending: ${eth.toFixed(1)} ETH @ ${gwei.toFixed(0)} Gwei`);
  }
});

// Gas estimates from eth_feeHistory: last 20 blocks, 10th/50th/90th percentile tips
const history = await provider.send('eth_feeHistory', ['0x14', 'latest', [10, 50, 90]]);
const baseFee = Number(BigInt(history.baseFeePerGas.at(-1))) / 1e9;
const tip = (i) => {
  const tips = history.reward.map((r) => Number(BigInt(r[i])) / 1e9).sort((a, b) => a - b);
  return tips[Math.floor(tips.length / 2)];
};
console.log(`Base fee ${baseFee.toFixed(2)} Gwei; tip slow ${tip(0)} / normal ${tip(1)} / fast ${tip(2)} Gwei`);
```

## MEV Detection

```javascript
// Detect sandwich attacks via Flashbots MEV API
const mevBlocks = await fetch('https://blocks.flashbots.net/v1/blocks?limit=10').then(r => r.json());

mevBlocks.blocks.forEach(block => {
  block.transactions.forEach(tx => {
    if (tx.type === 'sandwich') {
      console.log(`Sandwich: ${tx.coinbase_transfer} ETH profit in block ${block.block_number}`);
    }
  });
});
```
