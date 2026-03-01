# TelegramNotifier

Send notifications to Telegram chats via bot API.

## Import

```python
from xeepy.notifications import TelegramNotifier
```

## Class Signature

```python
class TelegramNotifier:
    def __init__(
        self,
        bot_token: str,
        chat_id: str,
        parse_mode: str = "HTML"
    )
```

## Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `bot_token` | `str` | Required | Telegram bot token |
| `chat_id` | `str` | Required | Chat/channel ID |
| `parse_mode` | `str` | `"HTML"` | Message format (`HTML`, `Markdown`) |

## Methods

| Method | Returns | Description |
|--------|---------|-------------|
| `send(message)` | `bool` | Send text message |
| `send_photo(url, caption)` | `bool` | Send photo with caption |
| `notify_unfollowers(users)` | `bool` | Report unfollowers |
| `notify_new_followers(users)` | `bool` | Report new followers |
| `notify_mention(tweet)` | `bool` | Report mention |
| `notify_milestone(metric, value)` | `bool` | Report milestone |

### `send`

```python
async def send(
    self,
    message: str,
    disable_preview: bool = False,
    silent: bool = False
) -> bool
```

Send a text message.

**Parameters:**
- `message`: Message text (supports HTML/Markdown)
- `disable_preview`: Disable link previews
- `silent`: Send without notification sound

### `send_photo`

```python
async def send_photo(
    self,
    photo_url: str,
    caption: str = ""
) -> bool
```

Send a photo with optional caption.

## Setup Bot

1. Message @BotFather on Telegram
2. Create new bot: `/newbot`
3. Get bot token
4. Get chat ID by messaging bot and checking `/getUpdates`

## Usage Examples

### Basic Setup

```python
from xeepy.notifications import TelegramNotifier

notifier = TelegramNotifier(
    bot_token="123456:ABC-DEF...",
    chat_id="987654321"
)
```

### Send Simple Message

```python
from xeepy.notifications import TelegramNotifier

async def main():
    notifier = TelegramNotifier(
        bot_token="123456:ABC-DEF...",
        chat_id="987654321"
    )
    
    await notifier.send("Hello from Xeepy! 👋")

asyncio.run(main())
```

### Send Formatted Message

```python
from xeepy.notifications import TelegramNotifier

async def main():
    notifier = TelegramNotifier(
        bot_token="123456:ABC-DEF...",
        chat_id="987654321",
        parse_mode="HTML"
    )
    
    message = """
<b>📊 Daily Report</b>

<b>Followers:</b> 10,532 (+15)
<b>Following:</b> 892
<b>Tweets:</b> 2,341

<i>Updated just now</i>
"""
    
    await notifier.send(message)

asyncio.run(main())
```

### Markdown Format

```python
from xeepy.notifications import TelegramNotifier

async def main():
    notifier = TelegramNotifier(
        bot_token="123456:ABC-DEF...",
        chat_id="987654321",
        parse_mode="Markdown"
    )
    
    message = """
*📊 Daily Report*

*Followers:* 10,532 (+15)
*Following:* 892
*Tweets:* 2,341

_Updated just now_
"""
    
    await notifier.send(message)

asyncio.run(main())
```

### Notify on Unfollowers

```python
from xeepy import Xeepy
from xeepy.notifications import TelegramNotifier

async def monitor_unfollowers():
    notifier = TelegramNotifier(
        bot_token="123456:ABC-DEF...",
        chat_id="987654321"
    )
    
    async with Xeepy() as x:
        report = await x.monitor.unfollowers()
        
        if report.unfollowers:
            await notifier.notify_unfollowers(report.unfollowers)
            print(f"Notified about {len(report.unfollowers)} unfollowers")

asyncio.run(monitor_unfollowers())
```

### Notify on New Followers

```python
from xeepy import Xeepy
from xeepy.notifications import TelegramNotifier

async def notify_new_followers():
    notifier = TelegramNotifier(
        bot_token="123456:ABC-DEF...",
        chat_id="987654321"
    )
    
    async with Xeepy() as x:
        report = await x.monitor.unfollowers()
        
        if report.new_followers:
            await notifier.notify_new_followers(report.new_followers)

asyncio.run(notify_new_followers())
```

### Notify on Mentions

```python
from xeepy import Xeepy
from xeepy.notifications import TelegramNotifier

async def monitor_mentions():
    notifier = TelegramNotifier(
        bot_token="123456:ABC-DEF...",
        chat_id="987654321"
    )
    
    async with Xeepy() as x:
        mentions = await x.scrape.mentions(limit=10)
        
        for tweet in mentions.items:
            await notifier.notify_mention(tweet)

asyncio.run(monitor_mentions())
```

### Send Profile Photo

```python
from xeepy import Xeepy
from xeepy.notifications import TelegramNotifier

async def send_profile():
    notifier = TelegramNotifier(
        bot_token="123456:ABC-DEF...",
        chat_id="987654321"
    )
    
    async with Xeepy() as x:
        user = await x.scrape.profile("username")
        
        await notifier.send_photo(
            photo_url=user.profile_image_url,
            caption=f"@{user.username}\n{user.followers_count:,} followers"
        )

asyncio.run(send_profile())
```

### Silent Notifications

```python
from xeepy.notifications import TelegramNotifier

async def silent_update():
    notifier = TelegramNotifier(
        bot_token="123456:ABC-DEF...",
        chat_id="987654321"
    )
    
    # Won't make notification sound
    await notifier.send("Background update completed", silent=True)

asyncio.run(silent_update())
```

### Scheduled Reports

```python
from xeepy import Xeepy
from xeepy.notifications import TelegramNotifier
import asyncio

async def hourly_report():
    notifier = TelegramNotifier(
        bot_token="123456:ABC-DEF...",
        chat_id="987654321"
    )
    
    while True:
        async with Xeepy() as x:
            user = await x.scrape.profile("myaccount")
            
            message = f"""
<b>⏰ Hourly Update</b>

<b>Followers:</b> {user.followers_count:,}
<b>Following:</b> {user.following_count:,}
"""
            
            await notifier.send(message, silent=True)
        
        await asyncio.sleep(3600)

asyncio.run(hourly_report())
```

### Send to Channel

```python
from xeepy.notifications import TelegramNotifier

# For channels, use @channelname or channel ID
notifier = TelegramNotifier(
    bot_token="123456:ABC-DEF...",
    chat_id="@mychannelname"  # or "-1001234567890"
)
```

### Integrate with Monitoring

```python
from xeepy import Xeepy
from xeepy.notifications import TelegramNotifier

async def full_monitoring():
    notifier = TelegramNotifier(
        bot_token="123456:ABC-DEF...",
        chat_id="987654321"
    )
    
    async with Xeepy() as x:
        async def on_unfollow(user):
            await notifier.send(
                f"👋 <b>Unfollower:</b> @{user.username}\n"
                f"They had {user.followers_count:,} followers"
            )
        
        async def on_follow(user):
            await notifier.send(
                f"🎉 <b>New follower:</b> @{user.username}\n"
                f"They have {user.followers_count:,} followers"
            )
        
        await x.monitor.unfollowers(
            on_unfollow=on_unfollow,
            on_follow=on_follow,
            interval=300
        )

asyncio.run(full_monitoring())
```

### Error Handling

```python
from xeepy.notifications import TelegramNotifier

async def safe_send():
    notifier = TelegramNotifier(
        bot_token="123456:ABC-DEF...",
        chat_id="987654321"
    )
    
    try:
        success = await notifier.send("Test message")
        if success:
            print("Message sent!")
        else:
            print("Failed to send")
    except Exception as e:
        print(f"Error: {e}")

asyncio.run(safe_send())
```

## See Also

- [DiscordNotifier](discord.md) - Discord notifications
- [EmailNotifier](email.md) - Email notifications
- [UnfollowersMonitor](../monitoring/unfollowers.md) - Unfollower tracking
