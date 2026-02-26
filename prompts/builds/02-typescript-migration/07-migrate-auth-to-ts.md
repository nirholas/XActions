# Build 02-07 — Migrate Auth & Guest Token to TypeScript

> **Creates:** `auth.ts`, `guest.ts`, `endpoints.ts`

---

## Task

Convert auth, guest token, and endpoint modules to TypeScript.

---

## Key Types

```typescript
interface CookieJar {
  authToken: string;
  ct0: string;
  twid?: string;
  guestId?: string;
  raw: Record<string, string>;
}

interface LoginResult {
  success: boolean;
  user: { id: string; username: string; name: string } | null;
  cookies: CookieJar;
}

interface GuestToken {
  token: string;
  createdAt: Date;
  expiresAt: Date;
}

// Endpoints as const for literal types
export const GRAPHQL_QUERIES = {
  UserByScreenName: { queryId: 'xxx', operationName: 'UserByScreenName' },
  // ...
} as const satisfies Record<string, { queryId: string; operationName: string }>;

export type GraphQLQueryName = keyof typeof GRAPHQL_QUERIES;
```

Use `as const satisfies` pattern for endpoints to get both runtime values and literal types.

---

## Acceptance Criteria
- [ ] Auth module fully typed with login/cookie flows
- [ ] Guest token with generic typing
- [ ] Endpoints use `as const satisfies` for type-safe query names
- [ ] All compile with strict mode
