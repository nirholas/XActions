# Keyword Monitoring

Monitor X/Twitter in real-time for specific keywords, hashtags, and phrases with sentiment filtering and engagement thresholds.

## Overview

Keyword monitoring enables you to:

- Track brand mentions and keywords in real-time
- Filter by sentiment (positive, negative, neutral)
- Set engagement thresholds for alerts
- Monitor multiple keywords simultaneously
- Receive notifications via Discord, Telegram, or email

## Real-Time Keyword Tracking

### Basic Keyword Monitor

```python
import asyncio
from datetime import datetime
from xtools import Xtools

async def monitor_keyword(keyword: str, interval_seconds: int = 60):
    """Monitor for new tweets containing keyword."""
    seen_ids = set()
    
    async with Xtools() as x:
        print(f"🔍 Monitoring for: {keyword}")
        
        while True:
            # Search for keyword
            result = await x.scrape.search(
                keyword,
                search_type="Latest",
                limit=50
            )
            
            new_tweets = []
            for tweet in result.tweets:
                if tweet.id not in seen_ids:
                    seen_ids.add(tweet.id)
                    new_tweets.append(tweet)
            
            if new_tweets:
                print(f"\n[{datetime.now().strftime('%H:%M:%S')}] "
                      f"{len(new_tweets)} new tweets:")
                
                for tweet in new_tweets[:5]:
                    print(f"\n  @{tweet.author.username}:")
                    print(f"  {tweet.text[:100]}...")
                    print(f"  ❤️ {tweet.like_count} | 🔁 {tweet.retweet_count}")
            
            await asyncio.sleep(interval_seconds)

# Usage
asyncio.run(monitor_keyword("python programming", interval_seconds=30))
```

### Advanced Keyword Tracker with Storage

```python
import asyncio
import json
from datetime import datetime
from pathlib import Path
from xtools import Xtools

class KeywordTracker:
    def __init__(self, keyword: str, storage_file: str = None):
        self.keyword = keyword
        self.storage_file = Path(storage_file or f"keyword_{keyword.replace(' ', '_')}.json")
        self.seen_ids = self._load_seen()
        self.matches = []
    
    def _load_seen(self) -> set:
        if self.storage_file.exists():
            data = json.loads(self.storage_file.read_text())
            return set(data.get("seen_ids", []))
        return set()
    
    def _save_state(self):
        data = {
            "keyword": self.keyword,
            "seen_ids": list(self.seen_ids),
            "last_check": datetime.now().isoformat()
        }
        self.storage_file.write_text(json.dumps(data, indent=2))
    
    async def check(self) -> list:
        """Check for new keyword matches."""
        async with Xtools() as x:
            result = await x.scrape.search(
                self.keyword,
                search_type="Latest",
                limit=100
            )
            
            new_tweets = []
            for tweet in result.tweets:
                if tweet.id not in self.seen_ids:
                    self.seen_ids.add(tweet.id)
                    new_tweets.append({
                        "id": tweet.id,
                        "text": tweet.text,
                        "author": tweet.author.username,
                        "created_at": tweet.created_at.isoformat() if tweet.created_at else None,
                        "likes": tweet.like_count,
                        "retweets": tweet.retweet_count,
                        "url": f"https://x.com/{tweet.author.username}/status/{tweet.id}"
                    })
            
            self._save_state()
            return new_tweets
    
    async def monitor(self, interval_seconds: int = 60, callback=None):
        """Continuous monitoring with optional callback."""
        print(f"🔍 Monitoring: '{self.keyword}'")
        
        while True:
            new_tweets = await self.check()
            
            if new_tweets:
                if callback:
                    await callback(self.keyword, new_tweets)
                else:
                    print(f"\n📢 {len(new_tweets)} new matches for '{self.keyword}'")
            
            await asyncio.sleep(interval_seconds)

# Usage
async def main():
    tracker = KeywordTracker("machine learning")
    await tracker.monitor(interval_seconds=60)

asyncio.run(main())
```

## Multiple Keyword Support

### Multi-Keyword Monitor

```python
import asyncio
from datetime import datetime
from xtools import Xtools

class MultiKeywordMonitor:
    def __init__(self, keywords: list):
        self.keywords = keywords
        self.seen_ids = {kw: set() for kw in keywords}
    
    async def check_all(self) -> dict:
        """Check all keywords for new matches."""
        async with Xtools() as x:
            results = {}
            
            for keyword in self.keywords:
                result = await x.scrape.search(
                    keyword,
                    search_type="Latest",
                    limit=50
                )
                
                new_tweets = []
                for tweet in result.tweets:
                    if tweet.id not in self.seen_ids[keyword]:
                        self.seen_ids[keyword].add(tweet.id)
                        new_tweets.append(tweet)
                
                if new_tweets:
                    results[keyword] = new_tweets
                
                await asyncio.sleep(2)  # Rate limiting between keywords
            
            return results
    
    async def monitor(self, interval_seconds: int = 120):
        """Monitor all keywords."""
        print(f"🔍 Monitoring {len(self.keywords)} keywords:")
        for kw in self.keywords:
            print(f"   - {kw}")
        
        while True:
            results = await self.check_all()
            
            for keyword, tweets in results.items():
                print(f"\n📢 [{keyword}] {len(tweets)} new tweets")
                for tweet in tweets[:3]:
                    print(f"   @{tweet.author.username}: {tweet.text[:60]}...")
            
            await asyncio.sleep(interval_seconds)

# Usage
async def main():
    keywords = [
        "python tips",
        "machine learning",
        "web development",
        "#coding",
        "#100DaysOfCode"
    ]
    
    monitor = MultiKeywordMonitor(keywords)
    await monitor.monitor(interval_seconds=60)

asyncio.run(main())
```

### Keyword Categories

```python
import asyncio
from dataclasses import dataclass
from typing import List, Dict
from xtools import Xtools

@dataclass
class KeywordCategory:
    name: str
    keywords: List[str]
    priority: str = "normal"  # low, normal, high

class CategorizedKeywordMonitor:
    def __init__(self, categories: List[KeywordCategory]):
        self.categories = categories
        self.seen_ids = {}
        
        for cat in categories:
            for kw in cat.keywords:
                self.seen_ids[kw] = set()
    
    async def check_category(self, category: KeywordCategory) -> Dict:
        """Check all keywords in a category."""
        async with Xtools() as x:
            results = {}
            
            for keyword in category.keywords:
                result = await x.scrape.search(
                    keyword,
                    search_type="Latest",
                    limit=30
                )
                
                new_tweets = [
                    t for t in result.tweets
                    if t.id not in self.seen_ids[keyword]
                ]
                
                for t in new_tweets:
                    self.seen_ids[keyword].add(t.id)
                
                if new_tweets:
                    results[keyword] = new_tweets
                
                await asyncio.sleep(1)
            
            return results
    
    async def monitor(self, interval_seconds: int = 120):
        """Monitor all categories."""
        while True:
            for category in self.categories:
                results = await self.check_category(category)
                
                if results:
                    priority_emoji = {
                        "high": "🔴",
                        "normal": "🟡",
                        "low": "🟢"
                    }
                    
                    print(f"\n{priority_emoji[category.priority]} [{category.name}]")
                    for keyword, tweets in results.items():
                        print(f"   '{keyword}': {len(tweets)} new")
            
            await asyncio.sleep(interval_seconds)

# Usage
categories = [
    KeywordCategory(
        name="Brand Mentions",
        keywords=["@mycompany", "MyCompany", "my company"],
        priority="high"
    ),
    KeywordCategory(
        name="Industry",
        keywords=["#saas", "#startup", "product launch"],
        priority="normal"
    ),
    KeywordCategory(
        name="Competitors",
        keywords=["competitor1", "competitor2"],
        priority="low"
    )
]

monitor = CategorizedKeywordMonitor(categories)
asyncio.run(monitor.monitor())
```

## Sentiment Filtering

### Basic Sentiment Filter

```python
import asyncio
from xtools import Xtools
from xtools.ai import SentimentAnalyzer

class SentimentFilteredMonitor:
    def __init__(self, keyword: str, target_sentiment: str = None):
        self.keyword = keyword
        self.target_sentiment = target_sentiment  # positive, negative, neutral, or None for all
        self.analyzer = SentimentAnalyzer()
        self.seen_ids = set()
    
    async def check(self) -> list:
        """Check for keyword with sentiment filter."""
        async with Xtools() as x:
            result = await x.scrape.search(
                self.keyword,
                search_type="Latest",
                limit=50
            )
            
            matches = []
            
            for tweet in result.tweets:
                if tweet.id in self.seen_ids:
                    continue
                
                self.seen_ids.add(tweet.id)
                
                # Analyze sentiment
                sentiment = await self.analyzer.analyze(tweet.text)
                
                # Filter by sentiment if specified
                if self.target_sentiment and sentiment.label != self.target_sentiment:
                    continue
                
                matches.append({
                    "tweet": tweet,
                    "sentiment": sentiment.label,
                    "confidence": sentiment.score
                })
            
            return matches

# Usage
async def main():
    # Monitor for negative mentions only
    monitor = SentimentFilteredMonitor(
        "MyProduct",
        target_sentiment="negative"
    )
    
    while True:
        matches = await monitor.check()
        
        for match in matches:
            tweet = match["tweet"]
            print(f"\n⚠️ Negative mention detected:")
            print(f"   @{tweet.author.username}: {tweet.text[:100]}")
            print(f"   Sentiment: {match['sentiment']} ({match['confidence']:.2f})")
        
        await asyncio.sleep(60)

asyncio.run(main())
```

### Sentiment Analytics

```python
import asyncio
from collections import defaultdict
from datetime import datetime
from xtools import Xtools
from xtools.ai import SentimentAnalyzer

class SentimentAnalytics:
    def __init__(self, keyword: str):
        self.keyword = keyword
        self.analyzer = SentimentAnalyzer()
        self.stats = defaultdict(int)
        self.hourly_stats = defaultdict(lambda: defaultdict(int))
    
    async def analyze_batch(self, limit: int = 100) -> dict:
        """Analyze sentiment distribution for keyword."""
        async with Xtools() as x:
            result = await x.scrape.search(
                self.keyword,
                search_type="Latest",
                limit=limit
            )
            
            batch_stats = defaultdict(int)
            
            for tweet in result.tweets:
                sentiment = await self.analyzer.analyze(tweet.text)
                batch_stats[sentiment.label] += 1
                self.stats[sentiment.label] += 1
                
                # Track hourly
                hour = datetime.now().strftime("%Y-%m-%d %H:00")
                self.hourly_stats[hour][sentiment.label] += 1
            
            total = sum(batch_stats.values())
            
            return {
                "keyword": self.keyword,
                "total": total,
                "positive": batch_stats["positive"],
                "negative": batch_stats["negative"],
                "neutral": batch_stats["neutral"],
                "positive_pct": (batch_stats["positive"] / total * 100) if total else 0,
                "negative_pct": (batch_stats["negative"] / total * 100) if total else 0
            }
    
    def get_summary(self) -> dict:
        """Get overall sentiment summary."""
        total = sum(self.stats.values())
        return {
            "total_analyzed": total,
            "positive_pct": (self.stats["positive"] / total * 100) if total else 0,
            "negative_pct": (self.stats["negative"] / total * 100) if total else 0,
            "neutral_pct": (self.stats["neutral"] / total * 100) if total else 0
        }

# Usage
async def main():
    analytics = SentimentAnalytics("Python programming")
    
    result = await analytics.analyze_batch(limit=100)
    
    print(f"📊 Sentiment Analysis for '{result['keyword']}'")
    print(f"   Total: {result['total']} tweets")
    print(f"   ✅ Positive: {result['positive_pct']:.1f}%")
    print(f"   ❌ Negative: {result['negative_pct']:.1f}%")
    print(f"   ➖ Neutral: {100 - result['positive_pct'] - result['negative_pct']:.1f}%")

asyncio.run(main())
```

## Engagement Thresholds

### High-Engagement Filter

```python
import asyncio
from dataclasses import dataclass
from xtools import Xtools

@dataclass
class EngagementThreshold:
    min_likes: int = 0
    min_retweets: int = 0
    min_replies: int = 0
    min_total: int = 0

class HighEngagementMonitor:
    def __init__(self, keyword: str, threshold: EngagementThreshold):
        self.keyword = keyword
        self.threshold = threshold
        self.seen_ids = set()
    
    def _meets_threshold(self, tweet) -> bool:
        """Check if tweet meets engagement threshold."""
        total = tweet.like_count + tweet.retweet_count + tweet.reply_count
        
        return (
            tweet.like_count >= self.threshold.min_likes and
            tweet.retweet_count >= self.threshold.min_retweets and
            tweet.reply_count >= self.threshold.min_replies and
            total >= self.threshold.min_total
        )
    
    async def check(self) -> list:
        """Find high-engagement tweets."""
        async with Xtools() as x:
            result = await x.scrape.search(
                self.keyword,
                search_type="Top",  # Top results have higher engagement
                limit=50
            )
            
            high_engagement = []
            
            for tweet in result.tweets:
                if tweet.id in self.seen_ids:
                    continue
                
                if self._meets_threshold(tweet):
                    self.seen_ids.add(tweet.id)
                    high_engagement.append(tweet)
            
            return high_engagement
    
    async def monitor(self, interval_seconds: int = 300):
        """Monitor for high-engagement content."""
        print(f"🔍 Monitoring '{self.keyword}' for high engagement")
        print(f"   Thresholds: {self.threshold.min_likes}+ likes, "
              f"{self.threshold.min_retweets}+ RTs")
        
        while True:
            matches = await self.check()
            
            for tweet in matches:
                print(f"\n🔥 High-engagement tweet found:")
                print(f"   @{tweet.author.username} ({tweet.author.followers_count:,} followers)")
                print(f"   {tweet.text[:100]}...")
                print(f"   ❤️ {tweet.like_count:,} | 🔁 {tweet.retweet_count:,}")
            
            await asyncio.sleep(interval_seconds)

# Usage
threshold = EngagementThreshold(
    min_likes=100,
    min_retweets=20,
    min_total=150
)

monitor = HighEngagementMonitor("artificial intelligence", threshold)
asyncio.run(monitor.monitor())
```

## Notification Callbacks

### Callback System

```python
import asyncio
from typing import Callable, List
from xtools import Xtools
from xtools.notifications import DiscordNotifier, TelegramNotifier

class CallbackKeywordMonitor:
    def __init__(self, keyword: str):
        self.keyword = keyword
        self.seen_ids = set()
        self.callbacks: List[Callable] = []
    
    def add_callback(self, callback: Callable):
        """Add a callback function."""
        self.callbacks.append(callback)
    
    async def _trigger_callbacks(self, tweets: list):
        """Trigger all callbacks with new tweets."""
        for callback in self.callbacks:
            try:
                if asyncio.iscoroutinefunction(callback):
                    await callback(self.keyword, tweets)
                else:
                    callback(self.keyword, tweets)
            except Exception as e:
                print(f"Callback error: {e}")
    
    async def check(self):
        """Check and trigger callbacks for new tweets."""
        async with Xtools() as x:
            result = await x.scrape.search(
                self.keyword,
                search_type="Latest",
                limit=50
            )
            
            new_tweets = [
                t for t in result.tweets
                if t.id not in self.seen_ids
            ]
            
            for t in new_tweets:
                self.seen_ids.add(t.id)
            
            if new_tweets:
                await self._trigger_callbacks(new_tweets)

# Define callbacks
async def discord_callback(keyword: str, tweets: list):
    notifier = DiscordNotifier("https://discord.com/api/webhooks/...")
    await notifier.send(
        title=f"New mentions: {keyword}",
        message=f"{len(tweets)} new tweets found"
    )

async def log_callback(keyword: str, tweets: list):
    with open("keyword_log.txt", "a") as f:
        for t in tweets:
            f.write(f"{keyword}|{t.id}|{t.author.username}|{t.text[:100]}\n")

def print_callback(keyword: str, tweets: list):
    print(f"[{keyword}] {len(tweets)} new tweets")

# Usage
async def main():
    monitor = CallbackKeywordMonitor("python tips")
    
    monitor.add_callback(discord_callback)
    monitor.add_callback(log_callback)
    monitor.add_callback(print_callback)
    
    while True:
        await monitor.check()
        await asyncio.sleep(60)

asyncio.run(main())
```

## Use Case: Brand Monitoring

### Complete Brand Monitoring System

```python
import asyncio
import json
from datetime import datetime
from pathlib import Path
from dataclasses import dataclass
from typing import List, Optional
from xtools import Xtools
from xtools.ai import SentimentAnalyzer
from xtools.notifications import DiscordNotifier

@dataclass
class BrandConfig:
    brand_name: str
    keywords: List[str]
    competitors: List[str] = None
    alert_on_negative: bool = True
    alert_threshold_likes: int = 50
    discord_webhook: Optional[str] = None

class BrandMonitor:
    def __init__(self, config: BrandConfig):
        self.config = config
        self.analyzer = SentimentAnalyzer()
        self.seen_ids = set()
        self.storage_dir = Path(f"brand_monitor_{config.brand_name}")
        self.storage_dir.mkdir(exist_ok=True)
        
        if config.discord_webhook:
            self.notifier = DiscordNotifier(config.discord_webhook)
        else:
            self.notifier = None
    
    async def check_mentions(self) -> dict:
        """Check all brand keywords."""
        async with Xtools() as x:
            all_keywords = self.config.keywords.copy()
            if self.config.competitors:
                all_keywords.extend(self.config.competitors)
            
            results = {
                "brand_mentions": [],
                "competitor_mentions": [],
                "negative_alerts": [],
                "high_engagement": []
            }
            
            for keyword in all_keywords:
                is_competitor = keyword in (self.config.competitors or [])
                
                result = await x.scrape.search(
                    keyword,
                    search_type="Latest",
                    limit=30
                )
                
                for tweet in result.tweets:
                    if tweet.id in self.seen_ids:
                        continue
                    
                    self.seen_ids.add(tweet.id)
                    
                    # Analyze sentiment
                    sentiment = await self.analyzer.analyze(tweet.text)
                    
                    mention = {
                        "id": tweet.id,
                        "text": tweet.text,
                        "author": tweet.author.username,
                        "followers": tweet.author.followers_count,
                        "likes": tweet.like_count,
                        "sentiment": sentiment.label,
                        "keyword": keyword,
                        "url": f"https://x.com/{tweet.author.username}/status/{tweet.id}",
                        "timestamp": datetime.now().isoformat()
                    }
                    
                    # Categorize
                    if is_competitor:
                        results["competitor_mentions"].append(mention)
                    else:
                        results["brand_mentions"].append(mention)
                    
                    # Check for alerts
                    if sentiment.label == "negative" and self.config.alert_on_negative:
                        results["negative_alerts"].append(mention)
                    
                    if tweet.like_count >= self.config.alert_threshold_likes:
                        results["high_engagement"].append(mention)
                
                await asyncio.sleep(2)
            
            return results
    
    async def send_alerts(self, results: dict):
        """Send alerts for important mentions."""
        if not self.notifier:
            return
        
        # Negative mentions alert
        for mention in results["negative_alerts"]:
            await self.notifier.send(
                title=f"⚠️ Negative Mention: {self.config.brand_name}",
                message=(
                    f"@{mention['author']} ({mention['followers']:,} followers)\n"
                    f"{mention['text'][:200]}\n"
                    f"[View Tweet]({mention['url']})"
                ),
                color=0xFF0000
            )
        
        # High engagement alert
        for mention in results["high_engagement"]:
            if mention not in results["negative_alerts"]:  # Avoid duplicates
                await self.notifier.send(
                    title=f"🔥 High Engagement: {self.config.brand_name}",
                    message=(
                        f"@{mention['author']}\n"
                        f"{mention['text'][:200]}\n"
                        f"❤️ {mention['likes']} likes"
                    ),
                    color=0x00FF00
                )
    
    def save_report(self, results: dict):
        """Save daily report."""
        date_str = datetime.now().strftime("%Y-%m-%d")
        report_file = self.storage_dir / f"report_{date_str}.json"
        
        # Load existing or create new
        if report_file.exists():
            report = json.loads(report_file.read_text())
        else:
            report = {"date": date_str, "mentions": []}
        
        report["mentions"].extend(results["brand_mentions"])
        report_file.write_text(json.dumps(report, indent=2))
    
    async def monitor(self, interval_minutes: int = 15):
        """Run continuous monitoring."""
        print(f"🔍 Brand Monitor: {self.config.brand_name}")
        print(f"   Keywords: {', '.join(self.config.keywords)}")
        if self.config.competitors:
            print(f"   Competitors: {', '.join(self.config.competitors)}")
        
        while True:
            results = await self.check_mentions()
            
            # Summary
            total = len(results["brand_mentions"]) + len(results["competitor_mentions"])
            if total:
                print(f"\n[{datetime.now().strftime('%H:%M')}] "
                      f"{len(results['brand_mentions'])} brand, "
                      f"{len(results['competitor_mentions'])} competitor, "
                      f"{len(results['negative_alerts'])} negative")
            
            # Send alerts
            await self.send_alerts(results)
            
            # Save report
            self.save_report(results)
            
            await asyncio.sleep(interval_minutes * 60)

# Usage
config = BrandConfig(
    brand_name="MyStartup",
    keywords=["MyStartup", "@mystartup", "mystartup.com"],
    competitors=["Competitor1", "Competitor2"],
    alert_on_negative=True,
    alert_threshold_likes=100,
    discord_webhook="https://discord.com/api/webhooks/..."
)

monitor = BrandMonitor(config)
asyncio.run(monitor.monitor(interval_minutes=10))
```

## Next Steps

- [Growth Monitoring](growth.md) - Track follower changes
- [Account Monitoring](accounts.md) - Track profile changes
- [Engagement Monitoring](engagement.md) - Track interactions
