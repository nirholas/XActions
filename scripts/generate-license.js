#!/usr/bin/env node
/**
 * License Key Generator CLI
 * 
 * Usage:
 *   node scripts/generate-license.js --tier=business --customer="Acme Corp" --email="admin@acme.com"
 *   node scripts/generate-license.js --tier=enterprise --company="Big Tech Inc" --expires=365
 */

import { createLicense, listLicenses, revokeLicense, TIER_FEATURES } from '../api/services/licenseManager.js';

// Parse command line arguments
const args = process.argv.slice(2);
const options = {};

args.forEach(arg => {
  if (arg.startsWith('--')) {
    const [key, ...valueParts] = arg.slice(2).split('=');
    options[key] = valueParts.join('=') || true;
  }
});

// Help
if (options.help || args.length === 0) {
  console.log(`
⚡ XActions License Generator

Usage:
  node scripts/generate-license.js [options]

Options:
  --tier=<tier>         License tier: starter, business, enterprise (default: starter)
  --customer=<name>     Customer name
  --email=<email>       Customer email
  --company=<name>      Company name
  --expires=<days>      Days until expiration (optional)
  --instances=<n>       Max instances (optional)
  --notes=<text>        Admin notes
  --list                List all licenses
  --revoke=<key>        Revoke a license key
  --help                Show this help

Examples:
  node scripts/generate-license.js --tier=starter --customer="John Doe" --email="john@example.com"
  node scripts/generate-license.js --tier=business --company="Acme Corp" --expires=365
  node scripts/generate-license.js --tier=enterprise --company="Big Tech" --instances=10
  node scripts/generate-license.js --list
  node scripts/generate-license.js --revoke=XACT-XXXX-XXXX-XXXX-XXXX

Tiers:
  starter     - $49/mo  - Branding shown, 500 users, 1 instance
  business    - $199/mo - No branding, 5000 users, 3 instances, API access
  enterprise  - Custom  - No branding, unlimited users/instances, API access
`);
  process.exit(0);
}

async function main() {
  try {
    // List licenses
    if (options.list) {
      console.log('\n📋 Listing all licenses...\n');
      const { licenses, total } = await listLicenses({ limit: 50 });
      
      if (licenses.length === 0) {
        console.log('No licenses found.');
      } else {
        console.log(`Found ${total} license(s):\n`);
        licenses.forEach(lic => {
          const status = lic.status === 'active' ? '✅' : '❌';
          console.log(`${status} ${lic.key}`);
          console.log(`   Tier: ${lic.tier} | Customer: ${lic.customerName || lic.companyName || 'N/A'}`);
          console.log(`   Email: ${lic.customerEmail || 'N/A'}`);
          console.log(`   Status: ${lic.status} | Activations: ${lic.activations}`);
          console.log(`   Created: ${lic.createdAt.toISOString().split('T')[0]}`);
          if (lic.expiresAt) {
            console.log(`   Expires: ${lic.expiresAt.toISOString().split('T')[0]}`);
          }
          console.log('');
        });
      }
      process.exit(0);
    }

    // Revoke license
    if (options.revoke) {
      console.log(`\n🚫 Revoking license: ${options.revoke}...\n`);
      const license = await revokeLicense(options.revoke, 'Revoked via CLI');
      console.log(`License ${license.key} has been revoked.`);
      process.exit(0);
    }

    // Generate new license
    const tier = options.tier || 'starter';
    
    if (!['starter', 'business', 'enterprise'].includes(tier)) {
      console.error('❌ Invalid tier. Use: starter, business, or enterprise');
      process.exit(1);
    }

    console.log('\n⚡ Generating new license key...\n');

    const license = await createLicense({
      tier,
      customerName: options.customer,
      customerEmail: options.email,
      companyName: options.company,
      expiresInDays: options.expires ? parseInt(options.expires) : null,
      maxInstances: options.instances ? parseInt(options.instances) : null,
      notes: options.notes,
    });

    console.log('✅ License created successfully!\n');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`🔑 License Key: ${license.key}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`Tier:           ${license.tier}`);
    console.log(`Max Users:      ${license.maxUsers === -1 ? 'Unlimited' : license.maxUsers}`);
    console.log(`Max Instances:  ${license.maxInstances === -1 ? 'Unlimited' : license.maxInstances}`);
    console.log(`White Label:    ${license.whiteLabel ? 'Yes' : 'No'}`);
    console.log(`Custom Domain:  ${license.customDomain ? 'Yes' : 'No'}`);
    console.log(`API Access:     ${license.apiAccess ? 'Yes' : 'No'}`);
    if (license.expiresAt) {
      console.log(`Expires:        ${license.expiresAt.toISOString().split('T')[0]}`);
    } else {
      console.log(`Expires:        Never`);
    }
    if (license.customerName) console.log(`Customer:       ${license.customerName}`);
    if (license.customerEmail) console.log(`Email:          ${license.customerEmail}`);
    if (license.companyName) console.log(`Company:        ${license.companyName}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    console.log('📧 Send this to your customer:');
    console.log(`
Hi${license.customerName ? ` ${license.customerName.split(' ')[0]}` : ''},

Your XActions license key is:

${license.key}

To activate:
1. Add to your .env file: XACTIONS_LICENSE_KEY=${license.key}
2. Restart your XActions server

This key unlocks:
- ${license.tier.charAt(0).toUpperCase() + license.tier.slice(1)} tier features
- ${license.maxUsers === -1 ? 'Unlimited' : license.maxUsers} users
- ${license.maxInstances === -1 ? 'Unlimited' : license.maxInstances} instance(s)
${license.whiteLabel ? '- White-label (no branding)' : ''}
${license.apiAccess ? '- API access' : ''}

Questions? Reply to this email or DM @nichxbt on X.

Thanks for using XActions!
`);

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

main();
