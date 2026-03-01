# Proxy Configuration

Configure proxies for anonymity, geo-targeting, and avoiding IP-based rate limits.

## Basic Proxy Setup

```python
from xtools import XTools

# HTTP/HTTPS proxy
async with XTools(proxy="http://proxy.example.com:8080") as x:
    await x.scrape.profile("username")

# Authenticated proxy
async with XTools(proxy="http://user:pass@proxy.example.com:8080") as x:
    await x.scrape.profile("username")

# SOCKS5 proxy
async with XTools(proxy="socks5://proxy.example.com:1080") as x:
    await x.scrape.profile("username")
```

## Proxy Rotation

Rotate through multiple proxies to distribute requests:

```python
from xtools import XTools
from xtools.core.proxy import ProxyRotator, ProxyConfig

# Simple list rotation
proxies = [
    "http://proxy1.example.com:8080",
    "http://proxy2.example.com:8080",
    "http://proxy3.example.com:8080",
]

rotator = ProxyRotator(proxies, strategy="round_robin")

async with XTools(proxy_rotator=rotator) as x:
    # Each request uses next proxy in rotation
    for username in usernames:
        await x.scrape.profile(username)

# Weighted rotation (use some proxies more than others)
weighted_proxies = [
    {"url": "http://fast-proxy:8080", "weight": 3},
    {"url": "http://slow-proxy:8080", "weight": 1},
]

rotator = ProxyRotator(weighted_proxies, strategy="weighted")
```

!!! tip "Sticky Sessions"
    Use sticky sessions to keep the same proxy for related requests (login, scrape).

## Proxy Health Checking

Automatically remove failing proxies:

```python
from xtools.core.proxy import ProxyPool

async def managed_proxy_pool():
    """Proxy pool with health checks."""
    pool = ProxyPool(
        proxies=[
            "http://proxy1:8080",
            "http://proxy2:8080",
            "http://proxy3:8080",
        ],
        health_check_interval=60,  # seconds
        max_failures=3,            # remove after 3 failures
        test_url="https://x.com"
    )
    
    await pool.start()
    
    async with XTools(proxy_pool=pool) as x:
        # Pool automatically rotates and health-checks
        results = await x.scrape.followers("username")
    
    await pool.stop()
    
    # Get pool statistics
    stats = pool.get_stats()
    print(f"Active proxies: {stats['active']}")
    print(f"Failed proxies: {stats['failed']}")
```

## Geo-Targeted Proxies

Use location-specific proxies for regional content:

```python
from xtools.core.proxy import GeoProxyManager

geo_proxies = GeoProxyManager({
    "US": ["http://us-proxy1:8080", "http://us-proxy2:8080"],
    "UK": ["http://uk-proxy1:8080"],
    "JP": ["http://jp-proxy1:8080"],
})

async with XTools(proxy_manager=geo_proxies) as x:
    # Scrape US trends
    x.set_geo("US")
    us_trends = await x.scrape.trends()
    
    # Switch to UK
    x.set_geo("UK")
    uk_trends = await x.scrape.trends()
```

## Residential Proxy Integration

```python
from xtools import XTools
from xtools.core.proxy import ResidentialProxy

# BrightData/Luminati integration
bright_data = ResidentialProxy(
    provider="brightdata",
    username="your_username",
    password="your_password",
    country="US",
    session_type="rotating"  # or "sticky"
)

async with XTools(proxy=bright_data) as x:
    await x.scrape.profile("username")

# Oxylabs integration
oxylabs = ResidentialProxy(
    provider="oxylabs",
    username="customer-user",
    password="password",
    country="DE"
)
```

!!! warning "Residential Proxies"
    Residential proxies are expensive. Use datacenter proxies for testing.

## Proxy Configuration File

```yaml
# proxies.yaml
pools:
  default:
    strategy: round_robin
    proxies:
      - url: http://proxy1:8080
        weight: 1
      - url: http://proxy2:8080
        weight: 2
        
  residential:
    provider: brightdata
    username: ${BRIGHTDATA_USER}
    password: ${BRIGHTDATA_PASS}
    country: US
    
health_check:
  enabled: true
  interval: 60
  timeout: 10
  max_failures: 3
```

```python
from xtools import XTools
from xtools.core.proxy import load_proxy_config

config = load_proxy_config("proxies.yaml")

async with XTools(proxy_config=config) as x:
    # Use default pool
    await x.scrape.profile("user1")
    
    # Switch to residential pool
    x.use_proxy_pool("residential")
    await x.scrape.profile("user2")
```

## Proxy-Aware Rate Limiting

```python
from xtools.core.rate_limiter import ProxyAwareRateLimiter

# Rate limit per proxy IP
limiter = ProxyAwareRateLimiter(
    requests_per_minute_per_proxy=20,
    global_requests_per_minute=100
)

async with XTools(
    proxy_rotator=rotator,
    rate_limiter=limiter
) as x:
    # Each proxy gets its own rate limit bucket
    for user in users:
        await x.scrape.profile(user)
```

!!! info "Proxy Rate Limits"
    Per-proxy rate limiting helps avoid bans when using shared proxy pools.

## Testing Proxy Configuration

```python
from xtools.core.proxy import test_proxy

async def verify_proxies():
    """Test proxy connectivity and speed."""
    proxies = [
        "http://proxy1:8080",
        "http://proxy2:8080",
    ]
    
    for proxy in proxies:
        result = await test_proxy(
            proxy,
            test_url="https://x.com",
            timeout=10
        )
        
        if result.success:
            print(f"✅ {proxy}: {result.latency_ms}ms")
        else:
            print(f"❌ {proxy}: {result.error}")
```
