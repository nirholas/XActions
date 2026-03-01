"""
Twitter Spaces scraper and audio/transcript capture.

Supports:
- Live audio capture from running Spaces
- Live transcript capture
- Chat/message log extraction
- Space metadata and search (Upcoming, Top, Live)
"""

from __future__ import annotations

import asyncio
import json
import re
import time
from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum
from pathlib import Path
from typing import Any, AsyncGenerator

import aiofiles
import httpx
from loguru import logger

from xeepy.core.browser import BrowserManager
from xeepy.core.rate_limiter import RateLimiter
from xeepy.scrapers.base import BaseScraper, ScrapeResult


class SpaceCategory(Enum):
    """Space search categories."""
    LIVE = "Live"
    UPCOMING = "Upcoming"
    TOP = "Top"
    RECORDED = "Recorded"


class SpaceState(Enum):
    """Space states."""
    NOT_STARTED = "NotStarted"
    PRE_PUBLISHED = "PrePublished"
    RUNNING = "Running"
    ENDED = "Ended"
    CANCELED = "Canceled"
    TIMED_OUT = "TimedOut"


@dataclass
class SpaceParticipant:
    """A participant in a Twitter Space."""
    user_id: str
    username: str
    display_name: str
    avatar_url: str = ""
    is_host: bool = False
    is_speaker: bool = False
    is_admin: bool = False
    joined_at: datetime | None = None
    
    def to_dict(self) -> dict[str, Any]:
        return {
            "user_id": self.user_id,
            "username": self.username,
            "display_name": self.display_name,
            "avatar_url": self.avatar_url,
            "is_host": self.is_host,
            "is_speaker": self.is_speaker,
            "is_admin": self.is_admin,
            "joined_at": self.joined_at.isoformat() if self.joined_at else None,
        }


@dataclass
class SpaceChatMessage:
    """A chat message from a Space."""
    id: str
    user_id: str
    username: str
    display_name: str
    text: str
    timestamp: datetime
    
    def to_dict(self) -> dict[str, Any]:
        return {
            "id": self.id,
            "user_id": self.user_id,
            "username": self.username,
            "display_name": self.display_name,
            "text": self.text,
            "timestamp": self.timestamp.isoformat(),
        }


@dataclass
class SpaceTranscript:
    """Transcript segment from a Space."""
    speaker_id: str
    speaker_username: str
    text: str
    start_time: float  # seconds from start
    end_time: float
    confidence: float = 1.0
    
    def to_dict(self) -> dict[str, Any]:
        return {
            "speaker_id": self.speaker_id,
            "speaker_username": self.speaker_username,
            "text": self.text,
            "start_time": self.start_time,
            "end_time": self.end_time,
            "confidence": self.confidence,
        }


@dataclass
class Space:
    """
    Represents a Twitter Space.
    
    Attributes:
        id: Unique Space ID (rest_id)
        media_key: Media key for audio stream
        title: Space title
        state: Current state (Running, Ended, etc.)
        created_at: When the Space was created
        started_at: When the Space started
        ended_at: When the Space ended
        scheduled_start: Scheduled start time (for upcoming)
        host: Host user information
        participants: List of participants
        listener_count: Number of listeners
        replay_count: Number of replays
        is_ticketed: Whether this is a ticketed Space
        chat_messages: Chat/reaction messages
        transcripts: Transcribed speech segments
        audio_url: URL to audio stream
    """
    
    id: str
    media_key: str = ""
    title: str = ""
    state: SpaceState = SpaceState.NOT_STARTED
    created_at: datetime | None = None
    started_at: datetime | None = None
    ended_at: datetime | None = None
    scheduled_start: datetime | None = None
    
    # Host and participants
    host: SpaceParticipant | None = None
    co_hosts: list[SpaceParticipant] = field(default_factory=list)
    speakers: list[SpaceParticipant] = field(default_factory=list)
    listeners: list[SpaceParticipant] = field(default_factory=list)
    
    # Stats
    listener_count: int = 0
    replay_count: int = 0
    participant_count: int = 0
    
    # Features
    is_ticketed: bool = False
    is_locked: bool = False
    is_recording: bool = False
    has_replay: bool = False
    
    # Content
    chat_messages: list[SpaceChatMessage] = field(default_factory=list)
    transcripts: list[SpaceTranscript] = field(default_factory=list)
    
    # Audio
    audio_url: str = ""
    audio_file: str = ""
    
    # Metadata
    url: str = ""
    raw_data: dict[str, Any] = field(default_factory=dict)
    
    def to_dict(self) -> dict[str, Any]:
        return {
            "id": self.id,
            "media_key": self.media_key,
            "title": self.title,
            "state": self.state.value if self.state else None,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "started_at": self.started_at.isoformat() if self.started_at else None,
            "ended_at": self.ended_at.isoformat() if self.ended_at else None,
            "scheduled_start": self.scheduled_start.isoformat() if self.scheduled_start else None,
            "host": self.host.to_dict() if self.host else None,
            "co_hosts": [c.to_dict() for c in self.co_hosts],
            "speakers": [s.to_dict() for s in self.speakers],
            "listener_count": self.listener_count,
            "replay_count": self.replay_count,
            "participant_count": self.participant_count,
            "is_ticketed": self.is_ticketed,
            "is_locked": self.is_locked,
            "is_recording": self.is_recording,
            "has_replay": self.has_replay,
            "chat_messages": [m.to_dict() for m in self.chat_messages],
            "transcripts": [t.to_dict() for t in self.transcripts],
            "audio_url": self.audio_url,
            "audio_file": self.audio_file,
            "url": self.url,
        }


class SpacesScraper(BaseScraper):
    """
    Scraper for Twitter Spaces.
    
    Supports live audio capture, transcript extraction, and chat logs.
    """
    
    # GraphQL endpoints
    SPACE_BY_ID = "https://twitter.com/i/api/graphql/xRXYjcPY9kq1VxZoLnvX2w/AudioSpaceById"
    SPACE_SEARCH = "https://twitter.com/i/api/graphql/BV2ZL4foHvHh3-L8cd4FiA/AudioSpaceSearch"
    SPACE_STREAM = "https://twitter.com/i/api/1.1/live_video_stream/status/{media_key}"
    
    def __init__(
        self,
        browser_manager: BrowserManager,
        rate_limiter: RateLimiter | None = None,
    ):
        super().__init__(browser_manager, rate_limiter)
        self._http_client: httpx.AsyncClient | None = None
    
    async def _get_http_client(self) -> httpx.AsyncClient:
        """Get or create HTTP client with auth cookies."""
        if self._http_client is None:
            # Get cookies from browser
            cookies = {}
            if self.browser_manager._context:
                browser_cookies = await self.browser_manager._context.cookies()
                for c in browser_cookies:
                    if c["domain"] in [".twitter.com", ".x.com", "twitter.com", "x.com"]:
                        cookies[c["name"]] = c["value"]
            
            self._http_client = httpx.AsyncClient(
                cookies=cookies,
                headers={
                    "Authorization": "Bearer AAAAAAAAAAAAAAAAAAAAANRILgAAAAAAnNwIzUejRCOuH5E6I8xnZz4puTs%3D1Zv7ttfk8LF81IUq16cHjhLTvJu4FA33AGWWjCpTnA",
                    "x-twitter-active-user": "yes",
                    "x-twitter-auth-type": "OAuth2Session",
                },
                timeout=30.0,
            )
        return self._http_client
    
    async def scrape(
        self,
        room_ids: list[str] | None = None,
        search: list[dict] | None = None,
        audio: bool = False,
        chat: bool = False,
        transcript: bool = False,
        output_dir: str = "spaces",
        **kwargs,
    ) -> ScrapeResult[Space]:
        """
        Scrape Twitter Spaces.
        
        Args:
            room_ids: List of Space IDs to fetch
            search: List of search queries with filters
                   [{"query": "crypto", "filter": SpaceCategory.LIVE}]
            audio: Whether to capture live audio
            chat: Whether to capture chat messages
            transcript: Whether to capture transcripts
            output_dir: Directory for audio files
            
        Returns:
            ScrapeResult containing Space objects
        """
        result = ScrapeResult[Space](target="spaces")
        
        try:
            spaces = []
            
            # Fetch by room IDs
            if room_ids:
                for room_id in room_ids:
                    await self.rate_limiter.wait()
                    space = await self._get_space_by_id(room_id)
                    if space:
                        spaces.append(space)
            
            # Search for spaces
            if search:
                for search_query in search:
                    await self.rate_limiter.wait()
                    query = search_query.get("query", "")
                    category = search_query.get("filter", SpaceCategory.LIVE)
                    found = await self._search_spaces(query, category)
                    spaces.extend(found)
            
            # Capture additional data
            for space in spaces:
                if space.state == SpaceState.RUNNING:
                    if audio:
                        await self._capture_audio(space, output_dir)
                    if chat:
                        await self._capture_chat(space)
                    if transcript:
                        await self._capture_transcript(space)
            
            result.items = spaces
            result.total_found = len(spaces)
            result.completed_at = datetime.now()
            
        except Exception as e:
            logger.error(f"Space scraping error: {e}")
            result.error = str(e)
            result.completed_at = datetime.now()
        
        return result
    
    async def _get_space_by_id(self, room_id: str) -> Space | None:
        """Fetch Space metadata by ID."""
        try:
            page = await self.browser_manager.get_page()
            
            # Navigate to Space URL
            space_url = f"https://twitter.com/i/spaces/{room_id}"
            await page.goto(space_url, wait_until="networkidle")
            await asyncio.sleep(2)
            
            # Extract Space data from page
            space_data = await page.evaluate("""
                () => {
                    const scripts = document.querySelectorAll('script');
                    for (const script of scripts) {
                        if (script.textContent.includes('AudioSpaceById')) {
                            try {
                                const match = script.textContent.match(/AudioSpaceById.*?({.*?})/s);
                                if (match) return JSON.parse(match[1]);
                            } catch {}
                        }
                    }
                    
                    // Try extracting from window state
                    if (window.__INITIAL_STATE__) {
                        return window.__INITIAL_STATE__;
                    }
                    
                    return null;
                }
            """)
            
            # Parse Space metadata from page content
            title_el = await page.query_selector('[data-testid="audioSpaceTitle"]')
            title = await title_el.inner_text() if title_el else ""
            
            # Get listener count
            listeners_el = await page.query_selector('[data-testid="participantCount"]')
            listener_count = 0
            if listeners_el:
                text = await listeners_el.inner_text()
                match = re.search(r'(\d+)', text.replace(',', ''))
                if match:
                    listener_count = int(match.group(1))
            
            # Determine state
            state = SpaceState.NOT_STARTED
            live_indicator = await page.query_selector('[data-testid="liveIndicator"]')
            if live_indicator:
                state = SpaceState.RUNNING
            
            space = Space(
                id=room_id,
                title=title,
                state=state,
                listener_count=listener_count,
                url=space_url,
            )
            
            # Extract host info
            host_el = await page.query_selector('[data-testid="audioSpaceHost"]')
            if host_el:
                host_name = await host_el.inner_text()
                space.host = SpaceParticipant(
                    user_id="",
                    username=host_name,
                    display_name=host_name,
                    is_host=True,
                )
            
            logger.info(f"Fetched Space: {space.title} ({space.id})")
            return space
            
        except Exception as e:
            logger.error(f"Error fetching Space {room_id}: {e}")
            return None
    
    async def _search_spaces(
        self,
        query: str,
        category: SpaceCategory = SpaceCategory.LIVE,
        limit: int = 20,
    ) -> list[Space]:
        """Search for Spaces by query and category."""
        spaces = []
        
        try:
            page = await self.browser_manager.get_page()
            
            # Build search URL based on category
            if category == SpaceCategory.LIVE:
                search_url = f"https://twitter.com/search?q={query}&f=live&src=typed_query"
            elif category == SpaceCategory.UPCOMING:
                search_url = f"https://twitter.com/i/spaces?q={query}&state=scheduled"
            else:
                search_url = f"https://twitter.com/search?q={query}&src=typed_query"
            
            await page.goto(search_url, wait_until="networkidle")
            await asyncio.sleep(2)
            
            # Find Space cards
            space_cards = await page.query_selector_all('[data-testid="audioSpaceCard"]')
            
            for card in space_cards[:limit]:
                try:
                    # Extract Space ID from card link
                    link = await card.query_selector('a[href*="/spaces/"]')
                    if link:
                        href = await link.get_attribute("href")
                        match = re.search(r'/spaces/(\w+)', href)
                        if match:
                            space_id = match.group(1)
                            
                            # Get basic info from card
                            title_el = await card.query_selector('[data-testid="audioSpaceTitle"]')
                            title = await title_el.inner_text() if title_el else ""
                            
                            space = Space(
                                id=space_id,
                                title=title,
                                state=SpaceState.RUNNING if category == SpaceCategory.LIVE else SpaceState.NOT_STARTED,
                                url=f"https://twitter.com/i/spaces/{space_id}",
                            )
                            spaces.append(space)
                            
                except Exception as e:
                    logger.warning(f"Error parsing Space card: {e}")
                    continue
            
            logger.info(f"Found {len(spaces)} Spaces for query '{query}'")
            
        except Exception as e:
            logger.error(f"Error searching Spaces: {e}")
        
        return spaces
    
    async def _capture_audio(
        self,
        space: Space,
        output_dir: str = "spaces",
    ) -> None:
        """
        Capture live audio from a running Space.
        
        Uses HLS stream to download audio chunks.
        """
        if space.state != SpaceState.RUNNING:
            logger.warning(f"Space {space.id} is not running, cannot capture audio")
            return
        
        try:
            # Create output directory
            output_path = Path(output_dir)
            output_path.mkdir(parents=True, exist_ok=True)
            
            page = await self.browser_manager.get_page()
            
            # Get stream info by intercepting network requests
            stream_url = None
            
            async def handle_response(response):
                nonlocal stream_url
                if "live_video_stream" in response.url or "playlist" in response.url:
                    if response.url.endswith(".m3u8"):
                        stream_url = response.url
            
            page.on("response", handle_response)
            
            # Navigate to Space to trigger stream
            await page.goto(space.url, wait_until="networkidle")
            await asyncio.sleep(5)
            
            if stream_url:
                logger.info(f"Found stream URL for Space {space.id}")
                
                # Download audio using ffmpeg or direct download
                output_file = output_path / f"{space.id}_{int(time.time())}.aac"
                space.audio_url = stream_url
                space.audio_file = str(output_file)
                
                # Note: Full audio capture would require ffmpeg integration
                # This provides the stream URL for external processing
                logger.info(f"Audio stream URL captured: {stream_url}")
                logger.info(f"Use ffmpeg to capture: ffmpeg -i '{stream_url}' -c copy '{output_file}'")
            else:
                logger.warning(f"Could not find stream URL for Space {space.id}")
                
        except Exception as e:
            logger.error(f"Error capturing audio for Space {space.id}: {e}")
    
    async def _capture_chat(self, space: Space) -> None:
        """Capture chat messages from a Space."""
        if space.state != SpaceState.RUNNING:
            return
        
        try:
            page = await self.browser_manager.get_page()
            
            # Chat messages are in a specific container
            chat_container = await page.query_selector('[data-testid="spaceChatContainer"]')
            if not chat_container:
                logger.info(f"No chat container found for Space {space.id}")
                return
            
            # Extract existing messages
            messages = await chat_container.query_selector_all('[data-testid="chatMessage"]')
            
            for msg in messages:
                try:
                    user_el = await msg.query_selector('[data-testid="chatUser"]')
                    text_el = await msg.query_selector('[data-testid="chatText"]')
                    
                    if user_el and text_el:
                        username = await user_el.inner_text()
                        text = await text_el.inner_text()
                        
                        chat_msg = SpaceChatMessage(
                            id=str(len(space.chat_messages)),
                            user_id="",
                            username=username,
                            display_name=username,
                            text=text,
                            timestamp=datetime.now(),
                        )
                        space.chat_messages.append(chat_msg)
                        
                except Exception as e:
                    continue
            
            logger.info(f"Captured {len(space.chat_messages)} chat messages from Space {space.id}")
            
        except Exception as e:
            logger.error(f"Error capturing chat for Space {space.id}: {e}")
    
    async def _capture_transcript(self, space: Space) -> None:
        """
        Capture live transcript from a Space.
        
        Twitter Spaces provide live captions for some Spaces.
        """
        if space.state != SpaceState.RUNNING:
            return
        
        try:
            page = await self.browser_manager.get_page()
            
            # Look for caption/transcript elements
            caption_container = await page.query_selector('[data-testid="captionContainer"]')
            if not caption_container:
                logger.info(f"No captions available for Space {space.id}")
                return
            
            # Extract caption text
            captions = await caption_container.query_selector_all('[data-testid="captionText"]')
            
            for caption in captions:
                try:
                    text = await caption.inner_text()
                    if text.strip():
                        transcript = SpaceTranscript(
                            speaker_id="",
                            speaker_username="",
                            text=text.strip(),
                            start_time=0,
                            end_time=0,
                        )
                        space.transcripts.append(transcript)
                        
                except Exception as e:
                    continue
            
            logger.info(f"Captured {len(space.transcripts)} transcript segments from Space {space.id}")
            
        except Exception as e:
            logger.error(f"Error capturing transcript for Space {space.id}: {e}")
    
    async def live_audio_capture(
        self,
        room_id: str,
        output_file: str,
        duration: int | None = None,
    ) -> str:
        """
        Capture live audio from a Space to a file.
        
        Args:
            room_id: Space ID
            output_file: Output file path
            duration: Maximum capture duration in seconds (None for unlimited)
            
        Returns:
            Path to the captured audio file
        """
        import subprocess
        
        space = await self._get_space_by_id(room_id)
        if not space or space.state != SpaceState.RUNNING:
            raise ValueError(f"Space {room_id} is not running")
        
        if not space.audio_url:
            await self._capture_audio(space, str(Path(output_file).parent))
        
        if not space.audio_url:
            raise ValueError(f"Could not get audio stream for Space {room_id}")
        
        # Use ffmpeg to capture audio
        cmd = ["ffmpeg", "-i", space.audio_url, "-c", "copy"]
        
        if duration:
            cmd.extend(["-t", str(duration)])
        
        cmd.append(output_file)
        
        logger.info(f"Starting audio capture for Space {room_id}")
        process = subprocess.Popen(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
        
        if duration:
            process.wait()
        else:
            logger.info(f"Audio capture running in background. Output: {output_file}")
            logger.info("Press Ctrl+C to stop capture")
        
        return output_file
    
    async def close(self) -> None:
        """Close HTTP client."""
        if self._http_client:
            await self._http_client.aclose()
            self._http_client = None


# Convenience functions
async def get_space(room_id: str, browser_manager: BrowserManager) -> Space | None:
    """Get a single Space by ID."""
    scraper = SpacesScraper(browser_manager)
    result = await scraper.scrape(room_ids=[room_id])
    return result.items[0] if result.items else None


async def search_spaces(
    query: str,
    category: SpaceCategory = SpaceCategory.LIVE,
    browser_manager: BrowserManager = None,
) -> list[Space]:
    """Search for Spaces."""
    scraper = SpacesScraper(browser_manager)
    result = await scraper.scrape(search=[{"query": query, "filter": category}])
    return result.items
