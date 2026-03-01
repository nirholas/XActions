# System Architecture

XTools follows a modular architecture designed for extensibility, performance, and maintainability.

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                      XTools Client                          │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────┐  ┌─────────┐  ┌──────────┐  ┌──────────────┐  │
│  │ Scrapers│  │ Actions │  │ Monitor  │  │   AI Engine  │  │
│  └────┬────┘  └────┬────┘  └────┬─────┘  └──────┬───────┘  │
│       │            │            │               │          │
│  ┌────┴────────────┴────────────┴───────────────┴───────┐  │
│  │                    Core Layer                         │  │
│  │  ┌────────────┐ ┌─────────────┐ ┌──────────────────┐ │  │
│  │  │  Browser   │ │    Auth     │ │   Rate Limiter   │ │  │
│  │  │  Manager   │ │   Manager   │ │                  │ │  │
│  │  └────────────┘ └─────────────┘ └──────────────────┘ │  │
│  └──────────────────────────────────────────────────────┘  │
├─────────────────────────────────────────────────────────────┤
│                    Storage Layer                            │
│  ┌──────────┐  ┌──────────┐  ┌───────────┐                 │
│  │  SQLite  │  │  Export  │  │   Cache   │                 │
│  └──────────┘  └──────────┘  └───────────┘                 │
└─────────────────────────────────────────────────────────────┘
```

## Core Components

### Browser Manager

The `BrowserManager` handles Playwright browser lifecycle and page management.

```python
from xtools.core.browser import BrowserManager

async def browser_lifecycle_example():
    """Demonstrates browser manager usage."""
    browser = BrowserManager(
        headless=True,
        proxy="http://proxy:8080",
        user_agent="custom-agent"
    )
    
    async with browser:
        # Get a new page context
        page = await browser.new_page()
        
        # Navigate with retry logic
        await browser.navigate(page, "https://x.com")
        
        # Screenshot for debugging
        await browser.screenshot(page, "debug.png")
        
        # Close specific page
        await browser.close_page(page)
```

### Auth Manager

Handles session persistence, cookie management, and authentication state.

```python
from xtools.core.auth import AuthManager

async def auth_example():
    """Authentication management."""
    auth = AuthManager(browser_manager)
    
    # Load existing session
    if await auth.load_cookies("session.json"):
        print("Session restored")
    else:
        # Manual login required
        await auth.login()
        await auth.save_cookies("session.json")
    
    # Verify session is valid
    if await auth.is_authenticated():
        tokens = auth.get_auth_tokens()
        print(f"CSRF Token: {tokens['ct0']}")
```

### Rate Limiter

Protects accounts with intelligent request throttling.

```python
from xtools.core.rate_limiter import RateLimiter, RateLimitConfig

async def rate_limiter_example():
    """Rate limiting configuration."""
    config = RateLimitConfig(
        requests_per_minute=30,
        requests_per_hour=500,
        burst_limit=5,
        cooldown_seconds=60
    )
    
    limiter = RateLimiter(config)
    
    async def make_request():
        async with limiter.acquire("scrape"):
            # Request is rate-limited
            await do_scrape()
    
    # Check current usage
    stats = limiter.get_stats()
    print(f"Requests this hour: {stats['hourly_count']}")
```

!!! info "Rate Limit Defaults"
    XTools ships with conservative defaults to protect your account. Adjust based on your needs.

## Component Interaction

```python
from xtools import XTools

async def component_interaction():
    """Shows how components work together."""
    async with XTools() as x:
        # Browser manager creates page
        # Auth manager validates session
        # Rate limiter controls request flow
        # Scraper uses all three
        
        replies = await x.scrape.replies(
            "https://x.com/user/status/123",
            limit=100
        )
        
        # Storage layer handles persistence
        x.export.to_csv(replies, "output.csv")
```

!!! tip "Dependency Injection"
    All components accept dependencies via constructor, enabling easy testing and customization.

## Event System

XTools uses an event-driven architecture for extensibility:

```python
from xtools.core.events import EventBus

async def event_system_example():
    """Event-driven architecture."""
    bus = EventBus()
    
    @bus.on("scrape.complete")
    async def on_scrape_complete(data):
        print(f"Scraped {len(data)} items")
    
    @bus.on("rate_limit.hit")
    async def on_rate_limit(endpoint):
        print(f"Rate limited on {endpoint}")
    
    # Events are emitted automatically by components
    await bus.emit("scrape.complete", replies)
```

!!! warning "Thread Safety"
    The event bus is async-safe but not thread-safe. Use within a single event loop.
