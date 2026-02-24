# Tutorial: Customer Service Bot with Claude

You are my X/Twitter customer service automation expert. I want to use XActions' customer service bot to automate responses to mentions, handle inquiries, and provide excellent support. Help me configure and run the full CS automation system.

## Context

I'm using XActions (https://github.com/nirholas/XActions), an open-source X/Twitter toolkit. The `src/automation/customerService.js` is a browser-based bot that:
- Monitors mentions, DMs, and replies in real-time
- Auto-categorizes incoming messages (issue, thanks, pricing, question, etc.)
- Responds with category-appropriate templates
- Enforces business hours
- Tracks all interactions with analytics
- Has configurable rate limits and approval modes

## What I Need You To Do

### Phase 1: Understand the Customer Service Bot

The bot runs in the browser console on x.com. Here's how it works:

1. **Setup flow:**
   - Navigate to x.com (logged into your business account)
   - Open DevTools → Console
   - Paste `core.js` (the XActions foundation)
   - Paste `customerService.js`
   - The bot starts monitoring immediately

2. **Bot architecture:**
   ```
   Notification Check Loop
   ↓
   Fetch @mentions from x.com/notifications/mentions
   ↓
   For each mention:
     → Extract customer username + message text
     → Auto-categorize (keyword matching)
     → Generate templated response
     → Check rate limits + business hours
     → Send reply (or prepare for approval)
   ↓
   Wait CHECK_INTERVAL_SECONDS
   ↓
   Repeat
   ```

### Phase 2: Configure the Bot

Here's every configuration option. Help me customize each section.

**Account Configuration:**
```javascript
const ACCOUNTS = `
my_business_account
`.trim().split('\n').map(line => {
  const [username, password] = line.trim().split(':');
  return { username: username?.toLowerCase(), password };
}).filter(a => a.username);
```
- Format: One account per line
- Just the username if already logged in
- `username:password` format if switching accounts

**Monitoring Configuration:**
```javascript
MONITOR: {
  mentions: true,      // Watch @mentions
  dms: true,           // Watch DMs
  replies: true,       // Watch replies to your tweets
  keywords: true,      // Watch brand keywords
},

BRAND_KEYWORDS: [
  // 'your_brand_name',
  // 'your_product_name',
],
```

**Response Settings:**
```javascript
RESPONSE: {
  autoReply: true,          // Auto-reply to mentions
  autoReplyDM: false,       // Auto-reply to DMs (careful!)
  requireApproval: true,    // Show response and wait for confirmation
  markAsRead: true,         // Mark notifications as read
},
```

**Business Hours:**
```javascript
BUSINESS_HOURS: {
  enabled: true,
  timezone: 'America/New_York',
  start: 9,                 // 9 AM
  end: 17,                  // 5 PM
  days: [1, 2, 3, 4, 5],    // Mon-Fri (0=Sunday)
  outsideHoursMessage: "Thanks for reaching out! We're outside business hours (Mon-Fri 9AM-5PM ET). We'll respond next business day! 🙏",
},
```
Outside hours: bot sends the `outsideHoursMessage` instead of a category-specific response.

**Rate Limits:**
```javascript
CHECK_INTERVAL_SECONDS: 60,      // How often to check notifications
RESPONSE_DELAY_SECONDS: 5,       // Wait before replying (looks natural)
MAX_RESPONSES_PER_HOUR: 20,
MAX_RESPONSES_PER_DAY: 100,
```

### Phase 3: Response Templates

The bot uses categorized templates with placeholders:

```javascript
const TEMPLATES = {
  greeting: [
    "Hi {customer}! Thanks for reaching out. How can I help? 😊",
    "Hey {customer}! We're here to help. What can we assist with?",
  ],
  issue: [
    "Hi {customer}, sorry about the issues. Please DM us details so we can help!",
    "Hey {customer}, we want to fix this! DM us your order details.",
  ],
  thanks: [
    "Thank you {customer}! We appreciate your kind words! 🙏❤️",
    "Wow, thanks {customer}! Comments like yours make our day! 🌟",
  ],
  question: [
    "Great question {customer}! Let me help. [CUSTOMIZE]",
  ],
  pricing: [
    "Hi {customer}! For pricing, check our site or DM for a quote! 💰",
  ],
  support: [
    "Hi {customer}! For fastest support, DM us or email support@company.com 📧",
  ],
  availability: [
    "Hi {customer}! We'll check availability and DM you!",
  ],
  escalate: [
    "Hi {customer}! Let's continue in DMs for better assistance. Send us a message! 🙌",
  ],
};
```

**Placeholder variables:**
- `{customer}` → replaced with `@username`
- `{original}` → replaced with their message text

**Customize for my business:**
1. Replace generic templates with brand-voice responses
2. Add product-specific categories
3. Include links to FAQ, support pages, etc.
4. Add seasonal/promotional templates

### Phase 4: Auto-Categorization

The bot detects message categories using keyword matching:

```javascript
const KEYWORD_CATEGORIES = {
  issue: ['problem', 'issue', 'broken', 'doesn\'t work', 'not working',
          'error', 'bug', 'complaint', 'disappointed', 'frustrated',
          'terrible', 'awful', 'worst', 'refund', 'cancel'],
  thanks: ['thank', 'thanks', 'awesome', 'amazing', 'love', 'great',
           'excellent', 'perfect', 'best', 'fantastic', 'wonderful'],
  pricing: ['price', 'cost', 'how much', 'pricing', 'discount',
            'coupon', 'deal', 'sale', 'expensive', 'cheap'],
  availability: ['available', 'in stock', 'restock', 'when',
                  'back in stock', 'sold out', 'inventory'],
  question: ['?', 'how do', 'how can', 'what is', 'where', 'when',
             'why', 'can you', 'could you', 'does it', 'is it'],
};
```

**Customization ideas:**
- Add industry-specific keywords
- Add product names to relevant categories
- Create new categories (e.g., "shipping", "returns", "demo")
- Adjust keyword priority order (first match wins)

### Phase 5: Runtime Controls

Once the bot is running, use these console commands:

| Command | Description |
|---------|-------------|
| `stopCS()` | Stop the bot |
| `csStats()` | Print interaction statistics |
| `csTemplates()` | List all available templates |
| `csRespond('category')` | Get a random response from a category (copied to clipboard) |
| `csRespond('thanks', 'Custom message')` | Use a custom message |

**Stats output:**
```
╔═══════════════════════════════════════════════════╗
║  📊 Customer Service Stats                        ║
╠═══════════════════════════════════════════════════╣
║  Total Interactions: 47                           ║
║  Today: 12   │  This Hour: 3                      ║
╠───────────────────────────────────────────────────╣
║  By Category:                                     ║
║    issue          : 15                            ║
║    thanks         : 12                            ║
║    question       : 10                            ║
║    pricing        : 5                             ║
║    greeting       : 5                             ║
╚═══════════════════════════════════════════════════╝
```

### Phase 6: Approval Mode

When `requireApproval: true`:

1. Bot detects a new mention
2. Categorizes the message
3. Generates a response
4. Types the response into the reply box
5. Logs: "📝 Response ready. Press Enter to send, Escape to cancel"
6. **You** review and send or cancel

This is the recommended mode because:
- Prevents embarrassing auto-replies
- Lets you customize before sending
- Catches categorization errors
- Human-in-the-loop quality control

### Phase 7: Full Setup Walkthrough

Here's the complete setup for MY business:

1. **Prepare `core.js`** — Copy `src/automation/core.js`
2. **Customize `customerService.js`:**
   - Set `ACTIVE_ACCOUNT` to your X handle
   - Configure `BRAND_KEYWORDS` for your brand
   - Set your `BUSINESS_HOURS`
   - Start with `requireApproval: true`
   - Customize `TEMPLATES` with your brand voice
   - Add product-specific categories to `KEYWORD_CATEGORIES`

3. **Go to x.com** → DevTools → Console
4. **Paste `core.js`** → Wait for "✅ Core loaded!"
5. **Paste customized `customerService.js`**
6. **Watch the bot start:**
   ```
   ╔═══════════════════════════════════════════════╗
   ║  🎧 XActions Customer Service Bot              ║
   ║  Active Account: @your_business                ║
   ║  Monitoring: Mentions ✅ │ DMs ✅ │ Replies ✅ ║
   ║  Auto-Reply: ✅ │ Approval: ✅                 ║
   ║  Business Hours: ✅ (9:00-17:00)               ║
   ╚═══════════════════════════════════════════════╝
   ```

### Phase 8: Advanced Customization Ideas

1. **Multi-language support:**
   - Detect language from incoming message
   - Maintain templates in multiple languages
   - Route to language-specific categories

2. **Priority detection:**
   - Flag urgent issues (words: "emergency", "down", "broken")
   - Escalate VIP customers (verified accounts, high followers)
   - Fast-track returning customers

3. **CRM-like features using sessionStorage:**
   ```javascript
   // Track customer interaction history
   const customerHistory = storage.get('cs_customer_history') || {};
   // Check if returning customer
   if (customerHistory[customer]) {
     // Personalize greeting
   }
   ```

4. **Integration with MCP:**
   Use MCP tools alongside the bot:
   ```
   "Check sentiment of our last 20 mentions"
   "Get analytics on our response rate"
   "Search for unresolved complaints"
   ```

## My Business Details
(Replace before pasting)
- Business X handle: @mybusiness
- Brand keywords: brand1, product1, product2
- Business hours: 9AM-5PM EST, Mon-Fri
- Support email: support@mybusiness.com
- Products/services offered: [describe]
- Common customer issues: [list]
- Brand voice: Professional / Casual / Friendly / Formal

Generate the fully customized customerService.js with my business details filled in.
