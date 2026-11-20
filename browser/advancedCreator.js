// Copyright (c) 2024-2026 nich (@nichxbt). Licensed under the Apache License, Version 2.0.
// browser/advancedCreator.js
// Advanced creator monetization for X/Twitter
// by nichxbt
// https://github.com/nirholas/XActions
//
// Features: creator subscriptions setup, subscription content management,
// ticketed Spaces, payout management, tax information, affiliate program.
//
// 1. Go to x.com
// 2. Open Developer Console (F12)
// 3. Paste this into the Developer Console and run it
// 4. Use window.XActions.advancedCreator.<function>() to run features
//
// Last Updated: 30 March 2026
(() => {
  'use strict';

  const sleep = (ms) => new Promise(r => setTimeout(r, ms));
  const $ = (s) => document.querySelector(s);
  const $$ = (s) => [...document.querySelectorAll(s)];

  const SEL = {
    primaryColumn: '[data-testid="primaryColumn"]',
    confirm: '[data-testid="confirmationSheetConfirm"]',
    toast: '[data-testid="toast"]',
    userCell: '[data-testid="UserCell"]',
    tweet: 'article[data-testid="tweet"]',
    tweetText: '[data-testid="tweetText"]',
    tweetButton: '[data-testid="tweetButton"]',
    tweetTextarea: '[data-testid="tweetTextarea_0"]',
    composeButton: 'a[data-testid="SideNav_NewTweet_Button"]',
    subscriptionInfo: '[data-testid="subscriptionInfo"]',
    revenueTab: '[data-testid="revenueTab"]',
    analyticsTab: '[data-testid="analyticsTab"]',
    scheduleSpace: '[data-testid="scheduleSpace"]',
    spaceButton: '[data-testid="SpaceButton"]',
    settingsSwitch: '[data-testid="settingsSwitch"]',
    backButton: '[data-testid="app-bar-back"]',
  };

  const STORAGE_KEY = 'xactions_advanced_creator';

  const waitForSelector = async (selector, timeout = 10000) => {
    const start = Date.now();
    while (Date.now() - start < timeout) {
      const el = $(selector);
      if (el) return el;
      await sleep(200);
    }
    return null;
  };

  const clickByText = async (text, tag = 'span, a, button, [role="menuitem"], [role="tab"]') => {
    const els = $$(tag);
    const el = els.find(e => e.textContent.trim().toLowerCase().includes(text.toLowerCase()));
    if (el) {
      el.click();
      await sleep(1500);
      return true;
    }
    return false;
  };

  const getPageText = () => {
    const main = $(SEL.primaryColumn) || document.querySelector('[role="main"]');
    return main ? main.textContent : document.body.textContent;
  };

  const saveToStorage = (key, data) => {
    try {
      const existing = JSON.parse(sessionStorage.getItem(STORAGE_KEY) || '{}');
      existing[key] = { ...data, savedAt: new Date().toISOString() };
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(existing));
      console.log('💾 Data saved to sessionStorage.');
    } catch (e) {
      console.log('⚠️ Could not save to sessionStorage.');
    }
  };

  // ─────────────────────────────────────────────────
  // 1. Set Up Creator Subscriptions
  // ─────────────────────────────────────────────────
  const setupSubscriptions = async (options = {}) => {
    const {
      navigateToSettings = true,
      tiers = null,
    } = options;

    console.log('🔄 Setting up creator subscriptions...');

    if (navigateToSettings) {
      console.log('🔄 Navigating to subscription settings...');
      window.location.href = 'https://x.com/settings/monetization';
      await sleep(3000);
    }

    const pageText = getPageText();

    if (pageText.includes('not eligible') || pageText.includes('Not eligible')) {
      console.log('❌ You are not yet eligible for creator subscriptions.');
      console.log('ℹ️  Requirements:');
      console.log('   ☐ X Premium subscription (Premium or Premium+)');
      console.log('   ☐ At least 500 followers');
      console.log('   ☐ Active account for 30+ days');
      console.log('   ☐ No recent X Rules violations');
      console.log('   ☐ Completed Stripe onboarding for payouts');
      return { success: false, reason: 'not_eligible' };
    }

    // Try to find and click the subscriptions section
    const subLink = $$('a, [role="link"], [role="menuitem"]').find(el =>
      el.textContent.toLowerCase().includes('subscription') &&
      !el.textContent.toLowerCase().includes('premium')
    );

    if (subLink) {
      subLink.click();
      await sleep(2000);
      console.log('✅ Opened subscription settings.');
    } else {
      console.log('ℹ️  Looking for subscription options on current page...');
    }

    // Check for existing subscription tiers
    const tierElements = $$('[data-testid*="tier"], [data-testid*="subscription"], [role="listitem"]').filter(el =>
      el.textContent.toLowerCase().includes('month') || el.textContent.toLowerCase().includes('$')
    );

    if (tierElements.length > 0) {
      console.log(`\n📋 Existing subscription tiers found: ${tierElements.length}`);
      tierElements.forEach((tier, i) => {
        const text = tier.textContent.trim().substring(0, 100);
        console.log(`   ${i + 1}. ${text}`);
      });
    }

    // Configure pricing tiers if provided
    if (tiers && Array.isArray(tiers)) {
      console.log('\n🔄 Configuring pricing tiers...');

      for (const tier of tiers) {
        console.log(`\n🏷️  Setting up tier: ${tier.name || 'Unnamed'} — $${tier.price || '?'}/mo`);

        // Look for "Add tier" or "Edit" buttons
        const addTierBtn = $$('button, [role="button"]').find(el =>
          el.textContent.toLowerCase().includes('add tier') ||
          el.textContent.toLowerCase().includes('add a tier') ||
          el.textContent.toLowerCase().includes('create tier')
        );

        if (addTierBtn) {
          addTierBtn.click();
          await sleep(2000);
          console.log('✅ Opened tier creation form.');

          // Fill in tier name
          const nameInput = $('input[name="tierName"], input[placeholder*="name" i], input[aria-label*="name" i]');
          if (nameInput && tier.name) {
            nameInput.focus();
            document.execCommand('selectAll', false, null);
            document.execCommand('insertText', false, tier.name);
            console.log(`   ✅ Set tier name: ${tier.name}`);
            await sleep(500);
          }

          // Fill in price
          const priceInput = $('input[name="price"], input[placeholder*="price" i], input[aria-label*="price" i], input[type="number"]');
          if (priceInput && tier.price) {
            priceInput.focus();
            document.execCommand('selectAll', false, null);
            document.execCommand('insertText', false, String(tier.price));
            console.log(`   ✅ Set price: $${tier.price}/mo`);
            await sleep(500);
          }

          // Fill in benefits/perks
          if (tier.perks && Array.isArray(tier.perks)) {
            const perkInputs = $$('input[placeholder*="perk" i], input[placeholder*="benefit" i], input[aria-label*="perk" i], textarea[placeholder*="benefit" i]');

            for (let i = 0; i < tier.perks.length; i++) {
              const input = perkInputs[i];
              if (input) {
                input.focus();
                document.execCommand('selectAll', false, null);
                document.execCommand('insertText', false, tier.perks[i]);
                console.log(`   ✅ Added perk: ${tier.perks[i]}`);
                await sleep(500);
              } else {
                // Try to click "Add perk" button
                const addPerkBtn = $$('button, [role="button"]').find(el =>
                  el.textContent.toLowerCase().includes('add perk') ||
                  el.textContent.toLowerCase().includes('add benefit')
                );
                if (addPerkBtn) {
                  addPerkBtn.click();
                  await sleep(1000);
                  const newInput = $$('input[placeholder*="perk" i], input[placeholder*="benefit" i], textarea[placeholder*="benefit" i]').pop();
                  if (newInput) {
                    newInput.focus();
                    document.execCommand('insertText', false, tier.perks[i]);
                    console.log(`   ✅ Added perk: ${tier.perks[i]}`);
                    await sleep(500);
                  }
                }
              }
            }
          }

          // Save the tier
          const saveBtn = $$('button, [role="button"]').find(el =>
            el.textContent.toLowerCase().includes('save') ||
            el.textContent.toLowerCase().includes('done') ||
            el.textContent.toLowerCase().includes('confirm')
          );
          if (saveBtn) {
            saveBtn.click();
            await sleep(2000);
            console.log(`   ✅ Tier "${tier.name}" saved.`);
          } else {
            console.log('   ⚠️ Save button not found. You may need to save manually.');
          }
        } else {
          console.log('   ⚠️ "Add tier" button not found. You may already have maximum tiers configured.');
        }

        await sleep(1500);
      }
    }

    // Show suggested tier structure
    console.log('\n💡 Suggested subscription tiers:');
    console.log('   Tier 1 — $2.99/mo: Subscriber badge, subscriber-only posts, priority replies');
    console.log('   Tier 2 — $4.99/mo: + Early access content, subscriber-only Spaces');
    console.log('   Tier 3 — $9.99/mo: + DM access, behind-the-scenes, special recognition');

    saveToStorage('subscriptions', { configured: true, tiers: tiers || 'default' });

    console.log('\n✅ Subscription setup complete.');
    console.log('💡 Manage subscriptions: https://x.com/settings/monetization');
    return { success: true };
  };

  // ─────────────────────────────────────────────────
  // 2. Manage Subscription Content
  // ─────────────────────────────────────────────────
  const manageSubscriptionContent = async (options = {}) => {
    const {
      action = 'create',
      text = '',
      subscriberOnly = true,
    } = options;

    console.log('🔄 Managing subscription content...');

    if (action === 'create') {
      console.log('📝 Creating subscriber-only post...');

      // Click compose button
      const composeBtn = $(SEL.composeButton);
      if (composeBtn) {
        composeBtn.click();
        await sleep(2000);
      } else {
        console.log('⚠️ Compose button not found. Trying keyboard shortcut...');
        document.dispatchEvent(new KeyboardEvent('keydown', { key: 'n' }));
        await sleep(2000);
      }

      // Wait for textarea
      const textarea = await waitForSelector(SEL.tweetTextarea, 5000);
      if (!textarea) {
        console.log('❌ Tweet compose area not found.');
        return { success: false, reason: 'compose_not_found' };
      }

      // Type the post text
      if (text) {
        textarea.focus();
        document.execCommand('insertText', false, text);
        console.log(`✅ Entered post text (${text.length} chars).`);
        await sleep(1000);
      }

      // Enable subscriber-only toggle
      if (subscriberOnly) {
        console.log('🔒 Setting post as subscriber-only...');

        // Look for the audience/circle selector or subscriber-only toggle
        const audienceBtn = $$('button, [role="button"]').find(el =>
          el.textContent.toLowerCase().includes('everyone') ||
          el.textContent.toLowerCase().includes('audience') ||
          el.getAttribute('aria-label')?.toLowerCase().includes('audience')
        );

        if (audienceBtn) {
          audienceBtn.click();
          await sleep(1500);

          // Select "Subscribers only" from the dropdown
          const subOption = $$('[role="menuitem"], [role="option"], [role="listbox"] [role="option"]').find(el =>
            el.textContent.toLowerCase().includes('subscriber')
          );

          if (subOption) {
            subOption.click();
            await sleep(1000);
            console.log('✅ Post set to subscriber-only.');
          } else {
            console.log('⚠️ Subscriber-only option not found. You may need X Premium.');
          }
        } else {
          // Try looking for a specific subscriber-only toggle
          const subToggle = $$('input[type="checkbox"], [role="switch"], [data-testid="settingsSwitch"]').find(el => {
            const parent = el.closest('[role="listitem"], div');
            return parent?.textContent?.toLowerCase().includes('subscriber');
          });

          if (subToggle) {
            subToggle.click();
            await sleep(1000);
            console.log('✅ Subscriber-only toggle enabled.');
          } else {
            console.log('⚠️ Could not find subscriber-only toggle.');
            console.log('ℹ️  Tip: After composing, click the audience selector below the text area.');
          }
        }
      }

      if (text) {
        console.log('ℹ️  Post is ready to send. Click "Post" to publish.');
        console.log('💡 Review the post before publishing.');
      }

      return { success: true, action: 'compose_ready' };
    }

    if (action === 'list') {
      console.log('📋 Listing subscriber-only posts...');

      // Navigate to profile
      const profileLink = $('a[data-testid="AppTabBar_Profile_Link"]');
      if (profileLink) {
        profileLink.click();
        await sleep(2000);
      }

      // Look for subscriber-only content indicators
      const tweets = $$(SEL.tweet);
      const subscriberPosts = [];

      for (const tweet of tweets) {
        const lockIcon = tweet.querySelector('[aria-label*="subscriber" i], [data-testid*="lock"], svg[aria-label*="lock" i]');
        const subLabel = tweet.querySelector('span');
        const isSubscriberOnly = lockIcon || (subLabel && subLabel.textContent.toLowerCase().includes('subscriber'));

        if (isSubscriberOnly) {
          const tweetText = tweet.querySelector(SEL.tweetText)?.textContent || '';
          const time = tweet.querySelector('time')?.getAttribute('datetime') || '';
          const link = tweet.querySelector('a[href*="/status/"]')?.href || '';
          subscriberPosts.push({ text: tweetText.substring(0, 100), time, link });
        }
      }

      if (subscriberPosts.length > 0) {
        console.log(`\n🔒 Subscriber-only posts found: ${subscriberPosts.length}`);
        subscriberPosts.forEach((post, i) => {
          console.log(`   ${i + 1}. ${post.text}...`);
          console.log(`      📅 ${post.time || 'Unknown date'} | 🔗 ${post.link || 'No link'}`);
        });
      } else {
        console.log('ℹ️  No subscriber-only posts found on current page.');
        console.log('💡 Scroll down to load more posts, then re-run.');
      }

      saveToStorage('subscriberPosts', { posts: subscriberPosts });
      return { success: true, posts: subscriberPosts };
    }

    console.log(`❌ Unknown action: "${action}". Use "create" or "list".`);
    return { success: false, reason: 'unknown_action' };
  };

  // ─────────────────────────────────────────────────
  // 3. Ticketed Spaces Setup
  // ─────────────────────────────────────────────────
  const setupTicketedSpace = async (options = {}) => {
    const {
      title = '',
      description = '',
      price = null,
      scheduledDate = null,
      scheduledTime = null,
    } = options;

    console.log('🎫 Setting up ticketed Space...');

    // Navigate to Spaces creation
    const spaceBtn = $(SEL.spaceButton);
    if (spaceBtn) {
      spaceBtn.click();
      await sleep(2000);
      console.log('✅ Opened Spaces menu.');
    } else {
      console.log('🔄 Navigating to Spaces...');
      window.location.href = 'https://x.com/i/spaces/start';
      await sleep(3000);
    }

    // Look for schedule option
    const scheduleBtn = $(SEL.scheduleSpace) || $$('button, [role="button"]').find(el =>
      el.textContent.toLowerCase().includes('schedule') ||
      el.getAttribute('aria-label')?.toLowerCase().includes('schedule')
    );

    if (scheduleBtn) {
      scheduleBtn.click();
      await sleep(2000);
      console.log('✅ Opened schedule Space form.');
    }

    // Fill in title
    if (title) {
      const titleInput = $('input[placeholder*="name" i], input[placeholder*="title" i], input[aria-label*="title" i], input[aria-label*="name" i]');
      if (titleInput) {
        titleInput.focus();
        document.execCommand('selectAll', false, null);
        document.execCommand('insertText', false, title);
        console.log(`✅ Set Space title: "${title}"`);
        await sleep(500);
      }
    }

    // Fill in description
    if (description) {
      const descInput = $('textarea[placeholder*="description" i], textarea[aria-label*="description" i], input[placeholder*="description" i]');
      if (descInput) {
        descInput.focus();
        document.execCommand('selectAll', false, null);
        document.execCommand('insertText', false, description);
        console.log(`✅ Set description: "${description.substring(0, 50)}..."`);
        await sleep(500);
      }
    }

    // Enable ticketed option
    console.log('🔄 Looking for ticketed toggle...');
    const ticketedToggle = $$('[role="switch"], input[type="checkbox"], [data-testid="settingsSwitch"]').find(el => {
      const parent = el.closest('[role="listitem"], div, label');
      return parent?.textContent?.toLowerCase().includes('ticket');
    });

    if (ticketedToggle) {
      const isEnabled = ticketedToggle.getAttribute('aria-checked') === 'true' || ticketedToggle.checked;
      if (!isEnabled) {
        ticketedToggle.click();
        await sleep(1500);
        console.log('✅ Ticketed Space enabled.');
      } else {
        console.log('ℹ️  Ticketed option already enabled.');
      }
    } else {
      const ticketedBtn = $$('button, [role="button"], [role="menuitem"]').find(el =>
        el.textContent.toLowerCase().includes('ticket')
      );
      if (ticketedBtn) {
        ticketedBtn.click();
        await sleep(1500);
        console.log('✅ Clicked ticketed option.');
      } else {
        console.log('⚠️ Ticketed toggle not found. Ticketed Spaces may require Premium+ or creator eligibility.');
      }
    }

    // Set price
    if (price) {
      const priceInput = $('input[placeholder*="price" i], input[aria-label*="price" i], input[type="number"]');
      if (priceInput) {
        priceInput.focus();
        document.execCommand('selectAll', false, null);
        document.execCommand('insertText', false, String(price));
        console.log(`✅ Set ticket price: $${price}`);
        await sleep(500);
      } else {
        console.log(`⚠️ Price input not found. Set price manually to $${price}.`);
      }
    }

    // Set scheduled date/time
    if (scheduledDate) {
      const dateInput = $('input[type="date"], input[placeholder*="date" i], input[aria-label*="date" i]');
      if (dateInput) {
        dateInput.focus();
        document.execCommand('selectAll', false, null);
        document.execCommand('insertText', false, scheduledDate);
        console.log(`✅ Set date: ${scheduledDate}`);
        await sleep(500);
      }
    }

    if (scheduledTime) {
      const timeInput = $('input[type="time"], input[placeholder*="time" i], input[aria-label*="time" i]');
      if (timeInput) {
        timeInput.focus();
        document.execCommand('selectAll', false, null);
        document.execCommand('insertText', false, scheduledTime);
        console.log(`✅ Set time: ${scheduledTime}`);
        await sleep(500);
      }
    }

    console.log('\n💡 Ticketed Spaces tips:');
    console.log('   • Minimum ticket price: $1.00');
    console.log('   • Maximum ticket price: $999.00');
    console.log('   • X takes a percentage of ticket revenue');
    console.log('   • Promote your Space in advance for maximum attendance');
    console.log('   • Set a clear topic to attract the right audience');

    console.log('\nℹ️  Review all settings, then click "Schedule" or "Start" to launch.');
    return { success: true };
  };

  // ─────────────────────────────────────────────────
  // 4. Payout Management
  // ─────────────────────────────────────────────────
  const managePayouts = async (options = {}) => {
    const {
      navigateToSettings = true,
      viewHistory = true,
    } = options;

    console.log('💵 Managing payouts...');

    if (navigateToSettings) {
      console.log('🔄 Navigating to payout settings...');
      window.location.href = 'https://x.com/settings/monetization';
      await sleep(3000);

      // Try to find and click payout link
      const payoutLink = $$('a, [role="link"], [role="menuitem"]').find(el =>
        el.textContent.toLowerCase().includes('payout') ||
        el.textContent.toLowerCase().includes('payment')
      );

      if (payoutLink) {
        payoutLink.click();
        await sleep(2000);
        console.log('✅ Opened payout settings.');
      }
    }

    const pageText = getPageText();

    // Check payout method status
    if (pageText.toLowerCase().includes('stripe')) {
      console.log('✅ Stripe integration detected.');
    }

    if (pageText.toLowerCase().includes('set up') && pageText.toLowerCase().includes('payout')) {
      console.log('⚠️ Payout method not configured. You need to set up Stripe.');

      const setupBtn = $$('button, a, [role="button"], [role="link"]').find(el =>
        el.textContent.toLowerCase().includes('set up') ||
        el.textContent.toLowerCase().includes('connect') ||
        el.textContent.toLowerCase().includes('get started')
      );

      if (setupBtn) {
        console.log('ℹ️  Found "Set up" button. Click it to begin Stripe onboarding.');
        console.log('💡 Stripe onboarding will open in a new tab.');
      }
    }

    // View payout history
    if (viewHistory) {
      console.log('\n📊 Payout information:');

      // Extract any visible payout data
      const main = $(SEL.primaryColumn) || $('[role="main"]');
      if (main) {
        const rows = main.querySelectorAll('[role="row"], [role="listitem"], tr');
        const payoutEntries = [];

        rows.forEach(row => {
          const text = row.textContent.trim();
          if (text.includes('$') || text.toLowerCase().includes('payout') || text.toLowerCase().includes('pending')) {
            payoutEntries.push(text.substring(0, 150));
          }
        });

        if (payoutEntries.length > 0) {
          console.log('\n💰 Payout entries:');
          payoutEntries.forEach((entry, i) => {
            console.log(`   ${i + 1}. ${entry}`);
          });
        }

        // Look for summary amounts
        const amounts = main.textContent.match(/\$[\d,]+\.?\d*/g);
        if (amounts && amounts.length > 0) {
          console.log('\n💲 Amounts detected on page:');
          amounts.forEach(a => console.log(`   ${a}`));
        }
      }

      // Check for pending payouts
      if (pageText.toLowerCase().includes('pending')) {
        console.log('\n⏳ You have pending payouts.');
      }

      if (pageText.toLowerCase().includes('completed') || pageText.toLowerCase().includes('paid')) {
        console.log('✅ Completed payouts found.');
      }
    }

    // Extract payout schedule info
    if (pageText.toLowerCase().includes('next payout') || pageText.toLowerCase().includes('payout date')) {
      console.log('📅 Next payout date info available on this page.');
    }

    console.log('\n💡 Payout notes:');
    console.log('   • Payouts are processed via Stripe');
    console.log('   • Minimum payout threshold: $50');
    console.log('   • Payouts are typically processed within 2-5 business days');
    console.log('   • X deducts platform fees before payout');

    saveToStorage('payouts', { checked: true });

    console.log('\n✅ Payout review complete.');
    return { success: true };
  };

  // ─────────────────────────────────────────────────
  // 5. Tax Information Management
  // ─────────────────────────────────────────────────
  const manageTaxInfo = async (options = {}) => {
    const {
      navigateToSettings = true,
      viewStatus = true,
    } = options;

    console.log('📄 Managing tax information...');

    if (navigateToSettings) {
      console.log('🔄 Navigating to tax settings...');
      window.location.href = 'https://x.com/settings/monetization';
      await sleep(3000);

      // Navigate to tax info section
      const taxLink = $$('a, [role="link"], [role="menuitem"]').find(el =>
        el.textContent.toLowerCase().includes('tax') ||
        el.textContent.toLowerCase().includes('w-9') ||
        el.textContent.toLowerCase().includes('w-8')
      );

      if (taxLink) {
        taxLink.click();
        await sleep(2000);
        console.log('✅ Opened tax information settings.');
      } else {
        console.log('ℹ️  Tax info link not found on this page. Checking sub-sections...');

        // Try navigating through payout settings
        const payoutLink = $$('a, [role="link"]').find(el =>
          el.textContent.toLowerCase().includes('payout') ||
          el.textContent.toLowerCase().includes('payment')
        );
        if (payoutLink) {
          payoutLink.click();
          await sleep(2000);
          const taxSubLink = $$('a, [role="link"]').find(el =>
            el.textContent.toLowerCase().includes('tax')
          );
          if (taxSubLink) {
            taxSubLink.click();
            await sleep(2000);
            console.log('✅ Found tax settings in payout section.');
          }
        }
      }
    }

    const pageText = getPageText();

    if (viewStatus) {
      console.log('\n📋 Tax form status:');

      // Check for W-9 (US persons)
      if (pageText.toLowerCase().includes('w-9')) {
        const w9Status = pageText.toLowerCase().includes('w-9') && pageText.toLowerCase().includes('complete')
          ? 'completed' : 'pending/not submitted';
        console.log(`   🇺🇸 W-9 (US Tax Form): ${w9Status}`);
      }

      // Check for W-8BEN (non-US persons)
      if (pageText.toLowerCase().includes('w-8ben')) {
        const w8Status = pageText.toLowerCase().includes('w-8ben') && pageText.toLowerCase().includes('complete')
          ? 'completed' : 'pending/not submitted';
        console.log(`   🌍 W-8BEN (Non-US Tax Form): ${w8Status}`);
      }

      // Check general status
      if (pageText.toLowerCase().includes('tax information') || pageText.toLowerCase().includes('tax form')) {
        if (pageText.toLowerCase().includes('submitted') || pageText.toLowerCase().includes('verified') || pageText.toLowerCase().includes('approved')) {
          console.log('   ✅ Tax information has been submitted.');
        } else if (pageText.toLowerCase().includes('action required') || pageText.toLowerCase().includes('incomplete')) {
          console.log('   ⚠️ Action required: Tax information is incomplete.');
        } else {
          console.log('   ℹ️  Tax form status could not be determined automatically.');
        }
      }

      // Look for update/edit button
      const editTaxBtn = $$('button, a, [role="button"]').find(el =>
        el.textContent.toLowerCase().includes('update tax') ||
        el.textContent.toLowerCase().includes('edit tax') ||
        el.textContent.toLowerCase().includes('submit tax') ||
        el.textContent.toLowerCase().includes('fill out')
      );

      if (editTaxBtn) {
        console.log('\n📝 Tax form update button found. Use it to update your information.');
        console.log(`   Button text: "${editTaxBtn.textContent.trim()}"`);
      }
    }

    console.log('\n💡 Tax information notes:');
    console.log('   • US residents: Submit W-9 form');
    console.log('   • Non-US residents: Submit W-8BEN form');
    console.log('   • Tax info is required before receiving payouts');
    console.log('   • Forms are processed by Stripe (X\'s payment processor)');
    console.log('   • Consult a tax professional for guidance');

    saveToStorage('taxInfo', { checked: true });

    console.log('\n✅ Tax information review complete.');
    return { success: true };
  };

  // ─────────────────────────────────────────────────
  // 6. Affiliate Program
  // ─────────────────────────────────────────────────
  const manageAffiliate = async (options = {}) => {
    const {
      action = 'status',
    } = options;

    console.log('🤝 Managing affiliate program...');

    if (action === 'enroll' || action === 'status') {
      console.log('🔄 Navigating to monetization settings...');
      window.location.href = 'https://x.com/settings/monetization';
      await sleep(3000);

      const pageText = getPageText();

      // Look for affiliate section
      const affiliateLink = $$('a, [role="link"], [role="menuitem"]').find(el =>
        el.textContent.toLowerCase().includes('affiliate') ||
        el.textContent.toLowerCase().includes('referral') ||
        el.textContent.toLowerCase().includes('refer')
      );

      if (affiliateLink) {
        affiliateLink.click();
        await sleep(2000);
        console.log('✅ Opened affiliate program section.');

        const updatedPageText = getPageText();

        // Check enrollment status
        if (updatedPageText.toLowerCase().includes('enrolled') || updatedPageText.toLowerCase().includes('active')) {
          console.log('✅ You are enrolled in the affiliate program.');
        } else if (updatedPageText.toLowerCase().includes('join') || updatedPageText.toLowerCase().includes('enroll') || updatedPageText.toLowerCase().includes('sign up')) {
          console.log('ℹ️  You are not yet enrolled in the affiliate program.');

          if (action === 'enroll') {
            const enrollBtn = $$('button, [role="button"]').find(el =>
              el.textContent.toLowerCase().includes('join') ||
              el.textContent.toLowerCase().includes('enroll') ||
              el.textContent.toLowerCase().includes('sign up') ||
              el.textContent.toLowerCase().includes('get started')
            );

            if (enrollBtn) {
              enrollBtn.click();
              await sleep(2000);

              // Handle confirmation dialog
              const confirmBtn = await waitForSelector(SEL.confirm, 3000);
              if (confirmBtn) {
                confirmBtn.click();
                await sleep(2000);
                console.log('✅ Enrollment confirmed!');
              }

              console.log('✅ Attempted to enroll in affiliate program.');
            } else {
              console.log('⚠️ Enroll button not found. Check eligibility requirements.');
            }
          }
        }
      } else {
        console.log('ℹ️  Affiliate program section not found on monetization page.');
        console.log('💡 The affiliate program may be listed under a different name or in a sub-section.');
      }
    }

    if (action === 'links' || action === 'status') {
      console.log('\n🔗 Checking referral links...');

      // Look for referral/affiliate links on the page
      const links = $$('a, [role="link"]').filter(el =>
        el.href?.includes('ref=') || el.href?.includes('affiliate') || el.href?.includes('referral')
      );

      if (links.length > 0) {
        console.log('\n📋 Referral links found:');
        links.forEach((link, i) => {
          console.log(`   ${i + 1}. ${link.textContent.trim() || link.href}`);
          console.log(`      🔗 ${link.href}`);
        });
      }

      // Look for copy-able referral codes/links
      const codeElements = $$('input[readonly], [data-testid*="referral"], [data-testid*="affiliate"]');
      if (codeElements.length > 0) {
        console.log('\n🏷️  Referral codes/links:');
        codeElements.forEach(el => {
          const value = el.value || el.textContent.trim();
          if (value) console.log(`   📋 ${value}`);
        });
      }
    }

    if (action === 'earnings' || action === 'status') {
      console.log('\n💰 Checking affiliate earnings...');

      const main = $(SEL.primaryColumn) || $('[role="main"]');
      if (main) {
        const amounts = main.textContent.match(/\$[\d,]+\.?\d*/g);
        if (amounts && amounts.length > 0) {
          console.log('\n💲 Earnings detected:');
          amounts.forEach(a => console.log(`   ${a}`));
        }

        // Look for stats/metrics
        const statElements = main.querySelectorAll('[data-testid*="stat"], [data-testid*="metric"], [role="listitem"]');
        const stats = [];
        statElements.forEach(el => {
          const text = el.textContent.trim();
          if (text && (text.includes('$') || text.toLowerCase().includes('referral') || text.toLowerCase().includes('earned'))) {
            stats.push(text.substring(0, 100));
          }
        });

        if (stats.length > 0) {
          console.log('\n📊 Affiliate stats:');
          stats.forEach((stat, i) => console.log(`   ${i + 1}. ${stat}`));
        }
      }
    }

    console.log('\n💡 Affiliate program notes:');
    console.log('   • Share your referral link to earn commissions');
    console.log('   • Earnings are based on Premium subscriptions via your link');
    console.log('   • Track your referrals and earnings in the dashboard');
    console.log('   • Payouts follow the same schedule as other creator earnings');

    saveToStorage('affiliate', { action, checked: true });

    console.log('\n✅ Affiliate program review complete.');
    return { success: true };
  };

  // ─────────────────────────────────────────────────
  // Expose on window.XActions.advancedCreator
  // ─────────────────────────────────────────────────
  window.XActions = window.XActions || {};
  window.XActions.advancedCreator = {
    setupSubscriptions,
    manageSubscriptionContent,
    setupTicketedSpace,
    managePayouts,
    manageTaxInfo,
    manageAffiliate,
  };

  // ─────────────────────────────────────────────────
  // Menu
  // ─────────────────────────────────────────────────
  const W = 74;
  console.log('╔' + '═'.repeat(W) + '╗');
  console.log('║  💰 ADVANCED CREATOR MONETIZATION — XActions' + ' '.repeat(W - 47) + '║');
  console.log('║  by nichxbt' + ' '.repeat(W - 14) + '║');
  console.log('╠' + '═'.repeat(W) + '╣');
  console.log('║  Available commands:' + ' '.repeat(W - 22) + '║');
  console.log('║' + ' '.repeat(W) + '║');
  console.log('║  1.  setupSubscriptions({ tiers })' + ' '.repeat(W - 36) + '║');
  console.log('║      Configure pricing tiers and perks for creator subscriptions' + ' '.repeat(W - 66) + '║');
  console.log('║' + ' '.repeat(W) + '║');
  console.log('║  2.  manageSubscriptionContent({ action, text, subscriberOnly })' + ' '.repeat(W - 66) + '║');
  console.log('║      Create/list paywalled subscriber-only posts' + ' '.repeat(W - 50) + '║');
  console.log('║' + ' '.repeat(W) + '║');
  console.log('║  3.  setupTicketedSpace({ title, description, price, ... })' + ' '.repeat(W - 61) + '║');
  console.log('║      Configure ticketed Spaces with pricing and schedule' + ' '.repeat(W - 57) + '║');
  console.log('║' + ' '.repeat(W) + '║');
  console.log('║  4.  managePayouts({ viewHistory })' + ' '.repeat(W - 37) + '║');
  console.log('║      View pending/completed payouts and set up payout method' + ' '.repeat(W - 62) + '║');
  console.log('║' + ' '.repeat(W) + '║');
  console.log('║  5.  manageTaxInfo({ viewStatus })' + ' '.repeat(W - 36) + '║');
  console.log('║      View/update tax forms (W-9, W-8BEN) for payouts' + ' '.repeat(W - 54) + '║');
  console.log('║' + ' '.repeat(W) + '║');
  console.log('║  6.  manageAffiliate({ action: "status"|"enroll"|"links"|"earnings" })' + ' '.repeat(W - 73) + '║');
  console.log('║      Enroll in affiliate program, view referral links and earnings' + ' '.repeat(W - 67) + '║');
  console.log('║' + ' '.repeat(W) + '║');
  console.log('║  Usage: XActions.advancedCreator.setupSubscriptions()' + ' '.repeat(W - 55) + '║');
  console.log('╚' + '═'.repeat(W) + '╝');
})();
