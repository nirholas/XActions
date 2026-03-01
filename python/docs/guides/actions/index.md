# Follow & Unfollow Actions

Xeepy provides smart, safe follow and unfollow operations with built-in rate limiting and protection features.

## Overview

<div class="grid cards" markdown>

-   :material-account-plus:{ .lg .middle } **Follow Operations**
    
    Follow users by username, hashtag, or list

-   :material-account-minus:{ .lg .middle } **Unfollow Operations**
    
    Unfollow non-followers, inactive users, or everyone

-   :material-shield-check:{ .lg .middle } **Safety Features**
    
    Whitelist, dry run, daily limits

</div>

## Follow Operations

### Follow a Single User

```python
from xeepy import Xeepy

async with Xeepy() as x:
    # Follow by username
    await x.follow.user("naval")
    
    # Follow multiple users
    users = ["paulg", "sama", "naval"]
    for user in users:
        await x.follow.user(user)
        print(f"✓ Followed @{user}")
```

### Follow by Hashtag

Find and follow users who tweet about specific topics:

```python
async with Xeepy() as x:
    # Follow people tweeting about #buildinpublic
    result = await x.follow.by_hashtag(
        "#buildinpublic",
        limit=20,               # Max users to follow
        min_followers=100,      # Min followers to qualify
        max_followers=50000,    # Max followers (avoid big accounts)
        must_have_bio=True,     # Skip accounts without bio
        exclude_verified=False  # Include verified accounts
    )
    
    print(f"Followed {result.followed_count} users")
    for user in result.followed_users:
        print(f"  ✓ @{user.username} ({user.followers_count} followers)")
```

### Follow from Search

```python
async with Xeepy() as x:
    # Follow users from search results
    result = await x.follow.from_search(
        query="python developer",
        limit=15,
        filters={
            "min_followers": 500,
            "has_website": True,
            "account_age_days": 365  # At least 1 year old
        }
    )
```

### Follow Followers of Account

```python
async with Xeepy() as x:
    # Follow followers of a similar account
    result = await x.follow.followers_of(
        "competitor_account",
        limit=30,
        skip_if_following=True,  # Don't follow if already following
        filters={
            "min_followers": 100,
            "active_in_days": 30  # Active in last 30 days
        }
    )
```

### Follow List Members

```python
async with Xeepy() as x:
    # Follow members of a curated list
    result = await x.follow.list_members(
        "username/list-name",
        limit=20
    )
```

## Unfollow Operations

### Unfollow Non-Followers

The most popular feature—clean up accounts that don't follow you back:

```python
async with Xeepy() as x:
    # Preview first (recommended!)
    preview = await x.unfollow.non_followers(dry_run=True)
    print(f"Would unfollow {len(preview.would_unfollow)} users")
    
    # Actually unfollow
    result = await x.unfollow.non_followers(
        max_unfollows=50,  # Limit per run
        whitelist=["friend1", "friend2"],  # Never unfollow these
    )
    
    print(f"Unfollowed {result.unfollowed_count} non-followers")
```

### Unfollow with Whitelist File

```python
async with Xeepy() as x:
    result = await x.unfollow.non_followers(
        max_unfollows=100,
        whitelist_file="whitelist.txt"  # One username per line
    )
```

**whitelist.txt:**
```
naval
paulg
bestfriend
important_client
```

### Smart Unfollow

Unfollow based on multiple criteria:

```python
async with Xeepy() as x:
    result = await x.unfollow.smart(
        max_unfollows=50,
        criteria={
            "not_following_back": True,     # Don't follow me
            "inactive_days": 90,            # No tweets in 90 days
            "no_profile_pic": True,         # Default profile pic
            "no_bio": True,                 # Empty bio
            "follower_ratio_below": 0.1,    # Very low follower ratio
        },
        whitelist_file="whitelist.txt"
    )
```

### Unfollow Everyone

Nuclear option—unfollow all accounts:

```python
async with Xeepy() as x:
    # ALWAYS dry run first!
    preview = await x.unfollow.everyone(dry_run=True)
    print(f"Would unfollow {preview.total_count} users")
    
    # Confirm before proceeding
    if input("Type 'yes' to confirm: ") == "yes":
        result = await x.unfollow.everyone(
            whitelist_file="whitelist.txt",
            batch_size=50,        # Unfollow in batches
            delay_between=300     # 5 min between batches
        )
```

### Unfollow Inactive Accounts

```python
async with Xeepy() as x:
    result = await x.unfollow.inactive(
        inactive_days=180,  # No tweets in 6 months
        max_unfollows=30,
        whitelist_file="whitelist.txt"
    )
```

### Unfollow by Criteria

```python
async with Xeepy() as x:
    # Unfollow based on custom filters
    result = await x.unfollow.by_criteria(
        criteria={
            "followers_below": 50,      # Very small accounts
            "following_above": 5000,    # Follow spam accounts
            "tweets_below": 10,         # Low activity
        },
        max_unfollows=25
    )
```

## Safety Features

### Dry Run Mode

Always preview before executing:

```python
async with Xeepy() as x:
    # See what would happen without doing it
    result = await x.unfollow.non_followers(dry_run=True)
    
    print("Would unfollow:")
    for user in result.would_unfollow:
        print(f"  - @{user}")
    
    # Then run for real if satisfied
    await x.unfollow.non_followers(dry_run=False)
```

### Whitelist Protection

```python
async with Xeepy() as x:
    # Method 1: Inline list
    result = await x.unfollow.non_followers(
        whitelist=["vip1", "vip2", "friend"]
    )
    
    # Method 2: File (better for many users)
    result = await x.unfollow.non_followers(
        whitelist_file="whitelist.txt"
    )
    
    # Method 3: Pattern matching
    result = await x.unfollow.non_followers(
        whitelist_patterns=[".*_official", "team_.*"]
    )
```

### Daily Limits

```python
async with Xeepy() as x:
    # Configure safety limits
    x.config.safety.max_follows_per_day = 50
    x.config.safety.max_unfollows_per_day = 100
    
    # Operations will stop when limit reached
    result = await x.unfollow.non_followers(max_unfollows=200)
    # Will only do 100 due to daily limit
```

### Rate Limiting

```python
async with Xeepy() as x:
    # Default: 30 follows/hour, 50 unfollows/hour
    # Customize if needed
    x.config.rate_limit.follows_per_hour = 20
    x.config.rate_limit.unfollows_per_hour = 40
```

## CLI Commands

### Follow Commands

```bash
# Follow a user
xeepy follow user naval

# Follow by hashtag
xeepy follow hashtag "#buildinpublic" --limit 20 --min-followers 100

# Follow from search
xeepy follow search "python developer" --limit 15

# Follow followers of account
xeepy follow followers-of elonmusk --limit 30
```

### Unfollow Commands

```bash
# Preview non-followers (dry run)
xeepy unfollow non-followers --dry-run

# Unfollow non-followers
xeepy unfollow non-followers --max 50 --whitelist-file whitelist.txt

# Unfollow inactive
xeepy unfollow inactive --days 180 --max 30

# Smart unfollow
xeepy unfollow smart --criteria inactive,no-bio,not-following --max 25

# Nuclear option (be careful!)
xeepy unfollow everyone --whitelist-file whitelist.txt --confirm
```

## Scheduling Follow/Unfollow

### Daily Cleanup Script

```python
import asyncio
from datetime import datetime
from xeepy import Xeepy

async def daily_cleanup():
    """Run daily to maintain healthy following list"""
    async with Xeepy() as x:
        print(f"🧹 Daily cleanup - {datetime.now()}")
        
        # 1. Unfollow non-followers (conservative)
        unfollow_result = await x.unfollow.non_followers(
            max_unfollows=25,
            whitelist_file="whitelist.txt"
        )
        print(f"   Unfollowed {unfollow_result.unfollowed_count} non-followers")
        
        # 2. Follow people from target hashtag
        follow_result = await x.follow.by_hashtag(
            "#buildinpublic",
            limit=15,
            min_followers=100
        )
        print(f"   Followed {follow_result.followed_count} new users")
        
        # 3. Log results
        print(f"✓ Net change: {follow_result.followed_count - unfollow_result.unfollowed_count:+d}")

asyncio.run(daily_cleanup())
```

### Growth Campaign

```python
async def growth_campaign(target_hashtags: list, days: int = 7):
    """Run a multi-day growth campaign"""
    from datetime import datetime, timedelta
    
    async with Xeepy() as x:
        end_date = datetime.now() + timedelta(days=days)
        
        while datetime.now() < end_date:
            # Rotate through hashtags
            for hashtag in target_hashtags:
                await x.follow.by_hashtag(
                    hashtag,
                    limit=10,
                    min_followers=100,
                    max_followers=10000
                )
            
            # Clean up non-followers
            await x.unfollow.non_followers(max_unfollows=20)
            
            # Wait before next cycle (respect rate limits)
            await asyncio.sleep(3600)  # 1 hour

# Run campaign
asyncio.run(growth_campaign(
    target_hashtags=["#startup", "#indiehackers", "#buildinpublic"],
    days=7
))
```

## Best Practices

!!! tip "Golden Rules"
    1. **Always dry-run first** - Preview before executing
    2. **Use whitelists** - Protect important connections
    3. **Start conservative** - Begin with low limits
    4. **Monitor results** - Check for unexpected unfollows
    5. **Respect rate limits** - Don't disable protections

!!! warning "Avoid Account Flags"
    - Don't follow/unfollow too fast
    - Don't follow then immediately unfollow
    - Mix automated actions with organic activity
    - Keep follow ratios reasonable (< 1.5 following/followers)

## Troubleshooting

??? question "Why didn't it unfollow everyone I expected?"
    
    Check:
    - Whitelist matches (exact username)
    - Daily limits reached
    - Rate limits hit
    - Protected/private accounts

??? question "Follow operation failed"
    
    Common causes:
    - Account is private
    - You're already following
    - Account blocked you
    - Rate limit reached

??? question "How do I undo an unfollow?"
    
    The result object contains unfollowed usernames:
    ```python
    result = await x.unfollow.non_followers()
    # Re-follow if needed
    for user in result.unfollowed_users[:5]:
        await x.follow.user(user)
    ```
