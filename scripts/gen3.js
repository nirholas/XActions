import { writeFileSync } from 'fs';
import { join } from 'path';
const OUT = '/workspaces/XActions/docs/seo-articles';

const articles = [
  {
    slug: 'crypto-tax-api-guide',
    title: 'Crypto Tax APIs: Automate Capital Gains Reporting (2026)',
    meta: 'How to use crypto tax APIs — CoinTracker, Koinly, TaxBit — to calculate capital gains, cost basis, and generate tax reports programmatically.',
    keywords: 'crypto tax API, capital gains crypto API, Koinly API, CoinTracker API, crypto tax reporting',
    content: `# Crypto Tax APIs: Automate Capital Gains Reporting (2026)

Crypto tax obligations require tracking every trade, transfer, and DeFi interaction. Tax APIs automate cost basis calculation, gain/loss computation, and report generation.

## Koinly API

\`\`\`javascript
// Import transactions
const res = await fetch('https://api.koinly.io/api/v2/transactions', {
  method: 'POST',
  headers: {
    'Authorization': \`Token \${process.env.KOINLY_TOKEN}\`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    transactions: [{
      date: '2025-01-15T10:00:00Z',
      from: { currency: 'USD', amount: '1000' },
      to: { currency: 'BTC', amount: '0.015' },
      txhash: '0xabc123',
      fee: { currency: 'USD', amount: '2.50' }
    }]
  })
});
\`\`\`

## Calculate Gains Manually

\`\`\`javascript
// FIFO cost basis calculation
function calculateFIFO(trades) {
  const lots = []; // [{qty, costPerUnit}]
  const gains = [];

  for (const trade of trades) {
    if (trade.type === 'buy') {
      lots.push({ qty: trade.qty, costPerUnit: trade.price });
    } else if (trade.type === 'sell') {
      let remaining = trade.qty;
      let totalCost = 0;

      while (remaining > 0 && lots.length > 0) {
        const lot = lots[0];
        const used = Math.min(remaining, lot.qty);
        totalCost += used * lot.costPerUnit;
        lot.qty -= used;
        remaining -= used;
        if (lot.qty === 0) lots.shift();
      }

      const proceeds = trade.qty * trade.price;
      gains.push({
        date: trade.date,
        qty: trade.qty,
        proceeds,
        costBasis: totalCost,
        gain: proceeds - totalCost
      });
    }
  }

  return gains;
}
\`\`\`

## Fetch Transaction History for Tax

\`\`\`javascript
// Pull all Ethereum transactions for an address
async function getTaxableEvents(address) {
  const key = process.env.ETHERSCAN_KEY;
  const [txns, tokenTxns] = await Promise.all([
    fetch(\`https://api.etherscan.io/api?module=account&action=txlist&address=\${address}&sort=asc&apikey=\${key}\`).then(r => r.json()),
    fetch(\`https://api.etherscan.io/api?module=account&action=tokentx&address=\${address}&sort=asc&apikey=\${key}\`).then(r => r.json())
  ]);

  return {
    ethTransactions: txns.result,
    tokenTransfers: tokenTxns.result
  };
}
\`\`\`

## TaxBit API

\`\`\`javascript
const res = await fetch('https://api.taxbit.com/v1/transactions', {
  method: 'POST',
  headers: {
    'Authorization': \`Bearer \${process.env.TAXBIT_TOKEN}\`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    transactions: [{
      type: 'SALE',
      date: '2025-06-15T12:00:00Z',
      sent_asset: 'BTC',
      sent_quantity: '0.5',
      received_asset: 'USD',
      received_quantity: '25000'
    }]
  })
});
\`\`\`

## Tax Rules by Jurisdiction

| Country | Short-term | Long-term (>1yr) | DeFi treatment |
|---|---|---|---|
| USA | Ordinary income | 0–20% | Each swap is taxable |
| UK | CGT rates | Same | Each disposal taxable |
| Germany | 0–45% | 0% (held >1yr) | Complex, varies |
| Portugal | 0% | 0% | Generally exempt |
| Singapore | 0% | 0% | Generally exempt |`
  },
  {
    slug: 'on-chain-analytics-guide',
    title: 'On-Chain Analytics APIs: Whale Tracking and Flow Analysis (2026)',
    meta: 'Build on-chain analytics with APIs — track whale wallets, monitor exchange inflows/outflows, detect large transfers, and analyze token holder distribution.',
    keywords: 'on-chain analytics API, whale tracking API, exchange flow API, token holder API, blockchain analytics',
    content: `# On-Chain Analytics APIs: Whale Tracking and Flow Analysis (2026)

On-chain data reveals what's happening beneath price action — where large holders are moving funds, whether exchange inflows are rising (bearish) or falling (bullish), and who's accumulating.

## Exchange Flow Detection

\`\`\`javascript
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
\`\`\`

## Whale Transfer Monitor

\`\`\`javascript
const provider = new ethers.JsonRpcProvider(process.env.ETH_RPC_URL);

// Real-time large transfer detection
provider.on('pending', async (txHash) => {
  try {
    const tx = await provider.getTransaction(txHash);
    if (!tx) return;

    const valueEth = parseFloat(ethers.formatEther(tx.value));
    if (valueEth > 100) {
      console.log(\`🐋 Large TX: \${valueEth.toFixed(1)} ETH\`);
      console.log(\`   From: \${tx.from}\`);
      console.log(\`   To: \${tx.to}\`);
    }
  } catch {}
});
\`\`\`

## Token Holder Distribution

\`\`\`javascript
// Top token holders (via Etherscan token API)
async function getTopHolders(tokenAddress, limit = 100) {
  const res = await fetch(
    \`https://api.etherscan.io/api?module=token&action=tokenholderlist&contractaddress=\${tokenAddress}&page=1&offset=\${limit}&apikey=\${process.env.ETHERSCAN_KEY}\`
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
\`\`\`

## Glassnode On-Chain Signals

\`\`\`javascript
const key = process.env.GLASSNODE_KEY;
const BASE = 'https://api.glassnode.com/v1/metrics';

async function getOnChainSignals() {
  const [mvrv, sopr, exchangeFlow, lthSupply] = await Promise.all([
    fetch(\`\${BASE}/market/mvrv?a=BTC&i=24h&api_key=\${key}\`).then(r => r.json()),
    fetch(\`\${BASE}/indicators/sopr?a=BTC&i=24h&api_key=\${key}\`).then(r => r.json()),
    fetch(\`\${BASE}/distribution/exchange_net_position_change?a=BTC&i=24h&api_key=\${key}\`).then(r => r.json()),
    fetch(\`\${BASE}/supply/lth_sum?a=BTC&i=24h&api_key=\${key}\`).then(r => r.json())
  ]);

  const latest = (arr) => arr[arr.length - 1]?.v;

  return {
    mvrv: latest(mvrv),           // >3.5 overvalued, <1 undervalued
    sopr: latest(sopr),           // >1 profit-taking, <1 capitulation
    exchangeFlow: latest(exchangeFlow), // negative = outflow (bullish)
    lthSupply: latest(lthSupply)  // rising = accumulation
  };
}
\`\`\``
  },
  {
    slug: 'web3-auth-api-guide',
    title: 'Web3 Authentication APIs: Sign-In with Ethereum (SIWE) (2026)',
    meta: 'How to implement Web3 wallet authentication using Sign-In with Ethereum (SIWE), Privy, Dynamic, and Magic Link. Secure, passwordless crypto login.',
    keywords: 'Web3 auth API, Sign-In with Ethereum API, SIWE, Privy API, crypto wallet login',
    content: `# Web3 Authentication APIs: Sign-In with Ethereum (SIWE) (2026)

Web3 authentication lets users sign in with their crypto wallet — no passwords, no email, cryptographically verified identity.

## SIWE (Sign-In with Ethereum) — Manual Implementation

\`\`\`javascript
import { SiweMessage } from 'siwe';

// 1. Generate nonce (server-side)
app.get('/nonce', (req, res) => {
  req.session.nonce = Math.random().toString(36).slice(2);
  res.json({ nonce: req.session.nonce });
});

// 2. Create message (client-side)
const message = new SiweMessage({
  domain: window.location.host,
  address: userAddress,
  statement: 'Sign in to MyApp',
  uri: window.location.origin,
  version: '1',
  chainId: 1,
  nonce: await fetchNonce()
});

const signature = await signer.signMessage(message.prepareMessage());

// 3. Verify (server-side)
app.post('/verify', async (req, res) => {
  const { message, signature } = req.body;
  const siwe = new SiweMessage(message);

  try {
    const { data } = await siwe.verify({
      signature,
      nonce: req.session.nonce
    });

    req.session.address = data.address;
    req.session.chainId = data.chainId;
    res.json({ ok: true, address: data.address });
  } catch {
    res.status(422).json({ ok: false });
  }
});
\`\`\`

## Privy (Managed Web3 Auth)

\`\`\`javascript
// React
import { PrivyProvider, usePrivy } from '@privy-io/react-auth';

function App() {
  return (
    <PrivyProvider appId={process.env.PRIVY_APP_ID} config={{
      loginMethods: ['wallet', 'email', 'google'],
      embeddedWallets: { createOnLogin: 'all-users' }
    }}>
      <MyApp />
    </PrivyProvider>
  );
}

function LoginButton() {
  const { login, logout, user, authenticated } = usePrivy();
  return authenticated
    ? <button onClick={logout}>{user.wallet?.address}</button>
    : <button onClick={login}>Connect</button>;
}
\`\`\`

## Dynamic (Multi-Wallet Auth)

\`\`\`javascript
import { DynamicContextProvider, DynamicWidget } from '@dynamic-labs/sdk-react-core';

function App() {
  return (
    <DynamicContextProvider settings={{ environmentId: process.env.DYNAMIC_ENV_ID }}>
      <DynamicWidget />
    </DynamicContextProvider>
  );
}
\`\`\`

## Magic Link (Email → Wallet)

\`\`\`javascript
import { Magic } from 'magic-sdk';

const magic = new Magic(process.env.MAGIC_API_KEY);

// Login with email — creates a wallet automatically
await magic.auth.loginWithEmailOTP({ email: 'user@example.com' });
const provider = new ethers.BrowserProvider(magic.rpcProvider);
const signer = await provider.getSigner();
\`\`\`

## JWT from SIWE Session

\`\`\`javascript
import jwt from 'jsonwebtoken';

// After SIWE verification
app.post('/verify', async (req, res) => {
  // ... verify SIWE ...
  const token = jwt.sign(
    { address: data.address, chainId: data.chainId },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );
  res.json({ token });
});

// Protect routes
function requireAuth(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Unauthorized' });
  req.user = jwt.verify(token, process.env.JWT_SECRET);
  next();
}
\`\`\``
  },
  {
    slug: 'funding-rate-api-guide',
    title: 'Crypto Funding Rate APIs: Perpetuals Data for Traders (2026)',
    meta: 'How to fetch funding rates for perpetual futures from Binance, Bybit, dYdX, and aggregate them for trading signals and market sentiment analysis.',
    keywords: 'funding rate API, perpetual futures API, crypto funding rate data, Binance funding rate, perps API',
    content: `# Crypto Funding Rate APIs: Perpetuals Data for Traders (2026)

Funding rates are periodic payments between long and short holders in perpetual futures markets. Extreme funding rates signal crowded trades — a powerful contrarian indicator.

## Binance Funding Rates

\`\`\`javascript
// Current funding rate
const current = await fetch(
  'https://fapi.binance.com/fapi/v1/premiumIndex?symbol=BTCUSDT'
).then(r => r.json());
console.log('Funding rate:', parseFloat(current.lastFundingRate) * 100, '%');
console.log('Mark price:', current.markPrice);
console.log('Next funding:', new Date(current.nextFundingTime));

// Historical funding rates
const history = await fetch(
  'https://fapi.binance.com/fapi/v1/fundingRate?symbol=BTCUSDT&limit=100'
).then(r => r.json());

history.forEach(h => {
  const rate = parseFloat(h.fundingRate) * 100;
  const annualized = rate * 3 * 365; // 3 payments/day
  console.log(new Date(h.fundingTime).toLocaleDateString(), \`\${rate.toFixed(4)}% (\${annualized.toFixed(1)}% annualized)\`);
});

// All symbols funding rates
const all = await fetch('https://fapi.binance.com/fapi/v1/premiumIndex').then(r => r.json());
const sorted = all.sort((a, b) => Math.abs(parseFloat(b.lastFundingRate)) - Math.abs(parseFloat(a.lastFundingRate)));
console.log('Highest funding:', sorted[0].symbol, parseFloat(sorted[0].lastFundingRate) * 100, '%');
\`\`\`

## Bybit Funding Rates

\`\`\`javascript
const current = await fetch(
  'https://api.bybit.com/v5/market/funding/history?category=linear&symbol=BTCUSDT&limit=1'
).then(r => r.json());
console.log('Funding rate:', current.result.list[0].fundingRate);

// Real-time via WebSocket
const ws = new WebSocket('wss://stream.bybit.com/v5/public/linear');
ws.onopen = () => ws.send(JSON.stringify({
  op: 'subscribe',
  args: ['tickers.BTCUSDT']
}));
ws.onmessage = ({ data }) => {
  const msg = JSON.parse(data);
  if (msg.topic === 'tickers.BTCUSDT') {
    console.log('Funding rate:', msg.data.fundingRate);
  }
};
\`\`\`

## dYdX (Decentralized Perps)

\`\`\`javascript
const BASE = 'https://api.dydx.exchange/v3';

const market = await fetch(\`\${BASE}/markets?market=BTC-USD\`).then(r => r.json());
console.log('Funding rate:', market.markets['BTC-USD'].fundingRate);
console.log('Open interest:', market.markets['BTC-USD'].openInterest);

// Historical
const funding = await fetch(\`\${BASE}/historical-funding?market=BTC-USD&limit=100\`).then(r => r.json());
\`\`\`

## Coinglass Aggregated Funding

\`\`\`javascript
const res = await fetch(
  'https://open-api.coinglass.com/public/v2/funding',
  { headers: { 'coinglassSecret': process.env.COINGLASS_KEY } }
).then(r => r.json());

res.data.forEach(coin => {
  console.log(coin.symbol);
  coin.uMarginList?.forEach(e => console.log(\`  \${e.exchangeName}: \${(parseFloat(e.rate) * 100).toFixed(4)}%\`));
});
\`\`\`

## Funding Rate Trading Signal

\`\`\`javascript
function getFundingSignal(rates) {
  // rates: array of {exchange, rate} for same asset
  const avg = rates.reduce((s, r) => s + parseFloat(r.rate), 0) / rates.length;
  const annualized = avg * 3 * 365 * 100;

  if (annualized > 100) return { signal: 'SHORT', reason: 'Longs overextended (>100% annualized)' };
  if (annualized < -50) return { signal: 'LONG', reason: 'Shorts overextended (<-50% annualized)' };
  return { signal: 'NEUTRAL', annualized };
}
\`\`\``
  },
  {
    slug: 'open-interest-api-guide',
    title: 'Open Interest APIs: Derivatives Market Data for Crypto (2026)',
    meta: 'How to query open interest data from Binance, Bybit, CME, and Coinglass. Understand OI trends and build derivatives-aware trading signals.',
    keywords: 'open interest API, crypto OI data, Binance open interest, derivatives data API, Coinglass API',
    content: `# Open Interest APIs: Derivatives Market Data for Crypto (2026)

Open interest (OI) is the total value of outstanding futures/options contracts. Rising OI with rising price = bullish trend strength. Rising OI with falling price = bearish pressure building.

## Binance Futures OI

\`\`\`javascript
// Current OI
const oi = await fetch(
  'https://fapi.binance.com/fapi/v1/openInterest?symbol=BTCUSDT'
).then(r => r.json());
console.log('OI:', parseFloat(oi.openInterest).toFixed(0), 'BTC');

// OI history
const history = await fetch(
  'https://fapi.binance.com/futures/data/openInterestHist?symbol=BTCUSDT&period=1h&limit=48'
).then(r => r.json());
history.forEach(h => {
  console.log(new Date(h.timestamp).toLocaleString(), parseFloat(h.sumOpenInterest).toFixed(0), 'BTC');
});

// OI for all symbols (top 10 by OI)
const allOI = await fetch('https://fapi.binance.com/fapi/v1/openInterest').catch(() => []);
\`\`\`

## Coinglass (Aggregated Multi-Exchange OI)

\`\`\`javascript
const res = await fetch(
  'https://open-api.coinglass.com/public/v2/openInterest',
  { headers: { 'coinglassSecret': process.env.COINGLASS_KEY } }
).then(r => r.json());

res.data.forEach(coin => {
  const totalOI = coin.exchangeList?.reduce((s, e) => s + e.openInterestAmount, 0);
  console.log(\`\${coin.symbol}: $\${(totalOI / 1e9).toFixed(2)}B OI\`);
});
\`\`\`

## Bybit OI

\`\`\`javascript
const oi = await fetch(
  'https://api.bybit.com/v5/market/open-interest?category=linear&symbol=BTCUSDT&intervalTime=1h&limit=24'
).then(r => r.json());

oi.result.list.forEach(item => {
  console.log(new Date(parseInt(item.timestamp)).toLocaleString(), item.openInterest, 'BTC');
});
\`\`\`

## OI + Price Divergence Signal

\`\`\`javascript
function analyzeOIDivergence(priceHistory, oiHistory) {
  const priceChange = (priceHistory[priceHistory.length - 1] - priceHistory[0]) / priceHistory[0];
  const oiChange = (oiHistory[oiHistory.length - 1] - oiHistory[0]) / oiHistory[0];

  // Price up + OI up = trend strengthening (bullish)
  // Price up + OI down = trend weakening (potential reversal)
  // Price down + OI up = bearish momentum building
  // Price down + OI down = short covering rally potential

  if (priceChange > 0.02 && oiChange > 0.05) return 'TREND_CONTINUATION';
  if (priceChange > 0.02 && oiChange < -0.05) return 'POTENTIAL_REVERSAL';
  if (priceChange < -0.02 && oiChange > 0.05) return 'BEARISH_PRESSURE';
  if (priceChange < -0.02 && oiChange < -0.05) return 'SHORT_SQUEEZE_POTENTIAL';
  return 'NEUTRAL';
}
\`\`\`

## Options OI (Deribit)

\`\`\`javascript
// Deribit options OI for BTC
const instruments = await fetch(
  'https://www.deribit.com/api/v2/public/get_instruments?currency=BTC&kind=option&expired=false'
).then(r => r.json());

const btcOI = await fetch(
  'https://www.deribit.com/api/v2/public/get_book_summary_by_currency?currency=BTC&kind=option'
).then(r => r.json());

const totalCallOI = btcOI.result
  .filter(i => i.instrument_name.includes('-C'))
  .reduce((s, i) => s + i.open_interest, 0);
const totalPutOI = btcOI.result
  .filter(i => i.instrument_name.includes('-P'))
  .reduce((s, i) => s + i.open_interest, 0);

console.log('Put/Call Ratio:', (totalPutOI / totalCallOI).toFixed(3));
\`\`\``
  },
  {
    slug: 'solana-nft-api-guide',
    title: 'Solana NFT APIs: Magic Eden, Helius, and Metaplex (2026)',
    meta: 'Query Solana NFTs using Magic Eden API, Helius DAS API, and Metaplex. Fetch metadata, floor prices, listings, and collection stats.',
    keywords: 'Solana NFT API, Magic Eden API, Helius DAS API, Metaplex API, Solana NFT data',
    content: `# Solana NFT APIs: Magic Eden, Helius, and Metaplex (2026)

Solana NFTs use a different standard (Metaplex) than Ethereum. The main data sources are Magic Eden (marketplace), Helius (DAS API), and direct on-chain reads.

## Magic Eden API

\`\`\`javascript
const ME_BASE = 'https://api-mainnet.magiceden.dev/v2';

// Collection stats
const stats = await fetch(\`\${ME_BASE}/collections/degods/stats\`).then(r => r.json());
console.log('Floor:', stats.floorPrice / 1e9, 'SOL');
console.log('24h Volume:', stats.volumeAll / 1e9, 'SOL');
console.log('Listed count:', stats.listedCount);

// Collection listings
const listings = await fetch(\`\${ME_BASE}/collections/degods/listings?offset=0&limit=20\`).then(r => r.json());
listings.forEach(l => console.log(\`#\${l.tokenMint.slice(0, 8)}: \${l.price} SOL\`));

// Token metadata
const token = await fetch(\`\${ME_BASE}/tokens/tokenMintAddress\`).then(r => r.json());
console.log(token.name, token.image, token.attributes);

// Recent sales
const sales = await fetch(\`\${ME_BASE}/collections/degods/activities?offset=0&limit=20&type=buyNow\`).then(r => r.json());
sales.forEach(s => console.log(\`Sold for \${s.price} SOL at \${new Date(s.blockTime * 1000).toLocaleString()}\`));
\`\`\`

## Helius DAS API (Digital Asset Standard)

\`\`\`javascript
const HELIUS = \`https://mainnet.helius-rpc.com/?api-key=\${process.env.HELIUS_KEY}\`;

async function rpc(method, params) {
  const res = await fetch(HELIUS, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params })
  });
  return (await res.json()).result;
}

// Get all NFTs for a wallet
const nfts = await rpc('getAssetsByOwner', {
  ownerAddress: 'walletAddress',
  page: 1,
  limit: 100,
  displayOptions: { showFungible: false }
});
nfts.items.forEach(nft => console.log(nft.content.metadata.name, nft.id));

// Get NFTs in a collection
const collection = await rpc('getAssetsByGroup', {
  groupKey: 'collection',
  groupValue: 'collectionMintAddress',
  page: 1,
  limit: 100
});

// Get single asset
const asset = await rpc('getAsset', { id: 'mintAddress' });
console.log(asset.content.metadata.name);
console.log(asset.ownership.owner);
console.log(asset.content.metadata.attributes);
\`\`\`

## Metaplex On-Chain

\`\`\`javascript
import { Metaplex } from '@metaplex-foundation/js';
import { Connection, PublicKey } from '@solana/web3.js';

const connection = new Connection(process.env.SOLANA_RPC_URL);
const mx = new Metaplex(connection);

// Get NFT metadata
const nft = await mx.nfts().findByMint({ mintAddress: new PublicKey('mintAddress') });
console.log(nft.name, nft.uri, nft.sellerFeeBasisPoints);

// Fetch off-chain JSON
const json = await fetch(nft.uri).then(r => r.json());
console.log(json.attributes);

// Get collection NFTs
const collection = await mx.nfts().findAllByMintList({
  mints: [new PublicKey('mint1'), new PublicKey('mint2')]
});
\`\`\`

## Solana NFT Rarity

\`\`\`javascript
async function buildRarityRanks(collectionSlug) {
  const ME_BASE = 'https://api-mainnet.magiceden.dev/v2';
  let all = [], offset = 0;

  while (true) {
    const batch = await fetch(\`\${ME_BASE}/collections/\${collectionSlug}/listings?offset=\${offset}&limit=500\`).then(r => r.json());
    if (!batch.length) break;
    all.push(...batch);
    offset += 500;
  }

  // Count trait frequencies
  const traitCounts = {};
  all.forEach(token => {
    token.attributes?.forEach(({ trait_type, value }) => {
      traitCounts[trait_type] = traitCounts[trait_type] || {};
      traitCounts[trait_type][value] = (traitCounts[trait_type][value] || 0) + 1;
    });
  });

  return all.map(token => ({
    mint: token.tokenMint,
    rarityScore: token.attributes?.reduce((score, { trait_type, value }) => {
      return score + (all.length / (traitCounts[trait_type]?.[value] || 1));
    }, 0)
  })).sort((a, b) => b.rarityScore - a.rarityScore);
}
\`\`\``
  },
  {
    slug: 'cross-chain-bridge-api-guide',
    title: 'Cross-Chain Bridge APIs: Move Assets Between Blockchains (2026)',
    meta: 'How to use cross-chain bridge APIs — LI.FI, Socket, Across, and LayerZero — to transfer tokens between Ethereum, Arbitrum, Base, Polygon, and Solana.',
    keywords: 'cross-chain bridge API, LI.FI API, Socket API, cross-chain transfer API, LayerZero API',
    content: `# Cross-Chain Bridge APIs: Move Assets Between Blockchains (2026)

Cross-chain bridges let you move tokens between networks. Bridge aggregators like LI.FI and Socket route through the best bridge automatically.

## LI.FI (Best Aggregator)

\`\`\`javascript
const LIFI = 'https://li.quest/v1';

// Get a quote for bridging USDC from Ethereum to Arbitrum
const quote = await fetch(
  \`\${LIFI}/quote?fromChain=ETH&toChain=ARB&fromToken=USDC&toToken=USDC&fromAmount=1000000000&fromAddress=0xYourAddress\`
).then(r => r.json());

console.log('To amount:', quote.estimate.toAmount / 1e6, 'USDC');
console.log('Fee:', quote.estimate.feeCosts.map(f => \`\${f.amount / 1e6} \${f.token.symbol}\`).join(', '));
console.log('Duration:', quote.estimate.executionDuration, 'seconds');
console.log('Tool:', quote.toolDetails.name);

// Execute the route
import { createConfig, executeRoute } from '@lifi/sdk';

const config = createConfig({ integrator: 'MyApp' });
const route = await getRoutes({ fromChainId: 1, toChainId: 42161, /* ... */ });
await executeRoute(signer, route.routes[0], {
  updateRouteHook: (updatedRoute) => console.log('Status:', updatedRoute.steps[0].execution?.status)
});
\`\`\`

## Socket Protocol

\`\`\`javascript
const SOCKET = 'https://api.socket.tech/v2';
const headers = { 'API-KEY': process.env.SOCKET_API_KEY };

// Get quote
const quote = await fetch(
  \`\${SOCKET}/quote?fromChainId=1&fromTokenAddress=0xA0b86991c...&toChainId=42161&toTokenAddress=0xFF970A61A04b...&fromAmount=1000000000&userAddress=0xAddress\`,
  { headers }
).then(r => r.json());

console.log('Best route:', quote.result.routes[0].usedBridgeNames);
console.log('Output:', quote.result.routes[0].toAmount / 1e6, 'USDC');
\`\`\`

## Across Protocol (Fast + Cheap)

\`\`\`javascript
// Across is optimistic bridge — fast for USDC
const res = await fetch(
  'https://across.to/api/suggested-fees?token=USDC&originChainId=1&destinationChainId=42161&amount=1000000000'
).then(r => r.json());

console.log('Relay fee:', res.relayFeePct, '%');
console.log('Total fee:', parseInt(res.totalRelayFee.total) / 1e6, 'USDC');
console.log('Estimated fill time:', res.estimatedFillTimeSec, 'seconds');
\`\`\`

## LayerZero (Omnichain Messaging)

\`\`\`solidity
import "@layerzerolabs/solidity-examples/contracts/lzApp/NonblockingLzApp.sol";

contract MyOFT is NonblockingLzApp {
    function sendMessage(uint16 dstChainId, bytes memory payload) external payable {
        _lzSend(dstChainId, payload, payable(msg.sender), address(0), bytes(""), msg.value);
    }

    function _nonblockingLzReceive(uint16, bytes memory, uint64, bytes memory payload) internal override {
        // handle message
    }
}
\`\`\`

## Wormhole

\`\`\`javascript
import { Wormhole, routes } from '@wormhole-foundation/sdk';
import { EvmPlatform } from '@wormhole-foundation/sdk-evm';
import { SolanaPlatform } from '@wormhole-foundation/sdk-solana';

const wh = await Wormhole.create('Mainnet', [EvmPlatform, SolanaPlatform]);

const srcChain = wh.getChain('Ethereum');
const dstChain = wh.getChain('Solana');

const route = await routes.RouteTransferRequest.create(wh, {
  source: { chain: srcChain, address: senderAddress },
  destination: { chain: dstChain, address: recipientAddress },
  amount: '100'
});
\`\`\``
  },
  {
    slug: 'crypto-options-api-guide',
    title: 'Crypto Options APIs: Deribit and Options Flow Data (2026)',
    meta: 'How to query Bitcoin and Ethereum options data from Deribit — implied volatility, Greeks, options chain, and real-time order book.',
    keywords: 'crypto options API, Deribit API, Bitcoin options, implied volatility API, options chain API',
    content: `# Crypto Options APIs: Deribit and Options Flow Data (2026)

Deribit dominates crypto options with ~90% market share for BTC and ETH. This guide covers their API for market data, trading, and IV analytics.

## Deribit Market Data (No Auth)

\`\`\`javascript
const DERIBIT = 'https://www.deribit.com/api/v2/public';

// Get all BTC option instruments
const instruments = await fetch(
  \`\${DERIBIT}/get_instruments?currency=BTC&kind=option&expired=false\`
).then(r => r.json());

// Get options chain for a specific expiry
const expiry = '28MAR25';
const btcOptions = instruments.result.filter(i => i.instrument_name.includes(expiry));

// Get Greeks and IV for one contract
const ticker = await fetch(
  \`\${DERIBIT}/ticker?instrument_name=BTC-28MAR25-100000-C\`
).then(r => r.json());

const d = ticker.result;
console.log('Mark IV:', d.mark_iv, '%');
console.log('Delta:', d.greeks.delta);
console.log('Gamma:', d.greeks.gamma);
console.log('Theta:', d.greeks.theta, '$/day');
console.log('Vega:', d.greeks.vega);
console.log('Mark Price:', d.mark_price, 'BTC');
\`\`\`

## Options Chain Snapshot

\`\`\`javascript
async function getOptionsChain(currency, expiry) {
  const instruments = await fetch(
    \`https://www.deribit.com/api/v2/public/get_instruments?currency=\${currency}&kind=option&expired=false\`
  ).then(r => r.json());

  const filtered = instruments.result.filter(i => i.instrument_name.includes(expiry));

  const tickers = await Promise.all(
    filtered.map(i =>
      fetch(\`https://www.deribit.com/api/v2/public/ticker?instrument_name=\${i.instrument_name}\`).then(r => r.json())
    )
  );

  return tickers.map(t => ({
    name: t.result.instrument_name,
    strike: parseInt(t.result.instrument_name.split('-')[2]),
    type: t.result.instrument_name.endsWith('-C') ? 'call' : 'put',
    iv: t.result.mark_iv,
    delta: t.result.greeks?.delta,
    oi: t.result.open_interest,
    volume: t.result.stats?.volume
  }));
}
\`\`\`

## Implied Volatility Surface

\`\`\`javascript
async function buildIVSurface(currency = 'BTC') {
  const instruments = await fetch(
    \`https://www.deribit.com/api/v2/public/get_instruments?currency=\${currency}&kind=option&expired=false\`
  ).then(r => r.json());

  // Group by expiry
  const expiries = {};
  instruments.result.forEach(i => {
    const parts = i.instrument_name.split('-');
    const expiry = parts[1];
    expiries[expiry] = expiries[expiry] || [];
    expiries[expiry].push(i.instrument_name);
  });

  // Get term structure of ATM IV
  const spotRes = await fetch(\`https://www.deribit.com/api/v2/public/get_index_price?index_name=\${currency.toLowerCase()}_usd\`).then(r => r.json());
  const spot = spotRes.result.index_price;

  const surface = {};
  for (const [expiry, names] of Object.entries(expiries)) {
    const atm = names.find(n => {
      const strike = parseInt(n.split('-')[2]);
      return Math.abs(strike - spot) / spot < 0.05 && n.endsWith('-C');
    });
    if (!atm) continue;
    const ticker = await fetch(\`https://www.deribit.com/api/v2/public/ticker?instrument_name=\${atm}\`).then(r => r.json());
    surface[expiry] = ticker.result.mark_iv;
  }
  return surface;
}
\`\`\`

## Deribit Trading (Auth Required)

\`\`\`javascript
async function placeOptionsOrder(instrument, qty, price, direction) {
  const token = await getAuthToken(); // client_credentials flow

  const res = await fetch('https://www.deribit.com/api/v2/private/buy', {
    method: 'POST',
    headers: {
      'Authorization': \`Bearer \${token}\`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      jsonrpc: '2.0', id: 1,
      method: \`private/\${direction}\`,
      params: {
        instrument_name: instrument,
        amount: qty,
        type: 'limit',
        price
      }
    })
  }).then(r => r.json());
  return res.result;
}
\`\`\``
  },
  {
    slug: 'blockchain-event-streaming-guide',
    title: 'Blockchain Event Streaming: Real-Time On-Chain Notifications (2026)',
    meta: 'How to stream real-time blockchain events — smart contract logs, transactions, and token transfers — using Alchemy Webhooks, Moralis Streams, and WebSockets.',
    keywords: 'blockchain event streaming, smart contract events, Alchemy webhooks, Moralis Streams, on-chain notifications',
    content: `# Blockchain Event Streaming: Real-Time On-Chain Notifications (2026)

Real-time on-chain event delivery is critical for DeFi liquidation bots, portfolio alerts, NFT snipers, and exchange monitoring. Here are the main approaches.

## Alchemy Webhooks (Notify)

\`\`\`javascript
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
  event.activity?.forEach(a => console.log(\`\${a.fromAddress} → \${a.toAddress}: \${a.value} ETH\`));
  res.sendStatus(200);
});
\`\`\`

## Moralis Streams

\`\`\`javascript
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
\`\`\`

## ethers.js Event Subscriptions

\`\`\`javascript
const provider = new ethers.WebSocketProvider(process.env.ETH_WSS_URL);

// Listen to all new blocks
provider.on('block', async (blockNumber) => {
  const block = await provider.getBlock(blockNumber, true);
  console.log(\`Block \${blockNumber}: \${block.transactions.length} txns\`);
});

// Listen to contract events
const usdc = new ethers.Contract(USDC_ADDRESS, usdcAbi, provider);

usdc.on('Transfer', (from, to, value, event) => {
  const amount = Number(value) / 1e6;
  if (amount > 100_000) {
    console.log(\`💵 $\${amount.toLocaleString()} USDC transfer\`);
    console.log(\`   \${from} → \${to}\`);
    console.log(\`   Block: \${event.blockNumber}\`);
  }
});

// Query past events
const filter = usdc.filters.Transfer(null, null);
const events = await usdc.queryFilter(filter, -1000); // last 1000 blocks
\`\`\`

## QuickNode Streams

\`\`\`javascript
// QuickNode Streams push data to your endpoint via HTTP
// Configure at dashboard.quicknode.com/streams

// Your endpoint receives:
app.post('/quicknode-stream', express.json(), (req, res) => {
  const blocks = req.body;
  blocks.forEach(block => {
    block.transactions?.forEach(tx => {
      if (BigInt(tx.value) > BigInt('100000000000000000000')) { // >100 ETH
        console.log(\`Large TX: \${parseInt(tx.value) / 1e18} ETH\`);
      }
    });
  });
  res.sendStatus(200);
});
\`\`\``
  },
  {
    slug: 'defi-lending-api-guide',
    title: 'DeFi Lending APIs: Aave, Compound, and Morpho Compared (2026)',
    meta: 'Compare DeFi lending protocols — Aave V3, Compound V3, Morpho — with API examples for querying rates, positions, and health factors.',
    keywords: 'DeFi lending API, Aave API, Compound API, Morpho API, lending rate API',
    content: `# DeFi Lending APIs: Aave, Compound, and Morpho Compared (2026)

The three major DeFi lending protocols each offer different APIs and risk models. Here's how to query them.

## Protocol Comparison

| Protocol | TVL | Model | Key Feature |
|---|---|---|---|
| Aave V3 | $15B+ | Pool-based | Efficiency mode, cross-chain |
| Compound V3 | $3B+ | Single-asset | Base interest model |
| Morpho | $5B+ | P2P matching | Better rates than Aave/Compound |
| Spark | $2B+ | Aave fork | MakerDAO's lending arm |

## Aave V3 (Subgraph)

\`\`\`javascript
const query = \`{
  reserves(where: { isActive: true }) {
    symbol
    liquidityRate
    variableBorrowRate
    totalDeposits
    totalCurrentVariableDebt
    availableLiquidity
    utilizationRate
  }
}\`;

const { reserves } = await fetch('https://api.thegraph.com/subgraphs/name/aave/protocol-v3', {
  method: 'POST', headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ query })
}).then(r => r.json()).then(d => d.data);

reserves.forEach(r => {
  const deposit = (parseFloat(r.liquidityRate) / 1e27 * 100).toFixed(3);
  const borrow = (parseFloat(r.variableBorrowRate) / 1e27 * 100).toFixed(3);
  const util = (parseFloat(r.utilizationRate) * 100).toFixed(1);
  console.log(\`\${r.symbol}: Deposit \${deposit}% | Borrow \${borrow}% | Util \${util}%\`);
});
\`\`\`

## Compound V3 (Comet)

\`\`\`javascript
const COMETS = {
  'USDC-ETH': '0xc3d688B66703497DAA19211EEdff47f25384cdc3',
  'USDT-ETH': '0x3Afdc9BCA9213A35503b077a6072F3D0d5AB0840',
  'USDC-ARB': '0x9c4ec768c28520B50860ea7a15bd7213a9fF58bf'
};

const cometAbi = [
  'function getUtilization() view returns (uint)',
  'function getSupplyRate(uint utilization) view returns (uint64)',
  'function getBorrowRate(uint utilization) view returns (uint64)',
  'function totalSupply() view returns (uint)',
  'function totalBorrow() view returns (uint)'
];

const comet = new ethers.Contract(COMETS['USDC-ETH'], cometAbi, provider);
const util = await comet.getUtilization();
const [supplyRate, borrowRate] = await Promise.all([
  comet.getSupplyRate(util),
  comet.getBorrowRate(util)
]);

const SECONDS_PER_YEAR = 31_536_000;
const toAPY = (rate) => (Number(rate) / 1e18) * SECONDS_PER_YEAR * 100;
console.log('Supply APY:', toAPY(supplyRate).toFixed(3), '%');
console.log('Borrow APY:', toAPY(borrowRate).toFixed(3), '%');
\`\`\`

## Morpho

\`\`\`javascript
const morphoQuery = \`{
  markets(first: 20, orderBy: totalValueLockedUSD, orderDirection: desc) {
    id
    inputToken { symbol }
    rates { rate side type }
    totalValueLockedUSD
    totalBorrowBalanceUSD
  }
}\`;

const { markets } = await fetch('https://api.thegraph.com/subgraphs/name/morpho-labs/morpho-aavev3-ethereum', {
  method: 'POST', headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ query: morphoQuery })
}).then(r => r.json()).then(d => d.data);
\`\`\`

## Rate Comparison Tool

\`\`\`javascript
async function compareLendingRates(asset = 'USDC') {
  const [aave, compound] = await Promise.all([
    getAaveRate(asset),
    getCompoundRate(asset)
  ]);

  const sparkRate = await fetch('https://api.spark.fi/rates').then(r => r.json());

  return {
    aave: { deposit: aave.depositApy, borrow: aave.borrowApy },
    compound: { deposit: compound.depositApy, borrow: compound.borrowApy },
    best_deposit: [aave, compound].sort((a, b) => b.depositApy - a.depositApy)[0].name,
    best_borrow: [aave, compound].sort((a, b) => a.borrowApy - b.borrowApy)[0].name
  };
}
\`\`\``
  },
  {
    slug: 'crypto-market-cap-api-guide',
    title: 'Crypto Market Cap APIs: Rankings, Dominance, and Global Metrics (2026)',
    meta: 'How to fetch crypto market cap data, global market stats, dominance percentages, and sector rankings from CoinMarketCap and CoinGecko APIs.',
    keywords: 'crypto market cap API, Bitcoin dominance API, global crypto market API, CoinMarketCap global metrics, crypto rankings API',
    content: `# Crypto Market Cap APIs: Rankings, Dominance, and Global Metrics (2026)

Market cap data drives rankings, dominance calculations, and macro crypto analytics. Here's how to access it.

## CoinMarketCap Global Metrics

\`\`\`javascript
const headers = { 'X-CMC_PRO_API_KEY': process.env.CMC_KEY };
const BASE = 'https://pro-api.coinmarketcap.com/v1';

// Global market stats
const global = await fetch(\`\${BASE}/global-metrics/quotes/latest\`, { headers }).then(r => r.json());
const d = global.data;
console.log('Total market cap:', (d.quote.USD.total_market_cap / 1e12).toFixed(2), 'T');
console.log('BTC dominance:', d.btc_dominance.toFixed(1), '%');
console.log('ETH dominance:', d.eth_dominance.toFixed(1), '%');
console.log('24h volume:', (d.quote.USD.total_volume_24h / 1e9).toFixed(1), 'B');
console.log('DeFi market cap:', (d.quote.USD.defi_market_cap / 1e9).toFixed(1), 'B');
console.log('Stablecoin market cap:', (d.quote.USD.stablecoin_market_cap / 1e9).toFixed(1), 'B');
console.log('Active cryptos:', d.active_cryptocurrencies);

// Historical global metrics
const history = await fetch(\`\${BASE}/global-metrics/quotes/historical?time_start=2024-01-01&interval=1d\`, { headers }).then(r => r.json());
\`\`\`

## Top 100 by Market Cap

\`\`\`javascript
const listings = await fetch(
  \`\${BASE}/cryptocurrency/listings/latest?limit=100&sort=market_cap&convert=USD\`,
  { headers }
).then(r => r.json());

listings.data.forEach((coin, i) => {
  const mc = (coin.quote.USD.market_cap / 1e9).toFixed(1);
  const change = coin.quote.USD.percent_change_24h.toFixed(1);
  const sign = change > 0 ? '+' : '';
  console.log(\`#\${i + 1} \${coin.name} (\${coin.symbol}): $\${mc}B [\${sign}\${change}%]\`);
});
\`\`\`

## CoinGecko Global Data

\`\`\`javascript
// Global market overview
const global = await fetch('https://api.coingecko.com/api/v3/global').then(r => r.json());
const d = global.data;
console.log('Market cap:', (d.total_market_cap.usd / 1e12).toFixed(2), 'T');
console.log('BTC dominance:', d.market_cap_percentage.btc.toFixed(1), '%');
console.log('ETH dominance:', d.market_cap_percentage.eth.toFixed(1), '%');
console.log('Active coins:', d.active_cryptocurrencies);

// Market cap chart
const chart = await fetch(
  'https://api.coingecko.com/api/v3/global/market_cap_chart?days=30'
).then(r => r.json());
// { market_cap: [[timestamp, usd], ...] }
\`\`\`

## Sector / Category Data

\`\`\`javascript
// CoinGecko categories (DeFi, Layer 1, Layer 2, NFT, etc.)
const categories = await fetch('https://api.coingecko.com/api/v3/coins/categories').then(r => r.json());
categories.sort((a, b) => (b.market_cap || 0) - (a.market_cap || 0)).slice(0, 10).forEach(c => {
  const mc = ((c.market_cap || 0) / 1e9).toFixed(1);
  const change = (c.market_cap_change_24h || 0).toFixed(1);
  console.log(\`\${c.name}: $\${mc}B [\${change}%]\`);
});
\`\`\`

## Fear & Greed Index

\`\`\`javascript
// Alternative.me Fear & Greed
const fng = await fetch('https://api.alternative.me/fng/?limit=7').then(r => r.json());
fng.data.forEach(d => {
  const date = new Date(d.timestamp * 1000).toLocaleDateString();
  console.log(\`\${date}: \${d.value} (\${d.value_classification})\`);
});
// 0–25 Extreme Fear, 25–50 Fear, 50–75 Greed, 75–100 Extreme Greed
\`\`\``
  },
  {
    slug: 'mempool-api-guide',
    title: 'Mempool APIs: Monitor Pending Transactions and MEV (2026)',
    meta: 'How to access the Ethereum and Bitcoin mempool — track pending transactions, gas spikes, sandwich attacks, and MEV opportunities using Blocknative and Mempool.space.',
    keywords: 'mempool API, pending transaction API, MEV API, Blocknative API, Ethereum mempool data',
    content: `# Mempool APIs: Monitor Pending Transactions and MEV (2026)

The mempool is where transactions wait before being included in a block. Monitoring it reveals gas spikes, large pending transactions, and MEV opportunities.

## Blocknative (Ethereum Mempool)

\`\`\`javascript
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
\`\`\`

## Mempool.space (Bitcoin)

\`\`\`javascript
const BASE = 'https://mempool.space/api';

// Mempool overview
const mempool = await fetch(\`\${BASE}/mempool\`).then(r => r.json());
console.log('Pending TXs:', mempool.count);
console.log('Mempool size:', (mempool.vsize / 1e6).toFixed(1), 'MB');

// Fee recommendations
const fees = await fetch(\`\${BASE}/v1/fees/recommended\`).then(r => r.json());
console.log('Fastest:', fees.fastestFee, 'sat/vB (~10 min)');
console.log('Hour:', fees.hourFee, 'sat/vB');
console.log('Day:', fees.minimumFee, 'sat/vB');

// Specific transaction status
const tx = await fetch(\`\${BASE}/tx/TXID\`).then(r => r.json());
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
\`\`\`

## Ethereum Pending TX via RPC

\`\`\`javascript
// Watch for large pending transactions
const provider = new ethers.WebSocketProvider(process.env.ETH_WSS_URL);

provider.on('pending', async (txHash) => {
  const tx = await provider.getTransaction(txHash);
  if (!tx) return;

  const eth = parseFloat(ethers.formatEther(tx.value));
  const gasPrice = parseInt(tx.gasPrice || tx.maxFeePerGas) / 1e9;

  if (eth > 50) {
    console.log(\`Pending: \${eth.toFixed(1)} ETH @ \${gasPrice.toFixed(0)} Gwei\`);
  }
});
\`\`\`

## MEV Detection

\`\`\`javascript
// Detect sandwich attacks via Flashbots MEV API
const mevBlocks = await fetch('https://blocks.flashbots.net/v1/blocks?limit=10').then(r => r.json());

mevBlocks.blocks.forEach(block => {
  block.transactions.forEach(tx => {
    if (tx.type === 'sandwich') {
      console.log(\`Sandwich: \${tx.coinbase_transfer} ETH profit in block \${block.block_number}\`);
    }
  });
});
\`\`\``
  },
  {
    slug: 'zksync-api-guide',
    title: 'zkSync Era API Guide: Zero-Knowledge Rollup Development (2026)',
    meta: 'Build on zkSync Era — setup, RPC endpoints, zkSync SDK, account abstraction, and paymasters for gasless transactions.',
    keywords: 'zkSync API, zkSync Era RPC, zkSync developer guide, zero-knowledge rollup API, zkSync account abstraction',
    content: `# zkSync Era API Guide: Zero-Knowledge Rollup Development (2026)

zkSync Era is a ZK rollup with full EVM compatibility, native account abstraction, and paymaster support for gasless UX.

## RPC and Setup

\`\`\`javascript
import { Provider, Wallet } from 'zksync-ethers';
import { ethers } from 'ethers';

const provider = new Provider('https://mainnet.era.zksync.io');
// Chain ID: 324

// Standard ethers.js also works
const ethersProvider = new ethers.JsonRpcProvider('https://mainnet.era.zksync.io');
\`\`\`

## Balances

\`\`\`javascript
// ETH balance
const balance = await provider.getBalance('0xAddress');
console.log(ethers.formatEther(balance), 'ETH');

// ERC-20 balance
const tokenBalance = await provider.getBalance('0xAddress', 'latest', '0xTokenAddress');
console.log(ethers.formatUnits(tokenBalance, 6), 'USDC');
\`\`\`

## Sending Transactions

\`\`\`javascript
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
\`\`\`

## Account Abstraction + Paymasters

\`\`\`javascript
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
\`\`\`

## Deploy a Contract

\`\`\`javascript
import { ContractFactory } from 'zksync-ethers';

const factory = new ContractFactory(abi, bytecode, wallet);
const contract = await factory.deploy(/* constructor args */);
await contract.waitForDeployment();
console.log('Deployed at:', await contract.getAddress());
\`\`\`

## Explorer API (zkSync Era block explorer)

\`\`\`javascript
const BASE = 'https://block-explorer-api.mainnet.zksync.io/api';

// Account transactions
const txns = await fetch(
  \`\${BASE}?module=account&action=txlist&address=0xAddress&sort=desc\`
).then(r => r.json());

// Token transfers
const transfers = await fetch(
  \`\${BASE}?module=account&action=tokentx&address=0xAddress&sort=desc\`
).then(r => r.json());
\`\`\`

## Bridge (L1 → zkSync)

\`\`\`javascript
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
\`\`\``
  },
  {
    slug: 'staking-api-guide',
    title: 'Crypto Staking APIs: Rates, Validators, and Liquid Staking (2026)',
    meta: 'How to query staking data — validator sets, APY rates, and liquid staking tokens — from Ethereum beacon chain, Lido, Rocket Pool, and Kiln APIs.',
    keywords: 'staking API, Ethereum staking API, Lido API, Rocket Pool API, validator API, liquid staking API',
    content: `# Crypto Staking APIs: Rates, Validators, and Liquid Staking (2026)

Staking data spans beacon chain validators, liquid staking protocols, and native chain staking. Here's how to query it all.

## Ethereum Beacon Chain API

\`\`\`javascript
const BEACON = 'https://beaconcha.in/api/v1';

// Current staking stats
const stats = await fetch(\`\${BEACON}/epoch/latest\`).then(r => r.json());
console.log('Active validators:', stats.data.validatorscount);
console.log('Total ETH staked:', (parseInt(stats.data.eligibleether) / 1e9).toFixed(0));

// Validator info
const validator = await fetch(\`\${BEACON}/validator/1\`).then(r => r.json());
console.log('Status:', validator.data.status);
console.log('Balance:', validator.data.balance / 1e9, 'ETH');
console.log('Effectiveness:', validator.data.attestationeffectiveness, '%');

// Staking APR from beaconcha.in
const apr = await fetch('https://beaconcha.in/api/v1/ethstore/latest').then(r => r.json());
console.log('APR:', (apr.data.apr * 100).toFixed(2), '%');
\`\`\`

## Lido API

\`\`\`javascript
// Current APR
const apr = await fetch('https://eth-api.lido.fi/v1/protocol/steth/apr/sma').then(r => r.json());
console.log('stETH APR (7d SMA):', apr.data.smaApr, '%');

// Total staked
const stats = await fetch('https://eth-api.lido.fi/v1/protocol/steth/stats').then(r => r.json());
console.log('Total staked:', (stats.data.totalStaked / 1e18).toFixed(0), 'ETH');

// stETH on-chain
const stETH_ADDRESS = '0xae7ab96520DE3A18E5e111B5EaAb095312D7fE84';
const stEthAbi = ['function getTotalPooledEther() view returns (uint256)', 'function balanceOf(address) view returns (uint256)'];
const stEth = new ethers.Contract(stETH_ADDRESS, stEthAbi, provider);
const totalPooled = await stEth.getTotalPooledEther();
console.log('Total pooled:', ethers.formatEther(totalPooled), 'ETH');
\`\`\`

## Rocket Pool

\`\`\`javascript
// rETH APR
const rp = await fetch('https://api.rocketpool.net/api/eth/apr').then(r => r.json());
console.log('rETH APR:', rp.yearlyAPR, '%');

// rETH exchange rate on-chain
const RETH_ADDRESS = '0xae78736Cd615f374D3085123A210448E74Fc6393';
const rEthAbi = ['function getExchangeRate() view returns (uint256)'];
const rEth = new ethers.Contract(RETH_ADDRESS, rEthAbi, provider);
const rate = await rEth.getExchangeRate();
console.log('1 rETH =', ethers.formatEther(rate), 'ETH');
\`\`\`

## Kiln API (Institutional Staking)

\`\`\`javascript
// Stake ETH via Kiln
const res = await fetch('https://api.kiln.fi/v1/eth/stakes', {
  method: 'POST',
  headers: {
    'Authorization': \`Bearer \${process.env.KILN_API_KEY}\`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    account_id: 'your-account',
    wallet: '0xYourWallet',
    amount_wei: '32000000000000000000' // 32 ETH
  })
}).then(r => r.json());

// Get stake rewards
const rewards = await fetch(\`https://api.kiln.fi/v1/eth/rewards?wallets=0xYourWallet\`, {
  headers: { 'Authorization': \`Bearer \${process.env.KILN_API_KEY}\` }
}).then(r => r.json());
\`\`\`

## Solana Staking

\`\`\`javascript
import { Connection, PublicKey, StakeProgram } from '@solana/web3.js';

const connection = new Connection(process.env.SOLANA_RPC_URL);

// Get vote accounts (validators)
const voteAccounts = await connection.getVoteAccounts();
console.log('Active validators:', voteAccounts.current.length);
console.log('Delinquent:', voteAccounts.delinquent.length);

// Sort by stake
const byStake = voteAccounts.current.sort((a, b) => b.activatedStake - a.activatedStake);
byStake.slice(0, 5).forEach(v => {
  console.log(v.votePubkey.slice(0, 16), 'Stake:', (v.activatedStake / 1e9).toFixed(0), 'SOL', 'Commission:', v.commission, '%');
});
\`\`\``
  },
  {
    slug: 'ens-api-guide',
    title: 'ENS API Guide: Ethereum Name Service Integration (2026)',
    meta: 'How to resolve ENS names, look up reverse records, query text records, and fetch ENS NFT metadata using ethers.js and the ENS subgraph.',
    keywords: 'ENS API, Ethereum Name Service API, ENS resolution, ENS reverse lookup, ethers.js ENS',
    content: `# ENS API Guide: Ethereum Name Service Integration (2026)

ENS maps human-readable names (vitalik.eth) to Ethereum addresses, IPFS hashes, and arbitrary records. It's the de facto identity layer for Web3.

## Resolve a Name (ethers.js)

\`\`\`javascript
import { ethers } from 'ethers';

const provider = new ethers.JsonRpcProvider(process.env.ETH_RPC_URL);

// Name → Address
const address = await provider.resolveName('vitalik.eth');
console.log('vitalik.eth →', address);

// Address → Name (reverse lookup)
const name = await provider.lookupAddress('0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045');
console.log(address, '→', name); // vitalik.eth
\`\`\`

## ENS SDK (Advanced)

\`\`\`javascript
import { createEnsPublicClient } from '@ensdomains/ensjs';
import { http } from 'viem';
import { mainnet } from 'viem/chains';

const client = createEnsPublicClient({ chain: mainnet, transport: http(process.env.ETH_RPC_URL) });

// Resolve address
const address = await client.getAddressRecord({ name: 'vitalik.eth' });

// Get all records
const text = await client.getTextRecord({ name: 'vitalik.eth', key: 'url' });
const avatar = await client.getTextRecord({ name: 'vitalik.eth', key: 'avatar' });
const twitter = await client.getTextRecord({ name: 'vitalik.eth', key: 'com.twitter' });

console.log('URL:', text);
console.log('Avatar:', avatar);
console.log('Twitter:', twitter);

// Get all names for an address
const names = await client.getNames({ address: '0xYourAddress', pageSize: 100 });
\`\`\`

## ENS Subgraph

\`\`\`javascript
const ENS_SUBGRAPH = 'https://api.thegraph.com/subgraphs/name/ensdomains/ens';

// Get all domains for an address
const { account } = await fetch(ENS_SUBGRAPH, {
  method: 'POST', headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ query: \`{
    account(id: "0xd8da6bf26964af9d7eed9e03e53415d37aa96045") {
      domains { name labelName }
      registrations { expiryDate domain { name } }
    }
  }\` })
}).then(r => r.json()).then(d => d.data);

// Search for names
const { domains } = await fetch(ENS_SUBGRAPH, {
  method: 'POST', headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ query: \`{
    domains(where: { name_contains: "vitalik" }, first: 10) {
      name owner { id } resolver { texts }
    }
  }\` })
}).then(r => r.json()).then(d => d.data);
\`\`\`

## Check Name Availability + Registration

\`\`\`javascript
// Check if available
const available = await client.getAvailable({ name: 'myname.eth' });
console.log('Available:', available);

// Get price
const price = await client.getPrice({ nameOrNames: 'myname.eth', duration: 365 * 24 * 3600 });
console.log('1yr price:', ethers.formatEther(price.base), 'ETH');

// Register (requires signer)
const controller = new ethers.Contract(
  '0x253553366Da8546fC250F225fe3d25d0C782303b', // ETH Registrar Controller
  controllerAbi,
  signer
);
const commitment = await controller.makeCommitment(name, owner, duration, secret, resolver, [], false, 0);
await controller.commit(commitment);
// Wait 60 seconds (min commitment age)
await controller.register(name, owner, duration, secret, resolver, [], false, 0, { value: price.base });
\`\`\``
  },
  {
    slug: 'polygon-zkevm-api-guide',
    title: 'Polygon zkEVM API Guide: ZK Rollup on Ethereum (2026)',
    meta: 'Build on Polygon zkEVM — setup, RPC endpoints, bridge, and deploy EVM contracts on a zero-knowledge rollup with full Ethereum equivalence.',
    keywords: 'Polygon zkEVM API, zkEVM developer guide, Polygon ZK rollup, zkEVM RPC, ZK Ethereum',
    content: `# Polygon zkEVM API Guide: ZK Rollup on Ethereum (2026)

Polygon zkEVM is a type 2 ZK-EVM — fully Ethereum-equivalent, using ZK proofs for L1 security at L2 costs.

## RPC Endpoints

| Network | RPC | Chain ID |
|---|---|---|
| zkEVM Mainnet | \`https://zkevm-rpc.com\` | 1101 |
| Cardona Testnet | \`https://rpc.cardona.zkevm-rpc.com\` | 2442 |

\`\`\`javascript
import { ethers } from 'ethers';
const provider = new ethers.JsonRpcProvider('https://zkevm-rpc.com');
\`\`\`

## Full EVM Compatibility

All standard ethers.js calls work identically:

\`\`\`javascript
const balance = await provider.getBalance('0xAddress');
const block = await provider.getBlock('latest');
const tx = await provider.getTransaction('0xHash');

// Deploy contracts exactly as on Ethereum
const factory = new ethers.ContractFactory(abi, bytecode, signer);
const contract = await factory.deploy();
\`\`\`

## Bridge (Ethereum → zkEVM)

\`\`\`javascript
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
\`\`\`

## zkEVM Explorer API

\`\`\`javascript
// Same Etherscan-compatible API
const BASE = 'https://api-zkevm.polygonscan.com/api';
const key = process.env.POLYGONSCAN_KEY;

const txns = await fetch(
  \`\${BASE}?module=account&action=txlist&address=0xAddress&sort=desc&apikey=\${key}\`
).then(r => r.json());
\`\`\`

## Gas on zkEVM

zkEVM gas works like Ethereum mainnet but is significantly cheaper:

\`\`\`javascript
const feeData = await provider.getFeeData();
console.log('Gas price:', ethers.formatUnits(feeData.gasPrice, 'gwei'), 'Gwei');
// Typically 0.1-1 Gwei vs. Ethereum's 5-50 Gwei

const estimate = await provider.estimateGas({ to: '0xAddress', value: ethers.parseEther('0.01') });
const cost = estimate * feeData.gasPrice;
console.log('Transfer cost:', ethers.formatEther(cost), 'ETH');
\`\`\`

## QuickSwap on zkEVM

\`\`\`javascript
const QUICKSWAP_ROUTER = '0xF6Ad3CcF71Abb3E12beCf6b3D2a74C963859ADCd';

const routerAbi = ['function getAmountsOut(uint amountIn, address[] memory path) view returns (uint[] memory amounts)'];
const router = new ethers.Contract(QUICKSWAP_ROUTER, routerAbi, provider);

const MATIC = '0xa2036f0538221a77A3937F1379699f44945018d0';
const USDC = '0xA8CE8aee21bC2A48a5EF670afCc9274C7bbbC035';

const amounts = await router.getAmountsOut(ethers.parseEther('1'), [MATIC, USDC]);
console.log('1 MATIC =', ethers.formatUnits(amounts[1], 6), 'USDC');
\`\`\``
  },
  {
    slug: 'web3-data-indexing-guide',
    title: 'Web3 Data Indexing: Build Custom Blockchain Indexers (2026)',
    meta: 'How to index blockchain data with Ponder, The Graph, or custom indexers using ethers.js. Store on-chain events in PostgreSQL for fast queries.',
    keywords: 'blockchain indexer, Web3 data indexing, Ponder indexer, custom blockchain indexer, on-chain data pipeline',
    content: `# Web3 Data Indexing: Build Custom Blockchain Indexers (2026)

Querying raw blockchain data is slow. Indexers transform on-chain events into queryable databases — the same architecture used by Etherscan, Uniswap, and every major DeFi frontend.

## Option 1: Ponder (Recommended for Custom Indexers)

\`\`\`bash
npm create ponder@latest
\`\`\`

\`\`\`javascript
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
\`\`\`

\`\`\`javascript
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
\`\`\`

## Option 2: Custom Indexer with ethers.js + PostgreSQL

\`\`\`javascript
import { ethers } from 'ethers';
import pg from 'pg';

const provider = new ethers.JsonRpcProvider(process.env.ETH_RPC_URL);
const db = new pg.Pool({ connectionString: process.env.DATABASE_URL });

await db.query(\`
  CREATE TABLE IF NOT EXISTS transfers (
    id SERIAL PRIMARY KEY,
    block_number INTEGER,
    tx_hash TEXT,
    from_address TEXT,
    to_address TEXT,
    amount NUMERIC,
    timestamp TIMESTAMPTZ
  )
\`);

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
  console.log(\`Indexed to block \${b + 2000}\`);
}
\`\`\`

## Option 3: The Graph (Decentralized)

\`\`\`bash
graph init --product subgraph-studio my-subgraph
\`\`\`

\`\`\`yaml
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
\`\`\`

## Real-Time + Historical Combined

\`\`\`javascript
// 1. Backfill historical data
await backfillEvents(deployBlock, currentBlock);

// 2. Switch to real-time listening
usdc.on('Transfer', async (from, to, value, event) => {
  await db.query('INSERT INTO transfers ...', [event.blockNumber, ...]);
});
\`\`\``
  },
  {
    slug: 'ipfs-api-guide',
    title: 'IPFS APIs for Web3: Upload, Pin, and Fetch Decentralized Content (2026)',
    meta: 'How to use IPFS APIs — Pinata, Web3.Storage, Infura IPFS — for uploading NFT metadata, images, and files to decentralized storage.',
    keywords: 'IPFS API, Pinata API, Web3.Storage API, NFT metadata IPFS, decentralized storage API',
    content: `# IPFS APIs for Web3: Upload, Pin, and Fetch Decentralized Content (2026)

IPFS is used for NFT metadata, images, and any content that needs to be referenced on-chain without centralization. Pinning services ensure your content stays accessible.

## Pinata (Most Popular)

\`\`\`javascript
// Upload JSON metadata
const metadata = {
  name: 'My NFT #1',
  description: 'A unique digital collectible',
  image: 'ipfs://QmYourImageHash',
  attributes: [
    { trait_type: 'Background', value: 'Blue' },
    { trait_type: 'Eyes', value: 'Laser' }
  ]
};

const res = await fetch('https://api.pinata.cloud/pinning/pinJSONToIPFS', {
  method: 'POST',
  headers: {
    'Authorization': \`Bearer \${process.env.PINATA_JWT}\`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({ pinataContent: metadata, pinataMetadata: { name: 'nft-1.json' } })
});
const { IpfsHash } = await res.json();
console.log('IPFS URI:', \`ipfs://\${IpfsHash}\`);

// Upload a file
const formData = new FormData();
formData.append('file', fileBlob, 'image.png');
formData.append('pinataMetadata', JSON.stringify({ name: 'nft-image.png' }));

const imgRes = await fetch('https://api.pinata.cloud/pinning/pinFileToIPFS', {
  method: 'POST',
  headers: { 'Authorization': \`Bearer \${process.env.PINATA_JWT}\` },
  body: formData
});
const { IpfsHash: imageHash } = await imgRes.json();
\`\`\`

## Pinata SDK

\`\`\`javascript
import { PinataSDK } from 'pinata';

const pinata = new PinataSDK({ pinataJwt: process.env.PINATA_JWT });

// Upload file
const upload = await pinata.upload.file(file);
console.log('CID:', upload.IpfsHash);

// Upload JSON
const json = await pinata.upload.json({ name: 'test', value: 123 });

// List pinned files
const pins = await pinata.listFiles().pageLimit(10);
\`\`\`

## Web3.Storage (Filecoin + IPFS)

\`\`\`javascript
import { create } from '@web3-storage/w3up-client';

const client = await create();
await client.login('your@email.com');
await client.setCurrentSpace(process.env.W3_SPACE_DID);

// Upload files
const cid = await client.uploadFile(file);
console.log('IPFS CID:', cid.toString());
\`\`\`

## Resolve IPFS Content

\`\`\`javascript
// Multiple public gateways
const GATEWAYS = [
  'https://ipfs.io/ipfs/',
  'https://cloudflare-ipfs.com/ipfs/',
  'https://gateway.pinata.cloud/ipfs/',
  'https://dweb.link/ipfs/'
];

async function fetchFromIPFS(cid) {
  for (const gateway of GATEWAYS) {
    try {
      const res = await fetch(gateway + cid, { signal: AbortSignal.timeout(5000) });
      if (res.ok) return res.json();
    } catch {}
  }
  throw new Error(\`Failed to fetch \${cid} from all gateways\`);
}

// Convert IPFS URI to HTTPS
function ipfsToHttps(uri, gateway = 'https://ipfs.io/ipfs/') {
  if (uri?.startsWith('ipfs://')) return uri.replace('ipfs://', gateway);
  if (uri?.startsWith('Qm') || uri?.startsWith('bafy')) return gateway + uri;
  return uri;
}
\`\`\``
  },
  {
    slug: 'lens-protocol-api-guide',
    title: 'Lens Protocol API Guide: Decentralized Social Graph (2026)',
    meta: 'How to build on Lens Protocol — fetch profiles, publications, followers, and post content using the Lens API and GraphQL.',
    keywords: 'Lens Protocol API, Lens GraphQL API, decentralized social API, Web3 social API, Lens developer guide',
    content: `# Lens Protocol API Guide: Decentralized Social Graph (2026)

Lens Protocol is a decentralized social graph on Polygon. Posts, follows, and profiles are NFTs — developers can build social apps without platform lock-in.

## Setup

\`\`\`javascript
const LENS_API = 'https://api-v2.lens.dev';

async function lensQuery(query, variables = {}) {
  const res = await fetch(LENS_API, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, variables })
  });
  return (await res.json()).data;
}
\`\`\`

## Fetch a Profile

\`\`\`javascript
const { profile } = await lensQuery(\`
  query GetProfile($handle: HandleInfo!) {
    profile(request: { forHandle: $handle }) {
      id
      handle { fullHandle }
      metadata { displayName bio picture { ... on ImageSet { optimized { uri } } } }
      stats { followers following posts }
    }
  }
\`, { handle: { localName: 'stani', namespace: 'lens' } });

console.log(profile.metadata.displayName);
console.log(profile.stats.followers, 'followers');
\`\`\`

## Get Feed

\`\`\`javascript
const { publications } = await lensQuery(\`
  query GetFeed($profileId: ProfileId!) {
    publications(request: {
      where: { from: [$profileId] }
      orderBy: LATEST
      limit: Ten
    }) {
      items {
        ... on Post {
          id
          createdAt
          metadata { ... on TextOnlyMetadataV3 { content } }
          stats { reactions comments mirrors }
        }
      }
    }
  }
\`, { profileId: '0x01' });
\`\`\`

## Search Profiles

\`\`\`javascript
const { searchProfiles } = await lensQuery(\`
  query Search($query: String!) {
    searchProfiles(request: { query: $query, limit: Ten }) {
      items {
        id
        handle { fullHandle }
        metadata { displayName }
        stats { followers }
      }
    }
  }
\`, { query: 'vitalik' });
\`\`\`

## Post Content (Authenticated)

\`\`\`javascript
// 1. Get auth challenge
const { challenge } = await lensQuery(\`
  mutation Challenge($address: EvmAddress!) {
    challenge(request: { signedBy: $address }) { id text }
  }
\`, { address: '0xYourAddress' });

// 2. Sign and authenticate
const signature = await signer.signMessage(challenge.text);
const { authenticate } = await lensQuery(\`
  mutation Authenticate($id: ChallengeId!, $signature: Signature!) {
    authenticate(request: { id: $id, signature: $signature }) { accessToken refreshToken }
  }
\`, { id: challenge.id, signature });

// 3. Post
const { postOnchain } = await fetch(LENS_API, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': \`Bearer \${authenticate.accessToken}\`
  },
  body: JSON.stringify({ query: \`
    mutation Post($request: OnchainPostRequest!) {
      postOnchain(request: $request) { ... on RelaySuccess { txHash } }
    }
  \`, variables: {
    request: {
      contentURI: 'ipfs://QmYourMetadataCID'
    }
  }})
}).then(r => r.json()).then(d => d.data);
\`\`\``
  },
];

for (const article of articles) {
  const content = `---
title: "${article.title}"
meta_description: "${article.meta}"
keywords: "${article.keywords}"
---

${article.content}
`;
  writeFileSync(join(OUT, `${article.slug}.md`), content);
  console.log(`✅ ${article.slug}.md`);
}
console.log(`\nWrote ${articles.length} articles`);
