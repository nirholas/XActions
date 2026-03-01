# PollActions

Actions for creating and managing polls on X/Twitter.

## Import

```python
from xeepy.actions.polls import PollActions
```

## Class Signature

```python
class PollActions:
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
| `create_poll(question, options, duration)` | `Tweet` | Create a poll |
| `vote(tweet_url, option_index)` | `bool` | Vote on a poll |
| `get_poll_results(tweet_url)` | `PollResults` | Get poll results |

### `create_poll`

```python
async def create_poll(
    self,
    question: str,
    options: List[str],
    duration_minutes: int = 1440
) -> Tweet
```

Create a new poll tweet.

**Parameters:**
- `question`: Poll question (tweet text)
- `options`: List of 2-4 poll options
- `duration_minutes`: Poll duration (5 min to 7 days, default 24h)

**Duration Limits:**
- Minimum: 5 minutes
- Maximum: 10080 minutes (7 days)
- Default: 1440 minutes (24 hours)

### `vote`

```python
async def vote(
    self,
    tweet_url: str,
    option_index: int
) -> bool
```

Vote on a poll.

**Parameters:**
- `tweet_url`: URL of the poll tweet
- `option_index`: 0-based index of the option to vote for

### `get_poll_results`

```python
async def get_poll_results(
    self,
    tweet_url: str
) -> PollResults
```

Get current poll results.

## PollResults Object

```python
@dataclass
class PollResults:
    question: str                    # Poll question
    options: List[PollOption]        # Options with votes
    total_votes: int                 # Total vote count
    end_time: datetime               # When poll ends
    is_final: bool                   # Whether poll has ended
    voted_option: Optional[int]      # User's vote (if voted)
```

## PollOption Object

```python
@dataclass
class PollOption:
    text: str                        # Option text
    votes: int                       # Vote count
    percentage: float                # Vote percentage
```

## Usage Examples

### Create a Simple Poll

```python
from xeepy import Xeepy

async def main():
    async with Xeepy() as x:
        poll = await x.poll.create_poll(
            "What's your favorite programming language?",
            ["Python", "JavaScript", "Rust", "Go"],
            duration_minutes=1440  # 24 hours
        )
        
        print(f"Poll created: https://x.com/i/status/{poll.id}")

asyncio.run(main())
```

### Create Quick Poll (5 minutes)

```python
from xeepy import Xeepy

async def main():
    async with Xeepy() as x:
        poll = await x.poll.create_poll(
            "Quick vote: Coffee or Tea?",
            ["☕ Coffee", "🍵 Tea"],
            duration_minutes=5
        )
        
        print(f"Quick poll created! Ends in 5 minutes.")

asyncio.run(main())
```

### Create Week-Long Poll

```python
from xeepy import Xeepy

async def main():
    async with Xeepy() as x:
        poll = await x.poll.create_poll(
            "What feature should we build next?",
            ["Dark mode", "Mobile app", "API access", "Integrations"],
            duration_minutes=10080  # 7 days
        )
        
        print(f"Poll running for 7 days!")

asyncio.run(main())
```

### Vote on a Poll

```python
from xeepy import Xeepy

async def main():
    async with Xeepy() as x:
        success = await x.poll.vote(
            "https://x.com/user/status/123456789",
            option_index=0  # Vote for first option
        )
        
        print("Vote recorded!" if success else "Failed to vote")

asyncio.run(main())
```

### Get Poll Results

```python
from xeepy import Xeepy

async def main():
    async with Xeepy() as x:
        results = await x.poll.get_poll_results(
            "https://x.com/user/status/123456789"
        )
        
        print(f"Question: {results.question}")
        print(f"Total votes: {results.total_votes}")
        print(f"Status: {'Ended' if results.is_final else 'Active'}")
        print()
        
        for i, option in enumerate(results.options):
            bar = "█" * int(option.percentage / 5) + "░" * (20 - int(option.percentage / 5))
            print(f"  {option.text}")
            print(f"    {bar} {option.percentage:.1f}% ({option.votes} votes)")

asyncio.run(main())
```

### Monitor Poll Progress

```python
from xeepy import Xeepy
import asyncio

async def monitor_poll(tweet_url: str, interval: int = 300):
    """Monitor poll results in real-time."""
    async with Xeepy() as x:
        while True:
            results = await x.poll.get_poll_results(tweet_url)
            
            print(f"\n[{datetime.now().strftime('%H:%M:%S')}] Poll Update")
            print(f"Total votes: {results.total_votes}")
            
            for option in results.options:
                print(f"  {option.text}: {option.percentage:.1f}%")
            
            if results.is_final:
                print("\nPoll has ended!")
                break
            
            await asyncio.sleep(interval)

asyncio.run(monitor_poll("https://x.com/user/status/123"))
```

### Create Poll with Emojis

```python
from xeepy import Xeepy

async def main():
    async with Xeepy() as x:
        poll = await x.poll.create_poll(
            "Rate today's presentation:",
            ["🌟🌟🌟🌟🌟 Excellent", "🌟🌟🌟🌟 Great", "🌟🌟🌟 Good", "🌟🌟 Needs work"],
            duration_minutes=60
        )
        
        print("Rating poll created!")

asyncio.run(main())
```

### A/B Testing Poll

```python
from xeepy import Xeepy

async def ab_test(options: list, duration_hours: int = 24):
    """Run A/B test with a poll."""
    async with Xeepy() as x:
        poll = await x.poll.create_poll(
            "Which headline do you prefer?",
            options,
            duration_minutes=duration_hours * 60
        )
        
        print(f"A/B test started. Poll ID: {poll.id}")
        print(f"Check results in {duration_hours} hours.")
        
        return poll.id

options = [
    "A: 10 Tips to Boost Productivity",
    "B: How I 10x'd My Productivity"
]
asyncio.run(ab_test(options))
```

### Export Poll Results

```python
from xeepy import Xeepy
import json

async def export_poll_results(tweet_url: str, output_file: str):
    async with Xeepy() as x:
        results = await x.poll.get_poll_results(tweet_url)
        
        data = {
            "question": results.question,
            "total_votes": results.total_votes,
            "is_final": results.is_final,
            "end_time": results.end_time.isoformat(),
            "options": [
                {
                    "text": opt.text,
                    "votes": opt.votes,
                    "percentage": opt.percentage
                }
                for opt in results.options
            ]
        }
        
        with open(output_file, "w") as f:
            json.dump(data, f, indent=2)
        
        print(f"Results exported to {output_file}")

asyncio.run(export_poll_results("https://x.com/user/status/123", "poll_results.json"))
```

## See Also

- [SchedulingActions](scheduling.md) - Schedule polls
- [EngageActions](engage.md) - Tweet engagement
- [Tweet Model](../models/tweet.md) - Tweet data structure
