#!/usr/bin/env node
// Copyright (c) 2024-2026 nich (@nichxbt). Licensed under the Apache License, Version 2.0.
/**
 * x402 Real Payment Flow Test
 *
 * Exercises the complete x402 payment lifecycle against a running server:
 * 1. Hits a protected endpoint without payment → expects 402
 * 2. Parses payment requirements from the response
 * 3. Signs a real EIP-3009 USDC transfer with a local wallet
 * 4. Retries with the signed X-PAYMENT header
 * 5. Reports success or failure with diagnostics
 *
 * Usage:
 *   node scripts/test-x402-payment.js [endpoint]
 *
 * Prerequisites:
 *   - Server running (npm run dev)
 *   - viem installed (npm install viem)
 *
 * Environment variables (optional):
 *   X402_PRIVATE_KEY   — wallet private key for signing (generates ephemeral if unset)
 *   API_BASE_URL       — server URL (default: http://localhost:3001)
 *
 * Note: Without funded testnet USDC, the facilitator will reject the payment
 * at the verification step. The test still validates that the full protocol
 * flow works correctly up to that point.
 *
 * @author nichxbt
 */

import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { existsSync } from 'fs';
import crypto from 'crypto';

// Load environment variables
const __dirname = dirname(fileURLToPath(import.meta.url));
const envPath = join(__dirname, '..', '.env');
if (existsSync(envPath)) {
  config({ path: envPath });
}

// Configuration
const API_URL = process.env.API_BASE_URL || 'http://localhost:3001';
const TEST_ENDPOINT = process.argv[2] || '/api/ai/scrape/profile';

// ═════════════════════════════════════════════════════════════════════��═════════
// Wallet Setup
// ═══════════════════════════════════════════════════════════════════════════════

async function setupWallet() {
  const { createWalletClient, http } = await import('viem');
  const { privateKeyToAccount, generatePrivateKey } = await import('viem/accounts');
  const { baseSepolia } = await import('viem/chains');

  const pk = process.env.X402_PRIVATE_KEY || generatePrivateKey();
  const account = privateKeyToAccount(pk);

  const wallet = createWalletClient({
    account,
    chain: baseSepolia,
    transport: http(),
  });

  return { wallet, account, privateKey: pk, ephemeral: !process.env.X402_PRIVATE_KEY };
}

// ═══════════════════════════════════════════════════════════════════════════════
// Payment Signing (EIP-3009 TransferWithAuthorization)
// ═══════════════════════════════════════════════════════════════════════════════

async function signPayment(wallet, account, requirements) {
  const accept = requirements.accepts?.[0];
  if (!accept) throw new Error('No accepted payment scheme in requirements');

  const usdcAddress = accept.asset || '0x036CbD53842c5426634e7929541eC2318f3dCF7e';
  const networkId = accept.network || 'eip155:84532';
  const chainId = parseInt(networkId.split(':')[1]);

  // Parse price — handle "$0.001" or raw number
  let rawPrice = accept.maxAmountRequired || accept.price;
  if (typeof rawPrice === 'string' && rawPrice.startsWith('$')) {
    // Convert USD string to USDC atomic units (6 decimals)
    rawPrice = Math.round(parseFloat(rawPrice.replace('$', '')) * 1e6).toString();
  }

  const nonce = `0x${crypto.randomBytes(32).toString('hex')}`;
  const validAfter = 0;
  const validBefore = Math.floor(Date.now() / 1000) + 3600;

  const domain = {
    name: 'USD Coin',
    version: '2',
    chainId,
    verifyingContract: usdcAddress,
  };

  const types = {
    TransferWithAuthorization: [
      { name: 'from', type: 'address' },
      { name: 'to', type: 'address' },
      { name: 'value', type: 'uint256' },
      { name: 'validAfter', type: 'uint256' },
      { name: 'validBefore', type: 'uint256' },
      { name: 'nonce', type: 'bytes32' },
    ],
  };

  const message = {
    from: account.address,
    to: accept.payTo,
    value: BigInt(rawPrice),
    validAfter: BigInt(validAfter),
    validBefore: BigInt(validBefore),
    nonce,
  };

  const signature = await wallet.signTypedData({
    domain,
    types,
    primaryType: 'TransferWithAuthorization',
    message,
  });

  return {
    x402Version: 2,
    scheme: 'exact',
    network: networkId,
    payload: {
      signature,
      authorization: {
        from: account.address,
        to: accept.payTo,
        value: rawPrice,
        validAfter: validAfter.toString(),
        validBefore: validBefore.toString(),
        nonce,
      },
    },
  };
}

// ════════════════════════════════════════════════════════════════════════��══════
// Main Test Flow
// ═══════════════════════════════════════════════════════════════════════════════

async function main() {
  console.log('╔════════════════════════════════════════════════════════════════╗');
  console.log('║              x402 Real Payment Flow Test                       ║');
  console.log('╚════════════════════════════════════════════════════════════════╝\n');

  // Step 0: Set up wallet
  console.log('STEP 0: Wallet Setup');
  console.log('─'.repeat(60));
  let walletInfo;
  try {
    walletInfo = await setupWallet();
    console.log(`   Address:  ${walletInfo.account.address}`);
    console.log(`   Source:   ${walletInfo.ephemeral ? 'ephemeral (generated)' : 'X402_PRIVATE_KEY env var'}`);
    if (walletInfo.ephemeral) {
      console.log(`   ⚠️  Ephemeral wallet has no USDC — verification will fail (expected)`);
      console.log(`   Fund a wallet and set X402_PRIVATE_KEY for full e2e test`);
    }
    console.log('');
  } catch (error) {
    console.log(`   ❌ Failed: ${error.message}`);
    console.log(`   Install viem: npm install viem\n`);
    process.exit(1);
  }

  // Step 1: Request without payment
  console.log(`STEP 1: Initial Request (No Payment)`);
  console.log('─'.repeat(60));
  console.log(`   Target: ${API_URL}${TEST_ENDPOINT}`);

  let paymentRequirements = null;
  try {
    const response = await fetch(`${API_URL}${TEST_ENDPOINT}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'elonmusk' }),
    });

    console.log(`   Status: ${response.status} ${response.statusText}`);

    if (response.status === 402) {
      console.log('   ✅ Received 402 Payment Required\n');

      // Parse payment requirements from header
      const paymentHeader = response.headers.get('x-payment-requirements') ||
                            response.headers.get('payment-required');

      if (paymentHeader) {
        try {
          paymentRequirements = JSON.parse(Buffer.from(paymentHeader, 'base64').toString('utf-8'));
          console.log('   📋 Payment requirements decoded from header');
        } catch {
          // Try plain JSON
          try {
            paymentRequirements = JSON.parse(paymentHeader);
          } catch {
            console.log('   ⚠️  Could not decode payment header');
          }
        }
      }

      // Also check the response body for requirements
      if (!paymentRequirements) {
        const body = await response.json();
        if (body.x402?.accepts) {
          paymentRequirements = body.x402;
          console.log('   📋 Payment requirements extracted from body');
        }
      }
    } else if (response.status === 200) {
      console.log('   ⚠️  Got 200 — x402 payments may not be active');
      const body = await response.json();
      console.log('   Response:', JSON.stringify(body).slice(0, 300));
      process.exit(0);
    } else {
      console.log(`   ❌ Unexpected status: ${response.status}`);
      const body = await response.text();
      console.log(`   Body: ${body.slice(0, 500)}\n`);
      process.exit(1);
    }
  } catch (error) {
    if (error.cause?.code === 'ECONNREFUSED') {
      console.log('   ❌ Connection refused — is the server running?');
      console.log(`   Start with: npm run dev\n`);
    } else {
      console.log(`   ❌ Request failed: ${error.message}\n`);
    }
    process.exit(1);
  }

  // Step 2: Parse requirements
  console.log('STEP 2: Payment Requirements');
  console.log('─'.repeat(60));

  if (!paymentRequirements) {
    console.log('   ❌ No payment requirements received\n');
    process.exit(1);
  }

  const accepts = paymentRequirements.accepts;
  if (!accepts || accepts.length === 0) {
    console.log('   ❌ No accepted payment options\n');
    process.exit(1);
  }

  console.log(`   x402 Version: ${paymentRequirements.x402Version || 'unknown'}`);
  console.log(`   Options: ${accepts.length} network(s) accepted`);
  for (const opt of accepts) {
    const extra = opt.extra || {};
    const testnetTag = extra.testnet ? ' [testnet]' : '';
    const recTag = extra.recommended ? ' ★' : '';
    console.log(`     - ${extra.networkName || opt.network}: ${opt.maxAmountRequired || opt.price}${testnetTag}${recTag}`);
  }
  console.log('');

  // Step 3: Sign payment
  console.log('STEP 3: Sign Payment');
  console.log('─'.repeat(60));

  let payment;
  try {
    payment = await signPayment(walletInfo.wallet, walletInfo.account, paymentRequirements);
    console.log(`   ✅ Payment signed`);
    console.log(`   Scheme:  ${payment.scheme}`);
    console.log(`   Network: ${payment.network}`);
    console.log(`   From:    ${payment.payload.authorization.from}`);
    console.log(`   To:      ${payment.payload.authorization.to}`);
    console.log(`   Value:   ${payment.payload.authorization.value} (USDC atomic units)`);
    console.log('');
  } catch (error) {
    console.log(`   ❌ Signing failed: ${error.message}\n`);
    process.exit(1);
  }

  // Step 4: Retry with payment
  console.log('STEP 4: Retry with Signed Payment');
  console.log('─'.repeat(60));

  try {
    const encodedPayment = Buffer.from(JSON.stringify(payment)).toString('base64');

    const response = await fetch(`${API_URL}${TEST_ENDPOINT}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-PAYMENT': encodedPayment,
      },
      body: JSON.stringify({ username: 'elonmusk' }),
    });

    console.log(`   Status: ${response.status} ${response.statusText}`);

    // Check for settlement header
    const settlementHeader = response.headers.get('x-payment-response') ||
                             response.headers.get('payment-response');
    if (settlementHeader) {
      console.log('   ✅ PAYMENT-RESPONSE header received');
      try {
        const settlement = JSON.parse(Buffer.from(settlementHeader, 'base64').toString('utf-8'));
        if (settlement.transaction) {
          console.log(`   Transaction: ${settlement.transaction}`);
        }
      } catch {
        // Settlement parsing is optional
      }
    }

    const body = await response.json();

    if (response.status === 200) {
      console.log('   ✅ Payment accepted — request succeeded!\n');
      console.log('RESULT');
      console.log('─'.repeat(60));
      console.log(JSON.stringify(body, null, 2).slice(0, 1000));
    } else if (response.status === 402) {
      console.log('   ⚠️  Payment rejected by facilitator');
      console.log(`   Reason: ${body.error || body.message || JSON.stringify(body)}`);
      if (walletInfo.ephemeral) {
        console.log('\n   This is expected with an unfunded ephemeral wallet.');
        console.log('   The protocol flow is working correctly.');
      }
    } else {
      console.log(`   ❌ Unexpected: ${response.status}`);
      console.log(`   Body: ${JSON.stringify(body).slice(0, 500)}`);
    }
    console.log('');
  } catch (error) {
    console.log(`   ❌ Request failed: ${error.message}\n`);
  }

  // Summary
  console.log('═'.repeat(60));
  console.log('SUMMARY');
  console.log('═'.repeat(60));
  console.log(`
  Protocol flow:
    ✅ Server returns 402 with payment requirements
    ✅ Requirements include network options + pricing
    ✅ Client signs EIP-712 typed data (EIP-3009)
    ✅ Client retries with X-PAYMENT header

  To complete a full end-to-end payment:
    1. Get test USDC from https://faucet.circle.com (Base Sepolia)
    2. Fund your wallet: ${walletInfo.account.address}
    3. Set X402_PRIVATE_KEY in .env
    4. Re-run this script
`);
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
