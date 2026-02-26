# Build 04-14 — E2E Pipeline Tests

> **Creates:** `tests/integration/pipeline.test.js`

---

## Task

Write end-to-end integration tests that exercise full scraping pipelines — from input to scrape to export. All network calls mocked, but the full internal pipeline is real.

---

## Test Plan

### Full Scrape → Export Pipeline
1. Profile scrape → JSON export → verify file content
2. Followers scrape → CSV export → verify CSV structure
3. Tweets scrape → filter → JSON export
4. Search → deduplicate → export
5. Bulk scrape (multiple users) → aggregated export

### Multi-Step Workflows
6. Scrape profile → scrape followers → compute ratio → output
7. Scrape followers → compare with following → find non-followers
8. Scrape tweets → compute engagement rate → rank
9. Login → scrape → logout cleanup

### Fallback Pipeline
10. HTTP scrape fails → Puppeteer fallback → success
11. Rate limited → wait → retry → success
12. Auth error → no fallback → proper error

### Error Accumulation Pipeline
13. Bulk scrape 10 users → 3 fail → results include 7 successes + 3 failures
14. Progress callbacks fire for each item
15. Partial results saved on abort

### MCP → Scraper → Response Pipeline
16. MCP tool call → validates input → calls scraper → formats response
17. MCP tool error → structured error response with suggestion
18. MCP health check → reports rate limit status

---

## Implementation Pattern

```javascript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createMockPage, createMockBrowser } from '../helpers/index.js';
import { writeFile, readFile, mkdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

vi.mock('puppeteer-extra');

describe('E2E Pipelines', () => {
  let tmpDir;

  beforeEach(async () => {
    tmpDir = join(tmpdir(), `xactions-test-${Date.now()}`);
    await mkdir(tmpDir, { recursive: true });
  });

  describe('scrape → export pipeline', () => {
    it('scrapes profile and exports to JSON', async () => {
      const page = createMockProfilePage({ username: 'test', followersCount: 1000 });
      
      const { scrapeProfile } = await import('../../src/scrapers/twitter/index.js');
      const { exportToJSON } = await import('../../src/scrapers/twitter/index.js');
      
      const profile = await scrapeProfile(page, 'test');
      const filePath = await exportToJSON(profile, join(tmpDir, 'profile.json'));
      
      const content = JSON.parse(await readFile(filePath, 'utf-8'));
      expect(content.username).toBe('test');
      expect(content.followersCount).toBe(1000);
    });
  });
});
```

---

## Acceptance Criteria
- [ ] Full scrape → export pipelines tested
- [ ] Multi-step workflows (scrape → compute → output)
- [ ] Fallback pipeline (HTTP → Puppeteer) tested
- [ ] Bulk operation with partial failure tested
- [ ] MCP tool → scraper → response pipeline tested
- [ ] Temporary files used for export tests
- [ ] Minimum 18 test cases
- [ ] All tests pass
