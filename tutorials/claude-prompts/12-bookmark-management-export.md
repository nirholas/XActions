# Tutorial: Bookmark Management, Export & Organization with Claude

You are my X/Twitter bookmark specialist. I want to use XActions to manage my bookmarks — export them, organize them, clear old ones, and build a personal knowledge base from saved tweets. Help me turn my bookmarks into a system.

## Context

I'm using XActions (https://github.com/nirholas/XActions), an open-source X/Twitter toolkit with bookmark management via MCP tools (`x_bookmark`, `x_get_bookmarks`, `x_clear_bookmarks`) and browser scripts (`src/bookmarkOrganizer.js`, `src/bookmarkManager.js`, `src/clearAllBookmarks.js`).

## What I Need You To Do

### Part 1: Export All Bookmarks

First, let me see everything I've saved:

1. **Export bookmarks** using `x_get_bookmarks`:
   ```
   "Export my bookmarks to JSON"
   "Show me my last 100 bookmarked tweets"
   ```
   Parameters:
   - `limit`: Maximum bookmarks to export (default 100)
   - `format`: json or csv

2. **What you'll get:**
   - Tweet text
   - Author username and display name
   - Timestamp
   - Engagement stats (likes, retweets, replies)
   - Tweet URL
   
3. **Analyze my bookmarks:**
   - How many total bookmarks do I have?
   - What topics appear most? (Create a tag cloud)
   - Which authors do I bookmark most?
   - Are there old bookmarks I've forgotten about?
   - Group bookmarks by theme/topic

### Part 2: Bookmark New Tweets

Save tweets efficiently:

1. **Via MCP** using `x_bookmark`:
   ```
   "Bookmark this tweet: [URL]"
   ```

2. **Bulk bookmark** — after searching:
   ```
   "Search for the top tweets about 'startup fundraising' and bookmark the best 10"
   ```

3. **Smart bookmarking workflow:**
   - Search for valuable content in your niche
   - Bookmark for later reading/reference
   - Review weekly and organize

### Part 3: Bookmark Organizer

Walk me through `src/bookmarkOrganizer.js`:

1. **Navigate to bookmarks** (x.com/i/bookmarks)
2. **What the organizer does:**
   - Scrolls through all bookmarks
   - Extracts tweet content and metadata
   - Categorizes by topic using keyword detection
   - Groups similar bookmarks together
   - Identifies duplicates or very similar content

3. **Custom categories** you can set up:
   - 📚 Learning Resources
   - 💡 Content Ideas
   - 🔧 Tools & Products
   - 📈 Growth Tips
   - 💰 Business Advice
   - 🧵 Threads to Read
   - 🎨 Inspiration

### Part 4: Bookmark Manager (Puppeteer)

Using `src/bookmarkManager.js` programmatically:

1. **Available functions:**
   - Get all bookmarks
   - Add bookmarks
   - Remove specific bookmarks
   - Export in multiple formats
   - Organize into categories

2. **Browser script** (`scripts/manageBookmarks.js`):
   - Paste into DevTools on the bookmarks page
   - Interactive management of your bookmarks

### Part 5: Bookmark Exporter

Using `scripts/bookmarkExporter.js` or `src/scrapers/bookmarkExporter.js`:

1. **Full export to file:**
   - JSON format with all metadata
   - CSV format for spreadsheets
   - Markdown format for note-taking apps

2. **Export workflow:**
   - Navigate to bookmarks page
   - Run the exporter script
   - Script scrolls through ALL bookmarks (can take time for large collections)
   - Downloads the export file

3. **What's in the export:**
   ```json
   {
     "tweets": [
       {
         "text": "Tweet content here...",
         "author": "@username",
         "date": "2026-02-15",
         "likes": 1250,
         "retweets": 340,
         "url": "https://x.com/user/status/123..."
       }
     ],
     "total": 500,
     "exportDate": "2026-02-24"
   }
   ```

### Part 6: Clear All Bookmarks

When your bookmarks are overwhelming, use `src/clearAllBookmarks.js`:

1. **Via MCP:**
   ```
   "Clear all my bookmarks"
   ```
   ⚠️ Warning: This cannot be undone! Export first.

2. **Via browser script:**
   - Navigate to bookmarks page
   - Paste clearAllBookmarks.js
   - Script clicks the unbookmark button on each tweet
   - Scrolls and repeats
   - Removes bookmarks in sequence with delays

3. **Selective clearing:**
   - Instead of clearing ALL, modify to clear only:
     - Bookmarks older than X days
     - Bookmarks from specific users
     - Bookmarks matching certain keywords

### Part 7: Build a Knowledge Base from Bookmarks

Help me turn bookmarks into organized knowledge:

1. **Export → Categorize → Organize:**
   - Export all bookmarks
   - Have Claude categorize them by topic
   - Create a structured document/spreadsheet

2. **Weekly bookmark review workflow:**
   - Monday: Export new bookmarks from the past week
   - Review each one — is it still valuable?
   - Tag/categorize useful ones
   - Clear ones that are no longer relevant
   - Archive important ones to notes app

3. **Content creation from bookmarks:**
   - Use bookmarked material as inspiration
   - Create threads summarizing the best content you found
   - Quote tweet and add your perspective
   - Build content pillars from recurring bookmark themes

### Part 8: Bookmark Analytics

Analyze your bookmarking patterns:

1. **What you save most:** Topics, authors, content types
2. **Reading habits:** How often do you go back to bookmarks?
3. **Value assessment:** Which bookmarks led to actionable insights?
4. **Author discovery:** Who creates content worth saving?
5. **Optimization:** Should you follow certain authors more closely?

## My Bookmark Goals
(Replace before pasting)
- Approximate number of bookmarks: ROUGH_NUMBER
- Am I overwhelmed by bookmarks? Yes/No
- Main reason I bookmark: Learning / Content ideas / Reference / Random
- Do I want to clear everything and start fresh? Yes/No
- Export format preference: JSON / CSV / Markdown

Start with Part 1 — export my bookmarks and help me understand what I've been saving.
