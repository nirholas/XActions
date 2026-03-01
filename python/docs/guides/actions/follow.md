# Follow Users Guide

Master the art of strategic following to grow your X/Twitter presence.

## Overview

Xeepy provides 6 powerful ways to follow users:

| Method | Use Case | Follow-back Rate |
|--------|----------|------------------|
| `follow_user` | Single user | N/A |
| `follow_by_keyword` | Niche targeting | 15-25% |
| `follow_by_hashtag` | Community targeting | 20-30% |
| `follow_followers` | Competitor's audience | 25-35% |
| `follow_engagers` | High-intent users | 30-40% |
| `auto_follow` | Automated growth | Varies |

## Single User Follow

The simplest operation - follow one user:

=== "Python"

    ```python
    from xeepy import Xeepy

    async with Xeepy() as x:
        result = await x.follow.user("elonmusk")
        
        if result.success:
            print(f"✓ Now following @elonmusk")
        else:
            print(f"✗ Failed: {result.error}")
    ```

=== "CLI"

    ```bash
    xeepy follow user elonmusk
    ```

### Batch Follow

Follow multiple users efficiently:

```python
from xeepy import Xeepy

async with Xeepy() as x:
    usernames = ["user1", "user2", "user3", "user4", "user5"]
    
    result = await x.follow.users(
        usernames=usernames,
        delay_range=(3, 8),  # Random 3-8 second delay
        skip_if_following=True,
        on_follow=lambda u, s: print(f"{'✓' if s else '✗'} @{u}")
    )
    
    print(f"\nResults:")
    print(f"  Followed: {result.success_count}")
    print(f"  Failed: {result.failed_count}")
    print(f"  Already following: {result.skipped_count}")
```

## Follow by Keyword

Find and follow users tweeting about topics you care about:

```python
from xeepy import Xeepy
from xeepy.actions.base import FollowFilters

async with Xeepy() as x:
    # Quality filters are CRITICAL for good follow-back rates
    filters = FollowFilters(
        min_followers=100,        # Not too small
        max_followers=50000,      # Not too big (won't notice you)
        min_tweets=50,            # Active users
        must_have_bio=True,       # Real people have bios
        must_have_profile_pic=True,
        min_account_age_days=30,  # Not brand new
        exclude_default_pic=True,
        keywords_in_bio=["developer", "engineer", "founder"],  # Optional
    )
    
    result = await x.follow.by_keyword(
        keywords=["python programming", "machine learning", "startup"],
        max_follows=50,
        search_type="users",  # or "tweets" to find tweet authors
        filters=filters,
        dry_run=False,
        on_progress=lambda c, t, m: print(f"[{c}/{t}] {m}")
    )
    
    print(f"\n🎯 Followed {result.success_count} users matching your niche")
```

### Search Types

| Type | Description | Best For |
|------|-------------|----------|
| `users` | Search user profiles | Finding people in your industry |
| `tweets` | Search tweets, follow authors | Finding active discussions |
| `top` | Top results only | High-quality matches |
| `latest` | Most recent | Trending conversations |

### Keyword Strategies

```python
# Strategy 1: Broad to narrow
keywords_broad = ["python", "programming", "coding"]
keywords_narrow = ["python asyncio", "fastapi tutorial", "django rest"]

# Strategy 2: Problem-based (high intent)
keywords_problems = [
    "how to learn python",
    "python help needed",
    "struggling with python",
]

# Strategy 3: Tool-based (specific communities)
keywords_tools = [
    "pytorch", "tensorflow", "scikit-learn",
    "pandas", "numpy", "jupyter"
]

# Strategy 4: Event-based (timely)
keywords_events = [
    "PyCon 2026", "Python conference",
    "#100DaysOfCode", "#CodeNewbie"
]
```

## Follow by Hashtag

Target specific communities through hashtags:

```python
from xeepy import Xeepy

async with Xeepy() as x:
    result = await x.follow.by_hashtag(
        hashtags=[
            "#Python",
            "#MachineLearning", 
            "#DataScience",
            "#100DaysOfCode"
        ],
        max_follows=30,
        filters=filters,
        include_recent=True,   # Recent posts
        include_top=True,      # Top posts
        min_engagement=5,      # Tweets with 5+ likes
    )
```

### High-Performing Hashtags

```python
# Tech/Developer hashtags (high follow-back)
tech_hashtags = [
    "#100DaysOfCode",  # Learners (very engaged)
    "#CodeNewbie",     # Beginners (supportive community)
    "#DevCommunity",   # General developers
    "#WomenInTech",    # Inclusive community
    "#BuildInPublic",  # Makers (very engaged)
]

# Niche-specific (targeted)
ai_hashtags = [
    "#MachineLearning",
    "#DeepLearning", 
    "#AIArt",
    "#GenerativeAI",
    "#LLM",
]

# Engagement hashtags (high activity)
engagement_hashtags = [
    "#FollowFriday",
    "#WritingCommunity",
    "#SmallStreamersConnect",
]
```

## Follow Target's Followers

The **highest ROI strategy** - follow your competitor's audience:

```python
from xeepy import Xeepy

async with Xeepy() as x:
    # Follow followers of a competitor/influencer
    result = await x.follow.target_followers(
        target="competitor_account",
        max_follows=50,
        mode="followers",  # Their followers
        filters=FollowFilters(
            min_followers=100,
            max_followers=10000,  # Lower = higher follow-back
            must_have_bio=True,
        ),
        skip_mutual=True,  # Skip if you already follow them
        randomize=True,    # Don't follow sequentially
    )
    
    print(f"Followed {result.success_count} of @competitor's followers")
```

### Targeting Strategies

```python
# Strategy 1: Competitor's followers
await x.follow.target_followers("direct_competitor", mode="followers")

# Strategy 2: Competitor's following (who they trust)
await x.follow.target_followers("industry_leader", mode="following")

# Strategy 3: Multiple targets
targets = ["competitor1", "competitor2", "industry_influencer"]
for target in targets:
    await x.follow.target_followers(
        target,
        max_follows=25,  # Spread across targets
        filters=filters
    )
```

## Follow Engagers

**Highest quality leads** - follow users who engage with specific tweets:

```python
from xeepy import Xeepy

async with Xeepy() as x:
    # Follow people who liked/retweeted a viral tweet in your niche
    result = await x.follow.engagers(
        tweet_urls=[
            "https://x.com/user/status/1234567890",  # Viral tweet
            "https://x.com/user/status/0987654321",  # Another popular one
        ],
        engagement_type="likers",  # likers, retweeters, commenters, all
        max_follows=30,
        filters=filters,
    )
```

### Engagement Types

| Type | Quality | Volume | Best For |
|------|---------|--------|----------|
| `likers` | Medium | High | Quick growth |
| `retweeters` | High | Medium | Engaged audience |
| `commenters` | Highest | Low | Quality connections |
| `all` | Mixed | Highest | Maximum reach |

### Finding High-Value Tweets

```python
# 1. Search for viral tweets in your niche
tweets = await x.scrape.search(
    "python tips",
    min_likes=1000,
    min_retweets=100,
    limit=10
)

# 2. Follow engagers of each
for tweet in tweets:
    await x.follow.engagers(
        tweet_urls=[tweet.url],
        engagement_type="retweeters",  # Higher quality
        max_follows=20,
        filters=filters
    )
```

## Auto Follow

Set up automated following with rules:

```python
from xeepy import Xeepy
from xeepy.actions.follow.auto_follow import (
    AutoFollowConfig,
    FollowRule,
    FollowStrategy
)

config = AutoFollowConfig(
    daily_follow_limit=150,
    hourly_follow_limit=25,
    min_interval_minutes=30,
    max_interval_minutes=90,
    active_hours=(9, 22),  # 9 AM to 10 PM
    filters=FollowFilters(
        min_followers=100,
        max_followers=50000,
        must_have_bio=True
    ),
    rules=[
        # 50% weight on keyword following
        FollowRule(
            strategy=FollowStrategy.KEYWORD,
            params={"keywords": ["python", "ai", "startup"]},
            weight=2.0,
            daily_limit=75
        ),
        # 30% weight on competitor followers
        FollowRule(
            strategy=FollowStrategy.TARGET_FOLLOWERS,
            params={"targets": ["competitor1", "competitor2"]},
            weight=1.5,
            daily_limit=50
        ),
        # 20% weight on hashtags
        FollowRule(
            strategy=FollowStrategy.HASHTAG,
            params={"hashtags": ["#BuildInPublic", "#IndieHacker"]},
            weight=1.0,
            daily_limit=25
        ),
    ]
)

async with Xeepy() as x:
    action = AutoFollow(x.browser, x.rate_limiter, x.tracker, config)
    
    # Run for 8 hours
    result = await action.execute(
        duration_hours=8,
        on_run_complete=lambda r: print(f"Run: +{r.success_count} follows")
    )
    
    # Daily summary
    stats = action.get_auto_stats()
    print(f"\n📊 Today's Stats:")
    print(f"  Total followed: {stats['total_followed']}")
    print(f"  By keyword: {stats['by_strategy']['keyword']}")
    print(f"  By followers: {stats['by_strategy']['target_followers']}")
```

## Quality Filters Deep Dive

Filters are **critical** for good follow-back rates:

```python
from xeepy.actions.base import FollowFilters

# Conservative (high quality, lower volume)
conservative = FollowFilters(
    min_followers=500,
    max_followers=20000,
    min_tweets=100,
    min_account_age_days=180,
    must_have_bio=True,
    must_have_profile_pic=True,
    keywords_in_bio=["founder", "developer", "creator"],
    min_follower_ratio=0.3,  # Following/follower ratio
)

# Moderate (balanced)
moderate = FollowFilters(
    min_followers=100,
    max_followers=50000,
    min_tweets=25,
    min_account_age_days=30,
    must_have_bio=True,
    must_have_profile_pic=True,
)

# Aggressive (high volume, lower quality)
aggressive = FollowFilters(
    min_followers=10,
    max_followers=100000,
    min_tweets=5,
    must_have_profile_pic=True,
)
```

### Testing Filters

```python
# Test your filters before running
profile = await x.scrape.profile("test_user")

matches, reason = filters.matches({
    "followers_count": profile.followers_count,
    "following_count": profile.following_count,
    "tweets_count": profile.tweets_count,
    "bio": profile.bio,
    "has_profile_pic": profile.has_profile_pic,
    "verified": profile.verified,
    "created_at": profile.created_at,
})

print(f"Matches: {matches}")
print(f"Reason: {reason}")
```

## Tracking & Analytics

All follows are tracked automatically:

```python
from xeepy.storage import FollowTracker

tracker = FollowTracker("xeepy.db")

# Get stats
stats = tracker.get_stats()
print(f"Total follows: {stats.total_follows}")
print(f"Follow-back rate: {stats.follow_back_rate}%")
print(f"Best source: {stats.best_source}")

# Get by source
keyword_stats = tracker.get_stats_by_source("keyword:python")
print(f"Python keyword: {keyword_stats.follow_back_rate}% follow-back")

# Export
tracker.export_history("follow_history.csv")
```

## Best Practices

!!! success "Do's"
    - ✅ Use quality filters (min 100 followers, must have bio)
    - ✅ Start slow (25/day for new accounts)
    - ✅ Diversify strategies (keywords + hashtags + followers)
    - ✅ Track which sources perform best
    - ✅ Add important accounts to whitelist
    - ✅ Use dry-run first

!!! danger "Don'ts"
    - ❌ Follow more than 100-200/day
    - ❌ Follow without filters (spam accounts)
    - ❌ Follow and immediately unfollow
    - ❌ Follow the same accounts repeatedly
    - ❌ Ignore rate limit warnings

## Next Steps

[:octicons-arrow-right-24: Unfollow Guide](unfollow.md) - Learn to clean up non-followers

[:octicons-arrow-right-24: Auto Follow Setup](../ai/targeting.md) - AI-powered targeting

[:octicons-arrow-right-24: Analytics](../analytics/growth.md) - Track your growth
