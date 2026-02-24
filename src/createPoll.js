// Create Poll on X - by nichxbt
// https://github.com/nirholas/xactions
// Create a poll tweet programmatically
// 1. Go to x.com
// 2. Open the Developer Console (F12)
// 3. Edit the CONFIG below
// 4. Paste this into the Developer Console and run it
//
// Last Updated: 24 February 2026
(() => {
  const CONFIG = {
    // Poll question (the tweet text)
    question: 'What is your preferred programming language?',
    // Poll options (2-4 choices)
    options: [
      'JavaScript',
      'Python',
      'Rust',
      'Go',
    ],
    // Poll duration: 1 day, 3 days, 7 days
    durationDays: 1,
    durationHours: 0,
    durationMinutes: 0,
    dryRun: true,
  };

  const $composeButton = '[data-testid="SideNav_NewTweet_Button"]';
  const $tweetInput = '[data-testid="tweetTextarea_0"]';
  const $pollButton = '[data-testid="pollButton"]';
  const $pollOption1 = '[data-testid="pollOptionTextInput_0"]';
  const $pollOption2 = '[data-testid="pollOptionTextInput_1"]';
  const $pollOption3 = '[data-testid="pollOptionTextInput_2"]';
  const $pollOption4 = '[data-testid="pollOptionTextInput_3"]';
  const $addPollOption = '[data-testid="addPollOptionButton"]';
  const $tweetButton = '[data-testid="tweetButton"]';

  const sleep = (ms) => new Promise(r => setTimeout(r, ms));

  const run = async () => {
    console.log('📊 CREATE POLL - XActions by nichxbt');

    // Validate
    if (CONFIG.options.length < 2 || CONFIG.options.length > 4) {
      console.error('❌ Polls need 2-4 options!');
      return;
    }

    if (CONFIG.question.length > 280) {
      console.error(`❌ Question too long: ${CONFIG.question.length}/280 chars`);
      return;
    }

    for (const opt of CONFIG.options) {
      if (opt.length > 25) {
        console.error(`❌ Option "${opt}" exceeds 25 chars (${opt.length})`);
        return;
      }
    }

    console.log(`📋 Question: "${CONFIG.question}"`);
    CONFIG.options.forEach((o, i) => console.log(`   ${i + 1}. ${o}`));
    console.log(`   ⏱️ Duration: ${CONFIG.durationDays}d ${CONFIG.durationHours}h ${CONFIG.durationMinutes}m`);

    if (CONFIG.dryRun) {
      console.log('\n⚠️ DRY RUN MODE - Set CONFIG.dryRun = false to actually post');
      return;
    }

    // Open compose
    const composeBtn = document.querySelector($composeButton);
    if (composeBtn) {
      composeBtn.click();
      await sleep(1500);
    }

    // Type question
    const textInput = document.querySelector($tweetInput);
    if (!textInput) {
      console.error('❌ Compose box not found!');
      return;
    }
    textInput.focus();
    document.execCommand('insertText', false, CONFIG.question);
    await sleep(500);

    // Click poll icon
    const pollBtn = document.querySelector($pollButton);
    if (!pollBtn) {
      console.error('❌ Poll button not found! This may require Premium.');
      return;
    }
    pollBtn.click();
    await sleep(1000);

    // Fill in options
    const optionInputs = [$pollOption1, $pollOption2, $pollOption3, $pollOption4];

    for (let i = 0; i < CONFIG.options.length; i++) {
      if (i >= 2) {
        // Need to click "Add option" for options 3 and 4
        const addBtn = document.querySelector($addPollOption);
        if (addBtn) {
          addBtn.click();
          await sleep(500);
        }
      }

      const input = document.querySelector(optionInputs[i]);
      if (input) {
        input.focus();
        document.execCommand('insertText', false, CONFIG.options[i]);
        await sleep(300);
      }
    }

    await sleep(500);

    // Post
    const tweetBtn = document.querySelector($tweetButton);
    if (tweetBtn) {
      tweetBtn.click();
      console.log('\n✅ Poll posted!');
    } else {
      console.log('\n⚠️ Tweet button not found. Poll is ready — click Post manually.');
    }
  };

  run();
})();
