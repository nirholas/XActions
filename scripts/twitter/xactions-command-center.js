// Copyright (c) 2024-2026 nich (@nichxbt). All rights reserved.
/**
 * ============================================================
 * ⚡ XActions Command Center  (v1.0.0)
 * ============================================================
 * The one script to run them all. Paste this into your browser's DevTools
 * console on x.com and a searchable command palette appears with every
 * XActions tool (68 of them): scrape, analyze, grow, engage,
 * clean up, moderate, and more. Pick a tool, set its options, press Run.
 *
 *   1. Open x.com and press F12 (or Cmd+Option+I) → Console tab.
 *   2. Paste this entire file and press Enter.
 *   3. Search, choose a tool, and click Run. Reopen anytime with the
 *      ⚡ button (bottom-right) or Cmd/Ctrl+K.
 *
 * @name        XActions Command Center
 * @description One console script that opens a searchable menu of every XActions tool (scrape, analyze, grow, engage, clean up, and moderate) with per-tool options and one-click run.
 * @version     1.0.0
 * @author      nichxbt (https://x.com/nichxbt)
 *
 * GENERATED FILE. Do not edit by hand. Source: scripts/twitter/_command-center-shell.js
 * + scripts/build-toolkit.mjs. Regenerate with: node scripts/build-toolkit.mjs
 * @repository https://github.com/nirholas/XActions
 */
/*
 * ============================================================
 * SOURCE SHELL for xactions-command-center.js  (do not paste this file)
 * ============================================================
 * This is the UI shell for the XActions Command Center. It is NOT the
 * script users run. `scripts/build-toolkit.mjs` injects the tool catalog
 * and every bundled tool at the __XA_INJECT_DATA__ marker below and writes
 * the runnable result to scripts/twitter/xactions-command-center.js.
 *
 * To change the launcher UI, edit THIS file, then run:
 *   node scripts/build-toolkit.mjs
 *
 * The injected data provides three bindings this shell relies on:
 *   CATALOG     - array of tool metadata { id, title, emoji, category,
 *                 danger, desc, where, defaults, stopGlobal }
 *   CATEGORIES  - ordered array of { id, label, emoji }
 *   TOOLS       - object mapping tool id -> function that runs the tool
 */

(function xactionsCommandCenter() {
  // Intentionally NOT in strict mode: bundled tools are pasted verbatim and
  // some rely on sloppy-mode semantics exactly as they do when run standalone.

  // Re-pasting the script replaces any live instance cleanly.
  if (window.XActionsCommandCenter && typeof window.XActionsCommandCenter.destroy === 'function') {
    try { window.XActionsCommandCenter.destroy(); } catch (e) { /* ignore */ }
  }

  const CATALOG = [{"id":"backup-account","title":"Account Backup","emoji":"💾","category":"scrape","danger":"safe","desc":"Make a comprehensive backup of your account data.","where":{"label":"Your own profile page"},"defaults":{"maxTweets":100,"maxLikes":100,"maxBookmarks":100,"maxFollowing":500,"maxFollowers":500,"scrollDelay":2000,"autoDownload":true},"stopGlobal":null},{"id":"bookmark-exporter","title":"Bookmark Exporter","emoji":"🔖","category":"scrape","danger":"safe","desc":"Export all of your bookmarks to JSON and CSV.","where":{"label":"Your Bookmarks","url":"https://x.com/i/bookmarks","match":["^/i/bookmarks"]},"defaults":{"maxBookmarks":1000,"scrollDelay":1500,"maxScrolls":200,"maxRetries":5,"exportJSON":true,"exportCSV":true,"copyToClipboard":true},"stopGlobal":null},{"id":"link-scraper","title":"Link Scraper","emoji":"🔗","category":"scrape","danger":"safe","desc":"Extract every external link a user has shared.","where":{"label":"The profile you want to target (x.com/username)"},"defaults":{"maxScrolls":100,"maxTweets":500,"scrollDelay":1500,"includeTwitterLinks":false,"includeMedia":false,"excludeDomains":["t.co"],"autoDownload":true,"maxRetries":5},"stopGlobal":null},{"id":"scrape-profile-with-replies","title":"Scrape Posts + Replies","emoji":"🧵","category":"scrape","danger":"safe","desc":"Scrape a profile including its replies, from the With replies tab.","where":{"label":"The profile you want to target (x.com/username)"},"defaults":{"targetPostCount":50,"maxRepliesPerPost":50,"maxFeedScrollAttempts":200,"maxThreadScrollAttempts":30,"scrollDelay":2000,"navigationDelay":3000,"range":{"startPostId":null,"endPostId":null},"filters":{"whitelist":[],"blacklist":[],"daysBack":0,"minLikes":0,"minRetweets":0,"excludeRetweets":false},"export":{"json":true,"csv":true,"markdown":false,"text":false,"html":false},"panel":{"enabled":true,"top":20,"right":20},"copyToClipboard":true,"verbose":true,"scrapeRepliesOnUserReplies":true},"stopGlobal":null},{"id":"scrape-profile-posts","title":"Scrape Profile Posts","emoji":"📜","category":"scrape","danger":"safe","desc":"Scrape every post from any profile with filters, analytics, and JSON/CSV/MD exports.","where":{"label":"The profile you want to target (x.com/username)"},"defaults":{"targetCount":300,"maxScrollAttempts":300,"scrollDelay":2000,"filters":{"whitelist":[],"blacklist":[],"daysBack":0,"minLikes":0,"minRetweets":0,"excludeRetweets":false,"excludeReplies":false,"mediaFilter":"all"},"export":{"json":true,"csv":true,"markdown":false,"text":false,"html":false},"display":{"showStats":true,"showTopPosts":5,"showHashtags":true,"showMentions":true,"showLinks":false,"prettyPrint":true,"prettyPrintLimit":10},"copyToClipboard":true,"verbose":true},"stopGlobal":null},{"id":"scraper-toolbox","title":"Scraper Toolbox","emoji":"🧰","category":"scrape","danger":"safe","desc":"Full on-page scraping control panel: start/pause/stop, live filters, one-click exports.","where":{"label":"Any X page"},"defaults":{},"stopGlobal":null},{"id":"thread-unroller","title":"Thread Unroller","emoji":"🪡","category":"scrape","danger":"safe","desc":"Save any thread as clean text, markdown, or JSON.","where":{"label":"The open tweet/thread (its status page)","match":["/status/"]},"defaults":{"format":"markdown","includeMedia":true,"includeStats":true,"maxTweets":50,"scrollDelay":1500,"autoDownload":true,"copyToClipboard":true},"stopGlobal":null},{"id":"video-downloader","title":"Video Downloader","emoji":"🎬","category":"scrape","danger":"safe","desc":"Download the video from any post, at your chosen quality.","where":{"label":"The open tweet/thread (its status page)","match":["/status/"]},"defaults":{"quality":"highest","autoDownload":true,"showAllQualities":true},"stopGlobal":null},{"id":"viral-tweets-scraper","title":"Viral Tweets Finder","emoji":"🔥","category":"scrape","danger":"safe","desc":"Find the top-performing viral posts from a search or any account.","where":{"label":"The profile you want to target (x.com/username)"},"defaults":{"minLikes":50,"minRetweets":5,"minReplies":0,"maxTweets":100,"maxScrolls":50,"sortBy":"likes","scrollDelay":1500,"maxRetries":5,"exportJSON":true,"exportCSV":true},"stopGlobal":null},{"id":"monitor-account","title":"Account Monitor","emoji":"👀","category":"analyze","danger":"safe","desc":"Track follower/following changes on any public account.","where":{"label":"The profile you want to target (x.com/username)"},"defaults":{"scrollDelay":2000,"maxScrolls":100,"maxRetries":5,"autoDownload":true},"stopGlobal":null},{"id":"best-time-to-post","title":"Best Time to Post","emoji":"⏰","category":"analyze","danger":"safe","desc":"Find when your audience is most active.","where":{"label":"Your own profile page"},"defaults":{"maxPosts":100,"scrollDelay":1500,"maxScrolls":50,"maxRetries":3},"stopGlobal":null},{"id":"competitor-analysis","title":"Competitor Analysis","emoji":"🕵️","category":"analyze","danger":"safe","desc":"Analyze a competitor account for content and engagement insights.","where":{"label":"The profile you want to target (x.com/username)"},"defaults":{"maxPosts":50,"scrollDelay":1500,"maxScrolls":30,"maxRetries":3},"stopGlobal":null},{"id":"continuous-monitor","title":"Continuous Monitor","emoji":"🔄","category":"analyze","danger":"safe","desc":"Auto-refresh watch with browser notifications on follower changes.","where":{"label":"Your own profile page"},"defaults":{"checkIntervalMinutes":5,"enableNotifications":true,"enableSound":true,"scrollDelay":1500,"maxScrolls":50,"maxRetries":3},"stopGlobal":"stopMonitor"},{"id":"engagement-analytics","title":"Engagement Analytics","emoji":"📈","category":"analyze","danger":"safe","desc":"Break down likes, replies, and reposts across your posts.","where":{"label":"Your own profile page"},"defaults":{"maxPosts":50,"scrollDelay":1500,"maxScrolls":30,"maxRetries":3},"stopGlobal":null},{"id":"find-fake-followers","title":"Fake Follower Finder","emoji":"🤖","category":"analyze","danger":"safe","desc":"Identify likely bot/fake accounts in your audience.","where":{"label":"Your Followers page (x.com/<you>/followers)","match":["/followers"]},"defaults":{"scrollDelay":1500,"maxScrolls":50,"maxRetries":3,"scoring":{"highFollowingRatio":25,"veryHighFollowingRatio":40,"defaultAvatar":20,"noBio":15,"suspiciousBio":25,"randomUsername":15,"massFollowing":15,"extremeFollowing":25,"noFollowers":20,"veryFewFollowers":10},"thresholds":{"highRatio":50,"veryHighRatio":100,"massFollowing":3000,"extremeFollowing":5000},"suspiciousKeywords":["crypto","nft","bitcoin","btc","eth","forex","trading signals","giveaway","airdrop","free money","passive income","onlyfans","fansly","dm for","link in bio","check bio","follow back","f4f","follow4follow","followback","18+","adult","nsfw","sexy","hot girl","make money","work from home","get rich","financial freedom","investment opportunity","guaranteed returns"],"minFakeScore":40,"likelyFakeScore":60},"stopGlobal":null},{"id":"audit-followers","title":"Follower Audit","emoji":"🔍","category":"analyze","danger":"safe","desc":"Score follower quality and surface likely fakes and inactives.","where":{"label":"Your Followers page (x.com/<you>/followers)","match":["/followers"]},"defaults":{"scrollDelay":1500,"maxScrolls":100,"maxRetries":5,"thresholds":{"influencer":10,"balanced":0.5,"aggressive":0.1,"massFollower":2000,"selectiveFollower":100}},"stopGlobal":null},{"id":"followers-growth-tracker","title":"Growth Tracker","emoji":"📉","category":"analyze","danger":"safe","desc":"Track follower growth over time with saved history.","where":{"label":"Your own profile page"},"defaults":{"storageKey":"xactions_growth_tracker","maxHistory":365,"showChart":true},"stopGlobal":null},{"id":"hashtag-analytics","title":"Hashtag Analytics","emoji":"#️⃣","category":"analyze","danger":"safe","desc":"Measure how your hashtags perform.","where":{"label":"Your own profile page"},"defaults":{"maxPosts":100,"scrollDelay":1500,"maxScrolls":50,"maxRetries":3},"stopGlobal":null},{"id":"new-followers-alert","title":"New Follower Alerts","emoji":"🔔","category":"analyze","danger":"safe","desc":"Track new followers with optional welcome-message templates.","where":{"label":"Your Followers page (x.com/<you>/followers)","match":["/followers"]},"defaults":{"scrollDelay":2000,"maxScrolls":100,"maxRetries":5,"welcomeMessages":["Hey {name}! Thanks for the follow! 🙏 Glad to connect!","Welcome {name}! 👋 Thanks for following! What brings you here?","Hey {name}! Appreciate the follow! Looking forward to connecting! 🚀","Thanks for following {name}! Always great to meet new people! ✨"],"autoDownload":true},"stopGlobal":null},{"id":"profile-stats","title":"Profile Stats","emoji":"📊","category":"analyze","danger":"safe","desc":"Get a quick, comprehensive stats card for any profile.","where":{"label":"The profile you want to target (x.com/username)"},"defaults":{},"stopGlobal":null},{"id":"detect-unfollowers","title":"Unfollower Detector","emoji":"💔","category":"analyze","danger":"safe","desc":"Compare against a saved snapshot to see who unfollowed you.","where":{"label":"Your Followers page (x.com/<you>/followers)","match":["/followers"]},"defaults":{"scrollDelay":2000,"maxScrolls":100,"maxRetries":5,"autoDownload":true,"storageKey":"xactions_my_followers"},"stopGlobal":null},{"id":"follow-engagers","title":"Follow Engagers","emoji":"🧲","category":"grow","danger":"caution","desc":"Follow the people who liked or reposted a specific tweet.","where":{"label":"The open tweet/thread (its status page)","match":["/status/"]},"defaults":{"mode":"likers","maxFollows":20,"filters":{"minFollowers":100,"maxFollowers":50000,"skipProtected":true,"skipVerified":false},"minDelay":2000,"maxDelay":4000,"scrollDelay":1500},"stopGlobal":null},{"id":"follow-target-users","title":"Follow Target Audience","emoji":"🎯","category":"grow","danger":"caution","desc":"Follow the followers/following of accounts you specify.","where":{"label":"The profile you want to target (x.com/username)"},"defaults":{"maxFollows":30,"maxScrolls":50,"filters":{"skipProtected":true,"skipVerified":false,"bioKeywords":[],"bioBlacklist":["bot","spam","promo"]},"minDelay":2000,"maxDelay":4000,"scrollDelay":1500},"stopGlobal":null},{"id":"growth-suite","title":"Growth Suite","emoji":"🚀","category":"grow","danger":"caution","desc":"All-in-one growth: auto-like, auto-follow, and smart-unfollow together.","where":{"label":"Any X page"},"defaults":{"keywords":["web3 developer","crypto trader","NFT artist"],"targetAccounts":[],"actions":{"follow":true,"like":true,"unfollow":true},"limits":{"follows":20,"likes":30,"unfollows":15},"timing":{"unfollowAfterDays":3,"delayBetweenActions":3000,"sessionDuration":30},"filters":{"minFollowers":50,"maxFollowers":50000,"mustHaveBio":true,"skipPrivate":true,"language":null}},"stopGlobal":null},{"id":"keyword-follow","title":"Keyword Follow","emoji":"🔑","category":"grow","danger":"caution","desc":"Follow users matching a keyword search, with bio filters.","where":{"label":"Search → People tab (x.com/search?...&f=user)","match":["^/search.*f=user","^/search"]},"defaults":{"maxFollows":20,"maxScrolls":30,"filters":{"skipProtected":true,"skipMutuals":false,"skipVerified":false,"bioMustContain":[],"bioBlacklist":["bot","automated","promo","giveaway"]},"trackFollows":true,"minDelay":2000,"maxDelay":5000,"scrollDelay":2000},"stopGlobal":null},{"id":"auto-commenter","title":"Auto Commenter","emoji":"💬","category":"engage","danger":"caution","desc":"Comment on a target user's posts with your templates.","where":{"label":"The profile you want to target (x.com/username)"},"defaults":{"comments":["🔥","Great point!","This is so true 👏","Interesting perspective!","Thanks for sharing this 🙏","💯","Well said!","Couldn't agree more","👀 interesting","This is gold ✨"],"maxComments":5,"maxPostAgeMinutes":60,"minPostAgeSeconds":30,"onlyOriginalTweets":true,"onlyWithMedia":false,"minDelay":30000,"maxDelay":60000,"scrollDelay":2000},"stopGlobal":null},{"id":"auto-liker","title":"Auto Liker","emoji":"❤️","category":"engage","danger":"caution","desc":"Like posts in a timeline or on a profile, at a human pace.","where":{"label":"The profile you want to target (x.com/username)"},"defaults":{"likeAll":false,"keywords":["web3","crypto","AI","startup"],"fromUsers":[],"maxLikes":20,"maxScrolls":50,"alsoRetweet":false,"skipReplies":true,"skipAds":true,"minDelay":2000,"maxDelay":5000,"scrollDelay":2000},"stopGlobal":null},{"id":"comment-by-hashtag","title":"Comment by Hashtag","emoji":"🗨️","category":"engage","danger":"caution","desc":"Find hashtag posts and comment with your templates.","where":{"label":"Search → Latest tab (x.com/search?...&f=live)","match":["^/search"]},"defaults":{"hashtags":["web3","crypto","NFT"],"comments":["Great point! 🔥","This is so true! 💯","Interesting perspective!","Thanks for sharing this! 🙌","Couldn't agree more!"],"maxComments":10,"minDelay":3000,"maxDelay":6000,"skipUsernames":[],"minLikes":0,"minRetweets":0},"stopGlobal":null},{"id":"comment-by-location","title":"Comment by Location","emoji":"📍","category":"engage","danger":"caution","desc":"Find posts from a location and comment on them.","where":{"label":"Search → Latest tab (x.com/search?...&f=live)","match":["^/search"]},"defaults":{"location":"New York","geocode":null,"searchQuery":"","comments":["Love seeing posts from this area! 🌍","Great content from a great place! 🔥","Thanks for sharing! 💯","Awesome post! 🙌","This is amazing! ✨"],"maxComments":10,"minDelay":3000,"maxDelay":7000,"skipUsernames":[],"maxTweetAge":24,"skipRetweets":true},"stopGlobal":null},{"id":"interact-by-hashtag","title":"Interact by Hashtag","emoji":"#️⃣","category":"engage","danger":"caution","desc":"Like/follow/reply on posts matching a hashtag.","where":{"label":"Search → Latest tab (x.com/search?...&f=live)","match":["^/search"]},"defaults":{"hashtags":["crypto","web3","bitcoin"],"actions":{"like":true,"retweet":false,"follow":true},"limits":{"likes":20,"retweets":5,"follows":10,"tweetsPerHashtag":10},"filters":{"minLikes":5,"minRetweets":0,"skipReplies":true,"skipRetweets":true,"requireMedia":false},"delayBetweenActions":2000,"scrollDelay":2000},"stopGlobal":null},{"id":"interact-by-place","title":"Interact by Place","emoji":"📍","category":"engage","danger":"caution","desc":"Like/follow/reply on posts from a location.","where":{"label":"Search → Latest tab (x.com/search?...&f=live)","match":["^/search"]},"defaults":{"locations":[{"name":"New York","query":"near:\"New York\""},{"name":"San Francisco","query":"near:\"San Francisco\""}],"keywords":[],"actions":{"like":true,"follow":true,"retweet":false},"limits":{"likes":15,"follows":10,"retweets":3},"delayBetweenActions":2000,"scrollDelay":2000},"stopGlobal":null},{"id":"interact-with-likers","title":"Interact with Likers","emoji":"🧲","category":"engage","danger":"caution","desc":"Engage the users who liked a specific post.","where":{"label":"The open tweet/thread (its status page)","match":["/status/"]},"defaults":{"actions":{"follow":true},"limits":{"follows":20},"filters":{"skipPrivate":true,"skipVerified":false,"skipNoPhoto":false},"delayBetweenActions":2000,"scrollDelay":2000},"stopGlobal":null},{"id":"interact-by-users","title":"Interact with Users","emoji":"🎯","category":"engage","danger":"caution","desc":"Full like/follow/reply suite aimed at specific users.","where":{"label":"The profile you want to target (x.com/username)"},"defaults":{"targetUsers":[],"actions":{"like":true,"retweet":false,"reply":false,"follow":true},"limits":{"likesPerUser":3,"retweetsPerUser":1,"repliesPerUser":1},"delayBetweenActions":2000,"delayBetweenUsers":5000,"replyTemplates":["Great point! 🔥","Couldn't agree more 👏","This is gold 💯","Thanks for sharing!"]},"stopGlobal":null},{"id":"like-by-user","title":"Like a User","emoji":"👤","category":"engage","danger":"caution","desc":"Auto-like posts from a specific user's profile.","where":{"label":"The profile you want to target (x.com/username)"},"defaults":{"maxLikes":50,"skipReplies":false,"skipRetweets":true,"skipQuoteTweets":false,"onlyWithMedia":false,"minLikes":0,"minRetweets":0,"minDelay":1500,"maxDelay":3500,"maxScrollAttempts":25,"stopAfterAlreadyLiked":10},"stopGlobal":"stopLikeByUser"},{"id":"like-by-hashtag","title":"Like by Hashtag","emoji":"#️⃣","category":"engage","danger":"caution","desc":"Auto-like posts containing specific hashtags.","where":{"label":"Search → Latest tab (x.com/search?...&f=live)","match":["^/search"]},"defaults":{"hashtags":["javascript","webdev","coding"],"maxLikesPerHashtag":10,"maxTotalLikes":30,"minDelay":2000,"maxDelay":4000,"skipRetweets":true,"skipMediaOnly":false,"maxScrollAttempts":5},"stopGlobal":"stopLikeByHashtag"},{"id":"like-by-location","title":"Like by Location","emoji":"📍","category":"engage","danger":"caution","desc":"Auto-like posts from a geographic area.","where":{"label":"Search → Latest tab (x.com/search?...&f=live)","match":["^/search"]},"defaults":{"location":"San Francisco","radiusMiles":25,"keyword":"","maxLikes":30,"minDelay":2000,"maxDelay":4000,"skipRetweets":true,"skipReplies":false,"maxScrollAttempts":15,"searchType":"live"},"stopGlobal":"stopLikeByLocation"},{"id":"like-by-feed","title":"Like Home Feed","emoji":"🏠","category":"engage","danger":"caution","desc":"Auto-like posts as you scroll your home timeline.","where":{"label":"Your Home timeline","url":"https://x.com/home","match":["^/home"]},"defaults":{"maxLikes":50,"skipReplies":true,"skipAds":true,"skipRetweets":true,"onlyWithMedia":false,"minDelay":1500,"maxDelay":3500,"maxScrollAttempts":20,"noNewTweetsThreshold":5},"stopGlobal":"stopLikeByFeed"},{"id":"like-user-replies","title":"Like Replies","emoji":"↩️","category":"engage","danger":"caution","desc":"Auto-like the replies under a specific post.","where":{"label":"The open tweet/thread (its status page)","match":["/status/"]},"defaults":{"maxLikes":30,"skipNestedReplies":false,"onlyVerified":false,"onlyWithMedia":false,"skipContaining":[],"onlyContaining":[],"minDelay":1500,"maxDelay":3500,"maxScrollAttempts":20,"skipOriginalTweet":true},"stopGlobal":"stopLikeUserReplies"},{"id":"clear-all-bookmarks","title":"Clear All Bookmarks","emoji":"🔖","category":"cleanup","danger":"destructive","desc":"Remove all of your bookmarks.","where":{"label":"Your Bookmarks","url":"https://x.com/i/bookmarks","match":["^/i/bookmarks"]},"defaults":{"maxRemove":0,"removeDelay":1500,"scrollDelay":2000,"maxRetries":5,"confirmStart":true},"stopGlobal":null},{"id":"clear-all-likes","title":"Clear All Likes","emoji":"🗑️","category":"cleanup","danger":"destructive","desc":"Remove all likes from your account.","where":{"label":"Your Likes page (x.com/<you>/likes)","match":["/likes"]},"defaults":{"maxUnlikes":0,"unlikeDelay":1500,"scrollDelay":2000,"maxRetries":5,"confirmStart":true},"stopGlobal":null},{"id":"clear-all-retweets","title":"Clear All Reposts","emoji":"🔁","category":"cleanup","danger":"destructive","desc":"Undo all of your reposts.","where":{"label":"Your own profile page"},"defaults":{"maxUndo":0,"unretweetDelay":2000,"scrollDelay":2500,"maxRetries":5,"confirmStart":true},"stopGlobal":null},{"id":"smart-unfollow","title":"Smart Unfollow","emoji":"🧠","category":"cleanup","danger":"destructive","desc":"Unfollow accounts that didn't follow back within N days (respects your whitelist).","where":{"label":"Your Following page (x.com/<you>/following)","match":["/following"]},"defaults":{"daysToWait":3,"maxUnfollows":30,"whitelist":[],"onlyTracked":true,"dryRun":false,"unfollowDelay":1500,"confirmDelay":1000,"scrollDelay":2000,"maxScrolls":100,"maxRetries":5},"stopGlobal":null},{"id":"unfollow-with-log","title":"Unfollow + Log","emoji":"📝","category":"cleanup","danger":"destructive","desc":"Unfollow non-followers and download a log of who was removed.","where":{"label":"Your Following page (x.com/<you>/following)","match":["/following"]},"defaults":{"maxRetries":5,"unfollowDelay":1500,"confirmDelay":1000,"scrollDelay":2000,"maxUnfollows":0,"autoDownload":true,"includeTimestamp":true},"stopGlobal":"stopUnfollow"},{"id":"unfollow-everyone","title":"Unfollow Everyone","emoji":"🧹","category":"cleanup","danger":"destructive","desc":"Mass-unfollow every account you follow.","where":{"label":"Your Following page (x.com/<you>/following)","match":["/following"]},"defaults":{"maxRetries":5,"unfollowDelay":1500,"confirmDelay":1000,"scrollDelay":2000,"maxUnfollows":0,"confirmStart":true},"stopGlobal":"stopUnfollow"},{"id":"unfollow-non-followers","title":"Unfollow Non-Followers","emoji":"✂️","category":"cleanup","danger":"destructive","desc":"Unfollow accounts that don't follow you back.","where":{"label":"Your Following page (x.com/<you>/following)","match":["/following"]},"defaults":{"maxRetries":5,"unfollowDelay":1500,"confirmDelay":1000,"scrollDelay":2000,"maxUnfollows":0,"confirmStart":true,"logKept":true},"stopGlobal":"stopUnfollow"},{"id":"unlike-all","title":"Unlike Everything","emoji":"💔","category":"cleanup","danger":"destructive","desc":"Remove every like from your Likes page.","where":{"label":"Your Likes page (x.com/<you>/likes)","match":["/likes"]},"defaults":{"maxUnlikes":1000,"minDelay":1000,"maxDelay":2500,"scrollDelay":1500,"confirmBeforeStart":true,"maxScrollAttempts":5,"logProgress":true},"stopGlobal":"stopUnlike"},{"id":"unlike-old","title":"Unlike Old Likes","emoji":"🕰️","category":"cleanup","danger":"destructive","desc":"Remove likes older than a number of days you set.","where":{"label":"Your Likes page (x.com/<you>/likes)","match":["/likes"]},"defaults":{"daysOld":30,"maxUnlikes":500,"minDelay":1000,"maxDelay":2500,"scrollDelay":1500,"maxScrollAttempts":10,"logProgress":true},"stopGlobal":"stopUnlike"},{"id":"block-bots","title":"Block Bots","emoji":"🤖","category":"moderate","danger":"destructive","desc":"Detect and block likely bots by ratio, age, and bio.","where":{"label":"Your Followers page (x.com/<you>/followers)","match":["/followers"]},"defaults":{"scrollDelay":1500,"maxScrolls":50,"maxRetries":3,"blockDelay":2000,"detection":{"maxFollowingRatio":50,"minAccountAgeDays":30,"maxFollowing":5000,"minFollowers":5,"suspiciousBioKeywords":["crypto","nft","giveaway","airdrop","free money","onlyfans","dm for","follow back","f4f","follow4follow","bitcoin","eth","$btc","$eth","forex","trading signals","make money","passive income","work from home","link in bio","check bio","clickhere","sexo","sex","camgirl","hot girl","sugar","seeking arrangement"],"flagDefaultAvatar":true,"flagNoBio":true,"flagRandomUsername":true},"dryRun":true,"maxBlocks":50},"stopGlobal":null},{"id":"block-by-keywords","title":"Block by Keywords","emoji":"🚫","category":"moderate","danger":"destructive","desc":"Block users whose bio contains keywords you set.","where":{"label":"Your Followers page (x.com/<you>/followers)","match":["/followers"]},"defaults":{"blockKeywords":["crypto","nft","giveaway","airdrop","onlyfans","dm for promo","follow back","f4f"],"scrollDelay":1500,"maxScrolls":30,"maxRetries":3,"blockDelay":2000,"dryRun":true,"maxBlocks":50},"stopGlobal":null},{"id":"block-by-ratio","title":"Block by Ratio","emoji":"📛","category":"moderate","danger":"destructive","desc":"Block accounts by follower/following ratio.","where":{"label":"Your Followers page (x.com/<you>/followers)","match":["/followers"]},"defaults":{"maxRatio":50,"minFollowing":100,"minFollowers":5,"scrollDelay":2000,"maxScrolls":30,"maxRetries":3,"blockDelay":2000,"dryRun":true,"maxBlocks":30},"stopGlobal":null},{"id":"mass-block","title":"Mass Block","emoji":"⛔","category":"moderate","danger":"destructive","desc":"Block every user in a list you provide.","where":{"label":"Any X page"},"defaults":{"usersToBlock":[],"blockDelay":3000,"dryRun":true},"stopGlobal":"stopMassBlock"},{"id":"mass-unblock","title":"Mass Unblock","emoji":"✅","category":"moderate","danger":"destructive","desc":"Unblock accounts in bulk from your blocked list.","where":{"label":"Blocked accounts","url":"https://x.com/settings/blocked_all","match":["^/settings/blocked"]},"defaults":{"unblockAll":true,"usersToUnblock":[],"unblockDelay":1500,"maxUnblocks":100,"scrollDelay":1500,"maxScrolls":20,"dryRun":true},"stopGlobal":"stopMassUnblock"},{"id":"mass-unmute","title":"Mass Unmute","emoji":"🔊","category":"moderate","danger":"destructive","desc":"Unmute accounts in bulk from your muted list.","where":{"label":"Muted accounts","url":"https://x.com/settings/muted_all","match":["^/settings/muted"]},"defaults":{"unmuteAll":true,"usersToUnmute":[],"unmuteDelay":1000,"maxUnmutes":200,"scrollDelay":1500,"maxScrolls":30,"dryRun":true},"stopGlobal":"stopMassUnmute"},{"id":"mute-by-keywords","title":"Mute by Keywords","emoji":"🔇","category":"moderate","danger":"destructive","desc":"Mute users whose bio contains keywords you set.","where":{"label":"Your Followers page (x.com/<you>/followers)","match":["/followers"]},"defaults":{"muteKeywords":["crypto","nft","giveaway","trading signals","dm for promo"],"scrollDelay":1500,"maxScrolls":30,"maxRetries":3,"muteDelay":2000,"dryRun":true,"maxMutes":50},"stopGlobal":"stopMuteByKeywords"},{"id":"report-spam","title":"Report Spam","emoji":"🚩","category":"moderate","danger":"destructive","desc":"Report spam accounts from your followers or mentions.","where":{"label":"Your Followers page (x.com/<you>/followers)","match":["/followers"]},"defaults":{"spamKeywords":["free giveaway","click my link","dm for cashapp","send nudes","sexchat","hot girls in","make $1000 daily","guaranteed profits"],"detection":{"flagDefaultAvatar":true,"maxFollowingRatio":100,"flagNewAccounts":true,"flagExternalLinks":false},"scrollDelay":1500,"maxScrolls":20,"dryRun":true,"maxReports":10,"reportDelay":5000},"stopGlobal":null},{"id":"join-communities","title":"Join Communities","emoji":"➕","category":"community","danger":"caution","desc":"Join multiple Communities from a list of IDs.","where":{"label":"Any X page"},"defaults":{"communities":[],"joinDelay":3000,"navigationDelay":3000,"maxJoin":0,"skipAlreadyJoined":true},"stopGlobal":null},{"id":"leave-community","title":"Leave a Community","emoji":"➖","category":"community","danger":"caution","desc":"Leave one Community by name or ID.","where":{"label":"Your Communities","url":"https://x.com/i/communities","match":["communities"]},"defaults":{"communityId":null,"confirmDelay":1500,"navigationDelay":2500},"stopGlobal":null},{"id":"leave-all-communities","title":"Leave All Communities","emoji":"🚪","category":"community","danger":"destructive","desc":"Leave every Community you have joined.","where":{"label":"Your Communities","url":"https://x.com/i/communities","match":["communities"]},"defaults":{"leaveDelay":1500,"confirmDelay":2000,"navDelay":2500,"maxToLeave":0},"stopGlobal":"stopLeaveCommunities"},{"id":"multi-account","title":"Multi-Account Manager","emoji":"🔀","category":"profile","danger":"safe","desc":"Manage and switch between multiple accounts.","where":{"label":"Any X page"},"defaults":{"storagePrefix":"xactions_multi_","autoDetect":true},"stopGlobal":null},{"id":"send-direct-message","title":"Send DMs","emoji":"✉️","category":"profile","danger":"caution","desc":"Send direct messages, with per-recipient personalization.","where":{"label":"Your Messages","url":"https://x.com/messages","match":["^/messages"]},"defaults":{"targetUsers":[],"messageTemplate":"Hey {username}! 👋\n\nJust wanted to reach out and connect.\n\nBest,\n[Your Name]","limits":{"messagesPerSession":10,"delayBetweenMessages":30000},"options":{"skipIfConversationExists":true,"randomizeDelay":true}},"stopGlobal":null},{"id":"update-profile-picture","title":"Update Avatar","emoji":"🖼️","category":"profile","danger":"caution","desc":"Guided helper for changing your profile picture.","where":{"label":"Edit profile","url":"https://x.com/settings/profile","match":["^/settings/profile"]},"defaults":{"actionDelay":1500,"autoOpenPicker":true},"stopGlobal":null},{"id":"update-banner","title":"Update Banner","emoji":"🖼️","category":"profile","danger":"caution","desc":"Guided helper for changing your profile banner.","where":{"label":"Edit profile","url":"https://x.com/settings/profile","match":["^/settings/profile"]},"defaults":{"actionDelay":1500,"autoOpenEditor":true},"stopGlobal":null},{"id":"update-bio","title":"Update Bio","emoji":"✍️","category":"profile","danger":"caution","desc":"Update your profile bio.","where":{"label":"Edit profile","url":"https://x.com/settings/profile","match":["^/settings/profile"]},"defaults":{"newBio":"🚀 Building cool stuff with code\n🐦 Automating X with @XActions\n💡 Open source enthusiast\n🔗 github.com/nirholas/XActions","actionDelay":1000,"autoSave":true},"stopGlobal":null},{"id":"blacklist","title":"Blacklist Manager","emoji":"📕","category":"utility","danger":"safe","desc":"Maintain a list of users other tools should skip.","where":{"label":"Any X page"},"defaults":{"storageKey":"xactions_blacklist","defaultBlacklist":[]},"stopGlobal":null},{"id":"filter-manager","title":"Filter Manager","emoji":"🎚️","category":"utility","danger":"safe","desc":"Configure shared filters used across the automation tools.","where":{"label":"Any X page"},"defaults":{},"stopGlobal":null},{"id":"protect-active-users","title":"Protect Active Users","emoji":"🛡️","category":"utility","danger":"safe","desc":"Scan your posts for engaged users and protect them from unfollow.","where":{"label":"Your own profile page"},"defaults":{"postsToScan":10,"engagementTypes":{"likers":true,"repliers":true,"retweeters":true,"quoters":false},"lookbackDays":30,"minEngagements":1,"scrollDelay":1500,"maxScrollsPerList":10},"stopGlobal":null},{"id":"rate-limiter","title":"Rate Limiter","emoji":"⏱️","category":"utility","danger":"safe","desc":"Tune the pacing/quota helper shared by the action tools.","where":{"label":"Any X page"},"defaults":{},"stopGlobal":null},{"id":"whitelist","title":"Whitelist Manager","emoji":"📗","category":"utility","danger":"safe","desc":"Maintain a list of users to protect from actions.","where":{"label":"Any X page"},"defaults":{"storageKey":"xactions_whitelist","defaultWhitelist":[]},"stopGlobal":null}];
const CATEGORIES = [{"id":"scrape","label":"Scrape & Export","emoji":"📥"},{"id":"analyze","label":"Analytics","emoji":"📊"},{"id":"grow","label":"Grow","emoji":"🌱"},{"id":"engage","label":"Engage","emoji":"💬"},{"id":"cleanup","label":"Clean Up","emoji":"🧹"},{"id":"moderate","label":"Moderate","emoji":"🛡️"},{"id":"community","label":"Communities","emoji":"👥"},{"id":"profile","label":"Profile","emoji":"🪪"},{"id":"utility","label":"Utilities","emoji":"🧰"}];
const TOOLS = {};
function register(id, fn){ TOOLS[id] = fn; }
  register("audit-followers", function(){
var CONFIG = {
  // Scroll settings
  scrollDelay: 1500,
  maxScrolls: 100,
  maxRetries: 5,
  
  // Analysis thresholds
  thresholds: {
    // Ratio categories
    influencer: 10,        // Followers 10x+ following = influencer
    balanced: 0.5,         // Ratio between 0.5 and 2 = balanced
    aggressive: 0.1,       // Ratio below 0.1 = aggressive follower
    
    // Following counts
    massFollower: 2000,    // Following 2000+
    selectiveFollower: 100 // Following less than 100
  }
};
try{if(typeof window!=='undefined'&&window.__XA_LAUNCH_CFG){Object.assign(CONFIG,window.__XA_LAUNCH_CFG);}}catch(_xa){}


/**
 * ============================================================
 * 🚀 SCRIPT START
 * ============================================================
 */

(async function auditFollowers() {
  const sleep = (ms) => new Promise(r => setTimeout(r, ms));

  console.log(`
╔══════════════════════════════════════════════════════════════╗
║  🔍 XActions — Audit Followers                               ║
║  Comprehensive follower quality analysis                     ║
╚══════════════════════════════════════════════════════════════╝
  `);

  if (!window.location.pathname.includes('/followers')) {
    console.error('❌ Please navigate to your FOLLOWERS page first!');
    console.log('👉 Go to: https://x.com/YOUR_USERNAME/followers');
    return;
  }

  const username = window.location.pathname.split('/')[1];
  const $userCell = '[data-testid="UserCell"]';

  const parseCount = (str) => {
    if (!str) return 0;
    str = str.replace(/,/g, '');
    const match = str.match(/([\d.]+)([KMB])?/i);
    if (match) {
      let num = parseFloat(match[1]);
      const multipliers = { 'K': 1000, 'M': 1000000, 'B': 1000000000 };
      if (match[2]) num *= multipliers[match[2].toUpperCase()];
      return Math.round(num);
    }
    return 0;
  };

  console.log(`🔍 Auditing followers for @${username}\n`);
  console.log('⏳ This may take a while for large accounts...\n');

  const followers = [];
  const scanned = new Set();
  let retries = 0;
  let scrollCount = 0;

  while (scrollCount < CONFIG.maxScrolls && retries < CONFIG.maxRetries) {
    const prevSize = scanned.size;

    document.querySelectorAll($userCell).forEach(cell => {
      const link = cell.querySelector('a[href^="/"]');
      const user = link?.getAttribute('href')?.replace('/', '')?.split('/')[0];
      if (!user || scanned.has(user)) return;

      scanned.add(user);

      // Get display name
      const nameEl = cell.querySelector('[dir="ltr"] span');
      const displayName = nameEl?.textContent || user;

      // Get bio
      const bioEl = cell.querySelector('[data-testid="UserDescription"]');
      const bio = bioEl?.textContent || '';

      // Parse stats
      const text = cell.textContent;
      const followingMatch = text.match(/([\d,.]+[KMB]?)\s*Following/i);
      const followersMatch = text.match(/([\d,.]+[KMB]?)\s*Follower/i);
      
      const following = followingMatch ? parseCount(followingMatch[1]) : 0;
      const followerCount = followersMatch ? parseCount(followersMatch[1]) : 0;

      // Check for verified (testid is locale-independent; aria-label kept as fallback)
      const verified = cell.querySelector('[data-testid="icon-verified"], svg[aria-label*="Verified"]') !== null;

      // Check for default avatar
      const defaultAvatar = cell.querySelector('img[src*="default_profile"]') !== null;

      followers.push({
        username: user,
        displayName,
        bio,
        following,
        followers: followerCount,
        ratio: followerCount > 0 ? following / followerCount : Infinity,
        verified,
        defaultAvatar,
        hasBio: bio.length > 0
      });
    });

    if (scanned.size === prevSize) retries++;
    else retries = 0;

    console.log(`   Scanned: ${scanned.size} followers...`);

    window.scrollTo(0, document.body.scrollHeight);
    await sleep(CONFIG.scrollDelay);
    scrollCount++;
  }

  if (followers.length === 0) {
    console.error('❌ No followers found!');
    return;
  }

  console.log(`\n✅ Audit complete! Analyzed ${followers.length} followers\n`);

  // === ANALYSIS ===

  // Categorize by type
  const categories = {
    influencers: followers.filter(f => f.followers > 0 && f.followers / (f.following || 1) >= CONFIG.thresholds.influencer),
    balanced: followers.filter(f => {
      const ratio = (f.followers || 1) / (f.following || 1);
      return ratio >= CONFIG.thresholds.balanced && ratio < CONFIG.thresholds.influencer;
    }),
    aggressiveFollowers: followers.filter(f => f.following > CONFIG.thresholds.massFollower),
    verified: followers.filter(f => f.verified),
    defaultAvatars: followers.filter(f => f.defaultAvatar),
    noBio: followers.filter(f => !f.hasBio),
    zeroFollowers: followers.filter(f => f.followers === 0),
    highQuality: followers.filter(f => f.followers >= 1000 && f.hasBio && !f.defaultAvatar)
  };

  // Calculate averages
  const avgFollowing = followers.reduce((sum, f) => sum + f.following, 0) / followers.length;
  const avgFollowers = followers.reduce((sum, f) => sum + f.followers, 0) / followers.length;
  const totalReach = followers.reduce((sum, f) => sum + f.followers, 0);

  const formatNum = (n) => {
    if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
    if (n >= 1000) return (n / 1000).toFixed(1) + 'K';
    return Math.round(n).toString();
  };

  // Output
  console.log('═'.repeat(60));
  console.log(`📊 FOLLOWER AUDIT REPORT: @${username}`);
  console.log('═'.repeat(60));

  console.log('\n📈 OVERVIEW:');
  console.log('─'.repeat(50));
  console.log(`   Total followers analyzed: ${followers.length.toLocaleString()}`);
  console.log(`   Total audience reach:     ${formatNum(totalReach)}`);
  console.log(`   Average following:        ${formatNum(avgFollowing)}`);
  console.log(`   Average followers:        ${formatNum(avgFollowers)}`);

  console.log('\n👥 FOLLOWER COMPOSITION:');
  console.log('─'.repeat(50));
  console.log(`   ⭐ Verified accounts:     ${categories.verified.length} (${(categories.verified.length/followers.length*100).toFixed(1)}%)`);
  console.log(`   🌟 Influencers (10:1+):   ${categories.influencers.length} (${(categories.influencers.length/followers.length*100).toFixed(1)}%)`);
  console.log(`   💎 High-quality:          ${categories.highQuality.length} (${(categories.highQuality.length/followers.length*100).toFixed(1)}%)`);
  console.log(`   ⚖️  Balanced accounts:     ${categories.balanced.length} (${(categories.balanced.length/followers.length*100).toFixed(1)}%)`);
  console.log(`   🔄 Aggressive followers:  ${categories.aggressiveFollowers.length} (${(categories.aggressiveFollowers.length/followers.length*100).toFixed(1)}%)`);

  console.log('\n⚠️  RED FLAGS:');
  console.log('─'.repeat(50));
  console.log(`   🖼️  Default avatars:       ${categories.defaultAvatars.length} (${(categories.defaultAvatars.length/followers.length*100).toFixed(1)}%)`);
  console.log(`   📝 No bio:                ${categories.noBio.length} (${(categories.noBio.length/followers.length*100).toFixed(1)}%)`);
  console.log(`   👻 Zero followers:        ${categories.zeroFollowers.length} (${(categories.zeroFollowers.length/followers.length*100).toFixed(1)}%)`);

  // Quality Score
  const qualityScore = Math.min(100, Math.round(
    (categories.highQuality.length * 3 +
     categories.influencers.length * 2 +
     categories.verified.length * 5 +
     categories.balanced.length * 1) /
    (followers.length * 3) * 100
  ));

  console.log('\n🏆 QUALITY SCORE:');
  console.log('─'.repeat(50));
  const scoreBar = '█'.repeat(Math.round(qualityScore / 5)) + '░'.repeat(20 - Math.round(qualityScore / 5));
  console.log(`   [${scoreBar}] ${qualityScore}/100`);
  
  if (qualityScore >= 80) console.log('   🏆 EXCELLENT - Premium quality audience!');
  else if (qualityScore >= 60) console.log('   👍 GOOD - Solid audience quality');
  else if (qualityScore >= 40) console.log('   ⚠️  MODERATE - Room for improvement');
  else console.log('   🚨 POOR - Consider audience cleanup');

  // Top followers by reach
  if (categories.influencers.length > 0) {
    console.log('\n' + '═'.repeat(60));
    console.log('🌟 YOUR TOP INFLUENTIAL FOLLOWERS');
    console.log('═'.repeat(60));

    const topInfluencers = categories.influencers
      .sort((a, b) => b.followers - a.followers)
      .slice(0, 15);

    topInfluencers.forEach((f, i) => {
      const badge = f.verified ? ' ✓' : '';
      console.log(`\n${i + 1}. ${f.displayName}${badge} (@${f.username})`);
      console.log(`   ${formatNum(f.followers)} followers | ${formatNum(f.following)} following`);
      if (f.bio) console.log(`   "${f.bio.slice(0, 60)}${f.bio.length > 60 ? '...' : ''}"`);
    });
  }

  // Verified followers
  if (categories.verified.length > 0) {
    console.log('\n' + '═'.repeat(60));
    console.log('⭐ VERIFIED FOLLOWERS');
    console.log('═'.repeat(60));

    categories.verified.slice(0, 20).forEach((f, i) => {
      console.log(`   ${i + 1}. @${f.username} — ${formatNum(f.followers)} followers`);
    });
  }

  // Bio keyword analysis
  console.log('\n' + '═'.repeat(60));
  console.log('🏷️  AUDIENCE INTERESTS (Bio Keywords)');
  console.log('═'.repeat(60));

  const keywords = {};
  const interestCategories = {
    tech: ['developer', 'engineer', 'programmer', 'tech', 'software', 'coding', 'ai', 'data'],
    crypto: ['crypto', 'bitcoin', 'btc', 'eth', 'nft', 'web3', 'defi', 'blockchain'],
    business: ['founder', 'ceo', 'entrepreneur', 'startup', 'investor', 'business'],
    marketing: ['marketing', 'growth', 'social media', 'brand', 'digital'],
    creative: ['creator', 'artist', 'designer', 'writer', 'photographer', 'content'],
    finance: ['finance', 'trading', 'forex', 'investment', 'stocks']
  };

  followers.forEach(f => {
    const bioLower = f.bio.toLowerCase();
    Object.entries(interestCategories).forEach(([category, words]) => {
      if (words.some(w => bioLower.includes(w))) {
        keywords[category] = (keywords[category] || 0) + 1;
      }
    });
  });

  const sortedInterests = Object.entries(keywords)
    .sort((a, b) => b[1] - a[1]);

  if (sortedInterests.length > 0) {
    const maxCount = sortedInterests[0][1];
    sortedInterests.forEach(([category, count]) => {
      const bar = '█'.repeat(Math.round(count / maxCount * 20));
      const pct = (count / followers.length * 100).toFixed(1);
      console.log(`   ${category.padEnd(12)} ${bar.padEnd(20)} ${count} (${pct}%)`);
    });
  } else {
    console.log('   Not enough bio data to analyze interests');
  }

  // Save audit results
  const storageKey = `xactions_audit_${username}`;
  const data = {
    username,
    timestamp: new Date().toISOString(),
    totalFollowers: followers.length,
    qualityScore,
    totalReach,
    composition: {
      verified: categories.verified.length,
      influencers: categories.influencers.length,
      highQuality: categories.highQuality.length,
      defaultAvatars: categories.defaultAvatars.length,
      noBio: categories.noBio.length,
      zeroFollowers: categories.zeroFollowers.length
    },
    interests: Object.fromEntries(sortedInterests),
    topInfluencers: categories.influencers
      .sort((a, b) => b.followers - a.followers)
      .slice(0, 50)
      .map(f => ({ username: f.username, followers: f.followers, verified: f.verified }))
  };
  localStorage.setItem(storageKey, JSON.stringify(data));

  // Historical comparison
  console.log('\n' + '═'.repeat(60));
  console.log('💾 AUDIT SAVED');
  console.log('═'.repeat(60));
  console.log(`\n   Run this audit periodically to track audience quality.`);
  console.log(`   Export: copy(localStorage.getItem("${storageKey}"))`);

  console.log('\n' + '═'.repeat(60));
  console.log('💡 RECOMMENDATIONS');
  console.log('═'.repeat(60));

  if (categories.defaultAvatars.length / followers.length > 0.2) {
    console.log('\n⚠️  High number of default avatars - consider removing bots');
  }
  if (categories.zeroFollowers.length / followers.length > 0.1) {
    console.log('\n⚠️  Many followers have 0 followers - possible fake accounts');
  }
  if (categories.influencers.length > 0) {
    console.log(`\n✅ You have ${categories.influencers.length} influencer followers - engage with them!`);
  }
  if (categories.verified.length > 0) {
    console.log(`\n✅ You have ${categories.verified.length} verified followers - great credibility!`);
  }

  console.log('\n' + '═'.repeat(60) + '\n');

})();

});
  register("auto-commenter", function(){
var CONFIG = {
  // ---- COMMENTS TO POST ----
  // The script will randomly pick from these
  // 💡 Add variety to avoid looking like a bot!
  comments: [
    '🔥',
    'Great point!',
    'This is so true 👏',
    'Interesting perspective!',
    'Thanks for sharing this 🙏',
    '💯',
    'Well said!',
    'Couldn\'t agree more',
    '👀 interesting',
    'This is gold ✨'
  ],
  
  // ---- LIMITS ----
  
  // Maximum comments per session
  maxComments: 5,
  
  // Only comment on tweets posted within this window
  maxPostAgeMinutes: 60,
  
  // Minimum post age (to avoid commenting too fast)
  minPostAgeSeconds: 30,
  
  // ---- BEHAVIOR ----
  
  // Only comment on original tweets (skip replies)
  onlyOriginalTweets: true,
  
  // Only comment on tweets with media (images/videos)
  onlyWithMedia: false,
  
  // ---- TIMING ----
  
  // Delay between comments (milliseconds)
  minDelay: 30000,  // 30 seconds minimum!
  maxDelay: 60000,  // 60 seconds
  
  // Scroll delay
  scrollDelay: 2000
};
try{if(typeof window!=='undefined'&&window.__XA_LAUNCH_CFG){Object.assign(CONFIG,window.__XA_LAUNCH_CFG);}}catch(_xa){}


/**
 * ============================================================
 * 🚀 SCRIPT START
 * ============================================================
 */

(async function autoCommenter() {
  const sleep = (ms) => new Promise(r => setTimeout(r, ms));
  const randomDelay = () => Math.floor(Math.random() * (CONFIG.maxDelay - CONFIG.minDelay) + CONFIG.minDelay);
  const randomComment = () => CONFIG.comments[Math.floor(Math.random() * CONFIG.comments.length)];
  
  // DOM Selectors
  const $tweet = 'article[data-testid="tweet"]';
  const $replyButton = '[data-testid="reply"]';
  const $tweetTextarea = '[data-testid="tweetTextarea_0"]';
  const $tweetButton = '[data-testid="tweetButton"]';
  
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║  💬 AUTO COMMENTER                                         ║');
  console.log('║  by nichxbt - https://github.com/nirholas/XActions         ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log('');
  
  // Get target username from URL
  const pathMatch = window.location.pathname.match(/^\/([^\/]+)/);
  const targetUser = pathMatch ? pathMatch[1] : null;
  
  if (!targetUser || ['home', 'explore', 'search', 'notifications', 'messages', 'i'].includes(targetUser)) {
    console.error('❌ ERROR: Must be on a user\'s profile page!');
    console.log('📍 Go to: https://x.com/TARGET_USERNAME');
    return;
  }
  
  console.log(`👤 Target: @${targetUser}`);
  console.log(`💬 Max comments: ${CONFIG.maxComments}`);
  console.log(`⏱️ Post age window: ${CONFIG.minPostAgeSeconds}s - ${CONFIG.maxPostAgeMinutes}min`);
  console.log('');
  
  const commentedTweets = new Set();
  
  // Load previously commented from storage
  const STORAGE_KEY = `xactions_commented_${targetUser}`;
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      JSON.parse(saved).forEach(id => commentedTweets.add(id));
      console.log(`📚 Loaded ${commentedTweets.size} previously commented tweets`);
    }
  } catch (e) {}
  
  let totalCommented = 0;
  
  /**
   * Get tweet ID
   */
  function getTweetId(tweetEl) {
    // The timestamp's enclosing anchor is the tweet's own permalink; the first
    // /status/ link in the article can belong to a quoted tweet
    const timeEl = tweetEl.querySelector('time');
    const link = (timeEl && timeEl.closest('a[href*="/status/"]')) ||
                 tweetEl.querySelector('a[href*="/status/"]');
    if (link) {
      const match = link.href.match(/\/status\/(\d+)/);
      return match ? match[1] : null;
    }
    return null;
  }
  
  /**
   * Check tweet age
   */
  function getTweetAge(tweetEl) {
    const timeEl = tweetEl.querySelector('time');
    if (!timeEl) return null;
    const datetime = timeEl.getAttribute('datetime');
    if (!datetime) return null;
    return (Date.now() - new Date(datetime).getTime()) / 1000; // seconds
  }
  
  /**
   * Check if tweet matches criteria
   */
  function matchesCriteria(tweetEl) {
    const age = getTweetAge(tweetEl);
    if (!age) return false;
    
    // Check age window
    if (age < CONFIG.minPostAgeSeconds) return false;
    if (age > CONFIG.maxPostAgeMinutes * 60) return false;
    
    // Check if original tweet (structural marker first; English text as fallback)
    if (CONFIG.onlyOriginalTweets) {
      const isReply = tweetEl.querySelector('[data-testid="in-reply-to"]') !== null ||
        Array.from(tweetEl.querySelectorAll('div[dir]')).some(el =>
          el.innerText.startsWith('Replying to'));
      if (isReply) return false;
    }

    // Check for media
    if (CONFIG.onlyWithMedia) {
      const hasMedia = tweetEl.querySelector('[data-testid="tweetPhoto"]') ||
                       tweetEl.querySelector('[data-testid="videoPlayer"], [data-testid="videoComponent"]');
      if (!hasMedia) return false;
    }
    
    return true;
  }
  
  console.log('🚀 Looking for tweets to comment on...');
  console.log('');
  
  // Scroll through profile
  let scrolls = 0;
  const maxScrolls = 20;
  
  while (totalCommented < CONFIG.maxComments && scrolls < maxScrolls) {
    const tweets = document.querySelectorAll($tweet);
    
    for (const tweet of tweets) {
      if (totalCommented >= CONFIG.maxComments) break;
      
      const tweetId = getTweetId(tweet);
      if (!tweetId || commentedTweets.has(tweetId)) continue;
      
      if (!matchesCriteria(tweet)) continue;
      
      // Find reply button
      const replyBtn = tweet.querySelector($replyButton);
      if (!replyBtn) continue;
      
      try {
        console.log(`💬 Commenting on tweet ${tweetId}...`);
        
        // Click reply
        replyBtn.click();
        await sleep(1000);
        
        // Find textarea
        const textarea = document.querySelector($tweetTextarea);
        if (!textarea) {
          console.warn('⚠️ Could not find reply textarea');
          continue;
        }
        
        // Type comment
        const comment = randomComment();
        textarea.focus();
        document.execCommand('insertText', false, comment);
        await sleep(500);
        
        // Click tweet button
        const tweetBtn = document.querySelector($tweetButton);
        if (tweetBtn && !tweetBtn.disabled) {
          tweetBtn.click();
          
          commentedTweets.add(tweetId);
          totalCommented++;
          
          console.log(`✅ Posted: "${comment}"`);
          
          // Save to storage
          localStorage.setItem(STORAGE_KEY, JSON.stringify([...commentedTweets]));
          
          // Wait before next comment
          const delay = randomDelay();
          console.log(`⏳ Waiting ${Math.round(delay/1000)}s before next comment...`);
          await sleep(delay);
        } else {
          console.warn('⚠️ Tweet button not available');
          // Close dialog
          const closeBtn = document.querySelector('[data-testid="app-bar-close"]');
          if (closeBtn) closeBtn.click();
        }
        
      } catch (e) {
        console.warn('⚠️ Error:', e.message);
        // Try to close any open dialogs
        const closeBtn = document.querySelector('[data-testid="app-bar-close"]');
        if (closeBtn) closeBtn.click();
      }
    }
    
    if (totalCommented >= CONFIG.maxComments) break;
    
    window.scrollTo(0, document.body.scrollHeight);
    await sleep(CONFIG.scrollDelay);
    scrolls++;
  }
  
  console.log('');
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║  ✅ AUTO COMMENTER COMPLETE!                               ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log(`💬 Total comments posted: ${totalCommented}`);
  console.log('');
  
  return { commented: totalCommented };
})();

});
  register("auto-liker", function(){
var CONFIG = {
  // ---- TARGETING ----
  
  // Like ALL tweets (ignores keywords filter)
  // 💡 Set to false to only like tweets matching keywords
  likeAll: false,
  
  // Only like tweets containing these words (case-insensitive)
  // 💡 Leave empty [] and set likeAll: true to like everything
  keywords: ['web3', 'crypto', 'AI', 'startup'],
  
  // Only like tweets from these specific users (leave empty for any user)
  // 💡 Example: ['elonmusk', 'naval']
  fromUsers: [],
  
  // ---- LIMITS ----
  
  // Maximum tweets to like
  maxLikes: 20,
  
  // Maximum scroll depth
  maxScrolls: 50,
  
  // ---- BEHAVIOR ----
  
  // Also retweet liked posts
  alsoRetweet: false,
  
  // Skip replies (only like original tweets)
  skipReplies: true,
  
  // Skip promoted/ad tweets
  skipAds: true,
  
  // ---- TIMING ----
  
  // Random delay between likes (milliseconds)
  minDelay: 2000,
  maxDelay: 5000,
  
  // Scroll delay
  scrollDelay: 2000
};
try{if(typeof window!=='undefined'&&window.__XA_LAUNCH_CFG){Object.assign(CONFIG,window.__XA_LAUNCH_CFG);}}catch(_xa){}


/**
 * ============================================================
 * 🚀 SCRIPT START
 * ============================================================
 */

(async function autoLiker() {
  const sleep = (ms) => new Promise(r => setTimeout(r, ms));
  const randomDelay = () => Math.floor(Math.random() * (CONFIG.maxDelay - CONFIG.minDelay) + CONFIG.minDelay);
  
  // DOM Selectors
  const $tweet = 'article[data-testid="tweet"]';
  const $tweetText = '[data-testid="tweetText"]';
  const $likeButton = '[data-testid="like"]';
  const $unlikeButton = '[data-testid="unlike"]';
  const $retweetButton = '[data-testid="retweet"]';
  const $confirmRetweet = '[data-testid="retweetConfirm"]';
  
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║  ❤️ AUTO LIKER                                              ║');
  console.log('║  by nichxbt - https://github.com/nirholas/XActions         ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log('');
  console.log(`🎯 Mode: ${CONFIG.likeAll ? 'Like ALL tweets' : 'Keyword filter'}`);
  if (!CONFIG.likeAll && CONFIG.keywords.length > 0) {
    console.log(`🔍 Keywords: ${CONFIG.keywords.join(', ')}`);
  }
  if (CONFIG.fromUsers.length > 0) {
    console.log(`👤 From users: ${CONFIG.fromUsers.join(', ')}`);
  }
  console.log(`📊 Max likes: ${CONFIG.maxLikes}`);
  console.log('');
  
  const likedTweets = new Set();
  let totalLiked = 0;
  let totalRetweeted = 0;
  let scrolls = 0;
  
  /**
   * Check if tweet matches filters
   */
  function matchesFilters(tweetEl) {
    const textEl = tweetEl.querySelector($tweetText);
    const text = textEl ? textEl.innerText.toLowerCase() : '';
    
    // Check if from specific users (User-Name block is the author; the first
    // profile link in the article can be a reposter's socialContext link)
    if (CONFIG.fromUsers.length > 0) {
      const userLink = tweetEl.querySelector('[data-testid="User-Name"] a[href^="/"]') ||
                       tweetEl.querySelector('a[href^="/"]');
      const username = userLink ? userLink.getAttribute('href').replace('/', '').toLowerCase() : '';
      if (!CONFIG.fromUsers.some(u => u.toLowerCase() === username)) {
        return false;
      }
    }
    
    // Check keywords
    if (!CONFIG.likeAll && CONFIG.keywords.length > 0) {
      if (!CONFIG.keywords.some(k => text.includes(k.toLowerCase()))) {
        return false;
      }
    }
    
    // Skip replies (structural marker first; English text as fallback)
    if (CONFIG.skipReplies) {
      const isReply = tweetEl.querySelector('[data-testid="in-reply-to"]') !== null ||
        Array.from(tweetEl.querySelectorAll('div[dir]')).some(el =>
          el.innerText.startsWith('Replying to'));
      if (isReply) return false;
    }

    // Skip ads: placementTracking wraps promoted tweets; the label check needs
    // an exact span match ("Ad" as a substring hits words like "Advice")
    if (CONFIG.skipAds) {
      const isAd = tweetEl.querySelector('[data-testid="placementTracking"]') !== null ||
        Array.from(tweetEl.querySelectorAll('span')).some(s => {
          const t = s.innerText.trim();
          return t === 'Ad' || t === 'Promoted';
        });
      if (isAd) return false;
    }
    
    return true;
  }
  
  /**
   * Get tweet ID
   */
  function getTweetId(tweetEl) {
    // The timestamp's enclosing anchor is the tweet's own permalink; the first
    // /status/ link in the article can belong to a quoted tweet
    const timeEl = tweetEl.querySelector('time');
    const link = (timeEl && timeEl.closest('a[href*="/status/"]')) ||
                 tweetEl.querySelector('a[href*="/status/"]');
    if (link) {
      const match = link.href.match(/\/status\/(\d+)/);
      return match ? match[1] : null;
    }
    return null;
  }
  
  console.log('🚀 Starting auto-liker...');
  console.log('');
  
  while (totalLiked < CONFIG.maxLikes && scrolls < CONFIG.maxScrolls) {
    const tweets = document.querySelectorAll($tweet);
    
    for (const tweet of tweets) {
      if (totalLiked >= CONFIG.maxLikes) break;
      
      const tweetId = getTweetId(tweet);
      if (!tweetId || likedTweets.has(tweetId)) continue;
      
      // Check if already liked
      const unlikeBtn = tweet.querySelector($unlikeButton);
      if (unlikeBtn) {
        likedTweets.add(tweetId);
        continue;
      }
      
      // Check filters
      if (!matchesFilters(tweet)) continue;
      
      // Find like button
      const likeBtn = tweet.querySelector($likeButton);
      if (!likeBtn) continue;
      
      try {
        // Like the tweet
        likeBtn.click();
        likedTweets.add(tweetId);
        totalLiked++;
        
        const textEl = tweet.querySelector($tweetText);
        const preview = textEl ? textEl.innerText.substring(0, 40) + '...' : '[No text]';
        console.log(`❤️ Liked #${totalLiked}: "${preview}"`);
        
        // Also retweet if enabled
        if (CONFIG.alsoRetweet) {
          await sleep(500);
          const rtBtn = tweet.querySelector($retweetButton);
          if (rtBtn) {
            rtBtn.click();
            await sleep(300);
            const confirmBtn = document.querySelector($confirmRetweet);
            if (confirmBtn) {
              confirmBtn.click();
              totalRetweeted++;
              console.log(`   🔄 Retweeted`);
            }
          }
        }
        
        await sleep(randomDelay());
        
      } catch (e) {
        console.warn('⚠️ Error:', e.message);
      }
    }
    
    // Scroll for more
    window.scrollTo(0, document.body.scrollHeight);
    await sleep(CONFIG.scrollDelay);
    scrolls++;
    
    if (scrolls % 10 === 0) {
      console.log(`📜 Scrolled ${scrolls} times, liked ${totalLiked}...`);
    }
  }
  
  console.log('');
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║  ✅ AUTO LIKER COMPLETE!                                   ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log(`❤️ Total liked: ${totalLiked}`);
  if (CONFIG.alsoRetweet) {
    console.log(`🔄 Total retweeted: ${totalRetweeted}`);
  }
  console.log('');
  
  return { liked: totalLiked, retweeted: totalRetweeted };
})();

});
  register("backup-account", function(){
var CONFIG = {
  // How many items to collect per category
  maxTweets: 100,
  maxLikes: 100,
  maxBookmarks: 100,
  maxFollowing: 500,
  maxFollowers: 500,
  
  // Delay between scroll actions (ms)
  scrollDelay: 2000,
  
  // Auto-download backup when complete
  autoDownload: true
};
try{if(typeof window!=='undefined'&&window.__XA_LAUNCH_CFG){Object.assign(CONFIG,window.__XA_LAUNCH_CFG);}}catch(_xa){}


/**
 * ============================================================
 * 🚀 SCRIPT START - by nichxbt
 * ============================================================
 */

(async function backupAccount() {
  const sleep = (ms) => new Promise(r => setTimeout(r, ms));
  
  // DOM Selectors
  const $tweet = '[data-testid="tweet"]';
  const $tweetText = '[data-testid="tweetText"]';
  const $userCell = '[data-testid="UserCell"]';
  const $userName = '[data-testid="User-Name"]';
  
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║  💾 FULL ACCOUNT BACKUP                                    ║');
  console.log('║  by nichxbt - https://github.com/nirholas/XActions         ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log('');
  
  // Storage for backup data
  const backupData = {
    meta: {
      createdAt: new Date().toISOString(),
      source: 'XActions Backup Tool',
      version: '1.0.0'
    },
    profile: null,
    tweets: [],
    likes: [],
    bookmarks: [],
    following: [],
    followers: []
  };
  
  // Helper to extract tweet data
  const extractTweetData = (tweetEl) => {
    const textEl = tweetEl.querySelector($tweetText);
    const timeEl = tweetEl.querySelector('time');
    // The timestamp's enclosing anchor is the tweet's own permalink; the first
    // /status/ link in the article can belong to a quoted tweet
    const linkEl = (timeEl && timeEl.closest('a[href*="/status/"]')) ||
                   tweetEl.querySelector('a[href*="/status/"]');
    const userLink = tweetEl.querySelector('[data-testid="User-Name"] a[href^="/"]') ||
                     tweetEl.querySelector('a[href^="/"]');

    return {
      text: textEl?.textContent || '',
      url: linkEl?.href || '',
      tweetId: linkEl?.href?.match(/status\/(\d+)/)?.[1] || '',
      timestamp: timeEl?.dateTime || '',
      username: userLink?.getAttribute('href')?.replace('/', '')?.split('/')[0] || ''
    };
  };
  
  // Helper to extract user data
  const extractUserData = (userEl) => {
    const nameEl = userEl.querySelector($userName);
    const linkEl = userEl.querySelector('a[href^="/"]');
    const bioEl = userEl.querySelector('[dir="auto"]:not([data-testid])');
    
    return {
      name: nameEl?.textContent?.split('@')[0]?.trim() || '',
      username: linkEl?.getAttribute('href')?.replace('/', '')?.split('/')[0] || '',
      bio: bioEl?.textContent || '',
      url: linkEl?.href || ''
    };
  };
  
  // Scroll and collect items
  const scrollAndCollect = async (selector, extractor, maxItems, itemName) => {
    const items = new Map();
    let lastCount = 0;
    let noNewItems = 0;
    
    console.log(`📥 Collecting ${itemName}...`);
    
    while (items.size < maxItems && noNewItems < 5) {
      const elements = document.querySelectorAll(selector);
      
      elements.forEach(el => {
        try {
          const data = extractor(el);
          const key = data.tweetId || data.username || data.url || JSON.stringify(data);
          if (key && !items.has(key)) {
            items.set(key, data);
          }
        } catch (e) {
          // Skip invalid elements
        }
      });
      
      if (items.size === lastCount) {
        noNewItems++;
      } else {
        noNewItems = 0;
        lastCount = items.size;
      }
      
      console.log(`   📊 ${items.size} ${itemName} collected...`);
      
      window.scrollBy(0, window.innerHeight);
      await sleep(CONFIG.scrollDelay);
    }
    
    return Array.from(items.values());
  };
  
  // Download backup file
  const downloadBackup = (data) => {
    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `xactions-backup-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    console.log('📁 Backup file downloaded!');
  };
  
  // Create XActions backup interface
  window.XActions = window.XActions || {};
  window.XActions.Backup = {
    data: backupData,
    
    // Backup tweets from current page
    tweets: async () => {
      console.log('🐦 Backing up tweets...');
      console.log('📍 Make sure you are on your profile page (Posts tab)');
      await sleep(1000);
      backupData.tweets = await scrollAndCollect($tweet, extractTweetData, CONFIG.maxTweets, 'tweets');
      console.log(`✅ Collected ${backupData.tweets.length} tweets`);
      return backupData.tweets;
    },
    
    // Backup likes
    likes: async () => {
      console.log('❤️ Backing up likes...');
      console.log('📍 Navigate to your Likes tab first: https://x.com/YOUR_USERNAME/likes');
      await sleep(1000);
      backupData.likes = await scrollAndCollect($tweet, extractTweetData, CONFIG.maxLikes, 'likes');
      console.log(`✅ Collected ${backupData.likes.length} likes`);
      return backupData.likes;
    },
    
    // Backup bookmarks
    bookmarks: async () => {
      console.log('🔖 Backing up bookmarks...');
      console.log('📍 Navigate to Bookmarks: https://x.com/i/bookmarks');
      await sleep(1000);
      backupData.bookmarks = await scrollAndCollect($tweet, extractTweetData, CONFIG.maxBookmarks, 'bookmarks');
      console.log(`✅ Collected ${backupData.bookmarks.length} bookmarks`);
      return backupData.bookmarks;
    },
    
    // Backup following list
    following: async () => {
      console.log('👥 Backing up following list...');
      console.log('📍 Navigate to Following: https://x.com/YOUR_USERNAME/following');
      await sleep(1000);
      backupData.following = await scrollAndCollect($userCell, extractUserData, CONFIG.maxFollowing, 'following');
      console.log(`✅ Collected ${backupData.following.length} following`);
      return backupData.following;
    },
    
    // Backup followers list
    followers: async () => {
      console.log('👥 Backing up followers list...');
      console.log('📍 Navigate to Followers: https://x.com/YOUR_USERNAME/followers');
      await sleep(1000);
      backupData.followers = await scrollAndCollect($userCell, extractUserData, CONFIG.maxFollowers, 'followers');
      console.log(`✅ Collected ${backupData.followers.length} followers`);
      return backupData.followers;
    },
    
    // Get current profile info
    profile: () => {
      const name = document.querySelector('[data-testid="UserName"]')?.textContent || '';
      const bio = document.querySelector('[data-testid="UserDescription"]')?.textContent || '';
      const location = document.querySelector('[data-testid="UserLocation"]')?.textContent || '';
      const website = document.querySelector('[data-testid="UserUrl"]')?.textContent || '';
      const joinDate = document.querySelector('[data-testid="UserJoinDate"]')?.textContent || '';
      
      backupData.profile = {
        name,
        bio,
        location,
        website,
        joinDate,
        capturedAt: new Date().toISOString()
      };
      
      console.log('📋 Profile info captured:', backupData.profile);
      return backupData.profile;
    },
    
    // Download current backup
    download: () => {
      backupData.meta.downloadedAt = new Date().toISOString();
      downloadBackup(backupData);
    },
    
    // Show summary
    summary: () => {
      console.log('');
      console.log('📊 BACKUP SUMMARY:');
      console.log(`   🐦 Tweets: ${backupData.tweets.length}`);
      console.log(`   ❤️ Likes: ${backupData.likes.length}`);
      console.log(`   🔖 Bookmarks: ${backupData.bookmarks.length}`);
      console.log(`   👥 Following: ${backupData.following.length}`);
      console.log(`   👥 Followers: ${backupData.followers.length}`);
      console.log(`   📋 Profile: ${backupData.profile ? 'Yes' : 'No'}`);
      console.log('');
    },
    
    // Full backup (run all)
    full: async () => {
      console.log('🚀 Starting full backup...');
      console.log('');
      console.log('⚠️ This is a guided process. Follow the instructions.');
      console.log('');
      
      // Profile
      window.XActions.Backup.profile();
      
      console.log('');
      console.log('📋 NEXT STEPS (run each command after navigating):');
      console.log('');
      console.log('1. Stay on profile → XActions.Backup.tweets()');
      console.log('2. Go to Likes tab → XActions.Backup.likes()');
      console.log('3. Go to Bookmarks → XActions.Backup.bookmarks()');
      console.log('4. Go to Following → XActions.Backup.following()');
      console.log('5. Go to Followers → XActions.Backup.followers()');
      console.log('6. When done → XActions.Backup.download()');
      console.log('');
    },
    
    // Help
    help: () => {
      console.log('');
      console.log('📋 BACKUP COMMANDS:');
      console.log('');
      console.log('   XActions.Backup.full()      - Start guided backup');
      console.log('   XActions.Backup.tweets()    - Backup tweets');
      console.log('   XActions.Backup.likes()     - Backup likes');
      console.log('   XActions.Backup.bookmarks() - Backup bookmarks');
      console.log('   XActions.Backup.following() - Backup following');
      console.log('   XActions.Backup.followers() - Backup followers');
      console.log('   XActions.Backup.profile()   - Capture profile info');
      console.log('   XActions.Backup.summary()   - Show backup summary');
      console.log('   XActions.Backup.download()  - Download backup file');
      console.log('');
    }
  };
  
  console.log('✅ Account Backup Tool loaded!');
  console.log('');
  console.log('📋 QUICK START:');
  console.log('   Run XActions.Backup.full() for guided backup');
  console.log('   Run XActions.Backup.help() for all commands');
  console.log('');
})();

});
  register("best-time-to-post", function(){
var CONFIG = {
  // Number of posts to analyze
  maxPosts: 100,
  
  // Delay between scrolls (ms)
  scrollDelay: 1500,
  
  // Maximum scroll attempts
  maxScrolls: 50,
  
  // Retry when no new posts found
  maxRetries: 3
};
try{if(typeof window!=='undefined'&&window.__XA_LAUNCH_CFG){Object.assign(CONFIG,window.__XA_LAUNCH_CFG);}}catch(_xa){}


/**
 * ============================================================
 * 🚀 SCRIPT START
 * ============================================================
 */

(async function bestTimeToPost() {
  const sleep = (ms) => new Promise(r => setTimeout(r, ms));

  console.log(`
╔══════════════════════════════════════════════════════════════╗
║  ⏰ XActions — Best Time To Post                             ║
║  Analyze when your audience is most active                   ║
╚══════════════════════════════════════════════════════════════╝
  `);

  const $tweet = 'article[data-testid="tweet"]';
  const $tweetText = '[data-testid="tweetText"]';
  const $like = '[data-testid="like"], [data-testid="unlike"]';
  const $retweet = '[data-testid="retweet"], [data-testid="unretweet"]';
  const $reply = '[data-testid="reply"]';

  const parseCount = (str) => {
    if (!str) return 0;
    str = str.replace(/,/g, '').trim();
    const match = str.match(/([\d.]+)([KMB])?/i);
    if (match) {
      let num = parseFloat(match[1]);
      const multipliers = { 'K': 1000, 'M': 1000000, 'B': 1000000000 };
      if (match[2]) num *= multipliers[match[2].toUpperCase()];
      return Math.round(num);
    }
    return 0;
  };

  const username = window.location.pathname.match(/^\/([^\/]+)/)?.[1];
  if (!username || ['home', 'explore', 'notifications', 'messages', 'i'].includes(username)) {
    console.error('❌ Please navigate to a profile page first!');
    return;
  }

  console.log(`📊 Analyzing posting patterns for @${username}\n`);
  console.log('🔄 Scrolling to collect posts...\n');

  const posts = new Map();
  let retries = 0;
  let scrollCount = 0;

  while (posts.size < CONFIG.maxPosts && scrollCount < CONFIG.maxScrolls && retries < CONFIG.maxRetries) {
    const prevSize = posts.size;
    
    document.querySelectorAll($tweet).forEach(tweet => {
      // Get tweet ID
      const timeLink = tweet.querySelector('a[href*="/status/"] time')?.closest('a');
      const tweetUrl = timeLink?.getAttribute('href') || '';
      const tweetId = tweetUrl.split('/status/')[1]?.split('?')[0];
      
      if (!tweetId || posts.has(tweetId)) return;

      // Get timestamp
      const timeEl = tweet.querySelector('time');
      const timestamp = timeEl?.getAttribute('datetime');
      if (!timestamp) return;

      // Get engagement
      const likeBtn = tweet.querySelector($like);
      const retweetBtn = tweet.querySelector($retweet);
      const replyBtn = tweet.querySelector($reply);

      const likes = parseCount(likeBtn?.getAttribute('aria-label')?.match(/(\d[\d,.]*[KMB]?)/)?.[1] || '0');
      const retweets = parseCount(retweetBtn?.getAttribute('aria-label')?.match(/(\d[\d,.]*[KMB]?)/)?.[1] || '0');
      const replies = parseCount(replyBtn?.getAttribute('aria-label')?.match(/(\d[\d,.]*[KMB]?)/)?.[1] || '0');

      const date = new Date(timestamp);
      
      posts.set(tweetId, {
        id: tweetId,
        timestamp,
        hour: date.getHours(),
        dayOfWeek: date.getDay(),
        engagement: likes + retweets + replies,
        likes,
        retweets,
        replies
      });
    });

    if (posts.size === prevSize) retries++;
    else retries = 0;

    console.log(`   Found ${posts.size} posts...`);
    
    window.scrollTo(0, document.body.scrollHeight);
    await sleep(CONFIG.scrollDelay);
    scrollCount++;
  }

  const postsArray = Array.from(posts.values());
  
  if (postsArray.length < 10) {
    console.error('❌ Not enough posts to analyze. Need at least 10 posts.');
    return;
  }

  console.log(`\n✅ Analyzed ${postsArray.length} posts\n`);

  // Analyze by hour
  const hourStats = {};
  for (let h = 0; h < 24; h++) {
    hourStats[h] = { posts: 0, totalEngagement: 0 };
  }

  postsArray.forEach(p => {
    hourStats[p.hour].posts++;
    hourStats[p.hour].totalEngagement += p.engagement;
  });

  // Calculate average engagement per hour
  const hourlyAvg = Object.entries(hourStats)
    .filter(([_, data]) => data.posts > 0)
    .map(([hour, data]) => ({
      hour: parseInt(hour),
      posts: data.posts,
      avgEngagement: data.totalEngagement / data.posts
    }))
    .sort((a, b) => b.avgEngagement - a.avgEngagement);

  // Analyze by day of week
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const dayStats = {};
  for (let d = 0; d < 7; d++) {
    dayStats[d] = { posts: 0, totalEngagement: 0 };
  }

  postsArray.forEach(p => {
    dayStats[p.dayOfWeek].posts++;
    dayStats[p.dayOfWeek].totalEngagement += p.engagement;
  });

  const dailyAvg = Object.entries(dayStats)
    .filter(([_, data]) => data.posts > 0)
    .map(([day, data]) => ({
      day: parseInt(day),
      dayName: dayNames[parseInt(day)],
      posts: data.posts,
      avgEngagement: data.totalEngagement / data.posts
    }))
    .sort((a, b) => b.avgEngagement - a.avgEngagement);

  // Format hour for display
  const formatHour = (h) => {
    const ampm = h >= 12 ? 'PM' : 'AM';
    const hour12 = h % 12 || 12;
    return `${hour12}:00 ${ampm}`;
  };

  const formatNum = (n) => {
    if (n >= 1000) return (n / 1000).toFixed(1) + 'K';
    return Math.round(n).toString();
  };

  // Output results
  console.log('═'.repeat(60));
  console.log('⏰ BEST TIMES TO POST');
  console.log('═'.repeat(60));

  console.log('\n🕐 BY HOUR (Your Local Time):');
  console.log('─'.repeat(50));
  
  hourlyAvg.slice(0, 8).forEach((h, i) => {
    const bar = '█'.repeat(Math.round(h.avgEngagement / (hourlyAvg[0].avgEngagement || 1) * 20));
    const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : '  ';
    console.log(`${medal} ${formatHour(h.hour).padEnd(10)} ${bar} ${formatNum(h.avgEngagement)} avg (${h.posts} posts)`);
  });

  console.log('\n📅 BY DAY OF WEEK:');
  console.log('─'.repeat(50));
  
  dailyAvg.forEach((d, i) => {
    const bar = '█'.repeat(Math.round(d.avgEngagement / (dailyAvg[0].avgEngagement || 1) * 20));
    const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : '  ';
    console.log(`${medal} ${d.dayName.padEnd(12)} ${bar} ${formatNum(d.avgEngagement)} avg (${d.posts} posts)`);
  });

  // Create heatmap
  console.log('\n📊 ENGAGEMENT HEATMAP:');
  console.log('─'.repeat(50));
  console.log('        ' + ['12a', '3a', '6a', '9a', '12p', '3p', '6p', '9p'].join('  '));
  
  const heatmapData = {};
  postsArray.forEach(p => {
    const key = `${p.dayOfWeek}-${Math.floor(p.hour / 3)}`;
    if (!heatmapData[key]) heatmapData[key] = { count: 0, engagement: 0 };
    heatmapData[key].count++;
    heatmapData[key].engagement += p.engagement;
  });

  const heatValues = Object.values(heatmapData).map(d => d.engagement / d.count);
  const maxHeat = heatValues.length > 0 ? Math.max(...heatValues) : 0;
  const heatChars = [' ', '░', '▒', '▓', '█'];

  dayNames.forEach((day, d) => {
    let row = day.slice(0, 3).padEnd(4) + '    ';
    for (let h = 0; h < 8; h++) {
      const key = `${d}-${h}`;
      const data = heatmapData[key];
      if (data) {
        const intensity = maxHeat > 0
          ? Math.min(4, Math.floor((data.engagement / data.count) / maxHeat * 4))
          : 0;
        row += heatChars[intensity] + '    ';
      } else {
        row += '·    ';
      }
    }
    console.log(row);
  });

  console.log('\n' + '═'.repeat(60));
  console.log('🎯 RECOMMENDATIONS');
  console.log('═'.repeat(60));

  const bestHour = hourlyAvg[0];
  const bestDay = dailyAvg[0];
  const worstHour = hourlyAvg[hourlyAvg.length - 1];

  console.log(`\n✅ BEST time to post: ${bestDay.dayName} at ${formatHour(bestHour.hour)}`);
  console.log(`   Average engagement: ${formatNum(bestHour.avgEngagement)}`);
  
  console.log(`\n❌ WORST time to post: ${formatHour(worstHour.hour)}`);
  console.log(`   Average engagement: ${formatNum(worstHour.avgEngagement)}`);

  // Top 3 time slots
  console.log('\n🏆 TOP 3 POSTING TIMES:');
  hourlyAvg.slice(0, 3).forEach((h, i) => {
    console.log(`   ${i + 1}. ${formatHour(h.hour)} — ${formatNum(h.avgEngagement)} avg engagement`);
  });

  // Save analysis
  const storageKey = `xactions_best_time_${username}`;
  localStorage.setItem(storageKey, JSON.stringify({
    username,
    timestamp: new Date().toISOString(),
    postCount: postsArray.length,
    hourlyAvg,
    dailyAvg
  }));

  console.log('\n' + '═'.repeat(60));
  console.log(`💾 Analysis saved to localStorage`);
  console.log('═'.repeat(60) + '\n');

})();

});
  register("blacklist", function(){
var CONFIG = {
  // Storage key
  storageKey: 'xactions_blacklist',
  
  // Pre-populate with accounts to avoid
  defaultBlacklist: [
    // 'spammer123',
    // 'botaccount',
  ],
};
try{if(typeof window!=='undefined'&&window.__XA_LAUNCH_CFG){Object.assign(CONFIG,window.__XA_LAUNCH_CFG);}}catch(_xa){}


/**
 * ============================================================
 * 🚀 SCRIPT START - by nichxbt
 * ============================================================
 */

(function blacklistManager() {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║  🚫 BLACKLIST MANAGER                                      ║');
  console.log('║  by nichxbt - https://github.com/nirholas/XActions         ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log('');
  
  // Storage helpers
  const getBlacklist = () => {
    try {
      const data = localStorage.getItem(CONFIG.storageKey);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  };
  
  const saveBlacklist = (list) => {
    localStorage.setItem(CONFIG.storageKey, JSON.stringify(list));
  };
  
  // Initialize with defaults if empty
  const init = () => {
    const current = getBlacklist();
    if (current.length === 0 && CONFIG.defaultBlacklist.length > 0) {
      const defaults = CONFIG.defaultBlacklist.map(u => ({
        username: u.replace('@', '').toLowerCase(),
        addedAt: Date.now(),
        reason: 'default'
      }));
      saveBlacklist(defaults);
    }
  };
  
  init();
  
  // Create XActions interface
  window.XActions = window.XActions || {};
  window.XActions.Blacklist = {
    
    // Add user to blacklist
    add: (username, reason = '') => {
      const list = getBlacklist();
      const clean = username.replace('@', '').toLowerCase();
      
      if (list.find(u => u.username === clean)) {
        console.log(`⚠️ @${clean} is already blacklisted.`);
        return false;
      }
      
      list.push({
        username: clean,
        addedAt: Date.now(),
        reason: reason || 'manual'
      });
      
      saveBlacklist(list);
      console.log(`🚫 Added @${clean} to blacklist.`);
      return true;
    },
    
    // Add multiple users
    addBulk: (usernames, reason = 'bulk') => {
      let added = 0;
      usernames.forEach(u => {
        const list = getBlacklist();
        const clean = u.replace('@', '').toLowerCase();
        if (!list.find(x => x.username === clean)) {
          list.push({ username: clean, addedAt: Date.now(), reason });
          saveBlacklist(list);
          added++;
        }
      });
      console.log(`🚫 Added ${added} users to blacklist.`);
    },
    
    // Remove user from blacklist
    remove: (username) => {
      let list = getBlacklist();
      const clean = username.replace('@', '').toLowerCase();
      const before = list.length;
      
      list = list.filter(u => u.username !== clean);
      
      if (list.length < before) {
        saveBlacklist(list);
        console.log(`✅ Removed @${clean} from blacklist.`);
        return true;
      }
      
      console.log(`⚠️ @${clean} was not in blacklist.`);
      return false;
    },
    
    // Check if user is blacklisted
    includes: (username) => {
      const list = getBlacklist();
      const clean = username.replace('@', '').toLowerCase();
      return list.some(u => u.username === clean);
    },
    
    // Alias for includes
    has: (username) => window.XActions.Blacklist.includes(username),
    
    // Get all blacklisted users
    getAll: () => {
      return getBlacklist();
    },
    
    // Get just usernames
    getUsernames: () => {
      return getBlacklist().map(u => u.username);
    },
    
    // Count
    count: () => {
      return getBlacklist().length;
    },
    
    // List all
    list: () => {
      const list = getBlacklist();
      console.log('');
      console.log('═'.repeat(50));
      console.log('🚫 BLACKLISTED USERS');
      console.log('═'.repeat(50));
      
      if (list.length === 0) {
        console.log('No users blacklisted yet.');
      } else {
        list.forEach((u, i) => {
          const date = new Date(u.addedAt).toLocaleDateString();
          console.log(`${i + 1}. @${u.username} (added: ${date}${u.reason ? ', ' + u.reason : ''})`);
        });
      }
      
      console.log('═'.repeat(50));
      console.log(`Total: ${list.length} users`);
      console.log('');
    },
    
    // Search
    search: (query) => {
      const list = getBlacklist();
      const matches = list.filter(u => u.username.includes(query.toLowerCase()));
      
      console.log(`🔍 Found ${matches.length} matches for "${query}":`);
      matches.forEach(u => console.log(`   @${u.username}`));
      
      return matches;
    },
    
    // Clear all
    clear: () => {
      if (confirm('⚠️ Clear entire blacklist?')) {
        saveBlacklist([]);
        console.log('✅ Blacklist cleared.');
      }
    },
    
    // Export
    export: () => {
      const list = getBlacklist();
      const usernames = list.map(u => u.username);
      console.log('📋 Blacklist (copy this):');
      console.log(JSON.stringify(usernames));
      if (navigator.clipboard) {
        navigator.clipboard.writeText(JSON.stringify(usernames))
          .then(() => console.log('✅ Copied to clipboard!'))
          .catch(() => console.log('⚠️ Clipboard copy failed. Copy the JSON above manually.'));
      }
      return usernames;
    },
    
    // Import
    import: (usernamesArray) => {
      if (!Array.isArray(usernamesArray)) {
        try {
          usernamesArray = JSON.parse(usernamesArray);
        } catch {
          console.error('❌ Invalid format. Provide an array of usernames.');
          return;
        }
      }
      
      window.XActions.Blacklist.addBulk(usernamesArray, 'import');
    },
    
    // Block current user (from profile page)
    blockCurrentUser: () => {
      const urlMatch = window.location.href.match(/x\.com\/([^\/\?]+)/);
      if (urlMatch && urlMatch[1]) {
        const username = urlMatch[1];
        if (!['home', 'explore', 'notifications', 'messages', 'i', 'settings'].includes(username)) {
          window.XActions.Blacklist.add(username, 'from profile');
          return true;
        }
      }
      console.error('❌ Not on a user profile page.');
      return false;
    },
    
    // Auto-blacklist users with certain patterns
    autoBlacklist: (options = {}) => {
      const defaults = {
        noProfilePic: true,
        noTweets: true,
        followRatio: 100, // Following / Followers ratio
      };
      
      const opts = { ...defaults, ...options };
      console.log('🤖 Auto-blacklist rules:', opts);
      console.log('💡 This is a configuration helper. Use with other scripts.');
      
      return opts;
    },
    
    // Help
    help: () => {
      console.log('');
      console.log('📋 BLACKLIST COMMANDS:');
      console.log('');
      console.log('   XActions.Blacklist.add("username")');
      console.log('   XActions.Blacklist.add("user", "spam")');
      console.log('   XActions.Blacklist.addBulk(["u1", "u2"])');
      console.log('   XActions.Blacklist.remove("username")');
      console.log('   XActions.Blacklist.has("username")');
      console.log('   XActions.Blacklist.list()');
      console.log('   XActions.Blacklist.search("pattern")');
      console.log('   XActions.Blacklist.count()');
      console.log('   XActions.Blacklist.export()');
      console.log('   XActions.Blacklist.import([...])');
      console.log('   XActions.Blacklist.blockCurrentUser()');
      console.log('   XActions.Blacklist.clear()');
      console.log('');
    }
  };
  
  console.log(`🚫 Blacklist Manager loaded! (${getBlacklist().length} users)`);
  console.log('   Run XActions.Blacklist.help() for commands.');
  console.log('');
})();

});
  register("block-bots", function(){
var CONFIG = {
  // Scroll settings
  scrollDelay: 1500,
  maxScrolls: 50,
  maxRetries: 3,
  
  // Action delay between blocks
  blockDelay: 2000,
  
  // Bot detection thresholds
  detection: {
    // Following/Followers ratio threshold (e.g., following 5000, followers 50 = ratio 100)
    maxFollowingRatio: 50,
    
    // Minimum account age in days
    minAccountAgeDays: 30,
    
    // Maximum following count
    maxFollowing: 5000,
    
    // Minimum followers count
    minFollowers: 5,
    
    // Suspicious bio keywords (case-insensitive)
    suspiciousBioKeywords: [
      'crypto', 'nft', 'giveaway', 'airdrop', 'free money',
      'onlyfans', 'dm for', 'follow back', 'f4f', 'follow4follow',
      'bitcoin', 'eth', '$btc', '$eth', 'forex', 'trading signals',
      'make money', 'passive income', 'work from home',
      'link in bio', 'check bio', 'clickhere', 'sexo', 'sex',
      'camgirl', 'hot girl', 'sugar', 'seeking arrangement'
    ],
    
    // Flag accounts with default profile picture
    flagDefaultAvatar: true,
    
    // Flag accounts with no bio
    flagNoBio: true,
    
    // Flag accounts with very short usernames + numbers
    flagRandomUsername: true
  },
  
  // Dry run mode - set to false to actually block
  dryRun: true,
  
  // Maximum accounts to block per run
  maxBlocks: 50
};
try{if(typeof window!=='undefined'&&window.__XA_LAUNCH_CFG){Object.assign(CONFIG,window.__XA_LAUNCH_CFG);}}catch(_xa){}


/**
 * ============================================================
 * 🚀 SCRIPT START
 * ============================================================
 */

(async function blockBots() {
  const sleep = (ms) => new Promise(r => setTimeout(r, ms));

  console.log(`
╔══════════════════════════════════════════════════════════════╗
║  🤖 XActions — Block Bots                                    ║
║  Detect and block bot accounts                               ║
${CONFIG.dryRun ? '║  ⚠️  DRY RUN MODE - No accounts will be blocked             ║' : '║  🔴 LIVE MODE - Accounts WILL be blocked                    ║'}
╚══════════════════════════════════════════════════════════════╝
  `);

  if (!window.location.pathname.includes('/followers')) {
    console.error('❌ Please navigate to your FOLLOWERS page first!');
    console.log('👉 Go to: https://x.com/YOUR_USERNAME/followers');
    return;
  }

  const $userCell = '[data-testid="UserCell"]';

  // Analyze a user cell for bot indicators
  const analyzeUser = (cell) => {
    const result = {
      username: '',
      displayName: '',
      bio: '',
      isBot: false,
      reasons: [],
      score: 0
    };

    // Get username
    const usernameLink = cell.querySelector('a[href^="/"]');
    if (usernameLink) {
      result.username = usernameLink.getAttribute('href').replace('/', '').split('/')[0];
    }

    // Get display name
    const nameEl = cell.querySelector('[dir="ltr"] span');
    result.displayName = nameEl?.textContent || result.username;

    // Get bio text
    const bioEl = cell.querySelector('[data-testid="UserDescription"]');
    result.bio = bioEl?.textContent?.toLowerCase() || '';

    // Check for suspicious bio keywords
    const c = CONFIG.detection;
    c.suspiciousBioKeywords.forEach(keyword => {
      if (result.bio.includes(keyword.toLowerCase())) {
        result.score += 20;
        result.reasons.push(`Bio contains "${keyword}"`);
      }
    });

    // Check for no bio
    if (c.flagNoBio && !result.bio) {
      result.score += 10;
      result.reasons.push('No bio');
    }

    // Check for default avatar
    if (c.flagDefaultAvatar) {
      const avatar = cell.querySelector('img[src*="default_profile"]');
      if (avatar) {
        result.score += 15;
        result.reasons.push('Default profile picture');
      }
    }

    // Check for random username pattern (short + many numbers)
    if (c.flagRandomUsername) {
      const numMatch = result.username.match(/\d+/g);
      if (numMatch && numMatch.join('').length >= 6) {
        result.score += 15;
        result.reasons.push('Username has many numbers');
      }
    }

    // Check follower/following stats from cell (if available)
    const statsText = cell.textContent;
    const followingMatch = statsText.match(/([\d,.]+[KMB]?)\s*Following/i);
    const followersMatch = statsText.match(/([\d,.]+[KMB]?)\s*Followers/i);

    if (followingMatch && followersMatch) {
      const following = parseCount(followingMatch[1]);
      const followers = parseCount(followersMatch[1]);
      
      if (following > c.maxFollowing) {
        result.score += 15;
        result.reasons.push(`Following ${following.toLocaleString()} accounts`);
      }
      
      if (followers < c.minFollowers) {
        result.score += 10;
        result.reasons.push(`Only ${followers} followers`);
      }
      
      const ratio = following / (followers || 1);
      if (ratio > c.maxFollowingRatio) {
        result.score += 25;
        result.reasons.push(`High following ratio (${ratio.toFixed(0)}:1)`);
      }
    }

    // Determine if bot based on score
    result.isBot = result.score >= 30;

    return result;
  };

  const parseCount = (str) => {
    if (!str) return 0;
    str = str.replace(/,/g, '');
    const match = str.match(/([\d.]+)([KMB])?/i);
    if (match) {
      let num = parseFloat(match[1]);
      const multipliers = { 'K': 1000, 'M': 1000000, 'B': 1000000000 };
      if (match[2]) num *= multipliers[match[2].toUpperCase()];
      return Math.round(num);
    }
    return 0;
  };

  console.log('🔍 Scanning followers for bot patterns...\n');

  const scannedUsers = new Set();
  const suspectedBots = [];
  let retries = 0;
  let scrollCount = 0;

  while (scrollCount < CONFIG.maxScrolls && retries < CONFIG.maxRetries) {
    const prevSize = scannedUsers.size;

    document.querySelectorAll($userCell).forEach(cell => {
      const analysis = analyzeUser(cell);
      if (!analysis.username || scannedUsers.has(analysis.username)) return;
      
      scannedUsers.add(analysis.username);
      
      if (analysis.isBot) {
        suspectedBots.push({ ...analysis, element: cell });
      }
    });

    if (scannedUsers.size === prevSize) retries++;
    else retries = 0;

    console.log(`   Scanned: ${scannedUsers.size} | Suspected bots: ${suspectedBots.length}`);

    window.scrollTo(0, document.body.scrollHeight);
    await sleep(CONFIG.scrollDelay);
    scrollCount++;
  }

  console.log(`\n✅ Scan complete!`);
  console.log(`   Total scanned: ${scannedUsers.size}`);
  console.log(`   Suspected bots: ${suspectedBots.length}\n`);

  if (suspectedBots.length === 0) {
    console.log('🎉 No suspected bots found!');
    return;
  }

  // Sort by score (highest first)
  suspectedBots.sort((a, b) => b.score - a.score);

  console.log('═'.repeat(60));
  console.log('🤖 SUSPECTED BOT ACCOUNTS');
  console.log('═'.repeat(60));

  suspectedBots.slice(0, 20).forEach((bot, i) => {
    console.log(`\n${i + 1}. @${bot.username} (Score: ${bot.score})`);
    console.log(`   ${bot.displayName}`);
    console.log(`   Reasons: ${bot.reasons.join(', ')}`);
    console.log(`   https://x.com/${bot.username}`);
  });

  if (suspectedBots.length > 20) {
    console.log(`\n... and ${suspectedBots.length - 20} more`);
  }

  if (CONFIG.dryRun) {
    console.log('\n' + '═'.repeat(60));
    console.log('⚠️  DRY RUN MODE');
    console.log('═'.repeat(60));
    console.log('\nTo actually block these accounts:');
    console.log('1. Set CONFIG.dryRun = false at the top of the script');
    console.log('2. Run the script again');
    console.log('\nOr block manually by visiting each profile.');
  } else {
    console.log('\n' + '═'.repeat(60));
    console.log('🔴 BLOCKING ACCOUNTS');
    console.log('═'.repeat(60));

    const toBlock = suspectedBots.slice(0, CONFIG.maxBlocks);
    let blocked = 0;

    for (const bot of toBlock) {
      console.log(`\n⏳ Blocking @${bot.username}...`);
      
      try {
        // Scroll user into view
        bot.element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        await sleep(500);

        // Click on the user cell to open profile or find block option
        const moreButton = bot.element.querySelector('[data-testid="userActions"]');
        if (moreButton) {
          moreButton.click();
          await sleep(500);

          // Find block option in dropdown
          const blockOption = document.querySelector('[data-testid="block"]');
          if (blockOption) {
            blockOption.click();
            await sleep(500);

            // Confirm block
            const confirmBtn = document.querySelector('[data-testid="confirmationSheetConfirm"]');
            if (confirmBtn) {
              confirmBtn.click();
              blocked++;
              console.log(`   ✅ Blocked @${bot.username}`);
            }
          }
        }

        await sleep(CONFIG.blockDelay);
      } catch (e) {
        console.log(`   ❌ Failed to block @${bot.username}: ${e.message}`);
      }
    }

    console.log(`\n✅ Blocked ${blocked} accounts`);
  }

  // Save results
  const storageKey = 'xactions_blocked_bots';
  const existing = JSON.parse(localStorage.getItem(storageKey) || '[]');
  const newEntries = suspectedBots.map(b => ({
    username: b.username,
    score: b.score,
    reasons: b.reasons,
    timestamp: new Date().toISOString()
  }));
  localStorage.setItem(storageKey, JSON.stringify([...existing, ...newEntries].slice(-1000)));

  console.log('\n' + '═'.repeat(60));
  console.log(`💾 Results saved. Export: copy(localStorage.getItem("${storageKey}"))`);
  console.log('═'.repeat(60) + '\n');

})();

});
  register("block-by-keywords", function(){
var CONFIG = {
  // Keywords to look for in bio (case-insensitive)
  blockKeywords: [
    'crypto',
    'nft',
    'giveaway',
    'airdrop',
    'onlyfans',
    'dm for promo',
    'follow back',
    'f4f'
  ],
  
  // Scroll settings
  scrollDelay: 1500,
  maxScrolls: 30,
  maxRetries: 3,
  
  // Delay between blocks
  blockDelay: 2000,
  
  // Dry run - set to false to actually block
  dryRun: true,
  
  // Max accounts to block per run
  maxBlocks: 50
};
try{if(typeof window!=='undefined'&&window.__XA_LAUNCH_CFG){Object.assign(CONFIG,window.__XA_LAUNCH_CFG);}}catch(_xa){}


/**
 * ============================================================
 * 🚀 SCRIPT START
 * ============================================================
 */

(async function blockByKeywords() {
  const sleep = (ms) => new Promise(r => setTimeout(r, ms));

  console.log(`
╔══════════════════════════════════════════════════════════════╗
║  🚫 XActions — Block By Keywords                             ║
║  Block users with specific bio keywords                      ║
${CONFIG.dryRun ? '║  ⚠️  DRY RUN MODE - No accounts will be blocked             ║' : '║  🔴 LIVE MODE - Accounts WILL be blocked                    ║'}
╚══════════════════════════════════════════════════════════════╝
  `);

  if (!window.location.pathname.includes('/followers') && !window.location.pathname.includes('/following')) {
    console.error('❌ Please navigate to a followers or following page first!');
    return;
  }

  console.log('🔍 Looking for users with these keywords in bio:');
  CONFIG.blockKeywords.forEach(kw => console.log(`   • ${kw}`));
  console.log('');

  const $userCell = '[data-testid="UserCell"]';
  const scanned = new Set();
  const matches = [];
  let retries = 0;
  let scrollCount = 0;

  while (scrollCount < CONFIG.maxScrolls && retries < CONFIG.maxRetries) {
    const prevSize = scanned.size;

    document.querySelectorAll($userCell).forEach(cell => {
      // Get username
      const link = cell.querySelector('a[href^="/"]');
      const username = link?.getAttribute('href')?.replace('/', '')?.split('/')[0];
      if (!username || scanned.has(username)) return;
      
      scanned.add(username);

      // Get bio
      const bioEl = cell.querySelector('[data-testid="UserDescription"]');
      const bio = (bioEl?.textContent || '').toLowerCase();

      // Check for keywords
      const matchedKeywords = CONFIG.blockKeywords.filter(kw => 
        bio.includes(kw.toLowerCase())
      );

      if (matchedKeywords.length > 0) {
        matches.push({
          username,
          bio: bioEl?.textContent || '',
          keywords: matchedKeywords,
          element: cell
        });
      }
    });

    if (scanned.size === prevSize) retries++;
    else retries = 0;

    console.log(`   Scanned: ${scanned.size} | Matches: ${matches.length}`);

    window.scrollTo(0, document.body.scrollHeight);
    await sleep(CONFIG.scrollDelay);
    scrollCount++;
  }

  console.log(`\n✅ Scan complete!`);
  console.log(`   Total scanned: ${scanned.size}`);
  console.log(`   Matching users: ${matches.length}\n`);

  if (matches.length === 0) {
    console.log('🎉 No users found with those keywords!');
    return;
  }

  console.log('═'.repeat(60));
  console.log('🎯 USERS WITH MATCHING KEYWORDS');
  console.log('═'.repeat(60));

  matches.forEach((m, i) => {
    console.log(`\n${i + 1}. @${m.username}`);
    console.log(`   Keywords: ${m.keywords.join(', ')}`);
    console.log(`   Bio: "${m.bio.slice(0, 100)}${m.bio.length > 100 ? '...' : ''}"`);
  });

  if (CONFIG.dryRun) {
    console.log('\n' + '═'.repeat(60));
    console.log('⚠️  DRY RUN MODE - No blocks performed');
    console.log('Set CONFIG.dryRun = false to actually block');
    console.log('═'.repeat(60));
  } else {
    console.log('\n' + '═'.repeat(60));
    console.log('🔴 BLOCKING MATCHING USERS');
    console.log('═'.repeat(60));

    let blocked = 0;
    const toBlock = matches.slice(0, CONFIG.maxBlocks);

    for (const user of toBlock) {
      try {
        user.element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        await sleep(500);

        const moreButton = user.element.querySelector('[data-testid="userActions"]');
        if (moreButton) {
          moreButton.click();
          await sleep(500);

          const blockOption = document.querySelector('[data-testid="block"]');
          if (blockOption) {
            blockOption.click();
            await sleep(500);

            const confirmBtn = document.querySelector('[data-testid="confirmationSheetConfirm"]');
            if (confirmBtn) {
              confirmBtn.click();
              blocked++;
              console.log(`✅ Blocked @${user.username}`);
            }
          }
        }

        await sleep(CONFIG.blockDelay);
      } catch (e) {
        console.log(`❌ Failed to block @${user.username}`);
      }
    }

    console.log(`\n✅ Blocked ${blocked}/${toBlock.length} accounts`);
  }

  // Save log
  const storageKey = 'xactions_keyword_blocks';
  const log = matches.map(m => ({
    username: m.username,
    keywords: m.keywords,
    timestamp: new Date().toISOString()
  }));
  localStorage.setItem(storageKey, JSON.stringify(log));

  console.log('\n💾 Results saved to localStorage');

})();

});
  register("block-by-ratio", function(){
var CONFIG = {
  // Maximum following/followers ratio allowed
  // e.g., 50 means following 5000, followers 100 = ratio 50:1 = blocked
  maxRatio: 50,
  
  // Minimum following count to consider (avoid false positives on new accounts)
  minFollowing: 100,
  
  // Minimum followers to not flag (very new accounts)
  minFollowers: 5,
  
  // Scroll settings
  scrollDelay: 2000,
  maxScrolls: 30,
  maxRetries: 3,
  
  // Delay between blocks
  blockDelay: 2000,
  
  // Dry run mode
  dryRun: true,
  
  // Max blocks per run
  maxBlocks: 30
};
try{if(typeof window!=='undefined'&&window.__XA_LAUNCH_CFG){Object.assign(CONFIG,window.__XA_LAUNCH_CFG);}}catch(_xa){}


/**
 * ============================================================
 * 🚀 SCRIPT START
 * ============================================================
 */

(async function blockByRatio() {
  const sleep = (ms) => new Promise(r => setTimeout(r, ms));

  console.log(`
╔══════════════════════════════════════════════════════════════╗
║  📊 XActions — Block By Ratio                                ║
║  Block accounts with suspicious following/follower ratios    ║
${CONFIG.dryRun ? '║  ⚠️  DRY RUN MODE - No accounts will be blocked             ║' : '║  🔴 LIVE MODE - Accounts WILL be blocked                    ║'}
╚══════════════════════════════════════════════════════════════╝
  `);

  console.log(`📊 Threshold: Blocking accounts with ratio > ${CONFIG.maxRatio}:1`);
  console.log(`   (following/followers > ${CONFIG.maxRatio})\n`);

  if (!window.location.pathname.includes('/followers')) {
    console.error('❌ Please navigate to a FOLLOWERS page first!');
    return;
  }

  const $userCell = '[data-testid="UserCell"]';

  const parseCount = (str) => {
    if (!str) return 0;
    str = str.replace(/,/g, '');
    const match = str.match(/([\d.]+)([KMB])?/i);
    if (match) {
      let num = parseFloat(match[1]);
      const multipliers = { 'K': 1000, 'M': 1000000, 'B': 1000000000 };
      if (match[2]) num *= multipliers[match[2].toUpperCase()];
      return Math.round(num);
    }
    return 0;
  };

  console.log('🔍 Scanning followers and checking ratios...\n');

  const scanned = new Set();
  const flagged = [];
  let retries = 0;
  let scrollCount = 0;

  while (scrollCount < CONFIG.maxScrolls && retries < CONFIG.maxRetries) {
    const prevSize = scanned.size;

    for (const cell of document.querySelectorAll($userCell)) {
      const link = cell.querySelector('a[href^="/"]');
      const username = link?.getAttribute('href')?.replace('/', '')?.split('/')[0];
      if (!username || scanned.has(username)) continue;

      scanned.add(username);

      // Try to get stats from cell text
      const text = cell.textContent;
      
      // Look for following/followers in the cell
      const followingMatch = text.match(/([\d,.]+[KMB]?)\s*Following/i);
      const followersMatch = text.match(/([\d,.]+[KMB]?)\s*Follower/i);

      if (followingMatch && followersMatch) {
        const following = parseCount(followingMatch[1]);
        const followers = parseCount(followersMatch[1]);
        
        if (following >= CONFIG.minFollowing && followers > 0) {
          const ratio = following / followers;
          
          if (ratio > CONFIG.maxRatio || followers < CONFIG.minFollowers) {
            flagged.push({
              username,
              following,
              followers,
              ratio: ratio.toFixed(1),
              element: cell
            });
          }
        }
      }
    }

    if (scanned.size === prevSize) retries++;
    else retries = 0;

    console.log(`   Scanned: ${scanned.size} | Flagged: ${flagged.length}`);

    window.scrollTo(0, document.body.scrollHeight);
    await sleep(CONFIG.scrollDelay);
    scrollCount++;
  }

  console.log(`\n✅ Scan complete!`);
  console.log(`   Total scanned: ${scanned.size}`);
  console.log(`   Flagged accounts: ${flagged.length}\n`);

  if (flagged.length === 0) {
    console.log('🎉 No accounts with suspicious ratios found!');
    return;
  }

  // Sort by ratio
  flagged.sort((a, b) => parseFloat(b.ratio) - parseFloat(a.ratio));

  console.log('═'.repeat(60));
  console.log('🚨 ACCOUNTS WITH SUSPICIOUS RATIOS');
  console.log('═'.repeat(60));

  flagged.slice(0, 30).forEach((u, i) => {
    console.log(`\n${i + 1}. @${u.username}`);
    console.log(`   Following: ${u.following.toLocaleString()} | Followers: ${u.followers.toLocaleString()}`);
    console.log(`   Ratio: ${u.ratio}:1`);
  });

  if (flagged.length > 30) {
    console.log(`\n... and ${flagged.length - 30} more`);
  }

  if (CONFIG.dryRun) {
    console.log('\n' + '═'.repeat(60));
    console.log('⚠️  DRY RUN MODE - No blocks performed');
    console.log('Set CONFIG.dryRun = false to actually block');
    console.log('═'.repeat(60));
  } else {
    console.log('\n' + '═'.repeat(60));
    console.log('🔴 BLOCKING FLAGGED ACCOUNTS');
    console.log('═'.repeat(60));

    let blocked = 0;
    const toBlock = flagged.slice(0, CONFIG.maxBlocks);

    for (const user of toBlock) {
      try {
        user.element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        await sleep(500);

        const moreButton = user.element.querySelector('[data-testid="userActions"]');
        if (moreButton) {
          moreButton.click();
          await sleep(500);

          const blockOption = document.querySelector('[data-testid="block"]');
          if (blockOption) {
            blockOption.click();
            await sleep(500);

            const confirmBtn = document.querySelector('[data-testid="confirmationSheetConfirm"]');
            if (confirmBtn) {
              confirmBtn.click();
              blocked++;
              console.log(`✅ Blocked @${user.username} (ratio: ${user.ratio}:1)`);
            }
          }

          // Close menu if still open
          document.body.click();
        }

        await sleep(CONFIG.blockDelay);
      } catch (e) {
        console.log(`❌ Failed to block @${user.username}`);
      }
    }

    console.log(`\n✅ Blocked ${blocked}/${toBlock.length} accounts`);
  }

  // Save log
  const storageKey = 'xactions_ratio_blocks';
  const log = flagged.map(u => ({
    username: u.username,
    ratio: u.ratio,
    following: u.following,
    followers: u.followers,
    timestamp: new Date().toISOString()
  }));
  localStorage.setItem(storageKey, JSON.stringify(log));

  console.log('\n💾 Results saved to localStorage');

})();

});
  register("bookmark-exporter", function(){
var CONFIG = {
  // Maximum bookmarks to export
  maxBookmarks: 1000,
  
  // Scroll delay (increase if bookmarks aren't loading)
  scrollDelay: 1500,
  
  // Max scroll attempts
  maxScrolls: 200,
  
  // Retry when no new bookmarks
  maxRetries: 5,
  
  // Export formats
  exportJSON: true,
  exportCSV: true,
  
  // Copy to clipboard
  copyToClipboard: true
};
try{if(typeof window!=='undefined'&&window.__XA_LAUNCH_CFG){Object.assign(CONFIG,window.__XA_LAUNCH_CFG);}}catch(_xa){}


/**
 * ============================================================
 * 🚀 SCRIPT START
 * ============================================================
 */

(async function bookmarkExporter() {
  const sleep = (ms) => new Promise(r => setTimeout(r, ms));
  
  const $tweet = 'article[data-testid="tweet"]';
  const $tweetText = '[data-testid="tweetText"]';
  
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║  🔖 BOOKMARK EXPORTER                                      ║');
  console.log('║  by nichxbt - https://github.com/nirholas/XActions         ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log('');
  
  // Verify page
  if (!window.location.href.includes('/bookmarks')) {
    console.error('❌ ERROR: Must be on the Bookmarks page!');
    console.log('📍 Go to: https://x.com/i/bookmarks');
    return;
  }
  
  console.log('🚀 Exporting bookmarks...');
  console.log('📜 Auto-scrolling to load all bookmarks...');
  console.log('');
  
  const bookmarks = [];
  const seenIds = new Set();
  let scrolls = 0;
  let retries = 0;
  let lastCount = 0;
  
  /**
   * Extract bookmark data from tweet element
   */
  function extractBookmark(tweet) {
    try {
      // Get tweet ID: the timestamp's enclosing anchor is the tweet's own
      // permalink; the first /status/ link can belong to a quoted tweet
      const timeAnchor = tweet.querySelector('time')?.closest('a[href*="/status/"]');
      const link = timeAnchor || tweet.querySelector('a[href*="/status/"]');
      if (!link) return null;

      const href = link.getAttribute('href');
      const match = href.match(/\/status\/(\d+)/);
      if (!match) return null;
      
      const tweetId = match[1];
      if (seenIds.has(tweetId)) return null;
      seenIds.add(tweetId);
      
      // Get author (User-Name block is the real author; a bare first link in
      // the article can belong to a reposter's socialContext or a quoted tweet)
      const authorLink = tweet.querySelector('[data-testid="User-Name"] a[href^="/"]') ||
                         tweet.querySelector('a[href^="/"][role="link"]');
      const authorUsername = authorLink ? authorLink.getAttribute('href').replace('/', '').split('/')[0] : 'unknown';
      
      // Get display name
      const nameSpan = tweet.querySelector('[dir="ltr"] span');
      const authorName = nameSpan ? nameSpan.textContent : authorUsername;
      
      // Get text
      const textEl = tweet.querySelector($tweetText);
      const text = textEl ? textEl.innerText : '';
      
      // Get timestamp
      const timeEl = tweet.querySelector('time');
      const timestamp = timeEl ? timeEl.getAttribute('datetime') : null;
      const displayTime = timeEl ? timeEl.innerText : '';
      
      // Get engagement metrics
      const getMetric = (testId) => {
        const el = tweet.querySelector(`[data-testid="${testId}"]`);
        const span = el?.querySelector('span span');
        return span ? span.innerText : '0';
      };
      
      // Check for media
      const hasImage = tweet.querySelector('[data-testid="tweetPhoto"]') !== null;
      const hasVideo = tweet.querySelector('[data-testid="videoPlayer"], [data-testid="videoComponent"]') !== null;
      
      // Get image URLs
      const images = [];
      tweet.querySelectorAll('[data-testid="tweetPhoto"] img').forEach(img => {
        if (img.src && img.src.includes('pbs.twimg.com')) {
          images.push(img.src);
        }
      });
      
      // Extract URLs from text
      const urls = [];
      tweet.querySelectorAll('a[href^="https://t.co"]').forEach(a => {
        const expandedUrl = a.getAttribute('title') || a.textContent;
        if (expandedUrl && expandedUrl.startsWith('http')) {
          urls.push(expandedUrl);
        }
      });
      
      return {
        id: tweetId,
        url: `https://x.com/${authorUsername}/status/${tweetId}`,
        author: {
          username: authorUsername,
          name: authorName
        },
        text,
        timestamp,
        displayTime,
        metrics: {
          replies: getMetric('reply'),
          retweets: getMetric('retweet'),
          likes: getMetric('like')
        },
        media: {
          hasImage,
          hasVideo,
          images
        },
        urls,
        exportedAt: new Date().toISOString()
      };
      
    } catch (e) {
      return null;
    }
  }
  
  // Scroll and extract
  while (bookmarks.length < CONFIG.maxBookmarks && scrolls < CONFIG.maxScrolls && retries < CONFIG.maxRetries) {
    const tweets = document.querySelectorAll($tweet);
    
    tweets.forEach(tweet => {
      const bookmark = extractBookmark(tweet);
      if (bookmark) {
        bookmarks.push(bookmark);
      }
    });
    
    if (bookmarks.length === lastCount) {
      retries++;
    } else {
      retries = 0;
      lastCount = bookmarks.length;
    }
    
    console.log(`📊 Exported ${bookmarks.length} bookmarks...`);
    
    window.scrollTo(0, document.body.scrollHeight);
    await sleep(CONFIG.scrollDelay);
    scrolls++;
  }
  
  console.log('');
  console.log(`✅ Finished exporting: ${bookmarks.length} bookmarks`);
  console.log('');
  
  // Build result
  const result = {
    exportedAt: new Date().toISOString(),
    totalBookmarks: bookmarks.length,
    bookmarks
  };
  
  // Download JSON
  if (CONFIG.exportJSON) {
    const jsonBlob = new Blob([JSON.stringify(result, null, 2)], { type: 'application/json' });
    const jsonUrl = URL.createObjectURL(jsonBlob);
    const jsonLink = document.createElement('a');
    jsonLink.href = jsonUrl;
    jsonLink.download = `bookmarks_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(jsonLink);
    jsonLink.click();
    document.body.removeChild(jsonLink);
    URL.revokeObjectURL(jsonUrl);
    console.log('💾 JSON downloaded!');
  }
  
  // Download CSV
  if (CONFIG.exportCSV) {
    const headers = ['ID', 'Author', 'Username', 'Text', 'Date', 'Likes', 'Retweets', 'Replies', 'Has Image', 'Has Video', 'URL'];
    const rows = bookmarks.map(b => [
      b.id,
      `"${b.author.name.replace(/"/g, '""')}"`,
      b.author.username,
      `"${b.text.replace(/"/g, '""').replace(/\n/g, ' ')}"`,
      `"${b.displayTime.replace(/"/g, '""')}"`,
      b.metrics.likes,
      b.metrics.retweets,
      b.metrics.replies,
      b.media.hasImage,
      b.media.hasVideo,
      b.url
    ].join(','));
    
    const csv = [headers.join(','), ...rows].join('\n');
    const csvBlob = new Blob([csv], { type: 'text/csv' });
    const csvUrl = URL.createObjectURL(csvBlob);
    const csvLink = document.createElement('a');
    csvLink.href = csvUrl;
    csvLink.download = `bookmarks_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(csvLink);
    csvLink.click();
    document.body.removeChild(csvLink);
    URL.revokeObjectURL(csvUrl);
    console.log('💾 CSV downloaded!');
  }
  
  // Copy to clipboard
  if (CONFIG.copyToClipboard) {
    try {
      await navigator.clipboard.writeText(JSON.stringify(result, null, 2));
      console.log('📋 JSON copied to clipboard!');
    } catch (e) {}
  }
  
  console.log('');
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║  ✅ EXPORT COMPLETE!                                       ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log(`📊 Total bookmarks: ${bookmarks.length}`);
  console.log('');
  
  window.exportedBookmarks = result;
  console.log('💡 Access data via: window.exportedBookmarks');
  
  return result;
})();

});
  register("clear-all-bookmarks", function(){
var CONFIG = {
  // Maximum bookmarks to remove (0 = unlimited)
  maxRemove: 0,
  
  // Delay between removals (ms)
  removeDelay: 1500,
  
  // Delay after scrolling (ms)
  scrollDelay: 2000,
  
  // Max retries when no bookmarks found
  maxRetries: 5,
  
  // Show confirmation prompt
  confirmStart: true
};
try{if(typeof window!=='undefined'&&window.__XA_LAUNCH_CFG){Object.assign(CONFIG,window.__XA_LAUNCH_CFG);}}catch(_xa){}


/**
 * ============================================================
 * 🚀 SCRIPT START - by nichxbt
 * ============================================================
 */

(async function clearAllBookmarks() {
  const sleep = (ms) => new Promise(r => setTimeout(r, ms));
  
  // DOM Selectors
  const $removeBookmarkBtn = '[data-testid="removeBookmark"]';
  const $bookmarkBtn = '[data-testid="bookmark"]'; // Filled bookmark = already bookmarked
  const $tweet = '[data-testid="tweet"]';
  const $moreBtn = '[data-testid="caret"]';
  const $removeFromBookmarks = '[data-testid="removeBookmark"]';
  
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║  🗑️ CLEAR ALL BOOKMARKS                                    ║');
  console.log('║  by nichxbt - https://github.com/nirholas/XActions         ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log('');
  
  // Verify we're on the right page
  if (!window.location.href.includes('/bookmarks')) {
    console.error('❌ ERROR: You must be on your Bookmarks page!');
    console.log('📍 Go to: https://x.com/i/bookmarks');
    return;
  }
  
  // Confirmation prompt
  if (CONFIG.confirmStart) {
    const confirmed = confirm(
      '⚠️ WARNING: This will remove ALL your bookmarks!\n\n' +
      'This action cannot be undone.\n\n' +
      'Are you sure you want to continue?'
    );
    if (!confirmed) {
      console.log('❌ Cancelled by user.');
      return;
    }
  }
  
  console.log('🚀 Starting to clear all bookmarks...');
  console.log('');
  
  let totalRemoved = 0;
  let retries = 0;
  
  // Method 2: Use the share menu
  const removeViaMenu = async (tweet) => {
    const moreBtn = tweet.querySelector($moreBtn);
    if (!moreBtn) return false;
    
    moreBtn.click();
    await sleep(500);
    
    // Only click an actual remove-bookmark item; clicking the first menu item
    // blindly would trigger an unrelated action (Not interested, Mute, etc.)
    const removeBtn = document.querySelector($removeFromBookmarks);

    if (removeBtn) {
      removeBtn.click();
      await sleep(300);
      return true;
    }
    
    // Close menu if no remove option
    document.body.click();
    return false;
  };
  
  const processBookmarks = async () => {
    while (retries < CONFIG.maxRetries) {
      // Check limit
      if (CONFIG.maxRemove > 0 && totalRemoved >= CONFIG.maxRemove) {
        console.log(`🛑 Reached limit of ${CONFIG.maxRemove} removals. Stopping.`);
        break;
      }
      
      // Check for empty bookmarks
      const emptyState = document.querySelector('[data-testid="emptyState"]');
      if (emptyState) {
        console.log('📭 Bookmarks page is empty!');
        break;
      }
      
      // Try to remove a bookmark
      const tweets = document.querySelectorAll($tweet);
      
      if (tweets.length === 0) {
        retries++;
        console.log(`🔄 No tweets found. Scrolling... (attempt ${retries}/${CONFIG.maxRetries})`);
        window.scrollTo(0, document.body.scrollHeight);
        await sleep(CONFIG.scrollDelay);
        continue;
      }
      
      // Try first tweet
      const tweet = tweets[0];
      
      // Method 1: Look for remove bookmark button
      const removeBtn = tweet.querySelector($removeBookmarkBtn);
      if (removeBtn) {
        try {
          removeBtn.click();
          totalRemoved++;
          retries = 0;
          console.log(`🗑️ Removed bookmark ${totalRemoved}${CONFIG.maxRemove > 0 ? '/' + CONFIG.maxRemove : ''}`);
          await sleep(CONFIG.removeDelay);
          continue;
        } catch (e) {
          // Try next method
        }
      }
      
      // Method 2: Use tweet menu
      if (await removeViaMenu(tweet)) {
        totalRemoved++;
        retries = 0;
        console.log(`🗑️ Removed bookmark ${totalRemoved} (via menu)`);
        await sleep(CONFIG.removeDelay);
        continue;
      }
      
      // No remove option found, scroll
      retries++;
      console.log(`🔄 Couldn't find remove option. Scrolling... (attempt ${retries}/${CONFIG.maxRetries})`);
      window.scrollTo(0, document.body.scrollHeight);
      await sleep(CONFIG.scrollDelay);
    }
    
    // Done
    console.log('');
    console.log('╔════════════════════════════════════════════════════════════╗');
    console.log(`║  🎉 COMPLETE! Removed ${totalRemoved} bookmarks            `);
    console.log('╚════════════════════════════════════════════════════════════╝');
  };
  
  processBookmarks();
})();

});
  register("clear-all-likes", function(){
var CONFIG = {
  // Maximum likes to remove (0 = unlimited)
  maxUnlikes: 0,
  
  // Delay between unlikes (ms) - higher = safer from rate limits
  unlikeDelay: 1500,
  
  // Delay after scrolling (ms)
  scrollDelay: 2000,
  
  // Max retries when no likes found
  maxRetries: 5,
  
  // Show confirmation prompt
  confirmStart: true
};
try{if(typeof window!=='undefined'&&window.__XA_LAUNCH_CFG){Object.assign(CONFIG,window.__XA_LAUNCH_CFG);}}catch(_xa){}


/**
 * ============================================================
 * 🚀 SCRIPT START - by nichxbt
 * ============================================================
 */

(async function clearAllLikes() {
  const sleep = (ms) => new Promise(r => setTimeout(r, ms));
  
  // DOM Selectors
  const $unlikeButton = '[data-testid="unlike"]';
  const $tweet = '[data-testid="tweet"]';
  
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║  💔 CLEAR ALL LIKES                                        ║');
  console.log('║  by nichxbt - https://github.com/nirholas/XActions         ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log('');
  
  // Verify we're on the right page
  if (!window.location.href.includes('/likes')) {
    console.error('❌ ERROR: You must be on your Likes page!');
    console.log('📍 Go to: https://x.com/YOUR_USERNAME/likes');
    return;
  }
  
  // Confirmation prompt
  if (CONFIG.confirmStart) {
    const confirmed = confirm(
      '⚠️ WARNING: This will unlike ALL your liked tweets!\n\n' +
      'This action cannot be undone.\n\n' +
      'Are you sure you want to continue?'
    );
    if (!confirmed) {
      console.log('❌ Cancelled by user.');
      return;
    }
  }
  
  console.log('🚀 Starting to clear all likes...');
  console.log('');
  
  let totalUnliked = 0;
  let retries = 0;
  
  const processLikes = async () => {
    while (retries < CONFIG.maxRetries) {
      // Check limit
      if (CONFIG.maxUnlikes > 0 && totalUnliked >= CONFIG.maxUnlikes) {
        console.log(`🛑 Reached limit of ${CONFIG.maxUnlikes} unlikes. Stopping.`);
        break;
      }
      
      // Find unlike buttons
      const unlikeButtons = document.querySelectorAll($unlikeButton);
      
      if (unlikeButtons.length === 0) {
        retries++;
        console.log(`🔄 No likes found on screen. Scrolling... (attempt ${retries}/${CONFIG.maxRetries})`);
        window.scrollTo(0, document.body.scrollHeight);
        await sleep(CONFIG.scrollDelay);
        continue;
      }
      
      retries = 0; // Reset retries on success
      
      // Click first unlike button
      const btn = unlikeButtons[0];
      
      try {
        btn.click();
        totalUnliked++;
        console.log(`💔 Unliked tweet ${totalUnliked}${CONFIG.maxUnlikes > 0 ? '/' + CONFIG.maxUnlikes : ''}`);
        await sleep(CONFIG.unlikeDelay);
      } catch (e) {
        console.warn('⚠️ Error clicking unlike button:', e.message);
        await sleep(CONFIG.unlikeDelay);
      }
      
      // Scroll periodically to load more
      if (totalUnliked % 10 === 0) {
        window.scrollTo(0, document.body.scrollHeight);
        await sleep(CONFIG.scrollDelay);
      }
    }
    
    // Done
    console.log('');
    console.log('╔════════════════════════════════════════════════════════════╗');
    console.log(`║  🎉 COMPLETE! Unliked ${totalUnliked} tweets               `);
    console.log('╚════════════════════════════════════════════════════════════╝');
    
    if (retries >= CONFIG.maxRetries) {
      console.log('💡 No more likes found. Your likes page should be empty!');
    }
  };
  
  processLikes();
})();

});
  register("clear-all-retweets", function(){
var CONFIG = {
  // Maximum retweets to undo (0 = unlimited)
  maxUndo: 0,
  
  // Delay between unretweets (ms)
  unretweetDelay: 2000,
  
  // Delay after scrolling (ms)
  scrollDelay: 2500,
  
  // Max retries when no retweets found
  maxRetries: 5,
  
  // Show confirmation prompt
  confirmStart: true
};
try{if(typeof window!=='undefined'&&window.__XA_LAUNCH_CFG){Object.assign(CONFIG,window.__XA_LAUNCH_CFG);}}catch(_xa){}


/**
 * ============================================================
 * 🚀 SCRIPT START - by nichxbt
 * ============================================================
 */

(async function clearAllRetweets() {
  const sleep = (ms) => new Promise(r => setTimeout(r, ms));
  
  // DOM Selectors
  const $retweetBtn = '[data-testid="retweet"]';
  const $unretweetBtn = '[data-testid="unretweet"]';
  const $unretweetConfirm = '[data-testid="unretweetConfirm"]';
  const $tweet = '[data-testid="tweet"]';
  const $retweetIndicator = '[data-testid="socialContext"]';
  
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║  🔄 CLEAR ALL RETWEETS                                     ║');
  console.log('║  by nichxbt - https://github.com/nirholas/XActions         ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log('');
  
  // Confirmation prompt
  if (CONFIG.confirmStart) {
    const confirmed = confirm(
      '⚠️ WARNING: This will undo ALL your retweets!\n\n' +
      'This removes retweets from your timeline.\n\n' +
      'Are you sure you want to continue?'
    );
    if (!confirmed) {
      console.log('❌ Cancelled by user.');
      return;
    }
  }
  
  console.log('🚀 Starting to undo all retweets...');
  console.log('📍 Looking for retweets on your profile...');
  console.log('');
  
  let totalUndone = 0;
  let retries = 0;
  
  // Helper to check if tweet is a retweet
  const isRetweet = (tweet) => {
    // Check for "You reposted" indicator
    const socialContext = tweet.querySelector($retweetIndicator);
    if (socialContext?.textContent?.toLowerCase()?.includes('repost')) {
      return true;
    }
    
    // Check for unretweet button (green retweet icon)
    const unretweetBtn = tweet.querySelector($unretweetBtn);
    return !!unretweetBtn;
  };
  
  // Helper to undo a retweet
  const undoRetweet = async (tweet) => {
    // Find the unretweet button
    const unretweetBtn = tweet.querySelector($unretweetBtn);
    
    if (!unretweetBtn) {
      return false;
    }
    
    try {
      // Click unretweet
      unretweetBtn.click();
      await sleep(500);
      
      // Look for confirmation menu
      const confirmBtn = document.querySelector($unretweetConfirm);
      if (confirmBtn) {
        confirmBtn.click();
        await sleep(300);
      }
      
      return true;
    } catch (e) {
      console.warn('⚠️ Error undoing retweet:', e.message);
      return false;
    }
  };
  
  const processRetweets = async () => {
    while (retries < CONFIG.maxRetries) {
      // Check limit
      if (CONFIG.maxUndo > 0 && totalUndone >= CONFIG.maxUndo) {
        console.log(`🛑 Reached limit of ${CONFIG.maxUndo} unretweets. Stopping.`);
        break;
      }
      
      // Find all tweets
      const tweets = document.querySelectorAll($tweet);
      let foundRetweet = false;
      
      for (const tweet of tweets) {
        if (isRetweet(tweet)) {
          // Only count a pass as progress when an undo succeeds; otherwise a
          // tweet that looks like a retweet but cannot be undone would spin
          // this loop forever with no scroll, retry, or delay
          if (await undoRetweet(tweet)) {
            foundRetweet = true;
            totalUndone++;
            retries = 0;
            console.log(`🔄 Undid retweet ${totalUndone}${CONFIG.maxUndo > 0 ? '/' + CONFIG.maxUndo : ''}`);
            await sleep(CONFIG.unretweetDelay);
            break; // Start over from top
          }
        }
      }
      
      if (!foundRetweet) {
        retries++;
        console.log(`🔍 No retweets found on screen. Scrolling... (attempt ${retries}/${CONFIG.maxRetries})`);
        
        // Scroll to load more
        window.scrollTo(0, document.body.scrollHeight);
        await sleep(CONFIG.scrollDelay);
      }
    }
    
    // Done
    console.log('');
    console.log('╔════════════════════════════════════════════════════════════╗');
    console.log(`║  🎉 COMPLETE! Undid ${totalUndone} retweets                `);
    console.log('╚════════════════════════════════════════════════════════════╝');
    
    if (retries >= CONFIG.maxRetries) {
      console.log('💡 No more retweets found on the visible timeline.');
      console.log('   If you have more retweets, scroll down and run again.');
    }
  };
  
  processRetweets();
})();

});
  register("comment-by-hashtag", function(){
(async function commentByHashtag() {
  'use strict';

  // ===========================================================================
  // CONFIGURATION - Customize these settings
  // ===========================================================================
  const CONFIG = {
    // Hashtags to search for (without #)
    hashtags: ['web3', 'crypto', 'NFT'],
    
    // Comments to randomly pick from
    comments: [
      'Great point! 🔥',
      'This is so true! 💯',
      'Interesting perspective!',
      'Thanks for sharing this! 🙌',
      'Couldn\'t agree more!'
    ],
    
    // Maximum number of comments to post
    maxComments: 10,
    
    // Delay between actions (milliseconds)
    minDelay: 3000,
    maxDelay: 6000,
    
    // Skip tweets from these usernames
    skipUsernames: [],
    
    // Only comment on tweets with minimum engagement
    minLikes: 0,
    minRetweets: 0
  };
try{if(typeof window!=='undefined'&&window.__XA_LAUNCH_CFG){Object.assign(CONFIG,window.__XA_LAUNCH_CFG);}}catch(_xa){}


  // ===========================================================================
  // SELECTORS
  // ===========================================================================
  const SELECTORS = {
    tweet: 'article[data-testid="tweet"]',
    tweetText: '[data-testid="tweetText"]',
    replyButton: '[data-testid="reply"]',
    tweetTextarea: '[data-testid="tweetTextarea_0"]',
    tweetButton: '[data-testid="tweetButton"]',
    searchInput: '[data-testid="SearchBox_Search_Input"]',
    timeline: '[data-testid="primaryColumn"]'
  };

  // ===========================================================================
  // HELPERS
  // ===========================================================================
  const sleep = (ms) => new Promise(r => setTimeout(r, ms));
  
  const randomDelay = () => {
    const delay = Math.floor(Math.random() * (CONFIG.maxDelay - CONFIG.minDelay) + CONFIG.minDelay);
    return sleep(delay);
  };
  
  const randomItem = (arr) => arr[Math.floor(Math.random() * arr.length)];
  
  const log = (msg, type = 'info') => {
    const styles = {
      info: 'color: #1DA1F2; font-weight: bold;',
      success: 'color: #17BF63; font-weight: bold;',
      error: 'color: #E0245E; font-weight: bold;',
      warn: 'color: #FFAD1F; font-weight: bold;'
    };
    console.log(`%c[XActions] ${msg}`, styles[type] || styles.info);
  };

  const getProcessedTweets = () => {
    try {
      return JSON.parse(sessionStorage.getItem('xactions_commented_tweets') || '[]');
    } catch {
      return [];
    }
  };

  const markTweetProcessed = (tweetId) => {
    const tweets = getProcessedTweets();
    if (!tweets.includes(tweetId)) {
      tweets.push(tweetId);
      sessionStorage.setItem('xactions_commented_tweets', JSON.stringify(tweets));
    }
  };

  const getTweetId = (tweet) => {
    // The timestamp's enclosing anchor is the tweet's own permalink; the first
    // /status/ link in the article can belong to a quoted tweet
    const timeEl = tweet.querySelector('time');
    const link = (timeEl && timeEl.closest('a[href*="/status/"]')) ||
                 tweet.querySelector('a[href*="/status/"]');
    if (link) {
      const match = link.href.match(/\/status\/(\d+)/);
      return match ? match[1] : null;
    }
    return null;
  };

  // ===========================================================================
  // MAIN FUNCTIONS
  // ===========================================================================
  const searchHashtag = async (hashtag) => {
    // Assigning location.href reloads the page and kills this script, so only
    // navigate when not already on the hashtag's search results, and tell the
    // user to re-run after the reload (processed IDs persist in sessionStorage)
    const onSearch = window.location.pathname === '/search' &&
      decodeURIComponent(window.location.search).toLowerCase().includes(`#${hashtag.toLowerCase()}`);
    if (onSearch) {
      log(`🔍 On search results for #${hashtag}`);
      return true;
    }
    log(`🔍 Navigating to #${hashtag} search. The page will reload; paste and run this script again to start commenting.`, 'warn');
    const searchUrl = `https://x.com/search?q=%23${encodeURIComponent(hashtag)}&src=typed_query&f=live`;
    window.location.href = searchUrl;
    await sleep(3000);
    return false;
  };

  const postComment = async (tweet, comment) => {
    try {
      // Click reply button
      const replyBtn = tweet.querySelector(SELECTORS.replyButton);
      if (!replyBtn) {
        log('Reply button not found', 'warn');
        return false;
      }
      
      replyBtn.click();
      await sleep(1500);
      
      // Find and fill textarea
      const textarea = document.querySelector(SELECTORS.tweetTextarea);
      if (!textarea) {
        log('Tweet textarea not found', 'warn');
        // Close modal if open
        document.querySelector('[data-testid="app-bar-close"]')?.click();
        return false;
      }
      
      // Focus and type
      textarea.focus();
      await sleep(300);
      
      // Use execCommand for better compatibility
      document.execCommand('insertText', false, comment);
      await sleep(500);
      
      // Click reply/tweet button
      const tweetBtn = document.querySelector(SELECTORS.tweetButton);
      if (!tweetBtn || tweetBtn.disabled) {
        log('Tweet button not found or disabled', 'warn');
        document.querySelector('[data-testid="app-bar-close"]')?.click();
        return false;
      }
      
      tweetBtn.click();
      await sleep(2000);
      
      return true;
    } catch (err) {
      log(`Error posting comment: ${err.message}`, 'error');
      return false;
    }
  };

  const processHashtag = async (hashtag, stats) => {
    if (!(await searchHashtag(hashtag))) return false;
    await sleep(2000);

    // A Set that we also update locally on every mark, not just a one-time
    // snapshot: tweets stay in the DOM across scrolls, so a stale snapshot
    // would cause the same tweet to be re-commented on every outer iteration
    const processedTweets = new Set(getProcessedTweets());
    let scrollAttempts = 0;
    const maxScrollAttempts = 20;

    while (stats.commented < CONFIG.maxComments && scrollAttempts < maxScrollAttempts) {
      const tweets = document.querySelectorAll(SELECTORS.tweet);

      for (const tweet of tweets) {
        if (stats.commented >= CONFIG.maxComments) break;

        const tweetId = getTweetId(tweet);
        if (!tweetId || processedTweets.has(tweetId)) continue;
        
        // Get tweet text
        const textEl = tweet.querySelector(SELECTORS.tweetText);
        const tweetText = textEl?.textContent || '';
        
        // Check if tweet contains hashtag
        if (!tweetText.toLowerCase().includes(`#${hashtag.toLowerCase()}`)) continue;
        
        // Skip certain usernames
        const usernameEl = tweet.querySelector('[data-testid="User-Name"] a');
        const username = usernameEl?.href?.split('/').pop();
        if (CONFIG.skipUsernames.includes(username)) {
          log(`⏭️ Skipping @${username}`, 'warn');
          continue;
        }
        
        stats.processed++;
        
        // Scroll tweet into view
        tweet.scrollIntoView({ behavior: 'smooth', block: 'center' });
        await sleep(1000);
        
        // Pick random comment
        const comment = randomItem(CONFIG.comments);
        
        log(`💬 Commenting on tweet ${tweetId.slice(-6)}...`);
        const success = await postComment(tweet, comment);
        
        if (success) {
          stats.commented++;
          markTweetProcessed(tweetId);
          processedTweets.add(tweetId);
          log(`✅ Comment ${stats.commented}/${CONFIG.maxComments} posted!`, 'success');
        } else {
          stats.failed++;
        }
        
        await randomDelay();
      }
      
      // Scroll for more tweets
      window.scrollBy(0, 800);
      await sleep(1500);
      scrollAttempts++;
    }

    return true;
  };

  // ===========================================================================
  // EXECUTION
  // ===========================================================================
  console.clear();
  console.log(`
╔═══════════════════════════════════════════════════════════════╗
║                                                               ║
║   🏷️  XACTIONS - COMMENT BY HASHTAG                          ║
║                                                               ║
║   Automatically comment on tweets with specific hashtags      ║
║                                                               ║
╚═══════════════════════════════════════════════════════════════╝
  `);
  
  log('🚀 Starting Comment By Hashtag...', 'info');
  log(`📋 Hashtags: ${CONFIG.hashtags.map(h => '#' + h).join(', ')}`);
  log(`💬 Max comments: ${CONFIG.maxComments}`);
  
  const stats = {
    processed: 0,
    commented: 0,
    failed: 0,
    startTime: Date.now()
  };
  
  try {
    for (const hashtag of CONFIG.hashtags) {
      if (stats.commented >= CONFIG.maxComments) break;
      const completed = await processHashtag(hashtag, stats);
      if (!completed) break; // Page is navigating; the script must be re-run
    }
  } catch (err) {
    log(`Fatal error: ${err.message}`, 'error');
  }
  
  // ===========================================================================
  // SUMMARY
  // ===========================================================================
  const duration = ((Date.now() - stats.startTime) / 1000 / 60).toFixed(1);
  
  console.log(`
╔═══════════════════════════════════════════════════════════════╗
║                     📊 COMPLETION SUMMARY                     ║
╠═══════════════════════════════════════════════════════════════╣
║  ✅ Comments posted:  ${String(stats.commented).padEnd(38)}║
║  ❌ Failed:           ${String(stats.failed).padEnd(38)}║
║  📝 Tweets processed: ${String(stats.processed).padEnd(38)}║
║  ⏱️  Duration:         ${String(duration + ' minutes').padEnd(38)}║
╚═══════════════════════════════════════════════════════════════╝
  `);
  
  log('🎉 Comment By Hashtag completed!', 'success');
  
})();

});
  register("comment-by-location", function(){
(async function commentByLocation() {
  'use strict';

  // ===========================================================================
  // CONFIGURATION - Customize these settings
  // ===========================================================================
  const CONFIG = {
    // Location to search for (city, country, or place)
    location: 'New York',
    
    // Optional: geocode for precise location (lat,long,radius)
    // Get coordinates from: https://www.latlong.net/
    geocode: null, // e.g., '40.7128,-74.0060,25mi'
    
    // Search query to combine with location (optional)
    searchQuery: '',
    
    // Comments to randomly pick from
    comments: [
      'Love seeing posts from this area! 🌍',
      'Great content from a great place! 🔥',
      'Thanks for sharing! 💯',
      'Awesome post! 🙌',
      'This is amazing! ✨'
    ],
    
    // Maximum number of comments to post
    maxComments: 10,
    
    // Delay between actions (milliseconds)
    minDelay: 3000,
    maxDelay: 7000,
    
    // Skip tweets from these usernames
    skipUsernames: [],
    
    // Only comment on recent tweets (hours)
    maxTweetAge: 24,
    
    // Skip retweets
    skipRetweets: true
  };
try{if(typeof window!=='undefined'&&window.__XA_LAUNCH_CFG){Object.assign(CONFIG,window.__XA_LAUNCH_CFG);}}catch(_xa){}


  // ===========================================================================
  // SELECTORS
  // ===========================================================================
  const SELECTORS = {
    tweet: 'article[data-testid="tweet"]',
    tweetText: '[data-testid="tweetText"]',
    replyButton: '[data-testid="reply"]',
    tweetTextarea: '[data-testid="tweetTextarea_0"]',
    tweetButton: '[data-testid="tweetButton"]',
    searchInput: '[data-testid="SearchBox_Search_Input"]',
    retweet: '[data-testid="socialContext"]',
    timestamp: 'time'
  };

  // ===========================================================================
  // HELPERS
  // ===========================================================================
  const sleep = (ms) => new Promise(r => setTimeout(r, ms));
  
  const randomDelay = () => {
    const delay = Math.floor(Math.random() * (CONFIG.maxDelay - CONFIG.minDelay) + CONFIG.minDelay);
    return sleep(delay);
  };
  
  const randomItem = (arr) => arr[Math.floor(Math.random() * arr.length)];
  
  const log = (msg, type = 'info') => {
    const styles = {
      info: 'color: #1DA1F2; font-weight: bold;',
      success: 'color: #17BF63; font-weight: bold;',
      error: 'color: #E0245E; font-weight: bold;',
      warn: 'color: #FFAD1F; font-weight: bold;'
    };
    console.log(`%c[XActions] ${msg}`, styles[type] || styles.info);
  };

  const getProcessedTweets = () => {
    try {
      return JSON.parse(sessionStorage.getItem('xactions_location_commented') || '[]');
    } catch {
      return [];
    }
  };

  const markTweetProcessed = (tweetId) => {
    const tweets = getProcessedTweets();
    if (!tweets.includes(tweetId)) {
      tweets.push(tweetId);
      sessionStorage.setItem('xactions_location_commented', JSON.stringify(tweets));
    }
  };

  const getTweetId = (tweet) => {
    // The timestamp's enclosing anchor is the tweet's own permalink; the first
    // /status/ link in the article can belong to a quoted tweet
    const timeEl = tweet.querySelector('time');
    const link = (timeEl && timeEl.closest('a[href*="/status/"]')) ||
                 tweet.querySelector('a[href*="/status/"]');
    if (link) {
      const match = link.href.match(/\/status\/(\d+)/);
      return match ? match[1] : null;
    }
    return null;
  };

  const isTweetRecent = (tweet) => {
    const timeEl = tweet.querySelector(SELECTORS.timestamp);
    if (!timeEl) return true;
    
    const tweetTime = new Date(timeEl.getAttribute('datetime'));
    const hoursAgo = (Date.now() - tweetTime.getTime()) / (1000 * 60 * 60);
    
    return hoursAgo <= CONFIG.maxTweetAge;
  };

  const isRetweet = (tweet) => {
    // Retweets render socialContext as a link to the reposter's profile;
    // pinned posts render it as a plain element. Structural check works on
    // any UI language.
    const socialContext = tweet.querySelector(SELECTORS.retweet);
    return !!socialContext && socialContext.closest('a') !== null;
  };

  // ===========================================================================
  // MAIN FUNCTIONS
  // ===========================================================================
  const buildSearchUrl = () => {
    let query = CONFIG.searchQuery;
    
    if (CONFIG.geocode) {
      query += ` geocode:${CONFIG.geocode}`;
    } else if (CONFIG.location) {
      query += ` near:"${CONFIG.location}"`;
    }
    
    const encodedQuery = encodeURIComponent(query.trim());
    return `https://x.com/search?q=${encodedQuery}&src=typed_query&f=live`;
  };

  const navigateToSearch = async () => {
    // Assigning location.href reloads the page and kills this script, so only
    // navigate when not already on the matching search results, and tell the
    // user to re-run after the reload (processed IDs persist in sessionStorage)
    const query = CONFIG.geocode ? `geocode:${CONFIG.geocode}` : (CONFIG.location ? `near:"${CONFIG.location}"` : '');
    const onSearch = window.location.pathname === '/search' &&
      decodeURIComponent(window.location.search).toLowerCase().includes(query.toLowerCase());
    if (onSearch) {
      log(`🔍 On search results for "${CONFIG.location || CONFIG.geocode}"`);
      return true;
    }
    log(`🔍 Navigating to the location search. The page will reload; paste and run this script again to start commenting.`, 'warn');
    const searchUrl = buildSearchUrl();
    window.location.href = searchUrl;
    await sleep(4000);
    return false;
  };

  const postComment = async (tweet, comment) => {
    try {
      // Click reply button
      const replyBtn = tweet.querySelector(SELECTORS.replyButton);
      if (!replyBtn) {
        log('Reply button not found', 'warn');
        return false;
      }
      
      replyBtn.click();
      await sleep(1500);
      
      // Find and fill textarea
      const textarea = document.querySelector(SELECTORS.tweetTextarea);
      if (!textarea) {
        log('Tweet textarea not found', 'warn');
        document.querySelector('[data-testid="app-bar-close"]')?.click();
        return false;
      }
      
      // Focus and type
      textarea.focus();
      await sleep(300);
      
      document.execCommand('insertText', false, comment);
      await sleep(500);
      
      // Click reply/tweet button
      const tweetBtn = document.querySelector(SELECTORS.tweetButton);
      if (!tweetBtn || tweetBtn.disabled) {
        log('Tweet button not found or disabled', 'warn');
        document.querySelector('[data-testid="app-bar-close"]')?.click();
        return false;
      }
      
      tweetBtn.click();
      await sleep(2000);
      
      return true;
    } catch (err) {
      log(`Error posting comment: ${err.message}`, 'error');
      return false;
    }
  };

  const processTweets = async (stats) => {
    // A Set that we also update locally on every mark, not just a one-time
    // snapshot: tweets stay in the DOM across scrolls, so a stale snapshot
    // would cause the same tweet to be re-processed/re-commented on every
    // outer iteration instead of being skipped as already handled
    const processedTweets = new Set(getProcessedTweets());
    let scrollAttempts = 0;
    const maxScrollAttempts = 30;
    let noNewTweetsCount = 0;

    while (stats.commented < CONFIG.maxComments && scrollAttempts < maxScrollAttempts) {
      const tweets = document.querySelectorAll(SELECTORS.tweet);
      let foundNew = false;

      for (const tweet of tweets) {
        if (stats.commented >= CONFIG.maxComments) break;

        const tweetId = getTweetId(tweet);
        if (!tweetId || processedTweets.has(tweetId)) continue;

        foundNew = true;

        // Skip retweets if configured
        if (CONFIG.skipRetweets && isRetweet(tweet)) {
          log(`⏭️ Skipping retweet`, 'warn');
          markTweetProcessed(tweetId);
          processedTweets.add(tweetId);
          continue;
        }

        // Check tweet age
        if (!isTweetRecent(tweet)) {
          log(`⏭️ Skipping old tweet`, 'warn');
          markTweetProcessed(tweetId);
          processedTweets.add(tweetId);
          continue;
        }

        // Skip certain usernames
        const usernameEl = tweet.querySelector('[data-testid="User-Name"] a');
        const username = usernameEl?.href?.split('/').pop();
        if (CONFIG.skipUsernames.includes(username)) {
          log(`⏭️ Skipping @${username}`, 'warn');
          markTweetProcessed(tweetId);
          processedTweets.add(tweetId);
          continue;
        }
        
        stats.processed++;
        
        // Scroll tweet into view
        tweet.scrollIntoView({ behavior: 'smooth', block: 'center' });
        await sleep(1000);
        
        // Pick random comment
        const comment = randomItem(CONFIG.comments);
        
        log(`💬 Commenting on tweet from ${username || 'user'}...`);
        const success = await postComment(tweet, comment);
        
        if (success) {
          stats.commented++;
          markTweetProcessed(tweetId);
          processedTweets.add(tweetId);
          log(`✅ Comment ${stats.commented}/${CONFIG.maxComments} posted!`, 'success');
        } else {
          stats.failed++;
          markTweetProcessed(tweetId);
          processedTweets.add(tweetId);
        }
        
        await randomDelay();
      }
      
      if (!foundNew) {
        noNewTweetsCount++;
        if (noNewTweetsCount >= 3) {
          log('No more new tweets found', 'warn');
          break;
        }
      } else {
        noNewTweetsCount = 0;
      }
      
      // Scroll for more tweets
      window.scrollBy(0, 800);
      await sleep(1500);
      scrollAttempts++;
    }
  };

  // ===========================================================================
  // EXECUTION
  // ===========================================================================
  console.clear();
  console.log(`
╔═══════════════════════════════════════════════════════════════╗
║                                                               ║
║   📍 XACTIONS - COMMENT BY LOCATION                          ║
║                                                               ║
║   Automatically comment on tweets from specific locations     ║
║                                                               ║
╚═══════════════════════════════════════════════════════════════╝
  `);
  
  log('🚀 Starting Comment By Location...', 'info');
  log(`📍 Location: ${CONFIG.location}`);
  log(`💬 Max comments: ${CONFIG.maxComments}`);
  if (CONFIG.geocode) {
    log(`🌐 Using geocode: ${CONFIG.geocode}`);
  }
  
  const stats = {
    processed: 0,
    commented: 0,
    failed: 0,
    startTime: Date.now()
  };
  
  try {
    if (await navigateToSearch()) {
      await processTweets(stats);
    }
  } catch (err) {
    log(`Fatal error: ${err.message}`, 'error');
    console.error(err);
  }
  
  // ===========================================================================
  // SUMMARY
  // ===========================================================================
  const duration = ((Date.now() - stats.startTime) / 1000 / 60).toFixed(1);
  
  console.log(`
╔═══════════════════════════════════════════════════════════════╗
║                     📊 COMPLETION SUMMARY                     ║
╠═══════════════════════════════════════════════════════════════╣
║  📍 Location:         ${String(CONFIG.location).padEnd(38)}║
║  ✅ Comments posted:  ${String(stats.commented).padEnd(38)}║
║  ❌ Failed:           ${String(stats.failed).padEnd(38)}║
║  📝 Tweets processed: ${String(stats.processed).padEnd(38)}║
║  ⏱️  Duration:         ${String(duration + ' minutes').padEnd(38)}║
╚═══════════════════════════════════════════════════════════════╝
  `);
  
  log('🎉 Comment By Location completed!', 'success');
  
})();

});
  register("competitor-analysis", function(){
var CONFIG = {
  // Number of posts to analyze
  maxPosts: 50,
  
  // Delay between scrolls (ms)
  scrollDelay: 1500,
  
  // Maximum scroll attempts
  maxScrolls: 30,
  
  // Retry when no new posts found
  maxRetries: 3
};
try{if(typeof window!=='undefined'&&window.__XA_LAUNCH_CFG){Object.assign(CONFIG,window.__XA_LAUNCH_CFG);}}catch(_xa){}


/**
 * ============================================================
 * 🚀 SCRIPT START
 * ============================================================
 */

(async function competitorAnalysis() {
  const sleep = (ms) => new Promise(r => setTimeout(r, ms));

  console.log(`
╔══════════════════════════════════════════════════════════════╗
║  🔎 XActions — Competitor Analysis                           ║
║  Analyze competitor accounts for insights                    ║
╚══════════════════════════════════════════════════════════════╝
  `);

  const $tweet = 'article[data-testid="tweet"]';
  const $tweetText = '[data-testid="tweetText"]';
  const $like = '[data-testid="like"], [data-testid="unlike"]';
  const $retweet = '[data-testid="retweet"], [data-testid="unretweet"]';
  const $reply = '[data-testid="reply"]';

  const parseCount = (str) => {
    if (!str) return 0;
    str = str.replace(/,/g, '').trim();
    const match = str.match(/([\d.]+)([KMB])?/i);
    if (match) {
      let num = parseFloat(match[1]);
      const multipliers = { 'K': 1000, 'M': 1000000, 'B': 1000000000 };
      if (match[2]) num *= multipliers[match[2].toUpperCase()];
      return Math.round(num);
    }
    return 0;
  };

  const username = window.location.pathname.match(/^\/([^\/]+)/)?.[1];
  if (!username || ['home', 'explore', 'notifications', 'messages', 'i'].includes(username)) {
    console.error('❌ Please navigate to a profile page first!');
    return;
  }

  // Get profile stats
  const getProfileStats = () => {
    const stats = { followers: 0, following: 0, name: '', bio: '' };
    
    // Get display name
    const nameEl = document.querySelector('[data-testid="UserName"]');
    stats.name = nameEl?.textContent?.split('@')[0]?.trim() || username;
    
    // Get bio
    const bioEl = document.querySelector('[data-testid="UserDescription"]');
    stats.bio = bioEl?.textContent || '';
    
    // Get follower/following counts
    document.querySelectorAll('a').forEach(link => {
      const href = link.getAttribute('href') || '';
      const text = link.textContent || '';
      
      if (href.includes('/followers') || href.includes('/verified_followers')) {
        const match = text.match(/([\d,.]+[KMB]?)/);
        if (match) stats.followers = parseCount(match[1]);
      }
      if (href.includes('/following')) {
        const match = text.match(/([\d,.]+[KMB]?)/);
        if (match) stats.following = parseCount(match[1]);
      }
    });
    
    return stats;
  };

  console.log(`🔎 Analyzing @${username}\n`);
  
  const profileStats = getProfileStats();
  console.log(`👤 ${profileStats.name}`);
  console.log(`📊 Followers: ${profileStats.followers.toLocaleString()} | Following: ${profileStats.following.toLocaleString()}`);
  console.log(`📝 Bio: ${profileStats.bio.slice(0, 100)}${profileStats.bio.length > 100 ? '...' : ''}\n`);
  
  console.log('🔄 Scrolling to analyze posts...\n');

  const posts = new Map();
  let retries = 0;
  let scrollCount = 0;

  while (posts.size < CONFIG.maxPosts && scrollCount < CONFIG.maxScrolls && retries < CONFIG.maxRetries) {
    const prevSize = posts.size;
    
    document.querySelectorAll($tweet).forEach(tweet => {
      const timeLink = tweet.querySelector('a[href*="/status/"] time')?.closest('a');
      const tweetUrl = timeLink?.getAttribute('href') || '';
      const tweetId = tweetUrl.split('/status/')[1]?.split('?')[0];
      
      if (!tweetId || posts.has(tweetId)) return;

      const textEl = tweet.querySelector($tweetText);
      const text = textEl?.textContent || '';

      const timeEl = tweet.querySelector('time');
      const timestamp = timeEl?.getAttribute('datetime');

      const likeBtn = tweet.querySelector($like);
      const retweetBtn = tweet.querySelector($retweet);
      const replyBtn = tweet.querySelector($reply);

      const likes = parseCount(likeBtn?.getAttribute('aria-label')?.match(/(\d[\d,.]*[KMB]?)/)?.[1] || '0');
      const retweets = parseCount(retweetBtn?.getAttribute('aria-label')?.match(/(\d[\d,.]*[KMB]?)/)?.[1] || '0');
      const replies = parseCount(replyBtn?.getAttribute('aria-label')?.match(/(\d[\d,.]*[KMB]?)/)?.[1] || '0');

      // Check for media
      const hasImage = tweet.querySelector('[data-testid="tweetPhoto"]') !== null;
      const hasVideo = tweet.querySelector('[data-testid="videoPlayer"], [data-testid="videoComponent"]') !== null;
      const hasLink = tweet.querySelector('a[href*="t.co"]') !== null;

      // Extract hashtags
      const hashtags = (text.match(/#\w+/g) || []).map(h => h.toLowerCase());

      posts.set(tweetId, {
        id: tweetId,
        text,
        timestamp,
        likes,
        retweets,
        replies,
        engagement: likes + retweets + replies,
        hasImage,
        hasVideo,
        hasLink,
        hashtags,
        url: `https://x.com${tweetUrl}`
      });
    });

    if (posts.size === prevSize) retries++;
    else retries = 0;

    console.log(`   Found ${posts.size} posts...`);
    
    window.scrollTo(0, document.body.scrollHeight);
    await sleep(CONFIG.scrollDelay);
    scrollCount++;
  }

  const postsArray = Array.from(posts.values());
  
  if (postsArray.length === 0) {
    console.error('❌ No posts found.');
    return;
  }

  console.log(`\n✅ Analyzed ${postsArray.length} posts\n`);

  const formatNum = (n) => {
    if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
    if (n >= 1000) return (n / 1000).toFixed(1) + 'K';
    return Math.round(n).toString();
  };

  // Calculate stats
  const totals = {
    likes: postsArray.reduce((sum, p) => sum + p.likes, 0),
    retweets: postsArray.reduce((sum, p) => sum + p.retweets, 0),
    replies: postsArray.reduce((sum, p) => sum + p.replies, 0)
  };

  const averages = {
    likes: totals.likes / postsArray.length,
    retweets: totals.retweets / postsArray.length,
    replies: totals.replies / postsArray.length,
    engagement: (totals.likes + totals.retweets + totals.replies) / postsArray.length
  };

  // Posting frequency
  const postsWithTime = postsArray.filter(p => p.timestamp);
  let postsPerDay = 0;
  if (postsWithTime.length >= 2) {
    const oldest = new Date(postsWithTime[postsWithTime.length - 1].timestamp);
    const newest = new Date(postsWithTime[0].timestamp);
    const days = Math.max(1, (newest - oldest) / (1000 * 60 * 60 * 24));
    postsPerDay = postsWithTime.length / days;
  }

  // Content type analysis
  const withImage = postsArray.filter(p => p.hasImage).length;
  const withVideo = postsArray.filter(p => p.hasVideo).length;
  const withLink = postsArray.filter(p => p.hasLink).length;
  const textOnly = postsArray.filter(p => !p.hasImage && !p.hasVideo && !p.hasLink).length;

  // Hashtag analysis
  const hashtagCount = {};
  postsArray.forEach(p => {
    p.hashtags.forEach(h => {
      hashtagCount[h] = (hashtagCount[h] || 0) + 1;
    });
  });
  const topHashtags = Object.entries(hashtagCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);

  // Output
  console.log('═'.repeat(60));
  console.log(`📊 COMPETITOR ANALYSIS: @${username}`);
  console.log('═'.repeat(60));

  console.log('\n📈 ENGAGEMENT METRICS:');
  console.log('─'.repeat(50));
  console.log(`   Avg ❤️  Likes per post:    ${averages.likes.toFixed(1)}`);
  console.log(`   Avg 🔄 Retweets per post: ${averages.retweets.toFixed(1)}`);
  console.log(`   Avg 💬 Replies per post:  ${averages.replies.toFixed(1)}`);
  console.log(`   Avg Total Engagement:     ${averages.engagement.toFixed(1)}`);
  
  if (profileStats.followers > 0) {
    const engagementRate = (averages.engagement / profileStats.followers) * 100;
    console.log(`\n   📐 Engagement Rate: ${engagementRate.toFixed(3)}%`);
    console.log(`      (avg engagement / followers)`);
  }

  console.log('\n📅 POSTING FREQUENCY:');
  console.log('─'.repeat(50));
  console.log(`   Posts per day: ${postsPerDay.toFixed(1)}`);
  console.log(`   Posts per week: ${(postsPerDay * 7).toFixed(1)}`);

  console.log('\n📷 CONTENT MIX:');
  console.log('─'.repeat(50));
  const total = postsArray.length;
  console.log(`   📝 Text only:  ${textOnly} (${((textOnly/total)*100).toFixed(0)}%)`);
  console.log(`   🖼️  With image: ${withImage} (${((withImage/total)*100).toFixed(0)}%)`);
  console.log(`   🎥 With video: ${withVideo} (${((withVideo/total)*100).toFixed(0)}%)`);
  console.log(`   🔗 With link:  ${withLink} (${((withLink/total)*100).toFixed(0)}%)`);

  // Engagement by content type
  console.log('\n📊 ENGAGEMENT BY CONTENT TYPE:');
  console.log('─'.repeat(50));
  
  const typeStats = [
    { type: '📝 Text only', posts: postsArray.filter(p => !p.hasImage && !p.hasVideo) },
    { type: '🖼️  With image', posts: postsArray.filter(p => p.hasImage) },
    { type: '🎥 With video', posts: postsArray.filter(p => p.hasVideo) }
  ];
  
  typeStats.forEach(t => {
    if (t.posts.length > 0) {
      const avgEng = t.posts.reduce((sum, p) => sum + p.engagement, 0) / t.posts.length;
      console.log(`   ${t.type}: ${formatNum(avgEng)} avg (${t.posts.length} posts)`);
    }
  });

  if (topHashtags.length > 0) {
    console.log('\n#️⃣ TOP HASHTAGS:');
    console.log('─'.repeat(50));
    topHashtags.forEach(([tag, count], i) => {
      console.log(`   ${i + 1}. ${tag} (${count} times)`);
    });
  }

  console.log('\n🏆 TOP PERFORMING POSTS:');
  console.log('─'.repeat(50));
  const topPosts = [...postsArray].sort((a, b) => b.engagement - a.engagement).slice(0, 5);
  topPosts.forEach((p, i) => {
    console.log(`\n   ${i + 1}. ${formatNum(p.engagement)} total engagement`);
    console.log(`      ❤️ ${formatNum(p.likes)} | 🔄 ${formatNum(p.retweets)} | 💬 ${formatNum(p.replies)}`);
    console.log(`      "${p.text.slice(0, 80)}${p.text.length > 80 ? '...' : ''}"`);
    console.log(`      ${p.url}`);
  });

  // Save analysis
  const storageKey = `xactions_competitor_${username}`;
  const data = {
    username,
    timestamp: new Date().toISOString(),
    profileStats,
    postCount: postsArray.length,
    averages,
    postsPerDay,
    contentMix: { textOnly, withImage, withVideo, withLink },
    topHashtags,
    topPosts: topPosts.map(p => ({ text: p.text.slice(0, 200), engagement: p.engagement, url: p.url }))
  };
  localStorage.setItem(storageKey, JSON.stringify(data));

  console.log('\n' + '═'.repeat(60));
  console.log('💡 INSIGHTS TO APPLY:');
  console.log('═'.repeat(60));
  
  const bestType = typeStats.sort((a, b) => {
    const avgA = a.posts.length ? a.posts.reduce((s, p) => s + p.engagement, 0) / a.posts.length : 0;
    const avgB = b.posts.length ? b.posts.reduce((s, p) => s + p.engagement, 0) / b.posts.length : 0;
    return avgB - avgA;
  })[0];
  
  console.log(`\n1. Best content type: ${bestType.type}`);
  console.log(`2. Posting frequency: ${postsPerDay.toFixed(1)} posts/day`);
  if (topHashtags.length > 0) {
    console.log(`3. Key hashtags: ${topHashtags.slice(0, 5).map(h => h[0]).join(', ')}`);
  }

  console.log('\n' + '═'.repeat(60));
  console.log(`💾 Analysis saved! Export: copy(localStorage.getItem("${storageKey}"))`);
  console.log('═'.repeat(60) + '\n');

})();

});
  register("continuous-monitor", function(){
var CONFIG = {
  // How often to check (minutes)
  checkIntervalMinutes: 5,
  
  // Enable browser notifications
  enableNotifications: true,
  
  // Enable sound alert
  enableSound: true,
  
  // Scroll delay when scraping
  scrollDelay: 1500,
  
  // Max scrolls per check
  maxScrolls: 50,
  
  // Max retries when no new users
  maxRetries: 3
};
try{if(typeof window!=='undefined'&&window.__XA_LAUNCH_CFG){Object.assign(CONFIG,window.__XA_LAUNCH_CFG);}}catch(_xa){}


/**
 * ============================================================
 * 🚀 SCRIPT START
 * ============================================================
 */

(async function continuousMonitor() {
  const sleep = (ms) => new Promise(r => setTimeout(r, ms));

  // Re-pasting the script must not stack a second timer on top of a still-running
  // one - that would double (then triple, ...) every check and every notification.
  if (typeof window.stopMonitor === 'function') {
    try { window.stopMonitor(); } catch (e) { /* ignore */ }
  }

  const $userCell = '[data-testid="UserCell"]';
  
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║  🔄 CONTINUOUS MONITOR                                     ║');
  console.log('║  by nichxbt - https://github.com/nirholas/XActions         ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log('');
  
  // Detect page
  const url = window.location.href;
  const pathMatch = url.match(/x\.com\/([^\/]+)\/(followers|following)/);
  
  if (!pathMatch) {
    console.error('❌ ERROR: Must be on a followers or following page!');
    return;
  }
  
  const username = pathMatch[1];
  const pageType = pathMatch[2];
  const storageKey = `xactions_continuous_${username}_${pageType}`;
  
  console.log(`👤 Monitoring: @${username}/${pageType}`);
  console.log(`⏱️ Check interval: ${CONFIG.checkIntervalMinutes} minutes`);
  console.log('');
  
  // Request notification permission
  if (CONFIG.enableNotifications && 'Notification' in window) {
    if (Notification.permission === 'default') {
      console.log('🔔 Requesting notification permission...');
      await Notification.requestPermission();
    }
    if (Notification.permission === 'granted') {
      console.log('✅ Notifications enabled');
    } else {
      console.log('⚠️ Notifications denied - will only show in console');
    }
  }
  
  /**
   * Play notification sound
   */
  function playSound() {
    if (!CONFIG.enableSound) return;
    try {
      const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2teleVUYKm2i4LuUZz8WHVmIpbGniFo5S3+FdWVxdZGdnIVcNjtjlbzOtINGGSl5q9rSmFkkBEKY2OmpaC0UQoHPtHtGFRxii8DDoJxZKS9VhKSahpBdM0FYanRoZmNnc3F3d3V1c3ZzdnFyb2xnaGlubnFwbm1xdXh9g4SFgoKAf4B/e3Z1dHR0dHRyc3N0dHV2d3l7fHx8fH1+f4CBgoKCgYGBgYGAf39+fX18fHt7enp5eXl5eXl5');
      audio.play().catch(() => {});
    } catch (e) {}
  }
  
  /**
   * Send notification
   */
  function notify(title, body) {
    if (CONFIG.enableNotifications && Notification.permission === 'granted') {
      new Notification(title, { body, icon: 'https://abs.twimg.com/favicons/twitter.3.ico' });
    }
    playSound();
  }
  
  /**
   * Get username from cell
   */
  function getUsername(cell) {
    const link = cell.querySelector('a[href^="/"]');
    return link ? link.getAttribute('href')?.replace('/', '').split('/')[0] : null;
  }
  
  /**
   * Scrape current users
   */
  async function scrapeUsers() {
    const users = new Set();
    let lastCount = 0;
    let retries = 0;
    let scrolls = 0;
    
    // Scroll to top first
    window.scrollTo(0, 0);
    await sleep(500);
    
    while (scrolls < CONFIG.maxScrolls && retries < CONFIG.maxRetries) {
      document.querySelectorAll($userCell).forEach(cell => {
        const u = getUsername(cell);
        if (u) users.add(u);
      });
      
      if (users.size === lastCount) {
        retries++;
      } else {
        retries = 0;
        lastCount = users.size;
      }
      
      window.scrollTo(0, document.body.scrollHeight);
      await sleep(CONFIG.scrollDelay);
      scrolls++;
    }
    
    // Scroll back to top
    window.scrollTo(0, 0);
    
    return users;
  }
  
  /**
   * Perform a check
   */
  let checkRunning = false;
  async function performCheck() {
    // A scrape can take longer than a short check interval; never let two
    // checks scroll the page at the same time
    if (checkRunning) return;
    checkRunning = true;
    try {
      await runCheck();
    } finally {
      checkRunning = false;
    }
  }

  async function runCheck() {
    const checkTime = new Date().toLocaleTimeString();
    console.log(`\n🔄 [${checkTime}] Checking for changes...`);
    
    const currentUsers = await scrapeUsers();
    console.log(`   Scraped ${currentUsers.size} users`);
    
    // Load previous
    let previous = null;
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) previous = JSON.parse(saved);
    } catch (e) {}
    
    // Save current
    const snapshot = {
      savedAt: new Date().toISOString(),
      users: Array.from(currentUsers)
    };
    localStorage.setItem(storageKey, JSON.stringify(snapshot));
    
    if (!previous) {
      console.log('   📸 First snapshot saved');
      return;
    }
    
    // Compare
    const prevSet = new Set(previous.users);
    
    const removed = [];
    prevSet.forEach(u => {
      if (!currentUsers.has(u)) removed.push(u);
    });
    
    const added = [];
    currentUsers.forEach(u => {
      if (!prevSet.has(u)) added.push(u);
    });
    
    if (removed.length === 0 && added.length === 0) {
      console.log('   ✅ No changes');
      return;
    }
    
    // Changes detected!
    console.log('');
    console.log('   ⚡ CHANGES DETECTED!');
    
    if (removed.length > 0) {
      console.log(`   🚫 Removed (${removed.length}): ${removed.join(', ')}`);
      notify(`🚫 ${removed.length} Unfollowers`, removed.slice(0, 3).map(u => '@' + u).join(', '));
    }
    
    if (added.length > 0) {
      console.log(`   🆕 Added (${added.length}): ${added.join(', ')}`);
      notify(`🆕 ${added.length} New Followers`, added.slice(0, 3).map(u => '@' + u).join(', '));
    }
  }
  
  // Initial check
  console.log('🚀 Running initial check...');
  await performCheck();
  
  // Schedule periodic checks
  const intervalMs = CONFIG.checkIntervalMinutes * 60 * 1000;
  const intervalId = setInterval(performCheck, intervalMs);
  
  // Store stop function
  window.stopMonitor = () => {
    clearInterval(intervalId);
    console.log('');
    console.log('🛑 Monitoring stopped');
    console.log('');
  };
  
  console.log('');
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║  ✅ MONITORING ACTIVE                                      ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log(`⏱️ Next check in ${CONFIG.checkIntervalMinutes} minutes`);
  console.log('');
  console.log('💡 Keep this tab open!');
  console.log('💡 To stop: window.stopMonitor()');
  console.log('');
})();

});
  register("detect-unfollowers", function(){
var CONFIG = {
  // Delay between scrolls
  scrollDelay: 2000,
  
  // Maximum scroll attempts
  maxScrolls: 100,
  
  // Retry when no new users found
  maxRetries: 5,
  
  // Auto-download report
  autoDownload: true,
  
  // Storage key for snapshot
  storageKey: 'xactions_my_followers'
};
try{if(typeof window!=='undefined'&&window.__XA_LAUNCH_CFG){Object.assign(CONFIG,window.__XA_LAUNCH_CFG);}}catch(_xa){}


/**
 * ============================================================
 * 🚀 SCRIPT START
 * ============================================================
 */

(async function detectUnfollowers() {
  const sleep = (ms) => new Promise(r => setTimeout(r, ms));
  
  // DOM Selectors
  const $userCell = '[data-testid="UserCell"]';
  
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║  🔍 DETECT UNFOLLOWERS                                     ║');
  console.log('║  by nichxbt - https://github.com/nirholas/XActions         ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log('');
  
  // Verify page
  if (!window.location.href.includes('/followers')) {
    console.error('❌ ERROR: You must be on your Followers page!');
    console.log('📍 Go to: https://x.com/YOUR_USERNAME/followers');
    return;
  }
  
  console.log('🚀 Scraping current followers...');
  console.log('📜 Auto-scrolling to load all followers...');
  console.log('');
  
  /**
   * Extract username from user cell
   */
  function getUsername(cell) {
    const link = cell.querySelector('a[href^="/"]');
    if (link) {
      const href = link.getAttribute('href');
      return href ? href.replace('/', '').split('/')[0] : null;
    }
    return null;
  }
  
  /**
   * Extract display name from user cell
   */
  function getDisplayName(cell) {
    const span = cell.querySelector('[dir="ltr"] span');
    return span ? span.textContent : null;
  }
  
  // Scrape all followers
  const currentFollowers = new Map(); // username -> displayName
  let lastCount = 0;
  let retries = 0;
  let scrolls = 0;
  
  while (scrolls < CONFIG.maxScrolls && retries < CONFIG.maxRetries) {
    const cells = document.querySelectorAll($userCell);
    
    cells.forEach(cell => {
      const username = getUsername(cell);
      const displayName = getDisplayName(cell);
      if (username && !currentFollowers.has(username)) {
        currentFollowers.set(username, displayName || username);
      }
    });
    
    if (currentFollowers.size === lastCount) {
      retries++;
    } else {
      retries = 0;
      lastCount = currentFollowers.size;
    }
    
    console.log(`📊 Scraped ${currentFollowers.size} followers...`);
    
    window.scrollTo(0, document.body.scrollHeight);
    await sleep(CONFIG.scrollDelay);
    scrolls++;
  }
  
  console.log('');
  console.log(`✅ Finished scraping: ${currentFollowers.size} followers`);
  
  // Load previous snapshot
  let previousSnapshot = null;
  try {
    const saved = localStorage.getItem(CONFIG.storageKey);
    if (saved) {
      previousSnapshot = JSON.parse(saved);
    }
  } catch (e) {
    console.warn('⚠️ Could not load previous snapshot');
  }
  
  const timestamp = new Date().toISOString();
  
  // Save current snapshot
  const snapshot = {
    savedAt: timestamp,
    count: currentFollowers.size,
    followers: Object.fromEntries(currentFollowers)
  };
  localStorage.setItem(CONFIG.storageKey, JSON.stringify(snapshot));
  console.log('💾 Saved new snapshot to localStorage');
  console.log('');
  
  // Compare if we have previous data
  if (!previousSnapshot) {
    console.log('╔════════════════════════════════════════════════════════════╗');
    console.log('║  📸 FIRST SNAPSHOT SAVED!                                  ║');
    console.log('╚════════════════════════════════════════════════════════════╝');
    console.log(`📊 Followers saved: ${currentFollowers.size}`);
    console.log('');
    console.log('💡 Run this script again later to detect unfollowers!');
    
    window.followerSnapshot = snapshot;
    return snapshot;
  }
  
  // Compare snapshots
  console.log('🔄 Comparing with previous snapshot...');
  console.log(`   Previous: ${previousSnapshot.count} followers (${previousSnapshot.savedAt})`);
  console.log(`   Current: ${currentFollowers.size} followers`);
  console.log('');
  
  const previousUsernames = new Set(Object.keys(previousSnapshot.followers));
  const currentUsernames = new Set(currentFollowers.keys());
  
  // Find unfollowers (in previous but not current)
  const unfollowers = [];
  previousUsernames.forEach(username => {
    if (!currentUsernames.has(username)) {
      unfollowers.push({
        username,
        displayName: previousSnapshot.followers[username]
      });
    }
  });
  
  // Find new followers (in current but not previous)
  const newFollowers = [];
  currentUsernames.forEach(username => {
    if (!previousUsernames.has(username)) {
      newFollowers.push({
        username,
        displayName: currentFollowers.get(username)
      });
    }
  });
  
  // Display results
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║  📊 RESULTS                                                ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log('');
  
  if (unfollowers.length > 0) {
    console.log(`🚫 UNFOLLOWERS (${unfollowers.length}):`);
    unfollowers.forEach((u, i) => {
      console.log(`   ${i + 1}. @${u.username} (${u.displayName})`);
      console.log(`      https://x.com/${u.username}`);
    });
    console.log('');
  } else {
    console.log('✅ No unfollowers detected!');
    console.log('');
  }
  
  if (newFollowers.length > 0) {
    console.log(`🆕 NEW FOLLOWERS (${newFollowers.length}):`);
    newFollowers.forEach((u, i) => {
      console.log(`   ${i + 1}. @${u.username} (${u.displayName})`);
    });
    console.log('');
  } else {
    console.log('📭 No new followers since last check.');
    console.log('');
  }
  
  // Download report
  if (CONFIG.autoDownload && (unfollowers.length > 0 || newFollowers.length > 0)) {
    let report = `UNFOLLOWER DETECTION REPORT\n`;
    report += `${'='.repeat(50)}\n`;
    report += `Generated: ${timestamp}\n`;
    report += `Previous snapshot: ${previousSnapshot.savedAt}\n`;
    report += `Previous count: ${previousSnapshot.count}\n`;
    report += `Current count: ${currentFollowers.size}\n`;
    report += `${'='.repeat(50)}\n\n`;
    
    if (unfollowers.length > 0) {
      report += `UNFOLLOWERS (${unfollowers.length}):\n`;
      report += `${'-'.repeat(30)}\n`;
      unfollowers.forEach((u, i) => {
        report += `${i + 1}. @${u.username} (${u.displayName})\n`;
        report += `   https://x.com/${u.username}\n`;
      });
      report += '\n';
    }
    
    if (newFollowers.length > 0) {
      report += `NEW FOLLOWERS (${newFollowers.length}):\n`;
      report += `${'-'.repeat(30)}\n`;
      newFollowers.forEach((u, i) => {
        report += `${i + 1}. @${u.username} (${u.displayName})\n`;
      });
    }
    
    const blob = new Blob([report], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `unfollowers_${timestamp.split('T')[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    console.log('💾 Report downloaded!');
  }
  
  const result = {
    timestamp,
    previous: previousSnapshot.count,
    current: currentFollowers.size,
    unfollowers,
    newFollowers
  };
  
  window.unfollowerReport = result;
  console.log('');
  console.log('💡 Access data via: window.unfollowerReport');
  
  return result;
})();

});
  register("engagement-analytics", function(){
var CONFIG = {
  // Number of posts to analyze
  maxPosts: 50,
  
  // Delay between scrolls (ms)
  scrollDelay: 1500,
  
  // Maximum scroll attempts
  maxScrolls: 30,
  
  // Retry when no new posts found
  maxRetries: 3
};
try{if(typeof window!=='undefined'&&window.__XA_LAUNCH_CFG){Object.assign(CONFIG,window.__XA_LAUNCH_CFG);}}catch(_xa){}


/**
 * ============================================================
 * 🚀 SCRIPT START
 * ============================================================
 */

(async function engagementAnalytics() {
  const sleep = (ms) => new Promise(r => setTimeout(r, ms));

  console.log(`
╔══════════════════════════════════════════════════════════════╗
║  📊 XActions — Engagement Analytics                          ║
║  Analyze likes, comments, retweets on your posts             ║
╚══════════════════════════════════════════════════════════════╝
  `);

  // Selectors
  const $tweet = 'article[data-testid="tweet"]';
  const $tweetText = '[data-testid="tweetText"]';
  const $like = '[data-testid="like"], [data-testid="unlike"]';
  const $retweet = '[data-testid="retweet"], [data-testid="unretweet"]';
  const $reply = '[data-testid="reply"]';
  const $views = 'a[href*="/analytics"]';

  const parseCount = (str) => {
    if (!str) return 0;
    str = str.replace(/,/g, '').trim();
    const match = str.match(/([\d.]+)([KMB])?/i);
    if (match) {
      let num = parseFloat(match[1]);
      const multipliers = { 'K': 1000, 'M': 1000000, 'B': 1000000000 };
      if (match[2]) num *= multipliers[match[2].toUpperCase()];
      return Math.round(num);
    }
    return 0;
  };

  const getUsername = () => {
    const match = window.location.pathname.match(/^\/([^\/]+)/);
    return match ? match[1] : null;
  };

  const username = getUsername();
  if (!username || ['home', 'explore', 'notifications', 'messages', 'i'].includes(username)) {
    console.error('❌ Please navigate to a profile page first!');
    console.log('👉 Example: https://x.com/YOUR_USERNAME');
    return;
  }

  console.log(`📊 Analyzing engagement for @${username}\n`);
  console.log('🔄 Scrolling to load posts...\n');

  const posts = new Map();
  let retries = 0;
  let scrollCount = 0;

  while (posts.size < CONFIG.maxPosts && scrollCount < CONFIG.maxScrolls && retries < CONFIG.maxRetries) {
    const prevSize = posts.size;
    
    document.querySelectorAll($tweet).forEach(tweet => {
      // Check if this is from the profile owner
      const userLinks = tweet.querySelectorAll('a[href^="/"]');
      let isOwner = false;
      userLinks.forEach(link => {
        if (link.getAttribute('href')?.toLowerCase() === `/${username.toLowerCase()}`) {
          isOwner = true;
        }
      });

      if (!isOwner) return;

      // Get tweet ID from time link
      const timeLink = tweet.querySelector('a[href*="/status/"] time')?.closest('a');
      const tweetUrl = timeLink?.getAttribute('href') || '';
      const tweetId = tweetUrl.split('/status/')[1]?.split('?')[0];
      
      if (!tweetId || posts.has(tweetId)) return;

      // Get tweet text
      const textEl = tweet.querySelector($tweetText);
      const text = textEl?.textContent?.slice(0, 100) || '[No text]';

      // Get engagement counts
      const likeBtn = tweet.querySelector($like);
      const retweetBtn = tweet.querySelector($retweet);
      const replyBtn = tweet.querySelector($reply);
      const viewsEl = tweet.querySelector($views);

      const likes = parseCount(likeBtn?.getAttribute('aria-label')?.match(/(\d[\d,.]*[KMB]?)/)?.[1] || '0');
      const retweets = parseCount(retweetBtn?.getAttribute('aria-label')?.match(/(\d[\d,.]*[KMB]?)/)?.[1] || '0');
      const replies = parseCount(replyBtn?.getAttribute('aria-label')?.match(/(\d[\d,.]*[KMB]?)/)?.[1] || '0');
      const views = parseCount(viewsEl?.textContent || '0');

      // Get timestamp
      const timeEl = tweet.querySelector('time');
      const timestamp = timeEl?.getAttribute('datetime') || '';

      posts.set(tweetId, {
        id: tweetId,
        text,
        likes,
        retweets,
        replies,
        views,
        timestamp,
        url: `https://x.com${tweetUrl}`
      });
    });

    if (posts.size === prevSize) {
      retries++;
    } else {
      retries = 0;
    }

    console.log(`   Found ${posts.size} posts...`);
    
    window.scrollTo(0, document.body.scrollHeight);
    await sleep(CONFIG.scrollDelay);
    scrollCount++;
  }

  const postsArray = Array.from(posts.values());
  
  if (postsArray.length === 0) {
    console.error('❌ No posts found. Make sure you\'re on the correct profile page.');
    return;
  }

  console.log(`\n✅ Analyzed ${postsArray.length} posts\n`);
  console.log('═'.repeat(60));
  console.log('📊 ENGAGEMENT SUMMARY');
  console.log('═'.repeat(60));

  // Calculate totals and averages
  const totals = {
    likes: postsArray.reduce((sum, p) => sum + p.likes, 0),
    retweets: postsArray.reduce((sum, p) => sum + p.retweets, 0),
    replies: postsArray.reduce((sum, p) => sum + p.replies, 0),
    views: postsArray.reduce((sum, p) => sum + p.views, 0)
  };

  const averages = {
    likes: totals.likes / postsArray.length,
    retweets: totals.retweets / postsArray.length,
    replies: totals.replies / postsArray.length,
    views: totals.views / postsArray.length
  };

  const formatNum = (n) => {
    if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
    if (n >= 1000) return (n / 1000).toFixed(1) + 'K';
    return Math.round(n).toString();
  };

  console.log(`\n📈 TOTALS (${postsArray.length} posts):`);
  console.log(`   ❤️  Likes:    ${formatNum(totals.likes)}`);
  console.log(`   🔄 Retweets: ${formatNum(totals.retweets)}`);
  console.log(`   💬 Replies:  ${formatNum(totals.replies)}`);
  console.log(`   👁️  Views:    ${formatNum(totals.views)}`);

  console.log(`\n📊 AVERAGES PER POST:`);
  console.log(`   ❤️  Likes:    ${averages.likes.toFixed(1)}`);
  console.log(`   🔄 Retweets: ${averages.retweets.toFixed(1)}`);
  console.log(`   💬 Replies:  ${averages.replies.toFixed(1)}`);
  console.log(`   👁️  Views:    ${formatNum(averages.views)}`);

  // Engagement rate
  if (totals.views > 0) {
    const engagementRate = ((totals.likes + totals.retweets + totals.replies) / totals.views) * 100;
    console.log(`\n📐 ENGAGEMENT RATE: ${engagementRate.toFixed(2)}%`);
    console.log(`   (Likes + Retweets + Replies) / Views`);
  }

  // Top performing posts
  console.log('\n' + '═'.repeat(60));
  console.log('🏆 TOP PERFORMING POSTS');
  console.log('═'.repeat(60));

  // By likes
  const topLikes = [...postsArray].sort((a, b) => b.likes - a.likes).slice(0, 5);
  console.log('\n❤️  TOP BY LIKES:');
  topLikes.forEach((p, i) => {
    console.log(`   ${i + 1}. ${formatNum(p.likes)} likes — "${p.text.slice(0, 50)}..."`);
    console.log(`      ${p.url}`);
  });

  // By retweets
  const topRetweets = [...postsArray].sort((a, b) => b.retweets - a.retweets).slice(0, 5);
  console.log('\n🔄 TOP BY RETWEETS:');
  topRetweets.forEach((p, i) => {
    console.log(`   ${i + 1}. ${formatNum(p.retweets)} RTs — "${p.text.slice(0, 50)}..."`);
    console.log(`      ${p.url}`);
  });

  // By engagement rate (if views available)
  const postsWithViews = postsArray.filter(p => p.views > 0);
  if (postsWithViews.length > 0) {
    const topEngagement = postsWithViews
      .map(p => ({ ...p, rate: ((p.likes + p.retweets + p.replies) / p.views) * 100 }))
      .sort((a, b) => b.rate - a.rate)
      .slice(0, 5);
    
    console.log('\n📈 TOP BY ENGAGEMENT RATE:');
    topEngagement.forEach((p, i) => {
      console.log(`   ${i + 1}. ${p.rate.toFixed(2)}% — "${p.text.slice(0, 50)}..."`);
      console.log(`      ${p.url}`);
    });
  }

  // Worst performing
  console.log('\n' + '═'.repeat(60));
  console.log('📉 LOWEST PERFORMING (consider deleting or learning from)');
  console.log('═'.repeat(60));
  
  const bottomLikes = [...postsArray].sort((a, b) => a.likes - b.likes).slice(0, 3);
  bottomLikes.forEach((p, i) => {
    console.log(`   ${i + 1}. ${p.likes} likes — "${p.text.slice(0, 50)}..."`);
    console.log(`      ${p.url}`);
  });

  // Save to localStorage
  const storageKey = `xactions_engagement_${username}`;
  const data = {
    username,
    timestamp: new Date().toISOString(),
    postCount: postsArray.length,
    totals,
    averages,
    posts: postsArray
  };
  localStorage.setItem(storageKey, JSON.stringify(data));

  console.log('\n' + '═'.repeat(60));
  console.log(`💾 Data saved! Run again to compare over time.`);
  console.log(`📥 Export: copy(localStorage.getItem("${storageKey}"))`);
  console.log('═'.repeat(60) + '\n');

})();

});
  register("filter-manager", function(){
(function filterManager() {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║  ⚙️ FILTER MANAGER                                         ║');
  console.log('║  by nichxbt - https://github.com/nirholas/XActions         ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log('');
  
  const STORAGE_KEY = 'xactions_filters';
  
  // Default filter configuration
  const defaultFilters = {
    // Follower counts
    followers: {
      min: 0,
      max: Infinity,
      enabled: false
    },
    
    // Following counts
    following: {
      min: 0,
      max: Infinity,
      enabled: false
    },
    
    // Follower/Following ratio
    ratio: {
      min: 0,      // Minimum followers/following ratio
      max: Infinity,
      enabled: false
    },
    
    // Tweet count
    tweets: {
      min: 1,
      max: Infinity,
      enabled: false
    },
    
    // Account age (days)
    accountAge: {
      min: 30,    // At least 30 days old
      enabled: false
    },
    
    // Bio requirements
    bio: {
      required: false,           // Must have bio
      keywords: [],              // Must contain these words
      excludeKeywords: [],       // Must NOT contain these
      minLength: 0,
      enabled: false
    },
    
    // Profile picture
    profilePic: {
      required: false,           // Must have profile pic (not default)
      enabled: false
    },
    
    // Language
    language: {
      allowed: [],               // Empty = all languages
      enabled: false
    },
    
    // Verified status
    verified: {
      skip: false,               // Skip verified accounts
      only: false,               // Only verified accounts
      enabled: false
    },
    
    // Activity
    activity: {
      lastTweetDays: 30,         // Must have tweeted in last X days
      enabled: false
    },
    
    // Spam detection
    spam: {
      skipNoTweets: true,
      skipSuspicious: true,      // Suspicious follower/following ratio
      skipBotPatterns: true,     // Username looks like bot
      enabled: true
    }
  };
  
  // Storage helpers
  // Deep-clone so callers never mutate the shared defaults through the
  // nested category objects a shallow spread would alias.
  const getFilters = () => {
    const base = structuredClone(defaultFilters);
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      if (data) Object.assign(base, JSON.parse(data));
    } catch {
      // Ignore corrupt stored config and fall back to defaults
    }
    // JSON cannot represent Infinity: stored max values round-trip as null,
    // which would make every max comparison fail. Restore them.
    Object.values(base).forEach(settings => {
      if (settings && typeof settings === 'object' && 'max' in settings && settings.max == null) {
        settings.max = Infinity;
      }
    });
    return base;
  };
  
  const saveFilters = (filters) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filters));
  };
  
  // Create XActions interface
  window.XActions = window.XActions || {};
  window.XActions.Filters = {
    
    // Get current filters
    get: () => getFilters(),
    
    // Set a specific filter
    set: (category, key, value) => {
      const filters = getFilters();
      if (filters[category]) {
        filters[category][key] = value;
        saveFilters(filters);
        console.log(`✅ Set ${category}.${key} = ${value}`);
      } else {
        console.error(`❌ Unknown filter category: ${category}`);
      }
    },
    
    // Enable a filter category
    enable: (category) => {
      const filters = getFilters();
      if (filters[category]) {
        filters[category].enabled = true;
        saveFilters(filters);
        console.log(`✅ Enabled ${category} filter`);
      }
    },
    
    // Disable a filter category
    disable: (category) => {
      const filters = getFilters();
      if (filters[category]) {
        filters[category].enabled = false;
        saveFilters(filters);
        console.log(`✅ Disabled ${category} filter`);
      }
    },
    
    // Quick presets
    presets: {
      // Quality followers (engaged users)
      quality: () => {
        const filters = getFilters();
        filters.followers.min = 100;
        filters.followers.max = 50000;
        filters.followers.enabled = true;
        filters.tweets.min = 10;
        filters.tweets.enabled = true;
        filters.bio.required = true;
        filters.bio.enabled = true;
        filters.profilePic.required = true;
        filters.profilePic.enabled = true;
        filters.accountAge.min = 90;
        filters.accountAge.enabled = true;
        saveFilters(filters);
        console.log('✅ Applied QUALITY preset');
      },
      
      // Influencers (high follower counts)
      influencers: () => {
        const filters = getFilters();
        filters.followers.min = 10000;
        filters.followers.max = Infinity;
        filters.followers.enabled = true;
        filters.verified.only = false;
        filters.verified.enabled = false;
        saveFilters(filters);
        console.log('✅ Applied INFLUENCERS preset');
      },
      
      // Small accounts (easier to engage)
      small: () => {
        const filters = getFilters();
        filters.followers.min = 50;
        filters.followers.max = 5000;
        filters.followers.enabled = true;
        filters.activity.lastTweetDays = 7;
        filters.activity.enabled = true;
        saveFilters(filters);
        console.log('✅ Applied SMALL ACCOUNTS preset');
      },
      
      // Anti-spam
      antiSpam: () => {
        const filters = getFilters();
        filters.spam.skipNoTweets = true;
        filters.spam.skipSuspicious = true;
        filters.spam.skipBotPatterns = true;
        filters.spam.enabled = true;
        filters.tweets.min = 5;
        filters.tweets.enabled = true;
        filters.profilePic.required = true;
        filters.profilePic.enabled = true;
        saveFilters(filters);
        console.log('✅ Applied ANTI-SPAM preset');
      },
      
      // No filters
      none: () => {
        saveFilters(defaultFilters);
        console.log('✅ Reset to default (no filters)');
      }
    },
    
    // Check if user passes all filters (helper for other scripts)
    check: (userData) => {
      const filters = getFilters();
      const failures = [];
      
      // Followers
      if (filters.followers.enabled) {
        if (userData.followers < filters.followers.min) {
          failures.push(`followers < ${filters.followers.min}`);
        }
        if (userData.followers > filters.followers.max) {
          failures.push(`followers > ${filters.followers.max}`);
        }
      }
      
      // Following
      if (filters.following.enabled) {
        if (userData.following < filters.following.min) {
          failures.push(`following < ${filters.following.min}`);
        }
        if (userData.following > filters.following.max) {
          failures.push(`following > ${filters.following.max}`);
        }
      }
      
      // Tweets
      if (filters.tweets.enabled) {
        if (userData.tweets < filters.tweets.min) {
          failures.push(`tweets < ${filters.tweets.min}`);
        }
      }
      
      // Bio
      if (filters.bio.enabled && filters.bio.required && !userData.bio) {
        failures.push('no bio');
      }
      
      // Profile pic
      if (filters.profilePic.enabled && filters.profilePic.required && !userData.hasProfilePic) {
        failures.push('no profile pic');
      }
      
      // Verified
      if (filters.verified.enabled) {
        if (filters.verified.skip && userData.isVerified) {
          failures.push('is verified');
        }
        if (filters.verified.only && !userData.isVerified) {
          failures.push('not verified');
        }
      }

      // Follower/following ratio (declared in defaultFilters but never checked)
      if (filters.ratio.enabled && userData.following > 0) {
        const ratio = userData.followers / userData.following;
        if (ratio < filters.ratio.min) failures.push(`ratio < ${filters.ratio.min}`);
        if (ratio > filters.ratio.max) failures.push(`ratio > ${filters.ratio.max}`);
      }

      // Account age (declared in defaultFilters but never checked)
      if (filters.accountAge.enabled && typeof userData.accountAgeDays === 'number') {
        if (userData.accountAgeDays < filters.accountAge.min) {
          failures.push(`account younger than ${filters.accountAge.min} days`);
        }
      }

      // Language (declared in defaultFilters but never checked)
      if (filters.language.enabled && filters.language.allowed.length > 0 && userData.lang) {
        if (!filters.language.allowed.includes(userData.lang)) {
          failures.push(`language "${userData.lang}" not allowed`);
        }
      }

      // Activity / last tweet recency (declared in defaultFilters but never checked)
      if (filters.activity.enabled && typeof userData.lastTweetDaysAgo === 'number') {
        if (userData.lastTweetDaysAgo > filters.activity.lastTweetDays) {
          failures.push(`inactive for ${userData.lastTweetDaysAgo} days`);
        }
      }

      // Spam heuristics (declared in defaultFilters, enabled by default, but never checked)
      if (filters.spam.enabled) {
        if (filters.spam.skipNoTweets && userData.tweets === 0) {
          failures.push('no tweets (spam heuristic)');
        }
        if (filters.spam.skipSuspicious && userData.following > 0) {
          const followRatio = userData.following / (userData.followers || 1);
          if (followRatio > 50) failures.push('suspicious following/followers ratio (spam heuristic)');
        }
        if (filters.spam.skipBotPatterns && userData.username && /\d{6,}$/.test(userData.username)) {
          failures.push('username matches bot pattern (spam heuristic)');
        }
      }

      return {
        passes: failures.length === 0,
        failures
      };
    },
    
    // Show current configuration
    show: () => {
      const filters = getFilters();
      console.log('');
      console.log('═'.repeat(50));
      console.log('⚙️ CURRENT FILTER CONFIGURATION');
      console.log('═'.repeat(50));
      
      Object.entries(filters).forEach(([category, settings]) => {
        const status = settings.enabled ? '✅' : '⭕';
        console.log(`${status} ${category}:`);
        Object.entries(settings).forEach(([key, value]) => {
          if (key !== 'enabled') {
            console.log(`   ${key}: ${JSON.stringify(value)}`);
          }
        });
      });
      
      console.log('═'.repeat(50));
      console.log('');
    },
    
    // Reset to defaults
    reset: () => {
      if (confirm('⚠️ Reset all filters to defaults?')) {
        saveFilters(defaultFilters);
        console.log('✅ Filters reset to defaults.');
      }
    },
    
    // Export
    export: () => {
      const filters = getFilters();
      const json = JSON.stringify(filters, null, 2);
      console.log('📋 Filter config (copy this):');
      console.log(json);
      navigator.clipboard?.writeText(json);
      console.log('✅ Copied to clipboard!');
    },
    
    // Import
    import: (jsonString) => {
      try {
        const imported = typeof jsonString === 'string' ? JSON.parse(jsonString) : jsonString;
        const merged = { ...getFilters(), ...imported };
        saveFilters(merged);
        console.log('✅ Filters imported.');
      } catch (e) {
        console.error('❌ Invalid JSON:', e.message);
      }
    },
    
    // Help
    help: () => {
      console.log('');
      console.log('📋 FILTER MANAGER COMMANDS:');
      console.log('');
      console.log('   XActions.Filters.show()           - Show current config');
      console.log('   XActions.Filters.get()            - Get filters object');
      console.log('   XActions.Filters.set(cat,key,val) - Set specific filter');
      console.log('   XActions.Filters.enable("bio")    - Enable filter');
      console.log('   XActions.Filters.disable("bio")   - Disable filter');
      console.log('');
      console.log('📦 PRESETS:');
      console.log('   XActions.Filters.presets.quality()');
      console.log('   XActions.Filters.presets.influencers()');
      console.log('   XActions.Filters.presets.small()');
      console.log('   XActions.Filters.presets.antiSpam()');
      console.log('   XActions.Filters.presets.none()');
      console.log('');
      console.log('📤 EXPORT/IMPORT:');
      console.log('   XActions.Filters.export()');
      console.log('   XActions.Filters.import(json)');
      console.log('   XActions.Filters.reset()');
      console.log('');
    }
  };
  
  const filters = getFilters();
  const enabledCount = Object.values(filters).filter(f => f.enabled).length;
  
  console.log(`⚙️ Filter Manager loaded! (${enabledCount} filters enabled)`);
  console.log('   Run XActions.Filters.help() for commands.');
  console.log('   Run XActions.Filters.show() to see current config.');
  console.log('');
})();

});
  register("find-fake-followers", function(){
var CONFIG = {
  // Scroll settings
  scrollDelay: 1500,
  maxScrolls: 50,
  maxRetries: 3,
  
  // Scoring weights (higher = more suspicious)
  scoring: {
    // Following/Followers ratio
    highFollowingRatio: 25,        // Following 50x more than followers
    veryHighFollowingRatio: 40,    // Following 100x more than followers
    
    // Account characteristics
    defaultAvatar: 20,             // Default profile picture
    noBio: 15,                     // Empty bio
    suspiciousBio: 25,             // Suspicious keywords in bio
    randomUsername: 15,            // Username pattern like abc12345678
    
    // Following count
    massFollowing: 15,             // Following > 3000
    extremeFollowing: 25,          // Following > 5000
    
    // Follower count
    noFollowers: 20,               // 0 followers
    veryFewFollowers: 10           // < 10 followers
  },
  
  // Thresholds
  thresholds: {
    highRatio: 50,                 // Following/Followers ratio
    veryHighRatio: 100,
    massFollowing: 3000,
    extremeFollowing: 5000
  },
  
  // Suspicious bio keywords (from x-bot-sweeper)
  suspiciousKeywords: [
    'crypto', 'nft', 'bitcoin', 'btc', 'eth', 'forex', 'trading signals',
    'giveaway', 'airdrop', 'free money', 'passive income',
    'onlyfans', 'fansly', 'dm for', 'link in bio', 'check bio',
    'follow back', 'f4f', 'follow4follow', 'followback',
    '18+', 'adult', 'nsfw', 'sexy', 'hot girl',
    'make money', 'work from home', 'get rich', 'financial freedom',
    'investment opportunity', 'guaranteed returns'
  ],
  
  // Minimum score to flag as fake
  minFakeScore: 40,
  
  // Likely fake threshold
  likelyFakeScore: 60
};
try{if(typeof window!=='undefined'&&window.__XA_LAUNCH_CFG){Object.assign(CONFIG,window.__XA_LAUNCH_CFG);}}catch(_xa){}


/**
 * ============================================================
 * 🚀 SCRIPT START
 * ============================================================
 */

(async function findFakeFollowers() {
  const sleep = (ms) => new Promise(r => setTimeout(r, ms));

  console.log(`
╔══════════════════════════════════════════════════════════════╗
║  🕵️ XActions — Find Fake Followers                          ║
║  Identify likely fake/bot accounts in your audience         ║
╚══════════════════════════════════════════════════════════════╝
  `);

  if (!window.location.pathname.includes('/followers')) {
    console.error('❌ Please navigate to your FOLLOWERS page first!');
    console.log('👉 Go to: https://x.com/YOUR_USERNAME/followers');
    return;
  }

  const $userCell = '[data-testid="UserCell"]';

  const parseCount = (str) => {
    if (!str) return 0;
    str = str.replace(/,/g, '');
    const match = str.match(/([\d.]+)([KMB])?/i);
    if (match) {
      let num = parseFloat(match[1]);
      const multipliers = { 'K': 1000, 'M': 1000000, 'B': 1000000000 };
      if (match[2]) num *= multipliers[match[2].toUpperCase()];
      return Math.round(num);
    }
    return 0;
  };

  const analyzeFollower = (cell) => {
    const result = {
      username: '',
      displayName: '',
      bio: '',
      following: 0,
      followers: 0,
      score: 0,
      flags: []
    };

    // Get username
    const link = cell.querySelector('a[href^="/"]');
    if (link) {
      result.username = link.getAttribute('href').replace('/', '').split('/')[0];
    }

    // Get display name
    const nameEl = cell.querySelector('[dir="ltr"] span');
    result.displayName = nameEl?.textContent || result.username;

    // Get bio
    const bioEl = cell.querySelector('[data-testid="UserDescription"]');
    result.bio = bioEl?.textContent || '';
    const bioLower = result.bio.toLowerCase();

    // Parse stats from cell text
    const text = cell.textContent;
    const followingMatch = text.match(/([\d,.]+[KMB]?)\s*Following/i);
    const followersMatch = text.match(/([\d,.]+[KMB]?)\s*Follower/i);
    
    if (followingMatch) result.following = parseCount(followingMatch[1]);
    if (followersMatch) result.followers = parseCount(followersMatch[1]);

    // === SCORING ===

    // Check ratio
    if (result.following > 0 && result.followers > 0) {
      const ratio = result.following / result.followers;
      if (ratio > CONFIG.thresholds.veryHighRatio) {
        result.score += CONFIG.scoring.veryHighFollowingRatio;
        result.flags.push(`Extreme ratio (${ratio.toFixed(0)}:1)`);
      } else if (ratio > CONFIG.thresholds.highRatio) {
        result.score += CONFIG.scoring.highFollowingRatio;
        result.flags.push(`High ratio (${ratio.toFixed(0)}:1)`);
      }
    }

    // Check following count
    if (result.following > CONFIG.thresholds.extremeFollowing) {
      result.score += CONFIG.scoring.extremeFollowing;
      result.flags.push(`Mass following (${result.following.toLocaleString()})`);
    } else if (result.following > CONFIG.thresholds.massFollowing) {
      result.score += CONFIG.scoring.massFollowing;
      result.flags.push(`High following (${result.following.toLocaleString()})`);
    }

    // Check follower count (only when the count was actually present in the
    // cell; a failed parse defaults to 0 and must not read as "zero followers")
    if (followersMatch) {
      if (result.followers === 0) {
        result.score += CONFIG.scoring.noFollowers;
        result.flags.push('Zero followers');
      } else if (result.followers < 10) {
        result.score += CONFIG.scoring.veryFewFollowers;
        result.flags.push(`Very few followers (${result.followers})`);
      }
    }

    // Check for default avatar
    const avatar = cell.querySelector('img[src*="default_profile"]');
    if (avatar) {
      result.score += CONFIG.scoring.defaultAvatar;
      result.flags.push('Default avatar');
    }

    // Check for no bio
    if (!result.bio.trim()) {
      result.score += CONFIG.scoring.noBio;
      result.flags.push('No bio');
    }

    // Check for suspicious bio keywords
    const foundKeywords = CONFIG.suspiciousKeywords.filter(kw => bioLower.includes(kw.toLowerCase()));
    if (foundKeywords.length > 0) {
      result.score += CONFIG.scoring.suspiciousBio;
      result.flags.push(`Suspicious bio: ${foundKeywords.slice(0, 3).join(', ')}`);
    }

    // Check for random username pattern
    const numMatch = result.username.match(/\d+/g);
    if (numMatch && numMatch.join('').length >= 8) {
      result.score += CONFIG.scoring.randomUsername;
      result.flags.push('Random username pattern');
    }

    return result;
  };

  console.log('🔍 Scanning followers for fake accounts...\n');
  console.log('Bot detection criteria from x-bot-sweeper:');
  console.log('  • High following/followers ratio');
  console.log('  • Default profile picture');
  console.log('  • Suspicious bio keywords');
  console.log('  • Very new or inactive accounts');
  console.log('');

  const scanned = new Set();
  const allFollowers = [];
  let retries = 0;
  let scrollCount = 0;

  while (scrollCount < CONFIG.maxScrolls && retries < CONFIG.maxRetries) {
    const prevSize = scanned.size;

    document.querySelectorAll($userCell).forEach(cell => {
      const analysis = analyzeFollower(cell);
      if (!analysis.username || scanned.has(analysis.username)) return;
      
      scanned.add(analysis.username);
      allFollowers.push(analysis);
    });

    if (scanned.size === prevSize) retries++;
    else retries = 0;

    console.log(`   Scanned: ${scanned.size} followers...`);

    window.scrollTo(0, document.body.scrollHeight);
    await sleep(CONFIG.scrollDelay);
    scrollCount++;
  }

  if (allFollowers.length === 0) {
    console.error('❌ No followers found. Make sure the follower list has loaded.');
    return;
  }

  // Categorize
  const likelyFake = allFollowers.filter(f => f.score >= CONFIG.likelyFakeScore);
  const suspicious = allFollowers.filter(f => f.score >= CONFIG.minFakeScore && f.score < CONFIG.likelyFakeScore);
  const clean = allFollowers.filter(f => f.score < CONFIG.minFakeScore);

  const fakePercentage = ((likelyFake.length + suspicious.length) / allFollowers.length * 100).toFixed(1);

  console.log(`\n✅ Analysis complete!\n`);
  console.log('═'.repeat(60));
  console.log('📊 FAKE FOLLOWER ANALYSIS');
  console.log('═'.repeat(60));

  console.log('\n📈 SUMMARY:');
  console.log('─'.repeat(50));
  console.log(`   Total followers scanned: ${allFollowers.length}`);
  console.log(`   🔴 Likely fake/bot:      ${likelyFake.length} (${(likelyFake.length/allFollowers.length*100).toFixed(1)}%)`);
  console.log(`   🟡 Suspicious:           ${suspicious.length} (${(suspicious.length/allFollowers.length*100).toFixed(1)}%)`);
  console.log(`   🟢 Appear legitimate:    ${clean.length} (${(clean.length/allFollowers.length*100).toFixed(1)}%)`);
  console.log(`\n   📊 Estimated fake rate: ${fakePercentage}%`);

  // Quality assessment
  console.log('\n🏆 FOLLOWER QUALITY ASSESSMENT:');
  console.log('─'.repeat(50));
  
  if (parseFloat(fakePercentage) < 10) {
    console.log('   ✅ EXCELLENT - Your audience appears very genuine!');
  } else if (parseFloat(fakePercentage) < 25) {
    console.log('   👍 GOOD - Some suspicious accounts, but mostly clean');
  } else if (parseFloat(fakePercentage) < 50) {
    console.log('   ⚠️  MODERATE - Consider cleaning up fake followers');
  } else {
    console.log('   🚨 POOR - High percentage of likely fake followers');
  }

  // Likely fake accounts
  if (likelyFake.length > 0) {
    console.log('\n' + '═'.repeat(60));
    console.log('🔴 LIKELY FAKE/BOT ACCOUNTS');
    console.log('═'.repeat(60));

    likelyFake.sort((a, b) => b.score - a.score).slice(0, 30).forEach((f, i) => {
      console.log(`\n${i + 1}. @${f.username} (Score: ${f.score})`);
      console.log(`   ${f.displayName}`);
      console.log(`   Flags: ${f.flags.join(' | ')}`);
      console.log(`   https://x.com/${f.username}`);
    });

    if (likelyFake.length > 30) {
      console.log(`\n... and ${likelyFake.length - 30} more likely fake accounts`);
    }
  }

  // Suspicious accounts
  if (suspicious.length > 0) {
    console.log('\n' + '═'.repeat(60));
    console.log('🟡 SUSPICIOUS ACCOUNTS (review manually)');
    console.log('═'.repeat(60));

    suspicious.sort((a, b) => b.score - a.score).slice(0, 15).forEach((f, i) => {
      console.log(`\n${i + 1}. @${f.username} (Score: ${f.score})`);
      console.log(`   Flags: ${f.flags.join(' | ')}`);
    });

    if (suspicious.length > 15) {
      console.log(`\n... and ${suspicious.length - 15} more suspicious accounts`);
    }
  }

  // Common flags
  console.log('\n' + '═'.repeat(60));
  console.log('📊 MOST COMMON RED FLAGS');
  console.log('═'.repeat(60));

  const flagCounts = {};
  [...likelyFake, ...suspicious].forEach(f => {
    f.flags.forEach(flag => {
      const category = flag.split('(')[0].trim().split(':')[0].trim();
      flagCounts[category] = (flagCounts[category] || 0) + 1;
    });
  });

  Object.entries(flagCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .forEach(([flag, count]) => {
      const pct = (count / (likelyFake.length + suspicious.length) * 100).toFixed(0);
      console.log(`   ${flag}: ${count} accounts (${pct}%)`);
    });

  // Save results
  const storageKey = 'xactions_fake_followers';
  const data = {
    timestamp: new Date().toISOString(),
    totalScanned: allFollowers.length,
    likelyFake: likelyFake.map(f => ({ username: f.username, score: f.score, flags: f.flags })),
    suspicious: suspicious.map(f => ({ username: f.username, score: f.score, flags: f.flags })),
    fakePercentage: parseFloat(fakePercentage)
  };
  localStorage.setItem(storageKey, JSON.stringify(data));

  console.log('\n' + '═'.repeat(60));
  console.log('💡 RECOMMENDED ACTIONS');
  console.log('═'.repeat(60));
  console.log('\n1. Review the "Likely Fake" accounts and block obvious bots');
  console.log('2. Use the block-bots.js script to automate blocking');
  console.log('3. Report accounts that are clearly spam');
  console.log('4. Run this audit periodically to maintain quality');

  console.log('\n' + '═'.repeat(60));
  console.log(`💾 Results saved! Export: copy(localStorage.getItem("${storageKey}"))`);
  console.log('═'.repeat(60) + '\n');

})();

});
  register("follow-engagers", function(){
var CONFIG = {
  // ---- ENGAGEMENT TYPE ----
  // Which engagers to follow
  // Options: 'likers', 'retweeters', 'all'
  mode: 'likers',
  
  // ---- LIMITS ----
  
  // Max follows from this post
  maxFollows: 20,
  
  // ---- FILTERS ----
  
  filters: {
    // Minimum followers the user must have
    minFollowers: 100,
    
    // Maximum followers (to avoid following huge accounts)
    maxFollowers: 50000,
    
    // Skip protected/private accounts
    skipProtected: true,
    
    // Skip verified accounts
    skipVerified: false
  },
  
  // ---- TIMING ----
  
  // Delay between follows (milliseconds)
  minDelay: 2000,
  maxDelay: 4000,
  
  // Scroll delay
  scrollDelay: 1500
};
try{if(typeof window!=='undefined'&&window.__XA_LAUNCH_CFG){Object.assign(CONFIG,window.__XA_LAUNCH_CFG);}}catch(_xa){}


/**
 * ============================================================
 * 🚀 SCRIPT START
 * ============================================================
 */

(async function followEngagers() {
  const sleep = (ms) => new Promise(r => setTimeout(r, ms));
  const randomDelay = () => Math.floor(Math.random() * (CONFIG.maxDelay - CONFIG.minDelay) + CONFIG.minDelay);
  
  // DOM Selectors
  const $userCell = '[data-testid="UserCell"]';
  const $followButton = '[data-testid$="-follow"]';
  const $protectedIcon = '[data-testid="icon-lock"]';
  const $verifiedBadge = '[data-testid="icon-verified"]';
  
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║  👥 FOLLOW ENGAGERS                                        ║');
  console.log('║  by nichxbt - https://github.com/nirholas/XActions         ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log('');
  
  // Verify we're on a tweet page
  if (!window.location.href.includes('/status/')) {
    console.error('❌ ERROR: Must be on a tweet page!');
    console.log('📍 Go to any tweet: https://x.com/user/status/TWEET_ID');
    return;
  }
  
  const tweetUrl = window.location.href.split('?')[0];
  console.log(`📍 Tweet: ${tweetUrl}`);
  console.log(`🎯 Mode: ${CONFIG.mode}`);
  console.log(`📊 Max follows: ${CONFIG.maxFollows}`);
  console.log('');
  
  const STORAGE_KEY = 'xactions_followed_engagers';
  const followedUsers = new Set();
  
  // Load previously followed
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) JSON.parse(saved).forEach(u => followedUsers.add(u));
  } catch (e) {}
  
  let totalFollowed = 0;
  
  /**
   * Get username from user cell
   */
  function getUsername(cell) {
    const link = cell.querySelector('a[href^="/"]');
    return link ? link.getAttribute('href').replace('/', '').split('/')[0] : null;
  }
  
  /**
   * Check if user passes filters
   */
  function passesFilters(cell) {
    // Check protected
    if (CONFIG.filters.skipProtected && cell.querySelector($protectedIcon)) {
      return false;
    }
    
    // Check verified
    if (CONFIG.filters.skipVerified && cell.querySelector($verifiedBadge)) {
      return false;
    }
    
    // Note: Follower count filtering would require visiting each profile
    // For simplicity, we skip that in the console version
    
    return true;
  }
  
  /**
   * Scrape and follow users from current list
   */
  async function followFromList() {
    let scrolls = 0;
    const maxScrolls = 30;
    
    while (totalFollowed < CONFIG.maxFollows && scrolls < maxScrolls) {
      const cells = document.querySelectorAll($userCell);
      
      for (const cell of cells) {
        if (totalFollowed >= CONFIG.maxFollows) break;
        
        const username = getUsername(cell);
        if (!username || followedUsers.has(username)) continue;
        
        // Check filters
        if (!passesFilters(cell)) {
          console.log(`⏭️ Skipping @${username} (filtered)`);
          continue;
        }
        
        // Find follow button
        const followBtn = cell.querySelector($followButton);
        if (!followBtn) continue; // Already following or no button
        
        try {
          followBtn.click();
          followedUsers.add(username);
          totalFollowed++;
          
          console.log(`✅ Followed #${totalFollowed}: @${username}`);
          
          // Save to storage
          localStorage.setItem(STORAGE_KEY, JSON.stringify([...followedUsers]));
          
          await sleep(randomDelay());
          
        } catch (e) {
          console.warn('⚠️ Error following:', e.message);
        }
      }
      
      window.scrollTo(0, document.body.scrollHeight);
      await sleep(CONFIG.scrollDelay);
      scrolls++;
    }
  }
  
  // Navigate to likes or retweets list
  if (CONFIG.mode === 'likers' || CONFIG.mode === 'all') {
    console.log('📍 Opening likes list...');
    
    // Find likes link
    const likesLink = document.querySelector('a[href$="/likes"]');
    if (likesLink) {
      likesLink.click();
      await sleep(2000);
      
      console.log('🚀 Following likers...');
      await followFromList();
    } else {
      console.log('⚠️ Could not find likes link. Try clicking on the likes count manually.');
    }
  }
  
  if (CONFIG.mode === 'retweeters' || CONFIG.mode === 'all') {
    // Go back if needed
    if (CONFIG.mode === 'all') {
      window.history.back();
      await sleep(2000);
    }
    
    console.log('📍 Opening retweets list...');
    
    const retweetsLink = document.querySelector('a[href$="/retweets"]');
    if (retweetsLink) {
      retweetsLink.click();
      await sleep(2000);
      
      console.log('🚀 Following retweeters...');
      await followFromList();
    } else {
      console.log('⚠️ Could not find retweets link.');
    }
  }
  
  console.log('');
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║  ✅ FOLLOW ENGAGERS COMPLETE!                              ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log(`👥 Total followed: ${totalFollowed}`);
  console.log('');
  
  return { followed: totalFollowed };
})();

});
  register("follow-target-users", function(){
var CONFIG = {
  // ---- LIMITS ----

  // Maximum users to follow
  maxFollows: 30,
  
  // Max scrolls to load users
  maxScrolls: 50,
  
  // ---- FILTERS ----
  
  filters: {
    // Skip protected/private accounts
    skipProtected: true,
    
    // Skip verified accounts
    skipVerified: false,
    
    // Only follow users with bio containing these keywords
    // 💡 Leave empty [] to follow anyone
    bioKeywords: [],
    
    // Skip users whose bio contains these words
    bioBlacklist: ['bot', 'spam', 'promo']
  },
  
  // ---- TIMING ----
  
  minDelay: 2000,
  maxDelay: 4000,
  scrollDelay: 1500
};
try{if(typeof window!=='undefined'&&window.__XA_LAUNCH_CFG){Object.assign(CONFIG,window.__XA_LAUNCH_CFG);}}catch(_xa){}


/**
 * ============================================================
 * 🚀 SCRIPT START
 * ============================================================
 */

(async function followTargetUsers() {
  const sleep = (ms) => new Promise(r => setTimeout(r, ms));
  const randomDelay = () => Math.floor(Math.random() * (CONFIG.maxDelay - CONFIG.minDelay) + CONFIG.minDelay);
  
  const $userCell = '[data-testid="UserCell"]';
  const $followButton = '[data-testid$="-follow"]';
  const $protectedIcon = '[data-testid="icon-lock"]';
  const $verifiedBadge = '[data-testid="icon-verified"]';
  
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║  🎯 FOLLOW TARGET USERS                                    ║');
  console.log('║  by nichxbt - https://github.com/nirholas/XActions         ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log('');
  
  // Verify page
  const url = window.location.href;
  const pathMatch = url.match(/x\.com\/([^\/]+)\/(followers|following)/);
  
  if (!pathMatch) {
    console.error('❌ ERROR: Must be on a followers or following page!');
    console.log('📍 Go to: https://x.com/TARGET/followers');
    return;
  }
  
  const targetAccount = pathMatch[1];
  const listType = pathMatch[2];
  
  console.log(`👤 Target account: @${targetAccount}`);
  console.log(`📋 List type: ${listType}`);
  console.log(`📊 Max follows: ${CONFIG.maxFollows}`);
  console.log('');
  
  const STORAGE_KEY = 'xactions_followed_targets';
  const followedUsers = new Set();
  
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) JSON.parse(saved).forEach(u => followedUsers.add(u));
  } catch (e) {}
  
  let totalFollowed = 0;
  let scrolls = 0;
  
  /**
   * Get user info from cell
   */
  function getUserInfo(cell) {
    const link = cell.querySelector('a[href^="/"]');
    const username = link ? link.getAttribute('href').replace('/', '').split('/')[0] : null;
    
    // Get bio text
    const bioEl = cell.querySelector('[dir="auto"]:not([role])');
    const bio = bioEl ? bioEl.innerText.toLowerCase() : '';
    
    return { username, bio };
  }
  
  /**
   * Check if user passes filters
   */
  function passesFilters(cell, bio) {
    // Check protected
    if (CONFIG.filters.skipProtected && cell.querySelector($protectedIcon)) {
      return false;
    }
    
    // Check verified
    if (CONFIG.filters.skipVerified && cell.querySelector($verifiedBadge)) {
      return false;
    }
    
    // Bio keywords whitelist
    if (CONFIG.filters.bioKeywords.length > 0) {
      const hasKeyword = CONFIG.filters.bioKeywords.some(k => bio.includes(k.toLowerCase()));
      if (!hasKeyword) return false;
    }
    
    // Bio blacklist
    if (CONFIG.filters.bioBlacklist.length > 0) {
      const hasBlacklist = CONFIG.filters.bioBlacklist.some(k => bio.includes(k.toLowerCase()));
      if (hasBlacklist) return false;
    }
    
    return true;
  }
  
  console.log('🚀 Starting to follow users...');
  console.log('');
  
  while (totalFollowed < CONFIG.maxFollows && scrolls < CONFIG.maxScrolls) {
    const cells = document.querySelectorAll($userCell);
    
    for (const cell of cells) {
      if (totalFollowed >= CONFIG.maxFollows) break;
      
      const { username, bio } = getUserInfo(cell);
      if (!username || followedUsers.has(username)) continue;
      
      // Check filters
      if (!passesFilters(cell, bio)) {
        continue;
      }
      
      // Find follow button
      const followBtn = cell.querySelector($followButton);
      if (!followBtn) continue;
      
      try {
        followBtn.click();
        followedUsers.add(username);
        totalFollowed++;
        
        console.log(`✅ Followed #${totalFollowed}: @${username}`);
        
        localStorage.setItem(STORAGE_KEY, JSON.stringify([...followedUsers]));
        
        await sleep(randomDelay());
        
      } catch (e) {
        console.warn('⚠️ Error:', e.message);
      }
    }
    
    window.scrollTo(0, document.body.scrollHeight);
    await sleep(CONFIG.scrollDelay);
    scrolls++;
    
    if (scrolls % 10 === 0) {
      console.log(`📜 Scrolled ${scrolls} times, followed ${totalFollowed}...`);
    }
  }
  
  console.log('');
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║  ✅ FOLLOW TARGET USERS COMPLETE!                          ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log(`👥 Total followed: ${totalFollowed}`);
  console.log('');
  
  return { followed: totalFollowed };
})();

});
  register("followers-growth-tracker", function(){
var CONFIG = {
  // Storage key prefix
  storageKey: 'xactions_growth_tracker',
  
  // Maximum history entries to keep
  maxHistory: 365,
  
  // Show chart in console
  showChart: true
};
try{if(typeof window!=='undefined'&&window.__XA_LAUNCH_CFG){Object.assign(CONFIG,window.__XA_LAUNCH_CFG);}}catch(_xa){}


/**
 * ============================================================
 * 🚀 SCRIPT START
 * ============================================================
 */

(async function followersGrowthTracker() {
  console.log(`
╔══════════════════════════════════════════════════════════════╗
║  📈 XActions — Followers Growth Tracker                      ║
║  Track follower growth over time                             ║
╚══════════════════════════════════════════════════════════════╝
  `);

  // Get username from URL
  const pathMatch = window.location.pathname.match(/^\/([^\/]+)/);
  if (!pathMatch) {
    console.error('❌ Please navigate to a profile page first!');
    console.log('👉 Example: https://x.com/elonmusk');
    return;
  }
  
  const username = pathMatch[1].toLowerCase();
  
  // Skip non-profile pages
  const invalidPaths = ['home', 'explore', 'notifications', 'messages', 'i', 'settings', 'search'];
  if (invalidPaths.includes(username)) {
    console.error('❌ Please navigate to a profile page first!');
    return;
  }

  console.log(`📊 Tracking growth for @${username}\n`);

  // Extract follower/following counts from the page
  const getStats = () => {
    const stats = { followers: 0, following: 0 };
    
    // Try to find follower count
    const links = document.querySelectorAll('a[href$="/verified_followers"], a[href$="/followers"]');
    links.forEach(link => {
      const text = link.textContent;
      const match = text.match(/([\d,.]+[KMB]?)\s*Followers/i);
      if (match) {
        stats.followers = parseCount(match[1]);
      }
    });
    
    // Try to find following count
    const followingLinks = document.querySelectorAll('a[href$="/following"]');
    followingLinks.forEach(link => {
      const text = link.textContent;
      const match = text.match(/([\d,.]+[KMB]?)\s*Following/i);
      if (match) {
        stats.following = parseCount(match[1]);
      }
    });
    
    // Alternative: look for span elements with counts
    if (stats.followers === 0) {
      document.querySelectorAll('span').forEach(span => {
        const text = span.textContent;
        if (text.match(/^\d[\d,.]*[KMB]?$/) && span.closest('a[href*="followers"]')) {
          stats.followers = parseCount(text);
        }
        if (text.match(/^\d[\d,.]*[KMB]?$/) && span.closest('a[href*="following"]')) {
          stats.following = parseCount(text);
        }
      });
    }
    
    return stats;
  };

  const parseCount = (str) => {
    str = str.replace(/,/g, '');
    const multipliers = { 'K': 1000, 'M': 1000000, 'B': 1000000000 };
    const match = str.match(/([\d.]+)([KMB])?/i);
    if (match) {
      let num = parseFloat(match[1]);
      if (match[2]) {
        num *= multipliers[match[2].toUpperCase()];
      }
      return Math.round(num);
    }
    return parseInt(str) || 0;
  };

  const storageKey = `${CONFIG.storageKey}_${username}`;

  const loadHistory = () => {
    try {
      const data = localStorage.getItem(storageKey);
      return data ? JSON.parse(data) : [];
    } catch (e) {
      return [];
    }
  };

  const saveHistory = (history) => {
    // Keep only last N entries
    const trimmed = history.slice(-CONFIG.maxHistory);
    localStorage.setItem(storageKey, JSON.stringify(trimmed));
  };

  const formatDate = (iso) => {
    const d = new Date(iso);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const formatNumber = (n) => {
    if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
    if (n >= 1000) return (n / 1000).toFixed(1) + 'K';
    return n.toString();
  };

  // Get current stats
  const currentStats = getStats();
  
  if (currentStats.followers === 0) {
    console.warn('⚠️ Could not detect follower count. Make sure you\'re on a profile page.');
    console.log('   Try scrolling up to make sure the profile header is visible.');
    return;
  }

  console.log(`📌 Current Stats:`);
  console.log(`   Followers: ${formatNumber(currentStats.followers)}`);
  console.log(`   Following: ${formatNumber(currentStats.following)}`);
  console.log(`   Ratio: ${(currentStats.followers / (currentStats.following || 1)).toFixed(2)}`);

  // Load history and add new entry
  const history = loadHistory();
  const now = new Date().toISOString();
  const today = now.split('T')[0];

  // Check if we already have an entry for today
  const todayIndex = history.findIndex(h => h.date.startsWith(today));
  
  const entry = {
    date: now,
    followers: currentStats.followers,
    following: currentStats.following
  };

  if (todayIndex >= 0) {
    history[todayIndex] = entry;
    console.log('\n📝 Updated today\'s entry');
  } else {
    history.push(entry);
    console.log('\n📝 Added new entry');
  }

  saveHistory(history);

  // Calculate growth metrics
  if (history.length >= 2) {
    console.log('\n📈 GROWTH ANALYSIS:\n');
    console.log('─'.repeat(50));

    const sorted = [...history].sort((a, b) => new Date(a.date) - new Date(b.date));
    const oldest = sorted[0];
    const newest = sorted[sorted.length - 1];
    const daysDiff = Math.max(1, Math.round((new Date(newest.date) - new Date(oldest.date)) / (1000 * 60 * 60 * 24)));

    const totalGrowth = newest.followers - oldest.followers;
    const dailyAvg = totalGrowth / daysDiff;
    const weeklyProjection = dailyAvg * 7;
    const monthlyProjection = dailyAvg * 30;

    console.log(`📅 Tracking period: ${daysDiff} days`);
    console.log(`   From: ${formatDate(oldest.date)} (${formatNumber(oldest.followers)} followers)`);
    console.log(`   To:   ${formatDate(newest.date)} (${formatNumber(newest.followers)} followers)`);
    console.log('');
    console.log(`📊 Total growth: ${totalGrowth >= 0 ? '+' : ''}${formatNumber(totalGrowth)} followers`);
    console.log(`   Daily average: ${dailyAvg >= 0 ? '+' : ''}${dailyAvg.toFixed(1)} followers/day`);
    console.log(`   Weekly projection: ${weeklyProjection >= 0 ? '+' : ''}${formatNumber(Math.round(weeklyProjection))}`);
    console.log(`   Monthly projection: ${monthlyProjection >= 0 ? '+' : ''}${formatNumber(Math.round(monthlyProjection))}`);

    // Recent changes
    if (sorted.length >= 2) {
      const prev = sorted[sorted.length - 2];
      const recentChange = newest.followers - prev.followers;
      console.log(`\n🔄 Since last check (${formatDate(prev.date)}):`);
      console.log(`   ${recentChange >= 0 ? '+' : ''}${recentChange} followers`);
    }

    // ASCII chart
    if (CONFIG.showChart && sorted.length >= 3) {
      console.log('\n📉 Growth Chart (last 14 days):\n');
      
      const recent = sorted.slice(-14);
      const values = recent.map(h => h.followers);
      const min = Math.min(...values);
      const max = Math.max(...values);
      const range = max - min || 1;
      const height = 8;

      // Build chart
      const chart = [];
      for (let row = height; row >= 0; row--) {
        let line = '';
        const threshold = min + (range * row / height);
        
        if (row === height) {
          line = formatNumber(max).padStart(6) + ' ┤';
        } else if (row === 0) {
          line = formatNumber(min).padStart(6) + ' ┤';
        } else {
          line = '      ┤';
        }
        
        recent.forEach((h, i) => {
          const normalized = (h.followers - min) / range * height;
          if (normalized >= row) {
            line += '█';
          } else {
            line += ' ';
          }
        });
        
        chart.push(line);
      }
      
      chart.push('       └' + '─'.repeat(recent.length));
      // One column per entry: a 3-char label every 3rd entry lines up with its column
      chart.push('        ' + recent.map((h, i) => i % 3 === 0 ? formatDate(h.date).slice(0, 3).padEnd(3) : '').join('').slice(0, recent.length + 2));
      
      chart.forEach(line => console.log(line));
    }

    console.log('\n' + '─'.repeat(50));
  } else {
    console.log('\n📸 First snapshot saved!');
    console.log('   Run this script again later to see growth metrics.');
  }

  console.log(`\n💾 History saved (${history.length} entries)`);
  console.log('   Run this script periodically to track growth over time.\n');

  // Export data option
  console.log('📥 To export your data, run: copy(localStorage.getItem("' + storageKey + '"))');

})();

});
  register("growth-suite", function(){
var CONFIG = {
  // ============================================
  // TARGETING
  // ============================================
  
  // Keywords to search for (niche targeting)
  keywords: [
    'web3 developer',
    'crypto trader',
    'NFT artist',
  ],
  
  // Accounts to engage with (their followers are targets)
  targetAccounts: [
    // 'vitalikbuterin',
    // 'elonmusk',
  ],
  
  // ============================================
  // ACTIONS
  // ============================================
  
  actions: {
    follow: true,       // Follow users from searches
    like: true,         // Like posts in feed
    unfollow: true,     // Unfollow non-followers after grace period
  },
  
  // ============================================
  // LIMITS (per session)
  // ============================================
  
  limits: {
    follows: 20,
    likes: 30,
    unfollows: 15,
  },
  
  // ============================================
  // TIMING
  // ============================================
  
  timing: {
    unfollowAfterDays: 3,      // Days before unfollowing
    delayBetweenActions: 3000, // ms between actions
    sessionDuration: 30,        // minutes
  },
  
  // ============================================
  // FILTERS
  // ============================================
  
  filters: {
    minFollowers: 50,
    maxFollowers: 50000,
    mustHaveBio: true,
    skipPrivate: true,
    language: null,            // null = any, or 'en', 'es', etc.
  },
};
try{if(typeof window!=='undefined'&&window.__XA_LAUNCH_CFG){Object.assign(CONFIG,window.__XA_LAUNCH_CFG);}}catch(_xa){}


/**
 * ============================================================
 * 🚀 SCRIPT START - by nichxbt
 * ============================================================
 */

(async function growthSuite() {
  const sleep = (ms) => new Promise(r => setTimeout(r, ms));
  const randomDelay = (min, max) => sleep(Math.random() * (max - min) + min);
  
  // DOM Selectors
  const SELECTORS = {
    followButton: '[data-testid$="-follow"]',
    unfollowButton: '[data-testid$="-unfollow"]',
    likeButton: '[data-testid="like"]',
    unlikeButton: '[data-testid="unlike"]',
    tweet: '[data-testid="tweet"]',
    tweetText: '[data-testid="tweetText"]',
    userCell: '[data-testid="UserCell"]',
    searchInput: '[data-testid="SearchBox_Search_Input"]',
    confirmButton: '[data-testid="confirmationSheetConfirm"]',
  };
  
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║  🚀 GROWTH AUTOMATION SUITE                                ║');
  console.log('║  by nichxbt - https://github.com/nirholas/XActions         ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log('');
  
  // Storage helper
  const storage = {
    get: (key) => {
      try {
        return JSON.parse(localStorage.getItem(`xactions_growth_${key}`) || 'null');
      } catch { return null; }
    },
    set: (key, value) => {
      localStorage.setItem(`xactions_growth_${key}`, JSON.stringify(value));
    }
  };
  
  // State
  const state = {
    follows: 0,
    likes: 0,
    unfollows: 0,
    startTime: Date.now(),
    isRunning: true,
  };
  
  // Tracked data
  const followed = new Map(Object.entries(storage.get('followed') || {}));
  const liked = new Set(storage.get('liked') || []);
  
  const saveTracked = () => {
    storage.set('followed', Object.fromEntries(followed));
    storage.set('liked', Array.from(liked));
  };
  
  // Session check
  const isSessionExpired = () => {
    const elapsed = (Date.now() - state.startTime) / 1000 / 60;
    return elapsed >= CONFIG.timing.sessionDuration;
  };
  
  const checkLimits = () => ({
    canFollow: state.follows < CONFIG.limits.follows,
    canLike: state.likes < CONFIG.limits.likes,
    canUnfollow: state.unfollows < CONFIG.limits.unfollows,
  });
  
  // Log helper
  const log = (msg, type = 'info') => {
    const emoji = { info: '📘', success: '✅', warning: '⚠️', error: '❌' }[type] || '📘';
    console.log(`${emoji} ${msg}`);
  };
  
  // Follow action
  const doFollow = async (userCell) => {
    if (!CONFIG.actions.follow || !checkLimits().canFollow) return false;
    
    const followBtn = userCell.querySelector(SELECTORS.followButton);
    if (!followBtn) return false;
    
    const link = userCell.querySelector('a[href^="/"]');
    const username = link?.getAttribute('href')?.replace('/', '').toLowerCase();
    if (!username || followed.has(username)) return false;
    
    followBtn.click();
    state.follows++;
    followed.set(username, { at: Date.now(), source: 'growth' });
    saveTracked();
    
    log(`Followed @${username} (${state.follows}/${CONFIG.limits.follows})`, 'success');
    return true;
  };
  
  // Like action
  const doLike = async (tweet) => {
    if (!CONFIG.actions.like || !checkLimits().canLike) return false;
    
    const likeBtn = tweet.querySelector(SELECTORS.likeButton);
    if (!likeBtn) return false;
    
    // The first /status/ link can belong to a quoted tweet; the anchor around
    // the timestamp is the tweet's own permalink
    const timeEl = tweet.querySelector('time');
    const tweetLink = (timeEl && timeEl.closest('a[href*="/status/"]')) || tweet.querySelector('a[href*="/status/"]');
    const tweetId = tweetLink?.href?.match(/status\/(\d+)/)?.[1];
    if (!tweetId || liked.has(tweetId)) return false;
    
    likeBtn.click();
    state.likes++;
    liked.add(tweetId);
    saveTracked();
    
    log(`Liked tweet (${state.likes}/${CONFIG.limits.likes})`, 'success');
    return true;
  };
  
  // Unfollow action (for non-followers)
  const doUnfollow = async (userCell) => {
    if (!CONFIG.actions.unfollow || !checkLimits().canUnfollow) return false;
    
    const unfollowBtn = userCell.querySelector(SELECTORS.unfollowButton);
    if (!unfollowBtn) return false;
    
    const link = userCell.querySelector('a[href^="/"]');
    const username = link?.getAttribute('href')?.replace('/', '').toLowerCase();
    if (!username) return false;
    
    // Check if we followed this user and grace period has passed
    const followData = followed.get(username);
    if (followData) {
      const daysSinceFollow = (Date.now() - followData.at) / 1000 / 60 / 60 / 24;
      if (daysSinceFollow < CONFIG.timing.unfollowAfterDays) return false;
    }
    
    // Check if they follow back (look for "Follows you" indicator)
    const followsYou = userCell.querySelector('[data-testid="userFollowIndicator"]');
    if (followsYou) return false;
    
    unfollowBtn.click();
    await sleep(500);
    
    const confirmBtn = document.querySelector(SELECTORS.confirmButton);
    if (confirmBtn) confirmBtn.click();
    
    state.unfollows++;
    followed.delete(username);
    saveTracked();
    
    log(`Unfollowed @${username} (${state.unfollows}/${CONFIG.limits.unfollows})`, 'success');
    return true;
  };
  
  // Create XActions interface
  window.XActions = window.XActions || {};
  window.XActions.Growth = {
    state,
    config: CONFIG,
    
    // Run auto-like on current feed
    autoLike: async () => {
      log('Starting auto-like on current feed...');
      state.isRunning = true; // re-arm: stop() latches this false for every action

      while (checkLimits().canLike && !isSessionExpired() && state.isRunning) {
        const tweets = document.querySelectorAll(SELECTORS.tweet);
        
        for (const tweet of tweets) {
          if (!state.isRunning || !checkLimits().canLike) break;
          
          const text = tweet.querySelector(SELECTORS.tweetText)?.textContent?.toLowerCase() || '';
          const matchesKeyword = CONFIG.keywords.length === 0 || 
            CONFIG.keywords.some(kw => text.includes(kw.toLowerCase()));
          
          if (matchesKeyword) {
            await doLike(tweet);
            await randomDelay(CONFIG.timing.delayBetweenActions, CONFIG.timing.delayBetweenActions * 1.5);
          }
        }
        
        window.scrollBy(0, window.innerHeight);
        await sleep(2000);
      }
      
      log(`Auto-like complete. Liked ${state.likes} tweets.`);
    },
    
    // Run auto-follow on search results or user lists
    autoFollow: async () => {
      log('Starting auto-follow...');
      log('📍 Navigate to a search results or followers list first');
      state.isRunning = true; // re-arm: stop() latches this false for every action

      while (checkLimits().canFollow && !isSessionExpired() && state.isRunning) {
        const userCells = document.querySelectorAll(SELECTORS.userCell);
        
        for (const cell of userCells) {
          if (!state.isRunning || !checkLimits().canFollow) break;
          await doFollow(cell);
          await randomDelay(CONFIG.timing.delayBetweenActions, CONFIG.timing.delayBetweenActions * 1.5);
        }
        
        window.scrollBy(0, window.innerHeight);
        await sleep(2000);
      }
      
      log(`Auto-follow complete. Followed ${state.follows} users.`);
    },
    
    // Run smart unfollow
    smartUnfollow: async () => {
      log('Starting smart unfollow...');
      log('📍 Navigate to your Following list first');
      state.isRunning = true; // re-arm: stop() latches this false for every action

      while (checkLimits().canUnfollow && !isSessionExpired() && state.isRunning) {
        const userCells = document.querySelectorAll(SELECTORS.userCell);
        
        for (const cell of userCells) {
          if (!state.isRunning || !checkLimits().canUnfollow) break;
          await doUnfollow(cell);
          await randomDelay(CONFIG.timing.delayBetweenActions * 1.5, CONFIG.timing.delayBetweenActions * 2);
        }
        
        window.scrollBy(0, window.innerHeight);
        await sleep(2000);
      }
      
      log(`Smart unfollow complete. Unfollowed ${state.unfollows} users.`);
    },
    
    // Stop all automation
    stop: () => {
      state.isRunning = false;
      log('Automation stopped.', 'warning');
    },
    
    // Get stats
    stats: () => {
      console.log('');
      console.log('📊 GROWTH STATS:');
      console.log(`   👥 Follows: ${state.follows}/${CONFIG.limits.follows}`);
      console.log(`   ❤️ Likes: ${state.likes}/${CONFIG.limits.likes}`);
      console.log(`   🚫 Unfollows: ${state.unfollows}/${CONFIG.limits.unfollows}`);
      console.log(`   📈 Total tracked follows: ${followed.size}`);
      console.log('');
    },
    
    // Help
    help: () => {
      console.log('');
      console.log('📋 GROWTH SUITE COMMANDS:');
      console.log('');
      console.log('   XActions.Growth.autoLike()      - Auto-like feed posts');
      console.log('   XActions.Growth.autoFollow()    - Auto-follow users');
      console.log('   XActions.Growth.smartUnfollow() - Unfollow non-followers');
      console.log('   XActions.Growth.stop()          - Stop automation');
      console.log('   XActions.Growth.stats()         - Show statistics');
      console.log('');
    },
  };
  
  log('Growth Suite loaded! Use XActions.Growth.help() for commands.');
  console.log('');
})();

});
  register("hashtag-analytics", function(){
var CONFIG = {
  // Number of posts to analyze
  maxPosts: 100,
  
  // Delay between scrolls (ms)
  scrollDelay: 1500,
  
  // Maximum scroll attempts
  maxScrolls: 50,
  
  // Retry when no new posts found
  maxRetries: 3
};
try{if(typeof window!=='undefined'&&window.__XA_LAUNCH_CFG){Object.assign(CONFIG,window.__XA_LAUNCH_CFG);}}catch(_xa){}


/**
 * ============================================================
 * 🚀 SCRIPT START
 * ============================================================
 */

(async function hashtagAnalytics() {
  const sleep = (ms) => new Promise(r => setTimeout(r, ms));

  console.log(`
╔══════════════════════════════════════════════════════════════╗
║  #️⃣ XActions — Hashtag Analytics                             ║
║  Track which hashtags drive the most engagement              ║
╚══════════════════════════════════════════════════════════════╝
  `);

  const $tweet = 'article[data-testid="tweet"]';
  const $tweetText = '[data-testid="tweetText"]';
  const $like = '[data-testid="like"], [data-testid="unlike"]';
  const $retweet = '[data-testid="retweet"], [data-testid="unretweet"]';
  const $reply = '[data-testid="reply"]';

  const parseCount = (str) => {
    if (!str) return 0;
    str = str.replace(/,/g, '').trim();
    const match = str.match(/([\d.]+)([KMB])?/i);
    if (match) {
      let num = parseFloat(match[1]);
      const multipliers = { 'K': 1000, 'M': 1000000, 'B': 1000000000 };
      if (match[2]) num *= multipliers[match[2].toUpperCase()];
      return Math.round(num);
    }
    return 0;
  };

  const username = window.location.pathname.match(/^\/([^\/]+)/)?.[1];
  if (!username || ['home', 'explore', 'notifications', 'messages', 'i'].includes(username)) {
    console.error('❌ Please navigate to a profile page first!');
    return;
  }

  console.log(`📊 Analyzing hashtags for @${username}\n`);
  console.log('🔄 Scrolling to collect posts...\n');

  const posts = new Map();
  let retries = 0;
  let scrollCount = 0;

  while (posts.size < CONFIG.maxPosts && scrollCount < CONFIG.maxScrolls && retries < CONFIG.maxRetries) {
    const prevSize = posts.size;
    
    document.querySelectorAll($tweet).forEach(tweet => {
      const timeLink = tweet.querySelector('a[href*="/status/"] time')?.closest('a');
      const tweetUrl = timeLink?.getAttribute('href') || '';
      const tweetId = tweetUrl.split('/status/')[1]?.split('?')[0];
      
      if (!tweetId || posts.has(tweetId)) return;

      const textEl = tweet.querySelector($tweetText);
      const text = textEl?.textContent || '';

      // Extract hashtags
      const hashtags = (text.match(/#\w+/g) || []).map(h => h.toLowerCase());

      const likeBtn = tweet.querySelector($like);
      const retweetBtn = tweet.querySelector($retweet);
      const replyBtn = tweet.querySelector($reply);

      const likes = parseCount(likeBtn?.getAttribute('aria-label')?.match(/(\d[\d,.]*[KMB]?)/)?.[1] || '0');
      const retweets = parseCount(retweetBtn?.getAttribute('aria-label')?.match(/(\d[\d,.]*[KMB]?)/)?.[1] || '0');
      const replies = parseCount(replyBtn?.getAttribute('aria-label')?.match(/(\d[\d,.]*[KMB]?)/)?.[1] || '0');

      posts.set(tweetId, {
        id: tweetId,
        text,
        hashtags,
        likes,
        retweets,
        replies,
        engagement: likes + retweets + replies,
        url: `https://x.com${tweetUrl}`
      });
    });

    if (posts.size === prevSize) retries++;
    else retries = 0;

    console.log(`   Found ${posts.size} posts...`);
    
    window.scrollTo(0, document.body.scrollHeight);
    await sleep(CONFIG.scrollDelay);
    scrollCount++;
  }

  const postsArray = Array.from(posts.values());
  
  if (postsArray.length === 0) {
    console.error('❌ No posts found.');
    return;
  }

  // Analyze hashtags
  const hashtagStats = {};
  let postsWithHashtags = 0;
  let postsWithoutHashtags = 0;

  postsArray.forEach(p => {
    if (p.hashtags.length > 0) {
      postsWithHashtags++;
      p.hashtags.forEach(tag => {
        if (!hashtagStats[tag]) {
          hashtagStats[tag] = {
            tag,
            count: 0,
            totalEngagement: 0,
            posts: []
          };
        }
        hashtagStats[tag].count++;
        hashtagStats[tag].totalEngagement += p.engagement;
        hashtagStats[tag].posts.push(p);
      });
    } else {
      postsWithoutHashtags++;
    }
  });

  // Calculate averages
  Object.values(hashtagStats).forEach(stat => {
    stat.avgEngagement = stat.totalEngagement / stat.count;
  });

  // Sort by different criteria
  const byCount = Object.values(hashtagStats).sort((a, b) => b.count - a.count);
  const byEngagement = Object.values(hashtagStats).filter(h => h.count >= 2).sort((a, b) => b.avgEngagement - a.avgEngagement);
  const byTotal = Object.values(hashtagStats).sort((a, b) => b.totalEngagement - a.totalEngagement);

  const formatNum = (n) => {
    if (n >= 1000) return (n / 1000).toFixed(1) + 'K';
    return Math.round(n).toString();
  };

  console.log(`\n✅ Analyzed ${postsArray.length} posts\n`);
  console.log('═'.repeat(60));
  console.log('#️⃣ HASHTAG ANALYTICS');
  console.log('═'.repeat(60));

  console.log('\n📊 OVERVIEW:');
  console.log('─'.repeat(50));
  console.log(`   Total posts analyzed: ${postsArray.length}`);
  console.log(`   Posts with hashtags: ${postsWithHashtags} (${((postsWithHashtags/postsArray.length)*100).toFixed(0)}%)`);
  console.log(`   Posts without hashtags: ${postsWithoutHashtags}`);
  console.log(`   Unique hashtags used: ${Object.keys(hashtagStats).length}`);

  // Compare with/without hashtags
  const withHashtagsAvg = postsArray.filter(p => p.hashtags.length > 0);
  const withoutHashtagsAvg = postsArray.filter(p => p.hashtags.length === 0);
  
  const avgWithHashtags = withHashtagsAvg.length > 0 
    ? withHashtagsAvg.reduce((s, p) => s + p.engagement, 0) / withHashtagsAvg.length 
    : 0;
  const avgWithoutHashtags = withoutHashtagsAvg.length > 0 
    ? withoutHashtagsAvg.reduce((s, p) => s + p.engagement, 0) / withoutHashtagsAvg.length 
    : 0;

  console.log('\n📈 HASHTAG IMPACT:');
  console.log('─'.repeat(50));
  console.log(`   Avg engagement WITH hashtags:    ${formatNum(avgWithHashtags)}`);
  console.log(`   Avg engagement WITHOUT hashtags: ${formatNum(avgWithoutHashtags)}`);
  
  if (avgWithHashtags > avgWithoutHashtags && avgWithoutHashtags > 0) {
    const improvement = ((avgWithHashtags - avgWithoutHashtags) / avgWithoutHashtags * 100).toFixed(0);
    console.log(`   📈 Hashtags improve engagement by ${improvement}%`);
  } else if (avgWithoutHashtags > avgWithHashtags) {
    const decrease = ((avgWithoutHashtags - avgWithHashtags) / avgWithoutHashtags * 100).toFixed(0);
    console.log(`   📉 Posts without hashtags perform ${decrease}% better`);
  }

  if (byCount.length > 0) {
    console.log('\n🔢 MOST USED HASHTAGS:');
    console.log('─'.repeat(50));
    byCount.slice(0, 10).forEach((h, i) => {
      const bar = '█'.repeat(Math.min(20, Math.round(h.count / byCount[0].count * 20)));
      console.log(`   ${(i + 1).toString().padStart(2)}. ${h.tag.padEnd(20)} ${bar} ${h.count}x`);
    });
  }

  if (byEngagement.length > 0) {
    console.log('\n🏆 HIGHEST PERFORMING HASHTAGS (min 2 uses):');
    console.log('─'.repeat(50));
    byEngagement.slice(0, 10).forEach((h, i) => {
      const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : '  ';
      console.log(`   ${medal} ${h.tag.padEnd(20)} ${formatNum(h.avgEngagement)} avg (${h.count} posts)`);
    });
  }

  if (byTotal.length > 0) {
    console.log('\n💰 HASHTAGS BY TOTAL ENGAGEMENT:');
    console.log('─'.repeat(50));
    byTotal.slice(0, 10).forEach((h, i) => {
      console.log(`   ${(i + 1).toString().padStart(2)}. ${h.tag.padEnd(20)} ${formatNum(h.totalEngagement)} total`);
    });
  }

  // Hashtag combinations
  console.log('\n🔗 HASHTAG COMBINATIONS:');
  console.log('─'.repeat(50));
  
  const combos = {};
  postsArray.filter(p => p.hashtags.length >= 2).forEach(p => {
    const sorted = [...p.hashtags].sort();
    for (let i = 0; i < sorted.length; i++) {
      for (let j = i + 1; j < sorted.length; j++) {
        const key = `${sorted[i]} + ${sorted[j]}`;
        if (!combos[key]) combos[key] = { count: 0, totalEngagement: 0 };
        combos[key].count++;
        combos[key].totalEngagement += p.engagement;
      }
    }
  });

  const topCombos = Object.entries(combos)
    .filter(([_, data]) => data.count >= 2)
    .map(([combo, data]) => ({ combo, ...data, avg: data.totalEngagement / data.count }))
    .sort((a, b) => b.avg - a.avg)
    .slice(0, 5);

  if (topCombos.length > 0) {
    topCombos.forEach((c, i) => {
      console.log(`   ${i + 1}. ${c.combo} — ${formatNum(c.avg)} avg (${c.count}x)`);
    });
  } else {
    console.log('   Not enough data on hashtag combinations.');
  }

  // Recommendations
  console.log('\n' + '═'.repeat(60));
  console.log('💡 RECOMMENDATIONS');
  console.log('═'.repeat(60));

  if (byEngagement.length > 0) {
    console.log(`\n✅ Best performing hashtags to keep using:`);
    byEngagement.slice(0, 5).forEach(h => {
      console.log(`   ${h.tag}`);
    });
  }

  const lowPerformers = Object.values(hashtagStats)
    .filter(h => h.count >= 3 && h.avgEngagement < avgWithHashtags * 0.5)
    .sort((a, b) => a.avgEngagement - b.avgEngagement);

  if (lowPerformers.length > 0) {
    console.log(`\n❌ Consider dropping these underperforming hashtags:`);
    lowPerformers.slice(0, 5).forEach(h => {
      console.log(`   ${h.tag} (${formatNum(h.avgEngagement)} avg vs ${formatNum(avgWithHashtags)} overall)`);
    });
  }

  // Save analysis
  const storageKey = `xactions_hashtags_${username}`;
  localStorage.setItem(storageKey, JSON.stringify({
    username,
    timestamp: new Date().toISOString(),
    postCount: postsArray.length,
    postsWithHashtags,
    uniqueHashtags: Object.keys(hashtagStats).length,
    avgWithHashtags,
    avgWithoutHashtags,
    topByEngagement: byEngagement.slice(0, 20).map(h => ({ tag: h.tag, count: h.count, avg: h.avgEngagement })),
    topByCount: byCount.slice(0, 20).map(h => ({ tag: h.tag, count: h.count }))
  }));

  console.log('\n' + '═'.repeat(60));
  console.log(`💾 Analysis saved! Export: copy(localStorage.getItem("${storageKey}"))`);
  console.log('═'.repeat(60) + '\n');

})();

});
  register("interact-by-hashtag", function(){
var CONFIG = {
  // Hashtags to target (without #)
  hashtags: [
    'crypto',
    'web3',
    'bitcoin',
  ],
  
  // Actions to perform
  actions: {
    like: true,
    retweet: false,
    follow: true,
  },
  
  // Limits per session
  limits: {
    likes: 20,
    retweets: 5,
    follows: 10,
    tweetsPerHashtag: 10,
  },
  
  // Filters
  filters: {
    minLikes: 5,           // Minimum likes on tweet
    minRetweets: 0,        // Minimum retweets
    skipReplies: true,     // Skip reply tweets
    skipRetweets: true,    // Skip retweets
    requireMedia: false,   // Only posts with images/video
  },
  
  // Timing
  delayBetweenActions: 2000,
  scrollDelay: 2000,
};
try{if(typeof window!=='undefined'&&window.__XA_LAUNCH_CFG){Object.assign(CONFIG,window.__XA_LAUNCH_CFG);}}catch(_xa){}


/**
 * ============================================================
 * 🚀 SCRIPT START - by nichxbt
 * ============================================================
 */

(async function interactByHashtag() {
  const sleep = (ms) => new Promise(r => setTimeout(r, ms));
  const randomDelay = (min, max) => sleep(Math.random() * (max - min) + min);
  
  // DOM Selectors
  const SELECTORS = {
    tweet: '[data-testid="tweet"]',
    tweetText: '[data-testid="tweetText"]',
    likeButton: '[data-testid="like"]',
    unlikeButton: '[data-testid="unlike"]',
    retweetButton: '[data-testid="retweet"]',
    followButton: '[data-testid$="-follow"]',
    searchInput: '[data-testid="SearchBox_Search_Input"]',
    userCell: '[data-testid="UserCell"]',
  };
  
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║  #️⃣ INTERACT BY HASHTAG                                    ║');
  console.log('║  by nichxbt - https://github.com/nirholas/XActions         ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log('');
  
  // State
  const state = {
    isRunning: false,
    currentHashtag: null,
    stats: { likes: 0, retweets: 0, follows: 0 },
    processedTweets: new Set(),
  };
  
  // Parse counts like "1,234" / "5.2K" from button aria-labels
  const parseCount = (str) => {
    if (!str) return 0;
    const match = str.replace(/,/g, '').match(/([\d.]+)([KMB])?/i);
    if (!match) return 0;
    let num = parseFloat(match[1]);
    const multipliers = { 'K': 1000, 'M': 1000000, 'B': 1000000000 };
    if (match[2]) num *= multipliers[match[2].toUpperCase()];
    return Math.round(num) || 0;
  };

  // Helper to check if tweet passes filters
  const passesFilters = (tweet) => {
    // Check if already liked
    if (tweet.querySelector(SELECTORS.unlikeButton)) return false;

    // Check for replies (structural marker first; text only works on English UIs)
    if (CONFIG.filters.skipReplies) {
      const isReply = tweet.querySelector('[data-testid="in-reply-to"]') !== null ||
        Array.from(tweet.querySelectorAll('div[dir]')).some(el =>
          el.innerText.startsWith('Replying to'));
      if (isReply) return false;
    }

    // Check for retweets: socialContext inside an <a> = repost (locale-independent);
    // a plain socialContext is a pinned post
    if (CONFIG.filters.skipRetweets) {
      const socialContext = tweet.querySelector('[data-testid="socialContext"]');
      if (socialContext && socialContext.closest('a')) return false;
    }

    // Check for media
    if (CONFIG.filters.requireMedia) {
      const hasMedia = tweet.querySelector('[data-testid="tweetPhoto"]') ||
                       tweet.querySelector('[data-testid="videoPlayer"], [data-testid="videoComponent"]');
      if (!hasMedia) return false;
    }

    // Check engagement minimums
    if (CONFIG.filters.minLikes > 0) {
      const likeEl = tweet.querySelector(`${SELECTORS.likeButton}, ${SELECTORS.unlikeButton}`);
      if (parseCount(likeEl?.getAttribute('aria-label')) < CONFIG.filters.minLikes) return false;
    }
    if (CONFIG.filters.minRetweets > 0) {
      const rtEl = tweet.querySelector(`${SELECTORS.retweetButton}, [data-testid="unretweet"]`);
      if (parseCount(rtEl?.getAttribute('aria-label')) < CONFIG.filters.minRetweets) return false;
    }

    return true;
  };

  // Get tweet ID: the anchor around the timestamp is the tweet's own permalink;
  // the first /status/ link can belong to a quoted tweet
  const getTweetId = (tweet) => {
    const timeEl = tweet.querySelector('time');
    const link = (timeEl && timeEl.closest('a[href*="/status/"]')) || tweet.querySelector('a[href*="/status/"]');
    return link?.href?.match(/status\/(\d+)/)?.[1];
  };
  
  // Create XActions interface
  window.XActions = window.XActions || {};
  window.XActions.Hashtag = {
    config: CONFIG,
    state,
    
    // Search for a specific hashtag
    search: async (hashtag) => {
      const tag = hashtag?.replace('#', '') || CONFIG.hashtags[0];
      if (!tag) {
        console.error('❌ No hashtag specified!');
        return;
      }
      
      console.log(`🔍 Searching for #${tag}...`);

      // Type into X's own search box and submit through it (a real in-app
      // search) instead of assigning location.href. Setting location.href
      // forces a hard page reload, which wipes this injected script (window.XActions
      // included) - so the "run search(), then run interact()" flow documented
      // above would break as soon as search() ran.
      const input = document.querySelector(SELECTORS.searchInput);
      if (input) {
        const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
        setter.call(input, `#${tag}`);
        input.dispatchEvent(new Event('input', { bubbles: true }));
        await sleep(300);
        input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', code: 'Enter', keyCode: 13, which: 13, bubbles: true }));
        console.log('✅ Search submitted. Once results load, run XActions.Hashtag.interact().');
      } else {
        console.warn('⚠️ Search box not found on this page. Falling back to a full navigation - this reloads the page and clears the script, so paste it again once results load.');
        window.location.href = `https://x.com/search?q=%23${tag}&src=typed_query&f=live`;
      }
    },
    
    // Interact with current search results
    interact: async () => {
      console.log('🚀 Starting hashtag interaction...');
      state.isRunning = true;
      
      let processed = 0;
      let stalledScrolls = 0;
      let lastProcessedCount = state.processedTweets.size;
      let warnedAboutVolume = false;

      while (state.isRunning && state.stats.likes < CONFIG.limits.likes) {
        const tweets = document.querySelectorAll(SELECTORS.tweet);
        
        for (const tweet of tweets) {
          if (!state.isRunning) break;
          if (state.stats.likes >= CONFIG.limits.likes) break;
          
          const tweetId = getTweetId(tweet);
          if (!tweetId || state.processedTweets.has(tweetId)) continue;
          
          state.processedTweets.add(tweetId);
          
          if (!passesFilters(tweet)) continue;
          
          // Like
          if (CONFIG.actions.like && state.stats.likes < CONFIG.limits.likes) {
            const likeBtn = tweet.querySelector(SELECTORS.likeButton);
            if (likeBtn) {
              likeBtn.click();
              state.stats.likes++;
              console.log(`❤️ Liked tweet (${state.stats.likes}/${CONFIG.limits.likes})`);
              await randomDelay(CONFIG.delayBetweenActions, CONFIG.delayBetweenActions * 1.5);
            }
          }
          
          // Retweet
          if (CONFIG.actions.retweet && state.stats.retweets < CONFIG.limits.retweets) {
            const rtBtn = tweet.querySelector(SELECTORS.retweetButton);
            if (rtBtn) {
              rtBtn.click();
              await sleep(500);
              const confirmBtn = document.querySelector('[data-testid="retweetConfirm"]');
              if (confirmBtn) confirmBtn.click();
              
              state.stats.retweets++;
              console.log(`🔄 Retweeted (${state.stats.retweets}/${CONFIG.limits.retweets})`);
              await randomDelay(CONFIG.delayBetweenActions, CONFIG.delayBetweenActions * 1.5);
            }
          }
          
          // Follow user
          if (CONFIG.actions.follow && state.stats.follows < CONFIG.limits.follows) {
            const followBtn = tweet.querySelector(SELECTORS.followButton);
            if (followBtn) {
              followBtn.click();
              state.stats.follows++;
              console.log(`👥 Followed user (${state.stats.follows}/${CONFIG.limits.follows})`);
              await randomDelay(CONFIG.delayBetweenActions, CONFIG.delayBetweenActions * 1.5);
            }
          }
          
          processed++;
        }
        
        // Scroll for more
        window.scrollBy(0, window.innerHeight);
        await sleep(CONFIG.scrollDelay);

        // End-of-results detection so the loop cannot scroll forever
        if (state.processedTweets.size === lastProcessedCount) {
          stalledScrolls++;
          if (stalledScrolls >= 10) {
            console.log('⚠️ No new tweets after 10 scrolls. Stopping.');
            break;
          }
        } else {
          stalledScrolls = 0;
          lastProcessedCount = state.processedTweets.size;
        }

        if (processed > 50 && !warnedAboutVolume) {
          warnedAboutVolume = true;
          console.log('⚠️ Processed many tweets. Consider stopping to avoid rate limits.');
        }
      }
      
      console.log('');
      console.log('╔════════════════════════════════════════════════════════════╗');
      console.log('║  🎉 HASHTAG INTERACTION COMPLETE!                          ║');
      console.log('╚════════════════════════════════════════════════════════════╝');
      window.XActions.Hashtag.stats();
    },
    
    // Search and interact with all configured hashtags
    interactAll: async () => {
      if (CONFIG.hashtags.length === 0) {
        console.error('❌ No hashtags configured!');
        return;
      }
      
      console.log(`🚀 Processing ${CONFIG.hashtags.length} hashtags...`);
      console.log('');
      console.log('📋 Run these commands in sequence:');
      
      CONFIG.hashtags.forEach((tag, i) => {
        console.log(`   ${i + 1}. XActions.Hashtag.search("${tag}")`);
        console.log(`      Then: XActions.Hashtag.interact()`);
      });
      console.log('');
    },
    
    // Add hashtag
    addHashtag: (tag) => {
      const clean = tag.replace('#', '').toLowerCase();
      if (!CONFIG.hashtags.includes(clean)) {
        CONFIG.hashtags.push(clean);
        console.log(`✅ Added #${clean}`);
      }
    },
    
    // Remove hashtag
    removeHashtag: (tag) => {
      const clean = tag.replace('#', '').toLowerCase();
      const idx = CONFIG.hashtags.indexOf(clean);
      if (idx > -1) {
        CONFIG.hashtags.splice(idx, 1);
        console.log(`✅ Removed #${clean}`);
      }
    },
    
    // Stop
    stop: () => {
      state.isRunning = false;
      console.log('🛑 Stopped.');
    },
    
    // Stats
    stats: () => {
      console.log('');
      console.log('📊 HASHTAG INTERACTION STATS:');
      console.log(`   ❤️ Likes: ${state.stats.likes}/${CONFIG.limits.likes}`);
      console.log(`   🔄 Retweets: ${state.stats.retweets}/${CONFIG.limits.retweets}`);
      console.log(`   👥 Follows: ${state.stats.follows}/${CONFIG.limits.follows}`);
      console.log(`   📝 Tweets processed: ${state.processedTweets.size}`);
      console.log('');
    },
    
    // Help
    help: () => {
      console.log('');
      console.log('📋 HASHTAG INTERACTION COMMANDS:');
      console.log('');
      console.log('   XActions.Hashtag.search("crypto")   - Search hashtag');
      console.log('   XActions.Hashtag.interact()         - Interact with results');
      console.log('   XActions.Hashtag.addHashtag("tag")  - Add hashtag');
      console.log('   XActions.Hashtag.removeHashtag("t") - Remove hashtag');
      console.log('   XActions.Hashtag.interactAll()      - Show guide for all');
      console.log('   XActions.Hashtag.stop()             - Stop interaction');
      console.log('   XActions.Hashtag.stats()            - Show statistics');
      console.log('');
    }
  };
  
  console.log('✅ Interact By Hashtag loaded!');
  console.log(`📋 Configured hashtags: ${CONFIG.hashtags.map(t => '#' + t).join(', ')}`);
  console.log('   Run XActions.Hashtag.help() for commands.');
  console.log('');
})();

});
  register("interact-by-place", function(){
var CONFIG = {
  // Target locations
  locations: [
    { name: 'New York', query: 'near:"New York"' },
    { name: 'San Francisco', query: 'near:"San Francisco"' },
    // { name: 'London', query: 'near:"London"' },
  ],
  
  // Keywords to combine with location
  keywords: [
    // 'coffee',
    // 'startup',
    // 'tech',
  ],
  
  // Actions
  actions: {
    like: true,
    follow: true,
    retweet: false,
  },
  
  // Limits
  limits: {
    likes: 15,
    follows: 10,
    retweets: 3,
  },
  
  // Timing
  delayBetweenActions: 2000,
  scrollDelay: 2000,
};
try{if(typeof window!=='undefined'&&window.__XA_LAUNCH_CFG){Object.assign(CONFIG,window.__XA_LAUNCH_CFG);}}catch(_xa){}


/**
 * ============================================================
 * 🚀 SCRIPT START - by nichxbt
 * ============================================================
 */

(async function interactByPlace() {
  const sleep = (ms) => new Promise(r => setTimeout(r, ms));
  const randomDelay = (min, max) => sleep(Math.random() * (max - min) + min);
  
  // DOM Selectors
  const SELECTORS = {
    tweet: '[data-testid="tweet"]',
    tweetText: '[data-testid="tweetText"]',
    likeButton: '[data-testid="like"]',
    unlikeButton: '[data-testid="unlike"]',
    retweetButton: '[data-testid="retweet"]',
    followButton: '[data-testid$="-follow"]',
    searchInput: '[data-testid="SearchBox_Search_Input"]',
  };
  
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║  📍 INTERACT BY PLACE                                      ║');
  console.log('║  by nichxbt - https://github.com/nirholas/XActions         ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log('');
  
  // State
  const state = {
    isRunning: false,
    currentLocation: null,
    stats: { likes: 0, follows: 0, retweets: 0 },
    processedTweets: new Set(),
  };
  
  // Create XActions interface
  window.XActions = window.XActions || {};
  window.XActions.Place = {
    config: CONFIG,
    state,
    
    // Search by location
    search: async (locationName, keyword = '') => {
      let location = CONFIG.locations.find(l => 
        l.name.toLowerCase() === locationName?.toLowerCase()
      );
      
      if (!location && locationName) {
        // Use custom location
        location = { name: locationName, query: `near:"${locationName}"` };
      }
      
      if (!location) {
        location = CONFIG.locations[0];
      }
      
      if (!location) {
        console.error('❌ No location specified or configured!');
        return;
      }
      
      let searchQuery = location.query;
      if (keyword) {
        searchQuery = `${keyword} ${location.query}`;
      }
      
      console.log(`📍 Searching: ${searchQuery}`);

      // Type into X's own search box and submit through it (a real in-app
      // search) instead of assigning location.href. Setting location.href
      // forces a hard page reload, which wipes this injected script (window.XActions
      // included) before interact() could ever be called on the results.
      const input = document.querySelector(SELECTORS.searchInput);
      if (input) {
        const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
        setter.call(input, searchQuery);
        input.dispatchEvent(new Event('input', { bubbles: true }));
        await sleep(300);
        input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', code: 'Enter', keyCode: 13, which: 13, bubbles: true }));
        console.log('✅ Search submitted. Once results load, run XActions.Place.interact().');
      } else {
        console.warn('⚠️ Search box not found on this page. Falling back to a full navigation - this reloads the page and clears the script, so paste it again once results load.');
        const encodedQuery = encodeURIComponent(searchQuery);
        window.location.href = `https://x.com/search?q=${encodedQuery}&src=typed_query&f=live`;
      }
    },
    
    // Interact with search results
    interact: async () => {
      console.log('🚀 Starting location-based interaction...');
      state.isRunning = true;

      let stalledScrolls = 0;
      let lastProcessedCount = state.processedTweets.size;

      while (state.isRunning && state.stats.likes < CONFIG.limits.likes) {
        const tweets = document.querySelectorAll(SELECTORS.tweet);

        for (const tweet of tweets) {
          if (!state.isRunning) break;
          if (state.stats.likes >= CONFIG.limits.likes) break;

          // The anchor around the timestamp is the tweet's own permalink; the
          // first /status/ link can belong to a quoted tweet
          const timeEl = tweet.querySelector('time');
          const tweetLink = (timeEl && timeEl.closest('a[href*="/status/"]')) || tweet.querySelector('a[href*="/status/"]');
          const tweetId = tweetLink?.href?.match(/status\/(\d+)/)?.[1];

          if (!tweetId || state.processedTweets.has(tweetId)) continue;
          state.processedTweets.add(tweetId);
          
          // Skip already liked
          if (tweet.querySelector(SELECTORS.unlikeButton)) continue;
          
          // Like
          if (CONFIG.actions.like && state.stats.likes < CONFIG.limits.likes) {
            const likeBtn = tweet.querySelector(SELECTORS.likeButton);
            if (likeBtn) {
              likeBtn.click();
              state.stats.likes++;
              console.log(`❤️ Liked tweet (${state.stats.likes}/${CONFIG.limits.likes})`);
              await randomDelay(CONFIG.delayBetweenActions, CONFIG.delayBetweenActions * 1.5);
            }
          }
          
          // Follow
          if (CONFIG.actions.follow && state.stats.follows < CONFIG.limits.follows) {
            const followBtn = tweet.querySelector(SELECTORS.followButton);
            if (followBtn) {
              followBtn.click();
              state.stats.follows++;
              console.log(`👥 Followed (${state.stats.follows}/${CONFIG.limits.follows})`);
              await randomDelay(CONFIG.delayBetweenActions, CONFIG.delayBetweenActions * 1.5);
            }
          }
          
          // Retweet
          if (CONFIG.actions.retweet && state.stats.retweets < CONFIG.limits.retweets) {
            const rtBtn = tweet.querySelector(SELECTORS.retweetButton);
            if (rtBtn) {
              rtBtn.click();
              await sleep(500);
              const confirmBtn = document.querySelector('[data-testid="retweetConfirm"]');
              if (confirmBtn) confirmBtn.click();
              
              state.stats.retweets++;
              console.log(`🔄 Retweeted (${state.stats.retweets}/${CONFIG.limits.retweets})`);
              await randomDelay(CONFIG.delayBetweenActions, CONFIG.delayBetweenActions * 1.5);
            }
          }
        }
        
        window.scrollBy(0, window.innerHeight);
        await sleep(CONFIG.scrollDelay);

        // End-of-results detection so the loop cannot scroll forever
        if (state.processedTweets.size === lastProcessedCount) {
          stalledScrolls++;
          if (stalledScrolls >= 10) {
            console.log('⚠️ No new tweets after 10 scrolls. Stopping.');
            break;
          }
        } else {
          stalledScrolls = 0;
          lastProcessedCount = state.processedTweets.size;
        }
      }

      console.log('');
      console.log('╔════════════════════════════════════════════════════════════╗');
      console.log('║  🎉 LOCATION INTERACTION COMPLETE!                         ║');
      console.log('╚════════════════════════════════════════════════════════════╝');
      window.XActions.Place.stats();
    },
    
    // Add location
    addLocation: (name, customQuery = null) => {
      const query = customQuery || `near:"${name}"`;
      CONFIG.locations.push({ name, query });
      console.log(`✅ Added location: ${name}`);
    },
    
    // List locations
    listLocations: () => {
      console.log('');
      console.log('📍 CONFIGURED LOCATIONS:');
      CONFIG.locations.forEach((l, i) => {
        console.log(`   ${i + 1}. ${l.name}: ${l.query}`);
      });
      console.log('');
    },
    
    // Stop
    stop: () => {
      state.isRunning = false;
      console.log('🛑 Stopped.');
    },
    
    // Stats
    stats: () => {
      console.log('');
      console.log('📊 LOCATION INTERACTION STATS:');
      console.log(`   ❤️ Likes: ${state.stats.likes}/${CONFIG.limits.likes}`);
      console.log(`   👥 Follows: ${state.stats.follows}/${CONFIG.limits.follows}`);
      console.log(`   🔄 Retweets: ${state.stats.retweets}/${CONFIG.limits.retweets}`);
      console.log('');
    },
    
    // Help
    help: () => {
      console.log('');
      console.log('📋 PLACE INTERACTION COMMANDS:');
      console.log('');
      console.log('   XActions.Place.search("New York")');
      console.log('   XActions.Place.search("NYC", "coffee")');
      console.log('   XActions.Place.interact()');
      console.log('   XActions.Place.addLocation("Miami")');
      console.log('   XActions.Place.listLocations()');
      console.log('   XActions.Place.stop()');
      console.log('   XActions.Place.stats()');
      console.log('');
    }
  };
  
  console.log('✅ Interact By Place loaded!');
  console.log(`📍 Configured locations: ${CONFIG.locations.length}`);
  console.log('   Run XActions.Place.help() for commands.');
  console.log('');
})();

});
  register("interact-by-users", function(){
var CONFIG = {
  // Target usernames to interact with
  targetUsers: [
    // 'nichxbt',
    // 'elonmusk',
  ],
  
  // Actions to perform
  actions: {
    like: true,
    retweet: false,
    reply: false,
    follow: true,
  },
  
  // Limits per user
  limits: {
    likesPerUser: 3,
    retweetsPerUser: 1,
    repliesPerUser: 1,
  },
  
  // Timing
  delayBetweenActions: 2000,
  delayBetweenUsers: 5000,
  
  // Reply templates (random selection)
  replyTemplates: [
    'Great point! 🔥',
    'Couldn\'t agree more 👏',
    'This is gold 💯',
    'Thanks for sharing!',
  ],
};
try{if(typeof window!=='undefined'&&window.__XA_LAUNCH_CFG){Object.assign(CONFIG,window.__XA_LAUNCH_CFG);}}catch(_xa){}


/**
 * ============================================================
 * 🚀 SCRIPT START - by nichxbt
 * ============================================================
 */

(async function interactByUsers() {
  const sleep = (ms) => new Promise(r => setTimeout(r, ms));
  const randomDelay = (min, max) => sleep(Math.random() * (max - min) + min);
  const randomItem = (arr) => arr[Math.floor(Math.random() * arr.length)];
  
  // DOM Selectors
  const SELECTORS = {
    tweet: '[data-testid="tweet"]',
    tweetText: '[data-testid="tweetText"]',
    likeButton: '[data-testid="like"]',
    unlikeButton: '[data-testid="unlike"]',
    retweetButton: '[data-testid="retweet"]',
    unretweetButton: '[data-testid="unretweet"]',
    replyButton: '[data-testid="reply"]',
    followButton: '[data-testid$="-follow"]',
    unfollowButton: '[data-testid$="-unfollow"]',
    tweetInput: '[data-testid="tweetTextarea_0"]',
    tweetSubmit: '[data-testid="tweetButton"]',
  };
  
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║  👤 INTERACT BY USERS                                      ║');
  console.log('║  by nichxbt - https://github.com/nirholas/XActions         ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log('');
  
  // Storage
  const storage = {
    get: (key) => {
      try { return JSON.parse(localStorage.getItem(`xactions_interact_${key}`) || 'null'); }
      catch { return null; }
    },
    set: (key, value) => {
      localStorage.setItem(`xactions_interact_${key}`, JSON.stringify(value));
    }
  };
  
  // Track interactions
  const history = storage.get('history') || {};
  
  const saveHistory = () => storage.set('history', history);
  
  const getInteractionCount = (username, type) => {
    if (!history[username]) history[username] = { likes: 0, retweets: 0, replies: 0, followed: false };
    return history[username][type] || 0;
  };
  
  const recordInteraction = (username, type) => {
    if (!history[username]) history[username] = { likes: 0, retweets: 0, replies: 0, followed: false };
    if (type === 'followed') {
      history[username].followed = true;
    } else {
      history[username][type] = (history[username][type] || 0) + 1;
    }
    saveHistory();
  };
  
  // State
  const state = {
    isRunning: false,
    currentUser: null,
    stats: { likes: 0, retweets: 0, replies: 0, follows: 0 },
  };
  
  // Create XActions interface
  window.XActions = window.XActions || {};
  window.XActions.InteractUsers = {
    config: CONFIG,
    state,
    history,
    
    // Interact with a single user's profile (must already be open, a console
    // script does not survive a page navigation)
    interactWith: async (username) => {
      const cleanUsername = username.replace('@', '').toLowerCase();

      const currentPath = window.location.pathname.toLowerCase().replace(/^\//, '').split('/')[0];
      if (currentPath !== cleanUsername) {
        console.error(`❌ You are not on @${cleanUsername}'s profile.`);
        console.log(`📍 Navigate to https://x.com/${cleanUsername} first, then run this again.`);
        return;
      }

      console.log(`👤 Starting interaction with @${cleanUsername}...`);

      state.currentUser = cleanUsername;
      state.isRunning = true;

      // Wait for tweets to load
      await sleep(2000);

      const tweets = document.querySelectorAll(SELECTORS.tweet);
      console.log(`🔍 Found ${tweets.length} tweets`);
      
      let userLikes = 0;
      let userRetweets = 0;
      let userReplies = 0;
      
      for (const tweet of tweets) {
        if (!state.isRunning) break;
        
        // Like
        if (CONFIG.actions.like && userLikes < CONFIG.limits.likesPerUser) {
          const likeBtn = tweet.querySelector(SELECTORS.likeButton);
          if (likeBtn) {
            likeBtn.click();
            userLikes++;
            state.stats.likes++;
            recordInteraction(cleanUsername, 'likes');
            console.log(`❤️ Liked tweet ${userLikes}/${CONFIG.limits.likesPerUser}`);
            await randomDelay(CONFIG.delayBetweenActions, CONFIG.delayBetweenActions * 1.5);
          }
        }
        
        // Retweet
        if (CONFIG.actions.retweet && userRetweets < CONFIG.limits.retweetsPerUser) {
          const rtBtn = tweet.querySelector(SELECTORS.retweetButton);
          if (rtBtn) {
            rtBtn.click();
            await sleep(500);
            // Confirm retweet
            const confirmBtn = document.querySelector('[data-testid="retweetConfirm"]');
            if (confirmBtn) confirmBtn.click();

            userRetweets++;
            state.stats.retweets++;
            recordInteraction(cleanUsername, 'retweets');
            console.log(`🔄 Retweeted ${userRetweets}/${CONFIG.limits.retweetsPerUser}`);
            await randomDelay(CONFIG.delayBetweenActions, CONFIG.delayBetweenActions * 1.5);
          }
        }

        // Reply (was declared in CONFIG/SELECTORS but never wired up)
        if (CONFIG.actions.reply && userReplies < CONFIG.limits.repliesPerUser) {
          const replyBtn = tweet.querySelector(SELECTORS.replyButton);
          if (replyBtn) {
            replyBtn.click();
            await sleep(1000);

            const input = document.querySelector(SELECTORS.tweetInput);
            const submitBtn = document.querySelector(SELECTORS.tweetSubmit);
            if (input && submitBtn) {
              input.focus();
              document.execCommand('insertText', false, randomItem(CONFIG.replyTemplates));
              await sleep(300);
              if (!submitBtn.disabled) {
                submitBtn.click();
                userReplies++;
                state.stats.replies++;
                recordInteraction(cleanUsername, 'replies');
                console.log(`💬 Replied ${userReplies}/${CONFIG.limits.repliesPerUser}`);
                await sleep(800);
              } else {
                console.warn('⚠️ Reply button stayed disabled; closing composer.');
                document.activeElement?.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
              }
            } else {
              console.warn('⚠️ Reply composer did not open as expected.');
            }
            await randomDelay(CONFIG.delayBetweenActions, CONFIG.delayBetweenActions * 1.5);
          }
        }
      }
      
      // Follow
      if (CONFIG.actions.follow && !history[cleanUsername]?.followed) {
        const followBtn = document.querySelector(SELECTORS.followButton);
        if (followBtn) {
          followBtn.click();
          state.stats.follows++;
          recordInteraction(cleanUsername, 'followed');
          console.log(`👥 Followed @${cleanUsername}`);
        }
      }
      
      console.log(`✅ Completed interaction with @${cleanUsername}`);
      console.log(`   Likes: ${userLikes}, Retweets: ${userRetweets}, Replies: ${userReplies}`);
      state.currentUser = null;
    },
    
    // Interact with all target users: a console script cannot navigate between
    // profiles without being wiped, so this walks you through the sequence
    interactAll: async () => {
      if (CONFIG.targetUsers.length === 0) {
        console.error('❌ No target users configured!');
        console.log('Add usernames to CONFIG.targetUsers array.');
        return;
      }

      console.log(`🚀 Processing ${CONFIG.targetUsers.length} users...`);
      console.log('');
      console.log('📋 For each user, open their profile and run:');
      CONFIG.targetUsers.forEach((username, i) => {
        console.log(`   ${i + 1}. https://x.com/${username}`);
        console.log(`      Then: XActions.InteractUsers.interactWith("${username}")`);
      });
      console.log('');
      console.log('💡 Re-paste this script after each page navigation.');
    },
    
    // Add user to target list
    addUser: (username) => {
      const clean = username.replace('@', '').toLowerCase();
      if (!CONFIG.targetUsers.includes(clean)) {
        CONFIG.targetUsers.push(clean);
        console.log(`✅ Added @${clean} to target list`);
      } else {
        console.log(`⚠️ @${clean} already in target list`);
      }
    },
    
    // Remove user from target list
    removeUser: (username) => {
      const clean = username.replace('@', '').toLowerCase();
      const idx = CONFIG.targetUsers.indexOf(clean);
      if (idx > -1) {
        CONFIG.targetUsers.splice(idx, 1);
        console.log(`✅ Removed @${clean} from target list`);
      }
    },
    
    // Stop interaction
    stop: () => {
      state.isRunning = false;
      console.log('🛑 Interaction stopped.');
    },
    
    // Show stats
    stats: () => {
      console.log('');
      console.log('📊 INTERACTION STATS:');
      console.log(`   ❤️ Total likes: ${state.stats.likes}`);
      console.log(`   🔄 Total retweets: ${state.stats.retweets}`);
      console.log(`   💬 Total replies: ${state.stats.replies}`);
      console.log(`   👥 Total follows: ${state.stats.follows}`);
      console.log('');
    },
    
    // Show history
    showHistory: () => {
      console.log('');
      console.log('📜 INTERACTION HISTORY:');
      Object.entries(history).forEach(([user, data]) => {
        console.log(`   @${user}: ${data.likes}L / ${data.retweets}RT / ${data.replies}R / ${data.followed ? '✓Following' : ''}`);
      });
      console.log('');
    },
    
    // Help
    help: () => {
      console.log('');
      console.log('📋 INTERACT BY USERS COMMANDS:');
      console.log('');
      console.log('   XActions.InteractUsers.addUser("username")');
      console.log('   XActions.InteractUsers.removeUser("username")');
      console.log('   XActions.InteractUsers.interactWith("username")');
      console.log('   XActions.InteractUsers.interactAll()');
      console.log('   XActions.InteractUsers.stop()');
      console.log('   XActions.InteractUsers.stats()');
      console.log('   XActions.InteractUsers.showHistory()');
      console.log('');
    }
  };
  
  console.log('✅ Interact By Users loaded!');
  console.log(`📋 Target users: ${CONFIG.targetUsers.length}`);
  console.log('   Run XActions.InteractUsers.help() for commands.');
  console.log('');
})();

});
  register("interact-with-likers", function(){
var CONFIG = {
  // Actions
  actions: {
    follow: true,
  },
  
  // Limits
  limits: {
    follows: 20,
  },
  
  // Filters
  filters: {
    skipPrivate: true,
    skipVerified: false,  // Skip verified accounts
    skipNoPhoto: false,   // Skip accounts with default photo
  },
  
  // Timing
  delayBetweenActions: 2000,
  scrollDelay: 2000,
};
try{if(typeof window!=='undefined'&&window.__XA_LAUNCH_CFG){Object.assign(CONFIG,window.__XA_LAUNCH_CFG);}}catch(_xa){}


/**
 * ============================================================
 * 🚀 SCRIPT START - by nichxbt
 * ============================================================
 */

(async function interactWithLikers() {
  const sleep = (ms) => new Promise(r => setTimeout(r, ms));
  const randomDelay = (min, max) => sleep(Math.random() * (max - min) + min);
  
  // DOM Selectors
  const SELECTORS = {
    userCell: '[data-testid="UserCell"]',
    followButton: '[data-testid$="-follow"]',
    unfollowButton: '[data-testid$="-unfollow"]',
    verifiedBadge: '[data-testid="icon-verified"]',
    userName: '[data-testid="User-Name"]',
    protectedIcon: '[data-testid="icon-lock"]',
    defaultAvatar: 'img[src*="default_profile"]',
  };
  
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║  ❤️ INTERACT WITH LIKERS                                   ║');
  console.log('║  by nichxbt - https://github.com/nirholas/XActions         ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log('');
  
  // Verify we're on a likes page
  if (!window.location.href.includes('/likes')) {
    console.error('❌ ERROR: You must be on a tweet\'s Likes page!');
    console.log('');
    console.log('📋 How to get there:');
    console.log('   1. Go to any tweet');
    console.log('   2. Click on "X likes" below the tweet');
    console.log('   3. URL should be: x.com/USER/status/ID/likes');
    console.log('');
    return;
  }
  
  // State
  const state = {
    isRunning: false,
    stats: { followed: 0, skipped: 0 },
    processedUsers: new Set(),
  };
  
  // Check if user passes filters
  const passesFilters = (userCell) => {
    // Skip if already following
    if (userCell.querySelector(SELECTORS.unfollowButton)) return false;

    // Skip verified if configured
    if (CONFIG.filters.skipVerified && userCell.querySelector(SELECTORS.verifiedBadge)) {
      return false;
    }

    // Skip protected/private accounts if configured (was declared but never checked)
    if (CONFIG.filters.skipPrivate && userCell.querySelector(SELECTORS.protectedIcon)) {
      return false;
    }

    // Skip accounts still on the default avatar if configured (was declared but never checked)
    if (CONFIG.filters.skipNoPhoto && userCell.querySelector(SELECTORS.defaultAvatar)) {
      return false;
    }

    return true;
  };
  
  // Get username from cell
  const getUsername = (userCell) => {
    const link = userCell.querySelector('a[href^="/"]');
    return link?.getAttribute('href')?.replace('/', '');
  };
  
  // Create XActions interface
  window.XActions = window.XActions || {};
  window.XActions.Likers = {
    config: CONFIG,
    state,
    
    // Follow likers
    follow: async () => {
      console.log('🚀 Starting to follow likers...');
      state.isRunning = true;
      state.stats = { followed: 0, skipped: 0 };

      let emptyScrolls = 0;

      while (state.isRunning && state.stats.followed < CONFIG.limits.follows) {
        const userCells = document.querySelectorAll(SELECTORS.userCell);
        
        for (const cell of userCells) {
          if (!state.isRunning) break;
          if (state.stats.followed >= CONFIG.limits.follows) break;
          
          const username = getUsername(cell);
          if (!username || state.processedUsers.has(username)) continue;
          
          state.processedUsers.add(username);
          
          if (!passesFilters(cell)) {
            state.stats.skipped++;
            continue;
          }
          
          const followBtn = cell.querySelector(SELECTORS.followButton);
          if (followBtn) {
            try {
              followBtn.click();
              state.stats.followed++;
              console.log(`👥 Followed @${username} (${state.stats.followed}/${CONFIG.limits.follows})`);
              await randomDelay(CONFIG.delayBetweenActions, CONFIG.delayBetweenActions * 1.5);
            } catch (e) {
              console.warn(`⚠️ Failed to follow @${username}`);
            }
          }
        }
        
        // Scroll for more
        window.scrollBy(0, window.innerHeight);
        await sleep(CONFIG.scrollDelay);
        
        // Check if we've reached the end
        const newCells = document.querySelectorAll(SELECTORS.userCell);
        const allProcessed = [...newCells].every(cell => {
          const username = getUsername(cell);
          return state.processedUsers.has(username);
        });
        
        if (allProcessed && newCells.length > 0) {
          console.log('📄 Reached end of likers list.');
          break;
        }

        // Nothing rendered at all: stop after a few tries instead of looping forever
        if (newCells.length === 0) {
          emptyScrolls++;
          if (emptyScrolls >= 5) {
            console.log('⚠️ No likers found after 5 scrolls. Stopping.');
            break;
          }
        } else {
          emptyScrolls = 0;
        }
      }
      
      console.log('');
      console.log('╔════════════════════════════════════════════════════════════╗');
      console.log('║  🎉 FINISHED FOLLOWING LIKERS!                             ║');
      console.log('╚════════════════════════════════════════════════════════════╝');
      window.XActions.Likers.stats();
    },
    
    // Collect likers (just get usernames)
    collect: async () => {
      console.log('📥 Collecting likers...');
      const likers = [];
      
      let scrollCount = 0;
      const maxScrolls = 20;
      
      while (scrollCount < maxScrolls) {
        const userCells = document.querySelectorAll(SELECTORS.userCell);
        
        userCells.forEach(cell => {
          const username = getUsername(cell);
          if (username && !likers.includes(username)) {
            likers.push(username);
          }
        });
        
        console.log(`   📊 Collected ${likers.length} likers...`);
        
        window.scrollBy(0, window.innerHeight);
        await sleep(CONFIG.scrollDelay);
        scrollCount++;
      }
      
      console.log('');
      console.log(`✅ Collected ${likers.length} likers!`);
      console.log('📋 Likers:', likers.join(', '));
      
      return likers;
    },
    
    // Stop
    stop: () => {
      state.isRunning = false;
      console.log('🛑 Stopped.');
    },
    
    // Stats
    stats: () => {
      console.log('');
      console.log('📊 LIKERS INTERACTION STATS:');
      console.log(`   👥 Followed: ${state.stats.followed}`);
      console.log(`   ⏭️ Skipped: ${state.stats.skipped}`);
      console.log(`   📝 Total processed: ${state.processedUsers.size}`);
      console.log('');
    },
    
    // Help
    help: () => {
      console.log('');
      console.log('📋 LIKERS INTERACTION COMMANDS:');
      console.log('');
      console.log('   XActions.Likers.follow()   - Follow likers');
      console.log('   XActions.Likers.collect()  - Just collect usernames');
      console.log('   XActions.Likers.stop()     - Stop following');
      console.log('   XActions.Likers.stats()    - Show statistics');
      console.log('');
      console.log('📍 Make sure you\'re on a likes page first!');
      console.log('   URL: x.com/USER/status/ID/likes');
      console.log('');
    }
  };
  
  console.log('✅ Interact With Likers loaded!');
  console.log('   Run XActions.Likers.follow() to start following.');
  console.log('   Run XActions.Likers.help() for all commands.');
  console.log('');
})();

});
  register("join-communities", function(){
var CONFIG = {
  // Community IDs to join (get from URL: x.com/i/communities/1234567890)
  communities: [
    // '1234567890123456789',
    // '9876543210987654321',
  ],
  
  // Delay between joining communities (ms)
  joinDelay: 3000,
  
  // Delay for page load (ms)
  navigationDelay: 3000,
  
  // Maximum communities to join (0 = all in list)
  maxJoin: 0,
  
  // Skip communities you've already joined
  skipAlreadyJoined: true
};
try{if(typeof window!=='undefined'&&window.__XA_LAUNCH_CFG){Object.assign(CONFIG,window.__XA_LAUNCH_CFG);}}catch(_xa){}


/**
 * ============================================================
 * 🚀 SCRIPT START - by nichxbt
 * ============================================================
 */

(async function joinCommunities() {
  const sleep = (ms) => new Promise(r => setTimeout(r, ms));
  
  // DOM Selectors
  const $joinButton = 'button[aria-label^="Join"]:not([aria-label^="Joined"])';
  const $joinedButton = 'button[aria-label^="Joined"]';
  const $pendingButton = 'button[aria-label^="Pending"]';
  
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║  🏘️ JOIN COMMUNITIES FROM LIST                             ║');
  console.log('║  by nichxbt - https://github.com/nirholas/XActions         ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log('');
  
  // Validate configuration
  if (!CONFIG.communities || CONFIG.communities.length === 0) {
    console.error('❌ ERROR: No communities configured!');
    console.log('');
    console.log('📋 How to configure:');
    console.log('   1. Find community IDs from URLs: x.com/i/communities/1234567890');
    console.log('   2. Add them to CONFIG.communities array:');
    console.log('      communities: [');
    console.log('        "1234567890123456789",');
    console.log('        "9876543210987654321",');
    console.log('      ]');
    return;
  }
  
  // State tracking (persists across page navigations)
  const getJoinedCommunities = () => {
    try {
      return JSON.parse(sessionStorage.getItem('xactions_joined_communities') || '[]');
    } catch { return []; }
  };
  
  const markAsJoined = (id, status) => {
    const joined = getJoinedCommunities();
    if (!joined.find(c => c.id === id)) {
      joined.push({ id, status, timestamp: Date.now() });
      sessionStorage.setItem('xactions_joined_communities', JSON.stringify(joined));
    }
  };
  
  const getCurrentIndex = () => {
    return parseInt(sessionStorage.getItem('xactions_join_index') || '0', 10);
  };
  
  const setCurrentIndex = (idx) => {
    sessionStorage.setItem('xactions_join_index', idx.toString());
  };
  
  console.log(`📋 Communities to join: ${CONFIG.communities.length}`);
  console.log(`✅ Already processed: ${getJoinedCommunities().length}`);
  console.log('');
  
  const processCurrentCommunity = async () => {
    const index = getCurrentIndex();
    
    // Check if we're done
    if (index >= CONFIG.communities.length) {
      const joined = getJoinedCommunities();
      console.log('');
      console.log('╔════════════════════════════════════════════════════════════╗');
      console.log(`║  🎉 COMPLETE! Processed ${joined.length} communities       `);
      console.log('╚════════════════════════════════════════════════════════════╝');
      
      // Summary
      const successful = joined.filter(c => c.status === 'joined').length;
      const pending = joined.filter(c => c.status === 'pending').length;
      const skipped = joined.filter(c => c.status === 'already_joined').length;
      const failed = joined.filter(c => c.status === 'failed').length;
      
      console.log(`   ✅ Joined: ${successful}`);
      console.log(`   ⏳ Pending approval: ${pending}`);
      console.log(`   ⏭️ Already joined: ${skipped}`);
      console.log(`   ❌ Failed: ${failed}`);
      
      // Cleanup
      sessionStorage.removeItem('xactions_joined_communities');
      sessionStorage.removeItem('xactions_join_index');
      return;
    }
    
    // Check limits
    if (CONFIG.maxJoin > 0) {
      const successCount = getJoinedCommunities().filter(c => c.status === 'joined').length;
      if (successCount >= CONFIG.maxJoin) {
        console.log(`🛑 Reached limit of ${CONFIG.maxJoin} communities. Stopping.`);
        return;
      }
    }
    
    const communityId = CONFIG.communities[index];
    const urlMatch = window.location.href.match(/\/i\/communities\/(\d+)/);
    const currentId = urlMatch ? urlMatch[1] : null;
    
    // Navigate to community if not there
    if (currentId !== communityId) {
      console.log(`📍 Navigating to community ${index + 1}/${CONFIG.communities.length}: ${communityId}`);
      console.log('💡 Re-paste this script after the page loads to continue (progress is saved).');
      window.location.href = `https://x.com/i/communities/${communityId}`;
      return;
    }
    
    console.log(`🔍 Processing community ${index + 1}/${CONFIG.communities.length}: ${communityId}`);
    await sleep(CONFIG.navigationDelay);
    
    // Check if already joined
    const joinedBtn = document.querySelector($joinedButton);
    if (joinedBtn && CONFIG.skipAlreadyJoined) {
      console.log(`⏭️ Already a member, skipping...`);
      markAsJoined(communityId, 'already_joined');
      setCurrentIndex(index + 1);
      await sleep(1000);
      return processCurrentCommunity();
    }
    
    // Check if pending
    const pendingBtn = document.querySelector($pendingButton);
    if (pendingBtn) {
      console.log(`⏳ Request pending, skipping...`);
      markAsJoined(communityId, 'pending');
      setCurrentIndex(index + 1);
      await sleep(1000);
      return processCurrentCommunity();
    }
    
    // Try to join
    const joinBtn = document.querySelector($joinButton);
    if (joinBtn) {
      console.log(`👆 Clicking Join button...`);
      joinBtn.click();
      await sleep(CONFIG.joinDelay);
      
      // Check result
      const nowJoined = document.querySelector($joinedButton);
      const nowPending = document.querySelector($pendingButton);
      
      if (nowJoined) {
        console.log(`✅ Successfully joined community: ${communityId}`);
        markAsJoined(communityId, 'joined');
      } else if (nowPending) {
        console.log(`⏳ Request sent (awaiting approval): ${communityId}`);
        markAsJoined(communityId, 'pending');
      } else {
        console.log(`❓ Join status unknown for: ${communityId}`);
        markAsJoined(communityId, 'unknown');
      }
    } else {
      console.log(`❌ Join button not found for: ${communityId}`);
      markAsJoined(communityId, 'failed');
    }
    
    // Move to next
    setCurrentIndex(index + 1);
    await sleep(CONFIG.joinDelay);
    return processCurrentCommunity();
  };
  
  processCurrentCommunity();
})();

});
  register("keyword-follow", function(){
var CONFIG = {
  // ---- LIMITS ----

  // Maximum users to follow
  maxFollows: 20,
  
  // Max scrolls
  maxScrolls: 30,
  
  // ---- FILTERS ----
  
  filters: {
    // Skip protected accounts
    skipProtected: true,
    
    // Skip accounts that already follow you
    skipMutuals: false,
    
    // Skip verified accounts
    skipVerified: false,
    
    // Bio must contain at least one of these keywords
    // 💡 Leave empty to follow anyone in search results
    bioMustContain: [],
    
    // Bio must NOT contain these keywords
    bioBlacklist: ['bot', 'automated', 'promo', 'giveaway']
  },
  
  // ---- TRACKING ----
  // The script tracks who you followed and when, enabling smart unfollow later
  
  trackFollows: true,
  
  // ---- TIMING ----
  
  minDelay: 2000,
  maxDelay: 5000,
  scrollDelay: 2000
};
try{if(typeof window!=='undefined'&&window.__XA_LAUNCH_CFG){Object.assign(CONFIG,window.__XA_LAUNCH_CFG);}}catch(_xa){}


/**
 * ============================================================
 * 🚀 SCRIPT START
 * ============================================================
 */

(async function keywordFollow() {
  const sleep = (ms) => new Promise(r => setTimeout(r, ms));
  const randomDelay = () => Math.floor(Math.random() * (CONFIG.maxDelay - CONFIG.minDelay) + CONFIG.minDelay);
  
  const $userCell = '[data-testid="UserCell"]';
  const $followButton = '[data-testid$="-follow"]';
  const $followsYou = '[data-testid="userFollowIndicator"]';
  const $protectedIcon = '[data-testid="icon-lock"]';
  const $verifiedBadge = '[data-testid="icon-verified"]';
  
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║  🔑 KEYWORD FOLLOW                                         ║');
  console.log('║  by nichxbt - https://github.com/nirholas/XActions         ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log('');
  
  // Verify we're on search page
  if (!window.location.href.includes('/search')) {
    console.error('❌ ERROR: Must be on a search results page!');
    console.log('📍 Go to: https://x.com/search?q=YOUR_KEYWORD&f=user');
    return;
  }
  
  // Get search query
  const urlParams = new URLSearchParams(window.location.search);
  const query = urlParams.get('q') || 'unknown';
  
  console.log(`🔍 Search query: "${query}"`);
  console.log(`📊 Max follows: ${CONFIG.maxFollows}`);
  console.log('');
  
  const STORAGE_KEY = 'xactions_keyword_followed';
  const TRACKING_KEY = 'xactions_follow_tracking';
  
  const followedUsers = new Set();
  let trackingData = {};
  
  // Load existing data
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) JSON.parse(saved).forEach(u => followedUsers.add(u));
    
    const tracking = localStorage.getItem(TRACKING_KEY);
    if (tracking) trackingData = JSON.parse(tracking);
  } catch (e) {}
  
  let totalFollowed = 0;
  let scrolls = 0;
  
  /**
   * Get user info
   */
  function getUserInfo(cell) {
    const link = cell.querySelector('a[href^="/"]');
    const username = link ? link.getAttribute('href').replace('/', '').split('/')[0] : null;
    
    // Get bio
    const bioEl = cell.querySelector('[dir="auto"]:not([role])');
    const bio = bioEl ? bioEl.innerText.toLowerCase() : '';
    
    return { username, bio };
  }
  
  /**
   * Check filters
   */
  function passesFilters(cell, bio) {
    if (CONFIG.filters.skipProtected && cell.querySelector($protectedIcon)) return false;
    if (CONFIG.filters.skipVerified && cell.querySelector($verifiedBadge)) return false;
    if (CONFIG.filters.skipMutuals && cell.querySelector($followsYou)) return false;
    
    // Bio whitelist
    if (CONFIG.filters.bioMustContain.length > 0) {
      const has = CONFIG.filters.bioMustContain.some(k => bio.includes(k.toLowerCase()));
      if (!has) return false;
    }
    
    // Bio blacklist
    if (CONFIG.filters.bioBlacklist.length > 0) {
      const has = CONFIG.filters.bioBlacklist.some(k => bio.includes(k.toLowerCase()));
      if (has) return false;
    }
    
    return true;
  }
  
  console.log('🚀 Starting keyword follow...');
  console.log('');
  
  while (totalFollowed < CONFIG.maxFollows && scrolls < CONFIG.maxScrolls) {
    const cells = document.querySelectorAll($userCell);
    
    for (const cell of cells) {
      if (totalFollowed >= CONFIG.maxFollows) break;
      
      const { username, bio } = getUserInfo(cell);
      if (!username || followedUsers.has(username)) continue;
      
      if (!passesFilters(cell, bio)) continue;
      
      const followBtn = cell.querySelector($followButton);
      if (!followBtn) continue;
      
      try {
        followBtn.click();
        followedUsers.add(username);
        totalFollowed++;
        
        console.log(`✅ Followed #${totalFollowed}: @${username}`);
        
        // Track follow with timestamp
        if (CONFIG.trackFollows) {
          trackingData[username] = {
            followedAt: new Date().toISOString(),
            keyword: query
          };
          localStorage.setItem(TRACKING_KEY, JSON.stringify(trackingData));
        }
        
        localStorage.setItem(STORAGE_KEY, JSON.stringify([...followedUsers]));
        
        await sleep(randomDelay());
        
      } catch (e) {
        console.warn('⚠️ Error:', e.message);
      }
    }
    
    window.scrollTo(0, document.body.scrollHeight);
    await sleep(CONFIG.scrollDelay);
    scrolls++;
  }
  
  console.log('');
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║  ✅ KEYWORD FOLLOW COMPLETE!                               ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log(`👥 Total followed: ${totalFollowed}`);
  console.log(`📊 Total tracked: ${Object.keys(trackingData).length}`);
  console.log('');
  console.log('💡 Use smart-unfollow.js later to unfollow non-followers!');
  console.log('');
  
  return { followed: totalFollowed };
})();

});
  register("leave-all-communities", function(){
var CONFIG = {
  // Delay before clicking leave button
  leaveDelay: 1500,
  
  // Delay after confirming leave
  confirmDelay: 2000,
  
  // Delay for navigation
  navDelay: 2500,
  
  // Maximum communities to leave (0 = all)
  maxToLeave: 0
};
try{if(typeof window!=='undefined'&&window.__XA_LAUNCH_CFG){Object.assign(CONFIG,window.__XA_LAUNCH_CFG);}}catch(_xa){}


/**
 * ============================================================
 * 🚀 SCRIPT START
 * ============================================================
 */

// Stop flag lives on window (not inside the recursive function) so it
// survives every re-invocation of leaveAllCommunities() below.
window.__xaStopLeaveCommunities = false;
window.stopLeaveCommunities = () => {
  window.__xaStopLeaveCommunities = true;
  console.log('🛑 [Leave Communities] Stop requested. Finishing the current step, then exiting.');
};

(async function leaveAllCommunities() {
  const sleep = (ms) => new Promise(r => setTimeout(r, ms));

  // DOM Selectors
  const $communityLink = 'a[href^="/i/communities/"]';
  const $joinedButton = 'button[aria-label^="Joined"]';
  const $confirmButton = '[data-testid="confirmationSheetConfirm"]';
  const $backButton = '[data-testid="app-bar-back"]';

  // State management using sessionStorage (survives navigation)
  const STORAGE_KEY = 'xactions_left_communities';
  
  const getLeftCommunities = () => {
    try {
      return JSON.parse(sessionStorage.getItem(STORAGE_KEY) || '[]');
    } catch { return []; }
  };
  
  const markAsLeft = (id) => {
    const left = getLeftCommunities();
    if (!left.includes(id)) {
      left.push(id);
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(left));
    }
  };
  
  const isAlreadyLeft = (id) => getLeftCommunities().includes(id);

  if (window.__xaStopLeaveCommunities) {
    console.log('🛑 Stopped by user. Run the script again to resume where it left off.');
    return;
  }

  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║  🚪 LEAVE ALL COMMUNITIES                                  ║');
  console.log('║  by nichxbt - https://github.com/nirholas/XActions         ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log('💡 To stop early: window.stopLeaveCommunities()');
  console.log('');

  const leftCount = getLeftCommunities().length;
  if (leftCount > 0) {
    console.log(`📊 Previously left: ${leftCount} communities`);
    console.log('');
  }
  
  // Check current page state
  const currentUrl = window.location.href;
  
  // Are we inside a community page?
  if (currentUrl.includes('/i/communities/') && !currentUrl.endsWith('/communities')) {
    console.log('📍 Inside a community page...');
    
    // Extract community ID from URL
    const match = currentUrl.match(/\/i\/communities\/(\d+)/);
    const communityId = match ? match[1] : null;
    
    // Find and click the "Joined" button
    const joinedBtn = document.querySelector($joinedButton);
    
    if (joinedBtn) {
      console.log('🔍 Found "Joined" button, clicking...');
      joinedBtn.click();
      await sleep(CONFIG.leaveDelay);

      // Click confirm
      const confirmBtn = document.querySelector($confirmButton);
      if (confirmBtn) {
        confirmBtn.click();
        console.log('✅ Left community!');
        if (communityId) markAsLeft(communityId);
        await sleep(CONFIG.confirmDelay);
      } else {
        // Mark as processed anyway so we don't re-enter this community forever
        console.log('⚠️ Confirmation dialog not found. Skipping this community.');
        if (communityId) markAsLeft(communityId);
      }
    } else {
      // No Joined button (admins cannot leave, or the page failed to load).
      // Mark as processed so the script does not loop back here forever.
      console.log('⚠️ "Joined" button not found (admin or load issue). Skipping this community.');
      if (communityId) markAsLeft(communityId);
    }
    
    // Navigate back to communities list
    const backBtn = document.querySelector($backButton);
    if (backBtn && !window.__xaStopLeaveCommunities) {
      console.log('🔙 Navigating back...');
      backBtn.click();
      await sleep(CONFIG.navDelay);

      // Re-run the script to continue
      console.log('🔄 Continuing to next community...');
      leaveAllCommunities();
    }

    return;
  }
  
  // We're on the communities list page
  console.log('📍 On communities list page...');
  console.log('🔍 Looking for communities to leave...');
  
  // Find all community links
  const communityLinks = document.querySelectorAll($communityLink);
  
  if (communityLinks.length === 0) {
    console.log('');
    console.log('╔════════════════════════════════════════════════════════════╗');
    console.log('║  ✅ ALL DONE!                                              ║');
    console.log('╚════════════════════════════════════════════════════════════╝');
    console.log(`📊 Total communities left: ${getLeftCommunities().length}`);
    
    // Clear storage
    sessionStorage.removeItem(STORAGE_KEY);
    console.log('🧹 Cleared session storage.');
    return;
  }
  
  // Find next community to leave
  for (const link of communityLinks) {
    if (window.__xaStopLeaveCommunities) {
      console.log('🛑 Stopped by user. Run the script again to resume where it left off.');
      return;
    }

    const href = link.getAttribute('href');
    const match = href?.match(/\/i\/communities\/(\d+)/);
    const communityId = match ? match[1] : null;

    if (!communityId) continue;
    if (isAlreadyLeft(communityId)) continue;

    // Check limit
    if (CONFIG.maxToLeave > 0 && getLeftCommunities().length >= CONFIG.maxToLeave) {
      console.log(`✅ Reached limit of ${CONFIG.maxToLeave} communities.`);
      sessionStorage.removeItem(STORAGE_KEY);
      return;
    }

    console.log(`➡️ Entering community: ${communityId}`);
    link.click();
    await sleep(CONFIG.navDelay);
    
    // The page will navigate, then re-run to leave
    console.log('🔄 Page navigating... script will continue.');
    leaveAllCommunities();
    return;
  }
  
  // All visible communities processed
  console.log('');
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║  ✅ ALL DONE!                                              ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log(`📊 Total communities left: ${getLeftCommunities().length}`);
  sessionStorage.removeItem(STORAGE_KEY);
})();

});
  register("leave-community", function(){
var CONFIG = {
  // Community ID to leave (get from URL: x.com/i/communities/1234567890)
  // Set to null to leave the community you're currently viewing
  communityId: null,
  
  // Delay for confirmations (ms)
  confirmDelay: 1500,
  
  // Delay for navigation (ms)
  navigationDelay: 2500
};
try{if(typeof window!=='undefined'&&window.__XA_LAUNCH_CFG){Object.assign(CONFIG,window.__XA_LAUNCH_CFG);}}catch(_xa){}


/**
 * ============================================================
 * 🚀 SCRIPT START - by nichxbt
 * ============================================================
 */

(async function leaveCommunity() {
  const sleep = (ms) => new Promise(r => setTimeout(r, ms));
  
  // DOM Selectors
  const $communityLinks = 'a[href^="/i/communities/"]';
  const $joinedButton = 'button[aria-label^="Joined"]';
  const $confirmButton = '[data-testid="confirmationSheetConfirm"]';
  
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║  🚪 LEAVE SPECIFIC COMMUNITY                               ║');
  console.log('║  by nichxbt - https://github.com/nirholas/XActions         ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log('');
  
  // Check if we're already on a community page
  const urlMatch = window.location.href.match(/\/i\/communities\/(\d+)/);
  const currentCommunityId = urlMatch ? urlMatch[1] : null;
  
  // Determine which community to leave
  let targetId = CONFIG.communityId || currentCommunityId;
  
  if (!targetId) {
    console.error('❌ ERROR: No community specified!');
    console.log('');
    console.log('📋 Options:');
    console.log('   1. Go directly to a community page');
    console.log('   2. Set CONFIG.communityId = "YOUR_COMMUNITY_ID"');
    console.log('');
    console.log('💡 Find community ID in the URL: x.com/i/communities/1234567890');
    return;
  }
  
  console.log(`🎯 Target community: ${targetId}`);
  
  // Navigate to community if not already there
  if (currentCommunityId !== targetId) {
    console.log('📍 Navigating to community...');
    window.location.href = `https://x.com/i/communities/${targetId}`;
    return; // Script will need to be run again after navigation
  }
  
  // Look for the Joined button
  console.log('🔍 Looking for Joined button...');
  await sleep(CONFIG.confirmDelay);
  
  const joinedBtn = document.querySelector($joinedButton);
  
  if (!joinedBtn) {
    console.error('❌ ERROR: Joined button not found!');
    console.log('');
    console.log('📋 Possible reasons:');
    console.log('   • You\'re not a member of this community');
    console.log('   • The page hasn\'t fully loaded (try again)');
    console.log('   • You may need to scroll down');
    return;
  }
  
  console.log('👆 Clicking Joined button...');
  joinedBtn.click();
  await sleep(CONFIG.confirmDelay);
  
  // Click confirmation
  const confirmBtn = document.querySelector($confirmButton);
  
  if (confirmBtn) {
    console.log('✅ Confirming leave...');
    confirmBtn.click();
    await sleep(CONFIG.confirmDelay);
    
    console.log('');
    console.log('╔════════════════════════════════════════════════════════════╗');
    console.log(`║  🎉 Successfully left community: ${targetId}              `);
    console.log('╚════════════════════════════════════════════════════════════╝');
  } else {
    console.warn('⚠️ Confirmation button not found. You may need to confirm manually.');
  }
})();

});
  register("like-by-feed", function(){
(async function likeByFeed() {
  'use strict';

  // ============================================
  // 📝 CONFIGURATION - Customize these options
  // ============================================
  const CONFIG = {
    // Maximum number of tweets to like
    maxLikes: 50,
    
    // Skip reply tweets
    skipReplies: true,
    
    // Skip promoted/ad tweets
    skipAds: true,
    
    // Skip retweets
    skipRetweets: true,
    
    // Only like tweets with images/videos
    onlyWithMedia: false,
    
    // Minimum delay between actions (ms)
    minDelay: 1500,
    
    // Maximum delay between actions (ms)
    maxDelay: 3500,
    
    // Maximum scroll attempts to find new tweets
    maxScrollAttempts: 20,
    
    // Stop if no new tweets found after this many scrolls
    noNewTweetsThreshold: 5
  };
try{if(typeof window!=='undefined'&&window.__XA_LAUNCH_CFG){Object.assign(CONFIG,window.__XA_LAUNCH_CFG);}}catch(_xa){}


  // ============================================
  // 🔧 SELECTORS
  // ============================================
  const SELECTORS = {
    tweet: 'article[data-testid="tweet"]',
    likeButton: '[data-testid="like"]',
    unlikeButton: '[data-testid="unlike"]',
    tweetText: '[data-testid="tweetText"]',
    retweetIndicator: '[data-testid="socialContext"]',
    replyIndicator: 'div[data-testid="Tweet-User-Avatar"] + div a[href*="/status/"]',
    promotedLabel: '[data-testid="placementTracking"]',
    tweetMedia: '[data-testid="tweetPhoto"], [data-testid="videoPlayer"], [data-testid="videoComponent"]'
  };

  // ============================================
  // 🛠️ HELPERS
  // ============================================
  const sleep = (ms) => new Promise(r => setTimeout(r, ms));
  
  const randomDelay = () => {
    const delay = Math.floor(Math.random() * (CONFIG.maxDelay - CONFIG.minDelay + 1)) + CONFIG.minDelay;
    return sleep(delay);
  };

  const scrollDown = () => {
    window.scrollBy(0, window.innerHeight * 0.7);
  };

  const log = {
    info: (msg) => console.log(`ℹ️ ${msg}`),
    success: (msg) => console.log(`✅ ${msg}`),
    warning: (msg) => console.log(`⚠️ ${msg}`),
    error: (msg) => console.log(`❌ ${msg}`),
    progress: (current, total) => console.log(`📊 Progress: ${current}/${total} tweets liked`)
  };

  // ============================================
  // 🎯 MAIN LOGIC
  // ============================================
  const stats = {
    liked: 0,
    skippedReplies: 0,
    skippedAds: 0,
    skippedRetweets: 0,
    skippedNoMedia: 0,
    alreadyLiked: 0,
    errors: 0
  };

  const processedTweets = new Set();

  // Stop switch: run window.stopLikeByFeed() from the console to abort
  // the loop after the tweet currently being processed.
  let stopped = false;
  window.stopLikeByFeed = () => {
    stopped = true;
    log.warning('Stop requested. Finishing the current tweet, then exiting.');
  };

  console.log(`
╔══════════════════════════════════════════════════════════╗
║  🏠 LIKE BY FEED - XActions                              ║
║  👤 Author: nichxbt                                      ║
║  🌐 https://xactions.app                                 ║
╚══════════════════════════════════════════════════════════╝
  `);

  // Verify we're on the home page
  if (!window.location.href.includes('x.com/home') && !window.location.href.includes('twitter.com/home')) {
    log.warning('Not on home timeline. Redirecting...');
    window.location.href = 'https://x.com/home';
    return;
  }

  log.info(`Starting feed liker`);
  log.info(`Max likes: ${CONFIG.maxLikes}`);
  log.info(`Skip replies: ${CONFIG.skipReplies}`);
  log.info(`Skip ads: ${CONFIG.skipAds}`);
  log.info(`Skip retweets: ${CONFIG.skipRetweets}`);
  log.info(`To stop early: window.stopLikeByFeed()`);

  let scrollAttempts = 0;
  let noNewTweetsCount = 0;

  const isReply = (tweet) => {
    // Structural marker first (locale-independent), then the English UI text
    if (tweet.querySelector('[data-testid="in-reply-to"]') !== null) return true;
    return Array.from(tweet.querySelectorAll('div[dir]')).some(el =>
      el.innerText.startsWith('Replying to'));
  };

  const isAd = (tweet) => {
    // Check for promoted/ad indicators. Only match exact "Ad"/"Promoted" label
    // spans; a substring check on the whole tweet also hits words like "Advice".
    if (tweet.querySelector(SELECTORS.promotedLabel) !== null) return true;
    return Array.from(tweet.querySelectorAll('span')).some(el => {
      const t = el.textContent.trim();
      return t === 'Ad' || t === 'Promoted';
    });
  };

  const isRetweet = (tweet) => {
    // Reposts render socialContext inside an <a>; pinned posts render it as a
    // plain element. Checking the tag keeps pinned posts from matching.
    const socialContext = tweet.querySelector(SELECTORS.retweetIndicator);
    return !!socialContext && socialContext.closest('a') !== null;
  };

  const hasMedia = (tweet) => {
    return tweet.querySelector(SELECTORS.tweetMedia) !== null;
  };

  const getTweetIdentifier = (tweet) => {
    // Prefer the permalink around the timestamp: the first /status/ link in
    // the article can belong to a quoted tweet and give the wrong ID
    const timeAnchor = tweet.querySelector('time')?.closest('a[href*="/status/"]');
    if (timeAnchor) {
      const match = timeAnchor.href.match(/\/status\/(\d+)/);
      if (match) return match[1];
    }
    const links = tweet.querySelectorAll('a[href*="/status/"]');
    for (const link of links) {
      const match = link.href.match(/\/status\/(\d+)/);
      if (match) return match[1];
    }
    // Fallback to text content hash
    const text = tweet.querySelector(SELECTORS.tweetText)?.textContent || '';
    return text.substring(0, 100);
  };

  while (!stopped && stats.liked < CONFIG.maxLikes && scrollAttempts < CONFIG.maxScrollAttempts) {
    const tweets = document.querySelectorAll(SELECTORS.tweet);
    let foundNewTweet = false;

    for (const tweet of tweets) {
      if (stopped || stats.liked >= CONFIG.maxLikes) break;

      const tweetId = getTweetIdentifier(tweet);
      
      if (processedTweets.has(tweetId)) continue;
      processedTweets.add(tweetId);
      foundNewTweet = true;

      try {
        // Skip replies if configured
        if (CONFIG.skipReplies && isReply(tweet)) {
          stats.skippedReplies++;
          log.info('Skipped reply tweet');
          continue;
        }

        // Skip ads if configured
        if (CONFIG.skipAds && isAd(tweet)) {
          stats.skippedAds++;
          log.info('Skipped promoted/ad tweet');
          continue;
        }

        // Skip retweets if configured
        if (CONFIG.skipRetweets && isRetweet(tweet)) {
          stats.skippedRetweets++;
          log.info('Skipped retweet');
          continue;
        }

        // Only with media check
        if (CONFIG.onlyWithMedia && !hasMedia(tweet)) {
          stats.skippedNoMedia++;
          continue;
        }

        // Check if already liked
        const unlikeButton = tweet.querySelector(SELECTORS.unlikeButton);
        if (unlikeButton) {
          stats.alreadyLiked++;
          continue;
        }

        // Find and click like button
        const likeButton = tweet.querySelector(SELECTORS.likeButton);
        if (likeButton) {
          // Scroll tweet into view
          tweet.scrollIntoView({ behavior: 'smooth', block: 'center' });
          await sleep(500);

          likeButton.click();
          stats.liked++;

          const preview = tweet.querySelector(SELECTORS.tweetText)?.textContent?.substring(0, 50) || 'No text';
          log.success(`Liked tweet #${stats.liked}: "${preview}..."`);
          log.progress(stats.liked, CONFIG.maxLikes);

          await randomDelay();
        }
      } catch (error) {
        log.error(`Error processing tweet: ${error.message}`);
        stats.errors++;
      }
    }

    if (!foundNewTweet) {
      noNewTweetsCount++;
      if (noNewTweetsCount >= CONFIG.noNewTweetsThreshold) {
        log.warning('No new tweets found after multiple scrolls. Stopping.');
        break;
      }
    } else {
      noNewTweetsCount = 0;
    }

    // Scroll for more tweets
    scrollDown();
    scrollAttempts++;
    log.info(`Scrolling for more tweets... (attempt ${scrollAttempts}/${CONFIG.maxScrollAttempts})`);
    await sleep(1500);
  }

  // ============================================
  // 📊 SUMMARY
  // ============================================
  const totalSkipped = stats.skippedReplies + stats.skippedAds + stats.skippedRetweets + stats.skippedNoMedia;

  console.log(`
╔══════════════════════════════════════════════════════════╗
║  📊 LIKE BY FEED - COMPLETE                              ║
╠══════════════════════════════════════════════════════════╣
║  ✅ Total Liked:       ${String(stats.liked).padEnd(32)}║
║  ⏭️  Total Skipped:     ${String(totalSkipped).padEnd(32)}║
║     └─ Replies:        ${String(stats.skippedReplies).padEnd(32)}║
║     └─ Ads:            ${String(stats.skippedAds).padEnd(32)}║
║     └─ Retweets:       ${String(stats.skippedRetweets).padEnd(32)}║
║     └─ No Media:       ${String(stats.skippedNoMedia).padEnd(32)}║
║  💗 Already Liked:     ${String(stats.alreadyLiked).padEnd(32)}║
║  ❌ Errors:            ${String(stats.errors).padEnd(32)}║
║  📜 Scroll Attempts:   ${String(scrollAttempts).padEnd(32)}║
╚══════════════════════════════════════════════════════════╝
  `);

  log.success('Script completed! by nichxbt');
  
  return stats;
})();

});
  register("like-by-hashtag", function(){
(async function likeByHashtag() {
  'use strict';

  // ============================================
  // 📝 CONFIGURATION - Customize these options
  // ============================================
  const CONFIG = {
    // Hashtags to search for (without the # symbol)
    hashtags: ['javascript', 'webdev', 'coding'],
    
    // Maximum number of tweets to like per hashtag
    maxLikesPerHashtag: 10,
    
    // Total maximum likes across all hashtags
    maxTotalLikes: 30,
    
    // Minimum delay between actions (ms)
    minDelay: 2000,
    
    // Maximum delay between actions (ms)
    maxDelay: 4000,
    
    // Skip retweets
    skipRetweets: true,
    
    // Skip tweets with media only (no text)
    skipMediaOnly: false,
    
    // Scroll attempts before moving to next hashtag
    maxScrollAttempts: 5
  };
try{if(typeof window!=='undefined'&&window.__XA_LAUNCH_CFG){Object.assign(CONFIG,window.__XA_LAUNCH_CFG);}}catch(_xa){}


  // ============================================
  // 🔧 SELECTORS
  // ============================================
  const SELECTORS = {
    tweet: 'article[data-testid="tweet"]',
    likeButton: '[data-testid="like"]',
    unlikeButton: '[data-testid="unlike"]',
    tweetText: '[data-testid="tweetText"]',
    retweetIndicator: '[data-testid="socialContext"]',
    searchBox: '[data-testid="SearchBox_Search_Input"]'
  };

  // ============================================
  // 🛠️ HELPERS
  // ============================================
  const sleep = (ms) => new Promise(r => setTimeout(r, ms));
  
  const randomDelay = () => {
    const delay = Math.floor(Math.random() * (CONFIG.maxDelay - CONFIG.minDelay + 1)) + CONFIG.minDelay;
    return sleep(delay);
  };

  const scrollDown = () => {
    window.scrollBy(0, window.innerHeight * 0.8);
  };

  // Navigate within the SPA. Assigning window.location.href triggers a full
  // page load, which destroys this console script before it can continue.
  const spaNavigate = (url) => {
    try {
      const target = new URL(url, window.location.href);
      if (target.origin === window.location.origin) {
        window.history.pushState({}, '', target.href);
        window.dispatchEvent(new PopStateEvent('popstate', { state: {} }));
        return;
      }
    } catch (e) {}
    window.location.href = url;
  };

  const log = {
    info: (msg) => console.log(`ℹ️ ${msg}`),
    success: (msg) => console.log(`✅ ${msg}`),
    warning: (msg) => console.log(`⚠️ ${msg}`),
    error: (msg) => console.log(`❌ ${msg}`),
    progress: (current, total) => console.log(`📊 Progress: ${current}/${total} tweets liked`)
  };

  // ============================================
  // 🎯 MAIN LOGIC
  // ============================================
  const stats = {
    totalLiked: 0,
    skipped: 0,
    alreadyLiked: 0,
    errors: 0,
    byHashtag: {}
  };

  const processedTweets = new Set();

  // Stop switch: run window.stopLikeByHashtag() from the console to abort
  // the loop after the tweet currently being processed.
  let stopped = false;
  window.stopLikeByHashtag = () => {
    stopped = true;
    log.warning('Stop requested. Finishing the current tweet, then exiting.');
  };

  console.log(`
╔══════════════════════════════════════════════════════════╗
║  🏷️  LIKE BY HASHTAG - XActions                          ║
║  👤 Author: nichxbt                                      ║
║  🌐 https://xactions.app                                 ║
╚══════════════════════════════════════════════════════════╝
  `);

  log.info(`Starting hashtag liker for: #${CONFIG.hashtags.join(', #')}`);
  log.info(`Max likes per hashtag: ${CONFIG.maxLikesPerHashtag}`);
  log.info(`Max total likes: ${CONFIG.maxTotalLikes}`);
  log.info(`To stop early: window.stopLikeByHashtag()`);

  const likeTweetsOnPage = async (hashtag) => {
    let hashtagLikes = 0;
    let scrollAttempts = 0;
    let noNewTweetsCount = 0;

    while (!stopped && hashtagLikes < CONFIG.maxLikesPerHashtag &&
           stats.totalLiked < CONFIG.maxTotalLikes &&
           scrollAttempts < CONFIG.maxScrollAttempts) {

      const tweets = document.querySelectorAll(SELECTORS.tweet);
      let foundNewTweet = false;

      for (const tweet of tweets) {
        if (stopped || hashtagLikes >= CONFIG.maxLikesPerHashtag || stats.totalLiked >= CONFIG.maxTotalLikes) {
          break;
        }

        // Unique tweet ID from the permalink around the timestamp (the first
        // /status/ link can belong to a quoted tweet); text is the fallback
        const tweetText = tweet.querySelector(SELECTORS.tweetText)?.textContent || '';
        const timeAnchor = tweet.querySelector('time')?.closest('a[href*="/status/"]');
        const idMatch = timeAnchor?.href.match(/\/status\/(\d+)/);
        const tweetId = idMatch ? idMatch[1] : tweetText.substring(0, 100);

        if (processedTweets.has(tweetId)) {
          continue;
        }
        processedTweets.add(tweetId);
        foundNewTweet = true;

        try {
          // Skip retweets if configured (socialContext inside an <a> = repost;
          // a plain socialContext is a pinned post, not a repost)
          const socialContext = tweet.querySelector(SELECTORS.retweetIndicator);
          if (CONFIG.skipRetweets && socialContext && socialContext.closest('a') !== null) {
            stats.skipped++;
            continue;
          }

          // Skip media-only tweets if configured
          if (CONFIG.skipMediaOnly && !tweetText.trim()) {
            stats.skipped++;
            continue;
          }

          // Check if already liked
          const unlikeButton = tweet.querySelector(SELECTORS.unlikeButton);
          if (unlikeButton) {
            stats.alreadyLiked++;
            continue;
          }

          // Find and click like button
          const likeButton = tweet.querySelector(SELECTORS.likeButton);
          if (likeButton) {
            likeButton.click();
            hashtagLikes++;
            stats.totalLiked++;
            
            if (!stats.byHashtag[hashtag]) {
              stats.byHashtag[hashtag] = 0;
            }
            stats.byHashtag[hashtag]++;

            log.success(`Liked tweet #${stats.totalLiked} for #${hashtag}`);
            log.progress(stats.totalLiked, CONFIG.maxTotalLikes);

            await randomDelay();
          }
        } catch (error) {
          log.error(`Error processing tweet: ${error.message}`);
          stats.errors++;
        }
      }

      if (!foundNewTweet) {
        noNewTweetsCount++;
        if (noNewTweetsCount >= 3) {
          log.warning('No new tweets found after multiple scrolls');
          break;
        }
      } else {
        noNewTweetsCount = 0;
      }

      // Scroll for more tweets
      scrollDown();
      scrollAttempts++;
      await sleep(1500);
    }

    return hashtagLikes;
  };

  const navigateToHashtag = async (hashtag) => {
    const searchUrl = `https://x.com/search?q=%23${encodeURIComponent(hashtag)}&src=typed_query&f=live`;
    spaNavigate(searchUrl);

    // Wait for page to load
    await sleep(3000);
    
    // Wait for tweets to appear
    let attempts = 0;
    while (!document.querySelector(SELECTORS.tweet) && attempts < 10) {
      await sleep(1000);
      attempts++;
    }
    
    return attempts < 10;
  };

  // Process each hashtag
  for (const hashtag of CONFIG.hashtags) {
    if (stopped) break;
    if (stats.totalLiked >= CONFIG.maxTotalLikes) {
      log.warning('Reached maximum total likes limit');
      break;
    }

    log.info(`\n🔍 Searching for #${hashtag}...`);
    
    const navigated = await navigateToHashtag(hashtag);
    if (!navigated) {
      log.error(`Failed to load tweets for #${hashtag}`);
      continue;
    }

    await sleep(2000);
    await likeTweetsOnPage(hashtag);
    
    log.info(`Finished processing #${hashtag}`);
    await sleep(2000);
  }

  // ============================================
  // 📊 SUMMARY
  // ============================================
  console.log(`
╔══════════════════════════════════════════════════════════╗
║  📊 LIKE BY HASHTAG - COMPLETE                           ║
╠══════════════════════════════════════════════════════════╣
║  ✅ Total Liked:     ${String(stats.totalLiked).padEnd(34)}║
║  ⏭️  Skipped:         ${String(stats.skipped).padEnd(34)}║
║  💗 Already Liked:   ${String(stats.alreadyLiked).padEnd(34)}║
║  ❌ Errors:          ${String(stats.errors).padEnd(34)}║
╠══════════════════════════════════════════════════════════╣
║  📈 Likes by Hashtag:                                    ║
${Object.entries(stats.byHashtag).map(([tag, count]) => 
  `║    #${tag}: ${count}`.padEnd(59) + '║'
).join('\n')}
╚══════════════════════════════════════════════════════════╝
  `);

  log.success('Script completed! by nichxbt');
  
  return stats;
})();

});
  register("like-by-location", function(){
(async function likeByLocation() {
  'use strict';

  // ============================================
  // 📝 CONFIGURATION - Customize these options
  // ============================================
  const CONFIG = {
    // Location to search tweets from
    // Examples: "New York", "San Francisco, CA", "London", "Tokyo"
    location: 'San Francisco',
    
    // Search radius in miles (optional, appended to search)
    radiusMiles: 25,
    
    // Optional keyword to combine with location search
    // Leave empty to search all tweets from location
    keyword: '',
    
    // Maximum number of tweets to like
    maxLikes: 30,
    
    // Minimum delay between actions (ms)
    minDelay: 2000,
    
    // Maximum delay between actions (ms)
    maxDelay: 4000,
    
    // Skip retweets
    skipRetweets: true,
    
    // Skip replies
    skipReplies: false,
    
    // Maximum scroll attempts
    maxScrollAttempts: 15,
    
    // Search type: 'live' (recent) or 'top'
    searchType: 'live'
  };
try{if(typeof window!=='undefined'&&window.__XA_LAUNCH_CFG){Object.assign(CONFIG,window.__XA_LAUNCH_CFG);}}catch(_xa){}


  // ============================================
  // 🔧 SELECTORS
  // ============================================
  const SELECTORS = {
    tweet: 'article[data-testid="tweet"]',
    likeButton: '[data-testid="like"]',
    unlikeButton: '[data-testid="unlike"]',
    tweetText: '[data-testid="tweetText"]',
    retweetIndicator: '[data-testid="socialContext"]',
    searchResults: '[data-testid="primaryColumn"]'
  };

  // ============================================
  // 🛠️ HELPERS
  // ============================================
  const sleep = (ms) => new Promise(r => setTimeout(r, ms));
  
  const randomDelay = () => {
    const delay = Math.floor(Math.random() * (CONFIG.maxDelay - CONFIG.minDelay + 1)) + CONFIG.minDelay;
    return sleep(delay);
  };

  const scrollDown = () => {
    window.scrollBy(0, window.innerHeight * 0.75);
  };

  // Navigate within the SPA. Assigning window.location.href triggers a full
  // page load, which destroys this console script before it can continue.
  const spaNavigate = (url) => {
    try {
      const target = new URL(url, window.location.href);
      if (target.origin === window.location.origin) {
        window.history.pushState({}, '', target.href);
        window.dispatchEvent(new PopStateEvent('popstate', { state: {} }));
        return;
      }
    } catch (e) {}
    window.location.href = url;
  };

  const log = {
    info: (msg) => console.log(`ℹ️ ${msg}`),
    success: (msg) => console.log(`✅ ${msg}`),
    warning: (msg) => console.log(`⚠️ ${msg}`),
    error: (msg) => console.log(`❌ ${msg}`),
    progress: (current, total) => console.log(`📊 Progress: ${current}/${total} tweets liked`)
  };

  // ============================================
  // 🎯 MAIN LOGIC
  // ============================================
  const stats = {
    liked: 0,
    skippedRetweets: 0,
    skippedReplies: 0,
    alreadyLiked: 0,
    errors: 0,
    tweetsProcessed: 0
  };

  const processedTweets = new Set();

  // Stop switch: run window.stopLikeByLocation() from the console to abort
  // the loop after the tweet currently being processed.
  let stopped = false;
  window.stopLikeByLocation = () => {
    stopped = true;
    log.warning('Stop requested. Finishing the current tweet, then exiting.');
  };

  console.log(`
╔══════════════════════════════════════════════════════════╗
║  📍 LIKE BY LOCATION - XActions                          ║
║  👤 Author: nichxbt                                      ║
║  🌐 https://xactions.app                                 ║
╚══════════════════════════════════════════════════════════╝
  `);

  log.info(`Location: ${CONFIG.location}`);
  log.info(`Radius: ${CONFIG.radiusMiles} miles`);
  log.info(`Max likes: ${CONFIG.maxLikes}`);
  log.info(`To stop early: window.stopLikeByLocation()`);

  // Build the search query
  const buildSearchQuery = () => {
    let query = '';
    
    if (CONFIG.keyword) {
      query += CONFIG.keyword + ' ';
    }
    
    query += `near:"${CONFIG.location}"`;
    
    if (CONFIG.radiusMiles) {
      query += ` within:${CONFIG.radiusMiles}mi`;
    }
    
    return query;
  };

  const navigateToSearch = async () => {
    const query = buildSearchQuery();
    const encodedQuery = encodeURIComponent(query);
    const searchUrl = `https://x.com/search?q=${encodedQuery}&src=typed_query&f=${CONFIG.searchType}`;
    
    log.info(`Search query: ${query}`);
    log.info(`Navigating to search...`);

    spaNavigate(searchUrl);

    // Wait for page to load
    await sleep(3000);
    
    // Wait for tweets to appear
    let attempts = 0;
    while (!document.querySelector(SELECTORS.tweet) && attempts < 15) {
      await sleep(1000);
      attempts++;
    }
    
    if (attempts >= 15) {
      log.error('No tweets found for this location. Try a different location or check spelling.');
      return false;
    }
    
    return true;
  };

  const isReply = (tweet) => {
    // Structural marker first (locale-independent), then the English UI text
    if (tweet.querySelector('[data-testid="in-reply-to"]') !== null) return true;
    return Array.from(tweet.querySelectorAll('div[dir]')).some(el =>
      el.innerText.startsWith('Replying to'));
  };

  const isRetweet = (tweet) => {
    // Reposts render socialContext inside an <a>; pinned posts render it as a
    // plain element. Checking the tag keeps pinned posts from matching.
    const socialContext = tweet.querySelector(SELECTORS.retweetIndicator);
    return !!socialContext && socialContext.closest('a') !== null;
  };

  const getTweetIdentifier = (tweet) => {
    // Prefer the permalink around the timestamp: the first /status/ link in
    // the article can belong to a quoted tweet and give the wrong ID
    const timeAnchor = tweet.querySelector('time')?.closest('a[href*="/status/"]');
    if (timeAnchor) {
      const match = timeAnchor.href.match(/\/status\/(\d+)/);
      if (match) return match[1];
    }
    const links = tweet.querySelectorAll('a[href*="/status/"]');
    for (const link of links) {
      const match = link.href.match(/\/status\/(\d+)/);
      if (match) return match[1];
    }
    // Text fallback. Do NOT append Date.now(): a changing ID makes the same
    // tweet look new on every pass, defeating deduplication entirely.
    const text = tweet.querySelector(SELECTORS.tweetText)?.textContent || '';
    return text.substring(0, 100);
  };

  const likeTweets = async () => {
    let scrollAttempts = 0;
    let noNewTweetsCount = 0;

    while (!stopped && stats.liked < CONFIG.maxLikes && scrollAttempts < CONFIG.maxScrollAttempts) {
      const tweets = document.querySelectorAll(SELECTORS.tweet);
      let foundNewTweet = false;

      for (const tweet of tweets) {
        if (stopped || stats.liked >= CONFIG.maxLikes) break;

        const tweetId = getTweetIdentifier(tweet);
        
        if (processedTweets.has(tweetId)) continue;
        processedTweets.add(tweetId);
        foundNewTweet = true;
        stats.tweetsProcessed++;

        try {
          // Skip retweets if configured
          if (CONFIG.skipRetweets && isRetweet(tweet)) {
            stats.skippedRetweets++;
            continue;
          }

          // Skip replies if configured
          if (CONFIG.skipReplies && isReply(tweet)) {
            stats.skippedReplies++;
            continue;
          }

          // Check if already liked
          const unlikeButton = tweet.querySelector(SELECTORS.unlikeButton);
          if (unlikeButton) {
            stats.alreadyLiked++;
            continue;
          }

          // Find and click like button
          const likeButton = tweet.querySelector(SELECTORS.likeButton);
          if (likeButton) {
            tweet.scrollIntoView({ behavior: 'smooth', block: 'center' });
            await sleep(400);

            likeButton.click();
            stats.liked++;

            const preview = tweet.querySelector(SELECTORS.tweetText)?.textContent?.substring(0, 40) || 'No text';
            log.success(`Liked tweet #${stats.liked} from ${CONFIG.location}: "${preview}..."`);
            log.progress(stats.liked, CONFIG.maxLikes);

            await randomDelay();
          }
        } catch (error) {
          log.error(`Error processing tweet: ${error.message}`);
          stats.errors++;
        }
      }

      if (!foundNewTweet) {
        noNewTweetsCount++;
        if (noNewTweetsCount >= 4) {
          log.warning('No new tweets found. Location may have limited activity.');
          break;
        }
      } else {
        noNewTweetsCount = 0;
      }

      scrollDown();
      scrollAttempts++;
      log.info(`Scrolling... (${scrollAttempts}/${CONFIG.maxScrollAttempts})`);
      await sleep(1500);
    }
  };

  // Execute
  const pageLoaded = await navigateToSearch();
  
  if (pageLoaded) {
    await sleep(2000);
    await likeTweets();
  }

  // ============================================
  // 📊 SUMMARY
  // ============================================
  console.log(`
╔══════════════════════════════════════════════════════════╗
║  📊 LIKE BY LOCATION - COMPLETE                          ║
╠══════════════════════════════════════════════════════════╣
║  📍 Location:          ${String(CONFIG.location).padEnd(32)}║
║  🔍 Radius:            ${String(CONFIG.radiusMiles + ' miles').padEnd(32)}║
╠══════════════════════════════════════════════════════════╣
║  ✅ Total Liked:       ${String(stats.liked).padEnd(32)}║
║  📄 Tweets Processed:  ${String(stats.tweetsProcessed).padEnd(32)}║
║  ⏭️  Skipped Retweets:  ${String(stats.skippedRetweets).padEnd(32)}║
║  ⏭️  Skipped Replies:   ${String(stats.skippedReplies).padEnd(32)}║
║  💗 Already Liked:     ${String(stats.alreadyLiked).padEnd(32)}║
║  ❌ Errors:            ${String(stats.errors).padEnd(32)}║
╚══════════════════════════════════════════════════════════╝
  `);

  log.success('Script completed! by nichxbt');
  
  return stats;
})();

});
  register("like-by-user", function(){
(async function likeByUser() {
  'use strict';

  // ============================================
  // 📝 CONFIGURATION - Customize these options
  // ============================================
  const CONFIG = {
    // Maximum number of tweets to like
    maxLikes: 50,
    
    // Skip replies by this user
    skipReplies: false,
    
    // Skip retweets by this user
    skipRetweets: true,
    
    // Skip quote tweets
    skipQuoteTweets: false,
    
    // Only like tweets with images/videos
    onlyWithMedia: false,
    
    // Only like tweets with minimum engagement
    minLikes: 0,
    minRetweets: 0,
    
    // Minimum delay between actions (ms)
    minDelay: 1500,
    
    // Maximum delay between actions (ms)
    maxDelay: 3500,
    
    // Maximum scroll attempts
    maxScrollAttempts: 25,
    
    // Stop after this many consecutive already-liked tweets
    stopAfterAlreadyLiked: 10
  };
try{if(typeof window!=='undefined'&&window.__XA_LAUNCH_CFG){Object.assign(CONFIG,window.__XA_LAUNCH_CFG);}}catch(_xa){}


  // ============================================
  // 🔧 SELECTORS
  // ============================================
  const SELECTORS = {
    tweet: 'article[data-testid="tweet"]',
    likeButton: '[data-testid="like"]',
    unlikeButton: '[data-testid="unlike"]',
    tweetText: '[data-testid="tweetText"]',
    retweetIndicator: '[data-testid="socialContext"]',
    tweetMedia: '[data-testid="tweetPhoto"], [data-testid="videoPlayer"], [data-testid="videoComponent"]',
    userAvatar: '[data-testid="Tweet-User-Avatar"]',
    likeCount: '[data-testid="like"] span, [data-testid="unlike"] span',
    retweetCount: '[data-testid="retweet"] span'
  };

  // ============================================
  // 🛠️ HELPERS
  // ============================================
  const sleep = (ms) => new Promise(r => setTimeout(r, ms));
  
  const randomDelay = () => {
    const delay = Math.floor(Math.random() * (CONFIG.maxDelay - CONFIG.minDelay + 1)) + CONFIG.minDelay;
    return sleep(delay);
  };

  const scrollDown = () => {
    window.scrollBy(0, window.innerHeight * 0.7);
  };

  const log = {
    info: (msg) => console.log(`ℹ️ ${msg}`),
    success: (msg) => console.log(`✅ ${msg}`),
    warning: (msg) => console.log(`⚠️ ${msg}`),
    error: (msg) => console.log(`❌ ${msg}`),
    progress: (current, total) => console.log(`📊 Progress: ${current}/${total} tweets liked`)
  };

  const parseCount = (text) => {
    if (!text) return 0;
    const cleaned = text.replace(/,/g, '').trim();
    if (cleaned.endsWith('K')) {
      return parseFloat(cleaned) * 1000;
    }
    if (cleaned.endsWith('M')) {
      return parseFloat(cleaned) * 1000000;
    }
    if (cleaned.endsWith('B')) {
      return parseFloat(cleaned) * 1000000000;
    }
    return parseInt(cleaned) || 0;
  };

  // ============================================
  // 🎯 MAIN LOGIC
  // ============================================
  const stats = {
    liked: 0,
    skippedReplies: 0,
    skippedRetweets: 0,
    skippedQuotes: 0,
    skippedNoMedia: 0,
    skippedLowEngagement: 0,
    alreadyLiked: 0,
    errors: 0,
    tweetsProcessed: 0
  };

  const processedTweets = new Set();

  // Stop switch: run window.stopLikeByUser() from the console to abort
  // the loop after the tweet currently being processed.
  let stopped = false;
  window.stopLikeByUser = () => {
    stopped = true;
    log.warning('Stop requested. Finishing the current tweet, then exiting.');
  };

  console.log(`
╔══════════════════════════════════════════════════════════╗
║  👤 LIKE BY USER - XActions                              ║
║  👤 Author: nichxbt                                      ║
║  🌐 https://xactions.app                                 ║
╚══════════════════════════════════════════════════════════╝
  `);

  // Get current username from URL
  const currentUrl = window.location.href;
  const usernameMatch = currentUrl.match(/x\.com\/([^\/\?]+)|twitter\.com\/([^\/\?]+)/);
  const username = usernameMatch ? (usernameMatch[1] || usernameMatch[2]) : 'Unknown';

  // Verify we're on a profile page
  if (username === 'home' || username === 'explore' || username === 'search' || username === 'notifications') {
    log.error('Please navigate to a user profile page first (x.com/username)');
    log.info('Example: Go to x.com/elonmusk to like their tweets');
    return;
  }

  log.info(`Target user: @${username}`);
  log.info(`Max likes: ${CONFIG.maxLikes}`);
  log.info(`Skip replies: ${CONFIG.skipReplies}`);
  log.info(`Skip retweets: ${CONFIG.skipRetweets}`);
  log.info(`To stop early: window.stopLikeByUser()`);

  const isReply = (tweet) => {
    // Structural marker first (locale-independent), then the English UI text
    if (tweet.querySelector('[data-testid="in-reply-to"]') !== null) return true;
    return Array.from(tweet.querySelectorAll('div[dir]')).some(el =>
      el.innerText.startsWith('Replying to'));
  };

  const isRetweet = (tweet) => {
    // Reposts render socialContext inside an <a> linking to the reposter;
    // pinned posts render it as a plain element. The structural check works
    // on every UI language, unlike matching "reposted"/"Retweeted" text.
    const socialContext = tweet.querySelector(SELECTORS.retweetIndicator);
    return !!socialContext && socialContext.closest('a') !== null;
  };

  const isQuoteTweet = (tweet) => {
    // A quote tweet embeds the quoted post as a card inside a
    // div[role="link"] that itself contains a <time> element. The card does
    // NOT carry a nested data-testid="tweet", so matching on that (as this
    // used to) never found anything and skipQuoteTweets silently did nothing.
    return tweet.querySelector('div[role="link"] time') !== null;
  };

  const hasMedia = (tweet) => {
    return tweet.querySelector(SELECTORS.tweetMedia) !== null;
  };

  const getEngagement = (tweet) => {
    const likeSpan = tweet.querySelector(SELECTORS.likeCount);
    const retweetSpan = tweet.querySelector(SELECTORS.retweetCount);
    return {
      likes: parseCount(likeSpan?.textContent),
      retweets: parseCount(retweetSpan?.textContent)
    };
  };

  const getTweetIdentifier = (tweet) => {
    // Prefer the permalink around the timestamp: the first /status/ link in
    // the article can belong to a quoted tweet and give the wrong ID
    const timeAnchor = tweet.querySelector('time')?.closest('a[href*="/status/"]');
    if (timeAnchor) {
      const match = timeAnchor.href.match(/\/status\/(\d+)/);
      if (match) return match[1];
    }
    const links = tweet.querySelectorAll('a[href*="/status/"]');
    for (const link of links) {
      const match = link.href.match(/\/status\/(\d+)/);
      if (match) return match[1];
    }
    // Text fallback. Do NOT append Date.now(): a changing ID makes the same
    // tweet look new on every pass, defeating deduplication entirely.
    const text = tweet.querySelector(SELECTORS.tweetText)?.textContent || '';
    return text.substring(0, 100);
  };

  let scrollAttempts = 0;
  let noNewTweetsCount = 0;
  let consecutiveAlreadyLiked = 0;

  while (!stopped && stats.liked < CONFIG.maxLikes &&
         scrollAttempts < CONFIG.maxScrollAttempts &&
         consecutiveAlreadyLiked < CONFIG.stopAfterAlreadyLiked) {

    const tweets = document.querySelectorAll(SELECTORS.tweet);
    let foundNewTweet = false;

    for (const tweet of tweets) {
      if (stopped || stats.liked >= CONFIG.maxLikes) break;
      if (consecutiveAlreadyLiked >= CONFIG.stopAfterAlreadyLiked) break;

      const tweetId = getTweetIdentifier(tweet);
      
      if (processedTweets.has(tweetId)) continue;
      processedTweets.add(tweetId);
      foundNewTweet = true;
      stats.tweetsProcessed++;

      try {
        // Skip replies if configured
        if (CONFIG.skipReplies && isReply(tweet)) {
          stats.skippedReplies++;
          log.info('Skipped reply');
          continue;
        }

        // Skip retweets if configured
        if (CONFIG.skipRetweets && isRetweet(tweet)) {
          stats.skippedRetweets++;
          log.info('Skipped retweet');
          continue;
        }

        // Skip quote tweets if configured
        if (CONFIG.skipQuoteTweets && isQuoteTweet(tweet)) {
          stats.skippedQuotes++;
          log.info('Skipped quote tweet');
          continue;
        }

        // Only with media check
        if (CONFIG.onlyWithMedia && !hasMedia(tweet)) {
          stats.skippedNoMedia++;
          continue;
        }

        // Engagement check
        if (CONFIG.minLikes > 0 || CONFIG.minRetweets > 0) {
          const engagement = getEngagement(tweet);
          if (engagement.likes < CONFIG.minLikes || engagement.retweets < CONFIG.minRetweets) {
            stats.skippedLowEngagement++;
            continue;
          }
        }

        // Check if already liked
        const unlikeButton = tweet.querySelector(SELECTORS.unlikeButton);
        if (unlikeButton) {
          stats.alreadyLiked++;
          consecutiveAlreadyLiked++;
          if (consecutiveAlreadyLiked >= CONFIG.stopAfterAlreadyLiked) {
            log.warning(`Found ${consecutiveAlreadyLiked} consecutive already-liked tweets. Stopping to avoid duplicates.`);
          }
          continue;
        }

        // Reset consecutive counter when we find an unliked tweet
        consecutiveAlreadyLiked = 0;

        // Find and click like button
        const likeButton = tweet.querySelector(SELECTORS.likeButton);
        if (likeButton) {
          tweet.scrollIntoView({ behavior: 'smooth', block: 'center' });
          await sleep(400);

          likeButton.click();
          stats.liked++;

          const preview = tweet.querySelector(SELECTORS.tweetText)?.textContent?.substring(0, 45) || 'Media/No text';
          log.success(`Liked @${username}'s tweet #${stats.liked}: "${preview}..."`);
          log.progress(stats.liked, CONFIG.maxLikes);

          await randomDelay();
        }
      } catch (error) {
        log.error(`Error processing tweet: ${error.message}`);
        stats.errors++;
      }
    }

    if (!foundNewTweet) {
      noNewTweetsCount++;
      if (noNewTweetsCount >= 5) {
        log.warning('No new tweets found. User may have limited content.');
        break;
      }
    } else {
      noNewTweetsCount = 0;
    }

    scrollDown();
    scrollAttempts++;
    log.info(`Scrolling... (${scrollAttempts}/${CONFIG.maxScrollAttempts})`);
    await sleep(1500);
  }

  // ============================================
  // 📊 SUMMARY
  // ============================================
  console.log(`
╔══════════════════════════════════════════════════════════╗
║  📊 LIKE BY USER - COMPLETE                              ║
╠══════════════════════════════════════════════════════════╣
║  👤 Target User:       @${String(username).padEnd(31)}║
╠══════════════════════════════════════════════════════════╣
║  ✅ Total Liked:       ${String(stats.liked).padEnd(32)}║
║  📄 Tweets Processed:  ${String(stats.tweetsProcessed).padEnd(32)}║
║  ⏭️  Skipped Replies:   ${String(stats.skippedReplies).padEnd(32)}║
║  ⏭️  Skipped Retweets:  ${String(stats.skippedRetweets).padEnd(32)}║
║  ⏭️  Skipped Quotes:    ${String(stats.skippedQuotes).padEnd(32)}║
║  ⏭️  Low Engagement:    ${String(stats.skippedLowEngagement).padEnd(32)}║
║  💗 Already Liked:     ${String(stats.alreadyLiked).padEnd(32)}║
║  ❌ Errors:            ${String(stats.errors).padEnd(32)}║
╚══════════════════════════════════════════════════════════╝
  `);

  log.success('Script completed! by nichxbt');
  
  return stats;
})();

});
  register("like-user-replies", function(){
(async function likeUserReplies() {
  'use strict';

  // ============================================
  // 📝 CONFIGURATION - Customize these options
  // ============================================
  const CONFIG = {
    // Maximum number of replies to like
    maxLikes: 30,
    
    // Skip nested replies (replies to replies)
    skipNestedReplies: false,
    
    // Only like replies from verified users
    onlyVerified: false,

    // Only like replies with images/videos
    onlyWithMedia: false,
    
    // Skip replies that contain specific words
    skipContaining: [],
    
    // Only like replies containing specific words (empty = all)
    onlyContaining: [],
    
    // Minimum delay between actions (ms)
    minDelay: 1500,
    
    // Maximum delay between actions (ms)
    maxDelay: 3500,
    
    // Maximum scroll attempts
    maxScrollAttempts: 20,
    
    // Skip the original tweet (only like replies)
    skipOriginalTweet: true
  };
try{if(typeof window!=='undefined'&&window.__XA_LAUNCH_CFG){Object.assign(CONFIG,window.__XA_LAUNCH_CFG);}}catch(_xa){}


  // ============================================
  // 🔧 SELECTORS
  // ============================================
  const SELECTORS = {
    tweet: 'article[data-testid="tweet"]',
    likeButton: '[data-testid="like"]',
    unlikeButton: '[data-testid="unlike"]',
    tweetText: '[data-testid="tweetText"]',
    userCell: '[data-testid="User-Name"]',
    verifiedBadge: '[data-testid="icon-verified"]',
    tweetMedia: '[data-testid="tweetPhoto"], [data-testid="videoPlayer"], [data-testid="videoComponent"]',
    conversationThread: '[data-testid="cellInnerDiv"]',
    replyingTo: 'div[dir="ltr"]'
  };

  // ============================================
  // 🛠️ HELPERS
  // ============================================
  const sleep = (ms) => new Promise(r => setTimeout(r, ms));
  
  const randomDelay = () => {
    const delay = Math.floor(Math.random() * (CONFIG.maxDelay - CONFIG.minDelay + 1)) + CONFIG.minDelay;
    return sleep(delay);
  };

  const scrollDown = () => {
    window.scrollBy(0, window.innerHeight * 0.7);
  };

  const log = {
    info: (msg) => console.log(`ℹ️ ${msg}`),
    success: (msg) => console.log(`✅ ${msg}`),
    warning: (msg) => console.log(`⚠️ ${msg}`),
    error: (msg) => console.log(`❌ ${msg}`),
    progress: (current, total) => console.log(`📊 Progress: ${current}/${total} replies liked`)
  };

  // ============================================
  // 🎯 MAIN LOGIC
  // ============================================
  const stats = {
    liked: 0,
    skippedOriginal: 0,
    skippedNested: 0,
    skippedNotVerified: 0,
    skippedNoMedia: 0,
    skippedFiltered: 0,
    alreadyLiked: 0,
    errors: 0,
    repliesProcessed: 0
  };

  const processedTweets = new Set();

  // Stop switch: run window.stopLikeUserReplies() from the console to abort
  // the loop after the reply currently being processed.
  let stopped = false;
  window.stopLikeUserReplies = () => {
    stopped = true;
    log.warning('Stop requested. Finishing the current reply, then exiting.');
  };

  console.log(`
╔══════════════════════════════════════════════════════════╗
║  💬 LIKE USER REPLIES - XActions                         ║
║  👤 Author: nichxbt                                      ║
║  🌐 https://xactions.app                                 ║
╚══════════════════════════════════════════════════════════╝
  `);

  // Verify we're on a tweet page
  const currentUrl = window.location.href;
  if (!currentUrl.includes('/status/')) {
    log.error('Please navigate to a tweet page first (x.com/username/status/xxx)');
    log.info('Example: Go to a specific tweet to like its replies');
    return;
  }

  // Extract tweet info from URL
  const urlMatch = currentUrl.match(/\/([^\/]+)\/status\/(\d+)/);
  const tweetAuthor = urlMatch ? urlMatch[1] : 'Unknown';
  const tweetId = urlMatch ? urlMatch[2] : 'Unknown';

  log.info(`Tweet by: @${tweetAuthor}`);
  log.info(`Tweet ID: ${tweetId}`);
  log.info(`Max likes: ${CONFIG.maxLikes}`);
  log.info(`Skip original tweet: ${CONFIG.skipOriginalTweet}`);
  log.info(`To stop early: window.stopLikeUserReplies()`);

  const isVerified = (tweet) => {
    return tweet.querySelector(SELECTORS.verifiedBadge) !== null;
  };

  const hasMedia = (tweet) => {
    return tweet.querySelector(SELECTORS.tweetMedia) !== null;
  };

  const getTweetText = (tweet) => {
    const textElement = tweet.querySelector(SELECTORS.tweetText);
    return textElement ? textElement.textContent.toLowerCase() : '';
  };

  const containsFilteredWords = (text) => {
    if (CONFIG.skipContaining.length === 0) return false;
    return CONFIG.skipContaining.some(word => text.includes(word.toLowerCase()));
  };

  const containsRequiredWords = (text) => {
    if (CONFIG.onlyContaining.length === 0) return true;
    return CONFIG.onlyContaining.some(word => text.includes(word.toLowerCase()));
  };

  const isOriginalTweet = (tweet, index, replyId) => {
    // Structural check first: a tweet whose own permalink ID matches the
    // /status/ ID in the URL is the original, on any UI language
    if (replyId === tweetId) return true;
    // The original tweet is usually the first one on the page
    // and doesn't have "Replying to" text
    if (index === 0) return true;
    const tweetContent = tweet.textContent || '';
    // Check if it's NOT a reply (original tweets don't show "Replying to")
    const hasReplyingTo = tweetContent.includes('Replying to');
    return !hasReplyingTo && index < 2;
  };

  const isNestedReply = (tweet) => {
    // Check if this reply is replying to another reply (not the original tweet)
    const tweetContent = tweet.textContent || '';
    if (!tweetContent.includes('Replying to')) return false;
    
    // This is a simple heuristic - if replying to multiple users, it's likely nested
    const matches = tweetContent.match(/Replying to/g);
    return matches && matches.length > 1;
  };

  const getReplyIdentifier = (tweet) => {
    // Prefer the permalink around the timestamp: the first /status/ link in
    // the article can belong to a quoted tweet and give the wrong ID
    const timeAnchor = tweet.querySelector('time')?.closest('a[href*="/status/"]');
    if (timeAnchor) {
      const match = timeAnchor.href.match(/\/status\/(\d+)/);
      if (match) return match[1];
    }
    const links = tweet.querySelectorAll('a[href*="/status/"]');
    for (const link of links) {
      const match = link.href.match(/\/status\/(\d+)/);
      if (match) return match[1];
    }
    // Text fallback. Do NOT append Date.now(): a changing ID makes the same
    // reply look new on every pass, defeating deduplication entirely.
    const text = tweet.querySelector(SELECTORS.tweetText)?.textContent || '';
    return text.substring(0, 100);
  };

  const getUsername = (tweet) => {
    const userCell = tweet.querySelector(SELECTORS.userCell);
    if (!userCell) return 'Unknown';
    const link = userCell.querySelector('a[href^="/"]');
    if (!link) return 'Unknown';
    return link.getAttribute('href')?.replace('/', '') || 'Unknown';
  };

  let scrollAttempts = 0;
  let noNewRepliesCount = 0;
  let isFirstBatch = true;

  // Initial scroll to load replies
  await sleep(2000);

  while (!stopped && stats.liked < CONFIG.maxLikes && scrollAttempts < CONFIG.maxScrollAttempts) {
    const tweets = document.querySelectorAll(SELECTORS.tweet);
    let foundNewReply = false;
    let tweetIndex = 0;

    for (const tweet of tweets) {
      if (stopped || stats.liked >= CONFIG.maxLikes) break;

      const replyId = getReplyIdentifier(tweet);
      
      if (processedTweets.has(replyId)) {
        tweetIndex++;
        continue;
      }
      processedTweets.add(replyId);
      foundNewReply = true;

      try {
        // Skip original tweet if configured
        if (CONFIG.skipOriginalTweet && isFirstBatch && isOriginalTweet(tweet, tweetIndex, replyId)) {
          stats.skippedOriginal++;
          log.info('Skipped original tweet');
          tweetIndex++;
          continue;
        }

        stats.repliesProcessed++;

        // Skip nested replies if configured
        if (CONFIG.skipNestedReplies && isNestedReply(tweet)) {
          stats.skippedNested++;
          log.info('Skipped nested reply');
          tweetIndex++;
          continue;
        }

        // Only verified check
        if (CONFIG.onlyVerified && !isVerified(tweet)) {
          stats.skippedNotVerified++;
          tweetIndex++;
          continue;
        }

        // Only with media check
        if (CONFIG.onlyWithMedia && !hasMedia(tweet)) {
          stats.skippedNoMedia++;
          tweetIndex++;
          continue;
        }

        // Word filter check
        const tweetText = getTweetText(tweet);
        if (containsFilteredWords(tweetText)) {
          stats.skippedFiltered++;
          log.info('Skipped reply (contains filtered word)');
          tweetIndex++;
          continue;
        }

        if (!containsRequiredWords(tweetText)) {
          stats.skippedFiltered++;
          tweetIndex++;
          continue;
        }

        // Check if already liked
        const unlikeButton = tweet.querySelector(SELECTORS.unlikeButton);
        if (unlikeButton) {
          stats.alreadyLiked++;
          tweetIndex++;
          continue;
        }

        // Find and click like button
        const likeButton = tweet.querySelector(SELECTORS.likeButton);
        if (likeButton) {
          tweet.scrollIntoView({ behavior: 'smooth', block: 'center' });
          await sleep(400);

          likeButton.click();
          stats.liked++;

          const username = getUsername(tweet);
          const preview = tweetText.substring(0, 40) || 'Media/No text';
          log.success(`Liked reply #${stats.liked} by @${username}: "${preview}..."`);
          log.progress(stats.liked, CONFIG.maxLikes);

          await randomDelay();
        }

        tweetIndex++;
      } catch (error) {
        log.error(`Error processing reply: ${error.message}`);
        stats.errors++;
        tweetIndex++;
      }
    }

    isFirstBatch = false;

    if (!foundNewReply) {
      noNewRepliesCount++;
      if (noNewRepliesCount >= 5) {
        log.warning('No new replies found. May have reached the end of thread.');
        break;
      }
    } else {
      noNewRepliesCount = 0;
    }

    scrollDown();
    scrollAttempts++;
    log.info(`Loading more replies... (${scrollAttempts}/${CONFIG.maxScrollAttempts})`);
    await sleep(1500);
  }

  // ============================================
  // 📊 SUMMARY
  // ============================================
  const totalSkipped = stats.skippedOriginal + stats.skippedNested + stats.skippedNotVerified + 
                       stats.skippedNoMedia + stats.skippedFiltered;

  console.log(`
╔══════════════════════════════════════════════════════════╗
║  📊 LIKE USER REPLIES - COMPLETE                         ║
╠══════════════════════════════════════════════════════════╣
║  👤 Tweet Author:      @${String(tweetAuthor).padEnd(31)}║
║  🔗 Tweet ID:          ${String(tweetId).padEnd(32)}║
╠══════════════════════════════════════════════════════════╣
║  ✅ Total Liked:       ${String(stats.liked).padEnd(32)}║
║  💬 Replies Processed: ${String(stats.repliesProcessed).padEnd(32)}║
║  ⏭️  Total Skipped:     ${String(totalSkipped).padEnd(32)}║
║     └─ Original:       ${String(stats.skippedOriginal).padEnd(32)}║
║     └─ Nested:         ${String(stats.skippedNested).padEnd(32)}║
║     └─ Not Verified:   ${String(stats.skippedNotVerified).padEnd(32)}║
║     └─ No Media:       ${String(stats.skippedNoMedia).padEnd(32)}║
║     └─ Filtered:       ${String(stats.skippedFiltered).padEnd(32)}║
║  💗 Already Liked:     ${String(stats.alreadyLiked).padEnd(32)}║
║  ❌ Errors:            ${String(stats.errors).padEnd(32)}║
╚══════════════════════════════════════════════════════════╝
  `);

  log.success('Script completed! by nichxbt');
  
  return stats;
})();

});
  register("link-scraper", function(){
var CONFIG = {
  // Maximum scrolls to load tweets
  maxScrolls: 100,
  
  // Maximum tweets to scan
  maxTweets: 500,
  
  // Scroll delay
  scrollDelay: 1500,
  
  // Include Twitter/X internal links
  includeTwitterLinks: false,
  
  // Include media links (images/videos)
  includeMedia: false,
  
  // Domains to exclude
  excludeDomains: [
    't.co' // Twitter's URL shortener (usually just redirects)
  ],
  
  // Auto-download results
  autoDownload: true,
  
  // Max retries when no new content
  maxRetries: 5
};
try{if(typeof window!=='undefined'&&window.__XA_LAUNCH_CFG){Object.assign(CONFIG,window.__XA_LAUNCH_CFG);}}catch(_xa){}


/**
 * ============================================================
 * 🚀 SCRIPT START
 * ============================================================
 */

(async function linkScraper() {
  const sleep = (ms) => new Promise(r => setTimeout(r, ms));
  
  const $tweet = 'article[data-testid="tweet"]';
  
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║  🔗 LINK SCRAPER                                           ║');
  console.log('║  by nichxbt - https://github.com/nirholas/XActions         ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log('');
  
  // Get username from URL
  const pathMatch = window.location.pathname.match(/^\/([^\/]+)/);
  const username = pathMatch ? pathMatch[1] : null;
  
  if (!username || ['home', 'explore', 'search', 'notifications', 'messages', 'i'].includes(username)) {
    console.error('❌ ERROR: Must be on a user\'s profile page!');
    console.log('📍 Go to: https://x.com/username');
    return;
  }
  
  console.log(`👤 Scraping links from: @${username}`);
  console.log('');
  
  const links = new Map(); // url -> { url, domain, tweetCount, tweets }
  const seenTweets = new Set();
  let scrolls = 0;
  let retries = 0;
  let lastLinkCount = 0;
  let lastTweetCount = 0;
  
  /**
   * Extract domain from URL
   */
  function getDomain(url) {
    try {
      return new URL(url).hostname.replace('www.', '');
    } catch {
      return 'unknown';
    }
  }
  
  /**
   * Check if link should be included
   */
  function shouldInclude(url) {
    const domain = getDomain(url);
    
    // Exclude configured domains
    if (CONFIG.excludeDomains.includes(domain)) return false;
    
    // Exclude Twitter links
    if (!CONFIG.includeTwitterLinks) {
      if (domain.includes('twitter.com') || domain.includes('x.com')) return false;
    }
    
    // Exclude media
    if (!CONFIG.includeMedia) {
      if (domain.includes('twimg.com') || url.includes('/photo/') || url.includes('/video/')) return false;
    }
    
    return true;
  }
  
  /**
   * Extract links from tweet
   */
  function extractLinks(tweetEl) {
    // Get tweet ID for deduplication. Prefer the permalink around the
    // timestamp: the first /status/ link can belong to a quoted tweet.
    const timeAnchor = tweetEl.querySelector('time')?.closest('a[href*="/status/"]');
    const tweetLink = timeAnchor || tweetEl.querySelector('a[href*="/status/"]');
    if (!tweetLink) return [];

    const match = tweetLink.href.match(/\/status\/(\d+)/);
    if (!match) return [];
    
    const tweetId = match[1];
    if (seenTweets.has(tweetId)) return [];
    seenTweets.add(tweetId);
    
    const foundLinks = [];
    
    // Find all links in tweet
    tweetEl.querySelectorAll('a').forEach(a => {
      const href = a.href;
      if (!href || !href.startsWith('http')) return;
      
      // Get expanded URL from title attribute if available
      let url = a.getAttribute('title') || href;
      
      // Skip if it's a relative link or twitter internal
      if (!url.startsWith('http')) return;
      
      if (shouldInclude(url)) {
        foundLinks.push({
          url,
          domain: getDomain(url),
          tweetId,
          tweetUrl: `https://x.com/${username}/status/${tweetId}`
        });
      }
    });
    
    return foundLinks;
  }
  
  console.log('🚀 Scraping links...');
  console.log('');
  
  // Scroll and extract
  while (scrolls < CONFIG.maxScrolls && seenTweets.size < CONFIG.maxTweets && retries < CONFIG.maxRetries) {
    document.querySelectorAll($tweet).forEach(tweet => {
      const foundLinks = extractLinks(tweet);
      
      foundLinks.forEach(linkData => {
        if (links.has(linkData.url)) {
          const existing = links.get(linkData.url);
          existing.tweetCount++;
          existing.tweets.push(linkData.tweetUrl);
        } else {
          links.set(linkData.url, {
            url: linkData.url,
            domain: linkData.domain,
            tweetCount: 1,
            tweets: [linkData.tweetUrl]
          });
        }
      });
    });
    
    // Progress means new links OR new tweets scanned; tracking links alone
    // would stop the scan early on stretches of tweets with no links
    if (links.size === lastLinkCount && seenTweets.size === lastTweetCount) {
      retries++;
    } else {
      retries = 0;
      lastLinkCount = links.size;
      lastTweetCount = seenTweets.size;
    }
    
    console.log(`📊 Found ${links.size} unique links from ${seenTweets.size} tweets...`);
    
    window.scrollTo(0, document.body.scrollHeight);
    await sleep(CONFIG.scrollDelay);
    scrolls++;
  }
  
  console.log('');
  console.log(`✅ Finished: ${links.size} links from ${seenTweets.size} tweets`);
  console.log('');
  
  // Group by domain
  const byDomain = {};
  links.forEach(link => {
    if (!byDomain[link.domain]) {
      byDomain[link.domain] = [];
    }
    byDomain[link.domain].push(link);
  });
  
  // Sort domains by link count
  const sortedDomains = Object.entries(byDomain)
    .sort((a, b) => b[1].length - a[1].length);
  
  // Display summary
  console.log('📊 LINKS BY DOMAIN:');
  console.log('');
  sortedDomains.slice(0, 15).forEach(([domain, domainLinks]) => {
    console.log(`   ${domain}: ${domainLinks.length} links`);
  });
  if (sortedDomains.length > 15) {
    console.log(`   ... and ${sortedDomains.length - 15} more domains`);
  }
  console.log('');
  
  // Build result
  const result = {
    username,
    scrapedAt: new Date().toISOString(),
    totalLinks: links.size,
    totalTweets: seenTweets.size,
    byDomain: Object.fromEntries(sortedDomains),
    allLinks: [...links.values()].sort((a, b) => b.tweetCount - a.tweetCount)
  };
  
  // Download
  if (CONFIG.autoDownload) {
    // JSON
    const jsonBlob = new Blob([JSON.stringify(result, null, 2)], { type: 'application/json' });
    const jsonUrl = URL.createObjectURL(jsonBlob);
    const jsonLink = document.createElement('a');
    jsonLink.href = jsonUrl;
    jsonLink.download = `${username}_links_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(jsonLink);
    jsonLink.click();
    document.body.removeChild(jsonLink);
    URL.revokeObjectURL(jsonUrl);
    console.log('💾 JSON downloaded!');
    
    // CSV (quote every field: URLs can contain commas and quotes)
    const csvEscape = (v) => `"${String(v).replace(/"/g, '""')}"`;
    const headers = ['URL', 'Domain', 'Times Shared', 'First Tweet'];
    const rows = result.allLinks.map(l => [
      l.url,
      l.domain,
      l.tweetCount,
      l.tweets[0]
    ].map(csvEscape).join(','));
    
    const csv = [headers.join(','), ...rows].join('\n');
    const csvBlob = new Blob([csv], { type: 'text/csv' });
    const csvUrl = URL.createObjectURL(csvBlob);
    const csvLink = document.createElement('a');
    csvLink.href = csvUrl;
    csvLink.download = `${username}_links_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(csvLink);
    csvLink.click();
    document.body.removeChild(csvLink);
    URL.revokeObjectURL(csvUrl);
    console.log('💾 CSV downloaded!');
  }
  
  console.log('');
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║  ✅ LINK SCRAPER COMPLETE!                                 ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log(`🔗 Total unique links: ${links.size}`);
  console.log(`📊 Total domains: ${sortedDomains.length}`);
  console.log('');
  
  window.scrapedLinks = result;
  console.log('💡 Access via: window.scrapedLinks');
  
  return result;
})();

});
  register("mass-block", function(){
var CONFIG = {
  // List of usernames to block (without @)
  usersToBlock: [
    // 'username1',
    // 'username2',
    // Add usernames here
  ],
  
  // Delay between blocks (ms) - don't go below 2000 to avoid rate limits
  blockDelay: 3000,
  
  // Dry run mode - set to false to actually block
  dryRun: true
};
try{if(typeof window!=='undefined'&&window.__XA_LAUNCH_CFG){Object.assign(CONFIG,window.__XA_LAUNCH_CFG);}}catch(_xa){}


/**
 * ============================================================
 * 🚀 SCRIPT START
 * ============================================================
 */

(async function massBlock() {
  const sleep = (ms) => new Promise(r => setTimeout(r, ms));

  // Navigate within the SPA. Assigning window.location.href triggers a full
  // page load, which destroys this console script after the first user.
  const spaNavigate = (url) => {
    try {
      const target = new URL(url, window.location.href);
      if (target.origin === window.location.origin) {
        window.history.pushState({}, '', target.href);
        window.dispatchEvent(new PopStateEvent('popstate', { state: {} }));
        return;
      }
    } catch (e) {}
    window.location.href = url;
  };

  // Stop switch: run window.stopMassBlock() from the console to abort after
  // the account currently being processed.
  let stopped = false;
  window.stopMassBlock = () => {
    stopped = true;
    console.log('🛑 Stop requested. Finishing the current account, then exiting.');
  };

  console.log(`
╔══════════════════════════════════════════════════════════════╗
║  🚫 XActions — Mass Block                                    ║
║  Block multiple users from a list                            ║
${CONFIG.dryRun ? '║  ⚠️  DRY RUN MODE - No accounts will be blocked             ║' : '║  🔴 LIVE MODE - Accounts WILL be blocked                    ║'}
╚══════════════════════════════════════════════════════════════╝
  `);
  console.log('💡 To stop early: window.stopMassBlock()\n');

  if (CONFIG.usersToBlock.length === 0) {
    console.log('❌ No users to block! Edit CONFIG.usersToBlock and add usernames.');
    console.log('\nExample:');
    console.log('  usersToBlock: [');
    console.log('    "spammer1",');
    console.log('    "spammer2",');
    console.log('  ],');
    return;
  }

  console.log(`📋 Users to block: ${CONFIG.usersToBlock.length}`);
  CONFIG.usersToBlock.forEach((u, i) => {
    console.log(`   ${i + 1}. @${u}`);
  });
  console.log('');

  if (CONFIG.dryRun) {
    console.log('⚠️  DRY RUN MODE - Set CONFIG.dryRun = false to actually block\n');
    return;
  }

  const results = {
    blocked: [],
    failed: [],
    notFound: []
  };

  for (const username of CONFIG.usersToBlock) {
    if (stopped) {
      console.log('🛑 Stopped by user.');
      break;
    }
    console.log(`\n⏳ Processing @${username}...`);

    try {
      // Navigate to user's profile (SPA navigation keeps this script alive)
      const profileUrl = `https://x.com/${username}`;
      spaNavigate(profileUrl);
      await sleep(3000); // Wait for page load

      // Find the more button (poll briefly: profiles can render slowly)
      let moreButton = document.querySelector('[data-testid="userActions"]');
      let waited = 0;
      while (!moreButton && waited < 5000) {
        await sleep(500);
        waited += 500;
        moreButton = document.querySelector('[data-testid="userActions"]');
      }

      if (!moreButton) {
        console.log(`   ❌ Could not find user menu for @${username}`);
        results.notFound.push(username);
        continue;
      }

      moreButton.click();
      await sleep(500);

      // Find block option
      const blockOption = document.querySelector('[data-testid="block"]');
      
      if (!blockOption) {
        console.log(`   ❌ Block option not found for @${username}`);
        results.failed.push(username);
        document.body.click(); // Close menu
        continue;
      }

      blockOption.click();
      await sleep(500);

      // Confirm block
      const confirmBtn = document.querySelector('[data-testid="confirmationSheetConfirm"]');
      
      if (confirmBtn) {
        confirmBtn.click();
        console.log(`   ✅ Blocked @${username}`);
        results.blocked.push(username);
      } else {
        console.log(`   ❌ Could not confirm block for @${username}`);
        results.failed.push(username);
      }

      await sleep(CONFIG.blockDelay);

    } catch (error) {
      console.log(`   ❌ Error blocking @${username}: ${error.message}`);
      results.failed.push(username);
    }
  }

  console.log('\n' + '═'.repeat(60));
  console.log('📊 RESULTS');
  console.log('═'.repeat(60));
  console.log(`\n✅ Blocked: ${results.blocked.length}`);
  results.blocked.forEach(u => console.log(`   @${u}`));
  
  if (results.failed.length > 0) {
    console.log(`\n❌ Failed: ${results.failed.length}`);
    results.failed.forEach(u => console.log(`   @${u}`));
  }
  
  if (results.notFound.length > 0) {
    console.log(`\n❓ Not found: ${results.notFound.length}`);
    results.notFound.forEach(u => console.log(`   @${u}`));
  }

  // Save log
  const storageKey = 'xactions_mass_block_log';
  const log = {
    timestamp: new Date().toISOString(),
    ...results
  };
  const existing = JSON.parse(localStorage.getItem(storageKey) || '[]');
  existing.push(log);
  localStorage.setItem(storageKey, JSON.stringify(existing.slice(-50)));

  console.log('\n💾 Results saved to localStorage');

})();

});
  register("mass-unblock", function(){
var CONFIG = {
  // Unblock all blocked accounts (true) or just specific ones (false)
  unblockAll: true,
  
  // If unblockAll is false, specify usernames to unblock
  usersToUnblock: [
    // 'username1',
    // 'username2',
  ],
  
  // Delay between unblocks (ms)
  unblockDelay: 1500,
  
  // Max accounts to unblock per run
  maxUnblocks: 100,
  
  // Scroll settings
  scrollDelay: 1500,
  maxScrolls: 20,
  
  // Dry run mode
  dryRun: true
};
try{if(typeof window!=='undefined'&&window.__XA_LAUNCH_CFG){Object.assign(CONFIG,window.__XA_LAUNCH_CFG);}}catch(_xa){}


/**
 * ============================================================
 * 🚀 SCRIPT START
 * ============================================================
 */

(async function massUnblock() {
  const sleep = (ms) => new Promise(r => setTimeout(r, ms));

  // Stop switch: run window.stopMassUnblock() from the console to abort
  // after the account currently being processed.
  let stopped = false;
  window.stopMassUnblock = () => {
    stopped = true;
    console.log('🛑 Stop requested. Finishing the current account, then exiting.');
  };

  console.log(`
╔══════════════════════════════════════════════════════════════╗
║  ✅ XActions — Mass Unblock                                  ║
║  Unblock multiple users                                      ║
${CONFIG.dryRun ? '║  ⚠️  DRY RUN MODE - No accounts will be unblocked           ║' : '║  🔴 LIVE MODE - Accounts WILL be unblocked                  ║'}
╚══════════════════════════════════════════════════════════════╝
  `);
  console.log('💡 To stop early: window.stopMassUnblock()\n');

  // Check if on blocked accounts page
  if (!window.location.href.includes('/settings/blocked')) {
    console.error('❌ Please navigate to your blocked accounts page first!');
    console.log('👉 Go to: https://x.com/settings/blocked/all');
    return;
  }

  const $userCell = '[data-testid="UserCell"]';
  const $unblockBtn = '[data-testid$="-unblock"]';

  console.log('🔍 Scanning blocked accounts...\n');

  const blockedUsers = new Map();
  let scrollCount = 0;
  let retries = 0;

  while (scrollCount < CONFIG.maxScrolls && retries < 3) {
    const prevSize = blockedUsers.size;

    document.querySelectorAll($userCell).forEach(cell => {
      const link = cell.querySelector('a[href^="/"]');
      const username = link?.getAttribute('href')?.replace('/', '')?.split('/')[0];
      if (!username || blockedUsers.has(username)) return;

      const unblockBtn = cell.querySelector($unblockBtn);
      if (unblockBtn) {
        blockedUsers.set(username, { element: cell, button: unblockBtn });
      }
    });

    if (blockedUsers.size === prevSize) retries++;
    else retries = 0;

    console.log(`   Found ${blockedUsers.size} blocked accounts...`);

    window.scrollTo(0, document.body.scrollHeight);
    await sleep(CONFIG.scrollDelay);
    scrollCount++;
  }

  console.log(`\n✅ Found ${blockedUsers.size} blocked accounts\n`);

  if (blockedUsers.size === 0) {
    console.log('🎉 No blocked accounts found!');
    return;
  }

  // Determine which users to unblock
  let toUnblock = [];
  
  if (CONFIG.unblockAll) {
    toUnblock = Array.from(blockedUsers.entries()).slice(0, CONFIG.maxUnblocks);
    console.log(`📋 Will unblock ${toUnblock.length} accounts (all)`);
  } else {
    toUnblock = CONFIG.usersToUnblock
      .filter(u => blockedUsers.has(u))
      .map(u => [u, blockedUsers.get(u)]);
    console.log(`📋 Will unblock ${toUnblock.length} specified accounts`);
    
    const notFound = CONFIG.usersToUnblock.filter(u => !blockedUsers.has(u));
    if (notFound.length > 0) {
      console.log(`⚠️  Not found in blocked list: ${notFound.join(', ')}`);
    }
  }

  if (toUnblock.length === 0) {
    console.log('❌ No accounts to unblock!');
    return;
  }

  console.log('');
  toUnblock.slice(0, 20).forEach(([username], i) => {
    console.log(`   ${i + 1}. @${username}`);
  });
  if (toUnblock.length > 20) {
    console.log(`   ... and ${toUnblock.length - 20} more`);
  }

  if (CONFIG.dryRun) {
    console.log('\n' + '═'.repeat(60));
    console.log('⚠️  DRY RUN MODE - No unblocks performed');
    console.log('Set CONFIG.dryRun = false to actually unblock');
    console.log('═'.repeat(60));
    return;
  }

  console.log('\n' + '═'.repeat(60));
  console.log('🔄 UNBLOCKING ACCOUNTS');
  console.log('═'.repeat(60));

  let unblocked = 0;
  const unblockedUsers = [];

  // Unblocking a row on this page removes it from the (virtualized) list,
  // so cell/button references captured during the initial scan can go
  // stale after the first successful unblock. Re-resolve a live button for
  // the username before clicking, falling back to the cached reference.
  const findUnblockButton = (username) => {
    for (const cell of document.querySelectorAll($userCell)) {
      const link = cell.querySelector('a[href^="/"]');
      const cellUsername = link?.getAttribute('href')?.replace('/', '')?.split('/')[0];
      if (cellUsername === username) {
        return { element: cell, button: cell.querySelector($unblockBtn) };
      }
    }
    return null;
  };

  for (const [username, data] of toUnblock) {
    if (stopped) {
      console.log('🛑 Stopped by user.');
      break;
    }

    try {
      const live = findUnblockButton(username);
      const target = (live && live.button) ? live : data;

      if (!document.body.contains(target.button)) {
        console.log(`   ❌ @${username} is no longer in the list (already unblocked or off-screen). Skipping.`);
        continue;
      }

      target.element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      await sleep(300);

      target.button.click();
      await sleep(500);

      // Check for confirmation dialog
      const confirmBtn = document.querySelector('[data-testid="confirmationSheetConfirm"]');
      if (confirmBtn) {
        confirmBtn.click();
        await sleep(300);
      }

      unblocked++;
      unblockedUsers.push(username);
      console.log(`✅ Unblocked @${username}`);

      await sleep(CONFIG.unblockDelay);
    } catch (e) {
      console.log(`❌ Failed to unblock @${username}`);
    }
  }

  console.log('\n' + '═'.repeat(60));
  console.log(`✅ Unblocked ${unblocked}/${toUnblock.length} accounts`);
  console.log('═'.repeat(60));

  // Save log
  const storageKey = 'xactions_unblock_log';
  const log = {
    timestamp: new Date().toISOString(),
    // Record the accounts actually unblocked; slicing the candidate list
    // logs the wrong names whenever an unblock in the middle failed
    unblocked: unblockedUsers
  };
  const existing = JSON.parse(localStorage.getItem(storageKey) || '[]');
  existing.push(log);
  localStorage.setItem(storageKey, JSON.stringify(existing.slice(-50)));

  console.log('\n💾 Results saved to localStorage');

})();

});
  register("mass-unmute", function(){
var CONFIG = {
  // Unmute all muted accounts
  unmuteAll: true,
  
  // If unmuteAll is false, specify usernames to unmute
  usersToUnmute: [
    // 'username1',
    // 'username2',
  ],
  
  // Delay between unmutes (ms)
  unmuteDelay: 1000,
  
  // Max accounts to unmute per run
  maxUnmutes: 200,
  
  // Scroll settings
  scrollDelay: 1500,
  maxScrolls: 30,
  
  // Dry run mode
  dryRun: true
};
try{if(typeof window!=='undefined'&&window.__XA_LAUNCH_CFG){Object.assign(CONFIG,window.__XA_LAUNCH_CFG);}}catch(_xa){}


/**
 * ============================================================
 * 🚀 SCRIPT START
 * ============================================================
 */

(async function massUnmute() {
  const sleep = (ms) => new Promise(r => setTimeout(r, ms));

  // Stop switch: run window.stopMassUnmute() from the console to abort
  // after the account currently being processed.
  let stopped = false;
  window.stopMassUnmute = () => {
    stopped = true;
    console.log('🛑 Stop requested. Finishing the current account, then exiting.');
  };

  console.log(`
╔══════════════════════════════════════════════════════════════╗
║  🔊 XActions — Mass Unmute                                   ║
║  Unmute multiple users                                       ║
${CONFIG.dryRun ? '║  ⚠️  DRY RUN MODE - No accounts will be unmuted             ║' : '║  🔴 LIVE MODE - Accounts WILL be unmuted                    ║'}
╚══════════════════════════════════════════════════════════════╝
  `);
  console.log('💡 To stop early: window.stopMassUnmute()\n');

  // Check if on muted accounts page
  if (!window.location.href.includes('/settings/muted')) {
    console.error('❌ Please navigate to your muted accounts page first!');
    console.log('👉 Go to: https://x.com/settings/muted/all');
    return;
  }

  const $userCell = '[data-testid="UserCell"]';

  console.log('🔍 Scanning muted accounts...\n');

  const mutedUsers = new Map();
  let scrollCount = 0;
  let retries = 0;

  while (scrollCount < CONFIG.maxScrolls && retries < 3) {
    const prevSize = mutedUsers.size;

    document.querySelectorAll($userCell).forEach(cell => {
      const link = cell.querySelector('a[href^="/"]');
      const username = link?.getAttribute('href')?.replace('/', '')?.split('/')[0];
      if (!username || mutedUsers.has(username)) return;

      mutedUsers.set(username, { element: cell });
    });

    if (mutedUsers.size === prevSize) retries++;
    else retries = 0;

    console.log(`   Found ${mutedUsers.size} muted accounts...`);

    window.scrollTo(0, document.body.scrollHeight);
    await sleep(CONFIG.scrollDelay);
    scrollCount++;
  }

  console.log(`\n✅ Found ${mutedUsers.size} muted accounts\n`);

  if (mutedUsers.size === 0) {
    console.log('🎉 No muted accounts found!');
    return;
  }

  // Determine which users to unmute
  let toUnmute = [];
  
  if (CONFIG.unmuteAll) {
    toUnmute = Array.from(mutedUsers.entries()).slice(0, CONFIG.maxUnmutes);
    console.log(`📋 Will unmute ${toUnmute.length} accounts (all)`);
  } else {
    toUnmute = CONFIG.usersToUnmute
      .filter(u => mutedUsers.has(u))
      .map(u => [u, mutedUsers.get(u)]);
    console.log(`📋 Will unmute ${toUnmute.length} specified accounts`);
  }

  if (toUnmute.length === 0) {
    console.log('❌ No accounts to unmute!');
    return;
  }

  toUnmute.slice(0, 20).forEach(([username], i) => {
    console.log(`   ${i + 1}. @${username}`);
  });
  if (toUnmute.length > 20) {
    console.log(`   ... and ${toUnmute.length - 20} more`);
  }

  if (CONFIG.dryRun) {
    console.log('\n' + '═'.repeat(60));
    console.log('⚠️  DRY RUN MODE - No unmutes performed');
    console.log('Set CONFIG.dryRun = false to actually unmute');
    console.log('═'.repeat(60));
    return;
  }

  console.log('\n' + '═'.repeat(60));
  console.log('🔊 UNMUTING ACCOUNTS');
  console.log('═'.repeat(60));

  let unmuted = 0;
  const unmutedUsers = [];

  // Unmuting a row on this page removes it from the (virtualized) muted
  // list, so a cell reference captured during the initial scan can go stale
  // after the first successful unmute. Re-resolve the live cell for the
  // username before interacting with it, falling back to the cached one.
  const findUserCell = (username) => {
    for (const cell of document.querySelectorAll($userCell)) {
      const link = cell.querySelector('a[href^="/"]');
      const cellUsername = link?.getAttribute('href')?.replace('/', '')?.split('/')[0];
      if (cellUsername === username) return cell;
    }
    return null;
  };

  for (const [username, data] of toUnmute) {
    if (stopped) {
      console.log('🛑 Stopped by user.');
      break;
    }

    try {
      const element = findUserCell(username) || data.element;

      if (!document.body.contains(element)) {
        console.log(`❌ @${username} is no longer in the list (already unmuted or off-screen). Skipping.`);
        continue;
      }

      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      await sleep(300);

      // Find unmute button in the cell
      const unmuteBtn = element.querySelector('[data-testid$="-unmute"], button[aria-label*="Unmute"]');

      if (unmuteBtn) {
        unmuteBtn.click();
        await sleep(300);
        unmuted++;
        unmutedUsers.push(username);
        console.log(`✅ Unmuted @${username}`);
      } else {
        // Try via the more menu
        const moreBtn = element.querySelector('[data-testid="userActions"]');
        if (moreBtn) {
          moreBtn.click();
          await sleep(300);
          
          const unmuteOption = document.querySelector('[data-testid="unmute"]');
          if (unmuteOption) {
            unmuteOption.click();
            unmuted++;
            unmutedUsers.push(username);
            console.log(`✅ Unmuted @${username}`);
          }
          
          document.body.click(); // Close menu
        }
      }

      await sleep(CONFIG.unmuteDelay);
    } catch (e) {
      console.log(`❌ Failed to unmute @${username}`);
    }
  }

  console.log('\n' + '═'.repeat(60));
  console.log(`✅ Unmuted ${unmuted}/${toUnmute.length} accounts`);
  console.log('═'.repeat(60));

  // Save log
  const storageKey = 'xactions_unmute_log';
  const log = {
    timestamp: new Date().toISOString(),
    // Record the accounts actually unmuted; slicing the candidate list
    // logs the wrong names whenever an unmute in the middle failed
    unmuted: unmutedUsers
  };
  const existing = JSON.parse(localStorage.getItem(storageKey) || '[]');
  existing.push(log);
  localStorage.setItem(storageKey, JSON.stringify(existing.slice(-50)));

  console.log('\n💾 Results saved to localStorage');

})();

});
  register("monitor-account", function(){
var CONFIG = {
  // Delay between scrolls
  scrollDelay: 2000,
  
  // Maximum scroll attempts
  maxScrolls: 100,
  
  // Retry when no new users found
  maxRetries: 5,
  
  // Auto-download report
  autoDownload: true
};
try{if(typeof window!=='undefined'&&window.__XA_LAUNCH_CFG){Object.assign(CONFIG,window.__XA_LAUNCH_CFG);}}catch(_xa){}


/**
 * ============================================================
 * 🚀 SCRIPT START
 * ============================================================
 */

(async function monitorAccount() {
  const sleep = (ms) => new Promise(r => setTimeout(r, ms));
  
  const $userCell = '[data-testid="UserCell"]';
  
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║  👁️ MONITOR ACCOUNT                                        ║');
  console.log('║  by nichxbt - https://github.com/nirholas/XActions         ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log('');
  
  // Detect page type and user
  const url = window.location.href;
  const pathMatch = url.match(/x\.com\/([^\/]+)\/(followers|following)/);
  
  if (!pathMatch) {
    console.error('❌ ERROR: Must be on a followers or following page!');
    console.log('📍 Example: https://x.com/elonmusk/followers');
    return;
  }
  
  const username = pathMatch[1];
  const pageType = pathMatch[2]; // 'followers' or 'following'
  const storageKey = `xactions_monitor_${username}_${pageType}`;
  
  console.log(`👤 Monitoring: @${username}`);
  console.log(`📋 Page type: ${pageType}`);
  console.log('');
  console.log('🚀 Scraping current list...');
  
  /**
   * Extract username from user cell
   */
  function getUsername(cell) {
    const link = cell.querySelector('a[href^="/"]');
    if (link) {
      const href = link.getAttribute('href');
      return href ? href.replace('/', '').split('/')[0] : null;
    }
    return null;
  }
  
  function getDisplayName(cell) {
    const span = cell.querySelector('[dir="ltr"] span');
    return span ? span.textContent : null;
  }
  
  // Scrape users
  const currentUsers = new Map();
  let lastCount = 0;
  let retries = 0;
  let scrolls = 0;
  
  while (scrolls < CONFIG.maxScrolls && retries < CONFIG.maxRetries) {
    const cells = document.querySelectorAll($userCell);
    
    cells.forEach(cell => {
      const user = getUsername(cell);
      const name = getDisplayName(cell);
      if (user && !currentUsers.has(user)) {
        currentUsers.set(user, name || user);
      }
    });
    
    if (currentUsers.size === lastCount) {
      retries++;
    } else {
      retries = 0;
      lastCount = currentUsers.size;
    }
    
    console.log(`📊 Scraped ${currentUsers.size} accounts...`);
    
    window.scrollTo(0, document.body.scrollHeight);
    await sleep(CONFIG.scrollDelay);
    scrolls++;
  }
  
  console.log(`✅ Finished: ${currentUsers.size} accounts`);
  console.log('');
  
  // Load previous
  let previous = null;
  try {
    const saved = localStorage.getItem(storageKey);
    if (saved) previous = JSON.parse(saved);
  } catch (e) {}
  
  const timestamp = new Date().toISOString();
  
  // Save current
  const snapshot = {
    savedAt: timestamp,
    username,
    pageType,
    count: currentUsers.size,
    users: Object.fromEntries(currentUsers)
  };
  localStorage.setItem(storageKey, JSON.stringify(snapshot));
  console.log('💾 Snapshot saved');
  
  if (!previous) {
    console.log('');
    console.log('╔════════════════════════════════════════════════════════════╗');
    console.log('║  📸 FIRST SNAPSHOT SAVED!                                  ║');
    console.log('╚════════════════════════════════════════════════════════════╝');
    console.log(`📊 @${username}'s ${pageType}: ${currentUsers.size}`);
    console.log('');
    console.log('💡 Run again later to detect changes!');
    
    window.accountSnapshot = snapshot;
    return snapshot;
  }
  
  // Compare
  console.log('🔄 Comparing with previous snapshot...');
  console.log(`   Previous: ${previous.count} (${previous.savedAt})`);
  console.log(`   Current: ${currentUsers.size}`);
  console.log('');
  
  const prevSet = new Set(Object.keys(previous.users));
  const currSet = new Set(currentUsers.keys());
  
  // Removed
  const removed = [];
  prevSet.forEach(u => {
    if (!currSet.has(u)) {
      removed.push({ username: u, displayName: previous.users[u] });
    }
  });
  
  // Added
  const added = [];
  currSet.forEach(u => {
    if (!prevSet.has(u)) {
      added.push({ username: u, displayName: currentUsers.get(u) });
    }
  });
  
  // Results
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║  📊 CHANGES DETECTED                                       ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log('');
  
  if (removed.length > 0) {
    const label = pageType === 'followers' ? 'UNFOLLOWED' : 'STOPPED FOLLOWING';
    console.log(`🚫 ${label} (${removed.length}):`);
    removed.forEach((u, i) => {
      console.log(`   ${i + 1}. @${u.username}`);
    });
    console.log('');
  }
  
  if (added.length > 0) {
    const label = pageType === 'followers' ? 'NEW FOLLOWERS' : 'NOW FOLLOWING';
    console.log(`🆕 ${label} (${added.length}):`);
    added.forEach((u, i) => {
      console.log(`   ${i + 1}. @${u.username}`);
    });
    console.log('');
  }
  
  if (removed.length === 0 && added.length === 0) {
    console.log('✅ No changes detected!');
  }
  
  // Download report
  if (CONFIG.autoDownload && (removed.length > 0 || added.length > 0)) {
    let report = `ACCOUNT MONITOR REPORT\n`;
    report += `${'='.repeat(50)}\n`;
    report += `Account: @${username}\n`;
    report += `Type: ${pageType}\n`;
    report += `Generated: ${timestamp}\n`;
    report += `Previous: ${previous.count} (${previous.savedAt})\n`;
    report += `Current: ${currentUsers.size}\n`;
    report += `${'='.repeat(50)}\n\n`;
    
    if (removed.length > 0) {
      report += `REMOVED (${removed.length}):\n`;
      removed.forEach((u, i) => {
        report += `${i + 1}. @${u.username}\n`;
      });
      report += '\n';
    }
    
    if (added.length > 0) {
      report += `ADDED (${added.length}):\n`;
      added.forEach((u, i) => {
        report += `${i + 1}. @${u.username}\n`;
      });
    }
    
    const blob = new Blob([report], { type: 'text/plain' });
    const blobUrl = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = blobUrl;
    a.download = `${username}_${pageType}_changes_${timestamp.split('T')[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(blobUrl);

    console.log('💾 Report downloaded!');
  }
  
  const result = { username, pageType, removed, added, timestamp };
  window.accountChanges = result;
  console.log('💡 Access via: window.accountChanges');
  
  return result;
})();

});
  register("multi-account", function(){
var CONFIG = {
  // Storage key prefix
  storagePrefix: 'xactions_multi_',
  
  // Auto-detect current logged-in account
  autoDetect: true
};
try{if(typeof window!=='undefined'&&window.__XA_LAUNCH_CFG){Object.assign(CONFIG,window.__XA_LAUNCH_CFG);}}catch(_xa){}


/**
 * ============================================================
 * 🚀 SCRIPT START - by nichxbt
 * ============================================================
 */

(async function multiAccountManager() {
  const sleep = (ms) => new Promise(r => setTimeout(r, ms));
  
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║  👥 MULTI-ACCOUNT MANAGER                                  ║');
  console.log('║  by nichxbt - https://github.com/nirholas/XActions         ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log('');
  
  // Storage keys
  const KEYS = {
    accounts: CONFIG.storagePrefix + 'accounts',
    current: CONFIG.storagePrefix + 'current',
    stats: CONFIG.storagePrefix + 'stats',
    schedule: CONFIG.storagePrefix + 'schedule',
  };
  
  // Storage helpers
  const storage = {
    get: (key) => {
      try { return JSON.parse(localStorage.getItem(key) || 'null'); }
      catch { return null; }
    },
    set: (key, value) => {
      localStorage.setItem(key, JSON.stringify(value));
    }
  };
  
  // Get current username from page
  const getCurrentUsername = () => {
    const accountBtn = document.querySelector('[data-testid="SideNav_AccountSwitcher_Button"]');
    if (accountBtn) {
      // The button holds both the display name and the @handle; the first
      // span is the display name, so look for the span starting with "@"
      const spans = accountBtn.querySelectorAll('span');
      for (const span of spans) {
        const text = span.textContent.trim();
        if (text.startsWith('@')) {
          return text.slice(1).toLowerCase();
        }
      }
    }
    return null;
  };
  
  // Create XActions interface
  window.XActions = window.XActions || {};
  window.XActions.Accounts = {
    
    // Get all accounts
    getAll: () => storage.get(KEYS.accounts) || [],
    
    // Add account (just stores the username for tracking)
    add: (username, notes = '') => {
      const accounts = window.XActions.Accounts.getAll();
      const cleanUsername = username.replace('@', '').toLowerCase();
      
      if (accounts.find(a => a.username === cleanUsername)) {
        console.warn(`⚠️ Account @${cleanUsername} already exists.`);
        return false;
      }
      
      accounts.push({
        username: cleanUsername,
        notes,
        addedAt: Date.now(),
        lastUsed: null,
        status: 'active',
        stats: {
          follows: 0,
          unfollows: 0,
          likes: 0,
          tweets: 0,
        }
      });
      
      storage.set(KEYS.accounts, accounts);
      console.log(`✅ Added account @${cleanUsername}`);
      return true;
    },
    
    // Remove account
    remove: (username) => {
      let accounts = window.XActions.Accounts.getAll();
      const cleanUsername = username.replace('@', '').toLowerCase();
      const before = accounts.length;
      
      accounts = accounts.filter(a => a.username !== cleanUsername);
      
      if (accounts.length < before) {
        storage.set(KEYS.accounts, accounts);
        console.log(`✅ Removed account @${cleanUsername}`);
        return true;
      }
      
      console.warn(`⚠️ Account @${cleanUsername} not found.`);
      return false;
    },
    
    // Update account status
    setStatus: (username, status) => {
      const accounts = window.XActions.Accounts.getAll();
      const cleanUsername = username.replace('@', '').toLowerCase();
      const account = accounts.find(a => a.username === cleanUsername);
      
      if (account) {
        account.status = status;
        storage.set(KEYS.accounts, accounts);
        console.log(`✅ Updated @${cleanUsername} status to: ${status}`);
        return true;
      }
      
      console.warn(`⚠️ Account @${cleanUsername} not found.`);
      return false;
    },
    
    // Mark account as used
    markUsed: (username) => {
      const accounts = window.XActions.Accounts.getAll();
      const cleanUsername = username?.replace('@', '').toLowerCase();
      const account = accounts.find(a => a.username === cleanUsername);
      
      if (account) {
        account.lastUsed = Date.now();
        storage.set(KEYS.accounts, accounts);
        storage.set(KEYS.current, cleanUsername);
      }
    },
    
    // Get current account
    current: () => {
      const detected = getCurrentUsername();
      if (detected) {
        window.XActions.Accounts.markUsed(detected);
      }
      return detected || storage.get(KEYS.current);
    },
    
    // Get next account to use (for rotation)
    next: () => {
      const accounts = window.XActions.Accounts.getAll().filter(a => a.status === 'active');
      
      if (accounts.length === 0) {
        console.warn('⚠️ No active accounts available.');
        return null;
      }
      
      // Sort by lastUsed (null = never used = highest priority)
      accounts.sort((a, b) => {
        if (!a.lastUsed) return -1;
        if (!b.lastUsed) return 1;
        return a.lastUsed - b.lastUsed;
      });
      
      return accounts[0];
    },
    
    // Update stats for current account
    updateStats: (statType, increment = 1) => {
      const accounts = window.XActions.Accounts.getAll();
      const current = getCurrentUsername();
      const account = accounts.find(a => a.username === current);
      
      if (account && account.stats[statType] !== undefined) {
        account.stats[statType] += increment;
        storage.set(KEYS.accounts, accounts);
      }
    },
    
    // List all accounts
    list: () => {
      const accounts = window.XActions.Accounts.getAll();
      const current = getCurrentUsername();
      
      console.log('');
      console.log('═'.repeat(60));
      console.log('📋 ACCOUNT LIST');
      console.log('═'.repeat(60));
      
      if (accounts.length === 0) {
        console.log('No accounts added yet.');
        console.log('Use: XActions.Accounts.add("username")');
      } else {
        accounts.forEach((a, i) => {
          const lastUsed = a.lastUsed ? new Date(a.lastUsed).toLocaleString() : 'Never';
          const statusEmoji = {
            active: '✅',
            paused: '⏸️',
            limited: '⚠️',
            suspended: '🚫',
          }[a.status] || '❓';
          const isCurrent = a.username === current ? ' 👈 CURRENT' : '';
          
          console.log(`${i + 1}. ${statusEmoji} @${a.username}${isCurrent}`);
          console.log(`   Last used: ${lastUsed}`);
          console.log(`   Stats: ${a.stats.follows}F / ${a.stats.likes}L / ${a.stats.tweets}T`);
          if (a.notes) console.log(`   Notes: ${a.notes}`);
        });
      }
      console.log('═'.repeat(60));
      console.log('');
    },
    
    // Show stats for all accounts
    stats: () => {
      const accounts = window.XActions.Accounts.getAll();
      
      console.log('');
      console.log('📊 ACCOUNT STATISTICS:');
      console.log('');
      
      let totalFollows = 0;
      let totalLikes = 0;
      let totalTweets = 0;
      
      accounts.forEach(a => {
        console.log(`@${a.username}:`);
        console.log(`   Follows: ${a.stats.follows}, Likes: ${a.stats.likes}, Tweets: ${a.stats.tweets}`);
        totalFollows += a.stats.follows;
        totalLikes += a.stats.likes;
        totalTweets += a.stats.tweets;
      });
      
      console.log('');
      console.log(`📈 TOTALS: ${totalFollows} follows, ${totalLikes} likes, ${totalTweets} tweets`);
      console.log('');
    },
    
    // Switch account (opens account switcher)
    switch: () => {
      const switcherBtn = document.querySelector('[data-testid="SideNav_AccountSwitcher_Button"]');
      if (switcherBtn) {
        switcherBtn.click();
        console.log('📋 Account switcher opened. Select an account.');
      } else {
        console.error('❌ Account switcher not found. Make sure you\'re on X.com');
      }
    },
    
    // Clear all account data
    clear: () => {
      if (confirm('⚠️ This will delete ALL saved account data. Continue?')) {
        localStorage.removeItem(KEYS.accounts);
        localStorage.removeItem(KEYS.current);
        localStorage.removeItem(KEYS.stats);
        console.log('✅ All account data cleared.');
      }
    },
    
    // Export accounts (without sensitive data)
    export: () => {
      const accounts = window.XActions.Accounts.getAll().map(a => ({
        username: a.username,
        notes: a.notes,
        status: a.status,
        stats: a.stats,
      }));
      
      const json = JSON.stringify(accounts, null, 2);
      console.log('📋 Account data (copy this):');
      console.log(json);

      // Also copy to clipboard (only claim success when the write succeeds)
      if (navigator.clipboard) {
        navigator.clipboard.writeText(json)
          .then(() => console.log('✅ Copied to clipboard!'))
          .catch(() => console.warn('⚠️ Clipboard copy failed. Copy the JSON above manually.'));
      }
    },
    
    // Import accounts
    import: (jsonString) => {
      try {
        const imported = JSON.parse(jsonString);
        const accounts = window.XActions.Accounts.getAll();
        
        imported.forEach(a => {
          if (!accounts.find(existing => existing.username === a.username)) {
            accounts.push({
              ...a,
              addedAt: Date.now(),
              lastUsed: null,
            });
          }
        });
        
        storage.set(KEYS.accounts, accounts);
        console.log(`✅ Imported ${imported.length} accounts.`);
      } catch (e) {
        console.error('❌ Invalid JSON format:', e.message);
      }
    },
    
    // Help
    help: () => {
      console.log('');
      console.log('📋 MULTI-ACCOUNT COMMANDS:');
      console.log('');
      console.log('   XActions.Accounts.add("username")  - Add account');
      console.log('   XActions.Accounts.remove("user")   - Remove account');
      console.log('   XActions.Accounts.list()           - List all accounts');
      console.log('   XActions.Accounts.current()        - Get current account');
      console.log('   XActions.Accounts.next()           - Get next in rotation');
      console.log('   XActions.Accounts.switch()         - Open account switcher');
      console.log('   XActions.Accounts.stats()          - Show all stats');
      console.log('   XActions.Accounts.setStatus("u","s") - Set status');
      console.log('   XActions.Accounts.export()         - Export account list');
      console.log('   XActions.Accounts.import(json)     - Import accounts');
      console.log('   XActions.Accounts.clear()          - Clear all data');
      console.log('');
      console.log('📊 STATUS VALUES: active, paused, limited, suspended');
      console.log('');
    }
  };
  
  // Auto-detect current account
  if (CONFIG.autoDetect) {
    const current = getCurrentUsername();
    if (current) {
      const accounts = window.XActions.Accounts.getAll();
      if (!accounts.find(a => a.username === current)) {
        console.log(`🔍 Detected current account: @${current}`);
        console.log('   Run XActions.Accounts.add("' + current + '") to track it.');
      } else {
        window.XActions.Accounts.markUsed(current);
        console.log(`👤 Current account: @${current}`);
      }
    }
  }
  
  console.log('✅ Multi-Account Manager loaded!');
  console.log('   Run XActions.Accounts.help() for commands.');
  console.log('');
})();

});
  register("mute-by-keywords", function(){
var CONFIG = {
  // Keywords to look for in bio (case-insensitive)
  muteKeywords: [
    'crypto',
    'nft',
    'giveaway',
    'trading signals',
    'dm for promo'
  ],
  
  // Scroll settings
  scrollDelay: 1500,
  maxScrolls: 30,
  maxRetries: 3,
  
  // Delay between mutes
  muteDelay: 2000,
  
  // Dry run mode
  dryRun: true,
  
  // Max accounts to mute per run
  maxMutes: 50
};
try{if(typeof window!=='undefined'&&window.__XA_LAUNCH_CFG){Object.assign(CONFIG,window.__XA_LAUNCH_CFG);}}catch(_xa){}


/**
 * ============================================================
 * 🚀 SCRIPT START
 * ============================================================
 */

(async function muteByKeywords() {
  const sleep = (ms) => new Promise(r => setTimeout(r, ms));

  // Stop switch: run window.stopMuteByKeywords() from the console to abort
  // after the account currently being processed.
  let stopped = false;
  window.stopMuteByKeywords = () => {
    stopped = true;
    console.log('🛑 Stop requested. Finishing the current account, then exiting.');
  };

  console.log(`
╔══════════════════════════════════════════════════════════════╗
║  🔇 XActions — Mute By Keywords                              ║
║  Mute users with specific bio keywords                       ║
${CONFIG.dryRun ? '║  ⚠️  DRY RUN MODE - No accounts will be muted               ║' : '║  🔴 LIVE MODE - Accounts WILL be muted                      ║'}
╚══════════════════════════════════════════════════════════════╝
  `);
  console.log('💡 To stop early: window.stopMuteByKeywords()\n');

  if (!window.location.pathname.includes('/followers') && !window.location.pathname.includes('/following')) {
    console.error('❌ Please navigate to a followers or following page first!');
    return;
  }

  console.log('🔍 Looking for users with these keywords:');
  CONFIG.muteKeywords.forEach(kw => console.log(`   • ${kw}`));
  console.log('');

  const $userCell = '[data-testid="UserCell"]';
  const scanned = new Set();
  const matches = [];
  let retries = 0;
  let scrollCount = 0;

  while (!stopped && scrollCount < CONFIG.maxScrolls && retries < CONFIG.maxRetries) {
    const prevSize = scanned.size;

    document.querySelectorAll($userCell).forEach(cell => {
      const link = cell.querySelector('a[href^="/"]');
      const username = link?.getAttribute('href')?.replace('/', '')?.split('/')[0];
      if (!username || scanned.has(username)) return;
      
      scanned.add(username);

      const bioEl = cell.querySelector('[data-testid="UserDescription"]');
      const bio = (bioEl?.textContent || '').toLowerCase();

      const matchedKeywords = CONFIG.muteKeywords.filter(kw => 
        bio.includes(kw.toLowerCase())
      );

      if (matchedKeywords.length > 0) {
        matches.push({
          username,
          bio: bioEl?.textContent || '',
          keywords: matchedKeywords,
          element: cell
        });
      }
    });

    if (scanned.size === prevSize) retries++;
    else retries = 0;

    console.log(`   Scanned: ${scanned.size} | Matches: ${matches.length}`);

    window.scrollTo(0, document.body.scrollHeight);
    await sleep(CONFIG.scrollDelay);
    scrollCount++;
  }

  console.log(`\n✅ Scan complete!`);
  console.log(`   Total scanned: ${scanned.size}`);
  console.log(`   Matching users: ${matches.length}\n`);

  if (matches.length === 0) {
    console.log('🎉 No users found with those keywords!');
    return;
  }

  console.log('═'.repeat(60));
  console.log('🎯 USERS WITH MATCHING KEYWORDS');
  console.log('═'.repeat(60));

  matches.forEach((m, i) => {
    console.log(`\n${i + 1}. @${m.username}`);
    console.log(`   Keywords: ${m.keywords.join(', ')}`);
    console.log(`   Bio: "${m.bio.slice(0, 100)}${m.bio.length > 100 ? '...' : ''}"`);
  });

  if (CONFIG.dryRun) {
    console.log('\n' + '═'.repeat(60));
    console.log('⚠️  DRY RUN MODE - No mutes performed');
    console.log('Set CONFIG.dryRun = false to actually mute');
    console.log('═'.repeat(60));
  } else {
    console.log('\n' + '═'.repeat(60));
    console.log('🔇 MUTING MATCHING USERS');
    console.log('═'.repeat(60));

    let muted = 0;
    const toMute = matches.slice(0, CONFIG.maxMutes);

    for (const user of toMute) {
      if (stopped) {
        console.log('🛑 Stopped by user.');
        break;
      }

      try {
        user.element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        await sleep(500);

        const moreButton = user.element.querySelector('[data-testid="userActions"]');
        if (moreButton) {
          moreButton.click();
          await sleep(500);

          // Look for mute option
          const muteOption = document.querySelector('[data-testid="mute"]');
          if (muteOption) {
            muteOption.click();
            muted++;
            console.log(`✅ Muted @${user.username}`);
          } else {
            console.log(`⚠️  Mute option not found for @${user.username}`);
          }

          // Close menu
          document.body.click();
        }

        await sleep(CONFIG.muteDelay);
      } catch (e) {
        console.log(`❌ Failed to mute @${user.username}`);
      }
    }

    console.log(`\n✅ Muted ${muted}/${toMute.length} accounts`);
  }

  // Save log
  const storageKey = 'xactions_keyword_mutes';
  const log = matches.map(m => ({
    username: m.username,
    keywords: m.keywords,
    timestamp: new Date().toISOString()
  }));
  localStorage.setItem(storageKey, JSON.stringify(log));

  console.log('\n💾 Results saved to localStorage');

})();

});
  register("new-followers-alert", function(){
var CONFIG = {
  // Scroll settings
  scrollDelay: 2000,
  maxScrolls: 100,
  maxRetries: 5,
  
  // Welcome message templates (customize these!)
  welcomeMessages: [
    "Hey {name}! Thanks for the follow! 🙏 Glad to connect!",
    "Welcome {name}! 👋 Thanks for following! What brings you here?",
    "Hey {name}! Appreciate the follow! Looking forward to connecting! 🚀",
    "Thanks for following {name}! Always great to meet new people! ✨"
  ],
  
  // Auto-download new followers list
  autoDownload: true
};
try{if(typeof window!=='undefined'&&window.__XA_LAUNCH_CFG){Object.assign(CONFIG,window.__XA_LAUNCH_CFG);}}catch(_xa){}


/**
 * ============================================================
 * 🚀 SCRIPT START
 * ============================================================
 */

(async function newFollowersAlert() {
  const sleep = (ms) => new Promise(r => setTimeout(r, ms));
  
  const $userCell = '[data-testid="UserCell"]';
  const STORAGE_KEY = 'xactions_followers_snapshot';
  
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║  🆕 NEW FOLLOWERS ALERT                                    ║');
  console.log('║  by nichxbt - https://github.com/nirholas/XActions         ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log('');
  
  // Verify page
  if (!window.location.href.includes('/followers')) {
    console.error('❌ ERROR: Must be on your Followers page!');
    console.log('📍 Go to: https://x.com/YOUR_USERNAME/followers');
    return;
  }
  
  console.log('🚀 Scanning followers...');
  console.log('');
  
  /**
   * Get user info from cell
   */
  function getUserInfo(cell) {
    const link = cell.querySelector('a[href^="/"]');
    const username = link ? link.getAttribute('href')?.replace('/', '').split('/')[0] : null;
    
    const nameSpan = cell.querySelector('[dir="ltr"] span');
    const displayName = nameSpan ? nameSpan.textContent : username;
    
    return { username, displayName };
  }
  
  // Scrape followers
  const followers = new Map(); // username -> displayName
  let lastCount = 0;
  let retries = 0;
  let scrolls = 0;
  
  while (scrolls < CONFIG.maxScrolls && retries < CONFIG.maxRetries) {
    document.querySelectorAll($userCell).forEach(cell => {
      const { username, displayName } = getUserInfo(cell);
      if (username && !followers.has(username)) {
        followers.set(username, displayName);
      }
    });
    
    if (followers.size === lastCount) {
      retries++;
    } else {
      retries = 0;
      lastCount = followers.size;
    }
    
    console.log(`📊 Found ${followers.size} followers...`);
    
    window.scrollTo(0, document.body.scrollHeight);
    await sleep(CONFIG.scrollDelay);
    scrolls++;
  }
  
  console.log(`✅ Total followers: ${followers.size}`);
  console.log('');
  
  // Load previous snapshot
  let previous = null;
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) previous = JSON.parse(saved);
  } catch (e) {}
  
  const timestamp = new Date().toISOString();
  
  // Save current
  const snapshot = {
    savedAt: timestamp,
    count: followers.size,
    followers: Object.fromEntries(followers)
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
  
  if (!previous) {
    console.log('╔════════════════════════════════════════════════════════════╗');
    console.log('║  📸 FIRST SNAPSHOT SAVED!                                  ║');
    console.log('╚════════════════════════════════════════════════════════════╝');
    console.log(`📊 ${followers.size} followers saved`);
    console.log('');
    console.log('💡 Run again later to see new followers!');
    return;
  }
  
  // Find new followers
  const prevSet = new Set(Object.keys(previous.followers));
  const newFollowers = [];
  const unfollowers = [];
  
  followers.forEach((displayName, username) => {
    if (!prevSet.has(username)) {
      newFollowers.push({ username, displayName });
    }
  });
  
  prevSet.forEach(username => {
    if (!followers.has(username)) {
      unfollowers.push({ username, displayName: previous.followers[username] });
    }
  });
  
  // Display results
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║  📊 FOLLOWER CHANGES                                       ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log(`📅 Since: ${previous.savedAt}`);
  console.log(`📈 Previous: ${previous.count} → Current: ${followers.size}`);
  console.log('');
  
  if (newFollowers.length > 0) {
    console.log(`🆕 NEW FOLLOWERS (${newFollowers.length}):`);
    console.log('');
    
    newFollowers.forEach((f, i) => {
      console.log(`   ${i + 1}. ${f.displayName} (@${f.username})`);
      console.log(`      🔗 https://x.com/${f.username}`);
      
      // Generate welcome message
      const template = CONFIG.welcomeMessages[i % CONFIG.welcomeMessages.length];
      const message = template.replace('{name}', f.displayName.split(' ')[0]);
      console.log(`      💬 "${message}"`);
      console.log('');
    });
  } else {
    console.log('📭 No new followers since last check.');
    console.log('');
  }
  
  if (unfollowers.length > 0) {
    console.log(`🚫 UNFOLLOWED (${unfollowers.length}):`);
    unfollowers.forEach((f, i) => {
      console.log(`   ${i + 1}. ${f.displayName} (@${f.username})`);
    });
    console.log('');
  }
  
  // Download report
  if (CONFIG.autoDownload && newFollowers.length > 0) {
    let report = `NEW FOLLOWERS REPORT\n`;
    report += `${'='.repeat(50)}\n`;
    report += `Generated: ${timestamp}\n`;
    report += `Since: ${previous.savedAt}\n`;
    report += `New followers: ${newFollowers.length}\n`;
    report += `${'='.repeat(50)}\n\n`;
    
    report += `NEW FOLLOWERS:\n`;
    report += `${'-'.repeat(30)}\n\n`;
    
    newFollowers.forEach((f, i) => {
      report += `${i + 1}. ${f.displayName} (@${f.username})\n`;
      report += `   Profile: https://x.com/${f.username}\n`;
      
      const template = CONFIG.welcomeMessages[i % CONFIG.welcomeMessages.length];
      const message = template.replace('{name}', f.displayName.split(' ')[0]);
      report += `   Welcome Message: ${message}\n`;
      report += '\n';
    });
    
    if (unfollowers.length > 0) {
      report += `\nUNFOLLOWERS (${unfollowers.length}):\n`;
      report += `${'-'.repeat(30)}\n`;
      unfollowers.forEach((f, i) => {
        report += `${i + 1}. ${f.displayName} (@${f.username})\n`;
      });
    }
    
    const blob = new Blob([report], { type: 'text/plain' });
    const blobUrl = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = blobUrl;
    a.download = `new_followers_${timestamp.split('T')[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(blobUrl);

    console.log('💾 Report downloaded!');
  }
  
  // Copy welcome messages for easy pasting
  if (newFollowers.length > 0) {
    const messages = newFollowers.map((f, i) => {
      const template = CONFIG.welcomeMessages[i % CONFIG.welcomeMessages.length];
      return `@${f.username}: ${template.replace('{name}', f.displayName.split(' ')[0])}`;
    }).join('\n\n');
    
    try {
      await navigator.clipboard.writeText(messages);
      console.log('📋 Welcome messages copied to clipboard!');
    } catch (e) {}
  }
  
  const result = { timestamp, newFollowers, unfollowers };
  window.newFollowersResult = result;
  console.log('');
  console.log('💡 Access via: window.newFollowersResult');
  
  return result;
})();

});
  register("profile-stats", function(){
(async function profileStats() {
  const sleep = (ms) => new Promise(r => setTimeout(r, ms));

  console.log(`
╔══════════════════════════════════════════════════════════════╗
║  📊 XActions — Profile Stats                                 ║
║  Get comprehensive profile statistics                        ║
╚══════════════════════════════════════════════════════════════╝
  `);

  const parseCount = (str) => {
    if (!str) return 0;
    str = str.replace(/,/g, '').trim();
    const match = str.match(/([\d.]+)([KMB])?/i);
    if (match) {
      let num = parseFloat(match[1]);
      const multipliers = { 'K': 1000, 'M': 1000000, 'B': 1000000000 };
      if (match[2]) num *= multipliers[match[2].toUpperCase()];
      return Math.round(num);
    }
    return 0;
  };

  const formatNum = (n) => {
    if (n >= 1000000) return (n / 1000000).toFixed(2) + 'M';
    if (n >= 1000) return (n / 1000).toFixed(2) + 'K';
    return n.toString();
  };

  const username = window.location.pathname.match(/^\/([^\/]+)/)?.[1];
  if (!username || ['home', 'explore', 'notifications', 'messages', 'i'].includes(username)) {
    console.error('❌ Please navigate to a profile page first!');
    return;
  }

  console.log(`📊 Gathering stats for @${username}...\n`);

  // Gather profile information
  const stats = {
    username,
    timestamp: new Date().toISOString(),
    displayName: '',
    bio: '',
    location: '',
    website: '',
    joinDate: '',
    followers: 0,
    following: 0,
    verified: false,
    profileImage: '',
    bannerImage: ''
  };

  // Display name
  const nameEl = document.querySelector('[data-testid="UserName"]');
  if (nameEl) {
    const nameParts = nameEl.textContent.split('@');
    stats.displayName = nameParts[0].trim();
  }

  // Bio
  const bioEl = document.querySelector('[data-testid="UserDescription"]');
  stats.bio = bioEl?.textContent || '';

  // Location
  const locationEl = document.querySelector('[data-testid="UserLocation"]');
  stats.location = locationEl?.textContent || '';

  // Website
  const urlEl = document.querySelector('[data-testid="UserUrl"]');
  stats.website = urlEl?.getAttribute('href') || urlEl?.querySelector('a')?.getAttribute('href') || urlEl?.textContent || '';

  // Join date
  const joinEl = document.querySelector('[data-testid="UserJoinDate"]');
  stats.joinDate = joinEl?.textContent || '';

  // Followers/Following
  document.querySelectorAll('a').forEach(link => {
    const href = link.getAttribute('href') || '';
    const text = link.textContent || '';
    
    if (href.includes('/followers') || href.includes('/verified_followers')) {
      const match = text.match(/([\d,.]+[KMB]?)/);
      if (match) stats.followers = parseCount(match[1]);
    }
    if (href.endsWith('/following')) {
      const match = text.match(/([\d,.]+[KMB]?)/);
      if (match) stats.following = parseCount(match[1]);
    }
  });

  // Verified status
  const verifiedBadge = document.querySelector('[data-testid="UserName"] svg[aria-label*="Verified"], [data-testid="UserName"] svg[aria-label*="verified"]');
  stats.verified = verifiedBadge !== null;

  // Profile image
  const profileImg = document.querySelector('a[href$="/photo"] img');
  stats.profileImage = profileImg?.src || '';
  stats.hasDefaultAvatar = stats.profileImage.includes('default_profile');

  // Banner image
  const bannerImg = document.querySelector('a[href$="/header_photo"] img');
  stats.bannerImage = bannerImg?.src || '';
  stats.hasBanner = !!stats.bannerImage;

  // Calculate derived stats
  stats.ratio = stats.following > 0 ? (stats.followers / stats.following).toFixed(2) : 'N/A';

  // Account age (approximate)
  if (stats.joinDate) {
    const joinMatch = stats.joinDate.match(/Joined\s+(\w+)\s+(\d{4})/);
    if (joinMatch) {
      const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
      const monthIndex = monthNames.findIndex(m => m.startsWith(joinMatch[1]));
      if (monthIndex >= 0) {
        const joinDate = new Date(parseInt(joinMatch[2]), monthIndex, 1);
        const now = new Date();
        const years = (now - joinDate) / (1000 * 60 * 60 * 24 * 365);
        stats.accountAgeYears = years.toFixed(1);
      }
    }
  }

  // Output
  console.log('═'.repeat(60));
  console.log(`📊 PROFILE STATISTICS: @${username}`);
  console.log('═'.repeat(60));

  console.log('\n👤 BASIC INFO:');
  console.log('─'.repeat(50));
  console.log(`   Display Name: ${stats.displayName}`);
  console.log(`   Username:     @${stats.username}`);
  console.log(`   Verified:     ${stats.verified ? '✅ Yes' : '❌ No'}`);
  
  if (stats.bio) {
    console.log(`\n   Bio:`);
    stats.bio.split('\n').forEach(line => {
      console.log(`   "${line}"`);
    });
  }

  if (stats.location) console.log(`\n   📍 Location: ${stats.location}`);
  if (stats.website) console.log(`   🔗 Website:  ${stats.website}`);
  if (stats.joinDate) console.log(`   📅 ${stats.joinDate}`);
  if (stats.accountAgeYears) console.log(`   ⏰ Account Age: ${stats.accountAgeYears} years`);

  console.log('\n📊 METRICS:');
  console.log('─'.repeat(50));
  console.log(`   Followers:  ${formatNum(stats.followers)}`);
  console.log(`   Following:  ${formatNum(stats.following)}`);
  console.log(`   Ratio:      ${stats.ratio} (followers/following)`);

  // Quality indicators
  console.log('\n🔍 PROFILE QUALITY INDICATORS:');
  console.log('─'.repeat(50));
  
  const indicators = [];
  
  if (stats.verified) indicators.push('✅ Verified account');
  else indicators.push('⬜ Not verified');
  
  if (!stats.hasDefaultAvatar) indicators.push('✅ Custom profile picture');
  else indicators.push('⚠️  Default profile picture');
  
  if (stats.hasBanner) indicators.push('✅ Has banner image');
  else indicators.push('⬜ No banner image');
  
  if (stats.bio && stats.bio.length > 50) indicators.push('✅ Detailed bio');
  else if (stats.bio) indicators.push('⚠️  Short bio');
  else indicators.push('❌ No bio');
  
  if (stats.website) indicators.push('✅ Has website link');
  else indicators.push('⬜ No website');
  
  if (stats.location) indicators.push('✅ Location set');
  else indicators.push('⬜ No location');

  const ratio = parseFloat(stats.ratio) || 0;
  if (ratio > 1) indicators.push(`✅ Good follower ratio (${ratio})`);
  else if (ratio > 0.5) indicators.push(`⚠️  Low follower ratio (${ratio})`);
  else if (ratio > 0) indicators.push(`❌ Very low ratio (${ratio})`);

  if (stats.accountAgeYears > 2) indicators.push(`✅ Established account (${stats.accountAgeYears} years)`);
  else if (stats.accountAgeYears > 0.5) indicators.push(`⬜ Newer account (${stats.accountAgeYears} years)`);
  else if (stats.accountAgeYears) indicators.push(`⚠️  Very new account (${stats.accountAgeYears} years)`);

  indicators.forEach(ind => console.log(`   ${ind}`));

  // Score calculation
  let score = 0;
  if (stats.verified) score += 20;
  if (!stats.hasDefaultAvatar) score += 15;
  if (stats.hasBanner) score += 10;
  if (stats.bio && stats.bio.length > 50) score += 15;
  else if (stats.bio) score += 5;
  if (stats.website) score += 10;
  if (stats.location) score += 5;
  if (ratio > 1) score += 15;
  else if (ratio > 0.5) score += 5;
  if (stats.accountAgeYears > 2) score += 10;
  else if (stats.accountAgeYears > 0.5) score += 5;

  console.log('\n📈 PROFILE COMPLETENESS SCORE:');
  console.log('─'.repeat(50));
  const scoreBar = '█'.repeat(Math.round(score / 5)) + '░'.repeat(20 - Math.round(score / 5));
  console.log(`   [${scoreBar}] ${score}/100`);

  if (score >= 80) console.log('   🏆 Excellent profile!');
  else if (score >= 60) console.log('   👍 Good profile');
  else if (score >= 40) console.log('   ⚠️  Profile needs improvement');
  else console.log('   ❌ Incomplete profile');

  // Bio analysis
  if (stats.bio) {
    console.log('\n📝 BIO ANALYSIS:');
    console.log('─'.repeat(50));
    console.log(`   Length: ${stats.bio.length} characters`);
    
    // Check for keywords
    const bioLower = stats.bio.toLowerCase();
    const keywords = {
      'crypto': ['crypto', 'bitcoin', 'btc', 'eth', 'nft', 'defi', 'web3', 'blockchain'],
      'tech': ['developer', 'engineer', 'programmer', 'coder', 'tech', 'ai', 'software'],
      'marketing': ['marketing', 'growth', 'seo', 'social media', 'brand'],
      'creator': ['creator', 'content', 'youtuber', 'podcaster', 'writer'],
      'business': ['founder', 'ceo', 'entrepreneur', 'startup', 'investor']
    };
    
    const foundCategories = [];
    Object.entries(keywords).forEach(([category, words]) => {
      if (words.some(w => bioLower.includes(w))) {
        foundCategories.push(category);
      }
    });
    
    if (foundCategories.length > 0) {
      console.log(`   Categories: ${foundCategories.join(', ')}`);
    }

    // Links in bio
    const links = stats.bio.match(/https?:\/\/\S+/g) || [];
    if (links.length > 0) {
      console.log(`   Links found: ${links.length}`);
    }

    // Hashtags in bio
    const hashtags = stats.bio.match(/#\w+/g) || [];
    if (hashtags.length > 0) {
      console.log(`   Hashtags: ${hashtags.join(' ')}`);
    }
  }

  // Save to localStorage
  const storageKey = `xactions_profile_${username}`;
  const history = JSON.parse(localStorage.getItem(storageKey) || '[]');
  history.push(stats);
  // Keep last 30 snapshots
  const trimmedHistory = history.slice(-30);
  localStorage.setItem(storageKey, JSON.stringify(trimmedHistory));

  // Show historical comparison if available
  if (history.length > 1) {
    const oldest = history[0];
    const followerChange = stats.followers - oldest.followers;
    const daysDiff = (new Date(stats.timestamp) - new Date(oldest.timestamp)) / (1000 * 60 * 60 * 24);
    
    if (daysDiff > 0) {
      console.log('\n📈 HISTORICAL COMPARISON:');
      console.log('─'.repeat(50));
      console.log(`   Tracking since: ${new Date(oldest.timestamp).toLocaleDateString()}`);
      console.log(`   Follower change: ${followerChange >= 0 ? '+' : ''}${formatNum(followerChange)}`);
      console.log(`   Daily average: ${(followerChange / daysDiff).toFixed(1)} followers/day`);
    }
  }

  console.log('\n' + '═'.repeat(60));
  console.log(`💾 Snapshot saved (${trimmedHistory.length} total)`);
  console.log(`📥 Export: copy(localStorage.getItem("${storageKey}"))`);
  console.log('═'.repeat(60) + '\n');

  // Return stats object for programmatic use
  return stats;

})();

});
  register("protect-active-users", function(){
var CONFIG = {
  // Number of your recent posts to scan
  postsToScan: 10,
  
  // Which engagement types to track
  engagementTypes: {
    likers: true,
    repliers: true,
    retweeters: true,
    quoters: false // Requires navigating to quote tweets
  },
  
  // Only protect users who engaged within this many days
  lookbackDays: 30,
  
  // Minimum engagements to be protected
  minEngagements: 1,
  
  // Scroll delay when loading lists
  scrollDelay: 1500,
  
  // Max scrolls per engagement list
  maxScrollsPerList: 10
};
try{if(typeof window!=='undefined'&&window.__XA_LAUNCH_CFG){Object.assign(CONFIG,window.__XA_LAUNCH_CFG);}}catch(_xa){}


/**
 * ============================================================
 * 🚀 SCRIPT START
 * ============================================================
 */

(async function protectActiveUsers() {
  const sleep = (ms) => new Promise(r => setTimeout(r, ms));

  // Navigate within the SPA. Assigning window.location.href triggers a full
  // page load, which destroys this console script before the first scan.
  const spaNavigate = (url) => {
    try {
      const target = new URL(url, window.location.href);
      if (target.origin === window.location.origin) {
        window.history.pushState({}, '', target.href);
        window.dispatchEvent(new PopStateEvent('popstate', { state: {} }));
        return;
      }
    } catch (e) {}
    window.location.href = url;
  };
  
  const $tweet = 'article[data-testid="tweet"]';
  const $userCell = '[data-testid="UserCell"]';
  
  const STORAGE_KEY = 'xactions_protected_users';
  
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║  🛡️ PROTECT ACTIVE USERS                                   ║');
  console.log('║  by nichxbt - https://github.com/nirholas/XActions         ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log('');
  
  // Get username from URL
  const pathMatch = window.location.pathname.match(/^\/([^\/]+)/);
  const myUsername = pathMatch ? pathMatch[1] : null;
  
  if (!myUsername || ['home', 'explore', 'search'].includes(myUsername)) {
    console.error('❌ ERROR: Must be on YOUR profile page!');
    console.log('📍 Go to: https://x.com/YOUR_USERNAME');
    return;
  }
  
  console.log(`👤 Scanning posts from: @${myUsername}`);
  console.log(`📊 Posts to scan: ${CONFIG.postsToScan}`);
  console.log('');
  
  // Engagement tracking
  const engagementMap = new Map(); // username -> { count, types, tweets }
  
  /**
   * Get username from user cell
   */
  function getUsername(cell) {
    const link = cell.querySelector('a[href^="/"]');
    return link ? link.getAttribute('href').replace('/', '').split('/')[0] : null;
  }
  
  /**
   * Scrape users from current page (likes/retweets list)
   */
  async function scrapeUsers(type) {
    const users = new Set();
    let scrolls = 0;
    
    while (scrolls < CONFIG.maxScrollsPerList) {
      document.querySelectorAll($userCell).forEach(cell => {
        const username = getUsername(cell);
        if (username && username !== myUsername) {
          users.add(username);
        }
      });
      
      window.scrollTo(0, document.body.scrollHeight);
      await sleep(CONFIG.scrollDelay);
      scrolls++;
    }
    
    return [...users];
  }
  
  /**
   * Add engagement for users
   */
  function addEngagement(users, type, tweetUrl) {
    users.forEach(username => {
      if (!engagementMap.has(username)) {
        engagementMap.set(username, {
          count: 0,
          types: new Set(),
          tweets: []
        });
      }
      
      const data = engagementMap.get(username);
      data.count++;
      data.types.add(type);
      if (!data.tweets.includes(tweetUrl)) {
        data.tweets.push(tweetUrl);
      }
    });
  }
  
  // Get my recent tweets
  console.log('🔍 Finding your recent posts...');
  console.log('');
  
  const myTweets = [];
  const seenTweets = new Set();
  let scrolls = 0;
  
  while (myTweets.length < CONFIG.postsToScan && scrolls < 20) {
    document.querySelectorAll($tweet).forEach(tweet => {
      // Check if it's my tweet
      const authorLink = tweet.querySelector('a[href^="/"][role="link"]');
      const author = authorLink ? authorLink.getAttribute('href').replace('/', '').split('/')[0].toLowerCase() : null;
      
      if (author !== myUsername.toLowerCase()) return;
      
      // Get tweet ID. Prefer the permalink around the timestamp: the first
      // /status/ link can belong to a quoted tweet.
      const timeAnchor = tweet.querySelector('time')?.closest('a[href*="/status/"]');
      const tweetLink = timeAnchor || tweet.querySelector('a[href*="/status/"]');
      if (!tweetLink) return;

      const match = tweetLink.href.match(/\/status\/(\d+)/);
      if (!match || seenTweets.has(match[1])) return;

      // Check if it's a retweet: reposts render socialContext inside an <a>;
      // pinned posts don't. Structural check works on any UI language.
      const socialContext = tweet.querySelector('[data-testid="socialContext"]');
      const isRetweet = !!socialContext && socialContext.closest('a') !== null;
      if (isRetweet) return;
      
      seenTweets.add(match[1]);
      myTweets.push({
        id: match[1],
        url: `https://x.com/${myUsername}/status/${match[1]}`
      });
    });
    
    window.scrollTo(0, document.body.scrollHeight);
    await sleep(1000);
    scrolls++;
  }
  
  console.log(`📊 Found ${myTweets.length} of your posts`);
  console.log('');
  
  // Scan each tweet for engagers
  for (let i = 0; i < Math.min(myTweets.length, CONFIG.postsToScan); i++) {
    const tweet = myTweets[i];
    console.log(`🔍 Scanning post ${i + 1}/${CONFIG.postsToScan}: ${tweet.url}`);
    
    // Navigate to tweet (SPA navigation keeps this script alive)
    spaNavigate(tweet.url);
    await sleep(2000);
    
    // Get likers
    if (CONFIG.engagementTypes.likers) {
      const likesLink = document.querySelector('a[href$="/likes"]');
      if (likesLink) {
        likesLink.click();
        await sleep(1500);
        
        const likers = await scrapeUsers('like');
        addEngagement(likers, 'like', tweet.url);
        console.log(`   ❤️ Found ${likers.length} likers`);
        
        window.history.back();
        await sleep(1000);
      }
    }
    
    // Get retweeters
    if (CONFIG.engagementTypes.retweeters) {
      const retweetsLink = document.querySelector('a[href$="/retweets"]');
      if (retweetsLink) {
        retweetsLink.click();
        await sleep(1500);
        
        const retweeters = await scrapeUsers('retweet');
        addEngagement(retweeters, 'retweet', tweet.url);
        console.log(`   🔄 Found ${retweeters.length} retweeters`);
        
        window.history.back();
        await sleep(1000);
      }
    }
    
    // Get repliers (from the tweet page itself)
    if (CONFIG.engagementTypes.repliers) {
      const repliers = new Set();
      document.querySelectorAll($tweet).forEach(replyTweet => {
        const authorLink = replyTweet.querySelector('a[href^="/"][role="link"]');
        const author = authorLink ? authorLink.getAttribute('href').replace('/', '').split('/')[0] : null;
        if (author && author.toLowerCase() !== myUsername.toLowerCase()) {
          repliers.add(author);
        }
      });
      
      addEngagement([...repliers], 'reply', tweet.url);
      console.log(`   💬 Found ${repliers.size} repliers`);
    }
  }
  
  // Filter by minimum engagements
  const protectedUsers = [];
  engagementMap.forEach((data, username) => {
    if (data.count >= CONFIG.minEngagements) {
      protectedUsers.push({
        username,
        engagementCount: data.count,
        engagementTypes: [...data.types],
        tweets: data.tweets
      });
    }
  });
  
  // Sort by engagement count
  protectedUsers.sort((a, b) => b.engagementCount - a.engagementCount);
  
  // Save to localStorage
  const result = {
    savedAt: new Date().toISOString(),
    myUsername,
    postsScanned: Math.min(myTweets.length, CONFIG.postsToScan),
    totalProtected: protectedUsers.length,
    users: protectedUsers
  };
  
  localStorage.setItem(STORAGE_KEY, JSON.stringify(result));
  
  console.log('');
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║  ✅ PROTECTION LIST SAVED!                                 ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log(`🛡️ Protected users: ${protectedUsers.length}`);
  console.log('');
  
  console.log('🏆 TOP ENGAGED USERS:');
  protectedUsers.slice(0, 10).forEach((u, i) => {
    console.log(`   ${i + 1}. @${u.username} (${u.engagementCount} engagements: ${u.engagementTypes.join(', ')})`);
  });
  
  console.log('');
  console.log('💡 smart-unfollow.js will respect this list!');
  console.log('💡 Access via: window.protectedUsers');
  
  window.protectedUsers = result;
  
  return result;
})();

});
  register("rate-limiter", function(){
(function rateLimiter() {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║  ⏱️ RATE LIMITER                                           ║');
  console.log('║  by nichxbt - https://github.com/nirholas/XActions         ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log('');
  
  const STORAGE_KEY = 'xactions_ratelimit';
  
  // Default rate limits (conservative/safe)
  const defaultLimits = {
    follow: {
      perHour: 20,
      perDay: 100,
      cooldownMs: 2000,  // Minimum ms between actions
    },
    unfollow: {
      perHour: 20,
      perDay: 100,
      cooldownMs: 2000,
    },
    like: {
      perHour: 50,
      perDay: 200,
      cooldownMs: 1000,
    },
    retweet: {
      perHour: 25,
      perDay: 100,
      cooldownMs: 2000,
    },
    tweet: {
      perHour: 10,
      perDay: 50,
      cooldownMs: 5000,
    },
    reply: {
      perHour: 20,
      perDay: 100,
      cooldownMs: 3000,
    },
    dm: {
      perHour: 10,
      perDay: 50,
      cooldownMs: 30000, // 30 seconds for DMs
    },
    search: {
      perHour: 30,
      perDay: 200,
      cooldownMs: 2000,
    }
  };
  
  // Storage helpers
  const getData = () => {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      return data ? JSON.parse(data) : { actions: {}, limits: defaultLimits };
    } catch {
      return { actions: {}, limits: defaultLimits };
    }
  };
  
  const saveData = (data) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  };
  
  // Get actions in time window
  const getActionsInWindow = (actionType, windowMs) => {
    const data = getData();
    const actions = data.actions[actionType] || [];
    const cutoff = Date.now() - windowMs;
    return actions.filter(ts => ts > cutoff);
  };
  
  // Record an action
  const recordAction = (actionType) => {
    const data = getData();
    if (!data.actions[actionType]) {
      data.actions[actionType] = [];
    }
    data.actions[actionType].push(Date.now());
    
    // Clean old entries (older than 24 hours)
    const oneDayAgo = Date.now() - (24 * 60 * 60 * 1000);
    data.actions[actionType] = data.actions[actionType].filter(ts => ts > oneDayAgo);
    
    saveData(data);
  };
  
  // Check if action is allowed
  const canPerformAction = (actionType) => {
    const data = getData();
    const limits = data.limits[actionType] || defaultLimits[actionType];
    
    if (!limits) {
      return { allowed: true };
    }
    
    const hourAgo = 60 * 60 * 1000;
    const dayAgo = 24 * 60 * 60 * 1000;
    
    const actionsLastHour = getActionsInWindow(actionType, hourAgo);
    const actionsLastDay = getActionsInWindow(actionType, dayAgo);
    
    if (actionsLastHour.length >= limits.perHour) {
      const oldestInHour = Math.min(...actionsLastHour);
      const waitMs = hourAgo - (Date.now() - oldestInHour);
      return {
        allowed: false,
        reason: 'hourly limit',
        waitMs,
        current: actionsLastHour.length,
        limit: limits.perHour
      };
    }
    
    if (actionsLastDay.length >= limits.perDay) {
      const oldestInDay = Math.min(...actionsLastDay);
      const waitMs = dayAgo - (Date.now() - oldestInDay);
      return {
        allowed: false,
        reason: 'daily limit',
        waitMs,
        current: actionsLastDay.length,
        limit: limits.perDay
      };
    }
    
    // Check cooldown
    const lastAction = actionsLastHour[actionsLastHour.length - 1];
    if (lastAction) {
      const timeSinceLast = Date.now() - lastAction;
      if (timeSinceLast < limits.cooldownMs) {
        return {
          allowed: false,
          reason: 'cooldown',
          waitMs: limits.cooldownMs - timeSinceLast
        };
      }
    }
    
    return { allowed: true };
  };
  
  // Wait for rate limit
  const waitForRateLimit = async (actionType) => {
    const check = canPerformAction(actionType);
    if (check.allowed) return true;
    
    console.log(`⏳ Rate limited (${check.reason}). Waiting ${Math.ceil(check.waitMs / 1000)}s...`);
    await new Promise(r => setTimeout(r, check.waitMs + 100));
    return true;
  };
  
  // Create XActions interface
  window.XActions = window.XActions || {};
  window.XActions.RateLimit = {
    
    // Check if action is allowed
    check: canPerformAction,
    
    // Record an action
    record: recordAction,
    
    // Wait for rate limit to clear
    wait: waitForRateLimit,
    
    // Perform action with rate limiting
    perform: async (actionType, actionFn) => {
      const check = canPerformAction(actionType);
      
      if (!check.allowed) {
        console.log(`⏳ Rate limited: ${actionType} (${check.reason})`);
        await waitForRateLimit(actionType);
      }
      
      const result = await actionFn();
      recordAction(actionType);
      return result;
    },
    
    // Get current quotas
    quotas: () => {
      const data = getData();
      const hourAgo = 60 * 60 * 1000;
      const dayAgo = 24 * 60 * 60 * 1000;
      
      console.log('');
      console.log('═'.repeat(50));
      console.log('📊 CURRENT QUOTAS');
      console.log('═'.repeat(50));
      
      Object.keys(data.limits).forEach(actionType => {
        const limits = data.limits[actionType];
        const hourlyCount = getActionsInWindow(actionType, hourAgo).length;
        const dailyCount = getActionsInWindow(actionType, dayAgo).length;
        
        const hourPct = Math.round((hourlyCount / limits.perHour) * 100);
        const dayPct = Math.round((dailyCount / limits.perDay) * 100);
        
        console.log(`${actionType}:`);
        console.log(`   Hour: ${hourlyCount}/${limits.perHour} (${hourPct}%)`);
        console.log(`   Day:  ${dailyCount}/${limits.perDay} (${dayPct}%)`);
      });
      
      console.log('═'.repeat(50));
      console.log('');
    },
    
    // Get remaining quota
    remaining: (actionType) => {
      const data = getData();
      const limits = data.limits[actionType] || defaultLimits[actionType];
      
      if (!limits) return { hourly: Infinity, daily: Infinity };
      
      const hourAgo = 60 * 60 * 1000;
      const dayAgo = 24 * 60 * 60 * 1000;
      
      const hourlyCount = getActionsInWindow(actionType, hourAgo).length;
      const dailyCount = getActionsInWindow(actionType, dayAgo).length;
      
      return {
        hourly: Math.max(0, limits.perHour - hourlyCount),
        daily: Math.max(0, limits.perDay - dailyCount)
      };
    },
    
    // Set custom limits
    setLimits: (actionType, limits) => {
      const data = getData();
      data.limits[actionType] = { ...data.limits[actionType], ...limits };
      saveData(data);
      console.log(`✅ Updated limits for ${actionType}:`, limits);
    },
    
    // Get current limits
    getLimits: (actionType) => {
      const data = getData();
      return data.limits[actionType] || defaultLimits[actionType];
    },
    
    // Presets
    presets: {
      // Very conservative
      safe: () => {
        const data = getData();
        data.limits = {
          ...defaultLimits,
          follow: { perHour: 10, perDay: 50, cooldownMs: 5000 },
          unfollow: { perHour: 10, perDay: 50, cooldownMs: 5000 },
          like: { perHour: 25, perDay: 100, cooldownMs: 2000 },
        };
        saveData(data);
        console.log('✅ Applied SAFE preset (very conservative)');
      },
      
      // Default/moderate
      moderate: () => {
        const data = getData();
        data.limits = { ...defaultLimits };
        saveData(data);
        console.log('✅ Applied MODERATE preset (default)');
      },
      
      // Aggressive (use with caution!)
      aggressive: () => {
        const data = getData();
        data.limits = {
          ...defaultLimits,
          follow: { perHour: 40, perDay: 200, cooldownMs: 1000 },
          unfollow: { perHour: 40, perDay: 200, cooldownMs: 1000 },
          like: { perHour: 100, perDay: 400, cooldownMs: 500 },
        };
        saveData(data);
        console.log('⚠️ Applied AGGRESSIVE preset (use with caution!)');
      }
    },
    
    // Reset all tracking
    reset: () => {
      if (confirm('⚠️ Reset all action tracking?')) {
        const data = getData();
        data.actions = {};
        saveData(data);
        console.log('✅ Action tracking reset.');
      }
    },
    
    // Reset to default limits
    resetLimits: () => {
      if (confirm('⚠️ Reset to default limits?')) {
        const data = getData();
        data.limits = { ...defaultLimits };
        saveData(data);
        console.log('✅ Limits reset to defaults.');
      }
    },
    
    // Time until next action allowed
    nextAllowed: (actionType) => {
      const check = canPerformAction(actionType);
      if (check.allowed) {
        console.log(`✅ ${actionType} is allowed now.`);
        return 0;
      }
      
      const seconds = Math.ceil(check.waitMs / 1000);
      console.log(`⏳ ${actionType} allowed in ${seconds}s (${check.reason})`);
      return check.waitMs;
    },
    
    // Help
    help: () => {
      console.log('');
      console.log('📋 RATE LIMITER COMMANDS:');
      console.log('');
      console.log('   XActions.RateLimit.check("follow")');
      console.log('   XActions.RateLimit.record("follow")');
      console.log('   XActions.RateLimit.wait("follow")');
      console.log('   XActions.RateLimit.perform("follow", fn)');
      console.log('   XActions.RateLimit.quotas()');
      console.log('   XActions.RateLimit.remaining("follow")');
      console.log('   XActions.RateLimit.nextAllowed("follow")');
      console.log('   XActions.RateLimit.setLimits("follow", {perHour: 30})');
      console.log('   XActions.RateLimit.getLimits("follow")');
      console.log('');
      console.log('📦 PRESETS:');
      console.log('   XActions.RateLimit.presets.safe()');
      console.log('   XActions.RateLimit.presets.moderate()');
      console.log('   XActions.RateLimit.presets.aggressive()');
      console.log('');
      console.log('🔄 RESET:');
      console.log('   XActions.RateLimit.reset()');
      console.log('   XActions.RateLimit.resetLimits()');
      console.log('');
      console.log('📊 ACTION TYPES:');
      console.log('   follow, unfollow, like, retweet, tweet, reply, dm, search');
      console.log('');
    }
  };
  
  console.log('⏱️ Rate Limiter loaded!');
  console.log('   Run XActions.RateLimit.quotas() to see usage.');
  console.log('   Run XActions.RateLimit.help() for commands.');
  console.log('');
})();

});
  register("report-spam", function(){
var CONFIG = {
  // Spam detection keywords in bio
  spamKeywords: [
    'free giveaway',
    'click my link',
    'dm for cashapp',
    'send nudes',
    'sexchat',
    'hot girls in',
    'make $1000 daily',
    'guaranteed profits'
  ],
  
  // Flag accounts with these patterns
  detection: {
    // Default profile picture
    flagDefaultAvatar: true,
    
    // Account following way more than followers
    maxFollowingRatio: 100,
    
    // Very new accounts
    flagNewAccounts: true, // Can't easily detect from list view
    
    // Bio contains external links
    flagExternalLinks: false
  },
  
  // Scroll settings
  scrollDelay: 1500,
  maxScrolls: 20,
  
  // Dry run - just identify, don't report
  dryRun: true,
  
  // Max to report per run
  maxReports: 10,
  
  // Delay between reports
  reportDelay: 5000
};
try{if(typeof window!=='undefined'&&window.__XA_LAUNCH_CFG){Object.assign(CONFIG,window.__XA_LAUNCH_CFG);}}catch(_xa){}


/**
 * ============================================================
 * 🚀 SCRIPT START
 * ============================================================
 */

(async function reportSpam() {
  const sleep = (ms) => new Promise(r => setTimeout(r, ms));

  console.log(`
╔══════════════════════════════════════════════════════════════╗
║  🚨 XActions — Report Spam                                   ║
║  Identify and report spam accounts                           ║
${CONFIG.dryRun ? '║  ⚠️  DRY RUN MODE - Accounts will NOT be reported           ║' : '║  🔴 LIVE MODE - Accounts WILL be reported                   ║'}
╚══════════════════════════════════════════════════════════════╝
  `);

  console.log('⚠️  IMPORTANT: Only report genuine spam/abuse!');
  console.log('   False reports can result in action against YOUR account.\n');

  const $userCell = '[data-testid="UserCell"]';

  console.log('🔍 Looking for spam indicators:');
  CONFIG.spamKeywords.forEach(kw => console.log(`   • "${kw}"`));
  console.log('');

  const scanned = new Set();
  const spamAccounts = [];
  let retries = 0;
  let scrollCount = 0;

  while (scrollCount < CONFIG.maxScrolls && retries < 3) {
    const prevSize = scanned.size;

    document.querySelectorAll($userCell).forEach(cell => {
      try {
        const link = cell.querySelector('a[href^="/"]');
        const username = link?.getAttribute('href')?.replace('/', '')?.split('/')[0];
        if (!username || scanned.has(username)) return;

        scanned.add(username);

        const reasons = [];
        let spamScore = 0;

        // Check bio
        const bioEl = cell.querySelector('[data-testid="UserDescription"]');
        const bio = (bioEl?.textContent || '').toLowerCase();

        CONFIG.spamKeywords.forEach(kw => {
          if (bio.includes(kw.toLowerCase())) {
            spamScore += 30;
            reasons.push(`Bio: "${kw}"`);
          }
        });

        // Check for default avatar
        if (CONFIG.detection.flagDefaultAvatar) {
          const avatar = cell.querySelector('img[src*="default_profile"]');
          if (avatar) {
            spamScore += 10;
            reasons.push('Default avatar');
          }
        }

        // Check for external links in bio
        if (CONFIG.detection.flagExternalLinks && bio.match(/https?:\/\//)) {
          spamScore += 5;
          reasons.push('External link in bio');
        }

        if (spamScore >= 30) {
          spamAccounts.push({
            username,
            bio: bioEl?.textContent || '',
            spamScore,
            reasons,
            element: cell
          });
        }
      } catch (e) {
        // One malformed cell (missing link, unexpected structure) must never
        // abort the whole scan for every other cell in this pass.
      }
    });

    if (scanned.size === prevSize) retries++;
    else retries = 0;

    console.log(`   Scanned: ${scanned.size} | Spam found: ${spamAccounts.length}`);

    window.scrollTo(0, document.body.scrollHeight);
    await sleep(CONFIG.scrollDelay);
    scrollCount++;
  }

  console.log(`\n✅ Scan complete!`);
  console.log(`   Total scanned: ${scanned.size}`);
  console.log(`   Spam accounts: ${spamAccounts.length}\n`);

  if (spamAccounts.length === 0) {
    console.log('🎉 No spam accounts detected!');
    return;
  }

  // Sort by spam score
  spamAccounts.sort((a, b) => b.spamScore - a.spamScore);

  console.log('═'.repeat(60));
  console.log('🚨 DETECTED SPAM ACCOUNTS');
  console.log('═'.repeat(60));

  spamAccounts.forEach((s, i) => {
    console.log(`\n${i + 1}. @${s.username} (Score: ${s.spamScore})`);
    console.log(`   Reasons: ${s.reasons.join(', ')}`);
    console.log(`   Bio: "${s.bio.slice(0, 80)}${s.bio.length > 80 ? '...' : ''}"`);
    console.log(`   https://x.com/${s.username}`);
  });

  if (CONFIG.dryRun) {
    console.log('\n' + '═'.repeat(60));
    console.log('⚠️  DRY RUN MODE');
    console.log('═'.repeat(60));
    console.log('\nTo report these accounts:');
    console.log('1. Review each account manually');
    console.log('2. Only report if they genuinely violate Twitter rules');
    console.log('3. Set CONFIG.dryRun = false to enable reporting');
    console.log('\nOr report manually by visiting each profile.');
  } else {
    console.log('\n' + '═'.repeat(60));
    console.log('🚨 REPORTING ACCOUNTS');
    console.log('═'.repeat(60));
    console.log('\n⚠️  Reporting is a serious action. Please review carefully!\n');

    const toReport = spamAccounts.slice(0, CONFIG.maxReports);
    let reported = 0;

    for (const spam of toReport) {
      console.log(`\n⏳ Processing @${spam.username}...`);

      // The page kept scrolling during the scan above, and X virtualizes
      // long lists: a cell captured early can already be detached from the
      // DOM by the time we get here. Interacting with a detached node is a
      // silent no-op, so skip it explicitly instead of pretending to report.
      if (!document.body.contains(spam.element)) {
        console.log(`   ⚠️ Skipped @${spam.username}: row scrolled out of the DOM. Re-run closer to this account.`);
        continue;
      }

      try {
        spam.element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        await sleep(500);

        const moreButton = spam.element.querySelector('[data-testid="userActions"]');
        if (moreButton) {
          moreButton.click();
          await sleep(500);

          // Find report option
          const reportOption = document.querySelector('[data-testid="report"]');
          if (reportOption) {
            reportOption.click();
            await sleep(1000);

            // Select "Spam" as reason. Match only short, clickable labels
            // (radio/menu items) so a longer descriptive paragraph that
            // happens to also contain the word "spam" isn't clicked instead.
            const spamOption = Array.from(document.querySelectorAll('span'))
              .find(el => {
                const text = el.textContent.trim().toLowerCase();
                if (!text.includes('spam') || text.length > 40) return false;
                return !!el.closest('[role="radio"], [role="menuitem"], [role="button"], label');
              });

            if (spamOption) {
              spamOption.click();
              await sleep(500);

              // Submit report
              const submitBtn = document.querySelector('[data-testid="ChoiceSelectionNextButton"]');
              if (submitBtn) {
                submitBtn.click();
                reported++;
                console.log(`   ✅ Reported @${spam.username}`);
              }
            }

            // Close dialog
            const closeBtn = document.querySelector('[data-testid="app-bar-close"]');
            if (closeBtn) closeBtn.click();
          }

          // Close menu
          document.body.click();
        }

        await sleep(CONFIG.reportDelay);
      } catch (e) {
        console.log(`   ❌ Failed to report @${spam.username}: ${e.message}`);
      }
    }

    console.log(`\n✅ Reported ${reported} accounts`);
  }

  // Save log
  const storageKey = 'xactions_spam_reports';
  const log = spamAccounts.map(s => ({
    username: s.username,
    spamScore: s.spamScore,
    reasons: s.reasons,
    timestamp: new Date().toISOString()
  }));
  localStorage.setItem(storageKey, JSON.stringify(log));

  console.log('\n💾 Results saved to localStorage');

})();

});
  register("scrape-profile-posts", function(){
var CONFIG = {
  
  // ==========================================
  // 📊 SCRAPING SETTINGS
  // ==========================================
  
  // Number of tweets to scrape (max)
  // 💡 Set to a higher number for more tweets, but it takes longer
  targetCount: 300,
  
  // Maximum scroll attempts before giving up
  // 💡 Increase if the profile has lots of media (slower loading)
  maxScrollAttempts: 300,
  
  // Delay between scrolls (milliseconds)
  // 💡 Increase to 3000-30000 if tweets aren't loading properly
  scrollDelay: 2000,
  
  // ==========================================
  // 🔍 FILTERING OPTIONS
  // ==========================================
  // Use these to only keep tweets matching your criteria
  
  filters: {
    
    // ---- KEYWORD WHITELIST ----
    // Only include tweets containing AT LEAST ONE of these words
    // 💡 Leave empty [] to include all tweets
    // 💡 Example: ['crypto', 'bitcoin', 'eth'] - keeps tweets with any of these words
    // 💡 Case-insensitive (matches 'Bitcoin', 'BITCOIN', 'bitcoin')
    whitelist: [],
    
    // ---- KEYWORD BLACKLIST ----
    // Exclude tweets containing ANY of these words
    // 💡 Leave empty [] to not exclude anything
    // 💡 Example: ['giveaway', 'spam', 'ad'] - removes tweets with these words
    // 💡 Case-insensitive
    blacklist: [],
    
    // ---- DATE RANGE ----
    // Only include tweets from the last X days
    // 💡 Set to 0 to include all tweets (no date filter)
    // 💡 Example: 7 = last week, 30 = last month, 365 = last year
    daysBack: 0,
    
    // ---- MINIMUM ENGAGEMENT ----
    // Only include tweets with at least this many likes
    // 💡 Set to 0 to include all tweets regardless of engagement
    // 💡 Example: 10 = only tweets with 10+ likes
    minLikes: 0,
    
    // Only include tweets with at least this many retweets
    // 💡 Set to 0 to include all
    minRetweets: 0,
    
    // ---- CONTENT TYPE FILTERS ----
    // Set to true to EXCLUDE these types of content
    
    // Exclude retweets (posts this user reposted from others)
    // 💡 Set to true to only see original content
    excludeRetweets: false,
    
    // Exclude replies (tweets that are responses to others)
    // 💡 Set to true to only see top-level posts
    excludeReplies: false,
    
    // ---- MEDIA FILTERS ----
    // Filter by media content
    // 💡 Options: 'all' | 'with-media' | 'without-media'
    // 💡 'all' = include everything
    // 💡 'with-media' = only tweets with images/videos
    // 💡 'without-media' = only text-only tweets
    mediaFilter: 'all'
  },
  
  // ==========================================
  // 📤 EXPORT FORMAT SETTINGS
  // ==========================================
  // Choose which formats to export. Set to true/false for each.
  
  export: {
    
    // ---- JSON FORMAT ----
    // Full data with all fields, good for programming/analysis
    // 💡 Best for: Importing into other tools, APIs, databases
    json: true,
    
    // ---- CSV FORMAT ----
    // Spreadsheet-compatible format
    // 💡 Best for: Opening in Excel, Google Sheets, data analysis
    // 💡 Opens directly in spreadsheet apps
    csv: true,
    
    // ---- MARKDOWN FORMAT ----
    // Formatted text with headers and lists
    // 💡 Best for: Documentation, Notion, Obsidian, note-taking apps
    markdown: false,
    
    // ---- PLAIN TEXT FORMAT ----
    // Simple readable text, one tweet per block
    // 💡 Best for: Reading, sharing, simple archives
    text: false,
    
    // ---- HTML TABLE ----
    // Styled HTML table you can embed in websites
    // 💡 Best for: Reports, presentations, embedding in web pages
    html: false
  },
  
  // ==========================================
  // 📊 DISPLAY & ANALYTICS
  // ==========================================
  
  display: {
    
    // Show summary statistics (total engagement, averages, etc.)
    // 💡 Displays: total likes/retweets, averages, top hashtags
    showStats: true,
    
    // Show top performing tweets (sorted by engagement)
    // 💡 Set to 0 to disable, or 5-10 to show top posts
    showTopPosts: 5,
    
    // Show extracted hashtags from all tweets
    // 💡 Useful to see trending topics for this profile
    showHashtags: true,
    
    // Show all @mentions found in tweets
    // 💡 Useful to see who this profile interacts with
    showMentions: true,
    
    // Show all URLs/links shared
    // 💡 Useful to see what resources they share
    showLinks: false,
    
    // Pretty print tweets in console (formatted text view)
    // 💡 Makes it easy to read tweets directly in console
    prettyPrint: true,
    
    // Number of tweets to pretty print (set lower to reduce console spam)
    prettyPrintLimit: 10
  },
  
  // ==========================================
  // 🔧 GENERAL SETTINGS
  // ==========================================
  
  // Copy results to clipboard when complete
  // 💡 Copies the primary export format (JSON by default)
  copyToClipboard: true,
  
  // Show verbose progress messages
  // 💡 Set to false for cleaner output
  verbose: true
};
try{if(typeof window!=='undefined'&&window.__XA_LAUNCH_CFG){Object.assign(CONFIG,window.__XA_LAUNCH_CFG);}}catch(_xa){}


/**
 * ============================================================
 * 🚀 SCRIPT START - DO NOT MODIFY BELOW UNLESS YOU KNOW WHAT YOU'RE DOING
 * ============================================================
 */

(async function scrapeTweets() {
  const tweets = [];
  const seenIds = new Set();
  const startTime = Date.now();
  
  // Get profile name from URL
  const profileMatch = window.location.pathname.match(/^\/([^\/]+)/);
  const profileName = profileMatch ? profileMatch[1] : 'unknown';
  
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║  🐦 Twitter/X Profile Posts Scraper (Advanced)             ║');
  console.log('║  by nichxbt - https://github.com/nirholas/XActions         ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log('');
  console.log(`🎯 Target Profile: @${profileName}`);
  console.log(`📊 Target Count: ${CONFIG.targetCount} tweets`);
  
  // Display active filters
  const activeFilters = [];
  if (CONFIG.filters.whitelist.length > 0) activeFilters.push(`Whitelist: ${CONFIG.filters.whitelist.join(', ')}`);
  if (CONFIG.filters.blacklist.length > 0) activeFilters.push(`Blacklist: ${CONFIG.filters.blacklist.join(', ')}`);
  if (CONFIG.filters.daysBack > 0) activeFilters.push(`Last ${CONFIG.filters.daysBack} days`);
  if (CONFIG.filters.minLikes > 0) activeFilters.push(`Min ${CONFIG.filters.minLikes} likes`);
  if (CONFIG.filters.minRetweets > 0) activeFilters.push(`Min ${CONFIG.filters.minRetweets} RTs`);
  if (CONFIG.filters.excludeRetweets) activeFilters.push('No retweets');
  if (CONFIG.filters.excludeReplies) activeFilters.push('No replies');
  if (CONFIG.filters.mediaFilter !== 'all') activeFilters.push(`Media: ${CONFIG.filters.mediaFilter}`);
  
  if (activeFilters.length > 0) {
    console.log('🔍 Active Filters:');
    activeFilters.forEach(f => console.log(`   • ${f}`));
  }
  
  console.log('');
  console.log('🚀 Starting to scrape tweets...');
  console.log('📜 Auto-scrolling to load more tweets...');
  console.log('');
  
  // ==========================================
  // HELPER FUNCTIONS
  // ==========================================
  
  /**
   * Parse engagement numbers (handles K, M suffixes)
   */
  function parseEngagement(str) {
    if (!str || str === '') return 0;
    str = str.trim().toUpperCase();
    if (str.includes('K')) return parseFloat(str) * 1000;
    if (str.includes('M')) return parseFloat(str) * 1000000;
    if (str.includes('B')) return parseFloat(str) * 1000000000;
    return parseInt(str.replace(/,/g, '')) || 0;
  }
  
  /**
   * Check if tweet passes all filters
   */
  function passesFilters(tweet) {
    const text = tweet.text.toLowerCase();
    
    // Whitelist check
    if (CONFIG.filters.whitelist.length > 0) {
      const hasWhitelistedWord = CONFIG.filters.whitelist.some(word => 
        text.includes(word.toLowerCase())
      );
      if (!hasWhitelistedWord) return false;
    }
    
    // Blacklist check
    if (CONFIG.filters.blacklist.length > 0) {
      const hasBlacklistedWord = CONFIG.filters.blacklist.some(word => 
        text.includes(word.toLowerCase())
      );
      if (hasBlacklistedWord) return false;
    }
    
    // Date range check
    if (CONFIG.filters.daysBack > 0 && tweet.timestamp) {
      const tweetDate = new Date(tweet.timestamp);
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - CONFIG.filters.daysBack);
      if (tweetDate < cutoffDate) return false;
    }
    
    // Engagement checks
    const likes = parseEngagement(tweet.metrics.likes);
    const retweets = parseEngagement(tweet.metrics.retweets);
    if (likes < CONFIG.filters.minLikes) return false;
    if (retweets < CONFIG.filters.minRetweets) return false;
    
    // Retweet/Reply exclusion
    if (CONFIG.filters.excludeRetweets && tweet.type.isRetweet) return false;
    if (CONFIG.filters.excludeReplies && tweet.type.isReply) return false;
    
    // Media filter
    if (CONFIG.filters.mediaFilter === 'with-media') {
      if (!tweet.media.hasImage && !tweet.media.hasVideo) return false;
    } else if (CONFIG.filters.mediaFilter === 'without-media') {
      if (tweet.media.hasImage || tweet.media.hasVideo) return false;
    }
    
    return true;
  }
  
  /**
   * Extract hashtags from text
   */
  function extractHashtags(text) {
    const matches = text.match(/#[\w]+/g);
    return matches || [];
  }
  
  /**
   * Extract mentions from text
   */
  function extractMentions(text) {
    const matches = text.match(/@[\w]+/g);
    return matches || [];
  }
  
  /**
   * Extract URLs from text
   */
  function extractUrls(text) {
    const matches = text.match(/https?:\/\/[^\s]+/g);
    return matches || [];
  }
  
  /**
   * Extract tweets from the current page DOM
   */
  function extractTweets() {
    const tweetElements = document.querySelectorAll('article[data-testid="tweet"]');
    let newCount = 0;
    
    tweetElements.forEach(tweet => {
      try {
        // Get the timestamp element first: its enclosing anchor is the tweet's
        // own permalink. Grabbing the first /status/ link in the article can
        // return a quoted tweet's URL and attribute the wrong ID.
        const timeElement = tweet.querySelector('time');
        const timestamp = timeElement ? timeElement.getAttribute('datetime') : null;
        const displayTime = timeElement ? timeElement.innerText : '';

        const permalinkAnchor = timeElement ? timeElement.closest('a[href*="/status/"]') : null;
        const tweetLink = permalinkAnchor || tweet.querySelector('a[href*="/status/"]');
        const tweetUrl = tweetLink ? tweetLink.href : null;
        const tweetId = tweetUrl ? tweetUrl.split('/status/')[1]?.split(/[?/]/)[0] : null;

        // Skip if we've already seen this tweet or couldn't get ID
        if (!tweetId || seenIds.has(tweetId)) return;
        seenIds.add(tweetId);

        // Get the tweet text content
        const textElement = tweet.querySelector('[data-testid="tweetText"]');
        const text = textElement ? textElement.innerText : '';
        
        // Helper function to extract engagement metrics
        const getMetric = (testId) => {
          const el = tweet.querySelector(`[data-testid="${testId}"]`);
          const span = el?.querySelector('span span');
          return span ? span.innerText : '0';
        };
        
        // Extract all engagement metrics
        const replies = getMetric('reply');
        const retweets = getMetric('retweet');
        const likes = getMetric('like');
        
        // Views are in a different location
        const viewsElement = tweet.querySelector('a[href*="/analytics"]');
        const views = viewsElement ? viewsElement.innerText : '0';
        
        // Check for media attachments
        const hasImage = tweet.querySelector('[data-testid="tweetPhoto"]') !== null;
        const hasVideo = tweet.querySelector('[data-testid="videoPlayer"], [data-testid="videoComponent"]') !== null;
        const hasCard = tweet.querySelector('[data-testid="card.wrapper"]') !== null;

        // Retweets render socialContext as an <a> linking to the reposter's
        // profile; pinned posts render it as a plain element. Checking the tag
        // instead of the text keeps this working on non-English UIs and stops
        // pinned posts being counted as retweets.
        const socialContext = tweet.querySelector('[data-testid="socialContext"]');
        const isRetweet = !!socialContext && socialContext.closest('a') !== null;
        const isPinned = !!socialContext && !isRetweet;

        // Reply detection: the "Replying to @user" line only renders with an
        // English UI, so also check the structural marker X uses for replies.
        const isReply = tweet.querySelector('[data-testid="in-reply-to"]') !== null ||
          Array.from(tweet.querySelectorAll('div[dir]')).some(el =>
            el.innerText.startsWith('Replying to'));
        
        const tweetData = {
          id: tweetId,
          url: tweetUrl,
          text: text,
          timestamp: timestamp,
          displayTime: displayTime,
          metrics: {
            replies: replies,
            retweets: retweets,
            likes: likes,
            views: views
          },
          media: {
            hasImage: hasImage,
            hasVideo: hasVideo,
            hasCard: hasCard
          },
          type: {
            isRetweet: isRetweet,
            isReply: isReply,
            isPinned: isPinned
          },
          extracted: {
            hashtags: extractHashtags(text),
            mentions: extractMentions(text),
            urls: extractUrls(text)
          },
          scrapedAt: new Date().toISOString()
        };
        
        // Apply filters
        if (passesFilters(tweetData)) {
          tweets.push(tweetData);
          newCount++;
        }
        
      } catch (e) {
        console.warn('⚠️ Error extracting tweet:', e.message);
      }
    });
    
    return newCount;
  }
  
  // ==========================================
  // MAIN SCRAPING LOOP
  // ==========================================
  
  let scrollAttempts = 0;
  let lastTweetCount = 0;
  let noNewTweetsCount = 0;
  
  while (tweets.length < CONFIG.targetCount && scrollAttempts < CONFIG.maxScrollAttempts) {
    const newCount = extractTweets();

    // Track stalls independently of logging so the end-of-timeline check
    // still works when verbose is off
    if (tweets.length !== lastTweetCount) {
      if (CONFIG.verbose) {
        console.log(`📊 Progress: ${tweets.length}/${CONFIG.targetCount} tweets (${newCount} new this scroll)`);
      }
      lastTweetCount = tweets.length;
      noNewTweetsCount = 0;
    } else {
      noNewTweetsCount++;
      if (noNewTweetsCount >= 5) {
        console.log('⚠️ No new tweets found after 5 scroll attempts. May have reached the end.');
        break;
      }
    }
    
    if (tweets.length >= CONFIG.targetCount) break;
    
    // Scroll down to load more tweets
    window.scrollTo(0, document.body.scrollHeight);
    await new Promise(r => setTimeout(r, CONFIG.scrollDelay));
    
    scrollAttempts++;
  }
  
  // Final extraction
  extractTweets();
  
  const endTime = Date.now();
  const duration = ((endTime - startTime) / 1000).toFixed(2);
  
  // ==========================================
  // ANALYTICS & STATISTICS
  // ==========================================
  
  const finalTweets = tweets.slice(0, CONFIG.targetCount);
  
  // Calculate statistics
  const stats = {
    totalTweets: finalTweets.length,
    totalLikes: 0,
    totalRetweets: 0,
    totalReplies: 0,
    avgLikes: 0,
    avgRetweets: 0,
    tweetsWithMedia: 0,
    retweets: 0,
    replies: 0,
    topHashtags: {},
    topMentions: {},
    allUrls: []
  };
  
  finalTweets.forEach(t => {
    stats.totalLikes += parseEngagement(t.metrics.likes);
    stats.totalRetweets += parseEngagement(t.metrics.retweets);
    stats.totalReplies += parseEngagement(t.metrics.replies);
    if (t.media.hasImage || t.media.hasVideo) stats.tweetsWithMedia++;
    if (t.type.isRetweet) stats.retweets++;
    if (t.type.isReply) stats.replies++;
    
    t.extracted.hashtags.forEach(h => {
      stats.topHashtags[h.toLowerCase()] = (stats.topHashtags[h.toLowerCase()] || 0) + 1;
    });
    t.extracted.mentions.forEach(m => {
      stats.topMentions[m.toLowerCase()] = (stats.topMentions[m.toLowerCase()] || 0) + 1;
    });
    t.extracted.urls.forEach(u => {
      if (!stats.allUrls.includes(u)) stats.allUrls.push(u);
    });
  });
  
  stats.avgLikes = stats.totalTweets > 0 ? Math.round(stats.totalLikes / stats.totalTweets) : 0;
  stats.avgRetweets = stats.totalTweets > 0 ? Math.round(stats.totalRetweets / stats.totalTweets) : 0;
  
  // Sort hashtags and mentions by frequency
  const sortedHashtags = Object.entries(stats.topHashtags).sort((a, b) => b[1] - a[1]).slice(0, 10);
  const sortedMentions = Object.entries(stats.topMentions).sort((a, b) => b[1] - a[1]).slice(0, 10);
  
  // Build final output object
  const result = {
    profile: profileName,
    profileUrl: `https://x.com/${profileName}`,
    scrapedAt: new Date().toISOString(),
    duration: `${duration}s`,
    totalTweets: finalTweets.length,
    statistics: stats,
    tweets: finalTweets
  };
  
  // ==========================================
  // DISPLAY RESULTS
  // ==========================================
  
  console.log('');
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║  ✅ SCRAPING COMPLETE!                                     ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log('');
  console.log(`👤 Profile: @${result.profile}`);
  console.log(`📊 Tweets collected: ${result.totalTweets}`);
  console.log(`⏱️ Duration: ${result.duration}`);
  console.log('');
  
  // Show statistics
  if (CONFIG.display.showStats) {
    console.log('📈 ─────────────── STATISTICS ───────────────');
    console.log(`   Total Likes: ${stats.totalLikes.toLocaleString()}`);
    console.log(`   Total Retweets: ${stats.totalRetweets.toLocaleString()}`);
    console.log(`   Average Likes/Tweet: ${stats.avgLikes.toLocaleString()}`);
    console.log(`   Average Retweets/Tweet: ${stats.avgRetweets.toLocaleString()}`);
    console.log(`   Tweets with Media: ${stats.tweetsWithMedia}`);
    console.log(`   Retweets: ${stats.retweets}`);
    console.log(`   Replies: ${stats.replies}`);
    console.log('');
  }
  
  // Show top hashtags
  if (CONFIG.display.showHashtags && sortedHashtags.length > 0) {
    console.log('🏷️ ─────────────── TOP HASHTAGS ───────────────');
    sortedHashtags.forEach(([tag, count], i) => {
      console.log(`   ${i + 1}. ${tag} (${count})`);
    });
    console.log('');
  }
  
  // Show top mentions
  if (CONFIG.display.showMentions && sortedMentions.length > 0) {
    console.log('👥 ─────────────── TOP MENTIONS ───────────────');
    sortedMentions.forEach(([mention, count], i) => {
      console.log(`   ${i + 1}. ${mention} (${count})`);
    });
    console.log('');
  }
  
  // Show links
  if (CONFIG.display.showLinks && stats.allUrls.length > 0) {
    console.log('🔗 ─────────────── SHARED LINKS ───────────────');
    stats.allUrls.slice(0, 20).forEach((url, i) => {
      console.log(`   ${i + 1}. ${url}`);
    });
    if (stats.allUrls.length > 20) {
      console.log(`   ... and ${stats.allUrls.length - 20} more`);
    }
    console.log('');
  }
  
  // Show top posts
  if (CONFIG.display.showTopPosts > 0) {
    const topPosts = [...finalTweets]
      .sort((a, b) => parseEngagement(b.metrics.likes) - parseEngagement(a.metrics.likes))
      .slice(0, CONFIG.display.showTopPosts);
    
    console.log('🏆 ─────────────── TOP POSTS (by likes) ───────────────');
    topPosts.forEach((t, i) => {
      console.log(`   ${i + 1}. [${t.metrics.likes} ❤️] ${t.text.substring(0, 60)}...`);
      console.log(`      ${t.url}`);
    });
    console.log('');
  }
  
  // Pretty print tweets
  if (CONFIG.display.prettyPrint) {
    console.log('📝 ─────────────── TWEETS PREVIEW ───────────────');
    finalTweets.slice(0, CONFIG.display.prettyPrintLimit).forEach((t, i) => {
      console.log(`\n┌─ Tweet ${i + 1} ─────────────────────────────────`);
      console.log(`│ 📅 ${t.displayTime}`);
      console.log(`│ 💬 ${t.text.substring(0, 200)}${t.text.length > 200 ? '...' : ''}`);
      console.log(`│ ❤️ ${t.metrics.likes}  🔄 ${t.metrics.retweets}  💬 ${t.metrics.replies}  👁️ ${t.metrics.views}`);
      if (t.extracted.hashtags.length > 0) console.log(`│ 🏷️ ${t.extracted.hashtags.join(' ')}`);
      console.log(`│ 🔗 ${t.url}`);
      console.log(`└────────────────────────────────────────────────`);
    });
    if (finalTweets.length > CONFIG.display.prettyPrintLimit) {
      console.log(`\n... and ${finalTweets.length - CONFIG.display.prettyPrintLimit} more tweets`);
    }
    console.log('');
  }
  
  // ==========================================
  // EXPORT FUNCTIONS
  // ==========================================
  
  const dateStr = new Date().toISOString().split('T')[0];
  
  /**
   * Download a file with given content
   */
  function downloadFile(content, filename, mimeType) {
    try {
      const blob = new Blob([content], { type: mimeType });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      return true;
    } catch (e) {
      console.error(`❌ Failed to download ${filename}:`, e.message);
      return false;
    }
  }
  
  /**
   * Convert tweets to CSV format
   */
  function toCSV() {
    const headers = ['Date', 'Text', 'Likes', 'Retweets', 'Replies', 'Views', 'Has Image', 'Has Video', 'Is Retweet', 'Is Reply', 'Hashtags', 'URL'];
    const rows = finalTweets.map(t => [
      t.displayTime,
      `"${t.text.replace(/"/g, '""').replace(/\n/g, ' ')}"`,
      parseEngagement(t.metrics.likes),
      parseEngagement(t.metrics.retweets),
      parseEngagement(t.metrics.replies),
      parseEngagement(t.metrics.views),
      t.media.hasImage,
      t.media.hasVideo,
      t.type.isRetweet,
      t.type.isReply,
      `"${t.extracted.hashtags.join(' ')}"`,
      t.url
    ].join(','));
    
    return [headers.join(','), ...rows].join('\n');
  }
  
  /**
   * Convert tweets to Markdown format
   */
  function toMarkdown() {
    let md = `# Tweets from @${profileName}\n\n`;
    md += `> Scraped on ${result.scrapedAt}\n`;
    md += `> Total tweets: ${result.totalTweets}\n\n`;
    
    md += `## Statistics\n\n`;
    md += `| Metric | Value |\n|--------|-------|\n`;
    md += `| Total Likes | ${stats.totalLikes.toLocaleString()} |\n`;
    md += `| Total Retweets | ${stats.totalRetweets.toLocaleString()} |\n`;
    md += `| Avg Likes | ${stats.avgLikes} |\n`;
    md += `| Tweets with Media | ${stats.tweetsWithMedia} |\n\n`;
    
    if (sortedHashtags.length > 0) {
      md += `## Top Hashtags\n\n`;
      sortedHashtags.forEach(([tag, count]) => {
        md += `- ${tag} (${count})\n`;
      });
      md += '\n';
    }
    
    md += `## Tweets\n\n`;
    finalTweets.forEach((t, i) => {
      md += `### ${i + 1}. ${t.displayTime}\n\n`;
      md += `${t.text}\n\n`;
      md += `❤️ ${t.metrics.likes} | 🔄 ${t.metrics.retweets} | 💬 ${t.metrics.replies} | 👁️ ${t.metrics.views}\n\n`;
      md += `[View Tweet](${t.url})\n\n`;
      md += `---\n\n`;
    });
    
    return md;
  }
  
  /**
   * Convert tweets to plain text format
   */
  function toPlainText() {
    let txt = `TWEETS FROM @${profileName.toUpperCase()}\n`;
    txt += `${'='.repeat(60)}\n`;
    txt += `Scraped: ${result.scrapedAt}\n`;
    txt += `Total: ${result.totalTweets} tweets\n\n`;
    
    txt += `STATISTICS\n`;
    txt += `${'-'.repeat(30)}\n`;
    txt += `Total Likes: ${stats.totalLikes.toLocaleString()}\n`;
    txt += `Total Retweets: ${stats.totalRetweets.toLocaleString()}\n`;
    txt += `Average Likes: ${stats.avgLikes}\n\n`;
    
    txt += `TWEETS\n`;
    txt += `${'='.repeat(60)}\n\n`;
    
    finalTweets.forEach((t, i) => {
      txt += `[${i + 1}] ${t.displayTime}\n`;
      txt += `${'-'.repeat(30)}\n`;
      txt += `${t.text}\n\n`;
      txt += `Likes: ${t.metrics.likes} | RTs: ${t.metrics.retweets} | Replies: ${t.metrics.replies} | Views: ${t.metrics.views}\n`;
      txt += `URL: ${t.url}\n`;
      txt += `\n${'='.repeat(60)}\n\n`;
    });
    
    return txt;
  }
  
  /**
   * Convert tweets to HTML table format
   */
  function toHTML() {
    let html = `<!DOCTYPE html>
<html>
<head>
  <title>Tweets from @${profileName}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 1200px; margin: 0 auto; padding: 20px; }
    h1 { color: #1da1f2; }
    table { width: 100%; border-collapse: collapse; margin-top: 20px; }
    th, td { padding: 12px; text-align: left; border-bottom: 1px solid #ddd; }
    th { background: #1da1f2; color: white; }
    tr:hover { background: #f5f8fa; }
    .stats { background: #f5f8fa; padding: 20px; border-radius: 10px; margin-bottom: 20px; }
    .tweet-text { max-width: 400px; }
    a { color: #1da1f2; text-decoration: none; }
    a:hover { text-decoration: underline; }
  </style>
</head>
<body>
  <h1>🐦 Tweets from @${profileName}</h1>
  <p>Scraped: ${result.scrapedAt}</p>
  
  <div class="stats">
    <strong>📊 Statistics:</strong><br>
    Total Tweets: ${result.totalTweets} |
    Total Likes: ${stats.totalLikes.toLocaleString()} |
    Total Retweets: ${stats.totalRetweets.toLocaleString()} |
    Avg Likes: ${stats.avgLikes}
  </div>
  
  <table>
    <thead>
      <tr>
        <th>#</th>
        <th>Date</th>
        <th>Tweet</th>
        <th>❤️</th>
        <th>🔄</th>
        <th>💬</th>
        <th>👁️</th>
        <th>Link</th>
      </tr>
    </thead>
    <tbody>`;
    
    finalTweets.forEach((t, i) => {
      html += `
      <tr>
        <td>${i + 1}</td>
        <td>${t.displayTime}</td>
        <td class="tweet-text">${t.text.substring(0, 300).replace(/</g, '&lt;').replace(/>/g, '&gt;')}${t.text.length > 300 ? '...' : ''}</td>
        <td>${t.metrics.likes}</td>
        <td>${t.metrics.retweets}</td>
        <td>${t.metrics.replies}</td>
        <td>${t.metrics.views}</td>
        <td><a href="${t.url}" target="_blank">View</a></td>
      </tr>`;
    });
    
    html += `
    </tbody>
  </table>
  
  <p style="margin-top: 40px; color: #888; font-size: 12px;">
    Generated by <a href="https://github.com/nirholas/XActions">XActions</a> by @nichxbt
  </p>
</body>
</html>`;
    
    return html;
  }
  
  // ==========================================
  // PERFORM EXPORTS
  // ==========================================
  
  console.log('💾 ─────────────── EXPORTING ───────────────');
  
  if (CONFIG.export.json) {
    if (downloadFile(JSON.stringify(result, null, 2), `${profileName}_tweets_${dateStr}.json`, 'application/json')) {
      console.log('   ✅ JSON downloaded');
    }
  }
  
  if (CONFIG.export.csv) {
    if (downloadFile(toCSV(), `${profileName}_tweets_${dateStr}.csv`, 'text/csv')) {
      console.log('   ✅ CSV downloaded');
    }
  }
  
  if (CONFIG.export.markdown) {
    if (downloadFile(toMarkdown(), `${profileName}_tweets_${dateStr}.md`, 'text/markdown')) {
      console.log('   ✅ Markdown downloaded');
    }
  }
  
  if (CONFIG.export.text) {
    if (downloadFile(toPlainText(), `${profileName}_tweets_${dateStr}.txt`, 'text/plain')) {
      console.log('   ✅ Text file downloaded');
    }
  }
  
  if (CONFIG.export.html) {
    if (downloadFile(toHTML(), `${profileName}_tweets_${dateStr}.html`, 'text/html')) {
      console.log('   ✅ HTML downloaded');
    }
  }
  
  // Copy to clipboard
  if (CONFIG.copyToClipboard) {
    try {
      await navigator.clipboard.writeText(JSON.stringify(result, null, 2));
      console.log('   ✅ JSON copied to clipboard');
    } catch (e) {
      console.error('   ❌ Clipboard copy failed:', e.message);
    }
  }
  
  // Store in window for easy access
  window.scrapedTweets = result;
  window.exportCSV = toCSV;
  window.exportMarkdown = toMarkdown;
  window.exportText = toPlainText;
  window.exportHTML = toHTML;
  
  console.log('');
  console.log('💡 ─────────────── ACCESS YOUR DATA ───────────────');
  console.log('   window.scrapedTweets     - Full data object');
  console.log('   window.exportCSV()       - Get CSV string');
  console.log('   window.exportMarkdown()  - Get Markdown string');
  console.log('   window.exportText()      - Get plain text string');
  console.log('   window.exportHTML()      - Get HTML string');
  console.log('');
  
  return result;
})();

});
  register("scrape-profile-with-replies", function(){
var CONFIG = {

  // ==========================================
  // 📊 SCRAPING SETTINGS
  // ==========================================

  // Maximum number of the user's posts to collect from the profile feed.
  // Set to Infinity to scrape everything until the feed ends.
  targetPostCount: 50,

  // Maximum replies to collect PER POST when drilling into a thread.
  // Set higher for thorough sentiment analysis; lower for speed.
  maxRepliesPerPost: 50,

  // Maximum scroll attempts on the profile feed before giving up.
  maxFeedScrollAttempts: 200,

  // Maximum scroll attempts inside a single post's thread.
  maxThreadScrollAttempts: 30,

  // Delay between scrolls (ms). Increase if content doesn't load.
  scrollDelay: 2000,

  // Delay after navigating into/out of a post (ms). Lets the page settle.
  navigationDelay: 3000,

  // ==========================================
  // 🎯 POST RANGE FILTER
  // ==========================================
  // Limit scraping to a range of posts by ID or URL.
  // Leave null to scrape from the top of the feed.

  range: {
    // Start collecting posts AFTER this post (exclusive).
    // Accepts a post ID (e.g. '1234567890') or full URL.
    // null = start from the very first post in the feed.
    startPostId: null,

    // Stop collecting posts AFTER this post (inclusive).
    // Accepts a post ID or full URL.
    // null = scrape until targetPostCount or feed end.
    endPostId: null,
  },

  // ==========================================
  // 🔍 CONTENT FILTERS
  // ==========================================

  filters: {
    // Only include posts containing at least one of these words.
    // Empty array = include all.
    whitelist: [],

    // Exclude posts containing any of these words.
    blacklist: [],

    // Only posts from the last N days. 0 = no date limit.
    daysBack: 0,

    // Minimum engagement thresholds. 0 = no minimum.
    minLikes: 0,
    minRetweets: 0,

    // true = skip retweets from the feed
    excludeRetweets: false,
  },

  // ==========================================
  // 📤 EXPORT SETTINGS
  // ==========================================

  export: {
    json: true,
    csv: true,
    markdown: false,
    text: false,
    html: false,
  },

  // ==========================================
  // 🖥️ CONTROL PANEL
  // ==========================================

  panel: {
    // Show the floating control panel
    enabled: true,

    // Panel start position from top-right corner
    top: 20,
    right: 20,
  },

  // ==========================================
  // 🔧 GENERAL
  // ==========================================

  // Copy primary export (JSON) to clipboard on completion
  copyToClipboard: true,

  // Show verbose progress in console
  verbose: true,

  // Also scrape replies for the user's own reply-tweets
  // (when the user replied to someone else's post).
  // If false, only scrapes replies on the user's original posts.
  scrapeRepliesOnUserReplies: true,
};
try{if(typeof window!=='undefined'&&window.__XA_LAUNCH_CFG){Object.assign(CONFIG,window.__XA_LAUNCH_CFG);}}catch(_xa){}


/**
 * ============================================================
 * 🚀 SCRIPT START — DO NOT MODIFY BELOW UNLESS YOU KNOW
 *    WHAT YOU'RE DOING
 * ============================================================
 */

(async function XProfileRepliesScraper() {
  'use strict';

  // ─── State ──────────────────────────────────────────────
  const state = {
    phase: 'init',          // 'init' | 'feed' | 'replies' | 'done'
    paused: false,
    stopped: false,
    posts: [],              // collected profile posts
    currentPostIndex: -1,   // index of post currently being reply-scraped
    totalReplies: 0,
    startTime: Date.now(),
    feedScrolls: 0,
    reachedStart: !CONFIG.range.startPostId,  // if no start filter, we're already past it
    reachedEnd: false,
    originalUrl: window.location.href,
    errors: [],
  };

  const seenPostIds = new Set();

  // ─── Helpers ────────────────────────────────────────────

  function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Navigate within the SPA via history.pushState + a synthetic popstate.
  // Assigning window.location.href triggers a full page reload, which wipes
  // this console script's entire state (posts collected so far, panel, etc.)
  // mid-run. Only fall back to a real navigation if the SPA route never
  // takes (e.g. React hasn't mounted its popstate listener yet).
  function spaNavigate(url) {
    try {
      const target = new URL(url, window.location.href);
      if (target.origin === window.location.origin) {
        window.history.pushState({}, '', target.href);
        window.dispatchEvent(new PopStateEvent('popstate', { state: {} }));
        return true;
      }
    } catch (e) { /* fall through to hard navigation */ }
    window.location.href = url;
    return false;
  }

  /** Wait while paused, checking every 200ms. */
  async function waitWhilePaused() {
    while (state.paused && !state.stopped) {
      await sleep(200);
    }
  }

  /** Extract post ID from a URL or raw ID string. */
  function normalizePostId(input) {
    if (!input) return null;
    input = String(input).trim();
    // Full URL: https://x.com/user/status/1234567890
    const match = input.match(/\/status\/(\d+)/);
    if (match) return match[1];
    // Raw numeric ID
    if (/^\d+$/.test(input)) return input;
    return null;
  }

  /** Parse engagement strings like '1.2K', '3M'. */
  function parseEngagement(str) {
    if (!str || str === '') return 0;
    str = str.trim().toUpperCase();
    if (str.includes('K')) return Math.round(parseFloat(str) * 1_000);
    if (str.includes('M')) return Math.round(parseFloat(str) * 1_000_000);
    if (str.includes('B')) return Math.round(parseFloat(str) * 1_000_000_000);
    return parseInt(str.replace(/,/g, ''), 10) || 0;
  }

  function extractHashtags(text) {
    return (text.match(/#[\w]+/g) || []);
  }

  function extractMentions(text) {
    return (text.match(/@[\w]+/g) || []);
  }

  function extractUrls(text) {
    return (text.match(/https?:\/\/[^\s]+/g) || []);
  }

  function elapsed() {
    return ((Date.now() - state.startTime) / 1000).toFixed(1);
  }

  function log(msg) {
    if (CONFIG.verbose) console.log(msg);
  }

  // Normalize range IDs
  const startId = normalizePostId(CONFIG.range.startPostId);
  const endId = normalizePostId(CONFIG.range.endPostId);

  // ─── DOM extraction helpers ─────────────────────────────

  /**
   * Extract data from a single tweet article element.
   * Returns null if it can't be parsed.
   */
  function extractTweetFromElement(article) {
    try {
      // The timestamp's enclosing anchor is the tweet's own permalink.
      // The first /status/ link in the article can belong to a quoted tweet.
      const timeEl = article.querySelector('time');
      const timestamp = timeEl ? timeEl.getAttribute('datetime') : null;
      const displayTime = timeEl ? timeEl.innerText : '';

      const permalinkEl = timeEl ? timeEl.closest('a[href*="/status/"]') : null;
      const linkEl = permalinkEl || article.querySelector('a[href*="/status/"]');
      if (!linkEl) return null;
      const url = linkEl.href;
      const id = url.split('/status/')[1]?.split(/[?/]/)[0];
      if (!id) return null;

      const textEl = article.querySelector('[data-testid="tweetText"]');
      const text = textEl ? textEl.innerText : '';

      const metric = (testId) => {
        const el = article.querySelector(`[data-testid="${testId}"]`);
        const span = el?.querySelector('span span');
        return span ? span.innerText : '0';
      };

      const replies = metric('reply');
      const retweets = metric('retweet');
      const likes = metric('like');

      const viewsEl = article.querySelector('a[href*="/analytics"]');
      const views = viewsEl ? viewsEl.innerText : '0';

      const hasImage = !!article.querySelector('[data-testid="tweetPhoto"]');
      const hasVideo = !!article.querySelector('[data-testid="videoPlayer"], [data-testid="videoComponent"]');
      const hasCard = !!article.querySelector('[data-testid="card.wrapper"]');

      // Retweets render socialContext inside an <a> linking to the reposter;
      // pinned posts render it as a plain element. The structural check works
      // on any UI language and stops pinned posts counting as retweets.
      const socialCtxEl = article.querySelector('[data-testid="socialContext"]');
      const isRetweet = !!socialCtxEl && socialCtxEl.closest('a') !== null;

      // Reply detection: structural marker first, English UI text as fallback.
      const isReply = article.querySelector('[data-testid="in-reply-to"]') !== null ||
        Array.from(article.querySelectorAll('div[dir]')).some(el =>
          el.innerText.startsWith('Replying to'));

      // Get the author handle from the tweet
      const authorEl = article.querySelector('div[data-testid="User-Name"] a[href^="/"]');
      const authorHandle = authorEl ? authorEl.getAttribute('href').replace('/', '') : '';
      const authorNameEl = article.querySelector('div[data-testid="User-Name"] span');
      const authorName = authorNameEl ? authorNameEl.innerText : '';

      return {
        id,
        url,
        text,
        author: {
          handle: authorHandle,
          name: authorName,
        },
        timestamp,
        displayTime,
        metrics: { replies, retweets, likes, views },
        media: { hasImage, hasVideo, hasCard },
        type: { isRetweet, isReply },
        extracted: {
          hashtags: extractHashtags(text),
          mentions: extractMentions(text),
          urls: extractUrls(text),
        },
        scrapedAt: new Date().toISOString(),
      };
    } catch (e) {
      return null;
    }
  }

  /**
   * Check whether a post passes all content filters.
   */
  function passesFilters(tweet) {
    const text = tweet.text.toLowerCase();

    if (CONFIG.filters.whitelist.length > 0) {
      if (!CONFIG.filters.whitelist.some(w => text.includes(w.toLowerCase()))) return false;
    }
    if (CONFIG.filters.blacklist.length > 0) {
      if (CONFIG.filters.blacklist.some(w => text.includes(w.toLowerCase()))) return false;
    }
    if (CONFIG.filters.daysBack > 0 && tweet.timestamp) {
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - CONFIG.filters.daysBack);
      if (new Date(tweet.timestamp) < cutoff) return false;
    }
    if (parseEngagement(tweet.metrics.likes) < CONFIG.filters.minLikes) return false;
    if (parseEngagement(tweet.metrics.retweets) < CONFIG.filters.minRetweets) return false;
    if (CONFIG.filters.excludeRetweets && tweet.type.isRetweet) return false;

    return true;
  }

  // ─── Control Panel UI ──────────────────────────────────

  let panelEl = null;
  let statusEl = null;
  let postsCountEl = null;
  let repliesCountEl = null;
  let phaseEl = null;
  let elapsedEl = null;
  let progressBarEl = null;
  let currentPostEl = null;
  let logAreaEl = null;

  function createPanel() {
    if (!CONFIG.panel.enabled) return;

    // Remove existing panel if re-running
    const existing = document.getElementById('x-scraper-panel');
    if (existing) existing.remove();

    panelEl = document.createElement('div');
    panelEl.id = 'x-scraper-panel';
    panelEl.innerHTML = `
      <style>
        #x-scraper-panel {
          position: fixed;
          top: ${CONFIG.panel.top}px;
          right: ${CONFIG.panel.right}px;
          width: 360px;
          max-height: 90vh;
          background: #15202b;
          color: #e7e9ea;
          border: 1px solid #38444d;
          border-radius: 16px;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          font-size: 13px;
          z-index: 999999;
          box-shadow: 0 8px 30px rgba(0,0,0,0.5);
          overflow: hidden;
          user-select: none;
        }
        #x-scraper-panel * { box-sizing: border-box; }
        .xsp-header {
          background: #1d9bf0;
          padding: 12px 16px;
          cursor: move;
          display: flex;
          align-items: center;
          justify-content: space-between;
          font-weight: 700;
          font-size: 14px;
        }
        .xsp-header span { display: flex; align-items: center; gap: 6px; }
        .xsp-body { padding: 12px 16px; }
        .xsp-row {
          display: flex;
          justify-content: space-between;
          padding: 4px 0;
          border-bottom: 1px solid #38444d22;
        }
        .xsp-row .label { color: #8899a6; }
        .xsp-row .value { font-weight: 600; font-variant-numeric: tabular-nums; }
        .xsp-progress {
          margin: 10px 0;
          height: 6px;
          background: #38444d;
          border-radius: 3px;
          overflow: hidden;
        }
        .xsp-progress-bar {
          height: 100%;
          background: #1d9bf0;
          border-radius: 3px;
          transition: width 0.3s ease;
          width: 0%;
        }
        .xsp-current {
          padding: 6px 8px;
          margin: 8px 0;
          background: #192734;
          border-radius: 8px;
          font-size: 12px;
          color: #8899a6;
          max-height: 40px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .xsp-buttons {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 6px;
          margin-top: 10px;
        }
        .xsp-btn {
          padding: 8px 12px;
          border: none;
          border-radius: 9999px;
          font-size: 12px;
          font-weight: 700;
          cursor: pointer;
          transition: opacity 0.2s;
          text-align: center;
        }
        .xsp-btn:hover { opacity: 0.85; }
        .xsp-btn:active { transform: scale(0.97); }
        .xsp-btn-pause { background: #ffd166; color: #15202b; }
        .xsp-btn-resume { background: #06d6a0; color: #15202b; }
        .xsp-btn-stop { background: #ef476f; color: #fff; }
        .xsp-btn-export { background: #1d9bf0; color: #fff; }
        .xsp-btn-download { background: #8338ec; color: #fff; }
        .xsp-btn-full { grid-column: 1 / -1; }
        .xsp-log {
          margin-top: 10px;
          max-height: 100px;
          overflow-y: auto;
          font-size: 11px;
          color: #8899a6;
          background: #192734;
          border-radius: 8px;
          padding: 6px 8px;
        }
        .xsp-log div { padding: 1px 0; }
        .xsp-log .warn { color: #ffd166; }
        .xsp-log .err { color: #ef476f; }
        .xsp-log .ok { color: #06d6a0; }
        .xsp-minimize {
          background: none;
          border: none;
          color: #fff;
          font-size: 18px;
          cursor: pointer;
          padding: 0 4px;
          line-height: 1;
        }
      </style>

      <div class="xsp-header" id="xsp-drag-handle">
        <span>🐦 X Scraper</span>
        <div style="display:flex;gap:4px;">
          <button class="xsp-minimize" id="xsp-minimize" title="Minimize">−</button>
          <button class="xsp-minimize" id="xsp-close" title="Close panel">×</button>
        </div>
      </div>

      <div class="xsp-body" id="xsp-body">
        <div class="xsp-row">
          <span class="label">Phase</span>
          <span class="value" id="xsp-phase">Initializing…</span>
        </div>
        <div class="xsp-row">
          <span class="label">Status</span>
          <span class="value" id="xsp-status">Running</span>
        </div>
        <div class="xsp-row">
          <span class="label">Posts collected</span>
          <span class="value" id="xsp-posts">0 / ${CONFIG.targetPostCount === Infinity ? '∞' : CONFIG.targetPostCount}</span>
        </div>
        <div class="xsp-row">
          <span class="label">Replies collected</span>
          <span class="value" id="xsp-replies">0</span>
        </div>
        <div class="xsp-row">
          <span class="label">Elapsed</span>
          <span class="value" id="xsp-elapsed">0s</span>
        </div>

        <div class="xsp-progress">
          <div class="xsp-progress-bar" id="xsp-progress-bar"></div>
        </div>

        <div class="xsp-current" id="xsp-current">Preparing…</div>

        <div class="xsp-buttons">
          <button class="xsp-btn xsp-btn-pause" id="xsp-pause">⏸ Pause</button>
          <button class="xsp-btn xsp-btn-stop" id="xsp-stop">⏹ Stop</button>
          <button class="xsp-btn xsp-btn-export" id="xsp-export">📦 Export Now</button>
          <button class="xsp-btn xsp-btn-download" id="xsp-download">💾 Download</button>
          <button class="xsp-btn xsp-btn-export xsp-btn-full" id="xsp-pause-export" style="background:#118ab2;">⏸ Pause & Export</button>
        </div>

        <div class="xsp-log" id="xsp-log"></div>
      </div>
    `;

    document.body.appendChild(panelEl);

    // Cache elements
    statusEl = document.getElementById('xsp-status');
    postsCountEl = document.getElementById('xsp-posts');
    repliesCountEl = document.getElementById('xsp-replies');
    phaseEl = document.getElementById('xsp-phase');
    elapsedEl = document.getElementById('xsp-elapsed');
    progressBarEl = document.getElementById('xsp-progress-bar');
    currentPostEl = document.getElementById('xsp-current');
    logAreaEl = document.getElementById('xsp-log');

    // ── Dragging ──
    let isDragging = false, dragX, dragY;
    const handle = document.getElementById('xsp-drag-handle');
    handle.addEventListener('mousedown', (e) => {
      if (e.target.tagName === 'BUTTON') return;
      isDragging = true;
      dragX = e.clientX - panelEl.offsetLeft;
      dragY = e.clientY - panelEl.offsetTop;
    });
    document.addEventListener('mousemove', (e) => {
      if (!isDragging) return;
      panelEl.style.left = (e.clientX - dragX) + 'px';
      panelEl.style.right = 'auto';
      panelEl.style.top = (e.clientY - dragY) + 'px';
    });
    document.addEventListener('mouseup', () => { isDragging = false; });

    // ── Minimize ──
    const body = document.getElementById('xsp-body');
    document.getElementById('xsp-minimize').addEventListener('click', () => {
      body.style.display = body.style.display === 'none' ? 'block' : 'none';
    });

    // ── Close ──
    document.getElementById('xsp-close').addEventListener('click', () => {
      panelEl.style.display = panelEl.style.display === 'none' ? 'block' : 'none';
    });

    // ── Buttons ──
    document.getElementById('xsp-pause').addEventListener('click', () => {
      if (state.paused) {
        state.paused = false;
        updateStatus('Running');
        panelLog('▶ Resumed', 'ok');
        document.getElementById('xsp-pause').textContent = '⏸ Pause';
        document.getElementById('xsp-pause').className = 'xsp-btn xsp-btn-pause';
      } else {
        state.paused = true;
        updateStatus('Paused');
        panelLog('⏸ Paused', 'warn');
        document.getElementById('xsp-pause').textContent = '▶ Resume';
        document.getElementById('xsp-pause').className = 'xsp-btn xsp-btn-resume';
      }
    });

    document.getElementById('xsp-stop').addEventListener('click', () => {
      state.stopped = true;
      state.paused = false;
      updateStatus('Stopped');
      panelLog('⏹ Stopped by user', 'warn');
    });

    document.getElementById('xsp-export').addEventListener('click', () => {
      panelLog('📦 Exporting…', 'ok');
      exportAllFormats();
    });

    document.getElementById('xsp-download').addEventListener('click', () => {
      panelLog('💾 Downloading…', 'ok');
      downloadAllFormats();
    });

    document.getElementById('xsp-pause-export').addEventListener('click', () => {
      state.paused = true;
      updateStatus('Paused');
      document.getElementById('xsp-pause').textContent = '▶ Resume';
      document.getElementById('xsp-pause').className = 'xsp-btn xsp-btn-resume';
      panelLog('⏸ Paused & exporting…', 'warn');
      exportAllFormats();
    });

    // Timer
    setInterval(() => {
      if (elapsedEl) elapsedEl.textContent = elapsed() + 's';
    }, 1000);
  }

  function updateStatus(s) {
    if (statusEl) statusEl.textContent = s;
  }

  function updatePhase(p) {
    if (phaseEl) phaseEl.textContent = p;
    state.phase = p;
  }

  function updatePostsCount() {
    const target = CONFIG.targetPostCount === Infinity ? '∞' : CONFIG.targetPostCount;
    if (postsCountEl) postsCountEl.textContent = `${state.posts.length} / ${target}`;
  }

  function updateRepliesCount() {
    if (repliesCountEl) repliesCountEl.textContent = String(state.totalReplies);
  }

  function updateProgress(pct) {
    if (progressBarEl) progressBarEl.style.width = Math.min(100, pct).toFixed(1) + '%';
  }

  function updateCurrent(msg) {
    if (currentPostEl) currentPostEl.textContent = msg;
  }

  function panelLog(msg, cls = '') {
    log(msg);
    if (!logAreaEl) return;
    const d = document.createElement('div');
    if (cls) d.className = cls;
    d.textContent = `[${elapsed()}s] ${msg}`;
    logAreaEl.prepend(d);
    // Keep log under 200 entries
    while (logAreaEl.children.length > 200) logAreaEl.lastChild.remove();
  }

  // ─── Export helpers ─────────────────────────────────────

  function buildResult() {
    const profileMatch = state.originalUrl.match(/x\.com\/([^\/]+)/);
    const profileName = profileMatch ? profileMatch[1] : 'unknown';

    const totalReplyCount = state.posts.reduce((sum, p) => sum + (p.replies_scraped?.length || 0), 0);

    return {
      profile: profileName,
      profileUrl: `https://x.com/${profileName}`,
      scrapedAt: new Date().toISOString(),
      duration: elapsed() + 's',
      totalPosts: state.posts.length,
      totalRepliesScraped: totalReplyCount,
      config: {
        targetPostCount: CONFIG.targetPostCount,
        maxRepliesPerPost: CONFIG.maxRepliesPerPost,
        startPostId: startId,
        endPostId: endId,
        filters: CONFIG.filters,
      },
      posts: state.posts,
    };
  }

  function downloadFile(content, filename, mimeType) {
    try {
      const blob = new Blob([content], { type: mimeType });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      return true;
    } catch (e) {
      console.error('Download failed:', e);
      return false;
    }
  }

  function toCSV(result) {
    // Posts CSV
    const postHeaders = ['PostID', 'URL', 'Author', 'Date', 'Text', 'Likes', 'Retweets', 'Replies', 'Views', 'IsRetweet', 'IsReply', 'Hashtags', 'RepliesScraped'];
    const postRows = result.posts.map(p => [
      p.id,
      p.url,
      p.author?.handle || '',
      '"' + (p.displayTime || '').replace(/"/g, '""') + '"',
      '"' + (p.text || '').replace(/"/g, '""').replace(/\n/g, ' ') + '"',
      parseEngagement(p.metrics.likes),
      parseEngagement(p.metrics.retweets),
      parseEngagement(p.metrics.replies),
      parseEngagement(p.metrics.views),
      p.type.isRetweet,
      p.type.isReply,
      '"' + (p.extracted?.hashtags || []).join(' ') + '"',
      (p.replies_scraped || []).length,
    ].join(','));

    // Replies CSV
    const replyHeaders = ['ParentPostID', 'ReplyID', 'URL', 'Author', 'AuthorHandle', 'Date', 'Text', 'Likes', 'Retweets', 'Replies', 'Views'];
    const replyRows = [];
    result.posts.forEach(p => {
      (p.replies_scraped || []).forEach(r => {
        replyRows.push([
          p.id,
          r.id,
          r.url,
          '"' + (r.author?.name || '').replace(/"/g, '""') + '"',
          r.author?.handle || '',
          '"' + (r.displayTime || '').replace(/"/g, '""') + '"',
          '"' + (r.text || '').replace(/"/g, '""').replace(/\n/g, ' ') + '"',
          parseEngagement(r.metrics?.likes),
          parseEngagement(r.metrics?.retweets),
          parseEngagement(r.metrics?.replies),
          parseEngagement(r.metrics?.views),
        ].join(','));
      });
    });

    const postsCSV = [postHeaders.join(','), ...postRows].join('\n');
    const repliesCSV = [replyHeaders.join(','), ...replyRows].join('\n');

    return { postsCSV, repliesCSV };
  }

  function toMarkdown(result) {
    let md = `# X Posts & Replies — @${result.profile}\n\n`;
    md += `> Scraped: ${result.scrapedAt}  \n`;
    md += `> Posts: ${result.totalPosts} | Replies: ${result.totalRepliesScraped}  \n`;
    md += `> Duration: ${result.duration}\n\n`;

    result.posts.forEach((p, i) => {
      md += `---\n\n`;
      md += `## Post ${i + 1} — ${p.displayTime}\n\n`;
      md += `**@${p.author?.handle || '?'}**: ${p.text}\n\n`;
      md += `❤️ ${p.metrics.likes} | 🔄 ${p.metrics.retweets} | 💬 ${p.metrics.replies} | 👁️ ${p.metrics.views}  \n`;
      md += `[View post](${p.url})\n\n`;

      if (p.replies_scraped?.length > 0) {
        md += `### Replies (${p.replies_scraped.length})\n\n`;
        p.replies_scraped.forEach((r, j) => {
          md += `> **${j + 1}. @${r.author?.handle || '?'}** (${r.displayTime}): ${r.text}  \n`;
          md += `> ❤️ ${r.metrics?.likes || 0} | 💬 ${r.metrics?.replies || 0}  \n\n`;
        });
      }
    });

    return md;
  }

  function toPlainText(result) {
    let txt = `X POSTS & REPLIES — @${result.profile}\n`;
    txt += `${'='.repeat(60)}\n`;
    txt += `Scraped: ${result.scrapedAt}\n`;
    txt += `Posts: ${result.totalPosts} | Replies: ${result.totalRepliesScraped}\n\n`;

    result.posts.forEach((p, i) => {
      txt += `${'─'.repeat(60)}\n`;
      txt += `POST ${i + 1} — @${p.author?.handle || '?'} — ${p.displayTime}\n`;
      txt += `${'─'.repeat(60)}\n`;
      txt += `${p.text}\n\n`;
      txt += `Likes: ${p.metrics.likes} | RTs: ${p.metrics.retweets} | Replies: ${p.metrics.replies} | Views: ${p.metrics.views}\n`;
      txt += `URL: ${p.url}\n\n`;

      if (p.replies_scraped?.length > 0) {
        txt += `  REPLIES (${p.replies_scraped.length}):\n`;
        p.replies_scraped.forEach((r, j) => {
          txt += `  ${j + 1}. @${r.author?.handle || '?'} (${r.displayTime}): ${r.text}\n`;
          txt += `     Likes: ${r.metrics?.likes || 0}\n\n`;
        });
      }
      txt += '\n';
    });

    return txt;
  }

  function toHTML(result) {
    const esc = s => String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    let html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>X Posts — @${esc(result.profile)}</title>
<style>
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 900px; margin: 0 auto; padding: 24px; background: #f7f9fa; color: #0f1419; }
  h1 { color: #1d9bf0; }
  .meta { color: #536471; margin-bottom: 24px; }
  .post { background: #fff; border: 1px solid #eff3f4; border-radius: 16px; padding: 16px; margin-bottom: 16px; }
  .post-header { display: flex; justify-content: space-between; margin-bottom: 8px; }
  .handle { font-weight: 700; color: #1d9bf0; }
  .post-text { margin: 8px 0; white-space: pre-wrap; }
  .metrics { color: #536471; font-size: 13px; }
  .replies { margin-top: 12px; padding-left: 16px; border-left: 3px solid #1d9bf0; }
  .reply { padding: 8px 0; border-bottom: 1px solid #eff3f4; }
  .reply:last-child { border-bottom: none; }
  .reply-handle { font-weight: 600; color: #536471; }
  a { color: #1d9bf0; text-decoration: none; }
  a:hover { text-decoration: underline; }
</style>
</head>
<body>
<h1>🐦 X Posts &amp; Replies — @${esc(result.profile)}</h1>
<div class="meta">
  Scraped: ${esc(result.scrapedAt)} | Posts: ${result.totalPosts} | Replies: ${result.totalRepliesScraped} | Duration: ${esc(result.duration)}
</div>
`;

    result.posts.forEach((p, i) => {
      html += `<div class="post">
  <div class="post-header">
    <span class="handle">@${esc(p.author?.handle)}</span>
    <span>${esc(p.displayTime)}</span>
  </div>
  <div class="post-text">${esc(p.text)}</div>
  <div class="metrics">❤️ ${esc(p.metrics.likes)} | 🔄 ${esc(p.metrics.retweets)} | 💬 ${esc(p.metrics.replies)} | 👁️ ${esc(p.metrics.views)} — <a href="${esc(p.url)}" target="_blank">View</a></div>
`;
      if (p.replies_scraped?.length > 0) {
        html += `  <div class="replies"><strong>Replies (${p.replies_scraped.length})</strong>\n`;
        p.replies_scraped.forEach(r => {
          html += `    <div class="reply">
      <span class="reply-handle">@${esc(r.author?.handle)}</span> <span style="color:#536471;font-size:12px;">${esc(r.displayTime)}</span><br>
      ${esc(r.text)}<br>
      <span style="color:#536471;font-size:12px;">❤️ ${esc(r.metrics?.likes || '0')}</span>
    </div>\n`;
        });
        html += `  </div>\n`;
      }
      html += `</div>\n`;
    });

    html += `</body></html>`;
    return html;
  }

  function exportAllFormats() {
    const result = buildResult();
    const dateStr = new Date().toISOString().split('T')[0];
    const profileName = result.profile;

    console.log('');
    console.log('╔════════════════════════════════════════════════════════════╗');
    console.log('║  📦 EXPORTING DATA                                         ║');
    console.log('╚════════════════════════════════════════════════════════════╝');

    if (CONFIG.export.json) {
      const json = JSON.stringify(result, null, 2);
      console.log(`📎 JSON: ${(json.length / 1024).toFixed(1)} KB`);
      if (CONFIG.copyToClipboard) {
        navigator.clipboard.writeText(json).then(
          () => panelLog('📋 JSON copied to clipboard', 'ok'),
          () => panelLog('⚠ Clipboard copy failed', 'warn')
        );
      }
    }

    if (CONFIG.export.csv) {
      const { postsCSV, repliesCSV } = toCSV(result);
      console.log(`📎 Posts CSV: ${(postsCSV.length / 1024).toFixed(1)} KB`);
      console.log(`📎 Replies CSV: ${(repliesCSV.length / 1024).toFixed(1)} KB`);
    }

    console.log('✅ Export data ready! Use 💾 Download to save files.');
    panelLog('📦 Export complete', 'ok');

    // Store on window for console access
    window.__xScraperResult = result;
    console.log('💡 Tip: Access data via window.__xScraperResult');

    return result;
  }

  function downloadAllFormats() {
    const result = buildResult();
    const dateStr = new Date().toISOString().split('T')[0];
    const profileName = result.profile;
    let count = 0;

    if (CONFIG.export.json) {
      downloadFile(JSON.stringify(result, null, 2), `${profileName}-posts-replies-${dateStr}.json`, 'application/json');
      count++;
    }
    if (CONFIG.export.csv) {
      const { postsCSV, repliesCSV } = toCSV(result);
      downloadFile(postsCSV, `${profileName}-posts-${dateStr}.csv`, 'text/csv');
      downloadFile(repliesCSV, `${profileName}-replies-${dateStr}.csv`, 'text/csv');
      count += 2;
    }
    if (CONFIG.export.markdown) {
      downloadFile(toMarkdown(result), `${profileName}-posts-replies-${dateStr}.md`, 'text/markdown');
      count++;
    }
    if (CONFIG.export.text) {
      downloadFile(toPlainText(result), `${profileName}-posts-replies-${dateStr}.txt`, 'text/plain');
      count++;
    }
    if (CONFIG.export.html) {
      downloadFile(toHTML(result), `${profileName}-posts-replies-${dateStr}.html`, 'text/html');
      count++;
    }

    panelLog(`💾 Downloaded ${count} file(s)`, 'ok');
  }

  // ─── Phase 1: Scrape profile feed ──────────────────────

  async function scrapeProfileFeed() {
    updatePhase('📜 Scraping profile feed…');
    panelLog('Phase 1: Collecting posts from feed');

    let noNewCount = 0;
    let prevCount = 0;

    while (
      state.posts.length < CONFIG.targetPostCount &&
      state.feedScrolls < CONFIG.maxFeedScrollAttempts &&
      !state.stopped &&
      !state.reachedEnd
    ) {
      await waitWhilePaused();
      if (state.stopped) break;

      // Extract visible tweets
      const articles = document.querySelectorAll('article[data-testid="tweet"]');
      let newThisRound = 0;

      for (const article of articles) {
        if (state.posts.length >= CONFIG.targetPostCount || state.reachedEnd) break;

        const tweet = extractTweetFromElement(article);
        if (!tweet || seenPostIds.has(tweet.id)) continue;
        seenPostIds.add(tweet.id);

        // ── Range: Start filter ──
        if (!state.reachedStart) {
          if (startId && tweet.id === startId) {
            state.reachedStart = true;
            panelLog(`🎯 Reached start post ${startId}`, 'ok');
          }
          continue; // skip posts before startId
        }

        // ── Range: End filter ──
        if (endId && tweet.id === endId) {
          state.reachedEnd = true;
          panelLog(`🏁 Reached end post ${endId}`, 'ok');
        }

        // Apply content filters
        if (!passesFilters(tweet)) continue;

        // Initialize reply storage
        tweet.replies_scraped = [];

        state.posts.push(tweet);
        newThisRound++;
        updatePostsCount();
      }

      if (newThisRound > 0) {
        noNewCount = 0;
        const pct = CONFIG.targetPostCount === Infinity
          ? 50 // indeterminate
          : (state.posts.length / CONFIG.targetPostCount) * 50;
        updateProgress(pct);
        updateCurrent(`Collected ${state.posts.length} posts…`);
      } else {
        noNewCount++;
        if (noNewCount >= 8) {
          panelLog('⚠ No new posts after 8 scrolls. Feed may have ended.', 'warn');
          break;
        }
      }

      prevCount = state.posts.length;

      // Scroll
      window.scrollTo(0, document.body.scrollHeight);
      await sleep(CONFIG.scrollDelay);
      state.feedScrolls++;
    }

    panelLog(`✅ Feed done: ${state.posts.length} posts collected`, 'ok');
  }

  // ─── Phase 2: Scrape replies for each post ─────────────

  /**
   * Navigate to a tweet's page by simulating a click on the timestamp link,
   * which triggers X's SPA client-side routing (no full page reload).
   */
  async function navigateToTweet(postUrl) {
    // Find the tweet article with this URL and click its timestamp link
    const links = document.querySelectorAll('a[href*="/status/"]');
    let targetLink = null;

    for (const link of links) {
      if (link.href === postUrl) {
        // Prefer the time element link (more reliable for navigation)
        const time = link.querySelector('time');
        if (time) {
          targetLink = link;
          break;
        }
      }
    }

    if (targetLink) {
      targetLink.click();
    } else {
      // Fallback: the post's own article scrolled out of view / was
      // virtualized away, so there's no link to click. Use SPA navigation
      // (not a hard window.location.href reload, which would kill this
      // entire running scraper and lose all progress collected so far).
      spaNavigate(postUrl);
    }

    await sleep(CONFIG.navigationDelay);
  }

  async function navigateBack() {
    window.history.back();
    await sleep(CONFIG.navigationDelay);
  }

  /**
   * Once on a tweet detail page, extract replies from the thread.
   * Replies appear as articles below the main tweet.
   */
  async function scrapeThreadReplies(parentPostId) {
    const replies = [];
    const seenReplyIds = new Set();
    let scrollAttempts = 0;
    let noNewCount = 0;

    // Wait for tweet thread to load
    await sleep(1000);

    while (
      replies.length < CONFIG.maxRepliesPerPost &&
      scrollAttempts < CONFIG.maxThreadScrollAttempts &&
      !state.stopped
    ) {
      await waitWhilePaused();
      if (state.stopped) break;

      const articles = document.querySelectorAll('article[data-testid="tweet"]');
      let newThisRound = 0;

      // The first article is usually the main tweet itself; replies follow.
      // We identify replies as tweets whose ID differs from parentPostId.
      for (const article of articles) {
        const tweet = extractTweetFromElement(article);
        if (!tweet) continue;
        if (tweet.id === parentPostId) continue; // skip the main tweet
        if (seenReplyIds.has(tweet.id)) continue;

        seenReplyIds.add(tweet.id);
        replies.push(tweet);
        newThisRound++;
        state.totalReplies++;
        updateRepliesCount();

        if (replies.length >= CONFIG.maxRepliesPerPost) break;
      }

      if (newThisRound > 0) {
        noNewCount = 0;
      } else {
        noNewCount++;
        if (noNewCount >= 4) break; // no more replies loading
      }

      // Scroll to load more replies
      window.scrollTo(0, document.body.scrollHeight);
      await sleep(CONFIG.scrollDelay);
      scrollAttempts++;
    }

    return replies;
  }

  async function scrapeAllReplies() {
    updatePhase('💬 Scraping replies…');
    panelLog(`Phase 2: Scraping replies for ${state.posts.length} posts`);

    for (let i = 0; i < state.posts.length; i++) {
      if (state.stopped) break;
      await waitWhilePaused();

      const post = state.posts[i];
      state.currentPostIndex = i;

      // Skip user-reply tweets if configured
      if (!CONFIG.scrapeRepliesOnUserReplies && post.type.isReply) {
        panelLog(`⏭ Skipping reply-tweet ${i + 1}/${state.posts.length}`);
        continue;
      }

      const replyCountNum = parseEngagement(post.metrics.replies);
      if (replyCountNum === 0) {
        panelLog(`⏭ Post ${i + 1}/${state.posts.length} — 0 replies, skipping`);
        continue;
      }

      updateCurrent(`Post ${i + 1}/${state.posts.length}: scraping replies (${post.metrics.replies} reported)…`);
      panelLog(`💬 Post ${i + 1}/${state.posts.length} — scraping replies…`);

      const progressBase = 50;
      const progressPerPost = 50 / state.posts.length;
      updateProgress(progressBase + progressPerPost * i);

      try {
        // Navigate to the tweet
        await navigateToTweet(post.url);
        await sleep(1000);

        // Check we landed on the right page
        const onTweet = window.location.href.includes('/status/');
        if (!onTweet) {
          panelLog(`⚠ Navigation failed for post ${i + 1}, retrying…`, 'warn');
          // SPA navigation, not window.location.href: a hard reload here
          // would destroy this running script and lose every post/reply
          // collected so far.
          spaNavigate(post.url);
          await sleep(CONFIG.navigationDelay + 1000);
        }

        // Scrape replies
        const replies = await scrapeThreadReplies(post.id);
        post.replies_scraped = replies;

        panelLog(`   → ${replies.length} replies collected`, 'ok');

        // Navigate back to profile
        await navigateBack();

        // Wait for feed to re-render
        await sleep(1000);

        // We may need to scroll back to where we were. Wait for articles to load.
        let attempts = 0;
        while (attempts < 5) {
          const hasArticles = document.querySelectorAll('article[data-testid="tweet"]').length > 0;
          if (hasArticles) break;
          await sleep(1000);
          attempts++;
        }

      } catch (err) {
        panelLog(`⚠ Error on post ${i + 1}: ${err.message}`, 'err');
        state.errors.push({ postId: post.id, error: err.message });

        // Try to get back to the profile. SPA navigation, not a hard
        // reload: this runs mid-loop, so destroying the script here would
        // silently abandon every remaining post.
        try {
          if (!window.location.href.includes(state.originalUrl.split('x.com/')[1]?.split('/')[0])) {
            spaNavigate(state.originalUrl);
            await sleep(CONFIG.navigationDelay);
          }
        } catch (_) {
          // ignore
        }
      }
    }

    panelLog(`✅ Replies done: ${state.totalReplies} replies total`, 'ok');
  }

  // ─── Main ──────────────────────────────────────────────

  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║  🐦 X Profile + Replies Scraper                            ║');
  console.log('║  by nichxbt — https://github.com/nirholas/XActions          ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log('');

  // Verify we're on the right page
  if (!window.location.href.includes('x.com/')) {
    console.error('❌ This script must be run on x.com. Navigate to a profile page first.');
    return;
  }

  const profileMatch = window.location.pathname.match(/^\/([^\/]+)/);
  const profileName = profileMatch ? profileMatch[1] : 'unknown';

  console.log(`🎯 Profile: @${profileName}`);
  console.log(`📊 Target: ${CONFIG.targetPostCount === Infinity ? '∞' : CONFIG.targetPostCount} posts`);
  console.log(`💬 Max replies per post: ${CONFIG.maxRepliesPerPost}`);
  if (startId) console.log(`🏁 Start after post: ${startId}`);
  if (endId) console.log(`🏁 Stop at post: ${endId}`);
  console.log('');

  // Ensure we're on with_replies
  if (!window.location.href.includes('/with_replies')) {
    console.log('💡 Tip: Navigate to /with_replies to include the user\'s replies too.');
    console.log(`   https://x.com/${profileName}/with_replies`);
    console.log('');
  }

  // Create control panel
  createPanel();
  panelLog('🚀 Scraper initialized');

  try {
    // Phase 1: Collect posts from the profile feed
    await scrapeProfileFeed();

    if (state.stopped) {
      panelLog('Stopped during feed scraping', 'warn');
    }

    if (state.posts.length === 0) {
      panelLog('⚠ No posts found! Check that you\'re on the right profile page.', 'err');
      updatePhase('⚠ No posts found');
      updateStatus('Done (no posts)');
      return;
    }

    // Phase 2: Scrape replies for each post
    if (!state.stopped) {
      // Scroll back to top before navigating into posts
      window.scrollTo(0, 0);
      await sleep(1000);
      await scrapeAllReplies();
    }

    // Done
    updatePhase('✅ Complete');
    updateStatus('Done');
    updateProgress(100);

    const result = buildResult();

    console.log('');
    console.log('╔════════════════════════════════════════════════════════════╗');
    console.log('║  ✅ SCRAPING COMPLETE!                                     ║');
    console.log('╚════════════════════════════════════════════════════════════╝');
    console.log('');
    console.log(`👤 Profile: @${result.profile}`);
    console.log(`📊 Posts collected: ${result.totalPosts}`);
    console.log(`💬 Replies collected: ${result.totalRepliesScraped}`);
    console.log(`⏱️ Duration: ${result.duration}`);
    console.log('');

    // Stats
    let totalLikes = 0, totalRetweets = 0;
    result.posts.forEach(p => {
      totalLikes += parseEngagement(p.metrics.likes);
      totalRetweets += parseEngagement(p.metrics.retweets);
    });
    console.log('📈 ─── POST STATISTICS ───');
    console.log(`   Total Likes: ${totalLikes.toLocaleString()}`);
    console.log(`   Total Retweets: ${totalRetweets.toLocaleString()}`);
    console.log(`   Avg Likes/Post: ${result.totalPosts > 0 ? Math.round(totalLikes / result.totalPosts).toLocaleString() : 0}`);
    console.log(`   Avg Replies Scraped/Post: ${result.totalPosts > 0 ? (result.totalRepliesScraped / result.totalPosts).toFixed(1) : 0}`);
    console.log('');

    if (state.errors.length > 0) {
      console.log(`⚠️ ${state.errors.length} error(s) occurred:`);
      state.errors.forEach(e => console.log(`   Post ${e.postId}: ${e.error}`));
      console.log('');
    }

    // Top posts by reply count
    const byReplies = [...result.posts].sort((a, b) =>
      (b.replies_scraped?.length || 0) - (a.replies_scraped?.length || 0)
    ).slice(0, 5);

    if (byReplies.length > 0) {
      console.log('🏆 ─── TOP POSTS (by replies scraped) ───');
      byReplies.forEach((p, i) => {
        console.log(`   ${i + 1}. [${p.replies_scraped?.length || 0} replies] ${p.text?.substring(0, 60)}…`);
        console.log(`      ${p.url}`);
      });
      console.log('');
    }

    // Auto-export
    panelLog('Running auto-export…', 'ok');
    downloadAllFormats();

    // Store on window
    window.__xScraperResult = result;
    console.log('💡 Access full data: window.__xScraperResult');
    console.log('💡 Re-download: Use the 💾 Download button on the panel');

  } catch (fatalErr) {
    console.error('❌ Fatal error:', fatalErr);
    panelLog(`❌ Fatal: ${fatalErr.message}`, 'err');
    updatePhase('❌ Error');
    updateStatus('Error');

    // Still try to export whatever we have
    if (state.posts.length > 0) {
      panelLog('Attempting partial export…', 'warn');
      downloadAllFormats();
      window.__xScraperResult = buildResult();
    }
  }

})();

});
  register("scraper-toolbox", function(){
(function xactionsScraperToolbox() {
  'use strict';

  // Re-pasting the script replaces any live instance cleanly
  if (window.XActionsToolbox && typeof window.XActionsToolbox.destroy === 'function') {
    try { window.XActionsToolbox.destroy(); } catch (e) { /* ignore */ }
  }

  const VERSION = '1.0.0';
  const LS_KEY = 'xactions_toolbox_config_v1';
  const TAG = '[XActions Toolbox]';

  // ==========================================
  // CONFIG (edited live from the panel; persisted in localStorage)
  // ==========================================

  const DEFAULT_CONFIG = {
    targetCount: 300,        // stop after this many MATCHING tweets (0 = no limit)
    scrollDelay: 1800,       // ms between scrolls
    maxScrolls: 400,         // hard cap on scroll attempts
    stallLimit: 8,           // stop after N scrolls with nothing new
    autoDownloadJson: false, // download JSON automatically when a run finishes
    filters: {
      includeKeywords: [],   // keep only tweets containing at least one (empty = all)
      excludeKeywords: [],   // drop tweets containing any
      onlyUsers: [],         // keep only tweets authored by these handles (empty = all)
      excludeUsers: [],      // drop tweets authored by (or reposted from) these handles
      minLikes: 0,
      minRetweets: 0,
      minViews: 0,
      daysBack: 0,           // 0 = no date limit
      excludeRetweets: false,
      excludeReplies: false,
      excludeQuotes: false,
      excludePinned: false,
      mediaFilter: 'all',    // 'all' | 'with-media' | 'without-media'
      lang: ''               // BCP-47 code from the tweet payload, e.g. 'en' (empty = all)
    },
    ui: { top: 80, left: null } // panel position (left null = stick to right edge)
  };

  function loadConfig() {
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (!raw) return structuredClone(DEFAULT_CONFIG);
      const saved = JSON.parse(raw);
      return {
        ...structuredClone(DEFAULT_CONFIG),
        ...saved,
        filters: { ...structuredClone(DEFAULT_CONFIG.filters), ...(saved.filters || {}) },
        ui: { ...structuredClone(DEFAULT_CONFIG.ui), ...(saved.ui || {}) }
      };
    } catch (e) {
      return structuredClone(DEFAULT_CONFIG);
    }
  }

  function saveConfig() {
    try { localStorage.setItem(LS_KEY, JSON.stringify(config)); } catch (e) { /* storage full/blocked */ }
  }

  const config = loadConfig();

  // ==========================================
  // STATE
  // ==========================================

  const state = {
    status: 'idle',        // idle | running | paused | done
    startedAt: null,
    elapsedBefore: 0,      // accumulated ms across pause cycles
    scrolls: 0,
    stalls: 0,
    lastChangeCount: 0,
    destroyed: false
  };

  /** id -> normalized tweet record. Map preserves capture order. */
  const store = new Map();

  // ==========================================
  // SMALL UTILITIES
  // ==========================================

  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  function csvList(str) {
    return String(str || '')
      .split(',')
      .map((s) => s.trim().replace(/^@/, ''))
      .filter(Boolean);
  }

  function escapeHtml(s) {
    return String(s ?? '')
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function csvCell(v) {
    const s = String(v ?? '');
    return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  }

  function parseApprox(str) {
    if (!str) return 0;
    const s = String(str).trim().toUpperCase().replace(/,/g, '');
    const n = parseFloat(s);
    if (Number.isNaN(n)) return 0;
    if (s.includes('K')) return Math.round(n * 1e3);
    if (s.includes('M')) return Math.round(n * 1e6);
    if (s.includes('B')) return Math.round(n * 1e9);
    return Math.round(n);
  }

  function fmtInt(n) { return Number(n || 0).toLocaleString(); }

  function fmtElapsed(ms) {
    const s = Math.floor(ms / 1000);
    const m = Math.floor(s / 60);
    return m > 0 ? `${m}m ${s % 60}s` : `${s}s`;
  }

  async function copyText(text) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (e) {
      // Clipboard API needs page focus; fall back to a hidden textarea
      try {
        const ta = document.createElement('textarea');
        ta.value = text;
        ta.style.cssText = 'position:fixed;opacity:0;pointer-events:none';
        document.body.appendChild(ta);
        ta.select();
        const ok = document.execCommand('copy');
        ta.remove();
        return ok;
      } catch (e2) {
        return false;
      }
    }
  }

  function downloadFile(content, filename, mime) {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  function pageLabel() {
    const path = location.pathname.replace(/^\/+|\/+$/g, '');
    if (!path || path === 'home') return 'home';
    if (path.startsWith('search')) return 'search';
    if (path.startsWith('i/bookmarks')) return 'bookmarks';
    return path.split('/')[0];
  }

  // ==========================================
  // GRAPHQL INTERCEPTION
  // ==========================================
  // The X web app fetches timelines from /i/api/graphql/<hash>/<Operation>.
  // We wrap fetch (and XHR as a safety net), clone matching responses, and
  // walk the JSON for Tweet objects. No extra requests are ever made; we
  // only read what the page already downloaded.

  const GQL_URL = /\/i\/api\/graphql\//;
  const origFetch = window.fetch;
  const origXhrOpen = XMLHttpRequest.prototype.open;
  const origXhrSend = XMLHttpRequest.prototype.send;

  function installInterceptor() {
    window.fetch = async function patchedFetch(...args) {
      const res = await origFetch.apply(this, args);
      try {
        const url = typeof args[0] === 'string' ? args[0] : (args[0] && args[0].url) || '';
        if (GQL_URL.test(url)) {
          res.clone().json().then(ingestGraphql).catch(() => { /* not JSON */ });
        }
      } catch (e) { /* never break the page's own fetch */ }
      return res;
    };

    XMLHttpRequest.prototype.open = function patchedOpen(method, url, ...rest) {
      this.__xatUrl = url;
      return origXhrOpen.call(this, method, url, ...rest);
    };
    XMLHttpRequest.prototype.send = function patchedSend(...args) {
      if (this.__xatUrl && GQL_URL.test(String(this.__xatUrl))) {
        this.addEventListener('load', () => {
          try { ingestGraphql(JSON.parse(this.responseText)); } catch (e) { /* not JSON */ }
        });
      }
      return origXhrSend.apply(this, args);
    };
  }

  function removeInterceptor() {
    window.fetch = origFetch;
    XMLHttpRequest.prototype.open = origXhrOpen;
    XMLHttpRequest.prototype.send = origXhrSend;
  }

  /**
   * Recursively collect Tweet result objects from a GraphQL payload.
   * Subtrees under a promoted entry (ads) are skipped entirely.
   * Recursion stops at each Tweet node; nested quoted/reposted tweets are
   * handled inside normalizeGraphqlTweet so they are not double-counted
   * as standalone timeline items.
   */
  function collectTweetNodes(node, out) {
    if (!node || typeof node !== 'object') return;
    if (Array.isArray(node)) { for (const item of node) collectTweetNodes(item, out); return; }
    if (typeof node.entryId === 'string' && node.entryId.includes('promoted')) return;
    const candidate = node.__typename === 'TweetWithVisibilityResults' ? node.tweet : node;
    if (candidate && candidate.rest_id && candidate.legacy && typeof candidate.legacy.full_text === 'string') {
      out.push(candidate);
      return;
    }
    for (const key of Object.keys(node)) collectTweetNodes(node[key], out);
  }

  function userFromResult(userResult) {
    const u = (userResult && (userResult.result || userResult)) || null;
    if (!u) return { handle: '', name: '', verified: false, followers: null };
    const legacy = u.legacy || {};
    const core = u.core || {};
    return {
      handle: legacy.screen_name || core.screen_name || '',
      name: legacy.name || core.name || '',
      verified: !!u.is_blue_verified,
      followers: typeof legacy.followers_count === 'number' ? legacy.followers_count : null
    };
  }

  function normalizeGraphqlTweet(raw, opts = {}) {
    const legacy = raw.legacy || {};
    const author = userFromResult(raw.core && raw.core.user_results);

    // Long posts store the untruncated body in note_tweet
    const noteText = raw.note_tweet && raw.note_tweet.note_tweet_results &&
      raw.note_tweet.note_tweet_results.result && raw.note_tweet.note_tweet_results.result.text;
    const text = noteText || legacy.full_text || '';

    const mediaEntities = (legacy.extended_entities && legacy.extended_entities.media) ||
      (legacy.entities && legacy.entities.media) || [];
    const media = mediaEntities.map((m) => {
      const entry = { type: m.type, url: m.media_url_https || m.url || '' };
      if (m.video_info && Array.isArray(m.video_info.variants)) {
        const best = m.video_info.variants
          .filter((v) => v.content_type === 'video/mp4')
          .sort((a, b) => (b.bitrate || 0) - (a.bitrate || 0))[0];
        if (best) entry.videoUrl = best.url;
      }
      return entry;
    });

    const rtRaw = legacy.retweeted_status_result && legacy.retweeted_status_result.result;
    const rtNode = rtRaw && (rtRaw.__typename === 'TweetWithVisibilityResults' ? rtRaw.tweet : rtRaw);
    const retweetOf = rtNode ? normalizeGraphqlTweet(rtNode, { nested: true }) : null;

    const qRaw = raw.quoted_status_result && raw.quoted_status_result.result;
    const qNode = qRaw && (qRaw.__typename === 'TweetWithVisibilityResults' ? qRaw.tweet : qRaw);
    const quoted = (!opts.nested && qNode && qNode.legacy)
      ? normalizeGraphqlTweet(qNode, { nested: true })
      : null;

    const record = {
      id: raw.rest_id,
      url: author.handle ? `https://x.com/${author.handle}/status/${raw.rest_id}` : `https://x.com/i/status/${raw.rest_id}`,
      author,
      text,
      lang: legacy.lang || '',
      createdAt: legacy.created_at ? new Date(legacy.created_at).toISOString() : null,
      metrics: {
        likes: legacy.favorite_count || 0,
        retweets: legacy.retweet_count || 0,
        replies: legacy.reply_count || 0,
        quotes: legacy.quote_count || 0,
        bookmarks: legacy.bookmark_count || 0,
        views: raw.views && raw.views.count ? parseInt(raw.views.count, 10) : 0
      },
      media,
      type: {
        isRetweet: !!retweetOf,
        isReply: !!legacy.in_reply_to_status_id_str,
        isQuote: !!legacy.is_quote_status && !retweetOf,
        isPinned: false // set from the DOM sweep when visible
      },
      entities: {
        hashtags: ((legacy.entities && legacy.entities.hashtags) || []).map((h) => '#' + h.text),
        mentions: ((legacy.entities && legacy.entities.user_mentions) || []).map((m) => '@' + m.screen_name),
        urls: ((legacy.entities && legacy.entities.urls) || []).map((u) => u.expanded_url || u.url).filter(Boolean)
      },
      sensitive: !!legacy.possibly_sensitive,
      source: 'graphql',
      approx: false,
      scrapedAt: new Date().toISOString()
    };
    if (retweetOf) record.retweetOf = { id: retweetOf.id, author: retweetOf.author, url: retweetOf.url, text: retweetOf.text };
    if (quoted) record.quoted = { id: quoted.id, author: quoted.author, url: quoted.url, text: quoted.text };
    return record;
  }

  function ingestGraphql(payload) {
    if (state.destroyed) return;
    const nodes = [];
    try { collectTweetNodes(payload, nodes); } catch (e) { return; }
    let added = 0;
    for (const node of nodes) {
      try {
        const rec = normalizeGraphqlTweet(node);
        if (!rec.id || (!rec.text && rec.media.length === 0)) continue;
        const existing = store.get(rec.id);
        if (!existing || existing.source === 'dom') {
          if (existing && existing.type.isPinned) rec.type.isPinned = true;
          store.set(rec.id, rec);
          added++;
        }
      } catch (e) { /* one malformed node never aborts the batch */ }
    }
    if (added > 0) {
      updateStats();
      previewLatest();
    }
  }

  // ==========================================
  // DOM SWEEP (fallback for tweets rendered before injection)
  // ==========================================

  function domSweep() {
    const articles = document.querySelectorAll('article[data-testid="tweet"]');
    let added = 0;
    articles.forEach((tweet) => {
      try {
        const timeEl = tweet.querySelector('time');
        if (!timeEl) return;
        const link = timeEl.closest('a[href*="/status/"]');
        if (!link) return;
        const match = link.href.match(/\/([^/]+)\/status\/(\d+)/);
        if (!match) return;
        const [, handle, id] = match;

        const socialContext = tweet.querySelector('[data-testid="socialContext"]');
        const isRetweet = !!socialContext && socialContext.closest('a') !== null;
        const isPinned = !!socialContext && !isRetweet;

        const existing = store.get(id);
        if (existing) {
          // GraphQL records can't see pinned status; the DOM can
          if (isPinned && !existing.type.isPinned) { existing.type.isPinned = true; }
          return;
        }

        const textEl = tweet.querySelector('[data-testid="tweetText"]');
        const text = textEl ? textEl.innerText : '';
        const metric = (testId) => {
          const el = tweet.querySelector(`[data-testid="${testId}"]`);
          const span = el && el.querySelector('span span');
          return parseApprox(span ? span.innerText : '0');
        };
        const viewsEl = tweet.querySelector('a[href*="/analytics"]');
        const nameEl = tweet.querySelector('[data-testid="User-Name"]');

        store.set(id, {
          id,
          url: `https://x.com/${handle}/status/${id}`,
          author: {
            handle,
            name: nameEl ? nameEl.innerText.split('\n')[0] : handle,
            verified: !!tweet.querySelector('[data-testid="icon-verified"]'),
            followers: null
          },
          text,
          lang: '',
          createdAt: timeEl.getAttribute('datetime'),
          metrics: {
            likes: metric('like') || metric('unlike'),
            retweets: metric('retweet') || metric('unretweet'),
            replies: metric('reply'),
            quotes: 0,
            bookmarks: 0,
            views: parseApprox(viewsEl ? viewsEl.innerText : '0')
          },
          media: [],
          type: {
            isRetweet,
            isReply: false,
            isQuote: !!tweet.querySelector('div[role="link"] time'),
            isPinned
          },
          entities: {
            hashtags: (text.match(/#[\w]+/g) || []),
            mentions: (text.match(/@[\w]+/g) || []),
            urls: (text.match(/https?:\/\/[^\s]+/g) || [])
          },
          sensitive: false,
          source: 'dom',
          approx: true,
          scrapedAt: new Date().toISOString()
        });
        added++;
      } catch (e) { /* skip malformed article */ }
    });
    if (added > 0) { updateStats(); previewLatest(); }
    return added;
  }

  // ==========================================
  // FILTERS
  // ==========================================

  function matchesFilters(t) {
    const f = config.filters;
    const text = (t.text || '').toLowerCase();
    const handle = (t.author.handle || '').toLowerCase();

    if (f.onlyUsers.length && !f.onlyUsers.some((u) => u.toLowerCase() === handle)) return false;
    if (f.excludeUsers.length) {
      const rtHandle = t.retweetOf ? (t.retweetOf.author.handle || '').toLowerCase() : '';
      if (f.excludeUsers.some((u) => {
        const lower = u.toLowerCase();
        return lower === handle || (rtHandle && lower === rtHandle);
      })) return false;
    }
    if (f.includeKeywords.length && !f.includeKeywords.some((k) => text.includes(k.toLowerCase()))) return false;
    if (f.excludeKeywords.length && f.excludeKeywords.some((k) => text.includes(k.toLowerCase()))) return false;

    if (f.daysBack > 0 && t.createdAt) {
      const cutoff = Date.now() - f.daysBack * 86400000;
      if (new Date(t.createdAt).getTime() < cutoff) return false;
    }
    if (t.metrics.likes < f.minLikes) return false;
    if (t.metrics.retweets < f.minRetweets) return false;
    if (f.minViews > 0 && t.metrics.views < f.minViews) return false;

    if (f.excludeRetweets && t.type.isRetweet) return false;
    if (f.excludeReplies && t.type.isReply) return false;
    if (f.excludeQuotes && t.type.isQuote) return false;
    if (f.excludePinned && t.type.isPinned) return false;

    if (f.mediaFilter === 'with-media' && t.media.length === 0) return false;
    if (f.mediaFilter === 'without-media' && t.media.length > 0) return false;

    if (f.lang && t.lang && t.lang !== f.lang) return false;

    return true;
  }

  function allTweets() { return Array.from(store.values()); }

  function matchedTweets() {
    return allTweets()
      .filter(matchesFilters)
      .sort((a, b) => {
        const ta = a.createdAt ? Date.parse(a.createdAt) : 0;
        const tb = b.createdAt ? Date.parse(b.createdAt) : 0;
        return tb - ta;
      });
  }

  // ==========================================
  // EXPORTS
  // ==========================================

  function buildStats(tweets) {
    const stats = {
      total: tweets.length,
      totalLikes: 0, totalRetweets: 0, totalReplies: 0, totalViews: 0,
      avgLikes: 0, avgRetweets: 0,
      withMedia: 0, retweets: 0, replies: 0, quotes: 0,
      topHashtags: {}, topMentions: {}
    };
    for (const t of tweets) {
      stats.totalLikes += t.metrics.likes;
      stats.totalRetweets += t.metrics.retweets;
      stats.totalReplies += t.metrics.replies;
      stats.totalViews += t.metrics.views;
      if (t.media.length) stats.withMedia++;
      if (t.type.isRetweet) stats.retweets++;
      if (t.type.isReply) stats.replies++;
      if (t.type.isQuote) stats.quotes++;
      for (const h of t.entities.hashtags) stats.topHashtags[h.toLowerCase()] = (stats.topHashtags[h.toLowerCase()] || 0) + 1;
      for (const m of t.entities.mentions) stats.topMentions[m.toLowerCase()] = (stats.topMentions[m.toLowerCase()] || 0) + 1;
    }
    if (tweets.length) {
      stats.avgLikes = Math.round(stats.totalLikes / tweets.length);
      stats.avgRetweets = Math.round(stats.totalRetweets / tweets.length);
    }
    return stats;
  }

  function exportBundle() {
    const tweets = matchedTweets();
    return {
      source: pageLabel(),
      pageUrl: location.href,
      scrapedAt: new Date().toISOString(),
      toolboxVersion: VERSION,
      filters: config.filters,
      totalCaptured: store.size,
      totalMatched: tweets.length,
      statistics: buildStats(tweets),
      tweets
    };
  }

  function toJSON() { return JSON.stringify(exportBundle(), null, 2); }

  function toCSV() {
    const headers = ['id', 'date', 'author', 'text', 'likes', 'retweets', 'replies', 'quotes', 'bookmarks', 'views',
      'lang', 'isRetweet', 'isReply', 'isQuote', 'isPinned', 'mediaCount', 'mediaUrls', 'hashtags', 'url', 'source'];
    const rows = matchedTweets().map((t) => [
      t.id,
      t.createdAt || '',
      '@' + t.author.handle,
      csvCell(t.text),
      t.metrics.likes, t.metrics.retweets, t.metrics.replies, t.metrics.quotes, t.metrics.bookmarks, t.metrics.views,
      t.lang,
      t.type.isRetweet, t.type.isReply, t.type.isQuote, t.type.isPinned,
      t.media.length,
      csvCell(t.media.map((m) => m.videoUrl || m.url).join(' ')),
      csvCell(t.entities.hashtags.join(' ')),
      t.url,
      t.source
    ].join(','));
    return [headers.join(','), ...rows].join('\n');
  }

  function toMarkdown() {
    const bundle = exportBundle();
    const s = bundle.statistics;
    let md = `# X posts export (${bundle.source})\n\n`;
    md += `> Scraped ${bundle.scrapedAt} from ${bundle.pageUrl}\n`;
    md += `> ${bundle.totalMatched} matching posts (of ${bundle.totalCaptured} captured)\n\n`;
    md += `## Statistics\n\n| Metric | Value |\n|--------|-------|\n`;
    md += `| Total likes | ${fmtInt(s.totalLikes)} |\n| Total reposts | ${fmtInt(s.totalRetweets)} |\n`;
    md += `| Total views | ${fmtInt(s.totalViews)} |\n| Avg likes | ${fmtInt(s.avgLikes)} |\n| With media | ${s.withMedia} |\n\n`;
    md += `## Posts\n\n`;
    for (const [i, t] of bundle.tweets.entries()) {
      md += `### ${i + 1}. @${t.author.handle} (${t.createdAt ? t.createdAt.slice(0, 10) : 'unknown date'})\n\n`;
      md += `${t.text}\n\n`;
      md += `Likes ${fmtInt(t.metrics.likes)} | Reposts ${fmtInt(t.metrics.retweets)} | Replies ${fmtInt(t.metrics.replies)} | Views ${fmtInt(t.metrics.views)}\n\n`;
      md += `[View post](${t.url})\n\n---\n\n`;
    }
    return md;
  }

  function toPlainText() {
    const tweets = matchedTweets();
    const sep = '='.repeat(60);
    let txt = `X POSTS EXPORT (${pageLabel()})\n${sep}\n`;
    txt += `Scraped: ${new Date().toISOString()}\nMatching posts: ${tweets.length} (of ${store.size} captured)\n\n`;
    tweets.forEach((t, i) => {
      txt += `[${i + 1}] @${t.author.handle}${t.createdAt ? ' | ' + t.createdAt : ''}\n`;
      txt += `${'-'.repeat(60)}\n${t.text}\n\n`;
      txt += `Likes: ${fmtInt(t.metrics.likes)} | Reposts: ${fmtInt(t.metrics.retweets)} | Replies: ${fmtInt(t.metrics.replies)} | Views: ${fmtInt(t.metrics.views)}\n`;
      txt += `URL: ${t.url}\n${sep}\n\n`;
    });
    return txt;
  }

  function toHTML() {
    const bundle = exportBundle();
    const s = bundle.statistics;
    let html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>X posts export (${escapeHtml(bundle.source)})</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 1200px; margin: 0 auto; padding: 20px; color: #0f1419; }
    h1 { color: #1d9bf0; }
    table { width: 100%; border-collapse: collapse; margin-top: 20px; }
    th, td { padding: 10px 12px; text-align: left; border-bottom: 1px solid #ddd; vertical-align: top; }
    th { background: #1d9bf0; color: white; position: sticky; top: 0; }
    tr:hover { background: #f5f8fa; }
    .stats { background: #f5f8fa; padding: 16px 20px; border-radius: 10px; }
    .tweet-text { max-width: 480px; white-space: pre-wrap; }
    a { color: #1d9bf0; text-decoration: none; }
    a:hover { text-decoration: underline; }
    td.num { text-align: right; font-variant-numeric: tabular-nums; }
  </style>
</head>
<body>
  <h1>X posts export</h1>
  <p>Source: ${escapeHtml(bundle.pageUrl)}<br>Scraped: ${bundle.scrapedAt}</p>
  <div class="stats">
    <strong>Statistics:</strong>
    ${bundle.totalMatched} posts |
    Likes: ${fmtInt(s.totalLikes)} |
    Reposts: ${fmtInt(s.totalRetweets)} |
    Views: ${fmtInt(s.totalViews)} |
    Avg likes: ${fmtInt(s.avgLikes)}
  </div>
  <table>
    <thead><tr><th>#</th><th>Date</th><th>Author</th><th>Post</th><th>Likes</th><th>Reposts</th><th>Replies</th><th>Views</th><th>Link</th></tr></thead>
    <tbody>`;
    bundle.tweets.forEach((t, i) => {
      html += `
      <tr>
        <td>${i + 1}</td>
        <td>${t.createdAt ? t.createdAt.slice(0, 10) : ''}</td>
        <td>@${escapeHtml(t.author.handle)}</td>
        <td class="tweet-text">${escapeHtml(t.text)}</td>
        <td class="num">${fmtInt(t.metrics.likes)}</td>
        <td class="num">${fmtInt(t.metrics.retweets)}</td>
        <td class="num">${fmtInt(t.metrics.replies)}</td>
        <td class="num">${fmtInt(t.metrics.views)}</td>
        <td><a href="${escapeHtml(t.url)}" target="_blank" rel="noopener">View</a></td>
      </tr>`;
    });
    html += `
    </tbody>
  </table>
  <p style="margin-top: 40px; color: #888; font-size: 12px;">
    Generated by <a href="https://github.com/nirholas/XActions">XActions Scraper Toolbox</a> v${VERSION} by @nichxbt
  </p>
</body>
</html>`;
    return html;
  }

  const EXPORTERS = {
    json: { build: toJSON, ext: 'json', mime: 'application/json' },
    csv: { build: toCSV, ext: 'csv', mime: 'text/csv' },
    markdown: { build: toMarkdown, ext: 'md', mime: 'text/markdown' },
    text: { build: toPlainText, ext: 'txt', mime: 'text/plain' },
    html: { build: toHTML, ext: 'html', mime: 'text/html' }
  };

  function exportAs(format) {
    const exporter = EXPORTERS[format];
    if (!exporter) { log(`Unknown export format: ${format}`); return; }
    const count = matchedTweets().length;
    if (count === 0) { log('Nothing to export yet (0 matching posts).'); return; }
    const name = `${pageLabel()}_posts_${new Date().toISOString().slice(0, 10)}.${exporter.ext}`;
    downloadFile(exporter.build(), name, exporter.mime);
    log(`Exported ${count} posts as ${name}`);
  }

  async function copyAs(kind) {
    const count = matchedTweets().length;
    if (count === 0) { log('Nothing to copy yet (0 matching posts).'); return; }
    const content = kind === 'text' ? toPlainText() : toJSON();
    const ok = await copyText(content);
    log(ok ? `Copied ${count} posts to clipboard (${kind === 'text' ? 'plain text' : 'JSON'}).`
           : 'Clipboard copy failed. Click the page once, then retry.');
  }

  // ==========================================
  // PANEL UI
  // ==========================================

  const PANEL_ID = 'xactions-toolbox';
  let panel, els = {};

  const PANEL_HTML = `
  <style>
    #${PANEL_ID} {
      position: fixed;
      width: 340px;
      max-height: 92vh;
      background: #15202b;
      color: #e7e9ea;
      border: 1px solid #38444d;
      border-radius: 16px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 13px;
      z-index: 2147483647;
      box-shadow: 0 8px 30px rgba(0,0,0,0.5);
      display: flex;
      flex-direction: column;
      user-select: none;
    }
    #${PANEL_ID} * { box-sizing: border-box; }
    #${PANEL_ID} .xat-header {
      background: #1d9bf0; color: #fff;
      padding: 10px 14px; cursor: move;
      display: flex; align-items: center; justify-content: space-between;
      font-weight: 700; font-size: 14px;
      border-radius: 15px 15px 0 0;
      flex: 0 0 auto;
    }
    #${PANEL_ID} .xat-header .xat-hbtns { display: flex; gap: 4px; }
    #${PANEL_ID} .xat-header button {
      background: rgba(255,255,255,0.15); border: none; color: #fff;
      width: 24px; height: 24px; border-radius: 6px; cursor: pointer;
      font-size: 13px; line-height: 1; transition: background 0.15s;
    }
    #${PANEL_ID} .xat-header button:hover { background: rgba(255,255,255,0.3); }
    #${PANEL_ID} .xat-body { padding: 12px 14px; overflow-y: auto; flex: 1 1 auto; }
    #${PANEL_ID} .xat-body::-webkit-scrollbar { width: 8px; }
    #${PANEL_ID} .xat-body::-webkit-scrollbar-thumb { background: #38444d; border-radius: 4px; }

    #${PANEL_ID} .xat-statusrow { display: flex; align-items: center; gap: 8px; margin-bottom: 8px; }
    #${PANEL_ID} .xat-chip {
      padding: 2px 10px; border-radius: 999px; font-weight: 700; font-size: 11px;
      background: #38444d; text-transform: uppercase; letter-spacing: 0.5px;
    }
    #${PANEL_ID} .xat-chip.running { background: #00ba7c; color: #04120c; }
    #${PANEL_ID} .xat-chip.paused { background: #ffd400; color: #1a1400; }
    #${PANEL_ID} .xat-chip.done { background: #1d9bf0; color: #041018; }
    #${PANEL_ID} .xat-elapsed { color: #8899a6; font-variant-numeric: tabular-nums; margin-left: auto; }

    #${PANEL_ID} .xat-counts {
      display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px; margin: 8px 0;
    }
    #${PANEL_ID} .xat-count {
      background: #192734; border-radius: 10px; padding: 8px 6px; text-align: center;
    }
    #${PANEL_ID} .xat-count b { display: block; font-size: 17px; font-variant-numeric: tabular-nums; }
    #${PANEL_ID} .xat-count span { color: #8899a6; font-size: 10px; text-transform: uppercase; letter-spacing: 0.4px; }

    #${PANEL_ID} .xat-progress { height: 6px; background: #38444d; border-radius: 3px; overflow: hidden; margin: 4px 0 10px; }
    #${PANEL_ID} .xat-progress-bar { height: 100%; width: 0%; background: #1d9bf0; border-radius: 3px; transition: width 0.3s ease; }

    #${PANEL_ID} .xat-controls { display: grid; grid-template-columns: 1fr 1fr 1fr 44px; gap: 6px; margin-bottom: 10px; }
    #${PANEL_ID} .xat-btn {
      border: none; border-radius: 10px; padding: 9px 0; font-weight: 700; font-size: 13px;
      cursor: pointer; color: #fff; background: #38444d; transition: filter 0.15s, transform 0.05s;
    }
    #${PANEL_ID} .xat-btn:hover:not(:disabled) { filter: brightness(1.2); }
    #${PANEL_ID} .xat-btn:active:not(:disabled) { transform: scale(0.97); }
    #${PANEL_ID} .xat-btn:disabled { opacity: 0.4; cursor: default; }
    #${PANEL_ID} .xat-btn.xat-start { background: #00ba7c; color: #04120c; }
    #${PANEL_ID} .xat-btn.xat-pause { background: #ffd400; color: #1a1400; }
    #${PANEL_ID} .xat-btn.xat-stop { background: #f4212e; }

    #${PANEL_ID} details { margin-bottom: 8px; border: 1px solid #38444d; border-radius: 10px; }
    #${PANEL_ID} summary {
      cursor: pointer; padding: 8px 10px; font-weight: 700; color: #e7e9ea; list-style: none;
      display: flex; justify-content: space-between; align-items: center;
    }
    #${PANEL_ID} summary::after { content: '▾'; color: #8899a6; }
    #${PANEL_ID} details[open] summary::after { content: '▴'; }
    #${PANEL_ID} .xat-fields { padding: 2px 10px 10px; display: grid; gap: 7px; }
    #${PANEL_ID} .xat-field { display: grid; gap: 3px; }
    #${PANEL_ID} .xat-field label { color: #8899a6; font-size: 11px; }
    #${PANEL_ID} .xat-field input[type="text"], #${PANEL_ID} .xat-field input[type="number"], #${PANEL_ID} .xat-field select {
      background: #192734; color: #e7e9ea; border: 1px solid #38444d; border-radius: 8px;
      padding: 6px 8px; font-size: 12px; width: 100%; outline: none;
    }
    #${PANEL_ID} .xat-field input:focus, #${PANEL_ID} .xat-field select:focus { border-color: #1d9bf0; }
    #${PANEL_ID} .xat-2col { display: grid; grid-template-columns: 1fr 1fr; gap: 7px; }
    #${PANEL_ID} .xat-checks { display: grid; grid-template-columns: 1fr 1fr; gap: 5px 8px; }
    #${PANEL_ID} .xat-checks label {
      display: flex; align-items: center; gap: 6px; color: #e7e9ea; font-size: 12px; cursor: pointer;
    }
    #${PANEL_ID} .xat-checks input { accent-color: #1d9bf0; }

    #${PANEL_ID} .xat-exports { display: grid; grid-template-columns: repeat(5, 1fr); gap: 5px; margin-bottom: 6px; }
    #${PANEL_ID} .xat-exports .xat-btn { padding: 7px 0; font-size: 11px; background: #192734; border: 1px solid #38444d; }
    #${PANEL_ID} .xat-copyrow { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; margin-bottom: 8px; }
    #${PANEL_ID} .xat-copyrow .xat-btn { background: #192734; border: 1px solid #38444d; font-size: 12px; }

    #${PANEL_ID} .xat-preview {
      background: #192734; border-radius: 10px; padding: 8px 10px; margin-bottom: 8px;
      color: #8899a6; font-size: 11.5px; max-height: 62px; overflow: hidden;
    }
    #${PANEL_ID} .xat-preview b { color: #e7e9ea; }
    #${PANEL_ID} .xat-log {
      background: #0d1319; border-radius: 10px; padding: 8px 10px;
      font-size: 11px; color: #8899a6; max-height: 76px; overflow-y: auto;
      font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
    }
    #${PANEL_ID} .xat-footer {
      padding: 6px 14px 10px; color: #536471; font-size: 10.5px; text-align: center; flex: 0 0 auto;
    }
    #${PANEL_ID} .xat-footer a { color: #1d9bf0; text-decoration: none; }
    #${PANEL_ID}.xat-min .xat-body, #${PANEL_ID}.xat-min .xat-footer { display: none; }
  </style>
  <div class="xat-header" id="xat-drag">
    <span>🧰 Scraper Toolbox</span>
    <span class="xat-hbtns">
      <button id="xat-minimize" title="Minimize" aria-label="Minimize panel">▁</button>
      <button id="xat-close" title="Close and restore page (data is kept until reload)" aria-label="Close panel">✕</button>
    </span>
  </div>
  <div class="xat-body">
    <div class="xat-statusrow">
      <span class="xat-chip" id="xat-status">idle</span>
      <span id="xat-page" style="color:#8899a6"></span>
      <span class="xat-elapsed" id="xat-elapsed">0s</span>
    </div>
    <div class="xat-counts">
      <div class="xat-count"><b id="xat-captured">0</b><span>captured</span></div>
      <div class="xat-count"><b id="xat-matched">0</b><span>matching</span></div>
      <div class="xat-count"><b id="xat-scrolls">0</b><span>scrolls</span></div>
    </div>
    <div class="xat-progress"><div class="xat-progress-bar" id="xat-bar"></div></div>
    <div class="xat-controls">
      <button class="xat-btn xat-start" id="xat-start">▶ Start</button>
      <button class="xat-btn xat-pause" id="xat-pausebtn" disabled>⏸ Pause</button>
      <button class="xat-btn xat-stop" id="xat-stopbtn" disabled>⏹ Stop</button>
      <button class="xat-btn" id="xat-clear" title="Clear all captured data">🗑</button>
    </div>

    <details open>
      <summary>Scraping</summary>
      <div class="xat-fields">
        <div class="xat-2col">
          <div class="xat-field">
            <label for="xat-target">Target posts (0 = no limit)</label>
            <input type="number" id="xat-target" min="0" step="10">
          </div>
          <div class="xat-field">
            <label for="xat-delay">Scroll delay (ms)</label>
            <input type="number" id="xat-delay" min="400" step="100">
          </div>
        </div>
        <div class="xat-2col">
          <div class="xat-field">
            <label for="xat-maxscrolls">Max scrolls</label>
            <input type="number" id="xat-maxscrolls" min="1" step="10">
          </div>
          <div class="xat-field">
            <label for="xat-stall">Stop after N empty scrolls</label>
            <input type="number" id="xat-stall" min="2" step="1">
          </div>
        </div>
        <div class="xat-checks">
          <label><input type="checkbox" id="xat-autojson"> Auto-download JSON when done</label>
        </div>
      </div>
    </details>

    <details>
      <summary>Filters</summary>
      <div class="xat-fields">
        <div class="xat-field">
          <label for="xat-inc">Must contain keywords (comma separated)</label>
          <input type="text" id="xat-inc" placeholder="e.g. ai, launch, update">
        </div>
        <div class="xat-field">
          <label for="xat-exc">Exclude keywords</label>
          <input type="text" id="xat-exc" placeholder="e.g. giveaway, promo">
        </div>
        <div class="xat-field">
          <label for="xat-onlyusers">Only these users (@handles)</label>
          <input type="text" id="xat-onlyusers" placeholder="empty = everyone on this timeline">
        </div>
        <div class="xat-field">
          <label for="xat-skipusers">Skip these users (@handles)</label>
          <input type="text" id="xat-skipusers" placeholder="e.g. @spamacct, @bot123">
        </div>
        <div class="xat-2col">
          <div class="xat-field">
            <label for="xat-minlikes">Min likes</label>
            <input type="number" id="xat-minlikes" min="0">
          </div>
          <div class="xat-field">
            <label for="xat-minrts">Min reposts</label>
            <input type="number" id="xat-minrts" min="0">
          </div>
        </div>
        <div class="xat-2col">
          <div class="xat-field">
            <label for="xat-minviews">Min views</label>
            <input type="number" id="xat-minviews" min="0">
          </div>
          <div class="xat-field">
            <label for="xat-days">Last N days (0 = all)</label>
            <input type="number" id="xat-days" min="0">
          </div>
        </div>
        <div class="xat-2col">
          <div class="xat-field">
            <label for="xat-media">Media</label>
            <select id="xat-media">
              <option value="all">All posts</option>
              <option value="with-media">With media only</option>
              <option value="without-media">Text only</option>
            </select>
          </div>
          <div class="xat-field">
            <label for="xat-lang">Language code (e.g. en)</label>
            <input type="text" id="xat-lang" placeholder="empty = all">
          </div>
        </div>
        <div class="xat-checks">
          <label><input type="checkbox" id="xat-nort"> No reposts</label>
          <label><input type="checkbox" id="xat-noreply"> No replies</label>
          <label><input type="checkbox" id="xat-noquote"> No quotes</label>
          <label><input type="checkbox" id="xat-nopin"> No pinned</label>
        </div>
      </div>
    </details>

    <details open>
      <summary>Export</summary>
      <div class="xat-fields">
        <div class="xat-exports">
          <button class="xat-btn" data-export="json">JSON</button>
          <button class="xat-btn" data-export="csv">CSV</button>
          <button class="xat-btn" data-export="markdown">MD</button>
          <button class="xat-btn" data-export="text">TXT</button>
          <button class="xat-btn" data-export="html">HTML</button>
        </div>
        <div class="xat-copyrow">
          <button class="xat-btn" id="xat-copyjson">📋 Copy JSON</button>
          <button class="xat-btn" id="xat-copytext">📋 Copy clear text</button>
        </div>
      </div>
    </details>

    <div class="xat-preview" id="xat-preview">No posts captured yet. Press ▶ Start, or just scroll the page yourself.</div>
    <div class="xat-log" id="xat-log"></div>
  </div>
  <div class="xat-footer">
    <a href="https://github.com/nirholas/XActions" target="_blank" rel="noopener">XActions</a> Scraper Toolbox v${VERSION}
  </div>`;

  function buildPanel() {
    const existing = document.getElementById(PANEL_ID);
    if (existing) existing.remove();

    panel = document.createElement('div');
    panel.id = PANEL_ID;
    panel.innerHTML = PANEL_HTML;
    document.body.appendChild(panel);

    if (config.ui.left !== null) {
      panel.style.left = config.ui.left + 'px';
      panel.style.top = config.ui.top + 'px';
    } else {
      panel.style.right = '20px';
      panel.style.top = config.ui.top + 'px';
    }

    const $ = (id) => panel.querySelector('#' + id);
    els = {
      status: $('xat-status'), page: $('xat-page'), elapsed: $('xat-elapsed'),
      captured: $('xat-captured'), matched: $('xat-matched'), scrolls: $('xat-scrolls'),
      bar: $('xat-bar'),
      start: $('xat-start'), pause: $('xat-pausebtn'), stop: $('xat-stopbtn'), clear: $('xat-clear'),
      target: $('xat-target'), delay: $('xat-delay'), maxscrolls: $('xat-maxscrolls'), stall: $('xat-stall'),
      autojson: $('xat-autojson'),
      inc: $('xat-inc'), exc: $('xat-exc'), onlyusers: $('xat-onlyusers'), skipusers: $('xat-skipusers'),
      minlikes: $('xat-minlikes'), minrts: $('xat-minrts'), minviews: $('xat-minviews'), days: $('xat-days'),
      media: $('xat-media'), lang: $('xat-lang'),
      nort: $('xat-nort'), noreply: $('xat-noreply'), noquote: $('xat-noquote'), nopin: $('xat-nopin'),
      preview: $('xat-preview'), log: $('xat-log')
    };

    els.page.textContent = '/' + pageLabel();
    applyConfigToUI();

    // Controls
    els.start.addEventListener('click', start);
    els.pause.addEventListener('click', togglePause);
    els.stop.addEventListener('click', stop);
    els.clear.addEventListener('click', clearData);
    $('xat-minimize').addEventListener('click', () => panel.classList.toggle('xat-min'));
    $('xat-close').addEventListener('click', destroy);
    $('xat-copyjson').addEventListener('click', () => copyAs('json'));
    $('xat-copytext').addEventListener('click', () => copyAs('text'));
    panel.querySelectorAll('[data-export]').forEach((btn) =>
      btn.addEventListener('click', () => exportAs(btn.dataset.export)));

    // Any input change re-reads config, persists it, and refreshes counters
    panel.querySelectorAll('input, select').forEach((el) =>
      el.addEventListener('change', () => { readConfigFromUI(); saveConfig(); updateStats(); }));

    // Drag
    const header = $('xat-drag');
    let drag = null;
    header.addEventListener('mousedown', (e) => {
      if (e.target.tagName === 'BUTTON') return;
      const rect = panel.getBoundingClientRect();
      drag = { dx: e.clientX - rect.left, dy: e.clientY - rect.top };
      e.preventDefault();
    });
    document.addEventListener('mousemove', onDragMove);
    document.addEventListener('mouseup', onDragEnd);
    function onDragMove(e) {
      if (!drag) return;
      const left = Math.max(0, Math.min(window.innerWidth - 60, e.clientX - drag.dx));
      const top = Math.max(0, Math.min(window.innerHeight - 40, e.clientY - drag.dy));
      panel.style.left = left + 'px';
      panel.style.top = top + 'px';
      panel.style.right = 'auto';
    }
    function onDragEnd() {
      if (!drag) return;
      drag = null;
      const rect = panel.getBoundingClientRect();
      config.ui.left = Math.round(rect.left);
      config.ui.top = Math.round(rect.top);
      saveConfig();
    }
    panel.__dragCleanup = () => {
      document.removeEventListener('mousemove', onDragMove);
      document.removeEventListener('mouseup', onDragEnd);
    };
  }

  function applyConfigToUI() {
    const f = config.filters;
    els.target.value = config.targetCount;
    els.delay.value = config.scrollDelay;
    els.maxscrolls.value = config.maxScrolls;
    els.stall.value = config.stallLimit;
    els.autojson.checked = config.autoDownloadJson;
    els.inc.value = f.includeKeywords.join(', ');
    els.exc.value = f.excludeKeywords.join(', ');
    els.onlyusers.value = f.onlyUsers.map((u) => '@' + u).join(', ');
    els.skipusers.value = f.excludeUsers.map((u) => '@' + u).join(', ');
    els.minlikes.value = f.minLikes;
    els.minrts.value = f.minRetweets;
    els.minviews.value = f.minViews;
    els.days.value = f.daysBack;
    els.media.value = f.mediaFilter;
    els.lang.value = f.lang;
    els.nort.checked = f.excludeRetweets;
    els.noreply.checked = f.excludeReplies;
    els.noquote.checked = f.excludeQuotes;
    els.nopin.checked = f.excludePinned;
  }

  function readConfigFromUI() {
    const num = (el, min, fallback) => {
      const v = parseInt(el.value, 10);
      return Number.isFinite(v) && v >= min ? v : fallback;
    };
    config.targetCount = num(els.target, 0, DEFAULT_CONFIG.targetCount);
    config.scrollDelay = num(els.delay, 400, DEFAULT_CONFIG.scrollDelay);
    config.maxScrolls = num(els.maxscrolls, 1, DEFAULT_CONFIG.maxScrolls);
    config.stallLimit = num(els.stall, 2, DEFAULT_CONFIG.stallLimit);
    config.autoDownloadJson = els.autojson.checked;
    const f = config.filters;
    f.includeKeywords = csvList(els.inc.value);
    f.excludeKeywords = csvList(els.exc.value);
    f.onlyUsers = csvList(els.onlyusers.value);
    f.excludeUsers = csvList(els.skipusers.value);
    f.minLikes = num(els.minlikes, 0, 0);
    f.minRetweets = num(els.minrts, 0, 0);
    f.minViews = num(els.minviews, 0, 0);
    f.daysBack = num(els.days, 0, 0);
    f.mediaFilter = els.media.value;
    f.lang = els.lang.value.trim().toLowerCase();
    f.excludeRetweets = els.nort.checked;
    f.excludeReplies = els.noreply.checked;
    f.excludeQuotes = els.noquote.checked;
    f.excludePinned = els.nopin.checked;
  }

  // ==========================================
  // UI UPDATES
  // ==========================================

  function setStatus(status) {
    state.status = status;
    if (!els.status) return;
    els.status.textContent = status;
    els.status.className = 'xat-chip ' + status;
    const running = status === 'running';
    const paused = status === 'paused';
    els.start.disabled = running || paused;
    els.pause.disabled = !running && !paused;
    els.pause.textContent = paused ? '▶ Resume' : '⏸ Pause';
    els.stop.disabled = !running && !paused;
  }

  function updateStats() {
    if (!els.captured) return;
    const matched = matchedTweets().length;
    els.captured.textContent = fmtInt(store.size);
    els.matched.textContent = fmtInt(matched);
    els.scrolls.textContent = fmtInt(state.scrolls);
    const target = config.targetCount;
    els.bar.style.width = target > 0 ? Math.min(100, (matched / target) * 100) + '%' : (store.size > 0 ? '100%' : '0%');
  }

  function previewLatest() {
    if (!els.preview) return;
    let t = null;
    for (const v of store.values()) t = v; // last inserted record
    if (!t) return;
    const snippet = (t.text || '(media only)').replace(/\s+/g, ' ').slice(0, 120);
    els.preview.innerHTML = `<b>@${escapeHtml(t.author.handle)}</b> · ${escapeHtml(snippet)}`;
  }

  function log(msg) {
    console.log(`${TAG} ${msg}`);
    if (!els.log) return;
    const line = document.createElement('div');
    line.textContent = `${new Date().toTimeString().slice(0, 8)} ${msg}`;
    els.log.prepend(line);
    while (els.log.children.length > 40) els.log.lastChild.remove();
  }

  // ==========================================
  // SCROLL ENGINE
  // ==========================================

  let runToken = 0; // invalidates a running loop after stop/clear/destroy

  async function start() {
    if (state.status === 'running' || state.status === 'paused') return;
    readConfigFromUI();
    saveConfig();
    state.scrolls = 0;
    state.stalls = 0;
    state.startedAt = Date.now();
    state.elapsedBefore = 0;
    state.lastChangeCount = store.size;
    setStatus('running');
    log(`Run started on /${pageLabel()} (target: ${config.targetCount || 'unlimited'}).`);
    const token = ++runToken;

    domSweep(); // catch what's already rendered

    while (token === runToken && !state.destroyed) {
      if (state.status === 'paused') { await sleep(250); continue; }
      if (state.status !== 'running') break;

      const matched = matchedTweets().length;
      if (config.targetCount > 0 && matched >= config.targetCount) {
        finishRun(`Target reached: ${matched} matching posts.`);
        break;
      }
      if (state.scrolls >= config.maxScrolls) {
        finishRun(`Max scrolls (${config.maxScrolls}) reached with ${matched} matching posts.`);
        break;
      }

      // Scroll with light jitter so loading keeps up
      const el = document.scrollingElement || document.documentElement;
      el.scrollTop = el.scrollHeight;
      state.scrolls++;
      await sleep(config.scrollDelay + Math.floor(Math.random() * 400));
      if (token !== runToken || state.destroyed) break;

      domSweep();

      if (store.size === state.lastChangeCount) {
        state.stalls++;
        if (state.stalls >= config.stallLimit) {
          finishRun(`End of timeline: nothing new after ${config.stallLimit} scrolls (${matchedTweets().length} matching posts).`);
          break;
        }
      } else {
        state.stalls = 0;
        state.lastChangeCount = store.size;
      }
      updateStats();
    }
  }

  function togglePause() {
    if (state.status === 'running') {
      state.elapsedBefore += Date.now() - state.startedAt;
      setStatus('paused');
      log('Paused. Capture stays live; scrolling is halted.');
    } else if (state.status === 'paused') {
      state.startedAt = Date.now();
      setStatus('running');
      log('Resumed.');
    }
  }

  function stop() {
    if (state.status !== 'running' && state.status !== 'paused') return;
    runToken++;
    finishRun(`Stopped manually with ${matchedTweets().length} matching posts.`);
  }

  function finishRun(message) {
    if (state.status === 'paused') state.startedAt = Date.now();
    state.elapsedBefore += Date.now() - state.startedAt;
    setStatus('done');
    updateStats();
    log(message);
    log('Adjust filters freely, then export: results always reflect current filters.');
    if (config.autoDownloadJson && matchedTweets().length > 0) exportAs('json');
  }

  function clearData() {
    runToken++;
    store.clear();
    state.scrolls = 0;
    state.stalls = 0;
    state.elapsedBefore = 0;
    state.startedAt = null;
    setStatus('idle');
    updateStats();
    if (els.preview) els.preview.textContent = 'Cleared. Press ▶ Start to scrape again.';
    log('All captured data cleared.');
  }

  // ==========================================
  // TICKER
  // ==========================================

  const ticker = setInterval(() => {
    if (state.destroyed || !els.elapsed) return;
    let ms = state.elapsedBefore;
    if (state.status === 'running' && state.startedAt) ms += Date.now() - state.startedAt;
    els.elapsed.textContent = fmtElapsed(ms);
  }, 500);

  // ==========================================
  // LIFECYCLE
  // ==========================================

  function destroy() {
    state.destroyed = true;
    runToken++;
    clearInterval(ticker);
    removeInterceptor();
    if (panel) {
      if (panel.__dragCleanup) panel.__dragCleanup();
      panel.remove();
      panel = null;
    }
    delete window.XActionsToolbox;
    console.log(`${TAG} Closed. fetch/XHR restored. Paste the script again to reopen.`);
  }

  // ==========================================
  // BOOT
  // ==========================================

  if (!/(^|\.)x\.com$|(^|\.)twitter\.com$/.test(location.hostname)) {
    console.warn(`${TAG} This script must run on x.com. Open a profile or timeline there and paste again.`);
    return;
  }

  installInterceptor();
  buildPanel();
  setStatus('idle');
  updateStats();
  log(`Toolbox v${VERSION} ready on /${pageLabel()}. Capture is live even before you press Start.`);

  window.XActionsToolbox = {
    version: VERSION,
    tweets: allTweets,
    matched: matchedTweets,
    export: exportAs,
    copy: copyAs,
    start,
    pause: togglePause,
    stop,
    clear: clearData,
    destroy,
    config
  };
})();

});
  register("send-direct-message", function(){
var CONFIG = {
  // Target users to message
  targetUsers: [
    // 'username1',
    // 'username2',
  ],
  
  // Message template
  // Use {username} as placeholder for recipient's name
  messageTemplate: `Hey {username}! 👋

Just wanted to reach out and connect.

Best,
[Your Name]`,
  
  // Limits
  limits: {
    messagesPerSession: 10,
    delayBetweenMessages: 30000, // 30 seconds (be careful!)
  },
  
  // Options
  options: {
    skipIfConversationExists: true, // Don't message if already in conversation
    randomizeDelay: true,           // Add randomness to delays
  },
};
try{if(typeof window!=='undefined'&&window.__XA_LAUNCH_CFG){Object.assign(CONFIG,window.__XA_LAUNCH_CFG);}}catch(_xa){}


/**
 * ============================================================
 * 🚀 SCRIPT START - by nichxbt
 * ============================================================
 */

(async function sendDirectMessage() {
  const sleep = (ms) => new Promise(r => setTimeout(r, ms));
  // Set an input's value through the native setter so React's value tracker
  // registers the change (direct .value assignment gets ignored by React).
  const setNativeValue = (el, value) => {
    const desc = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(el), 'value');
    if (desc && desc.set) desc.set.call(el, value);
    else el.value = value;
  };
  const randomDelay = (base) => {
    if (CONFIG.options.randomizeDelay) {
      return sleep(base + Math.random() * base * 0.5);
    }
    return sleep(base);
  };
  
  // DOM Selectors
  const SELECTORS = {
    newMessageBtn: '[data-testid="NewDM_Button"]',
    searchInput: '[data-testid="searchPeople"]',
    userCell: '[data-testid="UserCell"]',
    messageInput: '[data-testid="dmComposerTextInput"]',
    sendButton: '[data-testid="dmComposerSendButton"]',
    conversationList: '[data-testid="conversation"]',
    backButton: '[data-testid="app-bar-back"]',
  };
  
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║  💬 SEND DIRECT MESSAGES                                   ║');
  console.log('║  by nichxbt - https://github.com/nirholas/XActions         ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log('');
  console.log('⚠️ WARNING: Use responsibly! Mass DMing can get you restricted.');
  console.log('');
  
  // State
  const state = {
    isRunning: false,
    stats: { sent: 0, failed: 0, skipped: 0 },
    messageLog: [],
  };
  
  // Storage for tracking sent messages
  const storage = {
    get: (key) => {
      try { return JSON.parse(localStorage.getItem(`xactions_dm_${key}`) || 'null'); }
      catch { return null; }
    },
    set: (key, value) => {
      localStorage.setItem(`xactions_dm_${key}`, JSON.stringify(value));
    }
  };
  
  // Get sent messages history
  const getSentHistory = () => storage.get('sent') || [];
  const markAsSent = (username) => {
    const history = getSentHistory();
    if (!history.includes(username)) {
      history.push(username);
      storage.set('sent', history);
    }
  };
  
  // Create XActions interface
  window.XActions = window.XActions || {};
  window.XActions.DM = {
    config: CONFIG,
    state,
    
    // Send DM to a single user
    sendTo: async (username, customMessage = null) => {
      const cleanUsername = username.replace('@', '').toLowerCase();
      // split/join instead of .replace() so every occurrence of the
      // placeholder is substituted, not just the first one.
      const message = customMessage || CONFIG.messageTemplate.split('{username}').join(cleanUsername);
      
      console.log(`💬 Sending DM to @${cleanUsername}...`);
      
      // Check if already messaged
      if (getSentHistory().includes(cleanUsername)) {
        console.log(`⏭️ Already messaged @${cleanUsername}, skipping.`);
        state.stats.skipped++;
        return false;
      }
      
      try {
        // Click new message button
        const newMsgBtn = document.querySelector(SELECTORS.newMessageBtn);
        if (newMsgBtn) {
          newMsgBtn.click();
          await sleep(1500);
        }
        
        // Search for user
        const searchInput = document.querySelector(SELECTORS.searchInput);
        if (!searchInput) {
          console.error('❌ Search input not found. Are you on Messages page?');
          return false;
        }
        
        // Type username
        searchInput.focus();
        setNativeValue(searchInput, cleanUsername);
        searchInput.dispatchEvent(new Event('input', { bubbles: true }));
        await sleep(2000);
        
        // Click on user - match the exact @handle so a prefix like "john"
        // can't select "johnny" (wrong DM recipient)
        const userCells = document.querySelectorAll(SELECTORS.userCell);
        const handleRe = new RegExp('@' + cleanUsername.replace(/[.*+?^${}()|[\]\\]/g, '\\/* __XA_INJECT_DATA__ */') + '(?![a-zA-Z0-9_])', 'i');
        let found = false;

        for (const cell of userCells) {
          if (handleRe.test(cell.textContent)) {
            cell.click();
            found = true;
            await sleep(1500);
            break;
          }
        }
        
        if (!found) {
          console.error(`❌ User @${cleanUsername} not found.`);
          state.stats.failed++;
          return false;
        }
        
        // Click Next if present
        const nextBtn = document.querySelector('[data-testid="nextButton"]');
        if (nextBtn) {
          nextBtn.click();
          await sleep(1500);
        }
        
        // Type message
        const msgInput = document.querySelector(SELECTORS.messageInput);
        if (!msgInput) {
          console.error('❌ Message input not found.');
          state.stats.failed++;
          return false;
        }
        
        msgInput.focus();
        
        // Use execCommand for better compatibility
        document.execCommand('insertText', false, message);
        
        await sleep(1000);
        
        // Send message
        const sendBtn = document.querySelector(SELECTORS.sendButton);
        if (sendBtn && !sendBtn.disabled) {
          sendBtn.click();
          await sleep(1500);
          
          markAsSent(cleanUsername);
          state.stats.sent++;
          state.messageLog.push({
            to: cleanUsername,
            message,
            timestamp: new Date().toISOString(),
          });
          
          console.log(`✅ Message sent to @${cleanUsername}!`);
          return true;
        } else {
          console.error('❌ Send button not available.');
          state.stats.failed++;
          return false;
        }
        
      } catch (e) {
        console.error(`❌ Error sending to @${cleanUsername}:`, e.message);
        state.stats.failed++;
        return false;
      }
    },
    
    // Send to all target users
    sendToAll: async () => {
      if (CONFIG.targetUsers.length === 0) {
        console.error('❌ No target users configured!');
        return;
      }
      
      console.log(`🚀 Starting to send DMs to ${CONFIG.targetUsers.length} users...`);
      console.log(`⏱️ Delay between messages: ${CONFIG.limits.delayBetweenMessages / 1000}s`);
      console.log('');
      
      state.isRunning = true;

      for (let i = 0; i < CONFIG.targetUsers.length; i++) {
        if (!state.isRunning) break;
        if (state.stats.sent >= CONFIG.limits.messagesPerSession) {
          console.log(`🛑 Reached limit of ${CONFIG.limits.messagesPerSession} messages.`);
          break;
        }

        await window.XActions.DM.sendTo(CONFIG.targetUsers[i]);

        // Use the loop index, not indexOf(), so a duplicate username in
        // targetUsers can't make this resolve to the wrong (earlier) entry
        // and skip the delay before the real last message.
        if (state.isRunning && i < CONFIG.targetUsers.length - 1) {
          console.log(`⏳ Waiting ${CONFIG.limits.delayBetweenMessages / 1000}s before next message...`);
          await randomDelay(CONFIG.limits.delayBetweenMessages);
        }
      }
      
      console.log('');
      console.log('╔════════════════════════════════════════════════════════════╗');
      console.log('║  🎉 DM SESSION COMPLETE!                                   ║');
      console.log('╚════════════════════════════════════════════════════════════╝');
      window.XActions.DM.stats();
    },
    
    // Add user to target list
    addUser: (username) => {
      const clean = username.replace('@', '').toLowerCase();
      if (!CONFIG.targetUsers.includes(clean)) {
        CONFIG.targetUsers.push(clean);
        console.log(`✅ Added @${clean} to DM list`);
      }
    },
    
    // Set message template
    setMessage: (template) => {
      CONFIG.messageTemplate = template;
      console.log('✅ Message template updated.');
      console.log('Preview:', template.replace('{username}', 'example'));
    },
    
    // Stop
    stop: () => {
      state.isRunning = false;
      console.log('🛑 Stopped.');
    },
    
    // Stats
    stats: () => {
      console.log('');
      console.log('📊 DM STATS:');
      console.log(`   ✅ Sent: ${state.stats.sent}`);
      console.log(`   ❌ Failed: ${state.stats.failed}`);
      console.log(`   ⏭️ Skipped: ${state.stats.skipped}`);
      console.log(`   📜 Total messaged (all time): ${getSentHistory().length}`);
      console.log('');
    },
    
    // View message log
    log: () => {
      console.log('');
      console.log('📜 MESSAGE LOG:');
      state.messageLog.forEach(m => {
        console.log(`   → @${m.to} at ${m.timestamp}`);
      });
      console.log('');
    },
    
    // Clear sent history
    clearHistory: () => {
      if (confirm('⚠️ Clear all sent message history?')) {
        storage.set('sent', []);
        console.log('✅ History cleared.');
      }
    },
    
    // Help
    help: () => {
      console.log('');
      console.log('📋 DM COMMANDS:');
      console.log('');
      console.log('   XActions.DM.addUser("username")');
      console.log('   XActions.DM.setMessage("Your message {username}")');
      console.log('   XActions.DM.sendTo("username")');
      console.log('   XActions.DM.sendToAll()');
      console.log('   XActions.DM.stop()');
      console.log('   XActions.DM.stats()');
      console.log('   XActions.DM.log()');
      console.log('   XActions.DM.clearHistory()');
      console.log('');
      console.log('💡 Use {username} in message template as placeholder.');
      console.log('⚠️ Always be respectful and don\'t spam!');
      console.log('');
    }
  };
  
  console.log('✅ Direct Message Helper loaded!');
  console.log('   Run XActions.DM.help() for commands.');
  console.log('');
})();

});
  register("smart-unfollow", function(){
var CONFIG = {
  // ---- TIMING ----
  
  // Days to wait before unfollowing non-followers
  // 💡 Give users time to follow back!
  daysToWait: 3,
  
  // ---- LIMITS ----
  
  // Maximum unfollows per session
  maxUnfollows: 30,
  
  // ---- PROTECTION ----
  
  // Usernames to NEVER unfollow
  // 💡 Add important accounts here
  whitelist: [
    // 'elonmusk',
    // 'naval',
  ],
  
  // Only unfollow users tracked by keyword-follow
  // 💡 Set to false to unfollow any non-follower past grace period
  onlyTracked: true,
  
  // Dry run mode - just show who would be unfollowed
  dryRun: false,
  
  // ---- TIMING ----
  
  unfollowDelay: 1500,
  confirmDelay: 1000,
  scrollDelay: 2000,
  maxScrolls: 100,
  maxRetries: 5
};
try{if(typeof window!=='undefined'&&window.__XA_LAUNCH_CFG){Object.assign(CONFIG,window.__XA_LAUNCH_CFG);}}catch(_xa){}


/**
 * ============================================================
 * 🚀 SCRIPT START
 * ============================================================
 */

(async function smartUnfollow() {
  const sleep = (ms) => new Promise(r => setTimeout(r, ms));
  
  const $userCell = '[data-testid="UserCell"]';
  const $unfollowBtn = '[data-testid$="-unfollow"]';
  const $confirmBtn = '[data-testid="confirmationSheetConfirm"]';
  const $followsYou = '[data-testid="userFollowIndicator"]';
  
  const TRACKING_KEY = 'xactions_follow_tracking';
  const FOLLOWERS_KEY = 'xactions_my_current_followers';
  // Shared with protect-active-users.js and whitelist.js so a user marked
  // protected/whitelisted by either script is never touched here.
  const PROTECTED_KEY = 'xactions_protected_users';
  const WHITELIST_KEY = 'xactions_whitelist';
  
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║  🧠 SMART UNFOLLOW                                         ║');
  console.log('║  by nichxbt - https://github.com/nirholas/XActions         ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log('');
  
  // Detect page type
  const url = window.location.href;
  const isFollowersPage = url.includes('/followers');
  const isFollowingPage = url.includes('/following');
  
  if (!isFollowersPage && !isFollowingPage) {
    console.error('❌ ERROR: Must be on your followers or following page!');
    console.log('📍 Step 1: https://x.com/YOUR_USERNAME/followers');
    console.log('📍 Step 2: https://x.com/YOUR_USERNAME/following');
    return;
  }
  
  /**
   * Get username from cell
   */
  function getUsername(cell) {
    const link = cell.querySelector('a[href^="/"]');
    return link ? link.getAttribute('href').replace('/', '').split('/')[0] : null;
  }
  
  // ==========================================
  // PHASE 1: Scan followers
  // ==========================================
  
  if (isFollowersPage) {
    console.log('📋 PHASE 1: Scanning your followers...');
    console.log('');
    
    const followers = new Set();
    let lastCount = 0;
    let retries = 0;
    let scrolls = 0;
    
    while (scrolls < CONFIG.maxScrolls && retries < CONFIG.maxRetries) {
      document.querySelectorAll($userCell).forEach(cell => {
        const username = getUsername(cell);
        if (username) followers.add(username);
      });
      
      if (followers.size === lastCount) {
        retries++;
      } else {
        retries = 0;
        lastCount = followers.size;
      }
      
      console.log(`📊 Found ${followers.size} followers...`);
      
      window.scrollTo(0, document.body.scrollHeight);
      await sleep(CONFIG.scrollDelay);
      scrolls++;
    }
    
    // Save followers
    localStorage.setItem(FOLLOWERS_KEY, JSON.stringify({
      savedAt: new Date().toISOString(),
      followers: [...followers]
    }));
    
    console.log('');
    console.log('╔════════════════════════════════════════════════════════════╗');
    console.log('║  ✅ PHASE 1 COMPLETE!                                      ║');
    console.log('╚════════════════════════════════════════════════════════════╝');
    console.log(`📊 Saved ${followers.size} followers`);
    console.log('');
    console.log('👉 Now go to your FOLLOWING page and run this script again!');
    console.log('   https://x.com/YOUR_USERNAME/following');
    console.log('');
    
    return { phase: 1, followers: followers.size };
  }
  
  // ==========================================
  // PHASE 2: Unfollow non-followers
  // ==========================================
  
  console.log('📋 PHASE 2: Unfollowing non-followers...');
  console.log(`⏱️ Grace period: ${CONFIG.daysToWait} days`);
  console.log(`📊 Max unfollows: ${CONFIG.maxUnfollows}`);
  if (CONFIG.dryRun) console.log('🔍 DRY RUN MODE - no actual unfollows');
  console.log('');
  
  // Load followers
  let myFollowers = new Set();
  try {
    const saved = localStorage.getItem(FOLLOWERS_KEY);
    if (saved) {
      const data = JSON.parse(saved);
      data.followers.forEach(u => myFollowers.add(u));
      console.log(`📚 Loaded ${myFollowers.size} followers from Phase 1`);
    }
  } catch (e) {}
  
  if (myFollowers.size === 0) {
    console.warn('⚠️ No followers data found!');
    console.log('👉 Run this script on your FOLLOWERS page first!');
    return;
  }
  
  // Load tracking data
  let trackingData = {};
  try {
    const saved = localStorage.getItem(TRACKING_KEY);
    if (saved) trackingData = JSON.parse(saved);
    console.log(`📚 Loaded ${Object.keys(trackingData).length} tracked follows`);
  } catch (e) {}

  // Load protected users (from protect-active-users.js: engaged likers/
  // repliers/retweeters) and the shared whitelist (from whitelist.js) so
  // both lists are respected here too, not just CONFIG.whitelist.
  const protectedUsers = new Set();
  try {
    const saved = localStorage.getItem(PROTECTED_KEY);
    if (saved) {
      const data = JSON.parse(saved);
      (data.users || []).forEach(u => u.username && protectedUsers.add(u.username.toLowerCase()));
    }
  } catch (e) {}
  try {
    const saved = localStorage.getItem(WHITELIST_KEY);
    if (saved) {
      const list = JSON.parse(saved);
      (Array.isArray(list) ? list : []).forEach(u => u.username && protectedUsers.add(u.username.toLowerCase()));
    }
  } catch (e) {}
  if (protectedUsers.size > 0) {
    console.log(`🛡️ Loaded ${protectedUsers.size} protected/whitelisted users (never unfollowed)`);
  }

  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - CONFIG.daysToWait);
  
  let totalUnfollowed = 0;
  let scrolls = 0;
  let retries = 0;
  const seenUsers = new Set();

  console.log('');
  console.log('🚀 Scanning following list...');
  console.log('');

  while (totalUnfollowed < CONFIG.maxUnfollows && scrolls < CONFIG.maxScrolls && retries < CONFIG.maxRetries) {
    const cells = document.querySelectorAll($userCell);
    let newUsersThisPass = 0;

    for (const cell of cells) {
      if (totalUnfollowed >= CONFIG.maxUnfollows) break;

      const username = getUsername(cell);
      if (!username) continue;

      // Progress = new accounts appearing in the list, not just unfollow
      // candidates. A run of mutuals must not end the session early.
      if (!seenUsers.has(username)) {
        seenUsers.add(username);
        newUsersThisPass++;
      }

      // Skip whitelist (inline CONFIG list + shared whitelist.js / protect-active-users.js lists)
      if (CONFIG.whitelist.includes(username.toLowerCase())) continue;
      if (protectedUsers.has(username.toLowerCase())) continue;

      // Check if follows you
      if (myFollowers.has(username) || cell.querySelector($followsYou)) {
        continue; // Mutual - keep
      }
      
      // Check tracking
      const tracking = trackingData[username];
      
      if (CONFIG.onlyTracked && !tracking) {
        continue; // Not tracked, skip
      }
      
      // Check grace period
      if (tracking) {
        const followedDate = new Date(tracking.followedAt);
        if (followedDate > cutoffDate) {
          continue; // Still in grace period
        }
      }
      
      // This user should be unfollowed
      const unfollowBtn = cell.querySelector($unfollowBtn);
      if (!unfollowBtn) continue;

      if (CONFIG.dryRun) {
        console.log(`🔍 Would unfollow: @${username}`);
        totalUnfollowed++;
        continue;
      }
      
      try {
        unfollowBtn.click();
        await sleep(500);
        
        const confirmBtn = document.querySelector($confirmBtn);
        if (confirmBtn) {
          confirmBtn.click();
          totalUnfollowed++;
          
          console.log(`🚫 Unfollowed #${totalUnfollowed}: @${username}`);
          
          // Remove from tracking
          if (tracking) {
            delete trackingData[username];
            localStorage.setItem(TRACKING_KEY, JSON.stringify(trackingData));
          }
          
          await sleep(CONFIG.confirmDelay);
        }
        
        await sleep(CONFIG.unfollowDelay);
        
      } catch (e) {
        console.warn('⚠️ Error:', e.message);
      }
    }
    
    if (newUsersThisPass === 0) {
      retries++;
    } else {
      retries = 0;
    }

    window.scrollTo(0, document.body.scrollHeight);
    await sleep(CONFIG.scrollDelay);
    scrolls++;
  }
  
  console.log('');
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║  ✅ SMART UNFOLLOW COMPLETE!                               ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log(`🚫 Total unfollowed: ${totalUnfollowed}`);
  console.log('');
  
  return { phase: 2, unfollowed: totalUnfollowed };
})();

});
  register("thread-unroller", function(){
var CONFIG = {
  // Output format: 'markdown', 'text', 'json'
  format: 'markdown',
  
  // Include media URLs
  includeMedia: true,
  
  // Include engagement stats
  includeStats: true,
  
  // Maximum tweets to extract
  maxTweets: 50,
  
  // Scroll delay
  scrollDelay: 1500,
  
  // Auto-download
  autoDownload: true,
  
  // Copy to clipboard
  copyToClipboard: true
};
try{if(typeof window!=='undefined'&&window.__XA_LAUNCH_CFG){Object.assign(CONFIG,window.__XA_LAUNCH_CFG);}}catch(_xa){}


/**
 * ============================================================
 * 🚀 SCRIPT START
 * ============================================================
 */

(async function threadUnroller() {
  const sleep = (ms) => new Promise(r => setTimeout(r, ms));
  
  const $tweet = 'article[data-testid="tweet"]';
  const $tweetText = '[data-testid="tweetText"]';
  
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║  📜 THREAD UNROLLER                                        ║');
  console.log('║  by nichxbt - https://github.com/nirholas/XActions         ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log('');
  
  // Verify page
  if (!window.location.href.includes('/status/')) {
    console.error('❌ ERROR: Must be on a tweet page!');
    console.log('📍 Go to any tweet in a thread');
    return;
  }
  
  // Get thread author from URL
  const pathMatch = window.location.pathname.match(/^\/([^\/]+)\/status/);
  const threadAuthor = pathMatch ? pathMatch[1].toLowerCase() : null;
  
  if (!threadAuthor) {
    console.error('❌ Could not determine thread author');
    return;
  }
  
  console.log(`👤 Thread author: @${threadAuthor}`);
  console.log(`📋 Format: ${CONFIG.format}`);
  console.log('');
  console.log('🚀 Unrolling thread...');
  console.log('');
  
  const tweets = [];
  const seenIds = new Set();
  let scrolls = 0;
  const maxScrolls = 30;
  
  /**
   * Extract tweet data
   */
  function extractTweet(tweetEl) {
    try {
      // Get tweet ID from the timestamp's permalink anchor; the first
      // /status/ link in the article can belong to a quoted tweet
      const timeAnchor = tweetEl.querySelector('time')?.closest('a[href*="/status/"]');
      const link = timeAnchor || tweetEl.querySelector('a[href*="/status/"]');
      if (!link) return null;

      const match = link.href.match(/\/status\/(\d+)/);
      if (!match) return null;

      const tweetId = match[1];
      if (seenIds.has(tweetId)) return null;

      // Check if from thread author
      const authorLink = tweetEl.querySelector('div[data-testid="User-Name"] a[href^="/"]') ||
                         tweetEl.querySelector('a[href^="/"][role="link"]');
      const tweetAuthor = authorLink ? authorLink.getAttribute('href').replace('/', '').split('/')[0].toLowerCase() : null;
      
      if (tweetAuthor !== threadAuthor) return null;
      
      seenIds.add(tweetId);
      
      // Get text
      const textEl = tweetEl.querySelector($tweetText);
      const text = textEl ? textEl.innerText : '';
      
      // Get timestamp
      const timeEl = tweetEl.querySelector('time');
      const timestamp = timeEl ? timeEl.getAttribute('datetime') : null;
      const displayTime = timeEl ? timeEl.innerText : '';
      
      // Get engagement
      const getMetric = (testId) => {
        const el = tweetEl.querySelector(`[data-testid="${testId}"]`);
        const span = el?.querySelector('span span');
        return span ? span.innerText : '0';
      };
      
      // Get images
      const images = [];
      tweetEl.querySelectorAll('[data-testid="tweetPhoto"] img').forEach(img => {
        if (img.src && img.src.includes('pbs.twimg.com')) {
          images.push(img.src);
        }
      });
      
      return {
        id: tweetId,
        url: `https://x.com/${threadAuthor}/status/${tweetId}`,
        text,
        timestamp,
        displayTime,
        metrics: {
          replies: getMetric('reply'),
          retweets: getMetric('retweet'),
          likes: getMetric('like')
        },
        images
      };
      
    } catch (e) {
      return null;
    }
  }
  
  // Scroll and extract
  let lastCount = 0;
  let noNewCount = 0;
  while (tweets.length < CONFIG.maxTweets && scrolls < maxScrolls) {
    document.querySelectorAll($tweet).forEach(el => {
      const tweet = extractTweet(el);
      if (tweet) tweets.push(tweet);
    });

    console.log(`📊 Extracted ${tweets.length} tweets from thread...`);

    // Stop early once scrolling stops producing new tweets
    if (tweets.length === lastCount) {
      noNewCount++;
      if (noNewCount >= 5) {
        console.log('📭 No new tweets after 5 scrolls. End of thread.');
        break;
      }
    } else {
      noNewCount = 0;
      lastCount = tweets.length;
    }

    window.scrollTo(0, document.body.scrollHeight);
    await sleep(CONFIG.scrollDelay);
    scrolls++;
  }
  
  // Sort chronologically (oldest first)
  tweets.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
  
  console.log('');
  console.log(`✅ Extracted ${tweets.length} tweets from @${threadAuthor}'s thread`);
  console.log('');
  
  // Format output
  let output;
  let filename;
  let mimeType;
  
  if (CONFIG.format === 'markdown') {
    let md = `# Thread by @${threadAuthor}\n\n`;
    md += `> Unrolled on ${new Date().toISOString()}\n`;
    md += `> ${tweets.length} tweets\n\n`;
    md += `---\n\n`;
    
    tweets.forEach((t, i) => {
      md += `## ${i + 1}/${tweets.length}\n\n`;
      md += `${t.text}\n\n`;
      
      if (CONFIG.includeMedia && t.images.length > 0) {
        t.images.forEach(img => {
          md += `![Image](${img})\n`;
        });
        md += '\n';
      }
      
      if (CONFIG.includeStats) {
        md += `*${t.displayTime} • ❤️ ${t.metrics.likes} • 🔄 ${t.metrics.retweets} • 💬 ${t.metrics.replies}*\n\n`;
      }
      
      md += `[View tweet](${t.url})\n\n`;
      md += `---\n\n`;
    });
    
    output = md;
    filename = `thread_${threadAuthor}_${Date.now()}.md`;
    mimeType = 'text/markdown';
    
  } else if (CONFIG.format === 'text') {
    let txt = `THREAD BY @${threadAuthor.toUpperCase()}\n`;
    txt += `${'='.repeat(50)}\n`;
    txt += `Unrolled: ${new Date().toISOString()}\n`;
    txt += `Total tweets: ${tweets.length}\n`;
    txt += `${'='.repeat(50)}\n\n`;
    
    tweets.forEach((t, i) => {
      txt += `[${i + 1}/${tweets.length}]\n`;
      txt += `${'-'.repeat(30)}\n`;
      txt += `${t.text}\n\n`;
      
      if (CONFIG.includeStats) {
        txt += `${t.displayTime}\n`;
        txt += `Likes: ${t.metrics.likes} | RTs: ${t.metrics.retweets} | Replies: ${t.metrics.replies}\n`;
      }
      
      txt += `${t.url}\n`;
      txt += `\n${'='.repeat(50)}\n\n`;
    });
    
    output = txt;
    filename = `thread_${threadAuthor}_${Date.now()}.txt`;
    mimeType = 'text/plain';
    
  } else {
    output = JSON.stringify({
      author: threadAuthor,
      unrolledAt: new Date().toISOString(),
      tweetCount: tweets.length,
      tweets
    }, null, 2);
    filename = `thread_${threadAuthor}_${Date.now()}.json`;
    mimeType = 'application/json';
  }
  
  // Download
  if (CONFIG.autoDownload) {
    const blob = new Blob([output], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    console.log(`💾 Downloaded: ${filename}`);
  }
  
  // Copy to clipboard
  if (CONFIG.copyToClipboard) {
    try {
      await navigator.clipboard.writeText(output);
      console.log('📋 Copied to clipboard!');
    } catch (e) {}
  }
  
  // Display preview
  console.log('');
  console.log('📖 Thread preview:');
  tweets.slice(0, 3).forEach((t, i) => {
    console.log(`   ${i + 1}. ${t.text.substring(0, 80)}...`);
  });
  if (tweets.length > 3) {
    console.log(`   ... and ${tweets.length - 3} more tweets`);
  }
  
  console.log('');
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║  ✅ THREAD UNROLLED!                                       ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  
  window.unrolledThread = { author: threadAuthor, tweets };
  console.log('💡 Access via: window.unrolledThread');
  
  return { author: threadAuthor, tweets };
})();

});
  register("unfollow-everyone", function(){
var CONFIG = {
  // Maximum retry attempts when no buttons found
  // 💡 Increase if you have many accounts (takes longer to scroll)
  maxRetries: 5,
  
  // Delay between unfollows (milliseconds)
  // 💡 Increase to 3000-5000 if getting rate limited
  unfollowDelay: 1500,
  
  // Delay after clicking confirm button
  confirmDelay: 1000,
  
  // Delay for scrolling to load more
  scrollDelay: 2000,
  
  // Stop after unfollowing this many (0 = unlimited)
  // 💡 Set to 50-100 for testing first
  maxUnfollows: 0,
  
  // Show confirmation prompt before starting
  confirmStart: true
};
try{if(typeof window!=='undefined'&&window.__XA_LAUNCH_CFG){Object.assign(CONFIG,window.__XA_LAUNCH_CFG);}}catch(_xa){}


/**
 * ============================================================
 * 🚀 SCRIPT START
 * ============================================================
 */

(async function unfollowEveryone() {
  const sleep = (ms) => new Promise(r => setTimeout(r, ms));
  
  // DOM Selectors
  const $unfollowBtn = '[data-testid$="-unfollow"]';
  const $confirmBtn = '[data-testid="confirmationSheetConfirm"]';
  
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║  🚫 UNFOLLOW EVERYONE                                      ║');
  console.log('║  by nichxbt - https://github.com/nirholas/XActions         ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log('');
  
  // Verify we're on the right page
  if (!window.location.href.includes('/following')) {
    console.error('❌ ERROR: You must be on your Following page!');
    console.log('📍 Go to: https://x.com/YOUR_USERNAME/following');
    return;
  }
  
  // Confirmation prompt
  if (CONFIG.confirmStart) {
    const confirmed = confirm(
      '⚠️ WARNING: This will unfollow EVERYONE!\n\n' +
      'Are you sure you want to continue?\n\n' +
      'Click OK to start unfollowing.'
    );
    if (!confirmed) {
      console.log('❌ Cancelled by user.');
      return;
    }
  }
  
  console.log('🚀 Starting mass unfollow...');
  console.log('💡 To stop early: window.stopUnfollow()');
  console.log('');

  let totalUnfollowed = 0;
  let retries = 0;
  let stopped = false;
  window.stopUnfollow = () => {
    stopped = true;
    console.log('🛑 Stopping after the current unfollow...');
  };

  while (retries < CONFIG.maxRetries && !stopped) {
    // Scroll to bottom to load more users
    window.scrollTo(0, document.body.scrollHeight);
    await sleep(CONFIG.scrollDelay);
    
    // Find all unfollow buttons
    const buttons = document.querySelectorAll($unfollowBtn);
    
    if (buttons.length === 0) {
      retries++;
      console.log(`⏳ No buttons found. Retry ${retries}/${CONFIG.maxRetries}...`);
      await sleep(CONFIG.scrollDelay);
      continue;
    }
    
    let confirmedThisPass = 0;

    for (const btn of buttons) {
      if (stopped) break;

      // Check max unfollows limit
      if (CONFIG.maxUnfollows > 0 && totalUnfollowed >= CONFIG.maxUnfollows) {
        console.log(`\n✅ Reached limit of ${CONFIG.maxUnfollows} unfollows!`);
        console.log(`📊 Total unfollowed: ${totalUnfollowed}`);
        delete window.stopUnfollow;
        return { total: totalUnfollowed };
      }
      
      try {
        // Click unfollow button
        btn.click();
        await sleep(500);
        
        // Click confirmation
        const confirmBtn = document.querySelector($confirmBtn);
        if (confirmBtn) {
          confirmBtn.click();
          totalUnfollowed++;
          confirmedThisPass++;
          console.log(`✅ Unfollowed #${totalUnfollowed}`);
          await sleep(CONFIG.confirmDelay);
        }

        await sleep(CONFIG.unfollowDelay);

      } catch (e) {
        console.warn('⚠️ Error unfollowing:', e.message);
      }
    }

    // Only reset retries on real progress; otherwise a button that never
    // confirms would keep this loop spinning forever
    if (confirmedThisPass > 0) {
      retries = 0;
    } else {
      retries++;
      console.log(`⏳ No unfollows confirmed this pass. Retry ${retries}/${CONFIG.maxRetries}...`);
    }
  }

  delete window.stopUnfollow;

  console.log('');
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log(stopped ? '║  🛑 STOPPED BY USER                                        ║' : '║  ✅ COMPLETE!                                              ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log(`📊 Total unfollowed: ${totalUnfollowed}`);
  console.log('');

  return { total: totalUnfollowed };
})();

});
  register("unfollow-non-followers", function(){
var CONFIG = {
  // Maximum retry attempts when no buttons found
  maxRetries: 5,
  
  // Delay between unfollows (milliseconds)
  // 💡 Increase to 3000-5000 if getting rate limited
  unfollowDelay: 1500,
  
  // Delay after clicking confirm button
  confirmDelay: 1000,
  
  // Delay for scrolling to load more
  scrollDelay: 2000,
  
  // Stop after unfollowing this many (0 = unlimited)
  // 💡 Set to 50-100 for testing first
  maxUnfollows: 0,
  
  // Show confirmation prompt before starting
  confirmStart: true,
  
  // Log kept users (mutual followers)
  logKept: true
};
try{if(typeof window!=='undefined'&&window.__XA_LAUNCH_CFG){Object.assign(CONFIG,window.__XA_LAUNCH_CFG);}}catch(_xa){}


/**
 * ============================================================
 * 🚀 SCRIPT START
 * ============================================================
 */

(async function unfollowNonFollowers() {
  const sleep = (ms) => new Promise(r => setTimeout(r, ms));
  
  // DOM Selectors
  const $unfollowBtn = '[data-testid$="-unfollow"]';
  const $confirmBtn = '[data-testid="confirmationSheetConfirm"]';
  const $followsYou = '[data-testid="userFollowIndicator"]'; // "Follows you" badge
  const $userCell = '[data-testid="UserCell"]';
  
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║  🔄 UNFOLLOW NON-FOLLOWERS                                 ║');
  console.log('║  by nichxbt - https://github.com/nirholas/XActions         ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log('');
  
  // Verify we're on the right page
  if (!window.location.href.includes('/following')) {
    console.error('❌ ERROR: You must be on your Following page!');
    console.log('📍 Go to: https://x.com/YOUR_USERNAME/following');
    return;
  }
  
  // Confirmation prompt
  if (CONFIG.confirmStart) {
    const confirmed = confirm(
      '🔄 UNFOLLOW NON-FOLLOWERS\n\n' +
      'This will unfollow accounts that don\'t follow you back.\n' +
      'Mutual followers will be kept.\n\n' +
      'Click OK to start.'
    );
    if (!confirmed) {
      console.log('❌ Cancelled by user.');
      return;
    }
  }
  
  console.log('🚀 Starting to unfollow non-followers...');
  console.log('💡 Accounts with "Follows you" badge will be kept.');
  console.log('💡 To stop early: window.stopUnfollow()');
  console.log('');

  let totalUnfollowed = 0;
  let totalKept = 0;
  let retries = 0;
  let stopped = false;
  const seenUsers = new Set();
  window.stopUnfollow = () => {
    stopped = true;
    console.log('🛑 Stopping after the current unfollow...');
  };

  while (retries < CONFIG.maxRetries && !stopped) {
    // Scroll to bottom to load more users
    window.scrollTo(0, document.body.scrollHeight);
    await sleep(CONFIG.scrollDelay);
    
    // Find all unfollow buttons
    const buttons = document.querySelectorAll($unfollowBtn);
    
    if (buttons.length === 0) {
      retries++;
      console.log(`⏳ No buttons found. Retry ${retries}/${CONFIG.maxRetries}...`);
      await sleep(CONFIG.scrollDelay);
      continue;
    }
    
    let progressThisPass = 0;

    for (const btn of buttons) {
      if (stopped) break;

      // Check max unfollows limit
      if (CONFIG.maxUnfollows > 0 && totalUnfollowed >= CONFIG.maxUnfollows) {
        console.log(`\n✅ Reached limit of ${CONFIG.maxUnfollows} unfollows!`);
        delete window.stopUnfollow;
        logSummary();
        return;
      }
      
      try {
        // Find the parent UserCell to check for "Follows you" badge
        const userCell = btn.closest($userCell);

        // Track accounts by handle so re-rendered cells aren't recounted and
        // so a tail of mutual followers can't keep this loop alive forever
        const userLink = userCell?.querySelector('a[href^="/"]');
        const username = userLink ? userLink.getAttribute('href').replace('/', '').split('/')[0] : null;
        const isNewUser = username && !seenUsers.has(username);
        if (isNewUser) {
          seenUsers.add(username);
          progressThisPass++;
        }

        if (userCell) {
          // Check if this user follows you back
          const followsYou = userCell.querySelector($followsYou);

          if (followsYou) {
            // This user follows you - KEEP them (count each account once)
            if (isNewUser || !username) {
              totalKept++;
              if (CONFIG.logKept) {
                const nameEl = userCell.querySelector('[dir="ltr"] span');
                const name = nameEl ? nameEl.textContent : 'Unknown';
                console.log(`💚 Keeping: ${name} (follows you)`);
              }
            }
            continue;
          }
        }
        
        // User doesn't follow back - unfollow them
        btn.click();
        await sleep(500);
        
        // Click confirmation
        const confirmBtn = document.querySelector($confirmBtn);
        if (confirmBtn) {
          confirmBtn.click();
          totalUnfollowed++;
          progressThisPass++;

          // Try to get username
          const nameEl = userCell?.querySelector('[dir="ltr"] span');
          const name = nameEl ? nameEl.textContent : `User #${totalUnfollowed}`;
          console.log(`🚫 Unfollowed: ${name}`);

          await sleep(CONFIG.confirmDelay);
        }

        await sleep(CONFIG.unfollowDelay);

      } catch (e) {
        console.warn('⚠️ Error:', e.message);
      }
    }

    // Only reset retries on real progress (new accounts seen or unfollows
    // done); visible mutual cells alone must not keep the loop spinning
    if (progressThisPass > 0) {
      retries = 0;
    } else {
      retries++;
      console.log(`⏳ No new accounts this pass. Retry ${retries}/${CONFIG.maxRetries}...`);
    }
  }

  delete window.stopUnfollow;

  function logSummary() {
    console.log('');
    console.log('╔════════════════════════════════════════════════════════════╗');
    console.log(stopped ? '║  🛑 STOPPED BY USER                                        ║' : '║  ✅ COMPLETE!                                              ║');
    console.log('╚════════════════════════════════════════════════════════════╝');
    console.log(`🚫 Unfollowed (non-followers): ${totalUnfollowed}`);
    console.log(`💚 Kept (mutual followers): ${totalKept}`);
    console.log('');
  }
  
  logSummary();
  
  return { unfollowed: totalUnfollowed, kept: totalKept };
})();

});
  register("unfollow-with-log", function(){
var CONFIG = {
  // Maximum retry attempts
  maxRetries: 5,
  
  // Delay between unfollows (milliseconds)
  unfollowDelay: 1500,
  
  // Delay after clicking confirm
  confirmDelay: 1000,
  
  // Delay for scrolling
  scrollDelay: 2000,
  
  // Stop after this many unfollows (0 = unlimited)
  maxUnfollows: 0,
  
  // Auto-download log file when complete
  autoDownload: true,
  
  // Include timestamp in log
  includeTimestamp: true
};
try{if(typeof window!=='undefined'&&window.__XA_LAUNCH_CFG){Object.assign(CONFIG,window.__XA_LAUNCH_CFG);}}catch(_xa){}


/**
 * ============================================================
 * 🚀 SCRIPT START
 * ============================================================
 */

(async function unfollowWithLog() {
  const sleep = (ms) => new Promise(r => setTimeout(r, ms));
  
  // DOM Selectors
  const $unfollowBtn = '[data-testid$="-unfollow"]';
  const $confirmBtn = '[data-testid="confirmationSheetConfirm"]';
  const $followsYou = '[data-testid="userFollowIndicator"]';
  const $userCell = '[data-testid="UserCell"]';
  
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║  📝 UNFOLLOW NON-FOLLOWERS WITH LOG                        ║');
  console.log('║  by nichxbt - https://github.com/nirholas/XActions         ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log('');
  
  // Verify page
  if (!window.location.href.includes('/following')) {
    console.error('❌ ERROR: You must be on your Following page!');
    console.log('📍 Go to: https://x.com/YOUR_USERNAME/following');
    return;
  }
  
  const confirmed = confirm(
    '📝 UNFOLLOW WITH LOG\n\n' +
    'This will unfollow non-followers and save a log file.\n\n' +
    'Click OK to start.'
  );
  if (!confirmed) {
    console.log('❌ Cancelled by user.');
    return;
  }
  
  console.log('🚀 Starting...');
  console.log('💡 To stop early: window.stopUnfollow()');
  console.log('');

  const unfollowedList = [];
  const keptList = [];
  let retries = 0;
  let stopped = false;
  const startTime = new Date();
  const seenUsers = new Set();
  window.stopUnfollow = () => {
    stopped = true;
    console.log('🛑 Stopping after the current unfollow...');
  };
  
  /**
   * Extract username from user cell
   */
  function getUsername(userCell) {
    if (!userCell) return null;
    const link = userCell.querySelector('a[href^="/"]');
    if (link) {
      const href = link.getAttribute('href');
      return href ? href.replace('/', '') : null;
    }
    return null;
  }
  
  /**
   * Extract display name from user cell
   */
  function getDisplayName(userCell) {
    if (!userCell) return 'Unknown';
    const nameSpan = userCell.querySelector('[dir="ltr"] span');
    return nameSpan ? nameSpan.textContent : 'Unknown';
  }
  
  while (retries < CONFIG.maxRetries && !stopped) {
    window.scrollTo(0, document.body.scrollHeight);
    await sleep(CONFIG.scrollDelay);

    const buttons = document.querySelectorAll($unfollowBtn);

    if (buttons.length === 0) {
      retries++;
      console.log(`⏳ No buttons found. Retry ${retries}/${CONFIG.maxRetries}...`);
      await sleep(CONFIG.scrollDelay);
      continue;
    }

    let progressThisPass = 0;

    for (const btn of buttons) {
      if (stopped) break;

      if (CONFIG.maxUnfollows > 0 && unfollowedList.length >= CONFIG.maxUnfollows) {
        console.log(`\n✅ Reached limit of ${CONFIG.maxUnfollows} unfollows!`);
        delete window.stopUnfollow;
        await downloadLog();
        return;
      }
      
      try {
        const userCell = btn.closest($userCell);
        const username = getUsername(userCell);
        const displayName = getDisplayName(userCell);

        // Track accounts by handle so re-rendered cells aren't logged twice
        // and a tail of mutual followers can't keep this loop alive forever
        const isNewUser = username && !seenUsers.has(username);
        if (isNewUser) {
          seenUsers.add(username);
          progressThisPass++;
        }

        // Check if follows you
        if (userCell?.querySelector($followsYou)) {
          if (isNewUser || !username) {
            keptList.push({ username, displayName });
            console.log(`💚 Keeping: @${username} (${displayName})`);
          }
          continue;
        }
        
        // Unfollow
        btn.click();
        await sleep(500);
        
        const confirmBtn = document.querySelector($confirmBtn);
        if (confirmBtn) {
          confirmBtn.click();
          
          const timestamp = new Date().toISOString();
          unfollowedList.push({
            username,
            displayName,
            timestamp
          });
          
          console.log(`🚫 Unfollowed #${unfollowedList.length}: @${username} (${displayName})`);
          progressThisPass++;
          await sleep(CONFIG.confirmDelay);
        }

        await sleep(CONFIG.unfollowDelay);

      } catch (e) {
        console.warn('⚠️ Error:', e.message);
      }
    }

    // Only reset retries on real progress (new accounts seen or unfollows
    // done); visible mutual cells alone must not keep the loop spinning
    if (progressThisPass > 0) {
      retries = 0;
    } else {
      retries++;
      console.log(`⏳ No new accounts this pass. Retry ${retries}/${CONFIG.maxRetries}...`);
    }
  }

  delete window.stopUnfollow;

  await downloadLog();

  /**
   * Download the log file
   */
  async function downloadLog() {
    const endTime = new Date();
    const duration = Math.round((endTime - startTime) / 1000 / 60);

    console.log('');
    console.log('╔════════════════════════════════════════════════════════════╗');
    console.log(stopped ? '║  🛑 STOPPED BY USER                                        ║' : '║  ✅ COMPLETE!                                              ║');
    console.log('╚════════════════════════════════════════════════════════════╝');
    console.log(`🚫 Unfollowed: ${unfollowedList.length}`);
    console.log(`💚 Kept (mutual): ${keptList.length}`);
    console.log(`⏱️ Duration: ${duration} minutes`);
    console.log('');
    
    if (CONFIG.autoDownload && unfollowedList.length > 0) {
      // Create log content
      let logContent = `UNFOLLOW LOG\n`;
      logContent += `${'='.repeat(50)}\n`;
      logContent += `Date: ${startTime.toISOString()}\n`;
      logContent += `Total Unfollowed: ${unfollowedList.length}\n`;
      logContent += `Total Kept (Mutual): ${keptList.length}\n`;
      logContent += `Duration: ${duration} minutes\n`;
      logContent += `${'='.repeat(50)}\n\n`;
      
      logContent += `UNFOLLOWED ACCOUNTS:\n`;
      logContent += `${'-'.repeat(30)}\n`;
      unfollowedList.forEach((u, i) => {
        let line = `${i + 1}. @${u.username} (${u.displayName})`;
        if (CONFIG.includeTimestamp) {
          line += ` - ${u.timestamp}`;
        }
        logContent += line + '\n';
      });
      
      logContent += `\n\nKEPT ACCOUNTS (MUTUAL FOLLOWERS):\n`;
      logContent += `${'-'.repeat(30)}\n`;
      keptList.forEach((u, i) => {
        logContent += `${i + 1}. @${u.username} (${u.displayName})\n`;
      });
      
      // Download
      const blob = new Blob([logContent], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `unfollowed_${startTime.toISOString().split('T')[0]}.txt`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      console.log('💾 Log file downloaded!');
    }
    
    // Store in window for access
    window.unfollowLog = { unfollowed: unfollowedList, kept: keptList };
    console.log('💡 Access data via: window.unfollowLog');
  }
  
  return { unfollowed: unfollowedList, kept: keptList };
})();

});
  register("unlike-all", function(){
(async function unlikeAllTweets() {
  'use strict';

  // ═══════════════════════════════════════════════════════════════════════════
  // 🎛️ CONFIGURATION - Customize these settings
  // ═══════════════════════════════════════════════════════════════════════════
  const CONFIG = {
    maxUnlikes: 1000,          // Maximum number of tweets to unlike (set to Infinity for all)
    minDelay: 1000,            // Minimum delay between unlikes (ms)
    maxDelay: 2500,            // Maximum delay between unlikes (ms)
    scrollDelay: 1500,         // Delay after scrolling to load more tweets (ms)
    confirmBeforeStart: true,  // Show confirmation dialog before starting
    maxScrollAttempts: 5,      // Max scroll attempts when no new tweets load
    logProgress: true          // Log progress every N unlikes
  };
try{if(typeof window!=='undefined'&&window.__XA_LAUNCH_CFG){Object.assign(CONFIG,window.__XA_LAUNCH_CFG);}}catch(_xa){}


  // ═══════════════════════════════════════════════════════════════════════════
  // 🎯 SELECTORS
  // ═══════════════════════════════════════════════════════════════════════════
  const SELECTORS = {
    unlikeButton: '[data-testid="unlike"]',
    tweet: 'article[data-testid="tweet"]',
    tweetText: '[data-testid="tweetText"]'
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // 🛠️ HELPERS
  // ═══════════════════════════════════════════════════════════════════════════
  const sleep = (ms) => new Promise(r => setTimeout(r, ms));
  
  const randomDelay = () => {
    return Math.floor(Math.random() * (CONFIG.maxDelay - CONFIG.minDelay + 1)) + CONFIG.minDelay;
  };

  const getUnlikeButtons = () => {
    return document.querySelectorAll(SELECTORS.unlikeButton);
  };

  const scrollToBottom = () => {
    window.scrollTo({
      top: document.body.scrollHeight,
      behavior: 'smooth'
    });
  };

  const formatTime = (seconds) => {
    if (seconds < 60) return `${seconds}s`;
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // 🚀 MAIN SCRIPT
  // ═══════════════════════════════════════════════════════════════════════════
  
  console.clear();
  console.log(`
╔══════════════════════════════════════════════════════════════╗
║  💔 UNLIKE ALL TWEETS - XActions                             ║
║  by nichxbt                                                  ║
╚══════════════════════════════════════════════════════════════╝
  `);

  // Verify we're on the likes page
  if (!window.location.href.includes('/likes')) {
    console.error('❌ Error: Please navigate to your likes page first!');
    console.log('📍 Go to: x.com/YOUR_USERNAME/likes');
    return;
  }

  console.log('📋 Configuration:');
  console.log(`   • Max unlikes: ${CONFIG.maxUnlikes === Infinity ? 'Unlimited' : CONFIG.maxUnlikes}`);
  console.log(`   • Delay range: ${CONFIG.minDelay}ms - ${CONFIG.maxDelay}ms`);
  console.log('');

  // Confirmation dialog
  if (CONFIG.confirmBeforeStart) {
    const confirmed = confirm(
      `💔 Unlike All Tweets\n\n` +
      `This will unlike up to ${CONFIG.maxUnlikes === Infinity ? 'ALL' : CONFIG.maxUnlikes} tweets.\n\n` +
      `⚠️ This action cannot be easily undone!\n\n` +
      `Click OK to proceed or Cancel to abort.`
    );
    
    if (!confirmed) {
      console.log('🛑 Operation cancelled by user.');
      return;
    }
  }

  console.log('🚀 Starting unlike process...');
  console.log('💡 To stop early: window.stopUnlike()');
  console.log('');

  // Stats tracking
  const stats = {
    unliked: 0,
    errors: 0,
    startTime: Date.now()
  };

  let scrollAttempts = 0;
  let lastButtonCount = 0;
  let stopped = false;
  window.stopUnlike = () => {
    stopped = true;
    console.log('🛑 Stopping after the current unlike...');
  };

  // Main loop
  while (stats.unliked < CONFIG.maxUnlikes && !stopped) {
    const unlikeButtons = getUnlikeButtons();
    
    if (unlikeButtons.length === 0) {
      // No unlike buttons found, try scrolling to load more
      if (scrollAttempts >= CONFIG.maxScrollAttempts) {
        console.log('📭 No more liked tweets found after multiple scroll attempts.');
        break;
      }
      
      console.log(`📜 Scrolling to load more tweets... (attempt ${scrollAttempts + 1}/${CONFIG.maxScrollAttempts})`);
      scrollToBottom();
      await sleep(CONFIG.scrollDelay);
      scrollAttempts++;
      continue;
    }

    // Reset scroll attempts if we found new buttons
    if (unlikeButtons.length !== lastButtonCount) {
      scrollAttempts = 0;
      lastButtonCount = unlikeButtons.length;
    }

    // Get the first unlike button
    const button = unlikeButtons[0];
    
    try {
      // Scroll button into view
      button.scrollIntoView({ behavior: 'smooth', block: 'center' });
      await sleep(300);
      
      // Click the unlike button
      button.click();
      stats.unliked++;
      
      // Log progress
      if (CONFIG.logProgress && stats.unliked % 10 === 0) {
        const elapsed = Math.floor((Date.now() - stats.startTime) / 1000);
        console.log(`💔 Progress: ${stats.unliked} unliked | ⏱️ ${formatTime(elapsed)} elapsed`);
      } else if (stats.unliked % 5 === 0) {
        console.log(`💔 Unliked: ${stats.unliked}`);
      }
      
      // Random delay before next action
      await sleep(randomDelay());
      
    } catch (error) {
      stats.errors++;
      console.warn(`⚠️ Error unliking tweet: ${error.message}`);
      await sleep(1000);
    }

    // Check if we've hit the limit
    if (stats.unliked >= CONFIG.maxUnlikes) {
      console.log(`🎯 Reached maximum unlike limit (${CONFIG.maxUnlikes})`);
      break;
    }
  }

  delete window.stopUnlike;

  // ═══════════════════════════════════════════════════════════════════════════
  // 📊 COMPLETION SUMMARY
  // ═══════════════════════════════════════════════════════════════════════════
  const totalTime = Math.floor((Date.now() - stats.startTime) / 1000);
  const avgTime = stats.unliked > 0 ? (totalTime / stats.unliked).toFixed(2) : 0;

  console.log('');
  console.log(`
╔══════════════════════════════════════════════════════════════╗
║  ✅ UNLIKE ALL COMPLETE                                      ║
╠══════════════════════════════════════════════════════════════╣
║  📊 Results:                                                 ║
║     💔 Tweets unliked: ${String(stats.unliked).padEnd(37)}║
║     ❌ Errors: ${String(stats.errors).padEnd(45)}║
║     ⏱️  Total time: ${formatTime(totalTime).padEnd(40)}║
║     📈 Avg time/unlike: ${String(avgTime + 's').padEnd(36)}║
╚══════════════════════════════════════════════════════════════╝
  `);

  console.log('👋 Thanks for using XActions! Follow @nichxbt for updates.');
  
  return stats;
})();

});
  register("unlike-old", function(){
(async function unlikeOldTweets() {
  'use strict';

  // ═══════════════════════════════════════════════════════════════════════════
  // 🎛️ CONFIGURATION - Customize these settings
  // ═══════════════════════════════════════════════════════════════════════════
  const CONFIG = {
    daysOld: 30,               // Only unlike tweets older than this many days
    maxUnlikes: 500,           // Maximum number of tweets to unlike (set to Infinity for all)
    minDelay: 1000,            // Minimum delay between unlikes (ms)
    maxDelay: 2500,            // Maximum delay between unlikes (ms)
    scrollDelay: 1500,         // Delay after scrolling to load more tweets (ms)
    maxScrollAttempts: 10,     // Max scroll attempts when no new old tweets found
    logProgress: true          // Log progress updates
  };
try{if(typeof window!=='undefined'&&window.__XA_LAUNCH_CFG){Object.assign(CONFIG,window.__XA_LAUNCH_CFG);}}catch(_xa){}


  // ═══════════════════════════════════════════════════════════════════════════
  // 🎯 SELECTORS
  // ═══════════════════════════════════════════════════════════════════════════
  const SELECTORS = {
    unlikeButton: '[data-testid="unlike"]',
    tweet: 'article[data-testid="tweet"]',
    tweetText: '[data-testid="tweetText"]',
    timestamp: 'time[datetime]'
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // 🛠️ HELPERS
  // ═══════════════════════════════════════════════════════════════════════════
  const sleep = (ms) => new Promise(r => setTimeout(r, ms));
  
  const randomDelay = () => {
    return Math.floor(Math.random() * (CONFIG.maxDelay - CONFIG.minDelay + 1)) + CONFIG.minDelay;
  };

  const formatTime = (seconds) => {
    if (seconds < 60) return `${seconds}s`;
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  const scrollToBottom = () => {
    window.scrollTo({
      top: document.body.scrollHeight,
      behavior: 'smooth'
    });
  };

  const getTweetAge = (tweetElement) => {
    const timeElement = tweetElement.querySelector(SELECTORS.timestamp);
    if (!timeElement) return null;
    
    const tweetDate = new Date(timeElement.getAttribute('datetime'));
    const now = new Date();
    const diffMs = now - tweetDate;
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    return {
      days: diffDays,
      date: tweetDate,
      isOld: diffDays >= CONFIG.daysOld
    };
  };

  const findOldTweetsWithUnlike = () => {
    const tweets = document.querySelectorAll(SELECTORS.tweet);
    const oldTweets = [];
    
    tweets.forEach(tweet => {
      const unlikeButton = tweet.querySelector(SELECTORS.unlikeButton);
      if (!unlikeButton) return;
      
      const age = getTweetAge(tweet);
      if (age && age.isOld) {
        oldTweets.push({
          element: tweet,
          button: unlikeButton,
          age: age
        });
      }
    });
    
    return oldTweets;
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // 🚀 MAIN SCRIPT
  // ═══════════════════════════════════════════════════════════════════════════
  
  console.clear();
  console.log(`
╔══════════════════════════════════════════════════════════════╗
║  📅 UNLIKE OLD TWEETS - XActions                             ║
║  by nichxbt                                                  ║
╚══════════════════════════════════════════════════════════════╝
  `);

  // Verify we're on the likes page
  if (!window.location.href.includes('/likes')) {
    console.error('❌ Error: Please navigate to your likes page first!');
    console.log('📍 Go to: x.com/YOUR_USERNAME/likes');
    return;
  }

  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - CONFIG.daysOld);

  console.log('📋 Configuration:');
  console.log(`   • Unlike tweets older than: ${CONFIG.daysOld} days`);
  console.log(`   • Cutoff date: ${cutoffDate.toLocaleDateString()}`);
  console.log(`   • Max unlikes: ${CONFIG.maxUnlikes === Infinity ? 'Unlimited' : CONFIG.maxUnlikes}`);
  console.log(`   • Delay range: ${CONFIG.minDelay}ms - ${CONFIG.maxDelay}ms`);
  console.log('');

  console.log('🚀 Starting unlike process for old tweets...');
  console.log('💡 To stop early: window.stopUnlike()');
  console.log('');

  // Stats tracking
  const stats = {
    unliked: 0,
    skipped: 0,
    errors: 0,
    startTime: Date.now(),
    processedTweets: new Set()
  };

  let scrollAttempts = 0;
  let consecutiveNoOldTweets = 0;
  let stopped = false;
  window.stopUnlike = () => {
    stopped = true;
    console.log('🛑 Stopping after the current unlike...');
  };

  // Main loop
  while (stats.unliked < CONFIG.maxUnlikes && !stopped) {
    // Find old tweets with unlike buttons
    const oldTweets = findOldTweetsWithUnlike();
    
    // Filter out already processed tweets
    const newOldTweets = oldTweets.filter(t => {
      const tweetId = t.element.getAttribute('aria-labelledby') || 
                      t.element.textContent.substring(0, 50);
      return !stats.processedTweets.has(tweetId);
    });

    if (newOldTweets.length === 0) {
      consecutiveNoOldTweets++;

      // Scroll to load more tweets. The Likes feed is sorted by like-recency,
      // not tweet age, so a long run of not-yet-old tweets is expected and
      // must not be treated as "reached the end" - only a feed that has
      // truly stopped growing (no new tweet articles after scrolling) means
      // there's nothing left to find.
      const tweetCountBefore = document.querySelectorAll(SELECTORS.tweet).length;

      // Check if we've been scrolling with no results
      if (consecutiveNoOldTweets >= 3) {
        console.log(`📜 Scrolling to find older tweets... (attempt ${scrollAttempts + 1}/${CONFIG.maxScrollAttempts})`);
      }

      scrollToBottom();
      await sleep(CONFIG.scrollDelay);

      const tweetCountAfter = document.querySelectorAll(SELECTORS.tweet).length;
      if (tweetCountAfter > tweetCountBefore) {
        // Feed is still growing - real progress, even though none of the
        // newly-loaded tweets qualified as "old" yet.
        scrollAttempts = 0;
      } else {
        scrollAttempts++;
        if (scrollAttempts >= CONFIG.maxScrollAttempts) {
          console.log('📭 Reached the end of the Likes feed. No more old tweets found.');
          break;
        }
      }
      continue;
    }

    // Reset counters when we find old tweets
    scrollAttempts = 0;
    consecutiveNoOldTweets = 0;

    // Process the first old tweet
    const { element, button, age } = newOldTweets[0];
    const tweetId = element.getAttribute('aria-labelledby') || 
                    element.textContent.substring(0, 50);
    
    stats.processedTweets.add(tweetId);

    try {
      // Scroll tweet into view
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      await sleep(400);
      
      // Click the unlike button
      button.click();
      stats.unliked++;
      
      // Log progress with age info
      if (CONFIG.logProgress && stats.unliked % 5 === 0) {
        const elapsed = Math.floor((Date.now() - stats.startTime) / 1000);
        console.log(`📅 Progress: ${stats.unliked} unliked | ⏱️ ${formatTime(elapsed)} elapsed`);
      } else {
        console.log(`💔 Unliked tweet from ${age.days} days ago (${age.date.toLocaleDateString()})`);
      }
      
      // Random delay before next action
      await sleep(randomDelay());
      
    } catch (error) {
      stats.errors++;
      console.warn(`⚠️ Error unliking tweet: ${error.message}`);
      await sleep(1000);
    }

    // Check if we've hit the limit
    if (stats.unliked >= CONFIG.maxUnlikes) {
      console.log(`🎯 Reached maximum unlike limit (${CONFIG.maxUnlikes})`);
      break;
    }
  }

  delete window.stopUnlike;

  // ═══════════════════════════════════════════════════════════════════════════
  // 📊 COMPLETION SUMMARY
  // ═══════════════════════════════════════════════════════════════════════════
  const totalTime = Math.floor((Date.now() - stats.startTime) / 1000);
  const avgTime = stats.unliked > 0 ? (totalTime / stats.unliked).toFixed(2) : 0;

  console.log('');
  console.log(`
╔══════════════════════════════════════════════════════════════╗
║  ✅ UNLIKE OLD TWEETS COMPLETE                               ║
╠══════════════════════════════════════════════════════════════╣
║  📋 Criteria: Tweets older than ${String(CONFIG.daysOld + ' days').padEnd(25)}║
║  📊 Results:                                                 ║
║     📅 Old tweets unliked: ${String(stats.unliked).padEnd(33)}║
║     ❌ Errors: ${String(stats.errors).padEnd(45)}║
║     ⏱️  Total time: ${formatTime(totalTime).padEnd(40)}║
║     📈 Avg time/unlike: ${String(avgTime + 's').padEnd(36)}║
╚══════════════════════════════════════════════════════════════╝
  `);

  console.log('👋 Thanks for using XActions! Follow @nichxbt for updates.');
  
  return stats;
})();

});
  register("update-banner", function(){
var CONFIG = {
  // Delay for UI interactions (ms)
  actionDelay: 1500,
  
  // Auto-open the edit profile modal
  autoOpenEditor: true
};
try{if(typeof window!=='undefined'&&window.__XA_LAUNCH_CFG){Object.assign(CONFIG,window.__XA_LAUNCH_CFG);}}catch(_xa){}


/**
 * ============================================================
 * 🚀 SCRIPT START - by nichxbt
 * ============================================================
 */

(async function updateBanner() {
  const sleep = (ms) => new Promise(r => setTimeout(r, ms));
  
  // DOM Selectors
  const $editProfileBtn = '[data-testid="editProfileButton"]';
  const $addBannerBtn = '[data-testid="addBannerButton"], [data-testid="editProfileHeader"]';
  const $bannerImageInput = 'input[data-testid="fileInput"]';
  const $saveButton = '[data-testid="Profile_Save_Button"]';
  const $cancelBtn = '[data-testid="cancelButton"]';
  
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║  🏞️ UPDATE BANNER IMAGE                                    ║');
  console.log('║  by nichxbt - https://github.com/nirholas/XActions         ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log('');
  
  // Check if edit profile modal is open
  let bannerBtn = document.querySelector($addBannerBtn);
  
  if (!bannerBtn) {
    // Try to click edit profile button
    const editBtn = document.querySelector($editProfileBtn);
    if (editBtn) {
      console.log('📍 Opening profile editor...');
      editBtn.click();
      await sleep(CONFIG.actionDelay * 2);
      bannerBtn = document.querySelector($addBannerBtn);
    } else {
      console.error('❌ ERROR: Edit profile button not found!');
      console.log('');
      console.log('📋 Please go to your profile page:');
      console.log('   https://x.com/YOUR_USERNAME');
      return;
    }
  }
  
  console.log('🖼️ Profile editor opened!');
  console.log('');
  
  // Create helper functions
  window.XActions = window.XActions || {};
  window.XActions.Banner = {
    
    // Click the banner area to trigger file selection
    selectFile: () => {
      const bannerBtn = document.querySelector($addBannerBtn);
      if (bannerBtn) {
        bannerBtn.click();
        console.log('📂 File picker should open. Select your banner image.');
        console.log('');
        console.log('💡 Recommended size: 1500 x 500 pixels (3:1 ratio)');
      } else {
        console.error('❌ Banner button not found. Make sure the profile editor is open.');
      }
    },
    
    // Save changes
    save: async () => {
      const saveBtn = document.querySelector($saveButton);
      if (saveBtn) {
        saveBtn.click();
        await sleep(CONFIG.actionDelay);
        console.log('✅ Profile saved!');
      } else {
        console.error('❌ Save button not found.');
      }
    },
    
    // Cancel changes
    cancel: () => {
      const cancelBtn = document.querySelector($cancelBtn);
      if (cancelBtn) {
        cancelBtn.click();
        console.log('❌ Changes cancelled.');
      }
    },
    
    // Help
    help: () => {
      console.log('');
      console.log('📋 AVAILABLE COMMANDS:');
      console.log('');
      console.log('   XActions.Banner.selectFile()');
      console.log('   → Opens file picker to select new banner');
      console.log('');
      console.log('   XActions.Banner.save()');
      console.log('   → Saves the profile changes');
      console.log('');
      console.log('   XActions.Banner.cancel()');
      console.log('   → Cancels changes and closes editor');
      console.log('');
      console.log('📐 BANNER DIMENSIONS:');
      console.log('   Recommended: 1500 x 500 pixels (3:1 ratio)');
      console.log('   Minimum: 600 x 200 pixels');
      console.log('   Max file size: 2 MB');
      console.log('');
    }
  };
  
  console.log('✅ Banner Helper loaded!');
  console.log('');
  console.log('📋 INSTRUCTIONS:');
  console.log('');
  console.log('   Step 1: Run XActions.Banner.selectFile()');
  console.log('           Or click on the banner area directly');
  console.log('   Step 2: Choose your image file (1500x500 recommended)');
  console.log('   Step 3: Adjust the crop if needed');
  console.log('   Step 4: Click Apply, then run XActions.Banner.save()');
  console.log('');
  console.log('💡 Type XActions.Banner.help() for more info');
  console.log('');
  
  // Auto-click banner area if enabled
  if (CONFIG.autoOpenEditor && bannerBtn) {
    console.log('👆 Click on the banner area at the top to change it.');
  }
})();

});
  register("update-bio", function(){
var CONFIG = {
  // Your new bio text (max 160 characters)
  newBio: `🚀 Building cool stuff with code
🐦 Automating X with @XActions
💡 Open source enthusiast
🔗 github.com/nirholas/XActions`,
  
  // Delay for UI interactions (ms)
  actionDelay: 1000,
  
  // Auto-save after updating
  autoSave: true
};
try{if(typeof window!=='undefined'&&window.__XA_LAUNCH_CFG){Object.assign(CONFIG,window.__XA_LAUNCH_CFG);}}catch(_xa){}


/**
 * ============================================================
 * 🚀 SCRIPT START - by nichxbt
 * ============================================================
 */

(async function updateBio() {
  const sleep = (ms) => new Promise(r => setTimeout(r, ms));
  // Set an input's value through the native setter so React's value tracker
  // registers the change (direct .value assignment gets ignored by React and
  // the old bio would be saved).
  const setNativeValue = (el, value) => {
    const desc = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(el), 'value');
    if (desc && desc.set) desc.set.call(el, value);
    else el.value = value;
  };
  
  // DOM Selectors
  const $bioTextarea = 'textarea[name="description"]';
  const $bioInput = '[data-testid="ocf-bio-input"]';
  const $saveButton = '[data-testid="Profile_Save_Button"]';
  const $editProfileBtn = '[data-testid="editProfileButton"]';
  
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║  ✏️ UPDATE PROFILE BIO                                     ║');
  console.log('║  by nichxbt - https://github.com/nirholas/XActions         ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log('');
  
  // Validate bio length
  if (CONFIG.newBio.length > 160) {
    console.error('❌ ERROR: Bio exceeds 160 characters!');
    console.log(`   Current length: ${CONFIG.newBio.length} characters`);
    console.log('   Please shorten your bio.');
    return;
  }
  
  console.log(`📝 New bio (${CONFIG.newBio.length}/160 chars):`);
  console.log(`   "${CONFIG.newBio}"`);
  console.log('');
  
  // Check if we're on profile settings page
  const isSettingsPage = window.location.href.includes('/settings/profile');
  
  // Check if edit profile modal is open
  let bioField = document.querySelector($bioTextarea) || document.querySelector($bioInput);
  
  if (!bioField && !isSettingsPage) {
    // Try to click edit profile button
    const editBtn = document.querySelector($editProfileBtn);
    if (editBtn) {
      console.log('📍 Opening profile editor...');
      editBtn.click();
      await sleep(CONFIG.actionDelay * 2);
      bioField = document.querySelector($bioTextarea) || document.querySelector($bioInput);
    }
  }

  // The settings page (or the modal we just opened) may still be mounting
  // its form on first paint. Poll briefly before giving up instead of
  // failing immediately on a field that would appear a moment later.
  let waitAttempts = 0;
  while (!bioField && waitAttempts < 3) {
    await sleep(CONFIG.actionDelay);
    bioField = document.querySelector($bioTextarea) || document.querySelector($bioInput);
    waitAttempts++;
  }

  if (!bioField) {
    console.error('❌ ERROR: Bio field not found!');
    console.log('');
    console.log('📋 Please try one of these:');
    console.log('   1. Go to: https://x.com/settings/profile');
    console.log('   2. Or click "Edit profile" on your profile page first');
    return;
  }
  
  // Clear and set new bio
  console.log('🔄 Updating bio...');
  
  // Focus the field
  bioField.focus();
  await sleep(300);
  
  // Select all and delete
  bioField.select ? bioField.select() : null;
  document.execCommand('selectAll', false, null);
  await sleep(100);
  
  // Clear current content
  setNativeValue(bioField, '');
  bioField.textContent = '';
  bioField.dispatchEvent(new Event('input', { bubbles: true }));
  await sleep(300);

  // Type new bio
  setNativeValue(bioField, CONFIG.newBio);
  bioField.textContent = CONFIG.newBio;
  bioField.dispatchEvent(new Event('input', { bubbles: true }));
  bioField.dispatchEvent(new Event('change', { bubbles: true }));
  
  await sleep(CONFIG.actionDelay);
  
  console.log('✅ Bio field updated!');
  
  // Auto-save if enabled
  if (CONFIG.autoSave) {
    const saveBtn = document.querySelector($saveButton);
    if (saveBtn) {
      console.log('💾 Saving profile...');
      saveBtn.click();
      await sleep(CONFIG.actionDelay * 2);
      console.log('');
      console.log('╔════════════════════════════════════════════════════════════╗');
      console.log('║  🎉 PROFILE BIO UPDATED SUCCESSFULLY!                      ║');
      console.log('╚════════════════════════════════════════════════════════════╝');
    } else {
      console.log('⚠️ Save button not found. Please save manually.');
    }
  } else {
    console.log('');
    console.log('💡 Bio field updated. Click "Save" to apply changes.');
  }
})();

});
  register("update-profile-picture", function(){
var CONFIG = {
  // Delay for UI interactions (ms)
  actionDelay: 1500,
  
  // Auto-open the file picker
  autoOpenPicker: true
};
try{if(typeof window!=='undefined'&&window.__XA_LAUNCH_CFG){Object.assign(CONFIG,window.__XA_LAUNCH_CFG);}}catch(_xa){}


/**
 * ============================================================
 * 🚀 SCRIPT START - by nichxbt
 * ============================================================
 */

(async function updateProfilePicture() {
  const sleep = (ms) => new Promise(r => setTimeout(r, ms));
  
  // DOM Selectors
  const $editProfileBtn = '[data-testid="editProfileButton"]';
  const $avatarImageInput = 'input[data-testid="fileInput"][accept*="image"]';
  const $addAvatarBtn = '[data-testid="addAvatarButton"], [data-testid="editProfileAvatar"]';
  const $avatarContainer = '[data-testid="UserAvatar-Container"]';
  const $saveButton = '[data-testid="Profile_Save_Button"]';
  
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║  🖼️ UPDATE PROFILE PICTURE                                 ║');
  console.log('║  by nichxbt - https://github.com/nirholas/XActions         ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log('');
  
  // Check if edit profile modal is open
  let avatarBtn = document.querySelector($addAvatarBtn);
  let fileInput = document.querySelector($avatarImageInput);
  
  if (!avatarBtn && !fileInput) {
    // Try to click edit profile button
    const editBtn = document.querySelector($editProfileBtn);
    if (editBtn) {
      console.log('📍 Opening profile editor...');
      editBtn.click();
      await sleep(CONFIG.actionDelay * 2);
      avatarBtn = document.querySelector($addAvatarBtn);
      fileInput = document.querySelector($avatarImageInput);
    } else {
      console.error('❌ ERROR: Edit profile button not found!');
      console.log('');
      console.log('📋 Please go to your profile page:');
      console.log('   https://x.com/YOUR_USERNAME');
      return;
    }
  }
  
  console.log('📸 Profile editor opened!');
  console.log('');
  
  // Create helper functions
  window.XActions = window.XActions || {};
  window.XActions.ProfilePicture = {
    
    // Trigger file picker
    selectFile: () => {
      const input = document.querySelector($avatarImageInput);
      if (input) {
        input.click();
        console.log('📂 File picker opened. Select your new profile picture.');
      } else {
        // Click on avatar to trigger picker
        const avatarBtn = document.querySelector($addAvatarBtn);
        if (avatarBtn) {
          avatarBtn.click();
          console.log('📂 Clicked avatar button. Select your new profile picture.');
        } else {
          console.error('❌ Could not find file input or avatar button.');
        }
      }
    },
    
    // Save changes
    save: async () => {
      const saveBtn = document.querySelector($saveButton);
      if (saveBtn) {
        saveBtn.click();
        await sleep(CONFIG.actionDelay);
        console.log('✅ Profile saved!');
      } else {
        console.error('❌ Save button not found.');
      }
    },
    
    // Help
    help: () => {
      console.log('');
      console.log('📋 AVAILABLE COMMANDS:');
      console.log('');
      console.log('   XActions.ProfilePicture.selectFile()');
      console.log('   → Opens file picker to select new profile picture');
      console.log('');
      console.log('   XActions.ProfilePicture.save()');
      console.log('   → Saves the profile changes');
      console.log('');
    }
  };
  
  console.log('✅ Profile Picture Helper loaded!');
  console.log('');
  console.log('📋 INSTRUCTIONS:');
  console.log('');
  console.log('   Step 1: Run XActions.ProfilePicture.selectFile()');
  console.log('   Step 2: Choose your image file');
  console.log('   Step 3: Crop/adjust the image');
  console.log('   Step 4: Run XActions.ProfilePicture.save()');
  console.log('');
  console.log('💡 Type XActions.ProfilePicture.help() for more info');
  console.log('');
  
  // Auto-open file picker if enabled
  if (CONFIG.autoOpenPicker) {
    await sleep(CONFIG.actionDelay);
    console.log('🔄 Auto-opening file picker...');
    
    const avatarBtn = document.querySelector($addAvatarBtn);
    const avatarContainer = document.querySelector($avatarContainer);
    
    if (avatarBtn) {
      avatarBtn.click();
      console.log('📂 Click on your avatar to select a new picture!');
    } else if (avatarContainer) {
      avatarContainer.click();
      console.log('📂 Click on your avatar area to select a new picture!');
    }
  }
})();

});
  register("video-downloader", function(){
var CONFIG = {
  // Quality preference: 'highest', 'lowest', 'all'
  quality: 'highest',
  
  // Auto-download best quality
  autoDownload: true,
  
  // Show all available qualities in console
  showAllQualities: true
};
try{if(typeof window!=='undefined'&&window.__XA_LAUNCH_CFG){Object.assign(CONFIG,window.__XA_LAUNCH_CFG);}}catch(_xa){}


/**
 * ============================================================
 * 🚀 SCRIPT START
 * ============================================================
 */

(async function videoDownloader() {
  const sleep = (ms) => new Promise(r => setTimeout(r, ms));

  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║  🎬 VIDEO DOWNLOADER                                       ║');
  console.log('║  by nichxbt - https://github.com/nirholas/XActions         ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log('');
  
  // Verify we're on a tweet page
  if (!window.location.href.includes('/status/')) {
    console.error('❌ ERROR: Must be on a tweet page with a video!');
    console.log('📍 Go to any tweet: https://x.com/user/status/TWEET_ID');
    return;
  }
  
  console.log('🔍 Searching for video URLs...');
  console.log('');
  
  const videoUrls = new Set();
  
  // Method 1: Check video elements directly
  document.querySelectorAll('video').forEach(video => {
    if (video.src && video.src.includes('video.twimg.com')) {
      videoUrls.add(video.src);
    }
    
    // Check source elements
    video.querySelectorAll('source').forEach(source => {
      if (source.src && source.src.includes('video.twimg.com')) {
        videoUrls.add(source.src);
      }
    });
  });
  
  // Method 2: Search in page source for video URLs
  const pageHtml = document.documentElement.innerHTML;
  const videoRegex = /https:\/\/video\.twimg\.com\/[^"'\s]+\.mp4[^"'\s]*/g;
  const matches = pageHtml.match(videoRegex);
  
  if (matches) {
    matches.forEach(url => {
      // Clean up the URL
      const cleanUrl = url.split('"')[0].split("'")[0].split('\\')[0];
      if (cleanUrl.includes('.mp4')) {
        videoUrls.add(cleanUrl);
      }
    });
  }
  
  // Method 3: Check for blob URLs and try to find actual source
  document.querySelectorAll('video[src^="blob:"]').forEach(video => {
    console.log('📍 Found blob video - checking for source...');
    // For blob videos, we need to check network requests
  });
  
  if (videoUrls.size === 0) {
    console.log('❌ No video URLs found!');
    console.log('');
    console.log('💡 Tips:');
    console.log('   - Make sure the video has loaded/played');
    console.log('   - Try refreshing the page');
    console.log('   - Some videos may use DRM protection');
    return;
  }
  
  // Parse and sort by quality
  const videos = [];
  
  videoUrls.forEach(url => {
    // Try to extract resolution from URL
    const resMatch = url.match(/\/(\d{3,4})x(\d{3,4})\//);
    let width = 0, height = 0;
    
    if (resMatch) {
      width = parseInt(resMatch[1]);
      height = parseInt(resMatch[2]);
    } else {
      // Try alternate pattern
      const altMatch = url.match(/vid\/(\d+)x(\d+)\//);
      if (altMatch) {
        width = parseInt(altMatch[1]);
        height = parseInt(altMatch[2]);
      }
    }
    
    videos.push({
      url: url,
      width,
      height,
      resolution: width && height ? `${width}x${height}` : 'Unknown',
      pixels: width * height
    });
  });
  
  // Sort by resolution (highest first)
  videos.sort((a, b) => b.pixels - a.pixels);
  
  // Display results
  console.log(`✅ Found ${videos.length} video URL(s):`);
  console.log('');
  
  if (CONFIG.showAllQualities) {
    console.log('📊 Available qualities:');
    videos.forEach((v, i) => {
      console.log(`   ${i + 1}. ${v.resolution}`);
      console.log(`      ${v.url}`);
      console.log('');
    });
  }
  
  // Download a single video (fetch as blob so the saved file gets a real
  // filename instead of whatever video.twimg.com's URL path ends in).
  async function downloadVideo(video, filename) {
    try {
      const response = await fetch(video.url);
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);

      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(blobUrl);
      return true;
    } catch (e) {
      console.log(`⚠️ Auto-download failed for ${video.resolution}. Opening in new tab...`);
      window.open(video.url, '_blank');
      return false;
    }
  }

  // 'all' downloads every quality variant found, not just one
  if (CONFIG.quality === 'all') {
    console.log(`🎯 Quality set to "all": downloading all ${videos.length} variant(s)`);
    console.log('');

    if (CONFIG.autoDownload) {
      for (let i = 0; i < videos.length; i++) {
        const v = videos[i];
        console.log(`💾 Downloading ${i + 1}/${videos.length} (${v.resolution})...`);
        await downloadVideo(v, `twitter_video_${Date.now()}_${v.resolution}.mp4`);
        // Small delay so the browser isn't asked to start N simultaneous
        // blob downloads at once.
        if (i < videos.length - 1) await sleep(800);
      }
      console.log('✅ All downloads started!');
    }

    try {
      await navigator.clipboard.writeText(videos[0].url);
      console.log('📋 Highest quality URL copied to clipboard!');
    } catch (e) {}

    console.log('');
    console.log('💡 You can also right-click the video URL above and "Open in new tab"');
    console.log('   then right-click the video and "Save video as..."');
    console.log('');

    window.videoUrls = videos;
    console.log('💡 Access all URLs via: window.videoUrls');

    return videos;
  }

  // Get preferred video
  let selectedVideo;
  if (CONFIG.quality === 'highest') {
    selectedVideo = videos[0];
  } else if (CONFIG.quality === 'lowest') {
    selectedVideo = videos[videos.length - 1];
  } else {
    console.warn(`⚠️ Unknown CONFIG.quality "${CONFIG.quality}", defaulting to "highest".`);
    selectedVideo = videos[0];
  }

  if (selectedVideo) {
    console.log(`🎯 Selected: ${selectedVideo.resolution}`);
    console.log('');
    
    // Copy URL to clipboard
    try {
      await navigator.clipboard.writeText(selectedVideo.url);
      console.log('📋 Video URL copied to clipboard!');
    } catch (e) {}
    
    // Auto-download
    if (CONFIG.autoDownload) {
      console.log('💾 Starting download...');
      console.log('');
      
      try {
        const response = await fetch(selectedVideo.url);
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `twitter_video_${Date.now()}.mp4`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        console.log('✅ Download started!');
      } catch (e) {
        console.log('⚠️ Auto-download failed. Opening in new tab...');
        window.open(selectedVideo.url, '_blank');
      }
    }
  }
  
  console.log('');
  console.log('💡 You can also right-click the video URL above and "Open in new tab"');
  console.log('   then right-click the video and "Save video as..."');
  console.log('');
  
  window.videoUrls = videos;
  console.log('💡 Access all URLs via: window.videoUrls');
  
  return videos;
})();

});
  register("viral-tweets-scraper", function(){
var CONFIG = {
  // ---- MINIMUM THRESHOLDS ----
  // Only include tweets with at least this many:
  
  minLikes: 50,
  minRetweets: 5,
  minReplies: 0,
  
  // ---- LIMITS ----
  
  maxTweets: 100,
  maxScrolls: 50,
  
  // ---- SORTING ----
  // Options: 'likes', 'retweets', 'replies', 'engagement' (sum of all)
  sortBy: 'likes',
  
  // ---- TIMING ----
  
  scrollDelay: 1500,
  maxRetries: 5,
  
  // ---- EXPORT ----
  
  exportJSON: true,
  exportCSV: true
};
try{if(typeof window!=='undefined'&&window.__XA_LAUNCH_CFG){Object.assign(CONFIG,window.__XA_LAUNCH_CFG);}}catch(_xa){}


/**
 * ============================================================
 * 🚀 SCRIPT START
 * ============================================================
 */

(async function viralTweetsScraper() {
  const sleep = (ms) => new Promise(r => setTimeout(r, ms));
  
  const $tweet = 'article[data-testid="tweet"]';
  const $tweetText = '[data-testid="tweetText"]';
  
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║  🔥 VIRAL TWEETS SCRAPER                                   ║');
  console.log('║  by nichxbt - https://github.com/nirholas/XActions         ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log('');
  
  console.log(`🎯 Min thresholds: ${CONFIG.minLikes} likes, ${CONFIG.minRetweets} RTs`);
  console.log(`📊 Sort by: ${CONFIG.sortBy}`);
  console.log(`📋 Max tweets: ${CONFIG.maxTweets}`);
  console.log('');
  
  const tweets = [];
  const seenIds = new Set();
  let scrolls = 0;
  let retries = 0;
  let lastCount = 0;
  
  /**
   * Parse engagement numbers (handles K, M suffixes)
   */
  function parseNumber(str) {
    if (!str || str === '') return 0;
    str = str.trim().toUpperCase();
    if (str.includes('K')) return parseFloat(str) * 1000;
    if (str.includes('M')) return parseFloat(str) * 1000000;
    if (str.includes('B')) return parseFloat(str) * 1000000000;
    return parseInt(str.replace(/,/g, '')) || 0;
  }
  
  /**
   * Extract tweet data
   */
  function extractTweet(tweetEl) {
    try {
      // Get ID from the timestamp's permalink anchor; the first /status/
      // link in the article can belong to a quoted tweet
      const timeAnchor = tweetEl.querySelector('time')?.closest('a[href*="/status/"]');
      const link = timeAnchor || tweetEl.querySelector('a[href*="/status/"]');
      if (!link) return null;

      const match = link.href.match(/\/status\/(\d+)/);
      if (!match) return null;

      const tweetId = match[1];
      if (seenIds.has(tweetId)) return null;
      seenIds.add(tweetId);

      // Get author (User-Name block, not the first profile link, which is
      // the reposter on retweets)
      const authorLink = tweetEl.querySelector('div[data-testid="User-Name"] a[href^="/"]') ||
                         tweetEl.querySelector('a[href^="/"][role="link"]');
      const username = authorLink ? authorLink.getAttribute('href').replace('/', '').split('/')[0] : 'unknown';
      
      // Get text
      const textEl = tweetEl.querySelector($tweetText);
      const text = textEl ? textEl.innerText : '';
      
      // Get timestamp
      const timeEl = tweetEl.querySelector('time');
      const timestamp = timeEl ? timeEl.getAttribute('datetime') : null;
      const displayTime = timeEl ? timeEl.innerText : '';
      
      // Get metrics
      const getMetric = (testId) => {
        const el = tweetEl.querySelector(`[data-testid="${testId}"]`);
        const span = el?.querySelector('span span');
        return span ? span.innerText : '0';
      };
      
      const likesStr = getMetric('like');
      const retweetsStr = getMetric('retweet');
      const repliesStr = getMetric('reply');
      
      const likes = parseNumber(likesStr);
      const retweets = parseNumber(retweetsStr);
      const replies = parseNumber(repliesStr);
      
      // Check thresholds
      if (likes < CONFIG.minLikes) return null;
      if (retweets < CONFIG.minRetweets) return null;
      if (replies < CONFIG.minReplies) return null;
      
      // Check for media
      const hasImage = tweetEl.querySelector('[data-testid="tweetPhoto"]') !== null;
      const hasVideo = tweetEl.querySelector('[data-testid="videoPlayer"], [data-testid="videoComponent"]') !== null;
      
      return {
        id: tweetId,
        url: `https://x.com/${username}/status/${tweetId}`,
        author: username,
        text,
        timestamp,
        displayTime,
        metrics: {
          likes,
          retweets,
          replies,
          engagement: likes + retweets + replies,
          likesDisplay: likesStr,
          retweetsDisplay: retweetsStr,
          repliesDisplay: repliesStr
        },
        hasImage,
        hasVideo
      };
      
    } catch (e) {
      return null;
    }
  }
  
  console.log('🚀 Scraping tweets...');
  console.log('');
  
  // Scroll and extract
  while (tweets.length < CONFIG.maxTweets && scrolls < CONFIG.maxScrolls && retries < CONFIG.maxRetries) {
    document.querySelectorAll($tweet).forEach(el => {
      const tweet = extractTweet(el);
      if (tweet) tweets.push(tweet);
    });
    
    // Stall detection tracks all tweets seen, not just qualifying ones:
    // long stretches below the viral thresholds must not end the scan early
    if (seenIds.size === lastCount) {
      retries++;
    } else {
      retries = 0;
      lastCount = seenIds.size;
    }
    
    console.log(`📊 Found ${tweets.length} viral tweets...`);
    
    window.scrollTo(0, document.body.scrollHeight);
    await sleep(CONFIG.scrollDelay);
    scrolls++;
  }
  
  // Sort
  const sortKey = CONFIG.sortBy === 'engagement' ? 'engagement' : CONFIG.sortBy;
  tweets.sort((a, b) => {
    if (sortKey === 'engagement') {
      return b.metrics.engagement - a.metrics.engagement;
    }
    return b.metrics[sortKey] - a.metrics[sortKey];
  });
  
  console.log('');
  console.log(`✅ Found ${tweets.length} viral tweets`);
  console.log('');
  
  // Display top 10
  console.log('🏆 TOP 10 VIRAL TWEETS:');
  console.log('');
  tweets.slice(0, 10).forEach((t, i) => {
    console.log(`${i + 1}. [${t.metrics.likesDisplay} ❤️ | ${t.metrics.retweetsDisplay} 🔄] @${t.author}`);
    console.log(`   "${t.text.substring(0, 60)}..."`);
    console.log(`   ${t.url}`);
    console.log('');
  });
  
  // Build result
  const result = {
    scrapedAt: new Date().toISOString(),
    sortedBy: CONFIG.sortBy,
    totalTweets: tweets.length,
    tweets
  };
  
  const dateStr = new Date().toISOString().split('T')[0];
  
  // Download JSON
  if (CONFIG.exportJSON) {
    const blob = new Blob([JSON.stringify(result, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `viral_tweets_${dateStr}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    console.log('💾 JSON downloaded!');
  }
  
  // Download CSV
  if (CONFIG.exportCSV) {
    const headers = ['Rank', 'Author', 'Likes', 'Retweets', 'Replies', 'Engagement', 'Text', 'Date', 'Has Image', 'Has Video', 'URL'];
    const rows = tweets.map((t, i) => [
      i + 1,
      t.author,
      t.metrics.likes,
      t.metrics.retweets,
      t.metrics.replies,
      t.metrics.engagement,
      `"${t.text.substring(0, 200).replace(/"/g, '""').replace(/\n/g, ' ')}"`,
      `"${(t.displayTime || '').replace(/"/g, '""')}"`,
      t.hasImage,
      t.hasVideo,
      t.url
    ].join(','));
    
    const csv = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `viral_tweets_${dateStr}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    console.log('💾 CSV downloaded!');
  }
  
  console.log('');
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║  ✅ VIRAL TWEETS SCRAPER COMPLETE!                         ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log(`🔥 Total viral tweets: ${tweets.length}`);
  console.log('');
  
  window.viralTweets = result;
  console.log('💡 Access via: window.viralTweets');
  
  return result;
})();

});
  register("whitelist", function(){
var CONFIG = {
  // Storage key
  storageKey: 'xactions_whitelist',
  
  // Pre-populate with important accounts
  defaultWhitelist: [
    // 'nichxbt',
    // 'importantfriend',
  ],
};
try{if(typeof window!=='undefined'&&window.__XA_LAUNCH_CFG){Object.assign(CONFIG,window.__XA_LAUNCH_CFG);}}catch(_xa){}


/**
 * ============================================================
 * 🚀 SCRIPT START - by nichxbt
 * ============================================================
 */

(function whitelistManager() {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║  ✅ WHITELIST MANAGER                                      ║');
  console.log('║  by nichxbt - https://github.com/nirholas/XActions         ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log('');
  
  // Storage helpers
  const getWhitelist = () => {
    try {
      const data = localStorage.getItem(CONFIG.storageKey);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  };
  
  const saveWhitelist = (list) => {
    localStorage.setItem(CONFIG.storageKey, JSON.stringify(list));
  };
  
  // Initialize with defaults if empty
  const init = () => {
    const current = getWhitelist();
    if (current.length === 0 && CONFIG.defaultWhitelist.length > 0) {
      const defaults = CONFIG.defaultWhitelist.map(u => ({
        username: u.replace('@', '').toLowerCase(),
        addedAt: Date.now(),
        reason: 'default'
      }));
      saveWhitelist(defaults);
    }
  };
  
  init();
  
  // Create XActions interface
  window.XActions = window.XActions || {};
  window.XActions.Whitelist = {
    
    // Add user to whitelist
    add: (username, reason = '') => {
      const list = getWhitelist();
      const clean = username.replace('@', '').toLowerCase();
      
      if (list.find(u => u.username === clean)) {
        console.log(`⚠️ @${clean} is already whitelisted.`);
        return false;
      }
      
      list.push({
        username: clean,
        addedAt: Date.now(),
        reason: reason || 'manual'
      });
      
      saveWhitelist(list);
      console.log(`✅ Added @${clean} to whitelist.`);
      return true;
    },
    
    // Add multiple users
    addBulk: (usernames) => {
      let added = 0;
      usernames.forEach(u => {
        if (window.XActions.Whitelist.add(u, 'bulk')) added++;
      });
      console.log(`✅ Added ${added} users to whitelist.`);
    },
    
    // Remove user from whitelist
    remove: (username) => {
      let list = getWhitelist();
      const clean = username.replace('@', '').toLowerCase();
      const before = list.length;
      
      list = list.filter(u => u.username !== clean);
      
      if (list.length < before) {
        saveWhitelist(list);
        console.log(`✅ Removed @${clean} from whitelist.`);
        return true;
      }
      
      console.log(`⚠️ @${clean} was not in whitelist.`);
      return false;
    },
    
    // Check if user is whitelisted
    includes: (username) => {
      const list = getWhitelist();
      const clean = username.replace('@', '').toLowerCase();
      return list.some(u => u.username === clean);
    },
    
    // Alias for includes
    has: (username) => window.XActions.Whitelist.includes(username),
    
    // Get all whitelisted users
    getAll: () => {
      return getWhitelist();
    },
    
    // Get just usernames
    getUsernames: () => {
      return getWhitelist().map(u => u.username);
    },
    
    // Count
    count: () => {
      return getWhitelist().length;
    },
    
    // List all
    list: () => {
      const list = getWhitelist();
      console.log('');
      console.log('═'.repeat(50));
      console.log('✅ WHITELISTED USERS');
      console.log('═'.repeat(50));
      
      if (list.length === 0) {
        console.log('No users whitelisted yet.');
      } else {
        list.forEach((u, i) => {
          const date = new Date(u.addedAt).toLocaleDateString();
          console.log(`${i + 1}. @${u.username} (added: ${date}${u.reason ? ', ' + u.reason : ''})`);
        });
      }
      
      console.log('═'.repeat(50));
      console.log(`Total: ${list.length} users`);
      console.log('');
    },
    
    // Clear all
    clear: () => {
      if (confirm('⚠️ Clear entire whitelist?')) {
        saveWhitelist([]);
        console.log('✅ Whitelist cleared.');
      }
    },
    
    // Export
    export: () => {
      const list = getWhitelist();
      const usernames = list.map(u => u.username);
      console.log('📋 Whitelist (copy this):');
      console.log(JSON.stringify(usernames));
      if (navigator.clipboard) {
        navigator.clipboard.writeText(JSON.stringify(usernames)).then(
          () => console.log('✅ Copied to clipboard!'),
          () => console.log('⚠️ Clipboard copy failed. Copy the JSON above manually.')
        );
      } else {
        console.log('⚠️ Clipboard unavailable. Copy the JSON above manually.');
      }
      return usernames;
    },
    
    // Import
    import: (usernamesArray) => {
      if (!Array.isArray(usernamesArray)) {
        try {
          usernamesArray = JSON.parse(usernamesArray);
        } catch {
          console.error('❌ Invalid format. Provide an array of usernames.');
          return;
        }
      }
      
      window.XActions.Whitelist.addBulk(usernamesArray);
    },
    
    // Collect from current page (following list, etc.)
    collectFromPage: () => {
      const userCells = document.querySelectorAll('[data-testid="UserCell"]');
      const users = [];
      
      userCells.forEach(cell => {
        const link = cell.querySelector('a[href^="/"]');
        const username = link?.getAttribute('href')?.replace('/', '');
        if (username && !username.includes('/')) {
          users.push(username);
        }
      });
      
      console.log(`📥 Found ${users.length} users on page.`);
      
      if (users.length > 0) {
        const add = confirm(`Add ${users.length} users to whitelist?`);
        if (add) {
          window.XActions.Whitelist.addBulk(users);
        }
      }
      
      return users;
    },
    
    // Help
    help: () => {
      console.log('');
      console.log('📋 WHITELIST COMMANDS:');
      console.log('');
      console.log('   XActions.Whitelist.add("username")');
      console.log('   XActions.Whitelist.add("user", "reason")');
      console.log('   XActions.Whitelist.addBulk(["u1", "u2"])');
      console.log('   XActions.Whitelist.remove("username")');
      console.log('   XActions.Whitelist.has("username")');
      console.log('   XActions.Whitelist.list()');
      console.log('   XActions.Whitelist.count()');
      console.log('   XActions.Whitelist.export()');
      console.log('   XActions.Whitelist.import([...])');
      console.log('   XActions.Whitelist.collectFromPage()');
      console.log('   XActions.Whitelist.clear()');
      console.log('');
    }
  };
  
  console.log(`✅ Whitelist Manager loaded! (${getWhitelist().length} users)`);
  console.log('   Run XActions.Whitelist.help() for commands.');
  console.log('');
})();

});

  const VERSION = '1.0.0';
  const PANEL_ID = 'xactions-command-center';
  const FAB_ID = 'xactions-command-center-fab';
  const LS_KEY = 'xactions_command_center_v1';
  const TAG = '[XActions Command Center]';

  const DANGER = {
    safe: { label: 'Safe', color: '#00ba7c', note: 'Read-only or export. Does not change your account.' },
    caution: { label: 'Writes', color: '#ffd400', note: 'Performs actions on your account (likes, follows, posts). Runs at a human pace.' },
    destructive: { label: 'Bulk / irreversible', color: '#f4212e', note: 'Bulk changes that cannot be undone in one click (mass unfollow, unlike, block, clear). Read the warning before running.' }
  };

  // ---- persisted UI state ----------------------------------------------------

  const DEFAULT_STATE = { favorites: [], recents: [], pos: { top: 72, left: null }, category: 'all' };

  function loadState() {
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (!raw) return structuredClone(DEFAULT_STATE);
      const saved = JSON.parse(raw);
      return { ...structuredClone(DEFAULT_STATE), ...saved };
    } catch (e) { return structuredClone(DEFAULT_STATE); }
  }
  function saveState() { try { localStorage.setItem(LS_KEY, JSON.stringify(state)); } catch (e) { /* ignore */ } }
  const state = loadState();

  const byId = Object.fromEntries(CATALOG.map((t) => [t.id, t]));

  // ---- small helpers ---------------------------------------------------------

  function el(tag, attrs, children) {
    const node = document.createElement(tag);
    if (attrs) {
      for (const k of Object.keys(attrs)) {
        if (k === 'class') node.className = attrs[k];
        else if (k === 'text') node.textContent = attrs[k];
        else if (k === 'html') node.innerHTML = attrs[k];
        else if (k.startsWith('on') && typeof attrs[k] === 'function') node.addEventListener(k.slice(2), attrs[k]);
        else if (attrs[k] !== null && attrs[k] !== undefined) node.setAttribute(k, attrs[k]);
      }
    }
    for (const c of [].concat(children || [])) {
      if (c === null || c === undefined) continue;
      node.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
    }
    return node;
  }
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const clone = (v) => (typeof structuredClone === 'function' ? structuredClone(v) : JSON.parse(JSON.stringify(v)));

  function toast(msg, kind) {
    const t = el('div', { class: 'xcc-toast ' + (kind || ''), text: msg });
    document.body.appendChild(t);
    requestAnimationFrame(() => t.classList.add('show'));
    setTimeout(() => { t.classList.remove('show'); setTimeout(() => t.remove(), 250); }, 3200);
  }

  // ---- styles ----------------------------------------------------------------

  const STYLE = `
  #${PANEL_ID}, #${FAB_ID} { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; box-sizing: border-box; }
  #${PANEL_ID} *, #${FAB_ID} * { box-sizing: border-box; }
  #${PANEL_ID} {
    position: fixed; width: 380px; max-height: 90vh; background: #15202b; color: #e7e9ea;
    border: 1px solid #38444d; border-radius: 16px; font-size: 13px; z-index: 2147483647;
    box-shadow: 0 12px 40px rgba(0,0,0,0.55); display: flex; flex-direction: column;
  }
  #${PANEL_ID} .xcc-header {
    background: #1d9bf0; color: #fff; padding: 11px 14px; cursor: move; border-radius: 15px 15px 0 0;
    display: flex; align-items: center; justify-content: space-between; font-weight: 800; font-size: 14px; flex: 0 0 auto;
  }
  #${PANEL_ID} .xcc-header .xcc-hbtns { display: flex; gap: 5px; }
  #${PANEL_ID} .xcc-header button {
    background: rgba(255,255,255,0.16); border: none; color: #fff; width: 25px; height: 25px;
    border-radius: 7px; cursor: pointer; font-size: 13px; line-height: 1; transition: background 0.15s;
  }
  #${PANEL_ID} .xcc-header button:hover { background: rgba(255,255,255,0.32); }
  #${PANEL_ID} .xcc-search { padding: 10px 12px 6px; flex: 0 0 auto; }
  #${PANEL_ID} .xcc-search input {
    width: 100%; background: #192734; color: #e7e9ea; border: 1px solid #38444d; border-radius: 10px;
    padding: 9px 12px; font-size: 13px; outline: none;
  }
  #${PANEL_ID} .xcc-search input:focus { border-color: #1d9bf0; }
  #${PANEL_ID} .xcc-cats { display: flex; gap: 5px; overflow-x: auto; padding: 4px 12px 8px; flex: 0 0 auto; scrollbar-width: none; }
  #${PANEL_ID} .xcc-cats::-webkit-scrollbar { display: none; }
  #${PANEL_ID} .xcc-cat {
    white-space: nowrap; background: #192734; border: 1px solid #38444d; color: #8899a6; border-radius: 999px;
    padding: 4px 11px; font-size: 11.5px; font-weight: 700; cursor: pointer; transition: all 0.15s;
  }
  #${PANEL_ID} .xcc-cat:hover { color: #e7e9ea; }
  #${PANEL_ID} .xcc-cat.active { background: #1d9bf0; border-color: #1d9bf0; color: #fff; }
  #${PANEL_ID} .xcc-body { overflow-y: auto; flex: 1 1 auto; padding: 0 8px 8px; }
  #${PANEL_ID} .xcc-body::-webkit-scrollbar { width: 9px; }
  #${PANEL_ID} .xcc-body::-webkit-scrollbar-thumb { background: #38444d; border-radius: 5px; }
  #${PANEL_ID} .xcc-group-label { color: #536471; font-size: 10.5px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.6px; padding: 12px 8px 5px; }
  #${PANEL_ID} .xcc-row {
    display: flex; align-items: center; gap: 10px; padding: 8px 10px; border-radius: 10px; cursor: pointer; transition: background 0.12s;
  }
  #${PANEL_ID} .xcc-row:hover, #${PANEL_ID} .xcc-row.active { background: #1e2a37; }
  #${PANEL_ID} .xcc-row .xcc-emoji { font-size: 18px; width: 24px; text-align: center; flex: 0 0 auto; }
  #${PANEL_ID} .xcc-row .xcc-meta { flex: 1 1 auto; min-width: 0; }
  #${PANEL_ID} .xcc-row .xcc-title { font-weight: 700; display: flex; align-items: center; gap: 7px; }
  #${PANEL_ID} .xcc-row .xcc-title .xcc-dot { width: 7px; height: 7px; border-radius: 50%; flex: 0 0 auto; }
  #${PANEL_ID} .xcc-row .xcc-sub { color: #8899a6; font-size: 11.5px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  #${PANEL_ID} .xcc-star { flex: 0 0 auto; color: #536471; font-size: 15px; cursor: pointer; padding: 2px; transition: color 0.15s, transform 0.1s; }
  #${PANEL_ID} .xcc-star:hover { transform: scale(1.2); }
  #${PANEL_ID} .xcc-star.on { color: #ffd400; }
  #${PANEL_ID} .xcc-empty { text-align: center; color: #536471; padding: 40px 20px; font-size: 12.5px; }
  /* detail */
  #${PANEL_ID} .xcc-detail { padding: 10px 14px 4px; }
  #${PANEL_ID} .xcc-back { background: none; border: none; color: #1d9bf0; cursor: pointer; font-size: 12.5px; font-weight: 700; padding: 4px 0 8px; display: inline-flex; gap: 5px; align-items: center; }
  #${PANEL_ID} .xcc-dtitle { display: flex; align-items: center; gap: 10px; font-size: 17px; font-weight: 800; }
  #${PANEL_ID} .xcc-badges { display: flex; gap: 6px; margin: 9px 0; flex-wrap: wrap; }
  #${PANEL_ID} .xcc-badge { padding: 3px 9px; border-radius: 999px; font-size: 10.5px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.4px; }
  #${PANEL_ID} .xcc-badge.cat { background: #192734; color: #8899a6; border: 1px solid #38444d; }
  #${PANEL_ID} .xcc-ddesc { color: #cfd9e0; font-size: 13px; line-height: 1.5; margin: 4px 0 10px; }
  #${PANEL_ID} .xcc-where { background: #192734; border: 1px solid #38444d; border-radius: 10px; padding: 9px 11px; font-size: 12px; margin-bottom: 10px; }
  #${PANEL_ID} .xcc-where b { color: #e7e9ea; }
  #${PANEL_ID} .xcc-where .xcc-where-link { color: #1d9bf0; text-decoration: none; word-break: break-all; }
  #${PANEL_ID} .xcc-where.warn { border-color: #ffd400; }
  #${PANEL_ID} .xcc-warn {
    background: rgba(244,33,46,0.12); border: 1px solid rgba(244,33,46,0.5); border-radius: 10px;
    padding: 9px 11px; font-size: 12px; color: #ffb3b8; margin-bottom: 10px; line-height: 1.45;
  }
  #${PANEL_ID} .xcc-opts { margin-bottom: 10px; }
  #${PANEL_ID} .xcc-opts > summary {
    cursor: pointer; font-weight: 800; color: #e7e9ea; list-style: none; padding: 6px 0; font-size: 12.5px;
    display: flex; justify-content: space-between; align-items: center;
  }
  #${PANEL_ID} .xcc-opts > summary::after { content: '\\25be'; color: #8899a6; }
  #${PANEL_ID} .xcc-opts[open] > summary::after { content: '\\25b4'; }
  #${PANEL_ID} .xcc-optbar { display: flex; gap: 8px; margin: 2px 0 8px; }
  #${PANEL_ID} .xcc-optbar button { background: none; border: none; color: #1d9bf0; cursor: pointer; font-size: 11.5px; font-weight: 700; padding: 0; }
  #${PANEL_ID} .xcc-field { display: grid; gap: 3px; margin-bottom: 8px; }
  #${PANEL_ID} .xcc-field > label { color: #8899a6; font-size: 11px; }
  #${PANEL_ID} .xcc-field input[type="text"], #${PANEL_ID} .xcc-field input[type="number"], #${PANEL_ID} .xcc-field select, #${PANEL_ID} .xcc-json {
    background: #192734; color: #e7e9ea; border: 1px solid #38444d; border-radius: 8px; padding: 7px 9px; font-size: 12px; width: 100%; outline: none;
  }
  #${PANEL_ID} .xcc-field input:focus, #${PANEL_ID} .xcc-json:focus { border-color: #1d9bf0; }
  #${PANEL_ID} .xcc-check { display: flex; align-items: center; gap: 8px; color: #e7e9ea; font-size: 12.5px; cursor: pointer; margin-bottom: 8px; }
  #${PANEL_ID} .xcc-check input { accent-color: #1d9bf0; width: 15px; height: 15px; }
  #${PANEL_ID} .xcc-sub-obj { border: 1px solid #2b3742; border-radius: 8px; padding: 8px 10px; margin-bottom: 8px; }
  #${PANEL_ID} .xcc-sub-obj > .xcc-sub-title { color: #8899a6; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.4px; margin-bottom: 6px; }
  #${PANEL_ID} .xcc-json { min-height: 90px; font-family: ui-monospace, SFMono-Regular, Menlo, monospace; resize: vertical; }
  #${PANEL_ID} .xcc-json.bad { border-color: #f4212e; }
  #${PANEL_ID} .xcc-run {
    width: 100%; border: none; border-radius: 12px; padding: 12px 0; font-weight: 800; font-size: 14px; cursor: pointer;
    color: #04120c; background: #00ba7c; transition: filter 0.15s, transform 0.05s; margin-bottom: 4px;
  }
  #${PANEL_ID} .xcc-run.caution { background: #ffd400; color: #1a1400; }
  #${PANEL_ID} .xcc-run.destructive { background: #f4212e; color: #fff; }
  #${PANEL_ID} .xcc-run:hover { filter: brightness(1.1); }
  #${PANEL_ID} .xcc-run:active { transform: scale(0.99); }
  /* dock */
  #${PANEL_ID} .xcc-dock { border-top: 1px solid #38444d; padding: 8px 12px; flex: 0 0 auto; max-height: 150px; overflow-y: auto; }
  #${PANEL_ID} .xcc-dock-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px; }
  #${PANEL_ID} .xcc-dock-head span { color: #536471; font-size: 10.5px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px; }
  #${PANEL_ID} .xcc-dock-head button { background: none; border: none; color: #f4212e; font-size: 11px; font-weight: 700; cursor: pointer; padding: 0; }
  #${PANEL_ID} .xcc-run-item { display: flex; align-items: center; gap: 8px; background: #192734; border-radius: 8px; padding: 6px 9px; margin-bottom: 5px; font-size: 12px; }
  #${PANEL_ID} .xcc-run-item .xcc-ri-meta { flex: 1 1 auto; min-width: 0; }
  #${PANEL_ID} .xcc-run-item .xcc-ri-title { font-weight: 700; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  #${PANEL_ID} .xcc-run-item .xcc-ri-time { color: #536471; font-size: 10.5px; }
  #${PANEL_ID} .xcc-run-item button { background: #f4212e; border: none; color: #fff; border-radius: 7px; padding: 4px 10px; font-size: 11px; font-weight: 700; cursor: pointer; flex: 0 0 auto; }
  #${PANEL_ID} .xcc-run-item button.ghost { background: #38444d; }
  #${PANEL_ID} .xcc-footer { padding: 7px 14px 10px; color: #536471; font-size: 10.5px; text-align: center; flex: 0 0 auto; }
  #${PANEL_ID} .xcc-footer a { color: #1d9bf0; text-decoration: none; }
  #${PANEL_ID}.xcc-min .xcc-search, #${PANEL_ID}.xcc-min .xcc-cats, #${PANEL_ID}.xcc-min .xcc-body, #${PANEL_ID}.xcc-min .xcc-footer, #${PANEL_ID}.xcc-min .xcc-dock { display: none; }
  #${FAB_ID} {
    position: fixed; bottom: 22px; right: 22px; width: 52px; height: 52px; border-radius: 50%; background: #1d9bf0;
    color: #fff; border: none; cursor: pointer; font-size: 24px; z-index: 2147483646; box-shadow: 0 6px 20px rgba(29,155,240,0.5);
    display: flex; align-items: center; justify-content: center; transition: transform 0.15s, filter 0.15s;
  }
  #${FAB_ID}:hover { transform: scale(1.08); filter: brightness(1.08); }
  .xcc-toast {
    position: fixed; bottom: 22px; left: 50%; transform: translate(-50%, 20px); background: #192734; color: #e7e9ea;
    border: 1px solid #38444d; border-radius: 12px; padding: 11px 18px; font-size: 13px; z-index: 2147483647;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; opacity: 0; transition: opacity 0.25s, transform 0.25s;
    box-shadow: 0 8px 24px rgba(0,0,0,0.5); max-width: 80vw;
  }
  .xcc-toast.show { opacity: 1; transform: translate(-50%, 0); }
  .xcc-toast.good { border-color: #00ba7c; }
  .xcc-toast.bad { border-color: #f4212e; }
  `;

  // ---- launched-tool tracking (the dock) ------------------------------------

  const launched = []; // { id, title, at, stopGlobal }

  function fmtTime(ts) {
    const d = new Date(ts);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  // ---- panel construction ----------------------------------------------------

  let panel, fab, els = {}, view = 'list', activeIndex = 0, visibleRows = [];

  function build() {
    const style = el('style', { id: PANEL_ID + '-style', html: STYLE });
    document.head.appendChild(style);

    panel = el('div', { id: PANEL_ID });
    panel.style.top = (state.pos.top || 72) + 'px';
    if (state.pos.left !== null && state.pos.left !== undefined) panel.style.left = state.pos.left + 'px';
    else panel.style.right = '22px';

    const header = el('div', { class: 'xcc-header' }, [
      el('span', { html: '&#9889; XActions Command Center' }),
      el('div', { class: 'xcc-hbtns' }, [
        el('button', { title: 'Minimize', text: '–', onclick: () => panel.classList.toggle('xcc-min') }),
        el('button', { title: 'Close', text: '✕', onclick: close })
      ])
    ]);
    els.search = el('input', { type: 'text', placeholder: 'Search ' + CATALOG.length + ' tools…', spellcheck: 'false', autocomplete: 'off', oninput: () => { activeIndex = 0; renderList(); } });
    els.searchWrap = el('div', { class: 'xcc-search' }, [els.search]);
    els.cats = el('div', { class: 'xcc-cats' });
    els.body = el('div', { class: 'xcc-body' });
    els.dock = el('div', { class: 'xcc-dock', style: 'display:none' });
    els.footer = el('div', { class: 'xcc-footer', html: 'XActions v' + VERSION + ' · <a href="https://github.com/nirholas/XActions" target="_blank" rel="noopener">github.com/nirholas/XActions</a> · <a href="https://xactions.app" target="_blank" rel="noopener">xactions.app</a>' });

    panel.append(header, els.searchWrap, els.cats, els.body, els.dock, els.footer);
    document.body.appendChild(panel);

    fab = el('button', { id: FAB_ID, title: 'XActions Command Center', html: '&#9889;', onclick: open, style: 'display:none' });
    document.body.appendChild(fab);

    renderCats();
    renderList();
    makeDraggable(header);
    document.addEventListener('keydown', onKey, true);
    els.search.focus();
  }

  function renderCats() {
    els.cats.innerHTML = '';
    const all = [{ id: 'all', label: 'All', emoji: '✨' }, { id: 'favorites', label: 'Favorites', emoji: '⭐' }, ...CATEGORIES];
    for (const c of all) {
      const chip = el('button', { class: 'xcc-cat' + (state.category === c.id ? ' active' : ''), text: c.emoji + ' ' + c.label, onclick: () => { state.category = c.id; saveState(); activeIndex = 0; renderCats(); renderList(); } });
      els.cats.appendChild(chip);
    }
  }

  function matches(tool, q) {
    if (!q) return true;
    const hay = (tool.title + ' ' + tool.desc + ' ' + tool.category + ' ' + tool.id).toLowerCase();
    return q.toLowerCase().split(/\s+/).every((w) => hay.includes(w));
  }

  function renderList() {
    view = 'list';
    els.searchWrap.style.display = '';
    els.cats.style.display = '';
    els.body.innerHTML = '';
    const q = els.search.value.trim();
    let pool = CATALOG.slice();
    if (state.category === 'favorites') pool = pool.filter((t) => state.favorites.includes(t.id));
    else if (state.category !== 'all') pool = pool.filter((t) => t.category === state.category);
    pool = pool.filter((t) => matches(t, q));

    visibleRows = [];

    if (!pool.length) {
      els.body.appendChild(el('div', { class: 'xcc-empty', html: 'No tools match. Try another search or category.' }));
      renderDock();
      return;
    }

    // Favorites + Recents shortcuts only on the unfiltered "all" view.
    if (state.category === 'all' && !q) {
      if (state.favorites.length) appendGroup('⭐ Favorites', state.favorites.map((id) => byId[id]).filter(Boolean));
      const recents = state.recents.map((id) => byId[id]).filter(Boolean);
      if (recents.length) appendGroup('\u{1f552} Recent', recents);
    }

    if (state.category === 'all' && !q) {
      for (const cat of CATEGORIES) {
        const items = pool.filter((t) => t.category === cat.id);
        if (items.length) appendGroup(cat.emoji + ' ' + cat.label, items);
      }
    } else {
      appendGroup(null, pool);
    }
    highlight();
    renderDock();
  }

  function appendGroup(label, items) {
    if (label) els.body.appendChild(el('div', { class: 'xcc-group-label', text: label }));
    for (const tool of items) {
      const idx = visibleRows.length;
      const star = el('span', {
        class: 'xcc-star' + (state.favorites.includes(tool.id) ? ' on' : ''), title: 'Favorite', html: '★',
        onclick: (e) => { e.stopPropagation(); toggleFav(tool.id); }
      });
      const row = el('div', { class: 'xcc-row', onclick: () => openDetail(tool.id) }, [
        el('span', { class: 'xcc-emoji', text: tool.emoji }),
        el('div', { class: 'xcc-meta' }, [
          el('div', { class: 'xcc-title' }, [
            el('span', { class: 'xcc-dot', style: 'background:' + DANGER[tool.danger].color, title: DANGER[tool.danger].label }),
            document.createTextNode(tool.title)
          ]),
          el('div', { class: 'xcc-sub', text: tool.desc })
        ]),
        star
      ]);
      row.dataset.idx = idx;
      visibleRows.push({ tool, row });
      els.body.appendChild(row);
    }
  }

  function highlight() {
    visibleRows.forEach((r, i) => r.row.classList.toggle('active', i === activeIndex));
    const active = visibleRows[activeIndex];
    if (active) active.row.scrollIntoView({ block: 'nearest' });
  }

  function toggleFav(id) {
    const i = state.favorites.indexOf(id);
    if (i >= 0) state.favorites.splice(i, 1); else state.favorites.push(id);
    saveState();
    if (view === 'list') renderList();
  }

  function pushRecent(id) {
    state.recents = [id, ...state.recents.filter((r) => r !== id)].slice(0, 6);
    saveState();
  }

  // ---- detail view -----------------------------------------------------------

  function openDetail(id) {
    const tool = byId[id];
    if (!tool) return;
    view = 'detail';
    els.searchWrap.style.display = 'none';
    els.cats.style.display = 'none';
    els.body.innerHTML = '';

    const wrap = el('div', { class: 'xcc-detail' });
    wrap.appendChild(el('button', { class: 'xcc-back', html: '← All tools', onclick: renderList }));
    wrap.appendChild(el('div', { class: 'xcc-dtitle' }, [el('span', { text: tool.emoji }), document.createTextNode(tool.title)]));

    const cat = CATEGORIES.find((c) => c.id === tool.category);
    wrap.appendChild(el('div', { class: 'xcc-badges' }, [
      el('span', { class: 'xcc-badge cat', text: (cat ? cat.label : tool.category) }),
      el('span', { class: 'xcc-badge', style: 'background:' + DANGER[tool.danger].color + ';color:#04120c', text: DANGER[tool.danger].label })
    ]));

    wrap.appendChild(el('div', { class: 'xcc-ddesc', text: tool.desc }));

    // Where to run
    const onRight = pageMatches(tool.where);
    const whereBox = el('div', { class: 'xcc-where' + (onRight === false ? ' warn' : '') });
    whereBox.innerHTML = '<b>Where to run:</b> ' + esc(tool.where.label) +
      (tool.where.url ? ' &middot; <a class="xcc-where-link" href="' + esc(tool.where.url) + '" target="_blank" rel="noopener">open page ↗</a>' : '') +
      (onRight === false ? '<br><span style="color:#ffd400">You may not be on the right page for this tool.</span>' : '');
    wrap.appendChild(whereBox);

    // Danger note
    if (tool.danger !== 'safe') {
      wrap.appendChild(el('div', { class: (tool.danger === 'destructive' ? 'xcc-warn' : 'xcc-where') }, [
        el('span', { html: (tool.danger === 'destructive' ? '⚠️ ' : '') + esc(DANGER[tool.danger].note) })
      ]));
    }

    // Options form
    let form = null;
    if (tool.defaults && Object.keys(tool.defaults).length) {
      const details = el('details', { class: 'xcc-opts' });
      details.appendChild(el('summary', { text: '⚙️ Options' }));
      form = buildForm(tool.defaults);
      const bar = el('div', { class: 'xcc-optbar' }, [
        el('button', { text: 'Reset', onclick: () => { form.reset(); } }),
        el('button', { text: form.jsonMode() ? 'Form editor' : 'Edit as JSON', onclick: (e) => { const j = form.toggleJson(); e.target.textContent = j ? 'Form editor' : 'Edit as JSON'; } })
      ]);
      details.append(bar, form.element);
      wrap.appendChild(details);
    }

    const runBtn = el('button', { class: 'xcc-run ' + tool.danger, text: '▶ Run ' + tool.title });
    let armed = false;
    runBtn.addEventListener('click', () => {
      if (tool.danger === 'destructive' && !armed) {
        armed = true;
        runBtn.textContent = '⚠️ Click again to confirm. This cannot be undone';
        setTimeout(() => { if (armed) { armed = false; runBtn.textContent = '▶ Run ' + tool.title; } }, 4000);
        return;
      }
      let cfg = null;
      if (form) {
        try { cfg = form.getValue(); }
        catch (e) { toast('Options are not valid JSON: ' + e.message, 'bad'); return; }
      }
      runTool(tool.id, cfg);
    });
    wrap.appendChild(runBtn);

    if (tool.stopGlobal) {
      wrap.appendChild(el('div', { class: 'xcc-footer', style: 'text-align:left;padding:8px 0 2px', html: 'This tool runs until done or stopped. Use <b>Stop</b> in the panel dock, or run <code>window.' + esc(tool.stopGlobal) + '()</code> in the console.' }));
    }

    els.body.appendChild(wrap);
    renderDock();
  }

  function pageMatches(where) {
    if (!where || !where.match) return null;
    try {
      const path = location.pathname + location.search;
      return where.match.some((rx) => new RegExp(rx, 'i').test(path));
    } catch (e) { return null; }
  }

  // ---- options form builder --------------------------------------------------

  function buildForm(defaults) {
    const root = el('div');
    let jsonMode = false;
    const jsonArea = el('textarea', { class: 'xcc-json', spellcheck: 'false', style: 'display:none' });
    const fieldsWrap = el('div');
    root.append(fieldsWrap, jsonArea);

    const getters = [];
    function renderFields(obj, container, prefix) {
      for (const key of Object.keys(obj)) {
        const val = obj[key];
        const path = prefix ? prefix + '.' + key : key;
        if (val === null || typeof val === 'function') continue;
        if (typeof val === 'boolean') {
          const input = el('input', { type: 'checkbox' });
          input.checked = val;
          container.appendChild(el('label', { class: 'xcc-check' }, [input, document.createTextNode(key)]));
          getters.push({ path, get: () => input.checked });
        } else if (typeof val === 'number') {
          const input = el('input', { type: 'number', value: String(val) });
          container.appendChild(el('div', { class: 'xcc-field' }, [el('label', { text: key }), input]));
          getters.push({ path, get: () => { const n = Number(input.value); return Number.isFinite(n) ? n : val; } });
        } else if (typeof val === 'string') {
          const input = el('input', { type: 'text', value: val });
          container.appendChild(el('div', { class: 'xcc-field' }, [el('label', { text: key }), input]));
          getters.push({ path, get: () => input.value });
        } else if (Array.isArray(val)) {
          const primitive = val.every((v) => typeof v === 'string' || typeof v === 'number');
          if (primitive) {
            const input = el('input', { type: 'text', value: val.join(', ') });
            container.appendChild(el('div', { class: 'xcc-field' }, [el('label', { text: key + ' (comma-separated)' }), input]));
            getters.push({ path, get: () => input.value.split(',').map((s) => s.trim()).filter(Boolean) });
          } else {
            addJsonField(container, key, val, path);
          }
        } else if (typeof val === 'object') {
          // one level of nesting as a labelled sub-section
          if (!prefix) {
            const sub = el('div', { class: 'xcc-sub-obj' }, [el('div', { class: 'xcc-sub-title', text: key })]);
            container.appendChild(sub);
            renderFields(val, sub, path);
          } else {
            addJsonField(container, key, val, path);
          }
        }
      }
    }
    function addJsonField(container, key, val, path) {
      const area = el('textarea', { class: 'xcc-json', spellcheck: 'false', style: 'min-height:60px' });
      area.value = JSON.stringify(val, null, 2);
      container.appendChild(el('div', { class: 'xcc-field' }, [el('label', { text: key + ' (JSON)' }), area]));
      getters.push({ path, get: () => JSON.parse(area.value) });
    }

    function setDeep(obj, path, value) {
      const parts = path.split('.');
      let o = obj;
      for (let i = 0; i < parts.length - 1; i++) { o[parts[i]] = o[parts[i]] || {}; o = o[parts[i]]; }
      o[parts[parts.length - 1]] = value;
    }

    renderFields(defaults, fieldsWrap, '');

    return {
      element: root,
      jsonMode: () => jsonMode,
      toggleJson() {
        jsonMode = !jsonMode;
        if (jsonMode) { jsonArea.value = JSON.stringify(this.getValueFromFields(), null, 2); jsonArea.style.display = ''; fieldsWrap.style.display = 'none'; }
        else { fieldsWrap.style.display = ''; jsonArea.style.display = 'none'; }
        return jsonMode;
      },
      getValueFromFields() {
        const out = clone(defaults);
        for (const g of getters) { try { setDeep(out, g.path, g.get()); } catch (e) { /* keep default */ } }
        return out;
      },
      getValue() {
        if (jsonMode) { jsonArea.classList.remove('bad'); try { return JSON.parse(jsonArea.value); } catch (e) { jsonArea.classList.add('bad'); throw e; } }
        return this.getValueFromFields();
      },
      reset() {
        jsonMode = false; jsonArea.style.display = 'none'; fieldsWrap.style.display = '';
        fieldsWrap.innerHTML = ''; getters.length = 0; renderFields(defaults, fieldsWrap, '');
      }
    };
  }

  // ---- running a tool --------------------------------------------------------

  function runTool(id, cfg) {
    const tool = byId[id];
    if (!tool || typeof TOOLS[id] !== 'function') { toast('Tool not found: ' + id, 'bad'); return; }
    pushRecent(id);
    if (cfg) window.__XA_LAUNCH_CFG = cfg; else delete window.__XA_LAUNCH_CFG;
    let started = true;
    try {
      TOOLS[id]();
    } catch (e) {
      started = false;
      console.error(TAG, 'failed to start', id, e);
      toast('Failed to start ' + tool.title + ': ' + e.message, 'bad');
    }
    // The tool has read CONFIG synchronously by now; clear the shared override.
    delete window.__XA_LAUNCH_CFG;
    if (!started) return;
    launched.unshift({ id, title: tool.title, at: Date.now(), stopGlobal: tool.stopGlobal });
    toast('▶ Launched “' + tool.title + '”. Open the Console (F12) to watch progress', 'good');
    panel.classList.remove('xcc-min');
    renderDock();
  }

  function renderDock() {
    if (!launched.length) { els.dock.style.display = 'none'; els.dock.innerHTML = ''; return; }
    els.dock.style.display = '';
    els.dock.innerHTML = '';
    const anyStoppable = launched.some((l) => l.stopGlobal);
    const head = el('div', { class: 'xcc-dock-head' }, [
      el('span', { text: 'Launched this session' }),
      anyStoppable ? el('button', { text: 'Stop all', onclick: stopAll }) : el('button', { text: 'Clear', style: 'color:#536471', onclick: () => { launched.length = 0; renderDock(); } })
    ]);
    els.dock.appendChild(head);
    for (const item of launched.slice(0, 8)) {
      const controls = item.stopGlobal
        ? el('button', { text: 'Stop', onclick: () => stopOne(item) })
        : el('button', { class: 'ghost', text: 'Console', title: 'Progress prints to the DevTools Console', onclick: () => toast('Open DevTools → Console to see this tool’s progress') });
      els.dock.appendChild(el('div', { class: 'xcc-run-item' }, [
        el('span', { text: byId[item.id] ? byId[item.id].emoji : '▶' }),
        el('div', { class: 'xcc-ri-meta' }, [
          el('div', { class: 'xcc-ri-title', text: item.title }),
          el('div', { class: 'xcc-ri-time', text: 'started ' + fmtTime(item.at) })
        ]),
        controls
      ]));
    }
  }

  function stopOne(item) {
    if (item.stopGlobal && typeof window[item.stopGlobal] === 'function') {
      try { window[item.stopGlobal](); toast('⏹ Stopping ' + item.title + '…'); }
      catch (e) { toast('Could not stop ' + item.title + ': ' + e.message, 'bad'); }
    }
  }
  function stopAll() {
    const globals = [...new Set(launched.map((l) => l.stopGlobal).filter(Boolean))];
    let n = 0;
    for (const g of globals) { if (typeof window[g] === 'function') { try { window[g](); n++; } catch (e) { /* ignore */ } } }
    toast(n ? '⏹ Sent stop to ' + n + ' running tool' + (n > 1 ? 's' : '') : 'Nothing running to stop');
  }

  // ---- keyboard --------------------------------------------------------------

  function onKey(e) {
    // Global reopen shortcut.
    if ((e.metaKey || e.ctrlKey) && (e.key === 'k' || e.key === 'K')) {
      if (e.shiftKey) return; // leave X's own shortcuts alone
      e.preventDefault(); e.stopPropagation();
      if (panel && panel.style.display !== 'none') els.search.focus();
      else open();
      return;
    }
    if (!panel || panel.style.display === 'none') return;
    const inField = e.target && panel.contains(e.target) && /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName) && e.target !== els.search;
    if (e.key === 'Escape') {
      if (view === 'detail') { e.preventDefault(); renderList(); els.search.focus(); }
      else { e.preventDefault(); close(); }
      return;
    }
    if (view !== 'list' || inField) return;
    if (e.key === 'ArrowDown') { e.preventDefault(); activeIndex = Math.min(activeIndex + 1, visibleRows.length - 1); highlight(); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); activeIndex = Math.max(activeIndex - 1, 0); highlight(); }
    else if (e.key === 'Enter') { const r = visibleRows[activeIndex]; if (r) { e.preventDefault(); openDetail(r.tool.id); } }
  }

  // ---- drag ------------------------------------------------------------------

  function makeDraggable(handle) {
    let sx, sy, st, sl, dragging = false;
    handle.addEventListener('mousedown', (e) => {
      if (e.target.closest('button')) return;
      dragging = true;
      const r = panel.getBoundingClientRect();
      sx = e.clientX; sy = e.clientY; st = r.top; sl = r.left;
      panel.style.right = 'auto'; panel.style.left = sl + 'px';
      e.preventDefault();
    });
    document.addEventListener('mousemove', (e) => {
      if (!dragging) return;
      const top = Math.max(0, Math.min(window.innerHeight - 60, st + e.clientY - sy));
      const left = Math.max(0, Math.min(window.innerWidth - 60, sl + e.clientX - sx));
      panel.style.top = top + 'px'; panel.style.left = left + 'px';
    });
    document.addEventListener('mouseup', () => {
      if (!dragging) return;
      dragging = false;
      const r = panel.getBoundingClientRect();
      state.pos = { top: Math.round(r.top), left: Math.round(r.left) };
      saveState();
    });
  }

  // ---- lifecycle -------------------------------------------------------------

  function open() {
    if (!panel) return;
    panel.style.display = 'flex';
    if (fab) fab.style.display = 'none';
    view = 'list';
    renderList();
    els.search.focus();
  }
  function close() {
    if (!panel) return;
    panel.style.display = 'none';
    if (fab) fab.style.display = 'flex';
  }
  function destroy() {
    document.removeEventListener('keydown', onKey, true);
    if (panel) panel.remove();
    if (fab) fab.remove();
    const s = document.getElementById(PANEL_ID + '-style');
    if (s) s.remove();
    delete window.XActionsCommandCenter;
  }

  build();

  console.log('%c⚡ XActions Command Center v' + VERSION, 'color:#1d9bf0;font-weight:bold;font-size:14px');
  console.log('%c' + CATALOG.length + ' tools loaded. Search, pick one, and press Run. Reopen anytime with the ⚡ button or Cmd/Ctrl+K.', 'color:#8899a6');

  window.XActionsCommandCenter = {
    open, close, destroy,
    tools: () => CATALOG.map((t) => ({ id: t.id, title: t.title, category: t.category, danger: t.danger })),
    run: (id, cfg) => runTool(id, cfg || null),
    version: VERSION
  };
})();
