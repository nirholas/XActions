# X/Twitter DOM Selector Reference

> **Last verified: February 2026.** Twitter frequently changes their DOM — always verify selectors before use.
>
> This is the **canonical reference** for all known X/Twitter DOM selectors used across the XActions project. Check here before writing new selectors.

---

## Table of Contents

- [UserCell Elements](#usercell-elements)
- [Profile Page Elements](#profile-page-elements)
- [Tweet Elements](#tweet-elements)
- [Engagement Buttons](#engagement-buttons)
- [Follow / Unfollow](#follow--unfollow)
- [Compose / Post Creation](#compose--post-creation)
- [Compose Toolbar](#compose-toolbar)
- [Scheduling](#scheduling)
- [Poll Elements](#poll-elements)
- [Profile Editing](#profile-editing)
- [Navigation / Layout](#navigation--layout)
- [Search / Explore](#search--explore)
- [Direct Messages](#direct-messages)
- [Block / Mute / Report](#block--mute--report)
- [Notifications](#notifications)
- [Bookmarks](#bookmarks)
- [Lists](#lists)
- [Communities](#communities)
- [Spaces / Live Audio](#spaces--live-audio)
- [Grok AI](#grok-ai)
- [Articles / Longform](#articles--longform)
- [Creator Studio / Monetization](#creator-studio--monetization)
- [Settings / Privacy](#settings--privacy)
- [Dialogs / Confirmations](#dialogs--confirmations)
- [Generic / Utility](#generic--utility)
- [Common Pitfalls](#common-pitfalls)
- [Selector Architecture](#selector-architecture)

---

## UserCell Elements

Search results, followers lists, following lists, and any user-list UI.

| Element | Primary Selector | Fallback Selector(s) | Notes |
|---------|-----------------|----------------------|-------|
| User cell container | `[data-testid="UserCell"]` | `[data-testid="user"]`, `div[role="listitem"]` | Main container for user list items |
| Display name | `[data-testid="User-Name"]` | `[data-testid="UserCell"] a[href^="/"]` | Note the **hyphen**: `User-Name` |
| Display name link | `[data-testid="User-Name"] a` | — | Direct link to profile |
| Handle link | `[data-testid="User-Name"] a[tabindex="-1"]` | — | The @username portion |
| Bio/Description | `[data-testid="UserDescription"]` | `[dir="auto"]:not([data-testid])`, `[dir="auto"]:not([role])` | ⚠️ Case-sensitive: capital **U** |
| Follow indicator | `[data-testid="userFollowIndicator"]` | — | "Follows you" badge |
| Follow button | `[data-testid$="-follow"]` | `button[aria-label*="Follow @"]` | Uses **suffix match** (`$=`) |
| Unfollow button | `[data-testid$="-unfollow"]` | `button[aria-label*="Following @"]` | Uses **suffix match** (`$=`) |
| Verified badge | `[data-testid="icon-verified"]` | `svg[aria-label*="Verified"]` | |
| Protected icon | `[data-testid="icon-lock"]` | `svg[aria-label*="Protected"]` | |
| Avatar container | `[data-testid="UserAvatar-Container"]` | — | |
| Avatar image | `[data-testid="UserAvatar-Container"] img` | `[data-testid*="UserAvatar"] img` | |
| User actions menu | `[data-testid="userActions"]` | — | The "…" menu on user cells |

---

## Profile Page Elements

Selectors for profile pages (`x.com/username`).

| Element | Primary Selector | Fallback Selector(s) | Notes |
|---------|-----------------|----------------------|-------|
| Profile username | `[data-testid="UserName"]` | — | ⚠️ No hyphen (unlike `User-Name` in tweets) |
| Profile header items | `[data-testid="UserProfileHeader_Items"]` | — | Container for location, URL, join date |
| Profile schema | `[data-testid="UserProfileSchema"]` | — | Structured profile data |
| Bio/Description | `[data-testid="UserDescription"]` | — | Same selector as UserCell |
| Location | `[data-testid="UserLocation"]` | — | |
| Website URL | `[data-testid="UserUrl"]` | — | |
| Website link | `[data-testid="UserUrl"] a` | — | The clickable link element |
| Join date | `[data-testid="UserJoinDate"]` | — | |
| Birthday | `[data-testid="UserBirthday"]` | — | |
| Avatar (profile page) | `[data-testid="UserAvatar"] img` | `a[href$="/photo"] img` | |
| Avatar (unknown variant) | `[data-testid="UserAvatar-Container-unknown"] img` | — | Appears in some contexts |
| Header photo | `a[href$="/header_photo"] img` | — | Banner image |
| Profile image (generic) | `img[src*="profile_images"]` | — | Matches by URL pattern |
| Default avatar | `img[src*="default_profile"]` | — | Users with no profile pic |
| Followers link | `a[href$="/followers"]` | — | |
| Followers count | `a[href$="/followers"] span` | — | |
| Following link | `a[href$="/following"]` | — | |
| Following count | `a[href$="/following"] span` | — | |
| Verified followers | `a[href$="/verified_followers"]` | — | |
| Premium badge | `[data-testid="premiumBadge"]` | — | |
| Premium banner | `[data-testid="premiumBanner"]` | — | |

---

## Tweet Elements

Tweet/post containers, content, and metadata.

| Element | Primary Selector | Fallback Selector(s) | Notes |
|---------|-----------------|----------------------|-------|
| Tweet container | `article[data-testid="tweet"]` | `article[role="article"]`, `[data-testid="cellInnerDiv"] article` | Primary tweet wrapper |
| Tweet text | `[data-testid="tweetText"]` | `[lang][dir] span`, `article span[dir="auto"]` | |
| Social context | `[data-testid="socialContext"]` | — | "Retweeted", "Pinned", "Replying to" |
| Tweet photo | `[data-testid="tweetPhoto"]` | — | Photo container |
| Tweet image | `[data-testid="tweetPhoto"] img` | — | Actual image element |
| Video player | `[data-testid="videoPlayer"]` | — | |
| Quote tweet | `[data-testid="quoteTweet"]` | — | |
| Nested quote tweet | `[data-testid="tweet"] [data-testid="tweet"]` | — | Quote inside a tweet |
| Card/link preview | `[data-testid="card.wrapper"]` | — | |
| Thread indicator | `[data-testid="tweet-thread-indicator"]` | — | |
| Promoted/Ad tweet | `[data-testid="placementTracking"]` | — | Filter these to skip ads |
| Tweet permalink | `a[href*="/status/"]` | — | Link to individual tweet |
| Tweet timestamp | `a[href*="/status/"] time` | — | |
| Timestamp element | `time` | — | Generic time element |
| Tweet author avatar | `[data-testid="Tweet-User-Avatar"]` | — | |
| Author name in tweet | `[data-testid="User-Name"] a[href^="/"]` | — | Profile link from tweet |

---

## Engagement Buttons

Like, reply, retweet, bookmark, share, and analytics buttons on tweets.

| Element | Primary Selector | Fallback Selector(s) | Notes |
|---------|-----------------|----------------------|-------|
| Like button | `[data-testid="like"]` | `button[aria-label*="Like"]`, `[role="button"][data-testid*="like"]` | |
| Unlike button | `[data-testid="unlike"]` | `button[aria-label*="Liked"]` | Already-liked state |
| Reply button | `[data-testid="reply"]` | `button[aria-label*="Reply"]` | |
| Retweet/Repost button | `[data-testid="retweet"]` | `button[aria-label*="Repost"]` | |
| Undo retweet | `[data-testid="unretweet"]` | `button[aria-label*="Undo repost"]` | |
| Confirm retweet | `[data-testid="retweetConfirm"]` | — | |
| Confirm undo retweet | `[data-testid="unretweetConfirm"]` | — | |
| Bookmark button | `[data-testid="bookmark"]` | `button[aria-label*="Bookmark"]` | |
| Remove bookmark | `[data-testid="removeBookmark"]` | `button[aria-label*="Remove Bookmark"]` | |
| Share button | `[data-testid="share"]` | `button[aria-label*="Share"]` | |
| More menu (caret) | `[data-testid="caret"]` | `button[aria-label="More"]`, `[data-testid="tweet"] button:last-of-type` | Three-dot menu |
| Hide reply | `[data-testid="hideReply"]` | — | |
| Reply restriction | `[data-testid="replyRestriction"]` | — | |
| Analytics button | `[data-testid="analyticsButton"]` | — | |
| Impressions count | `[data-testid="impressions"]` | — | |

---

## Follow / Unfollow

| Element | Primary Selector | Fallback Selector(s) | Notes |
|---------|-----------------|----------------------|-------|
| Follow button | `[data-testid$="-follow"]` | `button[aria-label*="Follow @"]` | Suffix match — username prefix varies |
| Unfollow button | `[data-testid$="-unfollow"]` | `button[aria-label*="Following @"]` | Suffix match |
| Unblock button | `[data-testid$="-unblock"]` | — | Suffix match |
| Unmute button | `[data-testid$="-unmute"]` | `button[aria-label*="Unmute"]` | Suffix match |
| Placement button | `[data-testid="placementTracking"] [role="button"]` | — | Follow/Unblock variant in placements |

---

## Compose / Post Creation

| Element | Primary Selector | Fallback Selector(s) | Notes |
|---------|-----------------|----------------------|-------|
| Compose tweet button | `a[data-testid="SideNav_NewTweet_Button"]` | `[data-testid="SideNav_NewTweet_Button"]` | Sidebar compose button |
| Tweet textarea (first) | `[data-testid="tweetTextarea_0"]` | `[role="textbox"][data-testid]`, `div[contenteditable="true"][role="textbox"]` | |
| Tweet textarea (any) | `[data-testid^="tweetTextarea_"]` | — | Prefix match for threads |
| Tweet textarea (nth) | `[data-testid="tweetTextarea_${i}"]` | — | Dynamic by index |
| Post/Tweet button | `[data-testid="tweetButton"]` | `button[data-testid*="tweet"]` | |
| Inline tweet button | `[data-testid="tweetButtonInline"]` | — | |
| Add thread "+" | `[data-testid="addButton"]` | — | |
| Media file input | `[data-testid="fileInput"]` | `input[data-testid="fileInput"]` | |
| Image file input | `input[data-testid="fileInput"][accept*="image"]` | — | |
| Alt text input | `[data-testid="altTextInput"]` | — | |
| Edit tweet | `[data-testid="editTweet"]` | — | Premium feature |
| Delete tweet | `[data-testid="deleteTweet"]` | — | |
| Quote tweet option | `[data-testid="quoteTweet"]` | — | In retweet menu |
| Contenteditable textbox | `div[contenteditable="true"][role="textbox"]` | — | Generic fallback |

---

## Compose Toolbar

| Element | Primary Selector | Fallback Selector(s) | Notes |
|---------|-----------------|----------------------|-------|
| Add poll | `[aria-label="Add poll"]` | `[data-testid="pollButton"]` | |
| Add GIF | `[aria-label="Add a GIF"]` | `[data-testid="gifyButton"]` | Note typo: `gifyButton` |
| Add emoji | `[aria-label="Add emoji"]` | `[data-testid="emojiButton"]` | |
| Location button | `[data-testid="geoButton"]` | — | |

---

## Scheduling

| Element | Primary Selector | Fallback Selector(s) | Notes |
|---------|-----------------|----------------------|-------|
| Schedule option | `[data-testid="scheduleOption"]` | `[data-testid="scheduledButton"]` | |
| Date field | `[data-testid="scheduledDateField"]` | `[data-testid="scheduleDateInput"]` | Two known variants |
| Time field | `[data-testid="scheduledTimeField"]` | `[data-testid="scheduleTimeInput"]` | Two known variants |
| Schedule confirm | `[data-testid="scheduleConfirm"]` | `[data-testid="scheduledConfirmationPrimaryAction"]` | |

---

## Poll Elements

| Element | Primary Selector | Notes |
|---------|-----------------|-------|
| Poll option inputs | `[data-testid="pollOption_0"]` through `[data-testid="pollOption_3"]` | 0-indexed, max 4 |
| Poll text inputs (variant) | `[data-testid="pollOptionTextInput_0"]` through `[data-testid="pollOptionTextInput_3"]` | Alternate testid |
| Add poll option | `[data-testid="addPollOption"]` | `[data-testid="addPollOptionButton"]` variant |
| Poll duration | `[data-testid="pollDuration"]` | |
| Duration days | `[data-testid="pollDurationDays"]` | |
| Duration hours | `[data-testid="pollDurationHours"]` | |
| Duration minutes | `[data-testid="pollDurationMinutes"]` | |
| Remove poll | `[data-testid="removePoll"]` | |
| Poll results | `[data-testid="pollResults"]` | |
| Poll percentage | `[data-testid="pollPercentage"]` | |
| Poll total votes | `[data-testid="pollTotalVotes"]` | |
| Poll time remaining | `[data-testid="pollTimeRemaining"]` | |
| Radio option | `[role="radio"]` | Used in polls and settings |
| Poll group | `[role="group"]` | Container for poll options |

---

## Profile Editing

| Element | Primary Selector | Notes |
|---------|-----------------|-------|
| Edit profile button | `[data-testid="editProfileButton"]` | |
| Save profile | `[data-testid="Profile_Save_Button"]` | |
| Edit avatar | `[data-testid="editProfileAvatar"]` | |
| Edit header | `[data-testid="editProfileHeader"]` | |
| Add avatar button | `[data-testid="addAvatarButton"]` | |
| Add banner button | `[data-testid="addBannerButton"]` | |
| Cancel button | `[data-testid="cancelButton"]` | |
| Sort by latest | `[data-testid="sortByLatest"]` | |
| Sort by liked | `[data-testid="sortByLiked"]` | |

---

## Navigation / Layout

| Element | Primary Selector | Fallback Selector(s) | Notes |
|---------|-----------------|----------------------|-------|
| Back button | `[data-testid="app-bar-back"]` | `button[aria-label="Back"]` | |
| Primary column | `[data-testid="primaryColumn"]` | — | Main content area |
| Sidebar column | `[data-testid="sidebarColumn"]` | — | Right sidebar |
| Timeline section | `section[role="region"]` | — | |
| Tab list | `[role="tablist"]` | — | |
| Individual tab | `[role="tab"]` | — | |
| Active tab | `[role="tab"][aria-selected="true"]` | — | |
| Main content | `[role="main"]` | — | |
| Account switcher | `[data-testid="SideNav_AccountSwitcher_Button"]` | — | |
| Sidebar avatar | `div[data-testid="SideNav_AccountSwitcher_Button"] img` | — | |
| Cell inner div | `[data-testid="cellInnerDiv"]` | — | Generic scrollable cell |

---

## Search / Explore

| Element | Primary Selector | Fallback Selector(s) | Notes |
|---------|-----------------|----------------------|-------|
| Search input | `[data-testid="SearchBox_Search_Input"]` | — | |
| Typeahead result | `[data-testid="TypeaheadListItem"]` | — | Autocomplete suggestions |
| Typeahead user | `[data-testid="TypeaheadUser"]` | — | User in autocomplete |
| Trend item | `[data-testid="trend"]` | `[data-testid="trendItem"]` | Two known variants |
| Follow topic | `[data-testid="TopicFollow"]` | — | |

---

## Direct Messages

| Element | Primary Selector | Fallback Selector(s) | Notes |
|---------|-----------------|----------------------|-------|
| New DM button | `[data-testid="NewDM_Button"]` | — | |
| Search people | `[data-testid="searchPeople"]` | — | DM people search |
| DM message input | `[data-testid="dmComposerTextInput"]` | `[role="textbox"][data-testid*="dm"]` | |
| DM send button | `[data-testid="dmComposerSendButton"]` | `button[data-testid*="send"]` | |
| Conversation item | `[data-testid="conversation"]` | — | In DM list |
| Message bubble | `[data-testid="messageEntry"]` | — | Individual message |
| Last message preview | `[data-testid="lastMessage"]` | — | |
| Unread indicator | `[data-testid="unread"]` | — | |
| Message reaction | `[data-testid="messageReaction"]` | — | |
| Message requests tab | `[data-testid="messageRequests"]` | — | |
| Accept request | `[data-testid="acceptRequest"]` | — | |
| Delete request | `[data-testid="deleteRequest"]` | — | |
| Next button | `[data-testid="nextButton"]` | — | "Next" in DM compose flow |
| DM scroller | `[data-testid="DmScrollerContainer"]` | — | Scrollable message container |
| DM conversation | `[data-testid="DMConversation"]` | — | |
| DM drawer/inbox | `[data-testid="DMDrawer"]` | — | |
| DM conversation info | `[data-testid="DMConversationInfoButton"]` | — | |
| DM image button | `[data-testid="DMImageButton"]` | — | |
| DM GIF button | `[data-testid="DMGifButton"]` | — | |
| GIF result | `[data-testid="gif"]` | — | |
| Reaction emoji | `[data-testid="reactionEmoji"]` | — | |

---

## Block / Mute / Report

| Element | Primary Selector | Fallback Selector(s) | Notes |
|---------|-----------------|----------------------|-------|
| Block option | `[data-testid="block"]` | `[role="menuitem"] span:has-text("Block")` | In dropdown menu |
| Mute link | `[data-testid="muteLink"]` | `[role="menuitem"] span:has-text("Mute")` | |
| Mute option | `[data-testid="mute"]` | — | Variant testid |
| Unmute option | `[data-testid="unmute"]` | — | |
| Report option | `[data-testid="report"]` | `[role="menuitem"] span:has-text("Report")` | |
| Add muted word | `[data-testid="addMutedWord"]` | — | |
| Muted word input | `[data-testid="mutedWordInput"]` | — | |
| Save muted word | `[data-testid="saveMutedWord"]` | — | |
| Report flow next | `[data-testid="ChoiceSelectionNextButton"]` | — | Report wizard |

---

## Notifications

| Element | Primary Selector | Notes |
|---------|-----------------|-------|
| Notification item | `[data-testid="notification"]` | |
| Notification text | `[data-testid="notification"] span` | |
| Settings toggle | `[data-testid="settingsSwitch"]` | |

---

## Bookmarks

| Element | Primary Selector | Fallback Selector(s) | Notes |
|---------|-----------------|----------------------|-------|
| Clear bookmarks | `[data-testid="clearBookmarks"]` | `[data-testid="clearAllBookmarks"]` | Two known variants |
| Bookmark folder | `[data-testid="bookmarkFolder"]` | — | |
| Create folder | `[data-testid="createBookmarkFolder"]` | — | |
| Confirm folder | `[data-testid="createFolderConfirm"]` | — | |
| More options | `[aria-label="More"]` | — | Shared with other contexts |

---

## Lists

| Element | Primary Selector | Notes |
|---------|-----------------|-------|
| Create list | `[data-testid="createList"]` | |
| List name input | `[data-testid="listNameInput"]` | |
| List description input | `[data-testid="listDescriptionInput"]` | |
| Private toggle | `[data-testid="listPrivateToggle"]` | |
| Save list | `[data-testid="listSaveButton"]` | |
| Add members | `[data-testid="addMembers"]` | |
| List container | `[data-testid="list"]` | |
| List item | `[data-testid="listItem"]` | |
| List description | `[data-testid="listDescription"]` | |
| Member count | `[data-testid="memberCount"]` | |
| Done/save assignment | `[data-testid="addToListsButton"]` | |
| Checkbox (list select) | `[role="checkbox"]` | |
| List links | `a[href*="/lists/"]` | |
| List heading | `h2[role="heading"]` | |

---

## Communities

| Element | Primary Selector | Notes |
|---------|-----------------|-------|
| Joined/leave button | `button[aria-label^="Joined"]` | Prefix match |
| Join button | `button[aria-label^="Join"]` | Prefix match |
| Pending request | `button[aria-label^="Pending"]` | Prefix match |
| Communities nav | `a[aria-label="Communities"]` | Sidebar navigation link |
| Community links | `a[href^="/i/communities/"]` | |
| Join community button | `button[data-testid="join"]` | |
| Community card | `div[data-testid="communityCard"]` | `[data-testid="CommunityCard"]` variant |
| Community header | `[data-testid="communityHeader"]` | |

---

## Spaces / Live Audio

| Element | Primary Selector | Notes |
|---------|-----------------|-------|
| Start Space button | `[data-testid="SpaceButton"]` | |
| Join Space | `[data-testid="joinSpace"]` | |
| Speaker list | `[data-testid="spaceSpeakers"]` | |
| Listener count | `[data-testid="spaceListeners"]` | |
| Recording indicator | `[data-testid="spaceRecording"]` | |
| Schedule Space | `[data-testid="scheduleSpace"]` | |
| Space topic | `[data-testid="spaceTopic"]` | |
| Space title | `[data-testid="spaceTitle"]` | |
| Space host | `[data-testid="spaceHost"]` | |
| Space card | `[data-testid="SpaceCard"]` | `[data-testid="space"]` variant |
| Scheduled Space | `[data-testid="scheduledSpace"]` | |
| Individual speaker | `[data-testid="spaceSpeaker"]` | |
| Live indicator | `[data-testid="spaceLive"]` | |
| Space bar | `[data-testid="SpaceBar"]` | |
| Space links | `a[href*="/i/spaces/"]` | |
| Space card media | `[data-testid="card.layoutLarge.media"]` | |

---

## Grok AI

| Element | Primary Selector | Fallback Selector(s) | Notes |
|---------|-----------------|----------------------|-------|
| Grok chat input | `[data-testid="grokInput"]` | `textarea[placeholder*="Ask"]`, `[contenteditable][role="textbox"]` | |
| Grok send button | `[data-testid="grokSendButton"]` | `button[aria-label="Send"]`, `button[data-testid*="send"]` | |
| Grok response area | `[data-testid="grokResponse"]` | `[data-testid="grokResponseText"]` | |
| Grok response text | `[data-testid="grokResponseText"]` | — | |
| New chat button | `[data-testid="grokNewChat"]` | `a[href="/i/grok"]` | |
| Grok image gen | `[data-testid="grokImageGen"]` | — | |
| Chat history | `[data-testid="grokChatHistory"]` | — | |
| Any Grok element | `[data-testid*="grok"]` | — | Wildcard match |

---

## Articles / Longform

| Element | Primary Selector | Fallback Selector(s) | Notes |
|---------|-----------------|----------------------|-------|
| Article title input | `[data-testid="articleTitle"]` | `h1[contenteditable]`, `[contenteditable][aria-label*="title" i]` | |
| Article body editor | `[data-testid="articleBody"]` | `[data-testid="richTextEditor"]`, `[contenteditable][role="textbox"]` | |
| Publish button | `[data-testid="articlePublish"]` | — | |
| Save draft | `[data-testid="articleSaveDraft"]` | — | |
| Cover image | `[data-testid="articleCoverImage"]` | — | |
| Article list | `[data-testid="articleList"]` | — | |
| Article card | `[data-testid="articleCard"]` | — | |
| Article preview | `[data-testid="articlePreview"]` | — | |

---

## Creator Studio / Monetization

| Element | Primary Selector | Notes |
|---------|-----------------|-------|
| Engagements stat | `[data-testid="engagements"]` | |
| Followers chart | `[data-testid="followersChart"]` | |
| Revenue tab | `[data-testid="revenueTab"]` | |
| Subscription settings | `[data-testid="subscriptionSettings"]` | |
| Tips settings | `[data-testid="tipsSettings"]` | |
| Export analytics | `[data-testid="exportAnalytics"]` | |
| Analytics card | `[data-testid="analyticsCard"]` | |
| Stat elements | `[data-testid*="stat"]` | Wildcard match |
| Metric elements | `[data-testid*="metric"]` | Wildcard match |
| Subscription info | `[data-testid="subscriptionInfo"]` | |
| List item (stats) | `[role="listitem"]` | |

---

## Settings / Privacy

| Element | Primary Selector | Notes |
|---------|-----------------|-------|
| Toggle switch | `[role="switch"]` | |
| Protected tweets | `[data-testid="protectedTweets"]` | |
| Settings save | `[data-testid="settingsSave"]` | |
| Request data | `[data-testid="requestData"]` | |
| Settings links | `a[href^="/settings/"]` | |
| Option element | `[role="option"]` | |

---

## Dialogs / Confirmations

| Element | Primary Selector | Fallback Selector(s) | Notes |
|---------|-----------------|----------------------|-------|
| Confirm button | `[data-testid="confirmationSheetConfirm"]` | `[role="alertdialog"] button:nth-child(1)` | Unfollow, block, delete confirmations |
| Cancel button | `[data-testid="confirmationSheetCancel"]` | `[role="alertdialog"] button:last-child` | |
| Modal container | `[data-testid="modal"]` | — | |
| Sheet dialog | `[data-testid="sheetDialog"]` | — | |
| Toast notification | `[data-testid="toast"]` | — | |
| Alert element | `[role="alert"]` | — | |
| Dropdown menu | `[data-testid="Dropdown"]` | — | |
| Menu item | `[role="menuitem"]` | — | Items inside dropdown menus |

---

## Generic / Utility

Selectors used across many contexts as fallbacks or for text extraction.

| Element | Primary Selector | Notes |
|---------|-----------------|-------|
| LTR text span | `[dir="ltr"] > span` | Display names, counts |
| LTR span (variant) | `[dir="ltr"] span` | Less specific |
| LTR element | `[dir="ltr"]` | Generic LTR container |
| Auto-dir (no testid) | `[dir="auto"]:not([data-testid])` | Bio/description fallback |
| Auto-dir (no role) | `[dir="auto"]:not([role])` | Bio/description fallback |
| Auto-dir generic | `[dir="auto"]` | Any auto-direction text |
| Internal link | `a[href^="/"]` | Any link within X |
| Internal link w/ role | `a[href^="/"][role="link"]` | |
| Status permalink | `a[href*="/status/"]` | Tweet links |
| Analytics link | `a[href*="/analytics"]` | |
| Likes tab | `a[href$="/likes"]` | |
| External links | `a[href*="t.co"]` | Shortened URLs |
| Premium link | `a[href*="premium"]` | |
| Follow-related links | `a[href*="/follow"]` | |
| Media images | `img[src*="media"]` | |
| Video elements | `video` | |
| SVG with testid | `svg[data-testid]` | |
| Heading element | `[role="heading"]` | |
| Generic send button | `button[aria-label="Send"]` | |

---

## Common Pitfalls

### Case Sensitivity

`data-testid` values are **CASE-SENSITIVE**:
- ✅ `UserDescription` (capital U, capital D)
- ❌ `userdescription`
- ✅ `User-Name` (capital U, capital N, with hyphen)
- ❌ `user-name`
- ⚠️ `UserName` on profile pages vs `User-Name` in tweets — they are **different selectors**

### Suffix Matchers for Follow/Unfollow

Follow/unfollow buttons include a username prefix in their `data-testid`:
```
data-testid="nichxbt-follow"
data-testid="nichxbt-unfollow"
```
Always use the **suffix match** (`$=`):
```javascript
// ✅ Correct
document.querySelector('[data-testid$="-follow"]');

// ❌ Wrong — won't match
document.querySelector('[data-testid="follow"]');
```

### Bio vs Display Name in UserCells

Multiple `[dir="auto"]` elements exist inside a `UserCell`. To find the bio:
```javascript
// ✅ Best approach — use data-testid
cell.querySelector('[data-testid="UserDescription"]');

// ⚠️ Fallback — filter out elements inside links
const bioEl = [...cell.querySelectorAll('[dir="auto"]')]
  .filter(el => !el.closest('a') && !el.closest('[data-testid="User-Name"]'))
  .pop();
```

### Navigation Breaks Scripts

Browser console scripts **stop when the page navigates**. Use `sessionStorage` to persist state:
```javascript
const getProcessed = () => {
  try { return JSON.parse(sessionStorage.getItem('xactions_key') || '[]'); }
  catch { return []; }
};
```

### Confirmation Dialogs Are Required

Many destructive actions pop up a confirmation dialog. Always wait for and click it:
```javascript
await sleep(500);
const confirm = document.querySelector('[data-testid="confirmationSheetConfirm"]');
if (confirm) confirm.click();
```

### Promoted Content Filtering

Filter out ads before processing tweets:
```javascript
const isAd = tweet.closest('[data-testid="placementTracking"]');
if (isAd) continue;
```

### Rate Limiting

Add delays **between actions** (1–3 seconds minimum). X will temporarily restrict your account if you bulk-act too fast.

### DOM Changes

X/Twitter frequently updates their DOM. If a selector stops working:
1. Check the browser DevTools for the current `data-testid`
2. Look for `aria-label` alternatives
3. Fall back to structural selectors (`role`, tag hierarchy)
4. Update this document

---

## Selector Architecture

The XActions codebase uses a **fallback chain pattern** for resilient selector matching.

### Canonical Source Files

| File | Purpose | Selector Count |
|------|---------|----------------|
| `src/utils/core.js` | Primary fallback-chain registry | ~29 keys |
| `src/automation/actions.js` | Action-oriented selectors | ~40+ keys |
| `src/automation/core.js` | Core automation selectors | ~20+ keys |
| `extension/content/injected.js` | Browser extension selectors | ~15 keys |

### Fallback Chain Pattern

```javascript
// From src/utils/core.js — the canonical pattern
const SELECTORS = {
  tweet: [
    'article[data-testid="tweet"]',       // Primary: data-testid
    'article[role="article"]',             // Fallback 1: role
    '[data-testid="cellInnerDiv"] article' // Fallback 2: structural
  ],
  tweetText: [
    '[data-testid="tweetText"]',   // Primary
    '[lang][dir] span',            // Fallback 1
    'article span[dir="auto"]'     // Fallback 2
  ]
};
```

When writing new selectors:
1. **Primary**: Use `data-testid` when available
2. **Fallback 1**: Use `aria-label` or `role` attributes
3. **Fallback 2**: Use structural/positional selectors as last resort
4. **Always** add new selectors to this document

---

> **Contributing:** When you discover a new selector or a changed one, update this file and the `SELECTORS` object in `src/utils/core.js`. Keep this document as the single source of truth.
