---
title: "Crypto Tax APIs: Automate Capital Gains Reporting (2026)"
meta_description: "How to use crypto tax APIs — CoinTracker, Koinly, TaxBit — to calculate capital gains, cost basis, and generate tax reports programmatically."
keywords: "crypto tax API, capital gains crypto API, Koinly API, CoinTracker API, crypto tax reporting"
---

# Crypto Tax APIs: Automate Capital Gains Reporting (2026)

Crypto tax obligations require tracking every trade, transfer, and DeFi interaction. Tax APIs automate cost basis calculation, gain/loss computation, and report generation.

## Koinly API

```javascript
// Import transactions
const res = await fetch('https://api.koinly.io/api/v2/transactions', {
  method: 'POST',
  headers: {
    'Authorization': `Token ${process.env.KOINLY_TOKEN}`,
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
```

## Calculate Gains Manually

```javascript
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
```

## Fetch Transaction History for Tax

```javascript
// Pull all Ethereum transactions for an address
async function getTaxableEvents(address) {
  const key = process.env.ETHERSCAN_KEY;
  const [txns, tokenTxns] = await Promise.all([
    fetch(`https://api.etherscan.io/api?module=account&action=txlist&address=${address}&sort=asc&apikey=${key}`).then(r => r.json()),
    fetch(`https://api.etherscan.io/api?module=account&action=tokentx&address=${address}&sort=asc&apikey=${key}`).then(r => r.json())
  ]);

  return {
    ethTransactions: txns.result,
    tokenTransfers: tokenTxns.result
  };
}
```

## TaxBit API

```javascript
const res = await fetch('https://api.taxbit.com/v1/transactions', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${process.env.TAXBIT_TOKEN}`,
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
```

## Tax Rules by Jurisdiction

| Country | Short-term | Long-term (>1yr) | DeFi treatment |
|---|---|---|---|
| USA | Ordinary income | 0–20% | Each swap is taxable |
| UK | CGT rates | Same | Each disposal taxable |
| Germany | 0–45% | 0% (held >1yr) | Complex, varies |
| Portugal | 0% | 0% | Generally exempt |
| Singapore | 0% | 0% | Generally exempt |
