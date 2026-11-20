#!/usr/bin/env node
// Copyright (c) 2024-2026 nich (@nichxbt). Licensed under the Apache License, Version 2.0.
/**
 * Buy one call from an x402 endpoint, for real.
 *
 * This is the end-to-end proof that a paid API works: it does exactly what an
 * agent does. Request the resource, read the 402 terms, sign a USDC transfer
 * with a wallet, retry with the payment attached, and print the result together
 * with the settlement receipt and the on-chain transaction.
 *
 * Both chains XActions offers are supported:
 *
 *   solana  the exact scheme over @x402/svm: a partially-signed transaction
 *           whose fee payer is the facilitator, so the buyer needs no SOL
 *   base    EIP-3009 transferWithAuthorization signed with viem, so the buyer
 *           needs no ETH either
 *
 * Usage:
 *   node scripts/x402-pay.mjs --url https://xactions.app/api/ai/scrape/profile \
 *     --body '{"username":"nasa"}' --chain solana
 *
 *   --url <url>          Endpoint to buy from
 *   --body <json>        POST body (omit for a GET)
 *   --chain <name>       solana (default) or base
 *   --rpc <url>          Solana RPC, default https://api.mainnet-beta.solana.com
 *   --yes                Spend without the confirmation prompt
 *   --dry-run            Print the terms and the payer balance, pay nothing
 *
 * The key comes from X402_BUYER_SOLANA_SECRET (base58, 64 bytes) or
 * X402_BUYER_EVM_PRIVATE_KEY (0x hex). Both can be loaded straight from Google
 * Secret Manager:
 *
 *   export X402_BUYER_SOLANA_SECRET=$(gcloud secrets versions access latest \
 *     --secret=X402_BUYER_SOLANA_SECRET)
 *
 * Requires @x402/svm and @solana/kit for the Solana lane and viem for Base. If
 * they are not in this repo's node_modules, point NODE_PATH at a tree that has
 * them.
 *
 * by nichxbt
 */

import { createRequire } from 'node:module';
import path from 'node:path';
import readline from 'node:readline/promises';

const argv = process.argv.slice(2);
const flag = (name, fallback = null) => {
  const i = argv.indexOf(`--${name}`);
  return i === -1 ? fallback : argv[i + 1];
};
const has = (name) => argv.includes(`--${name}`);

const URL_ARG = flag('url', 'https://xactions.app/api/ai/scrape/profile');
const BODY = flag('body', null);
const CHAIN = flag('chain', 'solana');
const RPC = flag('rpc', 'https://api.mainnet-beta.solana.com');
const DRY_RUN = has('dry-run');

/** Resolve a package from this repo or from NODE_PATH, with a useful failure. */
async function load(specifier) {
  try {
    return await import(specifier);
  } catch (error) {
    const require = createRequire(import.meta.url);
    for (const dir of (process.env.NODE_PATH || '').split(path.delimiter).filter(Boolean)) {
      try {
        return await import(require.resolve(specifier, { paths: [dir] }));
      } catch {
        // try the next NODE_PATH entry
      }
    }
    throw new Error(
      `${specifier} is not installed. Run \`npm i ${specifier}\` or set NODE_PATH to a tree that has it. (${error.message})`,
      { cause: error },
    );
  }
}

function base64Json(value) {
  return Buffer.from(JSON.stringify(value)).toString('base64');
}

/** Ask the endpoint for its terms. */
async function fetchTerms() {
  const init = { headers: { accept: 'application/json' } };
  if (BODY) {
    init.method = 'POST';
    init.headers['content-type'] = 'application/json';
    init.body = BODY;
  }
  const response = await fetch(URL_ARG, init);
  if (response.status !== 402) {
    const text = await response.text();
    throw new Error(
      `expected 402, got ${response.status}. The endpoint may be free, or the payment gate is off.\n${text.slice(0, 400)}`,
    );
  }
  return { challenge: await response.json(), init };
}

/** The accepts entry for the requested chain. */
function pickRequirements(challenge, chain) {
  const wanted = chain === 'base' ? ['base', 'eip155:8453'] : ['solana', 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp'];
  const match = (challenge.accepts || []).find((entry) => wanted.includes(entry.network));
  if (!match) {
    const offered = (challenge.accepts || []).map((entry) => entry.network).join(', ');
    throw new Error(`this endpoint does not accept ${chain}. It offers: ${offered || 'nothing'}`);
  }
  return match;
}

/**
 * How much of the payment asset the buyer holds, so an empty wallet fails with
 * a sentence instead of an RPC error from three layers down.
 *
 * @param {string} owner - Buyer address.
 * @param {string} mint - SPL mint from the payment requirements.
 * @returns {Promise<{ amount: bigint, accounts: number }>}
 */
async function solanaTokenBalance(owner, mint) {
  const response = await fetch(RPC, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method: 'getTokenAccountsByOwner',
      params: [owner, { mint }, { encoding: 'jsonParsed' }],
    }),
  });
  const body = await response.json();
  const accounts = body?.result?.value ?? [];
  const amount = accounts.reduce(
    (total, account) => total + BigInt(account.account.data.parsed.info.tokenAmount.amount),
    0n,
  );
  return { amount, accounts: accounts.length };
}

/** Sign the Solana exact-scheme payload with the official SVM client. */
async function paySolana(requirements) {
  const secret = process.env.X402_BUYER_SOLANA_SECRET;
  if (!secret) throw new Error('X402_BUYER_SOLANA_SECRET is not set');

  const [{ createKeyPairSignerFromBytes }, { base58 }, { ExactSvmSchemeV1 }] = await Promise.all([
    load('@solana/kit'),
    load('@scure/base'),
    load('@x402/svm/v1'),
  ]);

  const bytes = base58.decode(secret.trim());
  if (bytes.length !== 64) throw new Error(`expected a 64-byte Solana secret, got ${bytes.length}`);
  const signer = await createKeyPairSignerFromBytes(bytes);

  const needed = BigInt(requirements.maxAmountRequired ?? requirements.amount);
  const { amount, accounts } = await solanaTokenBalance(signer.address, requirements.asset);
  if (accounts === 0) {
    throw new Error(
      `${signer.address} holds no ${requirements.asset}. Send at least ` +
        `${(Number(needed) / 1_000_000).toFixed(6)} USDC to that address on Solana mainnet.`,
    );
  }
  if (amount < needed) {
    throw new Error(
      `${signer.address} holds ${(Number(amount) / 1_000_000).toFixed(6)} USDC, ` +
        `this call costs ${(Number(needed) / 1_000_000).toFixed(6)}.`,
    );
  }
  console.log(`balance   ${(Number(amount) / 1_000_000).toFixed(6)} USDC`);

  const scheme = new ExactSvmSchemeV1(signer, { rpcUrl: RPC });
  const payload = await scheme.createPaymentPayload(1, requirements);
  return { payer: signer.address, payload };
}

/** Sign an EIP-3009 transferWithAuthorization for the Base lane. */
async function payBase(requirements) {
  const key = process.env.X402_BUYER_EVM_PRIVATE_KEY;
  if (!key) throw new Error('X402_BUYER_EVM_PRIVATE_KEY is not set');

  const { privateKeyToAccount } = await load('viem/accounts');
  const { toHex } = await load('viem');
  const account = privateKeyToAccount(key.trim());

  const now = Math.floor(Date.now() / 1000);
  const authorization = {
    from: account.address,
    to: requirements.payTo,
    value: BigInt(requirements.maxAmountRequired ?? requirements.amount),
    validAfter: BigInt(now - 60),
    validBefore: BigInt(now + Number(requirements.maxTimeoutSeconds || 300)),
    nonce: toHex(crypto.getRandomValues(new Uint8Array(32))),
  };

  const signature = await account.signTypedData({
    domain: {
      name: requirements.extra?.name || 'USD Coin',
      version: requirements.extra?.version || '2',
      chainId: 8453,
      verifyingContract: requirements.asset,
    },
    types: {
      TransferWithAuthorization: [
        { name: 'from', type: 'address' },
        { name: 'to', type: 'address' },
        { name: 'value', type: 'uint256' },
        { name: 'validAfter', type: 'uint256' },
        { name: 'validBefore', type: 'uint256' },
        { name: 'nonce', type: 'bytes32' },
      ],
    },
    primaryType: 'TransferWithAuthorization',
    message: authorization,
  });

  return {
    payer: account.address,
    payload: {
      x402Version: 1,
      scheme: 'exact',
      network: requirements.network,
      payload: {
        signature,
        authorization: {
          ...authorization,
          value: authorization.value.toString(),
          validAfter: authorization.validAfter.toString(),
          validBefore: authorization.validBefore.toString(),
        },
      },
    },
  };
}

async function confirm(question) {
  if (has('yes')) return true;
  if (!process.stdin.isTTY) {
    throw new Error('refusing to spend without --yes when there is no terminal to confirm at');
  }
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const answer = (await rl.question(`${question} [y/N] `)).trim().toLowerCase();
  rl.close();
  return answer === 'y' || answer === 'yes';
}

// ---------------------------------------------------------------------- main

const { challenge, init } = await fetchTerms();
const requirements = pickRequirements(challenge, CHAIN);
const amount = requirements.maxAmountRequired ?? requirements.amount;
const usd = (Number(amount) / 1_000_000).toFixed(6);

console.log(`\n402 from ${URL_ARG}`);
console.log(`  chain     ${requirements.network}`);
console.log(`  amount    ${amount} (${usd} USDC)`);
console.log(`  asset     ${requirements.asset}`);
console.log(`  payTo     ${requirements.payTo}`);
if (requirements.extra?.feePayer) console.log(`  feePayer  ${requirements.extra.feePayer}`);
console.log('');

if (DRY_RUN) {
  console.log('--dry-run: nothing was signed or spent.');
  process.exit(0);
}

if (!(await confirm(`Pay ${usd} USDC on ${requirements.network} to ${requirements.payTo}?`))) {
  console.log('cancelled, nothing was spent.');
  process.exit(1);
}

const { payer, payload } = CHAIN === 'base' ? await payBase(requirements) : await paySolana(requirements);
console.log(`signed by ${payer}`);

const paid = await fetch(URL_ARG, {
  ...init,
  headers: { ...init.headers, 'X-PAYMENT': base64Json(payload) },
});

const receiptHeader = paid.headers.get('x-payment-response');
const receipt = receiptHeader ? JSON.parse(Buffer.from(receiptHeader, 'base64').toString()) : null;
const text = await paid.text();

console.log(`\nHTTP ${paid.status}`);
if (receipt) {
  console.log('receipt:');
  console.log(`  success      ${receipt.success}`);
  console.log(`  network      ${receipt.network ?? '-'}`);
  console.log(`  transaction  ${receipt.transaction ?? '-'}`);
  console.log(`  payer        ${receipt.payer ?? '-'}`);
  if (receipt.transaction && String(receipt.network).startsWith('solana')) {
    console.log(`  explorer     https://solscan.io/tx/${receipt.transaction}`);
  } else if (receipt.transaction) {
    console.log(`  explorer     https://basescan.org/tx/${receipt.transaction}`);
  }
}
console.log('\nresponse:');
console.log(text.slice(0, 1500));
process.exit(paid.ok ? 0 : 1);
