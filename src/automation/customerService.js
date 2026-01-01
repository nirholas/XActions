// XActions Automation - Customer Service Bot
// https://github.com/nirholas/XActions
//
// REQUIRES: Paste core.js first!
//
// Automate customer service responses on X for business accounts
// Monitor mentions, DMs, and provide templated responses
//
// HOW TO USE:
// 1. Open X home page
// 2. Paste core.js, then paste this script
// 3. Configure your accounts and response templates below
// 4. Run and let it handle customer inquiries!

(() => {
  if (!window.XActions?.Core) {
    console.error('❌ Core module not loaded! Paste core.js first.');
    return;
  }

  const { log, sleep, randomDelay, scrollBy, clickElement, waitForElement, storage, SELECTORS } = window.XActions.Core;

  // ============================================
  // ACCOUNT CONFIGURATION
  // ============================================
  // Format: 'username:password' or just 'username' if already logged in
  // You can paste these from a txt file
  const ACCOUNTS = `
personal_account
business_account
  `.trim().split('\n').map(line => {
    const [username, password] = line.trim().split(':');
    return { username: username?.toLowerCase(), password };
  }).filter(a => a.username);

  // ============================================
  // CUSTOMER SERVICE CONFIGURATION
  // ============================================
  const CONFIG = {
    // Which account to use for customer service (must be in ACCOUNTS list)
    ACTIVE_ACCOUNT: 'business_account',
    
    // -------- MONITORING --------
    MONITOR: {
      mentions: true,           // Monitor @mentions
      dms: true,                // Monitor DMs (requires manual navigation)
      replies: true,            // Monitor replies to your posts
      keywords: true,           // Monitor keywords related to your business
    },
    
    // Keywords to monitor (for proactive customer service)
    BRAND_KEYWORDS: [
      // 'your_brand_name',
      // 'your_product_name',
    ],
    
    // -------- RESPONSE SETTINGS --------
    RESPONSE: {
      autoReply: true,          // Automatically reply to mentions
      autoReplyDM: false,       // Auto-reply to DMs (use with caution!)
      requireApproval: true,    // Show response before sending (recommended)
      markAsRead: true,         // Mark notifications as read after responding
    },
    
    // -------- BUSINESS HOURS --------
    BUSINESS_HOURS: {
      enabled: true,
      timezone: 'America/New_York',
      start: 9,                 // 9 AM
      end: 17,                  // 5 PM
      days: [1, 2, 3, 4, 5],    // Monday-Friday (0=Sunday)
      outsideHoursMessage: "Thanks for reaching out! We're currently outside business hours (Mon-Fri 9AM-5PM ET). We'll respond first thing next business day! 🙏",
    },
    
    // -------- TIMING --------
    CHECK_INTERVAL_SECONDS: 60,
    RESPONSE_DELAY_SECONDS: 5,  // Wait before responding (looks more natural)
    
    // -------- LIMITS --------
    MAX_RESPONSES_PER_HOUR: 20,
    MAX_RESPONSES_PER_DAY: 100,
  };

  // ============================================
  // RESPONSE TEMPLATES
  // ============================================
  // Use {customer} placeholder for their username
  // Use {original} placeholder to reference their message
  const TEMPLATES = {
    // Default greeting
    greeting: [
      "Hi {customer}! Thanks for reaching out. How can I help you today? 😊",
      "Hey {customer}! We're here to help. What can we assist you with?",
      "Hello {customer}! Thanks for your message. What can we do for you?",
    ],
    
    // When customer mentions a problem/issue
    issue: [
      "Hi {customer}, I'm sorry to hear you're experiencing issues. Could you please DM us more details so we can help resolve this?",
      "Hey {customer}, we want to make this right! Please send us a DM with your order details and we'll look into it right away.",
      "Hi {customer}, thanks for letting us know. Can you share more details via DM so we can investigate?",
    ],
    
    // Positive feedback
    thanks: [
      "Thank you so much {customer}! We really appreciate your kind words! 🙏❤️",
      "Wow, thanks {customer}! Comments like yours make our day! 🌟",
      "Thanks for the love {customer}! We're so glad you're happy! 😊",
    ],
    
    // Questions about products/services
    question: [
      "Great question {customer}! Let me help you with that. [CUSTOMIZE RESPONSE]",
      "Hi {customer}! I'd be happy to help answer that. [CUSTOMIZE RESPONSE]",
    ],
    
    // Pricing inquiries
    pricing: [
      "Hi {customer}! For pricing info, please check our website or DM us for a personalized quote! 💰",
      "Hey {customer}! We'd love to discuss pricing with you. Send us a DM and we'll get you sorted!",
    ],
    
    // General support
    support: [
      "Hi {customer}! For the fastest support, please DM us or email support@yourcompany.com 📧",
      "Hey {customer}! We're here to help. Please DM us your details and we'll assist you right away!",
    ],
    
    // Out of stock / availability
    availability: [
      "Hi {customer}! Thanks for your interest. Let us check availability and get back to you via DM!",
      "Hey {customer}! We'll check on that for you. Expect a DM from us shortly!",
    ],
    
    // Escalation to DM
    escalate: [
      "Hi {customer}! To better assist you, please send us a DM with your details. We'll take care of you! 🙌",
      "Hey {customer}! Let's continue this in DMs so we can help you properly. Send us a message!",
    ],
  };

  // ============================================
  // KEYWORD DETECTION FOR AUTO-CATEGORIZATION
  // ============================================
  const KEYWORD_CATEGORIES = {
    issue: ['problem', 'issue', 'broken', 'doesn\'t work', 'not working', 'error', 'bug', 'complaint', 'disappointed', 'frustrated', 'terrible', 'awful', 'worst', 'refund', 'cancel'],
    thanks: ['thank', 'thanks', 'awesome', 'amazing', 'love', 'great', 'excellent', 'perfect', 'best', 'fantastic', 'wonderful', 'appreciate'],
    pricing: ['price', 'cost', 'how much', 'pricing', 'discount', 'coupon', 'deal', 'sale', 'expensive', 'cheap', 'afford'],
    availability: ['available', 'in stock', 'restock', 'when', 'back in stock', 'sold out', 'inventory'],
    question: ['?', 'how do', 'how can', 'what is', 'where', 'when', 'why', 'can you', 'could you', 'does it', 'is it'],
  };

  // ============================================
  // STATE
  // ============================================
  const state = {
    isRunning: true,
    responsesToday: 0,
    responsesThisHour: 0,
    hourReset: Date.now(),
    dayReset: Date.now(),
    processedIds: new Set(storage.get('cs_processed') || []),
    interactions: [],
  };

  const saveState = () => {
    storage.set('cs_processed', Array.from(state.processedIds));
    storage.set('cs_interactions', state.interactions.slice(-100)); // Keep last 100
  };

  // ============================================
  // BUSINESS HOURS CHECK
  // ============================================
  const isBusinessHours = () => {
    if (!CONFIG.BUSINESS_HOURS.enabled) return true;
    
    const now = new Date();
    const day = now.getDay();
    const hour = now.getHours();
    
    if (!CONFIG.BUSINESS_HOURS.days.includes(day)) return false;
    if (hour < CONFIG.BUSINESS_HOURS.start || hour >= CONFIG.BUSINESS_HOURS.end) return false;
    
    return true;
  };

  // ============================================
  // RATE LIMIT CHECK
  // ============================================
  const canRespond = () => {
    const now = Date.now();
    
    // Reset hourly counter
    if (now - state.hourReset > 60 * 60 * 1000) {
      state.responsesThisHour = 0;
      state.hourReset = now;
    }
    
    // Reset daily counter
    if (now - state.dayReset > 24 * 60 * 60 * 1000) {
      state.responsesToday = 0;
      state.dayReset = now;
    }
    
    return (
      state.responsesThisHour < CONFIG.MAX_RESPONSES_PER_HOUR &&
      state.responsesToday < CONFIG.MAX_RESPONSES_PER_DAY
    );
  };

  // ============================================
  // DETECT MESSAGE CATEGORY
  // ============================================
  const detectCategory = (message) => {
    const lower = message.toLowerCase();
    
    for (const [category, keywords] of Object.entries(KEYWORD_CATEGORIES)) {
      for (const keyword of keywords) {
        if (lower.includes(keyword)) {
          return category;
        }
      }
    }
    
    return 'greeting'; // Default to greeting
  };

  // ============================================
  // GET RESPONSE FOR CATEGORY
  // ============================================
  const getResponse = (category, customer, originalMessage) => {
    // Check business hours first
    if (!isBusinessHours()) {
      return CONFIG.BUSINESS_HOURS.outsideHoursMessage
        .replace('{customer}', `@${customer}`)
        .replace('{original}', originalMessage);
    }
    
    const templates = TEMPLATES[category] || TEMPLATES.greeting;
    const template = templates[Math.floor(Math.random() * templates.length)];
    
    return template
      .replace('{customer}', `@${customer}`)
      .replace('{original}', originalMessage);
  };

  // ============================================
  // SEND REPLY
  // ============================================
  const sendReply = async (tweetElement, response) => {
    // Find reply button
    const replyBtn = tweetElement.querySelector('[data-testid="reply"]');
    if (!replyBtn) {
      log('Reply button not found', 'error');
      return false;
    }
    
    await clickElement(replyBtn);
    await sleep(1500);
    
    // Find the reply input
    const input = await waitForElement('[data-testid="tweetTextarea_0"]', 5000);
    if (!input) {
      log('Reply input not found', 'error');
      return false;
    }
    
    // Type the response
    input.focus();
    document.execCommand('insertText', false, response);
    await sleep(500);
    
    // If requiring approval, wait for user confirmation
    if (CONFIG.RESPONSE.requireApproval) {
      log(`📝 Response ready: "${response.substring(0, 50)}..."`, 'info');
      log('Press Enter in the tweet box to send, or Escape to cancel', 'info');
      return true; // User will manually send
    }
    
    // Find and click send button
    const sendBtn = document.querySelector('[data-testid="tweetButton"]');
    if (sendBtn) {
      await clickElement(sendBtn);
      await sleep(1000);
      return true;
    }
    
    return false;
  };

  // ============================================
  // PROCESS MENTION
  // ============================================
  const processMention = async (notification) => {
    const id = notification.getAttribute('data-testid') || 
               notification.querySelector('a[href*="/status/"]')?.href;
    
    if (!id || state.processedIds.has(id)) return;
    
    // Extract customer username and message
    const userLink = notification.querySelector('a[href^="/"]');
    const customer = userLink?.getAttribute('href')?.replace('/', '');
    
    const messageEl = notification.querySelector('[data-testid="tweetText"]');
    const message = messageEl?.textContent || '';
    
    if (!customer || !message) return;
    
    // Skip if it's our own account
    if (customer.toLowerCase() === CONFIG.ACTIVE_ACCOUNT.toLowerCase()) return;
    
    log(`📩 New mention from @${customer}: "${message.substring(0, 50)}..."`, 'info');
    
    // Detect category and get response
    const category = detectCategory(message);
    const response = getResponse(category, customer, message);
    
    log(`Category: ${category}`, 'action');
    log(`Suggested response: ${response}`, 'info');
    
    // Check rate limits
    if (!canRespond()) {
      log('Rate limit reached, skipping response', 'warning');
      return;
    }
    
    // Send response if auto-reply is enabled
    if (CONFIG.RESPONSE.autoReply) {
      await sleep(CONFIG.RESPONSE_DELAY_SECONDS * 1000);
      
      // Click on the notification to open the tweet
      const tweetLink = notification.querySelector('a[href*="/status/"]');
      if (tweetLink) {
        await clickElement(tweetLink);
        await sleep(2000);
        
        // Find the tweet and reply
        const tweet = document.querySelector('[data-testid="tweet"]');
        if (tweet) {
          const sent = await sendReply(tweet, response);
          if (sent) {
            state.responsesThisHour++;
            state.responsesToday++;
            
            // Log interaction
            state.interactions.push({
              timestamp: Date.now(),
              customer,
              message: message.substring(0, 200),
              category,
              response,
              sent: !CONFIG.RESPONSE.requireApproval,
            });
            
            log(`✅ Response ${CONFIG.RESPONSE.requireApproval ? 'prepared' : 'sent'} to @${customer}`, 'success');
          }
        }
        
        // Go back to notifications
        window.history.back();
        await sleep(1500);
      }
    }
    
    state.processedIds.add(id);
    saveState();
  };

  // ============================================
  // CHECK NOTIFICATIONS
  // ============================================
  const checkNotifications = async () => {
    log('📬 Checking notifications...', 'action');
    
    // Navigate to notifications
    window.location.href = 'https://twitter.com/notifications/mentions';
    await sleep(3000);
    
    // Get notification items
    const notifications = document.querySelectorAll('[data-testid="cellInnerDiv"]');
    
    for (const notification of notifications) {
      if (!state.isRunning) break;
      await processMention(notification);
      await randomDelay(2000, 4000);
    }
  };

  // ============================================
  // MAIN LOOP
  // ============================================
  const run = async () => {
    console.log(`
╔═══════════════════════════════════════════════════════════╗
║  🎧 XActions Customer Service Bot                        ║
╠═══════════════════════════════════════════════════════════╣
║  Active Account: @${CONFIG.ACTIVE_ACCOUNT.padEnd(20)}                ║
║  Accounts Loaded: ${String(ACCOUNTS.length).padEnd(5)}                               ║
║                                                           ║
║  Monitoring:                                              ║
║    Mentions: ${CONFIG.MONITOR.mentions ? '✅' : '❌'}  │  DMs: ${CONFIG.MONITOR.dms ? '✅' : '❌'}  │  Replies: ${CONFIG.MONITOR.replies ? '✅' : '❌'}    ║
║                                                           ║
║  Auto-Reply: ${CONFIG.RESPONSE.autoReply ? '✅' : '❌'}  │  Approval: ${CONFIG.RESPONSE.requireApproval ? '✅' : '❌'}              ║
║  Business Hours: ${CONFIG.BUSINESS_HOURS.enabled ? '✅' : '❌'} (${CONFIG.BUSINESS_HOURS.start}:00-${CONFIG.BUSINESS_HOURS.end}:00)                 ║
║                                                           ║
║  Run stopCS() to stop the bot.                            ║
║  Run csStats() to see statistics.                         ║
╚═══════════════════════════════════════════════════════════╝
    `);

    if (ACCOUNTS.length === 0) {
      log('⚠️ No accounts configured! Add accounts to the ACCOUNTS section.', 'warning');
      return;
    }

    // Initial check
    await checkNotifications();
    
    // Continuous monitoring loop
    while (state.isRunning) {
      await sleep(CONFIG.CHECK_INTERVAL_SECONDS * 1000);
      
      if (!state.isRunning) break;
      
      await checkNotifications();
    }
  };

  // ============================================
  // STATS
  // ============================================
  const printStats = () => {
    const interactions = state.interactions;
    const categories = {};
    
    for (const int of interactions) {
      categories[int.category] = (categories[int.category] || 0) + 1;
    }
    
    console.log(`
╔═══════════════════════════════════════════════════════════╗
║  📊 Customer Service Stats                                ║
╠═══════════════════════════════════════════════════════════╣
║  Total Interactions: ${String(interactions.length).padEnd(5)}                            ║
║  Today: ${String(state.responsesToday).padEnd(5)}  │  This Hour: ${String(state.responsesThisHour).padEnd(5)}             ║
╠───────────────────────────────────────────────────────────╣
║  By Category:                                             ║
${Object.entries(categories).map(([cat, count]) => 
  `║    ${cat.padEnd(15)}: ${String(count).padEnd(5)}                            ║`
).join('\n')}
╚═══════════════════════════════════════════════════════════╝
    `);
    
    // Show recent interactions
    if (interactions.length > 0) {
      console.log('\n📜 Recent Interactions:');
      interactions.slice(-5).forEach(int => {
        console.log(`  @${int.customer} (${int.category}): "${int.message.substring(0, 40)}..."`);
      });
    }
  };

  // ============================================
  // MANUAL RESPONSE HELPER
  // ============================================
  const respond = (category, customMessage) => {
    // For manual use when you want to respond with a specific template
    const templates = TEMPLATES[category];
    if (!templates) {
      console.log('Available categories:', Object.keys(TEMPLATES).join(', '));
      return;
    }
    
    const response = customMessage || templates[Math.floor(Math.random() * templates.length)];
    console.log(`📝 Response: ${response}`);
    
    // Copy to clipboard
    navigator.clipboard.writeText(response);
    console.log('(Copied to clipboard!)');
  };

  run();

  // ============================================
  // EXPORTS
  // ============================================
  window.stopCS = () => {
    state.isRunning = false;
    log('Stopping customer service bot...', 'warning');
  };
  
  window.csStats = printStats;
  window.csRespond = respond;
  window.csTemplates = () => {
    console.log('📋 Available Templates:');
    Object.entries(TEMPLATES).forEach(([cat, temps]) => {
      console.log(`\n${cat.toUpperCase()}:`);
      temps.forEach((t, i) => console.log(`  ${i + 1}. ${t}`));
    });
  };

  window.XActions.CustomerService = {
    state: () => state,
    config: CONFIG,
    templates: TEMPLATES,
    accounts: ACCOUNTS,
    respond,
    printStats,
  };
})();
