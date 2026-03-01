# AI-Powered Crisis Detection System

Build an automated crisis detection system that identifies reputation threats before they go viral and enables rapid response.

---

## Overview

This recipe creates an intelligent crisis detection system with:

- **Anomaly detection** - Identify unusual mention spikes
- **Sentiment monitoring** - Track negative sentiment trends
- **Viral detection** - Catch spreading negative content early
- **Automated escalation** - Alert the right people immediately
- **Response tracking** - Monitor crisis resolution
- **Post-crisis analysis** - Learn from incidents

---

## System Architecture

```
┌─────────────────┐     ┌──────────────┐     ┌─────────────────┐
│  Real-time      │────▶│   Anomaly    │────▶│   Severity      │
│  Monitor        │     │   Detector   │     │   Classifier    │
└─────────────────┘     └──────────────┘     └─────────────────┘
                               │                     │
                               ▼                     ▼
                        ┌──────────────┐     ┌─────────────────┐
                        │  Baseline    │     │   Escalation    │
                        │  Tracker     │     │   Engine        │
                        └──────────────┘     └─────────────────┘
                                                     │
                               ┌─────────────────────┼─────────────────────┐
                               ▼                     ▼                     ▼
                        ┌──────────────┐     ┌──────────────┐     ┌──────────────┐
                        │   Discord    │     │   Telegram   │     │   PagerDuty  │
                        │   Alerts     │     │   Alerts     │     │   Escalation │
                        └──────────────┘     └──────────────┘     └──────────────┘
```

---

## Complete Implementation

### Crisis Data Models

```python
# crisis_models.py
from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum
from typing import Optional

class CrisisSeverity(Enum):
    LOW = "low"           # Minor complaint
    MEDIUM = "medium"     # Growing issue
    HIGH = "high"         # Significant threat
    CRITICAL = "critical" # Viral crisis

class CrisisType(Enum):
    SENTIMENT_SPIKE = "sentiment_spike"
    VOLUME_SPIKE = "volume_spike"
    INFLUENCER_NEGATIVE = "influencer_negative"
    VIRAL_NEGATIVE = "viral_negative"
    KEYWORD_TRIGGER = "keyword_trigger"
    COORDINATED_ATTACK = "coordinated_attack"

@dataclass
class CrisisEvent:
    id: str
    crisis_type: CrisisType
    severity: CrisisSeverity
    detected_at: datetime
    trigger_tweets: list[str]
    affected_keywords: list[str]
    metrics: dict
    status: str = "active"  # active, monitoring, resolved
    assigned_to: Optional[str] = None
    resolution_notes: Optional[str] = None
    resolved_at: Optional[datetime] = None

@dataclass
class BaselineMetrics:
    """Normal operating metrics for comparison."""
    avg_hourly_mentions: float
    avg_sentiment: float
    sentiment_std_dev: float
    avg_negative_ratio: float
    typical_engagement: float
    calculated_at: datetime
```

### Anomaly Detector

```python
# anomaly_detector.py
import statistics
from datetime import datetime, timedelta
from collections import deque
from typing import Optional

from crisis_models import CrisisType, BaselineMetrics

class AnomalyDetector:
    """Detect anomalies in brand mention patterns."""
    
    def __init__(
        self,
        volume_threshold: float = 2.5,    # Std devs for volume spike
        sentiment_threshold: float = 2.0,  # Std devs for sentiment drop
        window_hours: int = 24,            # Baseline window
    ):
        self.volume_threshold = volume_threshold
        self.sentiment_threshold = sentiment_threshold
        self.window_hours = window_hours
        
        # Rolling windows for baseline calculation
        self.hourly_volumes = deque(maxlen=window_hours * 7)  # 1 week
        self.hourly_sentiments = deque(maxlen=window_hours * 7)
        
        self.baseline: Optional[BaselineMetrics] = None
    
    def update_baseline(self, hourly_volume: int, avg_sentiment: float):
        """Update rolling baseline with new hourly data."""
        self.hourly_volumes.append(hourly_volume)
        self.hourly_sentiments.append(avg_sentiment)
        
        if len(self.hourly_volumes) >= 24:  # Need at least 1 day
            self._calculate_baseline()
    
    def _calculate_baseline(self):
        """Calculate baseline metrics from historical data."""
        volumes = list(self.hourly_volumes)
        sentiments = list(self.hourly_sentiments)
        
        self.baseline = BaselineMetrics(
            avg_hourly_mentions=statistics.mean(volumes),
            avg_sentiment=statistics.mean(sentiments),
            sentiment_std_dev=statistics.stdev(sentiments) if len(sentiments) > 1 else 0.1,
            avg_negative_ratio=sum(1 for s in sentiments if s < -0.1) / len(sentiments),
            typical_engagement=statistics.median(volumes) * 10,  # Rough estimate
            calculated_at=datetime.now()
        )
    
    def detect_volume_spike(self, current_volume: int) -> Optional[dict]:
        """Detect unusual volume increase."""
        if not self.baseline:
            return None
        
        if self.baseline.avg_hourly_mentions == 0:
            return None
        
        z_score = (
            (current_volume - self.baseline.avg_hourly_mentions) /
            max(statistics.stdev(self.hourly_volumes), 1)
        )
        
        if z_score > self.volume_threshold:
            return {
                'type': CrisisType.VOLUME_SPIKE,
                'z_score': z_score,
                'current': current_volume,
                'baseline': self.baseline.avg_hourly_mentions,
                'increase_pct': (current_volume / self.baseline.avg_hourly_mentions - 1) * 100
            }
        
        return None
    
    def detect_sentiment_drop(self, current_sentiment: float) -> Optional[dict]:
        """Detect unusual sentiment decrease."""
        if not self.baseline:
            return None
        
        z_score = (
            (self.baseline.avg_sentiment - current_sentiment) /
            max(self.baseline.sentiment_std_dev, 0.1)
        )
        
        if z_score > self.sentiment_threshold:
            return {
                'type': CrisisType.SENTIMENT_SPIKE,
                'z_score': z_score,
                'current': current_sentiment,
                'baseline': self.baseline.avg_sentiment,
                'drop': self.baseline.avg_sentiment - current_sentiment
            }
        
        return None
    
    def detect_negative_ratio_spike(
        self, 
        negative_count: int, 
        total_count: int
    ) -> Optional[dict]:
        """Detect spike in negative mention ratio."""
        if not self.baseline or total_count == 0:
            return None
        
        current_ratio = negative_count / total_count
        baseline_ratio = self.baseline.avg_negative_ratio
        
        # Alert if negative ratio doubles or exceeds 30%
        if current_ratio > baseline_ratio * 2 or current_ratio > 0.3:
            return {
                'type': CrisisType.SENTIMENT_SPIKE,
                'current_ratio': current_ratio,
                'baseline_ratio': baseline_ratio,
                'negative_count': negative_count,
                'total_count': total_count
            }
        
        return None
```

### Severity Classifier

```python
# severity_classifier.py
from crisis_models import CrisisSeverity, CrisisType

class SeverityClassifier:
    """Classify crisis severity based on multiple factors."""
    
    def __init__(
        self,
        influencer_threshold: int = 50000,
        viral_engagement_threshold: int = 500,
        critical_keywords: list[str] = None
    ):
        self.influencer_threshold = influencer_threshold
        self.viral_engagement_threshold = viral_engagement_threshold
        self.critical_keywords = critical_keywords or [
            'lawsuit', 'fraud', 'scam', 'hack', 'breach', 'leaked',
            'racist', 'sexist', 'discrimination', 'harassment', 'assault',
            'death', 'injury', 'recall', 'investigation', 'fbi', 'sec'
        ]
    
    def classify(
        self,
        crisis_type: CrisisType,
        mentions: list[dict],
        anomaly_data: dict
    ) -> CrisisSeverity:
        """Classify severity of a crisis event."""
        score = 0
        
        # Factor 1: Volume/Sentiment anomaly severity
        z_score = anomaly_data.get('z_score', 0)
        if z_score > 4:
            score += 40
        elif z_score > 3:
            score += 25
        elif z_score > 2:
            score += 10
        
        # Factor 2: Influencer involvement
        influencer_mentions = [
            m for m in mentions 
            if m.get('author_followers', 0) >= self.influencer_threshold
        ]
        if len(influencer_mentions) >= 3:
            score += 30
        elif len(influencer_mentions) >= 1:
            score += 15
        
        # Factor 3: Viral engagement
        max_engagement = max(
            (m.get('engagement_score', 0) for m in mentions), 
            default=0
        )
        if max_engagement > self.viral_engagement_threshold * 2:
            score += 25
        elif max_engagement > self.viral_engagement_threshold:
            score += 15
        
        # Factor 4: Critical keyword presence
        all_text = " ".join(m.get('text', '').lower() for m in mentions)
        critical_found = [kw for kw in self.critical_keywords if kw in all_text]
        if len(critical_found) >= 2:
            score += 30
        elif len(critical_found) >= 1:
            score += 15
        
        # Factor 5: Velocity (mentions per minute)
        if len(mentions) > 0:
            time_span = (
                max(m.get('created_at') for m in mentions) -
                min(m.get('created_at') for m in mentions)
            )
            if time_span.total_seconds() > 0:
                velocity = len(mentions) / (time_span.total_seconds() / 60)
                if velocity > 10:  # 10+ mentions per minute
                    score += 20
                elif velocity > 5:
                    score += 10
        
        # Classify based on score
        if score >= 80:
            return CrisisSeverity.CRITICAL
        elif score >= 50:
            return CrisisSeverity.HIGH
        elif score >= 25:
            return CrisisSeverity.MEDIUM
        else:
            return CrisisSeverity.LOW
```

### Escalation Engine

```python
# escalation_engine.py
import asyncio
from datetime import datetime
from typing import Optional
import json

from crisis_models import CrisisEvent, CrisisSeverity

class EscalationEngine:
    """Handle crisis escalation and notifications."""
    
    def __init__(
        self,
        discord_webhook: Optional[str] = None,
        telegram_bot_token: Optional[str] = None,
        telegram_chat_id: Optional[str] = None,
        pagerduty_key: Optional[str] = None,
        email_config: Optional[dict] = None
    ):
        self.discord_webhook = discord_webhook
        self.telegram_bot_token = telegram_bot_token
        self.telegram_chat_id = telegram_chat_id
        self.pagerduty_key = pagerduty_key
        self.email_config = email_config
        
        # Escalation matrix
        self.escalation_matrix = {
            CrisisSeverity.LOW: ['discord'],
            CrisisSeverity.MEDIUM: ['discord', 'telegram'],
            CrisisSeverity.HIGH: ['discord', 'telegram', 'email'],
            CrisisSeverity.CRITICAL: ['discord', 'telegram', 'email', 'pagerduty'],
        }
    
    async def escalate(self, crisis: CrisisEvent):
        """Escalate crisis through appropriate channels."""
        channels = self.escalation_matrix.get(crisis.severity, ['discord'])
        
        tasks = []
        for channel in channels:
            if channel == 'discord' and self.discord_webhook:
                tasks.append(self._send_discord(crisis))
            elif channel == 'telegram' and self.telegram_bot_token:
                tasks.append(self._send_telegram(crisis))
            elif channel == 'email' and self.email_config:
                tasks.append(self._send_email(crisis))
            elif channel == 'pagerduty' and self.pagerduty_key:
                tasks.append(self._send_pagerduty(crisis))
        
        await asyncio.gather(*tasks, return_exceptions=True)
    
    async def _send_discord(self, crisis: CrisisEvent):
        """Send Discord alert."""
        import aiohttp
        
        color = {
            CrisisSeverity.LOW: 0x3498db,
            CrisisSeverity.MEDIUM: 0xf39c12,
            CrisisSeverity.HIGH: 0xe74c3c,
            CrisisSeverity.CRITICAL: 0x9b59b6
        }.get(crisis.severity, 0x95a5a6)
        
        severity_emoji = {
            CrisisSeverity.LOW: "🔵",
            CrisisSeverity.MEDIUM: "🟡",
            CrisisSeverity.HIGH: "🔴",
            CrisisSeverity.CRITICAL: "🚨"
        }.get(crisis.severity, "⚪")
        
        embed = {
            "title": f"{severity_emoji} Crisis Alert: {crisis.crisis_type.value}",
            "description": f"**Severity:** {crisis.severity.value.upper()}\n"
                          f"**Status:** {crisis.status}",
            "color": color,
            "fields": [
                {
                    "name": "Trigger Tweets",
                    "value": str(len(crisis.trigger_tweets)),
                    "inline": True
                },
                {
                    "name": "Keywords Affected",
                    "value": ", ".join(crisis.affected_keywords[:5]),
                    "inline": True
                },
                {
                    "name": "Metrics",
                    "value": f"```json\n{json.dumps(crisis.metrics, indent=2)[:500]}\n```",
                    "inline": False
                }
            ],
            "timestamp": crisis.detected_at.isoformat()
        }
        
        # Add sample tweet links
        if crisis.trigger_tweets:
            tweet_links = "\n".join(
                f"• https://x.com/i/status/{tid}" 
                for tid in crisis.trigger_tweets[:3]
            )
            embed["fields"].append({
                "name": "Sample Tweets",
                "value": tweet_links,
                "inline": False
            })
        
        async with aiohttp.ClientSession() as session:
            await session.post(
                self.discord_webhook,
                json={
                    "embeds": [embed],
                    "content": "@here" if crisis.severity in [
                        CrisisSeverity.HIGH, 
                        CrisisSeverity.CRITICAL
                    ] else None
                }
            )
    
    async def _send_telegram(self, crisis: CrisisEvent):
        """Send Telegram alert."""
        import aiohttp
        
        severity_emoji = "🚨" if crisis.severity == CrisisSeverity.CRITICAL else "⚠️"
        
        message = f"""
{severity_emoji} <b>CRISIS ALERT</b>

<b>Type:</b> {crisis.crisis_type.value}
<b>Severity:</b> {crisis.severity.value.upper()}
<b>Time:</b> {crisis.detected_at.strftime('%Y-%m-%d %H:%M UTC')}

<b>Trigger Count:</b> {len(crisis.trigger_tweets)} tweets
<b>Keywords:</b> {', '.join(crisis.affected_keywords[:3])}

<b>Action Required:</b> Review and respond immediately.
"""
        
        async with aiohttp.ClientSession() as session:
            await session.post(
                f"https://api.telegram.org/bot{self.telegram_bot_token}/sendMessage",
                json={
                    "chat_id": self.telegram_chat_id,
                    "text": message,
                    "parse_mode": "HTML"
                }
            )
    
    async def _send_pagerduty(self, crisis: CrisisEvent):
        """Trigger PagerDuty incident for critical crises."""
        import aiohttp
        
        payload = {
            "routing_key": self.pagerduty_key,
            "event_action": "trigger",
            "dedup_key": crisis.id,
            "payload": {
                "summary": f"Brand Crisis: {crisis.crisis_type.value} - {crisis.severity.value}",
                "severity": "critical" if crisis.severity == CrisisSeverity.CRITICAL else "error",
                "source": "brand-monitor",
                "custom_details": {
                    "crisis_type": crisis.crisis_type.value,
                    "trigger_count": len(crisis.trigger_tweets),
                    "keywords": crisis.affected_keywords,
                    "metrics": crisis.metrics
                }
            }
        }
        
        async with aiohttp.ClientSession() as session:
            await session.post(
                "https://events.pagerduty.com/v2/enqueue",
                json=payload
            )
    
    async def _send_email(self, crisis: CrisisEvent):
        """Send email alert (implement with your email service)."""
        # Placeholder - implement with your email service
        print(f"Would send email for crisis: {crisis.id}")
```

### Main Crisis Detector

```python
# crisis_detector.py
import asyncio
import uuid
from datetime import datetime, timedelta
from typing import Optional

from xeepy import Xeepy

from crisis_models import CrisisEvent, CrisisType, CrisisSeverity
from anomaly_detector import AnomalyDetector
from severity_classifier import SeverityClassifier
from escalation_engine import EscalationEngine

class CrisisDetector:
    """Main crisis detection system."""
    
    def __init__(
        self,
        brand_keywords: list[str],
        discord_webhook: Optional[str] = None,
        check_interval: int = 60,  # seconds
    ):
        self.brand_keywords = brand_keywords
        self.search_query = " OR ".join(f'"{kw}"' for kw in brand_keywords)
        self.check_interval = check_interval
        
        self.anomaly_detector = AnomalyDetector()
        self.severity_classifier = SeverityClassifier()
        self.escalation = EscalationEngine(discord_webhook=discord_webhook)
        
        self.active_crises: dict[str, CrisisEvent] = {}
        self.response_times: list[float] = []
    
    async def monitor(self):
        """Run continuous crisis monitoring."""
        print("🚨 Crisis Detection System Active")
        print(f"   Monitoring: {self.search_query[:50]}...")
        
        last_check = datetime.now() - timedelta(hours=1)
        
        while True:
            try:
                # Fetch recent mentions
                mentions = await self._fetch_recent_mentions(since=last_check)
                last_check = datetime.now()
                
                if not mentions:
                    await asyncio.sleep(self.check_interval)
                    continue
                
                # Analyze for anomalies
                crisis = await self._analyze_mentions(mentions)
                
                if crisis:
                    await self._handle_crisis(crisis)
                
                # Update baseline with normal data
                if not crisis:
                    hourly_volume = len(mentions)
                    avg_sentiment = sum(m['sentiment_score'] for m in mentions) / len(mentions)
                    self.anomaly_detector.update_baseline(hourly_volume, avg_sentiment)
                
            except Exception as e:
                print(f"Error in crisis monitor: {e}")
            
            await asyncio.sleep(self.check_interval)
    
    async def _fetch_recent_mentions(self, since: datetime) -> list[dict]:
        """Fetch and analyze recent mentions."""
        async with Xeepy() as x:
            tweets = await x.scrape.search(
                query=self.search_query,
                limit=200,
                result_type="Latest"
            )
            
            # Filter to only new tweets
            mentions = []
            for tweet in tweets:
                if tweet.created_at > since:
                    # Quick sentiment analysis
                    sentiment = self._quick_sentiment(tweet.text)
                    
                    mentions.append({
                        'tweet_id': tweet.id,
                        'text': tweet.text,
                        'author_username': tweet.author.username,
                        'author_followers': tweet.author.followers_count,
                        'sentiment_score': sentiment,
                        'engagement_score': (
                            tweet.like_count + 
                            tweet.retweet_count * 2 + 
                            tweet.reply_count * 3
                        ),
                        'created_at': tweet.created_at
                    })
            
            return mentions
    
    def _quick_sentiment(self, text: str) -> float:
        """Quick sentiment scoring."""
        text_lower = text.lower()
        
        positive = ['love', 'great', 'amazing', 'awesome', 'thanks', '❤️', '🔥']
        negative = ['hate', 'terrible', 'awful', 'worst', 'scam', 'broken', '😡']
        
        pos_count = sum(1 for w in positive if w in text_lower)
        neg_count = sum(1 for w in negative if w in text_lower)
        
        if pos_count == 0 and neg_count == 0:
            return 0.0
        
        return (pos_count - neg_count) / (pos_count + neg_count)
    
    async def _analyze_mentions(self, mentions: list[dict]) -> Optional[CrisisEvent]:
        """Analyze mentions for crisis indicators."""
        # Check volume spike
        volume_anomaly = self.anomaly_detector.detect_volume_spike(len(mentions))
        
        # Check sentiment drop
        avg_sentiment = sum(m['sentiment_score'] for m in mentions) / len(mentions)
        sentiment_anomaly = self.anomaly_detector.detect_sentiment_drop(avg_sentiment)
        
        # Check negative ratio
        negative_count = sum(1 for m in mentions if m['sentiment_score'] < -0.2)
        ratio_anomaly = self.anomaly_detector.detect_negative_ratio_spike(
            negative_count, len(mentions)
        )
        
        # If any anomaly detected, create crisis event
        anomaly = volume_anomaly or sentiment_anomaly or ratio_anomaly
        if not anomaly:
            return None
        
        # Classify severity
        severity = self.severity_classifier.classify(
            anomaly['type'],
            mentions,
            anomaly
        )
        
        # Only escalate MEDIUM+ severity
        if severity == CrisisSeverity.LOW:
            return None
        
        # Get trigger tweets (most negative or most engaging)
        trigger_tweets = sorted(
            mentions,
            key=lambda m: m['engagement_score'] - m['sentiment_score'] * 100,
            reverse=True
        )[:10]
        
        crisis = CrisisEvent(
            id=f"crisis_{uuid.uuid4().hex[:8]}",
            crisis_type=anomaly['type'],
            severity=severity,
            detected_at=datetime.now(),
            trigger_tweets=[t['tweet_id'] for t in trigger_tweets],
            affected_keywords=self.brand_keywords,
            metrics={
                'total_mentions': len(mentions),
                'avg_sentiment': avg_sentiment,
                'negative_count': negative_count,
                'anomaly_data': anomaly
            }
        )
        
        return crisis
    
    async def _handle_crisis(self, crisis: CrisisEvent):
        """Handle detected crisis."""
        print(f"\n🚨 CRISIS DETECTED: {crisis.crisis_type.value}")
        print(f"   Severity: {crisis.severity.value}")
        print(f"   Trigger tweets: {len(crisis.trigger_tweets)}")
        
        # Track active crisis
        self.active_crises[crisis.id] = crisis
        
        # Escalate
        await self.escalation.escalate(crisis)
        
        # Track response time
        self.response_times.append(0)  # Response starts now
    
    def get_crisis_summary(self) -> dict:
        """Get summary of crisis activity."""
        return {
            'active_crises': len(self.active_crises),
            'crises_today': len([
                c for c in self.active_crises.values()
                if c.detected_at.date() == datetime.now().date()
            ]),
            'avg_response_time': (
                sum(self.response_times) / len(self.response_times)
                if self.response_times else 0
            ),
            'baseline_available': self.anomaly_detector.baseline is not None
        }
```

### Usage Example

```python
# main.py
import asyncio
from crisis_detector import CrisisDetector

async def main():
    detector = CrisisDetector(
        brand_keywords=[
            "YourBrand",
            "@YourBrand",
            "#YourBrand",
            "yourbrand.com"
        ],
        discord_webhook="https://discord.com/api/webhooks/...",
        check_interval=60  # Check every minute
    )
    
    await detector.monitor()

if __name__ == "__main__":
    asyncio.run(main())
```

---

## Post-Crisis Analysis

```python
# crisis_analysis.py
from datetime import datetime, timedelta
from typing import Optional

class CrisisAnalyzer:
    """Analyze crisis events for learnings."""
    
    def analyze_crisis(
        self, 
        crisis: CrisisEvent, 
        all_mentions: list[dict]
    ) -> dict:
        """Generate post-crisis analysis report."""
        
        # Timeline analysis
        timeline = self._build_timeline(crisis, all_mentions)
        
        # Key actors
        top_spreaders = self._identify_spreaders(all_mentions)
        
        # Content themes
        themes = self._extract_themes(all_mentions)
        
        # Response effectiveness
        response_metrics = self._calculate_response_metrics(crisis, all_mentions)
        
        return {
            'crisis_id': crisis.id,
            'duration_hours': (
                (crisis.resolved_at or datetime.now()) - crisis.detected_at
            ).total_seconds() / 3600,
            'peak_negative_mentions': max(
                self._hourly_negative_count(all_mentions)
            ),
            'total_reach': sum(m['author_followers'] for m in all_mentions),
            'timeline': timeline,
            'top_spreaders': top_spreaders,
            'themes': themes,
            'response_metrics': response_metrics,
            'recommendations': self._generate_recommendations(
                themes, top_spreaders, response_metrics
            )
        }
    
    def _generate_recommendations(self, themes, spreaders, metrics) -> list[str]:
        """Generate actionable recommendations."""
        recommendations = []
        
        if metrics.get('response_time_minutes', 0) > 30:
            recommendations.append(
                "Improve response time - aim for <15 minutes for high severity"
            )
        
        if len(spreaders) > 0 and spreaders[0]['followers'] > 50000:
            recommendations.append(
                f"Prioritize direct outreach to @{spreaders[0]['username']}"
            )
        
        return recommendations
```

---

## Best Practices

!!! warning "False Positive Management"
    - Start with conservative thresholds
    - Require multiple signals before CRITICAL
    - Review and tune weekly
    - Track false positive rate

!!! tip "Response Readiness"
    - Pre-write response templates
    - Define escalation contacts
    - Practice crisis drills
    - Document decision authority

---

## Related Recipes

- [Brand Monitoring](brand-monitoring.md) - Continuous monitoring
- [Influencer Mapping](influencer-mapping.md) - Identify key voices
- [Sentiment Analysis](../../guides/ai/sentiment.md) - Deep analysis
