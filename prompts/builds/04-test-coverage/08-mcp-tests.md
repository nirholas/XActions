# Build 04-08 — MCP Server Tool Handler Tests

> **Creates:** `tests/mcp/tools.test.js`
> **Tests:** `src/mcp/server.js` (3,898 lines, 140+ tools), `src/mcp/local-tools.js` (1,341 lines)

---

## Task

Write tests for MCP tool handlers. The MCP server is the largest file in the project — tests should cover tool registration, input validation, output format, and error responses.

---

## Test Strategy

Don't test all 140+ tools individually — group by category and test representative tools from each group plus the common infrastructure.

### Categories to test:

**Infrastructure (10 tests)**
1. Server starts and lists all tools
2. Each tool has name, description, and inputSchema
3. Tool names follow `x_` prefix convention
4. Tool input schemas are valid JSON Schema
5. Unknown tool name returns error

**Scraping tools (10 tests)**
6. `x_scrape_profile` returns profile data
7. `x_scrape_profile` validates username param
8. `x_scrape_followers` returns array
9. `x_scrape_tweets` respects count param
10. `x_search_tweets` validates query param
11. `x_scrape_trending` returns trending topics
12. Scraping tool error returns structured MCP error

**Action tools (8 tests)**
13. `x_follow_user` validates username
14. `x_unfollow_user` validates username
15. `x_like_tweet` validates tweetId
16. `x_create_tweet` validates text param
17. Action tool error returns structured MCP error
18. Rate limit error includes retryAfterMs

**Analytics tools (5 tests)**
19. `x_get_analytics` returns engagement data
20. `x_compare_profiles` validates two usernames

**Persona tools (5 tests)**
21. `x_persona_create` validates persona config
22. `x_persona_list` returns array
23. `x_persona_run` validates persona ID

**Local tools (5 tests)**
24. Local tool registration works
25. File-based tools validate paths
26. Config tools read/write correctly

---

## Implementation Pattern

```javascript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createMockPage, createMockBrowser } from '../helpers/index.js';

// Mock all scraper functions
vi.mock('../../src/scrapers/twitter/index.js', () => ({
  scrapeProfile: vi.fn().mockResolvedValue({
    username: 'test', followers: 100
  }),
  scrapeFollowers: vi.fn().mockResolvedValue([
    { username: 'f1' }, { username: 'f2' }
  ]),
  // ... mock all exports
}));

describe('MCP Tool Handlers', () => {
  describe('tool registration', () => {
    it('registers 140+ tools', async () => {
      // Import and check tool list
      const tools = await getToolList();
      expect(tools.length).toBeGreaterThan(130);
    });

    it('every tool has required schema fields', async () => {
      const tools = await getToolList();
      for (const tool of tools) {
        expect(tool.name).toMatch(/^x_/);
        expect(tool.description).toBeTruthy();
        expect(tool.inputSchema).toBeDefined();
      }
    });
  });

  describe('x_scrape_profile', () => {
    it('returns profile data', async () => {
      const result = await callTool('x_scrape_profile', { username: 'test' });
      expect(result.content[0].type).toBe('text');
      const data = JSON.parse(result.content[0].text);
      expect(data.username).toBe('test');
    });

    it('returns error for missing username', async () => {
      const result = await callTool('x_scrape_profile', {});
      expect(result.isError).toBe(true);
    });
  });
});
```

---

## Acceptance Criteria
- [ ] Tool registration verified (140+ tools)
- [ ] Representative tools from each category tested
- [ ] Input validation tested for required params
- [ ] Output format verified (content array with text type)
- [ ] Error responses include isError, errorType, suggestion
- [ ] All scraper functions mocked
- [ ] Minimum 43 test cases
- [ ] All tests pass
