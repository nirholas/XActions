// Copyright (c) 2024-2026 nich (@nichxbt). Licensed under the Apache License, Version 2.0.
// scripts/articlePublisher.js
// Browser console script for publishing long-form articles on X (Premium+ required)
// Paste in DevTools console on x.com/compose/article
// by nichxbt

(() => {
  const sleep = (ms) => new Promise(r => setTimeout(r, ms));

  // =============================================
  // CONFIGURATION
  // =============================================
  const CONFIG = {
    title: 'My Article',
    body: 'Article content goes here. Replace this with your full article text.',
    action: 'draft',          // 'draft' | 'publish'
    dryRun: true,             // SET FALSE TO EXECUTE
  };
  // =============================================

  const SELECTORS = {
    title: '[data-testid="articleTitle"], h1[contenteditable]',
    body: '[data-testid="articleBody"], [data-testid="richTextEditor"]',
    publish: '[data-testid="articlePublish"]',
    saveDraft: '[data-testid="articleSaveDraft"]',
  };

  const typeInto = async (el, text) => {
    el.focus();
    // Use execCommand for contenteditable elements
    if (el.contentEditable === 'true') {
      document.execCommand('selectAll', false, null);
      document.execCommand('insertText', false, text);
    } else {
      // For regular inputs
      const nativeSet = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set
        || Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')?.set;
      if (nativeSet) {
        nativeSet.call(el, text);
        el.dispatchEvent(new Event('input', { bubbles: true }));
      } else {
        el.value = text;
        el.dispatchEvent(new Event('input', { bubbles: true }));
      }
    }
    await sleep(300);
  };

  const run = async () => {
    console.log('📝 Article Publisher — Long-form Content');
    console.log('━'.repeat(50));
    console.log(`  Title:  "${CONFIG.title}"`);
    console.log(`  Body:   ${CONFIG.body.length} chars`);
    console.log(`  Action: ${CONFIG.action}`);
    console.log(`  Dry run: ${CONFIG.dryRun}`);
    console.log('');

    // Check we're on the right page
    if (!window.location.href.includes('/compose/article')) {
      console.log('⚠️ Navigate to x.com/compose/article first (Premium+ required).');
      console.log('🔗 Redirecting...');
      window.location.href = 'https://x.com/compose/article';
      return;
    }

    await sleep(2000);

    // Find title input
    const titleEl = document.querySelector(SELECTORS.title);
    if (!titleEl) {
      console.error('❌ Title field not found. Premium+ may be required, or the page hasn\'t loaded.');
      console.log('   Tried selectors:', SELECTORS.title);
      return;
    }

    // Find body editor
    const bodyEl = document.querySelector(SELECTORS.body);
    if (!bodyEl) {
      console.error('❌ Body editor not found.');
      console.log('   Tried selectors:', SELECTORS.body);
      return;
    }

    console.log('✅ Found title and body fields.');

    if (CONFIG.dryRun) {
      console.log('\n🔒 DRY RUN — no changes made.');
      console.log('   Would fill title:', CONFIG.title);
      console.log('   Would fill body:', CONFIG.body.slice(0, 100) + (CONFIG.body.length > 100 ? '...' : ''));
      console.log(`   Would ${CONFIG.action === 'publish' ? 'PUBLISH' : 'SAVE DRAFT'}`);
      console.log('\n💡 Set CONFIG.dryRun = false to execute.');
      return;
    }

    // Fill title
    console.log('📝 Filling title...');
    await typeInto(titleEl, CONFIG.title);
    console.log('✅ Title entered.');

    // Fill body
    console.log('📝 Filling body...');
    await typeInto(bodyEl, CONFIG.body);
    console.log('✅ Body entered.');

    await sleep(1000);

    // Perform action
    if (CONFIG.action === 'publish') {
      const publishBtn = document.querySelector(SELECTORS.publish);
      if (!publishBtn) {
        console.error('❌ Publish button not found. Saving as draft instead.');
        const draftBtn = document.querySelector(SELECTORS.saveDraft);
        if (draftBtn) {
          draftBtn.click();
          console.log('💾 Saved as draft (publish button unavailable).');
        }
        return;
      }
      console.log('🚀 Publishing article...');
      publishBtn.click();
      await sleep(3000);
      console.log('✅ Article published!');
    } else {
      const draftBtn = document.querySelector(SELECTORS.saveDraft);
      if (!draftBtn) {
        console.error('❌ Save Draft button not found.');
        console.log('   Tried selector:', SELECTORS.saveDraft);
        return;
      }
      console.log('💾 Saving draft...');
      draftBtn.click();
      await sleep(2000);
      console.log('✅ Draft saved!');
    }

    console.log('\n📊 Summary:');
    console.log(`  Title:  ${CONFIG.title}`);
    console.log(`  Length: ${CONFIG.body.length} characters`);
    console.log(`  Action: ${CONFIG.action === 'publish' ? 'Published' : 'Saved as draft'}`);
    console.log(`  Time:   ${new Date().toLocaleString()}`);
  };

  run();
})();
