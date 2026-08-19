// Copyright (c) 2024-2026 nich (@nichxbt). MIT License.
// src/idVerification.js
// ID Verification management for X/Twitter
// by nichxbt
// https://github.com/nirholas/xactions
//
// Features:
//   1. Initiate ID verification flow
//   2. Check verification status (pending, verified, not started, rejected)
//   3. Manage verification documents
//
// Usage:
//   1. Go to x.com and log in
//   2. Open Developer Console (F12)
//   3. Paste this script and press Enter
//   4. Call any function via window.XActions.idVerification.*
//
// Last Updated: 30 March 2026
(() => {
  const sleep = (ms) => new Promise(r => setTimeout(r, ms));

  // ============================================================================
  // Selectors
  // ============================================================================

  const SEL = {
    verifiedBadge: '[data-testid="icon-verified"]',
    backButton: '[data-testid="app-bar-back"]',
    toast: '[data-testid="toast"]',
    confirmButton: '[data-testid="confirmationSheetConfirm"]',
    primaryColumn: '[data-testid="primaryColumn"]',
    userCell: '[data-testid="UserCell"]',
    settingsLink: 'a[href="/settings"]',
    accountLink: 'a[href="/settings/account"]',
  };

  // ============================================================================
  // Helpers
  // ============================================================================

  const waitForSelector = async (selector, timeout = 8000) => {
    const start = Date.now();
    while (Date.now() - start < timeout) {
      const el = document.querySelector(selector);
      if (el) return el;
      await sleep(300);
    }
    return null;
  };

  const waitForXPath = async (xpath, timeout = 8000) => {
    const start = Date.now();
    while (Date.now() - start < timeout) {
      const result = document.evaluate(xpath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null);
      if (result.singleNodeValue) return result.singleNodeValue;
      await sleep(300);
    }
    return null;
  };

  const clickByText = async (text, tag = 'span') => {
    const xpath = `//${tag}[contains(text(),"${text}")]`;
    const el = await waitForXPath(xpath);
    if (el) {
      el.closest('button, a, div[role="button"], div[role="option"], div[role="menuitem"]')?.click() || el.click();
      await sleep(1500);
      return true;
    }
    return false;
  };

  // Returns true if already on `path` and safe to continue, or false if a
  // navigation was just triggered — window.location.href is a real page
  // load, which destroys this injected script, so callers must stop and
  // let the user re-run after the page loads (see docs/agents/browser-script-patterns.md).
  const navigateTo = async (path) => {
    const currentPath = window.location.pathname;
    if (currentPath !== path) {
      window.location.href = `https://x.com${path}`;
      console.log('⚠️ Navigating to verification settings. Re-run this function after the page loads.');
      return false;
    }
    await sleep(1000);
    return true;
  };

  const findTextOnPage = (text) => {
    const xpath = `//span[contains(text(),"${text}")] | //div[contains(text(),"${text}")] | //p[contains(text(),"${text}")]`;
    const result = document.evaluate(xpath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null);
    return result.singleNodeValue;
  };

  // ============================================================================
  // State Persistence
  // ============================================================================

  const STATE_KEY = 'xactions_id_verification';

  const getState = () => {
    try {
      return JSON.parse(sessionStorage.getItem(STATE_KEY) || '{}');
    } catch {
      return {};
    }
  };

  const setState = (data) => {
    const current = getState();
    sessionStorage.setItem(STATE_KEY, JSON.stringify({ ...current, ...data }));
  };

  // ============================================================================
  // 1. Initiate ID Verification
  // ============================================================================

  /**
   * Navigate to verification settings and start the ID verification flow.
   * Guides the user through each step of the process.
   */
  const initiateVerification = async () => {
    console.log('🔄 Starting ID verification flow...');

    // Step 1: Navigate to verification settings
    console.log('🔄 Navigating to verification settings...');
    const onTarget = await navigateTo('/settings/account/verification');
    if (!onTarget) {
      return { success: false, navigated: true, message: 'Navigating to verification settings. Re-run initiateVerification() after the page loads.' };
    }
    await sleep(2000);

    // Check if the page loaded correctly
    const primaryColumn = await waitForSelector(SEL.primaryColumn, 10000);
    if (!primaryColumn) {
      console.error('❌ Could not load verification settings. Make sure you are logged in.');
      return { success: false, error: 'Page did not load' };
    }

    // Check if already verified
    const alreadyVerified = findTextOnPage('Verified') || findTextOnPage('Your account is verified');
    if (alreadyVerified) {
      const badgeEl = document.querySelector(SEL.verifiedBadge);
      if (badgeEl) {
        console.log('✅ Your account is already verified!');
        setState({ status: 'verified', lastChecked: new Date().toISOString() });
        return { success: true, status: 'verified', message: 'Account is already verified' };
      }
    }

    // Step 2: Look for the ID verification option
    console.log('🔄 Looking for ID verification option...');
    await sleep(1000);

    // Try to find and click the ID verification link/button
    const idVerifClicked =
      await clickByText('ID verification') ||
      await clickByText('Verify your identity') ||
      await clickByText('Government ID') ||
      await clickByText('Verify your account');

    if (!idVerifClicked) {
      // Try looking for a "Get verified" or "Subscribe" flow
      const getVerified = await clickByText('Get verified') || await clickByText('Verification');
      if (!getVerified) {
        console.warn('⚠️ Could not find ID verification option on this page.');
        console.log('📋 Manual steps:');
        console.log('   1. Go to Settings > Account > Verification');
        console.log('   2. Look for "ID verification" or "Verify your identity"');
        console.log('   3. Follow the prompts to upload your government-issued ID');
        return { success: false, error: 'ID verification option not found', manual: true };
      }
    }

    await sleep(2000);

    // Step 3: Check what verification step we landed on
    console.log('🔄 Checking verification flow state...');

    const hasUploadPrompt = findTextOnPage('Upload') || findTextOnPage('upload');
    const hasPhotoPrompt = findTextOnPage('photo') || findTextOnPage('Photo') || findTextOnPage('selfie');
    const hasPending = findTextOnPage('pending') || findTextOnPage('Pending') || findTextOnPage('review');

    if (hasPending) {
      console.log('🔄 Your ID verification is currently pending review.');
      setState({ status: 'pending', lastChecked: new Date().toISOString() });
      return { success: true, status: 'pending', message: 'Verification is pending review' };
    }

    if (hasUploadPrompt || hasPhotoPrompt) {
      console.log('✅ ID verification flow is ready. Follow the on-screen prompts:');
      console.log('');
      console.log('📋 Steps to complete:');
      console.log('   1. Select your ID type (passport, driver\'s license, national ID)');
      console.log('   2. Upload clear photos of the front (and back if applicable)');
      console.log('   3. Take a selfie for facial matching');
      console.log('   4. Confirm your details and submit');
      console.log('');
      console.log('⚠️ Tips for success:');
      console.log('   - Ensure good lighting and clear, readable text on your ID');
      console.log('   - Remove glasses and hats for the selfie');
      console.log('   - Make sure the entire ID is visible with no glare');
      console.log('   - Use the same name on your ID as on your X profile');

      setState({ status: 'in_progress', startedAt: new Date().toISOString() });
      return { success: true, status: 'in_progress', message: 'Verification flow is active' };
    }

    // Generic guidance
    console.log('✅ Verification settings page loaded.');
    console.log('📋 Follow the on-screen instructions to complete ID verification.');
    setState({ status: 'initiated', lastChecked: new Date().toISOString() });
    return { success: true, status: 'initiated', message: 'Navigated to verification settings' };
  };

  // ============================================================================
  // 2. Check Verification Status
  // ============================================================================

  /**
   * Check the current verification status of your account.
   * Scrapes the verification badge and status from settings.
   * @returns {Object} Status object with status field: 'verified', 'pending', 'rejected', 'not_started'
   */
  const checkStatus = async () => {
    console.log('🔄 Checking verification status...');

    const statusResult = {
      status: 'not_started',
      badge: null,
      details: null,
      lastChecked: new Date().toISOString(),
    };

    // Check 1: Look for verification badge on current page
    const badgeEl = document.querySelector(SEL.verifiedBadge);
    if (badgeEl) {
      const svgEl = badgeEl.querySelector('svg') || badgeEl;
      const badgeColor = svgEl.getAttribute('fill') ||
        window.getComputedStyle(svgEl).color;

      let badgeType = 'blue';
      if (badgeColor && (badgeColor.includes('gold') || badgeColor.includes('#F4D03F') || badgeColor.includes('rgb(244'))) {
        badgeType = 'gold';
      } else if (badgeColor && (badgeColor.includes('gray') || badgeColor.includes('grey') || badgeColor.includes('rgb(113'))) {
        badgeType = 'gray';
      }

      statusResult.badge = badgeType;
      console.log(`✅ Verification badge found: ${badgeType} checkmark`);
    }

    // Check 2: Navigate to verification settings for detailed status
    console.log('🔄 Navigating to verification settings...');
    const onTarget = await navigateTo('/settings/account/verification');
    if (!onTarget) {
      statusResult.details = 'Navigating to verification settings. Re-run checkStatus() after the page loads.';
      setState(statusResult);
      return statusResult;
    }
    await sleep(2000);

    const primaryColumn = await waitForSelector(SEL.primaryColumn, 10000);
    if (!primaryColumn) {
      console.error('❌ Could not load verification settings page.');
      statusResult.details = 'Could not load settings page';
      setState(statusResult);
      return statusResult;
    }

    // Scan for status indicators
    const pageText = primaryColumn.textContent || '';

    if (/verified/i.test(pageText) && (/your account is verified/i.test(pageText) || /identity verified/i.test(pageText))) {
      statusResult.status = 'verified';
      statusResult.details = 'Account identity is verified';
      console.log('✅ Status: VERIFIED — Your identity has been confirmed.');
    } else if (/pending|under review|processing|submitted/i.test(pageText)) {
      statusResult.status = 'pending';
      statusResult.details = 'Verification is under review';
      console.log('🔄 Status: PENDING — Your verification is under review.');

      // Try to extract estimated time
      const timeMatch = pageText.match(/(\d+)\s*(hour|day|business day)/i);
      if (timeMatch) {
        statusResult.estimatedTime = `${timeMatch[1]} ${timeMatch[2]}(s)`;
        console.log(`   ⏳ Estimated processing time: ${statusResult.estimatedTime}`);
      }
    } else if (/rejected|denied|failed|unsuccessful/i.test(pageText)) {
      statusResult.status = 'rejected';
      statusResult.details = 'Verification was rejected';
      console.log('❌ Status: REJECTED — Your verification was not approved.');

      // Try to find reason
      const reasonEl = findTextOnPage('reason') || findTextOnPage('Reason') || findTextOnPage('because');
      if (reasonEl) {
        const reasonText = reasonEl.closest('div, p')?.textContent?.trim();
        if (reasonText) {
          statusResult.rejectionReason = reasonText;
          console.log(`   📋 Reason: ${reasonText}`);
        }
      }

      console.log('');
      console.log('⚠️ You may be able to resubmit. Common rejection reasons:');
      console.log('   - ID photo was blurry or unreadable');
      console.log('   - Selfie did not match ID photo');
      console.log('   - Name on ID did not match profile name');
      console.log('   - Expired identification document');
    } else {
      statusResult.status = 'not_started';
      statusResult.details = 'ID verification has not been started';
      console.log('⚠️ Status: NOT STARTED — ID verification has not been initiated.');
      console.log('   Run initiateVerification() to begin the process.');
    }

    // Check for premium/subscription status on page
    if (/premium|subscribe|X Premium/i.test(pageText)) {
      const hasPremium = /active|subscribed|current plan/i.test(pageText);
      statusResult.premiumStatus = hasPremium ? 'active' : 'not_subscribed';
      if (hasPremium) {
        console.log('   💎 X Premium: Active');
      } else {
        console.log('   💎 X Premium: Not subscribed (may be required for some verification features)');
      }
    }

    console.log('');
    console.log(`📊 Summary: ${statusResult.status.toUpperCase()} | Badge: ${statusResult.badge || 'none'}`);

    setState(statusResult);
    return statusResult;
  };

  // ============================================================================
  // 3. Manage Verification Documents
  // ============================================================================

  /**
   * Navigate to verification document management and view submitted documents status.
   * Shows document types, submission dates, and current review status.
   */
  const manageDocuments = async () => {
    console.log('🔄 Navigating to verification document management...');

    // Navigate to the verification settings area
    const onTarget = await navigateTo('/settings/account/verification');
    if (!onTarget) {
      return { success: false, navigated: true, message: 'Navigating to verification settings. Re-run manageDocuments() after the page loads.' };
    }
    await sleep(2000);

    const primaryColumn = await waitForSelector(SEL.primaryColumn, 10000);
    if (!primaryColumn) {
      console.error('❌ Could not load verification settings. Make sure you are logged in.');
      return { success: false, error: 'Page did not load' };
    }

    // Try to find a documents section or link
    console.log('🔄 Looking for document management section...');
    await sleep(1000);

    const docClicked =
      await clickByText('Documents') ||
      await clickByText('Manage documents') ||
      await clickByText('Submitted documents') ||
      await clickByText('Your documents') ||
      await clickByText('ID documents');

    await sleep(2000);

    const documents = [];
    const pageText = (primaryColumn.textContent || '').toLowerCase();

    // Scan for document entries in the page
    const docTypes = ['passport', 'driver', 'license', 'national id', 'government id', 'photo id', 'identity card'];
    const statusKeywords = {
      approved: ['approved', 'accepted', 'verified', 'valid'],
      pending: ['pending', 'review', 'processing', 'submitted'],
      rejected: ['rejected', 'denied', 'failed', 'expired', 'invalid'],
    };

    for (const docType of docTypes) {
      if (pageText.includes(docType)) {
        const doc = {
          type: docType,
          status: 'unknown',
        };

        // Try to determine document status from surrounding context
        const docEl = findTextOnPage(docType.charAt(0).toUpperCase() + docType.slice(1)) ||
          findTextOnPage(docType);
        if (docEl) {
          const container = docEl.closest('div[class], section, li') || docEl.parentElement;
          const containerText = (container?.textContent || '').toLowerCase();

          for (const [status, keywords] of Object.entries(statusKeywords)) {
            if (keywords.some(kw => containerText.includes(kw))) {
              doc.status = status;
              break;
            }
          }

          // Try to extract date
          const dateMatch = containerText.match(/(\w+ \d{1,2},? \d{4}|\d{1,2}\/\d{1,2}\/\d{4}|\d{4}-\d{2}-\d{2})/);
          if (dateMatch) {
            doc.submittedDate = dateMatch[1];
          }
        }

        documents.push(doc);
      }
    }

    if (documents.length > 0) {
      console.log('');
      console.log('📄 Submitted Documents:');
      console.log('─'.repeat(50));
      documents.forEach((doc, i) => {
        const statusIcon = doc.status === 'approved' ? '✅' :
          doc.status === 'pending' ? '🔄' :
          doc.status === 'rejected' ? '❌' : '❔';
        console.log(`   ${i + 1}. ${statusIcon} ${doc.type.toUpperCase()}`);
        console.log(`      Status: ${doc.status}`);
        if (doc.submittedDate) {
          console.log(`      Submitted: ${doc.submittedDate}`);
        }
      });
      console.log('─'.repeat(50));
    } else {
      console.log('⚠️ No submitted documents found on this page.');
      console.log('');
      console.log('📋 This could mean:');
      console.log('   - You have not submitted any documents yet');
      console.log('   - Documents are managed in a different section');
      console.log('   - The page structure has changed');
    }

    // Check for resubmission option
    const canResubmit = findTextOnPage('Resubmit') || findTextOnPage('Try again') ||
      findTextOnPage('Upload again') || findTextOnPage('Submit new');
    if (canResubmit) {
      console.log('');
      console.log('🔄 Resubmission option is available.');
      console.log('   Run initiateVerification() to start a new submission.');
    }

    // Check for document requirements
    const hasRequirements = findTextOnPage('Requirements') || findTextOnPage('Accepted documents') ||
      findTextOnPage('accepted');
    if (hasRequirements) {
      console.log('');
      console.log('📋 Accepted document types:');
      console.log('   - Passport');
      console.log('   - Driver\'s license');
      console.log('   - National identity card');
      console.log('   - Government-issued photo ID');
    }

    if (!docClicked && documents.length === 0) {
      console.log('');
      console.log('📋 To manage verification documents:');
      console.log('   1. Navigate to Settings > Account > Verification');
      console.log('   2. Look for "ID verification" or "Documents" section');
      console.log('   3. You can view, resubmit, or update your documents there');
    }

    const result = {
      success: true,
      documents,
      canResubmit: !!canResubmit,
      timestamp: new Date().toISOString(),
    };

    setState({ documents: result });
    return result;
  };

  // ============================================================================
  // Expose on window.XActions.idVerification
  // ============================================================================

  window.XActions = window.XActions || {};
  window.XActions.idVerification = {
    initiateVerification,
    checkStatus,
    manageDocuments,
  };

  // ============================================================================
  // Menu
  // ============================================================================

  console.log('');
  console.log('╔══════════════════════════════════════════════════════╗');
  console.log('║       🆔 XActions ID Verification Manager           ║');
  console.log('║                  by nichxbt                         ║');
  console.log('╠══════════════════════════════════════════════════════╣');
  console.log('║                                                      ║');
  console.log('║  1. initiateVerification()                          ║');
  console.log('║     → Start the ID verification flow                ║');
  console.log('║                                                      ║');
  console.log('║  2. checkStatus()                                   ║');
  console.log('║     → Check verification status & badge type        ║');
  console.log('║                                                      ║');
  console.log('║  3. manageDocuments()                               ║');
  console.log('║     → View submitted documents & their status       ║');
  console.log('║                                                      ║');
  console.log('║  Access: window.XActions.idVerification.<function>  ║');
  console.log('╚══════════════════════════════════════════════════════╝');
  console.log('');
})();
