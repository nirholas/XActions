---
title: "On-Chain Analytics APIs: Whale Tracking and Flow Analysis (2026)"
meta_description: "Build on-chain analytics with APIs — track whale wallets, monitor exchange inflows/outflows, detect large transfers, and analyze token holder distribution."
keywords: "on-chain analytics API, whale tracking API, exchange flow API, token holder API, blockchain analytics"
---

# On-Chain Analytics APIs: Whale Tracking and Flow Analysis (2026)

On-chain data reveals what's happening beneath price action — where large holders are moving funds, whether exchange inflows are rising (bearish) or falling (bullish), and who's accumulating.

## Exchange Flow Detection

```javascript
import { Alchemy } from 'alchemy-sdk';

const EXCHANGE_ADDRESSES = {
  binance: '0x28C6c06298d514Db089934071355E5743bf21d60',
  coinbase: '0x503828976D22510aad0201ac7EC88293211D23Da',
  kraken: '0x2910543Af39abA0Cd09dBb2D50200b3E800A63D2',
  okx: '0x6cC5F688a315f3dC28A7781717a9A798a59fDA7b'
};

async function getExchangeFlows(startBlock, endBlock) {
  const transfers = await alchemy.core.getAssetTransfers({
    fromBlock: ethers.toQuantity(startBlock),
    toBlock: ethers.toQuantity(endBlock),
    toAddress: EXCHANGE_ADDRESSES.binance,
    category: ['external', 'erc20'],
    withMetadata: true
  });

  const totalInflow = transfers.transfers.reduce((sum, t) => sum + (t.value || 0), 0);
  console.log('Binance inflow:', totalInflow.toFixed(2), 'ETH');
  return transfers.transfers;
}
```

## Whale Transfer Monitor

```javascript
const provider = new ethers.JsonRpcProvider(process.env.ETH_RPC_URL);

// Real-time large transfer detection
provider.on('pending', async (txHash) => {
  try {
    const tx = await provider.getTransaction(txHash);
    if (!tx) return;

    const valueEth = parseFloat(ethers.formatEther(tx.value));
    if (valueEth > 100) {
      console.log(`🐋 Large TX: ${valueEth.toFixed(1)} ETH`);
      console.log(`   From: ${tx.from}`);
      console.log(`   To: ${tx.to}`);
    }
  } catch {}
});
```

## Token Holder Distribution

```javascript
// Top token holders (via Etherscan token API)
async function getTopHolders(tokenAddress, limit = 100) {
  const res = await fetch(
    `https://api.etherscan.io/api?module=token&action=tokenholderlist&contractaddress=${tokenAddress}&page=1&offset=${limit}&apikey=${process.env.ETHERSCAN_KEY}`
  ).then(r => r.json());

  return res.result.map(h => ({
    address: h.TokenHolderAddress,
    quantity: parseFloat(h.TokenHolderQuantity)
  }));
}

// Concentration analysis
function analyzeConcentration(holders, totalSupply) {
  const top10 = holders.slice(0, 10);
  const top10Pct = top10.reduce((s, h) => s + h.quantity, 0) / totalSupply * 100;
  const top50Pct = holders.slice(0, 50).reduce((s, h) => s + h.quantity, 0) / totalSupply * 100;
  return { top10Pct, top50Pct, herfindahlIndex: holders.reduce((s, h) => s + Math.pow(h.quantity / totalSupply, 2), 0) };
}
```

## Glassnode On-Chain Signals

```javascript
const key = process.env.GLASSNODE_KEY;
const BASE = 'https://api.glassnode.com/v1/metrics';

async function getOnChainSignals() {
  const [mvrv, sopr, exchangeFlow, lthSupply] = await Promise.all([
    fetch(`${BASE}/market/mvrv?a=BTC&i=24h&api_key=${key}`).then(r => r.json()),
    fetch(`${BASE}/indicators/sopr?a=BTC&i=24h&api_key=${key}`).then(r => r.json()),
    fetch(`${BASE}/distribution/exchange_net_position_change?a=BTC&i=24h&api_key=${key}`).then(r => r.json()),
    fetch(`${BASE}/supply/lth_sum?a=BTC&i=24h&api_key=${key}`).then(r => r.json())
  ]);

  const latest = (arr) => arr[arr.length - 1]?.v;

  return {
    mvrv: latest(mvrv),           // >3.5 overvalued, <1 undervalued
    sopr: latest(sopr),           // >1 profit-taking, <1 capitulation
    exchangeFlow: latest(exchangeFlow), // negative = outflow (bullish)
    lthSupply: latest(lthSupply)  // rising = accumulation
  };
}
```
