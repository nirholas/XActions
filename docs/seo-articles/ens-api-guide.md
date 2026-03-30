---
title: "ENS API Guide: Ethereum Name Service Integration (2026)"
meta_description: "How to resolve ENS names, look up reverse records, query text records, and fetch ENS NFT metadata using ethers.js and the ENS subgraph."
keywords: "ENS API, Ethereum Name Service API, ENS resolution, ENS reverse lookup, ethers.js ENS"
---

# ENS API Guide: Ethereum Name Service Integration (2026)

ENS maps human-readable names (vitalik.eth) to Ethereum addresses, IPFS hashes, and arbitrary records. It's the de facto identity layer for Web3.

## Resolve a Name (ethers.js)

```javascript
import { ethers } from 'ethers';

const provider = new ethers.JsonRpcProvider(process.env.ETH_RPC_URL);

// Name → Address
const address = await provider.resolveName('vitalik.eth');
console.log('vitalik.eth →', address);

// Address → Name (reverse lookup)
const name = await provider.lookupAddress('0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045');
console.log(address, '→', name); // vitalik.eth
```

## ENS SDK (Advanced)

```javascript
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
```

## ENS Subgraph

```javascript
const ENS_SUBGRAPH = 'https://api.thegraph.com/subgraphs/name/ensdomains/ens';

// Get all domains for an address
const { account } = await fetch(ENS_SUBGRAPH, {
  method: 'POST', headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ query: `{
    account(id: "0xd8da6bf26964af9d7eed9e03e53415d37aa96045") {
      domains { name labelName }
      registrations { expiryDate domain { name } }
    }
  }` })
}).then(r => r.json()).then(d => d.data);

// Search for names
const { domains } = await fetch(ENS_SUBGRAPH, {
  method: 'POST', headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ query: `{
    domains(where: { name_contains: "vitalik" }, first: 10) {
      name owner { id } resolver { texts }
    }
  }` })
}).then(r => r.json()).then(d => d.data);
```

## Check Name Availability + Registration

```javascript
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
```
