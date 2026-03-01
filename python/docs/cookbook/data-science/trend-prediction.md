# Trend Prediction

Use data analysis to predict emerging trends before they go mainstream.

## Early Trend Detection

```python
import asyncio
from xeepy import Xeepy
from datetime import datetime, timedelta
from collections import Counter, defaultdict
import re

class TrendPredictor:
    """Detect emerging trends before they peak"""
    
    def __init__(self):
        self.keyword_history = defaultdict(list)
        self.velocity_threshold = 2.0  # 2x growth = trending
    
    async def scan_niche(
        self,
        seed_keywords: list,
        niche_accounts: list,
        hours: int = 24
    ):
        """
        Scan a niche for emerging keywords and topics.
        
        Strategy:
        1. Monitor seed keywords for new associated terms
        2. Track what niche leaders are talking about
        3. Identify keywords with accelerating velocity
        """
        
        async with Xeepy() as x:
            all_text = []
            
            # Gather recent content from niche
            for keyword in seed_keywords:
                results = await x.scrape.search(
                    keyword,
                    limit=200,
                    since_hours=hours
                )
                all_text.extend([r.text for r in results])
            
            # Get tweets from niche leaders
            for account in niche_accounts:
                tweets = await x.scrape.tweets(account, limit=50)
                all_text.extend([t.text for t in tweets])
            
            # Extract and count keywords
            keywords = self._extract_keywords(all_text)
            
            # Calculate velocity for each keyword
            trending = []
            
            for keyword, count in keywords.most_common(100):
                velocity = self._calculate_velocity(keyword, count)
                
                if velocity >= self.velocity_threshold:
                    trending.append({
                        "keyword": keyword,
                        "mentions": count,
                        "velocity": velocity,
                        "predicted_peak": self._predict_peak(velocity)
                    })
            
            return sorted(trending, key=lambda x: -x["velocity"])
    
    def _extract_keywords(self, texts: list) -> Counter:
        """Extract meaningful keywords from text"""
        
        keywords = Counter()
        
        # Stop words to ignore
        stop_words = {
            "the", "a", "an", "is", "are", "was", "were", "be", "been",
            "have", "has", "had", "do", "does", "did", "will", "would",
            "could", "should", "may", "might", "must", "this", "that",
            "these", "those", "i", "you", "he", "she", "it", "we", "they",
            "what", "which", "who", "when", "where", "why", "how", "all",
            "each", "every", "both", "few", "more", "most", "other", "some",
            "such", "no", "not", "only", "own", "same", "so", "than", "too",
            "very", "just", "can", "now", "new", "one", "get", "got", "like",
            "make", "know", "think", "see", "come", "want", "use", "find",
            "give", "tell", "try", "leave", "call", "keep", "let", "begin",
            "seem", "help", "show", "hear", "play", "run", "move", "live",
            "believe", "bring", "happen", "write", "sit", "stand", "lose",
            "pay", "meet", "include", "continue", "set", "learn", "change",
            "lead", "understand", "watch", "follow", "stop", "create", "speak",
            "read", "spend", "grow", "open", "walk", "win", "teach", "offer",
            "remember", "consider", "appear", "buy", "wait", "serve", "die",
            "send", "build", "stay", "fall", "cut", "reach", "kill", "remain",
            "https", "http", "com", "www", "amp", "rt"
        }
        
        for text in texts:
            # Clean and tokenize
            text = text.lower()
            text = re.sub(r'https?://\S+', '', text)  # Remove URLs
            text = re.sub(r'@\w+', '', text)  # Remove mentions
            words = re.findall(r'\b[a-z]{3,15}\b', text)
            
            for word in words:
                if word not in stop_words:
                    keywords[word] += 1
            
            # Extract hashtags separately (high signal)
            hashtags = re.findall(r'#(\w+)', text)
            for tag in hashtags:
                keywords[f"#{tag.lower()}"] += 2  # Weight hashtags higher
        
        return keywords
    
    def _calculate_velocity(self, keyword: str, current_count: int) -> float:
        """Calculate growth velocity of a keyword"""
        
        history = self.keyword_history[keyword]
        
        if not history:
            # First observation
            self.keyword_history[keyword].append({
                "timestamp": datetime.now(),
                "count": current_count
            })
            return 1.0
        
        # Compare to previous observation
        last = history[-1]
        hours_elapsed = (datetime.now() - last["timestamp"]).total_seconds() / 3600
        
        if hours_elapsed < 1:
            return 1.0
        
        # Calculate hourly growth rate
        if last["count"] > 0:
            growth_rate = current_count / last["count"]
        else:
            growth_rate = current_count
        
        # Normalize by time
        velocity = growth_rate / max(hours_elapsed, 1)
        
        # Update history
        history.append({
            "timestamp": datetime.now(),
            "count": current_count
        })
        
        # Keep last 10 observations
        self.keyword_history[keyword] = history[-10:]
        
        return velocity
    
    def _predict_peak(self, velocity: float) -> str:
        """Estimate when trend will peak"""
        
        if velocity >= 5.0:
            return "6-12 hours"
        elif velocity >= 3.0:
            return "12-24 hours"
        elif velocity >= 2.0:
            return "24-48 hours"
        else:
            return "48+ hours"

# Usage
async def find_emerging_trends():
    predictor = TrendPredictor()
    
    trends = await predictor.scan_niche(
        seed_keywords=["AI", "GPT", "LLM", "machine learning"],
        niche_accounts=["OpenAI", "AnthropicAI", "GoogleAI"],
        hours=24
    )
    
    print("🔮 EMERGING TRENDS")
    print("=" * 60)
    
    for trend in trends[:15]:
        peak = trend["predicted_peak"]
        velocity = trend["velocity"]
        
        # Visual indicator
        if velocity >= 5:
            indicator = "🔥🔥🔥"
        elif velocity >= 3:
            indicator = "🔥🔥"
        else:
            indicator = "🔥"
        
        print(f"\n{indicator} {trend['keyword']}")
        print(f"   Mentions: {trend['mentions']}")
        print(f"   Velocity: {velocity:.1f}x")
        print(f"   Peak in: {peak}")

asyncio.run(find_emerging_trends())
```

## Hashtag Trend Analysis

```python
async def analyze_hashtag_trajectory(hashtag: str, days: int = 7):
    """
    Analyze a hashtag's growth trajectory to predict if it will trend.
    """
    
    async with Xeepy() as x:
        # Get historical data by searching different time periods
        time_series = []
        
        for day_offset in range(days, 0, -1):
            since = datetime.now() - timedelta(days=day_offset)
            until = datetime.now() - timedelta(days=day_offset-1)
            
            results = await x.scrape.search(
                f"#{hashtag}",
                since=since.strftime("%Y-%m-%d"),
                until=until.strftime("%Y-%m-%d"),
                limit=500
            )
            
            time_series.append({
                "date": since.date(),
                "count": len(results),
                "avg_engagement": sum(r.like_count + r.retweet_count for r in results) / max(len(results), 1)
            })
        
        # Analyze trajectory
        counts = [t["count"] for t in time_series]
        
        # Calculate trend direction
        if len(counts) >= 3:
            recent_avg = sum(counts[-3:]) / 3
            earlier_avg = sum(counts[:3]) / 3
            
            if earlier_avg > 0:
                growth_rate = (recent_avg - earlier_avg) / earlier_avg * 100
            else:
                growth_rate = 100 if recent_avg > 0 else 0
        else:
            growth_rate = 0
        
        # Predict future
        if growth_rate > 50:
            prediction = "📈 ACCELERATING - Likely to trend soon"
        elif growth_rate > 20:
            prediction = "↗️ GROWING - Building momentum"
        elif growth_rate > -10:
            prediction = "➡️ STABLE - Consistent usage"
        elif growth_rate > -30:
            prediction = "↘️ DECLINING - Losing interest"
        else:
            prediction = "📉 FALLING - Trend is over"
        
        print(f"\n#{hashtag} Trajectory Analysis")
        print("=" * 50)
        print(f"7-day Growth: {growth_rate:+.1f}%")
        print(f"Prediction: {prediction}")
        print(f"\nDaily breakdown:")
        
        for t in time_series:
            bar = "█" * min(int(t["count"] / 10), 30)
            print(f"  {t['date']}: {bar} {t['count']}")
        
        return {
            "hashtag": hashtag,
            "time_series": time_series,
            "growth_rate": growth_rate,
            "prediction": prediction
        }

asyncio.run(analyze_hashtag_trajectory("AIagents"))
```

## Viral Content Predictor

```python
async def predict_viral_potential(tweet_url: str):
    """
    Analyze a tweet's early metrics to predict viral potential.
    
    Based on research: Tweets that go viral typically show
    specific patterns in their first 1-2 hours.
    """
    
    async with Xeepy() as x:
        tweet = await x.scrape.tweet(tweet_url)
        author = await x.scrape.profile(tweet.author_username)
        
        # Calculate metrics
        hours_since_post = (datetime.now() - tweet.created_at).total_seconds() / 3600
        
        if hours_since_post < 0.5:
            print("⚠️ Too early to predict (wait 30+ minutes)")
            return None
        
        # Engagement velocity
        likes_per_hour = tweet.like_count / max(hours_since_post, 0.5)
        retweets_per_hour = tweet.retweet_count / max(hours_since_post, 0.5)
        replies_per_hour = tweet.reply_count / max(hours_since_post, 0.5)
        
        # Relative to author's typical performance
        expected_likes = author.followers_count * 0.001  # ~0.1% engagement baseline
        performance_ratio = tweet.like_count / max(expected_likes, 1)
        
        # Viral signals
        signals = []
        score = 0
        
        # High velocity
        if likes_per_hour > 100:
            signals.append("🔥 High like velocity (100+/hr)")
            score += 30
        elif likes_per_hour > 50:
            signals.append("✨ Good like velocity (50+/hr)")
            score += 20
        
        # Retweet ratio (retweets spread content)
        rt_ratio = tweet.retweet_count / max(tweet.like_count, 1)
        if rt_ratio > 0.3:
            signals.append("🔄 High retweet ratio (spreading)")
            score += 25
        elif rt_ratio > 0.15:
            signals.append("📤 Good retweet ratio")
            score += 15
        
        # Reply engagement (conversations = algorithm boost)
        if replies_per_hour > 20:
            signals.append("💬 High reply engagement")
            score += 20
        
        # Outperforming baseline
        if performance_ratio > 10:
            signals.append("📊 10x above baseline!")
            score += 25
        elif performance_ratio > 5:
            signals.append("📈 5x above baseline")
            score += 15
        
        # Quote tweets (high signal)
        if tweet.quote_count > tweet.retweet_count * 0.2:
            signals.append("💭 High quote engagement")
            score += 10
        
        # Predict outcome
        if score >= 70:
            prediction = "🚀 HIGH VIRAL POTENTIAL - Act now!"
            recommendation = "Engage immediately, ride the wave"
        elif score >= 50:
            prediction = "📈 GOOD POTENTIAL - Worth watching"
            recommendation = "Monitor closely, engage if relevant"
        elif score >= 30:
            prediction = "🌱 MODERATE POTENTIAL"
            recommendation = "May grow slowly, selective engagement"
        else:
            prediction = "📊 LOW VIRAL POTENTIAL"
            recommendation = "Standard content, normal engagement"
        
        print(f"\n🔮 VIRAL POTENTIAL ANALYSIS")
        print("=" * 50)
        print(f"Tweet: {tweet.text[:100]}...")
        print(f"Author: @{tweet.author_username} ({author.followers_count:,} followers)")
        print(f"Age: {hours_since_post:.1f} hours")
        print(f"\nCurrent Metrics:")
        print(f"  ❤️ {tweet.like_count:,} likes ({likes_per_hour:.0f}/hr)")
        print(f"  🔄 {tweet.retweet_count:,} retweets ({retweets_per_hour:.0f}/hr)")
        print(f"  💬 {tweet.reply_count:,} replies ({replies_per_hour:.0f}/hr)")
        print(f"\nViral Signals:")
        for signal in signals:
            print(f"  {signal}")
        print(f"\nViral Score: {score}/100")
        print(f"Prediction: {prediction}")
        print(f"Recommendation: {recommendation}")
        
        return {
            "score": score,
            "prediction": prediction,
            "signals": signals,
            "metrics": {
                "likes_per_hour": likes_per_hour,
                "retweets_per_hour": retweets_per_hour,
                "performance_ratio": performance_ratio
            }
        }

asyncio.run(predict_viral_potential("https://x.com/user/status/123"))
```

## Topic Lifecycle Prediction

```python
async def analyze_topic_lifecycle(topic: str):
    """
    Determine where a topic is in its lifecycle:
    - Emerging (early adopters)
    - Growing (rapid adoption)
    - Mainstream (peak awareness)
    - Declining (interest waning)
    - Niche (stable but small)
    """
    
    async with Xeepy() as x:
        # Get tweets from different time periods
        now = datetime.now()
        periods = []
        
        for weeks_ago in [4, 3, 2, 1, 0]:
            since = now - timedelta(weeks=weeks_ago+1)
            until = now - timedelta(weeks=weeks_ago) if weeks_ago > 0 else now
            
            results = await x.scrape.search(
                topic,
                since=since.strftime("%Y-%m-%d"),
                until=until.strftime("%Y-%m-%d"),
                limit=500
            )
            
            # Analyze this period
            unique_authors = len(set(r.author_username for r in results))
            avg_likes = sum(r.like_count for r in results) / max(len(results), 1)
            
            periods.append({
                "week": weeks_ago,
                "volume": len(results),
                "unique_authors": unique_authors,
                "avg_engagement": avg_likes
            })
        
        # Analyze trajectory
        volumes = [p["volume"] for p in periods]
        authors = [p["unique_authors"] for p in periods]
        
        # Week-over-week growth
        if volumes[-2] > 0:
            volume_growth = (volumes[-1] - volumes[-2]) / volumes[-2] * 100
        else:
            volume_growth = 100 if volumes[-1] > 0 else 0
        
        # Author diversity (more authors = broader adoption)
        author_ratio = authors[-1] / max(volumes[-1], 1) * 100  # % unique
        
        # Determine lifecycle stage
        if volume_growth > 50 and author_ratio > 50:
            stage = "🚀 EMERGING"
            advice = "Get in early! High potential for first-mover advantage."
        elif volume_growth > 20 and volumes[-1] > volumes[0]:
            stage = "📈 GROWING"
            advice = "Active growth phase. Good time to establish presence."
        elif -10 <= volume_growth <= 20 and volumes[-1] > 100:
            stage = "🎯 MAINSTREAM"
            advice = "Peak awareness. Content here needs to be exceptional."
        elif volume_growth < -20:
            stage = "📉 DECLINING"
            advice = "Interest waning. Consider pivoting to related topics."
        else:
            stage = "🔬 NICHE"
            advice = "Small but stable audience. Good for targeted engagement."
        
        print(f"\n📊 TOPIC LIFECYCLE ANALYSIS: {topic}")
        print("=" * 50)
        print(f"\nLifecycle Stage: {stage}")
        print(f"Volume Growth: {volume_growth:+.1f}%")
        print(f"Author Diversity: {author_ratio:.0f}%")
        
        print(f"\nWeekly Volume:")
        for p in periods:
            bar = "█" * min(int(p["volume"] / 10), 30)
            week_label = "This week" if p["week"] == 0 else f"{p['week']} weeks ago"
            print(f"  {week_label:15}: {bar} {p['volume']}")
        
        print(f"\n💡 Advice: {advice}")
        
        return {
            "topic": topic,
            "stage": stage,
            "volume_growth": volume_growth,
            "advice": advice,
            "periods": periods
        }

asyncio.run(analyze_topic_lifecycle("AI agents"))
```

## Continuous Trend Monitoring

```python
async def continuous_trend_monitor(
    niches: dict,  # {"niche_name": {"keywords": [...], "accounts": [...]}}
    check_interval_hours: int = 6
):
    """
    Run continuous trend monitoring across multiple niches.
    """
    
    predictor = TrendPredictor()
    
    async with Xeepy() as x:
        while True:
            all_trends = {}
            
            for niche_name, config in niches.items():
                print(f"\n🔍 Scanning {niche_name}...")
                
                trends = await predictor.scan_niche(
                    seed_keywords=config["keywords"],
                    niche_accounts=config["accounts"],
                    hours=24
                )
                
                all_trends[niche_name] = trends[:10]  # Top 10 per niche
            
            # Generate report
            report = f"""
🔮 TREND PREDICTION REPORT
Generated: {datetime.now().strftime('%Y-%m-%d %H:%M')}
{'='*50}
"""
            
            for niche, trends in all_trends.items():
                report += f"\n\n📊 {niche.upper()}\n"
                report += "-" * 30 + "\n"
                
                for t in trends[:5]:
                    velocity = t["velocity"]
                    emoji = "🔥" if velocity >= 3 else "✨" if velocity >= 2 else "📈"
                    report += f"{emoji} {t['keyword']}: {velocity:.1f}x velocity\n"
            
            # Send to notifications
            await x.notify.discord(
                webhook_url="...",
                content=report
            )
            
            print(report)
            print(f"\n⏰ Next scan in {check_interval_hours} hours...")
            await asyncio.sleep(check_interval_hours * 3600)

# Configure and run
niches = {
    "AI/ML": {
        "keywords": ["AI", "GPT", "LLM", "machine learning"],
        "accounts": ["OpenAI", "AnthropicAI"]
    },
    "Crypto": {
        "keywords": ["Bitcoin", "Ethereum", "DeFi", "Web3"],
        "accounts": ["VitalikButerin", "caborik"]
    },
    "Startups": {
        "keywords": ["startup", "founder", "YC", "Series A"],
        "accounts": ["ycombinator", "paulg"]
    }
}

asyncio.run(continuous_trend_monitor(niches, check_interval_hours=6))
```

## Best Practices

!!! tip "Trend Prediction Tips"
    - Velocity matters more than absolute numbers
    - Track multiple signals (volume, authors, engagement)
    - Compare within niches, not across them
    - Act fast on emerging trends
    - Validate with multiple data points

!!! warning "Limitations"
    - Past performance doesn't guarantee future trends
    - External events can cause sudden shifts
    - Sample sizes may be limited
    - Use as one input, not the only decision factor

## Next Steps

[:octicons-arrow-right-24: Viral Content Hunting](../growth/viral-content.md) - Find viral content early

[:octicons-arrow-right-24: Network Analysis](network-analysis.md) - Map influence networks

[:octicons-arrow-right-24: Sentiment Analysis](sentiment-dashboard.md) - Understand market mood
