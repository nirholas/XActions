# Influencer Network Mapping & Scoring

Build a comprehensive influencer discovery and scoring system using network analysis and engagement metrics.

---

## Overview

This recipe creates an influencer intelligence system with:

- **Network graph construction** - Map relationships between accounts
- **PageRank-style scoring** - Measure true influence
- **Engagement authenticity** - Detect fake engagement
- **Niche categorization** - Classify influencer topics
- **Outreach prioritization** - Rank by ROI potential
- **Visualization** - Interactive network graphs

---

## System Architecture

```
┌─────────────────┐     ┌──────────────┐     ┌─────────────────┐
│  Profile        │────▶│   Network    │────▶│   Influence     │
│  Scraper        │     │   Builder    │     │   Calculator    │
└─────────────────┘     └──────────────┘     └─────────────────┘
        │                       │                     │
        ▼                       ▼                     ▼
┌─────────────────┐     ┌──────────────┐     ┌─────────────────┐
│  Engagement     │     │   Graph      │     │   Niche         │
│  Analyzer       │     │   Storage    │     │   Classifier    │
└─────────────────┘     └──────────────┘     └─────────────────┘
                               │
                               ▼
                        ┌──────────────┐
                        │   Visualizer │
                        └──────────────┘
```

---

## Data Models

```python
# influencer_models.py
from dataclasses import dataclass, field
from datetime import datetime
from typing import Optional

@dataclass
class InfluencerProfile:
    user_id: str
    username: str
    display_name: str
    followers: int
    following: int
    tweet_count: int
    created_at: datetime
    bio: str
    location: Optional[str]
    website: Optional[str]
    verified: bool
    profile_image: str
    
    # Calculated metrics
    follower_ratio: float = 0.0
    avg_engagement_rate: float = 0.0
    influence_score: float = 0.0
    authenticity_score: float = 0.0
    niche_categories: list[str] = field(default_factory=list)
    
    def __post_init__(self):
        if self.following > 0:
            self.follower_ratio = self.followers / self.following

@dataclass
class InfluencerConnection:
    source_id: str
    target_id: str
    connection_type: str  # follows, mentioned, replied, retweeted
    weight: float = 1.0
    timestamp: Optional[datetime] = None

@dataclass
class EngagementMetrics:
    user_id: str
    avg_likes: float
    avg_retweets: float
    avg_replies: float
    engagement_rate: float
    reply_ratio: float  # replies received vs given
    unique_engagers: int
    top_engager_concentration: float  # % from top 10 engagers
```

---

## Network Builder

```python
# network_builder.py
import asyncio
from collections import defaultdict
from typing import Optional
from datetime import datetime, timedelta

from xeepy import Xeepy
from influencer_models import InfluencerProfile, InfluencerConnection

class NetworkBuilder:
    """Build influencer relationship network."""
    
    def __init__(self, niche_keywords: list[str]):
        self.niche_keywords = niche_keywords
        self.profiles: dict[str, InfluencerProfile] = {}
        self.connections: list[InfluencerConnection] = []
    
    async def discover_influencers(
        self,
        seed_accounts: list[str],
        depth: int = 2,
        min_followers: int = 5000
    ) -> list[InfluencerProfile]:
        """Discover influencers starting from seed accounts."""
        discovered = set(seed_accounts)
        to_process = list(seed_accounts)
        
        for current_depth in range(depth):
            print(f"Processing depth {current_depth + 1}/{depth}")
            next_level = []
            
            async with Xeepy() as x:
                for username in to_process:
                    try:
                        # Get profile
                        profile = await self._fetch_profile(x, username)
                        if profile and profile.followers >= min_followers:
                            self.profiles[profile.user_id] = profile
                            
                            # Get connections
                            connections = await self._fetch_connections(
                                x, username, min_followers
                            )
                            
                            for conn in connections:
                                self.connections.append(conn)
                                if conn.target_id not in discovered:
                                    discovered.add(conn.target_id)
                                    next_level.append(conn.target_id)
                        
                        await asyncio.sleep(1)  # Rate limiting
                        
                    except Exception as e:
                        print(f"Error processing {username}: {e}")
            
            to_process = next_level[:100]  # Limit breadth
        
        return list(self.profiles.values())
    
    async def _fetch_profile(
        self, 
        x: Xeepy, 
        username: str
    ) -> Optional[InfluencerProfile]:
        """Fetch user profile."""
        try:
            profile = await x.scrape.profile(username)
            
            return InfluencerProfile(
                user_id=profile.id,
                username=profile.username,
                display_name=profile.name,
                followers=profile.followers_count,
                following=profile.following_count,
                tweet_count=profile.tweet_count,
                created_at=profile.created_at,
                bio=profile.bio or "",
                location=profile.location,
                website=profile.website,
                verified=profile.verified,
                profile_image=profile.profile_image_url
            )
        except Exception:
            return None
    
    async def _fetch_connections(
        self,
        x: Xeepy,
        username: str,
        min_followers: int
    ) -> list[InfluencerConnection]:
        """Fetch connections for a user."""
        connections = []
        
        # Get recent tweets to find mentions and interactions
        tweets = await x.scrape.tweets(username, limit=50)
        
        user_profile = self.profiles.get(username)
        if not user_profile:
            return connections
        
        mentioned_users = set()
        for tweet in tweets:
            # Extract mentions
            for mention in tweet.mentions:
                if mention not in mentioned_users:
                    mentioned_users.add(mention)
                    connections.append(InfluencerConnection(
                        source_id=user_profile.user_id,
                        target_id=mention,
                        connection_type='mentioned',
                        weight=1.0,
                        timestamp=tweet.created_at
                    ))
            
            # Track retweets
            if tweet.is_retweet and tweet.retweeted_user:
                connections.append(InfluencerConnection(
                    source_id=user_profile.user_id,
                    target_id=tweet.retweeted_user,
                    connection_type='retweeted',
                    weight=1.5,  # Higher weight for retweets
                    timestamp=tweet.created_at
                ))
        
        return connections
```

---

## Influence Calculator (PageRank-Style)

```python
# influence_calculator.py
import math
from collections import defaultdict

class InfluenceCalculator:
    """Calculate influence scores using PageRank-style algorithm."""
    
    def __init__(self, damping_factor: float = 0.85, iterations: int = 50):
        self.damping_factor = damping_factor
        self.iterations = iterations
    
    def calculate_pagerank(
        self,
        profiles: dict[str, 'InfluencerProfile'],
        connections: list['InfluencerConnection']
    ) -> dict[str, float]:
        """Calculate PageRank-style influence scores."""
        
        # Build adjacency lists
        outgoing = defaultdict(list)
        incoming = defaultdict(list)
        
        for conn in connections:
            if conn.source_id in profiles and conn.target_id in profiles:
                outgoing[conn.source_id].append((conn.target_id, conn.weight))
                incoming[conn.target_id].append((conn.source_id, conn.weight))
        
        # Initialize scores
        n = len(profiles)
        scores = {uid: 1.0 / n for uid in profiles}
        
        # Iterate
        for _ in range(self.iterations):
            new_scores = {}
            
            for user_id in profiles:
                # Base score (random jump)
                score = (1 - self.damping_factor) / n
                
                # Score from incoming connections
                for source_id, weight in incoming[user_id]:
                    out_count = len(outgoing[source_id])
                    if out_count > 0:
                        score += (
                            self.damping_factor * 
                            scores[source_id] * 
                            weight / 
                            out_count
                        )
                
                new_scores[user_id] = score
            
            # Normalize
            total = sum(new_scores.values())
            scores = {uid: s / total for uid, s in new_scores.items()}
        
        return scores
    
    def calculate_composite_score(
        self,
        profile: 'InfluencerProfile',
        pagerank: float,
        engagement_metrics: 'EngagementMetrics'
    ) -> float:
        """Calculate composite influence score."""
        
        # Components (normalized to 0-100)
        reach_score = min(100, math.log10(profile.followers + 1) * 15)
        
        pagerank_score = min(100, pagerank * 10000)
        
        engagement_score = min(100, engagement_metrics.engagement_rate * 1000)
        
        authenticity_score = min(100, (
            (1 - engagement_metrics.top_engager_concentration) * 50 +
            min(50, engagement_metrics.unique_engagers / 10)
        ))
        
        # Weighted combination
        composite = (
            reach_score * 0.25 +
            pagerank_score * 0.30 +
            engagement_score * 0.25 +
            authenticity_score * 0.20
        )
        
        return round(composite, 2)
```

---

## Engagement Authenticity Analyzer

```python
# authenticity_analyzer.py
from collections import Counter
from datetime import datetime, timedelta
from typing import Optional

from xeepy import Xeepy
from influencer_models import EngagementMetrics

class AuthenticityAnalyzer:
    """Analyze engagement authenticity."""
    
    async def analyze_engagement(
        self,
        username: str,
        tweet_count: int = 20
    ) -> EngagementMetrics:
        """Analyze engagement patterns for authenticity."""
        
        async with Xeepy() as x:
            # Get recent tweets with engagement
            tweets = await x.scrape.tweets(username, limit=tweet_count)
            
            if not tweets:
                return self._empty_metrics(username)
            
            # Calculate averages
            likes = [t.like_count for t in tweets]
            retweets = [t.retweet_count for t in tweets]
            replies = [t.reply_count for t in tweets]
            
            avg_likes = sum(likes) / len(likes)
            avg_retweets = sum(retweets) / len(retweets)
            avg_replies = sum(replies) / len(replies)
            
            # Get follower count for engagement rate
            profile = await x.scrape.profile(username)
            followers = profile.followers_count
            
            avg_engagement = avg_likes + avg_retweets + avg_replies
            engagement_rate = avg_engagement / max(followers, 1)
            
            # Analyze engager diversity
            engager_analysis = await self._analyze_engagers(x, tweets[:5])
            
            return EngagementMetrics(
                user_id=profile.id,
                avg_likes=avg_likes,
                avg_retweets=avg_retweets,
                avg_replies=avg_replies,
                engagement_rate=engagement_rate,
                reply_ratio=avg_replies / max(avg_likes, 1),
                unique_engagers=engager_analysis['unique_count'],
                top_engager_concentration=engager_analysis['concentration']
            )
    
    async def _analyze_engagers(
        self, 
        x: Xeepy, 
        tweets: list
    ) -> dict:
        """Analyze who engages with tweets."""
        all_engagers = []
        
        for tweet in tweets:
            try:
                # Get users who liked
                likers = await x.scrape.likes(
                    f"https://x.com/i/status/{tweet.id}",
                    limit=50
                )
                all_engagers.extend([u.username for u in likers])
            except Exception:
                pass
        
        if not all_engagers:
            return {'unique_count': 0, 'concentration': 1.0}
        
        # Count unique engagers
        engager_counts = Counter(all_engagers)
        unique_count = len(engager_counts)
        
        # Calculate concentration (% from top 10)
        total_engagements = len(all_engagers)
        top_10_engagements = sum(count for _, count in engager_counts.most_common(10))
        concentration = top_10_engagements / total_engagements
        
        return {
            'unique_count': unique_count,
            'concentration': concentration
        }
    
    def _empty_metrics(self, user_id: str) -> EngagementMetrics:
        return EngagementMetrics(
            user_id=user_id,
            avg_likes=0,
            avg_retweets=0,
            avg_replies=0,
            engagement_rate=0,
            reply_ratio=0,
            unique_engagers=0,
            top_engager_concentration=1.0
        )
    
    def calculate_authenticity_score(self, metrics: EngagementMetrics) -> float:
        """Calculate authenticity score (0-100)."""
        score = 100.0
        
        # Red flags
        
        # Very high engagement rate (> 10%) is suspicious
        if metrics.engagement_rate > 0.10:
            score -= 20
        
        # High concentration in top engagers
        if metrics.top_engager_concentration > 0.5:
            score -= 30 * metrics.top_engager_concentration
        
        # Very low unique engagers
        if metrics.unique_engagers < 10:
            score -= 20
        
        # Abnormal like-to-reply ratio
        if metrics.avg_likes > 0 and metrics.reply_ratio < 0.01:
            score -= 15  # Likes but no conversation
        
        return max(0, min(100, score))
```

---

## Niche Classifier

```python
# niche_classifier.py
from collections import Counter
import re

class NicheClassifier:
    """Classify influencers into niche categories."""
    
    NICHE_KEYWORDS = {
        'tech': ['tech', 'software', 'coding', 'programming', 'developer', 
                 'startup', 'ai', 'ml', 'data', 'cloud', 'saas'],
        'crypto': ['crypto', 'bitcoin', 'btc', 'eth', 'web3', 'defi', 
                   'nft', 'blockchain', 'token', 'dao'],
        'finance': ['finance', 'investing', 'stocks', 'trading', 'market',
                    'portfolio', 'wealth', 'money', 'fintech'],
        'marketing': ['marketing', 'growth', 'seo', 'content', 'brand',
                      'social media', 'ads', 'copywriting', 'funnel'],
        'design': ['design', 'ui', 'ux', 'figma', 'creative', 'visual',
                   'branding', 'graphic', 'illustration'],
        'gaming': ['gaming', 'games', 'esports', 'streamer', 'twitch',
                   'playstation', 'xbox', 'nintendo'],
        'fitness': ['fitness', 'workout', 'gym', 'health', 'nutrition',
                    'wellness', 'training', 'muscle'],
        'lifestyle': ['lifestyle', 'travel', 'food', 'fashion', 'luxury',
                      'photography', 'adventure'],
    }
    
    def classify(
        self, 
        bio: str, 
        tweets: list[str]
    ) -> list[tuple[str, float]]:
        """Classify into niches with confidence scores."""
        
        # Combine text
        all_text = (bio + " " + " ".join(tweets)).lower()
        
        # Count keyword matches
        niche_scores = {}
        for niche, keywords in self.NICHE_KEYWORDS.items():
            matches = sum(1 for kw in keywords if kw in all_text)
            if matches > 0:
                niche_scores[niche] = matches / len(keywords)
        
        # Sort by score
        sorted_niches = sorted(
            niche_scores.items(), 
            key=lambda x: x[1], 
            reverse=True
        )
        
        return sorted_niches[:3]  # Top 3 niches
    
    def extract_topics(self, tweets: list[str]) -> list[str]:
        """Extract common topics from tweets."""
        # Extract hashtags
        hashtags = []
        for tweet in tweets:
            hashtags.extend(re.findall(r'#(\w+)', tweet.lower()))
        
        # Most common
        counter = Counter(hashtags)
        return [tag for tag, _ in counter.most_common(10)]
```

---

## Outreach Prioritization

```python
# outreach_prioritizer.py
from dataclasses import dataclass
from typing import Optional

@dataclass
class OutreachCandidate:
    profile: 'InfluencerProfile'
    priority_score: float
    estimated_roi: float
    outreach_angle: str
    contact_method: str
    notes: list[str]

class OutreachPrioritizer:
    """Prioritize influencers for outreach."""
    
    def __init__(
        self,
        target_niches: list[str],
        budget_per_influencer: float = 500,
        min_followers: int = 5000,
        max_followers: int = 500000
    ):
        self.target_niches = target_niches
        self.budget = budget_per_influencer
        self.min_followers = min_followers
        self.max_followers = max_followers
    
    def prioritize(
        self,
        profiles: list['InfluencerProfile'],
        engagement_metrics: dict[str, 'EngagementMetrics']
    ) -> list[OutreachCandidate]:
        """Generate prioritized outreach list."""
        
        candidates = []
        
        for profile in profiles:
            # Filter by follower range
            if not (self.min_followers <= profile.followers <= self.max_followers):
                continue
            
            # Check niche match
            niche_match = any(
                niche in profile.niche_categories 
                for niche in self.target_niches
            )
            if not niche_match:
                continue
            
            # Get engagement metrics
            metrics = engagement_metrics.get(profile.user_id)
            
            # Calculate priority score
            priority = self._calculate_priority(profile, metrics)
            
            # Estimate ROI
            roi = self._estimate_roi(profile, metrics)
            
            # Determine outreach angle
            angle = self._determine_angle(profile)
            
            candidates.append(OutreachCandidate(
                profile=profile,
                priority_score=priority,
                estimated_roi=roi,
                outreach_angle=angle,
                contact_method='dm' if profile.followers < 50000 else 'email',
                notes=self._generate_notes(profile, metrics)
            ))
        
        # Sort by priority
        candidates.sort(key=lambda c: c.priority_score, reverse=True)
        
        return candidates
    
    def _calculate_priority(
        self, 
        profile: 'InfluencerProfile',
        metrics: Optional['EngagementMetrics']
    ) -> float:
        """Calculate outreach priority score."""
        score = 0.0
        
        # Influence score
        score += profile.influence_score * 0.3
        
        # Engagement rate
        if metrics:
            score += min(30, metrics.engagement_rate * 1000)
        
        # Authenticity
        score += profile.authenticity_score * 0.2
        
        # Follower sweet spot (10k-100k)
        if 10000 <= profile.followers <= 100000:
            score += 20
        
        return score
    
    def _estimate_roi(
        self,
        profile: 'InfluencerProfile',
        metrics: Optional['EngagementMetrics']
    ) -> float:
        """Estimate ROI for partnership."""
        if not metrics:
            return 0.0
        
        # Estimated reach per post
        reach = profile.followers * 0.1  # 10% reach assumption
        
        # Estimated engagements
        engagements = reach * metrics.engagement_rate
        
        # Value per engagement (adjust based on your metrics)
        value_per_engagement = 0.50
        
        estimated_value = engagements * value_per_engagement
        roi = (estimated_value - self.budget) / self.budget * 100
        
        return round(roi, 2)
    
    def _determine_angle(self, profile: 'InfluencerProfile') -> str:
        """Determine best outreach angle."""
        if 'tech' in profile.niche_categories:
            return "product_review"
        elif 'marketing' in profile.niche_categories:
            return "case_study"
        elif 'crypto' in profile.niche_categories:
            return "partnership"
        else:
            return "sponsored_content"
    
    def _generate_notes(
        self,
        profile: 'InfluencerProfile',
        metrics: Optional['EngagementMetrics']
    ) -> list[str]:
        """Generate outreach notes."""
        notes = []
        
        if profile.authenticity_score > 80:
            notes.append("✓ High authenticity - genuine engagement")
        
        if metrics and metrics.engagement_rate > 0.05:
            notes.append("✓ Excellent engagement rate")
        
        if profile.follower_ratio > 10:
            notes.append("✓ Strong follower ratio")
        
        return notes
```

---

## Network Visualization

```python
# network_visualizer.py
import json
from typing import Optional

class NetworkVisualizer:
    """Generate network visualizations."""
    
    def generate_d3_json(
        self,
        profiles: dict[str, 'InfluencerProfile'],
        connections: list['InfluencerConnection']
    ) -> str:
        """Generate D3.js compatible JSON."""
        
        nodes = []
        for uid, profile in profiles.items():
            nodes.append({
                'id': uid,
                'name': profile.username,
                'followers': profile.followers,
                'influence': profile.influence_score,
                'niches': profile.niche_categories,
                'group': profile.niche_categories[0] if profile.niche_categories else 'other'
            })
        
        links = []
        for conn in connections:
            if conn.source_id in profiles and conn.target_id in profiles:
                links.append({
                    'source': conn.source_id,
                    'target': conn.target_id,
                    'type': conn.connection_type,
                    'weight': conn.weight
                })
        
        return json.dumps({'nodes': nodes, 'links': links}, indent=2)
    
    def generate_html_visualization(
        self,
        profiles: dict[str, 'InfluencerProfile'],
        connections: list['InfluencerConnection'],
        output_file: str = "network.html"
    ):
        """Generate interactive HTML visualization."""
        
        data = self.generate_d3_json(profiles, connections)
        
        html = f"""
<!DOCTYPE html>
<html>
<head>
    <title>Influencer Network</title>
    <script src="https://d3js.org/d3.v7.min.js"></script>
    <style>
        body {{ margin: 0; font-family: Arial, sans-serif; }}
        svg {{ width: 100vw; height: 100vh; }}
        .node {{ cursor: pointer; }}
        .link {{ stroke: #999; stroke-opacity: 0.6; }}
        .tooltip {{ 
            position: absolute; padding: 10px; 
            background: white; border: 1px solid #ddd;
            border-radius: 4px; pointer-events: none;
        }}
    </style>
</head>
<body>
    <svg></svg>
    <script>
        const data = {data};
        
        const svg = d3.select("svg");
        const width = window.innerWidth;
        const height = window.innerHeight;
        
        const color = d3.scaleOrdinal(d3.schemeCategory10);
        
        const simulation = d3.forceSimulation(data.nodes)
            .force("link", d3.forceLink(data.links).id(d => d.id))
            .force("charge", d3.forceManyBody().strength(-100))
            .force("center", d3.forceCenter(width / 2, height / 2));
        
        const link = svg.append("g")
            .selectAll("line")
            .data(data.links)
            .join("line")
            .attr("class", "link")
            .attr("stroke-width", d => d.weight);
        
        const node = svg.append("g")
            .selectAll("circle")
            .data(data.nodes)
            .join("circle")
            .attr("class", "node")
            .attr("r", d => Math.sqrt(d.followers) / 100 + 5)
            .attr("fill", d => color(d.group))
            .call(drag(simulation));
        
        node.append("title")
            .text(d => `@${{d.name}} (${{d.followers.toLocaleString()}} followers)`);
        
        simulation.on("tick", () => {{
            link
                .attr("x1", d => d.source.x)
                .attr("y1", d => d.source.y)
                .attr("x2", d => d.target.x)
                .attr("y2", d => d.target.y);
            
            node
                .attr("cx", d => d.x)
                .attr("cy", d => d.y);
        }});
        
        function drag(simulation) {{
            return d3.drag()
                .on("start", (event, d) => {{
                    if (!event.active) simulation.alphaTarget(0.3).restart();
                    d.fx = d.x; d.fy = d.y;
                }})
                .on("drag", (event, d) => {{
                    d.fx = event.x; d.fy = event.y;
                }})
                .on("end", (event, d) => {{
                    if (!event.active) simulation.alphaTarget(0);
                    d.fx = null; d.fy = null;
                }});
        }}
    </script>
</body>
</html>
"""
        
        with open(output_file, 'w') as f:
            f.write(html)
        
        print(f"Visualization saved to {output_file}")
```

---

## Complete Usage Example

```python
# main.py
import asyncio
from network_builder import NetworkBuilder
from influence_calculator import InfluenceCalculator
from authenticity_analyzer import AuthenticityAnalyzer
from niche_classifier import NicheClassifier
from outreach_prioritizer import OutreachPrioritizer
from network_visualizer import NetworkVisualizer

async def main():
    # 1. Build network from seed accounts
    builder = NetworkBuilder(niche_keywords=['tech', 'startup', 'ai'])
    
    profiles = await builder.discover_influencers(
        seed_accounts=['elonmusk', 'paulg', 'naval'],
        depth=2,
        min_followers=10000
    )
    
    print(f"Discovered {len(profiles)} influencers")
    
    # 2. Calculate influence scores
    calculator = InfluenceCalculator()
    pagerank_scores = calculator.calculate_pagerank(
        builder.profiles,
        builder.connections
    )
    
    # 3. Analyze engagement authenticity
    analyzer = AuthenticityAnalyzer()
    engagement_metrics = {}
    
    for profile in profiles[:20]:  # Top 20
        metrics = await analyzer.analyze_engagement(profile.username)
        engagement_metrics[profile.user_id] = metrics
        profile.authenticity_score = analyzer.calculate_authenticity_score(metrics)
    
    # 4. Classify niches
    classifier = NicheClassifier()
    # (Would need tweets for full classification)
    
    # 5. Calculate composite scores
    for profile in profiles:
        if profile.user_id in engagement_metrics:
            profile.influence_score = calculator.calculate_composite_score(
                profile,
                pagerank_scores.get(profile.user_id, 0),
                engagement_metrics[profile.user_id]
            )
    
    # 6. Generate outreach list
    prioritizer = OutreachPrioritizer(
        target_niches=['tech', 'startup'],
        budget_per_influencer=500
    )
    
    candidates = prioritizer.prioritize(profiles, engagement_metrics)
    
    print("\nTop Outreach Candidates:")
    for i, c in enumerate(candidates[:10], 1):
        print(f"{i}. @{c.profile.username}")
        print(f"   Score: {c.priority_score:.1f} | ROI: {c.estimated_roi:.1f}%")
        print(f"   Angle: {c.outreach_angle}")
    
    # 7. Generate visualization
    visualizer = NetworkVisualizer()
    visualizer.generate_html_visualization(
        builder.profiles,
        builder.connections,
        "influencer_network.html"
    )

if __name__ == "__main__":
    asyncio.run(main())
```

---

## Best Practices

!!! tip "Network Discovery"
    - Start with 3-5 well-connected seed accounts
    - Limit depth to 2-3 to avoid noise
    - Filter by minimum engagement rate

!!! warning "Authenticity Checks"
    - Always verify engagement authenticity
    - Look for engagement pods
    - Check follower growth patterns

---

## Related Recipes

- [Brand Monitoring](brand-monitoring.md) - Track brand mentions
- [Hashtag Strategy](../growth/hashtag-strategy.md) - Find niche hashtags
- [Engagement Analytics](../../guides/analytics/engagement.md) - Deep metrics
