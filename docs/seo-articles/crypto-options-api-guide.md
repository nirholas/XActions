---
title: "Crypto Options APIs: Deribit and Options Flow Data (2026)"
meta_description: "How to query Bitcoin and Ethereum options data from Deribit — implied volatility, Greeks, options chain, and real-time order book."
keywords: "crypto options API, Deribit API, Bitcoin options, implied volatility API, options chain API"
---

# Crypto Options APIs: Deribit and Options Flow Data (2026)

Deribit dominates crypto options with ~90% market share for BTC and ETH. This guide covers their API for market data, trading, and IV analytics.

## Deribit Market Data (No Auth)

```javascript
const DERIBIT = 'https://www.deribit.com/api/v2/public';

// Get all BTC option instruments
const instruments = await fetch(
  `${DERIBIT}/get_instruments?currency=BTC&kind=option&expired=false`
).then(r => r.json());

// Get options chain for a specific expiry
const expiry = '28MAR25';
const btcOptions = instruments.result.filter(i => i.instrument_name.includes(expiry));

// Get Greeks and IV for one contract
const ticker = await fetch(
  `${DERIBIT}/ticker?instrument_name=BTC-28MAR25-100000-C`
).then(r => r.json());

const d = ticker.result;
console.log('Mark IV:', d.mark_iv, '%');
console.log('Delta:', d.greeks.delta);
console.log('Gamma:', d.greeks.gamma);
console.log('Theta:', d.greeks.theta, '$/day');
console.log('Vega:', d.greeks.vega);
console.log('Mark Price:', d.mark_price, 'BTC');
```

## Options Chain Snapshot

```javascript
async function getOptionsChain(currency, expiry) {
  const instruments = await fetch(
    `https://www.deribit.com/api/v2/public/get_instruments?currency=${currency}&kind=option&expired=false`
  ).then(r => r.json());

  const filtered = instruments.result.filter(i => i.instrument_name.includes(expiry));

  const tickers = await Promise.all(
    filtered.map(i =>
      fetch(`https://www.deribit.com/api/v2/public/ticker?instrument_name=${i.instrument_name}`).then(r => r.json())
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
```

## Implied Volatility Surface

```javascript
async function buildIVSurface(currency = 'BTC') {
  const instruments = await fetch(
    `https://www.deribit.com/api/v2/public/get_instruments?currency=${currency}&kind=option&expired=false`
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
  const spotRes = await fetch(`https://www.deribit.com/api/v2/public/get_index_price?index_name=${currency.toLowerCase()}_usd`).then(r => r.json());
  const spot = spotRes.result.index_price;

  const surface = {};
  for (const [expiry, names] of Object.entries(expiries)) {
    const atm = names.find(n => {
      const strike = parseInt(n.split('-')[2]);
      return Math.abs(strike - spot) / spot < 0.05 && n.endsWith('-C');
    });
    if (!atm) continue;
    const ticker = await fetch(`https://www.deribit.com/api/v2/public/ticker?instrument_name=${atm}`).then(r => r.json());
    surface[expiry] = ticker.result.mark_iv;
  }
  return surface;
}
```

## Deribit Trading (Auth Required)

```javascript
async function placeOptionsOrder(instrument, qty, price, direction) {
  const token = await getAuthToken(); // client_credentials flow

  const res = await fetch('https://www.deribit.com/api/v2/private/buy', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      jsonrpc: '2.0', id: 1,
      method: `private/${direction}`,
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
```
