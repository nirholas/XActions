# Build 03-07 — CLI Error Formatting

> **Agent Role:** Implementer  
> **Depends on:** 03-01 (error classes), 03-02 (error codes)  
> **Creates:** `src/cli/error-formatter.js`  
> **Modifies:** `src/cli/index.js` (wrap top-level command handlers)

---

## Task

Create a CLI error formatter that converts structured `XActionsError` instances to user-friendly terminal output with color coding, actionable suggestions, and optional stack traces. Integrate into all CLI command handlers.

---

## File: `src/cli/error-formatter.js`

### `formatCliError(error, options)`

```javascript
import chalk from 'chalk';
import { isXActionsError, isRateLimited, isAuthError, isNetworkError } from '../client/errors.js';

/**
 * Format an error for CLI output.
 * @param {Error} error
 * @param {Object} [options]
 * @param {boolean} [options.verbose=false] - Show stack trace
 * @param {boolean} [options.json=false] - Output as JSON
 * @returns {string} Formatted error string
 */
export function formatCliError(error, options = {}) {
  if (options.json) return JSON.stringify(error.toJSON?.() || { message: error.message }, null, 2);

  // Color coding:
  // - AuthError → chalk.red('✖ Authentication Error') + suggestion to run `xactions login`
  // - RateLimitError → chalk.yellow('⏳ Rate Limited') + countdown to reset
  // - NetworkError → chalk.yellow('🌐 Network Error') + connection check suggestion
  // - ValidationError → chalk.red('✖ Validation Error') + field/expected/received
  // - ScraperError → chalk.yellow('⚠ Scraper Error') + retry suggestion
  // - Generic Error → chalk.red('✖ Error') + message

  // Include error code in dim text: chalk.dim(`[${error.code}]`)
  // If retryable: chalk.blue('ℹ This error is retryable. Use --retry to auto-retry.')
  // If verbose: append stack trace in chalk.gray
}
```

### `wrapCliCommand(fn, commandName)`

```javascript
/**
 * Higher-order function that wraps a CLI command handler with error formatting.
 * @param {Function} fn - Async command handler
 * @param {string} commandName - Command name for error context
 * @returns {Function} Wrapped handler
 */
export function wrapCliCommand(fn, commandName) {
  return async (...args) => {
    try {
      await fn(...args);
    } catch (error) {
      const verbose = process.argv.includes('--verbose') || process.argv.includes('-v');
      console.error(formatCliError(error, { verbose }));

      // Set process exit code based on error type
      // Validation: 2, Auth: 3, Rate Limit: 4, Network: 5, Scraper: 6, Other: 1
      process.exitCode = getExitCode(error);
    }
  };
}
```

### `formatRateLimitCountdown(resetAt)`

```javascript
/**
 * Show a countdown timer for rate limit reset.
 * @param {Date} resetAt
 * @returns {string} e.g., "Rate limit resets in 12m 34s"
 */
export function formatRateLimitCountdown(resetAt) { /* ... */ }
```

---

## Integration with `src/cli/index.js`

The existing CLI uses Commander.js `.action()` handlers. Wrap each with `wrapCliCommand`:

```javascript
// Before:
program.command('profile <username>').action(async (username, opts) => { ... });

// After:
program.command('profile <username>').action(wrapCliCommand(async (username, opts) => { ... }, 'profile'));
```

This wrapping should be applied to all command handlers that perform scraping, API calls, or auth operations. Pure utility commands (like `info`) don't need wrapping.

---

## Acceptance Criteria

- [ ] `formatCliError()` produces color-coded output for every error type
- [ ] AuthError output includes "Run `xactions login`" suggestion
- [ ] RateLimitError output includes countdown to reset
- [ ] NetworkError output includes connection check suggestion
- [ ] `wrapCliCommand()` catches all errors and formats them
- [ ] Stack trace shown only with `--verbose`
- [ ] Exit codes differ by error type
- [ ] JSON output mode with `--json` flag
