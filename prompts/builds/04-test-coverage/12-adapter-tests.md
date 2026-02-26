# Build 04-12 — Adapter Tests

> **Creates:** `tests/scrapers/adapters.test.js`
> **Tests:** `src/scrapers/adapters/` (base, puppeteer, playwright, cheerio, crawlee, got-jsdom, selenium)

---

## Task

Write tests for the adapter system that provides a unified interface across multiple scraping backends.

---

## Test Plan

### Base Adapter
1. BaseAdapter defines required interface methods
2. Calling unimplemented method throws
3. BaseAdapter has name, capabilities properties

### Puppeteer Adapter
4. PuppeteerAdapter implements all base methods
5. `launch()` creates browser instance
6. `navigate(url)` calls page.goto
7. `evaluate(fn)` calls page.evaluate
8. `close()` closes browser
9. `screenshot()` returns buffer

### Playwright Adapter
10. PlaywrightAdapter implements all base methods
11. `launch()` creates browser via playwright
12. `navigate()`, `evaluate()`, `close()` work

### Cheerio Adapter
13. CheerioAdapter implements parse methods
14. `fetch(url)` makes HTTP request and loads HTML
15. `select(selector)` returns matched elements
16. Does not support `evaluate()` (DOM-only)

### Adapter Registry
17. `getAdapter(name)` returns correct adapter
18. `getAdapter('puppeteer')` returns PuppeteerAdapter
19. `getAdapter('unknown')` throws error
20. `listAdapters()` returns all registered adapters
21. Default adapter is puppeteer

### Capability-Based Selection
22. `selectAdapter({ needsJS: true })` picks puppeteer or playwright
23. `selectAdapter({ needsJS: false })` picks cheerio (faster)
24. `selectAdapter({ needsTLS: true })` picks adapter with TLS support

---

## Acceptance Criteria
- [ ] All 7 adapter modules tested
- [ ] Base adapter interface contract verified
- [ ] Each adapter implements all required methods
- [ ] Adapter registry selection works
- [ ] Capability-based selection logic tested
- [ ] Minimum 24 test cases
- [ ] All tests pass
