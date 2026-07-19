# Browser script audit: scripts/twitter (2026-07-19)

Systematic audit of all 66 paste-in-console scripts in scripts/twitter/ (plus src/cli/index.js). 103 bugs found and fixed across 52 files. Method: every file checked against a shared bug checklist (corrupted constants, quoted-tweet ID misattribution, locale-dependent detection, engagement parsing, stall detection, infinite loops, selector drift, CSV/HTML export corruption, fake results).

# Batch 1 audit report

Repo: `/tmp/claude-1000/-workspaces-three-ws/5569b458-7481-4382-b68d-9456f4af03d8/scratchpad/XActions`
All 17 assigned files pass `node --check`. No em/en dashes introduced. No git commands run.

## scripts/twitter/audit-followers.js
Bugs found and fixed:
- Quality score could exceed 100 (verified weight 5 against divisor 3, checklist 1/11): `'░'.repeat(20 - score/5)` becomes a negative repeat and throws a RangeError, and the "x/100" display lies. Clamped with `Math.min(100, ...)` (line ~209).
- Verified detection used the English-only `svg[aria-label*="Verified"]` (checklist 3). Now checks `[data-testid="icon-verified"]` (per docs/agents/selectors.md) first with the aria-label kept as fallback (line ~119).

Not changed (noted): follower/following counts are parsed from UserCell text (`/([\d,.]+[KMB]?)\s*Following/`), but X does not render counts inside follower-list UserCells, so most stats (ratio, averages, reach, influencer detection) resolve to 0. A correct fix requires hovercard or profile visits, which is a redesign, not a bug fix.

## scripts/twitter/auto-commenter.js
Bugs found and fixed:
- Tweet ID from the first `a[href*="/status/"]` could belong to a quoted tweet (checklist 2). Now derived from `time.closest('a[href*="/status/"]')` with the old selector as fallback (getTweetId, line ~133).
- Reply detection read `socialContext` text for "Replying" (wrong element, English-only, checklist 3). Now uses `[data-testid="in-reply-to"]` plus a "Replying to" text fallback (matchesCriteria, line ~165).
- Media check missed `videoComponent` (checklist 7); added alongside `videoPlayer` (line ~176).

## scripts/twitter/auto-liker.js
Bugs found and fixed:
- Same quoted-tweet ID bug; same time-anchor fix (getTweetId, line ~154).
- Same wrong-element English-only reply detection; same structural fix (line ~137).
- Ad skip used `innerText.includes('Ad')`, which matches any tweet containing "Advice", "Adam", etc. (checklist 3/8). Now checks `[data-testid="placementTracking"]` plus exact-span "Ad"/"Promoted" match (line ~143).
- `fromUsers` author check took the first `a[href^="/"]` in the article, which on a repost is the reposter's socialContext link. Now prefers `[data-testid="User-Name"] a[href^="/"]` (line ~121).

## scripts/twitter/backup-account.js
Bugs found and fixed:
- Quoted-tweet ID/permalink bug in `extractTweetData` (checklist 2); fixed with the time-anchor pattern, and the author link now prefers the User-Name block (line ~93).
- Username extraction did `href.replace('https://x.com/', '')` without splitting the path, leaving trailing segments (and breaking entirely on a twitter.com origin). Both extractors now use `getAttribute('href').replace('/', '').split('/')[0]` (lines ~104, ~116).

## scripts/twitter/best-time-to-post.js
Bug found and fixed:
- Heatmap: when every scraped post has 0 engagement, `maxHeat` is 0 and `avg/maxHeat` is NaN, so `heatChars[NaN]` prints "undefined" cells; the existing `map(...) || [1]` guard was dead code (an array is always truthy). Rewrote to compute `heatValues` explicitly, guard `maxHeat > 0`, and clamp intensity to 4 (line ~238).

Clean otherwise: tweet IDs already use the time-anchor pattern; stall detection is independent of logging; loops are capped.

## scripts/twitter/blacklist.js
Bug found and fixed:
- `export()` logged "Copied to clipboard!" unconditionally even when `navigator.clipboard` was absent or the async write rejected (unfocused document rejects, leaving an unhandled rejection; checklist 8/11). Success/failure is now reported from the promise (line ~221).

Not changed (noted): `blockCurrentUser()` matches `x.com/` in the URL and would miss a twitter.com origin; x.com is the canonical domain and twitter.com redirects, so left as is.

## scripts/twitter/block-bots.js
Bug found and fixed:
- Removed the dead `blockUser` stub (was line 264): never called, logged a fake "Would block @user..." and returned hardcoded `true` (checklist 11). Live blocking uses the real inline userActions/block/confirm flow, which is untouched.

Not changed (noted):
- Same UserCell stats-parsing limitation as audit-followers.js: ratio/count heuristics rarely fire because counts are not in the cells; keyword/avatar/username heuristics still work.
- Live mode holds `element` references collected across up to 50 scrolls; X virtualizes the list, so many are detached by blocking time and those blocks silently no-op. A robust fix (re-locating each cell by username, or per-profile navigation) is a redesign; deferred.
- If the userActions dropdown opens but has no block option, the menu is left open (next iteration may misclick). block-by-ratio.js closes it with `document.body.click()`; the same one-liner would help here, left because behavior when a menu is open during the next click is untested.

## scripts/twitter/block-by-keywords.js
Clean; no changes. Same two deferred design notes as block-bots.js (detached elements in live mode, dropdown not explicitly closed). Its results log intentionally overwrites the previous run's storage key, which is a defensible design choice.

## scripts/twitter/block-by-ratio.js
Clean; no changes. It already closes the dropdown after each block. Noted: the `followers > 0` gate means zero-follower accounts are never flagged even though `minFollowers: 5` implies they should be; parseCount returning 0 is ambiguous with parse failure, so the conservative gate was left as is.

## scripts/twitter/bookmark-exporter.js
Bugs found and fixed:
- Quoted-tweet ID bug (checklist 2): fixed with time-anchor pattern (extractBookmark, line ~89).
- Video detection missed `videoComponent` (checklist 7); added (line ~129).
- CSV: `displayTime` was emitted unquoted, but absolute dates render as "Feb 3, 2024", so the comma shifted every subsequent column (checklist 9). Now quoted and escaped (line ~236).

Clean otherwise: text/name are properly CSV-escaped, both Blob URLs are revoked, clipboard write is wrapped in try/catch.

## scripts/twitter/clear-all-bookmarks.js
Bug found and fixed:
- `removeViaMenu` fell back to clicking the first `[role="menuitem"]` of the caret dropdown when no removeBookmark item existed. On a bookmarked tweet that first item is an unrelated action ("Not interested...", follow/mute/etc.), so the script performed a random action and counted it as a removed bookmark (checklist 10/11, plus a real safety issue). The blind fallback is removed; only a real `removeBookmark` item is clicked, otherwise the menu is closed and the pass reported as failed (line ~133).

Not changed (noted): `removeViaBookmarkBtn` (line ~96) is defined but never called (dead code with a locale-dependent `aria-label*="Remove"` fallback inside). Left in place since deleting a working-but-unused helper is beyond bug fixing; flagging for cleanup.

## scripts/twitter/clear-all-likes.js
Clean; no changes. Loop is properly bounded by the retry counter, unlike buttons are located by testid, progress logging is real.

## scripts/twitter/clear-all-retweets.js
Bugs found and fixed:
- Infinite busy-loop (checklist 6): `foundRetweet` was set as soon as a tweet merely looked like a retweet. If its undo failed (button missing after a DOM change, socialContext-only match), the while loop restarted instantly with no scroll, no retry increment, and no sleep, hammering the DOM forever. `foundRetweet` now means "an undo succeeded"; failed passes fall through to the scroll/retry path (line ~142).
- `$retweetIndicator` required `span[data-testid="socialContext"]`; loosened to `[data-testid="socialContext"]` to match the maintained selector shape (line ~61).

Not changed (noted): `isRetweet`'s `includes('repost')` text check is English-only, but the locale-independent unretweet-button check runs right after it and covers every actionable case, so the text check is a harmless extra signal. `$retweetBtn` is an unused constant; left.

## scripts/twitter/comment-by-hashtag.js
Bugs found and fixed:
- Fatal: `searchHashtag` unconditionally assigned `window.location.href`, which reloads the page and kills the running console script, so the commenting loop after it could never execute; the script as shipped could not work at all (checklist 11). Now it proceeds when already on the hashtag's search results and only navigates otherwise, logging that the user must re-run after the reload (processed tweet IDs already persist in sessionStorage, so re-running resumes). `processHashtag` returns false on navigation and the hashtag loop stops with an explanatory comment (lines ~121, ~185, ~278).
- Quoted-tweet ID bug (checklist 2): fixed with the time-anchor pattern (getTweetId, line ~109).

Not changed (noted): with multiple hashtags, finishing one search page still requires a re-run per hashtag (navigation limitation of console scripts). Failed comments are not marked processed, so they retry next pass; defensible.

## scripts/twitter/comment-by-location.js
Bugs found and fixed:
- Same fatal navigation-kills-script bug in `navigateToSearch`; same fix (proceed when the current /search query contains the `near:`/`geocode:` clause, else navigate and instruct re-run), and the main flow only processes tweets when already on the results (lines ~159, ~334).
- Quoted-tweet ID bug (checklist 2): time-anchor fix (getTweetId, line ~119).
- `isRetweet` used English-only `includes('reposted')` (checklist 3); replaced with the structural socialContext-inside-anchor check from the reference commit (line ~138).

## scripts/twitter/competitor-analysis.js
Bug found and fixed:
- Video detection missed `videoComponent` (checklist 7); added (line ~151).

Clean otherwise: tweet IDs already use the time-anchor pattern, aria-label metric parsing handles commas/K/M/B with NaN fallback via parseCount, loops are triple-bounded.

## scripts/twitter/continuous-monitor.js
Bug found and fixed:
- Re-entrancy (checklist 6): `performCheck` scrapes for up to ~75s (50 scrolls x 1.5s) but is invoked by `setInterval` with no overlap guard, so a short `checkIntervalMinutes` (or a slow scrape) runs two concurrent scrapers that fight over `window.scrollTo` and write interleaved corrupt snapshots, producing false unfollower notifications. Added a `checkRunning` flag; the interval callback now skips while a check is in flight (line ~168).

Not changed (noted): "unfollower" detection compares scroll-capped snapshots, so on accounts larger than ~50 scrolls of followers, list reordering can surface false removals. Inherent to the DOM-scrape approach; a fix means raising caps or a different data source. The `x\.com` URL regex would miss a twitter.com origin (redirects make this moot).

## Summary
- Files audited: 17
- Files changed: 14 (clean: block-by-keywords.js, block-by-ratio.js, clear-all-likes.js)
- Bugs fixed: 27 (2 fatal script-killing navigation bugs, 1 infinite busy-loop, 1 unsafe blind menu click, 1 RangeError, 6 quoted-tweet ID bugs, 5 locale-dependent detections, 4 videoComponent gaps, CSV comma bug, clipboard false-success, heatmap NaN, fake block stub, username extraction x2, re-entrancy guard, ad substring match, author-link misattribution)
- Deferred (noted, not changed): UserCell stat parsing yields zeros in 3 block/audit scripts; detached-element blocking in block-bots/block-by-keywords live mode; scroll-capped unfollower false positives in continuous-monitor; dead helper in clear-all-bookmarks; zero-follower gate in block-by-ratio.

# Batch 2 audit report (scripts/twitter, 17 files)

All edited files pass `node --check`. Line refs are post-fix unless noted.

## detect-unfollowers.js
Clean. Loops capped (maxScrolls/maxRetries), Blob URL revoked, snapshot compare logic correct.

## engagement-analytics.js
Clean. Tweet IDs already derived from the timestamp anchor; K/M/B parsing correct; loops capped.
Not changed: top-post listings always append "..." even when text is under 50 chars (cosmetic only). Pre-existing em-dashes in console output strings left as-is (no new ones introduced).

## filter-manager.js
- Bug: `Infinity` max values (followers/following/ratio/tweets) do not survive `JSON.stringify` and came back as `null` from localStorage, so after saving any preset, `check()` failed every account with `followers > null`. Fix: `getFilters()` restores `max == null` to `Infinity` after loading (around lines 133-152).
- Bug: `getFilters()` shallow-spread `{ ...defaultFilters }` aliased the nested category objects, so presets like `quality()` permanently mutated `defaultFilters`, corrupting `presets.none()` and future default loads. Fix: `structuredClone(defaultFilters)` as the base.
- Not changed (deferred): `check()` only evaluates followers/following/tweets/bio/profilePic/verified; the ratio, accountAge, language, activity, and spam categories are configurable but never enforced by `check()`. Implementing them needs caller-side data the helper does not receive; flagged rather than guessed.

## find-fake-followers.js
- Bug: follower/following counts are usually not rendered inside UserCells, so the parse fails, defaults to 0, and every account got a false "Zero followers" flag (+20 score), systematically inflating the fake rate. Fix: the zero/low-follower scoring now only applies when the count was actually present (`followersMatch` guard, lines 174-185).
- Bug: zero scanned followers produced NaN percentages throughout the summary. Fix: early return with an error when nothing was scanned (lines 250-253).
- Not changed (deferred): even after the fix, ratio/following/follower scoring rarely fires because the counts are absent from the list DOM; real per-account stats would need hovercard or profile fetches. The remaining signals (avatar, bio, username pattern) still work.

## follow-engagers.js
Clean. `[data-testid$="-follow"]` does not match `-unfollow` (suffix check verified); scroll loop capped at 30.
Not changed: in mode `'all'`, if the likes link is missing the script still calls `history.back()`; harmless in practice since it only runs after the likes flow.

## follow-target-users.js
Clean. Caps, filters, and storage all correct.

## followers-growth-tracker.js
- Bug: `console.log('\n─'.repeat(50))` repeated the two-char string, printing 50 lines each containing a single dash (line 268 pre-fix). Fix: `'\n' + '─'.repeat(50)`.
- Bug: chart date-axis labels emitted 3 chars per entry then sliced to `recent.length`, putting each label at 3x its column and truncating most of them. Fix: label cells are 3 chars only on every 3rd entry and empty otherwise, so labels align with their columns (lines 260-262).
Not changed: English "Followers/Following" text matching has a structural locale-independent fallback already in place, so left alone.

## growth-suite.js
- Bug (checklist 2): `doLike` took the first `a[href*="/status/"]` in the article, which can be the quoted tweet's permalink, corrupting the dedupe set. Fix: derive the ID from the anchor enclosing the `<time>` element, with the old selector as fallback (lines 203-207).
Not changed: `autoLike`/`autoFollow` loops have no stall counter but are bounded by session duration (30 min) and per-session limits, so they terminate; left per minimal-diff rule.

## hashtag-analytics.js
- Bug: if every post has hashtags, `avgWithoutHashtags` is 0 and the impact line printed "improve engagement by Infinity%". Fix: guard `avgWithoutHashtags > 0` (line 211).
Tweet IDs already use the timestamp-anchor pattern. Pre-existing em-dash in combo output left as-is.

## interact-by-hashtag.js
- Bug (checklist 3): reply detection was `tweet.textContent.includes('Replying to')`, which is English-only and also matches tweets whose body contains that phrase. Fix: structural `[data-testid="in-reply-to"]` check first, text as fallback scoped to `div[dir]` starts-with.
- Bug (checklist 3): retweet detection matched the socialContext text against 'repost' (English-only). Fix: structural check, socialContext inside an `<a>` = repost.
- Bug (checklist 7): media filter missed `videoComponent`; now matches `videoPlayer, videoComponent`.
- Bug (checklist 2): `getTweetId` grabbed the first status link (can be a quoted tweet). Fix: timestamp-anchor pattern with fallback.
- Bug (checklist 11): the advertised `filters.minLikes`/`minRetweets` (default minLikes: 5) were silently ignored. Fix: implemented via aria-label count parsing (new `parseCount` helper matching sibling scripts).
- Bug (checklist 6): `interact()` loop had no end-of-results detection and scrolled forever once results ran out. Fix: breaks after 10 scrolls with no new tweets.
- Fix: the ">50 tweets processed" warning fired on every scroll iteration once passed; now one-shot.

## interact-by-place.js
- Bug (checklist 2): tweet ID from first status link; fixed with the timestamp-anchor pattern (lines 159-163).
- Bug (checklist 6): `interact()` loop unbounded at end of results; fixed with a 10-scroll stall break (lines 213-224).

## interact-by-users.js
- Bug (checklist 11, the big one): `interactWith(username)` never navigated anywhere. It logged "Navigate to: ..." then liked/retweeted whatever page was currently open and recorded those as interactions with the named user; the follow action clicked the first follow button on the page, which could follow an unrelated account. `interactAll()` repeated this fiction for every user in the list and printed "ALL INTERACTIONS COMPLETE". Fix: `interactWith` now verifies the target profile is actually open (path check) and refuses with instructions otherwise; `interactAll` now prints the per-user command sequence (same honest pattern as `interact-by-hashtag.js`'s `interactAll`), since a console script cannot survive page navigation.
- Not changed (deferred): `CONFIG.actions.reply` and `replyTemplates` are still unimplemented (reply flow requires driving X's DraftJS composer with synthetic events, fragile enough that a half-implementation would be worse; default is `reply: false`). `userReplies` stays 0 accordingly.

## interact-with-likers.js
- Bug (checklist 6): in `follow()`, the end-of-list break was gated on `newCells.length > 0`, so a likes list that renders zero UserCells (failed load) scrolled forever. Fix: empty-list stall counter breaks after 5 empty scrolls (lines 186-196).
`collect()` is bounded at 20 scrolls; left as-is.

## join-communities.js
- Bug: `button[aria-label^="Join"]` also matches "Joined ..." buttons via prefix, so with `skipAlreadyJoined: false` the script would click the Joined button and open the leave dialog. Fix: `:not([aria-label^="Joined"])` (line 58).
- Fix: navigation via `window.location.href` wipes the script; the sessionStorage state machine expects a re-paste but the user was never told. Added a one-line "re-paste to continue" log before navigating.
Not changed: English aria-label matching for Join/Joined/Pending mirrors the maintained selectors.md ("Joined button" entry), so kept.

## keyword-follow.js
Clean. Caps, filters, tracking, and selectors all correct.

## leave-all-communities.js
- Bug (checklist 6): a community whose Joined button never appears (admins cannot leave their own community, or a load failure) was never marked processed, so the script bounced back to the list, re-entered the same community, and looped forever. Fix: both the missing-Joined-button and missing-confirm-dialog paths now mark the community processed with a skip message (lines 105-131).
Note: SPA link clicks (not `location.href`) are used for list -> community navigation, so the in-script recursion is sound.

## leave-community.js
Clean. Small, linear, correct; the `location.href` navigation path correctly tells the user to run the script again.

## Summary
- Files audited: 17
- Files with fixes: 10 (filter-manager, find-fake-followers, followers-growth-tracker, growth-suite, hashtag-analytics, interact-by-hashtag, interact-by-place, interact-by-users, interact-with-likers, join-communities, leave-all-communities is the 11th)
- Files clean: 6 (detect-unfollowers, engagement-analytics, follow-engagers, follow-target-users, keyword-follow, leave-community)
- Deferred (noted, not changed): filter-manager `check()` category coverage; find-fake-followers stats availability in list DOM; interact-by-users reply implementation; growth-suite session-bounded loops.

# Batch 3 audit report

Repo: `/tmp/claude-1000/-workspaces-three-ws/5569b458-7481-4382-b68d-9456f4af03d8/scratchpad/XActions`
All 17 assigned files pass `node --check`. No em/en dash characters introduced. No git commands run.

A recurring class of bug in this batch: scripts that "navigate" by assigning `window.location.href`. That triggers a full page load, which destroys the console script's JS context, so everything after the first navigation silently never runs. Fixed with an in-SPA navigation helper (`history.pushState` + synthetic `popstate`, with a cross-origin fallback to `location.href`). Second recurring class: `Date.now()` appended to text-based tweet-ID fallbacks, which made the same tweet look new on every scan pass and defeated deduplication entirely.

## scripts/twitter/like-by-feed.js
Bugs found and fixed:
- `isAd()` (was line 139): `tweet.textContent?.includes('Ad')` matched any tweet containing the substring "Ad" ("Advice", "Adventure", names, etc.), and `skipAds` defaults to true, so many normal tweets were skipped. Now checks the `placementTracking` testid structurally, plus exact `span` text equal to `Ad`/`Promoted`.
- `isRetweet()` (was line 146): mere presence of `socialContext` also matches pinned posts. Now requires `socialContext.closest('a')` (repost) per the brief.
- `isReply()` (was line 133): English-only `textContent.includes('Replying to')` on the whole article (also false-positives on body text). Now checks `[data-testid="in-reply-to"]` first, then `div[dir]` innerText `startsWith('Replying to')`.
- `getTweetIdentifier()` (was line 154): first `/status/` link can belong to a quoted tweet. Now prefers `time` element's `closest('a[href*="/status/"]')`, keeps old loop and text fallback.
- `SELECTORS.tweetMedia` (line 69): added `videoComponent` alongside `videoPlayer`.

## scripts/twitter/like-by-hashtag.js
Bugs found and fixed:
- Fatal: `navigateToHashtag()` (was line 206) assigned `window.location.href`, killing the script on the first hashtag; the multi-hashtag loop could never work. Replaced with `spaNavigate()` helper.
- Tweet dedup ID (was line 133) was `tweetText.substring(0, 100)`; every media-only (textless) tweet collapsed to the same empty ID, so only the first was ever processed. Now uses the timestamp-permalink status ID with text fallback.
- Retweet skip (was line 144) matched any `socialContext` (pinned posts included). Now requires it to be inside an `<a>`.

## scripts/twitter/like-by-location.js
Bugs found and fixed:
- Fatal: `navigateToSearch()` (was line 151) used `window.location.href`; the script died before `likeTweets()` ever ran. Replaced with `spaNavigate()`.
- `getTweetIdentifier()` (was line 187): text fallback appended `Date.now()`, defeating dedup (same tweet reprocessed on every pass, stall detection never fired for link-less tweets). Removed; also added timestamp-permalink preference over first `/status/` link.
- `isRetweet()` / `isReply()`: same structural fixes as like-by-feed.

## scripts/twitter/like-by-user.js
Bugs found and fixed:
- `getTweetIdentifier()` (was line 192): `Date.now()` in fallback defeated dedup; first `/status/` link can be a quoted tweet. Same fix as above.
- `isRetweet()` (was line 159): matched only English `reposted`/`Retweeted` text, so `skipRetweets: true` did nothing on non-English UIs. Now structural (`socialContext` inside `<a>`).
- `isReply()` (was line 154): English-only whole-article substring. Same structural fix.
- `parseCount()` (line 100): no `B` multiplier. Added `*1e9` branch.
- `SELECTORS.tweetMedia` (line 71): added `videoComponent`.

## scripts/twitter/like-user-replies.js
Bugs found and fixed:
- `getReplyIdentifier()` (was line 194): `Date.now()` fallback defeated dedup; first-link quoted-tweet issue. Same fix as above.
- `isOriginalTweet()` (was line 167): purely index + English "Replying to" heuristics. Added a structural check first: the reply's own permalink ID equal to the `/status/` ID in the page URL identifies the original on any locale. Index/text heuristics kept as fallback.
- `SELECTORS.tweetMedia` (line 74): added `videoComponent`.

Left unchanged (noted): `isNestedReply()` counts occurrences of the English "Replying to" text; there is no reliable structural marker for nested-vs-top-level replies from the article alone, and the brief allows keeping text matching where unavoidable. `skipNestedReplies` defaults to false.

## scripts/twitter/link-scraper.js
Bugs found and fixed:
- `extractLinks()` (was line 129): tweet ID from the first `/status/` link; a quoted tweet's ID could shadow the host tweet's, dropping the host tweet's links via dedup. Now prefers the timestamp permalink.
- CSV export (was line 256): fields joined with bare commas; URLs routinely contain commas (and can contain quotes), corrupting rows. Added `csvEscape()` (quote + double-quote escaping) applied to every field.
- Stall detection (was line 189): retries counted only when `links.size` stalled, so a stretch of tweets with no external links ended the scan after `maxRetries` scrolls even though new tweets were still loading. Now also treats growth of `seenTweets.size` as progress.

Left unchanged (noted): expanded-URL extraction relies on the anchor's `title` attribute and otherwise keeps the raw `t.co` href (which the default `excludeDomains` then drops). Reading the anchor's visible text would recover more expanded URLs but X truncates display URLs with an ellipsis, so that would record broken URLs; defensible as-is.

## scripts/twitter/mass-block.js
Bugs found and fixed:
- Fatal: the per-user loop (was line 97) assigned `window.location.href` for each profile; the first navigation destroyed the script, so the tool could not block anyone. Replaced with `spaNavigate()` and added a short poll (up to 5 s) for `[data-testid="userActions"]` after navigation so slow profile renders are not misreported as "not found".

## scripts/twitter/mass-unblock.js
Bugs found and fixed:
- Saved log (was line 192) recorded `toUnblock.slice(0, unblocked)`, i.e. the first N candidates rather than the accounts actually unblocked; any mid-list failure made the log name the wrong accounts. Now collects `unblockedUsers` as successes happen.

Left unchanged (noted): the script collects `UserCell` element references for the whole list first, then clicks them in a second phase. X virtualizes long lists, so cells scrolled far offscreen may be detached by click time and the click is a no-op (counted as success). A robust fix requires restructuring to click-as-you-scroll; flagged rather than rewritten per brief rules.

## scripts/twitter/mass-unmute.js
Bugs found and fixed:
- Same wrong-names log bug as mass-unblock (was line 195): `toUnmute.slice(0, unmuted)`. Now records actual successes, covering both the inline-button and menu-fallback paths.

Left unchanged (noted): same two-phase collect-then-click virtualization caveat as mass-unblock; and the menu fallback's `[data-testid="unmute"]` option selector could not be verified against selectors.md (which does not list it) but there is no better documented alternative.

## scripts/twitter/monitor-account.js
Bugs found and fixed:
- Report download (was line 243): Blob URL created with `URL.createObjectURL` was never revoked. Now revoked after the click.

## scripts/twitter/multi-account.js
Bugs found and fixed:
- `getCurrentUsername()` (was line 80): grabbed the first `div[dir="ltr"] span` inside the account-switcher button, which is the display name, not the handle; `replace('@','')` then stored/matched the display name as the username, breaking auto-detect, `markUsed`, `updateStats`, and the CURRENT marker in `list()`. Now scans the button's spans for the one starting with `@` and strips it.
- `export()` (was line 308): unconditionally logged "Copied to clipboard!" even when `navigator.clipboard` was absent or the write rejected (also leaving an unhandled promise rejection). Now only claims success in `.then()`, warns in `.catch()`.

## scripts/twitter/mute-by-keywords.js
Clean: no changes. Noted only: same virtualized-list stale-element caveat as the other UserCell two-phase scripts, and the `[data-testid="mute"]` menu-option selector is undocumented in selectors.md but has no better-documented replacement.

## scripts/twitter/new-followers-alert.js
Bugs found and fixed:
- Report download (was line 227): Blob URL never revoked. Now revoked after the click.

Left unchanged (noted): "unfollowers" can be false-positives when the scan ends early (retry cap) before the full follower list loads; inherent to the snapshot approach, not a code bug.

## scripts/twitter/profile-stats.js
Clean: no bugs found. `parseCount` already handles K/M/B with comma stripping and NaN fallback; scrape loop is bounded with stall detection independent of any verbose flag; followers/following link matching and storage trimming are correct.

## scripts/twitter/protect-active-users.js
Bugs found and fixed:
- Fatal: the per-tweet scan loop (was line 191) assigned `window.location.href = tweet.url`; the first navigation destroyed the script, so engagement scanning never ran and the protection list was never built. Replaced with `spaNavigate()` (the subsequent `window.history.back()` calls are SPA-safe and kept).
- Tweet ID extraction (was line 160): first `/status/` link can belong to a quoted tweet. Now prefers the timestamp permalink.
- Retweet check (was line 167): English-only `innerText.includes('reposted')`. Now structural (`socialContext` inside `<a>`), which also stops pinned posts being scanned as normal posts incorrectly on non-English UIs.

Left unchanged (noted): `CONFIG.lookbackDays` is declared but never used (engagement lists expose no timestamps to filter on). Implementing it is not possible from the likes/retweets list DOM; removing the option is an API change, so it is flagged here for the maintainer instead.

## scripts/twitter/rate-limiter.js
Clean: no bugs found. Window math (`waitMs = window - (now - oldest)`), cooldown ordering, 24 h pruning, and preset/limit merging are all correct; no DOM or locale dependence.

## scripts/twitter/report-spam.js
Clean: no code changes. Noted for the maintainer: the live reporting flow selects the "Spam" reason by scanning every `span` on the page for the English substring "spam" and submits via `ChoiceSelectionNextButton`; this is English-only and unscoped (could match an unrelated span), but X's report modal exposes no documented testids for reason options (selectors.md has none), and a wrong guess here performs an irreversible report, so it was left as-is rather than risk changing which element gets clicked. Dry-run mode (the default) is unaffected.

## Special case check
`scripts/twitter/scrape-profile-with-replies.js` was not in my list and was not touched (another batch owns it; its diff in the worktree is from a concurrent agent).

# Batch 4 audit report

Files audited: 15 assigned + the byte-identical duplicate `scripts/scrape-profile-with-replies.js` (allowed out-of-list copy). All edited files pass `node --check`. No em/en dash characters introduced.

## scripts/twitter/scrape-profile-with-replies.js

Bugs found and fixed:
1. Wrong tweet-ID extraction (was line 251): `article.querySelector('a[href*="/status/"]')` grabs the first status link, which can belong to a quoted tweet. Now derives the permalink from `time.closest('a[href*="/status/"]')` with the old selector as fallback (checklist item 2).
2. Locale-dependent and self-contradictory tweet classification (was lines 281-285, 305): `isRetweet` used `socialCtx.includes('reposted')` (English-only, misclassifies pinned posts); a computed `isReply` variable was dead code while the exported `type.isReply` used `socialCtx.includes('Replying to')`, which is text that never appears in socialContext, so `isReply` was always false. That silently disabled the `scrapeRepliesOnUserReplies: false` config path. Now: structural repost detection (socialContext inside an `<a>`), and reply detection via `[data-testid="in-reply-to"]` with the English "Replying to" div as fallback (checklist item 3, matches the reference commit 58d6378 pattern).
3. `parseEngagement` (was line 211) had no `B` multiplier; `1.2B` parsed as 1. Added `* 1_000_000_000` (checklist item 4).
4. `videoPlayer`-only detection (was line 278); now also matches `videoComponent` (checklist item 7).
5. CSV export (posts and replies): `displayTime` was emitted unquoted; older tweets render as e.g. `Jul 19, 2024`, whose comma shifts every subsequent column. Now quoted and escaped (checklist item 9).

Not changed: `state.originalUrl`-based recovery navigation and the SPA click-navigation flow are defensible as-is; feed stall detection was already independent of the verbose flag; Blob URLs already revoked; HTML export already escapes via `esc()`.

Special case done: fixed file copied over `scripts/scrape-profile-with-replies.js`; `cmp` confirms byte-identical.

## scripts/twitter/send-direct-message.js

Bugs found and fixed:
1. React value-tracker bug (was line 164): `searchInput.value = ...` followed by an `input` event is ignored by React's controlled inputs (the internal value tracker sees no change), so the people-search never actually ran and the script silently failed. Now sets the value through the native prototype setter (`setNativeValue` helper) before dispatching the event.
2. Wrong-recipient matching (was line 174): `cell.textContent.includes(cleanUsername)` is a substring match; searching "john" would click and DM "johnny", or match the search term inside a display name or bio line. For a DM tool this sends messages to the wrong person. Now matches the exact `@handle` with a boundary regex (`@name` not followed by a handle character), case-insensitive, with regex metacharacters escaped.

Not changed: `document.execCommand('insertText')` for the message composer is correct (the composer is a contenteditable Draft.js field, not an input); per-session limits and localStorage sent-history are sound.

## scripts/twitter/smart-unfollow.js

Bug found and fixed:
1. Premature termination in Phase 2 (was lines 211-292): `retries` incremented whenever a pass found no unfollow *candidate* (`foundAny`), so 5 consecutive screens of mutuals, whitelisted, or untracked accounts aborted the whole session long before the end of the following list. Stall detection is now progress-based: a `seenUsers` set counts new accounts appearing in the list; `retries` only increments when scrolling produces no new accounts (checklist items 5/6 class).

Not changed: Phase 1 follower-scan stall logic was already correct (tracks `followers.size` growth); grace-period and whitelist logic left as designed.

## scripts/twitter/thread-unroller.js

Bugs found and fixed:
1. Wrong tweet-ID extraction (was line 103): first `/status/` link can be a quoted tweet's. Now uses `time.closest('a[href*="/status/"]')` with fallback (checklist item 2).
2. Author attribution (was line 113): first `a[href^="/"][role="link"]` in the article is not guaranteed to be the tweet author. Now prefers `div[data-testid="User-Name"] a[href^="/"]` with the old selector as fallback.
3. No stall detection (was lines 164-175): the scroll loop always ran all 30 scrolls (45 s of dead scrolling on a 3-tweet thread). Added a 5-scroll no-new-tweets break (checklist item 6).

Not changed: preview always appending `...` after an 80-char substring is cosmetic; markdown/text/JSON exports and Blob revocation are correct.

## scripts/twitter/unfollow-everyone.js

Bug found and fixed:
1. Potential infinite loop (was line 114): `retries` reset to 0 whenever any unfollow buttons were visible, regardless of whether clicking them achieved anything. If the confirmation dialog stops appearing (X error state, rate limit interstitial), the loop spins forever clicking the same dead button. `retries` now only resets when at least one unfollow was actually confirmed this pass (checklist item 6).

Not changed: counting an unfollow on confirm-click rather than verified state change matches every sibling script; delays and limit handling are sound.

## scripts/twitter/unfollow-non-followers.js

Bugs found and fixed:
1. Infinite loop at end of list (was line 121): mutual followers are skipped but their unfollow buttons remain in the DOM, and `retries` was reset unconditionally whenever buttons were found. Once only mutuals remain visible (guaranteed at the end of the list), the loop never terminated. Now progress-based: `retries` resets only when a pass sees new accounts or performs unfollows (checklist item 6).
2. Kept-count inflation (was line 141): the same mutual cells were re-counted (`totalKept++`) and re-logged on every scroll pass while still mounted. Now deduplicated via a `seenUsers` set keyed on the cell's profile href.

## scripts/twitter/unfollow-with-log.js

Same two bugs as unfollow-non-followers.js (it shares the structure), with the added consequence that the downloaded log listed the same kept accounts multiple times:
1. Infinite loop at end of list when only mutuals remain (was line 132): fixed with progress-based `retries`.
2. `keptList` duplicate entries across scroll passes (was line 148): deduplicated via `seenUsers` (uses the file's existing `getUsername`).

Not changed: hoisted `downloadLog()` usage is valid; log formatting and Blob handling are correct.

## scripts/twitter/unlike-all.js

Clean. Timing constants, stall/scroll caps, and progress logging are all correct; termination is guaranteed by `maxScrollAttempts` once no unlike buttons remain. Noted, not changed: unliked count increments on click rather than verified state change (consistent with the whole suite), and `maxUnlikes: Infinity` relies on the scroll-attempt cap for termination, which is present.

## scripts/twitter/unlike-old.js

Clean, one deferred note. The loop terminates via `maxScrollAttempts`, age math and thresholds are correct, and processed-tweet tracking prevents re-clicks within a pass. Deferred (noted, not changed): the dedup key `aria-labelledby || textContent.substring(0, 50)` is unstable across virtualized re-renders (X regenerates those element ids), but the only consequence is a retried click on a tweet whose first click failed, which is harmless-to-beneficial; `stats.skipped` is declared but never used (dead field, left to keep the diff minimal).

## scripts/twitter/update-banner.js

Bug found and fixed:
1. Selector contradicts docs/agents/selectors.md (was line 50): the script relied solely on `[data-testid="addBannerButton"]`, while selectors.md lists the maintained header-edit selector as `[data-testid="editProfileHeader"]`. Added it as a comma fallback so the helper works whichever variant X renders (checklist item 7).

Not changed: the file-picker flow legitimately requires user interaction (browser security), so the helper-command design is correct, not a fake implementation.

## scripts/twitter/update-bio.js

Bug found and fixed:
1. React value-tracker bug (was lines 114, 120): setting `bioField.value` directly and dispatching `input` is ignored by React controlled fields, so the new bio appeared in the DOM but React state kept the old bio and Save persisted the old text. The script's success banner was therefore false. Both the clear and the write now go through the native prototype value setter before dispatching events.

Not changed: the parallel `textContent` assignment is kept for the onboarding-flow contenteditable variant (`ocf-bio-input`); the 160-char validation matches X's plain-character limit closely enough for a client-side guard.

## scripts/twitter/update-profile-picture.js

Bug found and fixed:
1. Selector contradicts docs/agents/selectors.md (was line 51): `[data-testid="addAvatarButton"]` only; selectors.md lists the avatar-edit selector as `[data-testid="editProfileAvatar"]`. Added as a comma fallback (checklist item 7).

Not changed: `input[data-testid="fileInput"]` matches selectors.md; the user-gesture-driven picker flow is inherent to browser security.

## scripts/twitter/video-downloader.js

Clean. It works on `<video>`/`<source>` elements and page-source regex, so the `videoPlayer`/`videoComponent` testid concern does not apply; the CORS-failing fetch path has a real fallback (`window.open`); Blob URL is revoked; resolution sort and quality selection are correct (`quality: 'all'` intentionally selects nothing and just lists URLs). Noted, not changed: the "Method 3" blob-URL loop only logs a notice; blob sources genuinely cannot be resolved from a console script without hooking network requests, so the log-only behavior is honest.

## scripts/twitter/viral-tweets-scraper.js

Bugs found and fixed:
1. Wrong tweet-ID extraction (was line 104): first `/status/` link can belong to a quoted tweet. Now derived from `time.closest(...)` with fallback (checklist item 2).
2. Wrong author on retweets (was line 115): the first `a[href^="/"][role="link"]` is the reposter's socialContext link on retweets, which also corrupts the constructed tweet URL. Now prefers `div[data-testid="User-Name"] a[href^="/"]` (checklist item 3-adjacent, structural).
3. `parseNumber` missing the `B` multiplier (was line 90): billions parsed as single digits (checklist item 4).
4. `videoPlayer`-only video detection (was line 149): now also matches `videoComponent` (checklist item 7).
5. Premature stall exit (was line 186): `retries` tracked qualifying (viral) tweets only, so 5 scrolls without a tweet passing the 50-like threshold ended the scan even mid-timeline. Stall detection now tracks `seenIds.size` (all tweets encountered) (checklist items 5/6 class).
6. CSV bugs (was line 257): text was escaped (`"` -> `""`) before `substring(0, 200)`, so truncation could split an escaped pair and leave an unbalanced quote, corrupting the file; and `displayTime` was unquoted (commas in dates shift columns). Truncation now happens before escaping, and displayTime is quoted (checklist items 1/9).

## scripts/twitter/whitelist.js

Bug found and fixed:
1. False success claim in `export` (was line 203): `navigator.clipboard?.writeText(...)` was fire-and-forget, then `Copied to clipboard!` was logged unconditionally, including when the clipboard API is absent or the promise rejects (common without document focus). Success/failure is now reported from the promise, with a manual-copy hint on failure (checklist item 11).

Not changed: localStorage schema, dedup on add, `collectFromPage` href filtering, and the confirm-gated clear are all correct.
