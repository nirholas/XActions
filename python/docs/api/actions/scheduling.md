# SchedulingActions

Actions for scheduling tweets and managing drafts on X/Twitter.

## Import

```python
from xeepy.actions.scheduling import SchedulingActions
```

## Class Signature

```python
class SchedulingActions:
    def __init__(
        self,
        browser_manager: BrowserManager,
        rate_limiter: Optional[RateLimiter] = None
    )
```

## Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `browser_manager` | `BrowserManager` | Required | Browser manager instance |
| `rate_limiter` | `Optional[RateLimiter]` | `None` | Rate limiter instance |

## Methods

| Method | Returns | Description |
|--------|---------|-------------|
| `schedule_tweet(text, time)` | `ScheduledTweet` | Schedule a tweet |
| `schedule_reply(text, tweet_id, time)` | `ScheduledTweet` | Schedule a reply |
| `scheduled_tweets()` | `List[ScheduledTweet]` | Get scheduled tweets |
| `delete_scheduled_tweet(id)` | `bool` | Delete scheduled tweet |
| `clear_scheduled_tweets()` | `int` | Clear all scheduled |
| `draft_tweets()` | `List[Draft]` | Get drafts |
| `delete_draft_tweet(id)` | `bool` | Delete draft |
| `clear_draft_tweets()` | `int` | Clear all drafts |

### `schedule_tweet`

```python
async def schedule_tweet(
    self,
    text: str,
    scheduled_time: Union[datetime, str],
    media: Optional[List[str]] = None,
    poll: Optional[Dict] = None
) -> ScheduledTweet
```

Schedule a tweet for future posting.

**Parameters:**
- `text`: Tweet content
- `scheduled_time`: When to post (datetime or "YYYY-MM-DD HH:MM")
- `media`: Optional media file paths
- `poll`: Optional poll configuration

### `schedule_reply`

```python
async def schedule_reply(
    self,
    text: str,
    tweet_id: str,
    scheduled_time: Union[datetime, str],
    media: Optional[List[str]] = None
) -> ScheduledTweet
```

Schedule a reply to a specific tweet.

### `scheduled_tweets`

```python
async def scheduled_tweets(self) -> List[ScheduledTweet]
```

Get all scheduled tweets.

### `draft_tweets`

```python
async def draft_tweets(self) -> List[Draft]
```

Get all saved draft tweets.

## ScheduledTweet Object

```python
@dataclass
class ScheduledTweet:
    id: str                          # Scheduled tweet ID
    text: str                        # Tweet content
    scheduled_time: datetime         # When it will post
    media: List[str]                 # Attached media
    poll: Optional[Dict]             # Poll if any
    reply_to_id: Optional[str]       # If it's a reply
    created_at: datetime             # When scheduled
```

## Draft Object

```python
@dataclass
class Draft:
    id: str                          # Draft ID
    text: str                        # Draft content
    media: List[str]                 # Attached media
    created_at: datetime             # When saved
    updated_at: datetime             # Last modified
```

## Usage Examples

### Schedule a Tweet

```python
from xeepy import Xeepy
from datetime import datetime, timedelta

async def main():
    async with Xeepy() as x:
        # Schedule for 2 hours from now
        scheduled_time = datetime.now() + timedelta(hours=2)
        
        scheduled = await x.schedule.tweet(
            "This tweet was scheduled using Xeepy! 🚀",
            scheduled_time
        )
        
        print(f"Scheduled for: {scheduled.scheduled_time}")
        print(f"ID: {scheduled.id}")

asyncio.run(main())
```

### Schedule with String Time

```python
from xeepy import Xeepy

async def main():
    async with Xeepy() as x:
        scheduled = await x.schedule.tweet(
            "Happy New Year! 🎉",
            "2025-01-01 00:00"
        )
        
        print(f"Tweet scheduled for: {scheduled.scheduled_time}")

asyncio.run(main())
```

### Schedule with Media

```python
from xeepy import Xeepy
from datetime import datetime, timedelta

async def main():
    async with Xeepy() as x:
        scheduled = await x.schedule.tweet(
            "Check out this amazing photo!",
            datetime.now() + timedelta(days=1),
            media=["photo.jpg"]
        )
        
        print(f"Scheduled tweet with media: {scheduled.id}")

asyncio.run(main())
```

### Schedule a Reply

```python
from xeepy import Xeepy
from datetime import datetime, timedelta

async def main():
    async with Xeepy() as x:
        scheduled = await x.schedule.reply(
            "Thanks for sharing! Great insights.",
            tweet_id="123456789",
            scheduled_time=datetime.now() + timedelta(hours=1)
        )
        
        print(f"Reply scheduled: {scheduled.id}")

asyncio.run(main())
```

### List Scheduled Tweets

```python
from xeepy import Xeepy

async def main():
    async with Xeepy() as x:
        scheduled = await x.schedule.scheduled_tweets()
        
        print(f"You have {len(scheduled)} scheduled tweets:")
        for tweet in scheduled:
            print(f"  [{tweet.scheduled_time}] {tweet.text[:50]}...")

asyncio.run(main())
```

### Delete Scheduled Tweet

```python
from xeepy import Xeepy

async def main():
    async with Xeepy() as x:
        # Get scheduled tweets
        scheduled = await x.schedule.scheduled_tweets()
        
        if scheduled:
            # Delete the first one
            success = await x.schedule.delete_scheduled_tweet(scheduled[0].id)
            print("Deleted!" if success else "Failed to delete")

asyncio.run(main())
```

### Clear All Scheduled

```python
from xeepy import Xeepy

async def main():
    async with Xeepy() as x:
        count = await x.schedule.clear_scheduled_tweets()
        print(f"Cleared {count} scheduled tweets")

asyncio.run(main())
```

### Manage Drafts

```python
from xeepy import Xeepy

async def main():
    async with Xeepy() as x:
        # Get all drafts
        drafts = await x.schedule.draft_tweets()
        
        print(f"You have {len(drafts)} drafts:")
        for draft in drafts:
            print(f"  [{draft.updated_at}] {draft.text[:50]}...")
        
        # Delete a specific draft
        if drafts:
            await x.schedule.delete_draft_tweet(drafts[0].id)
        
        # Or clear all drafts
        # await x.schedule.clear_draft_tweets()

asyncio.run(main())
```

### Content Calendar

```python
from xeepy import Xeepy
from datetime import datetime, timedelta

async def schedule_week(content: list):
    """Schedule a week's worth of content."""
    async with Xeepy() as x:
        base_time = datetime.now().replace(hour=10, minute=0, second=0)
        
        for i, tweet_text in enumerate(content):
            scheduled_time = base_time + timedelta(days=i)
            
            # Skip weekends
            while scheduled_time.weekday() >= 5:
                scheduled_time += timedelta(days=1)
            
            scheduled = await x.schedule.tweet(tweet_text, scheduled_time)
            print(f"Scheduled for {scheduled_time.strftime('%A, %B %d')}")

content = [
    "Monday motivation! 💪",
    "Tech tip Tuesday: Always backup your data! 💾",
    "Wisdom Wednesday: Keep learning, keep growing 📚",
    "Throwback Thursday to our first product launch 🚀",
    "Feature Friday: Check out our new dashboard!"
]

asyncio.run(schedule_week(content))
```

### Optimal Time Scheduling

```python
from xeepy import Xeepy
from datetime import datetime, timedelta

async def schedule_at_optimal_times(tweets: list, optimal_hours: list = [9, 12, 17]):
    """Schedule tweets at optimal engagement times."""
    async with Xeepy() as x:
        base_date = datetime.now().date()
        
        for i, tweet_text in enumerate(tweets):
            day_offset = i // len(optimal_hours)
            hour_index = i % len(optimal_hours)
            
            scheduled_time = datetime.combine(
                base_date + timedelta(days=day_offset),
                datetime.min.time()
            ).replace(hour=optimal_hours[hour_index])
            
            await x.schedule.tweet(tweet_text, scheduled_time)
            print(f"Scheduled: {scheduled_time}")

asyncio.run(schedule_at_optimal_times(my_tweets))
```

## See Also

- [PollActions](polls.md) - Create polls
- [EngageActions](engage.md) - Tweet engagement
- [Tweet Model](../models/tweet.md) - Tweet data structure
