# BrowserManager

Manages Playwright browser instances, pages, and browser contexts for X/Twitter automation.

## Import

```python
from xeepy.core.browser import BrowserManager
```

## Class Signature

```python
class BrowserManager:
    def __init__(
        self,
        headless: bool = True,
        proxy: Optional[str] = None,
        user_agent: Optional[str] = None,
        viewport: Optional[Dict[str, int]] = None,
        timeout: int = 30000,
        slow_mo: int = 0,
        browser_type: str = "chromium"
    )
```

## Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `headless` | `bool` | `True` | Run browser without visible UI |
| `proxy` | `Optional[str]` | `None` | Proxy server URL |
| `user_agent` | `Optional[str]` | `None` | Custom user agent string |
| `viewport` | `Optional[Dict[str, int]]` | `None` | Browser viewport size `{"width": 1920, "height": 1080}` |
| `timeout` | `int` | `30000` | Default timeout in milliseconds |
| `slow_mo` | `int` | `0` | Slow down Playwright operations |
| `browser_type` | `str` | `"chromium"` | Browser engine: `chromium`, `firefox`, `webkit` |

## Methods

| Method | Returns | Description |
|--------|---------|-------------|
| `start()` | `None` | Initialize and launch browser |
| `stop()` | `None` | Close browser and cleanup |
| `new_page()` | `Page` | Create a new browser page |
| `close_page(page)` | `None` | Close a specific page |
| `goto(url, page)` | `Response` | Navigate to URL |
| `wait_for_selector(selector, page)` | `ElementHandle` | Wait for element |
| `screenshot(path, page)` | `bytes` | Take screenshot |
| `get_cookies()` | `List[Dict]` | Get all cookies |
| `set_cookies(cookies)` | `None` | Set cookies |
| `clear_cookies()` | `None` | Clear all cookies |

### `start`

```python
async def start(self) -> None
```

Initialize Playwright and launch the browser instance.

### `stop`

```python
async def stop(self) -> None
```

Close the browser and cleanup all resources.

### `new_page`

```python
async def new_page(self, context: Optional[BrowserContext] = None) -> Page
```

Create a new browser page, optionally in a specific context.

### `goto`

```python
async def goto(
    self,
    url: str,
    page: Optional[Page] = None,
    wait_until: str = "domcontentloaded"
) -> Response
```

Navigate to a URL and wait for the page to load.

**Parameters:**
- `url`: Target URL
- `page`: Page instance (uses default if None)
- `wait_until`: Load state to wait for (`domcontentloaded`, `load`, `networkidle`)

### `wait_for_selector`

```python
async def wait_for_selector(
    self,
    selector: str,
    page: Optional[Page] = None,
    timeout: Optional[int] = None,
    state: str = "visible"
) -> ElementHandle
```

Wait for an element matching the selector to appear.

### `screenshot`

```python
async def screenshot(
    self,
    path: Optional[str] = None,
    page: Optional[Page] = None,
    full_page: bool = False
) -> bytes
```

Capture a screenshot of the current page.

## Usage Examples

### Basic Browser Management

```python
from xeepy.core.browser import BrowserManager

async def main():
    browser = BrowserManager(headless=False)
    await browser.start()
    
    try:
        page = await browser.new_page()
        await browser.goto("https://x.com", page)
        await browser.screenshot("screenshot.png", page)
    finally:
        await browser.stop()

asyncio.run(main())
```

### With Proxy Configuration

```python
from xeepy.core.browser import BrowserManager

async def main():
    browser = BrowserManager(
        headless=True,
        proxy="http://proxy.example.com:8080",
        viewport={"width": 1920, "height": 1080}
    )
    await browser.start()
    
    cookies = await browser.get_cookies()
    print(f"Cookies: {len(cookies)}")
    
    await browser.stop()

asyncio.run(main())
```

## See Also

- [Xeepy](xeepy.md) - Main entry point
- [AuthManager](auth.md) - Authentication handling
