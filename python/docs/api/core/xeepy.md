# Xeepy

The main entry point for the Xeepy library, providing access to all scraping, action, and monitoring functionality.

## Import

```python
from xeepy import Xeepy
```

## Class Signature

```python
class Xeepy:
    def __init__(
        self,
        headless: bool = True,
        proxy: Optional[str] = None,
        user_agent: Optional[str] = None,
        timeout: int = 30000,
        slow_mo: int = 0,
        config_path: Optional[str] = None
    )
```

## Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `headless` | `bool` | `True` | Run browser in headless mode |
| `proxy` | `Optional[str]` | `None` | Proxy server URL (e.g., `http://user:pass@host:port`) |
| `user_agent` | `Optional[str]` | `None` | Custom user agent string |
| `timeout` | `int` | `30000` | Default timeout in milliseconds |
| `slow_mo` | `int` | `0` | Slow down operations by specified milliseconds |
| `config_path` | `Optional[str]` | `None` | Path to configuration file |

## Attributes

| Attribute | Type | Description |
|-----------|------|-------------|
| `scrape` | `ScraperManager` | Access to all scraping operations |
| `follow` | `FollowActions` | Follow-related actions |
| `unfollow` | `UnfollowActions` | Unfollow-related actions |
| `engage` | `EngageActions` | Engagement actions (like, retweet, etc.) |
| `monitor` | `MonitorManager` | Monitoring operations |
| `export` | `ExportManager` | Data export utilities |
| `auth` | `AuthManager` | Authentication management |
| `dm` | `DirectMessageActions` | Direct message operations |
| `schedule` | `SchedulingActions` | Tweet scheduling |
| `poll` | `PollActions` | Poll creation and management |

## Methods

### `__aenter__`

```python
async def __aenter__(self) -> "Xeepy"
```

Async context manager entry. Initializes the browser and returns the Xeepy instance.

### `__aexit__`

```python
async def __aexit__(self, exc_type, exc_val, exc_tb) -> None
```

Async context manager exit. Closes the browser and cleans up resources.

### `close`

```python
async def close(self) -> None
```

Manually close the browser and cleanup resources.

## Usage Examples

### Basic Usage

```python
from xeepy import Xeepy

async def main():
    async with Xeepy() as x:
        # Scrape replies to a tweet
        replies = await x.scrape.replies("https://x.com/user/status/123")
        
        # Export to CSV
        x.export.to_csv(replies, "replies.csv")

asyncio.run(main())
```

### With Proxy and Custom Settings

```python
from xeepy import Xeepy

async def main():
    async with Xeepy(
        headless=False,
        proxy="http://user:pass@proxy.example.com:8080",
        timeout=60000,
        slow_mo=100
    ) as x:
        # Operations with visible browser and proxy
        profile = await x.scrape.profile("username")
        print(profile)

asyncio.run(main())
```

### Manual Resource Management

```python
from xeepy import Xeepy

async def main():
    x = Xeepy(headless=True)
    try:
        await x.__aenter__()
        followers = await x.scrape.followers("username", limit=500)
    finally:
        await x.close()

asyncio.run(main())
```

## See Also

- [BrowserManager](browser.md) - Browser management details
- [AuthManager](auth.md) - Authentication methods
- [Config](config.md) - Configuration options
