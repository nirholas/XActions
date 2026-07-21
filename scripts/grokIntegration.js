// Copyright (c) 2024-2026 nich (@nichxbt). Licensed under the Apache License, Version 2.0.
// scripts/grokIntegration.js
// Browser console script for interacting with Grok AI on X
// Paste in DevTools console on x.com/i/grok
// by nichxbt

(() => {
  const sleep = (ms) => new Promise(r => setTimeout(r, ms));

  // =============================================
  // CONFIGURATION
  // =============================================
  const CONFIG = {
    prompt: 'Analyze the latest tech trends on X',
    waitForResponse: true,
    maxWaitMs: 30000,
  };
  // =============================================

  const SELECTORS = {
    input: '[data-testid="grokInput"], textarea[placeholder*="Ask"], textarea[placeholder*="ask"], [contenteditable="true"]',
    send: '[data-testid="grokSendButton"], button[aria-label="Send"], button[data-testid*="send"]',
    response: '[data-testid="grokResponse"], [data-testid="grokResponseText"]',
    newChat: '[data-testid="grokNewChat"], a[href="/i/grok"]',
  };

  const findEl = (selectorString) => {
    for (const sel of selectorString.split(',').map(s => s.trim())) {
      const el = document.querySelector(sel);
      if (el) return el;
    }
    return null;
  };

  const typeInto = async (el, text) => {
    el.focus();
    await sleep(200);
    if (el.contentEditable === 'true') {
      document.execCommand('selectAll', false, null);
      document.execCommand('insertText', false, text);
    } else {
      const nativeSet = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')?.set
        || Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
      if (nativeSet) {
        nativeSet.call(el, text);
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
      } else {
        el.value = text;
        el.dispatchEvent(new Event('input', { bubbles: true }));
      }
    }
    await sleep(300);
  };

  const waitForResponse = async (maxMs) => {
    const startTime = Date.now();
    let lastLength = 0;
    let stableCount = 0;

    console.log('⏳ Waiting for Grok response...');

    while (Date.now() - startTime < maxMs) {
      const responseEls = document.querySelectorAll(SELECTORS.response);
      if (responseEls.length > 0) {
        const lastEl = responseEls[responseEls.length - 1];
        const currentLength = (lastEl.textContent || '').length;

        if (currentLength > 0 && currentLength === lastLength) {
          stableCount++;
          if (stableCount >= 3) {
            console.log('✅ Response received.');
            return lastEl.textContent.trim();
          }
        } else {
          stableCount = 0;
          lastLength = currentLength;
        }
      }

      await sleep(1000);
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(0);
      if (parseInt(elapsed) % 5 === 0 && parseInt(elapsed) > 0) {
        console.log(`   ⏳ Still waiting... (${elapsed}s)`);
      }
    }

    // Timeout — grab whatever is there
    const responseEls = document.querySelectorAll(SELECTORS.response);
    if (responseEls.length > 0) {
      const text = responseEls[responseEls.length - 1].textContent?.trim();
      if (text) {
        console.log('⚠️ Timeout reached, but partial response captured.');
        return text;
      }
    }

    // Fallback: try markdown or grok-related elements
    const fallback = document.querySelectorAll('[data-testid*="grok"], [class*="markdown"]');
    if (fallback.length > 0) {
      const text = fallback[fallback.length - 1].textContent?.trim();
      if (text) return text;
    }

    return null;
  };

  const run = async () => {
    console.log('🤖 Grok Integration — AI Assistant');
    console.log('━'.repeat(50));
    console.log(`  Prompt: "${CONFIG.prompt.slice(0, 80)}${CONFIG.prompt.length > 80 ? '...' : ''}"`);
    console.log(`  Max wait: ${CONFIG.maxWaitMs / 1000}s`);
    console.log('');

    // Check page
    if (!window.location.href.includes('/i/grok')) {
      console.log('⚠️ Navigate to x.com/i/grok first.');
      console.log('🔗 Redirecting...');
      window.location.href = 'https://x.com/i/grok';
      return;
    }

    await sleep(2000);

    // Find input
    const inputEl = findEl(SELECTORS.input);
    if (!inputEl) {
      console.error('❌ Grok input field not found.');
      console.log('   Tried selectors:', SELECTORS.input);
      console.log('   Make sure the Grok page is fully loaded.');
      return;
    }

    console.log('✅ Found Grok input field.');

    // Type prompt
    console.log('📝 Typing prompt...');
    await typeInto(inputEl, CONFIG.prompt);
    await sleep(500);

    // Find and click send
    const sendBtn = findEl(SELECTORS.send);
    if (!sendBtn) {
      console.error('❌ Send button not found. Trying Enter key...');
      inputEl.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
      await sleep(500);
    } else {
      console.log('🚀 Sending prompt...');
      sendBtn.click();
    }

    await sleep(1000);

    // Wait for response
    if (CONFIG.waitForResponse) {
      const response = await waitForResponse(CONFIG.maxWaitMs);

      if (response) {
        console.log('\n━━━ 🤖 GROK RESPONSE ━━━');
        console.log(response);
        console.log('━'.repeat(50));

        console.log(`\n📊 Response stats:`);
        console.log(`  Length: ${response.length} characters`);
        console.log(`  Words: ~${response.split(/\s+/).length}`);
        console.log(`  Time: ${new Date().toLocaleString()}`);

        try {
          await navigator.clipboard.writeText(response);
          console.log('📋 Response copied to clipboard!');
        } catch (e) {}
      } else {
        console.log('❌ No response received within timeout.');
        console.log(`   Try increasing CONFIG.maxWaitMs (currently ${CONFIG.maxWaitMs}ms).`);
        console.log('   Or check if Grok is available in your region/account.');
      }
    } else {
      console.log('⏭️ Not waiting for response (CONFIG.waitForResponse = false).');
      console.log('   Check the Grok chat for the reply.');
    }

    console.log('\n✅ Grok integration complete.');
  };

  run();
})();
