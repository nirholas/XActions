# Build 02-03 — Migrate Error Classes to TypeScript

> **Creates:** `src/scrapers/twitter/http/errors.ts` (from Track 03 JS → TS)

---

## Task

Convert the error classes (created in Track 03) from JavaScript to TypeScript with proper error hierarchies, type narrowing, and discriminated unions.

---

## File: `src/scrapers/twitter/http/errors.ts`

```typescript
export class XActionsError extends Error {
  readonly code: string;
  readonly statusCode?: number;
  readonly retryable: boolean;
  readonly timestamp: Date;

  constructor(message: string, options: { code: string; statusCode?: number; retryable?: boolean; cause?: Error }) {
    super(message, { cause: options.cause });
    this.name = 'XActionsError';
    this.code = options.code;
    this.statusCode = options.statusCode;
    this.retryable = options.retryable ?? false;
    this.timestamp = new Date();
  }
}

export class RateLimitError extends XActionsError { ... }
export class AuthError extends XActionsError { ... }
export class NotFoundError extends XActionsError { ... }
export class TwitterApiError extends XActionsError { ... }
export class NetworkError extends XActionsError { ... }

// Type guard functions
export function isRateLimitError(error: unknown): error is RateLimitError { ... }
export function isAuthError(error: unknown): error is AuthError { ... }
export function isRetryableError(error: unknown): error is XActionsError { ... }
```

Include type guard functions for each error class. Include `toJSON()` serialization on base class.

---

## Acceptance Criteria
- [ ] All error classes compile in strict TypeScript
- [ ] Type guards enable narrowing in catch blocks
- [ ] Backward compatible with JS imports via `.js` extension mapping
