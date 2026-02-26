# Build 04-02 — Test Helpers & Mock Factories

> **Creates:** `tests/helpers/mockBrowser.js`, `tests/helpers/mockPage.js`, `tests/helpers/mockExpress.js`, `tests/helpers/mockSocket.js`, `tests/helpers/index.js`

---

## Task

Build reusable mock factories for Puppeteer browser/page, Express req/res, and Socket.IO. These eliminate boilerplate in every test file.

---

## File: `tests/helpers/mockPage.js`

```javascript
import { vi } from 'vitest';

/**
 * Create a mock Puppeteer Page with all commonly used methods.
 * Override specific methods in your test as needed.
 */
export function createMockPage(overrides = {}) {
  const page = {
    goto: vi.fn().mockResolvedValue(null),
    waitForSelector: vi.fn().mockResolvedValue(null),
    waitForNavigation: vi.fn().mockResolvedValue(null),
    waitForTimeout: vi.fn().mockResolvedValue(null),
    waitForFunction: vi.fn().mockResolvedValue(null),
    click: vi.fn().mockResolvedValue(null),
    type: vi.fn().mockResolvedValue(null),
    focus: vi.fn().mockResolvedValue(null),
    
    evaluate: vi.fn().mockResolvedValue(null),
    evaluateHandle: vi.fn().mockResolvedValue(null),
    $$eval: vi.fn().mockResolvedValue([]),
    $eval: vi.fn().mockResolvedValue(null),
    $: vi.fn().mockResolvedValue(null),
    $$: vi.fn().mockResolvedValue([]),
    
    content: vi.fn().mockResolvedValue('<html></html>'),
    url: vi.fn().mockReturnValue('https://x.com'),
    title: vi.fn().mockResolvedValue('X'),
    
    setViewport: vi.fn().mockResolvedValue(null),
    setUserAgent: vi.fn().mockResolvedValue(null),
    setExtraHTTPHeaders: vi.fn().mockResolvedValue(null),
    setCookie: vi.fn().mockResolvedValue(null),
    cookies: vi.fn().mockResolvedValue([]),
    deleteCookie: vi.fn().mockResolvedValue(null),
    
    screenshot: vi.fn().mockResolvedValue(Buffer.from('')),
    pdf: vi.fn().mockResolvedValue(Buffer.from('')),
    
    on: vi.fn().mockReturnThis(),
    off: vi.fn().mockReturnThis(),
    once: vi.fn().mockReturnThis(),
    removeAllListeners: vi.fn().mockReturnThis(),
    
    close: vi.fn().mockResolvedValue(null),
    isClosed: vi.fn().mockReturnValue(false),
    
    reload: vi.fn().mockResolvedValue(null),
    goBack: vi.fn().mockResolvedValue(null),
    
    browser: vi.fn(),
    
    // Expose mock internals for assertions
    _overrides: overrides,
  };

  // Apply overrides
  Object.assign(page, overrides);
  
  return page;
}

/**
 * Create a mock page that simulates a specific Twitter page state.
 */
export function createMockProfilePage(profileData = {}) {
  const defaults = {
    username: 'testuser',
    displayName: 'Test User',
    bio: 'A test account',
    followersCount: 1000,
    followingCount: 500,
    tweetsCount: 2000,
    verified: false,
    ...profileData,
  };

  return createMockPage({
    evaluate: vi.fn().mockImplementation(async (fn) => {
      // Simulate page.evaluate returning profile data
      if (typeof fn === 'function') {
        return defaults;
      }
      return defaults;
    }),
    content: vi.fn().mockResolvedValue(`
      <div data-testid="primaryColumn">
        <div data-testid="UserName">${defaults.displayName}</div>
      </div>
    `),
  });
}

/**
 * Create a mock page that simulates a "not found" state.
 */
export function createMockNotFoundPage() {
  return createMockPage({
    content: vi.fn().mockResolvedValue(`
      <div>This account doesn't exist</div>
    `),
    evaluate: vi.fn().mockResolvedValue(null),
  });
}

/**
 * Create a mock page that simulates a "suspended" state.
 */
export function createMockSuspendedPage() {
  return createMockPage({
    content: vi.fn().mockResolvedValue(`
      <div>Account suspended</div>
    `),
    evaluate: vi.fn().mockResolvedValue(null),
  });
}
```

---

## File: `tests/helpers/mockBrowser.js`

```javascript
import { vi } from 'vitest';
import { createMockPage } from './mockPage.js';

/**
 * Create a mock Puppeteer Browser.
 */
export function createMockBrowser(overrides = {}) {
  const pages = [];
  
  const browser = {
    newPage: vi.fn().mockImplementation(async () => {
      const page = createMockPage();
      page.browser = vi.fn().mockReturnValue(browser);
      pages.push(page);
      return page;
    }),
    
    pages: vi.fn().mockImplementation(async () => pages),
    
    close: vi.fn().mockResolvedValue(null),
    disconnect: vi.fn().mockResolvedValue(null),
    
    isConnected: vi.fn().mockReturnValue(true),
    
    process: vi.fn().mockReturnValue({ pid: 12345 }),
    
    wsEndpoint: vi.fn().mockReturnValue('ws://127.0.0.1:0/devtools/browser/mock'),
    
    on: vi.fn().mockReturnThis(),
    off: vi.fn().mockReturnThis(),
    once: vi.fn().mockReturnThis(),
    
    version: vi.fn().mockResolvedValue('Chrome/120.0.0.0'),
    userAgent: vi.fn().mockResolvedValue('Mozilla/5.0'),
    
    _pages: pages, // Expose for test assertions
  };

  Object.assign(browser, overrides);
  return browser;
}
```

---

## File: `tests/helpers/mockExpress.js`

```javascript
import { vi } from 'vitest';

/**
 * Create a mock Express request.
 */
export function createMockReq(overrides = {}) {
  return {
    method: 'GET',
    url: '/',
    originalUrl: '/',
    path: '/',
    params: {},
    query: {},
    body: {},
    headers: {},
    cookies: {},
    ip: '127.0.0.1',
    get: vi.fn((header) => overrides.headers?.[header.toLowerCase()]),
    ...overrides,
  };
}

/**
 * Create a mock Express response with chainable methods.
 */
export function createMockRes() {
  const res = {
    statusCode: 200,
    _headers: {},
    _json: null,
    _sent: null,

    status: vi.fn(function (code) {
      this.statusCode = code;
      return this;
    }),
    json: vi.fn(function (data) {
      this._json = data;
      return this;
    }),
    send: vi.fn(function (data) {
      this._sent = data;
      return this;
    }),
    set: vi.fn(function (key, value) {
      this._headers[key.toLowerCase()] = value;
      return this;
    }),
    header: vi.fn(function (key, value) {
      this._headers[key.toLowerCase()] = value;
      return this;
    }),
    redirect: vi.fn(),
    end: vi.fn(),
    type: vi.fn().mockReturnThis(),
    cookie: vi.fn().mockReturnThis(),
    clearCookie: vi.fn().mockReturnThis(),
  };

  return res;
}

/**
 * Create a mock Express next function.
 */
export function createMockNext() {
  return vi.fn();
}
```

---

## File: `tests/helpers/mockSocket.js`

```javascript
import { vi } from 'vitest';

/**
 * Create a mock Socket.IO socket.
 */
export function createMockSocket(overrides = {}) {
  const events = {};

  return {
    id: 'mock-socket-id',
    connected: true,
    handshake: {
      auth: {},
      headers: {},
      query: {},
      ...overrides.handshake,
    },
    data: {},

    emit: vi.fn(),
    on: vi.fn((event, handler) => {
      events[event] = events[event] || [];
      events[event].push(handler);
    }),
    off: vi.fn(),
    once: vi.fn(),
    
    join: vi.fn(),
    leave: vi.fn(),
    
    disconnect: vi.fn(),
    
    to: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    
    // Trigger an event manually in tests
    _trigger: async (event, ...args) => {
      for (const handler of events[event] || []) {
        await handler(...args);
      }
    },
    _events: events,
    
    ...overrides,
  };
}

/**
 * Create a mock Socket.IO server.
 */
export function createMockIO(overrides = {}) {
  const sockets = new Map();

  return {
    on: vi.fn(),
    emit: vi.fn(),
    use: vi.fn(),
    of: vi.fn().mockReturnThis(),
    
    sockets: {
      sockets,
      emit: vi.fn(),
    },
    
    ...overrides,
  };
}
```

---

## File: `tests/helpers/index.js`

```javascript
export { createMockPage, createMockProfilePage, createMockNotFoundPage, createMockSuspendedPage } from './mockPage.js';
export { createMockBrowser } from './mockBrowser.js';
export { createMockReq, createMockRes, createMockNext } from './mockExpress.js';
export { createMockSocket, createMockIO } from './mockSocket.js';

/**
 * Wait for a specified duration (useful in tests).
 */
export function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Create a deferred promise for testing async flows.
 */
export function createDeferred() {
  let resolve, reject;
  const promise = new Promise((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}
```

---

## Tests: `tests/helpers/helpers.test.js`

1. Test createMockPage returns object with all Puppeteer page methods
2. Test createMockBrowser.newPage returns a mock page
3. Test createMockProfilePage.evaluate returns profile data
4. Test createMockReq has standard Express properties
5. Test createMockRes.status().json() chains correctly
6. Test createMockSocket.emit records calls
7. Test createMockSocket._trigger fires registered handlers

---

## Acceptance Criteria
- [ ] Mock factories for Page, Browser, Req, Res, Socket
- [ ] Specialized page mocks (profile, not-found, suspended)
- [ ] All mocks use vi.fn() for assertions
- [ ] Central index.js re-exports everything
- [ ] Helper utilities (wait, createDeferred)
- [ ] All 7 tests pass
