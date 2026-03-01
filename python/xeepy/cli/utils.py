"""
CLI utilities for Xeepy.

Common utilities used across CLI commands.
"""

from __future__ import annotations

import asyncio
import json
from datetime import datetime
from functools import wraps
from pathlib import Path
from typing import Any, Callable, TypeVar

import click
from rich.console import Console
from rich.progress import Progress, SpinnerColumn, TextColumn, BarColumn, TaskProgressColumn
from rich.table import Table
from rich import print as rprint

console = Console()

F = TypeVar("F", bound=Callable[..., Any])


def async_command(f: F) -> F:
    """Decorator to run async click commands."""
    @wraps(f)
    def wrapper(*args: Any, **kwargs: Any) -> Any:
        return asyncio.run(f(*args, **kwargs))
    return wrapper  # type: ignore


def get_progress() -> Progress:
    """Create a rich progress bar."""
    return Progress(
        SpinnerColumn(),
        TextColumn("[progress.description]{task.description}"),
        BarColumn(),
        TaskProgressColumn(),
        console=console,
    )


def create_table(title: str, columns: list[tuple[str, str]]) -> Table:
    """Create a formatted table.
    
    Args:
        title: Table title.
        columns: List of (name, style) tuples for columns.
        
    Returns:
        Rich Table object.
    """
    table = Table(title=title)
    for name, style in columns:
        table.add_column(name, style=style)
    return table


def format_number(n: int | float) -> str:
    """Format a number for display.
    
    Args:
        n: Number to format.
        
    Returns:
        Formatted string (e.g., "1.2K", "3.4M").
    """
    if n >= 1_000_000:
        return f"{n / 1_000_000:.1f}M"
    elif n >= 1_000:
        return f"{n / 1_000:.1f}K"
    else:
        return str(int(n))


def format_date(dt: datetime | str | None) -> str:
    """Format a datetime for display.
    
    Args:
        dt: Datetime to format.
        
    Returns:
        Formatted string.
    """
    if dt is None:
        return "N/A"
    
    if isinstance(dt, str):
        try:
            dt = datetime.fromisoformat(dt.replace("Z", "+00:00"))
        except ValueError:
            return dt
    
    return dt.strftime("%Y-%m-%d %H:%M")


def export_data(
    data: list[dict[str, Any]] | dict[str, Any],
    output: str | None,
    format: str = "json",
) -> None:
    """Export data to file.
    
    Args:
        data: Data to export.
        output: Output file path.
        format: Output format ('json', 'csv', 'txt').
    """
    if output is None:
        # Print to console
        if format == "json":
            rprint(json.dumps(data, indent=2, default=str))
        else:
            rprint(data)
        return
    
    path = Path(output)
    path.parent.mkdir(parents=True, exist_ok=True)
    
    if format == "json":
        with open(path, "w") as f:
            json.dump(data, f, indent=2, default=str)
    elif format == "csv":
        import csv
        
        if isinstance(data, list) and data:
            with open(path, "w", newline="") as f:
                writer = csv.DictWriter(f, fieldnames=data[0].keys())
                writer.writeheader()
                writer.writerows(data)
        else:
            console.print("[yellow]Cannot export to CSV: data is not a list[/yellow]")
            return
    else:
        with open(path, "w") as f:
            f.write(str(data))
    
    console.print(f"[green]✓[/green] Exported to {path}")


def print_error(message: str) -> None:
    """Print an error message."""
    console.print(f"[red]✗[/red] {message}")


def print_success(message: str) -> None:
    """Print a success message."""
    console.print(f"[green]✓[/green] {message}")


def print_warning(message: str) -> None:
    """Print a warning message."""
    console.print(f"[yellow]![/yellow] {message}")


def print_info(message: str) -> None:
    """Print an info message."""
    console.print(f"[blue]ℹ[/blue] {message}")


def confirm_action(message: str, default: bool = False) -> bool:
    """Prompt for confirmation.
    
    Args:
        message: Confirmation message.
        default: Default value if user presses Enter.
        
    Returns:
        True if confirmed, False otherwise.
    """
    return click.confirm(message, default=default)


def validate_output_format(
    ctx: click.Context,
    param: click.Parameter,
    value: str,
) -> str:
    """Validate output format option."""
    valid_formats = ["json", "csv", "txt"]
    if value.lower() not in valid_formats:
        raise click.BadParameter(
            f"Format must be one of: {', '.join(valid_formats)}"
        )
    return value.lower()


def validate_positive_int(
    ctx: click.Context,
    param: click.Parameter,
    value: int | None,
) -> int | None:
    """Validate that a value is a positive integer."""
    if value is not None and value <= 0:
        raise click.BadParameter("Value must be positive")
    return value


class OutputFormat:
    """Output format options for commands."""
    JSON = "json"
    CSV = "csv"
    TXT = "txt"
    TABLE = "table"


# Common option decorators
output_option = click.option(
    "--output", "-o",
    help="Output file path.",
    type=click.Path(),
)

format_option = click.option(
    "--format", "-f",
    default="json",
    help="Output format (json, csv, txt).",
    callback=validate_output_format,
)

limit_option = click.option(
    "--limit", "-l",
    default=100,
    help="Maximum number of results.",
    callback=validate_positive_int,
)

dry_run_option = click.option(
    "--dry-run",
    is_flag=True,
    help="Preview without making changes.",
)
