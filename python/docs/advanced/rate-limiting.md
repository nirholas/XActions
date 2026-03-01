# Rate Limiting Configuration

Configure rate limiting to protect your accounts and avoid detection when using XTools.

## Built-in Rate Limiter

XTools includes an adaptive rate limiter that respects X/Twitter's limits:

```python
from xtools import XTools
from xtools.core.rate_limiter import RateLimitConfig

config = RateLimitConfig(
    follows_per_hour=20,
    unfollows_per_hour=20,
    likes_per_hour=50,
    tweets_per_hour=25,
    dms_per_day=500,
    scrape_requests_per_minute=30,
)

async with XTools(rate_limit_config=config) as x:
    await x.follow.user("username")
```

!!! danger "Default Limits Are Conservative"
    XTools uses conservative defaults to protect your account. Increasing limits may trigger suspensions.

## Rate Limiter Implementation

```python
import asyncio
from dataclasses import dataclass, field
from collections import deque
from time import time

@dataclass
class RateLimiter:
    max_requests: int
    window_seconds: float
    _timestamps: deque = field(default_factory=deque)
    _lock: asyncio.Lock = field(default_factory=asyncio.Lock)
    
    async def acquire(self):
        """Wait until a request slot is available."""
        async with self._lock:
            now = time()
            while self._timestamps and now - self._timestamps[0] > self.window_seconds:
                self._timestamps.popleft()
            
            if len(self._timestamps) >= self.max_requests:
                wait_time = self.window_seconds - (now - self._timestamps[0])
                await asyncio.sleep(wait_time)
                self._timestamps.popleft()
            
            self._timestamps.append(time())
    
    @property
    def remaining(self) -> int:
        now = time()
        valid = sum(1 for t in self._timestamps if now - t <= self.window_seconds)
        return max(0, self.max_requests - valid)
```

## Adaptive Rate Limiting

```python
async def adaptive_follow(usernames: list[str]):
    """Follow users with adaptive rate limiting."""
    async with XTools() as x:
        for username in usernames:
            remaining = x.rate_limiter.remaining("follow")
            
            if remaining < 5:
                print("Approaching limit, cooling down...")
                await asyncio.sleep(300)
            
            await x.follow.user(username)
            base_delay = 3
            delay = base_delay * (1 + (20 - remaining) / 20)
            await asyncio.sleep(delay)
```

!!! tip "Check Limits Before Bulk Operations"
    ```python
    status = await x.get_limits_status()
    if status["follow"]["remaining_hour"] < 10:
        print("Low follow quota - consider waiting")
    ```

## Random Delays for Stealth

```python
import random

async def stealthy_operation(usernames: list[str]):
    """Add human-like random delays."""
    async with XTools() as x:
        for username in usernames:
            await x.follow.user(username)
            
            delay = random.uniform(5, 15)
            if random.random() < 0.1:
                delay += random.uniform(30, 60)
            await asyncio.sleep(delay)
```

!!! warning "Avoid Predictable Patterns"
    X/Twitter detects automation through consistent timing. Always add randomization.

## Monitoring Rate Limit Status

```python
async def monitor_limits():
    """Log rate limit status periodically."""
    async with XTools() as x:
        while True:
            status = await x.rate_limiter.status()
            print(f"Rate limits: {status}")
            
            if status["warning"]:
                await x.notifications.send("Rate limit warning")
            await asyncio.sleep(60)
```

## Action-Specific Limits

```python
class XToolsWithLimits:
    def __init__(self):
        self.limiters = {
            "follow": RateLimiter(max_requests=20, window_seconds=3600),
            "like": RateLimiter(max_requests=50, window_seconds=3600),
            "tweet": RateLimiter(max_requests=25, window_seconds=3600),
        }
    
    async def follow(self, username: str):
        await self.limiters["follow"].acquire()
        # Perform follow action
```
