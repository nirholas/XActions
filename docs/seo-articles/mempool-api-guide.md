---
title: "Mempool APIs: Monitor Pending Transactions and MEV (2026)"
meta_description: "How to access the Ethereum and Bitcoin mempool — track pending transactions, gas spikes, sandwich attacks, and MEV opportunities using Blocknative and Mempool.space."
keywords: "mempool API, pending transaction API, MEV API, Blocknative API, Ethereum mempool data"
---

# Mempool APIs: Monitor Pending Transactions and MEV (2026)

The mempool is where transactions wait before being included in a block. Monitoring it reveals gas spikes, large pending transactions, and MEV opportunities.

## Blocknative (Ethereum Mempool)

```javascript
import BlocknativeSDK from 'bnc-sdk';
import WebSocket from 'ws';

const blocknative = new BlocknativeSDK({
  dappId: process.env.BLOCKNATIVE_KEY,
  networkId: 1,
  ws: WebSocket
});

// Watch an address for pending transactions
const { emitter } = blocknative.account('0xYourAddress');

emitter.on('txPool', (transaction) => {
  console.log('Pending TX:', transaction.hash);
  console.log('Gas price:', parseInt(transaction.gasPrice) / 1e9, 'Gwei');
});

emitter.on('txConfirmed', (transaction) => {
  console.log('Confirmed:', transaction.hash, 'in block', transaction.blockNumber);
});

// Watch a contract for pending calls
blocknative.contract({
  address: '0xContractAddress',
  abi: contractAbi
}).on('txPool', (transaction) => {
  console.log('Pending contract call:', transaction.contractCall?.methodName);
});
```

## Mempool.space (Bitcoin)

```javascript
const BASE = 'https://mempool.space/api';

// Mempool overview
const mempool = await fetch(`${BASE}/mempool`).then(r => r.json());
console.log('Pending TXs:', mempool.count);
console.log('Mempool size:', (mempool.vsize / 1e6).toFixed(1), 'MB');

// Fee recommendations
const fees = await fetch(`${BASE}/v1/fees/recommended`).then(r => r.json());
console.log('Fastest:', fees.fastestFee, 'sat/vB (~10 min)');
console.log('Hour:', fees.hourFee, 'sat/vB');
console.log('Day:', fees.minimumFee, 'sat/vB');

// Specific transaction status
const tx = await fetch(`${BASE}/tx/TXID`).then(r => r.json());
console.log('Confirmed:', tx.status.confirmed);
console.log('Block:', tx.status.block_height);
console.log('Fee rate:', tx.fee / tx.weight * 4, 'sat/vB');

// Real-time via WebSocket
const ws = new WebSocket('wss://mempool.space/api/v1/ws');
ws.on('open', () => ws.send(JSON.stringify({ action: 'init' })));
ws.on('message', (data) => {
  const msg = JSON.parse(data);
  if (msg['mempool-blocks']) {
    console.log('Next block fee:', msg['mempool-blocks'][0].feeRange);
  }
});
```

## Ethereum Pending TX via RPC

```javascript
// Watch for large pending transactions
const provider = new ethers.WebSocketProvider(process.env.ETH_WSS_URL);

provider.on('pending', async (txHash) => {
  const tx = await provider.getTransaction(txHash);
  if (!tx) return;

  const eth = parseFloat(ethers.formatEther(tx.value));
  const gasPrice = parseInt(tx.gasPrice || tx.maxFeePerGas) / 1e9;

  if (eth > 50) {
    console.log(`Pending: ${eth.toFixed(1)} ETH @ ${gasPrice.toFixed(0)} Gwei`);
  }
});
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
