# Build 04-10 — API Route Tests

> **Creates:** `tests/api/routes.test.js`
> **Tests:** `api/routes/`, `api/server.js`

---

## Task

Write API route tests using supertest. Test every Express endpoint for correct response codes, body structure, and error handling.

---

## Setup

```bash
npm install -D supertest
```

---

## Test Plan

### Health & Status Routes
1. `GET /api/health` returns 200 with status
2. `GET /api/status` returns server info

### Scraper Routes
3. `GET /api/scrape/profile/:username` returns profile JSON
4. `GET /api/scrape/profile/:username` returns 404 for non-existent user
5. `GET /api/scrape/followers/:username` returns array
6. `GET /api/scrape/followers/:username?count=50` respects query param
7. `GET /api/scrape/tweets/:username` returns tweets
8. `GET /api/scrape/search?q=test` returns search results
9. `GET /api/scrape/trending` returns trending

### Auth Routes
10. `POST /api/auth/login` with cookie returns token
11. `POST /api/auth/login` without cookie returns 400
12. `GET /api/auth/check` with valid token returns 200
13. `GET /api/auth/check` without token returns 401

### Analytics Routes
14. `GET /api/analytics/:username` returns analytics data
15. `GET /api/analytics/:username/engagement` returns engagement metrics

### Persona Routes
16. `GET /api/personas` returns persona list
17. `POST /api/personas` creates persona
18. `GET /api/personas/:id` returns specific persona
19. `DELETE /api/personas/:id` deletes persona

### Error Handling
20. 404 for unknown route
21. 400 for malformed request body
22. 429 with Retry-After header on rate limit
23. 500 for internal errors (non-XActions errors)
24. Error response includes `error` type and `message`

---

## Implementation Pattern

```javascript
import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import request from 'supertest';

// Mock scraper before importing app
vi.mock('../../src/scrapers/twitter/index.js', () => ({
  scrapeProfile: vi.fn().mockResolvedValue({
    username: 'testuser', followers: 1000
  }),
  // ...
}));

describe('API Routes', () => {
  let app;

  beforeAll(async () => {
    const { createApp } = await import('../../api/server.js');
    app = createApp();
  });

  describe('GET /api/health', () => {
    it('returns 200 with status ok', async () => {
      const res = await request(app).get('/api/health');
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('ok');
    });
  });

  describe('GET /api/scrape/profile/:username', () => {
    it('returns profile data', async () => {
      const res = await request(app).get('/api/scrape/profile/testuser');
      expect(res.status).toBe(200);
      expect(res.body.username).toBe('testuser');
    });
  });

  describe('POST /api/auth/login', () => {
    it('returns 400 without cookie', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({});
      expect(res.status).toBe(400);
    });
  });
});
```

---

## Acceptance Criteria
- [ ] All API routes tested with supertest
- [ ] Correct HTTP status codes verified
- [ ] Response body structure validated
- [ ] Auth middleware tested (valid/invalid/missing token)
- [ ] Error responses follow standard format
- [ ] Scrapers mocked — no real browser/network
- [ ] Minimum 24 test cases
- [ ] All tests pass
