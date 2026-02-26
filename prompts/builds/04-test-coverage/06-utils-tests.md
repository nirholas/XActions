# Build 04-06 — Utils Unit Tests

> **Creates:** `tests/unit/core.test.js`, `tests/unit/utils.test.js`
> **Tests:** `src/utils/core.js` and other utility files

---

## Task

Write unit tests for all utility functions. `src/utils/core.js` is 674 lines — every exported function needs tests.

---

## Research Phase

Read `src/utils/core.js` and catalog every exported function. Common utility functions in scraper projects:

- `sleep(ms)` — delay utility
- `randomDelay(min, max)` — random wait
- `parseNumber(str)` — parse "1.2K" → 1200
- `formatNumber(n)` — 1200 → "1.2K"
- `cleanText(str)` — remove extra whitespace, special chars
- `extractUrls(text)` — pull URLs from text
- `parseDateString(str)` — Twitter date → Date object
- `chunkArray(arr, size)` — split array into chunks
- `deduplicateById(arr)` — remove duplicates
- `retryAsync(fn, retries)` — basic retry (pre-Track 03)
- `writeJSON(path, data)` — write JSON file
- `readJSON(path)` — read JSON file
- `ensureDir(path)` — mkdir -p equivalent
- `hashString(str)` — simple hash
- Various formatters and parsers

---

## Test Pattern

```javascript
import { describe, it, expect } from 'vitest';

describe('core utilities', () => {
  describe('parseNumber', () => {
    it('parses plain numbers', () => {
      expect(parseNumber('1234')).toBe(1234);
    });
    it('parses K suffix', () => {
      expect(parseNumber('1.2K')).toBe(1200);
    });
    it('parses M suffix', () => {
      expect(parseNumber('2.5M')).toBe(2500000);
    });
    it('returns 0 for invalid input', () => {
      expect(parseNumber('abc')).toBe(0);
      expect(parseNumber(null)).toBe(0);
    });
  });

  describe('sleep', () => {
    it('delays for specified milliseconds', async () => {
      const start = Date.now();
      await sleep(100);
      expect(Date.now() - start).toBeGreaterThanOrEqual(90);
    });
  });

  describe('chunkArray', () => {
    it('splits array into chunks', () => {
      expect(chunkArray([1,2,3,4,5], 2)).toEqual([[1,2],[3,4],[5]]);
    });
    it('handles empty array', () => {
      expect(chunkArray([], 3)).toEqual([]);
    });
  });
  
  // ... test every exported function
});
```

---

## Acceptance Criteria
- [ ] Every exported function from `src/utils/core.js` has tests
- [ ] Edge cases: null input, empty strings, boundary values
- [ ] Number parsing tests K/M/B suffixes
- [ ] Date parsing tests various Twitter date formats
- [ ] File I/O functions mocked (no real file writes in tests)
- [ ] Minimum 30 test cases
- [ ] All tests pass
