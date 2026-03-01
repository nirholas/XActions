# Performance Tuning

Optimize XTools for maximum throughput while respecting rate limits.

## Caching Strategy

XTools includes a multi-level caching system to reduce redundant requests.

```python
from xtools.storage.cache import Cache, CacheConfig

# Configure caching
cache_config = CacheConfig(
    backend="sqlite",  # or "redis", "memory"
    ttl_seconds=3600,  # 1 hour default TTL
    max_size_mb=100,
    compression=True
)

cache = Cache(cache_config)

# Manual cache usage
async def cached_profile_fetch(username: str):
    """Fetch profile with caching."""
    cache_key = f"profile:{username}"
    
    # Check cache first
    cached = await cache.get(cache_key)
    if cached:
        return cached
    
    # Fetch fresh data
    async with XTools() as x:
        profile = await x.scrape.profile(username)
    
    # Store in cache
    await cache.set(cache_key, profile, ttl=7200)
    return profile
```

!!! info "Cache Invalidation"
    Cache is automatically invalidated when actions modify data (follow, like, etc).

## Parallel Execution

Execute independent operations concurrently using `asyncio.gather`:

```python
import asyncio
from xtools import XTools

async def parallel_scraping():
    """Scrape multiple profiles in parallel."""
    usernames = ["user1", "user2", "user3", "user4", "user5"]
    
    async with XTools() as x:
        # Parallel profile scraping
        tasks = [
            x.scrape.profile(username)
            for username in usernames
        ]
        profiles = await asyncio.gather(*tasks)
        
        return profiles

async def parallel_with_semaphore():
    """Limit concurrency with semaphore."""
    usernames = ["user" + str(i) for i in range(100)]
    semaphore = asyncio.Semaphore(5)  # Max 5 concurrent
    
    async def fetch_with_limit(username):
        async with semaphore:
            async with XTools() as x:
                return await x.scrape.profile(username)
    
    tasks = [fetch_with_limit(u) for u in usernames]
    return await asyncio.gather(*tasks)
```

!!! warning "Concurrency Limits"
    Too many parallel requests can trigger rate limits. Use semaphores wisely.

## Connection Pooling

Reuse browser contexts for better performance:

```python
from xtools.core.browser import BrowserPool

async def connection_pooling():
    """Use browser connection pool."""
    pool = BrowserPool(
        size=5,           # Pool size
        headless=True,
        recycle_after=100  # Recycle after N uses
    )
    
    async with pool:
        # Get context from pool
        async with pool.acquire() as browser:
            page = await browser.new_page()
            # Use page...
        # Context returned to pool

# With XTools
async def xtools_with_pool():
    pool = BrowserPool(size=3)
    
    async with XTools(browser_pool=pool) as x:
        # XTools uses pool internally
        results = await x.scrape.replies(url)
```

## Batch Operations

Process items in batches for efficiency:

```python
from xtools import XTools
from xtools.utils import batch_processor

async def batch_follow_users():
    """Follow users in batches."""
    users_to_follow = ["user" + str(i) for i in range(500)]
    
    async with XTools() as x:
        results = await batch_processor(
            items=users_to_follow,
            processor=x.follow.user,
            batch_size=10,
            delay_between_batches=30,  # seconds
            on_progress=lambda done, total: print(f"{done}/{total}")
        )
        
        print(f"Followed: {results.success_count}")
        print(f"Failed: {results.failure_count}")
```

## Memory Optimization

Handle large datasets without exhausting memory:

```python
from xtools import XTools

async def stream_large_dataset():
    """Stream results instead of loading all in memory."""
    async with XTools() as x:
        # Use async generator for large result sets
        async for tweet in x.scrape.tweets_stream(
            "username",
            limit=10000
        ):
            # Process one at a time
            process_tweet(tweet)
            
            # Optionally write to file incrementally
            append_to_csv(tweet, "output.csv")

async def chunked_export():
    """Export large datasets in chunks."""
    async with XTools() as x:
        chunk_size = 1000
        offset = 0
        
        while True:
            tweets = await x.scrape.tweets(
                "username",
                limit=chunk_size,
                offset=offset
            )
            
            if not tweets:
                break
            
            x.export.to_csv(
                tweets,
                f"tweets_{offset}.csv"
            )
            offset += chunk_size
```

!!! tip "Generator Pattern"
    Use async generators (`async for`) when processing thousands of items.

## Performance Monitoring

```python
from xtools.monitoring import PerformanceMonitor
import time

async def monitored_scraping():
    """Monitor scraping performance."""
    monitor = PerformanceMonitor()
    
    async with XTools() as x:
        with monitor.track("profile_scrape"):
            profile = await x.scrape.profile("username")
        
        with monitor.track("followers_scrape"):
            followers = await x.scrape.followers("username", limit=1000)
    
    # Get metrics
    stats = monitor.get_stats()
    print(f"Profile scrape: {stats['profile_scrape']['avg_ms']}ms avg")
    print(f"Followers scrape: {stats['followers_scrape']['avg_ms']}ms avg")
    
    # Export metrics
    monitor.export_prometheus("metrics.txt")
```

## Configuration Presets

```python
from xtools import XTools
from xtools.config import PerformancePreset

# High-throughput preset
async with XTools(preset=PerformancePreset.HIGH_THROUGHPUT) as x:
    # Aggressive caching, parallel execution
    pass

# Conservative preset (safer for accounts)
async with XTools(preset=PerformancePreset.CONSERVATIVE) as x:
    # Slower, more human-like behavior
    pass

# Custom configuration
config = {
    "cache_ttl": 1800,
    "max_concurrent": 3,
    "request_delay": (1, 3),
    "retry_attempts": 3
}
async with XTools(config=config) as x:
    pass
```
