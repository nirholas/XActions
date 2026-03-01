# Smart Engagement Pod System

Build a fair and intelligent engagement pod system with reciprocity tracking and anti-detection measures.

---

## Overview

!!! warning "Educational Purpose"
    This recipe is for **educational purposes only**. Engagement pods may violate platform terms of service. Use responsibly and understand the risks.

This recipe creates a smart engagement pod system with:

- **Member discovery** - Find compatible pod members
- **Reciprocity tracking** - Ensure fair participation
- **Fairness algorithms** - Balance engagement distribution
- **Anti-detection timing** - Natural engagement patterns
- **Performance analytics** - Track pod effectiveness
- **Health monitoring** - Identify inactive members

---

## System Architecture

```
┌─────────────────┐     ┌──────────────┐     ┌─────────────────┐
│  Pod            │────▶│  Reciprocity │────▶│  Engagement     │
│  Manager        │     │  Tracker     │     │  Queue          │
└─────────────────┘     └──────────────┘     └─────────────────┘
        │                       │                     │
        ▼                       ▼                     ▼
┌─────────────────┐     ┌──────────────┐     ┌─────────────────┐
│  Member         │     │  Fairness    │     │  Anti-Detection │
│  Discovery      │     │  Calculator  │     │  Scheduler      │
└─────────────────┘     └──────────────┘     └─────────────────┘
```

---

## Data Models

```python
# pod_models.py
from dataclasses import dataclass, field
from datetime import datetime
from typing import Optional
from enum import Enum

class EngagementType(Enum):
    LIKE = "like"
    RETWEET = "retweet"
    REPLY = "reply"
    QUOTE = "quote"

@dataclass
class PodMember:
    user_id: str
    username: str
    joined_at: datetime
    followers: int
    avg_engagement_rate: float
    timezone: str = "UTC"
    
    # Reciprocity metrics
    engagements_given: int = 0
    engagements_received: int = 0
    reciprocity_score: float = 1.0
    
    # Activity tracking
    last_active: Optional[datetime] = None
    consecutive_misses: int = 0
    is_active: bool = True
    
    # Performance
    avg_response_time_minutes: float = 0.0
    quality_score: float = 1.0

@dataclass
class EngagementRequest:
    id: str
    tweet_id: str
    tweet_url: str
    author_id: str
    author_username: str
    requested_at: datetime
    engagement_types: list[EngagementType]
    priority: int = 1  # Higher = more urgent
    
    # Fulfillment tracking
    fulfilled_by: list[str] = field(default_factory=list)
    deadline: Optional[datetime] = None

@dataclass
class EngagementRecord:
    request_id: str
    member_id: str
    engagement_type: EngagementType
    completed_at: datetime
    response_time_minutes: float
```

---

## Pod Manager

```python
# pod_manager.py
import asyncio
import uuid
from datetime import datetime, timedelta
from typing import Optional

from xeepy import Xeepy

from pod_models import PodMember, EngagementRequest, EngagementType

class PodManager:
    """Manage engagement pod operations."""
    
    def __init__(self, pod_name: str, max_members: int = 20):
        self.pod_name = pod_name
        self.max_members = max_members
        self.members: dict[str, PodMember] = {}
        self.pending_requests: list[EngagementRequest] = []
        self.completed_requests: list[EngagementRequest] = []
    
    def add_member(self, member: PodMember) -> bool:
        """Add member to pod."""
        if len(self.members) >= self.max_members:
            return False
        
        if member.user_id in self.members:
            return False
        
        self.members[member.user_id] = member
        return True
    
    def remove_member(self, user_id: str):
        """Remove member from pod."""
        if user_id in self.members:
            del self.members[user_id]
    
    def submit_request(
        self,
        tweet_id: str,
        tweet_url: str,
        author_id: str,
        engagement_types: list[EngagementType] = None,
        priority: int = 1
    ) -> EngagementRequest:
        """Submit engagement request to pod."""
        
        if author_id not in self.members:
            raise ValueError("Author must be a pod member")
        
        request = EngagementRequest(
            id=f"req_{uuid.uuid4().hex[:8]}",
            tweet_id=tweet_id,
            tweet_url=tweet_url,
            author_id=author_id,
            author_username=self.members[author_id].username,
            requested_at=datetime.now(),
            engagement_types=engagement_types or [EngagementType.LIKE],
            priority=priority,
            deadline=datetime.now() + timedelta(hours=24)
        )
        
        self.pending_requests.append(request)
        return request
    
    def get_queue_for_member(
        self, 
        member_id: str,
        limit: int = 10
    ) -> list[EngagementRequest]:
        """Get engagement queue for a specific member."""
        
        member = self.members.get(member_id)
        if not member:
            return []
        
        # Filter requests not from this member and not yet fulfilled by them
        eligible = [
            r for r in self.pending_requests
            if r.author_id != member_id and member_id not in r.fulfilled_by
        ]
        
        # Sort by priority and reciprocity
        def sort_key(req):
            author = self.members.get(req.author_id)
            author_reciprocity = author.reciprocity_score if author else 0
            return (req.priority, author_reciprocity, req.requested_at)
        
        eligible.sort(key=sort_key, reverse=True)
        
        return eligible[:limit]
    
    def record_engagement(
        self,
        request_id: str,
        member_id: str,
        engagement_type: EngagementType
    ):
        """Record completed engagement."""
        
        # Find request
        request = next(
            (r for r in self.pending_requests if r.id == request_id),
            None
        )
        
        if not request:
            return
        
        # Update request
        request.fulfilled_by.append(member_id)
        
        # Update member stats
        member = self.members.get(member_id)
        if member:
            member.engagements_given += 1
            member.last_active = datetime.now()
        
        author = self.members.get(request.author_id)
        if author:
            author.engagements_received += 1
        
        # Check if fully fulfilled
        if len(request.fulfilled_by) >= len(self.members) - 1:
            self.pending_requests.remove(request)
            self.completed_requests.append(request)
```

---

## Reciprocity Tracker

```python
# reciprocity_tracker.py
from datetime import datetime, timedelta
from collections import defaultdict

class ReciprocityTracker:
    """Track and enforce reciprocity in the pod."""
    
    def __init__(self, lookback_days: int = 7):
        self.lookback_days = lookback_days
        self.engagement_log: list[dict] = []
    
    def log_engagement(
        self,
        giver_id: str,
        receiver_id: str,
        engagement_type: str,
        timestamp: datetime = None
    ):
        """Log an engagement action."""
        self.engagement_log.append({
            'giver_id': giver_id,
            'receiver_id': receiver_id,
            'engagement_type': engagement_type,
            'timestamp': timestamp or datetime.now()
        })
    
    def calculate_reciprocity_scores(
        self,
        members: dict[str, 'PodMember']
    ) -> dict[str, float]:
        """Calculate reciprocity scores for all members."""
        
        cutoff = datetime.now() - timedelta(days=self.lookback_days)
        recent_logs = [l for l in self.engagement_log if l['timestamp'] > cutoff]
        
        # Count given and received
        given = defaultdict(int)
        received = defaultdict(int)
        
        for log in recent_logs:
            given[log['giver_id']] += 1
            received[log['receiver_id']] += 1
        
        # Calculate scores
        scores = {}
        for user_id in members:
            g = given.get(user_id, 0)
            r = received.get(user_id, 0)
            
            if r == 0:
                # Never received = perfect score (new member)
                scores[user_id] = 1.0
            elif g == 0:
                # Received but never gave = poor score
                scores[user_id] = 0.1
            else:
                # Ratio of given to received
                ratio = g / r
                # Score between 0.1 and 2.0
                scores[user_id] = min(2.0, max(0.1, ratio))
        
        return scores
    
    def get_debt_matrix(
        self,
        members: dict[str, 'PodMember']
    ) -> dict[str, dict[str, int]]:
        """Calculate engagement debt between pairs."""
        
        cutoff = datetime.now() - timedelta(days=self.lookback_days)
        recent_logs = [l for l in self.engagement_log if l['timestamp'] > cutoff]
        
        # Count pairwise engagements
        given_to = defaultdict(lambda: defaultdict(int))
        
        for log in recent_logs:
            given_to[log['giver_id']][log['receiver_id']] += 1
        
        # Calculate debt (positive = owes, negative = owed)
        debt = {}
        for a_id in members:
            debt[a_id] = {}
            for b_id in members:
                if a_id != b_id:
                    a_to_b = given_to[a_id][b_id]
                    b_to_a = given_to[b_id][a_id]
                    debt[a_id][b_id] = b_to_a - a_to_b  # How much A owes B
        
        return debt
    
    def identify_freeloaders(
        self,
        members: dict[str, 'PodMember'],
        threshold: float = 0.3
    ) -> list[str]:
        """Identify members who take more than they give."""
        
        scores = self.calculate_reciprocity_scores(members)
        return [uid for uid, score in scores.items() if score < threshold]
```

---

## Fairness Calculator

```python
# fairness_calculator.py
from typing import Optional

class FairnessCalculator:
    """Ensure fair engagement distribution."""
    
    def __init__(self, reciprocity_tracker: 'ReciprocityTracker'):
        self.tracker = reciprocity_tracker
    
    def prioritize_requests(
        self,
        requests: list['EngagementRequest'],
        members: dict[str, 'PodMember'],
        current_user_id: str
    ) -> list['EngagementRequest']:
        """Prioritize requests based on fairness."""
        
        # Get debt matrix
        debt = self.tracker.get_debt_matrix(members)
        user_debts = debt.get(current_user_id, {})
        
        # Get reciprocity scores
        scores = self.tracker.calculate_reciprocity_scores(members)
        
        def priority_score(request):
            author_id = request.author_id
            
            # Base priority
            score = request.priority * 10
            
            # Debt factor (prioritize those we owe)
            debt_to_author = user_debts.get(author_id, 0)
            score += debt_to_author * 5
            
            # Reciprocity factor (prioritize good contributors)
            author_reciprocity = scores.get(author_id, 1.0)
            score += author_reciprocity * 10
            
            # Urgency factor (older requests)
            hours_old = (datetime.now() - request.requested_at).total_seconds() / 3600
            score += min(hours_old, 24)  # Cap at 24 hours
            
            return score
        
        return sorted(requests, key=priority_score, reverse=True)
    
    def calculate_fair_quota(
        self,
        member: 'PodMember',
        total_pending: int,
        member_count: int
    ) -> int:
        """Calculate fair engagement quota for member."""
        
        base_quota = total_pending // (member_count - 1)
        
        # Adjust by reciprocity
        adjusted = int(base_quota * member.reciprocity_score)
        
        # Minimum and maximum bounds
        return max(1, min(adjusted, base_quota * 2))
```

---

## Anti-Detection Scheduler

```python
# anti_detection_scheduler.py
import random
from datetime import datetime, timedelta
from typing import Generator

class AntiDetectionScheduler:
    """Schedule engagements with natural timing patterns."""
    
    def __init__(
        self,
        min_delay_seconds: int = 30,
        max_delay_seconds: int = 300,
        daily_limit: int = 100,
        active_hours: tuple[int, int] = (8, 23)
    ):
        self.min_delay = min_delay_seconds
        self.max_delay = max_delay_seconds
        self.daily_limit = daily_limit
        self.active_hours = active_hours
        
        self.daily_count = 0
        self.last_reset = datetime.now().date()
    
    def get_next_delay(self) -> int:
        """Get natural-looking delay before next action."""
        
        # Check daily limit
        if datetime.now().date() != self.last_reset:
            self.daily_count = 0
            self.last_reset = datetime.now().date()
        
        if self.daily_count >= self.daily_limit:
            # Wait until tomorrow
            tomorrow = datetime.now().replace(
                hour=self.active_hours[0], 
                minute=0, 
                second=0
            ) + timedelta(days=1)
            return int((tomorrow - datetime.now()).total_seconds())
        
        # Check active hours
        current_hour = datetime.now().hour
        if not (self.active_hours[0] <= current_hour < self.active_hours[1]):
            # Wait until active hours
            if current_hour < self.active_hours[0]:
                wait_hours = self.active_hours[0] - current_hour
            else:
                wait_hours = 24 - current_hour + self.active_hours[0]
            return wait_hours * 3600 + random.randint(0, 1800)
        
        # Normal delay with natural variation
        base_delay = random.randint(self.min_delay, self.max_delay)
        
        # Add occasional longer pauses (simulates breaks)
        if random.random() < 0.1:  # 10% chance
            base_delay += random.randint(300, 900)  # 5-15 minute break
        
        # Add micro-variations
        variation = random.gauss(0, base_delay * 0.2)
        
        return max(self.min_delay, int(base_delay + variation))
    
    def schedule_batch(
        self,
        count: int
    ) -> Generator[datetime, None, None]:
        """Generate scheduled times for batch of engagements."""
        
        current_time = datetime.now()
        
        for _ in range(count):
            delay = self.get_next_delay()
            current_time += timedelta(seconds=delay)
            self.daily_count += 1
            yield current_time
    
    def is_safe_to_engage(self) -> bool:
        """Check if it's safe to perform engagement."""
        
        # Check daily limit
        if datetime.now().date() != self.last_reset:
            self.daily_count = 0
            self.last_reset = datetime.now().date()
        
        if self.daily_count >= self.daily_limit:
            return False
        
        # Check active hours
        current_hour = datetime.now().hour
        if not (self.active_hours[0] <= current_hour < self.active_hours[1]):
            return False
        
        return True
```

---

## Pod Executor

```python
# pod_executor.py
import asyncio
from datetime import datetime

from xeepy import Xeepy

from pod_models import EngagementType, EngagementRequest
from pod_manager import PodManager
from anti_detection_scheduler import AntiDetectionScheduler

class PodExecutor:
    """Execute pod engagement tasks."""
    
    def __init__(
        self,
        pod_manager: PodManager,
        scheduler: AntiDetectionScheduler
    ):
        self.pod = pod_manager
        self.scheduler = scheduler
    
    async def execute_queue(self, member_id: str):
        """Execute engagement queue for a member."""
        
        queue = self.pod.get_queue_for_member(member_id)
        
        if not queue:
            print("No pending engagements")
            return
        
        print(f"Processing {len(queue)} engagement requests...")
        
        async with Xeepy() as x:
            for request in queue:
                # Check if safe
                if not self.scheduler.is_safe_to_engage():
                    print("Rate limit reached, stopping")
                    break
                
                # Wait natural delay
                delay = self.scheduler.get_next_delay()
                print(f"Waiting {delay}s before next engagement...")
                await asyncio.sleep(delay)
                
                # Execute engagements
                for eng_type in request.engagement_types:
                    try:
                        await self._execute_engagement(
                            x, request.tweet_url, eng_type
                        )
                        
                        self.pod.record_engagement(
                            request.id,
                            member_id,
                            eng_type
                        )
                        
                        print(f"✓ {eng_type.value} on {request.tweet_url}")
                        
                    except Exception as e:
                        print(f"✗ Failed: {e}")
    
    async def _execute_engagement(
        self,
        x: Xeepy,
        tweet_url: str,
        engagement_type: EngagementType
    ):
        """Execute single engagement action."""
        
        if engagement_type == EngagementType.LIKE:
            await x.engage.like(tweet_url)
        
        elif engagement_type == EngagementType.RETWEET:
            await x.engage.retweet(tweet_url)
        
        elif engagement_type == EngagementType.REPLY:
            # Would need reply text
            pass
        
        elif engagement_type == EngagementType.QUOTE:
            # Would need quote text
            pass
```

---

## Usage Example

```python
# main.py
import asyncio
from datetime import datetime

from pod_manager import PodManager
from pod_models import PodMember, EngagementType
from reciprocity_tracker import ReciprocityTracker
from anti_detection_scheduler import AntiDetectionScheduler
from pod_executor import PodExecutor

async def main():
    # Create pod
    pod = PodManager("tech_pod", max_members=10)
    
    # Add members
    members = [
        PodMember("1", "user1", datetime.now(), 5000, 0.05, "America/New_York"),
        PodMember("2", "user2", datetime.now(), 8000, 0.04, "Europe/London"),
        PodMember("3", "user3", datetime.now(), 3000, 0.06, "Asia/Tokyo"),
    ]
    
    for member in members:
        pod.add_member(member)
    
    # Submit engagement request
    request = pod.submit_request(
        tweet_id="123456789",
        tweet_url="https://x.com/user1/status/123456789",
        author_id="1",
        engagement_types=[EngagementType.LIKE, EngagementType.RETWEET],
        priority=2
    )
    
    print(f"Request submitted: {request.id}")
    
    # Execute for member 2
    scheduler = AntiDetectionScheduler(
        min_delay_seconds=60,
        max_delay_seconds=300,
        daily_limit=50
    )
    
    executor = PodExecutor(pod, scheduler)
    await executor.execute_queue("2")
    
    # Check reciprocity
    tracker = ReciprocityTracker()
    scores = tracker.calculate_reciprocity_scores(pod.members)
    
    print("\nReciprocity Scores:")
    for uid, score in scores.items():
        print(f"  {pod.members[uid].username}: {score:.2f}")

if __name__ == "__main__":
    asyncio.run(main())
```

---

## Ethical Considerations

!!! danger "Platform Terms"
    Engagement pods may violate X/Twitter's Terms of Service. Accounts may be suspended. Use at your own risk.

!!! warning "Authenticity"
    - Pod engagement creates artificial metrics
    - It can damage genuine community trust
    - Consider organic growth strategies instead

!!! tip "If You Must"
    - Keep pods small (<10 members)
    - Focus on genuine content
    - Use natural timing
    - Don't over-engage
    - Be prepared for consequences

---

## Related Recipes

- [Optimal Timing](optimal-timing.md) - Post at best times
- [Hashtag Strategy](hashtag-strategy.md) - Organic reach
- [Content Calendar](../automation/content-calendar.md) - Better content
