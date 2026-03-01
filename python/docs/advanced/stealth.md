# Anti-Detection Techniques

XTools includes stealth features to avoid bot detection and account restrictions.

## Browser Fingerprinting

Evade fingerprint-based detection with randomized browser profiles:

```python
from xtools import XTools
from xtools.core.stealth import StealthConfig, BrowserProfile

# Use stealth mode
stealth = StealthConfig(
    randomize_fingerprint=True,
    mask_webdriver=True,
    mask_automation=True,
    randomize_viewport=True
)

async with XTools(stealth=stealth) as x:
    await x.scrape.profile("username")

# Custom browser profile
profile = BrowserProfile(
    user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64)...",
    viewport={"width": 1920, "height": 1080},
    timezone="America/New_York",
    locale="en-US",
    geolocation={"latitude": 40.7128, "longitude": -74.0060}
)

async with XTools(browser_profile=profile) as x:
    await x.scrape.profile("username")
```

## WebDriver Detection Bypass

```python
from xtools.core.stealth import apply_stealth_scripts

async def stealth_browser_setup(page):
    """Apply stealth patches to browser page."""
    await apply_stealth_scripts(page)
    
    # These properties are patched:
    # - navigator.webdriver = undefined
    # - navigator.plugins (populated)
    # - navigator.languages (realistic)
    # - window.chrome (present)
    # - permissions API (realistic)

# Built into XTools
async with XTools(stealth=True) as x:
    # Stealth scripts applied automatically
    pass
```

!!! info "Detection Vectors"
    X checks for: WebDriver flags, automation APIs, plugin presence, and behavior patterns.

## Human-Like Behavior

Simulate realistic user interactions:

```python
from xtools.core.stealth import HumanBehavior
import random

behavior = HumanBehavior(
    typing_speed=(50, 150),    # WPM range
    mouse_movement=True,       # Realistic mouse paths
    scroll_behavior="natural", # Varied scroll patterns
    click_variation=True,      # Slight position variance
    think_time=(1, 5)          # Pause between actions
)

async with XTools(behavior=behavior) as x:
    # Actions include human-like delays and movements
    await x.engage.like(tweet_url)
    await x.engage.comment(tweet_url, "Great post!")

# Manual behavior simulation
async def human_like_typing(page, selector: str, text: str):
    """Type with human-like timing."""
    element = await page.query_selector(selector)
    await element.click()
    
    for char in text:
        await element.type(char)
        # Random delay between keystrokes
        await asyncio.sleep(random.uniform(0.05, 0.2))
```

## Request Pattern Randomization

```python
from xtools.core.stealth import RequestRandomizer

randomizer = RequestRandomizer(
    delay_range=(2, 8),        # Random delay between requests
    burst_probability=0.1,    # Occasional quick bursts
    long_pause_probability=0.05,  # Occasional long pauses
    session_length_range=(10, 30)  # Minutes per session
)

async with XTools(request_randomizer=randomizer) as x:
    # Requests have randomized timing
    for user in users:
        await x.follow.user(user)
```

!!! warning "Behavioral Analysis"
    Consistent timing patterns are a red flag. Always randomize delays.

## Session Management

Maintain realistic session patterns:

```python
from xtools.core.stealth import SessionManager

session = SessionManager(
    warm_up_period=30,         # Seconds of light activity first
    cooldown_between_sessions=300,  # 5 min between sessions
    max_session_duration=1800,  # 30 min max
    actions_per_session=50     # Max actions
)

async with XTools(session_manager=session) as x:
    async with session.start():
        # Session automatically handles timing
        await session.warm_up()  # Light browsing first
        
        for i in range(100):
            if session.should_pause():
                await session.take_break()
            
            await x.follow.user(f"user{i}")
```

## Cookie and Storage Management

```python
from xtools.core.stealth import StorageManager

async def manage_browser_storage():
    """Realistic cookie and storage patterns."""
    storage = StorageManager()
    
    async with XTools() as x:
        # Load existing storage state
        await storage.load(x.browser, "state.json")
        
        # Perform actions...
        await x.scrape.profile("username")
        
        # Save updated state
        await storage.save(x.browser, "state.json")
        
        # Selective clearing (like real users)
        await storage.clear_old_items(
            x.browser,
            max_age_days=30
        )
```

## Canvas Fingerprint Spoofing

```python
from xtools.core.stealth import CanvasSpoofing

# Randomize canvas fingerprint
canvas_spoof = CanvasSpoofing(
    mode="noise",  # Add noise to canvas operations
    noise_level=0.1
)

async with XTools(canvas_spoofing=canvas_spoof) as x:
    # Canvas-based fingerprinting is thwarted
    pass
```

## Full Stealth Configuration

```python
from xtools import XTools
from xtools.core.stealth import (
    StealthConfig,
    HumanBehavior,
    RequestRandomizer,
    SessionManager
)

# Maximum stealth configuration
stealth_config = StealthConfig(
    # Browser stealth
    mask_webdriver=True,
    mask_automation=True,
    randomize_fingerprint=True,
    spoof_canvas=True,
    spoof_webgl=True,
    
    # Behavior simulation
    behavior=HumanBehavior(
        typing_speed=(60, 120),
        mouse_movement=True,
        scroll_behavior="natural"
    ),
    
    # Request patterns
    randomizer=RequestRandomizer(
        delay_range=(3, 10),
        burst_probability=0.05
    ),
    
    # Session management
    session=SessionManager(
        warm_up_period=60,
        max_session_duration=1200
    )
)

async with XTools(stealth=stealth_config) as x:
    # Full stealth mode enabled
    await x.scrape.followers("username", limit=500)
```

!!! tip "Testing Detection"
    Use sites like [bot.sannysoft.com](https://bot.sannysoft.com) to verify stealth configuration.

## Rate Limit Recovery

```python
async def graceful_rate_limit_handling():
    """Handle rate limits gracefully."""
    async with XTools(stealth=True) as x:
        try:
            await x.scrape.followers("username", limit=1000)
        except RateLimitError as e:
            # Exponential backoff
            wait_time = e.retry_after or 900  # 15 min default
            print(f"Rate limited. Waiting {wait_time}s...")
            await asyncio.sleep(wait_time)
            
            # Resume with fresh session
            await x.auth.refresh_session()
```
