# XActions Actions Library Reference (`actions.js`)

> The complete X/Twitter actions library — 2,100+ lines, 12 namespaces, 100+ functions covering every available user action.

**Source:** [`src/automation/actions.js`](../../src/automation/actions.js) (2,116 lines)

---

## Table of Contents

- [Overview](#overview)
- [Loading](#loading)
- [Extended Selectors (SEL)](#extended-selectors-sel)
- [XActions.tweet — Post Management](#xactionstweet--post-management)
- [XActions.engage — Engagement Actions](#xactionsengage--engagement-actions)
- [XActions.user — User Interactions](#xactionsuser--user-interactions)
- [XActions.dm — Direct Messages](#xactionsdm--direct-messages)
- [XActions.search — Search & Discovery](#xactionssearch--search--discovery)
- [XActions.nav — Navigation](#xactionsnav--navigation)
- [XActions.lists — List Management](#xactionslists--list-management)
- [XActions.settings — Account Settings](#xactionssettings--account-settings)
- [XActions.profile — Profile Editing](#xactionsprofile--profile-editing)
- [XActions.utils — Power Utilities](#xactionsutils--power-utilities)
- [XActions.spaces — Twitter Spaces](#xactionsspaces--twitter-spaces)
- [XActions.communities — Communities](#xactionscommunities--communities)

---

## Overview

`actions.js` replaces `window.XActions` with a complete action library. It requires `core.js` to be loaded first — it destructures Core's utilities at the top:

```javascript
const { sleep, randomDelay, log, storage, waitForElement, waitForElements, clickElement, typeText } = Core;
```

When loaded successfully, you'll see a banner showing all 12 sections:

```
╔══════════════════════════════════════════════════════════════════════╗
║  📦 XActions Library - COMPLETE (All 9 Sections)                     ║
╠══════════════════════════════════════════════════════════════════════╣
║  ✅ XActions.tweet       - Post, reply, quote, delete, pin, thread   ║
║  ✅ XActions.engage      - Like, RT, bookmark, share, highlight      ║
║  ...                                                                   ║
╚══════════════════════════════════════════════════════════════════════╝
```

---

## Loading

```javascript
// In browser DevTools console on x.com:
// 1. Paste core.js first
// 2. Then paste actions.js

// Verify:
await XActions.tweet.post("Test!"); // Posts a tweet
XActions.utils.getCurrentUser();     // Returns your username
```

> **Important:** After loading actions.js, `window.XActions.Core` is still accessible via the Core reference inside the closure, but `window.XActions` now points to the actions library (tweet, engage, user, etc.), not Core. Access Core directly via `window.XActions.Core` if needed.

---

## Extended Selectors (SEL)

`actions.js` defines its own extended selector map (`SEL`) that goes beyond what Core provides. These are used internally but you can access them via `XActions.SEL`:

### Compose/Input
| Key | Selector | Element |
|-----|----------|---------|
| `tweetTextarea` | `[data-testid="tweetTextarea_0"]` | Compose box |
| `tweetButton` | `[data-testid="tweetButton"]` | Post button |
| `tweetButtonInline` | `[data-testid="tweetButtonInline"]` | Inline post button |
| `dmTextarea` | `[data-testid="dmComposerTextInput"]` | DM input |
| `dmSendButton` | `[data-testid="dmComposerSendButton"]` | DM send |
| `searchInput` | `[data-testid="SearchBox_Search_Input"]` | Search box |
| `mediaUpload` | `input[data-testid="fileInput"]` | Media file input |
| `gifButton` | `[data-testid="gifyButton"]` | GIF picker |
| `emojiButton` | `[data-testid="emojiButton"]` | Emoji picker |
| `pollButton` | `[data-testid="pollButton"]` | Add poll |
| `scheduleButton` | `[data-testid="scheduledButton"]` | Schedule post |
| `locationButton` | `[data-testid="geoButton"]` | Add location |

### Action Buttons
| Key | Selector | Element |
|-----|----------|---------|
| `likeButton` | `[data-testid="like"]` | Like |
| `unlikeButton` | `[data-testid="unlike"]` | Unlike |
| `retweetButton` | `[data-testid="retweet"]` | Retweet |
| `unretweetButton` | `[data-testid="unretweet"]` | Un-retweet |
| `replyButton` | `[data-testid="reply"]` | Reply |
| `shareButton` | `[data-testid="share"]` | Share |
| `bookmarkButton` | `[data-testid="bookmark"]` | Bookmark |
| `removeBookmark` | `[data-testid="removeBookmark"]` | Remove bookmark |

### Menus & Dialogs
| Key | Selector | Element |
|-----|----------|---------|
| `caret` | `[data-testid="caret"]` | Tweet ⋯ menu |
| `menuItem` | `[role="menuitem"]` | Menu option |
| `confirmButton` | `[data-testid="confirmationSheetConfirm"]` | Confirm |
| `cancelButton` | `[data-testid="confirmationSheetCancel"]` | Cancel |
| `modal` | `[data-testid="modal"]` | Modal dialog |
| `sheetDialog` | `[data-testid="sheetDialog"]` | Sheet dialog |
| `toast` | `[data-testid="toast"]` | Toast notification |

### Profile & Navigation
| Key | Selector | Element |
|-----|----------|---------|
| `profileHeader` | `[data-testid="UserProfileHeader_Items"]` | Profile header |
| `editProfileButton` | `[data-testid="editProfileButton"]` | Edit profile |
| `primaryColumn` | `[data-testid="primaryColumn"]` | Main column |
| `sidebarColumn` | `[data-testid="sidebarColumn"]` | Sidebar |
| `backButton` | `[data-testid="app-bar-back"]` | Back button |
| `tabList` | `[role="tablist"]` | Tab navigation |

### Media & Content
| Key | Selector | Element |
|-----|----------|---------|
| `dmConversation` | `[data-testid="conversation"]` | DM conversation |
| `dmMessage` | `[data-testid="messageEntry"]` | DM message |
| `notification` | `[data-testid="notification"]` | Notification |
| `communityCard` | `[data-testid="CommunityCard"]` | Community card |
| `spaceBar` | `[data-testid="SpaceBar"]` | Space bar |
| `spaceCard` | `[data-testid="SpaceCard"]` | Space card |

---

## XActions.tweet — Post Management

### `tweet.post(text, options)`

Post a new tweet.

```javascript
await XActions.tweet.post("Hello world!");
await XActions.tweet.post("Check this out!", { draft: true }); // Don't auto-send
```

**Options:**
- `mediaUrl` — Triggers media upload dialog (requires manual file selection)
- `draft` — If `true`, types text but doesn't click Post

**How it works:** Opens the compose dialog if needed → types text character-by-character → clicks the Post button.

### `tweet.reply(tweetElement, text)`

Reply to a specific tweet.

```javascript
const tweets = XActions.tweet.getAll();
await XActions.tweet.reply(tweets[0], "Great point!");
```

### `tweet.quote(tweetElement, text)`

Quote-tweet with your commentary.

```javascript
const tweets = XActions.tweet.getAll();
await XActions.tweet.quote(tweets[0], "This is exactly what I've been saying");
```

### `tweet.delete(tweetElement)`

Delete one of your tweets. Opens ⋯ menu → Delete → Confirm.

```javascript
const tweets = XActions.tweet.getAll();
await XActions.tweet.delete(tweets[0]);
```

### `tweet.pin(tweetElement)`

Pin a tweet to your profile. Opens ⋯ menu → Pin → Confirm.

```javascript
await XActions.tweet.pin(tweetElement);
```

### `tweet.getId(tweetElement)`

Extract the tweet ID from an element.

```javascript
const id = XActions.tweet.getId(tweetElement);
// Returns: '1234567890123456789'
```

### `tweet.getAll()`

Get all visible tweet elements on the current page.

```javascript
const tweets = XActions.tweet.getAll();
console.log(`${tweets.length} tweets visible`);
```

### `tweet.thread(tweets)`

Post a thread of multiple tweets.

```javascript
await XActions.tweet.thread([
  "Thread 🧵 Here's what I learned about AI agents...",
  "1/ First, they need clear goals and constraints...",
  "2/ Second, context management is everything...",
  "3/ Finally, error recovery separates good from great.",
]);
```

---

## XActions.engage — Engagement Actions

### `engage.like(tweetElement)` / `engage.unlike(tweetElement)`

Like or unlike a tweet.

```javascript
const tweets = XActions.tweet.getAll();
await XActions.engage.like(tweets[0]);
await XActions.engage.unlike(tweets[1]);
```

### `engage.retweet(tweetElement)` / `engage.unretweet(tweetElement)`

Retweet or undo a retweet (clicks confirm dialog).

```javascript
await XActions.engage.retweet(tweetElement);
```

### `engage.bookmark(tweetElement)` / `engage.unbookmark(tweetElement)`

Bookmark via the share menu.

```javascript
await XActions.engage.bookmark(tweetElement);
```

### `engage.addToList(tweetElement, listName)`

Add the tweet's author to a list via the ⋯ menu.

```javascript
await XActions.engage.addToList(tweetElement, 'AI Accounts');
```

### `engage.report(tweetElement, reason)`

Open the report dialog for a tweet.

```javascript
await XActions.engage.report(tweetElement);
// Opens dialog — complete manually
```

### `engage.copyLink(tweetElement)`

Copy the tweet's link to clipboard via share menu.

### `engage.shareViaDM(tweetElement, username)`

Share a tweet to someone via DM.

```javascript
await XActions.engage.shareViaDM(tweetElement, 'friendUsername');
```

### `engage.embed(tweetElement)`

Open the embed code dialog.

### `engage.viewAnalytics(tweetElement)`

Open tweet analytics/engagements view.

### `engage.requestNote(tweetElement)`

Request a Community Note on a tweet.

### `engage.highlight(tweetElement)`

Highlight a tweet (X Premium feature).

---

## XActions.user — User Interactions

### `user.follow(target)` / `user.unfollow(target)`

Follow or unfollow. Accepts a username string or DOM element.

```javascript
await XActions.user.follow('username');     // Navigate + click follow
await XActions.user.follow(userCellElement); // Click follow in existing cell
await XActions.user.unfollow('username');   // Navigate + click unfollow + confirm
```

### `user.block(username)` / `user.unblock(username)`

Block or unblock a user. Navigates to profile → ... menu → Block → Confirm.

```javascript
await XActions.user.block('spambot123');
await XActions.user.unblock('spambot123');
```

### `user.mute(username)` / `user.unmute(username)`

Mute or unmute a user.

```javascript
await XActions.user.mute('annoying_account');
```

### `user.report(username)`

Open the report dialog for a user.

### `user.addToList(username, listName)`

Add a user to a specific list.

```javascript
await XActions.user.addToList('alice', 'AI People');
```

### `user.notifyOn(username)` / `user.notifyOff(username)`

Toggle post notifications for a user.

```javascript
await XActions.user.notifyOn('vitalikbuterin'); // Get notified of their posts
```

### `user.restrict(username)`

Restrict a user's interactions with your content.

### `user.followsYou(username)`

Check if a user follows you. Navigates to their profile and checks for the badge.

```javascript
const follows = await XActions.user.followsYou('someuser');
// Returns: true/false
```

### `user.getInfo(username)`

Get structured user information.

```javascript
const info = await XActions.user.getInfo('elonmusk');
// Returns: {
//   username: 'elonmusk',
//   displayName: 'Elon Musk',
//   bio: '...',
//   followsYou: false,
//   verified: true,
//   protected: false,
//   followers: '200.5M Followers',
//   following: '800 Following'
// }
```

### Navigation Helpers

All navigate to specific user pages:

```javascript
await XActions.user.viewFollowers('username');
await XActions.user.viewFollowing('username');
await XActions.user.viewLikes('username');
await XActions.user.viewMedia('username');
await XActions.user.viewReplies('username');
await XActions.user.viewHighlights('username');
await XActions.user.viewArticles('username');
await XActions.user.viewTopics('username');
await XActions.user.viewLists('username');
```

---

## XActions.dm — Direct Messages

### `dm.send(username, message)`

Send a DM to a user. Navigates to Messages → New → Search → Type → Send.

```javascript
await XActions.dm.send('friendUsername', 'Hey, check out this project!');
```

### `dm.open(username)`

Open an existing DM conversation, or start a new one.

```javascript
await XActions.dm.open('friendUsername');
```

### `dm.getConversations()`

Get all visible DM conversations.

```javascript
const convos = await XActions.dm.getConversations();
// Returns: [{ element, text }, ...]
```

### `dm.deleteConversation(conversationElement)`

Delete a DM conversation.

### `dm.leaveGroup()`

Leave a group DM (must be viewing the group).

### `dm.createGroup(usernames, groupName)`

Create a group DM with multiple users.

```javascript
await XActions.dm.createGroup(['alice', 'bob', 'charlie']);
```

### `dm.sendImage()` / `dm.sendGif(searchTerm)`

Send media in DMs.

```javascript
await XActions.dm.sendGif('celebration');
// Opens GIF picker, searches 'celebration', clicks first result
```

### `dm.react(messageElement, emoji)`

React to a message with an emoji.

```javascript
await XActions.dm.react(messageElement, '❤️');
```

---

## XActions.search — Search & Discovery

### `search.query(query, filter)`

Run a search with optional filter.

```javascript
await XActions.search.query('AI agents', 'top');
await XActions.search.query('AI agents', 'live');  // Latest
await XActions.search.query('AI agents', 'user');  // People
await XActions.search.query('AI agents', 'image'); // Photos
await XActions.search.query('AI agents', 'video'); // Videos
```

### Shortcut Methods

```javascript
await XActions.search.top('AI agents');
await XActions.search.latest('AI agents');
await XActions.search.people('AI agents');
await XActions.search.photos('AI agents');
await XActions.search.videos('AI agents');
```

### Operator Search

```javascript
await XActions.search.from('elonmusk');     // Tweets FROM user
await XActions.search.to('elonmusk');       // Tweets TO user
await XActions.search.mentions('elonmusk'); // Tweets mentioning user
await XActions.search.hashtag('web3');      // Search hashtag
```

### `search.advanced(options)`

Build complex search queries using X's undocumented operators.

```javascript
await XActions.search.advanced({
  words: 'AI agents',              // Contains these words
  exactPhrase: 'large language',   // Contains exact phrase
  anyWords: 'GPT Claude Gemini',   // Contains any of these
  excludeWords: 'crypto NFT',      // Excludes these
  hashtags: ['AI', 'LLM'],         // Has these hashtags
  from: 'username',                // From user
  to: 'username',                  // To user
  mentioning: 'username',          // Mentioning user
  minReplies: 10,                  // Minimum replies
  minFaves: 100,                   // Minimum likes
  minRetweets: 50,                 // Minimum retweets
  since: '2025-01-01',            // After date
  until: '2025-12-31',            // Before date
  lang: 'en',                     // Language
  verified: true,                  // From verified accounts
  hasMedia: true,                  // Has any media
  hasImages: true,                 // Has images
  hasVideos: true,                 // Has videos
  hasLinks: true,                  // Has links
  isReply: true,                   // Is a reply
  excludeRetweets: true,           // No retweets
  near: 'San Francisco',          // Near location
  within: '15mi',                 // Within radius
  filter: 'latest',               // Result filter
});
```

**Generated query example:**
```
AI agents "large language" (GPT OR Claude OR Gemini) -crypto -NFT #AI #LLM
from:username min_faves:100 since:2025-01-01 filter:verified filter:media lang:en
```

### `search.getResults()`

Get current tweet elements from search results.

```javascript
const results = XActions.search.getResults();
// Returns: Array of tweet DOM elements
```

---

## XActions.nav — Navigation

### Core Navigation

```javascript
await XActions.nav.home();           // Home timeline
await XActions.nav.explore();        // Explore page
await XActions.nav.notifications();  // Notifications
await XActions.nav.messages();       // DMs
await XActions.nav.bookmarks();      // Bookmarks
await XActions.nav.lists();          // Your lists
await XActions.nav.communities();    // Communities
await XActions.nav.premium();        // Premium signup
await XActions.nav.profile('user');  // User profile
await XActions.nav.settings();       // Settings
```

### Timeline Tabs

```javascript
await XActions.nav.forYou();         // "For You" tab
await XActions.nav.following();      // "Following" tab
```

### Notification Tabs

```javascript
await XActions.nav.notifyAll();      // All notifications
await XActions.nav.notifyVerified(); // Verified only
await XActions.nav.notifyMentions(); // Mentions only
```

### Explore Page Tabs

```javascript
await XActions.nav.trending();        // Trending
await XActions.nav.forYouExplore();   // For You
await XActions.nav.news();            // News
await XActions.nav.sports();          // Sports
await XActions.nav.entertainment();   // Entertainment
await XActions.nav.spaces();          // Spaces
```

### Scroll & History

```javascript
XActions.nav.scrollToTop();    // Smooth scroll up
XActions.nav.scrollToBottom(); // Smooth scroll down
XActions.nav.scrollBy(500);    // Scroll by px
XActions.nav.back();           // Browser back
XActions.nav.forward();        // Browser forward
XActions.nav.refresh();        // Refresh page
```

---

## XActions.lists — List Management

### `lists.create(name, description, isPrivate)`

Create a new list.

```javascript
await XActions.lists.create('AI Researchers', 'Top AI/ML accounts', true);
```

### `lists.delete(listId)` / `lists.edit(listId, name, description)`

Delete or edit a list.

```javascript
await XActions.lists.edit('123456', 'New List Name', 'Updated description');
await XActions.lists.delete('123456');
```

### `lists.follow(listId)` / `lists.unfollow(listId)`

Follow or unfollow a list.

### `lists.pin(listId)`

Toggle list pin on your sidebar.

### `lists.getAll()`

Get all your lists.

```javascript
const myLists = await XActions.lists.getAll();
// Returns: [{ element, text }, ...]
```

### `lists.viewMembers(listId)` / `lists.viewFollowers(listId)`

Navigate to list member/follower pages.

---

## XActions.settings — Account Settings

Navigation functions to settings pages:

```javascript
await XActions.settings.account();         // Account settings
await XActions.settings.security();        // Security
await XActions.settings.privacy();         // Privacy & safety
await XActions.settings.notifications();   // Notification settings
await XActions.settings.accessibility();   // Accessibility
await XActions.settings.monetization();    // Monetization
await XActions.settings.creatorSubs();     // Creator subscriptions
await XActions.settings.premium();         // Premium settings
await XActions.settings.mutedAccounts();   // Muted accounts list
await XActions.settings.mutedWords();      // Muted words list
await XActions.settings.blockedAccounts(); // Blocked accounts list
```

### `settings.addMutedWord(word, options)`

Mute a word/phrase.

```javascript
await XActions.settings.addMutedWord('spoiler');
```

### `settings.downloadData()`

Navigate to the "Download your data" page.

### `settings.deactivate()`

Navigate to the account deactivation page (proceed with caution).

---

## XActions.profile — Profile Editing

### `profile.edit()`

Open the profile edit modal.

### `profile.updateName(newName)` / `profile.updateBio(newBio)` / `profile.updateLocation(location)` / `profile.updateWebsite(url)`

Update profile fields.

```javascript
await XActions.profile.updateName('Alice Builder');
await XActions.profile.updateBio('Building the future of web3 🚀');
await XActions.profile.updateLocation('San Francisco, CA');
await XActions.profile.updateWebsite('https://alice.dev');
```

### `profile.updateAvatar()` / `profile.updateHeader()`

Open file picker for avatar/header image (manual file selection required).

### `profile.switchToProfessional()`

Start the professional account conversion flow.

---

## XActions.utils — Power Utilities

### `utils.getCurrentUser()`

Get your current username.

```javascript
const me = XActions.utils.getCurrentUser();
// Returns: 'myusername'
```

### `utils.isLoggedIn()`

Check if you're logged in.

```javascript
XActions.utils.isLoggedIn(); // true/false
```

### `utils.getTokens()`

Get authentication tokens from cookies (for API use).

```javascript
const tokens = XActions.utils.getTokens();
// Returns: { ct0: 'csrf_token_here', authToken: 'auth_token_here' }
```

> **Warning:** These are sensitive. Never share them.

### `utils.getTweetIdFromUrl(url)` / `utils.getUsernameFromUrl(url)`

Extract IDs from URLs.

```javascript
XActions.utils.getTweetIdFromUrl('https://x.com/user/status/1234567');
// Returns: '1234567'

XActions.utils.getUsernameFromUrl('https://x.com/elonmusk');
// Returns: 'elonmusk'
```

### `utils.waitForPageLoad()`

Wait for the main content column to appear.

### `utils.loadMore(times)`

Scroll to load more content.

```javascript
await XActions.utils.loadMore(5); // Scroll 5 times with 2s pauses
```

### `utils.exportBookmarks(maxItems)`

Scroll through bookmarks and collect them.

```javascript
const bookmarks = await XActions.utils.exportBookmarks(200);
// Returns: [{ link: 'https://x.com/.../status/...', text: 'Tweet text...' }, ...]
```

### `utils.exportLikes(username, maxItems)`

Export a user's liked tweets.

```javascript
const likes = await XActions.utils.exportLikes('myusername', 100);
// Returns: ['https://x.com/.../status/...', ...]
```

### `utils.copyToClipboard(text)`

Copy text to clipboard.

### `utils.screenshotTweet(tweetUrl)`

Open a screenshot service for a tweet.

### `utils.clearXData()`

Clear all X-related data from localStorage (broader than `Core.storage.clear()`).

### `utils.devMode()`

Visual DOM inspector — outlines all `data-testid` elements in red with tooltip labels.

```javascript
XActions.utils.devMode();
// Every data-testid element gets a red outline and hover tooltip
```

### `utils.getAllSelectors()`

Get all `data-testid` values currently on the page.

```javascript
const selectors = XActions.utils.getAllSelectors();
// Returns: ['SearchBox_Search_Input', 'SideNav_AccountSwitcher_Button', 'tweet', ...]
```

---

## XActions.spaces — Twitter Spaces

```javascript
await XActions.spaces.browse();               // Browse live spaces
await XActions.spaces.join('spaceId');         // Join a space
await XActions.spaces.leave();                 // Leave current space
await XActions.spaces.requestToSpeak();        // Request to speak
await XActions.spaces.setReminder('spaceId');  // Set reminder for scheduled space
await XActions.spaces.share();                 // Copy space link
```

---

## XActions.communities — Communities

```javascript
await XActions.communities.browse();                    // Browse communities
await XActions.communities.view('communityId');          // View a community
await XActions.communities.join('communityId');           // Join
await XActions.communities.leave('communityId');          // Leave
await XActions.communities.post('communityId', 'Hello!'); // Post in community
```
