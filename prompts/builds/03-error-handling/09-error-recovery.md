# Build 03-09 — Error Recovery Patterns

> **Creates:** `src/utils/recovery.js`
> **Depends on:** Track 03 Builds 01-02 (errors, retry)

---

## Task

Build recovery strategies for common failure scenarios — session refresh, cookie re-authentication, browser restart, and page navigation recovery.

---

## File: `src/utils/recovery.js`

### Session Recovery

```javascript
export class SessionRecovery {
  #page;
  #cookie;
  #maxRecoveries = 3;
  #recoveryCount = 0;

  constructor(page, cookie) {
    this.#page = page;
    this.#cookie = cookie;
  }

  async recover(error) {
    if (this.#recoveryCount >= this.#maxRecoveries) {
      throw new ScraperError(
        `Max recovery attempts (${this.#maxRecoveries}) exceeded`,
        { cause: error }
      );
    }
    this.#recoveryCount++;

    if (error instanceof AuthError) {
      return this.#refreshSession();
    }
    if (error instanceof NetworkError) {
      return this.#reloadPage();
    }
    if (error.message?.includes('Target closed') || error.message?.includes('Session closed')) {
      return this.#restartPage();
    }
    if (error.message?.includes('Navigation timeout')) {
      return this.#handleNavigationTimeout();
    }

    throw error; // Can't recover from this error type
  }

  async #refreshSession() {
    console.log('🔄 Refreshing session with cookie...');
    await this.#page.deleteCookie(...(await this.#page.cookies()));
    const cookies = parseCookieString(this.#cookie);
    await this.#page.setCookie(...cookies);
    await this.#page.reload({ waitUntil: 'networkidle2', timeout: 30000 });
    
    // Verify session is valid
    const isLoggedIn = await this.#page.evaluate(() => {
      return !!document.querySelector('[data-testid="primaryColumn"]');
    });
    if (!isLoggedIn) {
      throw new AuthError('Session refresh failed — cookie may be expired');
    }
    console.log('✅ Session refreshed');
  }

  async #reloadPage() {
    console.log('🔄 Reloading page after network error...');
    await sleep(2000);
    await this.#page.reload({ waitUntil: 'networkidle2', timeout: 30000 });
    console.log('✅ Page reloaded');
  }

  async #restartPage() {
    console.log('🔄 Restarting page after crash...');
    const browser = this.#page.browser();
    this.#page = await browser.newPage();
    if (this.#cookie) {
      const cookies = parseCookieString(this.#cookie);
      await this.#page.setCookie(...cookies);
    }
    console.log('✅ Page restarted');
    return this.#page; // Return new page reference
  }

  async #handleNavigationTimeout() {
    console.log('🔄 Handling navigation timeout...');
    try {
      await this.#page.goto('about:blank', { timeout: 5000 });
    } catch {
      // Ignore — just trying to reset state
    }
    await sleep(3000);
    console.log('✅ Navigation state reset');
  }

  get page() { return this.#page; }
  resetCount() { this.#recoveryCount = 0; }
}
```

### withRecovery wrapper

```javascript
export async function withRecovery(recovery, fn, options = {}) {
  const maxAttempts = options.maxAttempts ?? 3;
  
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const result = await fn(recovery.page);
      recovery.resetCount(); // Reset on success
      return result;
    } catch (error) {
      console.warn(`⚠️ Attempt ${attempt}/${maxAttempts} failed: ${error.message}`);
      
      if (attempt === maxAttempts) throw error;
      
      try {
        const newPage = await recovery.recover(error);
        if (newPage && newPage !== recovery.page) {
          // Page was restarted — caller needs the new reference
        }
      } catch (recoveryError) {
        throw recoveryError; // Recovery itself failed
      }
    }
  }
}
```

### Browser restart recovery

```javascript
export class BrowserRecovery {
  #browserFactory;
  #browser;

  constructor(browserFactory) {
    this.#browserFactory = browserFactory;
  }

  async getBrowser() {
    if (this.#browser?.isConnected()) return this.#browser;
    
    console.log('🔄 Restarting browser...');
    if (this.#browser) {
      try { await this.#browser.close(); } catch {}
    }
    this.#browser = await this.#browserFactory();
    console.log('✅ Browser restarted');
    return this.#browser;
  }

  async withBrowser(fn) {
    const browser = await this.getBrowser();
    try {
      return await fn(browser);
    } catch (error) {
      if (error.message?.includes('Protocol error') || 
          error.message?.includes('Browser closed') ||
          error.message?.includes('Connection closed')) {
        this.#browser = null;
        const newBrowser = await this.getBrowser();
        return fn(newBrowser);
      }
      throw error;
    }
  }
}
```

### Cookie string parser utility

```javascript
export function parseCookieString(cookieString) {
  return cookieString.split(';').map(pair => {
    const [name, ...rest] = pair.trim().split('=');
    return {
      name: name.trim(),
      value: rest.join('=').trim(),
      domain: '.x.com',
      path: '/',
    };
  }).filter(c => c.name && c.value);
}
```

---

## Tests: `tests/errors/recovery.test.js`

1. Test SessionRecovery refreshes cookies on AuthError
2. Test SessionRecovery reloads page on NetworkError
3. Test SessionRecovery throws after max recovery attempts
4. Test withRecovery retries with recovery on failure
5. Test withRecovery returns result on first success
6. Test BrowserRecovery restarts disconnected browser
7. Test parseCookieString handles complex cookie values
8. Test resetCount resets after successful operation

---

## Acceptance Criteria
- [ ] SessionRecovery handles auth, network, crash, and timeout errors
- [ ] BrowserRecovery auto-restarts disconnected browsers
- [ ] withRecovery wrapper composes recovery with retry
- [ ] Max recovery limit prevents infinite loops
- [ ] Cookie string parser correctly splits cookies
- [ ] All 8 tests pass
