# Build 03-08 — Error Logging and Reporting

> **Creates:** `src/utils/errorLogger.js`
> **Depends on:** Track 03 Build 01 (error classes)

---

## Task

Build a centralized error logging system that captures errors with full context, supports multiple output targets, and enables debugging production issues.

---

## File: `src/utils/errorLogger.js`

### Core Implementation

```javascript
import { writeFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { XActionsError } from './errors.js';

const LOG_LEVELS = { debug: 0, info: 1, warn: 2, error: 3, fatal: 4 };

export class ErrorLogger {
  #transports = [];
  #buffer = [];
  #maxBuffer = 1000;
  #level = 'warn';

  constructor(options = {}) {
    this.#level = options.level || 'warn';
    this.#maxBuffer = options.maxBuffer || 1000;
  }

  addTransport(transport) {
    this.#transports.push(transport);
    return this;
  }

  log(level, error, context = {}) {
    if (LOG_LEVELS[level] < LOG_LEVELS[this.#level]) return;

    const entry = {
      timestamp: new Date().toISOString(),
      level,
      message: error.message || String(error),
      errorType: error.constructor?.name || 'Error',
      code: error instanceof XActionsError ? error.code : undefined,
      context: {
        ...(error instanceof XActionsError ? error.context : {}),
        ...context,
      },
      stack: error.stack,
    };

    this.#buffer.push(entry);
    if (this.#buffer.length > this.#maxBuffer) {
      this.#buffer.shift();
    }

    for (const transport of this.#transports) {
      transport.write(entry).catch(err => {
        console.error('Logger transport error:', err.message);
      });
    }

    return entry;
  }

  error(err, ctx) { return this.log('error', err, ctx); }
  warn(err, ctx) { return this.log('warn', err, ctx); }
  fatal(err, ctx) { return this.log('fatal', err, ctx); }

  getRecentErrors(count = 10) {
    return this.#buffer.slice(-count);
  }

  getErrorsByType(type, count = 50) {
    return this.#buffer
      .filter(e => e.errorType === type)
      .slice(-count);
  }

  getStats() {
    const stats = { total: this.#buffer.length };
    for (const entry of this.#buffer) {
      stats[entry.errorType] = (stats[entry.errorType] || 0) + 1;
    }
    return stats;
  }

  clear() {
    this.#buffer = [];
  }
}
```

### Transport: Console

```javascript
export class ConsoleTransport {
  #colorize;

  constructor(options = {}) {
    this.#colorize = options.colorize ?? true;
  }

  async write(entry) {
    const emoji = {
      debug: '🔍', info: 'ℹ️', warn: '⚠️', error: '🔴', fatal: '💀',
    }[entry.level] || '❓';

    const line = `${emoji} [${entry.timestamp}] ${entry.errorType}: ${entry.message}`;
    
    if (entry.level === 'fatal' || entry.level === 'error') {
      console.error(line);
    } else if (entry.level === 'warn') {
      console.warn(line);
    } else {
      console.log(line);
    }
  }
}
```

### Transport: File (JSON lines)

```javascript
export class FileTransport {
  #dir;
  #maxFileSize;
  #currentFile;

  constructor(options = {}) {
    this.#dir = options.dir || './logs';
    this.#maxFileSize = options.maxFileSize || 10 * 1024 * 1024; // 10MB
  }

  async write(entry) {
    await mkdir(this.#dir, { recursive: true });
    const date = new Date().toISOString().split('T')[0];
    const filePath = join(this.#dir, `xactions-errors-${date}.jsonl`);
    const line = JSON.stringify(entry) + '\n';
    await writeFile(filePath, line, { flag: 'a' });
  }
}
```

### Transport: In-memory ring buffer (for MCP health endpoint)

```javascript
export class MemoryTransport {
  #entries = [];
  #max;

  constructor(options = {}) {
    this.#max = options.max || 100;
  }

  async write(entry) {
    this.#entries.push(entry);
    if (this.#entries.length > this.#max) {
      this.#entries.shift();
    }
  }

  getEntries() { return [...this.#entries]; }
  clear() { this.#entries = []; }
}
```

### Singleton instance

```javascript
export const logger = new ErrorLogger({ level: process.env.XACTIONS_LOG_LEVEL || 'warn' });

// Default transports
logger.addTransport(new ConsoleTransport());

if (process.env.XACTIONS_LOG_FILE !== 'false') {
  logger.addTransport(new FileTransport({ dir: process.env.XACTIONS_LOG_DIR || './logs' }));
}

export const memoryTransport = new MemoryTransport();
logger.addTransport(memoryTransport);
```

---

## Tests: `tests/errors/errorLogger.test.js`

1. Test log entries contain timestamp, level, errorType, message
2. Test buffer respects maxBuffer size
3. Test getRecentErrors returns last N entries
4. Test getErrorsByType filters correctly
5. Test getStats returns counts per error type
6. Test FileTransport writes JSONL format
7. Test MemoryTransport ring buffer evicts old entries
8. Test log level filtering (debug entries ignored when level is warn)
9. Test XActionsError context is included in log entry

---

## Acceptance Criteria
- [ ] Centralized ErrorLogger class with transport system
- [ ] Console, File (JSONL), and Memory transports
- [ ] Ring buffer with configurable max size
- [ ] Error statistics aggregation
- [ ] Singleton `logger` instance with environment-based config
- [ ] All 9 tests pass
