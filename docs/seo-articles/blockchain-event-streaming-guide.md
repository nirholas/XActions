---
title: "Blockchain Event Streaming: Real-Time On-Chain Notifications (2026)"
meta_description: "How to stream real-time blockchain events — smart contract logs, transactions, and token transfers — using Alchemy Webhooks, Moralis Streams, and WebSockets."
keywords: "blockchain event streaming, smart contract events, Alchemy webhooks, Moralis Streams, on-chain notifications"
---

# Blockchain Event Streaming: Real-Time On-Chain Notifications (2026)

Real-time on-chain event delivery is critical for DeFi liquidation bots, portfolio alerts, NFT snipers, and exchange monitoring. Here are the main approaches.

## Alchemy Webhooks (Notify)

```javascript
import { Alchemy, WebhookType } from 'alchemy-sdk';

const alchemy = new Alchemy({ apiKey: process.env.ALCHEMY_KEY });

// Watch an address for any activity
const webhook = await alchemy.notify.createWebhook(
  'https://yourapp.com/webhook',
  WebhookType.ADDRESS_ACTIVITY,
  { addresses: ['0xYourAddress'] }
);
console.log('Webhook ID:', webhook.id);

// Watch for NFT activity
const nftWebhook = await alchemy.notify.createWebhook(
  'https://yourapp.com/nft-webhook',
  WebhookType.NFT_ACTIVITY,
  {
    filters: [{
      contractAddress: '0xBC4CA0EdA7647A8aB7C2061c2E118A18a936f13D',
      tokenId: ['1', '2', '3']
    }]
  }
);

// Webhook handler (Express)
app.post('/webhook', express.json({ verify: (req, res, buf) => { req.rawBody = buf; } }), (req, res) => {
  const isValid = alchemy.notify.verifyWebhookSignature(
    req.rawBody.toString(),
    req.headers['x-alchemy-signature'],
    process.env.WEBHOOK_SIGNING_KEY
  );
  if (!isValid) return res.status(401).send('Invalid');

  const { event } = req.body;
  console.log('Event type:', event.eventId);
  event.activity?.forEach(a => console.log(`${a.fromAddress} → ${a.toAddress}: ${a.value} ETH`));
  res.sendStatus(200);
});
```

## Moralis Streams

```javascript
import Moralis from 'moralis';

await Moralis.start({ apiKey: process.env.MORALIS_KEY });

const stream = await Moralis.Streams.add({
  chains: ['0x1'],
  description: 'Large USDC transfers',
  tag: 'usdc-whale',
  webhookUrl: 'https://yourapp.com/stream',
  abi: [{
    anonymous: false,
    inputs: [
      { indexed: true, name: 'from', type: 'address' },
      { indexed: true, name: 'to', type: 'address' },
      { name: 'value', type: 'uint256' }
    ],
    name: 'Transfer',
    type: 'event'
  }],
  topic0: ['Transfer(address,address,uint256)'],
  address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
  includeNativeTxs: false
});

// Add filter for large transfers only
await Moralis.Streams.addAdvancedOptions({
  id: stream.result.id,
  topic0: 'Transfer(address,address,uint256)',
  filter: { gt: ['value', (1_000_000 * 1e6).toString()] } // >$1M USDC
});
```

## ethers.js Event Subscriptions

```javascript
const provider = new ethers.WebSocketProvider(process.env.ETH_WSS_URL);

// Listen to all new blocks
provider.on('block', async (blockNumber) => {
  const block = await provider.getBlock(blockNumber, true);
  console.log(`Block ${blockNumber}: ${block.transactions.length} txns`);
});

// Listen to contract events
const usdc = new ethers.Contract(USDC_ADDRESS, usdcAbi, provider);

usdc.on('Transfer', (from, to, value, event) => {
  const amount = Number(value) / 1e6;
  if (amount > 100_000) {
    console.log(`💵 $${amount.toLocaleString()} USDC transfer`);
    console.log(`   ${from} → ${to}`);
    console.log(`   Block: ${event.blockNumber}`);
  }
});

// Query past events
const filter = usdc.filters.Transfer(null, null);
const events = await usdc.queryFilter(filter, -1000); // last 1000 blocks
```

## QuickNode Streams

```javascript
// QuickNode Streams push data to your endpoint via HTTP
// Configure at dashboard.quicknode.com/streams

// Your endpoint receives:
app.post('/quicknode-stream', express.json(), (req, res) => {
  const blocks = req.body;
  blocks.forEach(block => {
    block.transactions?.forEach(tx => {
      if (BigInt(tx.value) > BigInt('100000000000000000000')) { // >100 ETH
        console.log(`Large TX: ${parseInt(tx.value) / 1e18} ETH`);
      }
    });
  });
  res.sendStatus(200);
});
```
