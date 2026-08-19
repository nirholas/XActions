// Copyright (c) 2024-2026 nich (@nichxbt). MIT License.
// src/postAdvanced.js
// Advanced post features for X/Twitter
// by nichxbt
//
// Paste this script in the DevTools console on x.com
//
// Features:
// - Undo post (catch the toast grace period)
// - Post longer content (Premium 25K chars)
// - Text formatting (bold, italic, strikethrough — Premium)
// - Location tagging
// - Media tagging (tag people in photos)
// - Sensitive content warning
// - Draft management (save, load, delete)
// - Highlight posts on profile (Premium)
// - Upload video captions/subtitles (.srt)
// - Post to Circle (limited audience)
// - Post with voice (voice tweet)
//
// Usage:
//   Paste in console, then call functions via window.XActions.postAdvanced.*
//   Example: XActions.postAdvanced.undoPost()

(() => {
  'use strict';

  const sleep = (ms) => new Promise(r => setTimeout(r, ms));

  // ==========================================================================
  // Selectors
  // ==========================================================================

  const SEL = {
    // Compose
    composeButton: 'a[data-testid="SideNav_NewTweet_Button"]',
    tweetTextarea: '[data-testid="tweetTextarea_0"]',
    tweetButton: '[data-testid="tweetButton"]',
    inlinePostButton: '[data-testid="tweetButtonInline"]',
    mediaInput: '[data-testid="fileInput"]',
    addThread: '[data-testid="addButton"]',

    // Toast / Undo
    toast: '[data-testid="toast"]',

    // Confirmation
    confirmDialog: '[data-testid="confirmationSheetConfirm"]',

    // Caret menu on tweets
    caret: '[data-testid="caret"]',
    tweet: 'article[data-testid="tweet"]',

    // Search (typeahead results)
    searchInput: '[data-testid="SearchBox_Search_Input"]',
    typeaheadItem: '[data-testid="TypeaheadListItem"]',

    // Audience selector (Circle)
    audienceSelector: '[data-testid="audienceSelector"]',

    // Draft
    draftsTab: '[data-testid="drafts"]',

    // Location
    locationButton: '[aria-label="Add location"]',

    // Reply restriction
    replyRestriction: '[data-testid="replyRestriction"]',
  };

  // ==========================================================================
  // Utility helpers
  // ==========================================================================

  /**
   * Wait for an element to appear in the DOM
   */
  const waitForElement = (selector, timeout = 10000) => {
    return new Promise((resolve, reject) => {
      const el = document.querySelector(selector);
      if (el) return resolve(el);

      const observer = new MutationObserver(() => {
        const found = document.querySelector(selector);
        if (found) {
          observer.disconnect();
          resolve(found);
        }
      });

      observer.observe(document.body, { childList: true, subtree: true });

      setTimeout(() => {
        observer.disconnect();
        reject(new Error(`❌ Timeout waiting for: ${selector}`));
      }, timeout);
    });
  };

  /**
   * Wait for an element matching a text predicate
   */
  const waitForElementByText = (tag, text, timeout = 10000) => {
    return new Promise((resolve, reject) => {
      const check = () => {
        const els = document.querySelectorAll(tag);
        for (const el of els) {
          if (el.textContent.trim().toLowerCase().includes(text.toLowerCase())) {
            return el;
          }
        }
        return null;
      };

      const found = check();
      if (found) return resolve(found);

      const observer = new MutationObserver(() => {
        const el = check();
        if (el) {
          observer.disconnect();
          resolve(el);
        }
      });

      observer.observe(document.body, { childList: true, subtree: true });

      setTimeout(() => {
        observer.disconnect();
        reject(new Error(`❌ Timeout waiting for "${text}" in <${tag}>`));
      }, timeout);
    });
  };

  /**
   * Type text into the currently focused contenteditable element
   */
  const typeText = (text) => {
    document.execCommand('insertText', false, text);
  };

  /**
   * Click an element safely with error context
   */
  const safeClick = async (selectorOrEl, label = '') => {
    const el = typeof selectorOrEl === 'string'
      ? document.querySelector(selectorOrEl)
      : selectorOrEl;
    if (!el) {
      console.log(`❌ Could not find element${label ? ': ' + label : ''}`);
      return false;
    }
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    await sleep(300);
    el.click();
    return true;
  };

  /**
   * Open the compose dialog if not already open
   */
  const ensureComposeOpen = async () => {
    let textarea = document.querySelector(SEL.tweetTextarea);
    if (textarea) return textarea;

    const composeBtn = document.querySelector(SEL.composeButton);
    if (!composeBtn) {
      console.log('❌ Compose button not found. Make sure you are on x.com');
      return null;
    }
    composeBtn.click();
    await sleep(1500);

    textarea = await waitForElement(SEL.tweetTextarea, 5000).catch(() => null);
    if (!textarea) {
      console.log('❌ Tweet textarea did not appear');
      return null;
    }
    return textarea;
  };

  // ==========================================================================
  // 1. Undo Post
  // ==========================================================================

  /**
   * Watch for the post-send toast and click Undo automatically.
   * Call this BEFORE posting. It sets up a MutationObserver that waits
   * for the toast with an "Undo" button to appear, then clicks it.
   *
   * Usage:
   *   XActions.postAdvanced.undoPost()
   *   // Then post your tweet normally — it will be undone within the grace period
   *
   * Or call it right after clicking the post button (within ~5 seconds).
   */
  const undoPost = async () => {
    console.log('🔄 Watching for post toast with Undo button...');

    const maxWait = 15000;
    const pollInterval = 200;
    const start = Date.now();

    while (Date.now() - start < maxWait) {
      const toast = document.querySelector(SEL.toast);
      if (toast) {
        const undoBtn = toast.querySelector('button, [role="button"]');
        if (undoBtn && undoBtn.textContent.toLowerCase().includes('undo')) {
          undoBtn.click();
          console.log('✅ Undo clicked — post has been reverted');
          return { success: true, message: 'Post undone' };
        }
        // Toast appeared but no undo button — might be a different toast
        const allBtns = toast.querySelectorAll('button, [role="button"]');
        for (const btn of allBtns) {
          if (btn.textContent.toLowerCase().includes('undo')) {
            btn.click();
            console.log('✅ Undo clicked — post has been reverted');
            return { success: true, message: 'Post undone' };
          }
        }
      }
      await sleep(pollInterval);
    }

    console.log('⚠️ No Undo toast detected within the grace period');
    return { success: false, message: 'No undo toast found — grace period may have expired' };
  };

  // ==========================================================================
  // 2. Post Longer Content (Premium 25K chars)
  // ==========================================================================

  /**
   * Compose and post content exceeding 280 characters (up to 25,000 for Premium).
   * Opens compose, types the full text, and posts.
   *
   * @param {string} text - Long-form text content (up to 25,000 chars for Premium)
   */
  const postLongContent = async (text) => {
    if (!text || text.length === 0) {
      console.log('❌ No text provided');
      return { success: false, error: 'No text provided' };
    }

    if (text.length > 25000) {
      console.log('❌ Text exceeds 25,000 character Premium limit');
      return { success: false, error: 'Text exceeds 25,000 character limit' };
    }

    console.log(`🔄 Composing long post (${text.length} characters)...`);

    const textarea = await ensureComposeOpen();
    if (!textarea) return { success: false, error: 'Could not open compose' };

    textarea.focus();
    await sleep(500);

    // Type in chunks to avoid DOM performance issues with very long text
    const chunkSize = 1000;
    for (let i = 0; i < text.length; i += chunkSize) {
      const chunk = text.substring(i, i + chunkSize);
      typeText(chunk);
      await sleep(100);
    }

    await sleep(1000);

    // Check if X accepted the text (non-Premium accounts hit 280 char limit)
    const charCounter = document.querySelector('[data-testid="tweetTextarea_0_label"]');
    const postBtn = document.querySelector(SEL.tweetButton);

    if (postBtn && postBtn.disabled) {
      console.log('⚠️ Post button is disabled — you may need X Premium for long posts');
      return { success: false, error: 'Post button disabled — Premium may be required' };
    }

    if (postBtn) {
      postBtn.click();
      await sleep(3000);
      console.log(`✅ Long post sent (${text.length} characters)`);
      return { success: true, length: text.length };
    }

    console.log('❌ Post button not found');
    return { success: false, error: 'Post button not found' };
  };

  // ==========================================================================
  // 3. Text Formatting (Premium)
  // ==========================================================================

  /**
   * Apply formatting to selected text in the compose box.
   * Select text in the compose box first, then call this function.
   *
   * @param {'bold'|'italic'|'strikethrough'} format - Formatting type
   */
  const formatSelectedText = async (format) => {
    const textarea = document.querySelector(SEL.tweetTextarea);
    if (!textarea) {
      console.log('❌ Compose box not found — open compose first');
      return { success: false, error: 'Compose box not found' };
    }

    const selection = window.getSelection();
    if (!selection || selection.isCollapsed) {
      console.log('⚠️ No text selected — highlight text in the compose box first');
      return { success: false, error: 'No text selected' };
    }

    console.log(`🔄 Applying ${format} formatting...`);

    const keyMap = {
      bold: { key: 'b', code: 'KeyB' },
      italic: { key: 'i', code: 'KeyI' },
      strikethrough: { key: 'd', code: 'KeyD' },
    };

    const mapping = keyMap[format];
    if (!mapping) {
      console.log(`❌ Unknown format: ${format}. Use: bold, italic, strikethrough`);
      return { success: false, error: `Unknown format: ${format}` };
    }

    // Try keyboard shortcut (Ctrl+B, Ctrl+I, Ctrl+D)
    textarea.dispatchEvent(new KeyboardEvent('keydown', {
      key: mapping.key,
      code: mapping.code,
      ctrlKey: true,
      bubbles: true,
    }));
    await sleep(300);

    // Also check if there is a formatting toolbar (Premium feature)
    const toolbar = document.querySelector('[role="toolbar"]');
    if (toolbar) {
      const buttons = toolbar.querySelectorAll('button, [role="button"]');
      for (const btn of buttons) {
        const label = (btn.getAttribute('aria-label') || btn.textContent || '').toLowerCase();
        if (label.includes(format)) {
          btn.click();
          await sleep(300);
          console.log(`✅ ${format} applied via toolbar`);
          return { success: true, format };
        }
      }
    }

    console.log(`✅ ${format} keyboard shortcut dispatched (Ctrl+${mapping.key.toUpperCase()})`);
    console.log('⚠️ If formatting did not apply, ensure you have X Premium');
    return { success: true, format, method: 'keyboard-shortcut' };
  };

  /**
   * Convenience: format text as bold
   */
  const boldText = () => formatSelectedText('bold');

  /**
   * Convenience: format text as italic
   */
  const italicText = () => formatSelectedText('italic');

  /**
   * Convenience: format text with strikethrough
   */
  const strikethroughText = () => formatSelectedText('strikethrough');

  // ==========================================================================
  // 4. Location Tagging
  // ==========================================================================

  /**
   * Add a location tag to the current compose.
   * Opens compose if needed, clicks the location button, searches, and selects.
   *
   * @param {string} placeName - Name of the place to search for
   */
  const addLocation = async (placeName) => {
    if (!placeName) {
      console.log('❌ No place name provided');
      return { success: false, error: 'No place name provided' };
    }

    console.log(`🔄 Adding location: ${placeName}`);

    const textarea = await ensureComposeOpen();
    if (!textarea) return { success: false, error: 'Could not open compose' };

    await sleep(500);

    // Click the location button
    const locationBtn = document.querySelector(SEL.locationButton)
      || document.querySelector('[aria-label="Tag location"]')
      || document.querySelector('[aria-label="Location"]');

    if (!locationBtn) {
      // Try finding it by scanning compose toolbar icons
      const toolbarBtns = document.querySelectorAll('[role="toolbar"] button, [data-testid="toolBar"] button');
      let found = false;
      for (const btn of toolbarBtns) {
        const label = (btn.getAttribute('aria-label') || '').toLowerCase();
        if (label.includes('location') || label.includes('place')) {
          btn.click();
          found = true;
          break;
        }
      }
      if (!found) {
        console.log('❌ Location button not found — this feature may require Premium or a specific account setting');
        return { success: false, error: 'Location button not found' };
      }
    } else {
      locationBtn.click();
    }

    await sleep(1500);

    // Search for the location
    const searchInput = document.querySelector('input[placeholder*="Search"]')
      || document.querySelector('input[aria-label*="Search"]')
      || document.querySelector('input[type="search"]');

    if (!searchInput) {
      console.log('❌ Location search input not found');
      return { success: false, error: 'Location search input not found' };
    }

    searchInput.focus();
    await sleep(300);
    typeText(placeName);
    await sleep(2000);

    // Select the first result
    const results = document.querySelectorAll('[role="option"], [role="listbox"] > div, [data-testid="TypeaheadListItem"]');
    if (results.length > 0) {
      results[0].click();
      await sleep(1000);
      console.log(`✅ Location set to: ${placeName}`);
      return { success: true, location: placeName };
    }

    console.log('⚠️ No location results found — try a more specific place name');
    return { success: false, error: 'No search results for location' };
  };

  // ==========================================================================
  // 5. Media Tagging
  // ==========================================================================

  /**
   * Tag people in an uploaded photo.
   * Call this after uploading media in the compose dialog.
   *
   * @param {string[]} usernames - Array of usernames to tag (without @)
   */
  const tagPeopleInMedia = async (usernames) => {
    if (!usernames || usernames.length === 0) {
      console.log('❌ No usernames provided');
      return { success: false, error: 'No usernames provided' };
    }

    if (usernames.length > 10) {
      console.log('⚠️ X allows tagging up to 10 people per photo');
      usernames = usernames.slice(0, 10);
    }

    console.log(`🔄 Tagging ${usernames.length} people in media...`);

    // Look for the "Tag people" button on the uploaded media preview
    const tagBtn = document.querySelector('[aria-label="Tag people"]')
      || document.querySelector('[data-testid="tagPeople"]');

    if (!tagBtn) {
      // Try finding text-based button
      const allBtns = document.querySelectorAll('button, [role="button"]');
      let found = null;
      for (const btn of allBtns) {
        if (btn.textContent.toLowerCase().includes('tag people') ||
            btn.textContent.toLowerCase().includes('tag')) {
          found = btn;
          break;
        }
      }
      if (!found) {
        console.log('❌ "Tag people" button not found — upload a photo first');
        return { success: false, error: 'Tag people button not found' };
      }
      found.click();
    } else {
      tagBtn.click();
    }

    await sleep(1500);

    const tagged = [];

    for (const username of usernames) {
      const cleanName = username.replace('@', '');
      console.log(`🔄 Tagging @${cleanName}...`);

      // Find the search/input field for tagging
      const input = document.querySelector('input[placeholder*="Search"]')
        || document.querySelector('input[aria-label*="Search"]')
        || document.querySelector('[data-testid="searchPeople"] input')
        || document.querySelector('input[type="text"]');

      if (!input) {
        console.log(`⚠️ Tag search input not found for @${cleanName}`);
        continue;
      }

      input.focus();
      await sleep(300);

      // Clear any previous text
      input.value = '';
      input.dispatchEvent(new Event('input', { bubbles: true }));
      await sleep(300);

      typeText(cleanName);
      await sleep(2000);

      // Select first matching result
      const result = document.querySelector('[data-testid="TypeaheadListItem"]')
        || document.querySelector('[role="option"]');

      if (result) {
        result.click();
        await sleep(1000);
        tagged.push(cleanName);
        console.log(`✅ Tagged @${cleanName}`);
      } else {
        console.log(`⚠️ No results for @${cleanName}`);
      }
    }

    // Confirm/Done if there is a done button
    const doneBtn = document.querySelector('[data-testid="done"]')
      || document.querySelector('button[data-testid="applyButton"]');
    if (doneBtn) {
      doneBtn.click();
      await sleep(500);
    }

    console.log(`✅ Tagged ${tagged.length}/${usernames.length} people`);
    return { success: true, tagged, total: usernames.length };
  };

  // ==========================================================================
  // 6. Sensitive Content Warning
  // ==========================================================================

  /**
   * Mark the current compose post as containing sensitive media.
   * Call this after uploading media but before posting.
   */
  const markSensitiveContent = async () => {
    console.log('🔄 Marking post as sensitive content...');

    // Look for the sensitive content / content warning toggle
    // This appears after media is uploaded as a flag/shield icon
    const sensitiveBtn = document.querySelector('[aria-label="Flag media as potentially sensitive"]')
      || document.querySelector('[aria-label*="ensitive"]')
      || document.querySelector('[data-testid="sensitiveMediaWarning"]');

    if (sensitiveBtn) {
      sensitiveBtn.click();
      await sleep(500);
      console.log('✅ Post marked as containing sensitive media');
      return { success: true };
    }

    // Try via the more options / overflow menu on uploaded media
    const mediaOptions = document.querySelector('[aria-label="Media options"]')
      || document.querySelector('[data-testid="mediaOptions"]');

    if (mediaOptions) {
      mediaOptions.click();
      await sleep(1000);

      const menuItems = document.querySelectorAll('[role="menuitem"], [role="option"]');
      for (const item of menuItems) {
        if (item.textContent.toLowerCase().includes('sensitive') ||
            item.textContent.toLowerCase().includes('content warning')) {
          item.click();
          await sleep(500);
          console.log('✅ Post marked as containing sensitive media');
          return { success: true };
        }
      }
    }

    // Fallback: try Settings > Privacy > sensitive before posting
    console.log('❌ Sensitive content toggle not found — ensure media is uploaded first');
    console.log('⚠️ You can also set this globally in Settings > Privacy and Safety > Your Posts');
    return { success: false, error: 'Sensitive content toggle not found' };
  };

  // ==========================================================================
  // 7. Draft Management
  // ==========================================================================

  /**
   * Save the current compose as a draft.
   * This closes the compose dialog, which triggers X to save as draft.
   */
  const saveDraft = async () => {
    console.log('🔄 Saving current compose as draft...');

    const textarea = document.querySelector(SEL.tweetTextarea);
    if (!textarea) {
      console.log('❌ No compose dialog open — nothing to save as draft');
      return { success: false, error: 'No compose dialog open' };
    }

    const text = textarea.textContent || '';
    if (text.trim().length === 0) {
      console.log('⚠️ Compose box is empty — nothing to save as draft');
      return { success: false, error: 'Compose box is empty' };
    }

    // Close the compose dialog — X will prompt to save as draft
    const closeBtn = document.querySelector('[data-testid="app-bar-close"]')
      || document.querySelector('[aria-label="Close"]');

    if (!closeBtn) {
      console.log('❌ Close button not found');
      return { success: false, error: 'Close button not found' };
    }

    closeBtn.click();
    await sleep(1000);

    // X shows a "Save draft?" dialog — click Save
    const saveDraftBtn = document.querySelector('[data-testid="confirmationSheetConfirm"]');
    if (saveDraftBtn) {
      saveDraftBtn.click();
      await sleep(1000);
      console.log('✅ Draft saved');
      return { success: true, preview: text.substring(0, 100) };
    }

    // Sometimes the button text is "Save"
    const allBtns = document.querySelectorAll('button, [role="button"]');
    for (const btn of allBtns) {
      if (btn.textContent.trim().toLowerCase() === 'save') {
        btn.click();
        await sleep(1000);
        console.log('✅ Draft saved');
        return { success: true, preview: text.substring(0, 100) };
      }
    }

    console.log('⚠️ Save draft dialog did not appear — draft may have been discarded');
    return { success: false, error: 'Save draft dialog not found' };
  };

  /**
   * Open drafts view. Navigate to compose and open the Drafts tab.
   */
  const loadDrafts = async () => {
    console.log('🔄 Opening drafts...');

    // Navigate to compose/tweet — drafts are accessible from there
    // First try the "Unsent posts" link in compose
    const composeBtn = document.querySelector(SEL.composeButton);
    if (composeBtn) {
      composeBtn.click();
      await sleep(1500);
    }

    // Look for "Drafts" or "Unsent posts" tab/link
    const draftsLink = document.querySelector('[data-testid="drafts"]')
      || document.querySelector('a[href*="/compose/drafts"]')
      || document.querySelector('a[href*="unsent"]');

    if (draftsLink) {
      draftsLink.click();
      await sleep(2000);
      console.log('✅ Drafts view opened');
      return { success: true };
    }

    // Try navigating directly
    const unsentLink = document.querySelector('a[href="/compose/tweet/unsent"]');
    if (unsentLink) {
      unsentLink.click();
      await sleep(2000);
      console.log('✅ Drafts view opened');
      return { success: true };
    }

    // Look for text-based "Unsent posts" link in compose dialog
    const allLinks = document.querySelectorAll('a, button, [role="link"], [role="button"]');
    for (const link of allLinks) {
      const txt = link.textContent.toLowerCase();
      if (txt.includes('unsent') || txt.includes('draft')) {
        link.click();
        await sleep(2000);
        console.log('✅ Drafts view opened');
        return { success: true };
      }
    }

    // Direct URL navigation as fallback
    window.location.href = 'https://x.com/compose/tweet/unsent';
    await sleep(3000);
    console.log('✅ Navigated to drafts (unsent posts)');
    return { success: true, method: 'direct-navigation' };
  };

  /**
   * Delete all drafts. Opens drafts view and deletes each one.
   */
  const deleteAllDrafts = async () => {
    console.log('🔄 Deleting all drafts...');

    await loadDrafts();
    await sleep(2000);

    let deleted = 0;

    // Look for a "Select all" or "Edit" button
    const editBtn = document.querySelector('[data-testid="editButton"]')
      || document.querySelector('[aria-label="Edit"]');

    if (editBtn) {
      editBtn.click();
      await sleep(1000);

      // Select all
      const selectAllBtn = document.querySelector('[data-testid="selectAll"]')
        || document.querySelector('[aria-label="Select all"]');

      if (selectAllBtn) {
        selectAllBtn.click();
        await sleep(500);
      }

      // Delete
      const deleteBtn = document.querySelector('[data-testid="deleteDrafts"]')
        || document.querySelector('[aria-label="Delete"]');

      if (deleteBtn) {
        deleteBtn.click();
        await sleep(1000);

        const confirm = document.querySelector(SEL.confirmDialog);
        if (confirm) {
          confirm.click();
          await sleep(1000);
        }

        console.log('✅ All drafts deleted');
        return { success: true, method: 'bulk-delete' };
      }
    }

    // Fallback: delete drafts one by one
    const tweetDrafts = document.querySelectorAll('[data-testid="tweet"]');
    const draftItems = tweetDrafts.length ? tweetDrafts : document.querySelectorAll('article');

    for (const draft of draftItems) {
      const deleteIcon = draft.querySelector('[aria-label="Delete"]')
        || draft.querySelector('[data-testid="deleteDraft"]');

      if (deleteIcon) {
        deleteIcon.click();
        await sleep(500);

        const confirm = document.querySelector(SEL.confirmDialog);
        if (confirm) {
          confirm.click();
          await sleep(1000);
        }
        deleted++;
      }
    }

    console.log(`✅ Deleted ${deleted} drafts`);
    return { success: true, deleted };
  };

  // ==========================================================================
  // 8. Highlight Posts on Profile (Premium)
  // ==========================================================================

  /**
   * Highlight a post on your profile's Highlights tab.
   * Navigate to the post first, or provide its URL.
   *
   * @param {string} [postUrl] - URL of the post to highlight (optional if already on the post)
   */
  const highlightPost = async (postUrl) => {
    if (postUrl) {
      console.log(`🔄 Navigating to post: ${postUrl}`);
      window.location.href = postUrl;
      await sleep(3000);
    }

    console.log('🔄 Highlighting post on profile...');

    // Click the caret/more menu on the tweet
    const tweet = document.querySelector(SEL.tweet);
    if (!tweet) {
      console.log('❌ No tweet found on page');
      return { success: false, error: 'No tweet found' };
    }

    const caretBtn = tweet.querySelector(SEL.caret)
      || tweet.querySelector('[aria-label="More"]');

    if (!caretBtn) {
      console.log('❌ Tweet more menu button not found');
      return { success: false, error: 'More menu not found' };
    }

    caretBtn.click();
    await sleep(1000);

    // Look for "Highlight on your profile" or "Add/remove from Highlights"
    const menuItems = document.querySelectorAll('[role="menuitem"], [data-testid="Dropdown"] > div');
    for (const item of menuItems) {
      const text = item.textContent.toLowerCase();
      if (text.includes('highlight') && (text.includes('profile') || text.includes('add'))) {
        item.click();
        await sleep(1500);

        // May need to confirm
        const confirm = document.querySelector(SEL.confirmDialog);
        if (confirm) {
          confirm.click();
          await sleep(500);
        }

        console.log('✅ Post highlighted on profile');
        return { success: true };
      }
    }

    // Close menu if nothing found
    document.body.click();
    await sleep(300);

    console.log('❌ Highlight option not found in menu — X Premium may be required');
    return { success: false, error: 'Highlight option not found — requires Premium' };
  };

  // ==========================================================================
  // 9. Upload Video Captions/Subtitles
  // ==========================================================================

  /**
   * Add captions/subtitles (.srt) to an uploaded video.
   * Call this after uploading a video in compose, before posting.
   *
   * Note: This triggers the native file picker for the .srt file.
   */
  const addVideoCaptions = async () => {
    console.log('🔄 Looking for video caption option...');

    // After uploading video, look for the "CC" or captions button on the video preview
    const captionBtn = document.querySelector('[aria-label="Add captions"]')
      || document.querySelector('[aria-label="Upload caption file"]')
      || document.querySelector('[data-testid="addCaptions"]')
      || document.querySelector('[aria-label*="caption"]')
      || document.querySelector('[aria-label*="subtitle"]');

    if (captionBtn) {
      captionBtn.click();
      await sleep(1500);
      console.log('✅ Caption upload dialog opened — select your .srt file');
      return { success: true, message: 'Select your .srt file in the file picker' };
    }

    // Try finding it via the video edit/options area
    const videoEditBtns = document.querySelectorAll('[aria-label*="Edit video"], [aria-label*="Video options"]');
    for (const btn of videoEditBtns) {
      btn.click();
      await sleep(1000);

      const captionOption = document.querySelector('[aria-label*="caption"]')
        || document.querySelector('[aria-label*="subtitle"]');

      if (captionOption) {
        captionOption.click();
        await sleep(1000);
        console.log('✅ Caption upload dialog opened — select your .srt file');
        return { success: true, message: 'Select your .srt file in the file picker' };
      }
    }

    // Fallback: look for any CC icon
    const allBtns = document.querySelectorAll('button, [role="button"]');
    for (const btn of allBtns) {
      const label = (btn.getAttribute('aria-label') || btn.textContent || '').toLowerCase();
      if (label.includes('cc') || label.includes('caption') || label.includes('subtitle')) {
        btn.click();
        await sleep(1000);
        console.log('✅ Caption option clicked — follow prompts to upload .srt file');
        return { success: true, message: 'Follow prompts to upload .srt file' };
      }
    }

    console.log('❌ Video caption button not found — ensure a video is uploaded in compose');
    console.log('⚠️ Only videos (not GIFs or images) support caption files');
    return { success: false, error: 'Caption button not found — upload a video first' };
  };

  // ==========================================================================
  // 10. Post to Circle
  // ==========================================================================

  /**
   * Set the audience to "Twitter Circle" before posting.
   * Call this with compose open, before clicking post.
   *
   * @param {string} [text] - Optional text to compose. If provided, opens compose and types it.
   */
  const postToCircle = async (text) => {
    console.log('🔄 Setting audience to Twitter Circle...');

    if (text) {
      const textarea = await ensureComposeOpen();
      if (!textarea) return { success: false, error: 'Could not open compose' };
      textarea.focus();
      await sleep(300);
      typeText(text);
      await sleep(500);
    }

    // Click the audience selector (usually says "Everyone" by default)
    const audienceBtn = document.querySelector(SEL.audienceSelector)
      || document.querySelector('[data-testid="audienceSelector"]')
      || document.querySelector('[aria-label*="Choose audience"]')
      || document.querySelector('[aria-label*="audience"]');

    if (!audienceBtn) {
      // Try finding the "Everyone" text button at the top of compose
      const allBtns = document.querySelectorAll('button, [role="button"]');
      let found = null;
      for (const btn of allBtns) {
        const txt = btn.textContent.toLowerCase();
        if (txt.includes('everyone') || txt.includes('public')) {
          found = btn;
          break;
        }
      }
      if (!found) {
        console.log('❌ Audience selector not found');
        return { success: false, error: 'Audience selector not found' };
      }
      found.click();
    } else {
      audienceBtn.click();
    }

    await sleep(1500);

    // Select "Twitter Circle" from the audience options
    const options = document.querySelectorAll('[role="menuitem"], [role="option"], [role="radio"], [role="listbox"] div');
    for (const option of options) {
      const text = option.textContent.toLowerCase();
      if (text.includes('circle')) {
        option.click();
        await sleep(1000);

        // May need to click a Done/Confirm button
        const doneBtn = document.querySelector('[data-testid="confirmationSheetConfirm"]')
          || document.querySelector('[data-testid="done"]');
        if (doneBtn) {
          doneBtn.click();
          await sleep(500);
        }

        console.log('✅ Audience set to Twitter Circle');
        return { success: true };
      }
    }

    // Close the menu if Circle not found
    document.body.click();
    await sleep(300);

    console.log('❌ Twitter Circle option not found — you may need to set up your Circle first');
    console.log('⚠️ Go to Settings > Privacy > Audience to manage your Circle');
    return { success: false, error: 'Twitter Circle option not found' };
  };

  // ==========================================================================
  // 11. Post with Voice
  // ==========================================================================

  /**
   * Start recording a voice tweet.
   * Opens compose and clicks the voice recording button.
   * The user must grant microphone permission and manually stop recording.
   */
  const postWithVoice = async () => {
    console.log('🔄 Starting voice tweet...');

    const textarea = await ensureComposeOpen();
    if (!textarea) return { success: false, error: 'Could not open compose' };

    await sleep(500);

    // Look for the voice/microphone button in the compose toolbar
    const voiceBtn = document.querySelector('[aria-label="Voice"]')
      || document.querySelector('[aria-label="Record voice"]')
      || document.querySelector('[data-testid="voiceButton"]')
      || document.querySelector('[aria-label*="voice"]')
      || document.querySelector('[aria-label*="microphone"]')
      || document.querySelector('[aria-label*="audio"]');

    if (voiceBtn) {
      voiceBtn.click();
      await sleep(1500);
      console.log('✅ Voice recording interface opened');
      console.log('🎙️ Grant microphone access if prompted, then record your message');
      console.log('⚠️ Click the stop button when done, then post normally');
      return { success: true, message: 'Voice recording started — speak and stop when done' };
    }

    // Fallback: scan toolbar buttons
    const toolbarBtns = document.querySelectorAll('[role="toolbar"] button, [data-testid="toolBar"] button');
    for (const btn of toolbarBtns) {
      const label = (btn.getAttribute('aria-label') || '').toLowerCase();
      if (label.includes('voice') || label.includes('audio') || label.includes('record') || label.includes('microphone')) {
        btn.click();
        await sleep(1500);
        console.log('✅ Voice recording interface opened');
        return { success: true, message: 'Voice recording started' };
      }
    }

    console.log('❌ Voice tweet button not found');
    console.log('⚠️ Voice tweets may only be available on the X mobile app or require specific account features');
    return { success: false, error: 'Voice tweet button not found — may be mobile-only' };
  };

  // ==========================================================================
  // Expose on window.XActions.postAdvanced
  // ==========================================================================

  if (!window.XActions) window.XActions = {};

  window.XActions.postAdvanced = {
    undoPost,
    postLongContent,
    formatSelectedText,
    boldText,
    italicText,
    strikethroughText,
    addLocation,
    tagPeopleInMedia,
    markSensitiveContent,
    saveDraft,
    loadDrafts,
    deleteAllDrafts,
    highlightPost,
    addVideoCaptions,
    postToCircle,
    postWithVoice,
  };

  // ==========================================================================
  // Menu
  // ==========================================================================

  console.log(`
╔══════════════════════════════════════════════════════════════╗
║               XActions — Advanced Post Features              ║
╠══════════════════════════════════════════════════════════════╣
║                                                              ║
║  🔄 XActions.postAdvanced.undoPost()                         ║
║     Watch for and click Undo after posting                   ║
║                                                              ║
║  📝 XActions.postAdvanced.postLongContent(text)              ║
║     Post up to 25K chars (Premium)                           ║
║                                                              ║
║  🅱️  XActions.postAdvanced.boldText()                        ║
║  🔤 XActions.postAdvanced.italicText()                       ║
║  ✂️  XActions.postAdvanced.strikethroughText()                ║
║  🎨 XActions.postAdvanced.formatSelectedText(type)           ║
║     Format selected text (bold/italic/strikethrough)         ║
║                                                              ║
║  📍 XActions.postAdvanced.addLocation(placeName)             ║
║     Tag a location on your post                              ║
║                                                              ║
║  🏷️  XActions.postAdvanced.tagPeopleInMedia([usernames])     ║
║     Tag people in uploaded photos                            ║
║                                                              ║
║  ⚠️  XActions.postAdvanced.markSensitiveContent()            ║
║     Flag media as potentially sensitive                      ║
║                                                              ║
║  💾 XActions.postAdvanced.saveDraft()                        ║
║  📂 XActions.postAdvanced.loadDrafts()                       ║
║  🗑️  XActions.postAdvanced.deleteAllDrafts()                 ║
║     Manage compose drafts                                    ║
║                                                              ║
║  ⭐ XActions.postAdvanced.highlightPost(postUrl?)            ║
║     Highlight post on profile (Premium)                      ║
║                                                              ║
║  🎬 XActions.postAdvanced.addVideoCaptions()                 ║
║     Add .srt subtitles to uploaded video                     ║
║                                                              ║
║  🔵 XActions.postAdvanced.postToCircle(text?)                ║
║     Post to Twitter Circle (limited audience)                ║
║                                                              ║
║  🎙️  XActions.postAdvanced.postWithVoice()                   ║
║     Create a voice tweet                                     ║
║                                                              ║
╚══════════════════════════════════════════════════════════════╝
  `);

  console.log('✅ XActions Advanced Post loaded — access via XActions.postAdvanced.*');
})();
