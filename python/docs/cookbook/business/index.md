# Business Intelligence Cookbook

Transform X/Twitter data into actionable business intelligence.

---

## 🎯 Lead Generation Engine

Build a sophisticated lead generation system that finds and qualifies prospects.

```python
"""
Lead Generation Engine
Identify, qualify, and track potential customers from Twitter
"""

import asyncio
from dataclasses import dataclass, field
from datetime import datetime
from typing import Optional
from enum import Enum

class LeadScore(Enum):
    """Lead qualification scores."""
    HOT = 90      # High intent, good fit
    WARM = 70     # Shows interest
    COOL = 50     # Potential fit
    COLD = 30     # Low priority
    UNQUALIFIED = 0

@dataclass
class Lead:
    """Qualified lead data."""
    username: str
    user_id: str
    name: str
    bio: str
    followers: int
    following: int
    location: Optional[str]
    website: Optional[str]
    
    # Qualification
    score: int = 0
    score_reasons: list = field(default_factory=list)
    intent_signals: list = field(default_factory=list)
    
    # Tracking
    source: str = ""  # How we found them
    first_seen: datetime = field(default_factory=datetime.now)
    last_activity: Optional[datetime] = None
    
    # Engagement history
    engaged: bool = False
    engagement_type: Optional[str] = None
    response_received: bool = False


class LeadGenerator:
    """Generate and qualify leads from Twitter."""
    
    def __init__(self, xeepy, config: dict):
        self.x = xeepy
        self.config = config
        
        # Define your Ideal Customer Profile (ICP)
        self.icp = config.get("icp", {
            "keywords": ["startup", "founder", "ceo", "cto", "saas"],
            "min_followers": 500,
            "max_followers": 50000,
            "must_have_website": True,
            "industries": ["tech", "software", "ai"],
            "exclude_keywords": ["parody", "fan account", "not affiliated"]
        })
        
        # Intent signals to watch for
        self.intent_keywords = config.get("intent_keywords", [
            "looking for",
            "need help with",
            "anyone recommend",
            "struggling with",
            "wish there was",
            "tired of",
            "alternative to"
        ])
        
        self.leads: list[Lead] = []
    
    async def find_leads_from_competitors(
        self,
        competitor_usernames: list[str],
        limit_per_competitor: int = 100
    ) -> list[Lead]:
        """Find leads from competitor followers/engagers."""
        leads = []
        
        for competitor in competitor_usernames:
            print(f"🔍 Analyzing @{competitor}'s audience...")
            
            # Get recent engagers (people who reply/like their content)
            tweets = await self.x.scrape.tweets(competitor, limit=20)
            
            for tweet in tweets.items:
                # Get people who replied
                replies = await self.x.scrape.replies(tweet.url, limit=50)
                
                for reply in replies.items:
                    lead = await self._qualify_user(
                        reply.author,
                        source=f"competitor:{competitor}"
                    )
                    if lead and lead.score >= LeadScore.COOL.value:
                        leads.append(lead)
            
            # Sample of followers
            followers = await self.x.scrape.followers(
                competitor,
                limit=limit_per_competitor
            )
            
            for user in followers.items:
                lead = await self._qualify_user(
                    user,
                    source=f"competitor_follower:{competitor}"
                )
                if lead and lead.score >= LeadScore.COOL.value:
                    leads.append(lead)
        
        # Deduplicate
        seen = set()
        unique_leads = []
        for lead in leads:
            if lead.username not in seen:
                seen.add(lead.username)
                unique_leads.append(lead)
        
        self.leads.extend(unique_leads)
        return unique_leads
    
    async def find_leads_from_intent(
        self,
        search_queries: list[str],
        limit_per_query: int = 50
    ) -> list[Lead]:
        """Find leads showing purchase intent."""
        leads = []
        
        for query in search_queries:
            print(f"🔍 Searching for: {query}")
            
            results = await self.x.scrape.search(query, limit=limit_per_query)
            
            for tweet in results.items:
                # Check for intent signals
                intent_signals = self._detect_intent(tweet.text)
                
                if intent_signals:
                    lead = await self._qualify_user(
                        tweet.author,
                        source=f"intent_search:{query}"
                    )
                    if lead:
                        lead.intent_signals = intent_signals
                        lead.score += 20  # Bonus for showing intent
                        leads.append(lead)
        
        self.leads.extend(leads)
        return leads
    
    async def find_leads_from_hashtags(
        self,
        hashtags: list[str],
        limit_per_hashtag: int = 100
    ) -> list[Lead]:
        """Find leads from relevant hashtags."""
        leads = []
        
        for hashtag in hashtags:
            print(f"🔍 Scanning #{hashtag}...")
            
            tweets = await self.x.scrape.hashtag(
                f"#{hashtag}",
                limit=limit_per_hashtag
            )
            
            for tweet in tweets.items:
                lead = await self._qualify_user(
                    tweet.author,
                    source=f"hashtag:{hashtag}"
                )
                if lead and lead.score >= LeadScore.COOL.value:
                    leads.append(lead)
        
        self.leads.extend(leads)
        return leads
    
    async def _qualify_user(self, user, source: str) -> Optional[Lead]:
        """Qualify a user against ICP criteria."""
        # Skip if missing key data
        if not user or not user.username:
            return None
        
        # Get full profile if needed
        if not hasattr(user, 'bio') or not user.bio:
            try:
                user = await self.x.scrape.profile(user.username)
            except:
                return None
        
        # Start scoring
        score = 50  # Base score
        reasons = []
        
        bio_lower = (user.bio or "").lower()
        
        # Check ICP keywords in bio
        for keyword in self.icp.get("keywords", []):
            if keyword.lower() in bio_lower:
                score += 10
                reasons.append(f"Bio contains '{keyword}'")
        
        # Check exclusion keywords
        for exclude in self.icp.get("exclude_keywords", []):
            if exclude.lower() in bio_lower:
                return None  # Disqualify
        
        # Follower range check
        min_followers = self.icp.get("min_followers", 0)
        max_followers = self.icp.get("max_followers", float("inf"))
        
        if user.followers_count < min_followers:
            score -= 20
            reasons.append("Below minimum followers")
        elif user.followers_count > max_followers:
            score -= 10
            reasons.append("Above maximum followers")
        else:
            score += 10
            reasons.append("Follower count in range")
        
        # Website check
        if self.icp.get("must_have_website") and user.website:
            score += 15
            reasons.append("Has website")
        elif self.icp.get("must_have_website"):
            score -= 10
            reasons.append("No website")
        
        # Engagement ratio (active account)
        if user.followers_count > 0:
            ratio = user.following_count / user.followers_count
            if 0.5 <= ratio <= 2.0:
                score += 5
                reasons.append("Healthy follow ratio")
        
        # Create lead
        lead = Lead(
            username=user.username,
            user_id=user.id,
            name=user.name or user.username,
            bio=user.bio or "",
            followers=user.followers_count,
            following=user.following_count,
            location=getattr(user, 'location', None),
            website=getattr(user, 'website', None),
            score=max(0, min(100, score)),
            score_reasons=reasons,
            source=source
        )
        
        return lead
    
    def _detect_intent(self, text: str) -> list[str]:
        """Detect purchase intent signals in text."""
        text_lower = text.lower()
        signals = []
        
        for signal in self.intent_keywords:
            if signal.lower() in text_lower:
                signals.append(signal)
        
        return signals
    
    def export_leads(self, filepath: str, min_score: int = 50):
        """Export qualified leads to CSV."""
        qualified = [l for l in self.leads if l.score >= min_score]
        
        self.x.export.to_csv([
            {
                "username": l.username,
                "name": l.name,
                "bio": l.bio,
                "followers": l.followers,
                "website": l.website,
                "score": l.score,
                "score_reasons": "; ".join(l.score_reasons),
                "intent_signals": "; ".join(l.intent_signals),
                "source": l.source,
                "twitter_url": f"https://x.com/{l.username}"
            }
            for l in qualified
        ], filepath)
        
        print(f"✅ Exported {len(qualified)} leads to {filepath}")


# Usage
async def main():
    from xeepy import Xeepy
    
    async with Xeepy() as x:
        generator = LeadGenerator(x, {
            "icp": {
                "keywords": ["founder", "ceo", "startup", "saas", "building"],
                "min_followers": 500,
                "max_followers": 100000,
                "must_have_website": True,
                "exclude_keywords": ["parody", "meme"]
            },
            "intent_keywords": [
                "looking for a tool",
                "need help with",
                "any recommendations for",
                "alternative to"
            ]
        })
        
        # Find leads from multiple sources
        await generator.find_leads_from_competitors(
            ["competitor1", "competitor2"],
            limit_per_competitor=50
        )
        
        await generator.find_leads_from_intent([
            '"looking for" automation tool',
            '"need help with" twitter growth'
        ])
        
        await generator.find_leads_from_hashtags([
            "buildinpublic",
            "indiehackers"
        ])
        
        # Export qualified leads
        generator.export_leads("qualified_leads.csv", min_score=60)

asyncio.run(main())
```

---

## 📊 Competitor Intelligence Dashboard

Monitor competitors in real-time.

```python
"""
Competitor Intelligence Dashboard
Real-time competitive monitoring and analysis
"""

import asyncio
from dataclasses import dataclass, field
from datetime import datetime, timedelta
from collections import defaultdict

@dataclass
class CompetitorProfile:
    """Tracked competitor data."""
    username: str
    name: str
    bio: str
    followers: int
    following: int
    tweet_count: int
    
    # Historical tracking
    followers_history: list = field(default_factory=list)
    engagement_history: list = field(default_factory=list)
    
    # Content analysis
    top_tweets: list = field(default_factory=list)
    posting_frequency: float = 0.0
    avg_engagement: float = 0.0
    content_themes: dict = field(default_factory=dict)
    
    # Alerts
    alerts: list = field(default_factory=list)


class CompetitorIntelligence:
    """Monitor and analyze competitors."""
    
    def __init__(self, xeepy, competitors: list[str]):
        self.x = xeepy
        self.competitors = competitors
        self.profiles: dict[str, CompetitorProfile] = {}
        self.baseline: dict = {}
    
    async def initialize(self):
        """Capture baseline data for all competitors."""
        print("📊 Capturing competitor baselines...")
        
        for username in self.competitors:
            profile = await self.x.scrape.profile(username)
            
            self.profiles[username] = CompetitorProfile(
                username=username,
                name=profile.name,
                bio=profile.bio,
                followers=profile.followers_count,
                following=profile.following_count,
                tweet_count=profile.tweets_count
            )
            
            # Capture initial metrics
            await self._analyze_content(username)
        
        print(f"✅ Tracking {len(self.profiles)} competitors")
    
    async def check_for_changes(self) -> list[dict]:
        """Check for significant competitor changes."""
        alerts = []
        
        for username, profile in self.profiles.items():
            current = await self.x.scrape.profile(username)
            
            # Follower spike/drop
            follower_change = current.followers_count - profile.followers
            change_pct = (follower_change / profile.followers) * 100 if profile.followers > 0 else 0
            
            if abs(change_pct) >= 5:
                alert = {
                    "type": "follower_change",
                    "competitor": username,
                    "change": follower_change,
                    "change_pct": change_pct,
                    "direction": "gained" if follower_change > 0 else "lost",
                    "timestamp": datetime.now()
                }
                alerts.append(alert)
                profile.alerts.append(alert)
            
            # Bio change
            if current.bio != profile.bio:
                alerts.append({
                    "type": "bio_change",
                    "competitor": username,
                    "old_bio": profile.bio,
                    "new_bio": current.bio,
                    "timestamp": datetime.now()
                })
            
            # Update tracking
            profile.followers = current.followers_count
            profile.followers_history.append({
                "timestamp": datetime.now(),
                "count": current.followers_count
            })
            profile.bio = current.bio
        
        return alerts
    
    async def _analyze_content(self, username: str):
        """Analyze competitor content strategy."""
        profile = self.profiles[username]
        
        # Get recent tweets
        tweets = await self.x.scrape.tweets(username, limit=100)
        
        if not tweets.items:
            return
        
        # Calculate metrics
        total_engagement = sum(
            (t.likes or 0) + (t.retweets or 0) + (t.replies or 0)
            for t in tweets.items
        )
        profile.avg_engagement = total_engagement / len(tweets.items)
        
        # Find top performers
        sorted_tweets = sorted(
            tweets.items,
            key=lambda t: (t.likes or 0) + (t.retweets or 0),
            reverse=True
        )
        profile.top_tweets = sorted_tweets[:5]
        
        # Posting frequency
        if len(tweets.items) >= 2:
            time_span = tweets.items[0].created_at - tweets.items[-1].created_at
            days = max(time_span.days, 1)
            profile.posting_frequency = len(tweets.items) / days
        
        # Content themes (simple keyword analysis)
        themes = defaultdict(int)
        theme_keywords = {
            "product": ["launch", "ship", "built", "feature", "update"],
            "growth": ["grow", "scale", "revenue", "mrr", "arb"],
            "education": ["learn", "tip", "how to", "thread", "guide"],
            "engagement": ["what do you", "question", "thoughts", "agree"],
            "personal": ["excited", "grateful", "journey", "milestone"]
        }
        
        for tweet in tweets.items:
            text_lower = tweet.text.lower()
            for theme, keywords in theme_keywords.items():
                if any(kw in text_lower for kw in keywords):
                    themes[theme] += 1
        
        profile.content_themes = dict(themes)
    
    async def get_content_gaps(self) -> dict:
        """Find content opportunities competitors are missing."""
        all_themes = defaultdict(int)
        competitor_themes = {}
        
        for username, profile in self.profiles.items():
            await self._analyze_content(username)
            competitor_themes[username] = profile.content_themes
            for theme, count in profile.content_themes.items():
                all_themes[theme] += count
        
        # Find themes with low coverage
        gaps = {}
        for theme, total in all_themes.items():
            avg = total / len(self.competitors)
            gaps[theme] = {
                "total_posts": total,
                "avg_per_competitor": avg,
                "opportunity": "high" if avg < 5 else "medium" if avg < 15 else "low"
            }
        
        return gaps
    
    async def benchmark_report(self) -> str:
        """Generate competitive benchmark report."""
        report = ["# Competitive Intelligence Report", ""]
        report.append(f"*Generated: {datetime.now().strftime('%Y-%m-%d %H:%M')}*")
        report.append("")
        
        # Summary table
        report.append("## Overview")
        report.append("")
        report.append("| Competitor | Followers | Avg Engagement | Posts/Day |")
        report.append("|------------|-----------|----------------|-----------|")
        
        for username, profile in self.profiles.items():
            report.append(
                f"| @{username} | {profile.followers:,} | "
                f"{profile.avg_engagement:.1f} | {profile.posting_frequency:.1f} |"
            )
        
        report.append("")
        
        # Top performing content
        report.append("## Top Performing Content")
        for username, profile in self.profiles.items():
            report.append(f"\n### @{username}")
            for i, tweet in enumerate(profile.top_tweets[:3], 1):
                engagement = (tweet.likes or 0) + (tweet.retweets or 0)
                report.append(f"{i}. [{tweet.text[:50]}...]({tweet.url}) - {engagement:,} engagements")
        
        # Content themes
        report.append("\n## Content Strategy Analysis")
        for username, profile in self.profiles.items():
            report.append(f"\n### @{username}")
            for theme, count in sorted(profile.content_themes.items(), key=lambda x: -x[1]):
                report.append(f"- {theme.title()}: {count} posts")
        
        # Alerts
        all_alerts = []
        for profile in self.profiles.values():
            all_alerts.extend(profile.alerts)
        
        if all_alerts:
            report.append("\n## Recent Alerts")
            for alert in sorted(all_alerts, key=lambda x: x["timestamp"], reverse=True)[:10]:
                report.append(f"- **{alert['type']}**: @{alert['competitor']} - {alert.get('change', 'N/A')}")
        
        return "\n".join(report)


# Usage
async def run_competitor_monitoring():
    from xeepy import Xeepy
    
    async with Xeepy() as x:
        intel = CompetitorIntelligence(x, [
            "competitor1",
            "competitor2",
            "competitor3"
        ])
        
        await intel.initialize()
        
        # Check for changes
        alerts = await intel.check_for_changes()
        for alert in alerts:
            print(f"🚨 {alert['type']}: @{alert['competitor']}")
        
        # Find content gaps
        gaps = await intel.get_content_gaps()
        print("\n📊 Content Opportunities:")
        for theme, data in gaps.items():
            if data['opportunity'] == 'high':
                print(f"  - {theme}: HIGH opportunity")
        
        # Generate report
        report = await intel.benchmark_report()
        with open("competitor_report.md", "w") as f:
            f.write(report)
        print("\n✅ Report saved to competitor_report.md")

asyncio.run(run_competitor_monitoring())
```

---

## 💰 ROI Tracking System

Measure the business impact of your Twitter presence.

```python
"""
Twitter ROI Tracking System
Measure business outcomes from Twitter activities
"""

import asyncio
from dataclasses import dataclass
from datetime import datetime, timedelta
from typing import Optional
import json

@dataclass
class Conversion:
    """A tracked conversion event."""
    event_id: str
    event_type: str  # "signup", "demo", "sale", "lead"
    source_tweet: Optional[str]
    source_campaign: Optional[str]
    username: Optional[str]
    value: float
    timestamp: datetime
    attribution: str  # "direct", "assisted", "organic"


class TwitterROI:
    """Track and measure Twitter marketing ROI."""
    
    def __init__(self, xeepy, config: dict):
        self.x = xeepy
        self.config = config
        self.conversions: list[Conversion] = []
        self.campaigns: dict = {}
        self.baseline_metrics: dict = {}
    
    async def start_campaign(
        self,
        campaign_name: str,
        campaign_type: str,
        budget: float = 0,
        goals: dict = None
    ) -> str:
        """Start tracking a new campaign."""
        campaign_id = f"camp_{datetime.now().strftime('%Y%m%d%H%M%S')}"
        
        # Capture baseline
        my_profile = await self.x.scrape.profile(self.config["username"])
        
        self.campaigns[campaign_id] = {
            "name": campaign_name,
            "type": campaign_type,  # "content", "engagement", "follower", "lead_gen"
            "budget": budget,
            "goals": goals or {},
            "start_date": datetime.now(),
            "end_date": None,
            "status": "active",
            "baseline": {
                "followers": my_profile.followers_count,
                "following": my_profile.following_count
            },
            "tweets": [],
            "activities": [],
            "metrics": {}
        }
        
        print(f"🚀 Campaign '{campaign_name}' started (ID: {campaign_id})")
        return campaign_id
    
    async def track_tweet(self, campaign_id: str, tweet_url: str):
        """Track a tweet as part of a campaign."""
        if campaign_id not in self.campaigns:
            raise ValueError(f"Campaign {campaign_id} not found")
        
        # Get tweet metrics
        replies = await self.x.scrape.replies(tweet_url, limit=1)
        tweet_data = {
            "url": tweet_url,
            "tracked_at": datetime.now().isoformat(),
            "initial_metrics": {}  # Would capture likes, RTs, etc.
        }
        
        self.campaigns[campaign_id]["tweets"].append(tweet_data)
    
    async def record_conversion(
        self,
        event_type: str,
        value: float,
        campaign_id: Optional[str] = None,
        source_tweet: Optional[str] = None,
        username: Optional[str] = None,
        metadata: dict = None
    ):
        """Record a conversion event."""
        conversion = Conversion(
            event_id=f"conv_{datetime.now().strftime('%Y%m%d%H%M%S%f')}",
            event_type=event_type,
            source_tweet=source_tweet,
            source_campaign=campaign_id,
            username=username,
            value=value,
            timestamp=datetime.now(),
            attribution=self._determine_attribution(campaign_id, source_tweet)
        )
        
        self.conversions.append(conversion)
        
        # Update campaign metrics
        if campaign_id and campaign_id in self.campaigns:
            camp = self.campaigns[campaign_id]
            camp["activities"].append({
                "type": "conversion",
                "event_type": event_type,
                "value": value,
                "timestamp": datetime.now().isoformat()
            })
        
        print(f"💰 Conversion recorded: {event_type} - ${value}")
    
    def _determine_attribution(
        self,
        campaign_id: Optional[str],
        source_tweet: Optional[str]
    ) -> str:
        """Determine attribution model for conversion."""
        if source_tweet:
            return "direct"
        elif campaign_id:
            return "assisted"
        else:
            return "organic"
    
    async def end_campaign(self, campaign_id: str) -> dict:
        """End a campaign and calculate final metrics."""
        if campaign_id not in self.campaigns:
            raise ValueError(f"Campaign {campaign_id} not found")
        
        camp = self.campaigns[campaign_id]
        camp["end_date"] = datetime.now()
        camp["status"] = "completed"
        
        # Capture final metrics
        my_profile = await self.x.scrape.profile(self.config["username"])
        
        # Calculate results
        baseline = camp["baseline"]
        results = {
            "duration_days": (camp["end_date"] - camp["start_date"]).days,
            "followers_gained": my_profile.followers_count - baseline["followers"],
            "tweets_sent": len(camp["tweets"]),
            "total_conversions": sum(
                1 for c in self.conversions
                if c.source_campaign == campaign_id
            ),
            "total_revenue": sum(
                c.value for c in self.conversions
                if c.source_campaign == campaign_id
            ),
            "budget": camp["budget"]
        }
        
        # Calculate ROI
        if camp["budget"] > 0:
            results["roi"] = ((results["total_revenue"] - camp["budget"]) / camp["budget"]) * 100
        else:
            results["roi"] = float("inf") if results["total_revenue"] > 0 else 0
        
        # Cost per metrics
        if results["followers_gained"] > 0 and camp["budget"] > 0:
            results["cost_per_follower"] = camp["budget"] / results["followers_gained"]
        
        if results["total_conversions"] > 0 and camp["budget"] > 0:
            results["cost_per_conversion"] = camp["budget"] / results["total_conversions"]
        
        camp["results"] = results
        return results
    
    def calculate_lifetime_value(self) -> dict:
        """Calculate customer lifetime value from Twitter."""
        # Group conversions by user
        user_values = {}
        for conv in self.conversions:
            if conv.username:
                if conv.username not in user_values:
                    user_values[conv.username] = {"total": 0, "events": 0}
                user_values[conv.username]["total"] += conv.value
                user_values[conv.username]["events"] += 1
        
        if not user_values:
            return {"avg_ltv": 0, "total_customers": 0}
        
        total_value = sum(u["total"] for u in user_values.values())
        
        return {
            "avg_ltv": total_value / len(user_values),
            "total_customers": len(user_values),
            "total_revenue": total_value,
            "top_customers": sorted(
                user_values.items(),
                key=lambda x: x[1]["total"],
                reverse=True
            )[:10]
        }
    
    def generate_roi_report(self) -> str:
        """Generate comprehensive ROI report."""
        report = ["# Twitter Marketing ROI Report", ""]
        report.append(f"*Generated: {datetime.now().strftime('%Y-%m-%d %H:%M')}*")
        report.append("")
        
        # Overall metrics
        total_conversions = len(self.conversions)
        total_revenue = sum(c.value for c in self.conversions)
        total_budget = sum(c["budget"] for c in self.campaigns.values())
        
        report.append("## Executive Summary")
        report.append("")
        report.append(f"- **Total Campaigns**: {len(self.campaigns)}")
        report.append(f"- **Total Conversions**: {total_conversions}")
        report.append(f"- **Total Revenue**: ${total_revenue:,.2f}")
        report.append(f"- **Total Budget**: ${total_budget:,.2f}")
        if total_budget > 0:
            overall_roi = ((total_revenue - total_budget) / total_budget) * 100
            report.append(f"- **Overall ROI**: {overall_roi:.1f}%")
        report.append("")
        
        # Campaign breakdown
        report.append("## Campaign Performance")
        report.append("")
        report.append("| Campaign | Duration | Followers | Conversions | Revenue | ROI |")
        report.append("|----------|----------|-----------|-------------|---------|-----|")
        
        for camp_id, camp in self.campaigns.items():
            if "results" in camp:
                r = camp["results"]
                report.append(
                    f"| {camp['name']} | {r.get('duration_days', 'N/A')}d | "
                    f"+{r.get('followers_gained', 0)} | {r.get('total_conversions', 0)} | "
                    f"${r.get('total_revenue', 0):,.0f} | {r.get('roi', 0):.1f}% |"
                )
        
        report.append("")
        
        # Attribution
        report.append("## Attribution Analysis")
        attribution_counts = {"direct": 0, "assisted": 0, "organic": 0}
        attribution_values = {"direct": 0, "assisted": 0, "organic": 0}
        
        for conv in self.conversions:
            attribution_counts[conv.attribution] += 1
            attribution_values[conv.attribution] += conv.value
        
        report.append("")
        for attr in ["direct", "assisted", "organic"]:
            report.append(
                f"- **{attr.title()}**: {attribution_counts[attr]} conversions, "
                f"${attribution_values[attr]:,.2f} revenue"
            )
        
        # LTV
        ltv = self.calculate_lifetime_value()
        report.append("")
        report.append("## Customer Value")
        report.append(f"- **Average LTV**: ${ltv['avg_ltv']:,.2f}")
        report.append(f"- **Total Customers**: {ltv['total_customers']}")
        
        return "\n".join(report)


# Usage
async def track_marketing_roi():
    from xeepy import Xeepy
    
    async with Xeepy() as x:
        roi = TwitterROI(x, {"username": "your_account"})
        
        # Start a campaign
        campaign_id = await roi.start_campaign(
            "Q1 Product Launch",
            "content",
            budget=500,
            goals={"followers": 1000, "conversions": 50}
        )
        
        # Track activities
        await roi.track_tweet(campaign_id, "https://x.com/you/status/123")
        
        # Record conversions
        await roi.record_conversion(
            "signup",
            value=0,
            campaign_id=campaign_id,
            source_tweet="https://x.com/you/status/123",
            username="new_user"
        )
        
        await roi.record_conversion(
            "sale",
            value=99.00,
            campaign_id=campaign_id,
            username="new_user"
        )
        
        # End campaign and get results
        results = await roi.end_campaign(campaign_id)
        print(f"\n📊 Campaign Results:")
        print(f"   ROI: {results.get('roi', 0):.1f}%")
        print(f"   Revenue: ${results.get('total_revenue', 0):,.2f}")
        
        # Generate report
        report = roi.generate_roi_report()
        with open("roi_report.md", "w") as f:
            f.write(report)

asyncio.run(track_marketing_roi())
```

---

## 🏢 Customer Support Monitoring

Monitor brand mentions for support opportunities.

```python
"""
Customer Support Monitor
Track and respond to support requests on Twitter
"""

import asyncio
from datetime import datetime
from enum import Enum
from dataclasses import dataclass

class TicketPriority(Enum):
    URGENT = "urgent"
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"

class TicketStatus(Enum):
    NEW = "new"
    IN_PROGRESS = "in_progress"
    WAITING = "waiting"
    RESOLVED = "resolved"

@dataclass
class SupportTicket:
    """Support ticket from Twitter."""
    id: str
    tweet_url: str
    username: str
    text: str
    priority: TicketPriority
    status: TicketStatus
    sentiment: str
    keywords: list
    created_at: datetime
    assigned_to: str = None
    notes: list = None


class SupportMonitor:
    """Monitor Twitter for support requests."""
    
    def __init__(self, xeepy, config: dict):
        self.x = xeepy
        self.config = config
        self.tickets: dict[str, SupportTicket] = {}
        
        # Keywords indicating support needs
        self.support_keywords = config.get("support_keywords", [
            "help", "support", "broken", "issue", "bug",
            "doesn't work", "not working", "can't", "error",
            "problem", "frustrated", "disappointed"
        ])
        
        self.urgent_keywords = config.get("urgent_keywords", [
            "urgent", "asap", "immediately", "critical",
            "down", "outage", "broken"
        ])
    
    async def scan_mentions(self, limit: int = 50) -> list[SupportTicket]:
        """Scan mentions for support requests."""
        brand = self.config["brand_username"]
        mentions = await self.x.scrape.mentions(brand, limit=limit)
        
        new_tickets = []
        for mention in mentions.items:
            if mention.id in self.tickets:
                continue
            
            # Check if it's a support request
            text_lower = mention.text.lower()
            keywords_found = [
                kw for kw in self.support_keywords
                if kw in text_lower
            ]
            
            if not keywords_found:
                continue
            
            # Determine priority
            priority = TicketPriority.MEDIUM
            if any(kw in text_lower for kw in self.urgent_keywords):
                priority = TicketPriority.URGENT
            elif "?" in mention.text and len(keywords_found) == 1:
                priority = TicketPriority.LOW
            
            ticket = SupportTicket(
                id=mention.id,
                tweet_url=mention.url,
                username=mention.author.username,
                text=mention.text,
                priority=priority,
                status=TicketStatus.NEW,
                sentiment=self._analyze_sentiment(mention.text),
                keywords=keywords_found,
                created_at=mention.created_at,
                notes=[]
            )
            
            self.tickets[mention.id] = ticket
            new_tickets.append(ticket)
        
        return new_tickets
    
    def _analyze_sentiment(self, text: str) -> str:
        """Simple sentiment analysis."""
        negative = ["frustrated", "angry", "disappointed", "hate", "terrible", "worst"]
        positive = ["thanks", "appreciate", "love", "great", "awesome"]
        
        text_lower = text.lower()
        
        neg_count = sum(1 for w in negative if w in text_lower)
        pos_count = sum(1 for w in positive if w in text_lower)
        
        if neg_count > pos_count:
            return "negative"
        elif pos_count > neg_count:
            return "positive"
        return "neutral"
    
    def prioritize_queue(self) -> list[SupportTicket]:
        """Get prioritized queue of open tickets."""
        open_tickets = [
            t for t in self.tickets.values()
            if t.status in [TicketStatus.NEW, TicketStatus.IN_PROGRESS]
        ]
        
        # Sort by priority, then sentiment, then age
        priority_order = {
            TicketPriority.URGENT: 0,
            TicketPriority.HIGH: 1,
            TicketPriority.MEDIUM: 2,
            TicketPriority.LOW: 3
        }
        
        sentiment_order = {"negative": 0, "neutral": 1, "positive": 2}
        
        return sorted(open_tickets, key=lambda t: (
            priority_order[t.priority],
            sentiment_order[t.sentiment],
            t.created_at
        ))


# Usage
async def monitor_support():
    from xeepy import Xeepy
    
    async with Xeepy() as x:
        monitor = SupportMonitor(x, {
            "brand_username": "your_brand",
            "support_keywords": ["help", "broken", "issue", "bug", "not working"],
            "urgent_keywords": ["urgent", "down", "critical"]
        })
        
        # Scan for new tickets
        new_tickets = await monitor.scan_mentions(limit=100)
        print(f"🎫 Found {len(new_tickets)} new support requests")
        
        # Get prioritized queue
        queue = monitor.prioritize_queue()
        
        print("\n📋 Support Queue:")
        for ticket in queue[:10]:
            print(f"  [{ticket.priority.value}] @{ticket.username}: {ticket.text[:50]}...")

asyncio.run(monitor_support())
```

---

## 📈 Sales Pipeline Integration

Connect Twitter engagement to your CRM.

```python
"""
Twitter to CRM Pipeline
Sync Twitter interactions with your sales pipeline
"""

import asyncio
from datetime import datetime
import httpx  # For API calls

class TwitterCRMSync:
    """Sync Twitter interactions to CRM."""
    
    def __init__(self, xeepy, crm_config: dict):
        self.x = xeepy
        self.crm_config = crm_config
        self.crm_api = crm_config.get("api_url")
        self.api_key = crm_config.get("api_key")
    
    async def sync_follower_as_lead(self, username: str):
        """Create CRM lead from Twitter follower."""
        # Get profile
        profile = await self.x.scrape.profile(username)
        
        # Map to CRM fields
        lead_data = {
            "source": "twitter",
            "source_id": profile.id,
            "name": profile.name,
            "twitter_handle": f"@{username}",
            "twitter_url": f"https://x.com/{username}",
            "bio": profile.bio,
            "website": profile.website,
            "followers": profile.followers_count,
            "location": getattr(profile, 'location', None),
            "created_at": datetime.now().isoformat()
        }
        
        # Push to CRM (example with generic REST API)
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{self.crm_api}/leads",
                json=lead_data,
                headers={"Authorization": f"Bearer {self.api_key}"}
            )
            return response.json()
    
    async def log_interaction(
        self,
        username: str,
        interaction_type: str,  # "dm", "reply", "like", "follow"
        content: str = None,
        tweet_url: str = None
    ):
        """Log Twitter interaction to CRM."""
        interaction_data = {
            "contact_identifier": f"twitter:@{username}",
            "channel": "twitter",
            "type": interaction_type,
            "content": content,
            "reference_url": tweet_url,
            "timestamp": datetime.now().isoformat()
        }
        
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{self.crm_api}/interactions",
                json=interaction_data,
                headers={"Authorization": f"Bearer {self.api_key}"}
            )
            return response.json()


# Usage example
async def sync_to_crm():
    from xeepy import Xeepy
    
    async with Xeepy() as x:
        crm = TwitterCRMSync(x, {
            "api_url": "https://api.yourcrm.com/v1",
            "api_key": "your_api_key"
        })
        
        # Sync new followers as leads
        new_followers = await x.monitor.new_followers()
        
        for follower in new_followers[:10]:
            await crm.sync_follower_as_lead(follower.username)
            print(f"✅ Synced @{follower.username} to CRM")

asyncio.run(sync_to_crm())
```

---

## Next Steps

- [Growth Recipes](../growth/index.md) - Scale your audience
- [Automation Recipes](../automation/index.md) - Automate workflows
- [Data Science Recipes](../data-science/index.md) - Analyze your data
