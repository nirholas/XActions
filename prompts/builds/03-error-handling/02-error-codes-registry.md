# Build 03-02 — Error Codes Registry

> **Agent Role:** Implementer  
> **Depends on:** 03-01 (error class hierarchy)  
> **Creates:** `src/client/error-codes.js`

---

## Task

Create a centralized error code registry that maps every error code string to its metadata: message template, HTTP status code, retryable flag, and category. This enables consistent error messages and status codes across the entire codebase.

---

## File: `src/client/error-codes.js`

### Structure

```javascript
/**
 * @typedef {Object} ErrorCodeInfo
 * @property {string} message - Message template (supports {variable} interpolation)
 * @property {number} httpStatus - Default HTTP status code
 * @property {boolean} retryable - Whether this error type is retryable
 * @property {string} category - Error category for grouping
 */

/** @type {Readonly<Record<string, ErrorCodeInfo>>} */
export const ERROR_CODES = Object.freeze({
  // Auth errors (category: 'auth')
  AUTH_EXPIRED:       { message: 'Authentication expired. Cookies need refresh.', httpStatus: 401, retryable: true, category: 'auth' },
  AUTH_INVALID:       { message: 'Invalid credentials for {username}.', httpStatus: 401, retryable: false, category: 'auth' },
  AUTH_2FA_REQUIRED:  { message: 'Two-factor authentication required for {username}.', httpStatus: 401, retryable: false, category: 'auth' },
  AUTH_SUSPENDED:     { message: 'Account {username} is suspended.', httpStatus: 403, retryable: false, category: 'auth' },
  AUTH_LOCKED:        { message: 'Account {username} is locked. Verify at x.com.', httpStatus: 403, retryable: false, category: 'auth' },

  // Rate limit (category: 'rate-limit')
  RATE_LIMITED:       { message: 'Rate limited on {endpoint}. Retry after {retryAfter}s.', httpStatus: 429, retryable: true, category: 'rate-limit' },

  // Twitter API (category: 'twitter-api')
  TWITTER_API_ERROR:  { message: 'Twitter API error {twitterErrorCode}: {twitterMessage}', httpStatus: 502, retryable: false, category: 'twitter-api' },

  // Network (category: 'network')
  NETWORK_TIMEOUT:    { message: 'Request to {url} timed out after {timeoutMs}ms.', httpStatus: 504, retryable: true, category: 'network' },
  NETWORK_DNS:        { message: 'DNS lookup failed for {hostname}.', httpStatus: 503, retryable: true, category: 'network' },
  NETWORK_CONNECTION: { message: 'Connection refused to {url}.', httpStatus: 503, retryable: true, category: 'network' },
  NETWORK_TLS:        { message: 'TLS handshake failed for {hostname}.', httpStatus: 503, retryable: true, category: 'network' },
  NETWORK_RESET:      { message: 'Connection reset by {hostname}.', httpStatus: 503, retryable: true, category: 'network' },

  // Scraper (category: 'scraper')
  SCRAPER_NAVIGATION: { message: 'Failed to navigate to {pageUrl}.', httpStatus: 502, retryable: true, category: 'scraper' },
  SCRAPER_SELECTOR_MISSING: { message: 'Selector "{selector}" not found on {pageUrl}.', httpStatus: 502, retryable: true, category: 'scraper' },
  SCRAPER_TIMEOUT:    { message: 'Scraper timed out during {operation}.', httpStatus: 504, retryable: true, category: 'scraper' },
  SCRAPER_CRASH:      { message: 'Browser crashed during {operation}.', httpStatus: 502, retryable: true, category: 'scraper' },
  SCRAPER_BLOCKED:    { message: 'Scraping blocked by Twitter for {operation}.', httpStatus: 403, retryable: false, category: 'scraper' },

  // Validation (category: 'validation')
  VALIDATION_USERNAME:  { message: 'Invalid username: "{value}". Must match /^[a-zA-Z0-9_]{1,15}$/.', httpStatus: 400, retryable: false, category: 'validation' },
  VALIDATION_TWEET_ID:  { message: 'Invalid tweet ID: "{value}". Must be a numeric string.', httpStatus: 400, retryable: false, category: 'validation' },
  VALIDATION_COOKIES:   { message: 'Invalid cookies: missing required field "{field}".', httpStatus: 400, retryable: false, category: 'validation' },
  VALIDATION_OPTIONS:   { message: 'Invalid option "{field}": {reason}.', httpStatus: 400, retryable: false, category: 'validation' },
  VALIDATION_CONTENT:   { message: 'Invalid tweet content: {reason}.', httpStatus: 400, retryable: false, category: 'validation' },

  // Config (category: 'config')
  CONFIG_MISSING:      { message: 'Missing configuration: {configKey}.', httpStatus: 500, retryable: false, category: 'config' },
  CONFIG_INVALID:      { message: 'Invalid configuration for {configKey}: {reason}.', httpStatus: 500, retryable: false, category: 'config' },
  CONFIG_FILE_READ:    { message: 'Cannot read config file: {filePath}.', httpStatus: 500, retryable: false, category: 'config' },

  // Circuit breaker (category: 'circuit')
  CIRCUIT_OPEN:        { message: 'Circuit "{circuitName}" is open. Retry in {timeUntilReset}ms.', httpStatus: 503, retryable: true, category: 'circuit' },

  // Generic
  UNKNOWN_ERROR:       { message: 'An unexpected error occurred.', httpStatus: 500, retryable: false, category: 'unknown' },
});
```

### Helper Functions

```javascript
/**
 * Get metadata for an error code.
 * @param {string} code - Error code string
 * @returns {ErrorCodeInfo | undefined}
 */
export function getErrorInfo(code) {
  return ERROR_CODES[code];
}

/**
 * Format an error message by interpolating {variables} from context.
 * @param {string} code - Error code
 * @param {Record<string, string|number>} context - Template variables
 * @returns {string} Formatted message
 */
export function formatErrorMessage(code, context = {}) {
  const info = ERROR_CODES[code];
  if (!info) return `Unknown error: ${code}`;
  return info.message.replace(/\{(\w+)\}/g, (_, key) => 
    context[key] !== undefined ? String(context[key]) : `{${key}}`
  );
}

/**
 * Get all error codes in a category.
 * @param {string} category
 * @returns {string[]}
 */
export function getCodesByCategory(category) {
  return Object.entries(ERROR_CODES)
    .filter(([, info]) => info.category === category)
    .map(([code]) => code);
}

/**
 * Check if a code string is a known error code.
 * @param {string} code
 * @returns {boolean}
 */
export function isKnownErrorCode(code) {
  return code in ERROR_CODES;
}
```

---

## Acceptance Criteria

- [ ] 28+ error codes defined with message templates
- [ ] Frozen object (cannot be mutated at runtime)
- [ ] `formatErrorMessage()` interpolates context variables
- [ ] `getErrorInfo()` returns metadata for any code
- [ ] `getCodesByCategory()` groups codes
- [ ] Categories: auth, rate-limit, twitter-api, network, scraper, validation, config, circuit
- [ ] All codes used by error classes from Build 03-01 are present
- [ ] JSDoc on every export
