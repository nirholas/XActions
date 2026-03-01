# DiscordNotifier

Send notifications to Discord channels via webhooks.

## Import

```python
from xeepy.notifications import DiscordNotifier
```

## Class Signature

```python
class DiscordNotifier:
    def __init__(
        self,
        webhook_url: str,
        username: str = "Xeepy Bot",
        avatar_url: Optional[str] = None
    )
```

## Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `webhook_url` | `str` | Required | Discord webhook URL |
| `username` | `str` | `"Xeepy Bot"` | Bot display name |
| `avatar_url` | `Optional[str]` | `None` | Bot avatar URL |

## Methods

| Method | Returns | Description |
|--------|---------|-------------|
| `send(message)` | `bool` | Send text message |
| `send_embed(embed)` | `bool` | Send rich embed |
| `notify_unfollowers(users)` | `bool` | Report unfollowers |
| `notify_new_followers(users)` | `bool` | Report new followers |
| `notify_mention(tweet)` | `bool` | Report mention |
| `notify_milestone(metric, value)` | `bool` | Report milestone |

### `send`

```python
async def send(
    self,
    message: str
) -> bool
```

Send a plain text message.

### `send_embed`

```python
async def send_embed(
    self,
    title: str,
    description: str = "",
    color: int = 0x1DA1F2,
    fields: List[Dict] = None,
    thumbnail: str = None,
    footer: str = None
) -> bool
```

Send a rich embed message.

### `notify_unfollowers`

```python
async def notify_unfollowers(
    self,
    users: List[User],
    account: str = None
) -> bool
```

Send unfollower notification with user details.

## Usage Examples

### Basic Setup

```python
from xeepy.notifications import DiscordNotifier

notifier = DiscordNotifier(
    webhook_url="https://discord.com/api/webhooks/...",
    username="Twitter Bot",
    avatar_url="https://example.com/avatar.png"
)
```

### Send Simple Message

```python
from xeepy.notifications import DiscordNotifier

async def main():
    notifier = DiscordNotifier(webhook_url="https://discord.com/api/webhooks/...")
    
    await notifier.send("Hello from Xeepy! 👋")

asyncio.run(main())
```

### Send Rich Embed

```python
from xeepy.notifications import DiscordNotifier

async def main():
    notifier = DiscordNotifier(webhook_url="https://discord.com/api/webhooks/...")
    
    await notifier.send_embed(
        title="📊 Daily Report",
        description="Here's your Twitter activity summary",
        color=0x1DA1F2,  # Twitter blue
        fields=[
            {"name": "New Followers", "value": "+15", "inline": True},
            {"name": "Unfollowers", "value": "-3", "inline": True},
            {"name": "Net Change", "value": "+12", "inline": True},
            {"name": "Total Followers", "value": "10,532", "inline": False}
        ],
        footer="Xeepy Bot • Updated just now"
    )

asyncio.run(main())
```

### Notify on Unfollowers

```python
from xeepy import Xeepy
from xeepy.notifications import DiscordNotifier

async def monitor_unfollowers():
    notifier = DiscordNotifier(webhook_url="https://discord.com/api/webhooks/...")
    
    async with Xeepy() as x:
        report = await x.monitor.unfollowers()
        
        if report.unfollowers:
            await notifier.notify_unfollowers(
                users=report.unfollowers,
                account="myaccount"
            )
            print(f"Notified about {len(report.unfollowers)} unfollowers")

asyncio.run(monitor_unfollowers())
```

### Notify on New Followers

```python
from xeepy import Xeepy
from xeepy.notifications import DiscordNotifier

async def notify_new_followers():
    notifier = DiscordNotifier(webhook_url="https://discord.com/api/webhooks/...")
    
    async with Xeepy() as x:
        report = await x.monitor.unfollowers()
        
        if report.new_followers:
            await notifier.notify_new_followers(
                users=report.new_followers,
                account="myaccount"
            )

asyncio.run(notify_new_followers())
```

### Notify on Mentions

```python
from xeepy import Xeepy
from xeepy.notifications import DiscordNotifier

async def monitor_mentions():
    notifier = DiscordNotifier(webhook_url="https://discord.com/api/webhooks/...")
    
    async with Xeepy() as x:
        mentions = await x.scrape.mentions(limit=10)
        
        for tweet in mentions.items:
            await notifier.notify_mention(tweet)
            print(f"Notified about mention from @{tweet.author.username}")

asyncio.run(monitor_mentions())
```

### Milestone Notifications

```python
from xeepy import Xeepy
from xeepy.notifications import DiscordNotifier

async def check_milestones():
    notifier = DiscordNotifier(webhook_url="https://discord.com/api/webhooks/...")
    
    milestones = [100, 500, 1000, 5000, 10000, 50000, 100000]
    
    async with Xeepy() as x:
        user = await x.scrape.profile("myaccount")
        
        for milestone in milestones:
            if user.followers_count >= milestone:
                # Check if we just crossed it
                await notifier.notify_milestone(
                    metric="followers",
                    value=milestone
                )
                break

asyncio.run(check_milestones())
```

### Custom Embed Colors

```python
from xeepy.notifications import DiscordNotifier

async def colored_notifications():
    notifier = DiscordNotifier(webhook_url="https://discord.com/api/webhooks/...")
    
    # Success (green)
    await notifier.send_embed(
        title="✅ Success",
        description="Operation completed",
        color=0x00FF00
    )
    
    # Warning (yellow)
    await notifier.send_embed(
        title="⚠️ Warning",
        description="Rate limit approaching",
        color=0xFFFF00
    )
    
    # Error (red)
    await notifier.send_embed(
        title="❌ Error",
        description="Authentication failed",
        color=0xFF0000
    )

asyncio.run(colored_notifications())
```

### Scheduled Daily Report

```python
from xeepy import Xeepy
from xeepy.notifications import DiscordNotifier
import asyncio

async def daily_report():
    notifier = DiscordNotifier(webhook_url="https://discord.com/api/webhooks/...")
    
    while True:
        async with Xeepy() as x:
            user = await x.scrape.profile("myaccount")
            report = await x.monitor.unfollowers()
            
            await notifier.send_embed(
                title="📊 Daily Twitter Report",
                description=f"Stats for @{user.username}",
                fields=[
                    {"name": "Followers", "value": f"{user.followers_count:,}", "inline": True},
                    {"name": "Following", "value": f"{user.following_count:,}", "inline": True},
                    {"name": "Tweets", "value": f"{user.tweet_count:,}", "inline": True},
                    {"name": "New Followers", "value": f"+{len(report.new_followers)}", "inline": True},
                    {"name": "Unfollowers", "value": f"-{len(report.unfollowers)}", "inline": True}
                ]
            )
        
        # Wait 24 hours
        await asyncio.sleep(86400)

asyncio.run(daily_report())
```

### Integrate with Monitoring

```python
from xeepy import Xeepy
from xeepy.notifications import DiscordNotifier

async def full_monitoring():
    notifier = DiscordNotifier(webhook_url="https://discord.com/api/webhooks/...")
    
    async with Xeepy() as x:
        async def on_unfollow(user):
            await notifier.send_embed(
                title="👋 Unfollower",
                description=f"@{user.username} unfollowed you",
                color=0xFF6B6B,
                fields=[
                    {"name": "Followers", "value": str(user.followers_count), "inline": True}
                ]
            )
        
        async def on_follow(user):
            await notifier.send_embed(
                title="🎉 New Follower",
                description=f"@{user.username} followed you!",
                color=0x4ECDC4,
                fields=[
                    {"name": "Followers", "value": str(user.followers_count), "inline": True}
                ]
            )
        
        await x.monitor.unfollowers(
            on_unfollow=on_unfollow,
            on_follow=on_follow,
            interval=300
        )

asyncio.run(full_monitoring())
```

## See Also

- [TelegramNotifier](telegram.md) - Telegram notifications
- [EmailNotifier](email.md) - Email notifications
- [UnfollowersMonitor](../monitoring/unfollowers.md) - Unfollower tracking
