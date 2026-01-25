#!/usr/bin/env node
/**
 * x402 Payment Flow Test Script
 * 
 * Simulates the complete x402 payment flow:
 * 1. Request protected endpoint (get 402)
 * 2. Parse payment requirements
 * 3. Sign mock payment
 * 4. Retry with payment
 * 5. Verify success
 * 
 * Usage:
 *   node scripts/test-x402-payment.js [endpoint]
 *   
 * Examples:
 *   node scripts/test-x402-payment.js
 *   node scripts/test-x402-payment.js /api/ai/scrape/followers
 * 
 * @author nichxbt
 */

import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { existsSync } from 'fs';

// Load environment variables
const __dirname = dirname(fileURLToPath(import.meta.url));
const envPath = join(__dirname, '..', '.env');
if (existsSync(envPath)) {
  config({ path: envPath });
}

// Configuration
const API_URL = process.env.API_BASE_URL || 'http://localhost:3001';
const TEST_ENDPOINT = process.argv[2] || '/api/ai/scrape/profile';

console.log('╔════════════════════════════════════════════════════════════════╗');
console.log('║              x402 Payment Flow Test                            ║');
console.log('╚════════════════════════════════════════════════════════════════╝\n');

console.log(`🎯 Target: ${API_URL}${TEST_ENDPOINT}\n`);

// ═══════════════════════════════════════════════════════════════════════════════
// Step 1: Make initial request (expect 402)
// ═══════════════════════════════════════════════════════════════════════════════

console.log('STEP 1: Initial Request (No Payment)');
console.log('─'.repeat(60));

let paymentRequirements = null;

try {
  const response = await fetch(`${API_URL}${TEST_ENDPOINT}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'User-Agent': 'XActions-Test/1.0',
    },
    body: JSON.stringify({ username: 'test_user' }),
  });
  
  console.log(`   Status: ${response.status} ${response.statusText}`);
  
  if (response.status === 402) {
    console.log('   ✅ Received expected 402 Payment Required\n');
    
    // Check for PAYMENT-REQUIRED header
    const paymentHeader = response.headers.get('payment-required');
    if (paymentHeader) {
      console.log('   📋 PAYMENT-REQUIRED header found');
      try {
        paymentRequirements = JSON.parse(Buffer.from(paymentHeader, 'base64').toString('utf-8'));
        console.log('   ✅ Successfully decoded payment requirements\n');
      } catch (e) {
        console.log(`   ❌ Failed to decode header: ${e.message}\n`);
      }
    } else {
      console.log('   ⚠️  No PAYMENT-REQUIRED header found');
      // Try to get requirements from body
      const body = await response.json();
      console.log('   📋 Response body:', JSON.stringify(body, null, 2).slice(0, 500));
      paymentRequirements = {
        accepts: [{
          price: body.price,
          network: body.network,
          payTo: body.payTo,
        }],
      };
    }
  } else if (response.status === 200) {
    console.log('   ⚠️  Endpoint returned 200 - payment may be disabled');
    const body = await response.json();
    console.log('   Response:', JSON.stringify(body, null, 2).slice(0, 300));
    console.log('\n   Check if X402_SKIP_VERIFICATION is set\n');
    process.exit(0);
  } else {
    console.log(`   ❌ Unexpected status code: ${response.status}`);
    const body = await response.text();
    console.log(`   Body: ${body.slice(0, 500)}\n`);
    process.exit(1);
  }
} catch (error) {
  if (error.cause?.code === 'ECONNREFUSED') {
    console.log('   ❌ Connection refused - is the server running?');
    console.log(`   Start the server with: npm run dev\n`);
  } else {
    console.log(`   ❌ Request failed: ${error.message}\n`);
  }
  process.exit(1);
}

// ═══════════════════════════════════════════════════════════════════════════════
// Step 2: Parse Payment Requirements
// ═══════════════════════════════════════════════════════════════════════════════

console.log('STEP 2: Payment Requirements');
console.log('─'.repeat(60));

if (!paymentRequirements) {
  console.log('   ❌ No payment requirements available\n');
  process.exit(1);
}

console.log(`   x402 Version: ${paymentRequirements.x402Version || 'unknown'}`);

const accepts = paymentRequirements.accepts?.[0];
if (accepts) {
  console.log(`   Scheme: ${accepts.scheme}`);
  console.log(`   Price: ${accepts.price || accepts.maxAmountRequired}`);
  console.log(`   Network: ${accepts.network}`);
  console.log(`   Pay To: ${accepts.payTo}`);
  console.log(`   Description: ${paymentRequirements.description || 'N/A'}`);
} else {
  console.log('   ⚠️  No accepted payment schemes found');
}

console.log('');

// ═══════════════════════════════════════════════════════════════════════════════
// Step 3: Create Mock Payment
// ═══════════════════════════════════════════════════════════════════════════════

console.log('STEP 3: Create Mock Payment');
console.log('─'.repeat(60));

const mockPayment = {
  x402Version: 2,
  scheme: accepts?.scheme || 'exact',
  network: accepts?.network || 'eip155:84532',
  payload: {
    signature: '0x' + 'a'.repeat(130), // Mock signature
    from: '0x' + '1'.repeat(40), // Mock payer address
    to: accepts?.payTo || '0x' + '2'.repeat(40),
    value: '1000000', // 1 USDC (6 decimals)
    validAfter: 0,
    validBefore: Math.floor(Date.now() / 1000) + 3600, // 1 hour
    nonce: '0x' + Math.random().toString(16).slice(2).padEnd(64, '0'),
  },
};

const encodedPayment = Buffer.from(JSON.stringify(mockPayment)).toString('base64');

console.log('   Created mock payment payload');
console.log(`   Payer: ${mockPayment.payload.from.slice(0, 10)}...`);
console.log(`   Recipient: ${mockPayment.payload.to.slice(0, 10)}...`);
console.log(`   Amount: ${mockPayment.payload.value} (raw)`);
console.log(`   Valid until: ${new Date(mockPayment.payload.validBefore * 1000).toISOString()}`);
console.log(`   Encoded length: ${encodedPayment.length} chars\n`);

// ═══════════════════════════════════════════════════════════════════════════════
// Step 4: Retry with Payment
// ═══════════════════════════════════════════════════════════════════════════════

console.log('STEP 4: Retry with Payment');
console.log('─'.repeat(60));

try {
  const response = await fetch(`${API_URL}${TEST_ENDPOINT}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'User-Agent': 'XActions-Test/1.0',
      'X-PAYMENT': encodedPayment,
    },
    body: JSON.stringify({ username: 'test_user' }),
  });
  
  console.log(`   Status: ${response.status} ${response.statusText}`);
  
  // Check for settlement header
  const settlementHeader = response.headers.get('payment-response');
  if (settlementHeader) {
    console.log('   ✅ PAYMENT-RESPONSE header received');
    try {
      const settlement = JSON.parse(Buffer.from(settlementHeader, 'base64').toString('utf-8'));
      console.log(`   Transaction: ${settlement.transaction || 'N/A'}`);
    } catch {
      // Settlement parsing optional
    }
  }
  
  const body = await response.json();
  
  if (response.status === 200) {
    console.log('   ✅ Request succeeded with payment!\n');
    console.log('STEP 5: Response Data');
    console.log('─'.repeat(60));
    console.log(JSON.stringify(body, null, 2).slice(0, 1000));
    
    if (body.meta?.paid) {
      console.log('\n   ✅ Response confirms payment was verified');
    }
  } else if (response.status === 402) {
    console.log('   ⚠️  Still getting 402 - payment verification failed');
    console.log(`   Reason: ${body.error || body.message}`);
    console.log('\n   This is expected with mock signatures.');
    console.log('   In production, real signed payments would be verified.\n');
  } else {
    console.log(`   ❌ Unexpected response: ${response.status}`);
    console.log(`   Body: ${JSON.stringify(body)}\n`);
  }
} catch (error) {
  console.log(`   ❌ Request failed: ${error.message}\n`);
}

// ═══════════════════════════════════════════════════════════════════════════════
// Summary
// ═══════════════════════════════════════════════════════════════════════════════

console.log('═'.repeat(60));
console.log('TEST SUMMARY');
console.log('═'.repeat(60));
console.log(`
✅ Payment flow implemented correctly if:
   - Step 1 returns 402 Payment Required
   - Step 2 shows valid payment requirements
   - PAYMENT-REQUIRED header contains base64-encoded requirements

⚠️  Mock payments will fail verification (expected)
   - Real payments need actual USDC + wallet signature
   - Use testnet (Base Sepolia) for testing with test USDC

📚 Next steps:
   - Get test USDC from faucet: https://faucet.circle.com
   - Fund a test wallet
   - Sign real payments with viem or ethers.js
`);
