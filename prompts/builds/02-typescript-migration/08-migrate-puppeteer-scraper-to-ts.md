# Build 02-08 — Migrate Puppeteer Scraper to TypeScript

> **Creates:** `src/scrapers/twitter/index.ts` (from current 952-line `index.js`)

---

## Task

Convert the existing Puppeteer-based Twitter scraper to TypeScript. This is the original scraper — it must retain full backward compatibility.

---

## Approach

- Rename `src/scrapers/twitter/index.js` → `src/scrapers/twitter/index.ts`
- Add types to all function signatures using `TwitterProfile`, `TwitterTweet`, etc.
- Type Puppeteer `Page` and `Browser` objects using `import type { Page, Browser } from 'puppeteer'`
- Keep all `page.evaluate()` callbacks as-is (they run in browser context, not Node)
- Add return types to every exported function

### Function Signatures

```typescript
import type { Page, Browser } from 'puppeteer';

export async function createBrowser(options?: BrowserOptions): Promise<Browser>;
export async function createPage(browser: Browser, options?: PageOptions): Promise<Page>;
export async function loginWithCookie(page: Page, authToken: string): Promise<void>;
export async function scrapeProfile(page: Page, username: string): Promise<TwitterProfile>;
export async function scrapeFollowers(page: Page, username: string, options?: PaginationOptions): Promise<TwitterUser[]>;
export async function scrapeFollowing(page: Page, username: string, options?: PaginationOptions): Promise<TwitterUser[]>;
export async function scrapeTweets(page: Page, username: string, options?: PaginationOptions): Promise<TwitterTweet[]>;
export async function searchTweets(page: Page, query: string, options?: PaginationOptions): Promise<TwitterTweet[]>;
export async function scrapeThread(page: Page, tweetUrl: string): Promise<TwitterThread>;
// ... all other exports
```

### `page.evaluate()` Typing

For `page.evaluate()` callbacks, use Puppeteer's `EvaluateFn` type or inline type assertions since the code runs in browser context where TypeScript types don't apply:

```typescript
const profile = await page.evaluate(() => {
  // This runs in browser — DOM APIs available but no Node types
  const getText = (sel: string): string | null => 
    document.querySelector(sel)?.textContent?.trim() ?? null;
  // ...
  return { name, username, bio, ... } as const;
}) as TwitterProfile;
```

---

## Acceptance Criteria
- [ ] All 18 exported functions have TypeScript signatures
- [ ] Puppeteer types imported correctly
- [ ] Return types match shared type definitions
- [ ] `page.evaluate()` blocks properly typed
- [ ] Backward compatibility maintained (same exports)
- [ ] Compiles with `tsc --noEmit`
