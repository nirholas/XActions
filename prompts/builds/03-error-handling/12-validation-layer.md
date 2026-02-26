# Build 03-12 — Validation Layer

> **Agent Role:** Implementer  
> **Depends on:** 03-01 (error classes — `ValidationError`)  
> **Creates:** `src/client/validation.js` (replace existing scaffold)

---

## Task

Replace the scaffolded `src/client/validation.js` (262 lines, mostly empty) with a complete input validation layer used at every public API entry point. Validators throw `ValidationError` with specific codes and context.

---

## File: `src/client/validation.js`

### Individual Validators

```javascript
import { ValidationError } from './errors.js';

/**
 * Validate a Twitter username.
 * @param {string} username
 * @returns {string} Sanitized username (@ stripped, lowercased)
 * @throws {ValidationError} VALIDATION_USERNAME
 */
export function validateUsername(username) {
  if (typeof username !== 'string') {
    throw new ValidationError('Username must be a string', {
      code: 'VALIDATION_USERNAME', field: 'username', expected: 'string', received: typeof username,
    });
  }
  const clean = username.replace(/^@/, '').trim();
  if (!/^[a-zA-Z0-9_]{1,15}$/.test(clean)) {
    throw new ValidationError(`Invalid username: "${clean}"`, {
      code: 'VALIDATION_USERNAME', field: 'username', expected: '/^[a-zA-Z0-9_]{1,15}$/', received: clean,
    });
  }
  return clean;
}

/**
 * Validate a tweet ID.
 * @param {string|number} id
 * @returns {string} String tweet ID
 * @throws {ValidationError} VALIDATION_TWEET_ID
 */
export function validateTweetId(id) {
  const str = String(id);
  if (!/^\d{1,20}$/.test(str)) {
    throw new ValidationError(`Invalid tweet ID: "${str}"`, {
      code: 'VALIDATION_TWEET_ID', field: 'tweetId', expected: 'numeric string (1-20 digits)', received: str,
    });
  }
  return str;
}

/**
 * Validate cookie object or string.
 * @param {Object|string|Array} cookies
 * @returns {Object} Normalized cookie object with { auth_token, ct0 }
 * @throws {ValidationError} VALIDATION_COOKIES
 */
export function validateCookies(cookies) {
  // Accept: string "auth_token=xxx; ct0=yyy", object { auth_token, ct0 }, array of { name, value }
  // Require: auth_token is present and non-empty
  // Require: ct0 is present and non-empty
  // Return normalized { auth_token, ct0, ...other }
}

/**
 * Validate scrape options (limit, cursor, pagination).
 * @param {Object} options
 * @returns {Object} Validated and defaulted options
 * @throws {ValidationError} VALIDATION_OPTIONS
 */
export function validateScrapeOptions(options = {}) {
  const validated = { ...options };
  if (options.limit !== undefined) {
    const limit = Number(options.limit);
    if (!Number.isInteger(limit) || limit < 1 || limit > 10000) {
      throw new ValidationError(`Invalid limit: ${options.limit}`, {
        code: 'VALIDATION_OPTIONS', field: 'limit', expected: 'integer 1-10000', received: options.limit,
      });
    }
    validated.limit = limit;
  }
  if (options.cursor !== undefined && typeof options.cursor !== 'string') {
    throw new ValidationError('Cursor must be a string', {
      code: 'VALIDATION_OPTIONS', field: 'cursor', expected: 'string', received: typeof options.cursor,
    });
  }
  return validated;
}

/**
 * Validate tweet content before posting.
 * @param {string} text
 * @param {Object} [options] - { media, quoteTweetId, replyToId }
 * @returns {{ text: string, options: Object }} Validated input
 * @throws {ValidationError} VALIDATION_CONTENT
 */
export function validateTweetContent(text, options = {}) {
  if (typeof text !== 'string' || text.trim().length === 0) {
    throw new ValidationError('Tweet text cannot be empty', {
      code: 'VALIDATION_CONTENT', field: 'text', expected: 'non-empty string', received: text,
    });
  }
  if (text.length > 280) {
    throw new ValidationError(`Tweet too long: ${text.length} chars (max 280)`, {
      code: 'VALIDATION_CONTENT', field: 'text', expected: 'max 280 characters', received: `${text.length} characters`,
    });
  }
  if (options.media && !Array.isArray(options.media)) {
    throw new ValidationError('Media must be an array', {
      code: 'VALIDATION_CONTENT', field: 'media', expected: 'array', received: typeof options.media,
    });
  }
  return { text: text.trim(), options };
}
```

### Schema-Based Validator

```javascript
/**
 * Create a reusable validator from a schema.
 *
 * @param {Object} schema - { field: { type, required, min, max, pattern, enum, custom } }
 * @returns {(data: Object) => Object} Validator function
 *
 * @example
 * const validateConfig = createValidator({
 *   username: { type: 'string', required: true, pattern: /^[a-zA-Z0-9_]{1,15}$/ },
 *   limit: { type: 'number', min: 1, max: 10000 },
 *   format: { type: 'string', enum: ['json', 'csv', 'xlsx'] },
 * });
 */
export function createValidator(schema) {
  return (data) => {
    const errors = [];
    for (const [field, rules] of Object.entries(schema)) {
      // Check required, type, min, max, pattern, enum, custom function
      // Collect all errors, throw ValidationError with all violations
    }
    if (errors.length > 0) {
      throw new ValidationError(`Validation failed: ${errors.join('; ')}`, {
        code: 'VALIDATION_OPTIONS', context: { violations: errors },
      });
    }
    return data;
  };
}
```

---

## Acceptance Criteria

- [ ] `validateUsername()` strips @, validates regex, returns clean string
- [ ] `validateTweetId()` accepts string/number, validates numeric
- [ ] `validateCookies()` accepts string/object/array, requires auth_token + ct0
- [ ] `validateScrapeOptions()` validates limit range, cursor type
- [ ] `validateTweetContent()` checks length, media format
- [ ] `createValidator()` generic schema-based validator
- [ ] All validators throw `ValidationError` with code, field, expected, received
- [ ] All validators have JSDoc with @throws
