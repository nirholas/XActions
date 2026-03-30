---
title: "Crypto Funding Rate APIs: Perpetuals Data for Traders (2026)"
meta_description: "How to fetch funding rates for perpetual futures from Binance, Bybit, dYdX, and aggregate them for trading signals and market sentiment analysis."
keywords: "funding rate API, perpetual futures API, crypto funding rate data, Binance funding rate, perps API"
---

# Crypto Funding Rate APIs: Perpetuals Data for Traders (2026)

Funding rates are periodic payments between long and short holders in perpetual futures markets. Extreme funding rates signal crowded trades — a powerful contrarian indicator.

## Binance Funding Rates

```javascript
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
  console.log(new Date(h.fundingTime).toLocaleDateString(), `${rate.toFixed(4)}% (${annualized.toFixed(1)}% annualized)`);
});

// All symbols funding rates
const all = await fetch('https://fapi.binance.com/fapi/v1/premiumIndex').then(r => r.json());
const sorted = all.sort((a, b) => Math.abs(parseFloat(b.lastFundingRate)) - Math.abs(parseFloat(a.lastFundingRate)));
console.log('Highest funding:', sorted[0].symbol, parseFloat(sorted[0].lastFundingRate) * 100, '%');
```

## Bybit Funding Rates

```javascript
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
```

## dYdX (Decentralized Perps)

```javascript
const BASE = 'https://api.dydx.exchange/v3';

const market = await fetch(`${BASE}/markets?market=BTC-USD`).then(r => r.json());
console.log('Funding rate:', market.markets['BTC-USD'].fundingRate);
console.log('Open interest:', market.markets['BTC-USD'].openInterest);

// Historical
const funding = await fetch(`${BASE}/historical-funding?market=BTC-USD&limit=100`).then(r => r.json());
```

## Coinglass Aggregated Funding

```javascript
const res = await fetch(
  'https://open-api.coinglass.com/public/v2/funding',
  { headers: { 'coinglassSecret': process.env.COINGLASS_KEY } }
).then(r => r.json());

res.data.forEach(coin => {
  console.log(coin.symbol);
  coin.uMarginList?.forEach(e => console.log(`  ${e.exchangeName}: ${(parseFloat(e.rate) * 100).toFixed(4)}%`));
});
```

## Funding Rate Trading Signal

```javascript
function getFundingSignal(rates) {
  // rates: array of {exchange, rate} for same asset
  const avg = rates.reduce((s, r) => s + parseFloat(r.rate), 0) / rates.length;
  const annualized = avg * 3 * 365 * 100;

  if (annualized > 100) return { signal: 'SHORT', reason: 'Longs overextended (>100% annualized)' };
  if (annualized < -50) return { signal: 'LONG', reason: 'Shorts overextended (<-50% annualized)' };
  return { signal: 'NEUTRAL', annualized };
}
```
