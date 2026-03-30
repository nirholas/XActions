---
title: "Crypto Market Cap APIs: Rankings, Dominance, and Global Metrics (2026)"
meta_description: "How to fetch crypto market cap data, global market stats, dominance percentages, and sector rankings from CoinMarketCap and CoinGecko APIs."
keywords: "crypto market cap API, Bitcoin dominance API, global crypto market API, CoinMarketCap global metrics, crypto rankings API"
---

# Crypto Market Cap APIs: Rankings, Dominance, and Global Metrics (2026)

Market cap data drives rankings, dominance calculations, and macro crypto analytics. Here's how to access it.

## CoinMarketCap Global Metrics

```javascript
const headers = { 'X-CMC_PRO_API_KEY': process.env.CMC_KEY };
const BASE = 'https://pro-api.coinmarketcap.com/v1';

// Global market stats
const global = await fetch(`${BASE}/global-metrics/quotes/latest`, { headers }).then(r => r.json());
const d = global.data;
console.log('Total market cap:', (d.quote.USD.total_market_cap / 1e12).toFixed(2), 'T');
console.log('BTC dominance:', d.btc_dominance.toFixed(1), '%');
console.log('ETH dominance:', d.eth_dominance.toFixed(1), '%');
console.log('24h volume:', (d.quote.USD.total_volume_24h / 1e9).toFixed(1), 'B');
console.log('DeFi market cap:', (d.quote.USD.defi_market_cap / 1e9).toFixed(1), 'B');
console.log('Stablecoin market cap:', (d.quote.USD.stablecoin_market_cap / 1e9).toFixed(1), 'B');
console.log('Active cryptos:', d.active_cryptocurrencies);

// Historical global metrics
const history = await fetch(`${BASE}/global-metrics/quotes/historical?time_start=2024-01-01&interval=1d`, { headers }).then(r => r.json());
```

## Top 100 by Market Cap

```javascript
const listings = await fetch(
  `${BASE}/cryptocurrency/listings/latest?limit=100&sort=market_cap&convert=USD`,
  { headers }
).then(r => r.json());

listings.data.forEach((coin, i) => {
  const mc = (coin.quote.USD.market_cap / 1e9).toFixed(1);
  const change = coin.quote.USD.percent_change_24h.toFixed(1);
  const sign = change > 0 ? '+' : '';
  console.log(`#${i + 1} ${coin.name} (${coin.symbol}): $${mc}B [${sign}${change}%]`);
});
```

## CoinGecko Global Data

```javascript
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
```

## Sector / Category Data

```javascript
// CoinGecko categories (DeFi, Layer 1, Layer 2, NFT, etc.)
const categories = await fetch('https://api.coingecko.com/api/v3/coins/categories').then(r => r.json());
categories.sort((a, b) => (b.market_cap || 0) - (a.market_cap || 0)).slice(0, 10).forEach(c => {
  const mc = ((c.market_cap || 0) / 1e9).toFixed(1);
  const change = (c.market_cap_change_24h || 0).toFixed(1);
  console.log(`${c.name}: $${mc}B [${change}%]`);
});
```

## Fear & Greed Index

```javascript
// Alternative.me Fear & Greed
const fng = await fetch('https://api.alternative.me/fng/?limit=7').then(r => r.json());
fng.data.forEach(d => {
  const date = new Date(d.timestamp * 1000).toLocaleDateString();
  console.log(`${date}: ${d.value} (${d.value_classification})`);
});
// 0–25 Extreme Fear, 25–50 Fear, 50–75 Greed, 75–100 Extreme Greed
```
