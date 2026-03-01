# Follow/Unfollow Operations

This module provides comprehensive follow and unfollow operations for X/Twitter automation.

## Table of Contents

- [Installation](#installation)
- [Quick Start](#quick-start)
- [Follow Operations](#follow-operations)
  - [Follow User](#follow-user)
  - [Follow by Keyword](#follow-by-keyword)
  - [Follow by Hashtag](#follow-by-hashtag)
  - [Follow Target's Followers](#follow-targets-followers)
  - [Follow Engagers](#follow-engagers)
  - [Auto Follow](#auto-follow)
- [Unfollow Operations](#unfollow-operations)
  - [Unfollow User](#unfollow-user)
  - [Unfollow Non-Followers](#unfollow-non-followers)
  - [Smart Unfollow](#smart-unfollow)
  - [Unfollow All](#unfollow-all)
  - [Unfollow by Criteria](#unfollow-by-criteria)
- [Follow Tracker](#follow-tracker)
- [Filters](#filters)
- [CLI Usage](#cli-usage)
- [Best Practices](#best-practices)

## Installation

```bash
pip install -e ./xeepy
```

## Quick Start

```python
import asyncio
from xeepy import (
    BrowserManager, 
    FollowTracker,
    FollowByKeyword,
    UnfollowNonFollowers,
    FollowFilters,
)
from xeepy.actions.base import RateLimiter, RateLimitConfig

async def main():
    # Initialize components
    browser = await BrowserManager.create()
    tracker = FollowTracker('my_tracker.db')
    rate_limiter = RateLimiter(RateLimitConfig(
        min_delay=3.0,
        max_delay=7.0,
        hourly_limit=50
    ))
    
    # Follow users tweeting about Python
    follow_action = FollowByKeyword(browser, rate_limiter, tracker)
    result = await follow_action.execute(
        keywords=['python', 'programming'],
        max_follows=25,
        filters=FollowFilters(min_followers=100, max_followers=50000)
    )
    
    print(f"Followed {result.success_count} users")
    
    # Clean up
    tracker.close()
    await browser.close()

asyncio.run(main())
```

## Follow Operations

### Follow User

Follow a single user by username.

```python
from xeepy.actions.follow import FollowUser

action = FollowUser(browser, rate_limiter, tracker)
result = await action.execute(
    username='elonmusk',
    source='manual',  # For tracking
    skip_if_following=True
)

if result.success_count > 0:
    print(f"Successfully followed @{result.followed_users[0]}")
```

### Follow by Keyword

Search for keywords and follow users who tweet about them.

```python
from xeepy.actions.follow import FollowByKeyword
from xeepy.actions.base import FollowFilters

filters = FollowFilters(
    min_followers=100,
    max_followers=50000,
    min_tweets=10,
    must_have_bio=True,
    must_have_profile_pic=True,
    keywords_in_bio=['developer', 'tech'],  # Optional: bio must contain these
)

action = FollowByKeyword(browser, rate_limiter, tracker)
result = await action.execute(
    keywords=['python', 'machine learning', 'data science'],
    max_follows=50,
    filters=filters,
    search_type='users',  # or 'tweets'
    dry_run=False,  # Set True to preview
    on_progress=lambda current, total, msg: print(f"{current}/{total}: {msg}"),
    on_follow=lambda username, success: print(f"{'✓' if success else '✗'} @{username}")
)

print(f"Followed: {result.success_count}")
print(f"Failed: {result.failed_count}")
print(f"Skipped: {result.skipped_count}")
```

### Follow by Hashtag

Follow users who tweet with specific hashtags.

```python
from xeepy.actions.follow import FollowByHashtag

action = FollowByHashtag(browser, rate_limiter, tracker)
result = await action.execute(
    hashtags=['coding', '100DaysOfCode', 'DevCommunity'],
    max_follows=30,
    filters=filters,
    include_recent=True,
    include_top=False
)
```

### Follow Target's Followers

Follow the followers or following of a target account (competitor, influencer).

```python
from xeepy.actions.follow import FollowTargetFollowers

action = FollowTargetFollowers(browser, rate_limiter, tracker)

# Follow followers of a competitor
result = await action.execute(
    target_username='competitor_account',
    max_follows=50,
    mode='followers',  # or 'following'
    filters=filters,
    skip_mutual=True  # Skip if you already follow them
)
```

### Follow Engagers

Follow users who engage with specific tweets (likers, retweeters, commenters).

```python
from xeepy.actions.follow import FollowEngagers

action = FollowEngagers(browser, rate_limiter, tracker)
result = await action.execute(
    tweet_urls=[
        'https://x.com/user/status/1234567890',
        'https://x.com/user/status/0987654321',
    ],
    engagement_type='likers',  # 'likers', 'retweeters', 'commenters', 'all'
    max_follows=25,
    filters=filters
)
```

### Auto Follow

Automated following with rules and scheduling.

```python
from xeepy.actions.follow import AutoFollow
from xeepy.actions.follow.auto_follow import (
    AutoFollowConfig, 
    FollowRule, 
    FollowStrategy
)

config = AutoFollowConfig(
    daily_follow_limit=100,
    hourly_follow_limit=25,
    min_interval_minutes=30,
    max_interval_minutes=90,
    active_hours=(9, 22),  # Only run between 9 AM and 10 PM
    filters=filters,
    rules=[
        FollowRule(
            strategy=FollowStrategy.KEYWORD,
            params={'keywords': ['python', 'programming']},
            weight=2.0,  # Run more frequently
            daily_limit=50
        ),
        FollowRule(
            strategy=FollowStrategy.TARGET_FOLLOWERS,
            params={'target': 'influencer_account'},
            weight=1.0,
            daily_limit=30
        ),
    ]
)

action = AutoFollow(browser, rate_limiter, tracker, config)
result = await action.execute(
    duration_hours=4,  # Run for 4 hours
    max_follows=100,
    on_run_complete=lambda r: print(f"Run: +{r.success_count} follows")
)

# Get detailed stats
stats = action.get_auto_stats()
print(f"Total followed: {stats['total_followed']}")
print(f"By strategy: {stats['by_strategy']}")
```

## Unfollow Operations

### Unfollow User

Unfollow a single user.

```python
from xeepy.actions.unfollow import UnfollowUser

action = UnfollowUser(browser, rate_limiter, tracker)
result = await action.execute(
    username='someuser',
    reason='manual'  # For tracking
)
```

### Unfollow Non-Followers

**The most requested feature!** Unfollow users who don't follow you back.

```python
from xeepy.actions.unfollow import UnfollowNonFollowers

action = UnfollowNonFollowers(browser, rate_limiter, tracker)

def on_stats(stats):
    print(f"Following: {stats.total_following}")
    print(f"Followers: {stats.total_followers}")
    print(f"Non-followers: {stats.non_followers_count}")

result = await action.execute(
    max_unfollows=50,
    whitelist=['friend1', 'friend2', 'important_account'],
    min_followers=10000,  # Keep if they have 10k+ followers
    min_following_days=3,  # Grace period: 3 days to follow back
    exclude_verified=True,  # Never unfollow verified accounts
    dry_run=False,
    on_progress=lambda p, t, m: print(f"Progress: {p}% - {m}"),
    on_stats=on_stats
)

print(f"Unfollowed: {result.success_count}")
print(f"Users: {', '.join(result.unfollowed_users)}")
```

### Smart Unfollow

Time-based unfollow using follow tracking data.

```python
from xeepy.actions.unfollow import SmartUnfollow

action = SmartUnfollow(browser, rate_limiter, tracker)

# Check how many are eligible
eligible = await action.get_eligible_count(days_threshold=3)
print(f"{eligible} users haven't followed back in 3+ days")

# Unfollow them
result = await action.execute(
    days_threshold=3,  # Unfollow if no follow-back within 3 days
    max_unfollows=30,
    check_engagement=True,  # Keep if they've engaged with you
    whitelist=['friend1'],
    exclude_verified=True
)
```

### Unfollow All

Unfollow everyone (with safety limits).

```python
from xeepy.actions.unfollow import UnfollowAll

action = UnfollowAll(browser, rate_limiter, tracker)

def confirm(count):
    return input(f"Unfollow {count} users? (y/n): ").lower() == 'y'

result = await action.execute(
    max_unfollows=100,  # Safety limit
    whitelist=['important_friend'],
    require_confirmation=True,
    on_confirm=confirm,
    batch_size=25  # Process in batches
)
```

### Unfollow by Criteria

Flexible unfollow with custom criteria.

```python
from xeepy.actions.unfollow import UnfollowByCriteria
from xeepy.actions.unfollow.unfollow_by_criteria import UnfollowCriteria

criteria = UnfollowCriteria(
    max_followers=50,  # Unfollow accounts with < 50 followers
    min_ratio=0.1,  # Unfollow if followers/following ratio < 0.1
    has_bio=False,  # Unfollow accounts without bio
    bio_not_contains=['spam', 'bot'],  # Unfollow if bio contains these
    from_source='keyword:crypto',  # Only unfollow from this source
)

action = UnfollowByCriteria(browser, rate_limiter, tracker)
result = await action.execute(
    criteria=criteria,
    max_unfollows=25,
    must_be_non_follower=True
)
```

## Follow Tracker

The `FollowTracker` provides persistent storage for all follow/unfollow actions.

```python
from xeepy.storage import FollowTracker

tracker = FollowTracker('xeepy_tracker.db')

# Record actions
tracker.record_follow('user1', source='keyword:python')
tracker.record_follow_back('user1')
tracker.record_unfollow('user2', reason='non_follower')

# Whitelist management
tracker.add_to_whitelist('friend', reason='IRL friend')
tracker.is_whitelisted('friend')  # True
tracker.get_whitelist()  # ['friend']

# Check status
tracker.is_following('user1')  # True
tracker.was_followed_before('user2')  # True

# Get statistics
stats = tracker.get_stats()
print(f"Total follows: {stats.total_follows}")
print(f"Follow-back rate: {stats.follow_back_rate}%")

# Get old follows (for smart unfollow)
old = tracker.get_follows_older_than(days=3)

# Export data
tracker.export_history('history.csv')
tracker.export_unfollowed('unfollowed.csv')

# Session management (for resumability)
session_id = tracker.create_session('batch_unfollow', ['user1', 'user2'])
pending = tracker.get_pending_session_items(session_id)
tracker.update_session_item(session_id, 'user1', 'success')
tracker.complete_session(session_id)

tracker.close()
```

## Filters

### FollowFilters

Control who you follow.

```python
from xeepy.actions.base import FollowFilters

filters = FollowFilters(
    # Follower count
    min_followers=100,
    max_followers=100000,
    
    # Following count
    min_following=0,
    max_following=50000,
    
    # Tweet activity
    min_tweets=10,
    max_tweets=None,
    
    # Account age
    min_account_age_days=30,
    
    # Profile requirements
    must_have_bio=True,
    must_have_profile_pic=True,
    
    # Account type
    exclude_verified=False,
    exclude_default_pic=True,
    exclude_protected=True,
    
    # Bio content
    keywords_in_bio=['developer', 'tech'],
    exclude_keywords_in_bio=['spam', 'bot'],
    
    # Ratio
    min_follower_ratio=0.1,  # followers/following
    max_follower_ratio=None,
    
    # Language (if detectable)
    language='en',
)

# Test a profile
profile = {
    'followers_count': 500,
    'following_count': 200,
    'tweets_count': 100,
    'bio': 'Python developer',
    'has_profile_pic': True,
    'verified': False,
}

matches, reason = filters.matches(profile)
print(f"Matches: {matches}, Reason: {reason}")
```

### UnfollowFilters

Control who you unfollow.

```python
from xeepy.actions.base import UnfollowFilters

filters = UnfollowFilters(
    min_followers=10000,  # Keep if they have 10k+ followers
    max_followers=None,
    min_following_days=3,  # Grace period
    is_verified=False,  # Only unfollow non-verified
    has_interacted=False,  # Keep if they've interacted
)
```

## CLI Usage

The CLI provides quick access to common operations.

```bash
# Follow operations
xeepy follow user elonmusk
xeepy follow keyword python programming --max 50
xeepy follow hashtag coding DevCommunity --max 30
xeepy follow followers competitor_account --max 50
xeepy follow engagers "https://x.com/user/status/123" --type likers

# Unfollow operations
xeepy unfollow user someuser
xeepy unfollow non-followers --max 100 --grace-days 3 --exclude-verified
xeepy unfollow smart --days 3 --max 50
xeepy unfollow all --max 100 --confirm

# Whitelist management
xeepy whitelist add friend1 friend2 --reason "Friends"
xeepy whitelist remove olduser
xeepy whitelist list

# Statistics
xeepy stats summary
xeepy stats history username

# Export
xeepy export history ./exports/history.csv
xeepy export unfollowed ./exports/unfollowed.csv

# Common options
xeepy --db custom.db follow user test  # Custom database
xeepy -v unfollow non-followers  # Verbose output
```

## Best Practices

### Rate Limiting

Always use conservative rate limits to avoid account restrictions:

```python
from xeepy.actions.base import RateLimiter, RateLimitConfig, RateLimitStrategy

config = RateLimitConfig(
    min_delay=3.0,  # At least 3 seconds between actions
    max_delay=8.0,  # Random delay up to 8 seconds
    hourly_limit=50,  # Max 50 follows per hour
    daily_limit=200,  # Max 200 follows per day
    strategy=RateLimitStrategy.HUMANLIKE,  # Simulate human timing
    burst_limit=10,  # Pause after 10 quick actions
    burst_pause=60.0,  # Pause for 60 seconds
)

rate_limiter = RateLimiter(config)
```

### Whitelist Important Accounts

```python
# Add friends and important accounts to whitelist
tracker.add_to_whitelist('best_friend', reason='Personal friend')
tracker.add_to_whitelist('boss_account', reason='Work contact')
tracker.add_to_whitelist('influencer_i_admire', reason='Fan')
```

### Use Dry Run First

Always preview before mass operations:

```python
# Preview first
result = await action.execute(max_unfollows=100, dry_run=True)
print(f"Would unfollow {result.success_count} users")
print(f"Users: {result.unfollowed_users[:10]}...")

# Then execute
if input("Proceed? (y/n): ").lower() == 'y':
    result = await action.execute(max_unfollows=100, dry_run=False)
```

### Track Everything

```python
# Enable tracking to enable smart unfollow later
tracker.record_follow('user', source='keyword:python')

# Check follow-back rate to optimize strategy
rate = tracker.get_follow_back_rate(days=7)
print(f"Last 7 days follow-back rate: {rate}%")
```

### Handle Errors Gracefully

```python
result = await action.execute(...)

if result.errors:
    print(f"Errors occurred: {result.errors}")

if result.rate_limited:
    print("Rate limited - try again later")

if result.failed_users:
    print(f"Failed to follow: {result.failed_users}")
```

### Use Sessions for Long Operations

```python
# Sessions allow resuming interrupted operations
session_id = tracker.create_session('batch_follow', usernames)

# If interrupted, resume later
pending = tracker.get_pending_session('batch_follow')
if pending:
    remaining = tracker.get_pending_session_items(pending['id'])
    print(f"Resuming with {len(remaining)} remaining")
```

## Module Structure

```
xeepy/
├── actions/
│   ├── __init__.py
│   ├── base.py                    # BaseAction, RateLimiter, Filters, Results
│   ├── follow/
│   │   ├── __init__.py
│   │   ├── follow_user.py         # Single user follow
│   │   ├── follow_by_keyword.py   # Follow from search
│   │   ├── follow_by_hashtag.py   # Follow from hashtags
│   │   ├── follow_followers.py    # Follow target's followers
│   │   ├── follow_engagers.py     # Follow tweet engagers
│   │   └── auto_follow.py         # Automated following
│   └── unfollow/
│       ├── __init__.py
│       ├── unfollow_user.py       # Single user unfollow
│       ├── unfollow_all.py        # Unfollow everyone
│       ├── unfollow_non_followers.py  # Unfollow non-followers
│       ├── smart_unfollow.py      # Time-based unfollow
│       └── unfollow_by_criteria.py    # Custom criteria unfollow
├── storage/
│   ├── __init__.py
│   ├── database.py                # SQLite database
│   └── follow_tracker.py          # Follow tracking
├── cli.py                         # Command-line interface
└── tests/
    └── test_follow_unfollow.py    # Test suite
```
