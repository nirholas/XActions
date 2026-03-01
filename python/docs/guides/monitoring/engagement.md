# Engagement Monitoring

Track likes, replies, and retweets in real-time. Detect viral content and monitor response times.

## Overview

Engagement monitoring helps you:

- Track real-time likes and replies on your tweets
- Detect engagement velocity spikes (potential virality)
- Identify your most engaging content
- Monitor response times for customer support
- Create engagement leaderboards

## Real-Time Like/Reply Tracking

### Basic Engagement Tracker

```python
import asyncio
from datetime import datetime
from xtools import Xtools

class TweetEngagementTracker:
    def __init__(self, tweet_id: str):
        self.tweet_id = tweet_id
        self.history = []
        self.last_stats = None
    
    async def check(self) -> dict:
        """Check current engagement stats."""
        async with Xtools() as x:
            # Get tweet details
            tweet = await x.scrape.tweet(self.tweet_id)
            
            current = {
                "timestamp": datetime.now().isoformat(),
                "likes": tweet.like_count,
                "retweets": tweet.retweet_count,
                "replies": tweet.reply_count,
                "quotes": tweet.quote_count,
                "views": tweet.view_count
            }
            
            changes = {}
            if self.last_stats:
                changes = {
                    "likes_delta": current["likes"] - self.last_stats["likes"],
                    "retweets_delta": current["retweets"] - self.last_stats["retweets"],
                    "replies_delta": current["replies"] - self.last_stats["replies"]
                }
            
            self.history.append(current)
            self.last_stats = current
            
            return {
                "current": current,
                "changes": changes
            }
    
    async def monitor(self, interval_seconds: int = 60, duration_minutes: int = None):
        """Monitor engagement over time."""
        print(f"📊 Tracking tweet: {self.tweet_id}")
        
        start_time = datetime.now()
        
        while True:
            result = await self.check()
            
            c = result["current"]
            d = result["changes"]
            
            print(f"\n[{datetime.now().strftime('%H:%M:%S')}]")
            print(f"   ❤️ {c['likes']:,} (+{d.get('likes_delta', 0)})")
            print(f"   🔁 {c['retweets']:,} (+{d.get('retweets_delta', 0)})")
            print(f"   💬 {c['replies']:,} (+{d.get('replies_delta', 0)})")
            
            if c.get('views'):
                print(f"   👁️ {c['views']:,} views")
            
            # Check duration
            if duration_minutes:
                elapsed = (datetime.now() - start_time).total_seconds() / 60
                if elapsed >= duration_minutes:
                    break
            
            await asyncio.sleep(interval_seconds)
        
        return self.history

# Usage
tracker = TweetEngagementTracker("1234567890123456789")
asyncio.run(tracker.monitor(interval_seconds=30, duration_minutes=60))
```

### Multi-Tweet Engagement Monitor

```python
import asyncio
from datetime import datetime
from xtools import Xtools

class MultiTweetMonitor:
    def __init__(self, tweet_ids: list):
        self.tweet_ids = tweet_ids
        self.stats = {tid: [] for tid in tweet_ids}
    
    async def check_all(self) -> dict:
        """Check engagement for all tweets."""
        async with Xtools() as x:
            results = {}
            
            for tweet_id in self.tweet_ids:
                tweet = await x.scrape.tweet(tweet_id)
                
                stats = {
                    "timestamp": datetime.now().isoformat(),
                    "likes": tweet.like_count,
                    "retweets": tweet.retweet_count,
                    "replies": tweet.reply_count,
                    "text": tweet.text[:50]
                }
                
                # Calculate change from last check
                if self.stats[tweet_id]:
                    last = self.stats[tweet_id][-1]
                    stats["likes_delta"] = stats["likes"] - last["likes"]
                    stats["retweets_delta"] = stats["retweets"] - last["retweets"]
                else:
                    stats["likes_delta"] = 0
                    stats["retweets_delta"] = 0
                
                self.stats[tweet_id].append(stats)
                results[tweet_id] = stats
                
                await asyncio.sleep(1)  # Rate limiting
            
            return results
    
    def get_top_performers(self) -> list:
        """Get tweets ranked by engagement."""
        rankings = []
        
        for tweet_id, history in self.stats.items():
            if history:
                latest = history[-1]
                total = latest["likes"] + latest["retweets"] * 2
                rankings.append({
                    "id": tweet_id,
                    "text": latest["text"],
                    "engagement": total,
                    "likes": latest["likes"],
                    "retweets": latest["retweets"]
                })
        
        return sorted(rankings, key=lambda x: x["engagement"], reverse=True)

# Usage
async def main():
    tweets = [
        "1234567890123456789",
        "1234567890123456790",
        "1234567890123456791"
    ]
    
    monitor = MultiTweetMonitor(tweets)
    
    for _ in range(10):  # 10 checks
        results = await monitor.check_all()
        
        print(f"\n[{datetime.now().strftime('%H:%M:%S')}] Engagement Update:")
        for tweet_id, stats in results.items():
            print(f"   {stats['text'][:30]}... "
                  f"❤️ {stats['likes']} (+{stats['likes_delta']})")
        
        await asyncio.sleep(60)
    
    # Final rankings
    print("\n🏆 Top Performers:")
    for i, t in enumerate(monitor.get_top_performers(), 1):
        print(f"   {i}. {t['text']}... - {t['engagement']} engagement")

asyncio.run(main())
```

## Engagement Velocity Alerts

### Velocity Detection

```python
import asyncio
from datetime import datetime, timedelta
from collections import deque
from xtools import Xtools

class VelocityMonitor:
    def __init__(self, tweet_id: str, alert_threshold: float = 10.0):
        self.tweet_id = tweet_id
        self.alert_threshold = alert_threshold  # Likes per minute
        self.history = deque(maxlen=60)  # Keep 60 data points
        self.last_likes = 0
    
    def calculate_velocity(self) -> float:
        """Calculate likes per minute over recent history."""
        if len(self.history) < 2:
            return 0.0
        
        recent = list(self.history)[-5:]  # Last 5 readings
        
        if len(recent) < 2:
            return 0.0
        
        total_change = recent[-1]["likes"] - recent[0]["likes"]
        time_diff = (
            datetime.fromisoformat(recent[-1]["timestamp"]) -
            datetime.fromisoformat(recent[0]["timestamp"])
        ).total_seconds() / 60
        
        if time_diff == 0:
            return 0.0
        
        return total_change / time_diff
    
    async def check(self) -> dict:
        """Check engagement and velocity."""
        async with Xtools() as x:
            tweet = await x.scrape.tweet(self.tweet_id)
            
            data = {
                "timestamp": datetime.now().isoformat(),
                "likes": tweet.like_count,
                "retweets": tweet.retweet_count
            }
            
            self.history.append(data)
            
            velocity = self.calculate_velocity()
            
            result = {
                "current": data,
                "velocity": velocity,
                "alert": velocity >= self.alert_threshold
            }
            
            if result["alert"]:
                result["message"] = (
                    f"🚀 VELOCITY ALERT! Tweet gaining "
                    f"{velocity:.1f} likes/minute"
                )
            
            self.last_likes = data["likes"]
            
            return result
    
    async def monitor(self, interval_seconds: int = 30):
        """Monitor velocity continuously."""
        print(f"📈 Monitoring velocity for tweet {self.tweet_id}")
        print(f"   Alert threshold: {self.alert_threshold} likes/min")
        
        while True:
            result = await self.check()
            
            velocity_bar = "█" * min(int(result["velocity"]), 20)
            print(f"\r   Velocity: {result['velocity']:5.1f}/min [{velocity_bar:<20}]", end="")
            
            if result["alert"]:
                print(f"\n{result['message']}")
                # Send notification here
            
            await asyncio.sleep(interval_seconds)

# Usage
monitor = VelocityMonitor("1234567890123456789", alert_threshold=5.0)
asyncio.run(monitor.monitor())
```

## Viral Content Detection

### Viral Detector

```python
import asyncio
from datetime import datetime, timedelta
from xtools import Xtools
from xtools.notifications import DiscordNotifier

class ViralDetector:
    def __init__(
        self,
        username: str,
        viral_threshold_likes: int = 1000,
        viral_threshold_velocity: float = 50.0,  # likes/min
        discord_webhook: str = None
    ):
        self.username = username
        self.threshold_likes = viral_threshold_likes
        self.threshold_velocity = viral_threshold_velocity
        self.tracked_tweets = {}
        self.notifier = DiscordNotifier(discord_webhook) if discord_webhook else None
        self.alerted_tweets = set()
    
    async def check_user_tweets(self) -> list:
        """Check recent tweets for viral potential."""
        async with Xtools() as x:
            result = await x.scrape.tweets(self.username, limit=20)
            viral_tweets = []
            
            for tweet in result.tweets:
                # Skip if already alerted
                if tweet.id in self.alerted_tweets:
                    continue
                
                # Calculate age in minutes
                if tweet.created_at:
                    age_minutes = (datetime.now() - tweet.created_at).total_seconds() / 60
                else:
                    age_minutes = 60  # Default
                
                # Calculate velocity
                velocity = tweet.like_count / max(age_minutes, 1)
                
                # Check viral conditions
                is_viral = (
                    tweet.like_count >= self.threshold_likes or
                    velocity >= self.threshold_velocity
                )
                
                if is_viral:
                    viral_tweets.append({
                        "tweet": tweet,
                        "velocity": velocity,
                        "age_minutes": age_minutes
                    })
                
                # Update tracking
                if tweet.id not in self.tracked_tweets:
                    self.tracked_tweets[tweet.id] = {
                        "first_seen": datetime.now(),
                        "initial_likes": tweet.like_count
                    }
            
            return viral_tweets
    
    async def alert_viral(self, viral_tweets: list):
        """Send alerts for viral content."""
        for item in viral_tweets:
            tweet = item["tweet"]
            
            if tweet.id in self.alerted_tweets:
                continue
            
            self.alerted_tweets.add(tweet.id)
            
            message = (
                f"🔥 **VIRAL TWEET DETECTED**\n\n"
                f"@{self.username}\n"
                f"{tweet.text[:200]}...\n\n"
                f"❤️ {tweet.like_count:,} likes\n"
                f"🔁 {tweet.retweet_count:,} retweets\n"
                f"📈 {item['velocity']:.1f} likes/minute\n"
                f"⏱️ Posted {item['age_minutes']:.0f} minutes ago"
            )
            
            print(message)
            
            if self.notifier:
                await self.notifier.send(
                    title="🔥 Viral Tweet!",
                    message=message,
                    color=0xFF6600
                )
    
    async def monitor(self, interval_minutes: int = 5):
        """Monitor for viral content."""
        print(f"🔍 Viral Monitor: @{self.username}")
        print(f"   Thresholds: {self.threshold_likes} likes or "
              f"{self.threshold_velocity} likes/min")
        
        while True:
            viral_tweets = await self.check_user_tweets()
            
            if viral_tweets:
                await self.alert_viral(viral_tweets)
            
            await asyncio.sleep(interval_minutes * 60)

# Usage
detector = ViralDetector(
    "your_username",
    viral_threshold_likes=500,
    viral_threshold_velocity=20.0,
    discord_webhook="https://discord.com/api/webhooks/..."
)

asyncio.run(detector.monitor())
```

## Response Time Tracking

### Support Response Monitor

```python
import asyncio
from datetime import datetime
from statistics import mean, median
from xtools import Xtools

class ResponseTimeTracker:
    def __init__(self, username: str):
        self.username = username
        self.response_times = []
        self.unanswered = []
    
    async def analyze_responses(self, hours: int = 24) -> dict:
        """Analyze response times to mentions."""
        async with Xtools() as x:
            # Get mentions
            mentions = await x.scrape.mentions(self.username, limit=100)
            
            # Get user's replies
            user_tweets = await x.scrape.tweets(self.username, limit=200)
            replies = [t for t in user_tweets.tweets if t.in_reply_to_user_id]
            
            reply_map = {}
            for reply in replies:
                if reply.in_reply_to_status_id:
                    reply_map[reply.in_reply_to_status_id] = reply
            
            for mention in mentions.tweets:
                # Check if we replied
                if mention.id in reply_map:
                    reply = reply_map[mention.id]
                    
                    if mention.created_at and reply.created_at:
                        response_time = (reply.created_at - mention.created_at).total_seconds()
                        
                        self.response_times.append({
                            "mention_id": mention.id,
                            "mention_author": mention.author.username,
                            "response_seconds": response_time,
                            "mention_time": mention.created_at.isoformat()
                        })
                else:
                    self.unanswered.append({
                        "id": mention.id,
                        "author": mention.author.username,
                        "text": mention.text,
                        "time": mention.created_at.isoformat() if mention.created_at else None
                    })
            
            # Calculate stats
            times = [r["response_seconds"] for r in self.response_times]
            
            return {
                "total_mentions": len(mentions.tweets),
                "answered": len(self.response_times),
                "unanswered": len(self.unanswered),
                "response_rate": len(self.response_times) / max(len(mentions.tweets), 1) * 100,
                "avg_response_minutes": mean(times) / 60 if times else 0,
                "median_response_minutes": median(times) / 60 if times else 0,
                "fastest_minutes": min(times) / 60 if times else 0,
                "slowest_minutes": max(times) / 60 if times else 0
            }
    
    def get_unanswered(self) -> list:
        """Get list of unanswered mentions."""
        return self.unanswered

# Usage
async def main():
    tracker = ResponseTimeTracker("your_brand_account")
    
    stats = await tracker.analyze_responses(hours=24)
    
    print(f"📊 Response Time Analysis")
    print(f"   Total mentions: {stats['total_mentions']}")
    print(f"   Answered: {stats['answered']} ({stats['response_rate']:.1f}%)")
    print(f"   Avg response: {stats['avg_response_minutes']:.1f} minutes")
    print(f"   Median: {stats['median_response_minutes']:.1f} minutes")
    print(f"   Fastest: {stats['fastest_minutes']:.1f} minutes")
    print(f"   Slowest: {stats['slowest_minutes']:.1f} minutes")
    
    unanswered = tracker.get_unanswered()
    if unanswered:
        print(f"\n⚠️ {len(unanswered)} unanswered mentions:")
        for m in unanswered[:5]:
            print(f"   @{m['author']}: {m['text'][:50]}...")

asyncio.run(main())
```

## Engagement Leaderboards

### Daily Leaderboard

```python
import asyncio
from datetime import datetime, timedelta
from xtools import Xtools

class EngagementLeaderboard:
    def __init__(self, username: str):
        self.username = username
    
    async def get_top_tweets(self, days: int = 7, limit: int = 10) -> list:
        """Get top performing tweets from recent period."""
        async with Xtools() as x:
            result = await x.scrape.tweets(self.username, limit=100)
            
            # Filter by date
            cutoff = datetime.now() - timedelta(days=days)
            recent_tweets = [
                t for t in result.tweets
                if t.created_at and t.created_at >= cutoff
            ]
            
            # Calculate engagement score
            scored = []
            for tweet in recent_tweets:
                score = (
                    tweet.like_count +
                    tweet.retweet_count * 2 +
                    tweet.reply_count * 3 +
                    tweet.quote_count * 2
                )
                
                scored.append({
                    "id": tweet.id,
                    "text": tweet.text[:100],
                    "score": score,
                    "likes": tweet.like_count,
                    "retweets": tweet.retweet_count,
                    "replies": tweet.reply_count,
                    "created": tweet.created_at.isoformat() if tweet.created_at else None,
                    "url": f"https://x.com/{self.username}/status/{tweet.id}"
                })
            
            # Sort by score
            scored.sort(key=lambda x: x["score"], reverse=True)
            
            return scored[:limit]
    
    async def get_top_engagers(self, limit: int = 20) -> list:
        """Get users who engage most with your content."""
        async with Xtools() as x:
            # Get recent tweets
            tweets = await x.scrape.tweets(self.username, limit=50)
            
            engager_counts = {}
            
            for tweet in tweets.tweets:
                # Get replies
                replies = await x.scrape.replies(
                    f"https://x.com/{self.username}/status/{tweet.id}",
                    limit=50
                )
                
                for reply in replies.tweets:
                    author = reply.author.username
                    if author not in engager_counts:
                        engager_counts[author] = {
                            "username": author,
                            "replies": 0,
                            "profile": reply.author
                        }
                    engager_counts[author]["replies"] += 1
                
                await asyncio.sleep(1)  # Rate limiting
            
            # Sort by engagement
            sorted_engagers = sorted(
                engager_counts.values(),
                key=lambda x: x["replies"],
                reverse=True
            )
            
            return sorted_engagers[:limit]

# Usage
async def main():
    leaderboard = EngagementLeaderboard("your_username")
    
    # Top tweets
    print("🏆 TOP TWEETS (Last 7 Days)\n")
    top_tweets = await leaderboard.get_top_tweets(days=7, limit=5)
    
    for i, tweet in enumerate(top_tweets, 1):
        print(f"{i}. Score: {tweet['score']:,}")
        print(f"   {tweet['text']}...")
        print(f"   ❤️ {tweet['likes']} | 🔁 {tweet['retweets']} | 💬 {tweet['replies']}")
        print()
    
    # Top engagers
    print("\n👥 TOP ENGAGERS\n")
    top_engagers = await leaderboard.get_top_engagers(limit=10)
    
    for i, engager in enumerate(top_engagers, 1):
        print(f"{i}. @{engager['username']} - {engager['replies']} replies")

asyncio.run(main())
```

### Weekly Report Generator

```python
import asyncio
from datetime import datetime, timedelta
from xtools import Xtools

class WeeklyEngagementReport:
    def __init__(self, username: str):
        self.username = username
    
    async def generate(self) -> dict:
        """Generate weekly engagement report."""
        async with Xtools() as x:
            # Get profile
            profile = await x.scrape.profile(self.username)
            
            # Get tweets from last week
            tweets = await x.scrape.tweets(self.username, limit=200)
            
            cutoff = datetime.now() - timedelta(days=7)
            weekly_tweets = [
                t for t in tweets.tweets
                if t.created_at and t.created_at >= cutoff
            ]
            
            # Calculate totals
            total_likes = sum(t.like_count for t in weekly_tweets)
            total_retweets = sum(t.retweet_count for t in weekly_tweets)
            total_replies = sum(t.reply_count for t in weekly_tweets)
            
            # Find best performer
            best = max(weekly_tweets, key=lambda t: t.like_count, default=None)
            
            report = {
                "period": {
                    "start": cutoff.isoformat(),
                    "end": datetime.now().isoformat()
                },
                "profile": {
                    "followers": profile.followers_count,
                    "following": profile.following_count
                },
                "activity": {
                    "tweets_posted": len(weekly_tweets),
                    "avg_per_day": len(weekly_tweets) / 7
                },
                "engagement": {
                    "total_likes": total_likes,
                    "total_retweets": total_retweets,
                    "total_replies": total_replies,
                    "avg_likes_per_tweet": total_likes / max(len(weekly_tweets), 1),
                    "avg_retweets_per_tweet": total_retweets / max(len(weekly_tweets), 1)
                },
                "best_tweet": {
                    "id": best.id if best else None,
                    "text": best.text[:100] if best else None,
                    "likes": best.like_count if best else 0
                }
            }
            
            return report
    
    def format_report(self, report: dict) -> str:
        """Format report as readable text."""
        return f"""
📊 WEEKLY ENGAGEMENT REPORT
{'='*40}
📅 {report['period']['start'][:10]} to {report['period']['end'][:10]}

👤 Profile Stats
   Followers: {report['profile']['followers']:,}
   Following: {report['profile']['following']:,}

✍️ Activity
   Tweets Posted: {report['activity']['tweets_posted']}
   Avg Per Day: {report['activity']['avg_per_day']:.1f}

❤️ Engagement
   Total Likes: {report['engagement']['total_likes']:,}
   Total Retweets: {report['engagement']['total_retweets']:,}
   Total Replies: {report['engagement']['total_replies']:,}
   Avg Likes/Tweet: {report['engagement']['avg_likes_per_tweet']:.1f}

🏆 Best Tweet
   {report['best_tweet']['text']}...
   ❤️ {report['best_tweet']['likes']:,} likes
"""

# Usage
async def main():
    reporter = WeeklyEngagementReport("your_username")
    
    report = await reporter.generate()
    formatted = reporter.format_report(report)
    
    print(formatted)

asyncio.run(main())
```

## Next Steps

- [Growth Monitoring](growth.md) - Track follower changes
- [Account Monitoring](accounts.md) - Track profile changes
- [Keyword Monitoring](keywords.md) - Monitor mentions
- [Analytics Guide](../analytics/index.md) - Deep data analysis
