# Real-Time Brand Monitoring System

Build a comprehensive brand monitoring system that tracks mentions, analyzes sentiment, and alerts you to important conversations about your brand.

---

## Overview

This recipe creates a production-ready brand monitoring system with:

- **Multi-keyword tracking** - Brand names, products, misspellings
- **Sentiment scoring** - Real-time sentiment analysis
- **Competitor comparison** - Track competitors alongside your brand
- **Influencer alerts** - Prioritize high-impact mentions
- **Health scoring** - Weekly brand health metrics
- **Crisis detection** - Early warning system

---

## Architecture

```
┌─────────────────┐     ┌──────────────┐     ┌─────────────────┐
│  Keyword        │────▶│   Sentiment  │────▶│   Alert         │
│  Tracker        │     │   Analyzer   │     │   Router        │
└─────────────────┘     └──────────────┘     └─────────────────┘
        │                       │                     │
        ▼                       ▼                     ▼
┌─────────────────┐     ┌──────────────┐     ┌─────────────────┐
│  SQLite         │     │   Dashboard  │     │  Notifications  │
│  Storage        │     │   Generator  │     │  (Discord/etc)  │
└─────────────────┘     └──────────────┘     └─────────────────┘
```

---

## Complete Implementation

### Configuration

```python
# brand_monitor_config.py
from dataclasses import dataclass, field
from typing import Optional

@dataclass
class BrandConfig:
    """Configuration for brand monitoring."""
    
    # Brand keywords (include misspellings!)
    brand_keywords: list[str] = field(default_factory=lambda: [
        "xeepy",
        "xeepy.io",
        "@xeepy",
        "#xeepy",
    ])
    
    # Product keywords
    product_keywords: list[str] = field(default_factory=lambda: [
        "xeepy scraper",
        "xeepy bot",
        "xeepy automation",
    ])
    
    # Competitor keywords
    competitor_keywords: dict[str, list[str]] = field(default_factory=lambda: {
        "competitor_a": ["competitorA", "@competitorA"],
        "competitor_b": ["competitorB", "@competitorB"],
    })
    
    # Influencer thresholds
    influencer_follower_threshold: int = 10000
    viral_engagement_threshold: int = 100
    
    # Alert settings
    negative_sentiment_threshold: float = -0.3
    crisis_mention_spike: int = 50  # % increase triggers alert
    
    # Notification webhooks
    discord_webhook: Optional[str] = None
    slack_webhook: Optional[str] = None
    
    # Scanning interval (seconds)
    scan_interval: int = 300  # 5 minutes
```

### Database Schema

```python
# brand_monitor_db.py
import sqlite3
from datetime import datetime
from typing import Optional
from contextlib import contextmanager

class BrandMonitorDB:
    """SQLite database for brand monitoring data."""
    
    def __init__(self, db_path: str = "brand_monitor.db"):
        self.db_path = db_path
        self._init_db()
    
    @contextmanager
    def _get_connection(self):
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        try:
            yield conn
        finally:
            conn.close()
    
    def _init_db(self):
        with self._get_connection() as conn:
            conn.executescript("""
                CREATE TABLE IF NOT EXISTS mentions (
                    id INTEGER PRIMARY KEY,
                    tweet_id TEXT UNIQUE,
                    author_username TEXT,
                    author_followers INTEGER,
                    text TEXT,
                    sentiment_score REAL,
                    sentiment_label TEXT,
                    keyword_matched TEXT,
                    keyword_category TEXT,
                    engagement_score INTEGER,
                    is_influencer BOOLEAN,
                    created_at TIMESTAMP,
                    scraped_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                );
                
                CREATE TABLE IF NOT EXISTS daily_metrics (
                    id INTEGER PRIMARY KEY,
                    date DATE UNIQUE,
                    total_mentions INTEGER,
                    positive_mentions INTEGER,
                    neutral_mentions INTEGER,
                    negative_mentions INTEGER,
                    avg_sentiment REAL,
                    influencer_mentions INTEGER,
                    total_reach INTEGER,
                    brand_health_score REAL
                );
                
                CREATE TABLE IF NOT EXISTS competitor_metrics (
                    id INTEGER PRIMARY KEY,
                    date DATE,
                    competitor_name TEXT,
                    total_mentions INTEGER,
                    avg_sentiment REAL,
                    UNIQUE(date, competitor_name)
                );
                
                CREATE TABLE IF NOT EXISTS alerts (
                    id INTEGER PRIMARY KEY,
                    alert_type TEXT,
                    severity TEXT,
                    message TEXT,
                    tweet_id TEXT,
                    handled BOOLEAN DEFAULT FALSE,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                );
                
                CREATE INDEX IF NOT EXISTS idx_mentions_date 
                ON mentions(created_at);
                
                CREATE INDEX IF NOT EXISTS idx_mentions_sentiment 
                ON mentions(sentiment_label);
            """)
            conn.commit()
    
    def save_mention(self, mention: dict):
        with self._get_connection() as conn:
            conn.execute("""
                INSERT OR REPLACE INTO mentions 
                (tweet_id, author_username, author_followers, text,
                 sentiment_score, sentiment_label, keyword_matched,
                 keyword_category, engagement_score, is_influencer, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                mention['tweet_id'],
                mention['author_username'],
                mention['author_followers'],
                mention['text'],
                mention['sentiment_score'],
                mention['sentiment_label'],
                mention['keyword_matched'],
                mention['keyword_category'],
                mention['engagement_score'],
                mention['is_influencer'],
                mention['created_at']
            ))
            conn.commit()
    
    def get_mentions_since(self, since: datetime) -> list[dict]:
        with self._get_connection() as conn:
            rows = conn.execute("""
                SELECT * FROM mentions 
                WHERE scraped_at >= ?
                ORDER BY created_at DESC
            """, (since,)).fetchall()
            return [dict(row) for row in rows]
    
    def get_daily_stats(self, date: datetime) -> dict:
        with self._get_connection() as conn:
            row = conn.execute("""
                SELECT 
                    COUNT(*) as total,
                    SUM(CASE WHEN sentiment_label = 'positive' THEN 1 ELSE 0 END) as positive,
                    SUM(CASE WHEN sentiment_label = 'neutral' THEN 1 ELSE 0 END) as neutral,
                    SUM(CASE WHEN sentiment_label = 'negative' THEN 1 ELSE 0 END) as negative,
                    AVG(sentiment_score) as avg_sentiment,
                    SUM(CASE WHEN is_influencer THEN 1 ELSE 0 END) as influencer_mentions,
                    SUM(author_followers) as total_reach
                FROM mentions
                WHERE DATE(created_at) = DATE(?)
            """, (date,)).fetchone()
            return dict(row) if row else {}
```

### Sentiment Analyzer

```python
# sentiment_analyzer.py
from dataclasses import dataclass
from typing import Optional
import re

@dataclass
class SentimentResult:
    score: float  # -1.0 to 1.0
    label: str    # positive, neutral, negative
    confidence: float
    keywords_found: list[str]

class SentimentAnalyzer:
    """Analyze sentiment of brand mentions."""
    
    # Positive indicators
    POSITIVE_WORDS = {
        'love', 'amazing', 'awesome', 'great', 'excellent', 'fantastic',
        'best', 'perfect', 'helpful', 'useful', 'recommend', 'impressed',
        'thank', 'thanks', 'grateful', 'solved', 'works', 'easy', 'fast',
        '🔥', '❤️', '💯', '👍', '🙌', '✨', '🚀'
    }
    
    # Negative indicators
    NEGATIVE_WORDS = {
        'hate', 'terrible', 'awful', 'worst', 'bad', 'broken', 'bug',
        'issue', 'problem', 'disappointed', 'frustrating', 'useless',
        'scam', 'spam', 'fake', 'slow', 'crash', 'error', 'fail',
        '👎', '😡', '🤮', '💩', '😤'
    }
    
    # Intensifiers
    INTENSIFIERS = {'very', 'really', 'extremely', 'absolutely', 'totally'}
    
    # Negators
    NEGATORS = {"not", "isn't", "aren't", "wasn't", "weren't", "don't", 
                "doesn't", "didn't", "won't", "wouldn't", "can't", "couldn't"}
    
    def analyze(self, text: str) -> SentimentResult:
        """Analyze sentiment of text."""
        text_lower = text.lower()
        words = set(re.findall(r'\w+', text_lower))
        
        # Find sentiment words
        pos_found = words & self.POSITIVE_WORDS
        neg_found = words & self.NEGATIVE_WORDS
        
        # Check for emoji sentiment
        for emoji in self.POSITIVE_WORDS:
            if emoji in text:
                pos_found.add(emoji)
        for emoji in self.NEGATIVE_WORDS:
            if emoji in text:
                neg_found.add(emoji)
        
        # Calculate base score
        pos_score = len(pos_found)
        neg_score = len(neg_found)
        
        # Check for intensifiers
        intensifier_count = len(words & self.INTENSIFIERS)
        
        # Check for negators (flip sentiment)
        has_negator = bool(words & self.NEGATORS)
        
        # Calculate final score
        if pos_score == 0 and neg_score == 0:
            score = 0.0
            label = 'neutral'
            confidence = 0.5
        else:
            raw_score = (pos_score - neg_score) / (pos_score + neg_score)
            
            # Apply intensifier boost
            if intensifier_count > 0:
                raw_score *= (1 + 0.2 * intensifier_count)
            
            # Apply negator flip
            if has_negator:
                raw_score *= -0.5
            
            # Clamp to [-1, 1]
            score = max(-1.0, min(1.0, raw_score))
            
            # Determine label
            if score > 0.1:
                label = 'positive'
            elif score < -0.1:
                label = 'negative'
            else:
                label = 'neutral'
            
            # Confidence based on evidence
            confidence = min(1.0, (pos_score + neg_score) / 5)
        
        return SentimentResult(
            score=round(score, 3),
            label=label,
            confidence=round(confidence, 3),
            keywords_found=list(pos_found | neg_found)
        )
```

### Main Monitor System

```python
# brand_monitor.py
import asyncio
from datetime import datetime, timedelta
from typing import Optional
from dataclasses import dataclass

from xeepy import Xeepy
from xeepy.notifications import DiscordNotifier

from brand_monitor_config import BrandConfig
from brand_monitor_db import BrandMonitorDB
from sentiment_analyzer import SentimentAnalyzer

@dataclass
class MentionAlert:
    alert_type: str  # influencer, negative, viral, crisis
    severity: str    # low, medium, high, critical
    mention: dict
    message: str

class BrandMonitor:
    """Real-time brand monitoring system."""
    
    def __init__(self, config: BrandConfig):
        self.config = config
        self.db = BrandMonitorDB()
        self.sentiment = SentimentAnalyzer()
        self.notifier = None
        
        if config.discord_webhook:
            self.notifier = DiscordNotifier(config.discord_webhook)
        
        # Build keyword search query
        all_keywords = (
            config.brand_keywords + 
            config.product_keywords
        )
        self.search_query = " OR ".join(f'"{kw}"' for kw in all_keywords)
    
    async def scan_mentions(self) -> list[dict]:
        """Scan for new brand mentions."""
        async with Xeepy() as x:
            # Search for brand mentions
            results = await x.scrape.search(
                query=self.search_query,
                limit=100,
                result_type="Latest"
            )
            
            processed = []
            for tweet in results:
                # Analyze sentiment
                sentiment = self.sentiment.analyze(tweet.text)
                
                # Determine which keyword matched
                keyword_matched = self._find_matched_keyword(tweet.text)
                
                # Calculate engagement score
                engagement = (
                    tweet.like_count + 
                    tweet.retweet_count * 2 + 
                    tweet.reply_count * 3
                )
                
                # Check if influencer
                is_influencer = (
                    tweet.author.followers_count >= 
                    self.config.influencer_follower_threshold
                )
                
                mention = {
                    'tweet_id': tweet.id,
                    'author_username': tweet.author.username,
                    'author_followers': tweet.author.followers_count,
                    'text': tweet.text,
                    'sentiment_score': sentiment.score,
                    'sentiment_label': sentiment.label,
                    'keyword_matched': keyword_matched,
                    'keyword_category': self._get_keyword_category(keyword_matched),
                    'engagement_score': engagement,
                    'is_influencer': is_influencer,
                    'created_at': tweet.created_at,
                }
                
                # Save to database
                self.db.save_mention(mention)
                processed.append(mention)
                
                # Check for alerts
                alert = self._check_alerts(mention)
                if alert:
                    await self._send_alert(alert)
            
            return processed
    
    def _find_matched_keyword(self, text: str) -> str:
        """Find which keyword matched in the text."""
        text_lower = text.lower()
        for kw in self.config.brand_keywords:
            if kw.lower() in text_lower:
                return kw
        for kw in self.config.product_keywords:
            if kw.lower() in text_lower:
                return kw
        return "unknown"
    
    def _get_keyword_category(self, keyword: str) -> str:
        """Get category for matched keyword."""
        if keyword in self.config.brand_keywords:
            return "brand"
        elif keyword in self.config.product_keywords:
            return "product"
        return "other"
    
    def _check_alerts(self, mention: dict) -> Optional[MentionAlert]:
        """Check if mention triggers any alerts."""
        # Influencer mention
        if mention['is_influencer']:
            return MentionAlert(
                alert_type='influencer',
                severity='high' if mention['sentiment_label'] == 'negative' else 'medium',
                mention=mention,
                message=f"🌟 Influencer mention from @{mention['author_username']} "
                        f"({mention['author_followers']:,} followers)"
            )
        
        # Highly negative mention
        if mention['sentiment_score'] < self.config.negative_sentiment_threshold:
            return MentionAlert(
                alert_type='negative',
                severity='medium',
                mention=mention,
                message=f"⚠️ Negative mention detected (score: {mention['sentiment_score']})"
            )
        
        # Viral mention
        if mention['engagement_score'] > self.config.viral_engagement_threshold:
            return MentionAlert(
                alert_type='viral',
                severity='high',
                mention=mention,
                message=f"🚀 Viral mention! Engagement score: {mention['engagement_score']}"
            )
        
        return None
    
    async def _send_alert(self, alert: MentionAlert):
        """Send alert notification."""
        if not self.notifier:
            print(f"[ALERT] {alert.message}")
            return
        
        color = {
            'low': 0x3498db,      # Blue
            'medium': 0xf39c12,   # Yellow
            'high': 0xe74c3c,     # Red
            'critical': 0x9b59b6  # Purple
        }.get(alert.severity, 0x95a5a6)
        
        await self.notifier.send_embed(
            title=f"Brand Alert: {alert.alert_type.title()}",
            description=alert.message,
            color=color,
            fields=[
                {"name": "Author", "value": f"@{alert.mention['author_username']}", "inline": True},
                {"name": "Sentiment", "value": alert.mention['sentiment_label'], "inline": True},
                {"name": "Tweet", "value": alert.mention['text'][:200]},
            ],
            url=f"https://x.com/i/status/{alert.mention['tweet_id']}"
        )
    
    def calculate_brand_health(self, days: int = 7) -> dict:
        """Calculate brand health score."""
        since = datetime.now() - timedelta(days=days)
        mentions = self.db.get_mentions_since(since)
        
        if not mentions:
            return {'score': 0, 'grade': 'N/A', 'mentions': 0}
        
        # Components of brand health
        total = len(mentions)
        
        # 1. Sentiment score (0-40 points)
        avg_sentiment = sum(m['sentiment_score'] for m in mentions) / total
        sentiment_score = (avg_sentiment + 1) / 2 * 40  # Normalize to 0-40
        
        # 2. Volume trend (0-20 points)
        # Compare to previous period
        prev_since = since - timedelta(days=days)
        prev_mentions = self.db.get_mentions_since(prev_since)
        prev_count = len([m for m in prev_mentions if m['scraped_at'] < since])
        
        if prev_count > 0:
            growth = (total - prev_count) / prev_count
            volume_score = min(20, max(0, 10 + growth * 10))
        else:
            volume_score = 10
        
        # 3. Influencer engagement (0-20 points)
        influencer_mentions = sum(1 for m in mentions if m['is_influencer'])
        influencer_score = min(20, influencer_mentions * 2)
        
        # 4. Positive ratio (0-20 points)
        positive = sum(1 for m in mentions if m['sentiment_label'] == 'positive')
        positive_ratio = positive / total
        positive_score = positive_ratio * 20
        
        # Total score
        total_score = sentiment_score + volume_score + influencer_score + positive_score
        
        # Grade
        if total_score >= 80:
            grade = 'A'
        elif total_score >= 60:
            grade = 'B'
        elif total_score >= 40:
            grade = 'C'
        elif total_score >= 20:
            grade = 'D'
        else:
            grade = 'F'
        
        return {
            'score': round(total_score, 1),
            'grade': grade,
            'mentions': total,
            'components': {
                'sentiment': round(sentiment_score, 1),
                'volume': round(volume_score, 1),
                'influencer': round(influencer_score, 1),
                'positive_ratio': round(positive_score, 1)
            },
            'avg_sentiment': round(avg_sentiment, 3),
            'influencer_mentions': influencer_mentions,
            'positive_ratio': round(positive_ratio, 3)
        }
    
    async def run_continuous(self):
        """Run continuous monitoring loop."""
        print(f"🚀 Starting brand monitor...")
        print(f"   Keywords: {self.search_query[:50]}...")
        print(f"   Interval: {self.config.scan_interval}s")
        
        while True:
            try:
                mentions = await self.scan_mentions()
                print(f"[{datetime.now()}] Scanned {len(mentions)} mentions")
                
                # Calculate health every hour
                if datetime.now().minute == 0:
                    health = self.calculate_brand_health()
                    print(f"   Brand Health: {health['grade']} ({health['score']}/100)")
                
            except Exception as e:
                print(f"Error during scan: {e}")
            
            await asyncio.sleep(self.config.scan_interval)
```

### Dashboard Generator

```python
# brand_dashboard.py
from datetime import datetime, timedelta
from brand_monitor_db import BrandMonitorDB

class BrandDashboard:
    """Generate brand monitoring dashboard."""
    
    def __init__(self, db: BrandMonitorDB):
        self.db = db
    
    def generate_report(self, days: int = 7) -> str:
        """Generate markdown report."""
        since = datetime.now() - timedelta(days=days)
        mentions = self.db.get_mentions_since(since)
        
        # Calculate stats
        total = len(mentions)
        positive = sum(1 for m in mentions if m['sentiment_label'] == 'positive')
        negative = sum(1 for m in mentions if m['sentiment_label'] == 'negative')
        neutral = total - positive - negative
        
        avg_sentiment = sum(m['sentiment_score'] for m in mentions) / total if total else 0
        
        influencer_mentions = [m for m in mentions if m['is_influencer']]
        
        # Top mentions by engagement
        top_mentions = sorted(mentions, key=lambda m: m['engagement_score'], reverse=True)[:5]
        
        report = f"""
# Brand Monitoring Report
**Period:** {since.strftime('%Y-%m-%d')} to {datetime.now().strftime('%Y-%m-%d')}

## Overview

| Metric | Value |
|--------|-------|
| Total Mentions | {total:,} |
| Positive | {positive:,} ({positive/total*100:.1f}%) |
| Neutral | {neutral:,} ({neutral/total*100:.1f}%) |
| Negative | {negative:,} ({negative/total*100:.1f}%) |
| Avg Sentiment | {avg_sentiment:.2f} |
| Influencer Mentions | {len(influencer_mentions):,} |

## Top Mentions

"""
        for i, m in enumerate(top_mentions, 1):
            report += f"""
### {i}. @{m['author_username']} ({m['author_followers']:,} followers)
> {m['text'][:200]}...

- Sentiment: {m['sentiment_label']} ({m['sentiment_score']})
- Engagement: {m['engagement_score']}
- [View Tweet](https://x.com/i/status/{m['tweet_id']})

"""
        
        return report
```

### Usage Example

```python
# main.py
import asyncio
from brand_monitor import BrandMonitor
from brand_monitor_config import BrandConfig

async def main():
    # Configure for your brand
    config = BrandConfig(
        brand_keywords=[
            "YourBrand",
            "yourbrand",
            "@YourBrand",
            "#YourBrand",
        ],
        product_keywords=[
            "YourProduct",
            "your product",
        ],
        discord_webhook="https://discord.com/api/webhooks/...",
        scan_interval=300,  # 5 minutes
    )
    
    monitor = BrandMonitor(config)
    
    # Run continuous monitoring
    await monitor.run_continuous()

if __name__ == "__main__":
    asyncio.run(main())
```

---

## Advanced Features

### Competitor Comparison

```python
async def compare_competitors(self):
    """Compare brand metrics against competitors."""
    results = {'brand': await self._get_brand_metrics()}
    
    for name, keywords in self.config.competitor_keywords.items():
        query = " OR ".join(f'"{kw}"' for kw in keywords)
        
        async with Xeepy() as x:
            tweets = await x.scrape.search(query, limit=100)
            
            sentiments = [self.sentiment.analyze(t.text) for t in tweets]
            avg_sentiment = sum(s.score for s in sentiments) / len(sentiments)
            
            results[name] = {
                'mentions': len(tweets),
                'avg_sentiment': avg_sentiment,
                'positive_ratio': sum(1 for s in sentiments if s.label == 'positive') / len(sentiments)
            }
    
    return results
```

### Weekly Report Automation

```python
async def send_weekly_report():
    """Send weekly brand report."""
    monitor = BrandMonitor(BrandConfig())
    dashboard = BrandDashboard(monitor.db)
    
    report = dashboard.generate_report(days=7)
    health = monitor.calculate_brand_health(days=7)
    
    # Send via Discord
    await monitor.notifier.send_embed(
        title="📊 Weekly Brand Report",
        description=f"Brand Health: **{health['grade']}** ({health['score']}/100)",
        fields=[
            {"name": "Total Mentions", "value": str(health['mentions']), "inline": True},
            {"name": "Avg Sentiment", "value": f"{health['avg_sentiment']:.2f}", "inline": True},
        ]
    )
```

---

## Best Practices

!!! tip "Keyword Selection"
    - Include common misspellings
    - Add both @ mentions and hashtags
    - Consider product names separately
    - Monitor CEO/founder names for reputation

!!! warning "Rate Limiting"
    - Space out competitor scans
    - Use longer intervals during low-activity hours
    - Cache results to reduce API calls

!!! success "Response Strategy"
    - Respond to influencers within 1 hour
    - Acknowledge negative feedback quickly
    - Amplify positive mentions

---

## Related Recipes

- [Crisis Detection System](crisis-detection.md) - Automated crisis response
- [Influencer Mapping](influencer-mapping.md) - Network analysis
- [Sentiment Analysis Guide](../../guides/ai/sentiment.md) - Deep sentiment analysis
