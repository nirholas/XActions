# Browser Script Patterns

XActions browser scripts run in DevTools console on x.com. They are NOT Node.js scripts.

## Standard IIFE Pattern

```javascript
(() => {
  const $button = '[data-testid="someButton"]';
  const sleep = (ms) => new Promise(r => setTimeout(r, ms));

  const run = async () => {
    // Script logic with await sleep(1000) between actions
  };

  run();
})();
```

## State Persistence

Scripts stop on page navigation. Use `sessionStorage` to track progress across re-runs:

```javascript
const getProcessed = () => {
  try { return JSON.parse(sessionStorage.getItem('xactions_key') || '[]'); }
  catch { return []; }
};

const markProcessed = (id) => {
  const items = getProcessed();
  if (!items.includes(id)) {
    items.push(id);
    sessionStorage.setItem('xactions_key', JSON.stringify(items));
  }
};
```

## Rate Limiting

- 1-3 second delays between individual actions (clicks, scrolls)
- 30+ second delays for bulk DMs
- Re-run script if it finishes but items remain (DOM loads in batches)
- X may temporarily restrict actions under heavy automation

## Scroll + Collect Pattern

Most scripts scroll the page to load more content, then process visible elements:

```javascript
const collectAndProcess = async () => {
  let retries = 3;
  while (retries > 0) {
    const items = document.querySelectorAll(selector);
    if (items.length === 0) { retries--; await sleep(2000); continue; }
    retries = 3;
    for (const item of items) {
      // process item
      await sleep(1000);
    }
    window.scrollBy(0, 500);
    await sleep(2000);
  }
};
```

## Confirmation Dialog Pattern

Many actions (unfollow, block, leave community) require a confirmation click:

```javascript
button.click();
await sleep(500);
const confirm = document.querySelector('[data-testid="confirmationSheetConfirm"]');
if (confirm) confirm.click();
```

## Dependencies

Some scripts in `src/automation/` require pasting `src/automation/core.js` first. The SKILL.md for each script notes this when applicable.
