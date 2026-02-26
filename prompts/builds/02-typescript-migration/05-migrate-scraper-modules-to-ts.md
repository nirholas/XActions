# Build 02-05 — Migrate HTTP Scraper Modules to TypeScript

> **Creates:** `.ts` versions of profile.js, tweets.js, relationships.js, search.js, thread.js

---

## Task

Convert all HTTP scraper data modules to TypeScript with strict typing on inputs, outputs, and parsed data.

---

## Files to Migrate

1. **`profile.ts`** — `scrapeProfile(client: TwitterHttpClient, username: string): Promise<TwitterProfile>`
2. **`tweets.ts`** — Return `TwitterTweet[]` with full metric types
3. **`relationships.ts`** — Return `TwitterUser[]`, `NonFollowerResult`
4. **`search.ts`** — `buildAdvancedQuery` with typed options interface
5. **`thread.ts`** — Return `TwitterThread` type

### Parse Functions

All parse functions get explicit input/output types:

```typescript
// Raw Twitter API response types (internal, not exported)
interface RawTwitterUser {
  __typename: 'User' | 'UserUnavailable';
  rest_id: string;
  legacy: {
    name: string;
    screen_name: string;
    description: string;
    // ... all raw fields
  };
  is_blue_verified: boolean;
}

// Clean output type (exported)
export function parseUserData(raw: RawTwitterUser): TwitterProfile { ... }
export function parseTweetData(raw: RawTweet): TwitterTweet { ... }
```

### Timeline Instruction Types

```typescript
type TimelineInstruction = 
  | { type: 'TimelineAddEntries'; entries: TimelineEntry[] }
  | { type: 'TimelineAddToModule'; moduleItems: ModuleItem[] }
  | { type: 'TimelinePinEntry'; entry: TimelineEntry }
  | { type: 'TimelineClearCache' };

type TimelineEntry = {
  entryId: string;
  sortIndex: string;
  content: TimelineEntryContent;
};
```

---

## Acceptance Criteria
- [ ] All 5 modules converted with strict types
- [ ] Raw Twitter API response types defined (internal)
- [ ] Output types match existing XActions format
- [ ] Timeline instruction parsing fully typed
- [ ] No `any` types used
