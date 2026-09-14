// Copyright (c) 2024-2026 nich (@nichxbt). Licensed under the Apache License, Version 2.0.
import { writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';

const OUT = '/workspaces/XActions/docs/seo-articles';
mkdirSync(OUT, { recursive: true });

const articles = [
  {
    slug: 'crypto-trading-bot-api-guide',
    title: 'Building a Crypto Trading Bot with APIs (2026)',
    meta: 'Learn how to build an automated crypto trading bot using exchange APIs. Covers strategy implementation, order management, risk controls, and backtesting.',
    keywords: 'crypto trading bot API, automated trading API, algorithmic trading crypto, trading bot Binance, crypto bot development',
    content: `# Building a Crypto Trading Bot with APIs (2026)

Automated trading bots execute strategies 24/7 without emotion. This guide covers building a production-grade bot using exchange APIs.

## Architecture

\`\`\`
Market Data (WebSocket) → Strategy Engine → Signal Generator → Order Manager → Exchange API
                                    ↑
                              Risk Manager
\`\`\`

## Market Data Feed

\`\`\`javascript
class MarketDataFeed {
  constructor(symbol, interval = '1m') {
    this.symbol = symbol.toLowerCase();
    this.candles = [];
    this.connect(interval);
  }

  connect(interval) {
    this.ws = new WebSocket(
      \`wss://stream.binance.com:9443/ws/\${this.symbol}@kline_\${interval}\`
    );

    this.ws.onmessage = ({ data }) => {
      const { k: candle } = JSON.parse(data);
      if (candle.x) { // candle closed
        this.candles.push({
          open: parseFloat(candle.o),
          high: parseFloat(candle.h),
          low: parseFloat(candle.l),
          close: parseFloat(candle.c),
          volume: parseFloat(candle.v),
          timestamp: candle.T
        });
        if (this.candles.length > 200) this.candles.shift();
        this.onCandle?.(this.candles);
      }
    };

    this.ws.onclose = () => setTimeout(() => this.connect(interval), 3000);
  }
}
\`\`\`

## Simple Moving Average Strategy

\`\`\`javascript
function smaStrategy(candles, fastPeriod = 10, slowPeriod = 20) {
  if (candles.length < slowPeriod) return 'hold';

  const closes = candles.map(c => c.close);
  const fast = closes.slice(-fastPeriod).reduce((a, b) => a + b) / fastPeriod;
  const slow = closes.slice(-slowPeriod).reduce((a, b) => a + b) / slowPeriod;

  const prevFast = closes.slice(-fastPeriod - 1, -1).reduce((a, b) => a + b) / fastPeriod;
  const prevSlow = closes.slice(-slowPeriod - 1, -1).reduce((a, b) => a + b) / slowPeriod;

  if (prevFast <= prevSlow && fast > slow) return 'buy';
  if (prevFast >= prevSlow && fast < slow) return 'sell';
  return 'hold';
}
\`\`\`

## RSI Indicator

\`\`\`javascript
function calculateRSI(closes, period = 14) {
  const changes = closes.slice(1).map((c, i) => c - closes[i]);
  const gains = changes.map(c => Math.max(c, 0));
  const losses = changes.map(c => Math.max(-c, 0));

  const avgGain = gains.slice(-period).reduce((a, b) => a + b) / period;
  const avgLoss = losses.slice(-period).reduce((a, b) => a + b) / period;

  if (avgLoss === 0) return 100;
  const rs = avgGain / avgLoss;
  return 100 - (100 / (1 + rs));
}
\`\`\`

## Order Manager

\`\`\`javascript
import crypto from 'crypto';

class OrderManager {
  constructor(apiKey, secret, baseUrl = 'https://api.binance.com') {
    this.apiKey = apiKey;
    this.secret = secret;
    this.baseUrl = baseUrl;
  }

  sign(params) {
    const query = new URLSearchParams(params).toString();
    const sig = crypto.createHmac('sha256', this.secret).update(query).digest('hex');
    return \`\${query}&signature=\${sig}\`;
  }

  async placeOrder(symbol, side, quantity, price = null) {
    const params = {
      symbol,
      side: side.toUpperCase(),
      type: price ? 'LIMIT' : 'MARKET',
      quantity: quantity.toFixed(5),
      timestamp: Date.now(),
      ...(price && { price: price.toFixed(2), timeInForce: 'GTC' })
    };

    const res = await fetch(\`\${this.baseUrl}/api/v3/order?\${this.sign(params)}\`, {
      method: 'POST',
      headers: { 'X-MBX-APIKEY': this.apiKey }
    });
    return res.json();
  }
}
\`\`\`

## Risk Manager

\`\`\`javascript
class RiskManager {
  constructor({ maxPositionPct = 0.1, stopLossPct = 0.02, maxDailyLoss = 0.05 }) {
    this.maxPositionPct = maxPositionPct;
    this.stopLossPct = stopLossPct;
    this.maxDailyLoss = maxDailyLoss;
    this.dailyPnl = 0;
    this.positions = new Map();
  }

  canTrade() {
    return this.dailyPnl > -this.maxDailyLoss;
  }

  positionSize(accountBalance, price) {
    return (accountBalance * this.maxPositionPct) / price;
  }

  shouldStopLoss(entryPrice, currentPrice, side) {
    const pnlPct = side === 'buy'
      ? (currentPrice - entryPrice) / entryPrice
      : (entryPrice - currentPrice) / entryPrice;
    return pnlPct < -this.stopLossPct;
  }
}
\`\`\`

## Full Bot Loop

\`\`\`javascript
const feed = new MarketDataFeed('BTCUSDT', '5m');
const orders = new OrderManager(process.env.BINANCE_KEY, process.env.BINANCE_SECRET);
const risk = new RiskManager({ maxPositionPct: 0.05, stopLossPct: 0.015 });

let position = null;

feed.onCandle = async (candles) => {
  if (!risk.canTrade()) return;

  const signal = smaStrategy(candles);
  const closes = candles.map(c => c.close);
  const rsi = calculateRSI(closes);
  const price = closes[closes.length - 1];

  if (signal === 'buy' && rsi < 65 && !position) {
    const qty = risk.positionSize(1000, price);
    const order = await orders.placeOrder('BTCUSDT', 'buy', qty);
    position = { side: 'buy', entryPrice: price, orderId: order.orderId };
  }

  if (position && (signal === 'sell' || risk.shouldStopLoss(position.entryPrice, price, position.side))) {
    await orders.placeOrder('BTCUSDT', 'sell', position.qty);
    position = null;
  }
};
\`\`\``
  },
  {
    slug: 'bitcoin-api-guide',
    title: 'Bitcoin API Guide: On-Chain Data, Wallets, and Transactions (2026)',
    meta: 'How to use Bitcoin APIs — query addresses, broadcast transactions, get UTXO sets, and access mempool data using BlockCypher, Blockstream, and Electrum.',
    keywords: 'Bitcoin API, Bitcoin RPC API, Bitcoin transaction API, BlockCypher API, Bitcoin developer API',
    content: `# Bitcoin API Guide: On-Chain Data, Wallets, and Transactions (2026)

Bitcoin has its own RPC and REST API ecosystem, separate from Ethereum. This guide covers the main options for querying Bitcoin on-chain data and building Bitcoin applications.

## Option 1: Blockstream.info (Free, No Key)

\`\`\`javascript
const BASE = 'https://blockstream.info/api';

// Address info
const addr = await fetch(\`\${BASE}/address/bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh\`).then(r => r.json());
console.log('Balance:', addr.chain_stats.funded_txo_sum - addr.chain_stats.spent_txo_sum, 'satoshis');

// UTXOs
const utxos = await fetch(\`\${BASE}/address/bc1q.../utxo\`).then(r => r.json());

// Transaction
const tx = await fetch(\`\${BASE}/tx/txid\`).then(r => r.json());

// Broadcast raw transaction
await fetch(\`\${BASE}/tx\`, { method: 'POST', body: rawTxHex });

// Current fees
const fees = await fetch(\`\${BASE}/fee-estimates\`).then(r => r.json());
console.log('Next block fee:', fees[1], 'sat/vB');
\`\`\`

## Option 2: BlockCypher API

\`\`\`javascript
const token = process.env.BLOCKCYPHER_TOKEN;
const BASE = 'https://api.blockcypher.com/v1/btc/main';

// Address balance
const addr = await fetch(\`\${BASE}/addrs/bc1q.../balance?token=\${token}\`).then(r => r.json());
console.log('Final balance:', addr.final_balance);

// Create and send transaction
const newTx = await fetch(\`\${BASE}/txs/new?token=\${token}\`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    inputs: [{ addresses: ['fromAddress'] }],
    outputs: [{ addresses: ['toAddress'], value: 10000 }]
  })
}).then(r => r.json());
// Sign inputs, then call /txs/send
\`\`\`

## Option 3: Bitcoin Core RPC

Running your own node gives full access:

\`\`\`javascript
async function btcRpc(method, params = []) {
  const res = await fetch('http://localhost:8332', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Basic ' + Buffer.from(\`\${RPC_USER}:\${RPC_PASS}\`).toString('base64')
    },
    body: JSON.stringify({ jsonrpc: '1.0', method, params })
  });
  const { result, error } = await res.json();
  if (error) throw new Error(error.message);
  return result;
}

// Usage
const info = await btcRpc('getblockchaininfo');
const balance = await btcRpc('getreceivedbyaddress', ['bc1q...', 1]);
const txid = await btcRpc('sendtoaddress', ['bc1q...', 0.001]);
\`\`\`

## Key Bitcoin RPC Methods

| Method | Description |
|---|---|
| \`getblockchaininfo\` | Chain sync status |
| \`getblockcount\` | Current block height |
| \`getblock\` | Block data by hash |
| \`getrawtransaction\` | Raw transaction hex |
| \`decoderawtransaction\` | Parse raw tx |
| \`sendrawtransaction\` | Broadcast tx |
| \`getaddressinfo\` | Address details |
| \`listunspent\` | UTXOs for wallet |
| \`estimatesmartfee\` | Fee estimation |
| \`getmempoolinfo\` | Mempool stats |

## Fee Estimation

\`\`\`javascript
// From Bitcoin Core
const feeRate = await btcRpc('estimatesmartfee', [6]); // 6 blocks
console.log(feeRate.feerate, 'BTC/kB');

// From Mempool.space
const fees = await fetch('https://mempool.space/api/v1/fees/recommended').then(r => r.json());
console.log('Fast fee:', fees.fastestFee, 'sat/vB');
console.log('Hour fee:', fees.hourFee, 'sat/vB');
\`\`\`

## Building a Bitcoin Wallet

\`\`\`javascript
import * as bitcoin from 'bitcoinjs-lib';
import * as ecc from 'tiny-secp256k1';
import BIP32Factory from 'bip32';

const bip32 = BIP32Factory(ecc);

// Generate HD wallet
const root = bip32.fromSeed(Buffer.from(mnemonic));
const account = root.derivePath("m/84'/0'/0'"); // BIP84 native segwit
const external = account.derive(0).derive(0);

const { address } = bitcoin.payments.p2wpkh({
  pubkey: external.publicKey
});
console.log('Address:', address); // bc1q...
\`\`\``
  },
  {
    slug: 'nft-api-guide',
    title: 'NFT APIs: Fetch Metadata, Floor Prices, and Ownership (2026)',
    meta: 'Compare the top NFT data APIs — Alchemy, Moralis, OpenSea, Reservoir, and Simplehash. Query metadata, floor prices, owners, and transfer history.',
    keywords: 'NFT API, NFT metadata API, NFT floor price API, NFT ownership API, NFT data API',
    content: `# NFT APIs: Fetch Metadata, Floor Prices, and Ownership (2026)

NFT data is spread across multiple layers — on-chain ownership, off-chain metadata, and marketplace listings. These APIs unify all three.

## Alchemy NFT API

\`\`\`javascript
import { Alchemy, Network } from 'alchemy-sdk';

const alchemy = new Alchemy({ apiKey: process.env.ALCHEMY_API_KEY, network: Network.ETH_MAINNET });

// All NFTs owned by an address
const { ownedNfts } = await alchemy.nft.getNftsForOwner('0xAddress');

// NFTs in a collection
const { nfts } = await alchemy.nft.getNftsForContract('0xContractAddress');

// Floor price
const floor = await alchemy.nft.getFloorPrice('0xContractAddress');
console.log('OpenSea floor:', floor.openSea?.floorPrice, 'ETH');
console.log('LooksRare floor:', floor.looksRare?.floorPrice, 'ETH');

// Transfer history
const transfers = await alchemy.nft.getTransfersForContract('0xContractAddress');
\`\`\`

## Simplehash (Best Multi-Chain NFT API)

Simplehash covers 60+ chains with a unified API:

\`\`\`javascript
const headers = { 'X-API-KEY': process.env.SIMPLEHASH_API_KEY };

// NFTs by wallet (multi-chain)
const res = await fetch(
  'https://api.simplehash.com/api/v0/nfts/owners_v2?chains=ethereum,polygon,solana&wallet_addresses=0xAddress',
  { headers }
);
const { nfts } = await res.json();

// Collection stats
const stats = await fetch(
  'https://api.simplehash.com/api/v0/nfts/collections/ethereum/0xBC4CA0EdA7647A8aB7C2061c2E118A18a936f13D',
  { headers }
).then(r => r.json());
console.log(stats.floor_prices);
console.log(stats.volume_usd_24h);
\`\`\`

## Reservoir Protocol

Reservoir aggregates listings from OpenSea, Blur, X2Y2, and more:

\`\`\`javascript
// Best listings for a collection
const listings = await fetch(
  'https://api.reservoir.tools/orders/asks/v5?collection=0xBC4CA0...&sortBy=price&limit=20',
  { headers: { 'x-api-key': process.env.RESERVOIR_API_KEY } }
).then(r => r.json());

// Best offers
const offers = await fetch(
  'https://api.reservoir.tools/orders/bids/v6?collection=0xBC4CA0...&sortBy=price&limit=20',
  { headers: { 'x-api-key': process.env.RESERVOIR_API_KEY } }
).then(r => r.json());

// Token sales history
const sales = await fetch(
  'https://api.reservoir.tools/sales/v6?collection=0xBC4CA0...&limit=20',
  { headers: { 'x-api-key': process.env.RESERVOIR_API_KEY } }
).then(r => r.json());
\`\`\`

## On-Chain NFT Ownership (No API Key)

\`\`\`javascript
import { ethers } from 'ethers';

const erc721Abi = [
  'function ownerOf(uint256 tokenId) view returns (address)',
  'function tokenURI(uint256 tokenId) view returns (string)',
  'function balanceOf(address owner) view returns (uint256)'
];

const bayc = new ethers.Contract('0xBC4CA0EdA7647A8aB7C2061c2E118A18a936f13D', erc721Abi, provider);

const owner = await bayc.ownerOf(1);
const tokenUri = await bayc.tokenURI(1);
const balance = await bayc.balanceOf('0xAddress');
\`\`\`

## Fetch IPFS Metadata

\`\`\`javascript
async function getNftMetadata(tokenUri) {
  // Convert ipfs:// to https://
  const url = tokenUri.replace('ipfs://', 'https://ipfs.io/ipfs/');
  const metadata = await fetch(url).then(r => r.json());
  return {
    name: metadata.name,
    description: metadata.description,
    image: metadata.image?.replace('ipfs://', 'https://ipfs.io/ipfs/'),
    attributes: metadata.attributes || []
  };
}
\`\`\`

## NFT Rarity Scoring

\`\`\`javascript
function calculateRarity(traits, collectionTraits) {
  return traits.reduce((score, { trait_type, value }) => {
    const traitCount = collectionTraits[trait_type]?.[value] || 0;
    const rarity = 1 / (traitCount / 10000); // assuming 10K supply
    return score + rarity;
  }, 0);
}
\`\`\``
  },
  {
    slug: 'aave-api-guide',
    title: 'Aave API Guide: DeFi Lending Data and Protocol Integration (2026)',
    meta: 'How to query Aave protocol data — interest rates, positions, health factors, and liquidations — using the Aave subgraph and smart contracts.',
    keywords: 'Aave API, Aave lending API, Aave subgraph, DeFi lending API, Aave V3 API',
    content: `# Aave API Guide: DeFi Lending Data and Protocol Integration (2026)

Aave is the largest DeFi lending protocol. You can query rates, positions, and health factors via their subgraph, REST API, or direct smart contract calls.

## Aave Subgraph

\`\`\`javascript
const AAVE_V3_ETH = 'https://api.thegraph.com/subgraphs/name/aave/protocol-v3';

async function query(gql) {
  const res = await fetch(AAVE_V3_ETH, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: gql })
  });
  return (await res.json()).data;
}

// Get all reserve data (interest rates, TVL)
const { reserves } = await query(\`{
  reserves {
    symbol
    name
    liquidityRate
    variableBorrowRate
    stableBorrowRate
    totalDeposits
    totalCurrentVariableDebt
    baseLTVasCollateral
    reserveLiquidationThreshold
    usageAsCollateralEnabled
  }
}\`);

// Format APY
reserves.forEach(r => {
  const depositApy = (parseFloat(r.liquidityRate) / 1e27 * 100).toFixed(2);
  const borrowApy = (parseFloat(r.variableBorrowRate) / 1e27 * 100).toFixed(2);
  console.log(\`\${r.symbol}: Deposit \${depositApy}% | Borrow \${borrowApy}%\`);
});
\`\`\`

## User Positions

\`\`\`javascript
const { users } = await query(\`{
  users(where: { id: "0xuseraddress" }) {
    healthFactor
    totalCollateralUSD
    totalDebtUSD
    currentLiquidationThreshold
    reserves {
      reserve { symbol }
      currentATokenBalance
      currentVariableDebt
      usageAsCollateralEnabled
    }
  }
}\`);
\`\`\`

## Direct Contract Calls

\`\`\`javascript
import { ethers } from 'ethers';

const POOL_ADDRESS = '0x87870Bca3F3fD6335C3F4ce8392D69350B4fA4E2'; // Aave V3 ETH

const poolAbi = [
  'function getUserAccountData(address user) view returns (uint256 totalCollateralBase, uint256 totalDebtBase, uint256 availableBorrowsBase, uint256 currentLiquidationThreshold, uint256 ltv, uint256 healthFactor)',
  'function getReserveData(address asset) view returns (tuple(...))'
];

const pool = new ethers.Contract(POOL_ADDRESS, poolAbi, provider);

const accountData = await pool.getUserAccountData('0xUserAddress');
console.log('Health Factor:', ethers.formatUnits(accountData.healthFactor, 18));
console.log('Total Collateral USD:', ethers.formatUnits(accountData.totalCollateralBase, 8));
console.log('Total Debt USD:', ethers.formatUnits(accountData.totalDebtBase, 8));
\`\`\`

## Supply and Borrow

\`\`\`javascript
const USDC = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48';
const amount = ethers.parseUnits('1000', 6); // 1000 USDC

const poolWithSigner = pool.connect(signer);

// Approve first
const usdc = new ethers.Contract(USDC, ['function approve(address,uint256)'], signer);
await usdc.approve(POOL_ADDRESS, amount);

// Supply
await poolWithSigner.supply(USDC, amount, signer.address, 0);

// Borrow (variable rate)
await poolWithSigner.borrow(USDC, amount, 2, 0, signer.address);

// Repay
await poolWithSigner.repay(USDC, amount, 2, signer.address);
\`\`\`

## Liquidation Monitoring

\`\`\`javascript
// Find positions at risk (health factor < 1.1)
const { users: atRisk } = await query(\`{
  users(
    where: { healthFactor_lt: "1100000000000000000" }
    orderBy: healthFactor
    first: 20
  ) {
    id
    healthFactor
    totalCollateralUSD
    totalDebtUSD
  }
}\`);
\`\`\``
  },
  {
    slug: 'crypto-price-api-guide',
    title: 'Real-Time Crypto Price APIs: Complete Comparison (2026)',
    meta: 'Compare free and paid real-time cryptocurrency price APIs — CoinGecko, CoinMarketCap, Binance, Kraken, and Chainlink. Choose the best one for your use case.',
    keywords: 'crypto price API, real-time crypto prices, Bitcoin price API, free crypto price API, cryptocurrency price feed',
    content: `# Real-Time Crypto Price APIs: Complete Comparison (2026)

Getting accurate, real-time crypto prices is fundamental to almost every crypto app. Here's a complete comparison of the options.

## Free Options (No Credit Card)

### CoinGecko (No Key Required)

\`\`\`javascript
// Up to 30 coins in one call
const res = await fetch(
  'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum,solana&vs_currencies=usd&include_24hr_change=true&include_market_cap=true'
);
const prices = await res.json();
console.log(prices.bitcoin.usd); // current price
console.log(prices.bitcoin.usd_24h_change); // % change
\`\`\`

Rate limit: 30 calls/min on free tier.

### Binance (No Key for Public Data)

\`\`\`javascript
// Single symbol
const { price } = await fetch('https://api.binance.com/api/v3/ticker/price?symbol=BTCUSDT').then(r => r.json());

// All symbols at once (~1400+ pairs)
const allPrices = await fetch('https://api.binance.com/api/v3/ticker/price').then(r => r.json());
\`\`\`

Binance public endpoints: 1200 weight/minute, no auth required.

### Kraken (No Key for Public Data)

\`\`\`javascript
const res = await fetch('https://api.kraken.com/0/public/Ticker?pair=XBTUSD,ETHUSD');
const { result } = await res.json();
console.log(result.XXBTZUSD.c[0]); // last trade price
\`\`\`

## Paid Options

### CoinMarketCap API

\`\`\`javascript
const res = await fetch(
  'https://pro-api.coinmarketcap.com/v1/cryptocurrency/quotes/latest?symbol=BTC,ETH,SOL&convert=USD',
  { headers: { 'X-CMC_PRO_API_KEY': process.env.CMC_API_KEY } }
);
const { data } = await res.json();
console.log(data.BTC.quote.USD.price);
\`\`\`

Free tier: 10,000 calls/month. Includes market cap rankings not available elsewhere.

## On-Chain Price Oracles

For smart contracts that need prices on-chain, use Chainlink:

\`\`\`javascript
const aggregatorAbi = ['function latestRoundData() view returns (uint80, int256, uint256, uint256, uint80)'];
const BTC_USD_FEED = '0xF4030086522a5bEEa4988F8cA5B36dbC97BeE88b';

const feed = new ethers.Contract(BTC_USD_FEED, aggregatorAbi, provider);
const [, price, , updatedAt] = await feed.latestRoundData();

console.log('BTC Price:', parseInt(price) / 1e8, 'USD');
console.log('Updated:', new Date(parseInt(updatedAt) * 1000));
\`\`\`

Chainlink feeds are on-chain and manipulation-resistant — required for DeFi protocols.

## Building a Price Aggregator

Average prices from multiple sources for accuracy:

\`\`\`javascript
async function getAggregatedPrice(symbol) {
  const [gecko, binance, kraken] = await Promise.allSettled([
    fetchCoinGeckoPrice(symbol),
    fetchBinancePrice(symbol + 'USDT'),
    fetchKrakenPrice(symbol + 'USD')
  ]);

  const prices = [gecko, binance, kraken]
    .filter(r => r.status === 'fulfilled')
    .map(r => r.value);

  if (prices.length === 0) throw new Error('All price feeds failed');

  // Remove outliers (>2% from median)
  const sorted = [...prices].sort((a, b) => a - b);
  const median = sorted[Math.floor(sorted.length / 2)];
  const filtered = prices.filter(p => Math.abs(p - median) / median < 0.02);

  return filtered.reduce((a, b) => a + b) / filtered.length;
}
\`\`\`

## Caching Strategy

\`\`\`javascript
class PriceCache {
  constructor(ttlMs = 30000) {
    this.cache = new Map();
    this.ttl = ttlMs;
  }

  get(symbol) {
    const entry = this.cache.get(symbol);
    if (!entry || Date.now() - entry.ts > this.ttl) return null;
    return entry.price;
  }

  set(symbol, price) {
    this.cache.set(symbol, { price, ts: Date.now() });
  }
}
\`\`\``
  },
  {
    slug: 'chainlink-oracle-api-guide',
    title: 'Chainlink Oracle API Guide: On-Chain Price Feeds (2026)',
    meta: 'How to use Chainlink price feeds, VRF random numbers, and CCIP cross-chain messaging in smart contracts and off-chain applications.',
    keywords: 'Chainlink API, Chainlink price feed, Chainlink oracle, Chainlink VRF, on-chain price feed',
    content: `# Chainlink Oracle API Guide: On-Chain Price Feeds (2026)

Chainlink is the dominant oracle network, providing tamper-proof price feeds, verifiable randomness, and cross-chain messaging used by $50B+ in DeFi protocols.

## Price Feeds

### Read On-Chain (Smart Contract)

\`\`\`solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@chainlink/contracts/src/v0.8/interfaces/AggregatorV3Interface.sol";

contract PriceConsumer {
    AggregatorV3Interface internal priceFeed;

    constructor() {
        // ETH/USD on Ethereum Mainnet
        priceFeed = AggregatorV3Interface(0x5f4eC3Df9cbd43714FE2740f5E3616155c5b8419);
    }

    function getLatestPrice() public view returns (int) {
        (, int price, , , ) = priceFeed.latestRoundData();
        return price / 1e8; // 8 decimals
    }
}
\`\`\`

### Read Off-Chain (ethers.js)

\`\`\`javascript
const FEEDS = {
  'BTC/USD': '0xF4030086522a5bEEa4988F8cA5B36dbC97BeE88b',
  'ETH/USD': '0x5f4eC3Df9cbd43714FE2740f5E3616155c5b8419',
  'LINK/USD': '0x2c1d072e956AFFC0D435Cb7AC38EF18d24d9127c',
  'SOL/USD': '0x4ffC43a60e009B551865A93d232E33Fce9f01507'
};

const abi = ['function latestRoundData() view returns (uint80 roundId, int256 answer, uint256 startedAt, uint256 updatedAt, uint80 answeredInRound)'];

async function getChainlinkPrice(pair) {
  const feed = new ethers.Contract(FEEDS[pair], abi, provider);
  const { answer, updatedAt } = await feed.latestRoundData();
  return {
    price: Number(answer) / 1e8,
    updatedAt: new Date(Number(updatedAt) * 1000)
  };
}
\`\`\`

### Historical Rounds

\`\`\`javascript
async function getHistoricalPrice(feedAddress, roundId) {
  const feed = new ethers.Contract(feedAddress, abi, provider);
  const { answer, startedAt } = await feed.getRoundData(roundId);
  return { price: Number(answer) / 1e8, timestamp: new Date(Number(startedAt) * 1000) };
}
\`\`\`

## Chainlink VRF (Verifiable Random Function)

\`\`\`solidity
import "@chainlink/contracts/src/v0.8/vrf/VRFConsumerBaseV2Plus.sol";

contract RandomLottery is VRFConsumerBaseV2Plus {
    uint256 public lastRandomWord;

    constructor(address vrfCoordinator) VRFConsumerBaseV2Plus(vrfCoordinator) {}

    function requestRandomNumber() external returns (uint256 requestId) {
        return s_vrfCoordinator.requestRandomWords(
            VRFV2PlusClient.RandomWordsRequest({
                keyHash: 0x787d74caea10b2b357790d5b5247c2f63d1d91572a9846f780606e4d953677ae,
                subId: SUBSCRIPTION_ID,
                requestConfirmations: 3,
                callbackGasLimit: 100000,
                numWords: 1,
                extraArgs: VRFV2PlusClient._argsToBytes(VRFV2PlusClient.ExtraArgsV1({ nativePayment: false }))
            })
        );
    }

    function fulfillRandomWords(uint256, uint256[] calldata randomWords) internal override {
        lastRandomWord = randomWords[0];
    }
}
\`\`\`

## Chainlink CCIP (Cross-Chain)

\`\`\`solidity
import "@chainlink/contracts-ccip/src/v0.8/CCIPReceiver.sol";

contract CrossChainReceiver is CCIPReceiver {
    string public lastMessage;

    function _ccipReceive(Client.Any2EVMMessage memory message) internal override {
        lastMessage = abi.decode(message.data, (string));
    }
}
\`\`\`

## Data Feeds Directory

All available feeds: [data.chain.link](https://data.chain.link)

Key categories:
- **Crypto/USD** — BTC, ETH, SOL, LINK, AVAX, MATIC, and 200+ more
- **Forex** — EUR/USD, GBP/USD, JPY/USD
- **Commodities** — XAU/USD (gold), XAG/USD (silver), crude oil
- **Equities** — TSLA, AAPL (on some chains)
- **Proof of Reserve** — verify exchange/bridge collateral`
  },
  {
    slug: 'crypto-gas-fee-api-guide',
    title: 'Crypto Gas Fee APIs: Estimate and Optimize Transaction Costs (2026)',
    meta: 'How to fetch real-time gas prices for Ethereum, Polygon, Arbitrum, and other chains. Compare gas estimation APIs and build gas-aware applications.',
    keywords: 'gas fee API, Ethereum gas price API, gas estimation API, EIP-1559 gas API, crypto transaction fee API',
    content: `# Crypto Gas Fee APIs: Estimate and Optimize Transaction Costs (2026)

Gas fees are a critical UX concern for any dApp. This guide covers how to fetch accurate gas estimates, implement EIP-1559 fee strategies, and build gas-aware applications.

## Ethereum Gas (EIP-1559)

\`\`\`javascript
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
\`\`\`

## Etherscan Gas Oracle

\`\`\`javascript
const res = await fetch(
  \`https://api.etherscan.io/api?module=gastracker&action=gasoracle&apikey=\${process.env.ETHERSCAN_KEY}\`
);
const { result } = await res.json();
console.log('Safe:', result.SafeGasPrice, 'Gwei');
console.log('Propose:', result.ProposeGasPrice, 'Gwei');
console.log('Fast:', result.FastGasPrice, 'Gwei');
console.log('Base fee:', result.suggestBaseFee, 'Gwei');
\`\`\`

## Native RPC Fee History

Prefer your existing chain RPC provider for fee estimation. \`eth_feeHistory\`
is standardized across EIP-1559 networks, avoids a vendor-specific dependency,
and lets you choose a percentile appropriate to your application.

\`\`\`javascript
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
\`\`\`

## Mempool.space (Bitcoin)

\`\`\`javascript
const fees = await fetch('https://mempool.space/api/v1/fees/recommended').then(r => r.json());
console.log('Fastest fee:', fees.fastestFee, 'sat/vB'); // ~10 min
console.log('Half hour:', fees.halfHourFee, 'sat/vB');
console.log('Hour fee:', fees.hourFee, 'sat/vB');
console.log('Economy:', fees.economyFee, 'sat/vB');
console.log('Minimum:', fees.minimumFee, 'sat/vB');
\`\`\`

## Multi-Chain Gas Comparison

\`\`\`javascript
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
  console.log(\`\${c.chain}: \${parseFloat(c.gweiPerGas).toFixed(3)} Gwei\`);
});
\`\`\`

## Gas-Aware Transaction Sending

\`\`\`javascript
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
\`\`\``
  },
  {
    slug: 'stablecoin-api-guide',
    title: 'Stablecoin APIs: USDC, USDT, DAI Data and Integration (2026)',
    meta: 'How to query stablecoin data — USDC, USDT, DAI supply, flows, and depeg alerts — using DeFiLlama, Circle, and on-chain APIs.',
    keywords: 'stablecoin API, USDC API, USDT API, DAI API, stablecoin data API, Circle API',
    content: `# Stablecoin APIs: USDC, USDT, DAI Data and Integration (2026)

Stablecoins are the backbone of DeFi. This guide covers APIs for tracking stablecoin supply, cross-chain flows, and integrating USDC payments.

## Stablecoin Market Data (DeFiLlama)

\`\`\`javascript
// All stablecoins with market caps
const { peggedAssets } = await fetch('https://stablecoins.llama.fi/stablecoins').then(r => r.json());

const top5 = peggedAssets
  .sort((a, b) => b.circulating.peggedUSD - a.circulating.peggedUSD)
  .slice(0, 5);

top5.forEach(s => {
  const supply = (s.circulating.peggedUSD / 1e9).toFixed(1);
  console.log(\`\${s.symbol}: $\${supply}B\`);
});
\`\`\`

## Historical Stablecoin Supply

\`\`\`javascript
// Historical supply for USDC
const stables = await fetch('https://stablecoins.llama.fi/stablecoins').then(r => r.json());
const usdc = stables.peggedAssets.find(s => s.symbol === 'USDC');

const history = await fetch(\`https://stablecoins.llama.fi/stablecoin/\${usdc.id}\`).then(r => r.json());
history.tokens.slice(-7).forEach(h => {
  const date = new Date(h.date * 1000).toLocaleDateString();
  const supply = (h.circulating.peggedUSD / 1e9).toFixed(2);
  console.log(\`\${date}: $\${supply}B\`);
});
\`\`\`

## Circle API (USDC)

Circle offers a developer API for USDC transfers, account management, and cross-chain operations:

\`\`\`javascript
// Create USDC transfer
const res = await fetch('https://api.circle.com/v1/transfers', {
  method: 'POST',
  headers: {
    'Authorization': \`Bearer \${process.env.CIRCLE_API_KEY}\`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    idempotencyKey: crypto.randomUUID(),
    source: { type: 'wallet', id: 'walletId' },
    destination: {
      type: 'blockchain',
      address: '0xRecipient',
      chain: 'ETH'
    },
    amount: { amount: '100.00', currency: 'USD' }
  })
});
\`\`\`

## USDC On-Chain (ERC-20)

\`\`\`javascript
const USDC_ETH = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48';
const USDC_BASE = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913';

const usdcAbi = [
  'function balanceOf(address) view returns (uint256)',
  'function transfer(address,uint256) returns (bool)',
  'function totalSupply() view returns (uint256)',
  'event Transfer(address indexed from, address indexed to, uint256 value)'
];

const usdc = new ethers.Contract(USDC_ETH, usdcAbi, provider);

// Balance
const balance = await usdc.balanceOf('0xAddress');
console.log(ethers.formatUnits(balance, 6), 'USDC');

// Total supply
const supply = await usdc.totalSupply();
console.log((Number(supply) / 1e15).toFixed(1), 'B USDC');

// Monitor large transfers
usdc.on('Transfer', (from, to, value) => {
  const amount = Number(value) / 1e6;
  if (amount > 1_000_000) console.log(\`🐋 $\${amount.toLocaleString()} USDC: \${from} → \${to}\`);
});
\`\`\`

## DAI / MakerDAO

\`\`\`javascript
// DAI stats from DeFiLlama
const dai = peggedAssets.find(s => s.symbol === 'DAI');

// DSR (DAI Savings Rate) on-chain
const POT_ADDRESS = '0x197E90f9FAD81970bA7976f33CbD77088E5D7cf7';
const potAbi = ['function dsr() view returns (uint256)', 'function chi() view returns (uint256)'];
const pot = new ethers.Contract(POT_ADDRESS, potAbi, provider);

const dsr = await pot.dsr();
// Convert from ray (1e27) to APY
const dsrApy = (Math.pow(Number(dsr) / 1e27, 365 * 24 * 60 * 60) - 1) * 100;
console.log('DAI Savings Rate:', dsrApy.toFixed(2), '%');
\`\`\`

## Depeg Detection

\`\`\`javascript
async function checkDepeg(stableSymbol, threshold = 0.005) {
  const res = await fetch(
    \`https://api.coingecko.com/api/v3/simple/price?ids=\${stableSymbol}&vs_currencies=usd\`
  );
  const data = await res.json();
  const price = data[stableSymbol].usd;
  const deviation = Math.abs(price - 1.0);

  if (deviation > threshold) {
    console.warn(\`⚠️ DEPEG: \${stableSymbol} = $\${price} (deviation: \${(deviation * 100).toFixed(3)}%)\`);
  }
  return { price, deviation, isDepegged: deviation > threshold };
}
\`\`\``
  },
  {
    slug: 'polygon-api-guide',
    title: 'Polygon API Guide: EVM Scaling Network for Developers (2026)',
    meta: 'How to build on Polygon using JSON-RPC, Polygonscan API, and PolygonScan. Low fees, fast finality, full EVM compatibility.',
    keywords: 'Polygon API, Polygon RPC, Polygonscan API, Matic API, Polygon developer guide',
    content: `# Polygon API Guide: EVM Scaling Network for Developers (2026)

Polygon (formerly Matic) is an EVM-compatible Layer 2 with low fees and fast finality. Since it's EVM-compatible, all Ethereum tools work out of the box.

## RPC Endpoints

| Provider | Endpoint |
|---|---|
| Public RPC | \`https://polygon-rpc.com\` |
| Alchemy | \`https://polygon-mainnet.g.alchemy.com/v2/<key>\` |
| Infura | \`https://polygon-mainnet.infura.io/v3/<id>\` |
| QuickNode | Custom endpoint from dashboard |
| Chainstack | Custom endpoint |

\`\`\`javascript
import { ethers } from 'ethers';
const provider = new ethers.JsonRpcProvider('https://polygon-rpc.com');
\`\`\`

## Same API, Lower Fees

All Ethereum JSON-RPC calls work identically on Polygon. Just point at the Polygon RPC:

\`\`\`javascript
// Get MATIC balance
const balance = await provider.getBalance('0xAddress');
console.log(ethers.formatEther(balance), 'MATIC');

// Gas is ~100-1000x cheaper than Ethereum
const feeData = await provider.getFeeData();
console.log(ethers.formatUnits(feeData.gasPrice, 'gwei'), 'Gwei'); // typically 30-100 Gwei
\`\`\`

## Polygonscan API

Same interface as Etherscan:

\`\`\`javascript
const BASE = 'https://api.polygonscan.com/api';
const key = process.env.POLYGONSCAN_API_KEY;

// Transaction history
const txns = await fetch(
  \`\${BASE}?module=account&action=txlist&address=0xAddress&sort=desc&apikey=\${key}\`
).then(r => r.json());

// ERC-20 transfers
const transfers = await fetch(
  \`\${BASE}?module=account&action=tokentx&address=0xAddress&sort=desc&apikey=\${key}\`
).then(r => r.json());

// Gas oracle
const gas = await fetch(\`\${BASE}?module=gastracker&action=gasoracle&apikey=\${key}\`).then(r => r.json());
console.log('Fast:', gas.result.FastGasPrice, 'Gwei');
\`\`\`

## Cross-Chain Bridge (Polygon PoS)

\`\`\`javascript
// Monitor bridge deposits (Ethereum → Polygon)
const BRIDGE_ADDRESS = '0x7D1AfA7B718fb893dB30A3aBc0Cfc608AaCfeBB0';

const bridgeAbi = ['event Transfer(address indexed from, address indexed to, uint256 value)'];
const bridge = new ethers.Contract(BRIDGE_ADDRESS, bridgeAbi, ethProvider);

bridge.on('Transfer', (from, to, value) => {
  if (to === '0x0000000000000000000000000000000000000000') {
    console.log(\`Bridge deposit: \${ethers.formatEther(value)} MATIC from \${from}\`);
  }
});
\`\`\`

## USDC on Polygon (Native)

\`\`\`javascript
const USDC_POLYGON = '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359'; // Native USDC
const USDC_E_POLYGON = '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174'; // Bridged USDC.e

const usdc = new ethers.Contract(USDC_POLYGON, erc20Abi, provider);
const balance = await usdc.balanceOf('0xAddress');
console.log(ethers.formatUnits(balance, 6), 'USDC');
\`\`\`

## Quickswap (Polygon DEX)

\`\`\`javascript
const QUICKSWAP_SUBGRAPH = 'https://api.thegraph.com/subgraphs/name/sameepsi/quickswap-v3';

const { pools } = await fetch(QUICKSWAP_SUBGRAPH, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ query: '{ pools(first: 10, orderBy: totalValueLockedUSD, orderDirection: desc) { id token0 { symbol } token1 { symbol } totalValueLockedUSD volumeUSD } }' })
}).then(r => r.json()).then(r => r.data);
\`\`\`

## Polygon zkEVM

For Polygon zkEVM (separate from Polygon PoS):

- RPC: \`https://zkevm-rpc.com\`
- Explorer: zkevm.polygonscan.com
- Chain ID: 1101`
  },
  {
    slug: 'arbitrum-api-guide',
    title: 'Arbitrum API Guide: Ethereum L2 for Developers (2026)',
    meta: 'Build on Arbitrum One and Arbitrum Nova — RPC setup, Arbiscan API, bridging, Stylus contracts, and accessing DeFi protocols.',
    keywords: 'Arbitrum API, Arbitrum RPC, Arbiscan API, Arbitrum One, Arbitrum developer guide',
    content: `# Arbitrum API Guide: Ethereum L2 for Developers (2026)

Arbitrum is Ethereum's largest Layer 2 by TVL, offering Ethereum security with 10-100x lower gas costs and faster finality.

## RPC Endpoints

| Network | Public RPC | Chain ID |
|---|---|---|
| Arbitrum One | \`https://arb1.arbitrum.io/rpc\` | 42161 |
| Arbitrum Nova | \`https://nova.arbitrum.io/rpc\` | 42170 |
| Arbitrum Sepolia | \`https://sepolia-rollup.arbitrum.io/rpc\` | 421614 |

\`\`\`javascript
import { ethers } from 'ethers';
const provider = new ethers.JsonRpcProvider('https://arb1.arbitrum.io/rpc');
// Or use Alchemy: https://arb-mainnet.g.alchemy.com/v2/<key>
\`\`\`

## Gas on Arbitrum

Arbitrum gas is calculated differently — there's an L1 data fee on top of the L2 execution fee:

\`\`\`javascript
const ARB_GAS_INFO = '0x000000000000000000000000000000000000006C';
const arbGasAbi = [
  'function getPricesInWei() view returns (uint256, uint256, uint256, uint256, uint256, uint256)'
];

const gasInfo = new ethers.Contract(ARB_GAS_INFO, arbGasAbi, provider);
const prices = await gasInfo.getPricesInWei();
console.log('L2 gas price:', ethers.formatUnits(prices[5], 'gwei'), 'Gwei');
\`\`\`

## Arbiscan API

\`\`\`javascript
const BASE = 'https://api.arbiscan.io/api';
const key = process.env.ARBISCAN_API_KEY;

// Transaction list
const txns = await fetch(
  \`\${BASE}?module=account&action=txlist&address=0xAddress&sort=desc&apikey=\${key}\`
).then(r => r.json());

// Contract ABI
const abi = await fetch(
  \`\${BASE}?module=contract&action=getabi&address=0xContractAddress&apikey=\${key}\`
).then(r => r.json());
\`\`\`

## Arbitrum Bridge

\`\`\`javascript
// Check bridge status
const GATEWAY_ROUTER = '0x72Ce9c846789fdB6fC1f34aC4AD25Dd9ef7031ef';
const gatewayAbi = ['function getGateway(address token) view returns (address)'];
const router = new ethers.Contract(GATEWAY_ROUTER, gatewayAbi, ethProvider);

// Get gateway for USDC
const gateway = await router.getGateway('0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48');
console.log('USDC Gateway:', gateway);
\`\`\`

## Key DeFi Protocols on Arbitrum

\`\`\`javascript
const ARB_CONTRACTS = {
  gmx: '0xfc5A1A6EB076a2C7aD06eD22C90d7E710E35ad0a', // GMX token
  uniswapV3Router: '0xE592427A0AEce92De3Edee1F18E0157C05861564',
  aavePool: '0x794a61358D6845594F94dc1DB02A252b5b4814aD',
  camelotRouter: '0xc873fEcbd354f5A56E00E710B90EF4201db2448d'
};
\`\`\`

## Stylus (Rust/WASM Contracts)

Arbitrum Stylus lets you write smart contracts in Rust, C, or C++:

\`\`\`rust
#![cfg_attr(not(feature = "export-abi"), no_main)]
extern crate alloc;

use stylus_sdk::prelude::*;

sol_storage! {
    #[entrypoint]
    pub struct Counter {
        uint256 number;
    }
}

#[external]
impl Counter {
    pub fn increment(&mut self) {
        self.number.set(self.number.get() + U256::from(1));
    }
    pub fn get(&self) -> U256 {
        self.number.get()
    }
}
\`\`\`

## GMX Perps API

GMX is the largest perps DEX on Arbitrum:

\`\`\`javascript
// GMX Stats API
const stats = await fetch('https://api.gmx.io/total_volume').then(r => r.json());
console.log('Total volume:', stats);

// Open interest
const oi = await fetch('https://api.gmx.io/open_interest').then(r => r.json());
\`\`\``
  },
  {
    slug: 'base-chain-api-guide',
    title: 'Base Chain API Guide: Coinbase L2 for Developers (2026)',
    meta: 'Build on Base — Coinbase\'s Ethereum L2. Setup RPC, use Basescan API, deploy contracts, and integrate with USDC and Coinbase wallet.',
    keywords: 'Base chain API, Base RPC, Basescan API, Coinbase Base L2, Base developer guide',
    content: `# Base Chain API Guide: Coinbase L2 for Developers (2026)

Base is an Ethereum Layer 2 built by Coinbase using the OP Stack. It's the fastest-growing L2 and the home of USDC native issuance and the x402 payment protocol.

## RPC Endpoints

| Environment | RPC | Chain ID |
|---|---|---|
| Mainnet | \`https://mainnet.base.org\` | 8453 |
| Sepolia Testnet | \`https://sepolia.base.org\` | 84532 |
| Alchemy | \`https://base-mainnet.g.alchemy.com/v2/<key>\` | 8453 |

\`\`\`javascript
import { ethers } from 'ethers';
const provider = new ethers.JsonRpcProvider('https://mainnet.base.org');
\`\`\`

## USDC on Base

Base has native USDC issuance from Circle — no bridging risk:

\`\`\`javascript
const USDC_BASE = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913';

const usdc = new ethers.Contract(USDC_BASE, [
  'function balanceOf(address) view returns (uint256)',
  'function transfer(address,uint256) returns (bool)',
  'event Transfer(address indexed from, address indexed to, uint256 value)'
], provider);

const balance = await usdc.balanceOf('0xAddress');
console.log(ethers.formatUnits(balance, 6), 'USDC');
\`\`\`

## Basescan API

\`\`\`javascript
const BASE = 'https://api.basescan.org/api';
const key = process.env.BASESCAN_API_KEY;

// Get transactions
const txns = await fetch(
  \`\${BASE}?module=account&action=txlist&address=0xAddress&sort=desc&apikey=\${key}\`
).then(r => r.json());

// Get USDC transfers
const transfers = await fetch(
  \`\${BASE}?module=account&action=tokentx&contractaddress=\${USDC_BASE}&address=0xAddress&apikey=\${key}\`
).then(r => r.json());
\`\`\`

## x402 Payments on Base

x402 is HTTP-native micropayments — Base is the primary chain:

\`\`\`javascript
// Server: require payment for an endpoint
import { paymentMiddleware } from 'x402-express';

app.use('/api/data', paymentMiddleware({
  amount: '0.001', // $0.001 USDC
  token: 'USDC',
  chain: 'base',
  payTo: process.env.WALLET_ADDRESS
}));

// Client: auto-pay
import { withPaymentInterceptor } from 'x402-axios';
const client = withPaymentInterceptor(axios, signer);
const data = await client.get('https://api.example.com/api/data');
\`\`\`

## Aerodrome DEX (Base)

Aerodrome is the dominant DEX on Base:

\`\`\`javascript
const AERO_SUBGRAPH = 'https://api.thegraph.com/subgraphs/name/aerodrome-finance/slipstream';

const { pools } = await fetch(AERO_SUBGRAPH, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    query: \`{
      pools(first: 10, orderBy: totalValueLockedUSD, orderDirection: desc) {
        id
        token0 { symbol }
        token1 { symbol }
        totalValueLockedUSD
        volumeUSD
      }
    }\`
  })
}).then(r => r.json()).then(r => r.data);
\`\`\`

## Coinbase Wallet Integration

\`\`\`javascript
import { CoinbaseWalletSDK } from '@coinbase/wallet-sdk';

const sdk = new CoinbaseWalletSDK({ appName: 'My App', appLogoUrl: '/logo.png' });
const ethereum = sdk.makeWeb3Provider();
const provider = new ethers.BrowserProvider(ethereum);

// Request connection
const accounts = await ethereum.request({ method: 'eth_requestAccounts' });

// Switch to Base
await ethereum.request({
  method: 'wallet_switchEthereumChain',
  params: [{ chainId: '0x2105' }] // 8453 in hex
});
\`\`\``
  },
  {
    slug: 'avalanche-api-guide',
    title: 'Avalanche API Guide: C-Chain, X-Chain, and P-Chain (2026)',
    meta: 'Build on Avalanche — connect to C-Chain for EVM, query X-Chain and P-Chain data, use AvaCloud, and access Avalanche subnet APIs.',
    keywords: 'Avalanche API, Avalanche C-Chain API, AvalancheGo RPC, AVAX API, Avalanche developer guide',
    content: `# Avalanche API Guide: C-Chain, X-Chain, and P-Chain (2026)

Avalanche has a unique multi-chain architecture with three primary chains. C-Chain is EVM-compatible; X-Chain handles asset transfers; P-Chain manages validators and subnets.

## C-Chain (EVM Compatible)

\`\`\`javascript
import { ethers } from 'ethers';

// Public RPC
const provider = new ethers.JsonRpcProvider('https://api.avax.network/ext/bc/C/rpc');
// Or: https://avalanche-mainnet.infura.io/v3/<id>
// Chain ID: 43114

const balance = await provider.getBalance('0xAddress');
console.log(ethers.formatEther(balance), 'AVAX');
\`\`\`

## Snowtrace API (C-Chain Explorer)

\`\`\`javascript
const BASE = 'https://api.snowtrace.io/api';
const key = process.env.SNOWTRACE_API_KEY;

// Transactions
const txns = await fetch(
  \`\${BASE}?module=account&action=txlist&address=0xAddress&sort=desc&apikey=\${key}\`
).then(r => r.json());
\`\`\`

## X-Chain (Asset Exchange)

\`\`\`javascript
// X-Chain API endpoint
const X_CHAIN = 'https://api.avax.network/ext/bc/X';

// Get balance
const res = await fetch(X_CHAIN, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    jsonrpc: '2.0',
    id: 1,
    method: 'avm.getBalance',
    params: { address: 'X-avax1...', assetID: 'AVAX' }
  })
});
const { result } = await res.json();
console.log('Balance:', parseInt(result.balance) / 1e9, 'AVAX');
\`\`\`

## P-Chain (Platform / Validators)

\`\`\`javascript
const P_CHAIN = 'https://api.avax.network/ext/bc/P';

// Get current validators
const validators = await fetch(P_CHAIN, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    jsonrpc: '2.0', id: 1,
    method: 'platform.getCurrentValidators',
    params: {}
  })
}).then(r => r.json());

console.log('Validator count:', validators.result.validators.length);

// Get stake
const stake = await fetch(P_CHAIN, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    jsonrpc: '2.0', id: 1,
    method: 'platform.getStake',
    params: { addresses: ['P-avax1...'] }
  })
}).then(r => r.json());
\`\`\`

## Avalanche Subnets

\`\`\`javascript
// Get all subnets
const subnets = await fetch(P_CHAIN, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    jsonrpc: '2.0', id: 1,
    method: 'platform.getSubnets',
    params: {}
  })
}).then(r => r.json());

// Connect to a subnet's C-Chain equivalent
const subnetProvider = new ethers.JsonRpcProvider('https://subnets.avax.network/mysubnet/rpc');
\`\`\`

## Trader Joe (Avalanche DEX)

\`\`\`javascript
const TJ_SUBGRAPH = 'https://api.thegraph.com/subgraphs/name/traderjoe-xyz/dex-v2-1-avalanche';

const { pairs } = await fetch(TJ_SUBGRAPH, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ query: '{ pairs(first: 10, orderBy: reserveUSD, orderDirection: desc) { id token0 { symbol } token1 { symbol } reserveUSD volumeUSD } }' })
}).then(r => r.json()).then(d => d.data);
\`\`\``
  },
  {
    slug: 'solana-defi-api-guide',
    title: 'Solana DeFi APIs: Jupiter, Raydium, and Orca Integration (2026)',
    meta: 'Query Solana DeFi protocols — get swap quotes from Jupiter, pool data from Raydium and Orca, and execute transactions programmatically.',
    keywords: 'Solana DeFi API, Jupiter API, Raydium API, Orca API, Solana swap API',
    content: `# Solana DeFi APIs: Jupiter, Raydium, and Orca Integration (2026)

Solana's DeFi ecosystem is dominated by Jupiter (aggregator), Raydium, and Orca. All three offer APIs or SDKs for integration.

## Jupiter Aggregator API

Jupiter routes swaps across all Solana DEXs to get the best price:

\`\`\`javascript
const BASE = 'https://quote-api.jup.ag/v6';

// Get a swap quote
const USDC = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';
const SOL = 'So11111111111111111111111111111111111111112';

const quote = await fetch(
  \`\${BASE}/quote?inputMint=\${USDC}&outputMint=\${SOL}&amount=100000000&slippageBps=50\`
).then(r => r.json());

console.log('Input: 100 USDC');
console.log('Output:', quote.outAmount / 1e9, 'SOL');
console.log('Price impact:', quote.priceImpactPct, '%');
console.log('Route:', quote.routePlan.map(r => r.swapInfo.label).join(' → '));
\`\`\`

Execute the swap:

\`\`\`javascript
import { Connection, VersionedTransaction } from '@solana/web3.js';

const { swapTransaction } = await fetch(\`\${BASE}/swap\`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    quoteResponse: quote,
    userPublicKey: wallet.publicKey.toString(),
    wrapAndUnwrapSol: true
  })
}).then(r => r.json());

const tx = VersionedTransaction.deserialize(Buffer.from(swapTransaction, 'base64'));
tx.sign([wallet]);
const sig = await connection.sendTransaction(tx);
await connection.confirmTransaction(sig, 'confirmed');
\`\`\`

## Jupiter Token List

\`\`\`javascript
// All verified tokens on Solana
const tokens = await fetch('https://token.jup.ag/all').then(r => r.json());
const usdc = tokens.find(t => t.symbol === 'USDC');
console.log(usdc.address, usdc.decimals);
\`\`\`

## Raydium

\`\`\`javascript
// Raydium pool info
const pools = await fetch('https://api.raydium.io/v2/main/pairs').then(r => r.json());
const solUsdc = pools.find(p => p.name === 'SOL-USDC');
console.log('SOL/USDC price:', solUsdc.price);
console.log('24h volume:', solUsdc.volume24h);
console.log('TVL:', solUsdc.tvl);

// Top pools by volume
const top10 = pools
  .sort((a, b) => b.volume24h - a.volume24h)
  .slice(0, 10);
\`\`\`

## Orca

\`\`\`javascript
import { buildWhirlpoolClient, ORCA_WHIRLPOOLS_CONFIG } from '@orca-so/whirlpools-sdk';
import { AnchorProvider } from '@coral-xyz/anchor';

const provider = AnchorProvider.env();
const client = buildWhirlpoolClient(ORCA_WHIRLPOOLS_CONFIG, provider);

// Get pool data
const poolAddress = new PublicKey('poolAddressHere');
const pool = await client.getPool(poolAddress);
const poolData = pool.getData();
console.log('Current price:', pool.getPrice().toFixed(4));
console.log('Liquidity:', poolData.liquidity.toString());
\`\`\`

## Solana Token Prices (Helius DAS API)

\`\`\`javascript
const HELIUS_URL = \`https://mainnet.helius-rpc.com/?api-key=\${process.env.HELIUS_API_KEY}\`;

// Get asset (token) price and metadata
const res = await fetch(HELIUS_URL, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    jsonrpc: '2.0',
    id: 1,
    method: 'getAsset',
    params: { id: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v' }
  })
});
const { result } = await res.json();
console.log(result.content.metadata.name, result.token_info.price_info?.price_per_token);
\`\`\``
  },
  {
    slug: 'crypto-analytics-api-guide',
    title: 'Crypto Analytics APIs: On-Chain Metrics and Market Intelligence (2026)',
    meta: 'Best APIs for on-chain analytics — Glassnode, Messari, Nansen, and Santiment. Track whale activity, exchange flows, and miner behavior.',
    keywords: 'crypto analytics API, on-chain analytics API, Glassnode API, Messari API, Nansen API',
    content: `# Crypto Analytics APIs: On-Chain Metrics and Market Intelligence (2026)

On-chain analytics APIs provide institutional-grade intelligence: exchange flows, realized cap, SOPR, MVRV, and whale wallet tracking — signals unavailable from price data alone.

## Glassnode API

Glassnode is the industry standard for on-chain metrics:

\`\`\`javascript
const BASE = 'https://api.glassnode.com/v1/metrics';
const key = process.env.GLASSNODE_API_KEY;

// Exchange net position change (are whales depositing or withdrawing?)
const flow = await fetch(
  \`\${BASE}/distribution/exchange_net_position_change?a=BTC&i=24h&api_key=\${key}\`
).then(r => r.json());

// MVRV (Market Value to Realized Value) — overvalued/undervalued signal
const mvrv = await fetch(
  \`\${BASE}/market/mvrv?a=BTC&i=24h&api_key=\${key}\`
).then(r => r.json());

// Active addresses
const activeAddresses = await fetch(
  \`\${BASE}/addresses/active_count?a=BTC&i=24h&api_key=\${key}\`
).then(r => r.json());

// Format: [{t: timestamp, v: value}, ...]
mvrv.slice(-7).forEach(({ t, v }) => {
  console.log(new Date(t * 1000).toLocaleDateString(), 'MVRV:', v.toFixed(3));
});
\`\`\`

### Key Glassnode Metrics

| Metric | Endpoint | Signal |
|---|---|---|
| MVRV | \`market/mvrv\` | >3.5 = overvalued, <1 = undervalued |
| SOPR | \`indicators/sopr\` | >1 = selling at profit, <1 = selling at loss |
| Exchange inflows | \`transactions/transfers_to_exchanges_count\` | High = selling pressure |
| Long-term holder supply | \`supply/lth_sum\` | Accumulation vs. distribution |
| Hash ribbon | \`mining/hash_ribbon\` | Miner capitulation signal |

## Messari API

\`\`\`javascript
const BASE = 'https://data.messari.io/api/v1';
const key = process.env.MESSARI_API_KEY;

// Asset metrics
const btc = await fetch(\`\${BASE}/assets/btc/metrics\`, {
  headers: { 'x-messari-api-key': key }
}).then(r => r.json());

console.log('Market cap:', btc.data.market_data.real_volume_last_24_hours);
console.log('Realized cap:', btc.data.supply.y_2050);
console.log('ROI 1y:', btc.data.roi_data.percent_change_last_1_year, '%');

// Protocol revenue
const protocols = await fetch('https://data.messari.io/api/v1/protocols', {
  headers: { 'x-messari-api-key': key }
}).then(r => r.json());
\`\`\`

## Nansen (Wallet Labels)

\`\`\`javascript
// Nansen labels known wallets (funds, exchanges, whales)
const res = await fetch(\`https://api.nansen.ai/labels/\${address}\`, {
  headers: { 'apiKey': process.env.NANSEN_API_KEY }
}).then(r => r.json());
console.log(res.labels); // e.g., ["Smart Money", "DEX Trader"]
\`\`\`

## Santiment API

\`\`\`javascript
// Social volume for a crypto asset
const SANTIMENT_GQL = 'https://api.santiment.net/graphql';

const query = \`{
  socialVolume(slug: "bitcoin", from: "2025-01-01T00:00:00Z", to: "2025-01-07T00:00:00Z", interval: "1d", socialVolumeType: PROFESSIONAL_TRADERS_CHAT_OVERVIEW) {
    datetime
    mentionsCount
  }
}\`;

const res = await fetch(SANTIMENT_GQL, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': \`Apikey \${process.env.SANTIMENT_API_KEY}\`
  },
  body: JSON.stringify({ query })
}).then(r => r.json());
\`\`\`

## Build Your Own: On-Chain Whale Tracker

\`\`\`javascript
// Track large ETH movements using Alchemy
const alchemy = new Alchemy({ apiKey: process.env.ALCHEMY_KEY });

const transfers = await alchemy.core.getAssetTransfers({
  category: ['external'],
  minValue: 100, // >100 ETH
  withMetadata: true,
  maxCount: 20
});

transfers.transfers.forEach(t => {
  console.log(\`🐋 \${t.value.toFixed(0)} ETH: \${t.from} → \${t.to}\`);
});
\`\`\``
  },
  {
    slug: 'bnb-chain-api-guide',
    title: 'BNB Chain API Guide: BSC Developer Reference (2026)',
    meta: 'Build on BNB Smart Chain — RPC endpoints, BSCScan API, PancakeSwap integration, and BEP-20 token interactions.',
    keywords: 'BNB Chain API, BSC API, BSCScan API, PancakeSwap API, BNB developer guide',
    content: `# BNB Chain API Guide: BSC Developer Reference (2026)

BNB Smart Chain (BSC) is an EVM-compatible blockchain with low fees and fast finality, operated by Binance. It's home to PancakeSwap, Venus, and hundreds of DeFi protocols.

## RPC Endpoints

| Network | RPC | Chain ID |
|---|---|---|
| BSC Mainnet | \`https://bsc-dataseed.binance.org/\` | 56 |
| BSC Testnet | \`https://data-seed-prebsc-1-s1.binance.org:8545/\` | 97 |
| Alchemy | \`https://bnb-mainnet.g.alchemy.com/v2/<key>\` | 56 |

\`\`\`javascript
import { ethers } from 'ethers';
const provider = new ethers.JsonRpcProvider('https://bsc-dataseed.binance.org/');
console.log(await provider.getNetwork()); // chainId: 56n
\`\`\`

## BSCScan API

\`\`\`javascript
const BASE = 'https://api.bscscan.com/api';
const key = process.env.BSCSCAN_API_KEY;

// BNB balance
const bal = await fetch(
  \`\${BASE}?module=account&action=balance&address=0xAddress&apikey=\${key}\`
).then(r => r.json());
console.log(parseInt(bal.result) / 1e18, 'BNB');

// BEP-20 transfers
const transfers = await fetch(
  \`\${BASE}?module=account&action=tokentx&address=0xAddress&sort=desc&apikey=\${key}\`
).then(r => r.json());
\`\`\`

## BEP-20 Tokens

\`\`\`javascript
const BUSD = '0xe9e7CEA3DedcA5984780Bafc599bD69ADd087D56';
const USDT_BSC = '0x55d398326f99059fF775485246999027B3197955';
const CAKE = '0x0E09FaBB73Bd3Ade0a17ECC321fD13a19e81cE82'; // PancakeSwap

const busd = new ethers.Contract(BUSD, ['function balanceOf(address) view returns (uint256)'], provider);
const balance = await busd.balanceOf('0xAddress');
console.log(ethers.formatEther(balance), 'BUSD');
\`\`\`

## PancakeSwap API

\`\`\`javascript
const CAKE_SUBGRAPH = 'https://api.thegraph.com/subgraphs/name/pancakeswap/exhange-v3';

const { pools } = await fetch(CAKE_SUBGRAPH, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    query: \`{
      pools(first: 10, orderBy: totalValueLockedUSD, orderDirection: desc) {
        id
        token0 { symbol }
        token1 { symbol }
        feeTier
        totalValueLockedUSD
        volumeUSD
      }
    }\`
  })
}).then(r => r.json()).then(r => r.data);

// PancakeSwap REST API
const pairs = await fetch('https://api.pancakeswap.info/api/v2/pairs').then(r => r.json());
\`\`\`

## PancakeSwap Router (Swap)

\`\`\`javascript
const ROUTER = '0x10ED43C718714eb63d5aA57B78B54704E256024E';
const routerAbi = [
  'function getAmountsOut(uint amountIn, address[] memory path) view returns (uint[] memory amounts)',
  'function swapExactETHForTokens(uint amountOutMin, address[] calldata path, address to, uint deadline) payable'
];

const router = new ethers.Contract(ROUTER, routerAbi, provider);
const WBNB = '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c';

const amounts = await router.getAmountsOut(ethers.parseEther('0.1'), [WBNB, CAKE]);
console.log('BNB → CAKE:', ethers.formatEther(amounts[1]));
\`\`\`

## Venus Protocol (Lending)

\`\`\`javascript
const VENUS_COMPTROLLER = '0xfD36E2c2a6789Db23113685031d7F16329158384';
const comptrollerAbi = ['function getAllMarkets() view returns (address[])'];
const comptroller = new ethers.Contract(VENUS_COMPTROLLER, comptrollerAbi, provider);
const markets = await comptroller.getAllMarkets();
console.log('Venus markets:', markets.length);
\`\`\``
  },
  {
    slug: 'crypto-historical-data-api-guide',
    title: 'Crypto Historical Data APIs: OHLCV, Price History, and Backtesting (2026)',
    meta: 'Best APIs for historical cryptocurrency data — OHLCV candles, tick data, trade history. CoinGecko, CryptoCompare, Binance, and Kaiko compared.',
    keywords: 'crypto historical data API, OHLCV API, historical price API, backtesting data API, CryptoCompare API',
    content: `# Crypto Historical Data APIs: OHLCV, Price History, and Backtesting (2026)

Historical data is essential for backtesting trading strategies, building charts, and training ML models. Here's how to access it from the best providers.

## Binance (Best Free Option)

\`\`\`javascript
// OHLCV candles — up to 1000 per request, any interval
async function getBinanceCandles(symbol, interval, limit = 500) {
  const res = await fetch(
    \`https://api.binance.com/api/v3/klines?symbol=\${symbol}&interval=\${interval}&limit=\${limit}\`
  );
  const raw = await res.json();
  return raw.map(([openTime, open, high, low, close, volume, closeTime]) => ({
    time: openTime,
    open: parseFloat(open),
    high: parseFloat(high),
    low: parseFloat(low),
    close: parseFloat(close),
    volume: parseFloat(volume)
  }));
}

// Usage
const candles = await getBinanceCandles('BTCUSDT', '1d', 365);

// Paginate for full history
async function getFullHistory(symbol, interval, startTime) {
  const all = [];
  let from = startTime;

  while (true) {
    const batch = await getBinanceCandlesPaged(symbol, interval, from, 1000);
    if (batch.length === 0) break;
    all.push(...batch);
    from = batch[batch.length - 1].time + 1;
    await new Promise(r => setTimeout(r, 200)); // respect rate limit
  }
  return all;
}
\`\`\`

## CoinGecko Historical

\`\`\`javascript
// Daily OHLCV (limited to 90 days on free tier)
const ohlcv = await fetch(
  'https://api.coingecko.com/api/v3/coins/bitcoin/ohlc?vs_currency=usd&days=90'
).then(r => r.json());
// [[timestamp, open, high, low, close], ...]

// Daily closes for any time range
const history = await fetch(
  'https://api.coingecko.com/api/v3/coins/bitcoin/market_chart/range?vs_currency=usd&from=1609459200&to=1640995200'
).then(r => r.json());
// history.prices = [[timestamp, price], ...]
\`\`\`

## CryptoCompare

\`\`\`javascript
const key = process.env.CRYPTOCOMPARE_API_KEY;
const headers = { 'authorization': \`Apikey \${key}\` };

// Daily OHLCV — up to 2000 days, any exchange
const res = await fetch(
  'https://min-api.cryptocompare.com/data/v2/histoday?fsym=BTC&tsym=USD&limit=365&e=Coinbase',
  { headers }
).then(r => r.json());
const candles = res.Data.Data;

// Hourly
const hourly = await fetch(
  'https://min-api.cryptocompare.com/data/v2/histohour?fsym=ETH&tsym=USD&limit=720',
  { headers }
).then(r => r.json());

// Minute
const minute = await fetch(
  'https://min-api.cryptocompare.com/data/v2/histominute?fsym=BTC&tsym=USD&limit=1440',
  { headers }
).then(r => r.json());
\`\`\`

## Kaiko (Institutional Grade)

Kaiko provides tick-by-tick trade data from 100+ exchanges:

\`\`\`javascript
const res = await fetch(
  'https://us.market-api.kaiko.io/v2/data/trades.v1/spot_direct_exchange_rate/btc/usd?interval=1d&start_time=2024-01-01T00:00:00Z',
  { headers: { 'X-Api-Key': process.env.KAIKO_API_KEY } }
).then(r => r.json());
\`\`\`

## Building a Backtester

\`\`\`javascript
function backtest(candles, strategy, initialCapital = 10000) {
  let cash = initialCapital;
  let position = 0;
  let trades = [];

  for (let i = 20; i < candles.length; i++) {
    const signal = strategy(candles.slice(0, i));
    const price = candles[i].close;

    if (signal === 'buy' && cash > 0) {
      position = cash / price;
      cash = 0;
      trades.push({ type: 'buy', price, time: candles[i].time });
    } else if (signal === 'sell' && position > 0) {
      cash = position * price;
      position = 0;
      trades.push({ type: 'sell', price, time: candles[i].time });
    }
  }

  const finalValue = cash + position * candles[candles.length - 1].close;
  return {
    finalValue,
    roi: ((finalValue - initialCapital) / initialCapital * 100).toFixed(2) + '%',
    trades: trades.length,
    sharpe: calculateSharpe(trades, candles)
  };
}
\`\`\``
  },
  {
    slug: 'defi-yield-api-guide',
    title: 'DeFi Yield APIs: Find the Best APY Across Protocols (2026)',
    meta: 'How to query yield farming opportunities, staking rewards, and lending rates using DeFiLlama Yields, Zapper, and direct protocol APIs.',
    keywords: 'DeFi yield API, APY API, yield farming API, staking rate API, DeFiLlama yields',
    content: `# DeFi Yield APIs: Find the Best APY Across Protocols (2026)

Finding the best yield requires querying dozens of protocols. These APIs aggregate yield data across the DeFi ecosystem.

## DeFiLlama Yields (Best Free Option)

\`\`\`javascript
// All yield pools across all chains and protocols
const { data: pools } = await fetch('https://yields.llama.fi/pools').then(r => r.json());

console.log('Total pools:', pools.length);

// Top stablecoin yields
const stableYields = pools
  .filter(p =>
    p.stablecoin &&
    p.tvlUsd > 1_000_000 &&
    p.apy > 0 &&
    !p.ilRisk
  )
  .sort((a, b) => b.apy - a.apy)
  .slice(0, 20);

stableYields.forEach(p => {
  console.log(\`\${p.project} | \${p.symbol} | \${p.chain} | APY: \${p.apy.toFixed(2)}% | TVL: $\${(p.tvlUsd/1e6).toFixed(0)}M\`);
});

// Highest ETH staking yields
const ethYields = pools
  .filter(p => p.symbol === 'ETH' || p.symbol.includes('stETH') || p.symbol.includes('wstETH'))
  .sort((a, b) => b.apy - a.apy);
\`\`\`

## Historical APY

\`\`\`javascript
// APY history for a specific pool
const poolId = 'your-pool-id'; // from the pools list
const history = await fetch(\`https://yields.llama.fi/chart/\${poolId}\`).then(r => r.json());
history.data.slice(-30).forEach(({ timestamp, apy, tvlUsd }) => {
  console.log(new Date(timestamp).toLocaleDateString(), \`APY: \${apy.toFixed(2)}%\`, \`TVL: $\${(tvlUsd/1e6).toFixed(0)}M\`);
});
\`\`\`

## Aave Interest Rates (Direct)

\`\`\`javascript
const AAVE_SUBGRAPH = 'https://api.thegraph.com/subgraphs/name/aave/protocol-v3';

const { reserves } = await fetch(AAVE_SUBGRAPH, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ query: '{ reserves { symbol liquidityRate variableBorrowRate } }' })
}).then(r => r.json()).then(d => d.data);

reserves.forEach(r => {
  const depositApy = (parseFloat(r.liquidityRate) / 1e27) * 100;
  const borrowApy = (parseFloat(r.variableBorrowRate) / 1e27) * 100;
  if (depositApy > 0) console.log(\`\${r.symbol}: Supply \${depositApy.toFixed(3)}% | Borrow \${borrowApy.toFixed(3)}%\`);
});
\`\`\`

## Compound Rates

\`\`\`javascript
// Compound V3 USDC market
const COMET = '0xc3d688B66703497DAA19211EEdff47f25384cdc3';
const cometAbi = [
  'function getSupplyRate(uint utilization) view returns (uint64)',
  'function getBorrowRate(uint utilization) view returns (uint64)',
  'function getUtilization() view returns (uint)'
];

const comet = new ethers.Contract(COMET, cometAbi, provider);
const utilization = await comet.getUtilization();
const supplyRate = await comet.getSupplyRate(utilization);
const borrowRate = await comet.getBorrowRate(utilization);

// Convert per-second rate to APY
const SECONDS_PER_YEAR = 31_536_000;
const supplyApy = (Math.pow(Number(supplyRate) / 1e18 * SECONDS_PER_YEAR + 1, 1) - 1) * 100;
console.log('Supply APY:', supplyApy.toFixed(3), '%');
\`\`\`

## Lido Staking Rate

\`\`\`javascript
// Lido stETH APR
const res = await fetch('https://eth-api.lido.fi/v1/protocol/steth/apr/sma').then(r => r.json());
console.log('Lido stETH APR (7d SMA):', res.data.smaApr, '%');

// Rocket Pool rETH APR
const rp = await fetch('https://api.rocketpool.net/api/eth/apr').then(r => r.json());
console.log('Rocket Pool APR:', rp.yearlyAPR, '%');
\`\`\``
  },
  {
    slug: 'nft-floor-price-api-guide',
    title: 'NFT Floor Price APIs: Real-Time and Historical Collection Data (2026)',
    meta: 'Fetch NFT floor prices in real time from OpenSea, Blur, Reservoir, and Simplehash. Build price trackers, alerts, and analytics dashboards.',
    keywords: 'NFT floor price API, OpenSea floor price, NFT price API, Reservoir API floor price, NFT collection stats API',
    content: `# NFT Floor Price APIs: Real-Time and Historical Collection Data (2026)

NFT floor prices are volatile and sourced from multiple marketplaces. Reliable apps aggregate from several APIs and cross-reference listings.

## Reservoir (Multi-Marketplace Aggregator)

Reservoir aggregates listings from OpenSea, Blur, X2Y2, LooksRare, and more — giving a true floor across all venues:

\`\`\`javascript
const headers = { 'x-api-key': process.env.RESERVOIR_API_KEY };
const BASE = 'https://api.reservoir.tools';

// Collection floor price
const stats = await fetch(
  \`\${BASE}/collections/v7?id=0xBC4CA0EdA7647A8aB7C2061c2E118A18a936f13D\`,
  { headers }
).then(r => r.json());

const col = stats.collections[0];
console.log('Floor:', col.floorAsk.price.amount.native, 'ETH');
console.log('24h Volume:', col.volume['1day'], 'ETH');
console.log('Floor change 24h:', col.floorSaleChange['1day'], '%');
console.log('Owner count:', col.ownerCount);
\`\`\`

## OpenSea (Direct)

\`\`\`javascript
const os = { headers: { 'X-API-KEY': process.env.OPENSEA_API_KEY } };

const stats = await fetch(
  'https://api.opensea.io/api/v2/collections/boredapeyachtclub/stats',
  os
).then(r => r.json());

console.log('Floor:', stats.total.floor_price, 'ETH');
console.log('24h Volume:', stats.intervals[0].volume, 'ETH');
console.log('All-time Volume:', stats.total.volume, 'ETH');
\`\`\`

## Alchemy NFT API

\`\`\`javascript
import { Alchemy, Network } from 'alchemy-sdk';
const alchemy = new Alchemy({ apiKey: process.env.ALCHEMY_KEY, network: Network.ETH_MAINNET });

const floor = await alchemy.nft.getFloorPrice('0xBC4CA0EdA7647A8aB7C2061c2E118A18a936f13D');
console.log('OpenSea floor:', floor.openSea?.floorPrice, 'ETH');
console.log('LooksRare floor:', floor.looksRare?.floorPrice, 'ETH');
\`\`\`

## Simplehash (Multi-Chain)

\`\`\`javascript
const simplehash = { headers: { 'X-API-KEY': process.env.SIMPLEHASH_KEY } };

// Works across Ethereum, Polygon, Solana, etc.
const col = await fetch(
  'https://api.simplehash.com/api/v0/nfts/collections/ethereum/0xBC4CA0EdA7647A8aB7C2061c2E118A18a936f13D',
  simplehash
).then(r => r.json());

col.floor_prices.forEach(fp => {
  console.log(\`\${fp.marketplace_name}: \${fp.value / 1e18} ETH\`);
});
\`\`\`

## Historical Floor Price

\`\`\`javascript
// Reservoir historical floor price
const history = await fetch(
  \`\${BASE}/collections/0xBC4CA0.../floor-ask-price/v1?normalizeRoyalties=false&sortDirection=desc&limit=30\`,
  { headers }
).then(r => r.json());
\`\`\`

## Floor Price Alert Bot

\`\`\`javascript
class FloorPriceAlerts {
  constructor(collection, alerts) {
    this.collection = collection;
    this.alerts = alerts; // [{threshold, direction, webhook}]
  }

  async check() {
    const floor = await this.getFloor();

    for (const alert of this.alerts) {
      const triggered =
        alert.direction === 'below' ? floor < alert.threshold :
        alert.direction === 'above' ? floor > alert.threshold : false;

      if (triggered) {
        await fetch(alert.webhook, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text: \`Floor \${alert.direction} \${alert.threshold} ETH — currently \${floor} ETH\`
          })
        });
      }
    }
    return floor;
  }

  async getFloor() {
    const data = await fetch(
      \`https://api.reservoir.tools/collections/v7?id=\${this.collection}\`,
      { headers: { 'x-api-key': process.env.RESERVOIR_KEY } }
    ).then(r => r.json());
    return data.collections[0].floorAsk.price.amount.native;
  }
}

const monitor = new FloorPriceAlerts('0xBC4CA0...', [
  { threshold: 10, direction: 'below', webhook: process.env.SLACK_WEBHOOK }
]);
setInterval(() => monitor.check(), 60000);
\`\`\``
  },
  {
    slug: 'crypto-wallet-api-guide',
    title: 'Crypto Wallet APIs: Generate, Manage, and Query Wallets (2026)',
    meta: 'How to use crypto wallet APIs — generate HD wallets, query balances across chains, sign transactions, and integrate WalletConnect.',
    keywords: 'crypto wallet API, HD wallet API, WalletConnect API, ethers.js wallet, Web3 wallet integration',
    content: `# Crypto Wallet APIs: Generate, Manage, and Query Wallets (2026)

Wallet APIs span key generation, signing, multi-chain balance queries, and browser wallet integrations. This guide covers all layers.

## Generate an HD Wallet (ethers.js)

\`\`\`javascript
import { ethers } from 'ethers';

// Generate random wallet
const wallet = ethers.Wallet.createRandom();
console.log('Address:', wallet.address);
console.log('Private key:', wallet.privateKey); // NEVER share or log in production
console.log('Mnemonic:', wallet.mnemonic.phrase);

// Restore from mnemonic
const restored = ethers.Wallet.fromPhrase('word1 word2 ... word12');

// HD derivation (BIP44)
const hdNode = ethers.HDNodeWallet.fromPhrase(mnemonic);
const account0 = hdNode.derivePath("m/44'/60'/0'/0/0");
const account1 = hdNode.derivePath("m/44'/60'/0'/0/1");
\`\`\`

## Sign Messages and Transactions

\`\`\`javascript
const provider = new ethers.JsonRpcProvider(process.env.ETH_RPC_URL);
const signer = new ethers.Wallet(process.env.PRIVATE_KEY, provider);

// Sign a message (off-chain, no gas)
const signature = await signer.signMessage('Hello World');
const recovered = ethers.verifyMessage('Hello World', signature);
console.log('Signer is valid:', recovered === signer.address);

// Sign typed data (EIP-712)
const domain = { name: 'MyApp', version: '1', chainId: 1 };
const types = { Permit: [{ name: 'owner', type: 'address' }, { name: 'value', type: 'uint256' }] };
const value = { owner: signer.address, value: 1000n };
const sig = await signer.signTypedData(domain, types, value);
\`\`\`

## Browser Wallet Integration (MetaMask / EIP-1193)

\`\`\`javascript
// Request wallet connection
async function connectWallet() {
  if (!window.ethereum) throw new Error('No wallet detected');

  const provider = new ethers.BrowserProvider(window.ethereum);
  const accounts = await provider.send('eth_requestAccounts', []);
  const signer = await provider.getSigner();

  return { provider, signer, address: accounts[0] };
}

// Listen for account/chain changes
window.ethereum.on('accountsChanged', (accounts) => {
  console.log('New account:', accounts[0]);
});

window.ethereum.on('chainChanged', (chainId) => {
  window.location.reload(); // recommended
});

// Switch chain
await window.ethereum.request({
  method: 'wallet_switchEthereumChain',
  params: [{ chainId: '0x2105' }] // Base
});
\`\`\`

## WalletConnect v2

\`\`\`javascript
import { WalletConnect } from '@walletconnect/ethereum-provider';

const provider = await WalletConnect.init({
  projectId: process.env.WALLETCONNECT_PROJECT_ID,
  chains: [1],
  optionalChains: [8453, 42161, 137],
  showQrModal: true
});

await provider.enable();
const ethProvider = new ethers.BrowserProvider(provider);
const signer = await ethProvider.getSigner();
\`\`\`

## Privy (Embedded Wallets)

\`\`\`javascript
import { PrivyProvider, useWallets } from '@privy-io/react-auth';

// In a component
const { wallets } = useWallets();
const embedded = wallets.find(w => w.walletClientType === 'privy');

const provider = await embedded.getEthersProvider();
const signer = provider.getSigner();
\`\`\`

## Multi-Chain Balance Query

\`\`\`javascript
async function getAllBalances(address) {
  const chains = [
    { name: 'Ethereum', rpc: process.env.ETH_RPC, nativeSymbol: 'ETH' },
    { name: 'Polygon', rpc: 'https://polygon-rpc.com', nativeSymbol: 'MATIC' },
    { name: 'Base', rpc: 'https://mainnet.base.org', nativeSymbol: 'ETH' },
    { name: 'Arbitrum', rpc: 'https://arb1.arbitrum.io/rpc', nativeSymbol: 'ETH' }
  ];

  const results = await Promise.all(chains.map(async ({ name, rpc, nativeSymbol }) => {
    const p = new ethers.JsonRpcProvider(rpc);
    const balance = await p.getBalance(address);
    return { chain: name, symbol: nativeSymbol, balance: ethers.formatEther(balance) };
  }));

  return results.filter(r => parseFloat(r.balance) > 0);
}
\`\`\``
  },
];

for (const article of articles) {
  const filePath = join(OUT, `${article.slug}.md`);
  const content = `---
title: "${article.title}"
meta_description: "${article.meta}"
keywords: "${article.keywords}"
---

${article.content}
`;
  writeFileSync(filePath, content);
  console.log(`✅ ${article.slug}.md`);
}

console.log(`\n✅ Wrote ${articles.length} articles to ${OUT}`);
