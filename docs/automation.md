# 🤖 XActions Automation Framework Guide

A complete browser automation toolkit for X (Twitter) growth and engagement.

---

## ⚠️ Important Disclaimer

These automation tools are for **educational purposes** and personal productivity. Please:

- **Respect X's Terms of Service** — automation may violate their ToS
- **Use responsibly** — don't spam, harass, or abuse these tools
- **Understand the risks** — your account could be limited or suspended
- **Start slow** — test with conservative settings first

---

## 📦 Architecture Overview

All automation scripts use a **modular architecture**:

```
src/automation/
├── core.js               ← Required! Load this first
├── actions.js            ← XActions library (100+ actions)
├── algorithmBuilder.js   ← LLM-powered algorithm cultivation (browser)
├── autoLiker.js          ← Timeline auto-liking
├── keywordFollow.js      ← Search & auto-follow
├── smartUnfollow.js      ← Time-based unfollowing
├── linkScraper.js        ← Extract links from profiles
├── autoCommenter.js      ← Auto-comment on new posts
├── multiAccount.js       ← Multi-account management (user:pass import)
├── growthSuite.js        ← All-in-one growth automation
├── followTargetUsers.js  ← Follow followers/following of accounts 
├── followEngagers.js     ← Follow likers/retweeters of posts
├── protectActiveUsers.js ← Don't unfollow users who engage with you
├── quotaSupervisor.js    ← Sophisticated rate limiting
├── sessionLogger.js      ← Action tracking & analytics
└── customerService.js    ← Customer service bot for businesses
```

**Core Module** provides shared utilities:
- Rate limiting
- DOM selectors
- Storage helpers
- Action queue
- Logging system

---

## 🎯 XActions Library (`actions.js`)

The complete X/Twitter actions library with **100+ functions** covering every available user action.

### Quick Start
```js
// 1. Load core.js first
// 2. Load actions.js
// 3. Use XActions!
```

### Available Sections

| Section | Description | Key Functions |
|---------|-------------|---------------|
| `XActions.tweet` | Posting & managing tweets | `post()`, `reply()`, `quote()`, `delete()`, `pin()`, `thread()` |
| `XActions.engage` | Engagement actions | `like()`, `retweet()`, `bookmark()`, `copyLink()`, `highlight()` |
| `XActions.user` | User interactions | `follow()`, `unfollow()`, `block()`, `mute()`, `restrict()` |
| `XActions.dm` | Direct messages | `send()`, `createGroup()`, `sendGif()`, `react()`, `delete()` |
| `XActions.search` | Search & discovery | `query()`, `advanced()`, `hashtag()`, `from()`, `latest()` |
| `XActions.nav` | Navigation | `home()`, `explore()`, `messages()`, `bookmarks()`, `profile()` |
| `XActions.lists` | List management | `create()`, `delete()`, `edit()`, `follow()`, `pin()` |
| `XActions.settings` | Account settings | `mutedAccounts()`, `addMutedWord()`, `downloadData()` |
| `XActions.profile` | Profile editing | `updateName()`, `updateBio()`, `updateLocation()`, `updateAvatar()` |
| `XActions.utils` | Utilities | `getTokens()`, `exportBookmarks()`, `devMode()`, `copyToClipboard()` |
| `XActions.spaces` | Twitter Spaces | `join()`, `leave()`, `requestToSpeak()`, `share()` |
| `XActions.communities` | Communities | `browse()`, `join()`, `leave()`, `post()` |

### Examples

**Post a tweet:**
```js
await XActions.tweet.post("Hello world! 👋")
```

**Reply to a tweet:**
```js
const tweets = XActions.tweet.getAll()
await XActions.tweet.reply(tweets[0], "Great post!")
```

**Like all visible tweets:**
```js
for (const tweet of XActions.tweet.getAll()) {
  await XActions.engage.like(tweet)
}
```

**Follow a user:**
```js
await XActions.user.follow("elonmusk")
```

**Block a user:**
```js
await XActions.user.block("spammer123")
```

**Send a DM:**
```js
await XActions.dm.send("username", "Hey! How are you?")
```

**Advanced search:**
```js
await XActions.search.advanced({
  words: "javascript",
  from: "github",
  minFaves: 100,
  since: "2024-01-01",
  hasMedia: true,
})
```

**Export all bookmarks:**
```js
const bookmarks = await XActions.utils.exportBookmarks(500)
console.log(bookmarks)
```

**Create a list:**
```js
await XActions.lists.create("Tech News", "Best tech accounts", true)
```

**Enable dev mode (see all selectors):**
```js
XActions.utils.devMode()
```

---

## � XActions Function Reference

### XActions.user (Part 2) - Profile Exploration

#### `XActions.user.viewMedia(username)` - View user's media
```js
// Example 1: View a creator's media gallery
await XActions.user.viewMedia("mkbhd")
// Opens mkbhd's media tab to see all photos and videos

// Example 2: Research competitor visual content
await XActions.user.viewMedia("competitor")
// Navigate to their media to analyze their visual strategy

// Example 3: Browse before following
const username = "potentialfollow"
await XActions.user.viewMedia(username)
// Check their media content before deciding to follow
```

#### `XActions.user.viewReplies(username)` - View user's replies
```js
// Example 1: See how a user engages with others
await XActions.user.viewReplies("naval")
// View naval's replies to understand their engagement style

// Example 2: Find conversation threads
await XActions.user.viewReplies("elonmusk")
// See what topics they're actively discussing

// Example 3: Research a user's communication style
async function analyzeEngagementStyle(username) {
  await XActions.user.viewReplies(username)
  console.log(`Viewing ${username}'s replies...`)
}
await analyzeEngagementStyle("pmarca")
```

#### `XActions.user.viewHighlights(username)` - View user's highlights
```js
// Example 1: See curated content from a creator
await XActions.user.viewHighlights("sama")
// View Sam Altman's highlighted/pinned content

// Example 2: Find best content quickly
await XActions.user.viewHighlights("paulg")
// Jump straight to their most important posts

// Example 3: Research thought leaders
const leaders = ["balajis", "cdixon", "naval"]
for (const leader of leaders) {
  await XActions.user.viewHighlights(leader)
  await new Promise(r => setTimeout(r, 3000)) // Review each
}
```

#### `XActions.user.viewArticles(username)` - View user's articles
```js
// Example 1: Read long-form content from a writer
await XActions.user.viewArticles("maborak")
// View their X articles/long posts

// Example 2: Find in-depth analysis
await XActions.user.viewArticles("VitalikButerin")
// Navigate to their detailed articles

// Example 3: Content research workflow
async function researchArticles(username) {
  await XActions.user.viewArticles(username)
  console.log(`Reading articles from @${username}...`)
}
await researchArticles("aeyakovenko")
```

#### `XActions.user.shareProfile(username)` - Copy profile link
```js
// Example 1: Share someone's profile
await XActions.user.shareProfile("github")
// Copies x.com/github to clipboard

// Example 2: Save profile link for later
const usersToShare = ["vercel", "supabase", "railway"]
for (const user of usersToShare) {
  await XActions.user.shareProfile(user)
  console.log(`Copied @${user}'s profile link!`)
}

// Example 3: Build a list of profile links
async function collectProfileLinks(usernames) {
  const links = []
  for (const username of usernames) {
    await XActions.user.shareProfile(username)
    links.push(`https://x.com/${username}`)
  }
  return links
}
```

#### `XActions.user.followsYou(username)` - Check if user follows you
```js
// Example 1: Check if someone follows you back
const followsBack = await XActions.user.followsYou("elonmusk")
console.log(followsBack ? "They follow you!" : "They don't follow you")

// Example 2: Filter mutuals from a list
async function findMutuals(usernames) {
  const mutuals = []
  for (const username of usernames) {
    if (await XActions.user.followsYou(username)) {
      mutuals.push(username)
    }
  }
  console.log(`Found ${mutuals.length} mutuals:`, mutuals)
  return mutuals
}
await findMutuals(["friend1", "friend2", "friend3"])

// Example 3: Check before unfollowing
async function smartUnfollow(username) {
  if (await XActions.user.followsYou(username)) {
    console.log(`Keeping @${username} - they follow you!`)
    return false
  }
  await XActions.user.unfollow(username)
  return true
}
```

#### `XActions.user.getInfo(username)` - Get user info object
```js
// Example 1: Get basic user information
const info = await XActions.user.getInfo("openai")
console.log(`${info.name} (@${info.username})`)
console.log(`Followers: ${info.followersCount}`)
console.log(`Bio: ${info.bio}`)

// Example 2: Analyze user metrics
async function analyzeAccount(username) {
  const info = await XActions.user.getInfo(username)
  const ratio = info.followersCount / (info.followingCount || 1)
  console.log(`@${username} follower ratio: ${ratio.toFixed(2)}`)
  return { username, ...info, ratio }
}
await analyzeAccount("ycombinator")

// Example 3: Build a user database
async function collectUserData(usernames) {
  const database = []
  for (const username of usernames) {
    const info = await XActions.user.getInfo(username)
    database.push(info)
    await new Promise(r => setTimeout(r, 1000))
  }
  console.log(`Collected data for ${database.length} users`)
  return database
}
```

#### `XActions.user.restrict(username)` - Restrict user interactions
```js
// Example 1: Restrict a user without blocking
await XActions.user.restrict("annoyinguser")
// They won't know they're restricted, but their interactions are limited

// Example 2: Soft moderation for borderline accounts
const borderlineUsers = ["user1", "user2"]
for (const user of borderlineUsers) {
  await XActions.user.restrict(user)
  console.log(`Restricted @${user}`)
}

// Example 3: Restrict instead of block for public figures
async function softModerate(username) {
  await XActions.user.restrict(username)
  console.log(`@${username} restricted - they can still see you but limited interaction`)
}
await softModerate("spammyuser")
```

---

### XActions.dm - Direct Messages

#### `XActions.dm.send(username, message)` - Send a DM
```js
// Example 1: Send a simple DM
await XActions.dm.send("friend", "Hey! How are you doing?")

// Example 2: Outreach message
await XActions.dm.send("potentialclient", `
Hi! I came across your work and I'm impressed.
Would love to connect and discuss potential collaboration.
`)

// Example 3: Batch outreach with personalization
const prospects = [
  { username: "lead1", company: "TechCorp" },
  { username: "lead2", company: "StartupXYZ" }
]
for (const p of prospects) {
  await XActions.dm.send(p.username, 
    `Hi! Loved what you're building at ${p.company}. Let's connect!`)
  await new Promise(r => setTimeout(r, 5000)) // Wait between DMs
}
```

#### `XActions.dm.open(username)` - Open DM conversation
```js
// Example 1: Open an existing conversation
await XActions.dm.open("bestfriend")
// Opens the DM thread with bestfriend

// Example 2: Quick access to important DMs
const priorityDMs = ["boss", "client", "partner"]
await XActions.dm.open(priorityDMs[0])

// Example 3: Navigate to DM before sending media
await XActions.dm.open("teammate")
// Then you can manually add images/files
console.log("DM opened - ready to send media!")
```

#### `XActions.dm.getConversations()` - Get all DM conversations
```js
// Example 1: List all your conversations
const convos = await XActions.dm.getConversations()
console.log(`You have ${convos.length} conversations`)

// Example 2: Find unread conversations
const convos = await XActions.dm.getConversations()
const unread = convos.filter(c => c.unread)
console.log(`${unread.length} unread conversations`)

// Example 3: Export conversation list
const convos = await XActions.dm.getConversations()
const summary = convos.map(c => ({
  user: c.username,
  lastMessage: c.lastMessagePreview,
  time: c.lastMessageTime
}))
console.table(summary)
```

#### `XActions.dm.deleteConversation(element)` - Delete conversation
```js
// Example 1: Delete a specific conversation
const convos = await XActions.dm.getConversations()
const targetConvo = convos.find(c => c.username === "oldcontact")
if (targetConvo) {
  await XActions.dm.deleteConversation(targetConvo.element)
  console.log("Conversation deleted!")
}

// Example 2: Clean up old conversations
const convos = await XActions.dm.getConversations()
for (const convo of convos.slice(0, 5)) { // Delete first 5
  await XActions.dm.deleteConversation(convo.element)
  await new Promise(r => setTimeout(r, 1000))
}

// Example 3: Delete conversations with specific users
const toDelete = ["spammer1", "spammer2"]
const convos = await XActions.dm.getConversations()
for (const convo of convos) {
  if (toDelete.includes(convo.username)) {
    await XActions.dm.deleteConversation(convo.element)
  }
}
```

#### `XActions.dm.leaveGroup()` - Leave group DM
```js
// Example 1: Leave current group DM
await XActions.dm.leaveGroup()
console.log("Left the group!")

// Example 2: Leave after sending goodbye
await XActions.dm.send("", "Thanks everyone, I'm leaving this group. Bye!")
await new Promise(r => setTimeout(r, 2000))
await XActions.dm.leaveGroup()

// Example 3: Cleanup group memberships
// First navigate to the group DM you want to leave
await XActions.dm.open("groupname")
await XActions.dm.leaveGroup()
console.log("Successfully left group")
```

#### `XActions.dm.createGroup(usernames, groupName)` - Create group DM
```js
// Example 1: Create a team group
await XActions.dm.createGroup(
  ["teammate1", "teammate2", "teammate3"],
  "Project Alpha Team"
)

// Example 2: Create a friends group
await XActions.dm.createGroup(
  ["friend1", "friend2", "friend3", "friend4"],
  "Weekend Plans 🎉"
)

// Example 3: Create mastermind group
const mastermindMembers = ["founder1", "founder2", "founder3"]
await XActions.dm.createGroup(mastermindMembers, "Founders Mastermind")
console.log("Group created with", mastermindMembers.length, "members")
```

#### `XActions.dm.sendImage()` - Send image in DM
```js
// Example 1: Open image picker in DM
await XActions.dm.open("friend")
await XActions.dm.sendImage()
// Opens file picker to select an image

// Example 2: Prepare to send screenshot
await XActions.dm.open("colleague")
await XActions.dm.sendImage()
console.log("Select your screenshot to send...")

// Example 3: Share image workflow
async function shareImageWith(username) {
  await XActions.dm.open(username)
  await XActions.dm.sendImage()
  console.log(`Image picker opened for @${username}`)
}
await shareImageWith("designer")
```

#### `XActions.dm.sendGif(searchTerm)` - Send GIF in DM
```js
// Example 1: Send a celebration GIF
await XActions.dm.open("friend")
await XActions.dm.sendGif("celebration")

// Example 2: React with a funny GIF
await XActions.dm.sendGif("laughing")

// Example 3: Send themed GIFs
const reactions = {
  happy: "excited dance",
  sad: "crying",
  surprised: "shocked",
  thanks: "thank you bow"
}
await XActions.dm.open("bestie")
await XActions.dm.sendGif(reactions.happy)
```

#### `XActions.dm.react(messageElement, emoji)` - React to message
```js
// Example 1: React to a message with heart
const messages = document.querySelectorAll('[data-testid="messageEntry"]')
const lastMessage = messages[messages.length - 1]
await XActions.dm.react(lastMessage, "❤️")

// Example 2: React with fire emoji
await XActions.dm.react(lastMessage, "🔥")

// Example 3: React to multiple messages
const messages = document.querySelectorAll('[data-testid="messageEntry"]')
const reactions = ["❤️", "😂", "🔥", "👍", "😮"]
for (let i = 0; i < Math.min(5, messages.length); i++) {
  await XActions.dm.react(messages[i], reactions[i])
  await new Promise(r => setTimeout(r, 500))
}
```

---

### XActions.search - Search & Discovery

#### `XActions.search.query(query, filter)` - Search with query
```js
// Example 1: Basic search
await XActions.search.query("javascript tips")

// Example 2: Search with filter
await XActions.search.query("web development", "latest")
// Filters: 'top', 'latest', 'people', 'photos', 'videos'

// Example 3: Research trending topics
const topics = ["AI news", "startup funding", "tech layoffs"]
for (const topic of topics) {
  await XActions.search.query(topic, "latest")
  console.log(`Searching: ${topic}`)
  await new Promise(r => setTimeout(r, 3000))
}
```

#### `XActions.search.top(query)` - Search top results
```js
// Example 1: Find most popular tweets about a topic
await XActions.search.top("machine learning")

// Example 2: Research viral content
await XActions.search.top("product launch")
// Shows most engaged tweets

// Example 3: Competitive research
const competitors = ["shopify", "stripe", "square"]
for (const comp of competitors) {
  await XActions.search.top(comp)
  console.log(`Top tweets about ${comp}`)
  await new Promise(r => setTimeout(r, 2000))
}
```

#### `XActions.search.latest(query)` - Search latest
```js
// Example 1: Find breaking news
await XActions.search.latest("breaking news crypto")

// Example 2: Real-time event monitoring
await XActions.search.latest("conference keynote")

// Example 3: Track live discussions
setInterval(async () => {
  await XActions.search.latest("bitcoin")
  console.log("Refreshed latest bitcoin tweets")
}, 60000) // Every minute
```

#### `XActions.search.people(query)` - Search people
```js
// Example 1: Find experts in a field
await XActions.search.people("AI researcher")

// Example 2: Discover potential connections
await XActions.search.people("javascript developer")

// Example 3: Find team members
const roles = ["frontend engineer", "product designer", "DevRel"]
for (const role of roles) {
  await XActions.search.people(role)
  console.log(`Found people: ${role}`)
  await new Promise(r => setTimeout(r, 2000))
}
```

#### `XActions.search.photos(query)` - Search photos
```js
// Example 1: Find visual content
await XActions.search.photos("infographic design")

// Example 2: Research visual trends
await XActions.search.photos("UI design inspiration")

// Example 3: Find memes and visual content
await XActions.search.photos("tech meme")
console.log("Browsing tech memes...")
```

#### `XActions.search.videos(query)` - Search videos
```js
// Example 1: Find video content
await XActions.search.videos("coding tutorial")

// Example 2: Discover video creators
await XActions.search.videos("tech review")

// Example 3: Research video formats
const videoTypes = ["explainer video", "demo video", "product showcase"]
for (const type of videoTypes) {
  await XActions.search.videos(type)
  await new Promise(r => setTimeout(r, 3000))
}
```

#### `XActions.search.from(username)` - Search from user
```js
// Example 1: Search all tweets from a user
await XActions.search.from("elonmusk")

// Example 2: Find a user's tweets about a topic
await XActions.search.from("naval")
// Then manually add keywords to refine

// Example 3: Research someone's tweet history
async function researchUser(username) {
  await XActions.search.from(username)
  console.log(`Viewing all tweets from @${username}`)
}
await researchUser("paulg")
```

#### `XActions.search.to(username)` - Search to user
```js
// Example 1: Find replies to a user
await XActions.search.to("github")

// Example 2: See what people are asking someone
await XActions.search.to("openai")

// Example 3: Monitor customer feedback
await XActions.search.to("yourcompany")
console.log("Viewing all replies to your company account")
```

#### `XActions.search.mentions(username)` - Search mentions
```js
// Example 1: Find all mentions of a user
await XActions.search.mentions("vitalikbuterin")

// Example 2: Track brand mentions
await XActions.search.mentions("yourbrand")

// Example 3: Monitor mentions of competitors
const competitors = ["competitor1", "competitor2"]
for (const comp of competitors) {
  await XActions.search.mentions(comp)
  console.log(`Mentions of @${comp}`)
  await new Promise(r => setTimeout(r, 2000))
}
```

#### `XActions.search.hashtag(tag)` - Search hashtag
```js
// Example 1: Track a hashtag
await XActions.search.hashtag("buildinpublic")

// Example 2: Find community discussions
await XActions.search.hashtag("100DaysOfCode")

// Example 3: Monitor event hashtags
const eventTags = ["TechConf2024", "ProductHunt", "WebSummit"]
for (const tag of eventTags) {
  await XActions.search.hashtag(tag)
  console.log(`#${tag} tweets loaded`)
  await new Promise(r => setTimeout(r, 2000))
}
```

#### `XActions.search.advanced(options)` - Advanced search with operators
```js
// Example 1: Find viral tweets from a user
await XActions.search.advanced({
  from: "elonmusk",
  minFaves: 10000,
  since: "2024-01-01"
})

// Example 2: Find tech discussions with media
await XActions.search.advanced({
  words: "AI startup",
  hasMedia: true,
  minRetweets: 100,
  lang: "en"
})

// Example 3: Find your own mentions
await XActions.search.advanced({
  mentioning: "yourusername",
  excludeRetweets: true
})

// Example 4: Complex research query
await XActions.search.advanced({
  words: "remote work",
  from: "",           // Any user
  minFaves: 500,
  minRetweets: 50,
  hasLinks: true,
  since: "2024-06-01",
  until: "2024-12-31",
  lang: "en",
  excludeReplies: true
})

// Example 5: Find job opportunities
await XActions.search.advanced({
  words: "hiring OR job",
  hasLinks: true,
  minFaves: 10,
  lang: "en"
})
```

#### `XActions.search.getResults()` - Get current search results
```js
// Example 1: Get tweets from current search
const results = await XActions.search.getResults()
console.log(`Found ${results.length} results`)

// Example 2: Process search results
await XActions.search.latest("web3 jobs")
const results = await XActions.search.getResults()
for (const tweet of results) {
  console.log(`@${tweet.username}: ${tweet.text.slice(0, 100)}...`)
}

// Example 3: Export search results
await XActions.search.top("startup advice")
const results = await XActions.search.getResults()
const data = results.map(r => ({
  user: r.username,
  text: r.text,
  likes: r.likeCount,
  retweets: r.retweetCount
}))
console.table(data)
```

---

### XActions.nav (Part 1) - Core Navigation

#### `XActions.nav.home()` - Navigate to home
```js
// Example 1: Go to home timeline
await XActions.nav.home()

// Example 2: Return home after browsing
// After finishing tasks on other pages
await XActions.nav.home()
console.log("Back to home timeline!")

// Example 3: Start automation from home
await XActions.nav.home()
// Begin liking/engagement automation from home feed
```

#### `XActions.nav.explore()` - Navigate to explore
```js
// Example 1: Go to explore page
await XActions.nav.explore()

// Example 2: Discover trending content
await XActions.nav.explore()
console.log("Browsing explore page for trends...")

// Example 3: Content discovery workflow
await XActions.nav.explore()
await new Promise(r => setTimeout(r, 2000))
const trends = document.querySelectorAll('[data-testid="trend"]')
console.log(`Found ${trends.length} trending topics`)
```

#### `XActions.nav.notifications()` - Navigate to notifications
```js
// Example 1: Check notifications
await XActions.nav.notifications()

// Example 2: Monitor mentions and interactions
await XActions.nav.notifications()
console.log("Checking latest notifications...")

// Example 3: Notification check workflow
async function checkNotifications() {
  await XActions.nav.notifications()
  await new Promise(r => setTimeout(r, 2000))
  console.log("Notifications loaded")
}
await checkNotifications()
```

#### `XActions.nav.messages()` - Navigate to messages
```js
// Example 1: Open DM inbox
await XActions.nav.messages()

// Example 2: Check for new DMs
await XActions.nav.messages()
console.log("Checking direct messages...")

// Example 3: DM management workflow
await XActions.nav.messages()
const convos = await XActions.dm.getConversations()
console.log(`You have ${convos.length} conversations`)
```

#### `XActions.nav.bookmarks()` - Navigate to bookmarks
```js
// Example 1: View saved bookmarks
await XActions.nav.bookmarks()

// Example 2: Review saved content
await XActions.nav.bookmarks()
console.log("Browsing your bookmarked tweets...")

// Example 3: Bookmark management
await XActions.nav.bookmarks()
await new Promise(r => setTimeout(r, 2000))
// Now you can export or organize bookmarks
```

#### `XActions.nav.lists()` - Navigate to lists
```js
// Example 1: View your lists
await XActions.nav.lists()

// Example 2: Manage list subscriptions
await XActions.nav.lists()
console.log("Viewing all your lists...")

// Example 3: List organization workflow
await XActions.nav.lists()
const lists = await XActions.lists.getAll()
console.log(`You have ${lists.length} lists`)
```

#### `XActions.nav.communities()` - Navigate to communities
```js
// Example 1: Browse communities
await XActions.nav.communities()

// Example 2: Find new communities
await XActions.nav.communities()
console.log("Discovering X Communities...")

// Example 3: Community engagement workflow
await XActions.nav.communities()
await new Promise(r => setTimeout(r, 2000))
console.log("Ready to engage with communities")
```

#### `XActions.nav.premium()` - Navigate to premium signup
```js
// Example 1: View premium features
await XActions.nav.premium()

// Example 2: Check subscription options
await XActions.nav.premium()
console.log("Viewing X Premium options...")

// Example 3: Premium signup workflow
await XActions.nav.premium()
// Review features and pricing
```

---

## �🚀 Quick Start

### Step 1: Load the Core Module
```js
// ALWAYS paste core.js first!
// Copy the contents of src/automation/core.js
```

### Step 2: Load Your Automation Script
```js
// Then paste the automation script you want to use
// e.g., autoLiker.js, keywordFollow.js, etc.
```

### Step 3: Configure & Run
Each script has a configuration section at the top. Modify it to match your needs.

---

## 📚 Script Documentation

### 1. Auto-Liker (`autoLiker.js`)

**Purpose:** Automatically like posts on your timeline based on keywords or users.

**How to use:**
1. Go to `x.com/home`
2. Paste `core.js` then `autoLiker.js`
3. Configure and run

**Configuration:**
```js
const CONFIG = {
  KEYWORDS: ['web3', 'crypto'],      // Like posts containing these words
  FROM_USERS: ['elonmusk'],          // Always like posts from these users
  MAX_LIKES: 50,                     // Stop after this many likes
  ALSO_RETWEET: false,               // Also retweet liked posts
  SCROLL_DELAY: 2000,                // Delay between scrolls (ms)
};
```

**Commands:**
```js
stopAutoLiker()           // Stop the script
window.XActions.Liker.stats()   // View statistics
```

---

### 2. Keyword Follow (`keywordFollow.js`)

**Purpose:** Search for keywords and auto-follow users who match your criteria.

**How to use:**
1. Go to `x.com/home`
2. Paste `core.js` then `keywordFollow.js`
3. Configure and run

**Configuration:**
```js
const CONFIG = {
  KEYWORDS: ['solidity developer', 'web3 builder'],
  MAX_FOLLOWS_PER_KEYWORD: 10,
  TOTAL_MAX_FOLLOWS: 30,
  
  // Filters
  MIN_FOLLOWERS: 100,
  MAX_FOLLOWERS: 50000,
  MUST_HAVE_BIO: true,
  BIO_KEYWORDS: ['dev', 'builder', 'founder'],
};
```

**Tracking:**
- Followed users are saved to `localStorage`
- Timestamps are recorded for smart unfollow later
- Run `window.XActions.KeywordFollow.tracked()` to see followed list

---

### 3. Smart Unfollow (`smartUnfollow.js`)

**Purpose:** Unfollow users who didn't follow back within a specified time period.

**How to use:**
1. Go to your Following page: `x.com/YOUR_USERNAME/following`
2. Paste `core.js` then `smartUnfollow.js`
3. Configure and run

**Configuration:**
```js
const CONFIG = {
  DAYS_TO_WAIT: 3,               // Days before unfollowing
  MAX_UNFOLLOWS: 50,             // Limit per session
  DRY_RUN: false,                // Set true to preview without unfollowing
  WHITELIST: ['friend1', 'friend2'],  // Never unfollow these users
};
```

**Integration:**
Works best with `keywordFollow.js` — it reads the tracking data to know when you followed each user.

---

### 4. Link Scraper (`linkScraper.js`)

**Purpose:** Extract all external links shared by a user.

**How to use:**
1. Go to the target user's profile
2. Paste `core.js` then `linkScraper.js`
3. Configure and run

**Configuration:**
```js
const CONFIG = {
  TARGET_USER: 'elonmusk',       // Or null to use current page
  MAX_SCROLLS: 100,              // How far to scroll
  AUTO_DOWNLOAD: true,           // Download results automatically
  INCLUDE_DOMAINS: [],           // Only include these domains (empty = all)
  EXCLUDE_DOMAINS: ['x.com', 'x.com'],  // Skip these domains
};
```

**Output:**
- JSON file with all links and metadata
- TXT file with clean link list
- Console summary grouped by domain

---

### 5. Auto-Commenter (`autoCommenter.js`)

**Purpose:** Monitor a user and automatically comment on their new posts.

**How to use:**
1. Open X in your browser (any page)
2. Paste `core.js` then `autoCommenter.js`
3. Configure and run

**Configuration:**
```js
const CONFIG = {
  TARGET_USER: 'elonmusk',
  CHECK_INTERVAL_SECONDS: 60,    // How often to check for new posts
  
  COMMENTS: [
    'Great insight! 🔥',
    'This is exactly what I was thinking!',
    'Thanks for sharing!',
  ],
  
  KEYWORD_COMMENTS: {
    'AI': ['The AI revolution is here!', 'Fascinating AI take!'],
    'crypto': ['Bullish! 🚀', 'Web3 is the future!'],
  },
};
```

**Commands:**
```js
stopAutoCommenter()        // Stop monitoring
window.XActions.Commenter.stats()   // View statistics
```

⚠️ **Warning:** Be careful with auto-commenting — it can appear spammy if overused.

---

### 6. Multi-Account Manager (`multiAccount.js`)

**Purpose:** Store and manage multiple X accounts for automation.

**How to use:**
1. Paste `core.js` then `multiAccount.js`
2. Use the command interface

**Commands:**
```js
// Add an account
XAccounts.add('username', 'password', { note: 'Main account' })

// List all accounts
XAccounts.list()

// Get next account (rotation)
XAccounts.getNext()

// Remove an account
XAccounts.remove('username')

// Export accounts (encrypted)
XAccounts.export()

// Import accounts
XAccounts.import('encrypted-string')

// Login helper
XAccounts.login('username')
```

**Security:**
- Accounts are stored in localStorage (base64 encoded)
- Clear with `localStorage.removeItem('xactions_accounts')`
- Never share your export strings

---

### 7. Growth Suite (`growthSuite.js`)

**Purpose:** All-in-one growth automation combining follow, like, and unfollow.

**How to use:**
1. Go to `x.com/home`
2. Paste `core.js` then `growthSuite.js`
3. Configure and run

**Configuration:**
```js
const STRATEGY = {
  KEYWORDS: ['web3 developer', 'solidity engineer'],
  
  ACTIONS: {
    FOLLOW: true,
    LIKE: true,
    UNFOLLOW: true,
  },
  
  LIMITS: {
    FOLLOWS: 20,
    LIKES: 30,
    UNFOLLOWS: 15,
  },
  
  TIMING: {
    UNFOLLOW_AFTER_DAYS: 3,
    SESSION_DURATION_MINUTES: 30,
  },
};
```

**Phases:**
1. **Phase 1:** Keyword search and follow
2. **Phase 2:** Like posts in timeline
3. **Phase 3:** Unfollow non-followers past threshold

**Commands:**
```js
stopGrowth()                 // Stop all automation
window.XActions.Growth.state()    // View current state
window.XActions.Growth.tracked()  // View tracked users
```

---

## 🛡️ Rate Limiting

All scripts include built-in rate limiting to protect your account:

| Action | Default Delay | Recommended Range |
|--------|---------------|-------------------|
| Follow | 3-5 seconds | 2-10 seconds |
| Unfollow | 2-4 seconds | 2-8 seconds |
| Like | 1-3 seconds | 1-5 seconds |
| Comment | 30-60 seconds | 30-120 seconds |

**Tips:**
- Start with conservative delays
- Increase delays if you get errors
- Stop if you see "rate limit" warnings
- Take breaks between sessions

---

## 💾 Data Persistence

All tracking data is stored in `localStorage`:

| Key | Description |
|-----|-------------|
| `xactions_followed` | Users you've followed with timestamps |
| `xactions_liked` | Tweet IDs you've liked |
| `xactions_accounts` | Multi-account credentials |
| `xactions_links_*` | Scraped links cache |
| `xactions_rate_*` | Rate limit tracking |

**Clear all data:**
```js
Object.keys(localStorage)
  .filter(k => k.startsWith('xactions_'))
  .forEach(k => localStorage.removeItem(k));
```

---

## 🔧 Customization

### Adjusting Selectors

If X updates their UI, you may need to update selectors in `core.js`:

```js
const SELECTORS = {
  tweet: '[data-testid="tweet"]',
  userCell: '[data-testid="UserCell"]',
  followButton: '[data-testid$="-follow"]',
  unfollowButton: '[data-testid$="-unfollow"]',
  likeButton: '[data-testid="like"]',
  confirmButton: '[data-testid="confirmationSheetConfirm"]',
  // Add or modify as needed
};
```

### Creating Custom Scripts

Use the core module to build your own automations:

```js
(async () => {
  const { log, sleep, clickElement, waitForElement, SELECTORS } = window.XActions.Core;
  
  log('Starting custom automation...', 'info');
  
  // Your custom logic here
  const element = await waitForElement(SELECTORS.tweet, 5000);
  if (element) {
    await clickElement(element);
    log('Clicked!', 'success');
  }
})();
```

---

### 8. Follow Target Users (`followTargetUsers.js`)

**Purpose:** Follow the followers or following of any target account.

**How to use:**
1. Open X in your browser
2. Paste `core.js` then `followTargetUsers.js`
3. Configure target accounts and run

**Configuration:**
```js
const CONFIG = {
  TARGET_ACCOUNTS: ['elonmusk', 'naval'],  // Accounts to scrape
  LIST_TYPE: 'followers',                   // 'followers' or 'following'
  MAX_FOLLOWS_PER_ACCOUNT: 20,
  TOTAL_MAX_FOLLOWS: 50,
  
  FILTERS: {
    MIN_FOLLOWERS: 100,
    MAX_FOLLOWERS: 50000,
    MUST_HAVE_BIO: true,
    SKIP_PROTECTED: true,
    SKIP_VERIFIED: false,
  },
};
```

---

### 9. Follow Engagers (`followEngagers.js`)

**Purpose:** Follow users who liked, retweeted, or quoted specific posts.

**How to use:**
1. Navigate to a post you want to analyze
2. Paste `core.js` then `followEngagers.js`
3. Configure and run

**Configuration:**
```js
const CONFIG = {
  MODE: 'likers',  // 'likers', 'retweeters', 'quoters', or 'all'
  TARGET_POSTS: [],  // Leave empty to use current page
  MAX_FOLLOWS_PER_POST: 15,
  TOTAL_MAX_FOLLOWS: 30,
};
```

---

### 10. Protect Active Users (`protectActiveUsers.js`)

**Purpose:** Scan your posts for engagers and protect them from being unfollowed.

**How to use:**
1. Paste `core.js` then `protectActiveUsers.js`
2. It will scan your recent posts for engagers
3. Works with `smartUnfollow.js` — protected users won't be unfollowed

**Configuration:**
```js
const CONFIG = {
  POSTS_TO_SCAN: 10,
  LOOKBACK_DAYS: 30,
  MIN_ENGAGEMENTS: 1,
  
  ENGAGEMENT_TYPES: {
    likers: true,
    repliers: true,
    retweeters: true,
    quoters: true,
  },
};
```

**Commands:**
```js
viewProtected()           // See all protected users
isProtected('username')   // Check if user is protected
```

---

### 11. Quota Supervisor (`quotaSupervisor.js`)

**Purpose:** Sophisticated rate limiting to protect your account from restrictions.

**How to use:**
1. Paste `core.js` then `quotaSupervisor.js`
2. All other automation scripts will respect the quotas

**Configuration:**
```js
const QUOTAS = {
  HOURLY: {
    likes: 60,
    follows: 30,
    unfollows: 40,
    comments: 10,
  },
  DAILY: {
    likes: 500,
    follows: 200,
    unfollows: 300,
    comments: 50,
  },
  
  STOCHASTIC: {
    enabled: true,     // Randomize limits slightly
    variance: 0.15,    // 15% variance
  },
};
```

**Commands:**
```js
quotaStatus()    // View current quota status
quotaReset()     // Reset all quotas
quotaWake()      // Wake up from quota sleep
```

---

### 12. Session Logger (`sessionLogger.js`)

**Purpose:** Track all automation actions and generate analytics reports.

**How to use:**
1. Paste `core.js` then `sessionLogger.js`
2. All actions will be automatically logged

**Commands:**
```js
stats()           // View all-time stats
todayStats()      // View today's stats
weekStats()       // View this week's stats
dailyStats()      // View daily breakdown
sessionStats()    // View current session
exportLogs()      // Export logs as JSON
```

---

## 🎧 Customer Service Tools

### 13. Customer Service Bot (`customerService.js`)

**Purpose:** Automate customer service responses for business accounts.

**How to use:**
1. Configure your accounts inline (user:pass format)
2. Paste `core.js` then `customerService.js`
3. It monitors mentions and suggests/sends responses

**Configuration:**
```js
// Add accounts inline (paste from txt file)
const ACCOUNTS = `
personal_account:password123
business_account:bizpass456
`.trim().split('\n')...

const CONFIG = {
  ACTIVE_ACCOUNT: 'business_account',
  
  MONITOR: {
    mentions: true,
    dms: true,
    replies: true,
  },
  
  RESPONSE: {
    autoReply: true,
    requireApproval: true,  // Review before sending
  },
  
  BUSINESS_HOURS: {
    enabled: true,
    start: 9,   // 9 AM
    end: 17,    // 5 PM
    days: [1,2,3,4,5],  // Mon-Fri
  },
};
```

**Response Templates:**
```js
const TEMPLATES = {
  greeting: ["Hi {customer}! How can I help?"],
  issue: ["Sorry about that! Please DM us details."],
  thanks: ["Thank you so much! 🙏"],
  pricing: ["Check our website for pricing info!"],
  support: ["Please DM us for faster support."],
};
```

**Commands:**
```js
stopCS()          // Stop the bot
csStats()         // View statistics
csTemplates()     // Show all templates
csRespond('issue') // Get a response template
```

---

### 14. Algorithm Builder (`algorithmBuilder.js`)

**Purpose:** LLM-powered algorithm cultivation engine. Trains X's algorithm by systematically searching your niche, liking relevant content, following key accounts, and posting AI-generated comments and original posts — all in your persona's voice.

**This is the browser console version.** For the 24/7 headless Puppeteer version, use the CLI: `xactions persona run <id>`.

**How to use:**
1. Go to `x.com/home`
2. Paste `core.js` then `algorithmBuilder.js`
3. Edit the `NICHE_CONFIG` and `LLM_CONFIG` at the top
4. The script runs indefinitely with activity cycles and rest periods

**Configuration:**
```js
const NICHE_CONFIG = {
  topics: ['crypto', 'defi', 'web3', 'bitcoin'],
  searchTerms: ['crypto alpha', 'defi yield', 'new token launch'],
  targetAccounts: ['0xCygaar', 'DefiIgnas'],
  avoidTopics: ['scam', 'rug'],
  commentStyle: 'brief, hype-driven, crypto lingo',
  tone: 'degen casual — short, punchy, uses crypto slang',
};

const LLM_CONFIG = {
  enabled: true,
  apiKey: 'your_openrouter_api_key',
  model: 'google/gemini-flash-2.0',
};
```

**What it does each cycle:**
1. **Search phase** — Searches niche terms, scrolls results, likes on-topic tweets
2. **Engage phase** — Follows relevant users, comments using LLM-generated replies
3. **Create phase** — Posts original content in your persona's voice
4. **Browse phase** — Scrolls timeline, visits profiles, checks notifications
5. **Rest phase** — Sleeps 30–120 seconds between cycles to appear human

**Fallback behavior:** If OpenRouter is unavailable, the script falls back to curated comment templates stored in `FALLBACK_COMMENTS`.

**Commands:**
```js
stopAlgorithm()                     // Stop the builder
window.XActions.Algorithm.stats()   // View engagement stats
window.XActions.Algorithm.state()   // View current state
```

> **Tip:** For 24/7 unattended operation, use the Node.js version via `xactions persona create` + `xactions persona run <id>` instead.

---

### Multi-Account with user:pass Import

The Multi-Account Manager now supports importing from simple text format:

```js
// Import accounts from a txt/csv file format
XAccounts.importText(`
personal:mypassword123
business:bizpassword456
support:supportpass789
`)

// Export back to text format
XAccounts.exportText()

// Other commands
XAccounts.list()      // List all accounts
XAccounts.getNext()   // Get next account (rotation)
XAccounts.stats.show() // View per-account stats
```

**Supported formats:**
- `username:password`
- `username,password`
- `username;password`
- `username\tpassword` (tab-separated)

---

## � XActions Function Reference

### XActions.settings (Part 2 - Advanced Settings)

```js
// XActions.settings.blockedAccounts - View blocked accounts
// Example 1: Navigate to blocked accounts page
await XActions.settings.blockedAccounts()
console.log("Now viewing your blocked accounts list")

// Example 2: View blocked accounts then export the list
await XActions.settings.blockedAccounts()
await XActions.utils.waitForPageLoad()
const blockedUsers = document.querySelectorAll('[data-testid="UserCell"]')
console.log(`You have ${blockedUsers.length} visible blocked accounts`)
```

```js
// XActions.settings.addMutedWord - Add muted word with options
// Example 1: Mute a word from home timeline
await XActions.settings.addMutedWord("spoilers", { duration: "forever" })

// Example 2: Temporarily mute trending topic
await XActions.settings.addMutedWord("#GameOfThrones", { 
  duration: "7days",
  homeTimeline: true,
  notifications: true
})

// Example 3: Mute multiple keywords for content filtering
const toxicWords = ["drama", "beef", "cancelled"]
for (const word of toxicWords) {
  await XActions.settings.addMutedWord(word, { duration: "forever" })
  console.log(`Muted: ${word}`)
}
```

```js
// XActions.settings.downloadData - Download your Twitter data
// Example 1: Request data download
await XActions.settings.downloadData()
console.log("Navigate through the prompts to request your archive")

// Example 2: Download data for backup before cleanup
console.log("Backing up before mass unfollow...")
await XActions.settings.downloadData()
// Wait for download request, then proceed with cleanup
```

```js
// XActions.settings.deactivate - Navigate to account deactivation page
// Example 1: Go to deactivation page
await XActions.settings.deactivate()
console.log("⚠️ Deactivation page loaded - proceed with caution!")

// Example 2: Pre-deactivation checklist
console.log("Pre-deactivation checklist:")
console.log("1. Downloaded your data?")
console.log("2. Saved important DMs?")
console.log("3. Notified followers?")
await XActions.settings.deactivate()
```

---

### XActions.profile (Profile Management)

```js
// XActions.profile.edit - Open profile editor
// Example 1: Open profile editor
await XActions.profile.edit()
console.log("Profile editor opened - make your changes!")

// Example 2: Open editor and wait for load
await XActions.profile.edit()
await XActions.utils.waitForPageLoad()
console.log("Ready to edit your profile")
```

```js
// XActions.profile.updateName - Update display name
// Example 1: Simple name update
await XActions.profile.updateName("John Developer 🚀")

// Example 2: Add holiday theme to name
const originalName = "Sarah Tech"
await XActions.profile.updateName(`${originalName} 🎄`)
console.log("Added holiday flair to your name!")

// Example 3: Rotate name based on time of day
const hour = new Date().getHours()
const emoji = hour < 12 ? "☀️" : hour < 18 ? "💼" : "🌙"
await XActions.profile.updateName(`Developer ${emoji}`)
```

```js
// XActions.profile.updateBio - Update profile bio
// Example 1: Set a new bio
await XActions.profile.updateBio("Building the future with code | Open source enthusiast | DMs open 📬")

// Example 2: Add current project to bio
const project = "WorkingOnAI"
await XActions.profile.updateBio(`Currently building #${project} | Founder @MyStartup | Tweets about tech & startups`)

// Example 3: Bio with call to action
await XActions.profile.updateBio(`
🔧 Full-stack developer
🚀 Building @XActions
📩 Collabs: dm me
🔗 Portfolio below ⬇️
`.trim())
```

```js
// XActions.profile.updateLocation - Update location
// Example 1: Set your location
await XActions.profile.updateLocation("San Francisco, CA 🌉")

// Example 2: Fun location for events
await XActions.profile.updateLocation("Currently at #TechConf2024 🎤")

// Example 3: Remote work indicator
await XActions.profile.updateLocation("🌍 Remote | Everywhere")
```

```js
// XActions.profile.updateWebsite - Update website URL
// Example 1: Set your main website
await XActions.profile.updateWebsite("https://myportfolio.dev")

// Example 2: Link to latest project
await XActions.profile.updateWebsite("https://github.com/username/cool-project")

// Example 3: Linktree or link aggregator
await XActions.profile.updateWebsite("https://linktr.ee/yourusername")
console.log("Website updated! Visitors can now find all your links.")
```

```js
// XActions.profile.updateAvatar - Open avatar picker
// Example 1: Open avatar picker to upload new photo
await XActions.profile.updateAvatar()
console.log("Select your new profile picture")

// Example 2: Prompt for avatar update
console.log("Time to update your avatar for the new season!")
await XActions.profile.updateAvatar()
```

```js
// XActions.profile.updateHeader - Open header image picker
// Example 1: Open header picker
await XActions.profile.updateHeader()
console.log("Upload a header image (1500x500 recommended)")

// Example 2: Update header for campaign
console.log("Updating header for product launch...")
await XActions.profile.updateHeader()
```

```js
// XActions.profile.switchToProfessional - Switch to professional account
// Example 1: Switch to creator/business account
await XActions.profile.switchToProfessional()
console.log("Follow the prompts to set up your professional account")

// Example 2: Upgrade for analytics access
console.log("Switching to Professional for advanced analytics...")
await XActions.profile.switchToProfessional()
console.log("You'll now have access to tweet analytics and audience insights!")
```

---

### XActions.utils (Utilities & Helpers)

```js
// XActions.utils.getCurrentUser - Get current logged-in username
// Example 1: Get your username
const me = await XActions.utils.getCurrentUser()
console.log(`Logged in as: @${me}`)

// Example 2: Use in automation
const username = await XActions.utils.getCurrentUser()
await XActions.nav.profile(username)
console.log("Navigated to your own profile")

// Example 3: Conditional logic based on account
const user = await XActions.utils.getCurrentUser()
if (user === "myBusinessAccount") {
  console.log("Running business automation...")
} else {
  console.log("Running personal automation...")
}
```

```js
// XActions.utils.isLoggedIn - Check if logged in
// Example 1: Simple login check
if (await XActions.utils.isLoggedIn()) {
  console.log("✅ Logged in - ready to automate!")
} else {
  console.log("❌ Please log in first")
}

// Example 2: Guard clause for scripts
const loggedIn = await XActions.utils.isLoggedIn()
if (!loggedIn) {
  throw new Error("Must be logged in to run this script")
}

// Example 3: Health check
async function healthCheck() {
  const status = {
    loggedIn: await XActions.utils.isLoggedIn(),
    user: await XActions.utils.getCurrentUser(),
    time: new Date().toISOString()
  }
  console.table(status)
  return status
}
await healthCheck()
```

```js
// XActions.utils.getTokens - Get authentication tokens
// Example 1: Get auth tokens for API calls
const tokens = await XActions.utils.getTokens()
console.log("Bearer token:", tokens.bearer)
console.log("CSRF token:", tokens.csrf)

// Example 2: Use tokens for custom fetch
const tokens = await XActions.utils.getTokens()
const response = await fetch("https://api.x.com/2/...", {
  headers: {
    "Authorization": `Bearer ${tokens.bearer}`,
    "x-csrf-token": tokens.csrf
  }
})

// Example 3: Token debugging
const tokens = await XActions.utils.getTokens()
console.log("Tokens available:", Object.keys(tokens))
```

```js
// XActions.utils.getTweetIdFromUrl - Extract tweet ID from URL
// Example 1: Extract ID from a tweet URL
const url = "https://x.com/elonmusk/status/1234567890123456789"
const tweetId = XActions.utils.getTweetIdFromUrl(url)
console.log(`Tweet ID: ${tweetId}`) // 1234567890123456789

// Example 2: Batch process tweet URLs
const urls = [
  "https://x.com/user1/status/111111111",
  "https://x.com/user2/status/222222222"
]
const ids = urls.map(u => XActions.utils.getTweetIdFromUrl(u))
console.log("Tweet IDs:", ids)

// Example 3: Validate tweet URL
const input = "https://x.com/user/status/123456"
const id = XActions.utils.getTweetIdFromUrl(input)
if (id) {
  console.log(`Valid tweet URL, ID: ${id}`)
} else {
  console.log("Invalid tweet URL")
}
```

```js
// XActions.utils.getUsernameFromUrl - Extract username from URL
// Example 1: Get username from profile URL
const url = "https://x.com/nichxbt"
const username = XActions.utils.getUsernameFromUrl(url)
console.log(`Username: @${username}`) // nichxbt

// Example 2: Extract from any X URL
const tweetUrl = "https://x.com/elonmusk/status/12345"
const user = XActions.utils.getUsernameFromUrl(tweetUrl)
console.log(`Tweet author: @${user}`) // elonmusk

// Example 3: Clean up pasted URLs
const messyUrl = "https://x.com/TechCrunch?s=20"
const clean = XActions.utils.getUsernameFromUrl(messyUrl)
console.log(`Clean username: @${clean}`) // TechCrunch
```

```js
// XActions.utils.waitForPageLoad - Wait for page to fully load
// Example 1: Wait after navigation
await XActions.nav.explore()
await XActions.utils.waitForPageLoad()
console.log("Explore page fully loaded")

// Example 2: Wait before scraping
await XActions.nav.profile("elonmusk")
await XActions.utils.waitForPageLoad()
const tweets = XActions.tweet.getAll()
console.log(`Found ${tweets.length} tweets`)

// Example 3: Chained navigation with waits
async function visitProfiles(usernames) {
  for (const user of usernames) {
    await XActions.nav.profile(user)
    await XActions.utils.waitForPageLoad()
    console.log(`Visited @${user}`)
  }
}
await visitProfiles(["user1", "user2", "user3"])
```

```js
// XActions.utils.loadMore - Scroll to load more content
// Example 1: Load 5 more pages of content
await XActions.utils.loadMore(5)
console.log("Loaded 5 more batches of content")

// Example 2: Load until target count reached
let tweets = XActions.tweet.getAll()
while (tweets.length < 100) {
  await XActions.utils.loadMore(1)
  tweets = XActions.tweet.getAll()
}
console.log(`Loaded ${tweets.length} tweets`)

// Example 3: Deep scroll for data export
console.log("Loading all visible content...")
await XActions.utils.loadMore(20)
console.log("Done loading!")
```

```js
// XActions.utils.clearXData - Clear X data from localStorage
// Example 1: Clear cached data
XActions.utils.clearXData()
console.log("Cleared all XActions cached data")

// Example 2: Fresh start
XActions.utils.clearXData()
location.reload()
console.log("Cache cleared and page reloaded")

// Example 3: Clear before new session
console.log("Starting fresh session...")
XActions.utils.clearXData()
console.log("All local data cleared")
```

```js
// XActions.utils.exportBookmarks - Export all bookmarks
// Example 1: Export first 100 bookmarks
const bookmarks = await XActions.utils.exportBookmarks(100)
console.log(`Found ${bookmarks.length} bookmarks`)

// Example 2: Export and download as JSON
const bookmarks = await XActions.utils.exportBookmarks(500)
const blob = new Blob([JSON.stringify(bookmarks, null, 2)], {type: 'application/json'})
const url = URL.createObjectURL(blob)
const a = document.createElement('a'); a.href = url; a.download = 'bookmarks.json'; a.click()
console.log("Downloaded bookmarks.json!")

// Example 3: Find bookmarks containing specific keyword
const bookmarks = await XActions.utils.exportBookmarks(200)
const aiBookmarks = bookmarks.filter(b => b.text?.toLowerCase().includes('ai'))
console.log(`Found ${aiBookmarks.length} AI-related bookmarks`)
```

```js
// XActions.utils.exportLikes - Export user's likes
// Example 1: Export your own likes
const me = await XActions.utils.getCurrentUser()
const myLikes = await XActions.utils.exportLikes(me, 100)
console.log(`Exported ${myLikes.length} of your likes`)

// Example 2: Export and analyze likes
const likes = await XActions.utils.exportLikes("username", 200)
const withMedia = likes.filter(l => l.hasMedia)
console.log(`${withMedia.length} liked tweets have media`)

// Example 3: Download likes as CSV
const likes = await XActions.utils.exportLikes("techinfluencer", 300)
const csv = likes.map(l => `"${l.author}","${l.text?.replace(/"/g, '""')}"`).join('\n')
const blob = new Blob([csv], {type: 'text/csv'})
const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'likes.csv'; a.click()
```

```js
// XActions.utils.copyToClipboard - Copy text to clipboard
// Example 1: Copy a string
await XActions.utils.copyToClipboard("Hello from XActions!")
console.log("Copied to clipboard!")

// Example 2: Copy current tweet link
const tweets = XActions.tweet.getAll()
const link = await XActions.engage.copyLink(tweets[0])
await XActions.utils.copyToClipboard(link)
console.log("Tweet link copied!")

// Example 3: Copy formatted data
const data = { followers: 1000, following: 500 }
await XActions.utils.copyToClipboard(JSON.stringify(data, null, 2))
console.log("Data copied to clipboard as JSON")
```

```js
// XActions.utils.screenshotTweet - Screenshot a tweet
// Example 1: Screenshot a tweet by URL
const imageBlob = await XActions.utils.screenshotTweet("https://x.com/user/status/123456")
console.log("Tweet screenshot captured!")

// Example 2: Screenshot and download
const url = "https://x.com/elonmusk/status/123456789"
const screenshot = await XActions.utils.screenshotTweet(url)
const imgUrl = URL.createObjectURL(screenshot)
const a = document.createElement('a'); a.href = imgUrl; a.download = 'tweet.png'; a.click()

// Example 3: Screenshot for evidence/documentation
const reportedTweet = "https://x.com/user/status/123456"
await XActions.utils.screenshotTweet(reportedTweet)
console.log("Evidence captured before reporting")
```

```js
// XActions.utils.showKeyboardShortcuts - Show keyboard shortcuts
// Example 1: Display shortcuts
XActions.utils.showKeyboardShortcuts()

// Example 2: Learn shortcuts
console.log("Opening keyboard shortcuts reference...")
XActions.utils.showKeyboardShortcuts()
console.log("Press '?' anytime to see this again")
```

```js
// XActions.utils.devMode - Enable developer mode
// Example 1: Enable dev mode for debugging
XActions.utils.devMode()
console.log("Dev mode enabled - all elements now show data-testid")

// Example 2: Use dev mode to find selectors
XActions.utils.devMode()
console.log("Hover over elements to see their testid selectors")
console.log("Use getAllSelectors() to dump all selectors")
```

```js
// XActions.utils.getAllSelectors - Get all data-testid selectors
// Example 1: Dump all selectors on page
const selectors = XActions.utils.getAllSelectors()
console.log("All selectors:", selectors)

// Example 2: Find specific selector
const selectors = XActions.utils.getAllSelectors()
const buttons = selectors.filter(s => s.includes('button') || s.includes('Button'))
console.log("Button selectors:", buttons)

// Example 3: Export selectors for documentation
const selectors = XActions.utils.getAllSelectors()
console.log(JSON.stringify(selectors, null, 2))
```

---

### XActions.spaces (Twitter Spaces)

```js
// XActions.spaces.browse - Browse live spaces
// Example 1: Go to spaces discovery
await XActions.spaces.browse()
console.log("Browsing live Twitter Spaces")

// Example 2: Find spaces to join
await XActions.spaces.browse()
await XActions.utils.waitForPageLoad()
console.log("Find a Space that interests you!")
```

```js
// XActions.spaces.join - Join a space
// Example 1: Join a space by ID
await XActions.spaces.join("1BRKjZYWXYZKw")
console.log("Joined the Space!")

// Example 2: Join from URL
const spaceUrl = "https://x.com/i/spaces/1BRKjZYWXYZKw"
const spaceId = spaceUrl.split('/').pop()
await XActions.spaces.join(spaceId)

// Example 3: Join and request to speak
await XActions.spaces.join("1BRKjZYWXYZKw")
await sleep(2000) // Wait for connection
await XActions.spaces.requestToSpeak()
console.log("Joined and requested to speak!")
```

```js
// XActions.spaces.leave - Leave current space
// Example 1: Leave a space
await XActions.spaces.leave()
console.log("Left the Space")

// Example 2: Leave with confirmation
console.log("Leaving Space in 3 seconds...")
await sleep(3000)
await XActions.spaces.leave()
console.log("Successfully left")
```

```js
// XActions.spaces.requestToSpeak - Request to speak in a space
// Example 1: Request speaker access
await XActions.spaces.requestToSpeak()
console.log("Requested to speak - wait for host approval")

// Example 2: Request with notification
await XActions.spaces.requestToSpeak()
console.log("🎤 Hand raised! The host will see your request.")
```

```js
// XActions.spaces.setReminder - Set reminder for upcoming space
// Example 1: Set reminder for a scheduled space
await XActions.spaces.setReminder("1BRKjZYWXYZKw")
console.log("Reminder set! You'll be notified when it starts")

// Example 2: Set reminders for multiple spaces
const upcomingSpaces = ["space1id", "space2id", "space3id"]
for (const id of upcomingSpaces) {
  await XActions.spaces.setReminder(id)
  console.log(`Reminder set for Space: ${id}`)
}
```

```js
// XActions.spaces.share - Share current space link
// Example 1: Share space link
const link = await XActions.spaces.share()
console.log("Space link:", link)

// Example 2: Share to clipboard
const spaceLink = await XActions.spaces.share()
await XActions.utils.copyToClipboard(spaceLink)
console.log("Space link copied to clipboard!")

// Example 3: Share via DM
const link = await XActions.spaces.share()
await XActions.dm.send("friend", `Join this Space! ${link}`)
```

---

### XActions.communities (Twitter Communities)

```js
// XActions.communities.browse - Browse communities
// Example 1: Open communities browser
await XActions.communities.browse()
console.log("Browsing Twitter Communities")

// Example 2: Explore and discover
await XActions.communities.browse()
await XActions.utils.waitForPageLoad()
console.log("Find communities that match your interests!")
```

```js
// XActions.communities.view - View a specific community
// Example 1: View a community by ID
await XActions.communities.view("1234567890")
console.log("Viewing community page")

// Example 2: View and check rules
await XActions.communities.view("1234567890")
await XActions.utils.waitForPageLoad()
console.log("Check the community rules before posting!")
```

```js
// XActions.communities.join - Join a community
// Example 1: Join a community
await XActions.communities.join("1234567890")
console.log("Joined the community!")

// Example 2: Join multiple communities
const techCommunities = ["123", "456", "789"]
for (const id of techCommunities) {
  await XActions.communities.join(id)
  console.log(`Joined community: ${id}`)
  await sleep(1000)
}

// Example 3: Join and navigate to community
await XActions.communities.join("1234567890")
await XActions.communities.view("1234567890")
console.log("Joined and viewing your new community!")
```

```js
// XActions.communities.leave - Leave a community
// Example 1: Leave a community
await XActions.communities.leave("1234567890")
console.log("Left the community")

// Example 2: Leave with confirmation
const communityId = "1234567890"
console.log(`Leaving community ${communityId}...`)
await XActions.communities.leave(communityId)
console.log("Successfully left!")
```

---

## �🐛 Troubleshooting

**Script stops working:**
- X may have updated their UI — check selectors
- You may be rate limited — wait 15-30 minutes
- Page may need refresh — reload and try again

**"Core module not loaded" error:**
- Always paste `core.js` first
- Make sure it finished executing

**Account getting limited:**
- Increase delays between actions
- Reduce max limits per session
- Take longer breaks between sessions

---

## 📋 Best Practices

1. **Start small** — Test with 5-10 actions first
2. **Monitor results** — Watch for errors or unusual behavior  
3. **Use natural timing** — Random delays look more human
4. **Take breaks** — Don't run automation 24/7
5. **Keep logs** — Track what the scripts are doing
6. **Have backups** — Export your tracking data regularly

---

## 📖 XActions Function Reference

Complete reference with practical examples for every XActions function.

---

### 🐦 XActions.tweet — Posting & Managing Tweets

Functions for posting and managing tweets.

#### `post(text, options)` - Post a new tweet
```js
// XActions.tweet.post - Post a new tweet
// Example 1: Simple tweet
await XActions.tweet.post("Hello world! 🌍")

// Example 2: Tweet with draft mode (opens composer but doesn't post)
await XActions.tweet.post("This needs review before posting", { draft: true })

// Example 3: Daily motivation bot - post random quote
const quotes = [
  "Stay focused and never give up! 💪",
  "Every day is a new opportunity 🌟",
  "Build something amazing today 🚀"
]
const randomQuote = quotes[Math.floor(Math.random() * quotes.length)]
await XActions.tweet.post(randomQuote)
```

#### `reply(tweetElement, text)` - Reply to a tweet
```js
// XActions.tweet.reply - Reply to a tweet
// Example 1: Reply to the first tweet on your timeline
const tweets = XActions.tweet.getAll()
await XActions.tweet.reply(tweets[0], "Great post! Thanks for sharing 🙌")

// Example 2: Auto-reply to all tweets from a specific user
const tweets = XActions.tweet.getAll()
for (const tweet of tweets) {
  if (tweet.textContent.includes('@elonmusk')) {
    await XActions.tweet.reply(tweet, "Interesting perspective!")
    await new Promise(r => setTimeout(r, 3000)) // Wait between replies
  }
}

// Example 3: Reply with formatted response
const tweet = XActions.tweet.getAll()[0]
await XActions.tweet.reply(tweet, `
📌 Key takeaways:
• Point one
• Point two
• Point three

Thanks for the insights!
`)
```

#### `quote(tweetElement, text)` - Quote tweet
```js
// XActions.tweet.quote - Quote tweet with commentary
// Example 1: Quote tweet with commentary
const tweet = XActions.tweet.getAll()[0]
await XActions.tweet.quote(tweet, "This is exactly what I've been saying! 💯")

// Example 2: Quote tweet for content curation
const tweets = XActions.tweet.getAll()
const techTweet = tweets.find(t => t.textContent.toLowerCase().includes('javascript'))
if (techTweet) {
  await XActions.tweet.quote(techTweet, "📚 Must-read for JavaScript developers #WebDev")
}

// Example 3: Quote with thread context
const tweet = XActions.tweet.getAll()[0]
await XActions.tweet.quote(tweet, `
Adding some context to this thread 🧵

1/ This relates to what I posted last week about AI trends...
`)
```

#### `delete(tweetElement)` - Delete your tweet
```js
// XActions.tweet.delete - Delete your tweet
// Example 1: Delete your most recent tweet
const myTweets = XActions.tweet.getAll()
const myTweet = myTweets.find(t => t.querySelector('[data-testid="caret"]'))
if (myTweet) {
  await XActions.tweet.delete(myTweet)
  console.log('Tweet deleted!')
}

// Example 2: Bulk delete tweets containing specific word
const tweets = XActions.tweet.getAll()
for (const tweet of tweets) {
  if (tweet.textContent.toLowerCase().includes('typo')) {
    await XActions.tweet.delete(tweet)
    await new Promise(r => setTimeout(r, 2000))
  }
}

// Example 3: Delete old tweets from your profile
const tweets = XActions.tweet.getAll()
for (const tweet of tweets) {
  await XActions.tweet.delete(tweet)
  await new Promise(r => setTimeout(r, 3000)) // Rate limit protection
}
```

#### `pin(tweetElement)` - Pin tweet to profile
```js
// XActions.tweet.pin - Pin tweet to profile
// Example 1: Pin a specific tweet
const tweets = XActions.tweet.getAll()
await XActions.tweet.pin(tweets[0])

// Example 2: Find and pin your best performing tweet
const tweets = XActions.tweet.getAll()
const bestTweet = tweets.find(tweet => {
  const likes = tweet.querySelector('[data-testid="like"]')?.textContent
  return parseInt(likes) > 100 // Pin if over 100 likes
})
if (bestTweet) {
  await XActions.tweet.pin(bestTweet)
  console.log('Pinned high-engagement tweet!')
}

// Example 3: Pin your latest announcement
const tweets = XActions.tweet.getAll()
const announcement = tweets.find(t => 
  t.textContent.includes('🚀') || t.textContent.toLowerCase().includes('announcing')
)
if (announcement) await XActions.tweet.pin(announcement)
```

#### `getId(tweetElement)` - Get tweet ID from element
```js
// XActions.tweet.getId - Get tweet ID from element
// Example 1: Get ID of first visible tweet
const tweets = XActions.tweet.getAll()
const tweetId = XActions.tweet.getId(tweets[0])
console.log(`Tweet ID: ${tweetId}`)

// Example 2: Build array of all visible tweet IDs for tracking
const tweets = XActions.tweet.getAll()
const tweetIds = tweets.map(t => XActions.tweet.getId(t)).filter(id => id)
console.log(`Found ${tweetIds.length} tweet IDs:`, tweetIds)

// Example 3: Create shareable link from tweet
const tweet = XActions.tweet.getAll()[0]
const id = XActions.tweet.getId(tweet)
const shareUrl = `https://x.com/i/status/${id}`
console.log(`Share this: ${shareUrl}`)
```

#### `getAll()` - Get all visible tweets
```js
// XActions.tweet.getAll - Get all visible tweets
// Example 1: Count visible tweets
const tweets = XActions.tweet.getAll()
console.log(`${tweets.length} tweets visible on page`)

// Example 2: Filter tweets by content
const tweets = XActions.tweet.getAll()
const aiTweets = tweets.filter(t => 
  t.textContent.toLowerCase().includes('ai') ||
  t.textContent.toLowerCase().includes('artificial intelligence')
)
console.log(`Found ${aiTweets.length} AI-related tweets`)

// Example 3: Extract all tweet texts for analysis
const tweets = XActions.tweet.getAll()
const tweetTexts = tweets.map(t => 
  t.querySelector('[data-testid="tweetText"]')?.textContent || ''
)
console.log('Tweet contents:', tweetTexts)
```

#### `thread(tweets)` - Post a thread of tweets
```js
// XActions.tweet.thread - Post a thread of tweets
// Example 1: Post a simple thread
await XActions.tweet.thread([
  "🧵 Thread: 5 things I learned building my startup",
  "1/ Start with the problem, not the solution",
  "2/ Talk to users before writing code",
  "3/ Launch early, iterate often",
  "4/ Metrics matter, but so does intuition",
  "5/ Build in public - the community helps!",
  "That's it! Follow for more startup insights 🚀"
])

// Example 2: Educational thread with formatting
await XActions.tweet.thread([
  "📚 JavaScript Promises Explained (Thread)",
  "A Promise is like ordering food:\n\n• Pending: Order placed\n• Fulfilled: Food arrived! 🍕\n• Rejected: Out of stock 😞",
  "Here's the syntax:\n\nnew Promise((resolve, reject) => {\n  // async operation\n})",
  "Use .then() for success, .catch() for errors:\n\nfetch(url)\n  .then(data => use(data))\n  .catch(err => handle(err))",
  "Pro tip: Use async/await for cleaner code! ✨\n\nLike & retweet if this helped!"
])

// Example 3: Story thread
await XActions.tweet.thread([
  "Here's how I went from 0 to 10K followers in 6 months 👇",
  "Month 1: Posted consistently every day. Engagement was low but I kept going.",
  "Month 2-3: Started engaging with others for 30 min before posting. Game changer!",
  "Month 4: Went viral with a thread. Gained 2K followers in a week.",
  "Month 5-6: Collaborated with bigger accounts. Growth accelerated.",
  "Key lesson: Consistency + genuine engagement = growth 📈"
])
```

---

### 💜 XActions.engage — Engagement Actions

Functions for engaging with tweets (likes, retweets, bookmarks, etc.).

#### `like(tweetElement)` - Like a tweet
```js
// XActions.engage.like - Like a tweet
// Example 1: Like the first tweet on your timeline
const tweets = XActions.tweet.getAll()
await XActions.engage.like(tweets[0])

// Example 2: Like all tweets from a specific user
const tweets = XActions.tweet.getAll()
for (const tweet of tweets) {
  const author = tweet.querySelector('[data-testid="User-Name"]')?.textContent
  if (author?.includes('elonmusk')) {
    await XActions.engage.like(tweet)
    await new Promise(r => setTimeout(r, 1500)) // Rate limit
  }
}

// Example 3: Like tweets containing specific keywords
const tweets = XActions.tweet.getAll()
const keywords = ['javascript', 'typescript', 'react', 'nodejs']
for (const tweet of tweets) {
  const text = tweet.textContent.toLowerCase()
  if (keywords.some(kw => text.includes(kw))) {
    await XActions.engage.like(tweet)
    await new Promise(r => setTimeout(r, 2000))
  }
}
```

#### `unlike(tweetElement)` - Unlike a tweet
```js
// XActions.engage.unlike - Unlike a tweet
// Example 1: Unlike a tweet you accidentally liked
const tweets = XActions.tweet.getAll()
const likedTweet = tweets.find(t => t.querySelector('[data-testid="unlike"]'))
if (likedTweet) await XActions.engage.unlike(likedTweet)

// Example 2: Unlike all visible tweets (cleanup)
const tweets = XActions.tweet.getAll()
for (const tweet of tweets) {
  if (tweet.querySelector('[data-testid="unlike"]')) {
    await XActions.engage.unlike(tweet)
    await new Promise(r => setTimeout(r, 1000))
  }
}

// Example 3: Unlike tweets from blocked topics
const tweets = XActions.tweet.getAll()
const blockedWords = ['spam', 'scam', 'giveaway']
for (const tweet of tweets) {
  const isLiked = tweet.querySelector('[data-testid="unlike"]')
  const hasBlockedWord = blockedWords.some(w => tweet.textContent.toLowerCase().includes(w))
  if (isLiked && hasBlockedWord) {
    await XActions.engage.unlike(tweet)
  }
}
```

#### `retweet(tweetElement)` - Retweet
```js
// XActions.engage.retweet - Retweet
// Example 1: Retweet the first tweet
const tweets = XActions.tweet.getAll()
await XActions.engage.retweet(tweets[0])

// Example 2: Retweet high-engagement content
const tweets = XActions.tweet.getAll()
for (const tweet of tweets) {
  const likeCount = tweet.querySelector('[data-testid="like"]')?.textContent
  if (parseInt(likeCount) > 500) {
    await XActions.engage.retweet(tweet)
    await new Promise(r => setTimeout(r, 3000))
  }
}

// Example 3: Retweet content from your network
const trustedUsers = ['naval', 'paulg', 'sama']
const tweets = XActions.tweet.getAll()
for (const tweet of tweets) {
  const author = tweet.querySelector('[data-testid="User-Name"]')?.textContent?.toLowerCase()
  if (trustedUsers.some(u => author?.includes(u))) {
    await XActions.engage.retweet(tweet)
    console.log(`Retweeted from ${author}`)
  }
}
```

#### `unretweet(tweetElement)` - Undo retweet
```js
// XActions.engage.unretweet - Undo retweet
// Example 1: Undo retweet on first retweeted tweet
const tweets = XActions.tweet.getAll()
const retweeted = tweets.find(t => t.querySelector('[data-testid="unretweet"]'))
if (retweeted) await XActions.engage.unretweet(retweeted)

// Example 2: Undo all retweets on page
const tweets = XActions.tweet.getAll()
for (const tweet of tweets) {
  if (tweet.querySelector('[data-testid="unretweet"]')) {
    await XActions.engage.unretweet(tweet)
    await new Promise(r => setTimeout(r, 1500))
  }
}

// Example 3: Clean up old retweets (on your profile)
const tweets = XActions.tweet.getAll()
let count = 0
for (const tweet of tweets) {
  if (count >= 10) break // Limit to 10
  if (await XActions.engage.unretweet(tweet)) count++
  await new Promise(r => setTimeout(r, 2000))
}
console.log(`Removed ${count} retweets`)
```

#### `bookmark(tweetElement)` - Bookmark tweet
```js
// XActions.engage.bookmark - Bookmark tweet
// Example 1: Bookmark a valuable tweet
const tweets = XActions.tweet.getAll()
await XActions.engage.bookmark(tweets[0])

// Example 2: Bookmark all tweets with code snippets
const tweets = XActions.tweet.getAll()
for (const tweet of tweets) {
  const hasCode = tweet.textContent.includes('```') || 
                  tweet.textContent.includes('function') ||
                  tweet.textContent.includes('const ')
  if (hasCode) {
    await XActions.engage.bookmark(tweet)
    console.log('Bookmarked code tweet')
    await new Promise(r => setTimeout(r, 1500))
  }
}

// Example 3: Bookmark learning resources
const tweets = XActions.tweet.getAll()
const resourceKeywords = ['tutorial', 'guide', 'learn', 'course', 'free', 'resource']
for (const tweet of tweets) {
  if (resourceKeywords.some(kw => tweet.textContent.toLowerCase().includes(kw))) {
    await XActions.engage.bookmark(tweet)
  }
}
```

#### `unbookmark(tweetElement)` - Remove bookmark
```js
// XActions.engage.unbookmark - Remove bookmark
// Example 1: Remove bookmark from first bookmarked tweet
const tweets = XActions.tweet.getAll()
const bookmarked = tweets.find(t => t.querySelector('[data-testid="removeBookmark"]'))
if (bookmarked) await XActions.engage.unbookmark(bookmarked)

// Example 2: Clean up bookmarks page (navigate to /i/bookmarks first)
const tweets = XActions.tweet.getAll()
for (const tweet of tweets) {
  await XActions.engage.unbookmark(tweet)
  await new Promise(r => setTimeout(r, 1000))
}

// Example 3: Remove outdated bookmarks
const tweets = XActions.tweet.getAll()
for (const tweet of tweets) {
  if (tweet.textContent.includes('2022') || tweet.textContent.includes('2021')) {
    await XActions.engage.unbookmark(tweet)
  }
}
```

#### `addToList(tweetElement, listName)` - Add tweet author to list
```js
// XActions.engage.addToList - Add tweet author to list
// Example 1: Add author to your "Interesting People" list
const tweets = XActions.tweet.getAll()
await XActions.engage.addToList(tweets[0], "Interesting People")

// Example 2: Curate experts by topic
const tweets = XActions.tweet.getAll()
for (const tweet of tweets) {
  const text = tweet.textContent.toLowerCase()
  if (text.includes('machine learning') || text.includes('deep learning')) {
    await XActions.engage.addToList(tweet, "AI Experts")
    await new Promise(r => setTimeout(r, 2000))
  }
}

// Example 3: Build competitor list
const tweets = XActions.tweet.getAll()
const competitors = ['competitor1', 'competitor2', 'competitor3']
for (const tweet of tweets) {
  if (competitors.some(c => tweet.textContent.toLowerCase().includes(c))) {
    await XActions.engage.addToList(tweet, "Competitors")
  }
}
```

#### `report(tweetElement, reason)` - Report tweet
```js
// XActions.engage.report - Report tweet
// Example 1: Report a spam tweet
const tweets = XActions.tweet.getAll()
const spamTweet = tweets.find(t => t.textContent.includes('FREE CRYPTO'))
if (spamTweet) {
  await XActions.engage.report(spamTweet, 'spam')
  console.log('Reported spam tweet - complete the form manually')
}

// Example 2: Report tweets with specific content
const tweets = XActions.tweet.getAll()
for (const tweet of tweets) {
  if (tweet.textContent.toLowerCase().includes('scam')) {
    await XActions.engage.report(tweet, 'spam')
    await new Promise(r => setTimeout(r, 5000))
  }
}

// Example 3: Batch report suspicious tweets
const tweets = XActions.tweet.getAll()
const suspiciousTweet = tweets.find(t => 
  t.textContent.includes('DM me for investment') ||
  t.textContent.includes('guaranteed returns')
)
if (suspiciousTweet) await XActions.engage.report(suspiciousTweet, 'scam')
```

#### `copyLink(tweetElement)` - Copy tweet link
```js
// XActions.engage.copyLink - Copy tweet link
// Example 1: Copy link of first tweet
const tweets = XActions.tweet.getAll()
await XActions.engage.copyLink(tweets[0])
console.log('Link copied to clipboard!')

// Example 2: Copy links of all valuable tweets for sharing
const tweets = XActions.tweet.getAll()
const links = []
for (const tweet of tweets) {
  const id = XActions.tweet.getId(tweet)
  if (id) links.push(`https://x.com/i/status/${id}`)
}
console.log('Tweet links:', links.join('\n'))

// Example 3: Copy and log for content curation
const tweet = XActions.tweet.getAll()[0]
await XActions.engage.copyLink(tweet)
const id = XActions.tweet.getId(tweet)
console.log(`Copied: https://x.com/i/status/${id}`)
```

#### `shareViaDM(tweetElement, username)` - Share via DM
```js
// XActions.engage.shareViaDM - Share via DM
// Example 1: Share tweet with a friend
const tweets = XActions.tweet.getAll()
await XActions.engage.shareViaDM(tweets[0], "friendusername")

// Example 2: Share interesting content with your team
const tweet = XActions.tweet.getAll()[0]
const teamMembers = ['teammate1', 'teammate2', 'teammate3']
for (const member of teamMembers) {
  await XActions.engage.shareViaDM(tweet, member)
  await new Promise(r => setTimeout(r, 2000))
}

// Example 3: Share breaking news
const tweets = XActions.tweet.getAll()
const importantTweet = tweets.find(t => t.textContent.includes('breaking news'))
if (importantTweet) {
  await XActions.engage.shareViaDM(importantTweet, "newseditor")
}
```

#### `embed(tweetElement)` - Get embed code
```js
// XActions.engage.embed - Get embed code
// Example 1: Get embed code for first tweet
const tweets = XActions.tweet.getAll()
await XActions.engage.embed(tweets[0])
console.log('Embed dialog opened - copy the code')

// Example 2: Open embed for a blog-worthy tweet
const tweets = XActions.tweet.getAll()
const quoteTweet = tweets.find(t => 
  t.textContent.includes('great insight')
)
if (quoteTweet) await XActions.engage.embed(quoteTweet)

// Example 3: Embed for documentation
const tweet = XActions.tweet.getAll()[0]
await XActions.engage.embed(tweet)
// Then copy the embed HTML for your website
```

#### `viewAnalytics(tweetElement)` - View tweet analytics
```js
// XActions.engage.viewAnalytics - View tweet analytics
// Example 1: View analytics of your recent tweet
const tweets = XActions.tweet.getAll()
const myTweet = tweets.find(t => t.querySelector('[data-testid="caret"]'))
if (myTweet) await XActions.engage.viewAnalytics(myTweet)

// Example 2: Check performance of pinned tweet
const tweets = XActions.tweet.getAll()
await XActions.engage.viewAnalytics(tweets[0])

// Example 3: Analyze your best content
const tweets = XActions.tweet.getAll()
for (const tweet of tweets.slice(0, 5)) {
  await XActions.engage.viewAnalytics(tweet)
  await new Promise(r => setTimeout(r, 5000)) // Time to view
}
```

#### `requestNote(tweetElement)` - Request community note
```js
// XActions.engage.requestNote - Request community note
// Example 1: Request note on misleading tweet
const tweets = XActions.tweet.getAll()
const misleadingTweet = tweets.find(t => 
  t.textContent.includes('fake') || t.textContent.includes('false claim')
)
if (misleadingTweet) await XActions.engage.requestNote(misleadingTweet)

// Example 2: Request fact-check on viral tweet
const tweets = XActions.tweet.getAll()
for (const tweet of tweets) {
  const likes = parseInt(tweet.querySelector('[data-testid="like"]')?.textContent || '0')
  if (likes > 10000) {
    await XActions.engage.requestNote(tweet)
    console.log('Requested community note for viral tweet')
  }
}

// Example 3: Report misinformation
const tweet = XActions.tweet.getAll()[0]
await XActions.engage.requestNote(tweet)
console.log('Community note request submitted')
```

#### `highlight(tweetElement)` - Highlight tweet (Premium)
```js
// XActions.engage.highlight - Highlight tweet (X Premium)
// Example 1: Highlight your best tweet
const tweets = XActions.tweet.getAll()
await XActions.engage.highlight(tweets[0])

// Example 2: Highlight an announcement tweet
const tweets = XActions.tweet.getAll()
const announcement = tweets.find(t => 
  t.textContent.includes('🚀') || t.textContent.includes('Announcing')
)
if (announcement) await XActions.engage.highlight(announcement)

// Example 3: Highlight high-engagement content
const tweets = XActions.tweet.getAll()
const bestTweet = tweets.find(t => {
  const likes = parseInt(t.querySelector('[data-testid="like"]')?.textContent || '0')
  return likes > 1000
})
if (bestTweet) {
  await XActions.engage.highlight(bestTweet)
  console.log('High-engagement tweet highlighted!')
}
```

---

### 👤 XActions.user — User Interactions (Part 1)

Functions for interacting with user accounts.

#### `follow(target)` - Follow user (username or element)
```js
// XActions.user.follow - Follow user
// Example 1: Follow a user by username
await XActions.user.follow("elonmusk")

// Example 2: Follow from a user card element
const userCells = document.querySelectorAll('[data-testid="UserCell"]')
await XActions.user.follow(userCells[0])

// Example 3: Follow multiple users from a list
const usersToFollow = ['naval', 'paulg', 'sama', 'balaboris']
for (const username of usersToFollow) {
  await XActions.user.follow(username)
  await new Promise(r => setTimeout(r, 3000)) // Rate limit
  console.log(`Followed @${username}`)
}
```

#### `unfollow(target)` - Unfollow user
```js
// XActions.user.unfollow - Unfollow user
// Example 1: Unfollow a specific user
await XActions.user.unfollow("oldaccount")

// Example 2: Unfollow from Following page elements
const userCells = document.querySelectorAll('[data-testid="UserCell"]')
for (const cell of userCells.slice(0, 5)) {
  await XActions.user.unfollow(cell)
  await new Promise(r => setTimeout(r, 2500))
}

// Example 3: Cleanup inactive accounts
const inactiveUsers = ['user1', 'user2', 'user3']
for (const user of inactiveUsers) {
  await XActions.user.unfollow(user)
  console.log(`Unfollowed @${user}`)
  await new Promise(r => setTimeout(r, 3000))
}
```

#### `block(username)` - Block user
```js
// XActions.user.block - Block user
// Example 1: Block a spam account
await XActions.user.block("spammer123")
console.log('User blocked!')

// Example 2: Block multiple problematic accounts
const blocklist = ['troll1', 'spammer2', 'bot_account']
for (const user of blocklist) {
  await XActions.user.block(user)
  await new Promise(r => setTimeout(r, 2000))
}
console.log('Blocklist processed')

// Example 3: Block from saved list
const accountsToBlock = localStorage.getItem('blocklist')?.split(',') || []
for (const account of accountsToBlock) {
  await XActions.user.block(account.trim())
  await new Promise(r => setTimeout(r, 3000))
}
```

#### `unblock(username)` - Unblock user
```js
// XActions.user.unblock - Unblock user
// Example 1: Unblock a specific user
await XActions.user.unblock("formerlyblocked")

// Example 2: Unblock users after review
const reviewList = ['user1', 'user2']
for (const user of reviewList) {
  await XActions.user.unblock(user)
  console.log(`Unblocked @${user}`)
  await new Promise(r => setTimeout(r, 2000))
}

// Example 3: Second chance - unblock all
const blocked = ['account1', 'account2', 'account3']
for (const account of blocked) {
  await XActions.user.unblock(account)
  await new Promise(r => setTimeout(r, 2500))
}
console.log('All accounts unblocked')
```

#### `mute(username)` - Mute user
```js
// XActions.user.mute - Mute user
// Example 1: Mute a noisy account
await XActions.user.mute("loudaccount")
console.log('Account muted!')

// Example 2: Mute competitors
const competitors = ['competitor1', 'competitor2']
for (const comp of competitors) {
  await XActions.user.mute(comp)
  await new Promise(r => setTimeout(r, 2000))
}

// Example 3: Mute during event
const eventAccounts = ['conference2024', 'eventspam']
for (const account of eventAccounts) {
  await XActions.user.mute(account)
  console.log(`Muted @${account} for quieter timeline`)
}
```

#### `unmute(username)` - Unmute user
```js
// XActions.user.unmute - Unmute user
// Example 1: Unmute a specific user
await XActions.user.unmute("nowrelevant")

// Example 2: Unmute after event ends
const eventAccounts = ['conference2024', 'eventspam']
for (const account of eventAccounts) {
  await XActions.user.unmute(account)
  console.log(`Unmuted @${account}`)
  await new Promise(r => setTimeout(r, 2000))
}

// Example 3: Unmute from saved list
const mutedList = JSON.parse(localStorage.getItem('muted_accounts') || '[]')
for (const username of mutedList) {
  await XActions.user.unmute(username)
}
localStorage.removeItem('muted_accounts')
```

#### `report(username)` - Report user
```js
// XActions.user.report - Report user
// Example 1: Report a spam/bot account
await XActions.user.report("suspiciousbot")
console.log('Report dialog opened - complete manually')

// Example 2: Report impersonator
await XActions.user.report("fake_official_account")

// Example 3: Report multiple problematic accounts
const reportList = ['scammer1', 'impersonator2']
for (const user of reportList) {
  await XActions.user.report(user)
  console.log(`Opened report for @${user}`)
  await new Promise(r => setTimeout(r, 10000)) // Time to complete report
}
```

#### `addToList(username, listName)` - Add user to list
```js
// XActions.user.addToList - Add user to list
// Example 1: Add to your curated list
await XActions.user.addToList("techexpert", "Tech Leaders")

// Example 2: Organize follows into lists
const categories = {
  "Tech Founders": ['naval', 'paulg', 'sama'],
  "Developers": ['dan_abramov', 'kentcdodds', 'ryanflorence']
}
for (const [listName, users] of Object.entries(categories)) {
  for (const user of users) {
    await XActions.user.addToList(user, listName)
    await new Promise(r => setTimeout(r, 2000))
  }
}

// Example 3: Build a private research list
const researchTargets = ['competitor1', 'competitor2', 'industryanalyst']
for (const target of researchTargets) {
  await XActions.user.addToList(target, "Research")
  console.log(`Added @${target} to Research list`)
}
```

#### `notifyOn(username)` - Turn on notifications
```js
// XActions.user.notifyOn - Turn on notifications
// Example 1: Get notifications for a key account
await XActions.user.notifyOn("breakingnews")
console.log('Notifications enabled!')

// Example 2: Enable for VIP follows
const vips = ['ceo_account', 'important_client', 'team_lead']
for (const vip of vips) {
  await XActions.user.notifyOn(vip)
  await new Promise(r => setTimeout(r, 2000))
}

// Example 3: Track competitor announcements
const competitors = ['rival1', 'rival2']
for (const comp of competitors) {
  await XActions.user.notifyOn(comp)
  console.log(`Now tracking @${comp}'s posts`)
}
```

#### `notifyOff(username)` - Turn off notifications
```js
// XActions.user.notifyOff - Turn off notifications
// Example 1: Stop notifications from noisy account
await XActions.user.notifyOff("toofrequent")

// Example 2: Clean up notification overload
const noisyAccounts = ['account1', 'account2', 'account3']
for (const account of noisyAccounts) {
  await XActions.user.notifyOff(account)
  await new Promise(r => setTimeout(r, 2000))
}
console.log('Notification cleanup complete')

// Example 3: Turn off after event/launch
await XActions.user.notifyOff("productlaunch2024")
console.log('Post-launch notifications disabled')
```

#### `viewTopics(username)` - View user's topics
```js
// XActions.user.viewTopics - View user's topics
// Example 1: See what topics a user follows
await XActions.user.viewTopics("elonmusk")

// Example 2: Research competitor's interests
await XActions.user.viewTopics("competitor")
console.log('Check their topics for market insights')

// Example 3: Find topic overlap
const interestingUsers = ['user1', 'user2']
for (const user of interestingUsers) {
  await XActions.user.viewTopics(user)
  await new Promise(r => setTimeout(r, 5000)) // Time to review
}
```

#### `viewLists(username)` - View user's lists
```js
// XActions.user.viewLists - View user's lists
// Example 1: Discover curated lists
await XActions.user.viewLists("curator")
console.log('Browse their public lists')

// Example 2: Find industry expert lists
await XActions.user.viewLists("techinfluencer")

// Example 3: Research for list ideas
const curators = ['listmaker1', 'listmaker2']
for (const curator of curators) {
  await XActions.user.viewLists(curator)
  await new Promise(r => setTimeout(r, 5000))
}
```

#### `viewFollowers(username)` - View followers
```js
// XActions.user.viewFollowers - View followers
// Example 1: Browse a user's followers
await XActions.user.viewFollowers("popularaccount")

// Example 2: Research competitor's audience
await XActions.user.viewFollowers("competitor")
console.log('Analyze their follower demographics')

// Example 3: Find potential follows
await XActions.user.viewFollowers("industryexpert")
// Now scroll and follow interesting accounts
```

#### `viewFollowing(username)` - View following
```js
// XActions.user.viewFollowing - View following
// Example 1: See who a user follows
await XActions.user.viewFollowing("tastemaker")

// Example 2: Discover through curators
await XActions.user.viewFollowing("techcurator")
console.log('Great source for new follows!')

// Example 3: Competitive analysis
await XActions.user.viewFollowing("competitor")
console.log('See who your competitors watch')
```

#### `viewLikes(username)` - View user's likes
```js
// XActions.user.viewLikes - View user's likes
// Example 1: See what content a user likes
await XActions.user.viewLikes("influencer")

// Example 2: Research interests for outreach
await XActions.user.viewLikes("potentialclient")
console.log('Understand their interests')

// Example 3: Content inspiration
await XActions.user.viewLikes("successfulcreator")
console.log('See what resonates with them')
```

---

### 🧭 XActions.nav — Navigation (Part 2)

Navigate anywhere on X with simple function calls.

#### `profile(username)` - Navigate to user profile
```js
// XActions.nav.profile - Navigate to any user's profile
// Example 1: View a specific user's profile
await XActions.nav.profile("elonmusk")

// Example 2: View your own profile
await XActions.nav.profile()  // Defaults to current user

// Example 3: Navigate through a list of profiles
const usersToCheck = ["naval", "paulg", "sama"]
for (const user of usersToCheck) {
  await XActions.nav.profile(user)
  console.log(`Viewing @${user}'s profile`)
  await new Promise(r => setTimeout(r, 3000))
}
```

#### `settings()` - Navigate to settings
```js
// XActions.nav.settings - Go to account settings
// Example 1: Quick access to settings
await XActions.nav.settings()

// Example 2: Navigate to settings before making changes
await XActions.nav.settings()
console.log("Settings page loaded - ready to configure")
```

#### `notifyAll()` - All notifications tab
```js
// XActions.nav.notifyAll - View all notifications
// Example 1: Check all notifications
await XActions.nav.notifyAll()

// Example 2: Morning notification check routine
console.log("Checking all notifications...")
await XActions.nav.notifyAll()
```

#### `notifyVerified()` - Verified notifications only
```js
// XActions.nav.notifyVerified - Filter to verified accounts only
// Example 1: See only verified account interactions
await XActions.nav.notifyVerified()
console.log("Showing verified accounts only")

// Example 2: Focus on important notifications
await XActions.nav.notifyVerified()
// Verified users often have higher-quality interactions
```

#### `notifyMentions()` - Mentions tab
```js
// XActions.nav.notifyMentions - View mentions only
// Example 1: Check who's talking about you
await XActions.nav.notifyMentions()

// Example 2: Monitor mentions for engagement
await XActions.nav.notifyMentions()
console.log("Checking mentions for replies to respond to...")

// Example 3: Daily mentions audit
await XActions.nav.notifyMentions()
// Great for customer service monitoring
```

#### `forYou()` - For You timeline
```js
// XActions.nav.forYou - Switch to algorithmic timeline
// Example 1: See what's trending for you
await XActions.nav.forYou()

// Example 2: Compare timelines
await XActions.nav.forYou()
console.log("Viewing For You algorithmic feed")
await new Promise(r => setTimeout(r, 5000))
await XActions.nav.following()
console.log("Now viewing Following chronological feed")
```

#### `following()` - Following timeline
```js
// XActions.nav.following - Switch to chronological following timeline
// Example 1: See latest from people you follow
await XActions.nav.following()

// Example 2: Prefer chronological for catching up
await XActions.nav.following()
console.log("Showing posts from accounts you follow, newest first")
```

#### `trending()` - Trending page
```js
// XActions.nav.trending - See what's trending
// Example 1: Check trending topics
await XActions.nav.trending()

// Example 2: Research before posting
await XActions.nav.trending()
console.log("Checking trending topics for content ideas...")

// Example 3: Monitor trending for news
await XActions.nav.trending()
// Great for staying updated on current events
```

#### `forYouExplore()` - For You in Explore
```js
// XActions.nav.forYouExplore - Personalized explore content
// Example 1: Discover personalized content
await XActions.nav.forYouExplore()

// Example 2: Content discovery routine
await XActions.nav.forYouExplore()
console.log("Exploring personalized recommendations...")
```

#### `news()` - News tab
```js
// XActions.nav.news - Navigate to news section
// Example 1: Check latest news
await XActions.nav.news()

// Example 2: Morning news routine
await XActions.nav.news()
console.log("Loading news section...")
```

#### `sports()` - Sports tab
```js
// XActions.nav.sports - Navigate to sports section
// Example 1: Check sports updates
await XActions.nav.sports()

// Example 2: Game day monitoring
await XActions.nav.sports()
console.log("Checking sports updates...")
```

#### `entertainment()` - Entertainment tab
```js
// XActions.nav.entertainment - Navigate to entertainment section
// Example 1: Browse entertainment news
await XActions.nav.entertainment()

// Example 2: Pop culture updates
await XActions.nav.entertainment()
console.log("Loading entertainment section...")
```

#### `spaces()` - Spaces page
```js
// XActions.nav.spaces - Navigate to Twitter Spaces
// Example 1: Browse live audio rooms
await XActions.nav.spaces()

// Example 2: Find spaces to join
await XActions.nav.spaces()
console.log("Browsing live Spaces...")
```

#### `scrollToTop()` - Scroll to top
```js
// XActions.nav.scrollToTop - Scroll page to top
// Example 1: Return to top after browsing
XActions.nav.scrollToTop()

// Example 2: Quick refresh view
XActions.nav.scrollToTop()
console.log("Scrolled to top of page")

// Example 3: Use after loading content
await XActions.utils.loadMore(10)
XActions.nav.scrollToTop()  // Go back to start
```

#### `scrollToBottom()` - Scroll to bottom
```js
// XActions.nav.scrollToBottom - Scroll page to bottom
// Example 1: Load more content
XActions.nav.scrollToBottom()

// Example 2: Quick jump to bottom
XActions.nav.scrollToBottom()
console.log("Scrolled to bottom")
```

#### `scrollBy(pixels)` - Scroll by specific amount
```js
// XActions.nav.scrollBy - Scroll by pixel amount
// Example 1: Scroll down gradually
XActions.nav.scrollBy(500)

// Example 2: Scroll up (negative value)
XActions.nav.scrollBy(-300)

// Example 3: Simulate human scrolling pattern
for (let i = 0; i < 5; i++) {
  XActions.nav.scrollBy(Math.random() * 400 + 200)
  await new Promise(r => setTimeout(r, 1000))
}
```

#### `back()` - Browser back
```js
// XActions.nav.back - Go to previous page
// Example 1: Simple back navigation
XActions.nav.back()

// Example 2: Navigate and return
await XActions.nav.profile("elonmusk")
// ... view profile ...
XActions.nav.back()  // Return to previous page
```

#### `forward()` - Browser forward
```js
// XActions.nav.forward - Go forward in browser history
// Example 1: Undo a back navigation
XActions.nav.forward()

// Example 2: Navigate forward after going back
XActions.nav.back()
// Changed your mind...
XActions.nav.forward()
```

#### `refresh()` - Refresh page
```js
// XActions.nav.refresh - Reload the current page
// Example 1: Refresh to see new content
XActions.nav.refresh()

// Example 2: Reset page state
console.log("Refreshing page...")
XActions.nav.refresh()
```

---

### 📋 XActions.lists — List Management

Create and manage X Lists for organizing accounts.

#### `create(name, description, isPrivate)` - Create a new list
```js
// XActions.lists.create - Create a new X list
// Example 1: Create a private competitors list
await XActions.lists.create("Competitors", "Track competitor accounts", true)

// Example 2: Create a public tech news list
await XActions.lists.create("Tech News", "Best tech journalists and outlets", false)

// Example 3: Create a team members list
await XActions.lists.create("Team", "Our company team members", true)
console.log("Team list created - add members next!")

// Example 4: Batch create multiple lists
const listsToCreate = [
  { name: "VCs", desc: "Venture capitalists to follow", private: true },
  { name: "Founders", desc: "Startup founders", private: false },
  { name: "Engineers", desc: "Top engineers in tech", private: false }
]
for (const list of listsToCreate) {
  await XActions.lists.create(list.name, list.desc, list.private)
  console.log(`Created list: ${list.name}`)
}
```

#### `delete(listId)` - Delete a list
```js
// XActions.lists.delete - Remove a list permanently
// Example 1: Delete a list by ID
await XActions.lists.delete("1234567890")

// Example 2: Clean up unused list
const listId = "1234567890"
console.log(`Deleting list ${listId}...`)
await XActions.lists.delete(listId)
console.log("List deleted successfully")

// Example 3: Delete with confirmation
if (confirm("Are you sure you want to delete this list?")) {
  await XActions.lists.delete("1234567890")
}
```

#### `edit(listId, newName, newDescription)` - Edit list details
```js
// XActions.lists.edit - Update list name and description
// Example 1: Rename a list
await XActions.lists.edit("1234567890", "Tech Influencers", null)

// Example 2: Update description only
await XActions.lists.edit("1234567890", null, "Updated: Top tech voices in 2024")

// Example 3: Full list update
await XActions.lists.edit(
  "1234567890",
  "AI & ML Experts",
  "Leading researchers and practitioners in artificial intelligence"
)
console.log("List updated!")
```

#### `follow(listId)` - Follow a list
```js
// XActions.lists.follow - Subscribe to a public list
// Example 1: Follow a curated list
await XActions.lists.follow("1234567890")

// Example 2: Follow multiple lists
const listsToFollow = ["1234567890", "0987654321", "1122334455"]
for (const listId of listsToFollow) {
  await XActions.lists.follow(listId)
  console.log(`Now following list: ${listId}`)
}

// Example 3: Follow and confirm
await XActions.lists.follow("1234567890")
console.log("Successfully followed list!")
```

#### `unfollow(listId)` - Unfollow a list
```js
// XActions.lists.unfollow - Unsubscribe from a list
// Example 1: Unfollow a list
await XActions.lists.unfollow("1234567890")

// Example 2: Clean up followed lists
await XActions.lists.unfollow("1234567890")
console.log("Unfollowed list - will no longer see in timeline")
```

#### `pin(listId)` - Pin/unpin list
```js
// XActions.lists.pin - Toggle pin status for quick access
// Example 1: Pin your most-used list
await XActions.lists.pin("1234567890")
console.log("List pinned for quick access!")

// Example 2: Organize pinned lists
const priorityLists = ["1234567890", "0987654321"]
for (const listId of priorityLists) {
  await XActions.lists.pin(listId)
}
console.log("Priority lists pinned!")

// Example 3: Toggle pin (run again to unpin)
await XActions.lists.pin("1234567890")
// Run again to unpin:
// await XActions.lists.pin("1234567890")
```

#### `getAll()` - Get all your lists
```js
// XActions.lists.getAll - Retrieve all lists you own or follow
// Example 1: View all lists
const myLists = await XActions.lists.getAll()
console.log(`You have ${myLists.length} lists`)

// Example 2: List all list names
const myLists = await XActions.lists.getAll()
myLists.forEach((list, i) => {
  console.log(`${i + 1}. ${list.text}`)
})

// Example 3: Audit your lists
const myLists = await XActions.lists.getAll()
console.log(`Total lists: ${myLists.length}`)
console.log("Consider archiving unused lists!")
```

#### `viewMembers(listId)` - View list members
```js
// XActions.lists.viewMembers - See all members of a list
// Example 1: View members of a list
await XActions.lists.viewMembers("1234567890")

// Example 2: Audit list membership
await XActions.lists.viewMembers("1234567890")
console.log("Review members and remove inactive accounts")

// Example 3: Navigate to members for management
await XActions.lists.viewMembers("1234567890")
// Now you can manually add/remove members from the UI
```

#### `viewFollowers(listId)` - View list followers
```js
// XActions.lists.viewFollowers - See who follows your list
// Example 1: Check list popularity
await XActions.lists.viewFollowers("1234567890")

// Example 2: Analyze list audience
await XActions.lists.viewFollowers("1234567890")
console.log("See who's interested in your curated list")

// Example 3: Growth tracking
await XActions.lists.viewFollowers("1234567890")
// Great for seeing how many people value your curation
```

---

### ⚙️ XActions.settings — Account Settings

Quick access to all X settings pages.

#### `account()` - Account settings
```js
// XActions.settings.account - Navigate to account settings
// Example 1: View account settings
await XActions.settings.account()

// Example 2: Check account status
await XActions.settings.account()
console.log("Account settings loaded - check username, email, etc.")

// Example 3: Pre-flight before changes
await XActions.settings.account()
// Review current settings before making updates
```

#### `security()` - Security settings
```js
// XActions.settings.security - Navigate to security settings
// Example 1: Review security settings
await XActions.settings.security()

// Example 2: Security audit
await XActions.settings.security()
console.log("Review: 2FA status, connected apps, active sessions")

// Example 3: After suspicious activity
await XActions.settings.security()
// Check for unauthorized access and update password
```

#### `privacy()` - Privacy settings
```js
// XActions.settings.privacy - Navigate to privacy settings
// Example 1: Review privacy settings
await XActions.settings.privacy()

// Example 2: Privacy audit
await XActions.settings.privacy()
console.log("Review: discoverability, data sharing, ad preferences")

// Example 3: Lockdown privacy
await XActions.settings.privacy()
// Review who can see your posts, find you by email/phone, etc.
```

#### `notifications()` - Notification settings
```js
// XActions.settings.notifications - Navigate to notification settings
// Example 1: Configure notifications
await XActions.settings.notifications()

// Example 2: Reduce notification noise
await XActions.settings.notifications()
console.log("Customize which notifications you receive")

// Example 3: Notification audit
await XActions.settings.notifications()
// Turn off notifications you don't need
```

#### `accessibility()` - Accessibility settings
```js
// XActions.settings.accessibility - Navigate to accessibility settings
// Example 1: View accessibility options
await XActions.settings.accessibility()

// Example 2: Configure display preferences
await XActions.settings.accessibility()
console.log("Adjust: font size, color contrast, motion settings")

// Example 3: Enable accessibility features
await XActions.settings.accessibility()
// Great for: autoplay settings, image descriptions, reduced motion
```

#### `monetization()` - Monetization settings
```js
// XActions.settings.monetization - Navigate to monetization settings
// Example 1: Check monetization status
await XActions.settings.monetization()

// Example 2: Creator earnings review
await XActions.settings.monetization()
console.log("Review: ad revenue, tips, subscriptions")

// Example 3: Set up monetization
await XActions.settings.monetization()
// Enable features to earn from your content
```

#### `creatorSubs()` - Creator subscriptions
```js
// XActions.settings.creatorSubs - Navigate to creator subscriptions
// Example 1: Manage subscriptions
await XActions.settings.creatorSubs()

// Example 2: Review active subscriptions
await XActions.settings.creatorSubs()
console.log("See creators you're subscribed to")

// Example 3: Subscription audit
await XActions.settings.creatorSubs()
// Review and cancel unused subscriptions
```

#### `premium()` - Premium settings
```js
// XActions.settings.premium - Navigate to Premium/X Premium settings
// Example 1: Check Premium status
await XActions.settings.premium()

// Example 2: View Premium features
await XActions.settings.premium()
console.log("Review your Premium subscription and features")

// Example 3: Upgrade or manage Premium
await XActions.settings.premium()
// Upgrade tier or manage billing
```

#### `mutedAccounts()` - View muted accounts
```js
// XActions.settings.mutedAccounts - See all muted accounts
// Example 1: Review muted accounts
await XActions.settings.mutedAccounts()

// Example 2: Mute list audit
await XActions.settings.mutedAccounts()
console.log("Review accounts you've muted - unmute if needed")

// Example 3: Clean up mute list
await XActions.settings.mutedAccounts()
// Remove mutes for accounts you want to see again
```

#### `mutedWords()` - View muted words
```js
// XActions.settings.mutedWords - See all muted words/phrases
// Example 1: Review muted keywords
await XActions.settings.mutedWords()

// Example 2: Keyword filter audit
await XActions.settings.mutedWords()
console.log("Review muted words - add or remove as needed")

// Example 3: Content filter management
await XActions.settings.mutedWords()
// Great for managing what content you don't want to see
```

---

<p align="center">
  <a href="https://github.com/nirholas/XActions">⭐ Back to Main README</a>
</p>
