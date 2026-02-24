# Tutorial: Video Downloading, Thread Unrolling & Media Export with Claude

You are my X/Twitter media specialist. I want to use XActions to download videos, unroll threads into readable content, export media, and build a content archive. Help me save the best content from X.

## Context

I'm using XActions (https://github.com/nirholas/XActions), an open-source X/Twitter toolkit with video downloading (`x_download_video`, `src/scrapers/videoDownloader.js`), thread unrolling (`scripts/threadUnroller.js`, `src/scrapers/threadUnroller.js`), media scraping, and content export.

## What I Need You To Do

### Part 1: Download Videos from Tweets

1. **Via MCP** using `x_download_video`:
   ```
   "Download the video from this tweet: https://x.com/user/status/123456"
   ```
   Parameters:
   - `tweetUrl`: URL of the tweet containing video

   Returns:
   - Direct video download URLs (multiple quality options when available)
   - Video resolution and format info
   - Thumbnail URL

2. **How the video downloader works:**
   - Navigates to the tweet page via Puppeteer
   - Extracts video URLs from the page's React state / network requests
   - X stores videos on their CDN (video.twimg.com)
   - Returns direct URLs you can open in a browser or download with wget/curl

3. **Download the actual file:**
   ```bash
   # Using the URL returned
   curl -o video.mp4 "VIDEO_URL_HERE"
   
   # Or with wget
   wget -O video.mp4 "VIDEO_URL_HERE"
   ```

4. **Via browser script** (`scripts/videoDownloader.js`):
   - Navigate to the tweet with the video
   - Paste the script in DevTools
   - It extracts video URLs from the page
   - Shows download links in the console

5. **Via CLI:**
   ```bash
   # If implemented in CLI
   xactions download-video "https://x.com/user/status/123456"
   ```

### Part 2: Thread Unrolling

Save threads as clean, readable content:

1. **Via MCP** — Use `x_get_tweets` to pull the thread:
   ```
   "Unroll this thread: https://x.com/user/status/123456"
   "Get all tweets in this thread and format as readable text"
   ```

2. **Via browser script** (`scripts/threadUnroller.js` or `src/scrapers/threadUnroller.js`):
   - Navigate to the first tweet of the thread
   - Paste the script
   - It automatically:
     - Detects the thread structure
     - Follows the reply chain
     - Extracts all tweet text in order
     - Includes media references
     - Formats for readability

3. **Output formats:**
   - **Plain text:** Clean readable text
   - **Markdown:** Headers, links, formatting preserved
   - **JSON:** Structured data with metadata
   
4. **Via CLI:**
   ```bash
   # Unroll to terminal
   xactions thread "https://x.com/user/status/123456"
   
   # Save as markdown
   xactions thread "https://x.com/user/status/123456" --format markdown --output thread.md
   
   # Save as JSON with metadata
   xactions thread "https://x.com/user/status/123456" --format json --output thread.json
   ```

5. **What's captured per tweet in a thread:**
   - Tweet text (full content)
   - Author and username
   - Timestamp
   - Engagement stats (likes, retweets, replies)
   - Media URLs (images, videos)
   - Tweet position in thread (1 of N)

### Part 3: Media Scraping

Export all media from any profile:

1. **Via CLI:**
   ```bash
   xactions media USERNAME --limit 100 --format json --output media.json
   ```

2. **Via browser script** (`scripts/scrapeMedia.js`):
   - Navigate to the user's Media tab (x.com/USERNAME/media)
   - Paste the script
   - Scrolls through all media
   - Extracts image and video URLs
   - Exports as JSON

3. **What you get:**
   - Image URLs (multiple resolutions available on X's CDN)
   - Video URLs with quality options
   - Original tweet text and URL
   - Timestamp

4. **Bulk download media:**
   ```bash
   # Export URLs then download
   xactions media photographer1 --format json | jq -r '.[].urls[]' > urls.txt
   
   # Download all with wget
   wget -i urls.txt -P downloads/
   
   # Or with parallel downloading
   cat urls.txt | xargs -P 4 -I {} wget {} -P downloads/
   ```

### Part 4: Bookmark Export & Content Library

Build a personal content library from X:

1. **Export bookmarks:**
   ```
   "Export all my bookmarks to JSON"
   ```
   or
   ```bash
   xactions bookmarks --limit 500 --format json --output my-bookmarks.json
   ```

2. **Export likes:**
   ```bash
   # Via browser script scripts/scrapeLikes.js
   # Navigate to your Likes page, paste the script
   ```

3. **Organize exported content:**
   - Threads → Markdown files in a knowledge base
   - Videos → Downloaded locally
   - Images → Saved for reference/inspiration
   - Tweets → Categorized by topic

### Part 5: Viral Tweet Discovery & Download

Find and archive the best content:

1. **Find viral content:**
   ```
   "Search for viral tweets about 'AI' with minimum 1000 likes"
   ```

2. **Via `scripts/viralTweetsScraper.js`** or `src/scrapers/viralTweets.js`:
   - Search by keyword or from specific accounts
   - Filter by minimum engagement
   - Export top-performing tweets

3. **Build a swipe file:**
   - Archive viral tweets in your niche
   - Analyze what makes them work
   - Use as inspiration (never copy!)
   - Track patterns: hooks, formats, topics

### Part 6: Link Scraping

Extract all links shared by any user:

1. **Via browser script** (`src/automation/linkScraper.js` or `scripts/linkScraper.js`):
   - Navigate to a user's profile
   - Paste core.js, then linkScraper.js
   - Extracts all URLs from their tweets
   - Groups by domain (which websites they share most)
   - Exports the link list

2. **Use cases:**
   - Find what blogs/tools someone recommends
   - Map someone's go-to resources
   - Discover hidden gems in your niche
   - Competitive intelligence (what links do competitors share?)

### Part 7: Reply & Quote Tweet Scraping

1. **Scrape replies** (`scripts/scrapeReplies.js`):
   - Navigate to any tweet
   - Paste the script
   - Extracts all replies with author info and engagement
   - Great for sentiment analysis on specific tweets

2. **Scrape quote tweets** (`scripts/scrapeQuoteRetweets.js`):
   - Navigate to a tweet
   - Paste the script
   - Extracts all quote tweets (people's reactions and commentary)
   - Useful for seeing how your content spreads

### Part 8: Notification Export

Save your notification history:

1. **Via MCP:**
   ```
   "Export my last 200 notifications"
   ```

2. **Via browser script** (`scripts/scrapeNotifications.js`):
   - Navigate to Notifications tab
   - Paste the script
   - Extracts and categorizes all notifications:
     - Likes
     - Retweets
     - Follows
     - Mentions
     - Replies

### Part 9: Spaces Content

Save content from X Spaces:

1. **Get Space metadata:**
   ```
   "Get details about this Space: [URL]"
   ```

2. **Via `scripts/scrapeSpaces.js`:**
   - Find and document active/scheduled Spaces
   - Get speaker lists
   - Track topics and categories

3. **Note:** Recording actual Space audio requires different tools — XActions captures metadata and participant info.

### Part 10: Export Workflows

Complete export workflows for different purposes:

#### Archive Your Entire Account
```bash
# Profile
xactions profile myusername --format json --output archive/profile.json

# All tweets
xactions tweets myusername --limit 5000 --format json --output archive/tweets.json

# Followers snapshot
xactions followers myusername --limit 10000 --format json --output archive/followers.json

# Following snapshot
xactions following myusername --limit 5000 --format json --output archive/following.json

# Bookmarks (via MCP or browser script)
# DMs (via browser script)
```

#### Research a Topic
```bash
# Search tweets
xactions search "topic" --limit 200 --format json --output research/tweets.json

# Top voices (extract from tweets)
cat research/tweets.json | jq 'group_by(.author) | map({author: .[0].author, count: length}) | sort_by(-.count) | .[:20]'

# Save key threads
xactions thread "URL1" --format markdown --output research/thread1.md
xactions thread "URL2" --format markdown --output research/thread2.md
```

#### Content Inspiration Database
```bash
# Viral tweets in niche
xactions search "topic min_faves:500" --limit 100 --format json --output inspo/viral.json

# Bookmark exports
# Thread unrolls of best content
# Media from top creators
```

## My Media Goals
(Replace before pasting)
- What I want to download/export: Videos / Threads / Media / Everything
- Specific tweets to unroll: URL1, URL2
- Accounts to archive media from: @account1, @account2
- Purpose: Personal archive / Research / Content creation

Start with Part 1 — show me how to download a video from a specific tweet.
