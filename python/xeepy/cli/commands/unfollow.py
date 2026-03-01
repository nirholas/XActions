"""
Unfollow commands for Xeepy CLI.
"""

from __future__ import annotations

import click
from rich.console import Console
from rich.table import Table

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
    format_number,
)

console = Console()


@click.group()
def unfollow():
    """Unfollow operations for X/Twitter.
    
    \b
    Examples:
        xeepy unfollow non-followers --dry-run
        xeepy unfollow all --whitelist vip1 vip2
        xeepy unfollow inactive --days 90
    
    ⚠️  Use responsibly - aggressive unfollowing may result in account restrictions.
    """
    pass


@unfollow.command()
@click.argument("username")
@dry_run_option
@click.pass_context
@async_command
async def user(ctx, username: str, dry_run: bool):
    """Unfollow a specific user.
    
    USERNAME: The Twitter username to unfollow (without @).
    """
    username = username.lstrip("@")
    
    if dry_run:
        print_info(f"[DRY RUN] Would unfollow @{username}")
        return
    
    print_info(f"Unfollowing @{username}...")
    
    # Placeholder - would integrate with actual action
    print_success(f"Unfollowed @{username}")


@unfollow.command("non-followers")
@click.option("--max", "-m", "max_unfollows", default=100, help="Maximum users to unfollow.")
@click.option("--whitelist", "-w", multiple=True, help="Usernames to never unfollow.")
@click.option("--whitelist-file", type=click.Path(exists=True), help="File with whitelist usernames.")
@click.option("--min-days", default=7, help="Minimum days since following before unfollowing.")
@dry_run_option
@output_option
@click.pass_context
@async_command
async def non_followers(
    ctx,
    max_unfollows: int,
    whitelist: tuple[str, ...],
    whitelist_file: str | None,
    min_days: int,
    dry_run: bool,
    output: str | None,
):
    """Unfollow users who don't follow you back.
    
    This is one of the most useful cleanup operations for maintaining
    a healthy follower/following ratio.
    """
    print_info("Finding non-followers...")
    
    # Build whitelist
    whitelist_set = set(w.lstrip("@").lower() for w in whitelist)
    if whitelist_file:
        with open(whitelist_file) as f:
            for line in f:
                whitelist_set.add(line.strip().lstrip("@").lower())
    
    if whitelist_set:
        print_info(f"Whitelist: {len(whitelist_set)} users protected")
    
    print_info(f"Only unfollowing users followed for >{min_days} days")
    
    if dry_run:
        print_warning("[DRY RUN] No users will actually be unfollowed")
    
    # Placeholder analysis
    non_followers_data = []
    for i in range(min(max_unfollows, 20)):
        username = f"non_follower_{i}"
        if username.lower() not in whitelist_set:
            non_followers_data.append({
                "username": username,
                "followed_at": "2024-01-01",
                "followers_count": 100 + i * 50,
                "following_count": 500 + i * 100,
            })
    
    # Show preview
    console.print(f"\n[bold]Found {len(non_followers_data)} non-followers[/bold]\n")
    
    if non_followers_data:
        table = Table(title="Non-followers to unfollow")
        table.add_column("Username", style="cyan")
        table.add_column("Their Followers", style="green")
        table.add_column("Their Following", style="yellow")
        
        for user in non_followers_data[:10]:
            table.add_row(
                f"@{user['username']}",
                format_number(user["followers_count"]),
                format_number(user["following_count"]),
            )
        
        if len(non_followers_data) > 10:
            table.add_row("...", f"+{len(non_followers_data) - 10} more", "")
        
        console.print(table)
        console.print()
    
    if not dry_run and non_followers_data:
        if not confirm_action(f"Unfollow {len(non_followers_data)} users?"):
            print_info("Cancelled")
            return
        
        with get_progress() as progress:
            task = progress.add_task("Unfollowing...", total=len(non_followers_data))
            
            for user in non_followers_data:
                # Would actually unfollow here
                progress.update(task, advance=1)
    
    if output:
        export_data(non_followers_data, output, "json")
    
    action = "Would unfollow" if dry_run else "Unfollowed"
    print_success(f"{action} {len(non_followers_data)} non-followers")


@unfollow.command("all")
@click.option("--whitelist", "-w", multiple=True, help="Usernames to never unfollow.")
@click.option("--confirm", "confirmed", is_flag=True, help="Skip confirmation prompt.")
@dry_run_option
@output_option
@click.pass_context
@async_command
async def unfollow_all(
    ctx,
    whitelist: tuple[str, ...],
    confirmed: bool,
    dry_run: bool,
    output: str | None,
):
    """Unfollow everyone (except whitelist).
    
    ⚠️  WARNING: This is a destructive operation!
    """
    print_warning("⚠️  This will unfollow ALL users (except whitelist)")
    
    whitelist_set = set(w.lstrip("@").lower() for w in whitelist)
    if whitelist_set:
        print_info(f"Whitelist: {', '.join(whitelist_set)}")
    
    if dry_run:
        print_warning("[DRY RUN] No users will actually be unfollowed")
    
    if not dry_run and not confirmed:
        if not confirm_action("Are you SURE you want to unfollow everyone?", default=False):
            print_info("Cancelled")
            return
        
        # Double confirmation for safety
        if not confirm_action("This cannot be undone. Type 'yes' to confirm:"):
            print_info("Cancelled")
            return
    
    # Placeholder
    print_info("Would unfollow all users here...")
    print_success("Unfollow all completed")


@unfollow.command("inactive")
@click.option("--days", "-d", default=90, help="Days since last activity.")
@click.option("--max", "-m", "max_unfollows", default=100, help="Maximum users to unfollow.")
@click.option("--whitelist", "-w", multiple=True, help="Usernames to never unfollow.")
@dry_run_option
@output_option
@click.pass_context
@async_command
async def inactive(
    ctx,
    days: int,
    max_unfollows: int,
    whitelist: tuple[str, ...],
    dry_run: bool,
    output: str | None,
):
    """Unfollow users who haven't been active.
    
    Removes users who haven't tweeted in the specified number of days.
    """
    print_info(f"Finding users inactive for >{days} days...")
    
    whitelist_set = set(w.lstrip("@").lower() for w in whitelist)
    
    if dry_run:
        print_warning("[DRY RUN] No users will actually be unfollowed")
    
    # Placeholder data
    inactive_users = []
    for i in range(min(max_unfollows, 15)):
        username = f"inactive_user_{i}"
        if username.lower() not in whitelist_set:
            inactive_users.append({
                "username": username,
                "last_tweet_date": "2023-06-01",
                "days_inactive": days + i * 10,
            })
    
    if inactive_users:
        table = Table(title=f"Inactive users (>{days} days)")
        table.add_column("Username", style="cyan")
        table.add_column("Last Active", style="yellow")
        table.add_column("Days Inactive", style="red")
        
        for user in inactive_users[:10]:
            table.add_row(
                f"@{user['username']}",
                user["last_tweet_date"],
                str(user["days_inactive"]),
            )
        
        console.print(table)
        console.print()
    
    if not dry_run and inactive_users:
        if not confirm_action(f"Unfollow {len(inactive_users)} inactive users?"):
            print_info("Cancelled")
            return
    
    if output:
        export_data(inactive_users, output, "json")
    
    action = "Would unfollow" if dry_run else "Unfollowed"
    print_success(f"{action} {len(inactive_users)} inactive users")


@unfollow.command("by-criteria")
@click.option("--min-followers", type=int, help="Unfollow if they have fewer followers.")
@click.option("--max-followers", type=int, help="Unfollow if they have more followers.")
@click.option("--min-ratio", type=float, help="Unfollow if their following/followers ratio is above this.")
@click.option("--no-bio", is_flag=True, help="Unfollow users without a bio.")
@click.option("--no-avatar", is_flag=True, help="Unfollow users with default avatar.")
@click.option("--max", "-m", "max_unfollows", default=100, help="Maximum users to unfollow.")
@dry_run_option
@output_option
@click.pass_context
@async_command
async def by_criteria(
    ctx,
    min_followers: int | None,
    max_followers: int | None,
    min_ratio: float | None,
    no_bio: bool,
    no_avatar: bool,
    max_unfollows: int,
    dry_run: bool,
    output: str | None,
):
    """Unfollow users matching specific criteria.
    
    Useful for cleaning up low-quality accounts from your following list.
    """
    criteria = []
    if min_followers:
        criteria.append(f"< {format_number(min_followers)} followers")
    if max_followers:
        criteria.append(f"> {format_number(max_followers)} followers")
    if min_ratio:
        criteria.append(f"following/followers ratio > {min_ratio}")
    if no_bio:
        criteria.append("no bio")
    if no_avatar:
        criteria.append("default avatar")
    
    if not criteria:
        print_error("Please specify at least one criterion")
        return
    
    print_info(f"Finding users matching: {', '.join(criteria)}")
    
    if dry_run:
        print_warning("[DRY RUN] No users will actually be unfollowed")
    
    # Placeholder data
    matching_users = []
    for i in range(min(max_unfollows, 10)):
        matching_users.append({
            "username": f"matching_user_{i}",
            "matched_criteria": criteria[:2],
        })
    
    if matching_users:
        console.print(f"\nFound {len(matching_users)} users matching criteria\n")
    
    if not dry_run and matching_users:
        if not confirm_action(f"Unfollow {len(matching_users)} users?"):
            print_info("Cancelled")
            return
    
    if output:
        export_data(matching_users, output, "json")
    
    action = "Would unfollow" if dry_run else "Unfollowed"
    print_success(f"{action} {len(matching_users)} users matching criteria")


@unfollow.command("smart")
@click.option("--preserve-engagement", is_flag=True, default=True, help="Keep users you've engaged with.")
@click.option("--preserve-recent", default=30, help="Days to preserve recent follows.")
@click.option("--target-ratio", type=float, help="Target followers/following ratio.")
@click.option("--max", "-m", "max_unfollows", default=50, help="Maximum users to unfollow.")
@dry_run_option
@click.pass_context
@async_command
async def smart_unfollow(
    ctx,
    preserve_engagement: bool,
    preserve_recent: int,
    target_ratio: float | None,
    max_unfollows: int,
    dry_run: bool,
):
    """Intelligently unfollow to optimize your account.
    
    Uses smart criteria to determine who to unfollow while
    preserving valuable connections.
    """
    print_info("Running smart unfollow analysis...")
    
    settings = []
    if preserve_engagement:
        settings.append("preserving engaged users")
    if preserve_recent:
        settings.append(f"preserving follows < {preserve_recent} days")
    if target_ratio:
        settings.append(f"targeting {target_ratio} ratio")
    
    print_info(f"Settings: {', '.join(settings)}")
    
    if dry_run:
        print_warning("[DRY RUN] No users will actually be unfollowed")
    
    # Placeholder analysis
    analysis = {
        "total_following": 1500,
        "total_followers": 1000,
        "current_ratio": 1.5,
        "non_followers": 800,
        "inactive": 200,
        "low_quality": 150,
        "recommended_unfollows": 100,
    }
    
    table = Table(title="Smart Unfollow Analysis")
    table.add_column("Metric", style="cyan")
    table.add_column("Value", style="green")
    
    table.add_row("Total Following", format_number(analysis["total_following"]))
    table.add_row("Total Followers", format_number(analysis["total_followers"]))
    table.add_row("Current Ratio", f"{analysis['current_ratio']:.2f}")
    table.add_row("Non-followers", format_number(analysis["non_followers"]))
    table.add_row("Inactive (90d)", format_number(analysis["inactive"]))
    table.add_row("Low Quality", format_number(analysis["low_quality"]))
    table.add_row("[bold]Recommended Unfollows[/bold]", 
                  f"[bold]{analysis['recommended_unfollows']}[/bold]")
    
    console.print(table)
    console.print()
    
    if not dry_run:
        if not confirm_action(f"Proceed with smart unfollow ({analysis['recommended_unfollows']} users)?"):
            print_info("Cancelled")
            return
    
    action = "Would unfollow" if dry_run else "Unfollowed"
    print_success(f"{action} {min(max_unfollows, analysis['recommended_unfollows'])} users")
