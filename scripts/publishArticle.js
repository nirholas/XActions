// GENERATED FILE: a copy of browser/articlePublisher.js, written by scripts/build-script-manifest.mjs. Edit browser/articlePublisher.js instead, then run: npm run browser:build
// Copyright (c) 2024-2026 nich (@nichxbt). Licensed under the Apache License, Version 2.0.
/**
 * @name        articlePublisher.js
 * @title       Article Publisher
 * @description Fill in a long-form X Article and save it as a draft, publish it, or leave it filled for you to review (Premium+).
 * @category    post
 * @page        x.com/compose/article
 * @writes      true
 * @aliases     scripts/articlePublisher.js, scripts/publishArticle.js
 * @author      nichxbt (https://x.com/nichxbt)
 * @version     1.1.0
 * @date        2026-11-26
 *
 * Browser console script for publishing long-form articles on X (Premium+ required).
 * Paste browser/articlePublisher.js in the DevTools console on x.com/compose/article.
 *
 * CONFIG.action:
 *   'draft'   fill the article and click Save Draft
 *   'publish' fill the article and click Publish (falls back to Save Draft)
 *   'fill'    fill the title and body only, then stop so you can review and click Publish yourself
 */

(() => {
  const sleep = (ms) => new Promise(r => setTimeout(r, ms));

  // =============================================
  // CONFIGURATION
  // =============================================
  const CONFIG = {
    title: 'My Article',
    body: 'Article content goes here. Replace this with your full article text.',
    action: 'draft',          // 'draft' | 'publish' | 'fill'
    dryRun: true,             // SET FALSE TO EXECUTE
    typeCharByChar: false,    // true: type one character at a time, newlines as line breaks (slower, keeps paragraphs)
    charDelay: 5,             // ms between characters when typeCharByChar is true
  };
  // =============================================

  const SELECTORS = {
    title: '[data-testid="articleTitle"], [contenteditable][aria-label*="title" i], h1[contenteditable]',
    body: '[data-testid="articleBody"], [data-testid="richTextEditor"], [contenteditable][role="textbox"]',
    publish: '[data-testid="articlePublish"], button[data-testid*="publish" i]',
    saveDraft: '[data-testid="articleSaveDraft"], button[data-testid*="draft" i]',
  };

  const typeCharByChar = async (el, text) => {
    if (el.contentEditable === 'true') {
      for (const char of text) {
        if (char === '\n') {
          document.execCommand('insertLineBreak', false);
        } else {
          document.execCommand('insertText', false, char);
        }
        await sleep(CONFIG.charDelay);
      }
    } else {
      for (const char of text) {
        el.dispatchEvent(new InputEvent('beforeinput', { data: char, inputType: 'insertText', bubbles: true }));
        document.execCommand('insertText', false, char);
        await sleep(CONFIG.charDelay);
      }
    }
  };

  const typeInto = async (el, text) => {
    el.focus();
    if (CONFIG.typeCharByChar) {
      await sleep(200);
      await typeCharByChar(el, text);
      await sleep(300);
      return;
    }
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

    // Check we're on the right page (the article editor, or an existing article's edit page)
    const href = window.location.href;
    if (!href.includes('/compose/article') && !href.includes('/articles')) {
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

    // Find body editor (never the title field, which can also be a contenteditable textbox)
    const bodyEl = [...document.querySelectorAll(SELECTORS.body)]
      .find(el => el !== titleEl && !titleEl.contains(el) && !el.contains(titleEl));
    if (!bodyEl) {
      console.error('❌ Body editor not found.');
      console.log('   Tried selectors:', SELECTORS.body);
      return;
    }

    console.log('✅ Found title and body fields.');

    const actionLabel = CONFIG.action === 'publish' ? 'PUBLISH' : CONFIG.action === 'fill' ? 'FILL ONLY (no click)' : 'SAVE DRAFT';

    if (CONFIG.dryRun) {
      console.log('\n🔒 DRY RUN — no changes made.');
      console.log('   Would fill title:', CONFIG.title);
      console.log('   Would fill body:', CONFIG.body.slice(0, 100) + (CONFIG.body.length > 100 ? '...' : ''));
      console.log(`   Would ${actionLabel}`);
      console.log('\n💡 Set CONFIG.dryRun = false to execute.');
      return;
    }

    // Fill title
    console.log('📝 Filling title...');
    await typeInto(titleEl, CONFIG.title);
    console.log('✅ Title entered.');

    await sleep(1000);

    // Fill body
    console.log('📝 Filling body...');
    await typeInto(bodyEl, CONFIG.body);
    console.log('✅ Body entered.');

    await sleep(1000);

    // Perform action
    if (CONFIG.action === 'fill') {
      console.log('\n📄 Article ready to publish!');
      console.log('   Review it, then click the publish button or run:');
      console.log('   document.querySelector("[data-testid=articlePublish]")?.click()');
    } else if (CONFIG.action === 'publish') {
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
    console.log(`  Action: ${CONFIG.action === 'publish' ? 'Published' : CONFIG.action === 'fill' ? 'Filled, not submitted' : 'Saved as draft'}`);
    console.log(`  Time:   ${new Date().toLocaleString()}`);
  };

  run();
})();
