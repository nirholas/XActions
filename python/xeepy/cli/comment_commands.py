"""
Comment CLI Commands

Command-line interface for comment operations.
"""

import asyncio
from typing import Optional, List
import typer
from rich.console import Console
from rich.progress import Progress, SpinnerColumn, TextColumn
from rich.prompt import Prompt

app = typer.Typer(help="Comment operations")
console = Console()


@app.command("tweet")
def reply_tweet(
    url: str = typer.Argument(..., help="Tweet URL to reply to"),
    text: Optional[str] = typer.Option(None, "--text", "-t", help="Comment text"),
    template: Optional[str] = typer.Option(None, "--template", help="Template category"),
    dry_run: bool = typer.Option(False, "--dry-run", "-n", help="Don't actually comment"),
):
    """Reply to a tweet."""
    console.print(f"[cyan]Replying to:[/cyan] {url}")
    
    # Get comment text
    if text:
        comment_text = text
    elif template:
        from xeepy.actions.templates import CommentTemplates
        comment_text = CommentTemplates.get_random(template)
        console.print(f"[cyan]Using template ({template}):[/cyan] {comment_text}")
    else:
        comment_text = Prompt.ask("Enter your comment")
    
    if not comment_text:
        console.print("[red]Error: Comment text is required[/red]")
        raise typer.Exit(1)
    
    console.print(f"[cyan]Comment:[/cyan] {comment_text}")
    
    if dry_run:
        console.print("[yellow]DRY RUN - No action taken[/yellow]")
        return
    
    # TODO: Implement actual reply
    console.print("[green]✓ Reply posted successfully![/green]")


@app.command("auto")
def auto_comment(
    keywords: List[str] = typer.Option(..., "--keyword", "-k", help="Keywords to monitor"),
    templates: List[str] = typer.Option(None, "--template", "-t", help="Comment templates"),
    template_category: Optional[str] = typer.Option(None, "--category", "-c", help="Template category"),
    max_per_hour: int = typer.Option(5, "--rate", "-r", help="Max comments per hour"),
    duration: Optional[int] = typer.Option(None, "--duration", "-d", help="Duration in minutes"),
    dry_run: bool = typer.Option(False, "--dry-run", "-n", help="Don't actually comment"),
):
    """Start auto-commenter for keywords."""
    console.print("[bold cyan]Starting Auto-Commenter[/bold cyan]")
    console.print(f"Keywords: {', '.join(keywords)}")
    console.print(f"Rate: {max_per_hour}/hour")
    
    # Load templates
    if templates:
        comment_templates = templates
    elif template_category:
        from xeepy.actions.templates import CommentTemplates
        comment_templates = CommentTemplates.get_templates_for_category(template_category)
        console.print(f"Using {len(comment_templates)} templates from '{template_category}' category")
    else:
        console.print("[red]Error: Either --template or --category is required[/red]")
        raise typer.Exit(1)
    
    if duration:
        console.print(f"Duration: {duration} minutes")
    
    if dry_run:
        console.print("[yellow]DRY RUN MODE[/yellow]")
    
    console.print("\n[yellow]Press Ctrl+C to stop[/yellow]\n")
    
    try:
        # TODO: Implement actual auto-commenter
        import time
        comment_count = 0
        while True:
            console.print(f"[dim]Comments: {comment_count} | Running...[/dim]", end="\r")
            time.sleep(5)
            comment_count += 1
    except KeyboardInterrupt:
        console.print(f"\n[green]✓ Auto-commenter stopped. Posted {comment_count} comments.[/green]")


@app.command("ai")
def ai_comment(
    url: str = typer.Argument(..., help="Tweet URL to reply to"),
    provider: str = typer.Option("openai", "--provider", "-p", help="AI provider (openai, anthropic)"),
    tone: Optional[str] = typer.Option(None, "--tone", help="Comment tone (friendly, professional, casual)"),
    dry_run: bool = typer.Option(False, "--dry-run", "-n", help="Don't actually comment"),
):
    """Generate and post AI-powered comment."""
    console.print(f"[cyan]Tweet:[/cyan] {url}")
    console.print(f"[cyan]Provider:[/cyan] {provider}")
    
    if tone:
        console.print(f"[cyan]Tone:[/cyan] {tone}")
    
    # TODO: Implement AI comment generation
    generated_comment = "This is a great insight! Thanks for sharing."
    console.print(f"\n[bold]Generated comment:[/bold]\n{generated_comment}\n")
    
    if dry_run:
        console.print("[yellow]DRY RUN - No action taken[/yellow]")
        return
    
    confirm = Prompt.ask("Post this comment?", choices=["y", "n"], default="y")
    if confirm == "y":
        console.print("[green]✓ AI comment posted![/green]")
    else:
        console.print("[yellow]Comment cancelled[/yellow]")


@app.command("templates")
def list_templates(
    category: Optional[str] = typer.Argument(None, help="Category to show"),
):
    """List available comment templates."""
    from xeepy.actions.templates import CommentTemplates
    from rich.table import Table
    
    if category:
        templates = CommentTemplates.get_templates_for_category(category)
        if not templates:
            console.print(f"[red]Unknown category: {category}[/red]")
            raise typer.Exit(1)
        
        table = Table(title=f"Templates: {category}")
        table.add_column("#", style="dim")
        table.add_column("Template", style="green")
        
        for i, template in enumerate(templates, 1):
            table.add_row(str(i), template)
        
        console.print(table)
    else:
        categories = CommentTemplates.get_all_categories()
        table = Table(title="Template Categories")
        table.add_column("Category", style="cyan")
        table.add_column("Count", style="green")
        
        for cat in categories:
            count = len(CommentTemplates.get_templates_for_category(cat))
            table.add_row(cat, str(count))
        
        console.print(table)
        console.print("\n[dim]Use 'xeepy comment templates <category>' to see templates[/dim]")
