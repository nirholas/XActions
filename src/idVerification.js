// ID Verification — by nichxbt
// https://github.com/nirholas/XActions
// Navigate to ID verification page, check status, and guide through the verification flow.
//
// HOW TO USE:
// 1. Go to https://x.com
// 2. Open Developer Console (F12)
// 3. Edit CONFIG below if needed
// 4. Paste this script and press Enter
//
// Last Updated: 30 March 2026

(() => {
  'use strict';

  const CONFIG = {
    autoNavigate: true,              // Navigate to verification settings automatically
    checkStatus: true,               // Check current verification status
    showRequirements: true,          // Display verification requirements
    delayBetweenActions: 2000,       // ms between navigation steps
  };

  const sleep = (ms) => new Promise(r => setTimeout(r, ms));
  const STORAGE_KEY = 'xactions_id_verification';

  const SELECTORS = {
    verificationSettings: 'a[href="/settings/verification"]',
    verificationStatus: '[data-testid="verificationStatus"]',
    verifiedIcon: '[data-testid="icon-verified"]',
    primaryColumn: '[data-testid="primaryColumn"]',
    settingsNav: '[data-testid="settingsNav"]',
  };

  const REQUIREMENTS = {
    'ID Verification': [
      'Government-issued photo ID (passport, driver\'s license, national ID)',
      'A selfie matching the ID photo',
      'Your account must be at least 30 days old',
      'You must have a profile photo, display name, and confirmed email/phone',
      'No recent violations of X Rules',
      'X Premium subscription (Basic, Premium, or Premium+)',
    ],
    'Organization Verification': [
      'Official organization account',
      'Verified organization identity',
      'Affiliated accounts management',
      'Gold checkmark badge',
      'Requires Verified Organizations subscription',
    ],
  };

  const checkVerificationStatus = () => {
    console.log('🔍 Checking verification status...');

    const statusEl = document.querySelector(SELECTORS.verificationStatus);
    const verifiedIcon = document.querySelector(SELECTORS.verifiedIcon);

    let status = 'unknown';

    if (statusEl) {
      const text = statusEl.textContent.trim();
      console.log(`📋 Verification status: ${text}`);
      status = text;
    }

    if (verifiedIcon) {
      console.log('✅ Verified badge detected — you are verified.');
      status = 'verified';
    } else {
      console.log('⚠️ No verified badge detected on this page.');
    }

    const pageText = document.body.innerText;
    if (pageText.includes('ID verification complete') || pageText.includes('Verification confirmed')) {
      console.log('✅ ID verification appears to be complete.');
      status = 'complete';
    } else if (pageText.includes('Pending review') || pageText.includes('Under review')) {
      console.log('🔄 Your ID verification is pending review.');
      status = 'pending';
    } else if (pageText.includes('Verification denied') || pageText.includes('Not verified')) {
      console.log('❌ Verification was denied or not yet submitted.');
      status = 'denied';
    }

    const record = {
      status,
      checkedAt: new Date().toISOString(),
      url: window.location.href,
    };

    try {
      const history = JSON.parse(sessionStorage.getItem(STORAGE_KEY) || '[]');
      history.push(record);
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(history));
    } catch (e) {
      // Silent fail on storage
    }

    return status;
  };

  const showRequirements = () => {
    console.log('\n══════════════════════════════════════════════════');
    console.log('📋 ID VERIFICATION REQUIREMENTS');
    console.log('══════════════════════════════════════════════════\n');

    for (const [category, reqs] of Object.entries(REQUIREMENTS)) {
      console.log(`\n🏷️  ${category}`);
      console.log('─'.repeat(40));
      reqs.forEach(r => console.log(`   ✓ ${r}`));
    }

    console.log('\n══════════════════════════════════════════════════');
    console.log('💡 Tips:');
    console.log('   • Ensure your ID is not expired');
    console.log('   • Take the selfie in good lighting');
    console.log('   • Make sure all text on the ID is legible');
    console.log('   • Processing usually takes 24-72 hours');
    console.log('══════════════════════════════════════════════════\n');
  };

  const navigateToVerification = async () => {
    console.log('🚀 Navigating to ID verification settings...');

    const verificationLink = document.querySelector(SELECTORS.verificationSettings);

    if (verificationLink) {
      verificationLink.click();
      console.log('✅ Clicked verification settings link.');
      await sleep(CONFIG.delayBetweenActions);
    } else {
      console.log('⚠️ Verification link not found in current page. Navigating directly...');
      window.location.href = 'https://x.com/settings/verification';
      await sleep(CONFIG.delayBetweenActions * 2);
    }

    await sleep(CONFIG.delayBetweenActions);

    const primaryColumn = document.querySelector(SELECTORS.primaryColumn);
    if (primaryColumn) {
      const text = primaryColumn.textContent;
      if (text.includes('Verification') || text.includes('Identity')) {
        console.log('✅ Verification page loaded successfully.');
      } else {
        console.log('ℹ️ Page loaded, but verification content may still be loading.');
      }

      const buttons = primaryColumn.querySelectorAll('button, a[role="button"]');
      if (buttons.length > 0) {
        console.log('📋 Available actions on this page:');
        buttons.forEach((btn, i) => {
          const label = btn.textContent.trim() || btn.getAttribute('aria-label') || 'Unnamed button';
          console.log(`   ${i + 1}. ${label}`);
        });
      }
    }
  };

  const run = async () => {
    console.log('═══════════════════════════════════════════');
    console.log('🪪 XActions — ID Verification');
    console.log('═══════════════════════════════════════════\n');

    if (CONFIG.showRequirements) {
      showRequirements();
      await sleep(1000);
    }

    if (CONFIG.checkStatus) {
      const status = checkVerificationStatus();
      await sleep(1000);

      if (status === 'complete' || status === 'verified') {
        console.log('\n🎉 You are already verified! No further action needed.');
        console.log('💡 To manage verification: https://x.com/settings/verification');
        return;
      }

      if (status === 'pending') {
        console.log('\n🔄 Your verification is under review. Please wait for X to process it.');
        return;
      }
    }

    if (CONFIG.autoNavigate) {
      await navigateToVerification();
    } else {
      console.log('\n💡 Set CONFIG.autoNavigate = true to auto-navigate, or visit:');
      console.log('   👉 https://x.com/settings/verification');
    }

    console.log('\n✅ Follow the on-screen prompts to complete ID verification.');
    console.log('📱 You will need your government-issued ID and a selfie.');
  };

  run();
})();
