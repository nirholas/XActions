# Advanced Content Scheduling System

Build a sophisticated content scheduling system with multi-queue management, timezone awareness, and intelligent resharing.

---

## Overview

This recipe creates an advanced scheduling system with:

- **Multi-queue management** - Organize content by type
- **Timezone awareness** - Post at optimal times globally
- **Evergreen rotation** - Auto-reshare top content
- **Calendar integration** - Sync with external calendars
- **Holiday awareness** - Adjust for events
- **Multi-account support** - Coordinate across accounts

---

## System Architecture

```
┌─────────────────┐     ┌──────────────┐     ┌─────────────────┐
│  Content        │────▶│  Queue       │────▶│  Scheduler      │
│  Queue          │     │  Manager     │     │  Engine         │
└─────────────────┘     └──────────────┘     └─────────────────┘
        │                       │                     │
        ▼                       ▼                     ▼
┌─────────────────┐     ┌──────────────┐     ┌─────────────────┐
│  Evergreen      │     │  Holiday     │     │  Publisher      │
│  Rotator        │     │  Detector    │     │  (Xeepy)        │
└─────────────────┘     └──────────────┘     └─────────────────┘
```

---

## Data Models

```python
# scheduler_models.py
from dataclasses import dataclass, field
from datetime import datetime
from typing import Optional
from enum import Enum
import uuid

class ContentType(Enum):
    REGULAR = "regular"
    THREAD = "thread"
    POLL = "poll"
    EVERGREEN = "evergreen"
    PROMOTIONAL = "promotional"
    ENGAGEMENT = "engagement"

class PostStatus(Enum):
    DRAFT = "draft"
    SCHEDULED = "scheduled"
    PUBLISHED = "published"
    FAILED = "failed"

@dataclass
class ScheduledPost:
    id: str = field(default_factory=lambda: str(uuid.uuid4())[:8])
    content: str = ""
    content_type: ContentType = ContentType.REGULAR
    media_paths: list[str] = field(default_factory=list)
    
    # Scheduling
    scheduled_time: Optional[datetime] = None
    timezone: str = "UTC"
    
    # Thread support
    is_thread: bool = False
    thread_tweets: list[str] = field(default_factory=list)
    
    # Poll support
    poll_options: list[str] = field(default_factory=list)
    poll_duration_hours: int = 24
    
    # Targeting
    target_accounts: list[str] = field(default_factory=list)
    
    # Metadata
    status: PostStatus = PostStatus.DRAFT
    created_at: datetime = field(default_factory=datetime.now)
    published_at: Optional[datetime] = None
    tweet_id: Optional[str] = None
    
    # Evergreen settings
    is_evergreen: bool = False
    min_days_between_posts: int = 30
    last_posted: Optional[datetime] = None
    times_posted: int = 0
    
    # Performance
    engagement_score: float = 0.0

@dataclass
class ContentQueue:
    name: str
    content_types: list[ContentType]
    posts_per_day: int = 3
    optimal_hours: list[int] = field(default_factory=lambda: [9, 12, 17])
    timezone: str = "UTC"
    is_active: bool = True
```

---

## Queue Manager

```python
# queue_manager.py
from datetime import datetime, timedelta
from typing import Optional
import json

from scheduler_models import ScheduledPost, ContentQueue, ContentType, PostStatus

class QueueManager:
    """Manage multiple content queues."""
    
    def __init__(self):
        self.queues: dict[str, ContentQueue] = {}
        self.posts: dict[str, ScheduledPost] = {}
    
    def create_queue(
        self,
        name: str,
        content_types: list[ContentType],
        posts_per_day: int = 3,
        optimal_hours: list[int] = None,
        timezone: str = "UTC"
    ) -> ContentQueue:
        """Create a new content queue."""
        
        queue = ContentQueue(
            name=name,
            content_types=content_types,
            posts_per_day=posts_per_day,
            optimal_hours=optimal_hours or [9, 12, 17],
            timezone=timezone
        )
        
        self.queues[name] = queue
        return queue
    
    def add_post(
        self,
        queue_name: str,
        post: ScheduledPost
    ) -> ScheduledPost:
        """Add post to queue."""
        
        if queue_name not in self.queues:
            raise ValueError(f"Queue '{queue_name}' not found")
        
        # Assign to next available slot if not scheduled
        if post.scheduled_time is None:
            post.scheduled_time = self._get_next_slot(queue_name)
        
        post.status = PostStatus.SCHEDULED
        self.posts[post.id] = post
        
        return post
    
    def _get_next_slot(self, queue_name: str) -> datetime:
        """Get next available time slot for queue."""
        
        queue = self.queues[queue_name]
        
        # Get existing scheduled times for this queue
        scheduled_times = [
            p.scheduled_time for p in self.posts.values()
            if p.status == PostStatus.SCHEDULED
        ]
        
        # Start from now
        candidate = datetime.now().replace(minute=0, second=0, microsecond=0)
        
        # Find next optimal hour
        for _ in range(7 * 24):  # Search up to 1 week
            if candidate.hour in queue.optimal_hours:
                if candidate not in scheduled_times and candidate > datetime.now():
                    return candidate
            
            candidate += timedelta(hours=1)
        
        return candidate
    
    def get_pending_posts(
        self,
        queue_name: str = None,
        hours_ahead: int = 24
    ) -> list[ScheduledPost]:
        """Get posts scheduled in the next N hours."""
        
        cutoff = datetime.now() + timedelta(hours=hours_ahead)
        
        pending = [
            p for p in self.posts.values()
            if p.status == PostStatus.SCHEDULED
            and p.scheduled_time
            and p.scheduled_time <= cutoff
        ]
        
        if queue_name:
            queue = self.queues.get(queue_name)
            if queue:
                pending = [
                    p for p in pending
                    if p.content_type in queue.content_types
                ]
        
        return sorted(pending, key=lambda p: p.scheduled_time)
    
    def reschedule_post(
        self,
        post_id: str,
        new_time: datetime
    ):
        """Reschedule a post."""
        
        if post_id not in self.posts:
            raise ValueError(f"Post '{post_id}' not found")
        
        post = self.posts[post_id]
        post.scheduled_time = new_time
    
    def mark_published(
        self,
        post_id: str,
        tweet_id: str
    ):
        """Mark post as published."""
        
        if post_id in self.posts:
            post = self.posts[post_id]
            post.status = PostStatus.PUBLISHED
            post.published_at = datetime.now()
            post.tweet_id = tweet_id
    
    def save(self, filepath: str):
        """Save queues and posts to JSON."""
        
        data = {
            'queues': {
                name: {
                    'name': q.name,
                    'content_types': [ct.value for ct in q.content_types],
                    'posts_per_day': q.posts_per_day,
                    'optimal_hours': q.optimal_hours,
                    'timezone': q.timezone,
                    'is_active': q.is_active
                }
                for name, q in self.queues.items()
            },
            'posts': {
                pid: {
                    'id': p.id,
                    'content': p.content,
                    'content_type': p.content_type.value,
                    'scheduled_time': p.scheduled_time.isoformat() if p.scheduled_time else None,
                    'status': p.status.value,
                    'is_evergreen': p.is_evergreen,
                    'times_posted': p.times_posted
                }
                for pid, p in self.posts.items()
            }
        }
        
        with open(filepath, 'w') as f:
            json.dump(data, f, indent=2)
    
    def load(self, filepath: str):
        """Load queues and posts from JSON."""
        
        with open(filepath) as f:
            data = json.load(f)
        
        # Load queues
        for name, qdata in data.get('queues', {}).items():
            self.queues[name] = ContentQueue(
                name=qdata['name'],
                content_types=[ContentType(ct) for ct in qdata['content_types']],
                posts_per_day=qdata['posts_per_day'],
                optimal_hours=qdata['optimal_hours'],
                timezone=qdata['timezone'],
                is_active=qdata['is_active']
            )
        
        # Load posts
        for pid, pdata in data.get('posts', {}).items():
            self.posts[pid] = ScheduledPost(
                id=pdata['id'],
                content=pdata['content'],
                content_type=ContentType(pdata['content_type']),
                scheduled_time=datetime.fromisoformat(pdata['scheduled_time']) if pdata['scheduled_time'] else None,
                status=PostStatus(pdata['status']),
                is_evergreen=pdata.get('is_evergreen', False),
                times_posted=pdata.get('times_posted', 0)
            )
```

---

## Evergreen Content Rotator

```python
# evergreen_rotator.py
from datetime import datetime, timedelta
from typing import Optional
import random

from scheduler_models import ScheduledPost, ContentType, PostStatus

class EvergreenRotator:
    """Manage evergreen content rotation."""
    
    def __init__(self, queue_manager: 'QueueManager'):
        self.manager = queue_manager
        self.evergreen_pool: list[ScheduledPost] = []
    
    def add_to_pool(self, post: ScheduledPost):
        """Add post to evergreen pool."""
        post.is_evergreen = True
        post.content_type = ContentType.EVERGREEN
        self.evergreen_pool.append(post)
    
    def get_eligible_posts(
        self,
        min_days_since_last: int = 30
    ) -> list[ScheduledPost]:
        """Get posts eligible for reposting."""
        
        cutoff = datetime.now() - timedelta(days=min_days_since_last)
        
        eligible = []
        for post in self.evergreen_pool:
            if post.last_posted is None or post.last_posted < cutoff:
                eligible.append(post)
        
        return eligible
    
    def select_next_evergreen(
        self,
        eligible: list[ScheduledPost] = None
    ) -> Optional[ScheduledPost]:
        """Select next evergreen post to schedule."""
        
        if eligible is None:
            eligible = self.get_eligible_posts()
        
        if not eligible:
            return None
        
        # Weight by engagement score and time since last post
        weighted = []
        for post in eligible:
            days_since = 30  # Default if never posted
            if post.last_posted:
                days_since = (datetime.now() - post.last_posted).days
            
            # Higher engagement + longer time = higher weight
            weight = (post.engagement_score + 1) * (days_since / 30)
            weighted.append((post, weight))
        
        # Weighted random selection
        total_weight = sum(w for _, w in weighted)
        if total_weight == 0:
            return random.choice(eligible)
        
        r = random.uniform(0, total_weight)
        cumulative = 0
        for post, weight in weighted:
            cumulative += weight
            if r <= cumulative:
                return post
        
        return weighted[-1][0]
    
    def schedule_evergreen_batch(
        self,
        queue_name: str,
        count: int = 5
    ) -> list[ScheduledPost]:
        """Schedule batch of evergreen posts."""
        
        scheduled = []
        eligible = self.get_eligible_posts()
        
        for _ in range(min(count, len(eligible))):
            post = self.select_next_evergreen(eligible)
            if post:
                # Create copy for scheduling
                new_post = ScheduledPost(
                    content=post.content,
                    content_type=ContentType.EVERGREEN,
                    media_paths=post.media_paths.copy(),
                    is_evergreen=True
                )
                
                self.manager.add_post(queue_name, new_post)
                scheduled.append(new_post)
                
                # Update original post tracking
                post.last_posted = new_post.scheduled_time
                post.times_posted += 1
                
                # Remove from eligible
                eligible.remove(post)
        
        return scheduled
    
    def update_engagement_scores(self, performance_data: dict[str, float]):
        """Update engagement scores from performance data."""
        
        for post in self.evergreen_pool:
            if post.tweet_id and post.tweet_id in performance_data:
                # Weighted average with existing score
                new_score = performance_data[post.tweet_id]
                post.engagement_score = (
                    post.engagement_score * 0.7 + 
                    new_score * 0.3
                )
```

---

## Holiday Detector

```python
# holiday_detector.py
from datetime import datetime, date
from dataclasses import dataclass

@dataclass
class Holiday:
    name: str
    date: date
    adjust_posting: bool = True  # Should adjust posting schedule
    suggested_content: str = ""

class HolidayDetector:
    """Detect holidays and special events."""
    
    # Major holidays (add more as needed)
    HOLIDAYS = {
        (1, 1): Holiday("New Year's Day", date(2024, 1, 1), True, "New year, new goals!"),
        (2, 14): Holiday("Valentine's Day", date(2024, 2, 14), True, "Spread the love"),
        (7, 4): Holiday("Independence Day (US)", date(2024, 7, 4), True, ""),
        (10, 31): Holiday("Halloween", date(2024, 10, 31), True, "Spooky content!"),
        (11, 28): Holiday("Thanksgiving (US)", date(2024, 11, 28), True, "Gratitude posts"),
        (12, 25): Holiday("Christmas", date(2024, 12, 25), True, "Holiday content"),
        (12, 31): Holiday("New Year's Eve", date(2024, 12, 31), True, "Year in review"),
    }
    
    # Tech/industry events
    EVENTS = {
        (3, 14): "Pi Day - Math/tech content",
        (5, 4): "Star Wars Day - Pop culture",
        (9, 13): "Programmer's Day - Dev content",
    }
    
    def get_holiday(self, check_date: date = None) -> Holiday:
        """Check if date is a holiday."""
        
        if check_date is None:
            check_date = date.today()
        
        key = (check_date.month, check_date.day)
        return self.HOLIDAYS.get(key)
    
    def get_upcoming_holidays(
        self,
        days_ahead: int = 30
    ) -> list[tuple[date, Holiday]]:
        """Get holidays in the next N days."""
        
        today = date.today()
        upcoming = []
        
        for (month, day), holiday in self.HOLIDAYS.items():
            try:
                holiday_date = date(today.year, month, day)
                
                # Handle year boundary
                if holiday_date < today:
                    holiday_date = date(today.year + 1, month, day)
                
                days_until = (holiday_date - today).days
                
                if 0 <= days_until <= days_ahead:
                    upcoming.append((holiday_date, holiday))
            
            except ValueError:
                continue
        
        return sorted(upcoming, key=lambda x: x[0])
    
    def should_adjust_schedule(self, check_date: date = None) -> tuple[bool, str]:
        """Check if schedule should be adjusted for date."""
        
        holiday = self.get_holiday(check_date)
        
        if holiday and holiday.adjust_posting:
            return True, f"Holiday: {holiday.name}"
        
        # Check for day before major holidays
        tomorrow = (check_date or date.today()) + timedelta(days=1)
        tomorrow_holiday = self.get_holiday(tomorrow)
        
        if tomorrow_holiday and tomorrow_holiday.adjust_posting:
            return True, f"Day before {tomorrow_holiday.name}"
        
        return False, ""
    
    def get_content_suggestions(
        self,
        days_ahead: int = 7
    ) -> list[dict]:
        """Get content suggestions for upcoming holidays."""
        
        suggestions = []
        upcoming = self.get_upcoming_holidays(days_ahead)
        
        for holiday_date, holiday in upcoming:
            if holiday.suggested_content:
                suggestions.append({
                    'date': holiday_date,
                    'holiday': holiday.name,
                    'suggestion': holiday.suggested_content,
                    'days_until': (holiday_date - date.today()).days
                })
        
        return suggestions
```

---

## Scheduler Engine

```python
# scheduler_engine.py
import asyncio
from datetime import datetime, timedelta
from typing import Optional

from xeepy import Xeepy

from scheduler_models import ScheduledPost, PostStatus
from queue_manager import QueueManager

class SchedulerEngine:
    """Execute scheduled posts."""
    
    def __init__(self, queue_manager: QueueManager):
        self.manager = queue_manager
        self.is_running = False
    
    async def publish_post(self, post: ScheduledPost) -> Optional[str]:
        """Publish a scheduled post."""
        
        async with Xeepy() as x:
            try:
                # Handle different content types
                if post.is_thread and post.thread_tweets:
                    # Post thread
                    tweet_ids = await x.engage.post_thread(
                        [post.content] + post.thread_tweets,
                        media=post.media_paths[:1] if post.media_paths else None
                    )
                    tweet_id = tweet_ids[0] if tweet_ids else None
                
                elif post.poll_options:
                    # Post poll
                    tweet_id = await x.poll.create(
                        post.content,
                        post.poll_options,
                        duration_minutes=post.poll_duration_hours * 60
                    )
                
                else:
                    # Regular post
                    tweet_id = await x.engage.tweet(
                        post.content,
                        media=post.media_paths if post.media_paths else None
                    )
                
                return tweet_id
            
            except Exception as e:
                print(f"Failed to publish post {post.id}: {e}")
                return None
    
    async def run_scheduler(self, check_interval: int = 60):
        """Run continuous scheduler."""
        
        self.is_running = True
        print("📅 Scheduler started")
        
        while self.is_running:
            try:
                # Get posts due in next minute
                pending = self.manager.get_pending_posts(hours_ahead=0.02)
                
                for post in pending:
                    if post.scheduled_time <= datetime.now():
                        print(f"Publishing: {post.content[:50]}...")
                        
                        tweet_id = await self.publish_post(post)
                        
                        if tweet_id:
                            self.manager.mark_published(post.id, tweet_id)
                            print(f"✓ Published: {tweet_id}")
                        else:
                            post.status = PostStatus.FAILED
                            print(f"✗ Failed to publish")
                
            except Exception as e:
                print(f"Scheduler error: {e}")
            
            await asyncio.sleep(check_interval)
    
    def stop(self):
        """Stop the scheduler."""
        self.is_running = False
```

---

## Usage Example

```python
# main.py
import asyncio
from datetime import datetime, timedelta

from scheduler_models import ScheduledPost, ContentType
from queue_manager import QueueManager
from evergreen_rotator import EvergreenRotator
from holiday_detector import HolidayDetector
from scheduler_engine import SchedulerEngine

async def main():
    # Initialize
    manager = QueueManager()
    
    # Create queues
    manager.create_queue(
        name="main",
        content_types=[ContentType.REGULAR, ContentType.THREAD],
        posts_per_day=3,
        optimal_hours=[9, 13, 18],
        timezone="America/New_York"
    )
    
    manager.create_queue(
        name="engagement",
        content_types=[ContentType.ENGAGEMENT],
        posts_per_day=2,
        optimal_hours=[10, 15],
        timezone="America/New_York"
    )
    
    # Add posts
    post1 = ScheduledPost(
        content="Just shipped a new feature! 🚀 Thread below 👇",
        content_type=ContentType.THREAD,
        is_thread=True,
        thread_tweets=[
            "1/ The problem we were solving...",
            "2/ Our approach...",
            "3/ The results...",
        ]
    )
    manager.add_post("main", post1)
    
    # Add evergreen content
    rotator = EvergreenRotator(manager)
    
    evergreen = ScheduledPost(
        content="10 Python tips every developer should know 🐍\n\nA thread:",
        engagement_score=150.0
    )
    rotator.add_to_pool(evergreen)
    
    # Schedule evergreen batch
    rotator.schedule_evergreen_batch("main", count=3)
    
    # Check holidays
    holiday_detector = HolidayDetector()
    upcoming = holiday_detector.get_upcoming_holidays(days_ahead=14)
    
    print("Upcoming holidays:")
    for hdate, holiday in upcoming:
        print(f"  {hdate}: {holiday.name}")
    
    # Get pending posts
    pending = manager.get_pending_posts(hours_ahead=48)
    
    print(f"\nScheduled posts ({len(pending)}):")
    for post in pending:
        print(f"  {post.scheduled_time}: {post.content[:40]}...")
    
    # Run scheduler
    engine = SchedulerEngine(manager)
    # await engine.run_scheduler()  # Uncomment to run

if __name__ == "__main__":
    asyncio.run(main())
```

---

## Best Practices

!!! tip "Queue Organization"
    - Separate promotional from value content
    - Balance evergreen with timely content
    - Leave slots for reactive posts

!!! warning "Timing"
    - Respect timezone differences
    - Avoid posting during major events
    - Monitor engagement by time slot

---

## Related Recipes

- [Content Calendar](content-calendar.md) - AI-powered planning
- [Optimal Timing](../growth/optimal-timing.md) - ML-based scheduling
- [Hashtag Strategy](../growth/hashtag-strategy.md) - Optimize reach
