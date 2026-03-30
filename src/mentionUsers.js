// Mention Users in Posts on X - by nichxbt
// https://github.com/nirholas/xactions
// Compose a post mentioning multiple users with auto @mentions
// 1. Go to x.com
// 2. Open Developer Console (F12)
// 3. Edit CONFIG below
// 4. Paste and run
//
// Last Updated: 30 March 2026
(() => {
  'use strict';

  const CONFIG = {
    // ── Users to Mention ──
    usernames: [
      // 'nichxbt',
      // 'elonmusk',
      // 'openai',
    ],

    // ── Tweet Content ──
    messageBeforeMentions: '',   // Text before the @mentions (e.g., 'Check this out')
    messageAfterMentions: '',    // Text after the @mentions (e.g., 'What do you think?')

    // ── Batching (to avoid spam detection) ──
    batchSize: 5,               // Max mentions per tweet (X may flag too many)
    createMultipleTweets: false, // true = split into multiple tweets if > batchSize

    // ── Behavior ──
    autoPost: false,            // true = automatically post, false = compose only (review first)
    openComposer: true,         // true = click compose button if not already open

    // ── Timing ──
    minDelay: 1000,
    maxDelay: 2000,
    typingDelay: 100,           // Delay between characters for natural typing
  };

  // ── Selectors ──
  const SEL = {
    tweetTextarea:  '[data-testid="tweetTextarea_0"]',
    tweetButton:    '[data-testid="tweetButton"]',
    composeBtn:     'a[data-testid="SideNav_NewTweet_Button"]',
    tweetText:      '[data-testid="tweetText"]',
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

  // ── Validate Usernames ──
  const validateUsernames = (usernames) => {
    const valid = [];
    const invalid = [];

    for (const u of usernames) {
      // Remove @ prefix if included
      const cleaned = u.replace(/^@/, '').trim();
      if (!cleaned) continue;

      // X usernames: 1-15 chars, alphanumeric + underscores
      if (/^[a-zA-Z0-9_]{1,15}$/.test(cleaned)) {
        valid.push(cleaned);
      } else {
        invalid.push(u);
      }
    }

    return { valid, invalid };
  };

  // ── Build Tweet Text ──
  const buildTweetText = (usernames) => {
    const mentions = usernames.map(u => `@${u}`).join(' ');
    const parts = [];

    if (CONFIG.messageBeforeMentions) parts.push(CONFIG.messageBeforeMentions);
    parts.push(mentions);
    if (CONFIG.messageAfterMentions) parts.push(CONFIG.messageAfterMentions);

    return parts.join('\n\n');
  };

  // ── Compose a Tweet ──
  const composeTweet = async (text, shouldPost = false) => {
    // Open composer if needed
    if (CONFIG.openComposer) {
      const composeBtn = document.querySelector(SEL.composeBtn);
      if (composeBtn && !document.querySelector(SEL.tweetTextarea)) {
        console.log('🔄 Opening tweet composer...');
        composeBtn.click();
        await sleep(1500);
      }
    }

    // Find the textarea
    const textarea = await waitForElement(SEL.tweetTextarea);
    if (!textarea) {
      console.error('❌ Could not find the tweet compose box.');
      console.log('💡 Try clicking the "Post" button first to open the composer.');
      return false;
    }

    // Focus and type the text
    textarea.focus();
    await sleep(300);

    // Use insertText for proper React state updates
    document.execCommand('insertText', false, text);
    await sleep(randomDelay());

    // Check character count
    const charCount = text.length;
    if (charCount > 280) {
      console.warn(`⚠️  Tweet is ${charCount} characters (limit: 280). Consider reducing mentions.`);
    } else {
      console.log(`📝 Character count: ${charCount}/280`);
    }

    // Auto-post if configured
    if (shouldPost) {
      console.log('🔄 Posting tweet...');
      const postBtn = await waitForElement(SEL.tweetButton);
      if (!postBtn) {
        console.error('❌ Could not find the post button.');
        return false;
      }

      if (postBtn.disabled || postBtn.getAttribute('aria-disabled') === 'true') {
        console.error('❌ Post button is disabled. Check for errors in your tweet.');
        return false;
      }

      postBtn.click();
      await sleep(randomDelay());
      console.log('✅ Tweet posted!');
      return true;
    }

    console.log('✅ Tweet composed! Review and click "Post" when ready.');
    return true;
  };

  // ── Main ──
  const run = async () => {
    console.log('═══════════════════════════════════════');
    console.log('📢 XActions — Mention Users');
    console.log('═══════════════════════════════════════');

    if (CONFIG.usernames.length === 0) {
      console.error('❌ Please add usernames to CONFIG.usernames.');
      console.log('💡 Example: usernames: ["nichxbt", "elonmusk"]');
      return;
    }

    // Validate usernames
    const { valid, invalid } = validateUsernames(CONFIG.usernames);

    if (invalid.length > 0) {
      console.warn(`⚠️  Invalid usernames (skipped): ${invalid.join(', ')}`);
    }

    if (valid.length === 0) {
      console.error('❌ No valid usernames found.');
      return;
    }

    console.log(`👥 Mentioning ${valid.length} users: ${valid.map(u => '@' + u).join(', ')}`);

    // Split into batches if needed
    const batches = [];
    if (CONFIG.createMultipleTweets && valid.length > CONFIG.batchSize) {
      for (let i = 0; i < valid.length; i += CONFIG.batchSize) {
        batches.push(valid.slice(i, i + CONFIG.batchSize));
      }
      console.log(`📦 Split into ${batches.length} batches of up to ${CONFIG.batchSize} mentions each.`);
    } else {
      batches.push(valid);
      if (valid.length > CONFIG.batchSize) {
        console.warn(`⚠️  ${valid.length} mentions in one tweet. Consider enabling createMultipleTweets.`);
      }
    }

    let successCount = 0;

    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i];

      if (batches.length > 1) {
        console.log(`\n🔄 Batch ${i + 1}/${batches.length} (${batch.length} mentions)...`);
      }

      const tweetText = buildTweetText(batch);
      console.log(`📝 Tweet preview:\n${tweetText}`);

      const shouldPost = CONFIG.autoPost && (i < batches.length - 1 || CONFIG.autoPost);
      const success = await composeTweet(tweetText, shouldPost);

      if (success) {
        successCount++;
      } else {
        console.error(`❌ Failed to compose batch ${i + 1}.`);
        break;
      }

      // Wait between batches
      if (i < batches.length - 1) {
        const waitTime = randomDelay() * 2;
        console.log(`⏳ Waiting ${Math.round(waitTime / 1000)}s before next batch...`);
        await sleep(waitTime);
      }
    }

    // Store mention history in sessionStorage
    const history = JSON.parse(sessionStorage.getItem('xactions_mentions') || '[]');
    history.push({
      timestamp: new Date().toISOString(),
      usernames: valid,
      batches: batches.length,
      posted: CONFIG.autoPost,
    });
    sessionStorage.setItem('xactions_mentions', JSON.stringify(history));

    console.log('');
    console.log(`✅ ${successCount}/${batches.length} batches composed.`);
    console.log('═══════════════════════════════════════');
    console.log('🏁 Done! — by nichxbt');
  };

  run();
})();
