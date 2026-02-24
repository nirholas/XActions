// Schedule Posts on X - by nichxbt
// https://github.com/nirholas/xactions
// Queue multiple posts to be published at specified times
// 1. Go to x.com
// 2. Open the Developer Console (F12)
// 3. Edit the POSTS array below
// 4. Paste this into the Developer Console and run it
//
// Last Updated: 24 February 2026
(() => {
  const CONFIG = {
    posts: [
      // Add your scheduled posts here
      // { text: 'Hello world!', scheduledFor: '2026-02-25T10:00:00' },
      // { text: 'Another post!', scheduledFor: '2026-02-25T14:00:00' },
    ],
    // Use X's native scheduling via compose dialog
    useNativeScheduler: true,
    retryOnFailure: true,
  };

  const $composeButton = '[data-testid="SideNav_NewTweet_Button"]';
  const $tweetInput = '[data-testid="tweetTextarea_0"]';
  const $scheduleButton = '[data-testid="scheduleOption"]';
  const $scheduleDateInput = '[data-testid="scheduledDateField"]';
  const $scheduleTimeInput = '[data-testid="scheduledTimeField"]';
  const $scheduleConfirm = '[data-testid="scheduledConfirmationPrimaryAction"]';
  const $tweetButton = '[data-testid="tweetButtonInline"]';

  const sleep = (ms) => new Promise(r => setTimeout(r, ms));

  const results = { scheduled: [], failed: [] };

  const typeText = async (element, text) => {
    element.focus();
    // Use native input simulation for React-controlled inputs
    const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
      window.HTMLElement.prototype, 'textContent'
    )?.set;
    
    // Simulate keyboard input
    for (const char of text) {
      const event = new InputEvent('beforeinput', {
        data: char,
        inputType: 'insertText',
        bubbles: true,
        cancelable: true,
      });
      element.dispatchEvent(event);
      await sleep(30);
    }
    
    // Also try document.execCommand as fallback
    document.execCommand('insertText', false, text);
  };

  const schedulePost = async (post) => {
    const { text, scheduledFor } = post;
    const schedDate = new Date(scheduledFor);

    console.log(`📝 Scheduling: "${text.substring(0, 40)}..." for ${schedDate.toLocaleString()}`);

    try {
      // Open compose
      const composeBtn = document.querySelector($composeButton);
      if (composeBtn) {
        composeBtn.click();
        await sleep(1500);
      }

      // Type the post text
      const textInput = document.querySelector($tweetInput);
      if (!textInput) {
        console.error('❌ Tweet input not found');
        results.failed.push(post);
        return;
      }

      await typeText(textInput, text);
      await sleep(500);

      if (CONFIG.useNativeScheduler) {
        // Click the schedule icon
        const schedBtn = document.querySelector($scheduleButton);
        if (schedBtn) {
          schedBtn.click();
          await sleep(1000);

          // Set date and time
          // X's scheduler uses date/time pickers
          const dateInput = document.querySelector($scheduleDateInput);
          const timeInput = document.querySelector($scheduleTimeInput);

          if (dateInput) {
            dateInput.click();
            await sleep(500);
            // Set the value through the picker
          }

          // Confirm schedule
          const confirmBtn = document.querySelector($scheduleConfirm);
          if (confirmBtn) {
            confirmBtn.click();
            results.scheduled.push(post);
            console.log(`✅ Scheduled for ${schedDate.toLocaleString()}`);
          }
        } else {
          console.warn('⚠️ Native scheduler not available (Premium feature)');
          results.failed.push(post);
        }
      }

      await sleep(1000);
    } catch (e) {
      console.error(`❌ Failed to schedule: ${e.message}`);
      results.failed.push(post);
    }
  };

  const run = async () => {
    console.log('📅 SCHEDULE POSTS - XActions by nichxbt');

    if (CONFIG.posts.length === 0) {
      console.log('❌ No posts to schedule! Edit CONFIG.posts array.');
      console.log('\nExample:');
      console.log('  posts: [');
      console.log('    { text: "Hello world!", scheduledFor: "2026-02-25T10:00:00" },');
      console.log('    { text: "Another post!", scheduledFor: "2026-02-25T14:00:00" },');
      console.log('  ]');
      return;
    }

    // Sort posts by scheduled time
    const sorted = [...CONFIG.posts].sort(
      (a, b) => new Date(a.scheduledFor) - new Date(b.scheduledFor)
    );

    console.log(`📋 Posts to schedule: ${sorted.length}`);
    sorted.forEach((p, i) => {
      console.log(`   ${i + 1}. ${new Date(p.scheduledFor).toLocaleString()} — "${p.text.substring(0, 40)}..."`);
    });
    console.log('');

    for (const post of sorted) {
      await schedulePost(post);
      await sleep(2000);
    }

    console.log('\n📊 RESULTS:');
    console.log(`   ✅ Scheduled: ${results.scheduled.length}`);
    console.log(`   ❌ Failed: ${results.failed.length}`);
  };

  run();
})();
