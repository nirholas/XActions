// scripts/grokIntegration.js
// Browser console script to interact with Grok AI on X/Twitter
// Paste in DevTools console on x.com/i/grok
// by nichxbt

(() => {
  const sleep = (ms) => new Promise(r => setTimeout(r, ms));

  // =============================================
  // CONFIGURE YOUR GROK QUERY HERE
  // =============================================
  const QUERY = 'Summarize the top tech trends on X today';
  const WAIT_FOR_RESPONSE = 15000; // ms to wait for Grok response
  // =============================================

  const SELECTORS = {
    chatInput: '[data-testid="grokInput"], textarea[placeholder*="Ask"], [contenteditable][role="textbox"]',
    sendButton: '[data-testid="grokSendButton"], button[aria-label="Send"], button[data-testid*="send"]',
    responseArea: '[data-testid="grokResponse"], [data-testid="grokResponseText"]',
    newChat: '[data-testid="grokNewChat"], a[href="/i/grok"]',
  };

  const run = async () => {
    console.log('🤖 XActions Grok Integration');
    console.log('============================');

    if (!window.location.href.includes('grok')) {
      console.log('⚠️ Navigate to x.com/i/grok first');
      console.log('   Opening Grok...');
      window.location.href = 'https://x.com/i/grok';
      return;
    }

    await sleep(2000);

    // Find input
    const input = document.querySelector(SELECTORS.chatInput);
    if (!input) {
      console.log('❌ Grok input not found. Make sure you have access to Grok.');
      return;
    }

    // Type query
    console.log(`📝 Query: "${QUERY}"`);
    input.focus();
    await sleep(200);

    if (input.contentEditable === 'true') {
      for (const char of QUERY) {
        document.execCommand('insertText', false, char);
        await sleep(10);
      }
    } else {
      // For regular input/textarea
      const nativeSetter = Object.getOwnPropertyDescriptor(
        HTMLTextAreaElement.prototype, 'value'
      )?.set || Object.getOwnPropertyDescriptor(
        HTMLInputElement.prototype, 'value'
      )?.set;

      if (nativeSetter) {
        nativeSetter.call(input, QUERY);
        input.dispatchEvent(new Event('input', { bubbles: true }));
      }
    }
    await sleep(500);

    // Send
    const sendBtn = document.querySelector(SELECTORS.sendButton);
    if (sendBtn) {
      sendBtn.click();
      console.log('📤 Query sent, waiting for response...');
    }

    // Wait for response
    await sleep(WAIT_FOR_RESPONSE);

    // Extract response
    const responseEls = document.querySelectorAll(SELECTORS.responseArea);
    let response = '';
    if (responseEls.length > 0) {
      response = responseEls[responseEls.length - 1]?.textContent?.trim() || '';
    }

    // Fallback: try to get any new content that appeared
    if (!response) {
      const allText = document.querySelectorAll('[data-testid*="grok"], [class*="markdown"]');
      if (allText.length > 0) {
        response = allText[allText.length - 1]?.textContent?.trim() || '';
      }
    }

    if (response) {
      console.log('\n🤖 Grok Response:');
      console.log('─'.repeat(40));
      console.log(response);
      console.log('─'.repeat(40));
    } else {
      console.log('\n⚠️ Could not extract response. It may still be loading.');
      console.log('   Try increasing WAIT_FOR_RESPONSE or check the page manually.');
    }

    const result = {
      query: QUERY,
      response: response || 'Response not captured',
      timestamp: new Date().toISOString(),
    };

    try {
      await navigator.clipboard.writeText(response || JSON.stringify(result, null, 2));
      console.log('\n✅ Response copied to clipboard!');
    } catch (e) {}
  };

  run();
})();
