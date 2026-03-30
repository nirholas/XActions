// Edit Post & Undo Post on X - by nichxbt
// https://github.com/nirholas/xactions
// Edit an existing post or undo a recently posted tweet (Premium feature, 30s window)
// 1. Go to x.com
// 2. Open Developer Console (F12)
// 3. Edit CONFIG below
// 4. Paste and run
//
// Last Updated: 30 March 2026
(() => {
  'use strict';

  const CONFIG = {
    // ── Mode: 'edit' or 'undo' ──
    mode: 'edit',               // 'edit' = edit an existing post, 'undo' = undo last post

    // ── Edit Mode Settings ──
    postUrl: '',                // Full URL of the post to edit, e.g. 'https://x.com/nichxbt/status/123456789'
    newText: '',                // New text to replace the post content with

    // ── Undo Mode Settings ──
    // After posting, the undo banner appears for ~30 seconds (Premium only)
    // Set mode to 'undo' and run this script immediately after posting

    // ── Timing ──
    minDelay: 1000,
    maxDelay: 2000,
    navigationDelay: 3000,      // Wait for page/modal to load
  };

  // ── Selectors ──
  const SEL = {
    caret:          '[data-testid="caret"]',
    editTweet:      '[data-testid="editTweet"]',
    tweetTextarea:  '[data-testid="tweetTextarea_0"]',
    tweetButton:    '[data-testid="tweetButton"]',
    undoTweet:      '[data-testid="undoTweet"]',
    tweet:          'article[data-testid="tweet"]',
    menuItem:       '[role="menuitem"]',
  };

  // ── Utilities ──
  const sleep = (ms) => new Promise(r => setTimeout(r, ms));
  const randomDelay = () => Math.floor(Math.random() * (CONFIG.maxDelay - CONFIG.minDelay + 1)) + CONFIG.minDelay;

  const waitForElement = async (selector, timeout = 10000) => {
    const start = Date.now();
    while (Date.now() - start < timeout) {
      const el = document.querySelector(selector);
      if (el) return el;
      await sleep(200);
    }
    return null;
  };

  // ── Edit Post ──
  const editPost = async () => {
    if (!CONFIG.postUrl) {
      console.error('❌ Please set CONFIG.postUrl to the URL of the post you want to edit.');
      return;
    }
    if (!CONFIG.newText) {
      console.error('❌ Please set CONFIG.newText to the replacement text.');
      return;
    }

    // Navigate to the post if not already there
    if (!window.location.href.includes(CONFIG.postUrl.replace('https://x.com', ''))) {
      console.log('🔄 Navigating to post...');
      window.location.href = CONFIG.postUrl;
      await sleep(CONFIG.navigationDelay);
    }

    // Find and click the caret (three-dot menu) on the tweet
    console.log('🔄 Opening post menu...');
    const tweet = await waitForElement(SEL.tweet);
    if (!tweet) {
      console.error('❌ Could not find the tweet on this page.');
      return;
    }

    const caret = tweet.querySelector(SEL.caret);
    if (!caret) {
      console.error('❌ Could not find the menu button (caret) on this tweet.');
      return;
    }
    caret.click();
    await sleep(randomDelay());

    // Click "Edit post" from the dropdown
    console.log('🔄 Clicking "Edit post"...');
    const editBtn = await waitForElement(SEL.editTweet);
    if (!editBtn) {
      // Fallback: search menu items by text
      const menuItems = document.querySelectorAll(SEL.menuItem);
      let found = false;
      for (const item of menuItems) {
        if (item.textContent.toLowerCase().includes('edit')) {
          item.click();
          found = true;
          break;
        }
      }
      if (!found) {
        console.error('❌ "Edit post" option not found. Make sure you own this post and have edit privileges.');
        return;
      }
    } else {
      editBtn.click();
    }
    await sleep(CONFIG.navigationDelay);

    // Clear existing text and type new text
    console.log('🔄 Editing post text...');
    const textarea = await waitForElement(SEL.tweetTextarea);
    if (!textarea) {
      console.error('❌ Could not find the text editor.');
      return;
    }

    // Focus and select all existing text
    textarea.focus();
    await sleep(300);

    // Select all text and replace
    document.execCommand('selectAll', false, null);
    await sleep(200);
    document.execCommand('insertText', false, CONFIG.newText);
    await sleep(randomDelay());

    // Click the save/update button
    console.log('🔄 Saving edited post...');
    const saveBtn = await waitForElement(SEL.tweetButton);
    if (!saveBtn) {
      console.error('❌ Could not find the save button.');
      return;
    }
    saveBtn.click();
    await sleep(randomDelay());

    console.log('✅ Post edited successfully!');
    console.log(`   New text: "${CONFIG.newText}"`);
  };

  // ── Undo Post ──
  const undoPost = async () => {
    console.log('🔄 Looking for undo button...');
    console.log('⚠️  Undo is only available for ~30 seconds after posting (Premium feature).');

    const undoBtn = await waitForElement(SEL.undoTweet, 5000);
    if (!undoBtn) {
      console.error('❌ Undo button not found. The undo window may have expired (30s limit).');
      console.log('💡 Tip: Run this script immediately after posting to catch the undo window.');
      return;
    }

    undoBtn.click();
    await sleep(randomDelay());
    console.log('✅ Post undone successfully! The tweet has been retracted.');
  };

  // ── Main ──
  const run = async () => {
    console.log('═══════════════════════════════════════');
    console.log('✏️  XActions — Edit / Undo Post');
    console.log('═══════════════════════════════════════');

    if (CONFIG.mode === 'undo') {
      await undoPost();
    } else if (CONFIG.mode === 'edit') {
      await editPost();
    } else {
      console.error(`❌ Invalid mode: "${CONFIG.mode}". Use 'edit' or 'undo'.`);
    }

    console.log('═══════════════════════════════════════');
    console.log('🏁 Done! — by nichxbt');
  };

  run();
})();
