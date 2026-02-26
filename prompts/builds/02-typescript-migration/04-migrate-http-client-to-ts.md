# Build 02-04 — Migrate HTTP Client to TypeScript

> **Creates:** `src/scrapers/twitter/http/client.ts`

---

## Task

Convert `client.js` (from Track 01) to full TypeScript with generic request types, typed response handling, and proper interface definitions.

---

## Key Types to Add

```typescript
interface RequestOptions {
  method?: 'GET' | 'POST' | 'DELETE' | 'PUT';
  headers?: Record<string, string>;
  body?: string | FormData;
  form?: Record<string, string | number>;
  multipart?: Record<string, string | Buffer>;
  timeout?: number;
  signal?: AbortSignal;
}

interface GraphQLResponse<T = unknown> {
  data: T;
  errors?: Array<{ message: string; code: number; kind: string }>;
}

interface PaginatedResult<T> {
  data: T[];
  cursor: string | null;
  hasMore: boolean;
}

interface RateLimitInfo {
  limit: number;
  remaining: number;
  resetAt: Date;
  endpoint: string;
}
```

### Generic GraphQL Method

```typescript
async graphql<T>(
  queryId: string,
  operationName: string,
  variables: Record<string, unknown>,
  features?: Record<string, boolean>
): Promise<GraphQLResponse<T>>

async graphqlPaginate<T>(
  queryId: string,
  operationName: string,
  variables: Record<string, unknown>,
  options?: PaginationOptions
): AsyncGenerator<PaginatedResult<T>>
```

---

## Acceptance Criteria
- [ ] Full strict TypeScript with no `any` types (use `unknown` where needed)
- [ ] Generic GraphQL methods for type-safe responses
- [ ] Rate limit info properly typed
- [ ] All existing tests still pass
