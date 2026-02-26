# Build 04-09 — CLI Command Tests

> **Creates:** `tests/cli/commands.test.js`
> **Tests:** `src/cli/index.js` (2,982 lines, 12+ commands)

---

## Task

Write tests for all CLI commands using Commander.js test patterns. Verify command parsing, option handling, output formatting, and error behavior.

---

## Test Plan

### Command Parsing (12 tests)
1. `scrape profile <username>` parses username
2. `scrape followers <username> --count 100` parses options
3. `scrape tweets <username> --format json` parses format
4. `unfollow all` command recognized
5. `unfollow non-followers` command recognized
6. `auth login` command recognized
7. `auth check` validates stored cookie
8. `persona create` command recognized
9. `persona run <id>` parses persona ID
10. `analytics <username>` parses username
11. `search <query>` parses query string
12. `--help` shows help text

### Command Execution (10 tests)
13. `scrape profile` calls scrapeProfile and formats output
14. `scrape followers` calls scrapeFollowers with correct options
15. `unfollow non-followers` confirms before proceeding
16. `auth login` stores cookie
17. `persona list` displays persona table
18. Output respects `--json` flag
19. Output respects `--csv` flag
20. `--output <file>` writes to file
21. `--verbose` enables debug output
22. `--dry-run` skips actual actions

### Error Handling (5 tests)
23. Missing required argument shows error message
24. AuthError displays re-auth suggestion
25. RateLimitError displays wait time
26. Network error displays connection message
27. Exit codes match error type

---

## Implementation Pattern

```javascript
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock all dependencies
vi.mock('../../src/scrapers/twitter/index.js');
vi.mock('inquirer');
vi.mock('ora', () => ({
  default: () => ({
    start: vi.fn().mockReturnThis(),
    succeed: vi.fn().mockReturnThis(),
    fail: vi.fn().mockReturnThis(),
    text: '',
  }),
}));

describe('CLI Commands', () => {
  let program;

  beforeEach(async () => {
    // Reset Commander program for each test
    const { createProgram } = await import('../../src/cli/index.js');
    program = createProgram();
  });

  describe('scrape profile', () => {
    it('calls scrapeProfile with username', async () => {
      await program.parseAsync(['node', 'xactions', 'scrape', 'profile', 'testuser']);
      
      const { scrapeProfile } = await import('../../src/scrapers/twitter/index.js');
      expect(scrapeProfile).toHaveBeenCalledWith(
        expect.anything(),
        'testuser',
        expect.any(Object)
      );
    });
  });

  describe('error handling', () => {
    it('exits with code 3 on AuthError', async () => {
      const { scrapeProfile } = await import('../../src/scrapers/twitter/index.js');
      scrapeProfile.mockRejectedValue(new AuthError('Bad cookie'));
      
      const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => {});
      await program.parseAsync(['node', 'xactions', 'scrape', 'profile', 'test']);
      expect(exitSpy).toHaveBeenCalledWith(3);
    });
  });
});
```

---

## Acceptance Criteria
- [ ] All 12+ commands have parsing tests
- [ ] Command execution calls correct underlying functions
- [ ] Option parsing tested (--count, --format, --output, etc.)
- [ ] Error handling maps errors to correct exit codes
- [ ] Output formatting (json, csv, table) tested
- [ ] Interactive prompts mocked
- [ ] Minimum 27 test cases
- [ ] All tests pass
