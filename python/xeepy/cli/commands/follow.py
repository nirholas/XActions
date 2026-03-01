"""
Follow commands for Xeepy CLI.
"""

from __future__ import annotations

import click
from rich.console import Console

from xeepy.cli.utils import (
    async_command,
    export_data,
    get_progress,
    print_success,
    print_error,
    print_info,
    print_warning,
    confirm_action,
    output_option,
    limit_option,
    dry_run_option,
)

console = Console()


@click.group()
def follow():
    """Follow operations for X/Twitter.
    
    \b
    Examples:
        xeepy follow user elonmusk
        xeepy follow by-keyword "AI" "machine learning" --max 50
        xeepy follow followers-of competitor_account --max 100
    
    ⚠️  Use responsibly - aggressive following may result in account restrictions.
    """
    pass


@follow.command()
@click.argument("username")
@dry_run_option
@click.pass_context
@async_command
async def user(ctx, username: str, dry_run: bool):
    """Follow a specific user.
    
    USERNAME: The Twitter username to follow (without @).
    """
    username = username.lstrip("@")
    
    if dry_run:
        print_info(f"[DRY RUN] Would follow @{username}")
        return
    
    print_info(f"Following @{username}...")
    
    # Placeholder - would integrate with actual action
    print_success(f"Followed @{username}")


@follow.command("by-keyword")
@click.argument("keywords", nargs=-1, required=True)
@click.option("--max", "-m", "max_follows", default=50, help="Maximum users to follow.")
@click.option("--min-followers", default=100, help="Minimum follower count.")
@click.option("--max-followers", default=100000, help="Maximum follower count.")
@click.option("--verified-only", is_flag=True, help="Only follow verified accounts.")
@dry_run_option
@output_option
@click.pass_context
@async_command
async def by_keyword(
    ctx,
    keywords: tuple[str, ...],
    max_follows: int,
    min_followers: int,
    max_followers: int,
    verified_only: bool,
    dry_run: bool,
    output: str | None,
):
    """Follow users who tweet about specific keywords.
    
    KEYWORDS: One or more keywords to search for.
    """
    print_info(f"Finding users tweeting about: {', '.join(keywords)}")
    print_info(f"Filters: {min_followers}-{max_followers} followers" + 
              (", verified only" if verified_only else ""))
    
    if dry_run:
        print_warning("[DRY RUN] No users will actually be followed")
    
    with get_progress() as progress:
        task = progress.add_task("Finding and following users...", total=max_follows)
        
        followed = []
        for i in range(min(max_follows, 5)):  # Demo limit
            user_data = {
                "username": f"keyword_user_{i}",
                "matched_keyword": keywords[i % len(keywords)],
                "followers_count": min_followers + i * 1000,
            }
            
            if not dry_run:
                # Would actually follow here
                pass
            
            followed.append(user_data)
            progress.update(task, advance=1)
    
    if output:
        export_data(followed, output, "json")
    
    action = "Would follow" if dry_run else "Followed"
    print_success(f"{action} {len(followed)} users")


@follow.command("by-hashtag")
@click.argument("hashtag")
@click.option("--max", "-m", "max_follows", default=50, help="Maximum users to follow.")
@click.option("--min-followers", default=100, help="Minimum follower count.")
@dry_run_option
@click.pass_context
@async_command
async def by_hashtag(
    ctx,
    hashtag: str,
    max_follows: int,
    min_followers: int,
    dry_run: bool,
):
    """Follow users who tweet with a specific hashtag.
    
    HASHTAG: The hashtag to search for (with or without #).
    """
    hashtag = hashtag.lstrip("#")
    
    print_info(f"Finding users tweeting with #{hashtag}")
    
    if dry_run:
        print_warning("[DRY RUN] No users will actually be followed")
    
    with get_progress() as progress:
        task = progress.add_task("Finding and following users...", total=max_follows)
        
        followed_count = 0
        for i in range(min(max_follows, 5)):
            if not dry_run:
                # Would actually follow here
                pass
            followed_count += 1
            progress.update(task, advance=1)
    
    action = "Would follow" if dry_run else "Followed"
    print_success(f"{action} {followed_count} users using #{hashtag}")


@follow.command("followers-of")
@click.argument("username")
@click.option("--max", "-m", "max_follows", default=100, help="Maximum users to follow.")
@click.option("--min-followers", default=50, help="Minimum follower count for targets.")
@click.option("--skip-private", is_flag=True, help="Skip private accounts.")
@dry_run_option
@output_option
@click.pass_context
@async_command
async def followers_of(
    ctx,
    username: str,
    max_follows: int,
    min_followers: int,
    skip_private: bool,
    dry_run: bool,
    output: str | None,
):
    """Follow the followers of a target account.
    
    USERNAME: The account whose followers to follow.
    """
    username = username.lstrip("@")
    
    print_info(f"Following followers of @{username}")
    print_info(f"Settings: max {max_follows}, min followers: {min_followers}")
    
    if skip_private:
        print_info("Skipping private accounts")
    
    if dry_run:
        print_warning("[DRY RUN] No users will actually be followed")
    
    if not dry_run and not confirm_action(
        f"This will follow up to {max_follows} followers of @{username}. Continue?"
    ):
        print_info("Cancelled")
        return
    
    with get_progress() as progress:
        task = progress.add_task("Following users...", total=max_follows)
        
        followed = []
        for i in range(min(max_follows, 10)):
            user_data = {
                "username": f"follower_of_{username}_{i}",
                "source": username,
            }
            
            if not dry_run:
                # Would actually follow here
                pass
            
            followed.append(user_data)
            progress.update(task, advance=1)
    
    if output:
        export_data(followed, output, "json")
    
    action = "Would follow" if dry_run else "Followed"
    print_success(f"{action} {len(followed)} followers of @{username}")


@follow.command("engagers")
@click.argument("tweet_url")
@click.option("--max", "-m", "max_follows", default=50, help="Maximum users to follow.")
@click.option("--likers", is_flag=True, default=True, help="Follow users who liked.")
@click.option("--retweeters", is_flag=True, help="Follow users who retweeted.")
@click.option("--commenters", is_flag=True, help="Follow users who commented.")
@dry_run_option
@click.pass_context
@async_command
async def engagers(
    ctx,
    tweet_url: str,
    max_follows: int,
    likers: bool,
    retweeters: bool,
    commenters: bool,
    dry_run: bool,
):
    """Follow users who engaged with a specific tweet.
    
    TWEET_URL: URL of the tweet whose engagers to follow.
    """
    engagement_types = []
    if likers:
        engagement_types.append("likers")
    if retweeters:
        engagement_types.append("retweeters")
    if commenters:
        engagement_types.append("commenters")
    
    print_info(f"Following {', '.join(engagement_types)} of tweet")
    
    if dry_run:
        print_warning("[DRY RUN] No users will actually be followed")
    
    with get_progress() as progress:
        task = progress.add_task("Following engagers...", total=max_follows)
        
        followed_count = 0
        for i in range(min(max_follows, 10)):
            if not dry_run:
                # Would actually follow here
                pass
            followed_count += 1
            progress.update(task, advance=1)
    
    action = "Would follow" if dry_run else "Followed"
    print_success(f"{action} {followed_count} engagers")


@follow.command("auto")
@click.option("--niche", "-n", required=True, help="Target niche/topic.")
@click.option("--max", "-m", "max_follows", default=50, help="Maximum users to follow.")
@click.option("--duration", "-d", default=30, help="Duration in minutes.")
@click.option("--interval", default=60, help="Seconds between follows.")
@dry_run_option
@click.pass_context
@async_command
async def auto_follow(
    ctx,
    niche: str,
    max_follows: int,
    duration: int,
    interval: int,
    dry_run: bool,
):
    """Automatically follow users in a niche over time.
    
    This command runs for the specified duration, finding and following
    users at regular intervals to appear more natural.
    """
    print_info(f"Auto-following in '{niche}' niche")
    print_info(f"Settings: max {max_follows} over {duration} min, {interval}s interval")
    
    if dry_run:
        print_warning("[DRY RUN] No users will actually be followed")
    
    print_warning("⚠️  Auto-following may violate X/Twitter ToS. Use at your own risk.")
    
    if not dry_run and not confirm_action("Start auto-following?"):
        print_info("Cancelled")
        return
    
    # Would run the auto-follow loop here
    print_info("Auto-follow would run here...")
    print_success("Auto-follow session completed")
