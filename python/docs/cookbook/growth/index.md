# 🚀 Growth Hacking Cookbook

Advanced strategies and automation recipes for rapid X/Twitter growth. These are battle-tested techniques used by growth marketers and indie hackers.

!!! warning "Use Responsibly"
    These techniques are powerful. Always prioritize authentic engagement over pure metrics.

## The 10K Follower Playbook

A systematic approach to reach 10,000 followers in 90 days.

### Phase 1: Foundation (Days 1-30)

```python
"""
The Foundation Phase: Build your profile, find your niche, start engaging.
Goal: 0 → 1,000 followers
"""
import asyncio
from xeepy import Xeepy
from xeepy.ai import ContentGenerator

async def foundation_phase():
    async with Xeepy() as x:
        ai = ContentGenerator(provider="openai")
        
        # Step 1: Identify your niche's top accounts
        niche_leaders = [
            "indiehackers", "levelsio", "marc_louvion",
            "arlogilbert", "csallen"
        ]
        
        # Step 2: Analyze what works in your niche
        print("🔍 Analyzing successful content in your niche...")
        content_insights = []
        
        for leader in niche_leaders:
            tweets = await x.scrape.tweets(leader, limit=100)
            
            # Find their best performing tweets
            top_tweets = sorted(tweets, key=lambda t: t.likes, reverse=True)[:10]
            
            for tweet in top_tweets:
                content_insights.append({
                    "author": leader,
                    "text": tweet.text,
                    "likes": tweet.likes,
                    "type": categorize_content(tweet.text)
                })
        
        # Step 3: Daily engagement routine
        print("💬 Starting daily engagement...")
        
        # Engage with your target audience
        for leader in niche_leaders[:3]:  # 3 accounts per day
            followers = await x.scrape.followers(leader, limit=100)
            
            # Filter for ideal connections
            ideal = [
                f for f in followers
                if 500 < f.followers_count < 50000  # Similar size accounts
                and f.tweet_count > 100  # Active
                and not f.is_following  # Not already following
            ]
            
            # Follow and engage
            for user in ideal[:10]:  # 10 per leader = 30/day
                await x.follow.user(user.username)
                
                # Like their recent tweet
                their_tweets = await x.scrape.tweets(user.username, limit=3)
                if their_tweets:
                    await x.engage.like(their_tweets[0].url)
        
        print("✅ Foundation phase daily routine complete!")

def categorize_content(text: str) -> str:
    """Categorize content type for analysis"""
    if "thread" in text.lower() or "🧵" in text:
        return "thread"
    elif "?" in text:
        return "question"
    elif any(word in text.lower() for word in ["tip", "trick", "how to", "guide"]):
        return "educational"
    elif any(word in text.lower() for word in ["launch", "shipped", "built"]):
        return "build_in_public"
    else:
        return "general"
```

### Phase 2: Content Engine (Days 31-60)

```python
"""
The Content Engine: Create viral-worthy content consistently.
Goal: 1,000 → 5,000 followers
"""
import asyncio
from datetime import datetime, timedelta
from xeepy import Xeepy
from xeepy.ai import ContentGenerator

async def content_engine_phase():
    async with Xeepy() as x:
        ai = ContentGenerator(provider="openai")
        
        # Step 1: Find your best posting times
        best_times = await x.analytics.best_time_to_post()
        print(f"📅 Your optimal posting times:")
        for slot in best_times.top_slots[:5]:
            print(f"  {slot.day} at {slot.hour}:00")
        
        # Step 2: Generate content calendar
        content_calendar = []
        content_types = [
            {"type": "thread", "frequency": 2, "day": ["Tuesday", "Thursday"]},
            {"type": "tip", "frequency": 5, "day": "daily"},
            {"type": "personal_story", "frequency": 1, "day": ["Sunday"]},
            {"type": "engagement_hook", "frequency": 7, "day": "daily"},
        ]
        
        for content in content_types:
            ideas = await ai.generate_content_ideas(
                niche="indie hacking/building",
                content_type=content["type"],
                count=content["frequency"] * 4  # 4 weeks worth
            )
            content_calendar.extend(ideas)
        
        # Step 3: The Viral Thread Formula
        print("🧵 Generating viral thread framework...")
        
        thread_topics = [
            "How I went from $0 to $10k MRR",
            "10 tools that 10x'd my productivity",
            "What I learned from 100 failed projects",
            "The exact strategy I used to get my first 1000 users"
        ]
        
        for topic in thread_topics:
            thread = await ai.generate_thread(
                topic=topic,
                style="storytelling",
                thread_length=10,
                hooks={
                    "opener": "contrarian_statement",
                    "closer": "call_to_action"
                }
            )
            
            print(f"\n📝 Thread: {topic}")
            for i, tweet in enumerate(thread.tweets[:3]):
                print(f"  {i+1}. {tweet[:80]}...")
        
        # Step 4: Engagement amplification
        print("\n🔥 Setting up engagement amplification...")
        
        # Find tweets in your niche that are getting traction
        trending = await x.scrape.search(
            "indie hackers OR building in public",
            limit=50,
            min_likes=50,
            max_age_hours=6  # Recent and gaining traction
        )
        
        for tweet in trending[:10]:
            # Generate a valuable comment
            comment = await ai.generate_reply(
                tweet_text=tweet.text,
                style="add_value",  # Add insight, not just "great post!"
                max_length=280
            )
            
            print(f"  Comment on @{tweet.author.username}'s tweet:")
            print(f"    Original: {tweet.text[:60]}...")
            print(f"    Reply: {comment}")

        print("✅ Content engine phase complete!")
```

### Phase 3: Scale (Days 61-90)

```python
"""
The Scale Phase: Leverage systems and automation.
Goal: 5,000 → 10,000 followers
"""
import asyncio
from xeepy import Xeepy
from xeepy.ai import ContentGenerator

async def scale_phase():
    async with Xeepy() as x:
        ai = ContentGenerator(provider="openai")
        
        # Step 1: Optimize your content based on data
        print("📊 Analyzing your content performance...")
        
        my_tweets = await x.scrape.tweets("your_username", limit=200)
        
        # Find patterns in your best content
        top_performers = sorted(my_tweets, key=lambda t: t.engagement_rate, reverse=True)[:20]
        
        patterns = {
            "best_hours": [],
            "best_formats": [],
            "best_topics": [],
            "avg_length": 0
        }
        
        for tweet in top_performers:
            patterns["best_hours"].append(tweet.created_at.hour)
            patterns["avg_length"] += len(tweet.text)
        
        patterns["avg_length"] //= len(top_performers)
        
        print(f"  Best posting hours: {set(patterns['best_hours'])}")
        print(f"  Optimal tweet length: ~{patterns['avg_length']} chars")
        
        # Step 2: Set up collaboration pipeline
        print("\n🤝 Identifying collaboration opportunities...")
        
        # Find accounts in your range that engage with similar content
        collab_candidates = await find_collab_candidates(x, ai)
        
        for candidate in collab_candidates[:10]:
            print(f"  @{candidate.username} - {candidate.reason}")
        
        # Step 3: Automate maintenance
        print("\n🤖 Setting up automation...")
        
        # Daily cleanup: unfollow non-followers
        await x.unfollow.non_followers(
            max_unfollows=25,
            whitelist_file="whitelist.txt",
            min_days_following=7  # Give them a week
        )
        
        # Maintain healthy ratio
        profile = await x.scrape.profile("your_username")
        ratio = profile.followers_count / max(profile.following_count, 1)
        
        if ratio < 1.0:
            print(f"  ⚠️ Follower ratio is {ratio:.2f}. Cleaning up following...")
            await x.unfollow.smart(
                max_unfollows=50,
                criteria={"inactive_days": 30, "not_following_back": True}
            )
        
        print("✅ Scale phase complete!")

async def find_collab_candidates(x, ai):
    """Find accounts perfect for collaboration"""
    # Get your engaged followers
    my_engagers = await x.analytics.top_engagers(limit=100)
    
    candidates = []
    for user in my_engagers:
        # Check if they're in similar follower range
        profile = await x.scrape.profile(user.username)
        
        if 0.5 < (profile.followers_count / 10000) < 2:  # 50% to 200% of your size
            candidates.append({
                "username": profile.username,
                "followers": profile.followers_count,
                "engagement_rate": profile.engagement_rate,
                "reason": f"Engaged with you {user.engagement_count}x, {profile.followers_count} followers"
            })
    
    return sorted(candidates, key=lambda c: c["engagement_rate"], reverse=True)
```

## The Engagement Multiplier

A system to maximize engagement on every tweet you post.

```python
"""
The Engagement Multiplier: Get more eyes on every tweet.
"""
import asyncio
from xeepy import Xeepy

async def engagement_multiplier(tweet_url: str):
    """
    Run this after posting an important tweet to maximize its reach.
    """
    async with Xeepy() as x:
        print(f"🚀 Amplifying tweet: {tweet_url}")
        
        # Step 1: Engage with accounts that typically share your content
        amplifiers = await x.analytics.top_amplifiers(limit=20)
        
        for amp in amplifiers:
            # Like their recent tweet to put yourself on their radar
            their_tweets = await x.scrape.tweets(amp.username, limit=3)
            if their_tweets:
                await x.engage.like(their_tweets[0].url)
                print(f"  📍 Pinged @{amp.username}")
        
        # Step 2: Share in relevant conversations
        related = await x.scrape.search(
            extract_keywords(tweet_url),
            limit=20,
            min_engagement=10,
            max_age_hours=2
        )
        
        # Step 3: Monitor and respond to every reply quickly
        async for reply in x.monitor.tweet_replies(tweet_url, duration="2h"):
            # Quick response increases algorithm favor
            quick_reply = await ai.generate_reply(reply.text, style="grateful")
            await x.engage.reply(reply.url, quick_reply)
            await x.engage.like(reply.url)
            print(f"  💬 Replied to @{reply.author.username}")
        
        # Step 4: Self-reply to bump the tweet
        stats = await x.scrape.tweet(tweet_url)
        if stats.replies < 5:
            # Add valuable self-reply to keep the conversation going
            follow_up = await ai.generate_follow_up(stats.text)
            await x.engage.reply(tweet_url, follow_up)
```

## Network Effect Hacking

Leverage network effects for exponential growth.

```python
"""
Network Effect Hacking: Turn followers into recruiters.
"""
import asyncio
from xeepy import Xeepy

async def network_effect_hack():
    async with Xeepy() as x:
        ai = ContentGenerator(provider="openai")
        
        # Strategy 1: The Shoutout Chain
        print("🔗 Building shoutout chain...")
        
        # Find followers who would benefit from exposure
        deserving = await find_deserving_followers(x)
        
        for user in deserving[:5]:  # Weekly featured followers
            # Create genuine shoutout
            profile = await x.scrape.profile(user.username)
            shoutout = f"""
            Weekly follow recommendation 👇
            
            @{user.username} is building some cool stuff.
            
            What I love:
            • {await ai.summarize(profile.bio)}
            • Great engagement in the community
            
            Give them a follow! 🙌
            """
            
            print(f"  Recommending @{user.username}")
        
        # Strategy 2: The Reply Guy Promotion
        print("\n💬 Reply guy promotion strategy...")
        
        # Find big accounts in your niche
        big_accounts = ["naval", "paulg", "levelsio"]
        
        for account in big_accounts:
            # Wait for their tweet
            latest = await x.scrape.tweets(account, limit=1)
            
            if latest and (datetime.now() - latest[0].created_at).seconds < 300:
                # They just tweeted! Be early with a valuable reply
                valuable_reply = await ai.generate_reply(
                    tweet_text=latest[0].text,
                    style="add_unique_insight",
                    include_question=True  # Encourage response
                )
                
                await x.engage.reply(latest[0].url, valuable_reply)
                print(f"  Early reply to @{account}")
        
        # Strategy 3: The Collaboration Multiplier
        print("\n🤝 Collaboration multiplier...")
        
        # Find your top engaged followers for collaboration
        top_engaged = await x.analytics.most_engaged_followers(limit=20)
        
        # Propose mutual amplification
        for follower in top_engaged[:5]:
            dm_template = f"""
            Hey @{follower.username}! 
            
            I noticed you engage with my content a lot (thank you! 🙏)
            
            Would you be interested in cross-promoting? 
            I'll share your best tweet this week if you share mine.
            
            Let me know!
            """
            
            print(f"  Collab proposal to @{follower.username}")

async def find_deserving_followers(x):
    """Find followers creating quality content who deserve exposure"""
    followers = await x.scrape.followers("your_username", limit=500)
    
    deserving = []
    for f in followers:
        if 100 < f.followers_count < 5000:  # Small but active
            tweets = await x.scrape.tweets(f.username, limit=10)
            if tweets:
                avg_engagement = sum(t.likes for t in tweets) / len(tweets)
                if avg_engagement > 5:  # Getting some traction
                    deserving.append(f)
    
    return deserving
```

## The Viral Content Framework

Templates for content that spreads.

```python
"""
Viral Content Framework: Patterns that get shared.
"""
from xeepy.ai import ContentGenerator

async def generate_viral_content():
    ai = ContentGenerator(provider="openai")
    
    # Framework 1: The Contrarian Take
    contrarian = await ai.generate_tweet(
        framework="contrarian",
        topic="startup advice",
        template="""
        Unpopular opinion: {contrarian_statement}
        
        Here's why: {supporting_point}
        
        {provocative_question}
        """
    )
    
    # Framework 2: The Value Thread
    value_thread = await ai.generate_thread(
        framework="value_list",
        topic="productivity tools",
        template="""
        Tweet 1: {hook_question_or_promise}
        
        Tweets 2-9: {item_number}. {tool_name}
        {one_sentence_description}
        {why_its_great}
        
        Tweet 10: {call_to_action_and_summary}
        """
    )
    
    # Framework 3: The Before/After Story
    transformation = await ai.generate_tweet(
        framework="transformation",
        topic="learning to code",
        template="""
        1 year ago: {before_state}
        
        Today: {after_state}
        
        The difference? {key_insight}
        
        {lesson_learned}
        """
    )
    
    # Framework 4: The Hot Take Response
    hot_take = await ai.generate_tweet(
        framework="quote_tweet_response",
        reference_topic="recent tech news",
        template="""
        Everyone is saying {common_opinion}.
        
        But they're missing: {overlooked_point}
        
        Here's what's actually happening: {insight}
        """
    )
    
    return {
        "contrarian": contrarian,
        "value_thread": value_thread,
        "transformation": transformation,
        "hot_take": hot_take
    }
```

## Metrics That Matter

Track the metrics that actually predict growth.

```python
"""
Growth Metrics Dashboard: Focus on what matters.
"""
import asyncio
from xeepy import Xeepy

async def growth_metrics_dashboard():
    async with Xeepy() as x:
        print("""
        ╔═══════════════════════════════════════════════════════╗
        ║           📊 GROWTH METRICS DASHBOARD                  ║
        ╚═══════════════════════════════════════════════════════╝
        """)
        
        # Core Metrics
        profile = await x.scrape.profile("your_username")
        growth_7d = await x.analytics.track_growth("7d")
        engagement = await x.analytics.engagement_analysis("7d")
        
        # 1. Follower Velocity (followers gained per day)
        velocity = growth_7d.net_change / 7
        print(f"📈 Follower Velocity: {velocity:+.1f}/day")
        
        if velocity < 10:
            print("   ⚠️ Below target. Focus on content quality.")
        elif velocity < 50:
            print("   ✓ Good progress. Consider scaling engagement.")
        else:
            print("   🔥 Excellent! Maintain current strategy.")
        
        # 2. Engagement Rate (most important metric!)
        eng_rate = engagement.rate
        print(f"\n💬 Engagement Rate: {eng_rate:.2%}")
        
        if eng_rate < 0.01:
            print("   ⚠️ Low. Try more questions and hooks.")
        elif eng_rate < 0.03:
            print("   ✓ Average. Room for improvement.")
        else:
            print("   🔥 Excellent! Your content resonates.")
        
        # 3. Reply Rate (indicates community building)
        reply_rate = engagement.total_replies / engagement.total_tweets
        print(f"\n💭 Reply Rate: {reply_rate:.1f} replies/tweet")
        
        # 4. Follower Quality Score
        quality_sample = await x.scrape.followers("your_username", limit=100)
        quality_score = calculate_follower_quality(quality_sample)
        print(f"\n⭐ Follower Quality: {quality_score:.0f}/100")
        
        # 5. Conversion Metrics
        link_clicks = await x.analytics.link_performance("7d")
        print(f"\n🔗 Link Click Rate: {link_clicks.rate:.2%}")
        
        # 6. Best Content Types
        print("\n📝 Top Performing Content Types:")
        by_type = await x.analytics.engagement_by_type()
        for ct in by_type.types[:3]:
            print(f"   {ct.name}: {ct.avg_engagement:.1f} avg engagement")

def calculate_follower_quality(followers):
    """Score follower quality 0-100"""
    scores = []
    for f in followers:
        score = 0
        if f.bio:
            score += 20
        if f.followers_count > 100:
            score += 20
        if f.tweet_count > 50:
            score += 20
        if not f.is_default_profile:
            score += 20
        if f.following_count < f.followers_count * 3:  # Not follow-spam
            score += 20
        scores.append(score)
    
    return sum(scores) / len(scores)
```

## Growth Experiments

A/B testing for Twitter growth.

```python
"""
Growth Experiments: Test what works for YOUR audience.
"""
import asyncio
from datetime import datetime, timedelta
from xeepy import Xeepy

class GrowthExperiment:
    """Run controlled growth experiments"""
    
    def __init__(self, name: str, duration_days: int = 7):
        self.name = name
        self.duration = duration_days
        self.start_metrics = None
        self.end_metrics = None
    
    async def start(self, x: Xeepy):
        """Record starting metrics"""
        self.start_metrics = await x.analytics.snapshot()
        print(f"🧪 Experiment '{self.name}' started")
        print(f"   Starting followers: {self.start_metrics.followers}")
    
    async def end(self, x: Xeepy):
        """Record ending metrics and analyze"""
        self.end_metrics = await x.analytics.snapshot()
        
        results = {
            "follower_change": self.end_metrics.followers - self.start_metrics.followers,
            "engagement_change": self.end_metrics.engagement_rate - self.start_metrics.engagement_rate,
            "impressions_change": self.end_metrics.impressions - self.start_metrics.impressions
        }
        
        print(f"\n📊 Experiment '{self.name}' Results:")
        print(f"   Follower change: {results['follower_change']:+d}")
        print(f"   Engagement change: {results['engagement_change']:+.2%}")
        
        return results

async def run_posting_time_experiment():
    """Test different posting times"""
    async with Xeepy() as x:
        experiments = [
            GrowthExperiment("Morning Posts (6-9 AM)", 7),
            GrowthExperiment("Afternoon Posts (12-3 PM)", 7),
            GrowthExperiment("Evening Posts (6-9 PM)", 7),
        ]
        
        # Run each experiment for a week
        for exp in experiments:
            await exp.start(x)
            # ... post during specific time window for a week ...
            await asyncio.sleep(7 * 86400)  # Wait 7 days
            await exp.end(x)

async def run_content_type_experiment():
    """Test different content types"""
    async with Xeepy() as x:
        content_types = [
            ("threads", "Post 1 thread per day"),
            ("single_tweets", "Post 5 single tweets per day"),
            ("quote_tweets", "Quote tweet 3 interesting posts per day"),
            ("questions", "Ask 2 engaging questions per day"),
        ]
        
        results = {}
        for content_type, description in content_types:
            exp = GrowthExperiment(content_type, 7)
            await exp.start(x)
            # ... post according to description ...
            results[content_type] = await exp.end(x)
        
        # Compare results
        best = max(results.items(), key=lambda x: x[1]["follower_change"])
        print(f"\n🏆 Winner: {best[0]} with {best[1]['follower_change']:+d} followers")
```

---

## Next Steps

<div class="grid cards" markdown>

-   **[Automation Workflows](../automation/index.md)**
    
    Automate your growth strategies

-   **[Data Science Recipes](../data-science/index.md)**
    
    Analyze your growth data

-   **[Business Intelligence](../business/index.md)**
    
    Turn followers into customers

</div>
