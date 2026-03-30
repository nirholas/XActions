---
title: "Crypto Staking APIs: Rates, Validators, and Liquid Staking (2026)"
meta_description: "How to query staking data — validator sets, APY rates, and liquid staking tokens — from Ethereum beacon chain, Lido, Rocket Pool, and Kiln APIs."
keywords: "staking API, Ethereum staking API, Lido API, Rocket Pool API, validator API, liquid staking API"
---

# Crypto Staking APIs: Rates, Validators, and Liquid Staking (2026)

Staking data spans beacon chain validators, liquid staking protocols, and native chain staking. Here's how to query it all.

## Ethereum Beacon Chain API

```javascript
const BEACON = 'https://beaconcha.in/api/v1';

// Current staking stats
const stats = await fetch(`${BEACON}/epoch/latest`).then(r => r.json());
console.log('Active validators:', stats.data.validatorscount);
console.log('Total ETH staked:', (parseInt(stats.data.eligibleether) / 1e9).toFixed(0));

// Validator info
const validator = await fetch(`${BEACON}/validator/1`).then(r => r.json());
console.log('Status:', validator.data.status);
console.log('Balance:', validator.data.balance / 1e9, 'ETH');
console.log('Effectiveness:', validator.data.attestationeffectiveness, '%');

// Staking APR from beaconcha.in
const apr = await fetch('https://beaconcha.in/api/v1/ethstore/latest').then(r => r.json());
console.log('APR:', (apr.data.apr * 100).toFixed(2), '%');
```

## Lido API

```javascript
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
```

## Rocket Pool

```javascript
// rETH APR
const rp = await fetch('https://api.rocketpool.net/api/eth/apr').then(r => r.json());
console.log('rETH APR:', rp.yearlyAPR, '%');

// rETH exchange rate on-chain
const RETH_ADDRESS = '0xae78736Cd615f374D3085123A210448E74Fc6393';
const rEthAbi = ['function getExchangeRate() view returns (uint256)'];
const rEth = new ethers.Contract(RETH_ADDRESS, rEthAbi, provider);
const rate = await rEth.getExchangeRate();
console.log('1 rETH =', ethers.formatEther(rate), 'ETH');
```

## Kiln API (Institutional Staking)

```javascript
// Stake ETH via Kiln
const res = await fetch('https://api.kiln.fi/v1/eth/stakes', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${process.env.KILN_API_KEY}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    account_id: 'your-account',
    wallet: '0xYourWallet',
    amount_wei: '32000000000000000000' // 32 ETH
  })
}).then(r => r.json());

// Get stake rewards
const rewards = await fetch(`https://api.kiln.fi/v1/eth/rewards?wallets=0xYourWallet`, {
  headers: { 'Authorization': `Bearer ${process.env.KILN_API_KEY}` }
}).then(r => r.json());
```

## Solana Staking

```javascript
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
```
