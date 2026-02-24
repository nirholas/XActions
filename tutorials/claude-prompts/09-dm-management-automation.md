# Tutorial: DM Management, Export & Automation with Claude

You are my X/Twitter DM management specialist. I want to use XActions to send DMs, manage conversations, export message history, and set up automated responses. Help me take control of my inbox.

## Context

I'm using XActions (https://github.com/nirholas/XActions), an open-source X/Twitter toolkit with DM capabilities via MCP tools (`x_send_dm`, `x_get_conversations`, `x_export_dms`) and browser console scripts (`src/sendDirectMessage.js`, `src/automation/customerService.js`).

## What I Need You To Do

### Part 1: DM Overview

First, help me understand my DM landscape:

1. **Get my conversations** using `x_get_conversations`:
   ```
   "Show me my recent DM conversations"
   ```
   - List all active conversations
   - Show unread count
   - Identify important vs spam DMs

2. **Export DM history** using `x_export_dms`:
   ```
   "Export my last 100 DM messages to JSON"
   ```
   - Full message history with timestamps
   - Useful for backup or analysis
   - Identify patterns in who DMs you

### Part 2: Sending DMs

Send direct messages through Claude:

1. **Single DM** using `x_send_dm`:
   ```
   "Send a DM to @username saying: Hey! Loved your thread about AI. Would love to connect!"
   ```
   Parameters:
   - `username`: Recipient (without @)
   - `message`: Message text

2. **DM templates for common scenarios:**
   
   **Networking:**
   > "Hey [name]! Really enjoyed your recent thread about [topic]. Your point about [specific insight] really resonated. Would love to continue the conversation — I'm working on [your project] which is in a similar space."
   
   **Collaboration:**
   > "Hi [name]! I've been following your work on [their project] and think there could be some great synergy with what I'm building at [your project]. Would you be open to a quick chat about potential collaboration?"
   
   **Thank you:**
   > "Hey [name], just wanted to say thanks for [specific action — retweeting, sharing, mentioning]. Really appreciate the support! 🙏"
   
   **Cold outreach:**
   > "Hi [name]! I'm [your name], working on [brief description]. I came across your work through [how you found them] and was impressed by [specific thing]. I'd love to get your thoughts on [specific question]. No pressure — just admire your perspective."

3. **DM etiquette tips:**
   - Always personalize — never send identical messages
   - Reference something specific about them
   - Keep it short (2-3 sentences max for first DM)
   - Don't pitch immediately
   - Don't ask for follows or retweets

### Part 3: Browser Console DM Script

Walk me through `src/sendDirectMessage.js`:

1. **How it works:**
   - Navigates to X DM interface
   - Opens a new conversation or existing one
   - Types and sends the message
   - Uses X's DM selectors:
     - `[data-testid="dmComposerTextInput"]` for the text input
     - `[data-testid="dmComposerSendButton"]` for send

2. **Batch DM sending:**
   - Send personalized DMs to a list of users
   - Important: Personalize each one (X flags identical mass DMs)
   - Rate limit: 1-2 DMs per minute max
   - Daily limit: Stay under 50 new DMs to avoid restrictions

### Part 4: Customer Service Bot

For business accounts, set up `src/automation/customerService.js`:

1. **Paste core.js**, then configure customerService.js:

   ```javascript
   const CONFIG = {
     ACTIVE_ACCOUNT: 'your_business_account',
     
     MONITOR: {
       mentions: true,      // Watch @mentions
       dms: true,           // Watch DMs
       replies: true,       // Watch replies to your posts
       keywords: true,      // Watch brand keywords
     },
     
     BRAND_KEYWORDS: ['your_brand', 'your_product'],
     
     RESPONSE: {
       autoReply: true,
       autoReplyDM: false,  // Careful with auto DM replies
       requireApproval: true,  // Review before sending (recommended!)
       markAsRead: true,
     },
     
     BUSINESS_HOURS: {
       enabled: true,
       start: 9,   // 9 AM
       end: 17,    // 5 PM
       days: [1,2,3,4,5],  // Mon-Fri
       outsideHoursMessage: "Thanks for reaching out! We're outside business hours (Mon-Fri 9-5 ET). We'll respond next business day! 🙏",
     },
     
     CHECK_INTERVAL_SECONDS: 60,
     MAX_RESPONSES_PER_HOUR: 20,
     MAX_RESPONSES_PER_DAY: 100,
   };
   ```

2. **Response templates** — the bot auto-categorizes messages:

   ```javascript
   const TEMPLATES = {
     greeting: ["Hi {customer}! Thanks for reaching out. How can I help? 😊"],
     issue: ["Hi {customer}, sorry about the trouble. Please DM us details so we can fix this."],
     thanks: ["Thank you {customer}! We really appreciate the kind words! ❤️"],
     question: ["Great question {customer}! Here's what I can tell you: [CUSTOMIZE]"],
     pricing: ["Hi {customer}! For pricing, check our website or DM us for a quote! 💰"],
     support: ["Hi {customer}! For support, DM us or email support@company.com 📧"],
   };
   ```

3. **Keyword auto-detection** — Categorizes incoming messages:
   - **Issue keywords:** problem, broken, doesn't work, refund, cancel
   - **Thanks keywords:** thank, awesome, amazing, love, great
   - **Pricing keywords:** price, cost, how much, discount
   - **Question keywords:** ?, how do, what is, where, when

4. **How it runs:**
   - Checks notifications every 60 seconds
   - Detects new mentions/replies
   - Auto-categorizes the message
   - Picks appropriate template response
   - If `requireApproval` is true, shows you the response before sending
   - Respects business hours
   - Rate limits itself

### Part 5: DM Export & Backup

Export your entire DM history:

1. **Via MCP:**
   ```
   "Export all my DMs to JSON"
   ```

2. **Via browser script** (`scripts/scrapeDMs.js`):
   - Open X DM inbox
   - Script scrolls through all conversations
   - Extracts messages with timestamps, sender, and content
   - Exports as JSON

3. **Via CLI:**
   ```bash
   xactions dms --limit 500 --format json > my-dms-backup.json
   ```

4. **Use cases for DM exports:**
   - Backup important conversations
   - Analyze common questions (for FAQ creation)
   - Track business lead conversations
   - Legal/compliance records

### Part 6: DM Manager (Puppeteer)

For programmatic Node.js usage, the `dmManager` module:

```javascript
import { dmManager } from 'xactions';

// Access DM management functions:
// - Send messages
// - Read conversations
// - Export conversations
// - Manage message requests
```

Walk me through the available functions and how to integrate them into custom scripts.

### Part 7: DM Outreach Campaign

Help me set up a tasteful DM outreach campaign:

1. **Define the campaign:**
   - Who am I reaching out to? (List of target usernames)
   - What's the goal? (Networking, sales, collaboration, community building)
   - What's the message? (Must be personalized per person)

2. **Research each target** using `x_get_profile`:
   - What do they tweet about?
   - What's in their bio?
   - Any recent achievement I can reference?

3. **Craft personalized messages** — Give me a template but help me customize each one:
   ```
   For @user1 (AI researcher): "Hey [name]! Your paper on [topic] was fascinating..."
   For @user2 (Startup founder): "Hi [name]! I saw your launch of [product]..."
   For @user3 (Community builder): "Hey [name]! Love what you're doing with [community]..."
   ```

4. **Send with appropriate pacing:**
   - 2-3 DMs per hour max
   - Never more than 15-20 new DMs per day
   - Wait for responses before sending to similar accounts
   - Track who responded and who didn't

5. **Follow-up strategy:**
   - If no response after 3-5 days, one gentle follow-up
   - If still no response, move on
   - Never send more than 2 messages without a reply

### Part 8: DM Analytics

Track your DM performance:

1. **Response rate:** What % of your outreach DMs get responses?
2. **Response time:** How quickly do people reply?
3. **Conversion:** How many DM conversations turned into real connections?
4. **Patterns:** Which DM opener style works best?

## My DM Goals
(Replace before pasting)
- Purpose: Networking / Customer service / Outreach / Backup
- Target users to DM: @user1, @user2 (or a description)
- Am I a business account? Yes/No
- Brand keywords to monitor: brand1, brand2

Start with Part 1 — show me my DM landscape and help me organize my inbox.
