---
title: "IPFS APIs for Web3: Upload, Pin, and Fetch Decentralized Content (2026)"
meta_description: "How to use IPFS APIs — Pinata, Web3.Storage, Infura IPFS — for uploading NFT metadata, images, and files to decentralized storage."
keywords: "IPFS API, Pinata API, Web3.Storage API, NFT metadata IPFS, decentralized storage API"
---

# IPFS APIs for Web3: Upload, Pin, and Fetch Decentralized Content (2026)

IPFS is used for NFT metadata, images, and any content that needs to be referenced on-chain without centralization. Pinning services ensure your content stays accessible.

## Pinata (Most Popular)

```javascript
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
    'Authorization': `Bearer ${process.env.PINATA_JWT}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({ pinataContent: metadata, pinataMetadata: { name: 'nft-1.json' } })
});
const { IpfsHash } = await res.json();
console.log('IPFS URI:', `ipfs://${IpfsHash}`);

// Upload a file
const formData = new FormData();
formData.append('file', fileBlob, 'image.png');
formData.append('pinataMetadata', JSON.stringify({ name: 'nft-image.png' }));

const imgRes = await fetch('https://api.pinata.cloud/pinning/pinFileToIPFS', {
  method: 'POST',
  headers: { 'Authorization': `Bearer ${process.env.PINATA_JWT}` },
  body: formData
});
const { IpfsHash: imageHash } = await imgRes.json();
```

## Pinata SDK

```javascript
import { PinataSDK } from 'pinata';

const pinata = new PinataSDK({ pinataJwt: process.env.PINATA_JWT });

// Upload file
const upload = await pinata.upload.file(file);
console.log('CID:', upload.IpfsHash);

// Upload JSON
const json = await pinata.upload.json({ name: 'test', value: 123 });

// List pinned files
const pins = await pinata.listFiles().pageLimit(10);
```

## Web3.Storage (Filecoin + IPFS)

```javascript
import { create } from '@web3-storage/w3up-client';

const client = await create();
await client.login('your@email.com');
await client.setCurrentSpace(process.env.W3_SPACE_DID);

// Upload files
const cid = await client.uploadFile(file);
console.log('IPFS CID:', cid.toString());
```

## Resolve IPFS Content

```javascript
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
  throw new Error(`Failed to fetch ${cid} from all gateways`);
}

// Convert IPFS URI to HTTPS
function ipfsToHttps(uri, gateway = 'https://ipfs.io/ipfs/') {
  if (uri?.startsWith('ipfs://')) return uri.replace('ipfs://', gateway);
  if (uri?.startsWith('Qm') || uri?.startsWith('bafy')) return gateway + uri;
  return uri;
}
```
