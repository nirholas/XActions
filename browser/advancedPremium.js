// Copyright (c) 2024-2026 nich (@nichxbt). Licensed under the Apache License, Version 2.0.
/**
 * @name        advancedPremium.js
 * @title       Advanced Premium Tools
 * @description Premium features: change or cancel a tier, gift Premium, reader mode, undo timer and verified-only replies.
 * @category    premium
 * @page        x.com/*
 * @writes      true
 */
// browser/advancedPremium.js
// Advanced Premium features for X/Twitter
// by nichxbt
// 1. Go to x.com
// 2. Open Developer Console (F12)
// 3. Paste and run
// Last Updated: 30 March 2026
(() => {
  'use strict';

  const sleep = (ms) => new Promise(r => setTimeout(r, ms));
  const rand = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

  // ══════════════════════════════════════════════════════════
  // 🔧 Helpers
  // ══════════════════════════════════════════════════════════

  function log(emoji, msg) {
    console.log(`${emoji} [XActions Premium] ${msg}`);
  }

  function clickEl(el) {
    if (!el) return false;
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    el.click();
    return true;
  }

  async function waitForSelector(selector, timeout = 10000) {
    const start = Date.now();
    while (Date.now() - start < timeout) {
      const el = document.querySelector(selector);
      if (el) return el;
      await sleep(300);
    }
    return null;
  }

  async function waitForText(text, tag = '*', timeout = 10000) {
    const start = Date.now();
    while (Date.now() - start < timeout) {
      const els = document.querySelectorAll(tag);
      for (const el of els) {
        if (el.textContent.trim().toLowerCase().includes(text.toLowerCase())) {
          return el;
        }
      }
      await sleep(300);
    }
    return null;
  }

  async function navigateAndWait(url, waitMs = 3000) {
    log('🔄', `Navigating to ${url}`);
    window.location.href = url;
    await sleep(waitMs);
  }

  // ══════════════════════════════════════════════════════════
  // 1. Subscribe to Premium
  // ══════════════════════════════════════════════════════════

  async function subscribePremium(tier = 'premium') {
    const tiers = ['basic', 'premium', 'premiumplus'];
    const tierNorm = tier.toLowerCase().replace(/[^a-z+]/g, '').replace('+', 'plus');
    if (!tiers.includes(tierNorm)) {
      log('❌', `Invalid tier "${tier}". Use: basic, premium, or premium+ (premiumplus)`);
      return;
    }

    log('🔄', `Starting Premium subscription flow for tier: ${tierNorm}`);
    await navigateAndWait('https://x.com/i/premium_sign_up');
    await sleep(2000);

    // Look for tier selection tabs/buttons
    const tierLabels = {
      basic: 'Basic',
      premium: 'Premium',
      premiumplus: 'Premium+',
    };
    const label = tierLabels[tierNorm];

    const tierBtn = await waitForText(label, 'button, [role="tab"], span, div');
    if (tierBtn) {
      clickEl(tierBtn.closest('button') || tierBtn.closest('[role="tab"]') || tierBtn);
      log('✅', `Selected tier: ${label}`);
      await sleep(1500);
    } else {
      log('⚠️', `Could not find tier selector for "${label}". The page may already show the correct tier.`);
    }

    // Look for subscribe / continue button
    const subscribeBtn = await waitForText('subscribe', 'button') ||
                         await waitForText('continue', 'button') ||
                         await waitForText('get started', 'button');
    if (subscribeBtn) {
      const btn = subscribeBtn.closest('button') || subscribeBtn;
      clickEl(btn);
      log('✅', `Clicked subscribe button. Complete payment in the dialog that opens.`);
    } else {
      log('⚠️', 'Could not find a subscribe button. You may need to complete the flow manually.');
    }
  }

  // ══════════════════════════════════════════════════════════
  // 2. Cancel Premium
  // ══════════════════════════════════════════════════════════

  async function cancelPremium() {
    log('🔄', 'Navigating to subscription management...');
    await navigateAndWait('https://x.com/settings/manage_subscription');
    await sleep(2000);

    // Look for cancel link/button
    const cancelBtn = await waitForText('cancel', 'button, a, span');
    if (cancelBtn) {
      const el = cancelBtn.closest('button') || cancelBtn.closest('a') || cancelBtn;
      clickEl(el);
      log('🔄', 'Clicked cancel. Waiting for confirmation dialog...');
      await sleep(2000);

      // Confirm cancellation
      const confirmBtn = document.querySelector('[data-testid="confirmationSheetConfirm"]') ||
                         await waitForText('confirm', 'button') ||
                         await waitForText('yes, cancel', 'button');
      if (confirmBtn) {
        const btn = confirmBtn.closest ? (confirmBtn.closest('button') || confirmBtn) : confirmBtn;
        clickEl(btn);
        log('✅', 'Premium cancellation initiated. Check your email for confirmation.');
      } else {
        log('⚠️', 'No confirmation dialog found. You may need to confirm manually.');
      }
    } else {
      log('❌', 'Could not find cancel option. You may not have an active Premium subscription.');
    }
  }

  // ══════════════════════════════════════════════════════════
  // 3. Change Premium Tier
  // ══════════════════════════════════════════════════════════

  async function changeTier(newTier) {
    const tiers = ['basic', 'premium', 'premiumplus'];
    const tierNorm = newTier.toLowerCase().replace(/[^a-z+]/g, '').replace('+', 'plus');
    if (!tiers.includes(tierNorm)) {
      log('❌', `Invalid tier "${newTier}". Use: basic, premium, or premium+ (premiumplus)`);
      return;
    }

    log('🔄', `Changing Premium tier to: ${tierNorm}`);
    await navigateAndWait('https://x.com/i/premium_sign_up');
    await sleep(2000);

    const tierLabels = {
      basic: 'Basic',
      premium: 'Premium',
      premiumplus: 'Premium+',
    };
    const label = tierLabels[tierNorm];

    const tierBtn = await waitForText(label, 'button, [role="tab"], span, div');
    if (tierBtn) {
      clickEl(tierBtn.closest('button') || tierBtn.closest('[role="tab"]') || tierBtn);
      log('✅', `Selected tier: ${label}`);
      await sleep(1500);
    } else {
      log('⚠️', `Could not find tier selector for "${label}".`);
      return;
    }

    // Look for upgrade/downgrade/switch button
    const actionBtn = await waitForText('upgrade', 'button') ||
                      await waitForText('downgrade', 'button') ||
                      await waitForText('switch', 'button') ||
                      await waitForText('continue', 'button') ||
                      await waitForText('subscribe', 'button');
    if (actionBtn) {
      const btn = actionBtn.closest('button') || actionBtn;
      clickEl(btn);
      log('✅', `Tier change to ${label} initiated. Complete any payment steps if prompted.`);
    } else {
      log('⚠️', 'Could not find an action button. The tier change may require manual completion.');
    }
  }

  // ══════════════════════════════════════════════════════════
  // 4. Gift Premium
  // ══════════════════════════════════════════════════════════

  async function giftPremium(username) {
    if (!username) {
      log('❌', 'Please provide a username. Usage: XActions.advancedPremium.giftPremium("username")');
      return;
    }

    const cleanUsername = username.replace(/^@/, '');
    log('🔄', `Starting Premium gift flow for @${cleanUsername}...`);

    // Navigate to the user's profile first to access gift option
    await navigateAndWait(`https://x.com/${cleanUsername}`);
    await sleep(2000);

    // Open user actions menu (three-dot menu)
    const moreBtn = document.querySelector('[data-testid="userActions"]');
    if (moreBtn) {
      clickEl(moreBtn);
      await sleep(1500);

      // Look for gift premium option in dropdown
      const giftOption = await waitForText('gift premium', 'span, [role="menuitem"], div');
      if (giftOption) {
        const el = giftOption.closest('[role="menuitem"]') || giftOption.closest('div[tabindex]') || giftOption;
        clickEl(el);
        log('✅', `Gift Premium dialog opened for @${cleanUsername}. Complete the payment flow.`);
        return;
      } else {
        log('⚠️', 'Gift option not found in menu. Trying direct URL...');
      }
    }

    // Fallback: try direct gift URL
    await navigateAndWait(`https://x.com/i/premium_sign_up?gift=${cleanUsername}`);
    await sleep(2000);

    const subscribeBtn = await waitForText('gift', 'button') ||
                         await waitForText('continue', 'button') ||
                         await waitForText('subscribe', 'button');
    if (subscribeBtn) {
      clickEl(subscribeBtn.closest('button') || subscribeBtn);
      log('✅', `Gift Premium flow started for @${cleanUsername}. Complete payment to finish.`);
    } else {
      log('⚠️', 'Could not find gift button. You may need to complete the flow manually.');
    }
  }

  // ══════════════════════════════════════════════════════════
  // 5. Top Articles
  // ══════════════════════════════════════════════════════════

  async function topArticles(limit = 20) {
    log('🔄', `Fetching Top Articles (limit: ${limit})...`);
    await navigateAndWait('https://x.com/i/top_articles');
    await sleep(3000);

    const articles = [];
    let lastHeight = 0;
    let retries = 0;
    const maxRetries = 5;

    while (articles.length < limit && retries < maxRetries) {
      // Scrape article cards from the page
      const articleEls = document.querySelectorAll('article[data-testid="tweet"], [data-testid="cellInnerDiv"]');

      for (const el of articleEls) {
        if (articles.length >= limit) break;

        // Extract article link
        const linkEl = el.querySelector('a[href*="http"], a[href*="t.co"]');
        const titleEl = el.querySelector('[data-testid="tweetText"]') || el.querySelector('span');
        const shareCountEl = el.querySelector('[data-testid="engagements"]');

        const url = linkEl ? linkEl.href : null;
        const title = titleEl ? titleEl.textContent.trim().substring(0, 200) : 'Unknown';
        const shares = shareCountEl ? shareCountEl.textContent.trim() : 'N/A';

        if (url && !articles.find(a => a.url === url)) {
          articles.push({ title, url, shares });
        }
      }

      // Scroll to load more
      window.scrollTo(0, document.body.scrollHeight);
      await sleep(rand(2000, 3000));

      const newHeight = document.body.scrollHeight;
      if (newHeight === lastHeight) {
        retries++;
      } else {
        retries = 0;
      }
      lastHeight = newHeight;
    }

    if (articles.length === 0) {
      log('⚠️', 'No articles found. Top Articles may require Premium and may not be available in all regions.');
    } else {
      log('✅', `Found ${articles.length} top articles:`);
      articles.forEach((a, i) => {
        console.log(`  ${i + 1}. ${a.title}`);
        console.log(`     🔗 ${a.url} | 📊 Shares: ${a.shares}`);
      });
    }

    return articles;
  }

  // ══════════════════════════════════════════════════════════
  // 6. Reader Mode
  // ══════════════════════════════════════════════════════════

  async function readerMode() {
    log('🔄', 'Activating reader mode on current thread...');

    // Check if we're on a tweet/thread page
    const path = window.location.pathname;
    if (!path.match(/\/status\/\d+/)) {
      log('❌', 'Navigate to a tweet/thread page first (e.g., x.com/user/status/123)');
      return;
    }

    // Look for the reader mode button (available on long threads for Premium users)
    const readerBtn = document.querySelector('[data-testid="readerMode"]') ||
                      document.querySelector('[aria-label="Reader"]') ||
                      document.querySelector('[aria-label="Reader mode"]');

    if (readerBtn) {
      clickEl(readerBtn);
      log('✅', 'Reader mode toggled.');
      return;
    }

    // Fallback: create a custom reader overlay by extracting thread content
    log('⚠️', 'Native reader mode button not found. Creating custom reader view...');

    const tweets = document.querySelectorAll('article[data-testid="tweet"]');
    if (tweets.length === 0) {
      log('❌', 'No tweet content found on this page.');
      return;
    }

    // Build reader content
    let readerContent = '';
    tweets.forEach((tweet, idx) => {
      const textEl = tweet.querySelector('[data-testid="tweetText"]');
      const userEl = tweet.querySelector('[data-testid="User-Name"]') || tweet.querySelector('a[role="link"] span');
      const text = textEl ? textEl.textContent.trim() : '';
      const user = userEl ? userEl.textContent.trim() : '';
      if (text) {
        readerContent += `<div style="margin-bottom:24px;padding-bottom:24px;border-bottom:1px solid #333;">`;
        readerContent += `<div style="color:#71767b;font-size:13px;margin-bottom:8px;">${user} · Part ${idx + 1}</div>`;
        readerContent += `<div style="font-size:18px;line-height:1.6;">${text}</div>`;
        readerContent += `</div>`;
      }
    });

    // Create overlay
    const overlay = document.createElement('div');
    overlay.id = 'xactions-reader-overlay';
    overlay.style.cssText = `
      position:fixed;top:0;left:0;width:100%;height:100%;z-index:99999;
      background:#000;color:#e7e9ea;overflow-y:auto;padding:40px;
      font-family:Georgia,"Times New Roman",serif;
    `;
    overlay.innerHTML = `
      <div style="max-width:680px;margin:0 auto;">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:32px;">
          <h2 style="font-size:24px;margin:0;">📖 Reader Mode</h2>
          <button id="xactions-reader-close" style="
            background:#1d9bf0;color:#fff;border:none;border-radius:20px;
            padding:8px 20px;cursor:pointer;font-size:14px;
          ">Close Reader</button>
        </div>
        ${readerContent}
      </div>
    `;
    document.body.appendChild(overlay);

    document.getElementById('xactions-reader-close').addEventListener('click', () => {
      overlay.remove();
      log('✅', 'Reader mode closed.');
    });

    log('✅', `Reader mode active with ${tweets.length} tweet(s). Click "Close Reader" to exit.`);
  }

  // ══════════════════════════════════════════════════════════
  // 7. Extended Undo Timer
  // ══════════════════════════════════════════════════════════

  async function setUndoTimer(seconds = 30) {
    const validValues = [5, 10, 20, 30, 60];
    if (!validValues.includes(seconds)) {
      log('❌', `Invalid duration. Choose from: ${validValues.join(', ')} seconds`);
      return;
    }

    log('🔄', `Setting undo post timer to ${seconds} seconds...`);
    await navigateAndWait('https://x.com/settings/your_twitter_data');
    await sleep(1000);
    await navigateAndWait('https://x.com/settings');
    await sleep(2000);

    // Navigate to Premium settings where undo timer lives
    const premiumSettingsLink = await waitForText('premium', 'a, span') ||
                                await waitForText('your account', 'a, span');
    if (premiumSettingsLink) {
      clickEl(premiumSettingsLink.closest('a') || premiumSettingsLink);
      await sleep(2000);
    }

    // Try navigating directly to the undo setting
    await navigateAndWait('https://x.com/settings/undo_tweet');
    await sleep(2000);

    // Look for the timer duration option
    const targetLabel = `${seconds}`;
    const options = document.querySelectorAll('input[type="radio"], [role="radio"], [role="option"]');

    let found = false;
    for (const opt of options) {
      const label = opt.closest('label') || opt.parentElement;
      if (label && label.textContent.includes(targetLabel)) {
        clickEl(opt);
        found = true;
        break;
      }
    }

    if (!found) {
      // Try clicking text that contains the seconds value
      const secBtn = await waitForText(`${seconds}s`, 'span, label, div') ||
                     await waitForText(`${seconds} sec`, 'span, label, div');
      if (secBtn) {
        clickEl(secBtn.closest('label') || secBtn.closest('[role="radio"]') || secBtn);
        found = true;
      }
    }

    if (found) {
      await sleep(1000);
      // Look for save button
      const saveBtn = document.querySelector('[data-testid="Profile_Save_Button"]') ||
                      await waitForText('save', 'button');
      if (saveBtn) {
        clickEl(saveBtn.closest ? (saveBtn.closest('button') || saveBtn) : saveBtn);
        await sleep(1000);
      }
      log('✅', `Undo timer set to ${seconds} seconds.`);
    } else {
      log('⚠️', `Could not find the ${seconds}-second option. This feature requires Premium. Navigate to Settings > Premium to configure manually.`);
    }
  }

  // ══════════════════════════════════════════════════════════
  // 8. Download Video
  // ══════════════════════════════════════════════════════════

  async function downloadVideo(tweetUrl) {
    if (!tweetUrl && !window.location.pathname.match(/\/status\/\d+/)) {
      log('❌', 'Provide a tweet URL or navigate to a tweet with a video first.');
      log('❌', 'Usage: XActions.advancedPremium.downloadVideo("https://x.com/user/status/123")');
      return;
    }

    if (tweetUrl && window.location.href !== tweetUrl) {
      log('🔄', 'Navigating to tweet...');
      await navigateAndWait(tweetUrl);
      await sleep(3000);
    }

    log('🔄', 'Searching for video on this tweet...');

    // Method 1: Look for video element directly in DOM
    const videoEl = document.querySelector('video');
    if (videoEl) {
      const src = videoEl.src || videoEl.querySelector('source')?.src;
      if (src && src.startsWith('blob:')) {
        log('⚠️', 'Video uses blob URL (streaming). Attempting to extract from network...');
      } else if (src) {
        log('✅', `Video URL found: ${src}`);
        log('🔄', 'Starting download...');
        const a = document.createElement('a');
        a.href = src;
        a.download = `xactions_video_${Date.now()}.mp4`;
        a.style.display = 'none';
        document.body.appendChild(a);
        a.click();
        a.remove();
        log('✅', 'Download started.');
        return src;
      }
    }

    // Method 2: Extract tweet ID and try known video extraction patterns
    const tweetIdMatch = window.location.pathname.match(/\/status\/(\d+)/);
    if (!tweetIdMatch) {
      log('❌', 'Could not determine tweet ID from URL.');
      return;
    }
    const tweetId = tweetIdMatch[1];

    // Method 3: Check for video container and extract poster/variant URLs
    const videoContainer = document.querySelector('[data-testid="videoPlayer"]') ||
                           document.querySelector('[data-testid="videoComponent"]') ||
                           document.querySelector('div[data-testid="tweet"] video')?.closest('div');

    if (videoContainer) {
      const posterUrl = videoContainer.querySelector('video')?.poster;
      if (posterUrl) {
        // Poster URL pattern can hint at media ID
        log('🔄', `Video poster found: ${posterUrl}`);
      }
    }

    // Method 4: Intercept network requests for .mp4 or .m3u8
    log('🔄', 'Attempting to capture video URL via performance entries...');
    const entries = performance.getEntriesByType('resource');
    const videoEntries = entries.filter(e =>
      e.name.includes('.mp4') ||
      e.name.includes('video') ||
      e.name.includes('.m3u8') ||
      e.name.includes('ext_tw_video')
    );

    if (videoEntries.length > 0) {
      // Pick the highest quality (longest name usually has quality params)
      const best = videoEntries.sort((a, b) => b.name.length - a.name.length)[0];
      log('✅', `Video URL extracted: ${best.name}`);

      const a = document.createElement('a');
      a.href = best.name;
      a.download = `xactions_video_${tweetId}.mp4`;
      a.target = '_blank';
      a.style.display = 'none';
      document.body.appendChild(a);
      a.click();
      a.remove();
      log('✅', 'Download started. If it opens in a new tab, right-click and "Save As".');
      return best.name;
    }

    // Method 5: Suggest using the share menu download option (Premium feature)
    log('🔄', 'Trying Premium download button via share menu...');
    const shareBtn = document.querySelector('[data-testid="share"]');
    if (shareBtn) {
      clickEl(shareBtn);
      await sleep(1500);

      const downloadOption = await waitForText('download', 'span, [role="menuitem"]', 5000);
      if (downloadOption) {
        clickEl(downloadOption.closest('[role="menuitem"]') || downloadOption);
        log('✅', 'Premium video download initiated via share menu.');
        return;
      }
    }

    log('⚠️', `Could not extract video automatically for tweet ${tweetId}.`);
    log('⚠️', 'Tips: 1) Make sure the video has fully loaded. 2) Try refreshing and running again.');
    log('⚠️', `Fallback: Open https://twitsave.com/info?url=https://x.com/i/status/${tweetId}`);
  }

  // ══════════════════════════════════════════════════════════
  // 9. Verified-Only Replies Toggle
  // ══════════════════════════════════════════════════════════

  async function verifiedOnlyReplies(enable = true) {
    log('🔄', `${enable ? 'Enabling' : 'Disabling'} verified-only replies...`);

    // Check if we're on the compose screen or a tweet
    const composeArea = document.querySelector('[data-testid="tweetTextarea_0"]');

    if (composeArea) {
      // We're in compose mode — look for the reply settings button
      log('🔄', 'Compose box detected. Looking for reply settings...');

      // The "Everyone can reply" / reply restriction button
      const replySettingsBtn = document.querySelector('[data-testid="replyRestriction"]') ||
                               await waitForText('everyone can reply', 'button, span, div', 5000) ||
                               await waitForText('who can reply', 'button, span, div', 5000);

      if (replySettingsBtn) {
        clickEl(replySettingsBtn.closest('button') || replySettingsBtn);
        await sleep(1500);

        if (enable) {
          const verifiedOption = await waitForText('verified', 'span, [role="menuitem"], [role="option"]', 5000) ||
                                 await waitForText('verified accounts', 'span, [role="menuitem"]', 5000);
          if (verifiedOption) {
            clickEl(verifiedOption.closest('[role="menuitem"]') || verifiedOption.closest('[role="option"]') || verifiedOption);
            log('✅', 'Replies restricted to verified accounts only.');
          } else {
            log('⚠️', 'Could not find "Verified" option. This requires Premium.');
          }
        } else {
          const everyoneOption = await waitForText('everyone', 'span, [role="menuitem"], [role="option"]', 5000);
          if (everyoneOption) {
            clickEl(everyoneOption.closest('[role="menuitem"]') || everyoneOption.closest('[role="option"]') || everyoneOption);
            log('✅', 'Replies opened to everyone.');
          }
        }
      } else {
        log('⚠️', 'Reply settings button not found. Click the "Everyone can reply" link in the compose area.');
      }
    } else {
      // Not in compose mode — set the default in settings
      log('🔄', 'Not in compose mode. Navigating to audience settings...');
      await navigateAndWait('https://x.com/settings/audience_and_tagging');
      await sleep(2000);

      // Look for reply settings
      const replyOption = await waitForText('verified', 'span, label, div', 5000);
      if (replyOption && enable) {
        clickEl(replyOption.closest('label') || replyOption.closest('[role="radio"]') || replyOption);
        log('✅', 'Default reply setting changed to verified accounts only.');
      } else if (!enable) {
        const everyoneOption = await waitForText('everyone', 'span, label, div', 5000);
        if (everyoneOption) {
          clickEl(everyoneOption.closest('label') || everyoneOption.closest('[role="radio"]') || everyoneOption);
          log('✅', 'Default reply setting changed to everyone.');
        }
      } else {
        log('⚠️', 'Could not find reply restriction settings. Open compose box and use this from there.');
        log('⚠️', 'Or open Settings > Privacy and Safety > Audience and Tagging.');
      }
    }
  }

  // ══════════════════════════════════════════════════════════
  // 🎯 Expose API & Print Menu
  // ══════════════════════════════════════════════════════════

  window.XActions = window.XActions || {};
  window.XActions.advancedPremium = {
    subscribePremium,
    cancelPremium,
    changeTier,
    giftPremium,
    topArticles,
    readerMode,
    setUndoTimer,
    downloadVideo,
    verifiedOnlyReplies,
  };

  console.log('╔══════════════════════════════════════════════════════════════╗');
  console.log('║  ⭐ XACTIONS ADVANCED PREMIUM                              ║');
  console.log('║  by nichxbt                                                 ║');
  console.log('╠══════════════════════════════════════════════════════════════╣');
  console.log('║                                                             ║');
  console.log('║  XActions.advancedPremium.subscribePremium(tier)             ║');
  console.log('║    → Subscribe to Premium (basic/premium/premium+)          ║');
  console.log('║                                                             ║');
  console.log('║  XActions.advancedPremium.cancelPremium()                    ║');
  console.log('║    → Cancel your Premium subscription                       ║');
  console.log('║                                                             ║');
  console.log('║  XActions.advancedPremium.changeTier(tier)                   ║');
  console.log('║    → Upgrade/downgrade tier (basic/premium/premium+)        ║');
  console.log('║                                                             ║');
  console.log('║  XActions.advancedPremium.giftPremium("username")            ║');
  console.log('║    → Gift Premium to another user                           ║');
  console.log('║                                                             ║');
  console.log('║  XActions.advancedPremium.topArticles(limit)                 ║');
  console.log('║    → Scrape top shared articles (default: 20)               ║');
  console.log('║                                                             ║');
  console.log('║  XActions.advancedPremium.readerMode()                       ║');
  console.log('║    → Toggle reader mode on current thread                   ║');
  console.log('║                                                             ║');
  console.log('║  XActions.advancedPremium.setUndoTimer(seconds)              ║');
  console.log('║    → Set undo timer (5/10/20/30/60 seconds)                 ║');
  console.log('║                                                             ║');
  console.log('║  XActions.advancedPremium.downloadVideo(tweetUrl?)           ║');
  console.log('║    → Download video from tweet                              ║');
  console.log('║                                                             ║');
  console.log('║  XActions.advancedPremium.verifiedOnlyReplies(enable?)       ║');
  console.log('║    → Toggle verified-only replies (default: true)           ║');
  console.log('║                                                             ║');
  console.log('╚══════════════════════════════════════════════════════════════╝');

})();
