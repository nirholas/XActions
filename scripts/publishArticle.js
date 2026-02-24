// scripts/publishArticle.js
// Browser console script for publishing articles on X/Twitter (Premium+)
// Paste in DevTools console on x.com/compose/article
// by nichxbt

(() => {
  const sleep = (ms) => new Promise(r => setTimeout(r, ms));

  // =============================================
  // CONFIGURE YOUR ARTICLE HERE
  // =============================================
  const ARTICLE = {
    title: 'My Article Title',
    body: `This is the body of my article.
    
You can write long-form content here with multiple paragraphs.

## Section Heading

Add sections, lists, and formatting:

- Point one
- Point two
- Point three

This requires Premium+ ($16/mo).`,
  };
  // =============================================

  const SELECTORS = {
    titleInput: '[data-testid="articleTitle"], [contenteditable][aria-label*="title" i], h1[contenteditable]',
    bodyEditor: '[data-testid="articleBody"], [contenteditable][role="textbox"], [data-testid="richTextEditor"]',
    publishButton: '[data-testid="articlePublish"], button[data-testid*="publish" i]',
    saveDraft: '[data-testid="articleSaveDraft"], button[data-testid*="draft" i]',
  };

  const typeInElement = async (selector, text) => {
    const el = document.querySelector(selector);
    if (!el) {
      console.log(`⚠️ Element not found: ${selector}`);
      return false;
    }

    el.focus();
    await sleep(200);

    if (el.contentEditable === 'true') {
      // For contenteditable elements
      for (const char of text) {
        if (char === '\n') {
          document.execCommand('insertLineBreak', false);
        } else {
          document.execCommand('insertText', false, char);
        }
        await sleep(5);
      }
    } else {
      // For input/textarea elements
      for (const char of text) {
        el.dispatchEvent(new InputEvent('beforeinput', { data: char, inputType: 'insertText', bubbles: true }));
        document.execCommand('insertText', false, char);
        await sleep(5);
      }
    }

    return true;
  };

  const run = async () => {
    console.log('📄 XActions Article Publisher');
    console.log('============================');

    if (!window.location.href.includes('compose/article') && !window.location.href.includes('articles')) {
      console.log('⚠️ Navigate to x.com/compose/article first');
      console.log('   (Requires Premium+ subscription)');
      return;
    }

    // Enter title
    console.log('📝 Entering title...');
    const titleSuccess = await typeInElement(SELECTORS.titleInput, ARTICLE.title);
    if (titleSuccess) {
      console.log(`  ✅ Title: "${ARTICLE.title}"`);
    } else {
      console.log('  ❌ Title input not found — may need Premium+');
      return;
    }
    await sleep(1000);

    // Enter body
    console.log('📝 Entering body...');
    const bodySuccess = await typeInElement(SELECTORS.bodyEditor, ARTICLE.body);
    if (bodySuccess) {
      console.log(`  ✅ Body: ${ARTICLE.body.length} characters`);
    }
    await sleep(1000);

    console.log('\n📄 Article ready to publish!');
    console.log('   Click the publish button or run:');
    console.log('   document.querySelector("[data-testid=articlePublish]")?.click()');
  };

  run();
})();
