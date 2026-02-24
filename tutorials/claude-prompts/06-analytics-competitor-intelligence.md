# Tutorial: Engagement Analytics, Best Time to Post & Competitor Intelligence

You are my X/Twitter analytics expert. I want to use XActions to measure my performance, find the best times to post, analyze competitors, and make data-driven decisions about my content strategy.

## Context

I'm using XActions (https://github.com/nirholas/XActions), an open-source X/Twitter toolkit with analytics capabilities. It can pull engagement data, post analytics, account metrics, creator dashboard stats, and competitive intelligence — without the paid Twitter API.

## What I Need You To Do

### Part 1: Account Performance Dashboard

Build me a complete analytics overview:

1. **Profile snapshot** using `x_get_profile`:
   - Current followers, following, tweet count
   - Recent growth trend
   - Follower-to-following ratio assessment

2. **Engagement analytics** using `x_get_analytics`:
   ```
   "Get my account analytics for the last 28 days"
   ```
   - Impressions trend
   - Profile visits
   - Mentions
   - New followers gained
   - Engagement rate (interactions / impressions)

3. **Post performance** using `x_get_tweets` on my own profile:
   - Pull my last 50 tweets
   - Rank by engagement (likes + retweets + replies)
   - Find my top 5 best-performing tweets
   - Find my worst-performing tweets
   - Calculate average engagement per tweet
   - Calculate engagement rate (avg engagements / followers * 100)

4. **Content type analysis:**
   - Which performs better: text-only, images, threads, polls, links?
   - Average likes for each format
   - Which topics get the most engagement?

Present this as a clean dashboard overview.

### Part 2: Best Time to Post

Help me find optimal posting times:

1. **Analyze my posting history:**
   - Pull my recent tweets with timestamps
   - Map engagement by hour of day and day of week
   - Create a heatmap: "Monday 9 AM: avg 45 likes, Tuesday 12 PM: avg 82 likes"

2. **Using `bestTimeToPost.js` browser script:**
   - Navigate to my profile
   - The script analyzes tweet timestamps vs engagement rates
   - Identifies the top 5 time slots for my audience
   - Accounts for timezone differences

3. **Recommendations:**
   - Top 3 posting times for maximum reach
   - Top 3 posting times for maximum engagement
   - Times to avoid (low activity periods)
   - How my optimal times compare to general best practices

4. **A/B testing plan:**
   - Schedule the same type of content at different times
   - Track for 2 weeks
   - Compare results and refine timing

### Part 3: Post-Level Deep Dive

Analyze individual post performance using `x_get_post_analytics`:

1. **For a specific tweet:**
   ```
   "Analyze this tweet: [URL]"
   ```
   - Impressions (total views)
   - Engagements (clicks, likes, replies, retweets)
   - Engagement rate
   - Profile clicks generated
   - Link clicks (if applicable)

2. **Compare top vs bottom tweets:**
   - What made my best tweet work? (topic, format, time, hook)
   - What made my worst tweets flop?
   - Patterns I should repeat vs avoid

3. **Thread analytics:**
   - First tweet impressions vs last tweet impressions (drop-off rate)
   - Which tweet in the thread got the most engagement?
   - Optimal thread length based on my data

### Part 4: Competitor Analysis

Deep competitive intelligence using `x_competitor_analysis`:

1. **Compare accounts:**
   ```
   "Compare these accounts: @competitor1, @competitor2, @competitor3, and my account @myusername"
   ```

2. **Metrics to compare:**
   - Follower count and growth rate
   - Posting frequency
   - Average engagement per post
   - Content mix (tweets, threads, images, polls)
   - Top-performing content themes
   - Follower-to-following ratio

3. **Content strategy analysis per competitor:**
   Using `x_get_tweets` for each competitor:
   - What topics do they post about most?
   - What format gets them the most engagement?
   - How often do they post?
   - Do they use threads? How long?
   - Do they engage in replies?

4. **Steal their audience:**
   - Use `x_get_followers` on competitors to find potential followers
   - Cross-reference with your follower list for overlap
   - Identify high-value accounts following competitors but not you
   - Create content that addresses gaps competitors don't cover

### Part 5: Hashtag Analytics

Research hashtag performance:

1. **Analyze specific hashtags:**
   ```
   "Search for tweets with #buildinpublic from the last week and analyze engagement"
   ```

2. **Compare hashtag performance:**
   - Average engagement on tweets with vs without hashtags
   - Which hashtags bring more impressions?
   - Optimal number of hashtags (usually 1-3 on X)

3. **Trending hashtags** using `x_get_trends`:
   ```
   "What's trending right now in technology?"
   ```
   - Identify trending topics to newsjack
   - Find hashtags you can add value to

### Part 6: Brand Monitoring

Track what people say about you/your brand using `x_brand_monitor`:

1. **Monitor mentions:**
   ```
   "Monitor mentions of 'XActions' and analyze sentiment"
   ```

2. **Sentiment analysis:**
   - Positive, negative, neutral breakdown
   - Common praise points
   - Common complaints
   - Influencer mentions (high-impact positive or negative)

3. **Notification analysis** using `x_get_notifications`:
   ```
   "Get my last 100 notifications and categorize them"
   ```
   - What type of engagement am I getting most? (likes, follows, replies, retweets)
   - Who engages with me most frequently?
   - Which tweets are still generating engagement days later?

### Part 7: Creator Analytics (Premium)

For Premium users, use `x_creator_analytics`:

1. **Creator dashboard:**
   ```
   "Get my creator analytics for the last 28 days"
   ```
   - Revenue (if monetized)
   - Subscriber count
   - Top-performing premium content
   - Growth metrics

### Part 8: Browser Console Analytics Scripts 

For advanced analysis, walk me through the DevTools scripts:

#### Engagement Analytics (`src/engagementAnalytics.js`)
- Paste in console on your profile
- Calculates engagement rate per tweet
- Identifies your most engaging content patterns
- Generates a report with recommendations

#### Best Time to Post (`src/bestTimeToPost.js`)
- Analyzes your tweets' timestamps vs engagement
- Builds a time-slot performance map
- Recommends optimal posting schedule

#### Competitor Analysis (`src/competitorAnalysis.js`)
- Compare up to 5 accounts side by side
- Engagement benchmarking
- Content strategy comparison

#### Hashtag Analytics (`src/hashtagAnalytics.js`)
- Track hashtag performance over time
- Find trending hashtags in your niche
- Recommend hashtags based on your content

### Part 9: Building a Metrics Dashboard

Help me set up ongoing tracking:

1. **Weekly metrics to track:**
   - Followers gained/lost
   - Total impressions
   - Engagement rate
   - Top tweet of the week
   - New meaningful connections

2. **Monthly reporting:**
   - Growth trend chart
   - Content performance by type
   - Competitor comparison update
   - Goals progress (followers, engagement rate, etc.)

3. **Export & visualize:**
   - Use CLI: `xactions tweets myusername --limit 100 --format csv`
   - Import to Google Sheets
   - Create charts showing growth over time
   - Track key metrics week over week

### Part 10: Data-Driven Content Strategy

Based on all analytics, help me create an optimized strategy:

1. **Content pillars** — Based on what performs best, define 3-5 content themes
2. **Format optimization** — Double down on the format that works (threads? polls? images?)
3. **Timing optimization** — Post at proven best times
4. **Audience optimization** — Focus on the audience segment that engages most
5. **Engagement strategy** — When and how to reply, quote tweet, engage with others

## My Analytics Goals
(Replace before pasting)
- My username: YOUR_USERNAME
- Competitors to track: @comp1, @comp2, @comp3
- My brand/product: BRAND_NAME
- Current engagement rate: RATE (or "I don't know, help me calculate")
- Analytics period: last 28 days / last 90 days

Start with Part 1 — build me a complete analytics dashboard for my account.
