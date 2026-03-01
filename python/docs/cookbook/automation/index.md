# 🤖 Automation Workflows Cookbook

Production-ready automation recipes for X/Twitter. These workflows run reliably, handle errors gracefully, and respect rate limits.

## The 24/7 Automation Stack

A complete automation system that runs continuously.

```python
"""
The 24/7 Automation Stack
=========================
A production-ready automation system with:
- Scheduled tasks
- Error handling
- Rate limit management
- Logging and monitoring
- Graceful shutdown
"""
import asyncio
import signal
import logging
from datetime import datetime, timedelta
from typing import Callable, List
from dataclasses import dataclass, field

from xeepy import Xeepy
from xeepy.notifications import DiscordNotifier

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('automation.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger('xeepy.automation')


@dataclass
class ScheduledTask:
    """A task that runs on a schedule"""
    name: str
    func: Callable
    interval_seconds: int
    last_run: datetime = None
    error_count: int = 0
    max_errors: int = 3
    enabled: bool = True


class AutomationStack:
    """
    Production automation runner with scheduling,
    error handling, and monitoring.
    """
    
    def __init__(self, notify_webhook: str = None):
        self.tasks: List[ScheduledTask] = []
        self.running = False
        self.xeepy: Xeepy = None
        self.notifier = DiscordNotifier(webhook_url=notify_webhook) if notify_webhook else None
        
        # Handle graceful shutdown
        signal.signal(signal.SIGINT, self._shutdown)
        signal.signal(signal.SIGTERM, self._shutdown)
    
    def add_task(self, name: str, func: Callable, interval: str):
        """Add a scheduled task"""
        # Parse interval
        intervals = {
            "hourly": 3600,
            "daily": 86400,
            "every_6h": 21600,
            "every_30m": 1800,
            "every_15m": 900,
        }
        seconds = intervals.get(interval, int(interval))
        
        self.tasks.append(ScheduledTask(
            name=name,
            func=func,
            interval_seconds=seconds
        ))
        logger.info(f"Added task: {name} (every {seconds}s)")
    
    async def run(self):
        """Main automation loop"""
        self.running = True
        logger.info("🚀 Automation stack starting...")
        
        async with Xeepy() as x:
            self.xeepy = x
            
            if self.notifier:
                await self.notifier.send("🟢 Xeepy automation started")
            
            while self.running:
                for task in self.tasks:
                    if not task.enabled:
                        continue
                    
                    # Check if task should run
                    if self._should_run(task):
                        await self._run_task(task)
                
                # Sleep before next check
                await asyncio.sleep(60)  # Check every minute
        
        logger.info("Automation stack stopped")
    
    def _should_run(self, task: ScheduledTask) -> bool:
        """Check if task is due to run"""
        if task.last_run is None:
            return True
        
        elapsed = (datetime.now() - task.last_run).total_seconds()
        return elapsed >= task.interval_seconds
    
    async def _run_task(self, task: ScheduledTask):
        """Execute a task with error handling"""
        logger.info(f"Running task: {task.name}")
        
        try:
            await task.func(self.xeepy)
            task.last_run = datetime.now()
            task.error_count = 0
            logger.info(f"✓ Task completed: {task.name}")
            
        except Exception as e:
            task.error_count += 1
            logger.error(f"✗ Task failed: {task.name} - {e}")
            
            if self.notifier:
                await self.notifier.send(
                    f"⚠️ Task failed: {task.name}\nError: {str(e)[:200]}"
                )
            
            # Disable task after too many errors
            if task.error_count >= task.max_errors:
                task.enabled = False
                logger.warning(f"Task disabled due to errors: {task.name}")
                
                if self.notifier:
                    await self.notifier.send(
                        f"🔴 Task disabled: {task.name} (too many errors)"
                    )
    
    def _shutdown(self, signum, frame):
        """Handle shutdown signal"""
        logger.info("Shutdown signal received...")
        self.running = False


# ============================================
# AUTOMATION TASKS
# ============================================

async def task_unfollower_check(x: Xeepy):
    """Check for new unfollowers"""
    report = await x.monitor.unfollowers()
    
    if report.unfollowers:
        logger.info(f"New unfollowers: {report.unfollowers}")
    
    logger.info(f"Follower change: {report.net_change:+d}")


async def task_engagement_routine(x: Xeepy):
    """Daily engagement routine"""
    # Like tweets from your network
    timeline = await x.scrape.home_timeline(limit=50)
    
    liked = 0
    for tweet in timeline:
        if tweet.likes > 10 and not tweet.is_liked:
            await x.engage.like(tweet.url)
            liked += 1
            
            if liked >= 20:  # Limit per run
                break
    
    logger.info(f"Liked {liked} tweets")


async def task_cleanup_following(x: Xeepy):
    """Unfollow non-followers"""
    result = await x.unfollow.non_followers(
        max_unfollows=25,
        whitelist_file="whitelist.txt",
        min_days_following=7
    )
    
    logger.info(f"Unfollowed {result.unfollowed_count} non-followers")


async def task_growth_tracking(x: Xeepy):
    """Track and log growth metrics"""
    growth = await x.analytics.track_growth("24h")
    
    logger.info(f"""
    Growth Report (24h):
    - Followers: {growth.followers_count:,}
    - Net change: {growth.net_change:+d}
    - New: {len(growth.new_followers)}
    - Lost: {len(growth.unfollowers)}
    """)


async def task_mention_monitoring(x: Xeepy):
    """Monitor and respond to mentions"""
    mentions = await x.scrape.mentions("your_username", limit=20, since="1h")
    
    for mention in mentions:
        if not mention.has_my_reply:
            # Auto-like mentions
            await x.engage.like(mention.url)
            logger.info(f"Liked mention from @{mention.author.username}")


# ============================================
# MAIN ENTRY POINT
# ============================================

async def main():
    # Create automation stack
    stack = AutomationStack(
        notify_webhook="https://discord.com/api/webhooks/..."
    )
    
    # Add tasks
    stack.add_task("unfollower_check", task_unfollower_check, "hourly")
    stack.add_task("engagement", task_engagement_routine, "every_6h")
    stack.add_task("cleanup", task_cleanup_following, "daily")
    stack.add_task("growth_tracking", task_growth_tracking, "every_6h")
    stack.add_task("mentions", task_mention_monitoring, "every_15m")
    
    # Run forever
    await stack.run()


if __name__ == "__main__":
    asyncio.run(main())
```

## Smart Engagement Bot

An intelligent engagement bot that adds value, not spam.

```python
"""
Smart Engagement Bot
====================
Engages thoughtfully based on content relevance and quality.
"""
import asyncio
from xeepy import Xeepy
from xeepy.ai import ContentGenerator, SentimentAnalyzer

class SmartEngagementBot:
    """
    Engagement bot that:
    - Analyzes content before engaging
    - Generates contextual comments
    - Respects rate limits
    - Avoids spam behavior
    """
    
    def __init__(self, keywords: list, daily_limits: dict = None):
        self.keywords = keywords
        self.limits = daily_limits or {
            "likes": 100,
            "replies": 20,
            "follows": 30
        }
        self.daily_stats = {"likes": 0, "replies": 0, "follows": 0}
        self.engaged_today = set()  # Track engaged tweets
    
    async def run(self):
        async with Xeepy() as x:
            ai = ContentGenerator(provider="openai")
            sentiment = SentimentAnalyzer(provider="openai")
            
            while True:
                # Find relevant content
                for keyword in self.keywords:
                    tweets = await x.scrape.search(
                        keyword,
                        limit=20,
                        min_likes=5,
                        max_age_hours=6
                    )
                    
                    for tweet in tweets:
                        # Skip if already engaged
                        if tweet.id in self.engaged_today:
                            continue
                        
                        # Analyze tweet quality
                        quality = await self._analyze_quality(tweet, sentiment)
                        
                        if quality["score"] > 0.7:
                            await self._engage_with_tweet(x, ai, tweet, quality)
                
                # Wait before next round
                await asyncio.sleep(1800)  # 30 minutes
                
                # Reset daily stats at midnight
                if self._is_new_day():
                    self._reset_daily_stats()
    
    async def _analyze_quality(self, tweet, sentiment):
        """Analyze if tweet is worth engaging with"""
        score = 0
        reasons = []
        
        # Sentiment analysis
        sent_result = await sentiment.analyze(tweet.text)
        if sent_result.label == "positive":
            score += 0.3
            reasons.append("positive_content")
        
        # Engagement indicators
        if tweet.likes > 50:
            score += 0.2
            reasons.append("high_engagement")
        
        # Author quality
        if tweet.author.followers_count > 1000:
            score += 0.2
            reasons.append("quality_author")
        
        if tweet.author.verified:
            score += 0.1
            reasons.append("verified")
        
        # Content quality
        if len(tweet.text) > 100:
            score += 0.1
            reasons.append("substantial_content")
        
        if "?" in tweet.text:  # Questions are engagement opportunities
            score += 0.1
            reasons.append("question")
        
        return {"score": score, "reasons": reasons}
    
    async def _engage_with_tweet(self, x, ai, tweet, quality):
        """Engage with a quality tweet"""
        self.engaged_today.add(tweet.id)
        
        # Always like quality content
        if self.daily_stats["likes"] < self.limits["likes"]:
            await x.engage.like(tweet.url)
            self.daily_stats["likes"] += 1
        
        # Reply if it's a question or high-engagement opportunity
        if "question" in quality["reasons"] and self.daily_stats["replies"] < self.limits["replies"]:
            reply = await ai.generate_reply(
                tweet_text=tweet.text,
                style="helpful",
                add_value=True
            )
            
            # Only reply if we have something valuable to say
            if len(reply) > 50:
                await x.engage.reply(tweet.url, reply)
                self.daily_stats["replies"] += 1
        
        # Consider following if quality author
        if "quality_author" in quality["reasons"] and self.daily_stats["follows"] < self.limits["follows"]:
            if tweet.author.followers_count < 50000:  # Not too big
                await x.follow.user(tweet.author.username)
                self.daily_stats["follows"] += 1
    
    def _is_new_day(self):
        from datetime import datetime
        return datetime.now().hour == 0 and datetime.now().minute < 30
    
    def _reset_daily_stats(self):
        self.daily_stats = {"likes": 0, "replies": 0, "follows": 0}
        self.engaged_today.clear()


# Run the bot
async def main():
    bot = SmartEngagementBot(
        keywords=["python programming", "machine learning", "startup"],
        daily_limits={"likes": 100, "replies": 15, "follows": 20}
    )
    await bot.run()

asyncio.run(main())
```

## Content Pipeline Automation

Automate your content creation and publishing workflow.

```python
"""
Content Pipeline Automation
===========================
From ideation to publishing, fully automated.
"""
import asyncio
from datetime import datetime, timedelta
from dataclasses import dataclass
from typing import List, Optional

from xeepy import Xeepy
from xeepy.ai import ContentGenerator


@dataclass
class ContentItem:
    """A piece of content in the pipeline"""
    id: str
    content_type: str  # "tweet", "thread", "reply"
    text: str
    status: str = "draft"  # draft, scheduled, published, failed
    scheduled_time: Optional[datetime] = None
    published_url: Optional[str] = None
    engagement_score: Optional[float] = None


class ContentPipeline:
    """
    Automated content pipeline:
    1. Generate content ideas based on trends
    2. Create drafts using AI
    3. Schedule for optimal times
    4. Publish automatically
    5. Track performance
    """
    
    def __init__(self):
        self.queue: List[ContentItem] = []
        self.published: List[ContentItem] = []
    
    async def run(self):
        async with Xeepy() as x:
            ai = ContentGenerator(provider="openai")
            
            while True:
                # Phase 1: Content Generation (every 6 hours)
                if self._should_generate():
                    await self._generate_content(x, ai)
                
                # Phase 2: Publishing (check every 5 minutes)
                await self._publish_scheduled(x)
                
                # Phase 3: Performance Tracking (hourly)
                if self._should_track():
                    await self._track_performance(x)
                
                await asyncio.sleep(300)  # 5 minutes
    
    async def _generate_content(self, x: Xeepy, ai: ContentGenerator):
        """Generate new content based on trends and best practices"""
        print("📝 Generating new content...")
        
        # Get trending topics in your niche
        trending = await x.scrape.trending_topics(category="technology")
        
        # Analyze your best performing content
        my_best = await x.analytics.top_performing_tweets(limit=20)
        patterns = self._extract_patterns(my_best)
        
        # Generate content matching your style + trends
        for topic in trending[:3]:
            # Generate tweet
            tweet = await ai.generate_tweet(
                topic=topic,
                style=patterns["style"],
                hooks=patterns["hooks"],
                max_length=280
            )
            
            self.queue.append(ContentItem(
                id=f"tweet_{datetime.now().timestamp()}",
                content_type="tweet",
                text=tweet
            ))
        
        # Generate a thread
        thread_topic = await ai.suggest_thread_topic(
            based_on=my_best,
            trending=trending
        )
        
        thread = await ai.generate_thread(
            topic=thread_topic,
            style="educational",
            length=8
        )
        
        self.queue.append(ContentItem(
            id=f"thread_{datetime.now().timestamp()}",
            content_type="thread",
            text="\n---\n".join(thread.tweets)
        ))
        
        # Schedule content
        await self._schedule_content(x)
        
        print(f"✅ Generated {len(self.queue)} new items")
    
    async def _schedule_content(self, x: Xeepy):
        """Schedule content for optimal posting times"""
        best_times = await x.analytics.best_time_to_post()
        
        unscheduled = [c for c in self.queue if c.status == "draft"]
        
        for i, content in enumerate(unscheduled):
            # Find next available slot
            slot = best_times.get_next_slot(
                after=datetime.now() + timedelta(hours=i * 4)
            )
            
            content.scheduled_time = slot
            content.status = "scheduled"
            
            print(f"  Scheduled: {content.id} for {slot}")
    
    async def _publish_scheduled(self, x: Xeepy):
        """Publish content that's due"""
        now = datetime.now()
        
        for content in self.queue:
            if content.status == "scheduled" and content.scheduled_time <= now:
                try:
                    if content.content_type == "tweet":
                        result = await x.post.tweet(content.text)
                    elif content.content_type == "thread":
                        tweets = content.text.split("\n---\n")
                        result = await x.post.thread(tweets)
                    
                    content.status = "published"
                    content.published_url = result.url
                    self.published.append(content)
                    
                    print(f"✅ Published: {content.id}")
                    
                except Exception as e:
                    content.status = "failed"
                    print(f"❌ Failed to publish {content.id}: {e}")
        
        # Remove published from queue
        self.queue = [c for c in self.queue if c.status not in ["published", "failed"]]
    
    async def _track_performance(self, x: Xeepy):
        """Track performance of published content"""
        for content in self.published[-10:]:  # Last 10 items
            if content.published_url:
                stats = await x.scrape.tweet(content.published_url)
                content.engagement_score = (
                    stats.likes + stats.retweets * 2 + stats.replies * 3
                )
    
    def _extract_patterns(self, tweets):
        """Extract patterns from top performing tweets"""
        # Simplified pattern extraction
        return {
            "style": "educational",
            "hooks": ["How to", "Here's why", "The truth about"],
            "avg_length": sum(len(t.text) for t in tweets) // len(tweets)
        }
    
    def _should_generate(self):
        # Generate if queue is low
        return len([c for c in self.queue if c.status == "scheduled"]) < 5
    
    def _should_track(self):
        return datetime.now().minute == 0  # Top of each hour


# Run the pipeline
asyncio.run(ContentPipeline().run())
```

## Monitoring & Alerting System

Real-time monitoring with intelligent alerts.

```python
"""
Monitoring & Alerting System
============================
Real-time monitoring with smart notifications.
"""
import asyncio
from dataclasses import dataclass
from datetime import datetime, timedelta
from typing import List, Callable
from enum import Enum

from xeepy import Xeepy
from xeepy.notifications import NotificationManager


class AlertLevel(Enum):
    INFO = "info"
    WARNING = "warning"
    CRITICAL = "critical"


@dataclass
class Alert:
    level: AlertLevel
    title: str
    message: str
    timestamp: datetime = None
    
    def __post_init__(self):
        self.timestamp = self.timestamp or datetime.now()


class MonitoringSystem:
    """
    Comprehensive monitoring system:
    - Real-time follower tracking
    - Engagement anomaly detection
    - Rate limit monitoring
    - System health checks
    """
    
    def __init__(self, config: dict):
        self.config = config
        self.alerts: List[Alert] = []
        self.metrics_history = []
        self.notifications = NotificationManager()
    
    async def run(self):
        async with Xeepy() as x:
            while True:
                # Collect metrics
                metrics = await self._collect_metrics(x)
                self.metrics_history.append(metrics)
                
                # Check thresholds
                await self._check_follower_alerts(metrics)
                await self._check_engagement_alerts(metrics)
                await self._check_rate_limits(x)
                await self._check_system_health(x)
                
                # Process alerts
                await self._process_alerts()
                
                # Cleanup old metrics
                self._cleanup_history()
                
                await asyncio.sleep(300)  # 5 minutes
    
    async def _collect_metrics(self, x: Xeepy):
        """Collect all relevant metrics"""
        profile = await x.scrape.profile(self.config["username"])
        engagement = await x.analytics.engagement_analysis("1h")
        
        return {
            "timestamp": datetime.now(),
            "followers": profile.followers_count,
            "following": profile.following_count,
            "engagement_rate": engagement.rate,
            "recent_likes": engagement.total_likes,
            "recent_replies": engagement.total_replies
        }
    
    async def _check_follower_alerts(self, metrics):
        """Check for unusual follower changes"""
        if len(self.metrics_history) < 2:
            return
        
        prev = self.metrics_history[-2]
        change = metrics["followers"] - prev["followers"]
        
        # Sudden drop alert
        if change < -self.config["thresholds"]["follower_drop"]:
            self.alerts.append(Alert(
                level=AlertLevel.WARNING,
                title="Sudden Follower Drop",
                message=f"Lost {abs(change)} followers in last check period"
            ))
        
        # Unusual gain (could be bot attack)
        if change > self.config["thresholds"]["follower_spike"]:
            self.alerts.append(Alert(
                level=AlertLevel.INFO,
                title="Follower Spike Detected",
                message=f"Gained {change} followers in last check period"
            ))
    
    async def _check_engagement_alerts(self, metrics):
        """Detect engagement anomalies"""
        if len(self.metrics_history) < 12:  # Need 1 hour of data
            return
        
        # Calculate average engagement
        recent = self.metrics_history[-12:]
        avg_rate = sum(m["engagement_rate"] for m in recent) / len(recent)
        
        # Alert if engagement dropped significantly
        if metrics["engagement_rate"] < avg_rate * 0.5:
            self.alerts.append(Alert(
                level=AlertLevel.WARNING,
                title="Engagement Drop",
                message=f"Engagement rate dropped to {metrics['engagement_rate']:.2%} (avg: {avg_rate:.2%})"
            ))
    
    async def _check_rate_limits(self, x: Xeepy):
        """Monitor rate limit usage"""
        limits = await x.get_rate_limit_status()
        
        for endpoint, status in limits.items():
            usage_pct = status["used"] / status["limit"]
            
            if usage_pct > 0.9:
                self.alerts.append(Alert(
                    level=AlertLevel.WARNING,
                    title="Rate Limit Warning",
                    message=f"{endpoint}: {usage_pct:.0%} of limit used"
                ))
    
    async def _check_system_health(self, x: Xeepy):
        """Check system health"""
        try:
            # Test basic functionality
            await x.auth.is_authenticated()
        except Exception as e:
            self.alerts.append(Alert(
                level=AlertLevel.CRITICAL,
                title="System Health Check Failed",
                message=str(e)
            ))
    
    async def _process_alerts(self):
        """Send alert notifications"""
        for alert in self.alerts:
            if alert.level == AlertLevel.CRITICAL:
                await self.notifications.broadcast(
                    f"🚨 {alert.title}\n{alert.message}"
                )
            elif alert.level == AlertLevel.WARNING:
                await self.notifications.send(
                    f"⚠️ {alert.title}\n{alert.message}",
                    channels=["discord"]
                )
            else:
                # Just log info alerts
                print(f"ℹ️ {alert.title}: {alert.message}")
        
        self.alerts.clear()
    
    def _cleanup_history(self):
        """Keep only last 24 hours of metrics"""
        cutoff = datetime.now() - timedelta(hours=24)
        self.metrics_history = [
            m for m in self.metrics_history 
            if m["timestamp"] > cutoff
        ]


# Configuration
config = {
    "username": "your_username",
    "thresholds": {
        "follower_drop": 50,     # Alert if lose 50+ followers
        "follower_spike": 500,   # Alert if gain 500+ followers
    }
}

# Run monitoring
asyncio.run(MonitoringSystem(config).run())
```

## Docker Deployment

Deploy your automation with Docker.

```dockerfile
# Dockerfile
FROM mcr.microsoft.com/playwright/python:v1.40.0-jammy

WORKDIR /app

# Install dependencies
COPY requirements.txt .
RUN pip install -r requirements.txt

# Copy automation code
COPY . .

# Run automation
CMD ["python", "automation_stack.py"]
```

```yaml
# docker-compose.yml
version: '3.8'

services:
  xeepy-automation:
    build: .
    restart: unless-stopped
    environment:
      - DISCORD_WEBHOOK=${DISCORD_WEBHOOK}
      - OPENAI_API_KEY=${OPENAI_API_KEY}
    volumes:
      - ./data:/app/data          # Persist data
      - ./session.json:/app/session.json  # Auth session
      - ./whitelist.txt:/app/whitelist.txt
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"
```

```bash
# Deploy
docker-compose up -d

# View logs
docker-compose logs -f

# Stop
docker-compose down
```

---

## Next Steps

<div class="grid cards" markdown>

-   **[Data Science Recipes](../data-science/index.md)**
    
    Analyze your automation data

-   **[Business Intelligence](../business/index.md)**
    
    Turn automation into business value

</div>
