---
title: "Lens Protocol API Guide: Decentralized Social Graph (2026)"
meta_description: "How to build on Lens Protocol — fetch profiles, publications, followers, and post content using the Lens API and GraphQL."
keywords: "Lens Protocol API, Lens GraphQL API, decentralized social API, Web3 social API, Lens developer guide"
---

# Lens Protocol API Guide: Decentralized Social Graph (2026)

Lens Protocol is a decentralized social graph on Polygon. Posts, follows, and profiles are NFTs — developers can build social apps without platform lock-in.

## Setup

```javascript
const LENS_API = 'https://api-v2.lens.dev';

async function lensQuery(query, variables = {}) {
  const res = await fetch(LENS_API, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, variables })
  });
  return (await res.json()).data;
}
```

## Fetch a Profile

```javascript
const { profile } = await lensQuery(`
  query GetProfile($handle: HandleInfo!) {
    profile(request: { forHandle: $handle }) {
      id
      handle { fullHandle }
      metadata { displayName bio picture { ... on ImageSet { optimized { uri } } } }
      stats { followers following posts }
    }
  }
`, { handle: { localName: 'stani', namespace: 'lens' } });

console.log(profile.metadata.displayName);
console.log(profile.stats.followers, 'followers');
```

## Get Feed

```javascript
const { publications } = await lensQuery(`
  query GetFeed($profileId: ProfileId!) {
    publications(request: {
      where: { from: [$profileId] }
      orderBy: LATEST
      limit: Ten
    }) {
      items {
        ... on Post {
          id
          createdAt
          metadata { ... on TextOnlyMetadataV3 { content } }
          stats { reactions comments mirrors }
        }
      }
    }
  }
`, { profileId: '0x01' });
```

## Search Profiles

```javascript
const { searchProfiles } = await lensQuery(`
  query Search($query: String!) {
    searchProfiles(request: { query: $query, limit: Ten }) {
      items {
        id
        handle { fullHandle }
        metadata { displayName }
        stats { followers }
      }
    }
  }
`, { query: 'vitalik' });
```

## Post Content (Authenticated)

```javascript
// 1. Get auth challenge
const { challenge } = await lensQuery(`
  mutation Challenge($address: EvmAddress!) {
    challenge(request: { signedBy: $address }) { id text }
  }
`, { address: '0xYourAddress' });

// 2. Sign and authenticate
const signature = await signer.signMessage(challenge.text);
const { authenticate } = await lensQuery(`
  mutation Authenticate($id: ChallengeId!, $signature: Signature!) {
    authenticate(request: { id: $id, signature: $signature }) { accessToken refreshToken }
  }
`, { id: challenge.id, signature });

// 3. Post
const { postOnchain } = await fetch(LENS_API, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${authenticate.accessToken}`
  },
  body: JSON.stringify({ query: `
    mutation Post($request: OnchainPostRequest!) {
      postOnchain(request: $request) { ... on RelaySuccess { txHash } }
    }
  `, variables: {
    request: {
      contentURI: 'ipfs://QmYourMetadataCID'
    }
  }})
}).then(r => r.json()).then(d => d.data);
```
