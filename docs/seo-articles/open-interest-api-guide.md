---
title: "Open Interest APIs: Derivatives Market Data for Crypto (2026)"
meta_description: "How to query open interest data from Binance, Bybit, CME, and Coinglass. Understand OI trends and build derivatives-aware trading signals."
keywords: "open interest API, crypto OI data, Binance open interest, derivatives data API, Coinglass API"
---

# Open Interest APIs: Derivatives Market Data for Crypto (2026)

Open interest (OI) is the total value of outstanding futures/options contracts. Rising OI with rising price = bullish trend strength. Rising OI with falling price = bearish pressure building.

## Binance Futures OI

```javascript
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
```

## Coinglass (Aggregated Multi-Exchange OI)

```javascript
const res = await fetch(
  'https://open-api.coinglass.com/public/v2/openInterest',
  { headers: { 'coinglassSecret': process.env.COINGLASS_KEY } }
).then(r => r.json());

res.data.forEach(coin => {
  const totalOI = coin.exchangeList?.reduce((s, e) => s + e.openInterestAmount, 0);
  console.log(`${coin.symbol}: $${(totalOI / 1e9).toFixed(2)}B OI`);
});
```

## Bybit OI

```javascript
const oi = await fetch(
  'https://api.bybit.com/v5/market/open-interest?category=linear&symbol=BTCUSDT&intervalTime=1h&limit=24'
).then(r => r.json());

oi.result.list.forEach(item => {
  console.log(new Date(parseInt(item.timestamp)).toLocaleString(), item.openInterest, 'BTC');
});
```

## OI + Price Divergence Signal

```javascript
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
```

## Options OI (Deribit)

```javascript
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
```
