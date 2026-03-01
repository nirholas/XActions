# RateLimiter

Manages rate limiting to protect accounts from suspension and respect X/Twitter's limits.

## Import

```python
from xeepy.core.rate_limiter import RateLimiter
```

## Class Signature

```python
class RateLimiter:
    def __init__(
        self,
        requests_per_minute: int = 30,
        requests_per_hour: int = 500,
        requests_per_day: int = 5000,
        min_delay: float = 1.0,
        max_delay: float = 5.0,
        burst_limit: int = 10
    )
```

## Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `requests_per_minute` | `int` | `30` | Maximum requests per minute |
| `requests_per_hour` | `int` | `500` | Maximum requests per hour |
| `requests_per_day` | `int` | `5000` | Maximum requests per day |
| `min_delay` | `float` | `1.0` | Minimum delay between requests (seconds) |
| `max_delay` | `float` | `5.0` | Maximum delay between requests (seconds) |
| `burst_limit` | `int` | `10` | Maximum burst requests before delay |

## Methods

| Method | Returns | Description |
|--------|---------|-------------|
| `acquire()` | `None` | Wait for rate limit slot |
| `wait()` | `None` | Apply random delay |
| `is_limited()` | `bool` | Check if currently rate limited |
| `get_stats()` | `Dict` | Get rate limit statistics |
| `reset()` | `None` | Reset all counters |
| `set_limits(...)` | `None` | Update rate limits |
| `remaining(window)` | `int` | Get remaining requests |

### `acquire`

```python
async def acquire(self, weight: int = 1) -> None
```

Acquire a rate limit slot, waiting if necessary.

**Parameters:**
- `weight`: Request weight (heavier operations can count as multiple)

### `wait`

```python
async def wait(self, min_delay: Optional[float] = None, max_delay: Optional[float] = None) -> None
```

Apply a random delay between min and max values.

### `is_limited`

```python
def is_limited(self, window: str = "minute") -> bool
```

Check if rate limit is reached for the specified window.

**Parameters:**
- `window`: Time window (`minute`, `hour`, `day`)

### `get_stats`

```python
def get_stats(self) -> Dict[str, Any]
```

Get current rate limit statistics.

**Returns:**
```python
{
    "requests_minute": 15,
    "requests_hour": 234,
    "requests_day": 1205,
    "remaining_minute": 15,
    "remaining_hour": 266,
    "remaining_day": 3795,
    "next_reset_minute": "2024-01-15T10:31:00",
    "is_limited": False
}
```

### `remaining`

```python
def remaining(self, window: str = "minute") -> int
```

Get remaining requests for the specified time window.

### `set_limits`

```python
def set_limits(
    self,
    requests_per_minute: Optional[int] = None,
    requests_per_hour: Optional[int] = None,
    requests_per_day: Optional[int] = None
) -> None
```

Update rate limit values dynamically.

## Preset Configurations

```python
# Conservative (recommended for new accounts)
RateLimiter.CONSERVATIVE = RateLimiter(
    requests_per_minute=15,
    requests_per_hour=200,
    requests_per_day=2000,
    min_delay=2.0,
    max_delay=8.0
)

# Standard (default)
RateLimiter.STANDARD = RateLimiter(
    requests_per_minute=30,
    requests_per_hour=500,
    requests_per_day=5000
)

# Aggressive (use with caution)
RateLimiter.AGGRESSIVE = RateLimiter(
    requests_per_minute=60,
    requests_per_hour=1000,
    requests_per_day=10000,
    min_delay=0.5,
    max_delay=2.0
)
```

## Usage Examples

### Basic Rate Limiting

```python
from xeepy.core.rate_limiter import RateLimiter

async def main():
    limiter = RateLimiter(
        requests_per_minute=20,
        min_delay=1.5,
        max_delay=4.0
    )
    
    for i in range(100):
        await limiter.acquire()
        # Perform action
        print(f"Request {i + 1}")
        
        # Check stats periodically
        if i % 10 == 0:
            stats = limiter.get_stats()
            print(f"Remaining this minute: {stats['remaining_minute']}")

asyncio.run(main())
```

### With Xeepy Integration

```python
from xeepy import Xeepy
from xeepy.core.rate_limiter import RateLimiter

async def main():
    # Xeepy uses rate limiting internally
    async with Xeepy() as x:
        # Access the internal rate limiter
        x.rate_limiter.set_limits(requests_per_minute=25)
        
        # Operations are automatically rate limited
        for username in usernames:
            profile = await x.scrape.profile(username)
            print(profile.followers_count)

asyncio.run(main())
```

### Conservative Mode for Sensitive Operations

```python
from xeepy.core.rate_limiter import RateLimiter

async def unfollow_with_care(x, users):
    # Use conservative limits for unfollow operations
    limiter = RateLimiter(
        requests_per_minute=10,
        requests_per_hour=100,
        min_delay=3.0,
        max_delay=10.0
    )
    
    for user in users:
        await limiter.acquire()
        await x.unfollow.user(user)
        
        # Add extra delay for sensitive operations
        await limiter.wait(min_delay=5.0, max_delay=15.0)

asyncio.run(main())
```

## See Also

- [Xeepy](xeepy.md) - Main entry point
- [Config](config.md) - Configuration options
