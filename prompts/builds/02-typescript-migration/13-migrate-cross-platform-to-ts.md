# Build 02-13 — Migrate Cross-Platform Scrapers to TypeScript

> **Creates:** `.ts` versions of bluesky, mastodon, threads scrapers

---

## Task

Convert `src/scrapers/bluesky/index.js`, `src/scrapers/mastodon/index.js`, and `src/scrapers/threads/index.js` to TypeScript with platform-specific and shared types.

---

## Shared Interface

All platform scrapers implement:

```typescript
interface PlatformScraper {
  platform: Platform;
  scrapeProfile(target: string, options?: ScraperOptions): Promise<TwitterProfile | BlueskyProfile | MastodonProfile>;
  scrapeTweets(target: string, options?: PaginationOptions): Promise<Post[]>;
  scrapeFollowers(target: string, options?: PaginationOptions): Promise<User[]>;
  searchPosts(query: string, options?: SearchOptions): Promise<Post[]>;
}
```

### Platform-Specific Types

```typescript
// Bluesky
interface BlueskyProfile extends BaseProfile {
  did: string;        // Decentralized Identifier
  handle: string;     // user.bsky.social
  pdsUrl: string;     // Personal Data Server URL
}

// Mastodon
interface MastodonProfile extends BaseProfile {
  instanceUrl: string;
  acct: string;       // user@instance.social
  emojis: CustomEmoji[];
}

// Threads
interface ThreadsProfile extends BaseProfile {
  // Threads-specific fields
}
```

---

## Acceptance Criteria
- [ ] All 3 platform scrapers converted
- [ ] Shared interface enforced
- [ ] Platform-specific types defined
- [ ] Unified `scrape()` function typed with discriminated unions
