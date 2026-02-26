# Build 02-09 — Migrate Adapter System to TypeScript

> **Creates:** `src/scrapers/adapters/*.ts`

---

## Task

Convert the scraper adapter system to TypeScript with proper abstract classes and interface definitions.

---

## Files

### `src/scrapers/adapters/base.ts`
```typescript
export abstract class BaseAdapter {
  abstract name: string;
  abstract launch(options: BrowserOptions): Promise<AdapterBrowser>;
  abstract newPage(browser: AdapterBrowser, options?: PageOptions): Promise<AdapterPage>;
  abstract setCookie(page: AdapterPage, cookie: CookieParam): Promise<void>;
  abstract close(browser: AdapterBrowser): Promise<void>;
}

export interface AdapterBrowser {
  _adapter: string;
  [key: string]: unknown;
}

export interface AdapterPage {
  _adapter?: string;
  [key: string]: unknown;
}
```

### `src/scrapers/adapters/puppeteer.ts`
### `src/scrapers/adapters/playwright.ts`
### `src/scrapers/adapters/http.ts`
### `src/scrapers/adapters/cheerio.ts`
### `src/scrapers/adapters/index.ts`

Registry pattern with type-safe adapter lookup:
```typescript
const adapters = new Map<string, BaseAdapter>();

export function getAdapter(name: string): BaseAdapter {
  const adapter = adapters.get(name);
  if (!adapter) throw new Error(`Unknown adapter: ${name}`);
  return adapter;
}

export function registerAdapter(name: string, adapter: BaseAdapter): void { ... }
```

---

## Acceptance Criteria
- [ ] Abstract base class enforces adapter contract
- [ ] All 4+ adapters converted
- [ ] Registry is type-safe
- [ ] Index exports all adapters and utilities
