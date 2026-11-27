// Copyright (c) 2024-2026 nich (@nichxbt). Licensed under the Apache License, Version 2.0.
/**
 * @name        adCampaignManager.js
 * @title       Ad Campaign Manager
 * @description Create, review and manage ad campaigns on ads.x.com.
 * @category    premium
 * @page        x.com/*
 * @writes      true
 */
// browser/adCampaignManager.js
// Ad campaign management for X/Twitter
// by nichxbt
// 1. Go to ads.x.com or x.com
// 2. Open Developer Console (F12)
// 3. Paste and run
// Last Updated: 30 March 2026
(() => {
  'use strict';

  // ══════════════════════════════════════════════════════════
  // ⚙️  CONFIGURATION
  // ══════════════════════════════════════════════════════════

  const CONFIG = {
    actionDelay: { min: 1000, max: 3000 },
    scrollDelay: 2000,
    confirmDelay: 800,
    pageLoadDelay: 3000,
    maxRetries: 5,
    adsBaseUrl: 'https://ads.x.com',
    defaultBudget: { daily: 20, total: 500 },
    defaultBidStrategy: 'auto',
    currency: 'USD',
  };

  // ══════════════════════════════════════════════════════════
  // 🔧  SELECTORS
  // ══════════════════════════════════════════════════════════

  const SEL = {
    adsDashboard: '[data-testid="adsDashboard"]',
    campaignList: '[data-testid="campaignList"]',
    createCampaign: '[data-testid="createCampaign"]',
    boostButton: '[data-testid="boostButton"]',
    tweet: 'article[data-testid="tweet"]',
    tweetText: '[data-testid="tweetText"]',
    confirmDialog: '[data-testid="confirmationSheetConfirm"]',
    toast: '[data-testid="toast"]',
    searchInput: '[data-testid="SearchBox_Search_Input"]',
    fileInput: '[data-testid="fileInput"]',
    analyticsTab: '[data-testid="analyticsTab"]',
    // Ads-specific selectors (ads.x.com)
    campaignRow: '[data-testid="campaignRow"], .campaign-row, tr[data-campaign-id]',
    campaignName: '[data-testid="campaignName"], .campaign-name',
    campaignStatus: '[data-testid="campaignStatus"], .campaign-status',
    campaignBudget: '[data-testid="campaignBudget"], .campaign-budget',
    campaignSpend: '[data-testid="campaignSpend"], .campaign-spend',
    campaignImpressions: '[data-testid="campaignImpressions"], .campaign-impressions',
    campaignClicks: '[data-testid="campaignClicks"], .campaign-clicks',
    campaignCtr: '[data-testid="campaignCtr"], .campaign-ctr',
    campaignConversions: '[data-testid="campaignConversions"], .campaign-conversions',
    objectiveSelect: '[data-testid="objectiveSelect"], select[name="objective"], .objective-selector',
    budgetInput: '[data-testid="budgetInput"], input[name="budget"], .budget-input',
    dailyBudgetInput: '[data-testid="dailyBudgetInput"], input[name="daily_budget"]',
    totalBudgetInput: '[data-testid="totalBudgetInput"], input[name="total_budget"]',
    bidInput: '[data-testid="bidInput"], input[name="bid"], .bid-input',
    bidStrategySelect: '[data-testid="bidStrategySelect"], select[name="bid_strategy"]',
    startDateInput: '[data-testid="startDateInput"], input[name="start_date"]',
    endDateInput: '[data-testid="endDateInput"], input[name="end_date"]',
    targetingSection: '[data-testid="targetingSection"], .targeting-section',
    demographicAge: '[data-testid="demographicAge"], .demographic-age',
    demographicGender: '[data-testid="demographicGender"], .demographic-gender',
    demographicLocation: '[data-testid="demographicLocation"], .demographic-location',
    interestTargeting: '[data-testid="interestTargeting"], .interest-targeting',
    keywordTargeting: '[data-testid="keywordTargeting"], .keyword-targeting',
    lookalikeTargeting: '[data-testid="lookalikeTargeting"], .lookalike-targeting',
    creativeUpload: '[data-testid="creativeUpload"], .creative-upload, input[type="file"]',
    creativeText: '[data-testid="creativeText"], textarea[name="ad_text"], .creative-text',
    creativeHeadline: '[data-testid="creativeHeadline"], input[name="headline"]',
    previewCard: '[data-testid="adPreview"], .ad-preview',
    pixelCode: '[data-testid="pixelCode"], .pixel-code',
    conversionEvent: '[data-testid="conversionEvent"], .conversion-event',
    submitCampaign: '[data-testid="submitCampaign"], button[type="submit"], .submit-campaign',
    pauseButton: '[data-testid="pauseCampaign"], .pause-campaign',
    resumeButton: '[data-testid="resumeCampaign"], .resume-campaign',
    editButton: '[data-testid="editCampaign"], .edit-campaign',
    deleteButton: '[data-testid="deleteCampaign"], .delete-campaign',
    abTestToggle: '[data-testid="abTestToggle"], .ab-test-toggle',
    abVariantB: '[data-testid="abVariantB"], .variant-b',
    quickPromote: '[data-testid="quickPromote"], .quick-promote',
    metricsTable: '[data-testid="metricsTable"], .metrics-table, table.campaign-metrics',
    exportButton: '[data-testid="exportReport"], .export-report',
  };

  // ══════════════════════════════════════════════════════════
  // 🛠️  UTILITIES
  // ══════════════════════════════════════════════════════════

  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  const randomDelay = () => {
    const { min, max } = CONFIG.actionDelay;
    return sleep(min + Math.floor(Math.random() * (max - min)));
  };

  const log = (emoji, msg) => console.log(`${emoji} [AdCampaignManager] ${msg}`);

  const waitForElement = async (selector, timeout = 10000) => {
    const start = Date.now();
    while (Date.now() - start < timeout) {
      const el = document.querySelector(selector);
      if (el) return el;
      await sleep(300);
    }
    return null;
  };

  const waitForAny = async (selectors, timeout = 10000) => {
    const start = Date.now();
    while (Date.now() - start < timeout) {
      for (const sel of selectors) {
        const el = document.querySelector(sel);
        if (el) return el;
      }
      await sleep(300);
    }
    return null;
  };

  const clickElement = async (selector) => {
    const el = typeof selector === 'string' ? document.querySelector(selector) : selector;
    if (!el) {
      log('⚠️', `Element not found: ${typeof selector === 'string' ? selector : 'element'}`);
      return false;
    }
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    await sleep(300);
    el.click();
    await randomDelay();
    return true;
  };

  const fillInput = async (selector, value) => {
    const input = typeof selector === 'string' ? document.querySelector(selector) : selector;
    if (!input) {
      log('⚠️', `Input not found: ${typeof selector === 'string' ? selector : 'element'}`);
      return false;
    }
    input.focus();
    input.value = '';
    const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
      window.HTMLInputElement.prototype, 'value'
    )?.set || Object.getOwnPropertyDescriptor(
      window.HTMLTextAreaElement.prototype, 'value'
    )?.set;
    if (nativeInputValueSetter) {
      nativeInputValueSetter.call(input, value);
    } else {
      input.value = value;
    }
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
    await sleep(500);
    return true;
  };

  const selectOption = async (selector, value) => {
    const select = document.querySelector(selector);
    if (!select) {
      log('⚠️', `Select not found: ${selector}`);
      return false;
    }
    select.value = value;
    select.dispatchEvent(new Event('change', { bubbles: true }));
    await sleep(500);
    return true;
  };

  const getSessionState = (key) => {
    try {
      return JSON.parse(sessionStorage.getItem(`xactions_adcampaign_${key}`) || 'null');
    } catch {
      return null;
    }
  };

  const setSessionState = (key, value) => {
    sessionStorage.setItem(`xactions_adcampaign_${key}`, JSON.stringify(value));
  };

  // ══════════════════════════════════════════════════════════
  // 1. 🧭  NAVIGATE TO ADS MANAGER
  // ══════════════════════════════════════════════════════════

  const navigateToAds = async () => {
    log('🧭', 'Navigating to Ads Manager...');
    window.open(CONFIG.adsBaseUrl, '_self');
    await sleep(CONFIG.pageLoadDelay);

    const dashboard = await waitForElement(SEL.adsDashboard, 15000);
    if (dashboard) {
      log('✅', 'Ads Manager loaded successfully');
      return true;
    }

    // Fallback: check if we're on ads.x.com by URL
    if (window.location.hostname.includes('ads')) {
      log('✅', 'On ads domain — dashboard may use non-standard selectors');
      return true;
    }

    log('⚠️', 'Could not confirm Ads Manager loaded. You may need to log in at ads.x.com');
    return false;
  };

  // ══════════════════════════════════════════════════════════
  // 2. 📝  CREATE AD CAMPAIGN
  // ══════════════════════════════════════════════════════════

  const createCampaign = async (options = {}) => {
    const {
      name = `XActions Campaign ${Date.now()}`,
      objective = 'engagement',
      dailyBudget = CONFIG.defaultBudget.daily,
      totalBudget = CONFIG.defaultBudget.total,
      startDate = new Date().toISOString().split('T')[0],
      endDate = null,
      targeting = {},
      adText = '',
      headline = '',
    } = options;

    log('📝', `Creating campaign: "${name}" (objective: ${objective})`);

    // Step 1: Click create campaign
    const createBtn = await waitForElement(SEL.createCampaign);
    if (!createBtn) {
      log('❌', 'Create Campaign button not found. Navigate to ads.x.com first.');
      return null;
    }
    await clickElement(createBtn);
    await sleep(CONFIG.pageLoadDelay);
    log('🔄', 'Campaign creation wizard opened');

    // Step 2: Select objective
    const objectiveMap = {
      engagement: 'ENGAGEMENT',
      followers: 'FOLLOWERS',
      reach: 'REACH',
      video_views: 'VIDEO_VIEWS',
      website_traffic: 'WEBSITE_CLICKS',
      app_installs: 'APP_INSTALLS',
      conversions: 'CONVERSIONS',
    };

    const objectiveValue = objectiveMap[objective] || objective.toUpperCase();
    const objectiveEl = await waitForElement(SEL.objectiveSelect);
    if (objectiveEl) {
      if (objectiveEl.tagName === 'SELECT') {
        await selectOption(SEL.objectiveSelect, objectiveValue);
      } else {
        // May be radio buttons or cards
        const optionBtn = document.querySelector(
          `[data-testid="objective-${objective}"], [data-objective="${objectiveValue}"]`
        );
        if (optionBtn) await clickElement(optionBtn);
      }
      log('✅', `Objective set: ${objective}`);
    } else {
      log('⚠️', 'Objective selector not found, continuing...');
    }
    await randomDelay();

    // Step 3: Set campaign name
    const nameInput = document.querySelector(
      '[data-testid="campaignNameInput"], input[name="campaign_name"], .campaign-name-input'
    );
    if (nameInput) {
      await fillInput(nameInput, name);
      log('✅', `Campaign name set: "${name}"`);
    }
    await randomDelay();

    // Step 4: Set budget
    await setBudget({ dailyBudget, totalBudget });

    // Step 5: Set dates
    const startEl = document.querySelector(SEL.startDateInput);
    if (startEl) {
      await fillInput(startEl, startDate);
      log('✅', `Start date: ${startDate}`);
    }
    if (endDate) {
      const endEl = document.querySelector(SEL.endDateInput);
      if (endEl) {
        await fillInput(endEl, endDate);
        log('✅', `End date: ${endDate}`);
      }
    }
    await randomDelay();

    // Step 6: Targeting
    if (Object.keys(targeting).length > 0) {
      await configureTargeting(targeting);
    }

    // Step 7: Ad creative
    if (adText) {
      const textEl = document.querySelector(SEL.creativeText);
      if (textEl) {
        await fillInput(textEl, adText);
        log('✅', 'Ad text set');
      }
    }
    if (headline) {
      const headlineEl = document.querySelector(SEL.creativeHeadline);
      if (headlineEl) {
        await fillInput(headlineEl, headline);
        log('✅', 'Headline set');
      }
    }
    await randomDelay();

    // Step 8: Submit
    const submitBtn = document.querySelector(SEL.submitCampaign);
    if (submitBtn) {
      await clickElement(submitBtn);
      await sleep(CONFIG.pageLoadDelay);

      const toast = await waitForElement(SEL.toast, 5000);
      if (toast) {
        log('✅', `Campaign "${name}" created successfully!`);
      } else {
        log('✅', `Campaign "${name}" submitted (check Ads Manager for status)`);
      }
    } else {
      log('⚠️', 'Submit button not found. Campaign may need manual submission.');
    }

    const campaignData = { name, objective, dailyBudget, totalBudget, startDate, endDate, targeting };
    setSessionState('lastCampaign', campaignData);
    return campaignData;
  };

  // ══════════════════════════════════════════════════════════
  // 3. 📊  MANAGE CAMPAIGNS
  // ══════════════════════════════════════════════════════════

  const listCampaigns = async () => {
    log('📊', 'Listing active campaigns...');

    const campaigns = [];
    const rows = document.querySelectorAll(SEL.campaignRow);

    if (rows.length === 0) {
      // Try scrolling to load campaigns
      const list = document.querySelector(SEL.campaignList);
      if (list) {
        list.scrollTop = 0;
        await sleep(CONFIG.scrollDelay);
      }
      const retryRows = document.querySelectorAll(SEL.campaignRow);
      if (retryRows.length === 0) {
        log('⚠️', 'No campaigns found. Are you on the Ads Manager page?');
        return campaigns;
      }
    }

    const allRows = document.querySelectorAll(SEL.campaignRow);
    for (const row of allRows) {
      const nameEl = row.querySelector(SEL.campaignName) || row.querySelector('td:first-child');
      const statusEl = row.querySelector(SEL.campaignStatus);
      const budgetEl = row.querySelector(SEL.campaignBudget);
      const spendEl = row.querySelector(SEL.campaignSpend);

      campaigns.push({
        name: nameEl?.textContent?.trim() || 'Unknown',
        status: statusEl?.textContent?.trim() || 'Unknown',
        budget: budgetEl?.textContent?.trim() || 'N/A',
        spend: spendEl?.textContent?.trim() || 'N/A',
        element: row,
      });
    }

    log('✅', `Found ${campaigns.length} campaigns:`);
    campaigns.forEach((c, i) => {
      log('📋', `  ${i + 1}. ${c.name} — Status: ${c.status} | Budget: ${c.budget} | Spend: ${c.spend}`);
    });

    setSessionState('campaigns', campaigns.map(({ element, ...rest }) => rest));
    return campaigns;
  };

  const pauseCampaign = async (campaignIndex) => {
    log('⏸️', `Pausing campaign #${campaignIndex + 1}...`);
    const rows = document.querySelectorAll(SEL.campaignRow);
    if (campaignIndex >= rows.length) {
      log('❌', `Campaign index ${campaignIndex} out of range (${rows.length} campaigns)`);
      return false;
    }

    const row = rows[campaignIndex];
    await clickElement(row);
    await randomDelay();

    const pauseBtn = await waitForElement(SEL.pauseButton, 5000);
    if (pauseBtn) {
      await clickElement(pauseBtn);
      await sleep(CONFIG.confirmDelay);

      const confirmBtn = document.querySelector(SEL.confirmDialog);
      if (confirmBtn) await clickElement(confirmBtn);

      log('✅', 'Campaign paused');
      return true;
    }

    log('⚠️', 'Pause button not found. Campaign may already be paused.');
    return false;
  };

  const resumeCampaign = async (campaignIndex) => {
    log('▶️', `Resuming campaign #${campaignIndex + 1}...`);
    const rows = document.querySelectorAll(SEL.campaignRow);
    if (campaignIndex >= rows.length) {
      log('❌', `Campaign index ${campaignIndex} out of range`);
      return false;
    }

    const row = rows[campaignIndex];
    await clickElement(row);
    await randomDelay();

    const resumeBtn = await waitForElement(SEL.resumeButton, 5000);
    if (resumeBtn) {
      await clickElement(resumeBtn);
      log('✅', 'Campaign resumed');
      return true;
    }

    log('⚠️', 'Resume button not found. Campaign may already be active.');
    return false;
  };

  const editCampaign = async (campaignIndex, updates = {}) => {
    log('✏️', `Editing campaign #${campaignIndex + 1}...`);
    const rows = document.querySelectorAll(SEL.campaignRow);
    if (campaignIndex >= rows.length) {
      log('❌', `Campaign index ${campaignIndex} out of range`);
      return false;
    }

    const row = rows[campaignIndex];
    await clickElement(row);
    await randomDelay();

    const editBtn = await waitForElement(SEL.editButton, 5000);
    if (editBtn) {
      await clickElement(editBtn);
      await sleep(CONFIG.pageLoadDelay);
    }

    if (updates.name) {
      const nameInput = document.querySelector(
        '[data-testid="campaignNameInput"], input[name="campaign_name"]'
      );
      if (nameInput) await fillInput(nameInput, updates.name);
    }

    if (updates.dailyBudget || updates.totalBudget) {
      await setBudget(updates);
    }

    if (updates.targeting) {
      await configureTargeting(updates.targeting);
    }

    if (updates.adText) {
      const textEl = document.querySelector(SEL.creativeText);
      if (textEl) await fillInput(textEl, updates.adText);
    }

    // Save changes
    const saveBtn = document.querySelector(
      SEL.submitCampaign + ', [data-testid="saveCampaign"], .save-campaign'
    );
    if (saveBtn) {
      await clickElement(saveBtn);
      await sleep(CONFIG.pageLoadDelay);
      log('✅', 'Campaign updated');
      return true;
    }

    log('⚠️', 'Save button not found. Changes may need manual saving.');
    return false;
  };

  // ══════════════════════════════════════════════════════════
  // 4. 🎨  AD CREATIVE MANAGEMENT
  // ══════════════════════════════════════════════════════════

  const manageCreatives = async (options = {}) => {
    const { action = 'list', text = '', headline = '', mediaType = null } = options;

    log('🎨', `Creative management: ${action}`);

    if (action === 'list') {
      const previews = document.querySelectorAll(SEL.previewCard);
      const creatives = [];
      for (const preview of previews) {
        creatives.push({
          text: preview.querySelector('p, .ad-text')?.textContent?.trim() || '',
          hasImage: !!preview.querySelector('img'),
          hasVideo: !!preview.querySelector('video'),
        });
      }
      log('✅', `Found ${creatives.length} ad creatives`);
      creatives.forEach((c, i) => {
        const mediaTag = c.hasVideo ? '🎬' : c.hasImage ? '🖼️' : '📝';
        log(mediaTag, `  ${i + 1}. "${c.text.substring(0, 60)}${c.text.length > 60 ? '...' : ''}"`);
      });
      return creatives;
    }

    if (action === 'create') {
      if (text) {
        const textEl = document.querySelector(SEL.creativeText);
        if (textEl) {
          await fillInput(textEl, text);
          log('✅', 'Ad text set');
        }
      }

      if (headline) {
        const headlineEl = document.querySelector(SEL.creativeHeadline);
        if (headlineEl) {
          await fillInput(headlineEl, headline);
          log('✅', 'Headline set');
        }
      }

      if (mediaType) {
        log('📎', `To upload ${mediaType}: use the file input when prompted`);
        const uploadEl = document.querySelector(SEL.creativeUpload);
        if (uploadEl) {
          uploadEl.click();
          log('🔄', 'File upload dialog opened — select your media file');
        }
      }

      return true;
    }

    if (action === 'remove') {
      const { index = 0 } = options;
      const previews = document.querySelectorAll(SEL.previewCard);
      if (index < previews.length) {
        const removeBtn = previews[index].querySelector(
          '[data-testid="removeCreative"], .remove-creative, button[aria-label="Remove"]'
        );
        if (removeBtn) {
          await clickElement(removeBtn);
          const confirmBtn = document.querySelector(SEL.confirmDialog);
          if (confirmBtn) await clickElement(confirmBtn);
          log('✅', `Creative #${index + 1} removed`);
          return true;
        }
      }
      log('⚠️', 'Could not remove creative');
      return false;
    }

    return false;
  };

  // ══════════════════════════════════════════════════════════
  // 5. 🎯  AUDIENCE TARGETING
  // ══════════════════════════════════════════════════════════

  const configureTargeting = async (targeting = {}) => {
    const {
      ageMin = null,
      ageMax = null,
      gender = null,
      locations = [],
      interests = [],
      keywords = [],
      lookalike = null,
      languages = [],
      devices = [],
    } = targeting;

    log('🎯', 'Configuring audience targeting...');

    // Demographics — Age
    if (ageMin || ageMax) {
      const ageEl = document.querySelector(SEL.demographicAge);
      if (ageEl) {
        const minInput = ageEl.querySelector('input[name="age_min"], .age-min');
        const maxInput = ageEl.querySelector('input[name="age_max"], .age-max');
        if (minInput && ageMin) await fillInput(minInput, String(ageMin));
        if (maxInput && ageMax) await fillInput(maxInput, String(ageMax));
        log('✅', `Age range: ${ageMin || '13'}–${ageMax || '65+'}`);
      }
    }

    // Demographics — Gender
    if (gender) {
      const genderEl = document.querySelector(SEL.demographicGender);
      if (genderEl) {
        const option = genderEl.querySelector(
          `[data-testid="gender-${gender}"], [value="${gender}"], label:has(input[value="${gender}"])`
        );
        if (option) await clickElement(option);
        log('✅', `Gender: ${gender}`);
      }
    }

    // Location targeting
    if (locations.length > 0) {
      const locationEl = document.querySelector(SEL.demographicLocation);
      if (locationEl) {
        for (const location of locations) {
          const input = locationEl.querySelector('input');
          if (input) {
            await fillInput(input, location);
            await sleep(1500); // Wait for autocomplete
            const suggestion = document.querySelector(
              '[data-testid="locationSuggestion"], .location-suggestion, [role="option"]'
            );
            if (suggestion) await clickElement(suggestion);
            log('✅', `Location added: ${location}`);
          }
          await randomDelay();
        }
      }
    }

    // Interest targeting
    if (interests.length > 0) {
      const interestEl = document.querySelector(SEL.interestTargeting);
      if (interestEl) {
        for (const interest of interests) {
          const input = interestEl.querySelector('input');
          if (input) {
            await fillInput(input, interest);
            await sleep(1500);
            const suggestion = document.querySelector(
              '[data-testid="interestSuggestion"], .interest-suggestion, [role="option"]'
            );
            if (suggestion) await clickElement(suggestion);
            log('✅', `Interest added: ${interest}`);
          }
          await randomDelay();
        }
      }
    }

    // Keyword targeting
    if (keywords.length > 0) {
      const keywordEl = document.querySelector(SEL.keywordTargeting);
      if (keywordEl) {
        for (const keyword of keywords) {
          const input = keywordEl.querySelector('input, textarea');
          if (input) {
            await fillInput(input, keyword);
            await sleep(500);
            // Press Enter to confirm keyword
            input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
            log('✅', `Keyword added: ${keyword}`);
          }
          await randomDelay();
        }
      }
    }

    // Lookalike audiences
    if (lookalike) {
      const lookalikeEl = document.querySelector(SEL.lookalikeTargeting);
      if (lookalikeEl) {
        await clickElement(lookalikeEl);
        await sleep(1000);
        const sourceInput = lookalikeEl.querySelector('input');
        if (sourceInput) {
          await fillInput(sourceInput, lookalike);
          await sleep(1500);
          const suggestion = document.querySelector('[role="option"]');
          if (suggestion) await clickElement(suggestion);
          log('✅', `Lookalike audience: ${lookalike}`);
        }
      }
    }

    // Language targeting
    if (languages.length > 0) {
      const langSection = document.querySelector(
        '[data-testid="languageTargeting"], .language-targeting'
      );
      if (langSection) {
        for (const lang of languages) {
          const input = langSection.querySelector('input');
          if (input) {
            await fillInput(input, lang);
            await sleep(1000);
            const suggestion = document.querySelector('[role="option"]');
            if (suggestion) await clickElement(suggestion);
            log('✅', `Language: ${lang}`);
          }
          await randomDelay();
        }
      }
    }

    // Device targeting
    if (devices.length > 0) {
      const deviceSection = document.querySelector(
        '[data-testid="deviceTargeting"], .device-targeting'
      );
      if (deviceSection) {
        for (const device of devices) {
          const option = deviceSection.querySelector(
            `[data-testid="device-${device}"], [value="${device}"]`
          );
          if (option) {
            await clickElement(option);
            log('✅', `Device: ${device}`);
          }
        }
      }
    }

    log('✅', 'Targeting configuration complete');
    return true;
  };

  // ══════════════════════════════════════════════════════════
  // 6. 💰  BUDGET / BID MANAGEMENT
  // ══════════════════════════════════════════════════════════

  const setBudget = async (options = {}) => {
    const {
      dailyBudget = null,
      totalBudget = null,
      bidStrategy = null,
      bidAmount = null,
    } = options;

    log('💰', 'Setting budget and bid...');

    if (dailyBudget) {
      const dailyEl = document.querySelector(SEL.dailyBudgetInput) ||
                       document.querySelector(SEL.budgetInput);
      if (dailyEl) {
        await fillInput(dailyEl, String(dailyBudget));
        log('✅', `Daily budget: ${CONFIG.currency} ${dailyBudget}`);
      }
    }

    if (totalBudget) {
      const totalEl = document.querySelector(SEL.totalBudgetInput);
      if (totalEl) {
        await fillInput(totalEl, String(totalBudget));
        log('✅', `Total budget: ${CONFIG.currency} ${totalBudget}`);
      }
    }

    if (bidStrategy) {
      const bidStrategyEl = document.querySelector(SEL.bidStrategySelect);
      if (bidStrategyEl) {
        const strategyMap = {
          auto: 'AUTO_BID',
          target: 'TARGET_COST',
          max: 'MAX_BID',
        };
        const value = strategyMap[bidStrategy] || bidStrategy.toUpperCase();
        await selectOption(SEL.bidStrategySelect, value);
        log('✅', `Bid strategy: ${bidStrategy}`);
      }
    }

    if (bidAmount) {
      const bidEl = document.querySelector(SEL.bidInput);
      if (bidEl) {
        await fillInput(bidEl, String(bidAmount));
        log('✅', `Bid amount: ${CONFIG.currency} ${bidAmount}`);
      }
    }

    return true;
  };

  // ══════════════════════════════════════════════════════════
  // 7. 📍  CONVERSION TRACKING
  // ══════════════════════════════════════════════════════════

  const setupConversionTracking = async (options = {}) => {
    const {
      eventName = 'purchase',
      pixelAction = 'view', // 'view' or 'generate'
    } = options;

    log('📍', 'Setting up conversion tracking...');

    if (pixelAction === 'generate') {
      const pixelBtn = document.querySelector(
        '[data-testid="generatePixel"], .generate-pixel, button:has(> span)'
      );
      if (pixelBtn) {
        await clickElement(pixelBtn);
        await sleep(2000);

        const codeEl = document.querySelector(SEL.pixelCode);
        if (codeEl) {
          const code = codeEl.textContent?.trim() || codeEl.value?.trim();
          log('✅', 'Pixel code generated:');
          console.log(code);
          setSessionState('pixelCode', code);
          return { pixelCode: code };
        }
      }
      log('⚠️', 'Could not generate pixel code. Navigate to conversion tracking page.');
      return null;
    }

    if (pixelAction === 'view') {
      const pixelEl = document.querySelector(SEL.pixelCode);
      if (pixelEl) {
        const code = pixelEl.textContent?.trim() || pixelEl.value?.trim();
        log('✅', 'Current pixel code:');
        console.log(code);
        return { pixelCode: code };
      }
      log('⚠️', 'No pixel code found on page');
    }

    // Configure conversion events
    const eventSection = document.querySelector(SEL.conversionEvent);
    if (eventSection) {
      const eventInput = eventSection.querySelector('input, select');
      if (eventInput) {
        if (eventInput.tagName === 'SELECT') {
          await selectOption(eventInput, eventName);
        } else {
          await fillInput(eventInput, eventName);
        }
        log('✅', `Conversion event configured: ${eventName}`);
      }
    }

    const conversionEvents = [
      'page_view', 'purchase', 'sign_up', 'add_to_cart',
      'download', 'lead', 'custom',
    ];
    log('📋', 'Available conversion events:');
    conversionEvents.forEach((e) => log('  🔹', e));

    return { eventName, events: conversionEvents };
  };

  // ══════════════════════════════════════════════════════════
  // 8. 📈  CAMPAIGN ANALYTICS / REPORTING
  // ══════════════════════════════════════════════════════════

  const getCampaignAnalytics = async (options = {}) => {
    const { campaignIndex = null, exportCsv = false } = options;

    log('📈', 'Scraping campaign analytics...');

    const metrics = [];

    // If a specific campaign is selected, click into it
    if (campaignIndex !== null) {
      const rows = document.querySelectorAll(SEL.campaignRow);
      if (campaignIndex < rows.length) {
        await clickElement(rows[campaignIndex]);
        await sleep(CONFIG.pageLoadDelay);
      }
    }

    // Try analytics tab
    const analyticsTab = document.querySelector(SEL.analyticsTab);
    if (analyticsTab) {
      await clickElement(analyticsTab);
      await sleep(CONFIG.pageLoadDelay);
    }

    // Scrape metrics table
    const table = document.querySelector(SEL.metricsTable);
    if (table) {
      const headers = [];
      const headerCells = table.querySelectorAll('th, thead td');
      headerCells.forEach((h) => headers.push(h.textContent?.trim()));

      const bodyRows = table.querySelectorAll('tbody tr');
      for (const row of bodyRows) {
        const cells = row.querySelectorAll('td');
        const rowData = {};
        cells.forEach((cell, i) => {
          const key = headers[i] || `col_${i}`;
          rowData[key] = cell.textContent?.trim();
        });
        metrics.push(rowData);
      }
    }

    // Scrape individual metric elements as fallback
    if (metrics.length === 0) {
      const rows = document.querySelectorAll(SEL.campaignRow);
      for (const row of rows) {
        const data = {
          name: row.querySelector(SEL.campaignName)?.textContent?.trim() || 'Unknown',
          impressions: row.querySelector(SEL.campaignImpressions)?.textContent?.trim() || '0',
          clicks: row.querySelector(SEL.campaignClicks)?.textContent?.trim() || '0',
          ctr: row.querySelector(SEL.campaignCtr)?.textContent?.trim() || '0%',
          spend: row.querySelector(SEL.campaignSpend)?.textContent?.trim() || '$0',
          conversions: row.querySelector(SEL.campaignConversions)?.textContent?.trim() || '0',
          status: row.querySelector(SEL.campaignStatus)?.textContent?.trim() || 'Unknown',
        };
        metrics.push(data);
      }
    }

    if (metrics.length === 0) {
      log('⚠️', 'No analytics data found. Ensure you are on the Ads Manager page.');
      return [];
    }

    log('✅', `Campaign performance (${metrics.length} entries):`);
    console.table(metrics);

    // Export CSV
    if (exportCsv) {
      const exportBtn = document.querySelector(SEL.exportButton);
      if (exportBtn) {
        await clickElement(exportBtn);
        log('✅', 'Export initiated');
      } else {
        // Generate CSV manually
        const csvHeaders = Object.keys(metrics[0]).join(',');
        const csvRows = metrics.map((row) =>
          Object.values(row).map((v) => `"${v}"`).join(',')
        );
        const csv = [csvHeaders, ...csvRows].join('\n');
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `xactions_campaign_report_${Date.now()}.csv`;
        a.click();
        URL.revokeObjectURL(url);
        log('✅', 'CSV report downloaded');
      }
    }

    setSessionState('lastAnalytics', metrics);
    return metrics;
  };

  // ══════════════════════════════════════════════════════════
  // 9. 🚀  PROMOTE SPECIFIC POST
  // ══════════════════════════════════════════════════════════

  const promotePost = async (options = {}) => {
    const {
      tweetUrl = null,
      tweetIndex = 0,
      budget = CONFIG.defaultBudget.daily,
      duration = 7,
    } = options;

    log('🚀', 'Quick promoting a post...');

    if (tweetUrl) {
      window.location.href = tweetUrl;
      await sleep(CONFIG.pageLoadDelay);
    }

    // Find the tweet on the page
    const tweets = document.querySelectorAll(SEL.tweet);
    if (tweets.length === 0) {
      log('❌', 'No tweets found on page. Navigate to a tweet or profile first.');
      return false;
    }

    const targetTweet = tweets[tweetIndex];
    if (!targetTweet) {
      log('❌', `Tweet #${tweetIndex + 1} not found (${tweets.length} tweets on page)`);
      return false;
    }

    const tweetTextEl = targetTweet.querySelector(SEL.tweetText);
    const tweetPreview = tweetTextEl?.textContent?.substring(0, 80) || 'tweet';
    log('🔄', `Promoting: "${tweetPreview}..."`);

    // Look for boost/promote button on the tweet
    const boostBtn = targetTweet.querySelector(SEL.boostButton) ||
                     targetTweet.querySelector(SEL.quickPromote);
    if (boostBtn) {
      await clickElement(boostBtn);
      await sleep(CONFIG.pageLoadDelay);

      // Set promotion budget
      const budgetEl = await waitForElement(SEL.budgetInput, 5000);
      if (budgetEl) {
        await fillInput(budgetEl, String(budget));
        log('✅', `Promotion budget: ${CONFIG.currency} ${budget}`);
      }

      // Set duration
      const durationInput = document.querySelector(
        '[data-testid="promotionDuration"], input[name="duration"], .promotion-duration'
      );
      if (durationInput) {
        await fillInput(durationInput, String(duration));
        log('✅', `Duration: ${duration} days`);
      }

      // Submit promotion
      const submitBtn = document.querySelector(
        SEL.submitCampaign + ', [data-testid="promoteButton"], .promote-submit'
      );
      if (submitBtn) {
        await clickElement(submitBtn);
        await sleep(CONFIG.pageLoadDelay);
        log('✅', `Post promoted! Budget: ${CONFIG.currency} ${budget} for ${duration} days`);
        return true;
      }
    }

    // Fallback: try the share menu approach
    const shareBtn = targetTweet.querySelector('[data-testid="share"]');
    if (shareBtn) {
      await clickElement(shareBtn);
      await sleep(1000);
      const promoteOption = await waitForAny([
        '[data-testid="promote"], [role="menuitem"]:has(span)',
      ], 3000);
      if (promoteOption && promoteOption.textContent?.toLowerCase().includes('promot')) {
        await clickElement(promoteOption);
        await sleep(CONFIG.pageLoadDelay);
        log('🔄', 'Promotion dialog opened — configure budget and submit');
        return true;
      }
    }

    log('⚠️', 'Quick promote not available. Try promoting from ads.x.com directly.');
    return false;
  };

  // ══════════════════════════════════════════════════════════
  // 10. 🎪  CAMPAIGN TYPES
  // ══════════════════════════════════════════════════════════

  const createFollowerCampaign = async (options = {}) => {
    log('👥', 'Creating follower growth campaign...');
    return createCampaign({
      ...options,
      name: options.name || `Follower Growth ${Date.now()}`,
      objective: 'followers',
    });
  };

  const createEngagementCampaign = async (options = {}) => {
    log('💬', 'Creating engagement campaign...');
    return createCampaign({
      ...options,
      name: options.name || `Engagement ${Date.now()}`,
      objective: 'engagement',
    });
  };

  const createVideoViewsCampaign = async (options = {}) => {
    log('🎬', 'Creating video views campaign...');
    return createCampaign({
      ...options,
      name: options.name || `Video Views ${Date.now()}`,
      objective: 'video_views',
    });
  };

  const createWebsiteTrafficCampaign = async (options = {}) => {
    log('🌐', 'Creating website traffic campaign...');
    return createCampaign({
      ...options,
      name: options.name || `Website Traffic ${Date.now()}`,
      objective: 'website_traffic',
    });
  };

  // ══════════════════════════════════════════════════════════
  // 11. 🧪  A/B TEST AD CREATIVES
  // ══════════════════════════════════════════════════════════

  const setupABTest = async (options = {}) => {
    const {
      variantA = {},
      variantB = {},
      splitPercentage = 50,
      metric = 'ctr',
      duration = 7,
    } = options;

    log('🧪', `Setting up A/B test (${splitPercentage}/${100 - splitPercentage} split)...`);

    // Enable A/B testing toggle
    const abToggle = document.querySelector(SEL.abTestToggle);
    if (abToggle) {
      const isEnabled = abToggle.getAttribute('aria-checked') === 'true' ||
                        abToggle.classList.contains('active');
      if (!isEnabled) {
        await clickElement(abToggle);
        await sleep(1000);
        log('✅', 'A/B testing enabled');
      }
    } else {
      log('⚠️', 'A/B test toggle not found. Creating manual split test...');
    }

    // Configure Variant A
    log('🔄', 'Configuring Variant A...');
    if (variantA.text) {
      const textEl = document.querySelector(SEL.creativeText);
      if (textEl) await fillInput(textEl, variantA.text);
    }
    if (variantA.headline) {
      const headlineEl = document.querySelector(SEL.creativeHeadline);
      if (headlineEl) await fillInput(headlineEl, variantA.headline);
    }
    log('✅', 'Variant A configured');
    await randomDelay();

    // Switch to Variant B
    const variantBBtn = document.querySelector(SEL.abVariantB) ||
      document.querySelector('[data-testid="addVariant"], .add-variant');
    if (variantBBtn) {
      await clickElement(variantBBtn);
      await sleep(1500);

      if (variantB.text) {
        const textEl = document.querySelector(SEL.creativeText);
        if (textEl) await fillInput(textEl, variantB.text);
      }
      if (variantB.headline) {
        const headlineEl = document.querySelector(SEL.creativeHeadline);
        if (headlineEl) await fillInput(headlineEl, variantB.headline);
      }
      log('✅', 'Variant B configured');
    } else {
      log('⚠️', 'Could not add Variant B. You may need to create two separate campaigns.');
      log('💡', 'Tip: Create two campaigns with identical targeting but different creatives');
    }

    // Set split percentage
    const splitInput = document.querySelector(
      '[data-testid="splitPercentage"], input[name="split"], .split-percentage'
    );
    if (splitInput) {
      await fillInput(splitInput, String(splitPercentage));
      log('✅', `Split: ${splitPercentage}% / ${100 - splitPercentage}%`);
    }

    // Set success metric
    const metricSelect = document.querySelector(
      '[data-testid="successMetric"], select[name="success_metric"]'
    );
    if (metricSelect) {
      const metricMap = {
        ctr: 'CLICK_THROUGH_RATE',
        conversions: 'CONVERSIONS',
        engagement: 'ENGAGEMENT_RATE',
        impressions: 'IMPRESSIONS',
        cost: 'COST_PER_RESULT',
      };
      await selectOption(metricSelect, metricMap[metric] || metric.toUpperCase());
      log('✅', `Success metric: ${metric}`);
    }

    const testConfig = {
      variantA,
      variantB,
      splitPercentage,
      metric,
      duration,
      createdAt: new Date().toISOString(),
    };

    setSessionState('abTest', testConfig);
    log('✅', 'A/B test configured:');
    log('📋', `  Variant A: "${variantA.text?.substring(0, 50) || 'default'}"`);
    log('📋', `  Variant B: "${variantB.text?.substring(0, 50) || 'default'}"`);
    log('📋', `  Split: ${splitPercentage}/${100 - splitPercentage} | Metric: ${metric} | Duration: ${duration} days`);

    return testConfig;
  };

  // ══════════════════════════════════════════════════════════
  // 🖥️  EXPOSE API & LOG MENU
  // ══════════════════════════════════════════════════════════

  window.XActions = window.XActions || {};
  window.XActions.adCampaignManager = {
    // 1. Navigation
    navigateToAds,

    // 2. Campaign creation
    createCampaign,

    // 3. Campaign management
    listCampaigns,
    pauseCampaign,
    resumeCampaign,
    editCampaign,

    // 4. Creative management
    manageCreatives,

    // 5. Audience targeting
    configureTargeting,

    // 6. Budget / bid management
    setBudget,

    // 7. Conversion tracking
    setupConversionTracking,

    // 8. Analytics / reporting
    getCampaignAnalytics,

    // 9. Promote specific post
    promotePost,

    // 10. Campaign types
    createFollowerCampaign,
    createEngagementCampaign,
    createVideoViewsCampaign,
    createWebsiteTrafficCampaign,

    // 11. A/B testing
    setupABTest,

    // Utilities
    config: CONFIG,
  };

  // ══════════════════════════════════════════════════════════
  // 📋  MENU
  // ══════════════════════════════════════════════════════════

  console.log(`
╔══════════════════════════════════════════════════════════════╗
║  📢  XActions Ad Campaign Manager — by nichxbt              ║
╠══════════════════════════════════════════════════════════════╣
║                                                              ║
║  🧭  Navigate to Ads Manager                                ║
║     XActions.adCampaignManager.navigateToAds()               ║
║                                                              ║
║  📝  Create Campaign                                         ║
║     XActions.adCampaignManager.createCampaign({              ║
║       name: 'My Campaign',                                   ║
║       objective: 'engagement',  // followers|video_views|... ║
║       dailyBudget: 20, totalBudget: 500,                     ║
║       targeting: { interests: ['tech'], locations: ['US'] }  ║
║     })                                                       ║
║                                                              ║
║  📊  List / Manage Campaigns                                 ║
║     XActions.adCampaignManager.listCampaigns()               ║
║     XActions.adCampaignManager.pauseCampaign(0)              ║
║     XActions.adCampaignManager.resumeCampaign(0)             ║
║     XActions.adCampaignManager.editCampaign(0, { ... })      ║
║                                                              ║
║  🎨  Ad Creative Management                                  ║
║     XActions.adCampaignManager.manageCreatives({             ║
║       action: 'list' | 'create' | 'remove',                 ║
║       text: '...', headline: '...', mediaType: 'image'      ║
║     })                                                       ║
║                                                              ║
║  🎯  Audience Targeting                                      ║
║     XActions.adCampaignManager.configureTargeting({          ║
║       locations: ['US','UK'], interests: ['technology'],     ║
║       keywords: ['AI'], ageMin: 18, ageMax: 45,             ║
║       gender: 'all', lookalike: 'source_audience'            ║
║     })                                                       ║
║                                                              ║
║  💰  Budget / Bid Management                                 ║
║     XActions.adCampaignManager.setBudget({                   ║
║       dailyBudget: 50, totalBudget: 1000,                    ║
║       bidStrategy: 'auto', bidAmount: 0.50                   ║
║     })                                                       ║
║                                                              ║
║  📍  Conversion Tracking                                     ║
║     XActions.adCampaignManager.setupConversionTracking({     ║
║       pixelAction: 'generate', eventName: 'purchase'         ║
║     })                                                       ║
║                                                              ║
║  📈  Campaign Analytics                                      ║
║     XActions.adCampaignManager.getCampaignAnalytics()        ║
║     XActions.adCampaignManager.getCampaignAnalytics({        ║
║       campaignIndex: 0, exportCsv: true                      ║
║     })                                                       ║
║                                                              ║
║  🚀  Quick Promote a Post                                    ║
║     XActions.adCampaignManager.promotePost({                 ║
║       tweetUrl: 'https://x.com/.../status/123',             ║
║       budget: 25, duration: 7                                ║
║     })                                                       ║
║                                                              ║
║  🎪  Campaign Types (shortcuts)                              ║
║     XActions.adCampaignManager.createFollowerCampaign()      ║
║     XActions.adCampaignManager.createEngagementCampaign()    ║
║     XActions.adCampaignManager.createVideoViewsCampaign()    ║
║     XActions.adCampaignManager.createWebsiteTrafficCampaign()║
║                                                              ║
║  🧪  A/B Test Creatives                                      ║
║     XActions.adCampaignManager.setupABTest({                 ║
║       variantA: { text: 'Try our product!' },                ║
║       variantB: { text: 'Discover something new!' },         ║
║       splitPercentage: 50, metric: 'ctr', duration: 7        ║
║     })                                                       ║
║                                                              ║
╚══════════════════════════════════════════════════════════════╝
  `);

  log('✅', 'Ad Campaign Manager loaded! Access via XActions.adCampaignManager');
})();
