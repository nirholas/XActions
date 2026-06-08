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
