# Error Handling and Recovery

Learn how to handle errors gracefully and implement recovery patterns in XTools automation.

## Exception Hierarchy

XTools provides structured exceptions for different failure scenarios:

```python
from xtools.core.exceptions import (
    XToolsError,           # Base exception
    AuthenticationError,   # Login/session failures
    RateLimitError,        # Rate limit exceeded
    NetworkError,          # Connection issues
    ElementNotFoundError,  # DOM element missing
    AccountSuspendedError, # Account restrictions
)
```

## Basic Error Handling

```python
from xtools import XTools
from xtools.core.exceptions import RateLimitError, AuthenticationError

async def safe_scrape(tweet_url: str):
    """Scrape with proper error handling."""
    try:
        async with XTools() as x:
            await x.auth.load_cookies("session.json")
            replies = await x.scrape.replies(tweet_url)
            return replies
            
    except AuthenticationError:
        print("Session expired - please re-authenticate")
        return None
        
    except RateLimitError as e:
        print(f"Rate limited. Retry after {e.retry_after} seconds")
        return None
```

!!! danger "Always Handle Authentication Errors"
    Session cookies can expire unexpectedly. Always wrap authenticated operations in try/except blocks.

## Retry Pattern with Exponential Backoff

```python
import asyncio
from xtools.core.exceptions import NetworkError, RateLimitError

async def retry_with_backoff(coro_func, max_retries: int = 3, base_delay: float = 1.0):
    """Execute coroutine with exponential backoff on failure."""
    last_exception = None
    
    for attempt in range(max_retries):
        try:
            return await coro_func()
            
        except RateLimitError as e:
            delay = e.retry_after or (base_delay * (2 ** attempt))
            print(f"Rate limited. Waiting {delay}s...")
            await asyncio.sleep(delay)
            last_exception = e
            
        except NetworkError as e:
            delay = base_delay * (2 ** attempt)
            print(f"Network error. Retry {attempt + 1}/{max_retries} in {delay}s")
            await asyncio.sleep(delay)
            last_exception = e
    
    raise last_exception

# Usage
async def main():
    async with XTools() as x:
        replies = await retry_with_backoff(
            lambda: x.scrape.replies("https://x.com/user/status/123")
        )
```

!!! tip "Use tenacity Library"
    For production, consider the `tenacity` library for more sophisticated retry logic:
    ```python
    from tenacity import retry, stop_after_attempt, wait_exponential
    ```

## Circuit Breaker Pattern

```python
import time
from dataclasses import dataclass

@dataclass
class CircuitBreaker:
    failure_threshold: int = 5
    recovery_timeout: float = 60.0
    _failures: int = 0
    _last_failure: float = 0
    _state: str = "closed"

    async def call(self, coro):
        """Execute with circuit breaker protection."""
        if self._state == "open":
            if time.time() - self._last_failure > self.recovery_timeout:
                self._state = "half-open"
            else:
                raise Exception("Circuit breaker is open")
        
        try:
            result = await coro
            self._failures = 0
            self._state = "closed"
            return result
        except Exception as e:
            self._failures += 1
            self._last_failure = time.time()
            if self._failures >= self.failure_threshold:
                self._state = "open"
            raise e
```

!!! warning "Log All Errors"
    Always log errors for debugging, even when handled gracefully:
    ```python
    import logging
    logger = logging.getLogger(__name__)
    logger.exception("Operation failed", exc_info=e)
    ```

## Graceful Degradation

```python
async def scrape_with_fallback(username: str):
    """Try multiple methods, gracefully degrade on failure."""
    async with XTools() as x:
        try:
            return await x.api.graphql.get_user(username)
        except Exception:
            pass
        
        try:
            return await x.scrape.profile(username)
        except Exception:
            pass
        
        return await x.storage.get_cached_profile(username)
```
