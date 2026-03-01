"""
Xeepy CLI - Main entry point.

The primary command-line interface for Xeepy.
"""

from __future__ import annotations

import asyncio
import sys
from pathlib import Path
from typing import Any

import click
from rich.console import Console
from rich.table import Table
from loguru import logger

# Import command groups
from xeepy.cli.commands import scrape, follow, unfollow, engage, monitor, ai

console = Console()


def setup_logging(verbose: bool) -> None:
    """Configure logging based on verbosity."""
    logger.remove()
    
    if verbose:
        logger.add(
            sys.stderr,
            level="DEBUG",
            format="<green>{time:HH:mm:ss}</green> | <level>{level: <8}</level> | <cyan>{name}</cyan>:<cyan>{function}</cyan>:<cyan>{line}</cyan> - <level>{message}</level>",
        )
    else:
        logger.add(
            sys.stderr,
            level="INFO",
            format="<green>{time:HH:mm:ss}</green> | <level>{level: <8}</level> | <level>{message}</level>",
        )


def load_config(config_path: str) -> dict[str, Any]:
    """Load configuration from file."""
    import yaml
    
    path = Path(config_path)
    
    if not path.exists():
        # Try default locations
        for default_path in ["config.yaml", "~/.xeepy/config.yaml"]:
            expanded = Path(default_path).expanduser()
            if expanded.exists():
                path = expanded
                break
    
    if path.exists():
        with open(path) as f:
            return yaml.safe_load(f) or {}
    
    return {}


class AsyncGroup(click.Group):
    """Click group that supports async commands."""
    
    def invoke(self, ctx: click.Context) -> Any:
        """Invoke the command, running async if needed."""
        return super().invoke(ctx)


@click.group(cls=AsyncGroup)
@click.option(
    "--config", "-c",
    default="config.yaml",
    help="Path to configuration file.",
    type=click.Path(),
)
@click.option(
    "--verbose", "-v",
    is_flag=True,
    help="Enable verbose output.",
)
@click.option(
    "--quiet", "-q",
    is_flag=True,
    help="Suppress non-essential output.",
)
@click.version_option(version="0.1.0", prog_name="xeepy")
@click.pass_context
def cli(ctx: click.Context, config: str, verbose: bool, quiet: bool) -> None:
    """Xeepy - X/Twitter Automation Toolkit
    
    ⚠️  EDUCATIONAL PURPOSES ONLY - Do not run against X/Twitter.
    
    A comprehensive toolkit for X/Twitter automation including:
    
    \b
    • Scraping: Profile, followers, tweets, replies, threads
    • Follow/Unfollow: Smart operations with filters
    • Engagement: Auto-like, auto-comment, retweet
    • Monitoring: Unfollower detection, growth tracking
    • AI Features: Content generation, sentiment analysis
    
    Get started:
    
    \b
        xeepy --help              Show this help
        xeepy scrape --help       Scraping commands
        xeepy ai reply "Hello"    Generate AI reply
    """
    ctx.ensure_object(dict)
    
    # Setup logging
    setup_logging(verbose and not quiet)
    
    # Load configuration
    ctx.obj["config"] = load_config(config)
    ctx.obj["verbose"] = verbose
    ctx.obj["quiet"] = quiet
    ctx.obj["console"] = console


# Register command groups
cli.add_command(scrape.scrape)
cli.add_command(follow.follow)
cli.add_command(unfollow.unfollow)
cli.add_command(engage.engage)
cli.add_command(monitor.monitor)
cli.add_command(ai.ai)


@cli.command()
@click.pass_context
def status(ctx: click.Context) -> None:
    """Show current status and configuration."""
    console = ctx.obj["console"]
    config = ctx.obj["config"]
    
    console.print("\n[bold blue]Xeepy Status[/bold blue]\n")
    
    # Config status
    table = Table(title="Configuration")
    table.add_column("Setting", style="cyan")
    table.add_column("Value", style="green")
    
    table.add_row("Config file", str(config.get("_path", "Not found")))
    table.add_row("AI Provider", config.get("ai", {}).get("provider", "Not configured"))
    table.add_row("Rate limit", f"{config.get('rate_limit', {}).get('requests_per_minute', 60)}/min")
    
    console.print(table)
    console.print()


@cli.command()
@click.option("--provider", "-p", default="openai", help="AI provider to use.")
@click.pass_context
def init(ctx: click.Context, provider: str) -> None:
    """Initialize Xeepy configuration."""
    import yaml
    
    console = ctx.obj["console"]
    
    console.print("\n[bold blue]Xeepy Initialization[/bold blue]\n")
    
    # Create default config
    config = {
        "ai": {
            "provider": provider,
            "model": "gpt-4-turbo-preview" if provider == "openai" else "claude-3-sonnet-20240229",
        },
        "rate_limit": {
            "requests_per_minute": 60,
            "delay_between_actions": 2.0,
        },
        "export": {
            "default_format": "json",
            "output_dir": "./output",
        },
    }
    
    config_path = Path("config.yaml")
    
    if config_path.exists():
        if not click.confirm("Config file exists. Overwrite?"):
            console.print("[yellow]Cancelled.[/yellow]")
            return
    
    with open(config_path, "w") as f:
        yaml.dump(config, f, default_flow_style=False)
    
    console.print(f"[green]✓[/green] Created {config_path}")
    console.print("\n[dim]Next steps:[/dim]")
    console.print("  1. Set your API keys as environment variables:")
    console.print("     export OPENAI_API_KEY=sk-...")
    console.print("  2. Run: xeepy status")


# Create a Typer app for FastAPI integration (alternative interface)
try:
    import typer
    app = typer.Typer(
        name="xeepy",
        help="Xeepy - X/Twitter Automation Toolkit",
        add_completion=False,
    )
    
    @app.command()
    def version():
        """Show version information."""
        console.print("Xeepy v0.1.0")
    
except ImportError:
    app = None


def main() -> None:
    """Main entry point for the CLI."""
    cli()


if __name__ == "__main__":
    main()
