# 📖 XActions Complete Function Reference

Every function with real, working examples.

---

## XActions.tweet - Posting & Managing Tweets

### `post(text, options)` - Post a new tweet
```js
// Simple tweet
await XActions.tweet.post("Hello world! 🌍")

// Daily motivation poster
const quotes = ["Stay focused! 💪", "Keep building! 🚀", "Never give up! 🔥"]
await XActions.tweet.post(quotes[Math.floor(Math.random() * quotes.length)])

// Announcement with emoji
await XActions.tweet.post("🚀 Just launched our new feature! Check it out at example.com")
```

### `reply(tweetElement, text)` - Reply to a tweet
```js
// Reply to first visible tweet
const tweets = XActions.tweet.getAll()
await XActions.tweet.reply(tweets[0], "Great insight! Thanks for sharing 🙏")

// Auto-reply to tweets with keywords
const tweets = XActions.tweet.getAll()
for (const tweet of tweets) {
  const text = tweet.querySelector('[data-testid="tweetText"]')?.textContent || ""
  if (text.toLowerCase().includes("help")) {
    await XActions.tweet.reply(tweet, "Happy to help! DM me for more details.")
    break
  }
}
```

### `quote(tweetElement, text)` - Quote tweet
```js
// Quote with commentary
const tweets = XActions.tweet.getAll()
await XActions.tweet.quote(tweets[0], "This is exactly what I've been saying! 👆")

// Quote to amplify
const tweet = XActions.tweet.getAll()[0]
await XActions.tweet.quote(tweet, "Everyone needs to see this 📢")
```

### `delete(tweetElement)` - Delete your tweet
```js
// Delete first tweet (must be yours)
const tweets = XActions.tweet.getAll()
await XActions.tweet.delete(tweets[0])

// Bulk delete (use carefully!)
async function deleteMyTweets(count = 5) {
  for (let i = 0; i < count; i++) {
    const tweets = XActions.tweet.getAll()
    if (tweets.length === 0) break
    await XActions.tweet.delete(tweets[0])
    await new Promise(r => setTimeout(r, 2000))
  }
}
```

### `pin(tweetElement)` - Pin tweet to profile
```js
// Pin your best tweet
const tweets = XActions.tweet.getAll()
await XActions.tweet.pin(tweets[0])
```

### `getId(tweetElement)` - Get tweet ID
```js
// Get ID of first tweet
const tweets = XActions.tweet.getAll()
const id = XActions.tweet.getId(tweets[0])
console.log("Tweet URL: https://x.com/i/status/" + id)

// Collect all tweet IDs on page
const ids = XActions.tweet.getAll().map(t => XActions.tweet.getId(t))
console.log("Found IDs:", ids)
```

### `getAll()` - Get all visible tweets
```js
// Count tweets
const tweets = XActions.tweet.getAll()
console.log(`${tweets.length} tweets on page`)

// Find tweets with keyword
const aiTweets = XActions.tweet.getAll().filter(t => {
  const text = t.querySelector('[data-testid="tweetText"]')?.textContent || ""
  return text.toLowerCase().includes("ai")
})
console.log(`Found ${aiTweets.length} AI tweets`)
```

### `thread(tweets)` - Post a thread
```js
// Educational thread
await XActions.tweet.thread([
  "🧵 5 JavaScript tips you need to know:",
  "1/ Use const by default, let when needed",
  "2/ Arrow functions inherit 'this' from parent",
  "3/ Template literals are cleaner than concatenation",
  "4/ async/await beats .then() chains",
  "5/ Destructuring saves lines of code",
  "Follow for more tips! 👋"
])
```

---

## XActions.engage - Engagement Actions

### `like(tweetElement)` - Like a tweet
```js
// Like first tweet
const tweets = XActions.tweet.getAll()
await XActions.engage.like(tweets[0])

// Like first 10 tweets
for (const tweet of XActions.tweet.getAll().slice(0, 10)) {
  await XActions.engage.like(tweet)
  await new Promise(r => setTimeout(r, 500))
}

// Like tweets with keyword
async function likeByKeyword(keyword, max = 5) {
  let count = 0
  for (const tweet of XActions.tweet.getAll()) {
    if (count >= max) break
    const text = tweet.querySelector('[data-testid="tweetText"]')?.textContent || ""
    if (text.toLowerCase().includes(keyword)) {
      await XActions.engage.like(tweet)
      count++
    }
  }
  console.log(`Liked ${count} tweets with "${keyword}"`)
}
await likeByKeyword("web3", 5)
```

### `unlike(tweetElement)` - Unlike a tweet
```js
const tweets = XActions.tweet.getAll()
await XActions.engage.unlike(tweets[0])
```

### `retweet(tweetElement)` - Retweet
```js
// Retweet first tweet
const tweets = XActions.tweet.getAll()
await XActions.engage.retweet(tweets[0])

// Like + Retweet combo
async function boost(tweet) {
  await XActions.engage.like(tweet)
  await XActions.engage.retweet(tweet)
}
await boost(XActions.tweet.getAll()[0])
```

### `unretweet(tweetElement)` - Undo retweet
```js
const tweets = XActions.tweet.getAll()
await XActions.engage.unretweet(tweets[0])
```

### `bookmark(tweetElement)` - Bookmark tweet
```js
// Bookmark first tweet
await XActions.engage.bookmark(XActions.tweet.getAll()[0])

// Bookmark tweets with links
for (const tweet of XActions.tweet.getAll()) {
  if (tweet.querySelector('a[href*="t.co"]')) {
    await XActions.engage.bookmark(tweet)
  }
}
```

### `unbookmark(tweetElement)` - Remove bookmark
```js
await XActions.engage.unbookmark(XActions.tweet.getAll()[0])
```

### `addToList(tweetElement, listName)` - Add author to list
```js
await XActions.engage.addToList(XActions.tweet.getAll()[0], "Interesting People")
```

### `report(tweetElement)` - Report tweet
```js
await XActions.engage.report(XActions.tweet.getAll()[0])
// Dialog opens - select reason manually
```

### `copyLink(tweetElement)` - Copy tweet link
```js
await XActions.engage.copyLink(XActions.tweet.getAll()[0])
console.log("Link copied to clipboard!")
```

### `shareViaDM(tweetElement, username)` - Share via DM
```js
await XActions.engage.shareViaDM(XActions.tweet.getAll()[0], "friendname")
```

### `embed(tweetElement)` - Get embed code
```js
await XActions.engage.embed(XActions.tweet.getAll()[0])
// Copy embed code from dialog
```

### `viewAnalytics(tweetElement)` - View analytics
```js
await XActions.engage.viewAnalytics(XActions.tweet.getAll()[0])
```

### `requestNote(tweetElement)` - Request community note
```js
await XActions.engage.requestNote(XActions.tweet.getAll()[0])
```

### `highlight(tweetElement)` - Highlight (Premium)
```js
await XActions.engage.highlight(XActions.tweet.getAll()[0])
```

---

## XActions.user - User Interactions

### `follow(target)` - Follow user
```js
// By username
await XActions.user.follow("elonmusk")

// Follow list of users
const users = ["openai", "anthropic", "google"]
for (const u of users) {
  await XActions.user.follow(u)
  await new Promise(r => setTimeout(r, 2000))
}
```

### `unfollow(target)` - Unfollow user
```js
await XActions.user.unfollow("someuser")
```

### `block(username)` - Block user
```js
await XActions.user.block("spammer")

// Block multiple
for (const spam of ["spam1", "spam2"]) {
  await XActions.user.block(spam)
}
```

### `unblock(username)` - Unblock user
```js
await XActions.user.unblock("formerlyblocked")
```

### `mute(username)` - Mute user
```js
await XActions.user.mute("annoying")
```

### `unmute(username)` - Unmute user
```js
await XActions.user.unmute("previouslymuted")
```

### `report(username)` - Report user
```js
await XActions.user.report("badactor")
```

### `addToList(username, listName)` - Add to list
```js
await XActions.user.addToList("techwriter", "Tech News")

// Build curated list
const leaders = ["paulg", "naval", "sama"]
for (const l of leaders) {
  await XActions.user.addToList(l, "Founders")
}
```

### `notifyOn(username)` - Turn on notifications
```js
await XActions.user.notifyOn("mustwatchaccount")
```

### `notifyOff(username)` - Turn off notifications
```js
await XActions.user.notifyOff("toofrequent")
```

### `viewTopics(username)` - View topics
```js
await XActions.user.viewTopics("influencer")
```

### `viewLists(username)` - View lists
```js
await XActions.user.viewLists("curator")
```

### `viewFollowers(username)` - View followers
```js
await XActions.user.viewFollowers("competitor")
```

### `viewFollowing(username)` - View following
```js
await XActions.user.viewFollowing("tastemaker")
```

### `viewLikes(username)` - View likes
```js
await XActions.user.viewLikes("researcher")
```

### `viewMedia(username)` - View media
```js
await XActions.user.viewMedia("photographer")
```

### `viewReplies(username)` - View replies
```js
await XActions.user.viewReplies("activeuser")
```

### `viewHighlights(username)` - View highlights
```js
await XActions.user.viewHighlights("creator")
```

### `viewArticles(username)` - View articles
```js
await XActions.user.viewArticles("writer")
```

### `shareProfile(username)` - Copy profile link
```js
await XActions.user.shareProfile("coolaccount")
```

### `followsYou(username)` - Check if follows you
```js
const follows = await XActions.user.followsYou("someuser")
console.log(follows ? "They follow you!" : "They don't follow you")

// Find mutuals
async function findMutuals(users) {
  const mutuals = []
  for (const u of users) {
    if (await XActions.user.followsYou(u)) mutuals.push(u)
  }
  return mutuals
}
```

### `getInfo(username)` - Get user info
```js
const info = await XActions.user.getInfo("openai")
console.log(`${info.displayName} - ${info.bio}`)
console.log(`Followers: ${info.followers}`)
```

### `restrict(username)` - Restrict user
```js
await XActions.user.restrict("limitedinteraction")
```

---

## XActions.dm - Direct Messages

### `send(username, message)` - Send DM
```js
await XActions.dm.send("friend", "Hey! How are you?")

// Send to multiple
const team = ["member1", "member2"]
for (const m of team) {
  await XActions.dm.send(m, "Team meeting at 3pm!")
}
```

### `open(username)` - Open conversation
```js
await XActions.dm.open("friend")
```

### `getConversations()` - Get all conversations
```js
const convos = await XActions.dm.getConversations()
console.log(`You have ${convos.length} conversations`)
```

### `deleteConversation(element)` - Delete conversation
```js
const convos = await XActions.dm.getConversations()
await XActions.dm.deleteConversation(convos[0].element)
```

### `leaveGroup()` - Leave group DM
```js
await XActions.dm.leaveGroup()
```

### `createGroup(usernames)` - Create group DM
```js
await XActions.dm.createGroup(["user1", "user2", "user3"])
```

### `sendImage()` - Send image
```js
await XActions.dm.sendImage()
// File picker opens - select manually
```

### `sendGif(searchTerm)` - Send GIF
```js
await XActions.dm.sendGif("celebration")
```

### `react(messageElement, emoji)` - React to message
```js
// React with heart
await XActions.dm.react(messageElement, "❤️")
```

---

## XActions.search - Search & Discovery

### `query(query, filter)` - Search
```js
await XActions.search.query("javascript tips")
await XActions.search.query("AI news", "live") // Latest
```

### `top(query)` - Top results
```js
await XActions.search.top("startup advice")
```

### `latest(query)` - Latest results
```js
await XActions.search.latest("breaking news")
```

### `people(query)` - Search people
```js
await XActions.search.people("web developer")
```

### `photos(query)` - Search photos
```js
await XActions.search.photos("sunset photography")
```

### `videos(query)` - Search videos
```js
await XActions.search.videos("coding tutorial")
```

### `from(username)` - Tweets from user
```js
await XActions.search.from("elonmusk")
```

### `to(username)` - Tweets to user
```js
await XActions.search.to("openai")
```

### `mentions(username)` - Mentions of user
```js
await XActions.search.mentions("yourhandle")
```

### `hashtag(tag)` - Search hashtag
```js
await XActions.search.hashtag("buildinpublic")
```

### `advanced(options)` - Advanced search
```js
// Viral tweets from a user
await XActions.search.advanced({
  from: "elonmusk",
  minFaves: 10000,
  since: "2024-01-01"
})

// Tech discussions with media
await XActions.search.advanced({
  words: "AI startup",
  hasMedia: true,
  minRetweets: 100,
  lang: "en"
})

// Find your mentions (excluding RTs)
await XActions.search.advanced({
  mentioning: "yourusername",
  excludeRetweets: true
})

// Job postings
await XActions.search.advanced({
  words: "hiring",
  hashtags: ["remotejobs"],
  since: "2024-12-01"
})
```

### `getResults()` - Get search results
```js
await XActions.search.query("javascript")
const results = XActions.search.getResults()
console.log(`Found ${results.length} tweets`)
```

---

## XActions.nav - Navigation

### `home()` - Go to home
```js
await XActions.nav.home()
```

### `explore()` - Go to explore
```js
await XActions.nav.explore()
```

### `notifications()` - Go to notifications
```js
await XActions.nav.notifications()
```

### `messages()` - Go to messages
```js
await XActions.nav.messages()
```

### `bookmarks()` - Go to bookmarks
```js
await XActions.nav.bookmarks()
```

### `lists()` - Go to lists
```js
await XActions.nav.lists()
```

### `communities()` - Go to communities
```js
await XActions.nav.communities()
```

### `premium()` - Go to premium
```js
await XActions.nav.premium()
```

### `profile(username)` - Go to profile
```js
await XActions.nav.profile("elonmusk")
await XActions.nav.profile() // Your own profile
```

### `settings()` - Go to settings
```js
await XActions.nav.settings()
```

### `notifyAll()` - All notifications
```js
await XActions.nav.notifyAll()
```

### `notifyVerified()` - Verified notifications
```js
await XActions.nav.notifyVerified()
```

### `notifyMentions()` - Mentions only
```js
await XActions.nav.notifyMentions()
```

### `forYou()` - For You timeline
```js
await XActions.nav.forYou()
```

### `following()` - Following timeline
```js
await XActions.nav.following()
```

### `trending()` - Trending
```js
await XActions.nav.trending()
```

### `news()` - News tab
```js
await XActions.nav.news()
```

### `sports()` - Sports tab
```js
await XActions.nav.sports()
```

### `entertainment()` - Entertainment tab
```js
await XActions.nav.entertainment()
```

### `spaces()` - Spaces page
```js
await XActions.nav.spaces()
```

### `scrollToTop()` - Scroll to top
```js
XActions.nav.scrollToTop()
```

### `scrollToBottom()` - Scroll to bottom
```js
XActions.nav.scrollToBottom()
```

### `scrollBy(pixels)` - Scroll by amount
```js
XActions.nav.scrollBy(500)  // Scroll down 500px
XActions.nav.scrollBy(-200) // Scroll up 200px
```

### `back()` - Browser back
```js
XActions.nav.back()
```

### `forward()` - Browser forward
```js
XActions.nav.forward()
```

### `refresh()` - Refresh page
```js
XActions.nav.refresh()
```

---

## XActions.lists - List Management

### `create(name, description, isPrivate)` - Create list
```js
// Public list
await XActions.lists.create("Tech News", "Best tech journalists", false)

// Private list
await XActions.lists.create("Competitors", "Track competitor accounts", true)
```

### `delete(listId)` - Delete list
```js
await XActions.lists.delete("1234567890")
```

### `edit(listId, newName, newDescription)` - Edit list
```js
await XActions.lists.edit("1234567890", "Updated Name", "New description")
```

### `follow(listId)` - Follow list
```js
await XActions.lists.follow("1234567890")
```

### `unfollow(listId)` - Unfollow list
```js
await XActions.lists.unfollow("1234567890")
```

### `pin(listId)` - Pin/unpin list
```js
await XActions.lists.pin("1234567890")
```

### `getAll()` - Get all lists
```js
const lists = await XActions.lists.getAll()
console.log(`You have ${lists.length} lists`)
```

### `viewMembers(listId)` - View list members
```js
await XActions.lists.viewMembers("1234567890")
```

### `viewFollowers(listId)` - View list followers
```js
await XActions.lists.viewFollowers("1234567890")
```

---

## XActions.settings - Account Settings

### `account()` - Account settings
```js
await XActions.settings.account()
```

### `security()` - Security settings
```js
await XActions.settings.security()
```

### `privacy()` - Privacy settings
```js
await XActions.settings.privacy()
```

### `notifications()` - Notification settings
```js
await XActions.settings.notifications()
```

### `accessibility()` - Accessibility settings
```js
await XActions.settings.accessibility()
```

### `monetization()` - Monetization settings
```js
await XActions.settings.monetization()
```

### `creatorSubs()` - Creator subscriptions
```js
await XActions.settings.creatorSubs()
```

### `premium()` - Premium settings
```js
await XActions.settings.premium()
```

### `mutedAccounts()` - View muted accounts
```js
await XActions.settings.mutedAccounts()
```

### `mutedWords()` - View muted words
```js
await XActions.settings.mutedWords()
```

### `blockedAccounts()` - View blocked accounts
```js
await XActions.settings.blockedAccounts()
```

### `addMutedWord(word)` - Add muted word
```js
await XActions.settings.addMutedWord("spoilers")
await XActions.settings.addMutedWord("politics")
```

### `downloadData()` - Download your data
```js
await XActions.settings.downloadData()
```

### `deactivate()` - Deactivate page
```js
await XActions.settings.deactivate()
// Proceed with caution!
```

---

## XActions.profile - Profile Editing

### `edit()` - Open profile editor
```js
await XActions.profile.edit()
```

### `updateName(newName)` - Update display name
```js
await XActions.profile.updateName("John Doe 🚀")
```

### `updateBio(newBio)` - Update bio
```js
await XActions.profile.updateBio("Building cool stuff | Founder @startup | DMs open")
```

### `updateLocation(location)` - Update location
```js
await XActions.profile.updateLocation("San Francisco, CA")
```

### `updateWebsite(url)` - Update website
```js
await XActions.profile.updateWebsite("https://mywebsite.com")
```

### `updateAvatar()` - Change avatar
```js
await XActions.profile.updateAvatar()
// File picker opens
```

### `updateHeader()` - Change header
```js
await XActions.profile.updateHeader()
// File picker opens
```

### `switchToProfessional()` - Professional account
```js
await XActions.profile.switchToProfessional()
```

---

## XActions.utils - Utilities

### `getCurrentUser()` - Get current username
```js
const me = XActions.utils.getCurrentUser()
console.log(`Logged in as @${me}`)
```

### `isLoggedIn()` - Check if logged in
```js
if (XActions.utils.isLoggedIn()) {
  console.log("Ready to automate!")
} else {
  console.log("Please log in first")
}
```

### `getTokens()` - Get auth tokens
```js
const tokens = XActions.utils.getTokens()
console.log("CSRF token:", tokens.ct0)
// Useful for API calls
```

### `getTweetIdFromUrl(url)` - Extract tweet ID
```js
const id = XActions.utils.getTweetIdFromUrl("https://x.com/user/status/123456789")
console.log(id) // "123456789"
```

### `getUsernameFromUrl(url)` - Extract username
```js
const user = XActions.utils.getUsernameFromUrl("https://x.com/elonmusk")
console.log(user) // "elonmusk"
```

### `waitForPageLoad()` - Wait for page
```js
await XActions.utils.waitForPageLoad()
console.log("Page ready!")
```

### `loadMore(times)` - Scroll to load more
```js
await XActions.utils.loadMore(5) // Scroll 5 times
```

### `clearXData()` - Clear localStorage
```js
XActions.utils.clearXData()
```

### `exportBookmarks(maxItems)` - Export bookmarks
```js
// Export 100 bookmarks
const bookmarks = await XActions.utils.exportBookmarks(100)
console.log(bookmarks)

// Download as JSON
const bookmarks = await XActions.utils.exportBookmarks(500)
const blob = new Blob([JSON.stringify(bookmarks, null, 2)], {type: 'application/json'})
const url = URL.createObjectURL(blob)
const a = document.createElement('a')
a.href = url
a.download = 'bookmarks.json'
a.click()
```

### `exportLikes(username, maxItems)` - Export likes
```js
const likes = await XActions.utils.exportLikes("myusername", 200)
console.log(`Exported ${likes.length} liked tweets`)
```

### `copyToClipboard(text)` - Copy to clipboard
```js
await XActions.utils.copyToClipboard("Hello world!")
```

### `screenshotTweet(tweetUrl)` - Screenshot tweet
```js
await XActions.utils.screenshotTweet("https://x.com/user/status/123")
// Opens screenshot service in new tab
```

### `showKeyboardShortcuts()` - Show shortcuts
```js
XActions.utils.showKeyboardShortcuts()
```

### `devMode()` - Enable dev mode
```js
XActions.utils.devMode()
// All elements outlined with data-testid labels
```

### `getAllSelectors()` - Get all selectors
```js
const selectors = XActions.utils.getAllSelectors()
console.log(selectors) // Array of all data-testid values on page
```

---

## XActions.spaces - Twitter Spaces

### `browse()` - Browse spaces
```js
await XActions.spaces.browse()
```

### `join(spaceId)` - Join space
```js
await XActions.spaces.join("1234567890")
```

### `leave()` - Leave space
```js
await XActions.spaces.leave()
```

### `requestToSpeak()` - Request to speak
```js
await XActions.spaces.requestToSpeak()
```

### `setReminder(spaceId)` - Set reminder
```js
await XActions.spaces.setReminder("1234567890")
```

### `share()` - Share space
```js
await XActions.spaces.share()
```

---

## XActions.communities - Communities

### `browse()` - Browse communities
```js
await XActions.communities.browse()
```

### `view(communityId)` - View community
```js
await XActions.communities.view("1234567890")
```

### `join(communityId)` - Join community
```js
await XActions.communities.join("1234567890")
```

### `leave(communityId)` - Leave community
```js
await XActions.communities.leave("1234567890")
```

### `post(communityId, text)` - Post in community
```js
await XActions.communities.post("1234567890", "Hello community! 👋")
```

---

## 🔥 Power User Recipes

### Like & Follow from Search Results
```js
await XActions.search.query("web3 developer")
await new Promise(r => setTimeout(r, 2000))
const tweets = XActions.tweet.getAll().slice(0, 10)
for (const tweet of tweets) {
  await XActions.engage.like(tweet)
  await XActions.user.follow(tweet)
  await new Promise(r => setTimeout(r, 3000))
}
```

### Export All Your Bookmarks to JSON
```js
const bookmarks = await XActions.utils.exportBookmarks(1000)
const blob = new Blob([JSON.stringify(bookmarks, null, 2)], {type: 'application/json'})
const a = document.createElement('a')
a.href = URL.createObjectURL(blob)
a.download = `bookmarks-${Date.now()}.json`
a.click()
console.log(`Exported ${bookmarks.length} bookmarks!`)
```

### Find Non-Mutuals
```js
const following = ["user1", "user2", "user3", "user4", "user5"]
const nonMutuals = []
for (const user of following) {
  if (!(await XActions.user.followsYou(user))) {
    nonMutuals.push(user)
  }
  await new Promise(r => setTimeout(r, 2000))
}
console.log("Non-mutuals:", nonMutuals)
```

### Auto-Engage with Hashtag
```js
await XActions.search.hashtag("buildinpublic")
await new Promise(r => setTimeout(r, 2000))
for (const tweet of XActions.tweet.getAll().slice(0, 5)) {
  await XActions.engage.like(tweet)
  await XActions.engage.bookmark(tweet)
  await new Promise(r => setTimeout(r, 2000))
}
```

### Daily Posting Schedule
```js
const posts = [
  "Good morning! ☀️ What are you building today?",
  "Tip of the day: Always test your code before deploying 🧪",
  "Evening thought: Consistency beats intensity 💪"
]
for (const post of posts) {
  await XActions.tweet.post(post)
  // In real usage, you'd schedule these with setTimeout or cron
}
```

---

<p align="center">
  <a href="./automation.md">← Back to Automation Guide</a> |
  <a href="https://github.com/nirholas/XActions">⭐ Star on GitHub</a>
</p>
