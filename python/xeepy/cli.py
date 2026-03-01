"""
CLI module for xeepy follow/unfollow operations.

Provides command-line interface for all follow and unfollow operations.
"""

import click
import asyncio
import logging
from pathlib import Path

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger('xeepy.cli')


def run_async(coro):
    """Run an async coroutine."""
    return asyncio.get_event_loop().run_until_complete(coro)


@click.group()
@click.option('--db', default='xeepy_tracker.db', help='Database file path')
@click.option('--verbose', '-v', is_flag=True, help='Enable verbose output')
@click.pass_context
def cli(ctx, db, verbose):
    """
    Xeepy - X/Twitter Follow/Unfollow Operations
    
    A comprehensive toolkit for managing your X/Twitter following.
    """
    ctx.ensure_object(dict)
    ctx.obj['db_path'] = db
    ctx.obj['verbose'] = verbose
    
    if verbose:
        logging.getLogger().setLevel(logging.DEBUG)


# =============================================================================
# Follow Commands
# =============================================================================

@cli.group()
def follow():
    """Follow operations."""
    pass


@follow.command('user')
@click.argument('username')
@click.option('--source', '-s', help='Source label for tracking')
@click.option('--dry-run', is_flag=True, help='Preview without following')
@click.pass_context
def follow_user(ctx, username, source, dry_run):
    """Follow a single user by username."""
    click.echo(f"Following @{username}...")
    
    if dry_run:
        click.echo(f"[DRY RUN] Would follow @{username}")
        return
    
    # In production, this would initialize the browser and tracker
    click.echo("Note: Browser automation not initialized. Use as library for full functionality.")
    click.echo(f"To follow @{username}, use the Python API:")
    click.echo(f"""
    from xeepy.actions.follow import FollowUser
    from xeepy.storage import FollowTracker
    
    tracker = FollowTracker('{ctx.obj["db_path"]}')
    action = FollowUser(browser, rate_limiter, tracker)
    result = await action.execute(username='{username}', source='{source or "cli"}')
    """)


@follow.command('keyword')
@click.argument('keywords', nargs=-1, required=True)
@click.option('--max', '-m', 'max_follows', default=50, help='Maximum users to follow')
@click.option('--min-followers', default=100, help='Minimum follower count')
@click.option('--max-followers', default=100000, help='Maximum follower count')
@click.option('--dry-run', is_flag=True, help='Preview without following')
@click.pass_context
def follow_keyword(ctx, keywords, max_follows, min_followers, max_followers, dry_run):
    """Follow users who tweet about specific keywords."""
    click.echo(f"Following users tweeting about: {', '.join(keywords)}")
    click.echo(f"Max follows: {max_follows}")
    click.echo(f"Follower range: {min_followers} - {max_followers}")
    
    if dry_run:
        click.echo("[DRY RUN] No follows will be performed")
    
    click.echo("\nTo use this feature, use the Python API:")
    click.echo(f"""
    from xeepy.actions.follow import FollowByKeyword
    from xeepy.actions.base import FollowFilters
    
    filters = FollowFilters(
        min_followers={min_followers},
        max_followers={max_followers}
    )
    action = FollowByKeyword(browser, rate_limiter, tracker)
    result = await action.execute(
        keywords={list(keywords)},
        max_follows={max_follows},
        filters=filters,
        dry_run={dry_run}
    )
    """)


@follow.command('hashtag')
@click.argument('hashtags', nargs=-1, required=True)
@click.option('--max', '-m', 'max_follows', default=50, help='Maximum users to follow')
@click.option('--dry-run', is_flag=True, help='Preview without following')
@click.pass_context
def follow_hashtag(ctx, hashtags, max_follows, dry_run):
    """Follow users who tweet with specific hashtags."""
    # Clean hashtags
    hashtags = [h.lstrip('#') for h in hashtags]
    
    click.echo(f"Following users using: #{', #'.join(hashtags)}")
    click.echo(f"Max follows: {max_follows}")
    
    if dry_run:
        click.echo("[DRY RUN] No follows will be performed")


@follow.command('followers')
@click.argument('target_username')
@click.option('--max', '-m', 'max_follows', default=50, help='Maximum users to follow')
@click.option('--mode', type=click.Choice(['followers', 'following']), default='followers',
              help='Follow their followers or who they follow')
@click.option('--dry-run', is_flag=True, help='Preview without following')
@click.pass_context
def follow_target_followers(ctx, target_username, max_follows, mode, dry_run):
    """Follow the followers or following of a target account."""
    target = target_username.lstrip('@')
    
    click.echo(f"Following @{target}'s {mode}")
    click.echo(f"Max follows: {max_follows}")
    
    if dry_run:
        click.echo("[DRY RUN] No follows will be performed")


@follow.command('engagers')
@click.argument('tweet_urls', nargs=-1, required=True)
@click.option('--type', 'engagement_type', 
              type=click.Choice(['likers', 'retweeters', 'commenters', 'all']),
              default='likers', help='Type of engagement')
@click.option('--max', '-m', 'max_follows', default=50, help='Maximum users to follow')
@click.option('--dry-run', is_flag=True, help='Preview without following')
@click.pass_context
def follow_engagers(ctx, tweet_urls, engagement_type, max_follows, dry_run):
    """Follow users who engaged with specific tweets."""
    click.echo(f"Following {engagement_type} of {len(tweet_urls)} tweet(s)")
    click.echo(f"Max follows: {max_follows}")
    
    if dry_run:
        click.echo("[DRY RUN] No follows will be performed")


# =============================================================================
# Unfollow Commands
# =============================================================================

@cli.group()
def unfollow():
    """Unfollow operations."""
    pass


@unfollow.command('user')
@click.argument('username')
@click.option('--reason', '-r', help='Reason for unfollowing (for tracking)')
@click.option('--dry-run', is_flag=True, help='Preview without unfollowing')
@click.pass_context
def unfollow_user(ctx, username, reason, dry_run):
    """Unfollow a single user by username."""
    username = username.lstrip('@')
    
    click.echo(f"Unfollowing @{username}...")
    
    if dry_run:
        click.echo(f"[DRY RUN] Would unfollow @{username}")


@unfollow.command('non-followers')
@click.option('--max', '-m', 'max_unfollows', default=100, help='Maximum users to unfollow')
@click.option('--whitelist', '-w', multiple=True, help='Users to never unfollow')
@click.option('--min-followers', type=int, help='Keep if they have >= this many followers')
@click.option('--grace-days', type=int, help='Days to wait before unfollowing')
@click.option('--exclude-verified', is_flag=True, help='Never unfollow verified accounts')
@click.option('--dry-run', is_flag=True, help='Preview without unfollowing')
@click.pass_context
def unfollow_non_followers(ctx, max_unfollows, whitelist, min_followers, grace_days, 
                          exclude_verified, dry_run):
    """
    Unfollow users who don't follow you back.
    
    This is the most popular feature. It will:
    
    1. Get your followers list
    2. Get your following list
    3. Find who doesn't follow back
    4. Apply filters (whitelist, min followers, etc.)
    5. Unfollow with rate limiting
    """
    click.echo("=" * 50)
    click.echo("UNFOLLOW NON-FOLLOWERS")
    click.echo("=" * 50)
    click.echo(f"Max unfollows: {max_unfollows}")
    
    if whitelist:
        click.echo(f"Whitelist: {', '.join(whitelist)}")
    if min_followers:
        click.echo(f"Keep if followers >= {min_followers}")
    if grace_days:
        click.echo(f"Grace period: {grace_days} days")
    if exclude_verified:
        click.echo("Excluding verified accounts")
    
    if dry_run:
        click.echo("\n[DRY RUN] No unfollows will be performed")
    
    click.echo("\nTo use this feature, use the Python API:")
    click.echo(f"""
    from xeepy.actions.unfollow import UnfollowNonFollowers
    
    action = UnfollowNonFollowers(browser, rate_limiter, tracker)
    result = await action.execute(
        max_unfollows={max_unfollows},
        whitelist={list(whitelist) if whitelist else None},
        min_followers={min_followers},
        min_following_days={grace_days},
        exclude_verified={exclude_verified},
        dry_run={dry_run}
    )
    
    print(f"Unfollowed: {{result.success_count}}")
    print(f"Failed: {{result.failed_count}}")
    """)


@unfollow.command('smart')
@click.option('--days', '-d', default=3, help='Days threshold before unfollowing')
@click.option('--max', '-m', 'max_unfollows', default=50, help='Maximum users to unfollow')
@click.option('--whitelist', '-w', multiple=True, help='Users to never unfollow')
@click.option('--dry-run', is_flag=True, help='Preview without unfollowing')
@click.pass_context
def smart_unfollow(ctx, days, max_unfollows, whitelist, dry_run):
    """
    Smart unfollow based on follow tracking.
    
    Unfollows users who didn't follow back within X days.
    Requires follow tracking to be enabled.
    """
    click.echo("=" * 50)
    click.echo("SMART UNFOLLOW")
    click.echo("=" * 50)
    click.echo(f"Threshold: {days} days")
    click.echo(f"Max unfollows: {max_unfollows}")
    
    if whitelist:
        click.echo(f"Whitelist: {', '.join(whitelist)}")
    
    if dry_run:
        click.echo("\n[DRY RUN] No unfollows will be performed")


@unfollow.command('all')
@click.option('--max', '-m', 'max_unfollows', default=100, help='Maximum users to unfollow')
@click.option('--whitelist', '-w', multiple=True, help='Users to never unfollow')
@click.option('--confirm', is_flag=True, help='Skip confirmation prompt')
@click.option('--dry-run', is_flag=True, help='Preview without unfollowing')
@click.pass_context
def unfollow_all_cmd(ctx, max_unfollows, whitelist, confirm, dry_run):
    """
    Unfollow everyone (with safety limits).
    
    WARNING: This is a destructive operation!
    """
    click.echo("=" * 50)
    click.echo("⚠️  UNFOLLOW ALL  ⚠️")
    click.echo("=" * 50)
    click.echo(f"Max unfollows: {max_unfollows}")
    
    if whitelist:
        click.echo(f"Whitelist: {', '.join(whitelist)}")
    
    if not dry_run and not confirm:
        if not click.confirm(f"\nAre you sure you want to unfollow up to {max_unfollows} users?"):
            click.echo("Operation cancelled.")
            return
    
    if dry_run:
        click.echo("\n[DRY RUN] No unfollows will be performed")


# =============================================================================
# Whitelist Commands
# =============================================================================

@cli.group()
def whitelist():
    """Manage the never-unfollow whitelist."""
    pass


@whitelist.command('add')
@click.argument('usernames', nargs=-1, required=True)
@click.option('--reason', '-r', help='Reason for whitelisting')
@click.pass_context
def whitelist_add(ctx, usernames, reason):
    """Add users to the whitelist."""
    from xeepy.storage import FollowTracker
    
    tracker = FollowTracker(ctx.obj['db_path'])
    
    for username in usernames:
        username = username.lstrip('@').lower()
        tracker.add_to_whitelist(username, reason)
        click.echo(f"Added @{username} to whitelist")
    
    tracker.close()


@whitelist.command('remove')
@click.argument('usernames', nargs=-1, required=True)
@click.pass_context
def whitelist_remove(ctx, usernames):
    """Remove users from the whitelist."""
    from xeepy.storage import FollowTracker
    
    tracker = FollowTracker(ctx.obj['db_path'])
    
    for username in usernames:
        username = username.lstrip('@').lower()
        tracker.remove_from_whitelist(username)
        click.echo(f"Removed @{username} from whitelist")
    
    tracker.close()


@whitelist.command('list')
@click.pass_context
def whitelist_list(ctx):
    """List all whitelisted users."""
    from xeepy.storage import FollowTracker
    
    tracker = FollowTracker(ctx.obj['db_path'])
    users = tracker.get_whitelist()
    
    if users:
        click.echo("Whitelisted users:")
        for user in sorted(users):
            click.echo(f"  @{user}")
        click.echo(f"\nTotal: {len(users)}")
    else:
        click.echo("No users in whitelist.")
    
    tracker.close()


# =============================================================================
# Stats Commands
# =============================================================================

@cli.group()
def stats():
    """View follow/unfollow statistics."""
    pass


@stats.command('summary')
@click.pass_context
def stats_summary(ctx):
    """Show follow/unfollow summary statistics."""
    from xeepy.storage import FollowTracker
    
    tracker = FollowTracker(ctx.obj['db_path'])
    s = tracker.get_stats()
    
    click.echo("=" * 50)
    click.echo("FOLLOW/UNFOLLOW STATISTICS")
    click.echo("=" * 50)
    click.echo(f"Total follows:      {s.total_follows}")
    click.echo(f"Total unfollows:    {s.total_unfollows}")
    click.echo(f"Total follow-backs: {s.total_follow_backs}")
    click.echo(f"Follow-back rate:   {s.follow_back_rate:.1f}%")
    click.echo("-" * 50)
    click.echo(f"Follows today:      {s.follows_today}")
    click.echo(f"Unfollows today:    {s.unfollows_today}")
    click.echo(f"Pending follow-backs: {s.pending_follow_backs}")
    
    tracker.close()


@stats.command('history')
@click.argument('username')
@click.pass_context
def stats_history(ctx, username):
    """Show follow history for a specific user."""
    from xeepy.storage import FollowTracker
    
    username = username.lstrip('@').lower()
    tracker = FollowTracker(ctx.obj['db_path'])
    history = tracker.get_follow_history(username)
    
    if history:
        click.echo(f"History for @{username}:")
        click.echo("-" * 50)
        for record in history:
            action = record['action_type']
            date = record['created_at']
            source = record.get('source', '')
            reason = record.get('reason', '')
            
            line = f"  {date}: {action.upper()}"
            if source:
                line += f" (source: {source})"
            if reason:
                line += f" (reason: {reason})"
            
            click.echo(line)
    else:
        click.echo(f"No history found for @{username}")
    
    tracker.close()


# =============================================================================
# Export Commands
# =============================================================================

@cli.group()
def export():
    """Export data to files."""
    pass


@export.command('history')
@click.argument('filepath', type=click.Path())
@click.option('--type', 'action_type', type=click.Choice(['all', 'follow', 'unfollow']),
              default='all', help='Type of actions to export')
@click.pass_context
def export_history(ctx, filepath, action_type):
    """Export follow/unfollow history to CSV."""
    from xeepy.storage import FollowTracker
    
    tracker = FollowTracker(ctx.obj['db_path'])
    
    filter_type = None if action_type == 'all' else action_type
    tracker.export_history(filepath, action_type=filter_type)
    
    click.echo(f"History exported to {filepath}")
    tracker.close()


@export.command('unfollowed')
@click.argument('filepath', type=click.Path())
@click.pass_context
def export_unfollowed(ctx, filepath):
    """Export list of unfollowed users to CSV."""
    from xeepy.storage import FollowTracker
    
    tracker = FollowTracker(ctx.obj['db_path'])
    tracker.export_unfollowed(filepath)
    
    click.echo(f"Unfollowed list exported to {filepath}")
    tracker.close()


def main():
    """Main entry point."""
    cli(obj={})


if __name__ == '__main__':
    main()
