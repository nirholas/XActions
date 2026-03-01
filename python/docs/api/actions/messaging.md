# DirectMessageActions

Actions for sending and managing Direct Messages on X/Twitter.

## Import

```python
from xeepy.actions.messaging import DirectMessageActions
```

## Class Signature

```python
class DirectMessageActions:
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
| `send(message, recipients)` | `DMResult` | Send DM to users |
| `inbox()` | `InboxResult` | Get inbox conversations |
| `history(conversation_ids)` | `List[Conversation]` | Get conversation history |
| `search(query)` | `List[Message]` | Search DMs |
| `delete(conversation_id)` | `bool` | Delete conversation |
| `mark_read(conversation_id)` | `bool` | Mark as read |

### `send`

```python
async def send(
    self,
    message: str,
    recipients: List[str],
    media: Optional[str] = None,
    delay_range: Tuple[float, float] = (5.0, 15.0)
) -> DMResult
```

Send a direct message to one or more users.

**Parameters:**
- `message`: Message text
- `recipients`: List of usernames to message
- `media`: Optional media file path
- `delay_range`: Delay between messages (seconds)

### `inbox`

```python
async def inbox(
    self,
    limit: int = 50,
    unread_only: bool = False
) -> InboxResult
```

Get inbox conversations.

**Parameters:**
- `limit`: Maximum conversations to fetch
- `unread_only`: Only return unread conversations

### `history`

```python
async def history(
    self,
    conversation_ids: List[str],
    limit: int = 100
) -> List[Conversation]
```

Get message history for conversations.

### `search`

```python
async def search(
    self,
    query: str,
    limit: int = 50
) -> List[Message]
```

Search through DM history.

### `delete`

```python
async def delete(
    self,
    conversation_id: str,
    message_id: Optional[str] = None
) -> bool
```

Delete a conversation or specific message.

## DMResult Object

```python
@dataclass
class DMResult:
    sent: List[str]                  # Successfully messaged usernames
    failed: List[Dict]               # Failed with errors
    blocked: List[str]               # Users who block DMs
```

## InboxResult Object

```python
@dataclass
class InboxResult:
    conversations: List[Conversation]
    total_unread: int
    cursor: Optional[str]
```

## Conversation Object

```python
@dataclass
class Conversation:
    id: str                          # Conversation ID
    participant_usernames: List[str] # Participants
    last_message: Message            # Last message
    unread_count: int                # Unread messages
    created_at: datetime             # Conversation start
    updated_at: datetime             # Last activity
```

## Message Object

```python
@dataclass
class Message:
    id: str                          # Message ID
    text: str                        # Message content
    sender: str                      # Sender username
    created_at: datetime             # Sent time
    media: Optional[List[Media]]     # Attached media
    is_read: bool                    # Read status
```

## Usage Examples

### Send Single DM

```python
from xeepy import Xeepy

async def main():
    async with Xeepy() as x:
        result = await x.dm.send(
            "Hey! Thanks for following. Let me know if you have any questions!",
            recipients=["username"]
        )
        
        if result.sent:
            print("Message sent successfully!")
        else:
            print(f"Failed: {result.failed}")

asyncio.run(main())
```

### Send DM with Media

```python
from xeepy import Xeepy

async def main():
    async with Xeepy() as x:
        result = await x.dm.send(
            "Check out this image!",
            recipients=["username"],
            media="screenshot.png"
        )
        
        print(f"Sent to: {result.sent}")

asyncio.run(main())
```

### Send to Multiple Recipients

```python
from xeepy import Xeepy

async def main():
    async with Xeepy() as x:
        result = await x.dm.send(
            "Hello! Thanks for your interest in our product.",
            recipients=["user1", "user2", "user3"],
            delay_range=(10.0, 30.0)  # Longer delays for safety
        )
        
        print(f"Successfully sent: {len(result.sent)}")
        print(f"Failed: {len(result.failed)}")
        print(f"Blocked DMs: {len(result.blocked)}")

asyncio.run(main())
```

### Get Inbox

```python
from xeepy import Xeepy

async def main():
    async with Xeepy() as x:
        inbox = await x.dm.inbox(limit=20)
        
        print(f"Total unread: {inbox.total_unread}")
        print("\nConversations:")
        
        for conv in inbox.conversations:
            participants = ", ".join(conv.participant_usernames)
            unread = f"({conv.unread_count} unread)" if conv.unread_count else ""
            print(f"  {participants} {unread}")
            print(f"    Last: {conv.last_message.text[:50]}...")

asyncio.run(main())
```

### Get Conversation History

```python
from xeepy import Xeepy

async def main():
    async with Xeepy() as x:
        conversations = await x.dm.history(
            conversation_ids=["123456-789012"],
            limit=100
        )
        
        for conv in conversations:
            print(f"Conversation with {conv.participant_usernames}:")
            for msg in conv.messages:
                print(f"  [{msg.sender}] {msg.text}")

asyncio.run(main())
```

### Search DMs

```python
from xeepy import Xeepy

async def main():
    async with Xeepy() as x:
        messages = await x.dm.search("meeting tomorrow")
        
        print(f"Found {len(messages)} messages:")
        for msg in messages:
            print(f"  [{msg.sender}]: {msg.text[:60]}...")

asyncio.run(main())
```

### Delete Conversation

```python
from xeepy import Xeepy

async def main():
    async with Xeepy() as x:
        # Delete entire conversation
        success = await x.dm.delete(conversation_id="123456-789012")
        
        # Delete specific message
        success = await x.dm.delete(
            conversation_id="123456-789012",
            message_id="msg123"
        )

asyncio.run(main())
```

### Welcome New Followers

```python
from xeepy import Xeepy

async def welcome_new_followers(previous_followers: set):
    async with Xeepy() as x:
        # Get current followers
        result = await x.scrape.followers("myusername", limit=1000)
        current = {f.username for f in result.items}
        
        # Find new followers
        new_followers = current - previous_followers
        
        if new_followers:
            message = "Thanks for following! Feel free to reach out if you have questions."
            
            result = await x.dm.send(
                message,
                recipients=list(new_followers),
                delay_range=(30.0, 60.0)  # Be careful with mass DMs
            )
            
            print(f"Welcomed {len(result.sent)} new followers")
        
        return current

asyncio.run(welcome_new_followers(set()))
```

## See Also

- [FollowActions](follow.md) - Follow operations
- [FollowersScraper](../scrapers/followers.md) - Get followers
- [User Model](../models/user.md) - User data structure
