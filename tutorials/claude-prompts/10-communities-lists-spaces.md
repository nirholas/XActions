# Tutorial: Community Management, Lists & Spaces with Claude

You are my X/Twitter community management expert. I want to use XActions to manage my X communities, organize my following with lists, and discover Twitter Spaces. Help me build and curate my network.

## Context

I'm using XActions (https://github.com/nirholas/XActions), an open-source X/Twitter toolkit with community, list, and Spaces management features — via MCP tools and browser console scripts.

## What I Need You To Do

### Part 1: Leave All Communities

If I've joined too many communities and want to clean up:

1. **The problem:** X communities clutter notifications and feed
2. **Using `src/leaveAllCommunities.js`** browser script:
   - Navigate to your Communities page (`x.com/communities`)
   - Paste the script in DevTools console
   - How it works:
     - Finds all community links on the page
     - For each community, navigates to it
     - Finds the "Joined" button (`button[aria-label^="Joined"]`)
     - Clicks to leave
     - Confirms the action
     - Uses sessionStorage to track which communities were processed
     - Avoids infinite loops with the tracking system
   - The script handles page navigation automatically

3. **Selective community leaving:**
   - Instead of leaving ALL, modify the script to keep some
   - Review your communities list first
   - Identify which ones provide value and which are noise

### Part 2: Join New Communities

Using `src/joinCommunities.js`:

1. **Find relevant communities:**
   - Search for communities in your niche
   - Check member count and activity level
   - Look for communities run by people you respect

2. **How the join script works:**
   - Navigate to community search or explore
   - Script finds community cards and join buttons
   - Clicks join with appropriate delays
   - Tracks which communities you joined

3. **Community strategy:**
   - Join 5-10 active, relevant communities
   - Engage regularly (not just post and leave)
   - Build relationships within the community
   - Share value, not just self-promotion

### Part 3: List Management with MCP

X Lists are the most underrated feature for organizing your feed. Help me master them:

1. **View my lists** using `x_get_lists`:
   ```
   "Show me all my X lists"
   ```

2. **Get list members** using `x_get_list_members`:
   ```
   "Show me the members of this list: [list URL]"
   ```

3. **List management with `src/listManager.js`** browser script:
   - Create new lists
   - Add/remove members
   - Organize by category

4. **Recommended list structure:**

   **Must-Have Lists:**
   - **🏆 VIPs** — Your most important connections (10-20 people)
   - **📰 News Sources** — Media accounts and journalists
   - **🧠 Thought Leaders** — Influencers in your niche
   - **🤝 Mutuals** — People who engage with you regularly
   - **👀 Competitors** — Accounts to monitor
   - **🌱 Prospects** — Potential connections/clients

   **Niche Lists:**
   - **💻 Tech** — Developer/tech accounts
   - **📈 Business** — Entrepreneurs and founders
   - **🎨 Creative** — Designers, artists, writers
   - **📚 Learning** — Educational content creators

5. **How to use lists effectively:**
   - Check VIP list daily (never miss their posts)
   - Check competitor list weekly
   - Use lists as your "filtered feed" separate from the algorithm
   - Private lists for sensitive categorization (competitors, prospects)

### Part 4: List Manager Script

Walk me through `src/listManager.js` in detail:

1. **Navigate to Lists** (x.com/lists)
2. **Available actions:**
   - Create a new list
   - Add members to existing lists
   - Remove members
   - Delete lists
   - Export list members

3. **Bulk operations:**
   - Add multiple users to a list at once
   - Move users between lists
   - Merge lists

### Part 5: Spaces Discovery & Management

Use Spaces tools to find live conversations:

1. **Find live Spaces** using `x_get_spaces`:
   ```
   "Show me live X Spaces about AI"
   "What Spaces are happening right now?"
   "Find scheduled Spaces about crypto for this week"
   ```
   Parameters:
   - `filter`: live, scheduled, or all
   - `topic`: Topic filter
   - `limit`: Maximum Spaces to return

2. **Scrape Space details** using `x_scrape_space`:
   ```
   "Get details about this Space: [Space URL]"
   ```
   Returns:
   - Title and description
   - Host information
   - Speaker list
   - Listener count
   - Duration
   - Topics/tags

3. **Using `src/scrapeSpaces.js`** browser script:
   - Scrape all visible Spaces from the Spaces tab
   - Extract metadata for analysis
   - Find Spaces in your niche

4. **Spaces strategy for growth:**
   - Join Spaces in your niche as a listener
   - Request to speak when you have valuable input
   - Host your own Spaces (builds authority)
   - Network with other speakers
   - Promote upcoming Spaces to your followers

### Part 6: Spaces Manager (Puppeteer)

For programmatic usage, the `spacesManager` module:

```javascript
import { spacesManager } from 'xactions';

// Available functions:
// - Find live and scheduled Spaces
// - Get Space details and speaker info
// - Join Spaces programmatically
```

Walk me through integrating Spaces discovery into a weekly routine.

### Part 7: Community + List + Spaces Strategy

Help me build a complete community management workflow:

**Daily (10 min):**
1. Check VIP list — engage with their latest posts
2. Check notifications for community mentions
3. Join one relevant Space as a listener

**Weekly (20 min):**
1. Review competitor list — what are they posting?
2. Update lists — add new interesting accounts, remove inactive ones
3. Host or co-host one Space in your niche
4. Post in 2-3 communities you're active in

**Monthly (30 min):**
1. Community audit — leave dead communities, join active new ones
2. List cleanup — reorganize lists based on changing interests
3. Review Spaces activity — which topics/hosts draw the most listeners?
4. Network with 5 new people from communities/Spaces

### Part 8: Using Notifications Effectively

Use `x_get_notifications` to stay on top of community engagement:

1. **Check notifications:**
   ```
   "Get my notifications from the last 24 hours, filtered by mentions"
   ```
   Parameters:
   - `limit`: Maximum notifications
   - `filter`: all, mentions, likes, follows

2. **Notification analysis:**
   - Who's engaging with you most?
   - Which community posts get engagement?
   - Are there conversations worth jumping into?

3. **Using `src/notificationManager.js`** (Puppeteer module) or `scripts/manageNotifications.js`:
   - Scrape and categorize notifications
   - Mark as read
   - Take action on specific notifications

## My Community Goals
(Replace before pasting)
- How many communities am I in? ROUGH_NUMBER
- Communities I want to stay in: community1, community2
- My niche for new communities: YOUR_NICHE
- Current number of lists: NUMBER
- Spaces topics I'm interested in: topic1, topic2

Start with Part 1 — help me clean up my communities and set up an organized system.
