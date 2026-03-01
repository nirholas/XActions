# SpacesScraper

Scrapes Twitter/X Spaces including audio, transcripts, and chat messages.

## Import

```python
from xeepy.scrapers.spaces import SpacesScraper, SpaceCategory
```

## Class Signature

```python
class SpacesScraper:
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

## SpaceCategory Enum

```python
class SpaceCategory(Enum):
    LIVE = "live"           # Currently live Spaces
    UPCOMING = "upcoming"   # Scheduled Spaces
    RECORDED = "recorded"   # Ended/recorded Spaces
    ALL = "all"             # All Spaces
```

## Methods

| Method | Returns | Description |
|--------|---------|-------------|
| `scrape(room_ids, search)` | `ScrapeResult[Space]` | Scrape Spaces by ID or search |
| `scrape_live()` | `ScrapeResult[Space]` | Get currently live Spaces |
| `scrape_upcoming()` | `ScrapeResult[Space]` | Get scheduled Spaces |
| `scrape_by_user(username)` | `ScrapeResult[Space]` | User's Spaces |
| `capture_audio(room_id)` | `str` | Download Space audio |
| `get_transcript(room_id)` | `List[TranscriptSegment]` | Get transcript |
| `get_chat(room_id)` | `List[ChatMessage]` | Get chat messages |

### `scrape`

```python
async def scrape(
    self,
    room_ids: Optional[List[str]] = None,
    search: Optional[List[Dict]] = None,
    audio: bool = False,
    chat: bool = False,
    transcript: bool = False,
    output_dir: str = "spaces"
) -> ScrapeResult[Space]
```

Scrape Spaces by room IDs or search criteria.

**Parameters:**
- `room_ids`: List of Space room IDs
- `search`: Search criteria with query and filter
- `audio`: Capture audio stream
- `chat`: Capture chat messages
- `transcript`: Capture live transcript
- `output_dir`: Directory for downloaded files

### `scrape_live`

```python
async def scrape_live(
    self,
    limit: int = 20
) -> ScrapeResult[Space]
```

Get currently live Spaces.

### `capture_audio`

```python
async def capture_audio(
    self,
    room_id: str,
    output_path: Optional[str] = None,
    duration: Optional[int] = None
) -> str
```

Capture audio from a live or recorded Space.

## Space Object

```python
@dataclass
class Space:
    id: str                          # Space ID
    title: str                       # Space title
    state: str                       # live, ended, scheduled
    host: User                       # Space host
    speakers: List[User]             # Current speakers
    listener_count: int              # Number of listeners
    participant_count: int           # Total participants
    started_at: Optional[datetime]   # Start time
    ended_at: Optional[datetime]     # End time
    scheduled_start: Optional[datetime] # Scheduled start
    is_recorded: bool                # Recording available
    audio_url: Optional[str]         # Audio file path
    chat_messages: List[ChatMessage] # Chat messages
    transcripts: List[TranscriptSegment] # Transcript segments
```

## Usage Examples

### Scrape Space by ID

```python
from xeepy import Xeepy

async def main():
    async with Xeepy() as x:
        result = await x.scrape.spaces(
            room_ids=["1eaJbrAPnBVJX"]
        )
        
        for space in result.items:
            print(f"Title: {space.title}")
            print(f"Host: @{space.host.username}")
            print(f"Listeners: {space.listener_count}")
            print(f"State: {space.state}")

asyncio.run(main())
```

### Search for Spaces

```python
from xeepy import Xeepy
from xeepy.scrapers.spaces import SpaceCategory

async def main():
    async with Xeepy() as x:
        result = await x.scrape.spaces(
            search=[
                {"query": "crypto", "filter": SpaceCategory.LIVE},
                {"query": "AI", "filter": SpaceCategory.UPCOMING}
            ]
        )
        
        for space in result.items:
            print(f"[{space.state.upper()}] {space.title}")
            print(f"  Host: @{space.host.username}")

asyncio.run(main())
```

### Capture Audio and Transcript

```python
from xeepy import Xeepy

async def main():
    async with Xeepy() as x:
        result = await x.scrape.spaces(
            room_ids=["1eaJbrAPnBVJX"],
            audio=True,
            transcript=True,
            output_dir="recordings"
        )
        
        for space in result.items:
            print(f"Space: {space.title}")
            print(f"Audio saved to: {space.audio_url}")
            print(f"Transcript segments: {len(space.transcripts)}")
            
            for segment in space.transcripts[:5]:
                print(f"  [{segment.speaker}]: {segment.text}")

asyncio.run(main())
```

### Capture Chat Messages

```python
from xeepy import Xeepy

async def main():
    async with Xeepy() as x:
        result = await x.scrape.spaces(
            room_ids=["1eaJbrAPnBVJX"],
            chat=True
        )
        
        for space in result.items:
            print(f"Chat messages: {len(space.chat_messages)}")
            
            for msg in space.chat_messages[:10]:
                print(f"@{msg.author.username}: {msg.text}")

asyncio.run(main())
```

### Get Live Spaces

```python
from xeepy import Xeepy

async def main():
    async with Xeepy() as x:
        result = await x.scrape.spaces_live(limit=20)
        
        print("Currently Live Spaces:")
        for space in result.items:
            print(f"  🔴 {space.title}")
            print(f"     Host: @{space.host.username}")
            print(f"     Listeners: {space.listener_count:,}")

asyncio.run(main())
```

### Get User's Spaces

```python
from xeepy import Xeepy

async def main():
    async with Xeepy() as x:
        result = await x.scrape.spaces_by_user("username")
        
        for space in result.items:
            status = "🔴 LIVE" if space.state == "live" else "⏺️ RECORDED"
            print(f"{status} {space.title}")
            print(f"  Started: {space.started_at}")
            print(f"  Listeners: {space.listener_count}")

asyncio.run(main())
```

### Export Space Data

```python
from xeepy import Xeepy
import json

async def main():
    async with Xeepy() as x:
        result = await x.scrape.spaces(
            room_ids=["1eaJbrAPnBVJX"],
            chat=True,
            transcript=True
        )
        
        for space in result.items:
            data = {
                "title": space.title,
                "host": space.host.username,
                "listener_count": space.listener_count,
                "chat": [
                    {"author": m.author.username, "text": m.text}
                    for m in space.chat_messages
                ],
                "transcript": [
                    {"speaker": s.speaker, "text": s.text, "time": s.timestamp}
                    for s in space.transcripts
                ]
            }
            
            with open(f"space_{space.id}.json", "w") as f:
                json.dump(data, f, indent=2)

asyncio.run(main())
```

## See Also

- [User Model](../models/user.md) - User data structure
- [MediaDownloader](downloads.md) - Media downloading
- [SearchScraper](search.md) - Search functionality
