# Deferred Work

## Deferred from: code review of story-1.1 (2026-06-08)

- **Dispatcher `loginWithCookie` auth wiring — string vs object** [src/scrapers/index.js:213-215] — dispatcher passes string `options.authToken`; Facebook expects `{ c_user, xs }` object. Deferred to Story 1.2: add `options.authCookie` (object) support in the puppeteer branch without breaking Twitter's string `authToken` path. Until then, Facebook login works via direct module call only.
- **`--disable-web-security` disables SOP** [src/scrapers/facebook/index.js:41] — pre-existing pattern across all adapters (threads/twitter). Address cross-cutting: evaluate whether the flag is needed at all, remove from all adapters if not.
- **Login success never verified** [src/scrapers/facebook/index.js:91] — invalid/expired cookie produces a silent unauthenticated session; downstream scrape fails with cryptic selector errors. Add a post-login check (URL not redirected to /login, or logged-in indicator present). Beyond AC2 scope; siblings behave the same.
- **`page.goto` timeout → browser leak** [src/scrapers/facebook/index.js:91] — `networkidle2`/30s `goto` has no try/catch; on TimeoutError the exception propagates before the dispatcher stores the browser ref, leaking the Chromium process. Tie fix to dispatcher cleanup refactor.
- **`page.__xactions_browser` set after `loginWithCookie`** [src/scrapers/index.js:219] — pre-existing dispatcher bug affecting ALL puppeteer platforms: browser ref stored at line 219 after login at line 215, so a login throw skips cleanup. Move the ref assignment immediately after `createPage`.
- **`xs` cookie no `sameSite`** [src/scrapers/facebook/index.js:82-88] — minor hardening; set `sameSite: 'Strict'` for the session-critical cookie. Siblings same.
- **`needsPuppeteer` test is indirect** [tests/scrapers/facebook.test.js:75] — registry-membership proxy rather than asserting the dispatcher routes facebook into the Puppeteer branch. The array is a local const, not exported. Consider a dispatcher-level test that asserts `createBrowser` is invoked without launching a real browser.

## Deferred from: code review of story-1.2 (2026-06-08)

- **`page.goto` no try/catch → browser leak on timeout** [src/scrapers/facebook/index.js:165 (scrapeProfile), :141 (loginWithCookie)] — timeout/network error throws before dispatcher stores/closes browser. Same root cause as the 1.1 deferred cleanup-ordering item; fix together (wrap dispatcher puppeteer branch in try/finally, or store browser ref before login). Affects threads sibling too.
- **Follower regex unanchored → false positive** [src/scrapers/facebook/index.js:87] — bio text like "...helped 1,000 followers..." matches. Same unanchored pattern as threads template. Revisit when verifying on live Facebook data (tie to selectors-facebook.md verify checklist).
- **Bio strip regex requires trailing period** [src/scrapers/facebook/index.js:97] — descriptions without a period after the follower phrase keep the follower prefix in `bio`. Cosmetic best-effort field; revisit with live data samples.
- **AC5.13 dispatcher routing test partly proxy** [tests/scrapers/facebook.test.js] — `needsPuppeteer` membership not directly asserted (local const). Integration test at :310 covers real routing end-to-end, so coverage is adequate but not exhaustive.

## Deferred from: code review of story-1.3 (2026-06-08)

> All four are DOM-accuracy issues that cannot be fixed without a live authenticated Facebook session. Tie resolution to the selectors-facebook.md verify checklist (Open Question Q3).

- **`texts[0]` may capture author name not post body** [src/scrapers/facebook/index.js:275-279] — `[dir="auto"]` matches both author header and body; FB DOM order likely puts author first. Confirm real order on a live session; switch to a body-specific anchor. Compounds the id-collision fallback.
- **`id = text.slice(0,60)` fallback collisions** [src/scrapers/facebook/index.js:305] — distinct posts with same opening text collide in the Map and are dropped. Depends on real `text` + permalink extraction; revisit during live verify.
- **Engagement regex over full `article.textContent`** [src/scrapers/facebook/index.js:294-295] — grabs first/nested/label count, not the post's own. Needs verified per-element selectors (aria-label on reaction/comment controls).
- **Image filter leaks avatars** [src/scrapers/facebook/index.js:300-302] — `!static && !emoji` misses `scontent` profile pics. Needs live CDN URL patterns: positive-filter `scontent` + exclude profile-photo path segments.

## Deferred from: code review of story-1.4 (2026-06-08)

> DOM-accuracy items needing a live authenticated session. Tie to selectors-facebook.md Followers verify checklist (Q3).

- **Follower name selector grabs first span/strong** [src/scrapers/facebook/index.js:321] — `item.querySelector('span, strong')` may return a UI label ("Follow", icon wrapper) not the person's name. Needs live DOM to pick a name-specific anchor.
- **`id = url || name` collision on name-only rows** [src/scrapers/facebook/index.js:330] — two followers with same name and no parseable url collide in the Map. Low once username/url parsing is fixed (BLOCKER patch); revisit during live verify.

## Deferred from: code review of story-2.1 (2026-06-08)

- **Empty array `[]` với `dryRun=false` emits `ACCOUNT_RISK_WARNING`** [api/services/facebookAutomation.js:70] — warning fires even when zero items are processed; minor UX noise. Fix: guard `if (items.length === 0) return early` before warning.
- **Duplicate items trong array** — same target actioned N times silently, no dedup guard. Caller responsibility per current design; revisit if rate-limit incidents occur.
- **`loginWithCookie` re-export untested** [api/services/facebookAutomation.js:115] — re-export exists but no smoke test asserts it. Import chain verified; add test when login integration tests land in Epic 3.
- **Items array mutated externally during loop** [api/services/facebookAutomation.js:75-97] — defensive copy (`[...items]`) would prevent mid-loop length changes; perf tradeoff, no spec requirement. Revisit if mutation bugs surface in 2.2-2.4.
