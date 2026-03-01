# Data-Driven Hashtag Optimization

Build a comprehensive hashtag research and optimization system using performance data and machine learning.

---

## Overview

This recipe creates a hashtag optimization system with:

- **Performance scraping** - Analyze hashtag metrics
- **Reach vs competition** - Find optimal hashtags
- **Niche discovery** - Uncover hidden gems
- **Trending analysis** - Time hashtag usage
- **A/B testing** - Validate strategies
- **Weekly reports** - Track progress

---

## System Architecture

```
┌─────────────────┐     ┌──────────────┐     ┌─────────────────┐
│  Hashtag        │────▶│  Performance │────▶│  Opportunity    │
│  Scraper        │     │  Analyzer    │     │  Scorer         │
└─────────────────┘     └──────────────┘     └─────────────────┘
        │                       │                     │
        ▼                       ▼                     ▼
┌─────────────────┐     ┌──────────────┐     ┌─────────────────┐
│  Trending       │     │  A/B Test    │     │  Strategy       │
│  Monitor        │     │  Framework   │     │  Generator      │
└─────────────────┘     └──────────────┘     └─────────────────┘
```

---

## Data Models

```python
# hashtag_models.py
from dataclasses import dataclass, field
from datetime import datetime
from typing import Optional

@dataclass
class HashtagMetrics:
    tag: str
    total_tweets: int
    tweets_per_hour: float
    avg_likes: float
    avg_retweets: float
    avg_replies: float
    engagement_rate: float
    top_accounts_ratio: float  # % from top 10 accounts
    unique_authors: int
    peak_hours: list[int]
    scraped_at: datetime = field(default_factory=datetime.now)

@dataclass
class HashtagScore:
    tag: str
    reach_score: float      # 0-100
    competition_score: float  # 0-100 (lower = less competition)
    relevance_score: float   # 0-100
    opportunity_score: float  # Combined score
    recommendation: str      # use_always, use_sometimes, avoid
    notes: list[str] = field(default_factory=list)

@dataclass
class HashtagStrategy:
    primary_tags: list[str]    # Always use (3-5)
    secondary_tags: list[str]  # Rotate (5-10)
    trending_slots: int        # Reserved for trending
    niche_tags: list[str]      # Low competition gems
    avoid_tags: list[str]      # Overused/spammy
```

---

## Hashtag Scraper

```python
# hashtag_scraper.py
import asyncio
from datetime import datetime, timedelta
from collections import Counter

from xeepy import Xeepy
from hashtag_models import HashtagMetrics

class HashtagScraper:
    """Scrape and analyze hashtag performance."""
    
    def __init__(self):
        self.cache: dict[str, HashtagMetrics] = {}
    
    async def analyze_hashtag(
        self,
        tag: str,
        sample_size: int = 200
    ) -> HashtagMetrics:
        """Analyze performance metrics for a hashtag."""
        
        # Remove # if present
        tag = tag.lstrip('#')
        
        async with Xeepy() as x:
            # Scrape recent tweets with hashtag
            tweets = await x.scrape.hashtag(
                f"#{tag}",
                limit=sample_size
            )
            
            if not tweets:
                return self._empty_metrics(tag)
            
            # Calculate metrics
            total = len(tweets)
            
            # Time span
            oldest = min(t.created_at for t in tweets)
            newest = max(t.created_at for t in tweets)
            hours_span = max(1, (newest - oldest).total_seconds() / 3600)
            tweets_per_hour = total / hours_span
            
            # Engagement metrics
            likes = [t.like_count for t in tweets]
            retweets = [t.retweet_count for t in tweets]
            replies = [t.reply_count for t in tweets]
            
            avg_likes = sum(likes) / total
            avg_retweets = sum(retweets) / total
            avg_replies = sum(replies) / total
            
            # Author analysis
            authors = [t.author.username for t in tweets]
            unique_authors = len(set(authors))
            
            # Top accounts concentration
            author_counts = Counter(authors)
            top_10_tweets = sum(c for _, c in author_counts.most_common(10))
            top_accounts_ratio = top_10_tweets / total
            
            # Calculate engagement rate
            total_followers = sum(t.author.followers_count for t in tweets)
            total_engagement = sum(likes) + sum(retweets) + sum(replies)
            engagement_rate = total_engagement / max(total_followers, 1)
            
            # Peak hours
            hour_counts = Counter(t.created_at.hour for t in tweets)
            peak_hours = [h for h, _ in hour_counts.most_common(3)]
            
            metrics = HashtagMetrics(
                tag=tag,
                total_tweets=total,
                tweets_per_hour=tweets_per_hour,
                avg_likes=avg_likes,
                avg_retweets=avg_retweets,
                avg_replies=avg_replies,
                engagement_rate=engagement_rate,
                top_accounts_ratio=top_accounts_ratio,
                unique_authors=unique_authors,
                peak_hours=peak_hours
            )
            
            self.cache[tag] = metrics
            return metrics
    
    async def analyze_multiple(
        self,
        tags: list[str],
        sample_size: int = 100
    ) -> list[HashtagMetrics]:
        """Analyze multiple hashtags."""
        
        results = []
        for tag in tags:
            metrics = await self.analyze_hashtag(tag, sample_size)
            results.append(metrics)
            await asyncio.sleep(2)  # Rate limiting
        
        return results
    
    def _empty_metrics(self, tag: str) -> HashtagMetrics:
        return HashtagMetrics(
            tag=tag,
            total_tweets=0,
            tweets_per_hour=0,
            avg_likes=0,
            avg_retweets=0,
            avg_replies=0,
            engagement_rate=0,
            top_accounts_ratio=0,
            unique_authors=0,
            peak_hours=[]
        )
```

---

## Opportunity Scorer

```python
# opportunity_scorer.py
import math
from hashtag_models import HashtagMetrics, HashtagScore

class OpportunityScorer:
    """Score hashtags for opportunity potential."""
    
    def __init__(
        self,
        target_tweets_per_hour: float = 50,  # Ideal activity level
        target_engagement_rate: float = 0.02,
        min_unique_authors: int = 20
    ):
        self.target_tph = target_tweets_per_hour
        self.target_engagement = target_engagement_rate
        self.min_authors = min_unique_authors
    
    def score(
        self,
        metrics: HashtagMetrics,
        relevance: float = 1.0  # 0-1, how relevant to your niche
    ) -> HashtagScore:
        """Calculate opportunity score for hashtag."""
        
        # Reach score (0-100)
        # Based on activity level - too low = no reach, too high = noise
        if metrics.tweets_per_hour < 1:
            reach = 10  # Very low activity
        elif metrics.tweets_per_hour > self.target_tph * 10:
            reach = 30  # Very high activity (saturated)
        else:
            # Optimal is around target
            ratio = metrics.tweets_per_hour / self.target_tph
            reach = 100 - abs(math.log10(max(0.1, ratio))) * 30
        reach = max(0, min(100, reach))
        
        # Competition score (0-100, lower competition = higher score)
        # Based on unique authors and top account concentration
        if metrics.unique_authors < self.min_authors:
            competition = 20  # Too few authors = dominated by few
        else:
            author_diversity = min(1, metrics.unique_authors / 100)
            concentration_penalty = metrics.top_accounts_ratio * 50
            competition = author_diversity * 100 - concentration_penalty
        competition = max(0, min(100, competition))
        
        # Relevance score
        relevance_score = relevance * 100
        
        # Engagement bonus
        engagement_bonus = min(20, metrics.engagement_rate / self.target_engagement * 10)
        
        # Combined opportunity score
        opportunity = (
            reach * 0.30 +
            competition * 0.30 +
            relevance_score * 0.30 +
            engagement_bonus
        )
        
        # Generate recommendation
        notes = []
        if opportunity >= 70:
            recommendation = "use_always"
            notes.append("Excellent opportunity hashtag")
        elif opportunity >= 50:
            recommendation = "use_sometimes"
            notes.append("Good for rotation")
        else:
            recommendation = "avoid"
            if competition < 40:
                notes.append("Too competitive/saturated")
            if reach < 40:
                notes.append("Low visibility potential")
        
        # Add specific notes
        if metrics.tweets_per_hour > 500:
            notes.append("Very high volume - tweets get buried quickly")
        if metrics.top_accounts_ratio > 0.5:
            notes.append("Dominated by few accounts")
        if metrics.engagement_rate > 0.05:
            notes.append("High engagement hashtag!")
        
        return HashtagScore(
            tag=metrics.tag,
            reach_score=round(reach, 1),
            competition_score=round(competition, 1),
            relevance_score=round(relevance_score, 1),
            opportunity_score=round(opportunity, 1),
            recommendation=recommendation,
            notes=notes
        )
```

---

## Niche Hashtag Discoverer

```python
# niche_discoverer.py
import re
from collections import Counter

from xeepy import Xeepy

class NicheDiscoverer:
    """Discover niche hashtags from successful accounts."""
    
    async def discover_from_accounts(
        self,
        successful_accounts: list[str],
        tweets_per_account: int = 50,
        min_occurrences: int = 3
    ) -> list[tuple[str, int]]:
        """Discover hashtags used by successful accounts."""
        
        all_hashtags = []
        
        async with Xeepy() as x:
            for username in successful_accounts:
                tweets = await x.scrape.tweets(username, limit=tweets_per_account)
                
                for tweet in tweets:
                    # Extract hashtags
                    tags = re.findall(r'#(\w+)', tweet.text.lower())
                    all_hashtags.extend(tags)
        
        # Count occurrences
        counter = Counter(all_hashtags)
        
        # Filter by minimum occurrences
        common_tags = [
            (tag, count) for tag, count in counter.most_common(100)
            if count >= min_occurrences
        ]
        
        return common_tags
    
    async def discover_related(
        self,
        seed_hashtag: str,
        depth: int = 2
    ) -> list[str]:
        """Discover related hashtags from a seed."""
        
        discovered = set()
        to_process = [seed_hashtag.lstrip('#')]
        
        async with Xeepy() as x:
            for _ in range(depth):
                next_level = []
                
                for tag in to_process:
                    if tag in discovered:
                        continue
                    
                    discovered.add(tag)
                    
                    # Scrape tweets with this hashtag
                    tweets = await x.scrape.hashtag(f"#{tag}", limit=50)
                    
                    # Extract co-occurring hashtags
                    for tweet in tweets:
                        co_tags = re.findall(r'#(\w+)', tweet.text.lower())
                        for co_tag in co_tags:
                            if co_tag not in discovered:
                                next_level.append(co_tag)
                
                to_process = list(set(next_level))[:20]  # Limit breadth
        
        return list(discovered)
```

---

## A/B Testing Framework

```python
# hashtag_ab_test.py
import random
from datetime import datetime, timedelta
from dataclasses import dataclass
from typing import Optional
import statistics

@dataclass
class ABTestResult:
    test_name: str
    variant_a_tags: list[str]
    variant_b_tags: list[str]
    variant_a_tweets: int
    variant_b_tweets: int
    variant_a_avg_engagement: float
    variant_b_avg_engagement: float
    winner: str
    confidence: float
    recommendation: str

class HashtagABTest:
    """A/B test hashtag strategies."""
    
    def __init__(self, test_name: str):
        self.test_name = test_name
        self.variant_a_tags: list[str] = []
        self.variant_b_tags: list[str] = []
        self.results_a: list[dict] = []
        self.results_b: list[dict] = []
        self.started_at: Optional[datetime] = None
    
    def setup(
        self,
        variant_a: list[str],
        variant_b: list[str]
    ):
        """Setup test variants."""
        self.variant_a_tags = variant_a
        self.variant_b_tags = variant_b
        self.started_at = datetime.now()
    
    def get_tags_for_tweet(self) -> tuple[list[str], str]:
        """Get hashtags for next tweet (random assignment)."""
        variant = random.choice(['A', 'B'])
        
        if variant == 'A':
            return self.variant_a_tags, 'A'
        else:
            return self.variant_b_tags, 'B'
    
    def record_result(
        self,
        variant: str,
        tweet_id: str,
        likes: int,
        retweets: int,
        replies: int
    ):
        """Record tweet performance."""
        result = {
            'tweet_id': tweet_id,
            'likes': likes,
            'retweets': retweets,
            'replies': replies,
            'engagement': likes + retweets * 2 + replies * 3,
            'recorded_at': datetime.now()
        }
        
        if variant == 'A':
            self.results_a.append(result)
        else:
            self.results_b.append(result)
    
    def analyze(self) -> ABTestResult:
        """Analyze test results."""
        
        if len(self.results_a) < 5 or len(self.results_b) < 5:
            return ABTestResult(
                test_name=self.test_name,
                variant_a_tags=self.variant_a_tags,
                variant_b_tags=self.variant_b_tags,
                variant_a_tweets=len(self.results_a),
                variant_b_tweets=len(self.results_b),
                variant_a_avg_engagement=0,
                variant_b_avg_engagement=0,
                winner="insufficient_data",
                confidence=0,
                recommendation="Need at least 5 tweets per variant"
            )
        
        # Calculate averages
        eng_a = [r['engagement'] for r in self.results_a]
        eng_b = [r['engagement'] for r in self.results_b]
        
        avg_a = statistics.mean(eng_a)
        avg_b = statistics.mean(eng_b)
        
        # Simple statistical test (t-test approximation)
        std_a = statistics.stdev(eng_a) if len(eng_a) > 1 else 0
        std_b = statistics.stdev(eng_b) if len(eng_b) > 1 else 0
        
        # Calculate effect size
        pooled_std = ((std_a ** 2 + std_b ** 2) / 2) ** 0.5
        if pooled_std > 0:
            effect_size = abs(avg_a - avg_b) / pooled_std
        else:
            effect_size = 0
        
        # Determine winner
        if effect_size < 0.2:
            winner = "no_difference"
            confidence = 0.5
        elif avg_a > avg_b:
            winner = "A"
            confidence = min(0.95, 0.5 + effect_size * 0.2)
        else:
            winner = "B"
            confidence = min(0.95, 0.5 + effect_size * 0.2)
        
        # Generate recommendation
        if winner == "no_difference":
            recommendation = "No significant difference. Consider testing other variations."
        elif confidence > 0.8:
            recommendation = f"Strong evidence for Variant {winner}. Implement these hashtags."
        else:
            recommendation = f"Slight edge for Variant {winner}. Continue testing for confirmation."
        
        return ABTestResult(
            test_name=self.test_name,
            variant_a_tags=self.variant_a_tags,
            variant_b_tags=self.variant_b_tags,
            variant_a_tweets=len(self.results_a),
            variant_b_tweets=len(self.results_b),
            variant_a_avg_engagement=round(avg_a, 2),
            variant_b_avg_engagement=round(avg_b, 2),
            winner=winner,
            confidence=round(confidence, 2),
            recommendation=recommendation
        )
```

---

## Strategy Generator

```python
# strategy_generator.py
from hashtag_models import HashtagScore, HashtagStrategy

class StrategyGenerator:
    """Generate optimized hashtag strategies."""
    
    def __init__(self, max_hashtags: int = 5):
        self.max_hashtags = max_hashtags
    
    def generate_strategy(
        self,
        scored_hashtags: list[HashtagScore],
        trending: list[str] = None
    ) -> HashtagStrategy:
        """Generate optimized hashtag strategy."""
        
        # Sort by opportunity score
        sorted_tags = sorted(
            scored_hashtags,
            key=lambda s: s.opportunity_score,
            reverse=True
        )
        
        # Categorize
        primary = []
        secondary = []
        niche = []
        avoid = []
        
        for score in sorted_tags:
            if score.recommendation == "use_always":
                if len(primary) < 3:
                    primary.append(score.tag)
                else:
                    secondary.append(score.tag)
            
            elif score.recommendation == "use_sometimes":
                if score.competition_score > 70:  # Low competition
                    niche.append(score.tag)
                else:
                    secondary.append(score.tag)
            
            else:  # avoid
                avoid.append(score.tag)
        
        # Determine trending slots
        trending_slots = max(0, self.max_hashtags - len(primary) - 1)
        
        return HashtagStrategy(
            primary_tags=primary[:3],
            secondary_tags=secondary[:10],
            trending_slots=trending_slots,
            niche_tags=niche[:5],
            avoid_tags=avoid[:10]
        )
    
    def get_tags_for_post(
        self,
        strategy: HashtagStrategy,
        trending: list[str] = None,
        max_tags: int = 5
    ) -> list[str]:
        """Get optimized hashtags for a specific post."""
        
        tags = []
        
        # Always include primary tags
        tags.extend(strategy.primary_tags)
        
        # Add trending if available and relevant
        if trending and strategy.trending_slots > 0:
            relevant_trending = [
                t for t in trending
                if t not in strategy.avoid_tags
            ][:strategy.trending_slots]
            tags.extend(relevant_trending)
        
        # Fill remaining with secondary/niche
        remaining = max_tags - len(tags)
        if remaining > 0:
            import random
            
            # Mix secondary and niche
            pool = strategy.secondary_tags + strategy.niche_tags
            random.shuffle(pool)
            tags.extend(pool[:remaining])
        
        return tags[:max_tags]
```

---

## Weekly Report Generator

```python
# hashtag_report.py
from datetime import datetime
from hashtag_models import HashtagMetrics, HashtagScore

class HashtagReportGenerator:
    """Generate weekly hashtag performance reports."""
    
    def generate_report(
        self,
        metrics: list[HashtagMetrics],
        scores: list[HashtagScore],
        your_usage: dict[str, int] = None
    ) -> str:
        """Generate markdown report."""
        
        report = f"""
# Hashtag Performance Report
**Generated:** {datetime.now().strftime('%Y-%m-%d %H:%M')}

## Top Performing Hashtags

| Hashtag | Opportunity | Reach | Competition | Recommendation |
|---------|-------------|-------|-------------|----------------|
"""
        
        # Sort by opportunity
        sorted_scores = sorted(scores, key=lambda s: s.opportunity_score, reverse=True)
        
        for score in sorted_scores[:15]:
            emoji = {
                "use_always": "✅",
                "use_sometimes": "🔄",
                "avoid": "❌"
            }.get(score.recommendation, "")
            
            report += f"| #{score.tag} | {score.opportunity_score} | {score.reach_score} | {score.competition_score} | {emoji} {score.recommendation} |\n"
        
        report += """
## Hashtag Insights

### Best Opportunities
"""
        
        best = [s for s in sorted_scores if s.recommendation == "use_always"][:5]
        for score in best:
            report += f"\n**#{score.tag}** (Score: {score.opportunity_score})\n"
            for note in score.notes:
                report += f"- {note}\n"
        
        report += """
### Niche Gems (Low Competition)
"""
        
        niche = sorted(
            [s for s in scores if s.competition_score > 70],
            key=lambda s: s.opportunity_score,
            reverse=True
        )[:5]
        
        for score in niche:
            metrics_obj = next((m for m in metrics if m.tag == score.tag), None)
            if metrics_obj:
                report += f"- **#{score.tag}**: {metrics_obj.tweets_per_hour:.1f} tweets/hr, {metrics_obj.engagement_rate*100:.2f}% engagement\n"
        
        report += """
### Avoid These
"""
        
        avoid = [s for s in sorted_scores if s.recommendation == "avoid"][:5]
        for score in avoid:
            report += f"- #{score.tag}: {', '.join(score.notes)}\n"
        
        return report
```

---

## Complete Usage Example

```python
# main.py
import asyncio
from hashtag_scraper import HashtagScraper
from opportunity_scorer import OpportunityScorer
from niche_discoverer import NicheDiscoverer
from strategy_generator import StrategyGenerator
from hashtag_report import HashtagReportGenerator

async def main():
    # 1. Define hashtags to analyze
    hashtags_to_test = [
        "python", "programming", "coding", "developer",
        "tech", "startup", "ai", "machinelearning",
        "100DaysOfCode", "CodeNewbie", "DevCommunity"
    ]
    
    # 2. Scrape metrics
    scraper = HashtagScraper()
    metrics = await scraper.analyze_multiple(hashtags_to_test)
    
    print(f"Analyzed {len(metrics)} hashtags")
    
    # 3. Score opportunities
    scorer = OpportunityScorer()
    scores = [scorer.score(m, relevance=0.8) for m in metrics]
    
    # 4. Discover niche hashtags
    discoverer = NicheDiscoverer()
    niche_tags = await discoverer.discover_from_accounts(
        ['successful_account_1', 'successful_account_2'],
        tweets_per_account=50
    )
    
    print(f"Discovered {len(niche_tags)} niche hashtags")
    
    # 5. Generate strategy
    generator = StrategyGenerator(max_hashtags=5)
    strategy = generator.generate_strategy(scores)
    
    print("\nHashtag Strategy:")
    print(f"  Primary: {strategy.primary_tags}")
    print(f"  Secondary: {strategy.secondary_tags[:5]}")
    print(f"  Niche: {strategy.niche_tags}")
    
    # 6. Get tags for a post
    post_tags = generator.get_tags_for_post(strategy, max_tags=5)
    print(f"\nTags for next post: {' '.join('#' + t for t in post_tags)}")
    
    # 7. Generate report
    report_gen = HashtagReportGenerator()
    report = report_gen.generate_report(metrics, scores)
    
    with open("hashtag_report.md", "w") as f:
        f.write(report)
    
    print("\nReport saved to hashtag_report.md")

if __name__ == "__main__":
    asyncio.run(main())
```

---

## Best Practices

!!! tip "Hashtag Count"
    - Use 3-5 hashtags maximum
    - Quality over quantity
    - Mix popular and niche

!!! warning "Avoid"
    - Banned or shadowbanned hashtags
    - Hashtags with >1M tweets/day
    - Irrelevant trending tags

---

## Related Recipes

- [Optimal Timing](optimal-timing.md) - When to post
- [Content Calendar](../automation/content-calendar.md) - Plan content
- [Brand Monitoring](../business/brand-monitoring.md) - Track mentions
