# Build 04-07 — Auth & Team Manager Tests

> **Creates:** `tests/unit/auth.test.js`
> **Tests:** `src/auth/teamManager.js` (270 lines) and other auth modules

---

## Task

Write tests for authentication and team management. Cookie handling, session validation, and multi-account team features.

---

## Test Plan

### Cookie Authentication
1. `parseCookie(str)` correctly splits cookie string into name/value pairs
2. `parseCookie(str)` handles cookies with `=` in values
3. `validateCookie(cookie)` returns true for valid cookie with auth_token + ct0
4. `validateCookie(cookie)` returns false for missing auth_token
5. `validateCookie(cookie)` returns false for empty string
6. `isSessionValid(cookie)` checks if session is expired
7. `extractCsrfToken(cookie)` pulls ct0 value

### Team Manager
8. `TeamManager.addAccount(name, cookie)` stores account
9. `TeamManager.addAccount()` validates cookie before storing
10. `TeamManager.removeAccount(name)` deletes account
11. `TeamManager.getAccount(name)` retrieves stored account
12. `TeamManager.listAccounts()` returns all account names
13. `TeamManager.rotateAccount()` cycles to next account
14. `TeamManager.getActiveAccount()` returns current account
15. `TeamManager.setActiveAccount(name)` switches active
16. Team config persists to file
17. Team config loads from file on init

### Edge Cases
18. Adding duplicate account name overwrites
19. Removing non-existent account is no-op
20. Rotating with one account returns same account
21. Empty team state handled gracefully

---

## Implementation Pattern

```javascript
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('node:fs/promises');

describe('TeamManager', () => {
  let manager;

  beforeEach(async () => {
    vi.mocked(fs.readFile).mockRejectedValue(new Error('ENOENT'));
    vi.mocked(fs.writeFile).mockResolvedValue();
    
    const { TeamManager } = await import('../../src/auth/teamManager.js');
    manager = new TeamManager();
  });

  it('adds and retrieves an account', async () => {
    await manager.addAccount('main', 'auth_token=abc; ct0=xyz');
    const account = manager.getAccount('main');
    expect(account).toBeDefined();
    expect(account.cookie).toContain('auth_token');
  });

  it('rotates between accounts', async () => {
    await manager.addAccount('a', 'auth_token=1; ct0=1');
    await manager.addAccount('b', 'auth_token=2; ct0=2');
    
    const first = manager.getActiveAccount();
    manager.rotateAccount();
    const second = manager.getActiveAccount();
    expect(first.name).not.toBe(second.name);
  });
});
```

---

## Acceptance Criteria
- [ ] Cookie parsing and validation fully tested
- [ ] TeamManager CRUD operations tested
- [ ] Account rotation logic tested
- [ ] File persistence mocked (no real file I/O)
- [ ] Edge cases covered (empty, duplicate, missing)
- [ ] Minimum 21 test cases
- [ ] All tests pass
