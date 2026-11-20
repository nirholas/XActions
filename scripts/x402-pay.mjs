#!/usr/bin/env node
// Copyright (c) 2024-2026 nich (@nichxbt). Licensed under the Apache License, Version 2.0.
/**
 * Buy one call from any x402 endpoint, for real, on any chain and asset it offers.
 *
 * This is the end-to-end proof that a paid API works: it does exactly what an
 * agent does. Request the resource, read the 402 terms, sign a payment with a
 * wallet, retry with the payment attached, and print the result together with
 * the settlement receipt and the on-chain transaction.
 *
 * Signing goes through the official x402 clients, so every scheme they support
 * works here without a hand-rolled copy:
 *
 *   Solana  @x402/svm exact: a partially-signed SPL transfer (USDC, or any SPL
 *           token the endpoint names) whose fee payer is the facilitator
 *   EVM     @x402/evm exact on any eip155 chain: EIP-3009 for USDC-style tokens,
 *           Permit2 for tokens without it (Sperax USDs), including the
 *           facilitator-sponsored approval when the terms offer it
 *
 * Usage:
 *   node scripts/x402-pay.mjs --url <url> [--body '<json>'] --network <net> [--asset <asset>]
 *
 *   --url <url>          Endpoint to buy from
 *   --body <json>        POST body (omit for a GET)
 *   --network <net>      solana, base, arbitrum, xlayer, or a CAIP-2 id (eip155:42161).
 *                        --chain is accepted as an alias.
 *   --asset <asset>      Token address/mint, or a symbol the terms name (USDC, USDs, THREE).
 *                        Omit to take the first option on the network.
 *   --max <amount>       Refuse to pay more than this many tokens (default 0.10). A safety
 *                        net: the server, not this script, chooses the price.
 *   --list               Print every option the endpoint offers, then stop
 *   --dry-run            Print the chosen terms and the payer balance, pay nothing
 *   --yes                Spend without the confirmation prompt
 *
 * Keys come from X402_BUYER_SOLANA_SECRET (base58, 64 bytes) and
 * X402_BUYER_EVM_PRIVATE_KEY (0x hex; one key pays on every EVM chain). Load
 * them from Secret Manager without printing them:
 *
 *   export X402_BUYER_EVM_PRIVATE_KEY=$(gcloud secrets versions access latest \
 *     --secret=X402_BUYER_EVM_PRIVATE_KEY)
 *
 * The Solana lane needs @x402/svm and @solana/kit. If they are not in this
 * repo's node_modules, point NODE_PATH at a tree that has them.
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
const NETWORK_ARG = flag('network', flag('chain', 'solana'));
const ASSET_ARG = flag('asset', null);
const MAX = Number(flag('max', '0.10'));
const SOLANA_RPC = flag('rpc', 'https://api.mainnet-beta.solana.com');

const SOLANA = 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp';
const NETWORK_ALIASES = {
  solana: SOLANA,
  base: 'eip155:8453',
  arbitrum: 'eip155:42161',
  xlayer: 'eip155:196',
  ethereum: 'eip155:1',
  polygon: 'eip155:137',
  optimism: 'eip155:10',
  bsc: 'eip155:56',
};
/** Public RPCs for the chains we read balances on. Anything else needs --evm-rpc. */
const EVM_RPC = {
  1: 'https://ethereum-rpc.publicnode.com',
  10: 'https://mainnet.optimism.io',
  56: 'https://bsc-dataseed.bnbchain.org',
  137: 'https://polygon-rpc.com',
  196: 'https://rpc.xlayer.tech',
  8453: 'https://mainnet.base.org',
  42161: 'https://arb1.arbitrum.io/rpc',
};
const EXPLORER = {
  [SOLANA]: 'https://solscan.io/tx/',
  'eip155:1': 'https://etherscan.io/tx/',
  'eip155:10': 'https://optimistic.etherscan.io/tx/',
  'eip155:56': 'https://bscscan.com/tx/',
  'eip155:137': 'https://polygonscan.com/tx/',
  'eip155:196': 'https://www.okx.com/web3/explorer/xlayer/tx/',
  'eip155:8453': 'https://basescan.org/tx/',
  'eip155:42161': 'https://arbiscan.io/tx/',
};
/** v1 terms name networks by slug; v2 by CAIP-2. Compare in CAIP-2. */
const V1_NETWORKS = { solana: SOLANA, base: 'eip155:8453', arbitrum: 'eip155:42161', 'x-layer': 'eip155:196' };
const caip = (network) => NETWORK_ALIASES[network] || V1_NETWORKS[network] || network;

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

const requestInit = () => {
  const init = { headers: { accept: 'application/json' } };
  if (BODY) {
    init.method = 'POST';
    init.headers['content-type'] = 'application/json';
    init.body = BODY;
  }
  return init;
};

const amountOf = (req) => BigInt(req.amount ?? req.maxAmountRequired);
/** Well-known SPL mints, since Solana terms often carry only a display name. */
const KNOWN_MINTS = { EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v: 'USDC', Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB: 'USDT' };
const symbols = new Map();
/**
 * The token's ticker: from the terms when they carry one, else the ERC-20
 * contract or a known mint. Terms often name a token "USD Coin" or not at all
 * (Permit2 terms for USDs carry only the transfer method), so `--asset USDC`
 * has to match the contract's own symbol.
 */
async function symbolOf(req) {
  if (req.extra?.symbol) return req.extra.symbol;
  if (!symbols.has(req.asset)) {
    let symbol = KNOWN_MINTS[req.asset] || null;
    if (!symbol && caip(req.network) !== SOLANA) {
      try {
        const { erc20Abi } = await load('viem');
        const client = await evmPublicClient(caip(req.network));
        symbol = await client.readContract({ address: req.asset, abi: erc20Abi, functionName: 'symbol' });
      } catch {
        // fall through to the display name
      }
    }
    symbols.set(req.asset, symbol || req.extra?.name || req.asset);
  }
  return symbols.get(req.asset);
}
/** Decimals from the terms, else from the chain. */
async function decimalsOf(req) {
  if (Number.isInteger(req.extra?.decimals)) return req.extra.decimals;
  const network = caip(req.network);
  if (network === SOLANA) {
    const info = await solanaRpc('getAccountInfo', [req.asset, { encoding: 'jsonParsed' }]);
    return info?.value?.data?.parsed?.info?.decimals ?? 6;
  }
  const client = await evmPublicClient(network);
  const { erc20Abi } = await load('viem');
  return Number(await client.readContract({ address: req.asset, abi: erc20Abi, functionName: 'decimals' }));
}
const human = (raw, decimals) => {
  const s = raw.toString().padStart(decimals + 1, '0');
  const whole = s.slice(0, s.length - decimals);
  const frac = s.slice(s.length - decimals).replace(/0+$/, '');
  return frac ? `${whole}.${frac}` : whole;
};

async function solanaRpc(method, params) {
  const response = await fetch(SOLANA_RPC, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }),
  });
  return (await response.json()).result;
}

const evmClients = new Map();
async function evmPublicClient(network) {
  const chainId = Number(network.split(':')[1]);
  if (!evmClients.has(chainId)) {
    const rpc = flag('evm-rpc', EVM_RPC[chainId]);
    if (!rpc) throw new Error(`no RPC known for ${network}; pass --evm-rpc <url>`);
    const { createPublicClient, http } = await load('viem');
    evmClients.set(chainId, createPublicClient({ transport: http(rpc) }));
  }
  return evmClients.get(chainId);
}

/** The buyer's balance of the payment asset, so an empty wallet fails with a sentence. */
async function balanceOf(req, payer) {
  const network = caip(req.network);
  if (network === SOLANA) {
    const result = await solanaRpc('getTokenAccountsByOwner', [payer, { mint: req.asset }, { encoding: 'jsonParsed' }]);
    return (result?.value ?? []).reduce((t, a) => t + BigInt(a.account.data.parsed.info.tokenAmount.amount), 0n);
  }
  const client = await evmPublicClient(network);
  const { erc20Abi } = await load('viem');
  return client.readContract({ address: req.asset, abi: erc20Abi, functionName: 'balanceOf', args: [payer] });
}

async function solanaSigner() {
  const secret = process.env.X402_BUYER_SOLANA_SECRET;
  if (!secret) return null;
  const [{ createKeyPairSignerFromBytes }, { base58 }] = await Promise.all([load('@solana/kit'), load('@scure/base')]);
  const bytes = base58.decode(secret.trim());
  if (bytes.length !== 64) throw new Error(`expected a 64-byte Solana secret, got ${bytes.length}`);
  return createKeyPairSignerFromBytes(bytes);
}

async function evmAccount() {
  const key = process.env.X402_BUYER_EVM_PRIVATE_KEY;
  if (!key) return null;
  const { privateKeyToAccount } = await load('viem/accounts');
  return privateKeyToAccount(key.trim());
}

async function confirm(question) {
  if (has('yes')) return true;
  if (!process.stdin.isTTY) throw new Error('refusing to spend without --yes when there is no terminal to confirm at');
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const answer = (await rl.question(`${question} [y/N] `)).trim().toLowerCase();
  rl.close();
  return answer === 'y' || answer === 'yes';
}

// ---------------------------------------------------------------------- main

const { x402Client, x402HTTPClient } = await load('@x402/core/client');

const first = await fetch(URL_ARG, requestInit());
if (first.status !== 402) {
  const text = await first.text();
  console.error(`expected 402, got ${first.status}. The endpoint may be free, or its payment gate is off.\n${text.slice(0, 400)}`);
  process.exit(1);
}
let firstBody;
try {
  firstBody = await first.json();
} catch {
  firstBody = undefined;
}
const probe = new x402HTTPClient(new x402Client());
const paymentRequired = probe.getPaymentRequiredResponse((name) => first.headers.get(name), firstBody);
const accepts = paymentRequired.accepts || [];

console.log(`\n402 from ${URL_ARG} (x402 v${paymentRequired.x402Version})`);
for (const [i, req] of accepts.entries()) {
  const decimals = await decimalsOf(req).catch(() => null);
  const price = decimals === null ? amountOf(req).toString() : human(amountOf(req), decimals);
  console.log(
    `  [${i}] ${caip(req.network).padEnd(42)} ${price.padStart(10)} ${(await symbolOf(req)).padEnd(10)} ` +
      `${req.extra?.assetTransferMethod || req.extra?.transferMethod || ''}`,
  );
}
if (has('list')) process.exit(0);

const network = caip(NETWORK_ARG);
const assetWanted = ASSET_ARG?.toLowerCase();
let chosen = null;
for (const req of accepts) {
  if (caip(req.network) !== network) continue;
  if (!assetWanted || req.asset.toLowerCase() === assetWanted || (await symbolOf(req)).toLowerCase() === assetWanted) {
    chosen = req;
    break;
  }
}
if (!chosen) {
  console.error(`\nthis endpoint offers no ${ASSET_ARG ? `${ASSET_ARG} ` : ''}option on ${network}.`);
  process.exit(1);
}

const decimals = await decimalsOf(chosen);
const price = human(amountOf(chosen), decimals);
const symbol = await symbolOf(chosen);
console.log(`\nchosen    ${network} ${price} ${symbol}`);
console.log(`  asset   ${chosen.asset}`);
console.log(`  payTo   ${chosen.payTo}`);
if (chosen.extra?.feePayer) console.log(`  feePayer ${chosen.extra.feePayer}`);
if (Number(price) > MAX) {
  console.error(`\n${price} ${symbol} is above --max ${MAX}. Raise --max if you mean it.`);
  process.exit(1);
}

const isSolana = network === SOLANA;
const signer = isSolana ? await solanaSigner() : await evmAccount();
if (!signer) {
  console.error(`\nset ${isSolana ? 'X402_BUYER_SOLANA_SECRET' : 'X402_BUYER_EVM_PRIVATE_KEY'} to pay on ${network}.`);
  process.exit(1);
}
const balance = await balanceOf(chosen, signer.address);
console.log(`  payer   ${signer.address} holds ${human(balance, decimals)} ${symbol}`);
if (balance < amountOf(chosen)) {
  console.error(`\nnot enough ${symbol}: send at least ${price} to ${signer.address} on ${network}.`);
  process.exit(1);
}

if (has('dry-run')) {
  console.log('\n--dry-run: nothing was signed or spent.');
  process.exit(0);
}
if (!(await confirm(`Pay ${price} ${symbol} on ${network} to ${chosen.payTo}?`))) {
  console.log('cancelled, nothing was spent.');
  process.exit(1);
}

// The selector always returns the option chosen above; spend limits are the
// --max check, so the client's default-asset allowlist (which would refuse
// THREE or USDs) is turned off.
const client = x402Client.fromConfig({
  schemes: [],
  spendControls: false,
  paymentRequirementsSelector: () => chosen,
});
if (isSolana) {
  const { registerExactSvmScheme } = await load('@x402/svm/exact/client');
  registerExactSvmScheme(client, { signer, networks: [SOLANA] });
} else {
  const { registerExactEvmScheme } = await load('@x402/evm/exact/client');
  const { toClientEvmSigner } = await load('@x402/evm');
  const publicClient = await evmPublicClient(network);
  const chainId = Number(network.split(':')[1]);
  registerExactEvmScheme(client, {
    signer: toClientEvmSigner(signer, publicClient),
    schemeOptions: { [chainId]: { rpcUrl: flag('evm-rpc', EVM_RPC[chainId]) } },
  });
}
const http = new x402HTTPClient(client);
const payload = await client.createPaymentPayload(paymentRequired);
const init = requestInit();
const paid = await fetch(URL_ARG, { ...init, headers: { ...init.headers, ...http.encodePaymentSignatureHeader(payload) } });

let receipt = null;
try {
  receipt = http.getPaymentSettleResponse((name) => paid.headers.get(name));
} catch {
  // no settlement header: the server refused before settling
}
const text = await paid.text();

console.log(`\nHTTP ${paid.status}`);
if (receipt) {
  console.log('receipt:');
  console.log(`  success      ${receipt.success}`);
  console.log(`  network      ${receipt.network ?? '-'}`);
  console.log(`  transaction  ${receipt.transaction ?? '-'}`);
  console.log(`  payer        ${receipt.payer ?? '-'}`);
  if (receipt.transaction) console.log(`  explorer     ${EXPLORER[caip(receipt.network)] ?? ''}${receipt.transaction}`);
  if (receipt.errorReason) console.log(`  error        ${receipt.errorReason}`);
}
console.log('\nresponse:');
console.log(text.slice(0, 1500));
process.exit(paid.ok ? 0 : 1);
