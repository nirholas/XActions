# Tutorial: Content Posting, Threads, Polls & Scheduling with Claude

You are my X/Twitter content manager and ghostwriter. I want to use XActions to compose, schedule, and publish content — including tweets, threads, polls, and even long-form articles. Help me build a content engine.

## Context

I'm using XActions (https://github.com/nirholas/XActions), an open-source X/Twitter toolkit. It supports posting tweets, multi-tweet threads, polls, scheduled posts, replies, retweets, and long-form articles — all through Claude via the MCP server or browser console scripts.

## What I Need You To Do

### Part 1: Single Tweet Posting

Help me craft and post tweets using `x_post_tweet`:

1. **Tweet composition** — Help me write the tweet:
   - 280 character limit
   - Hook in the first line (critical for engagement)
   - Use of emojis (yes or no, depends on brand)
   - Call-to-action at the end

2. **Post it:**
   ```
   "Post this tweet: [my tweet text]"
   ```

3. **Content templates** — Give me 10 tweet templates for my niche:
   - **Hot take:** "Unpopular opinion: [contrarian view]"
   - **Listicle:** "5 things I learned about [topic]:"
   - **Question:** "What's the biggest [challenge] you face with [topic]?"
   - **Behind the scenes:** "What building [project] actually looks like: [reality]"
   - **Story:** "Last year I [starting point]. Today I [achievement]. Here's what changed:"
   - **Resource share:** "Best [resource type] for [audience]: 🧵"
   - **Quote + insight:** '"[quote]" — This changed how I think about [topic]. Here's why:"
   - **Prediction:** "In 12 months, [bold prediction about industry]. Here's why:"
   - **Comparison:** "[Thing A] vs [Thing B] — which one actually works?"
   - **Personal lesson:** "I [failed/succeeded] at [thing]. The one lesson: [lesson]"

4. **Engagement optimization:**
   - Best posting times (use `x_get_analytics` to find when my audience is active)
   - Hashtag recommendations
   - When to use images vs text-only

### Part 2: Thread Posting

Help me plan and post threads using `x_post_thread`:

1. **Thread structure** — Help me outline a thread:
   - **Tweet 1 (Hook):** The hook that makes people stop scrolling. End with "🧵" or "A thread:"
   - **Tweet 2-N (Body):** Each tweet should stand alone but flow together. One idea per tweet.
   - **Last tweet (CTA):** Summarize + call to action (follow, retweet, comment)

2. **Post the thread:**
   ```
   "Post this thread: 
   Tweet 1: [hook]
   Tweet 2: [point 1]
   Tweet 3: [point 2]
   Tweet 4: [point 3]
   Tweet 5: [CTA]"
   ```
   
   The MCP tool `x_post_thread` takes an array of tweet texts:
   ```
   tweets: ["Hook tweet", "Second tweet", "Third tweet", "Final CTA tweet"]
   ```

3. **Thread templates:**
   - **How-to guide:** Step-by-step tutorial in a thread
   - **Story thread:** Narrative arc (beginning, middle, end)
   - **Listicle thread:** "10 tools every [role] needs" — one per tweet
   - **Case study:** "How [company] grew from X to Y" with data points
   - **Myth busting:** "5 myths about [topic] that are wrong:" — debunk one per tweet
   - **Resources thread:** Curated list of best links/tools

4. **Thread length guidance:**
   - 5-7 tweets: Sweet spot for most topics
   - 10-15 tweets: For comprehensive guides
   - 20+: Only for truly epic content (rare, but can go mega-viral)

### Part 3: Creating Polls

Help me create engaging polls using `x_create_poll`:

1. **Poll format:**
   ```
   "Create a poll:
   Question: What's your biggest challenge building in public?
   Options: Finding an audience, Staying consistent, Dealing with criticism, All of the above
   Duration: 24 hours"
   ```

   Tool parameters:
   - `question`: Poll question text
   - `options`: Array of 2-4 choices
   - `durationMinutes`: Duration (default 1440 = 24h)

2. **Poll strategy:**
   - Polls get 2-3x more engagement than regular tweets
   - Use them to understand your audience
   - Always follow up with results commentary
   - Controversial polls get more votes

3. **Poll templates:**
   - **Opinion poll:** "Which [technology/approach] do you prefer?"
   - **Prediction poll:** "Will [thing] happen by [date]?"
   - **Community choice:** "What should I write about next?"
   - **This or That:** "[Option A] or [Option B]?"

### Part 4: Scheduling Posts

Help me schedule tweets for optimal times using `x_schedule_post`:

1. **Schedule a tweet:**
   ```
   "Schedule this tweet for tomorrow at 9 AM EST:
   [tweet text]"
   ```
   
   Tool parameters:
   - `text`: Tweet text
   - `scheduledAt`: ISO 8601 datetime (e.g., "2026-02-25T14:00:00Z")

2. **Build a content calendar:**
   - Help me plan a week's worth of content
   - Spread posts across optimal time slots
   - Mix content types: tweets, threads, polls, replies
   - Example weekly schedule:
     - Monday: Motivational/story tweet (9 AM)
     - Tuesday: Educational thread (12 PM)
     - Wednesday: Poll + engagement tweets (10 AM)
     - Thursday: Hot take or opinion (11 AM)
     - Friday: Resource share or listicle thread (9 AM)
     - Weekend: Casual/personal tweets

3. **Batch scheduling** — Help me write and schedule 7 days of content in one sitting

### Part 5: Replies & Engagement

Help me engage strategically using `x_reply`:

1. **Reply to tweets:**
   ```
   "Reply to this tweet [URL] with: Great insight! I'd add that..."
   ```

2. **Strategic replying:**
   - Reply to big accounts early (within 15 min of their post)
   - Add value, don't just say "great post!"  
   - Use replies to build relationships with people in your niche
   - Reply threads: Start conversations that get engagement

3. **Auto-commenting setup** (browser console) using `autoCommenter.js`:
   - Monitor a specific user's profile
   - Auto-comment on their new posts with varied responses
   - Configure comment templates
   - Set timing and limits to avoid being spammy

### Part 6: Retweet & Quote Tweet Strategy

1. **Retweet** using `x_retweet`:
   ```
   "Retweet this: [URL]"
   ```

2. **Quote tweet** — Using the Actions framework (`actions.js`):
   - Add your take to someone else's tweet
   - This is more valuable than plain retweets
   - Template: "[Your insight about their tweet]" + the quoted tweet

3. **Retweet strategy:**
   - Retweet content that your audience wants to see
   - Mix others' content with your own (60/40 rule: 60% original, 40% curation)
   - Auto-repost with `autoRepost.js` for your own top-performing tweets

### Part 7: Long-Form Articles (Premium+)

For Premium+ subscribers, use `x_publish_article`:

1. **Write an article:**
   ```
   "Publish this article:
   Title: How I Built a Twitter Bot Without the API
   Body: [full article text]
   Publish: false (save as draft first)"
   ```

2. **Article workflow:**
   - Draft first, review, then publish
   - Use articles for comprehensive guides (1000+ words)
   - Cross-promote articles in tweets and threads

### Part 8: Bookmarking Great Content

Use bookmark tools to save research and inspiration:

1. **Bookmark a tweet:** `x_bookmark` with the tweet URL
2. **Get all bookmarks:** `x_get_bookmarks` — export as JSON or CSV
3. **Clear bookmarks:** `x_clear_bookmarks` when done
4. **Use bookmarks as a content research system:**
   - Bookmark viral tweets in your niche
   - Export weekly and analyze patterns
   - Use as inspiration for your own content

### Part 9: Content Analysis & Optimization

Use analytics to improve content:

1. **Post analytics** using `x_get_post_analytics`:
   ```
   "Analyze the performance of this tweet: [URL]"
   ```

2. **Account analytics** using `x_get_analytics`:
   ```
   "Show me my engagement analytics for the last 28 days"
   ```

3. **Iterate based on data:**
   - Which tweets got the most engagement?
   - What time of day performs best?
   - Does my audience prefer threads or single tweets?
   - What topics resonate most?

### Part 10: The Browser Console Power User

For the complete Actions library (`actions.js`), explain:

1. **Post a tweet:** `XActions.tweet.post("Hello world!")`
2. **Reply:** `XActions.tweet.reply(tweetElement, "My reply")`
3. **Quote tweet:** `XActions.tweet.quote(tweetElement, "My take")`
4. **Like:** `XActions.tweet.like(tweetElement)`
5. **Retweet:** `XActions.tweet.retweet(tweetElement)`
6. **Bookmark:** `XActions.tweet.bookmark(tweetElement)`
7. **Delete:** `XActions.tweet.delete(tweetElement)`

All using the paste-in-DevTools approach (core.js → actions.js → use the API).

## My Content Goals
(Replace before pasting)
- My niche: YOUR_NICHE
- My voice/tone: (professional, casual, funny, provocative, educational)
- Posting frequency goal: X tweets/day
- Content mix: (threads, single tweets, polls, quotes)
- My audience: WHO_READS_MY_STUFF

Start with Part 1 — help me write and post my first tweet, then we'll build from there.
