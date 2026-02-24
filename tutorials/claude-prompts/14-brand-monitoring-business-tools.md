# Tutorial: Brand Monitoring, Business Tools & Customer Service with Claude

You are my X/Twitter business strategist. I want to use XActions to monitor my brand, analyze sentiment, compare competitors, manage customer service, and use X as a business tool. Help me set up a professional operation.

## Context

I'm using XActions (https://github.com/nirholas/XActions), an open-source X/Twitter toolkit with business features: brand monitoring (`x_brand_monitor`), competitor analysis (`x_competitor_analysis`), customer service automation (`src/automation/customerService.js`), and business analytics.

## What I Need You To Do

### Part 1: Brand Monitoring Setup

Set up real-time brand monitoring:

1. **Monitor brand mentions** using `x_brand_monitor`:
   ```
   "Monitor mentions of 'MyBrand' and analyze sentiment"
   ```
   Parameters:
   - `brand`: Brand name or keyword
   - `limit`: Maximum mentions to analyze (default 50)
   - `sentiment`: Include sentiment analysis (default true)

2. **What you get:**
   - All recent mentions of your brand
   - Sentiment breakdown: positive, negative, neutral
   - Influential mentions (from high-follower accounts)
   - Volume trend (is mention volume increasing?)
   - Common themes in mentions

3. **Multi-keyword monitoring:**
   ```
   "Monitor all mentions of: MyBrand, MyProduct, @mybrand, mybrand.com"
   ```
   Cover all variations people might use.

4. **Using `x_search_tweets` for targeted monitoring:**
   ```
   "Search for tweets mentioning 'MyBrand' with negative sentiment keywords like 'broken', 'terrible', 'refund'"
   "Search for tweets praising 'MyBrand' with 'love', 'amazing', 'best'"
   ```

### Part 2: Competitor Intelligence

Deep competitive analysis:

1. **Compare accounts** using `x_competitor_analysis`:
   ```
   "Compare these accounts: @mycompany, @competitor1, @competitor2, @competitor3"
   ```

2. **What the analysis covers:**
   - Follower count comparison
   - Growth rate comparison
   - Posting frequency
   - Average engagement per post
   - Content strategy differences
   - Share of voice

3. **Per-competitor deep dive:**
   For each competitor, use `x_get_tweets` and `x_get_profile`:
   ```
   "Get the last 50 tweets from @competitor1 and analyze their content strategy"
   ```
   Analyze:
   - What topics they cover
   - Content format mix (text, images, video, threads, polls)
   - Posting cadence (tweets per day, per week)
   - Most engaging content types
   - Hashtag usage
   - Call-to-action patterns
   - Customer interaction style

4. **Competitive advantage identification:**
   - Gaps in competitor content (topics they don't cover)
   - Audience complaints about competitors (via `x_search_tweets`)
   - Engagement tactics they use that I should adopt
   - Engagement tactics they ignore that I can capitalize on

5. **Competitor follower poaching:**
   - Use `x_get_followers` on competitor accounts
   - Identify high-value followers who don't follow you
   - Create content that addresses their audience's needs
   - Engage with those users strategically

### Part 3: Customer Service Automation

Set up the complete customer service bot:

1. **Configure `customerService.js`:**

   **Monitoring setup:**
   ```javascript
   MONITOR: {
     mentions: true,     // @brand mentions
     dms: true,          // Direct messages
     replies: true,      // Replies to your posts
     keywords: true,     // Brand keyword monitoring
   },
   BRAND_KEYWORDS: ['mybrand', 'myproduct', 'myservice'],
   ```

   **Response behavior:**
   ```javascript
   RESPONSE: {
     autoReply: true,         // Auto-reply to mentions
     autoReplyDM: false,      // Manual DM replies (safer)
     requireApproval: true,   // Review before sending
     markAsRead: true,
   },
   ```

   **Business hours:**
   ```javascript
   BUSINESS_HOURS: {
     enabled: true,
     timezone: 'America/New_York',
     start: 9,
     end: 17,
     days: [1, 2, 3, 4, 5],  // Mon-Fri
     outsideHoursMessage: "Thanks for reaching out! We're outside business hours...",
   },
   ```

   **Rate limiting:**
   ```javascript
   MAX_RESPONSES_PER_HOUR: 20,
   MAX_RESPONSES_PER_DAY: 100,
   ```

2. **Response templates** — Customize for your business:

   **Issue detection keywords:**
   | Category | Keywords |
   |----------|----------|
   | Problem | broken, issue, doesn't work, error, bug, refund, cancel |
   | Praise | thank, awesome, amazing, love, great, best |
   | Pricing | price, cost, how much, discount, coupon |
   | Availability | available, in stock, restock, sold out |
   | Question | ?, how do, what is, where, when, can you |

   **Template responses:**
   ```javascript
   greeting: "Hi {customer}! Thanks for reaching out. How can I help? 😊",
   issue: "Hi {customer}, sorry about that! DM us details so we can fix this.",
   thanks: "Thank you {customer}! We appreciate the kind words! ❤️",
   pricing: "Hi {customer}! Check our website or DM for a personalized quote! 💰",
   support: "Hi {customer}! For support, DM us or email support@company.com 📧",
   escalate: "Hi {customer}! Let's continue in DMs for better assistance. 🙌",
   ```

3. **How the auto-categorization works:**
   - Incoming mention/reply is analyzed for keywords
   - Matched to the best category
   - Appropriate template is selected
   - `{customer}` placeholder replaced with their username
   - If requireApproval is true, you review before sending
   - Response is posted with natural delay

### Part 4: Business Analytics Dashboard

Build a business-focused analytics view:

1. **Account analytics** using `x_get_analytics`:
   ```
   "Get my business account analytics for the last 90 days"
   ```
   
2. **Key business metrics:**
   - Brand mention volume over time
   - Sentiment trend (is perception improving?)
   - Customer inquiry volume
   - Response time (manual tracking)
   - Most common customer questions
   - Top brand advocates (who promotes you most?)

3. **Post performance for business content:**
   Using `x_get_post_analytics`:
   ```
   "Analyze my last product announcement tweet: [URL]"
   ```
   - Did it drive website clicks?
   - How far did it reach?
   - What was the engagement rate vs my average?

4. **Using `scripts/businessAnalytics.js`:**
   - Comprehensive business-focused analytics
   - Revenue correlation with social activity
   - Campaign performance tracking

### Part 5: Real-Time Stream Monitoring

For always-on brand monitoring:

1. **Start a stream** using `x_stream_start`:
   ```
   "Start monitoring mentions of @mybrand in real-time"
   ```
   Stream types:
   - `tweet`: New tweets from an account
   - `follower`: Follow/unfollow events
   - `mention`: New mentions of your account

2. **Stop a stream** using `x_stream_stop`:
   ```
   "Stop the brand monitoring stream"
   ```

3. **Use cases:**
   - Real-time crisis monitoring
   - Instant response to customer issues
   - Track viral moment engagement
   - Monitor during product launches

### Part 6: Business Content Strategy

Help me create business-focused content:

1. **Content pillars for businesses:**
   - **Product updates:** New features, improvements
   - **Customer stories:** Testimonials, case studies
   - **Industry insights:** Thought leadership
   - **Behind the scenes:** Company culture, build process
   - **Education:** Tips and how-tos related to your space

2. **Product launch on X:**
   - Teaser campaign (3-5 days before)
   - Launch day thread
   - Product demo video
   - FAQ thread
   - Monitor and respond to all mentions

3. **Using `x_post_thread` for business threads:**
   ```
   "Post this product announcement thread:
   Tweet 1: 🚀 Introducing [Product] — [one-line description]
   Tweet 2: The problem: [pain point]
   Tweet 3: Our solution: [how it works]
   Tweet 4: Early results: [social proof/data]
   Tweet 5: Try it free: [link]"
   ```

### Part 7: Social Selling Framework

Using X for business development:

1. **Research prospects:**
   ```
   "Search for tweets about '[pain point our product solves]'"
   "Get profile info for @prospect1"
   ```

2. **Engage before selling:**
   - Like and reply to prospect's tweets
   - Build familiarity before DM outreach
   - Use `x_reply` and `x_like` strategically

3. **DM outreach** using `x_send_dm`:
   - Never cold-pitch
   - Reference a specific tweet or shared interest
   - Offer value first (free resource, insight)
   - Ask for permission to share more

4. **Track the pipeline:**
   - Export engagement data
   - Track who responded to DMs
   - Monitor prospect activity

### Part 8: Business Discovery

Use Explore features for business intelligence:

1. **Trending topics** using `x_get_trends`:
   ```
   "What's trending in my industry right now?"
   ```
   - Newsjack relevant trends
   - Create timely content
   - Position your brand in conversations

2. **Explore page** using `x_get_explore`:
   - Discover what's being talked about
   - Find content gaps to fill
   - Identify partnership opportunities

### Part 9: Multi-Account Management

If you manage multiple business accounts:

1. **Using `src/automation/multiAccount.js`:**
   - Add/remove accounts
   - Rotate between accounts
   - Run automations on different accounts

2. **Use cases:**
   - Main brand + sub-brands
   - Company + personal founder account
   - Regional accounts

3. **Strategy:**
   - Different content for different accounts
   - Cross-promotion between accounts
   - Separate customer service and marketing voices

## My Business Details
(Replace before pasting)
- Brand name: BRAND_NAME
- Business account: @ACCOUNT
- Competitors: @comp1, @comp2, @comp3
- Industry: YOUR_INDUSTRY
- Brand keywords to monitor: keyword1, keyword2
- Do I have a customer service team? Yes/No/Just me
- Business hours: TIMEZONE, START-END
- Goal: Brand awareness / Customer service / Lead gen / All

Start with Part 1 — set up brand monitoring and show me what people are saying about my business.
