// Video Captions Uploader on X - by nichxbt
// https://github.com/nirholas/xactions
// Add captions/subtitles to a video when composing a tweet
// 1. Go to x.com and open the compose tweet dialog
// 2. Upload a video first
// 3. Open Developer Console (F12)
// 4. Edit CONFIG below with your caption file path
// 5. Paste and run
//
// Supports .srt and .vtt caption files
//
// Last Updated: 30 March 2026
(() => {
  'use strict';

  const CONFIG = {
    // ── Caption Settings ──
    captionText: '',            // Raw caption text (SRT or VTT format) — paste here if not using file upload
    language: 'en',             // Caption language code (e.g., 'en', 'es', 'fr', 'ja')
    languageLabel: 'English',   // Display label for the language

    // ── Optional Tweet Text ──
    tweetText: '',              // Text to include with the video tweet

    // ── Timing ──
    minDelay: 1000,
    maxDelay: 2000,
    uploadWaitTime: 5000,       // Time to wait for video processing
  };

  // ── Selectors ──
  const SEL = {
    tweetTextarea:   '[data-testid="tweetTextarea_0"]',
    tweetButton:     '[data-testid="tweetButton"]',
    fileInput:       '[data-testid="fileInput"]',
    addCaptions:     '[data-testid="addCaptions"]',
    captionFileInput:'[data-testid="captionFileInput"]',
    composeDialog:   '[data-testid="twit-compose-dialog"]',
    toolBar:         '[data-testid="toolBar"]',
    attachments:     '[data-testid="attachments"]',
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

  // ── Generate SRT Content ──
  const generateSampleSrt = () => {
    return [
      '1',
      '00:00:00,000 --> 00:00:05,000',
      'This is a sample caption.',
      '',
      '2',
      '00:00:05,000 --> 00:00:10,000',
      'Replace CONFIG.captionText with your actual captions.',
      '',
    ].join('\n');
  };

  // ── Create Caption File Blob ──
  const createCaptionFile = (text, format = 'srt') => {
    const mimeType = format === 'vtt' ? 'text/vtt' : 'application/x-subrip';
    const extension = format === 'vtt' ? '.vtt' : '.srt';
    const blob = new Blob([text], { type: mimeType });
    const file = new File([blob], `captions_${CONFIG.language}${extension}`, { type: mimeType });
    return file;
  };

  // ── Detect Caption Format ──
  const detectFormat = (text) => {
    if (text.trim().startsWith('WEBVTT')) return 'vtt';
    return 'srt';
  };

  // ── Upload Captions ──
  const uploadCaptions = async () => {
    // Check if we're in the compose dialog
    const textarea = await waitForElement(SEL.tweetTextarea, 5000);
    if (!textarea) {
      console.error('❌ Compose dialog not found. Please open the tweet composer first.');
      console.log('💡 Click the "Post" button or press the compose shortcut to open it.');
      return;
    }

    // Check if a video/media is attached
    console.log('🔄 Checking for uploaded video...');
    const attachments = await waitForElement(SEL.attachments, 3000);
    if (!attachments) {
      console.warn('⚠️  No media attachments detected. Please upload a video first.');
      console.log('💡 Steps: Click the media icon → select a video → wait for it to process → then run this script.');
      return;
    }

    // Look for the "Add captions" button
    console.log('🔄 Looking for caption upload option...');
    const addCaptionsBtn = await waitForElement(SEL.addCaptions, 5000);

    if (addCaptionsBtn) {
      console.log('🔄 Opening caption upload...');
      addCaptionsBtn.click();
      await sleep(randomDelay());
    } else {
      console.log('⚠️  "Add captions" button not found. Attempting to find caption input directly...');
    }

    // Determine caption content
    let captionContent = CONFIG.captionText;
    if (!captionContent) {
      console.warn('⚠️  No caption text provided in CONFIG.captionText.');
      console.log('💡 Using sample captions. Edit CONFIG.captionText with your actual captions.');
      captionContent = generateSampleSrt();
    }

    const format = detectFormat(captionContent);
    console.log(`📝 Caption format detected: ${format.toUpperCase()}`);

    // Create the caption file
    const captionFile = createCaptionFile(captionContent, format);

    // Find the caption file input and upload
    const captionInput = await waitForElement(SEL.captionFileInput, 5000);
    if (captionInput) {
      // Use DataTransfer to set the file on the input
      const dataTransfer = new DataTransfer();
      dataTransfer.items.add(captionFile);
      captionInput.files = dataTransfer.files;

      // Dispatch change event
      captionInput.dispatchEvent(new Event('change', { bubbles: true }));
      await sleep(randomDelay());
      console.log(`✅ Caption file uploaded (${CONFIG.languageLabel} - ${format.toUpperCase()})`);
    } else {
      // Fallback: look for any file input that might be for captions
      const fileInputs = document.querySelectorAll('input[type="file"]');
      let found = false;
      for (const input of fileInputs) {
        const accept = input.getAttribute('accept') || '';
        if (accept.includes('.srt') || accept.includes('.vtt') || accept.includes('subtitle')) {
          const dataTransfer = new DataTransfer();
          dataTransfer.items.add(captionFile);
          input.files = dataTransfer.files;
          input.dispatchEvent(new Event('change', { bubbles: true }));
          found = true;
          await sleep(randomDelay());
          console.log(`✅ Caption file uploaded via fallback input.`);
          break;
        }
      }

      if (!found) {
        console.error('❌ Could not find caption file input element.');
        console.log('💡 Make sure you have uploaded a video first and the caption option is available.');
        console.log('💡 You may need to click on the video thumbnail to access caption settings.');
        return;
      }
    }

    // Optionally add tweet text
    if (CONFIG.tweetText) {
      console.log('🔄 Adding tweet text...');
      textarea.focus();
      await sleep(300);
      document.execCommand('insertText', false, CONFIG.tweetText);
      await sleep(randomDelay());
      console.log(`✅ Tweet text added: "${CONFIG.tweetText}"`);
    }

    console.log('');
    console.log('✅ Captions ready! Review your tweet and click "Post" to publish.');
    console.log(`   Language: ${CONFIG.languageLabel} (${CONFIG.language})`);
    console.log(`   Format: ${format.toUpperCase()}`);
  };

  // ── Main ──
  const run = async () => {
    console.log('═══════════════════════════════════════');
    console.log('🎬 XActions — Video Captions Uploader');
    console.log('═══════════════════════════════════════');

    await uploadCaptions();

    console.log('═══════════════════════════════════════');
    console.log('🏁 Done! — by nichxbt');
  };

  run();
})();
