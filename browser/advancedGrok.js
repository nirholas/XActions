// Copyright (c) 2024-2026 nich (@nichxbt). Licensed under the Apache License, Version 2.0.
/**
 * @name        advancedGrok.js
 * @title       Advanced Grok Tools
 * @description Advanced Grok features: prompts, image generation, conversation history and exports.
 * @category    ai
 * @page        x.com/i/grok
 * @writes      false
 */
// browser/advancedGrok.js
// Advanced Grok AI features for X/Twitter
// by nichxbt
//
// 1. Go to https://x.com (or https://x.com/i/grok)
// 2. Open DevTools Console (F12)
// 3. Paste and run this script
// 4. Use window.XActions.advancedGrok.<function>() to call features
//
// Features:
//   deepSearch(query)                - Trigger Grok DeepSearch for comprehensive research
//   uploadImage(analysisPrompt)      - Upload an image to Grok for analysis/editing
//   listConversations()              - List all Grok conversation titles
//   deleteConversation(index)        - Delete a specific conversation by index
//   renameConversation(index, name)  - Rename a conversation
//   selectModel(model)               - Switch Grok model ("grok-2", "grok-3", etc.)
//   selectMode(mode)                 - Switch mode: "fun", "regular", "think"
//   analyzePost()                    - Invoke Grok on the current tweet page
//
// Last Updated: 30 March 2026
(() => {
  'use strict';

  const sleep = (ms) => new Promise(r => setTimeout(r, ms));
  const $ = (s) => document.querySelector(s);
  const $$ = (s) => [...document.querySelectorAll(s)];

  const SEL = {
    // Grok chat core
    chatInput:       '[data-testid="grokInput"]',
    sendButton:      '[data-testid="grokSendButton"]',
    responseArea:    '[data-testid="grokResponse"]',
    newChat:         '[data-testid="grokNewChat"]',
    imageGen:        '[data-testid="grokImageGen"]',
    loading:         '[data-testid="grokLoading"]',

    // Navigation
    grokNav:         'a[href="/i/grok"]',

    // DeepSearch
    deepSearchToggle: '[data-testid="grokDeepSearch"], button[aria-label*="DeepSearch"], button[aria-label*="Deep search"], [role="button"][aria-label*="eep"]',

    // Attachments / upload
    attachButton:    '[data-testid="grokAttach"], [aria-label="Attach file"], [aria-label="Attach media"], [data-testid="fileInput"]',
    fileInput:       'input[type="file"]',

    // Conversation sidebar
    sidebarToggle:   '[data-testid="grokSidebar"], [aria-label="Chat history"], [aria-label="Conversations"]',
    conversationItem: '[data-testid="grokConversation"], [data-testid="grokChatHistoryItem"], a[href*="/i/grok/"]',
    conversationTitle: '[data-testid="grokConversationTitle"]',

    // Conversation actions (context menu)
    moreButton:      '[data-testid="caret"], [aria-label="More"]',
    deleteMenuItem:  '[data-testid="grokDeleteConversation"], [role="menuitem"]',
    renameMenuItem:  '[data-testid="grokRenameConversation"], [role="menuitem"]',
    confirmButton:   '[data-testid="confirmationSheetConfirm"]',

    // Model / mode selectors
    modelSelector:   '[data-testid="grokModelSelector"], [aria-label*="model"], [aria-label*="Model"]',
    modelOption:     '[data-testid="grokModelOption"], [role="option"], [role="menuitemradio"]',
    modeSelector:    '[data-testid="grokModeSelector"], [aria-label*="mode"], [aria-label*="Mode"]',
    modeOption:      '[data-testid="grokModeOption"], [role="option"], [role="menuitemradio"]',
    thinkToggle:     '[data-testid="grokThink"], button[aria-label*="Think"], button[aria-label*="think"]',
    funToggle:       '[data-testid="grokFunMode"], button[aria-label*="Fun"], button[aria-label*="fun"]',

    // Tweet-specific Grok
    tweetGrokIcon:   '[data-testid="grokTweet"], [aria-label*="Grok"], [aria-label*="grok"]',
    tweet:           'article[data-testid="tweet"]',
    tweetText:       '[data-testid="tweetText"]',

    // General
    toast:           '[data-testid="toast"]',
  };

  const waitForSelector = async (selector, timeout = 10000) => {
    const start = Date.now();
    while (Date.now() - start < timeout) {
      // Support comma-separated selectors
      const parts = selector.split(',').map(s => s.trim());
      for (const part of parts) {
        const el = document.querySelector(part);
        if (el) return el;
      }
      await sleep(200);
    }
    return null;
  };

  const waitForLoading = async (timeout = 60000) => {
    // Wait for loading to appear
    await sleep(2000);
    const start = Date.now();
    while (Date.now() - start < timeout) {
      const loader = $(SEL.loading);
      if (!loader) return true;
      await sleep(1000);
    }
    console.log('⚠️ Response may still be loading after timeout');
    return false;
  };

  const typeText = async (element, text, charDelay = 30) => {
    element.focus();
    await sleep(200);
    for (const char of text) {
      document.execCommand('insertText', false, char);
      element.dispatchEvent(new InputEvent('input', { bubbles: true, data: char, inputType: 'insertText' }));
      await sleep(charDelay);
    }
  };

  const clearInput = (element) => {
    element.focus();
    document.execCommand('selectAll', false, null);
    document.execCommand('delete', false, null);
    element.dispatchEvent(new Event('input', { bubbles: true }));
  };

  const navigateToGrok = async () => {
    if (!window.location.href.includes('/i/grok')) {
      console.log('🔄 Navigating to Grok...');
      const grokLink = $(SEL.grokNav);
      if (grokLink) {
        grokLink.click();
        await sleep(3000);
      } else {
        window.location.href = 'https://x.com/i/grok';
        await sleep(4000);
      }
    }
  };

  const ensureOnGrok = () => {
    if (!window.location.href.includes('/i/grok')) {
      console.log('❌ Navigate to https://x.com/i/grok first, or call navigateToGrok()');
      return false;
    }
    return true;
  };

  const sendQuery = async (text) => {
    const input = await waitForSelector(SEL.chatInput, 5000);
    if (!input) {
      console.log('❌ Could not find Grok chat input');
      return false;
    }
    clearInput(input);
    await typeText(input, text);
    await sleep(500);

    const sendBtn = $(SEL.sendButton);
    if (sendBtn) {
      sendBtn.click();
    } else {
      // Fallback: press Enter
      input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', code: 'Enter', bubbles: true }));
    }
    return true;
  };

  const scrapeResponse = () => {
    const responses = $$(SEL.responseArea);
    if (responses.length === 0) return null;
    const last = responses[responses.length - 1];
    return last?.textContent?.trim() || null;
  };

  // ─────────────────────────────────────────────────────────
  // 1. DeepSearch — comprehensive research queries
  // ─────────────────────────────────────────────────────────
  const deepSearch = async (query) => {
    if (!query || typeof query !== 'string') {
      console.log('❌ Usage: deepSearch("your research query")');
      return null;
    }
    console.log(`🔄 Starting DeepSearch for: "${query}"`);

    await navigateToGrok();
    await sleep(2000);

    // Start a new chat
    const newChatBtn = $(SEL.newChat);
    if (newChatBtn) {
      newChatBtn.click();
      await sleep(2000);
    }

    // Try to enable DeepSearch toggle
    const deepToggle = await waitForSelector(SEL.deepSearchToggle, 5000);
    if (deepToggle) {
      const isActive = deepToggle.getAttribute('aria-pressed') === 'true' ||
                        deepToggle.classList.contains('active') ||
                        deepToggle.querySelector('[aria-checked="true"]');
      if (!isActive) {
        deepToggle.click();
        await sleep(1500);
        console.log('✅ DeepSearch mode enabled');
      } else {
        console.log('✅ DeepSearch already active');
      }
    } else {
      console.log('⚠️ DeepSearch toggle not found — submitting query directly (Grok may auto-detect)');
    }

    // Submit the query
    const sent = await sendQuery(query);
    if (!sent) return null;

    console.log('🔄 Waiting for DeepSearch results (this may take 30-60 seconds)...');
    await waitForLoading(90000);
    await sleep(3000);

    // Scrape results
    const response = scrapeResponse();
    if (response) {
      console.log('✅ DeepSearch complete');
      console.log('📄 Response preview:', response.substring(0, 300) + (response.length > 300 ? '...' : ''));
      return { success: true, query, response, timestamp: new Date().toISOString() };
    }

    console.log('⚠️ Could not scrape response. Check the Grok chat window manually.');
    return { success: false, query, response: null, timestamp: new Date().toISOString() };
  };

  // ─────────────────────────────────────────────────────────
  // 2. Image upload for analysis or editing
  // ─────────────────────────────────────────────────────────
  const uploadImage = async (analysisPrompt) => {
    if (!analysisPrompt || typeof analysisPrompt !== 'string') {
      console.log('❌ Usage: uploadImage("Describe this image" or "Edit: make the sky purple")');
      return;
    }
    console.log('🔄 Preparing to upload image to Grok...');

    await navigateToGrok();
    await sleep(2000);

    // Start new chat
    const newChatBtn = $(SEL.newChat);
    if (newChatBtn) {
      newChatBtn.click();
      await sleep(2000);
    }

    // Click the attach/upload button
    const attachBtn = await waitForSelector(SEL.attachButton, 5000);
    if (attachBtn) {
      attachBtn.click();
      await sleep(1000);
      console.log('✅ File picker triggered. Select your image file.');
    } else {
      // Fallback: try to find a hidden file input
      const fileInput = $('input[type="file"]');
      if (fileInput) {
        fileInput.click();
        await sleep(1000);
        console.log('✅ File picker triggered via hidden input. Select your image file.');
      } else {
        console.log('❌ Could not find attachment button. Try dragging and dropping the image into the chat.');
        return;
      }
    }

    // Wait for user to select file
    console.log('⏳ Waiting 8 seconds for file selection...');
    await sleep(8000);

    // Type the analysis/edit prompt
    const input = await waitForSelector(SEL.chatInput, 5000);
    if (input) {
      clearInput(input);
      await typeText(input, analysisPrompt);
      await sleep(500);

      const sendBtn = $(SEL.sendButton);
      if (sendBtn) {
        sendBtn.click();
        console.log('🔄 Image and prompt submitted. Waiting for Grok response...');
        await waitForLoading(60000);
        await sleep(3000);

        const response = scrapeResponse();
        if (response) {
          console.log('✅ Grok response received');
          console.log('📄 Response:', response.substring(0, 500));
          return { success: true, prompt: analysisPrompt, response, timestamp: new Date().toISOString() };
        }
        console.log('⚠️ Response may still be loading. Check the chat window.');
      } else {
        console.log('💡 Type Enter or click send to submit your prompt with the image.');
      }
    } else {
      console.log('⚠️ Could not find chat input after file selection.');
    }
  };

  // ─────────────────────────────────────────────────────────
  // 3. Conversation management
  // ─────────────────────────────────────────────────────────
  const openSidebar = async () => {
    const sidebar = await waitForSelector(SEL.sidebarToggle, 3000);
    if (sidebar) {
      sidebar.click();
      await sleep(1500);
      return true;
    }
    // Sidebar may already be open
    return $$(SEL.conversationItem).length > 0;
  };

  const listConversations = async () => {
    console.log('🔄 Listing Grok conversations...');

    await navigateToGrok();
    await sleep(2000);

    const sidebarOpen = await openSidebar();
    if (!sidebarOpen) {
      console.log('⚠️ Could not open conversation sidebar. Looking for conversations in current view...');
    }
    await sleep(1000);

    const items = $$(SEL.conversationItem);
    if (items.length === 0) {
      console.log('📭 No conversations found');
      return [];
    }

    const conversations = items.map((item, i) => {
      const titleEl = item.querySelector(SEL.conversationTitle) || item;
      const title = titleEl?.textContent?.trim() || `Conversation ${i + 1}`;
      const href = item.getAttribute('href') || item.querySelector('a')?.getAttribute('href') || '';
      return { index: i, title, href };
    });

    console.log(`✅ Found ${conversations.length} conversation(s):`);
    conversations.forEach(c => {
      console.log(`  [${c.index}] ${c.title}`);
    });

    return conversations;
  };

  const deleteConversation = async (index) => {
    if (typeof index !== 'number' || index < 0) {
      console.log('❌ Usage: deleteConversation(0) — pass the conversation index from listConversations()');
      return false;
    }
    console.log(`🔄 Deleting conversation at index ${index}...`);

    await navigateToGrok();
    await sleep(2000);
    await openSidebar();
    await sleep(1000);

    const items = $$(SEL.conversationItem);
    if (index >= items.length) {
      console.log(`❌ Index ${index} out of range. Found ${items.length} conversations.`);
      return false;
    }

    const target = items[index];

    // Right-click or find more button on the conversation item
    target.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, cancelable: true }));
    await sleep(1000);

    // Look for delete option in context menu
    let deleteBtn = await waitForSelector(SEL.deleteMenuItem, 3000);
    if (!deleteBtn) {
      // Try hovering and clicking more button
      target.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }));
      await sleep(500);
      const moreBtn = target.querySelector(SEL.moreButton) || target.querySelector('[aria-label="More"]');
      if (moreBtn) {
        moreBtn.click();
        await sleep(1000);
        deleteBtn = await waitForSelector(SEL.deleteMenuItem, 3000);
      }
    }

    if (!deleteBtn) {
      // Fallback: look for any menu item containing "Delete" text
      const menuItems = $$('[role="menuitem"]');
      deleteBtn = menuItems.find(el => el.textContent?.toLowerCase().includes('delete'));
    }

    if (deleteBtn) {
      deleteBtn.click();
      await sleep(1000);

      // Confirm deletion
      const confirmBtn = await waitForSelector(SEL.confirmButton, 5000);
      if (confirmBtn) {
        confirmBtn.click();
        await sleep(2000);
        console.log('✅ Conversation deleted');
        return true;
      }
      console.log('⚠️ Deletion may have completed without confirmation dialog');
      return true;
    }

    console.log('❌ Could not find delete option. Try right-clicking the conversation manually.');
    return false;
  };

  const renameConversation = async (index, newName) => {
    if (typeof index !== 'number' || index < 0 || !newName) {
      console.log('❌ Usage: renameConversation(0, "New Name")');
      return false;
    }
    console.log(`🔄 Renaming conversation ${index} to "${newName}"...`);

    await navigateToGrok();
    await sleep(2000);
    await openSidebar();
    await sleep(1000);

    const items = $$(SEL.conversationItem);
    if (index >= items.length) {
      console.log(`❌ Index ${index} out of range. Found ${items.length} conversations.`);
      return false;
    }

    const target = items[index];

    // Open context menu
    target.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, cancelable: true }));
    await sleep(1000);

    let renameBtn = await waitForSelector(SEL.renameMenuItem, 3000);
    if (!renameBtn) {
      // Try hover + more button approach
      target.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }));
      await sleep(500);
      const moreBtn = target.querySelector(SEL.moreButton) || target.querySelector('[aria-label="More"]');
      if (moreBtn) {
        moreBtn.click();
        await sleep(1000);
      }
      // Look for rename in menu items
      const menuItems = $$('[role="menuitem"]');
      renameBtn = menuItems.find(el => el.textContent?.toLowerCase().includes('rename'));
    }

    if (renameBtn) {
      renameBtn.click();
      await sleep(1000);

      // Find the rename input field
      const renameInput = await waitForSelector('input[type="text"], [contenteditable="true"], [data-testid="grokRenameInput"]', 5000);
      if (renameInput) {
        clearInput(renameInput);
        await typeText(renameInput, newName);
        await sleep(500);

        // Confirm with Enter or save button
        renameInput.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', code: 'Enter', bubbles: true }));
        await sleep(1000);

        // Also try clicking a save/confirm button
        const saveBtn = $('[data-testid="confirmationSheetConfirm"], button[type="submit"]');
        if (saveBtn) saveBtn.click();

        await sleep(1500);
        console.log(`✅ Conversation renamed to "${newName}"`);
        return true;
      }
      console.log('❌ Could not find rename input field');
      return false;
    }

    console.log('❌ Could not find rename option in menu');
    return false;
  };

  // ─────────────────────────────────────────────────────────
  // 4. Model and mode selection
  // ─────────────────────────────────────────────────────────
  const selectModel = async (model) => {
    if (!model || typeof model !== 'string') {
      console.log('❌ Usage: selectModel("grok-2") or selectModel("grok-3")');
      return false;
    }
    console.log(`🔄 Switching to model: ${model}...`);

    await navigateToGrok();
    await sleep(2000);

    // Click model selector dropdown
    const modelBtn = await waitForSelector(SEL.modelSelector, 5000);
    if (modelBtn) {
      modelBtn.click();
      await sleep(1500);

      // Find the matching model option
      const options = $$(`${SEL.modelOption}`);
      const allOptions = options.length > 0 ? options : $$('[role="option"], [role="menuitemradio"], [role="menuitem"]');
      const target = allOptions.find(el => el.textContent?.toLowerCase().includes(model.toLowerCase()));

      if (target) {
        target.click();
        await sleep(1500);
        console.log(`✅ Switched to model: ${model}`);
        return true;
      }

      // Log available options for user reference
      const available = allOptions.map(el => el.textContent?.trim()).filter(Boolean);
      console.log(`❌ Model "${model}" not found. Available options:`, available);
      // Close the dropdown
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
      return false;
    }

    console.log('⚠️ Model selector not found. The model picker may not be visible in this Grok version.');
    return false;
  };

  const selectMode = async (mode) => {
    const validModes = ['fun', 'regular', 'think'];
    if (!mode || !validModes.includes(mode.toLowerCase())) {
      console.log(`❌ Usage: selectMode("fun" | "regular" | "think")`);
      return false;
    }
    console.log(`🔄 Switching to ${mode} mode...`);

    await navigateToGrok();
    await sleep(2000);

    const normalizedMode = mode.toLowerCase();

    // Special handling for think mode — often a separate toggle
    if (normalizedMode === 'think') {
      const thinkBtn = await waitForSelector(SEL.thinkToggle, 5000);
      if (thinkBtn) {
        const isActive = thinkBtn.getAttribute('aria-pressed') === 'true' ||
                          thinkBtn.classList.contains('active');
        if (!isActive) {
          thinkBtn.click();
          await sleep(1500);
          console.log('✅ Think mode enabled');
        } else {
          console.log('✅ Think mode already active');
        }
        return true;
      }
    }

    // Special handling for fun mode — often a separate toggle
    if (normalizedMode === 'fun') {
      const funBtn = await waitForSelector(SEL.funToggle, 5000);
      if (funBtn) {
        const isActive = funBtn.getAttribute('aria-pressed') === 'true' ||
                          funBtn.classList.contains('active');
        if (!isActive) {
          funBtn.click();
          await sleep(1500);
          console.log('✅ Fun mode enabled');
        } else {
          console.log('✅ Fun mode already active');
        }
        return true;
      }
    }

    // General approach: use mode selector dropdown
    const modeBtn = await waitForSelector(SEL.modeSelector, 5000);
    if (modeBtn) {
      modeBtn.click();
      await sleep(1500);

      const options = $$(`${SEL.modeOption}`);
      const allOptions = options.length > 0 ? options : $$('[role="option"], [role="menuitemradio"], [role="menuitem"]');
      const target = allOptions.find(el => el.textContent?.toLowerCase().includes(normalizedMode));

      if (target) {
        target.click();
        await sleep(1500);
        console.log(`✅ Switched to ${mode} mode`);
        return true;
      }

      const available = allOptions.map(el => el.textContent?.trim()).filter(Boolean);
      console.log(`❌ Mode "${mode}" not found. Available:`, available);
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
      return false;
    }

    // Fallback: look for any button or toggle that contains the mode name
    const buttons = $$('button, [role="button"]');
    const fallback = buttons.find(el => {
      const text = el.textContent?.toLowerCase() || '';
      const label = el.getAttribute('aria-label')?.toLowerCase() || '';
      return text.includes(normalizedMode) || label.includes(normalizedMode);
    });

    if (fallback) {
      fallback.click();
      await sleep(1500);
      console.log(`✅ Switched to ${mode} mode (via fallback)`);
      return true;
    }

    console.log(`⚠️ Could not find mode selector for "${mode}". Check if this mode is available in your Grok version.`);
    return false;
  };

  // ─────────────────────────────────────────────────────────
  // 5. Grok on a specific post (tweet page)
  // ─────────────────────────────────────────────────────────
  const analyzePost = async () => {
    // Check we're on a tweet page
    const isTweetPage = /\/status\/\d+/.test(window.location.href);
    const tweetEl = $(SEL.tweet);

    if (!isTweetPage && !tweetEl) {
      console.log('❌ Navigate to a specific tweet page first (e.g., x.com/user/status/12345)');
      return null;
    }

    console.log('🔄 Looking for Grok icon on this tweet...');

    // Look for the Grok icon button on the tweet
    const grokIcon = await waitForSelector(SEL.tweetGrokIcon, 5000);
    if (grokIcon) {
      grokIcon.click();
      console.log('✅ Grok analysis triggered via tweet icon');
      await sleep(3000);

      // Wait for Grok panel/response to load
      await waitForLoading(30000);
      await sleep(2000);

      const response = scrapeResponse();
      if (response) {
        console.log('✅ Grok analysis complete');
        console.log('📄 Analysis:', response.substring(0, 500));
        return {
          success: true,
          tweetUrl: window.location.href,
          response,
          timestamp: new Date().toISOString(),
        };
      }

      console.log('⚠️ Grok panel opened but response not yet scraped. Check the UI.');
      return { success: true, tweetUrl: window.location.href, response: null, note: 'Check Grok panel', timestamp: new Date().toISOString() };
    }

    // Fallback: extract tweet text and send to Grok manually
    console.log('⚠️ Grok icon not found on tweet. Falling back to manual analysis...');
    const tweetTextEl = $(SEL.tweetText);
    if (!tweetTextEl) {
      console.log('❌ Could not extract tweet text');
      return null;
    }

    const tweetText = tweetTextEl.textContent?.trim();
    const tweetUrl = window.location.href;

    console.log(`📝 Tweet text: "${tweetText.substring(0, 100)}${tweetText.length > 100 ? '...' : ''}"`);
    console.log('🔄 Sending tweet to Grok for analysis...');

    // Navigate to Grok and analyze
    await navigateToGrok();
    await sleep(2000);

    const newChatBtn = $(SEL.newChat);
    if (newChatBtn) {
      newChatBtn.click();
      await sleep(2000);
    }

    const prompt = `Analyze this X/Twitter post. Summarize its key points, assess engagement potential (1-10), identify the tone, and suggest improvements:\n\nPost URL: ${tweetUrl}\nPost text: "${tweetText}"`;

    const sent = await sendQuery(prompt);
    if (!sent) return null;

    console.log('🔄 Waiting for analysis...');
    await waitForLoading(30000);
    await sleep(3000);

    const response = scrapeResponse();
    if (response) {
      console.log('✅ Post analysis complete');
      console.log('📄 Analysis:', response.substring(0, 500));
      return {
        success: true,
        tweetUrl,
        tweetText,
        response,
        timestamp: new Date().toISOString(),
      };
    }

    console.log('⚠️ Could not scrape analysis. Check Grok chat window.');
    return { success: false, tweetUrl, tweetText, response: null, timestamp: new Date().toISOString() };
  };

  // ─────────────────────────────────────────────────────────
  // Expose on window.XActions.advancedGrok
  // ─────────────────────────────────────────────────────────
  window.XActions = window.XActions || {};
  window.XActions.advancedGrok = {
    deepSearch,
    uploadImage,
    listConversations,
    deleteConversation,
    renameConversation,
    selectModel,
    selectMode,
    analyzePost,
  };

  // ─────────────────────────────────────────────────────────
  // Print menu
  // ─────────────────────────────────────────────────────────
  const W = 62;
  console.log('╔' + '═'.repeat(W) + '╗');
  console.log('║  🤖 ADVANCED GROK AI — XActions' + ' '.repeat(W - 33) + '║');
  console.log('║  by nichxbt — v1.0' + ' '.repeat(W - 21) + '║');
  console.log('╠' + '═'.repeat(W) + '╣');
  console.log('║  🔍 DeepSearch' + ' '.repeat(W - 16) + '║');
  console.log('║    deepSearch("your research query")' + ' '.repeat(W - 38) + '║');
  console.log('╠' + '═'.repeat(W) + '╣');
  console.log('║  🖼️ Image Analysis / Editing' + ' '.repeat(W - 31) + '║');
  console.log('║    uploadImage("Describe this image")' + ' '.repeat(W - 39) + '║');
  console.log('╠' + '═'.repeat(W) + '╣');
  console.log('║  💬 Conversation Management' + ' '.repeat(W - 30) + '║');
  console.log('║    listConversations()' + ' '.repeat(W - 24) + '║');
  console.log('║    deleteConversation(index)' + ' '.repeat(W - 30) + '║');
  console.log('║    renameConversation(index, "name")' + ' '.repeat(W - 38) + '║');
  console.log('╠' + '═'.repeat(W) + '╣');
  console.log('║  ⚙️ Model & Mode Selection' + ' '.repeat(W - 29) + '║');
  console.log('║    selectModel("grok-3")' + ' '.repeat(W - 26) + '║');
  console.log('║    selectMode("fun"|"regular"|"think")' + ' '.repeat(W - 40) + '║');
  console.log('╠' + '═'.repeat(W) + '╣');
  console.log('║  📊 Post Analysis' + ' '.repeat(W - 20) + '║');
  console.log('║    analyzePost()' + ' '.repeat(W - 18) + '║');
  console.log('╚' + '═'.repeat(W) + '╝');
  console.log('');
  console.log('💡 Usage: window.XActions.advancedGrok.deepSearch("AI trends 2026")');
  console.log('💡 Navigate to x.com/i/grok for most features, or a tweet page for analyzePost().');
})();
