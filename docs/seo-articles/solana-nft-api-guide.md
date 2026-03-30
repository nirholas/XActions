---
title: "Solana NFT APIs: Magic Eden, Helius, and Metaplex (2026)"
meta_description: "Query Solana NFTs using Magic Eden API, Helius DAS API, and Metaplex. Fetch metadata, floor prices, listings, and collection stats."
keywords: "Solana NFT API, Magic Eden API, Helius DAS API, Metaplex API, Solana NFT data"
---

# Solana NFT APIs: Magic Eden, Helius, and Metaplex (2026)

Solana NFTs use a different standard (Metaplex) than Ethereum. The main data sources are Magic Eden (marketplace), Helius (DAS API), and direct on-chain reads.

## Magic Eden API

```javascript
const ME_BASE = 'https://api-mainnet.magiceden.dev/v2';

// Collection stats
const stats = await fetch(`${ME_BASE}/collections/degods/stats`).then(r => r.json());
console.log('Floor:', stats.floorPrice / 1e9, 'SOL');
console.log('24h Volume:', stats.volumeAll / 1e9, 'SOL');
console.log('Listed count:', stats.listedCount);

// Collection listings
const listings = await fetch(`${ME_BASE}/collections/degods/listings?offset=0&limit=20`).then(r => r.json());
listings.forEach(l => console.log(`#${l.tokenMint.slice(0, 8)}: ${l.price} SOL`));

// Token metadata
const token = await fetch(`${ME_BASE}/tokens/tokenMintAddress`).then(r => r.json());
console.log(token.name, token.image, token.attributes);

// Recent sales
const sales = await fetch(`${ME_BASE}/collections/degods/activities?offset=0&limit=20&type=buyNow`).then(r => r.json());
sales.forEach(s => console.log(`Sold for ${s.price} SOL at ${new Date(s.blockTime * 1000).toLocaleString()}`));
```

## Helius DAS API (Digital Asset Standard)

```javascript
const HELIUS = `https://mainnet.helius-rpc.com/?api-key=${process.env.HELIUS_KEY}`;

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
```

## Metaplex On-Chain

```javascript
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
```

## Solana NFT Rarity

```javascript
async function buildRarityRanks(collectionSlug) {
  const ME_BASE = 'https://api-mainnet.magiceden.dev/v2';
  let all = [], offset = 0;

  while (true) {
    const batch = await fetch(`${ME_BASE}/collections/${collectionSlug}/listings?offset=${offset}&limit=500`).then(r => r.json());
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
```
