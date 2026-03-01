# Competitor Intelligence

Know what your competitors are doing before they do.

## Competitor Monitoring Dashboard

Real-time intelligence on competitor activity:

```python
import asyncio
from xeepy import Xeepy
from dataclasses import dataclass
from datetime import datetime, timedelta
from collections import defaultdict

@dataclass
class CompetitorIntel:
    username: str
    followers: int
    following: int
    follower_change_7d: int
    tweets_per_day: float
    avg_engagement: float
    engagement_rate: float
    top_content_types: dict
    posting_hours: list
    recent_campaigns: list
    audience_overlap: float

async def competitor_deep_dive(competitor: str, your_username: str = "me"):
    """Complete competitor analysis"""
    
    async with Xeepy() as x:
        # Get competitor profile
        profile = await x.scrape.profile(competitor)
        
        # Get their tweets
        tweets = await x.scrape.tweets(competitor, limit=200)
        
        # Get follower samples for overlap analysis
        their_followers = await x.scrape.followers(competitor, limit=500)
        my_followers = await x.scrape.followers(your_username, limit=500)
        
        # Calculate metrics
        # 1. Posting frequency
        if tweets:
            date_range = (tweets[0].created_at - tweets[-1].created_at).days or 1
            tweets_per_day = len(tweets) / date_range
        else:
            tweets_per_day = 0
        
        # 2. Engagement metrics
        total_engagement = sum(t.likes + t.retweets + t.replies for t in tweets)
        avg_engagement = total_engagement / len(tweets) if tweets else 0
        engagement_rate = (avg_engagement / profile.followers_count * 100) if profile.followers_count else 0
        
        # 3. Content type analysis
        content_types = defaultdict(int)
        for tweet in tweets:
            if tweet.media:
                if "video" in str(tweet.media):
                    content_types["video"] += 1
                else:
                    content_types["image"] += 1
            elif "🧵" in tweet.text or tweet.is_thread:
                content_types["thread"] += 1
            elif tweet.poll:
                content_types["poll"] += 1
            else:
                content_types["text"] += 1
        
        # 4. Posting hours
        posting_hours = defaultdict(int)
        for tweet in tweets:
            posting_hours[tweet.created_at.hour] += 1
        peak_hours = sorted(posting_hours.items(), key=lambda x: x[1], reverse=True)[:3]
        
        # 5. Audience overlap
        their_set = {f.username for f in their_followers}
        my_set = {f.username for f in my_followers}
        overlap = len(their_set & my_set) / len(their_set) * 100 if their_set else 0
        
        # 6. Recent campaigns (detect patterns)
        recent_hashtags = defaultdict(int)
        for tweet in tweets[:50]:  # Last 50 tweets
            for word in tweet.text.split():
                if word.startswith('#'):
                    recent_hashtags[word] += 1
        campaigns = [h for h, c in recent_hashtags.items() if c >= 3]
        
        intel = CompetitorIntel(
            username=competitor,
            followers=profile.followers_count,
            following=profile.following_count,
            follower_change_7d=0,  # Would need historical data
            tweets_per_day=tweets_per_day,
            avg_engagement=avg_engagement,
            engagement_rate=engagement_rate,
            top_content_types=dict(content_types),
            posting_hours=[h for h, _ in peak_hours],
            recent_campaigns=campaigns,
            audience_overlap=overlap,
        )
        
        return intel

async def print_competitor_report(competitor: str):
    intel = await competitor_deep_dive(competitor)
    
    print(f"""
╔══════════════════════════════════════════════════════════════╗
║           COMPETITOR INTELLIGENCE REPORT                      ║
║           @{intel.username:<52}║
╠══════════════════════════════════════════════════════════════╣
║ AUDIENCE                                                      ║
║   Followers:    {intel.followers:>10,}                                    ║
║   Following:    {intel.following:>10,}                                    ║
║   Overlap:      {intel.audience_overlap:>10.1f}%  (shared audience)              ║
╠══════════════════════════════════════════════════════════════╣
║ CONTENT STRATEGY                                              ║
║   Posts/day:    {intel.tweets_per_day:>10.1f}                                    ║
║   Avg engage:   {intel.avg_engagement:>10.0f}                                    ║
║   Engage rate:  {intel.engagement_rate:>10.2f}%                                  ║
║                                                               ║
║   Content Mix:                                                ║""")
    
    for ctype, count in intel.top_content_types.items():
        pct = count / sum(intel.top_content_types.values()) * 100
        print(f"║     {ctype:<10} {pct:>5.1f}%                                      ║")
    
    print(f"""║                                                               ║
║   Peak Hours:   {', '.join(f'{h}:00' for h in intel.posting_hours):<42}║
╠══════════════════════════════════════════════════════════════╣
║ ACTIVE CAMPAIGNS                                              ║""")
    
    for campaign in intel.recent_campaigns[:5]:
        print(f"║   • {campaign:<55}║")
    
    print("""╚══════════════════════════════════════════════════════════════╝""")

asyncio.run(print_competitor_report("competitor_username"))
```

## Competitor Content Spy

See what's working for competitors:

```python
import asyncio
from xeepy import Xeepy

async def spy_on_competitor_content(competitor: str, days: int = 30):
    """Analyze competitor's best performing content"""
    
    async with Xeepy() as x:
        profile = await x.scrape.profile(competitor)
        tweets = await x.scrape.tweets(competitor, limit=200)
        
        # Filter to recent tweets
        cutoff = datetime.now() - timedelta(days=days)
        recent_tweets = [t for t in tweets if t.created_at > cutoff]
        
        # Sort by engagement
        sorted_tweets = sorted(
            recent_tweets,
            key=lambda t: t.likes + t.retweets * 2,  # Weight RTs higher
            reverse=True
        )
        
        print(f"🔍 TOP PERFORMING CONTENT FROM @{competitor}")
        print(f"   (Last {days} days, {len(recent_tweets)} tweets analyzed)")
        print("="*70)
        
        for i, tweet in enumerate(sorted_tweets[:10], 1):
            engagement_rate = (tweet.likes + tweet.retweets) / profile.followers_count * 100
            
            # Detect content patterns
            patterns = []
            if "?" in tweet.text:
                patterns.append("question")
            if any(c in tweet.text for c in "📊📈💡🔥"):
                patterns.append("emoji-heavy")
            if len(tweet.text.split('\n')) > 3:
                patterns.append("formatted")
            if tweet.text.startswith('"') or tweet.text.startswith("'"):
                patterns.append("quote")
            if any(w in tweet.text.lower() for w in ["thread", "🧵", "1/"]):
                patterns.append("thread")
            
            print(f"\n#{i} | ❤️ {tweet.likes:,} | 🔄 {tweet.retweets:,} | 📈 {engagement_rate:.2f}%")
            print(f"   Patterns: {', '.join(patterns) or 'plain text'}")
            print(f"   Posted: {tweet.created_at.strftime('%Y-%m-%d %H:%M')}")
            print(f"   {tweet.text[:200]}{'...' if len(tweet.text) > 200 else ''}")
        
        # Pattern summary
        print("\n" + "="*70)
        print("📊 CONTENT PATTERN ANALYSIS")
        
        pattern_performance = defaultdict(list)
        for tweet in recent_tweets:
            if "?" in tweet.text:
                pattern_performance["questions"].append(tweet.likes)
            if tweet.media:
                pattern_performance["with_media"].append(tweet.likes)
            if len(tweet.text) > 200:
                pattern_performance["long_form"].append(tweet.likes)
            if len(tweet.text) < 100:
                pattern_performance["short_form"].append(tweet.likes)
        
        for pattern, likes_list in pattern_performance.items():
            avg = sum(likes_list) / len(likes_list) if likes_list else 0
            print(f"   {pattern}: {avg:.0f} avg likes ({len(likes_list)} tweets)")

asyncio.run(spy_on_competitor_content("competitor_username", days=30))
```

## Audience Steal Strategy

Systematically target competitor's audience:

```python
import asyncio
from xeepy import Xeepy
from xeepy.actions.base import FollowFilters

async def steal_competitor_audience(
    competitor: str,
    max_follows: int = 100,
    quality_threshold: float = 0.7
):
    """
    Follow competitor's most engaged followers.
    
    Strategy: Follow people who actively engage with competitor
    (they're more likely to engage with similar content)
    """
    
    async with Xeepy() as x:
        print(f"🎯 Targeting @{competitor}'s engaged audience")
        
        # Get competitor's recent tweets
        tweets = await x.scrape.tweets(competitor, limit=20)
        
        # Collect engagers (people who liked/replied)
        engagers = {}
        
        for tweet in tweets:
            # Get likers
            likers = await x.scrape.likers(tweet.url, limit=50)
            for user in likers:
                if user.username not in engagers:
                    engagers[user.username] = {
                        "user": user,
                        "engagement_count": 0,
                        "types": set()
                    }
                engagers[user.username]["engagement_count"] += 1
                engagers[user.username]["types"].add("like")
            
            # Get repliers (higher value)
            replies = await x.scrape.replies(tweet.url, limit=30)
            for reply in replies:
                username = reply.author.username
                if username not in engagers:
                    engagers[username] = {
                        "user": reply.author,
                        "engagement_count": 0,
                        "types": set()
                    }
                engagers[username]["engagement_count"] += 1
                engagers[username]["types"].add("reply")
        
        # Score and filter engagers
        quality_filters = FollowFilters(
            min_followers=100,
            max_followers=50000,
            min_tweets=20,
            must_have_bio=True,
        )
        
        scored_engagers = []
        for username, data in engagers.items():
            user = data["user"]
            
            # Quality score
            matches, _ = quality_filters.matches({
                "followers_count": user.followers_count,
                "following_count": user.following_count,
                "tweets_count": user.tweets_count,
                "bio": user.bio,
                "has_profile_pic": user.has_profile_pic,
            })
            
            if not matches:
                continue
            
            # Engagement score (reply > like)
            engagement_score = data["engagement_count"]
            if "reply" in data["types"]:
                engagement_score *= 2
            
            # Combined score
            total_score = engagement_score * (1 if matches else 0)
            
            scored_engagers.append({
                "username": username,
                "user": user,
                "score": total_score,
                "engagement_count": data["engagement_count"],
                "types": data["types"],
            })
        
        # Sort by score
        scored_engagers.sort(key=lambda x: x["score"], reverse=True)
        
        # Follow top engagers
        print(f"\n📊 Found {len(scored_engagers)} quality engagers")
        print(f"🎯 Following top {max_follows}...\n")
        
        followed = 0
        for engager in scored_engagers[:max_follows]:
            result = await x.follow.user(
                engager["username"],
                source=f"competitor:{competitor}"
            )
            
            if result.success:
                followed += 1
                print(f"✓ @{engager['username']} "
                      f"(engaged {engager['engagement_count']}x, "
                      f"types: {', '.join(engager['types'])})")
            
            await asyncio.sleep(random.uniform(3, 8))
        
        print(f"\n✅ Followed {followed} of @{competitor}'s top engagers")
        return followed

asyncio.run(steal_competitor_audience("competitor_username", max_follows=50))
```

## Competitor Alert System

Get notified when competitors do something notable:

```python
import asyncio
from xeepy import Xeepy
from xeepy.notifications import DiscordWebhook
from datetime import datetime, timedelta

async def competitor_alert_bot(
    competitors: list,
    webhook_url: str,
    check_interval: int = 300  # 5 minutes
):
    """
    Monitor competitors and alert on:
    - Viral tweets (unusual engagement)
    - Campaign launches (new hashtags)
    - Follower milestones
    - Strategy changes
    """
    
    webhook = DiscordWebhook(webhook_url)
    
    # Track state
    last_tweets = {c: None for c in competitors}
    last_followers = {c: None for c in competitors}
    known_hashtags = {c: set() for c in competitors}
    
    async with Xeepy() as x:
        # Initialize state
        for competitor in competitors:
            profile = await x.scrape.profile(competitor)
            tweets = await x.scrape.tweets(competitor, limit=10)
            
            last_followers[competitor] = profile.followers_count
            last_tweets[competitor] = tweets[0].id if tweets else None
            
            for tweet in tweets:
                for word in tweet.text.split():
                    if word.startswith('#'):
                        known_hashtags[competitor].add(word.lower())
        
        print(f"🔍 Monitoring {len(competitors)} competitors...")
        
        while True:
            for competitor in competitors:
                try:
                    profile = await x.scrape.profile(competitor)
                    tweets = await x.scrape.tweets(competitor, limit=10)
                    
                    # Check for new tweets
                    new_tweets = []
                    for tweet in tweets:
                        if last_tweets[competitor] and tweet.id == last_tweets[competitor]:
                            break
                        new_tweets.append(tweet)
                    
                    for tweet in new_tweets:
                        # Check for viral potential
                        age_minutes = (datetime.now() - tweet.created_at).total_seconds() / 60
                        if age_minutes > 0:
                            velocity = tweet.likes / age_minutes
                            
                            if velocity > 5:  # Going viral
                                await webhook.send(
                                    title=f"🔥 @{competitor} Tweet Going Viral",
                                    description=tweet.text[:500],
                                    fields=[
                                        {"name": "❤️ Likes", "value": str(tweet.likes), "inline": True},
                                        {"name": "📈 Velocity", "value": f"{velocity:.1f}/min", "inline": True},
                                        {"name": "🔗 Link", "value": tweet.url, "inline": False},
                                    ],
                                    color=0xFF6347
                                )
                        
                        # Check for new hashtags (campaign launch)
                        for word in tweet.text.split():
                            if word.startswith('#'):
                                tag = word.lower()
                                if tag not in known_hashtags[competitor]:
                                    known_hashtags[competitor].add(tag)
                                    await webhook.send(
                                        title=f"🏷️ @{competitor} New Hashtag Campaign",
                                        description=f"Started using **{word}**",
                                        fields=[
                                            {"name": "Tweet", "value": tweet.text[:200], "inline": False},
                                        ],
                                        color=0x00CED1
                                    )
                    
                    if new_tweets:
                        last_tweets[competitor] = tweets[0].id
                    
                    # Check for follower milestones
                    prev_followers = last_followers[competitor]
                    curr_followers = profile.followers_count
                    
                    # Milestone check (every 1000)
                    if curr_followers // 1000 > prev_followers // 1000:
                        milestone = (curr_followers // 1000) * 1000
                        await webhook.send(
                            title=f"📈 @{competitor} Hit {milestone:,} Followers",
                            description=f"Gained {curr_followers - prev_followers:,} since last check",
                            color=0x32CD32
                        )
                    
                    # Significant growth (>5% in one check)
                    if prev_followers and curr_followers > prev_followers * 1.05:
                        await webhook.send(
                            title=f"🚀 @{competitor} Unusual Growth",
                            description=f"Followers jumped from {prev_followers:,} to {curr_followers:,} (+{((curr_followers/prev_followers)-1)*100:.1f}%)",
                            color=0xFFD700
                        )
                    
                    last_followers[competitor] = curr_followers
                    
                except Exception as e:
                    print(f"Error checking @{competitor}: {e}")
            
            await asyncio.sleep(check_interval)

asyncio.run(competitor_alert_bot(
    competitors=["competitor1", "competitor2", "competitor3"],
    webhook_url="https://discord.com/api/webhooks/..."
))
```

## Competitor Response Analyzer

See how competitors engage with their audience:

```python
async def analyze_competitor_engagement_style(competitor: str):
    """Analyze how a competitor engages with their audience"""
    
    async with Xeepy() as x:
        # Get competitor's replies to others
        # (This requires scraping their profile for replies)
        tweets = await x.scrape.tweets(
            competitor,
            limit=200,
            include_replies=True
        )
        
        replies = [t for t in tweets if t.is_reply]
        original = [t for t in tweets if not t.is_reply]
        
        # Analyze reply patterns
        reply_lengths = [len(t.text) for t in replies]
        avg_reply_length = sum(reply_lengths) / len(reply_lengths) if replies else 0
        
        # Sentiment/tone analysis (simple version)
        positive_words = ["thanks", "great", "love", "awesome", "amazing", "helpful"]
        question_replies = [r for r in replies if "?" in r.text]
        positive_replies = [r for r in replies if any(w in r.text.lower() for w in positive_words)]
        
        # Response time (would need more data for accuracy)
        
        print(f"📊 @{competitor} ENGAGEMENT ANALYSIS")
        print("="*50)
        print(f"\nContent Split:")
        print(f"  Original tweets: {len(original)} ({len(original)/len(tweets)*100:.1f}%)")
        print(f"  Replies: {len(replies)} ({len(replies)/len(tweets)*100:.1f}%)")
        
        print(f"\nReply Style:")
        print(f"  Average length: {avg_reply_length:.0f} characters")
        print(f"  Ask questions: {len(question_replies)} ({len(question_replies)/len(replies)*100:.1f}%)")
        print(f"  Positive tone: {len(positive_replies)} ({len(positive_replies)/len(replies)*100:.1f}%)")
        
        print(f"\n💡 Insights:")
        if len(replies) / len(tweets) > 0.3:
            print("  • Highly engaged with audience")
        if avg_reply_length > 100:
            print("  • Gives detailed responses")
        if len(question_replies) / len(replies) > 0.2:
            print("  • Asks follow-up questions (builds relationships)")

asyncio.run(analyze_competitor_engagement_style("competitor_username"))
```

## Best Practices

!!! tip "Ethical Intelligence"
    - Focus on **public** information only
    - Use insights to improve your own strategy
    - Don't copy content directly
    - Compete on value, not imitation

!!! success "What to Track"
    1. Content types that perform well
    2. Posting frequency and timing
    3. Engagement tactics
    4. Campaign launches
    5. Audience growth patterns

## Next Steps

[:octicons-arrow-right-24: Brand Monitoring](brand-monitoring.md) - Track mentions of your brand

[:octicons-arrow-right-24: Lead Generation](lead-generation.md) - Find prospects from competitor audiences

[:octicons-arrow-right-24: Crisis Detection](crisis-detection.md) - Early warning for competitor missteps
