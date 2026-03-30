---
title: "Web3 Data Indexing: Build Custom Blockchain Indexers (2026)"
meta_description: "How to index blockchain data with Ponder, The Graph, or custom indexers using ethers.js. Store on-chain events in PostgreSQL for fast queries."
keywords: "blockchain indexer, Web3 data indexing, Ponder indexer, custom blockchain indexer, on-chain data pipeline"
---

# Web3 Data Indexing: Build Custom Blockchain Indexers (2026)

Querying raw blockchain data is slow. Indexers transform on-chain events into queryable databases — the same architecture used by Etherscan, Uniswap, and every major DeFi frontend.

## Option 1: Ponder (Recommended for Custom Indexers)

```bash
npm create ponder@latest
```

```javascript
// ponder.config.ts
import { createConfig } from '@ponder/core';
import { http } from 'viem';

export default createConfig({
  networks: {
    mainnet: { chainId: 1, transport: http(process.env.ETH_RPC_URL) }
  },
  contracts: {
    USDC: {
      network: 'mainnet',
      abi: erc20Abi,
      address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
      startBlock: 6082465
    }
  }
});
```

```javascript
// src/index.ts
import { ponder } from '@/generated';

ponder.on('USDC:Transfer', async ({ event, context }) => {
  const { from, to, value } = event.args;

  await context.db.Transfer.upsert({
    id: event.log.id,
    create: {
      from,
      to,
      amount: value,
      timestamp: BigInt(event.block.timestamp),
      txHash: event.transaction.hash
    },
    update: {}
  });
});
```

## Option 2: Custom Indexer with ethers.js + PostgreSQL

```javascript
import { ethers } from 'ethers';
import pg from 'pg';

const provider = new ethers.JsonRpcProvider(process.env.ETH_RPC_URL);
const db = new pg.Pool({ connectionString: process.env.DATABASE_URL });

await db.query(`
  CREATE TABLE IF NOT EXISTS transfers (
    id SERIAL PRIMARY KEY,
    block_number INTEGER,
    tx_hash TEXT,
    from_address TEXT,
    to_address TEXT,
    amount NUMERIC,
    timestamp TIMESTAMPTZ
  )
`);

const usdc = new ethers.Contract(USDC_ADDRESS, erc20Abi, provider);

async function indexRange(fromBlock, toBlock) {
  const filter = usdc.filters.Transfer();
  const events = await usdc.queryFilter(filter, fromBlock, toBlock);

  for (const event of events) {
    const block = await provider.getBlock(event.blockNumber);
    await db.query(
      'INSERT INTO transfers (block_number, tx_hash, from_address, to_address, amount, timestamp) VALUES ($1,$2,$3,$4,$5,$6) ON CONFLICT DO NOTHING',
      [event.blockNumber, event.transactionHash, event.args.from, event.args.to, event.args.value.toString(), new Date(block.timestamp * 1000)]
    );
  }
}

// Backfill
const startBlock = 6082465;
const latest = await provider.getBlockNumber();
for (let b = startBlock; b < latest; b += 2000) {
  await indexRange(b, Math.min(b + 1999, latest));
  console.log(`Indexed to block ${b + 2000}`);
}
```

## Option 3: The Graph (Decentralized)

```bash
graph init --product subgraph-studio my-subgraph
```

```yaml
# subgraph.yaml
dataSources:
  - kind: ethereum
    name: USDC
    network: mainnet
    source:
      address: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48"
      abi: ERC20
      startBlock: 6082465
    mapping:
      kind: ethereum/events
      eventHandlers:
        - event: Transfer(indexed address,indexed address,uint256)
          handler: handleTransfer
```

## Real-Time + Historical Combined

```javascript
// 1. Backfill historical data
await backfillEvents(deployBlock, currentBlock);

// 2. Switch to real-time listening
usdc.on('Transfer', async (from, to, value, event) => {
  await db.query('INSERT INTO transfers ...', [event.blockNumber, ...]);
});
```
