# Build 03-02 — Error Codes Registry

> **Agent Role:** Implementer  
> **Depends on:** 03-01 (error class hierarchy)  
> **Creates:** `src/client/error-codes.js`  
> **Tests:** `tests/errors/error-codes.test.js`

---

## Task

Create a centralized, frozen registry of all XActions error codes with metadata. This registry is the single source of truth for error messages, HTTP status codes, and retryability — used by error classes, CLI formatting, MCP responses, and API middleware.

---

## File: `src/client/error-codes.js`

### Registry Structure

```javascript
/**
 * @typedef {Object} ErrorCodeInfo
 * @property {string} message - Human-readable message template (supports {placeholders})
 * @property {number} httpStatus - HTTP status code
 * @property {boolean} retryable - Whether the operation can be retried
 * @property {string} category - Error category for grouping
 * @property {string} suggestion - User-facing suggestion for resolution
 */

export const ERROR_CODES = Object.freeze({
  // Auth errors
  AUTH_EXPIRED: {
    message: 'Authentication expired. Cookies are no longer valid.',
    httpStatus: 401,
    retryable: true,
    category: 'auth',
    suggestion: 'Run `xactions login` or update your cookie file.',
  },
  AUTH_INVALID: {
    message: 'Invalid credentials provided for {username}.',
    httpStatus: 401,
    retryable: false,
    category: 'auth',
    suggestion: 'Check your username and password.',
  },
  AUTH_2FA_REQUIRED: {
    message: 'Two-factor authentication required for {username}.',
    httpStatus: 401,
    retryable: false,
    category: 'auth',
    suggestion: 'Provide your 2FA code or use cookie-based auth.',
  },
  AUTH_SUSPENDED: {
    message: 'Account {username} is suspended.',
    httpStatus: 403,
    retryable: false,
    category: 'auth',
    suggestion: 'Contact Twitter support for account recovery.',
  },
  AUTH_LOCKED: {
    message: 'Account {username} is locked. Verification required.',
    httpStatus: 403,
    retryable: false,
    category: 'auth',
    suggestion: 'Log into Twitter in a browser to verify your account.',
  },

  // Rate limit
  RATE_LIMITED: {
    message: 'Rate limited on {endpoint}. Resets at {resetAt}.',
    httpStatus: 429,
    retryable: true,
    category: 'rate-limit',
    suggestion: 'Wait {retryAfterMs}ms before retrying.',
  },

  // Twitter API
  TWITTER_API_ERROR: {
    message: 'Twitter API error {twitterErrorCode}: {twitterMessage}',
    httpStatus: 502,
    retryable: false,
    category: 'twitter-api',
    suggestion: 'Check the Twitter API status page.',
  },

  // Network
  NETWORK_TIMEOUT: {
    message: 'Request to {url} timed out after {timeoutMs}ms.',
    httpStatus: 504,
    retryable: true,
    category: 'network',
    suggestion: 'Check your internet connection or increase timeout.',
  },
  NETWORK_DNS: {
    message: 'DNS resolution failed for {hostname}.',
    httpStatus: 503,
    retryable: true,
    category: 'network',
    suggestion: 'Check your DNS settings and internet connection.',
  },
  NETWORK_CONNECTION: {
    message: 'Connection refused to {url}.',
    httpStatus: 503,
    retryable: true,
    category: 'network',
    suggestion: 'Check if the target server is running.',
  },
  NETWORK_TLS: {
    message: 'TLS handshake failed with {hostname}.',
    httpStatus: 503,
    retryable: true,
    category: 'network',
    suggestion: 'Twitter may be blocking your TLS fingerprint.',
  },
  NETWORK_RESET: {
    message: 'Connection reset by {hostname}.',
    httpStatus: 503,
    retryable: true,
    category: 'network',
    suggestion: 'Twitter may have dropped the connection. Retry.',
  },

  // Scraper
  SCRAPER_NAVIGATION: {
    message: 'Failed to navigate to {pageUrl}.',
    httpStatus: 502,
    retryable: true,
    category: 'scraper',
    suggestion: 'Page may have changed or be unavailable.',
  },
  SCRAPER_SELECTOR_MISSING: {
    message: 'DOM selector "{selector}" not found on {pageUrl}.',
    httpStatus: 502,
    retryable: false,
    category: 'scraper',
    suggestion: 'Twitter may have updated their UI. Check docs/dom-selectors.md.',
  },
  SCRAPER_TIMEOUT: {
    message: 'Scraper timed out after {timeoutMs}ms on {pageUrl}.',
    httpStatus: 504,
    retryable: true,
    category: 'scraper',
    suggestion: 'Page may be loading slowly. Increase timeout or retry.',
  },
  SCRAPER_CRASH: {
    message: 'Browser crashed during {operation}.',
    httpStatus: 500,
    retryable: true,
    category: 'scraper',
    suggestion: 'Too many browser instances may be running. Check memory.',
  },
  SCRAPER_BLOCKED: {
    message: 'Twitter is blocking automated access from {ip}.',
    httpStatus: 403,
    retryable: false,
    category: 'scraper',
    suggestion: 'Use a different IP, proxy, or cookie-based auth.',
  },

  // Validation
  VALIDATION_USERNAME: {
    message: 'Invalid username: "{value}". Must match @?[a-zA-Z0-9_]{1,15}.',
    httpStatus: 400,
    retryable: false,
    category: 'validation',
    suggestion: 'Provide a valid Twitter username.',
  },
  VALIDATION_TWEET_ID: {
    message: 'Invalid tweet ID: "{value}". Must be a numeric string.',
    httpStatus: 400,
    retryable: false,
    category: 'validation',
    suggestion: 'Provide a valid tweet ID (numeric).',
  },
  VALIDATION_COOKIES: {
    message: 'Invalid cookies. Missing required field: {field}.',
    httpStatus: 400,
    retryable: false,
    category: 'validation',
    suggestion: 'Cookies must include auth_token and ct0.',
  },
  VALIDATION_OPTIONS: {
    message: 'Invalid option "{field}": expected {expected}, got {received}.',
    httpStatus: 400,
    retryable: false,
    category: 'validation',
    suggestion: 'Check the API documentation for valid options.',
  },
  VALIDATION_CONTENT: {
    message: 'Invalid tweet content: {reason}.',
    httpStatus: 400,
    retryable: false,
    category: 'validation',
    suggestion: 'Tweet text must be 1-280 characters.',
  },

  // Config
  CONFIG_MISSING: {
    message: 'Required configuration "{configKey}" is not set.',
    httpStatus: 500,
    retryable: false,
    category: 'config',
    suggestion: 'Set the value in your config file or environment.',
  },
  CONFIG_INVALID: {
    message: 'Configuration "{configKey}" has invalid value: {value}.',
    httpStatus: 500,
    retryable: false,
    category: 'config',
    suggestion: 'Check config/agent-config.example.json for valid formats.',
  },
  CONFIG_FILE_READ: {
    message: 'Failed to read config file: {filePath}.',
    httpStatus: 500,
    retryable: false,
    category: 'config',
    suggestion: 'Check the file exists and has correct permissions.',
  },

  // Generic
  UNKNOWN_ERROR: {
    message: 'An unexpected error occurred: {message}.',
    httpStatus: 500,
    retryable: false,
    category: 'unknown',
    suggestion: 'Please file a bug report at github.com/nirholas/XActions/issues.',
  },
});
```

### Helper Functions

```javascript
export function getErrorInfo(code) {
  return ERROR_CODES[code] || ERROR_CODES.UNKNOWN_ERROR;
}

export function formatErrorMessage(code, context = {}) {
  const info = getErrorInfo(code);
  return info.message.replace(/\{(\w+)\}/g, (_, key) => 
    context[key] !== undefined ? String(context[key]) : `{${key}}`
  );
}

export function getCategory(code) {
  return getErrorInfo(code).category;
}

export function isRetryableCode(code) {
  return getErrorInfo(code).retryable;
}

export function getHttpStatus(code) {
  return getErrorInfo(code).httpStatus;
}

export function getAllCodes() {
  return Object.keys(ERROR_CODES);
}

export function getCodesByCategory(category) {
  return Object.entries(ERROR_CODES)
    .filter(([, info]) => info.category === category)
    .map(([code]) => code);
}
```

---

## Acceptance Criteria

- [ ] 28+ error codes covering all categories
- [ ] Each code has: message, httpStatus, retryable, category, suggestion
- [ ] `ERROR_CODES` is `Object.freeze()`'d — immutable at runtime
- [ ] `formatErrorMessage()` interpolates `{placeholders}` from context
- [ ] Helper functions for lookup, filtering, categorization
- [ ] JSDoc on all exports
- [ ] Tests verify every code is valid and every helper works
