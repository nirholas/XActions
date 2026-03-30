---
title: "Web3 Authentication APIs: Sign-In with Ethereum (SIWE) (2026)"
meta_description: "How to implement Web3 wallet authentication using Sign-In with Ethereum (SIWE), Privy, Dynamic, and Magic Link. Secure, passwordless crypto login."
keywords: "Web3 auth API, Sign-In with Ethereum API, SIWE, Privy API, crypto wallet login"
---

# Web3 Authentication APIs: Sign-In with Ethereum (SIWE) (2026)

Web3 authentication lets users sign in with their crypto wallet — no passwords, no email, cryptographically verified identity.

## SIWE (Sign-In with Ethereum) — Manual Implementation

```javascript
import { SiweMessage } from 'siwe';

// 1. Generate nonce (server-side)
app.get('/nonce', (req, res) => {
  req.session.nonce = Math.random().toString(36).slice(2);
  res.json({ nonce: req.session.nonce });
});

// 2. Create message (client-side)
const message = new SiweMessage({
  domain: window.location.host,
  address: userAddress,
  statement: 'Sign in to MyApp',
  uri: window.location.origin,
  version: '1',
  chainId: 1,
  nonce: await fetchNonce()
});

const signature = await signer.signMessage(message.prepareMessage());

// 3. Verify (server-side)
app.post('/verify', async (req, res) => {
  const { message, signature } = req.body;
  const siwe = new SiweMessage(message);

  try {
    const { data } = await siwe.verify({
      signature,
      nonce: req.session.nonce
    });

    req.session.address = data.address;
    req.session.chainId = data.chainId;
    res.json({ ok: true, address: data.address });
  } catch {
    res.status(422).json({ ok: false });
  }
});
```

## Privy (Managed Web3 Auth)

```javascript
// React
import { PrivyProvider, usePrivy } from '@privy-io/react-auth';

function App() {
  return (
    <PrivyProvider appId={process.env.PRIVY_APP_ID} config={{
      loginMethods: ['wallet', 'email', 'google'],
      embeddedWallets: { createOnLogin: 'all-users' }
    }}>
      <MyApp />
    </PrivyProvider>
  );
}

function LoginButton() {
  const { login, logout, user, authenticated } = usePrivy();
  return authenticated
    ? <button onClick={logout}>{user.wallet?.address}</button>
    : <button onClick={login}>Connect</button>;
}
```

## Dynamic (Multi-Wallet Auth)

```javascript
import { DynamicContextProvider, DynamicWidget } from '@dynamic-labs/sdk-react-core';

function App() {
  return (
    <DynamicContextProvider settings={{ environmentId: process.env.DYNAMIC_ENV_ID }}>
      <DynamicWidget />
    </DynamicContextProvider>
  );
}
```

## Magic Link (Email → Wallet)

```javascript
import { Magic } from 'magic-sdk';

const magic = new Magic(process.env.MAGIC_API_KEY);

// Login with email — creates a wallet automatically
await magic.auth.loginWithEmailOTP({ email: 'user@example.com' });
const provider = new ethers.BrowserProvider(magic.rpcProvider);
const signer = await provider.getSigner();
```

## JWT from SIWE Session

```javascript
import jwt from 'jsonwebtoken';

// After SIWE verification
app.post('/verify', async (req, res) => {
  // ... verify SIWE ...
  const token = jwt.sign(
    { address: data.address, chainId: data.chainId },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );
  res.json({ token });
});

// Protect routes
function requireAuth(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Unauthorized' });
  req.user = jwt.verify(token, process.env.JWT_SECRET);
  next();
}
```
