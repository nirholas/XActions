---
title: "DeFi Lending APIs: Aave, Compound, and Morpho Compared (2026)"
meta_description: "Compare DeFi lending protocols — Aave V3, Compound V3, Morpho — with API examples for querying rates, positions, and health factors."
keywords: "DeFi lending API, Aave API, Compound API, Morpho API, lending rate API"
---

# DeFi Lending APIs: Aave, Compound, and Morpho Compared (2026)

The three major DeFi lending protocols each offer different APIs and risk models. Here's how to query them.

## Protocol Comparison

| Protocol | TVL | Model | Key Feature |
|---|---|---|---|
| Aave V3 | $15B+ | Pool-based | Efficiency mode, cross-chain |
| Compound V3 | $3B+ | Single-asset | Base interest model |
| Morpho | $5B+ | P2P matching | Better rates than Aave/Compound |
| Spark | $2B+ | Aave fork | MakerDAO's lending arm |

## Aave V3 (Subgraph)

```javascript
const query = `{
  reserves(where: { isActive: true }) {
    symbol
    liquidityRate
    variableBorrowRate
    totalDeposits
    totalCurrentVariableDebt
    availableLiquidity
    utilizationRate
  }
}`;

const { reserves } = await fetch('https://api.thegraph.com/subgraphs/name/aave/protocol-v3', {
  method: 'POST', headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ query })
}).then(r => r.json()).then(d => d.data);

reserves.forEach(r => {
  const deposit = (parseFloat(r.liquidityRate) / 1e27 * 100).toFixed(3);
  const borrow = (parseFloat(r.variableBorrowRate) / 1e27 * 100).toFixed(3);
  const util = (parseFloat(r.utilizationRate) * 100).toFixed(1);
  console.log(`${r.symbol}: Deposit ${deposit}% | Borrow ${borrow}% | Util ${util}%`);
});
```

## Compound V3 (Comet)

```javascript
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
```

## Morpho

```javascript
const morphoQuery = `{
  markets(first: 20, orderBy: totalValueLockedUSD, orderDirection: desc) {
    id
    inputToken { symbol }
    rates { rate side type }
    totalValueLockedUSD
    totalBorrowBalanceUSD
  }
}`;

const { markets } = await fetch('https://api.thegraph.com/subgraphs/name/morpho-labs/morpho-aavev3-ethereum', {
  method: 'POST', headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ query: morphoQuery })
}).then(r => r.json()).then(d => d.data);
```

## Rate Comparison Tool

```javascript
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
```
