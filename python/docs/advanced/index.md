# Advanced Topics

Deep dives into Xeepy internals and advanced usage patterns.

## Architecture

<div class="grid cards" markdown>

-   :material-sitemap:{ .lg .middle } **[System Architecture](architecture.md)**
    
    Understand how Xeepy components work together

-   :material-puzzle:{ .lg .middle } **[Plugin System](plugins.md)**
    
    Extend Xeepy with custom plugins

-   :material-code-braces:{ .lg .middle } **[Custom Scrapers](custom-scrapers.md)**
    
    Build your own scrapers

-   :material-speedometer:{ .lg .middle } **[Performance Tuning](performance.md)**
    
    Optimize for speed and efficiency

</div>

## Infrastructure

<div class="grid cards" markdown>

-   :material-server:{ .lg .middle } **[Proxies & Rotation](proxies.md)**
    
    Configure proxy rotation for stealth

-   :material-incognito:{ .lg .middle } **[Stealth Mode](stealth.md)**
    
    Avoid detection and blocks

-   :material-lan:{ .lg .middle } **[Distributed Scraping](distributed.md)**
    
    Scale across multiple machines

-   :material-docker:{ .lg .middle } **[Docker Deployment](docker.md)**
    
    Production container deployment

</div>

## Development

<div class="grid cards" markdown>

-   :material-test-tube:{ .lg .middle } **[Testing Guide](testing.md)**
    
    Test your Xeepy integrations

-   :material-bug:{ .lg .middle } **[Error Handling](errors.md)**
    
    Graceful error recovery

-   :material-webhook:{ .lg .middle } **[Webhooks & Events](webhooks.md)**
    
    Event-driven integrations

-   :material-api:{ .lg .middle } **[REST API Server](api-server.md)**
    
    Run Xeepy as a service

</div>

## Quick Links

| Topic | Description | Difficulty |
|-------|-------------|------------|
| [Architecture](architecture.md) | System design overview | Intermediate |
| [Custom Scrapers](custom-scrapers.md) | Build new scrapers | Advanced |
| [Proxies](proxies.md) | Proxy configuration | Intermediate |
| [Stealth](stealth.md) | Detection avoidance | Advanced |
| [Distributed](distributed.md) | Multi-machine scaling | Expert |
| [Performance](performance.md) | Speed optimization | Intermediate |
| [Docker](docker.md) | Container deployment | Intermediate |
| [Testing](testing.md) | Testing strategies | Intermediate |
| [Errors](errors.md) | Error handling | Beginner |
| [Plugins](plugins.md) | Plugin development | Advanced |

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         Xeepy                                   │
├─────────────────────────────────────────────────────────────────┤
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐        │
│  │ Scrapers │  │ Actions  │  │ Monitor  │  │ Analytics│        │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘        │
│       │             │             │             │               │
│  ┌────▼─────────────▼─────────────▼─────────────▼────┐         │
│  │                    Core                            │         │
│  │  ┌────────────┐  ┌────────────┐  ┌────────────┐  │         │
│  │  │  Browser   │  │    Auth    │  │Rate Limiter│  │         │
│  │  └────────────┘  └────────────┘  └────────────┘  │         │
│  └───────────────────────┬───────────────────────────┘         │
│                          │                                      │
│  ┌───────────────────────▼───────────────────────────┐         │
│  │                    Storage                         │         │
│  │  ┌────────┐  ┌────────┐  ┌────────┐  ┌────────┐  │         │
│  │  │ SQLite │  │  CSV   │  │  JSON  │  │  Excel │  │         │
│  │  └────────┘  └────────┘  └────────┘  └────────┘  │         │
│  └───────────────────────────────────────────────────┘         │
└─────────────────────────────────────────────────────────────────┘
```

## Key Concepts

### Browser Management

Xeepy uses Playwright for browser automation:

```python
from xeepy.core.browser import BrowserManager

class BrowserManager:
    """Manages browser lifecycle and page pool."""
    
    async def start(self) -> None:
        """Launch browser with stealth configuration."""
        
    async def new_page(self) -> Page:
        """Create new page with rate limiting."""
        
    async def close(self) -> None:
        """Clean shutdown with session save."""
```

### Rate Limiting

Intelligent rate limiting protects your account:

```python
from xeepy.core.rate_limiter import RateLimiter

class RateLimiter:
    """Adaptive rate limiter with backoff."""
    
    def __init__(
        self,
        requests_per_minute: int = 20,
        burst_limit: int = 5,
        backoff_factor: float = 2.0
    ): ...
    
    async def wait(self) -> None:
        """Wait for rate limit clearance."""
        
    def record_response(self, status: int) -> None:
        """Adjust limits based on response."""
```

### Event System

Xeepy emits events for monitoring:

```python
from xeepy.core.events import EventEmitter

class Xeepy(EventEmitter):
    """Emits events during operations."""
    
    # Events:
    # - "scrape:start", "scrape:complete", "scrape:error"
    # - "action:start", "action:complete", "action:error"
    # - "auth:login", "auth:logout", "auth:expired"
    # - "rate_limit:warning", "rate_limit:hit"

# Subscribe to events
x.on("scrape:complete", lambda data: print(f"Scraped {len(data)} items"))
x.on("rate_limit:warning", lambda: print("Slowing down..."))
```

## Configuration Hierarchy

Configuration is loaded in this order (later overrides earlier):

1. **Defaults** - Built-in defaults
2. **System config** - `/etc/xeepy/config.toml`
3. **User config** - `~/.config/xeepy/config.toml`
4. **Project config** - `./xeepy.toml`
5. **Environment variables** - `XEEPY_*`
6. **CLI arguments** - `--option value`
7. **Runtime** - `x.config.setting = value`

## Extension Points

Xeepy is designed for extensibility:

### Custom Scrapers

```python
from xeepy.scrapers.base import BaseScraper

class MyScraper(BaseScraper):
    """Custom scraper implementation."""
    
    async def scrape(self, target: str, **kwargs) -> ScrapeResult:
        # Your implementation
        pass
```

### Custom Actions

```python
from xeepy.actions.base import BaseAction

class MyAction(BaseAction):
    """Custom action implementation."""
    
    async def execute(self, **kwargs) -> ActionResult:
        # Your implementation
        pass
```

### Custom Notifications

```python
from xeepy.notifications.base import BaseNotifier

class MyNotifier(BaseNotifier):
    """Custom notification channel."""
    
    async def send(self, message: str, **kwargs) -> bool:
        # Your implementation
        pass
```

## Performance Characteristics

| Operation | Typical Speed | Memory Usage |
|-----------|---------------|--------------|
| Profile scrape | 1-2 sec | ~50 MB |
| 100 tweets | 10-20 sec | ~100 MB |
| 1000 followers | 60-120 sec | ~200 MB |
| Follow action | 2-3 sec | ~50 MB |
| Like action | 1-2 sec | ~50 MB |

## Security Considerations

- Sessions are stored encrypted by default
- Credentials never logged
- Rate limiting protects accounts
- Proxy support for IP rotation
- Stealth mode to avoid detection

## Next Steps

- [Architecture Deep Dive](architecture.md) - Understand the internals
- [Performance Tuning](performance.md) - Optimize your usage
- [Stealth Mode](stealth.md) - Avoid detection
- [Distributed Scraping](distributed.md) - Scale up
