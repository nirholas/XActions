#!/usr/bin/env node
// Copyright (c) 2024-2026 nich (@nichxbt). Licensed under the Apache License, Version 2.0.
/**
 * x402 Configuration Verification Script
 * 
 * Validates x402 setup and tests connectivity to the facilitator.
 * Run this before deploying to ensure everything is configured correctly.
 * 
 * Usage:
 *   node scripts/verify-x402.js
 *   npm run verify:x402
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
} else {
  console.log('⚠️  No .env file found, using environment variables\n');
}

// Import configuration from the actual config module to ensure consistency
import { 
  PAY_TO_ADDRESS, 
  FACILITATOR_URL, 
  NETWORK, 
  AI_OPERATION_PRICES,
  validateConfig,
  isX402Configured 
} from '../api/config/x402-config.js';

// Network names for display
const NETWORK_NAMES = {
  'eip155:84532': 'Base Sepolia (testnet)',
  'eip155:8453': 'Base (mainnet)',
  'eip155:1': 'Ethereum Mainnet',
  'eip155:11155111': 'Ethereum Sepolia (testnet)',
};

console.log('╔════════════════════════════════════════════════════════════════╗');
console.log('║           XActions x402 Configuration Verification             ║');
console.log('╚════════════════════════════════════════════════════════════════╝\n');

let hasErrors = false;
let hasWarnings = false;

// ═══════════════════════════════════════════════════════════════════════════════
// Check Payment Address
// ═══════════════════════════════════════════════════════════════════════════════

console.log('📍 Payment Address Configuration');
console.log('─'.repeat(60));

if (!PAY_TO_ADDRESS) {
  console.log('❌ X402_PAY_TO_ADDRESS is not set');
  console.log('   Payments cannot be received without this address.');
  console.log('   Set it in your .env file or environment variables.\n');
  hasErrors = true;
} else if (!PAY_TO_ADDRESS.match(/^0x[a-fA-F0-9]{40}$/)) {
  console.log('❌ X402_PAY_TO_ADDRESS is invalid');
  console.log(`   Current value: ${PAY_TO_ADDRESS}`);
  console.log('   Must be a valid Ethereum address (0x + 40 hex chars)\n');
  hasErrors = true;
} else {
  console.log(`✅ Payment address: ${PAY_TO_ADDRESS}`);
  console.log(`   First 6 chars: ${PAY_TO_ADDRESS.slice(0, 6)}...${PAY_TO_ADDRESS.slice(-4)}\n`);
}

// ═══════════════════════════════════════════════════════════════════════════════
// Check Network Configuration
// ═══════════════════════════════════════════════════════════════════════════════

console.log('🌐 Network Configuration');
console.log('─'.repeat(60));

const networkName = NETWORK_NAMES[NETWORK] || 'Unknown Network';
console.log(`   Network: ${NETWORK}`);
console.log(`   Name: ${networkName}`);

if (NETWORK === 'eip155:84532') {
  console.log('⚠️  Running on TESTNET - payments use test USDC');
  console.log('   Switch to eip155:8453 for mainnet/production\n');
  hasWarnings = true;
} else if (NETWORK === 'eip155:8453') {
  console.log('✅ Running on MAINNET - real USDC payments\n');
} else {
  console.log('⚠️  Non-standard network - ensure facilitator supports it\n');
  hasWarnings = true;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Check Facilitator Connection
// ═══════════════════════════════════════════════════════════════════════════════

console.log('🔗 Facilitator Connection');
console.log('─'.repeat(60));
console.log(`   URL: ${FACILITATOR_URL}`);

try {
  console.log('   Testing connection...');
  
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);
  
  const response = await fetch(FACILITATOR_URL, {
    method: 'GET',
    headers: {
      'Accept': 'application/json',
      'User-Agent': 'XActions-Verify/1.0',
    },
    signal: controller.signal,
  });
  
  clearTimeout(timeout);
  
  if (response.ok) {
    console.log(`✅ Facilitator is reachable (HTTP ${response.status})`);
    
    // Try to get version info if available
    try {
      const data = await response.json();
      if (data.version) {
        console.log(`   Facilitator version: ${data.version}`);
      }
      if (data.supportedNetworks) {
        console.log(`   Supported networks: ${data.supportedNetworks.join(', ')}`);
      }
    } catch {
      // Response might not be JSON, that's okay
    }
    console.log('');
  } else {
    console.log(`⚠️  Facilitator returned HTTP ${response.status}`);
    console.log('   This may indicate configuration issues\n');
    hasWarnings = true;
  }
} catch (error) {
  if (error.name === 'AbortError') {
    console.log('❌ Connection timed out after 10 seconds');
  } else {
    console.log(`❌ Failed to reach facilitator: ${error.message}`);
  }
  console.log('   Check your network connection and facilitator URL\n');
  hasErrors = true;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Pricing Configuration
// ═══════════════════════════════════════════════════════════════════════════════

console.log('💰 Pricing Configuration');
console.log('─'.repeat(60));

const categories = {
  'Scraping': Object.entries(AI_OPERATION_PRICES).filter(([k]) => k.startsWith('scrape:')),
  'Actions': Object.entries(AI_OPERATION_PRICES).filter(([k]) => k.startsWith('action:')),
  'Monitoring': Object.entries(AI_OPERATION_PRICES).filter(([k]) => k.startsWith('monitor:') || k.startsWith('alert:')),
  'Utility': Object.entries(AI_OPERATION_PRICES).filter(([k]) => k.startsWith('download:') || k.startsWith('export:') || k.startsWith('unroll:')),
};

for (const [category, operations] of Object.entries(categories)) {
  console.log(`\n   ${category}:`);
  for (const [op, price] of operations) {
    const opName = op.split(':')[1].padEnd(25);
    console.log(`      ${opName} ${price}`);
  }
}

// Calculate some stats
const prices = Object.values(AI_OPERATION_PRICES).map(p => parseFloat(p.replace('$', '')));
const minPrice = Math.min(...prices);
const maxPrice = Math.max(...prices);
const avgPrice = (prices.reduce((a, b) => a + b, 0) / prices.length).toFixed(4);

console.log(`\n   Summary:`);
console.log(`      Total operations: ${prices.length}`);
console.log(`      Price range: $${minPrice} - $${maxPrice}`);
console.log(`      Average price: $${avgPrice}\n`);

// ═══════════════════════════════════════════════════════════════════════════════
// Environment Check
// ═══════════════════════════════════════════════════════════════════════════════

console.log('🔧 Environment Check');
console.log('─'.repeat(60));

const nodeVersion = process.version;
console.log(`   Node.js: ${nodeVersion}`);

if (parseInt(nodeVersion.slice(1)) < 18) {
  console.log('⚠️  Node.js 18+ recommended for native fetch support\n');
  hasWarnings = true;
} else {
  console.log('✅ Node.js version is compatible\n');
}

// Check for required packages
console.log('   Checking dependencies...');

const requiredPackages = ['@x402/core', '@x402/evm', '@x402/express'];
const optionalPackages = ['viem', 'ethers'];

for (const pkg of requiredPackages) {
  try {
    await import(pkg);
    console.log(`   ✅ ${pkg} - installed`);
  } catch {
    console.log(`   ❌ ${pkg} - NOT INSTALLED`);
    console.log(`      Run: npm install ${pkg}`);
    hasErrors = true;
  }
}

for (const pkg of optionalPackages) {
  try {
    await import(pkg);
    console.log(`   ✅ ${pkg} - installed (optional)`);
  } catch {
    console.log(`   ℹ️  ${pkg} - not installed (optional)`);
  }
}

console.log('');

// ═══════════════════════════════════════════════════════════════════════════════
// Security Check
// ═══════════════════════════════════════════════════════════════════════════════

console.log('🔒 Security Check');
console.log('─'.repeat(60));

if (process.env.X402_SKIP_VERIFICATION === 'true') {
  console.log('🚨 X402_SKIP_VERIFICATION is enabled!');
  console.log('   API endpoints will NOT require payment.');
  console.log('   This should ONLY be used in development.\n');
  hasWarnings = true;
} else {
  console.log('✅ Payment verification is enabled\n');
}

if (process.env.X402_PRIVATE_KEY) {
  console.log('⚠️  X402_PRIVATE_KEY is set in environment');
  console.log('   Ensure this is a dedicated payment wallet, not your main wallet');
  console.log('   Never commit private keys to version control\n');
  hasWarnings = true;
}

if (process.env.NODE_ENV === 'production') {
  console.log('✅ Running in production mode');
} else {
  console.log(`ℹ️  Running in ${process.env.NODE_ENV || 'development'} mode`);
}

console.log('');

// ═══════════════════════════════════════════════════════════════════════════════
// Summary
// ═══════════════════════════════════════════════════════════════════════════════

console.log('═'.repeat(60));
console.log('VERIFICATION SUMMARY');
console.log('═'.repeat(60));

if (hasErrors) {
  console.log('\n❌ FAILED - Critical issues found that must be resolved\n');
  console.log('Please fix the errors above before deploying.');
  process.exit(1);
} else if (hasWarnings) {
  console.log('\n⚠️  PASSED WITH WARNINGS\n');
  console.log('Configuration is functional but review warnings above.');
  console.log('For production, ensure:');
  console.log('  - Network is set to mainnet (eip155:8453)');
  console.log('  - X402_SKIP_VERIFICATION is NOT set');
  console.log('  - Payment address is correct');
  process.exit(0);
} else {
  console.log('\n✅ ALL CHECKS PASSED\n');
  console.log('x402 configuration is ready for deployment.');
  process.exit(0);
}
