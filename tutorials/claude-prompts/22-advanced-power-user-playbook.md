# Tutorial: Advanced Multi-Feature Combos & Power User Playbook

You are my X/Twitter power user coach. I want to combine XActions features into advanced multi-tool strategies that achieve complex goals. This isn't about using one feature — it's about orchestrating everything together. Help me build the ultimate X automation system.

## Context

I'm using XActions (https://github.com/nirholas/XActions), the complete X/Twitter automation toolkit with 49+ MCP tools, 15 browser automation scripts, a full CLI, and workflow engine. I've already learned the individual features. Now I want to combine them into powerful multi-feature strategies.

## What I Need You To Do

### Strategy 1: The Complete Growth Engine

**Goal:** Grow from 0 to 10K followers systematically.

**Phase A: Foundation (Week 1)**
```
1. Set up profile perfectly:
   → x_get_profile (audit current profile)
   → x_update_profile (optimize bio, avatar, header)
   
2. Research your niche:
   → x_get_trends (what's trending)
   → x_search_tweets "niche topic" (find active communities)
   → x_analyze_sentiment (understand niche mood)
   
3. Identify targets:
   → x_get_followers @competitor1 (see who follows competitors)
   → x_get_followers @competitor2
   → Export and analyze overlap
```

**Phase B: Content + Engagement (Weeks 2-4)**
```
Daily routine via Claude:
  Morning:
    → x_get_trends (spot opportunities)
    → x_post_tweet (share insight while it's fresh)
    → x_auto_like keywords=["niche term"] limit=20
    
  Midday:
    → x_search_tweets "niche question" (find people asking questions)
    → x_reply to 5-10 people with helpful answers
    → x_follow 10-15 new relevant people
    
  Evening:
    → x_get_analytics (check what performed)
    → x_get_post_analytics (which posts worked)
    → Plan tomorrow's content based on data
```

**Phase C: Scale (Weeks 5-12)**
```
  Weekly workflow:
    → x_workflow_run "Growth Pipeline" (automated daily tasks)
    → x_stream_start type="mention" (catch every mention)
    → x_reputation_report period="7d" (weekly sentiment check)
    → x_competitor_analysis handles=["@comp1","@comp2"]
    → Adjust strategy based on data
    
  Bi-weekly cleanup:
    → x_get_non_followers (find who doesn't follow back)
    → x_unfollow_non_followers (maintain healthy ratio)
    → x_detect_unfollowers (track who left)
```

**Phase D: Optimize & Compound (Month 3+)**
```
  Content optimization:
    → Analyze top 20 performing tweets
    → Identify winning formats, topics, hooks, times
    → Create content templates
    → x_post_thread (long-form on winning topics)
    → x_schedule_post (queue content at optimal times)
    
  Community building:
    → x_get_list_members (monitor niche lists)
    → Engage consistently with same people
    → Build relationships via x_send_dm (genuine outreach)
```

### Strategy 2: Brand Reputation Command Center

**Goal:** 24/7 brand monitoring with instant response capability.

```
Setup (one-time):
  1. x_monitor_reputation target="@mybrand" interval=300 webhookUrl="slack_url"
  2. x_monitor_reputation target="brand name" type="keyword" interval=600
  3. x_stream_start type="mention" username="mybrand" interval=30
  4. x_workflow_create name="Brand Alert Pipeline"

Daily operations:
  Morning check:
    → x_reputation_report period="24h"
    → x_get_notifications limit=50
    → x_analyze_sentiment texts=[...overnight_mentions]
    → Prioritize responses for negative mentions
    
  Response workflow:
    → For each negative mention:
      → x_reply (empathetic response)
      → Track in CRM
    → For positive mentions:
      → x_like + x_retweet (amplify positive voices)
      → x_reply (thank them)
    
  End of day:
    → x_reputation_report period="24h" format="markdown"
    → Compare to yesterday: improving or declining?
    → Adjust strategy
```

### Strategy 3: Content Creator Machine

**Goal:** Consistent high-quality content with viral potential.

```
Weekly content planning (Monday):
  1. Research:
    → x_get_trends
    → x_search_tweets "niche" min_faves:500 (find viral patterns)
    → x_grok_query "trending in [niche] this week"
    → x_competitor_analysis handles=["@top_creators"]
  
  2. Create calendar:
    → Monday: Educational thread (x_post_thread)
    → Tuesday: Hot take (x_post_tweet)
    → Wednesday: Resource share (x_post_tweet with link)
    → Thursday: Story/experience thread (x_post_thread)
    → Friday: Community question (x_create_poll)
    → Weekend: Engagement (reply + like marathon)
  
  3. Schedule:
    → x_schedule_post for each planned tweet
    → Optimal times from analytics data

Daily engagement:
  → x_auto_like keywords matching your content topics
  → Reply to 10 comments on your posts
  → Engage with 5 accounts in your niche
  → x_get_post_analytics (real-time performance check)

Content repurposing:
  → Top performing tweet → expand into thread
  → Great thread → extract as individual tweets over next week
  → Viral tweet → analyze why, replicate format
```

### Strategy 4: Research & Intelligence Agency

**Goal:** Deep industry intelligence using X as a data source.

```
Setup intel pipelines:
  1. x_workflow_create "Industry Monitor"
     → Search key industry terms daily
     → Analyze sentiment trends
     → Track key opinion leaders
     → Generate weekly reports
     
  2. x_workflow_create "Competitor Watch"
     → Monitor 5 competitor accounts
     → Track their content strategy
     → Analyze their engagement patterns
     → Alert on significant moves
  
  3. x_workflow_create "Talent Scout"
     → Search for key skill keywords
     → Follow/monitor top voices
     → Build lists of potential hires

Ad-hoc research:
  "Search for all tweets about 'product launch' from @competitor"
  "Analyze sentiment around 'industry event'"
  "Who are the top 10 voices discussing 'topic'?"
  "What links are being shared most about 'topic'?"
  "Unroll this thread and summarize key points"
```

### Strategy 5: Customer Acquisition Funnel

**Goal:** Find potential customers and build relationships.

```
Identify prospects:
  → x_search_tweets "looking for [your product type]"
  → x_search_tweets "recommend [product category]"
  → x_search_tweets "alternative to [competitor]"
  → x_search_tweets "[pain point your product solves]"

Qualify leads:
  → For each prospect: x_get_profile (check follower count, bio, activity)
  → Filter: active accounts, relevant industry, decision-maker signals
  → Score based on: engagement level, follower count, bio keywords

Engage:
  → x_follow qualified prospects
  → x_like their recent tweets (genuine interest)
  → x_reply with helpful, non-salesy comments
  → Wait 3-7 days for relationship building

Convert:
  → x_send_dm with personalized, value-first message
  → Share relevant content/resources
  → Offer free trial/consultation
  → Track conversion with session logger
```

### Strategy 6: Account Security & Cleanup

**Goal:** Clean up and secure your X account.

```
Full account audit:
  1. x_get_profile (review your public presence)
  2. x_get_following (who are you following?)
  3. x_get_non_followers (who doesn't follow back?)
  4. x_get_blocked (review block list)
  5. x_get_settings (check privacy settings)
  6. x_check_premium (review premium status)

Cleanup sequence:
  1. x_unfollow_non_followers (clean follow ratio)
  2. Remove spammy followers (block + unblock)
  3. x_clear_bookmarks (declutter)
  4. Content cleanup: unlike old tweets, delete irrelevant posts
  5. x_toggle_protected (if needed for privacy)

Backup:
  → x_export_account (full backup)
  → Store locally
  → Set up weekly backup workflow
```

### Strategy 7: Multi-Account Management

**Goal:** Manage multiple X accounts efficiently.

```
For business + personal accounts:

Account switching in MCP:
  → Each browser session = one account
  → x_login for each account

Per-account workflows:
  Business account:
    → Brand monitoring
    → Customer service bot
    → Scheduled content
    → Analytics tracking
    
  Personal account:
    → Growth automation
    → Engagement autopilot
    → Network building
    → Content creation

Cross-account strategy:
  → Personal account engages with business content
  → Business account retweets personal insights
  → Both engage with same niche community
  → Track separately with session logger
```

### Strategy 8: Event & Launch Campaigns

**Goal:** Maximize impact during product launches or events.

```
Pre-launch (1 week before):
  → Build anticipation: x_post_tweet teasers daily
  → x_create_poll "What feature are you most excited about?"
  → x_search_tweets for related discussions → engage
  → x_auto_like keywords related to launch topic
  → x_schedule_post all launch day content in advance

Launch day:
  → x_post_tweet announcement
  → x_post_thread detailed launch breakdown
  → x_stream_start type="mention" (catch every mention in real-time)
  → Monitor with x_reputation_report period="24h" every few hours
  → x_reply to every single mention/question
  → x_retweet positive reactions
  → Real-time sentiment monitoring

Post-launch (1 week after):
  → x_get_analytics (measure impact)
  → x_reputation_report period="7d"
  → x_analyze_sentiment on all launch mentions
  → Identify top champions → x_send_dm thank you
  → Document what worked for next launch
```

### Strategy 9: Community Building Playbook

**Goal:** Build a thriving community around your brand/niche.

```
Foundation:
  → x_get_list_members of relevant niche lists
  → x_search_tweets for community keywords
  → Identify 50-100 core community members

Daily engagement routine:
  → Like 2-3 tweets from each core member weekly
  → Reply meaningfully to 5-10 people daily
  → Share community members' best content (x_retweet)
  → Post discussion starters (questions, polls)

Weekly rituals:
  → Monday: Industry news + hot take thread
  → Wednesday: Community spotlight (highlight a member)
  → Friday: Open Q&A or resource roundup
  → Weekend: Engagement marathon (reply to everything)

Measurement:
  → Track engagement per community member
  → Monitor reply rate and conversation depth
  → x_get_analytics weekly for community health
  → Adjust approach based on what drives replies
```

### Strategy 10: The Daily Autopilot

**Goal:** A single workflow that handles your daily X routine.

```
"Create a comprehensive daily workflow:

  6:00 AM - Research
    → x_get_trends
    → x_search_tweets in niche (last 12h)
    → Identify 3 tweet ideas
    
  8:00 AM - Post
    → x_post_tweet (morning insight)
    → x_auto_like keywords 20 tweets
    
  12:00 PM - Engage  
    → x_get_notifications (respond to everything)
    → x_search_tweets "looking for [topic]" (find prospects)
    → x_reply to 10 relevant conversations
    → x_follow 10 new relevant accounts
    
  5:00 PM - Content
    → x_post_tweet (or x_post_thread on big days)
    → x_like 20 more niche tweets
    
  9:00 PM - Analyze
    → x_get_analytics
    → x_get_post_analytics
    → x_reputation_report period="24h"
    → Log everything with session logger
    
  Weekly:
    → x_unfollow_non_followers (maintain ratio)
    → x_competitor_analysis
    → x_export_account (backup)
    → Review and optimize"
```

## My Power User Goals
(Replace before pasting)
- Primary strategy I want: Growth / Brand / Content / Research / Sales
- My niche/industry: [describe]
- Current followers: [number]
- Target followers: [number]
- Accounts I manage: 1 / Multiple
- Time I can dedicate daily: [minutes]
- Biggest challenge: [describe]
- Tools I'm already using: MCP / CLI / Browser scripts / All

Let's start building my personalized automation strategy. Pick the most relevant strategies for my goals and create the implementation plan.
