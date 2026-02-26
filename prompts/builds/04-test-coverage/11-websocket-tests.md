# Build 04-11 — WebSocket Tests

> **Creates:** `tests/api/websocket.test.js`
> **Tests:** `api/realtime/` Socket.IO handlers

---

## Task

Write tests for Socket.IO real-time event handlers using mock sockets.

---

## Test Plan

1. Connection event creates session
2. Auth middleware rejects unauthenticated connections
3. Auth middleware accepts valid token
4. `scrape:start` event triggers scraping
5. `scrape:data` event emits chunked results
6. `scrape:complete` event includes duration
7. `scrape:error` event includes partial results count
8. Disconnect event cleans up session
9. Multiple concurrent connections handled
10. Room/namespace joining works
11. Broadcast to room works
12. Rate limit during streaming pauses and resumes
13. Error during streaming emits error event to client

---

## Implementation Pattern

```javascript
import { describe, it, expect, vi } from 'vitest';
import { createMockSocket, createMockIO } from '../helpers/index.js';

describe('WebSocket Handlers', () => {
  it('emits scrape:data events in chunks', async () => {
    const socket = createMockSocket();
    
    await streamScrapeResults(socket, async () => {
      return Array.from({ length: 150 }, (_, i) => ({ id: i }));
    }, { chunkSize: 50, method: 'scrapeFollowers', target: 'test' });

    const dataEmits = socket.emit.mock.calls.filter(c => c[0] === 'scrape:data');
    expect(dataEmits.length).toBe(3); // 150 items / 50 chunk = 3
    
    const completeEmit = socket.emit.mock.calls.find(c => c[0] === 'scrape:complete');
    expect(completeEmit[1].total).toBe(150);
  });
});
```

---

## Acceptance Criteria
- [ ] All Socket.IO event handlers tested
- [ ] Auth middleware tested (accept/reject)
- [ ] Streaming with chunked data verified
- [ ] Error during streaming emits partial count
- [ ] Mock socket factory used — no real server
- [ ] Minimum 13 test cases
- [ ] All tests pass
