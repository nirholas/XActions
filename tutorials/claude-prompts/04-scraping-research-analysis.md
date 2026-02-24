# Tutorial: Tweet Scraping, Profile Analysis & Research with Claude

You are my X/Twitter research analyst. I want to use XActions to scrape and analyze tweets, profiles, followers, and trends. Help me extract actionable intelligence from X/Twitter data.

## Context

I'm using XActions (https://github.com/nirholas/XActions), an open-source X/Twitter automation toolkit with powerful scraping capabilities. It can scrape profiles, followers, following lists, tweets, search results, hashtags, likes, media, bookmarks, notifications, Spaces, and more — all without the paid Twitter API.

## What I Need You To Do

### Part 1: Profile Deep Dive

Help me analyze any X/Twitter account in depth:

1. **Use `x_get_profile`** to pull full profile data:
   - Display name, username, bio, location, website, join date
   - Follower count, following count, tweet count
   - Calculate their follower-to-following ratio
   - Assess if the account looks legitimate or suspicious

2. **Use `x_get_tweets`** to analyze their recent content:
   - Pull their last 50 tweets
   - Identify the topics they talk about most
   - Calculate average engagement (likes, retweets, replies per tweet)
   - Find their most viral tweet
   - Determine posting frequency (tweets per day)
   - Identify posting patterns (what time, what days)

3. **Use `x_get_followers`** and `x_get_following`** to map their network:
   - Who are their most prominent followers?
   - Who do they follow? (reveals interests and connections)
   - Calculate mutual followers between them and me
   - Identify potential follow targets from their network

Give me a complete profile report when done.

### Part 2: Tweet Search & Analysis

Help me search and analyze tweets on any topic:

1. **Basic search** using `x_search_tweets`:
   ```
   "Search for tweets about 'AI startups' from the last week"
   ```

2. **Advanced search operators** — teach me all of them:
   - `from:username` — tweets from a specific user
   - `to:username` — replies to a specific user
   - `@username` — mentions of a user  
   - `#hashtag` — hashtag search
   - `"exact phrase"` — exact match
   - `min_faves:100` — minimum likes
   - `min_retweets:50` — minimum retweets
   - `filter:links` — only tweets with links
   - `filter:images` / `filter:videos` — media filters
   - `lang:en` — language filter
   - `since:2025-01-01 until:2025-02-01` — date range
   - `-filter:replies` — exclude replies
   - Combining operators: `"machine learning" min_faves:50 -filter:replies lang:en`

3. **Content analysis** — After scraping tweets, analyze:
   - Top themes and recurring topics
   - Most engaged content (what format gets the most likes?)
   - Influential voices on this topic
   - Sentiment (positive/negative/neutral)
   - Trending subtopics

### Part 3: Hashtag Research

Use search to research hashtags:

1. **Find trending hashtags** in my niche using `x_get_trends`
2. **Analyze hashtag performance** — for each hashtag:
   - Volume of tweets
   - Average engagement on hashtagged tweets
   - Who are the top posters using this hashtag?
   - Is this hashtag growing or declining?
3. **Build a hashtag strategy** — recommend:
   - 5 high-volume hashtags for reach
   - 5 medium-volume for targeted engagement
   - 5 niche hashtags where I can be a top voice

### Part 4: Competitor Analysis

Help me spy on my competitors using `x_competitor_analysis`:

1. **Compare multiple accounts** — provide handles for comparison:
   ```
   "Compare these accounts: @competitor1, @competitor2, @competitor3"
   ```
2. **Analyze each competitor's strategy:**
   - Content types they post (threads, images, polls, links)
   - Posting frequency
   - What gets them the most engagement
   - Their follower growth patterns
   - Who they engage with

3. **Find their viral content** using `x_search_tweets` with `from:competitor`:
   ```
   "Find the most liked tweets from @competitor1 this month"
   ```

4. **Cross-reference follower overlap** — which of their followers don't follow me yet? These are prospects.

### Part 5: Viral Tweet Discovery

Use the viral tweets scraper capabilities:

1. **Find viral content in any niche:**
   ```
   "Search for tweets about 'productivity tips' with at least 1000 likes"
   "What are the most retweeted tweets about 'remote work' this week?"
   ```

2. **Reverse-engineer what makes tweets go viral:**
   - Length of successful tweets
   - Use of emojis, threads, images
   - Time of posting
   - Hook patterns (first line)
   - Call-to-action effectiveness

3. **Build a swipe file** — collect the best tweets for inspiration

### Part 6: Browser Console Scraping (Advanced)

For power users who want to scrape directly, walk me through the DevTools scripts:

#### Profile Scraping (`scripts/scrapeProfile.js`)
- Navigate to any profile
- Run the script to extract full profile data as JSON

#### Follower/Following Scraping (`scripts/scrapeFollowers.js`, `scripts/scrapeFollowing.js`)
- Navigate to followers or following page
- Script scrolls and extracts all users with bios
- Exports to JSON/CSV

#### Tweet Scraping (`scripts/scrapeSearch.js`)
- Navigate to search results
- Script scrolls collecting all tweets with metadata
- Exports with engagement stats

#### Likes Scraping (`scripts/scrapeLikes.js`)
- Scrape all your liked tweets 
- Export for analysis

#### Media Scraping (`scripts/scrapeMedia.js`)
- Extract all media (images, videos) from any profile
- Get download URLs

#### Reply Scraping (`scripts/scrapeReplies.js`)
- Get all replies to a specific tweet
- Useful for community sentiment analysis

#### Notification Scraping (`scripts/scrapeNotifications.js`)
- Export your notifications as structured data
- Categorize by type (likes, follows, mentions, retweets)

### Part 7: Thread Unrolling

Use the thread unroller (`x_get_tweets` or `scripts/threadUnroller.js`):

1. **Find a valuable thread:** "Search for long threads about 'startup fundraising'"
2. **Unroll it:** Convert the thread to readable text/markdown
3. **Save formats:** JSON, markdown, or plain text
4. **Use case:** Build a knowledge base from the best threads in your niche

### Part 8: Video Downloading

Use `x_download_video` to save videos:

1. **Find a tweet with a video**
2. **Get download URLs** — the tool extracts direct video URLs from X's CDN
3. **Multiple quality options** when available

### Part 9: Explore & Trends

Use `x_get_explore` and `x_get_trends` for discovery:

1. **Current trends:** "What's trending right now?"
2. **Filtered trends:** "Show me trending topics in Technology"
3. **Explore categories:** trending, news, sports, entertainment
4. **Using trends for content ideas:** Help me find trending topics I can create content about

### Part 10: Data Export & Analysis

After scraping, help me make sense of the data:

1. **Export formats:** JSON and CSV supported via CLI (`xactions tweets --format csv`)
2. **Analysis suggestions:**
   - Import CSV into Google Sheets or Excel
   - Build engagement charts
   - Track competitor metrics over time
   - Create content calendars based on viral patterns
3. **Using the `exportToCSV.js`** script for custom exports

## Research Tasks To Try
(Replace with your actual research questions)

- "Analyze @elonmusk's posting pattern this month"
- "Find the top 20 AI influencers under 50K followers"
- "What tweets about 'Web3' got the most engagement this week?"
- "Compare @competitor1 vs @competitor2 — who's growing faster?"
- "Find all threads about 'building a SaaS' with 500+ likes"
- "What are people saying about [my brand]?"
- "Scrape my last 100 notifications and summarize the themes"

Start with Part 1 — ask me which account I want to analyze, and let's dive deep.
