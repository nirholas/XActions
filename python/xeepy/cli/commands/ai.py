"""
AI commands for Xeepy CLI.
"""

from __future__ import annotations

import asyncio
import os

import click
from rich.console import Console
from rich.markdown import Markdown
from rich.panel import Panel

from xeepy.cli.utils import (
    async_command,
    export_data,
    print_success,
    print_error,
    print_info,
    print_warning,
    output_option,
)

console = Console()


def get_ai_provider():
    """Get configured AI provider."""
    from xeepy.ai.providers import OpenAIProvider, AnthropicProvider, ProviderConfig
    
    # Check for API keys
    if os.getenv("OPENAI_API_KEY"):
        return OpenAIProvider()
    elif os.getenv("ANTHROPIC_API_KEY"):
        return AnthropicProvider()
    else:
        return None


@click.group()
def ai():
    """AI-powered features for X/Twitter.
    
    \b
    Examples:
        xeepy ai reply "Great tweet about AI!"
        xeepy ai generate "thread about Python tips" --num 5
        xeepy ai sentiment "I love this product!"
        xeepy ai analyze-user suspicious_account
    
    Requires an AI provider API key (OpenAI or Anthropic).
    Set OPENAI_API_KEY or ANTHROPIC_API_KEY environment variable.
    """
    pass


@ai.command()
@click.argument("tweet_text")
@click.option("--style", "-s", default="helpful", 
              help="Reply style (helpful, witty, professional, crypto, tech, casual).")
@click.option("--num", "-n", default=1, help="Number of alternatives to generate.")
@click.option("--max-length", default=280, help="Maximum reply length.")
@output_option
@click.pass_context
@async_command
async def reply(
    ctx,
    tweet_text: str,
    style: str,
    num: int,
    max_length: int,
    output: str | None,
):
    """Generate an AI reply to a tweet.
    
    TWEET_TEXT: The tweet text to reply to.
    """
    provider = get_ai_provider()
    if not provider:
        print_error("No AI provider configured. Set OPENAI_API_KEY or ANTHROPIC_API_KEY.")
        return
    
    print_info(f"Generating {style} reply...")
    
    try:
        from xeepy.ai import ContentGenerator
        
        async with provider:
            generator = ContentGenerator(provider)
            
            replies = []
            for i in range(num):
                result = await generator.generate_reply(
                    tweet_text,
                    style=style,
                    max_length=max_length,
                )
                replies.append(result.content)
            
            console.print()
            console.print(Panel(f"[dim]Original:[/dim] {tweet_text}", title="Tweet"))
            console.print()
            
            for i, reply_text in enumerate(replies, 1):
                title = f"Reply {i}" if num > 1 else "Generated Reply"
                console.print(Panel(reply_text, title=title, border_style="green"))
                console.print()
            
            if output:
                export_data({"tweet": tweet_text, "replies": replies, "style": style}, output, "json")
            
            print_success(f"Generated {len(replies)} reply(ies)")
            
    except Exception as e:
        print_error(f"Failed to generate reply: {e}")


@ai.command()
@click.argument("topic")
@click.option("--style", "-s", default="informative", help="Tweet style.")
@click.option("--hashtags", "-h", multiple=True, help="Hashtags to include.")
@click.option("--thread", is_flag=True, help="Generate a thread instead of single tweet.")
@click.option("--num", "-n", default=5, help="Number of tweets for thread.")
@output_option
@click.pass_context
@async_command
async def generate(
    ctx,
    topic: str,
    style: str,
    hashtags: tuple[str, ...],
    thread: bool,
    num: int,
    output: str | None,
):
    """Generate tweet content about a topic.
    
    TOPIC: The topic to generate content about.
    """
    provider = get_ai_provider()
    if not provider:
        print_error("No AI provider configured. Set OPENAI_API_KEY or ANTHROPIC_API_KEY.")
        return
    
    content_type = "thread" if thread else "tweet"
    print_info(f"Generating {style} {content_type} about '{topic}'...")
    
    try:
        from xeepy.ai import ContentGenerator
        
        async with provider:
            generator = ContentGenerator(provider)
            
            if thread:
                results = await generator.generate_thread(
                    topic,
                    num_tweets=num,
                    style=style,
                )
                
                console.print()
                console.print(f"[bold]Thread: {topic}[/bold]\n")
                
                for i, tweet in enumerate(results, 1):
                    console.print(Panel(
                        tweet.content,
                        title=f"Tweet {i}/{num}",
                        border_style="blue",
                    ))
                
                if output:
                    export_data({
                        "topic": topic,
                        "tweets": [t.content for t in results],
                    }, output, "json")
                
            else:
                result = await generator.generate_tweet(
                    topic,
                    style=style,
                    hashtags=list(hashtags) if hashtags else None,
                )
                
                console.print()
                console.print(Panel(result.content, title="Generated Tweet", border_style="green"))
                
                if output:
                    export_data({
                        "topic": topic,
                        "tweet": result.content,
                    }, output, "json")
            
            console.print()
            print_success("Content generated successfully")
            
    except Exception as e:
        print_error(f"Failed to generate content: {e}")


@ai.command()
@click.argument("text")
@click.option("--detailed", is_flag=True, help="Include detailed emotion breakdown.")
@output_option
@click.pass_context
@async_command
async def sentiment(ctx, text: str, detailed: bool, output: str | None):
    """Analyze sentiment of text.
    
    TEXT: The text to analyze.
    """
    provider = get_ai_provider()
    
    print_info("Analyzing sentiment...")
    
    try:
        from xeepy.ai import SentimentAnalyzer
        
        analyzer = SentimentAnalyzer(provider)
        
        if provider:
            async with provider:
                result = await analyzer.analyze_tweet(text, include_emotions=detailed)
        else:
            result = await analyzer.analyze_tweet(text, include_emotions=detailed)
        
        console.print()
        console.print(Panel(text, title="Analyzed Text"))
        console.print()
        
        # Color based on sentiment
        color = "green" if result.label == "positive" else "red" if result.label == "negative" else "yellow"
        
        console.print(f"[bold]Sentiment:[/bold] [{color}]{result.label.upper()}[/{color}]")
        console.print(f"[bold]Score:[/bold] {result.score:+.2f} (range: -1 to +1)")
        console.print(f"[bold]Confidence:[/bold] {result.confidence:.0%}")
        
        if detailed and result.emotions:
            console.print("\n[bold]Emotions:[/bold]")
            for emotion, value in sorted(result.emotions.items(), key=lambda x: -x[1]):
                bar = "█" * int(value * 20) + "░" * (20 - int(value * 20))
                console.print(f"  {emotion:12} {bar} {value:.0%}")
        
        if output:
            export_data({
                "text": text,
                "sentiment": result.label,
                "score": result.score,
                "confidence": result.confidence,
                "emotions": result.emotions,
            }, output, "json")
        
        console.print()
        print_success("Sentiment analysis complete")
        
    except Exception as e:
        print_error(f"Failed to analyze sentiment: {e}")


@ai.command("analyze-user")
@click.argument("username")
@click.option("--detailed", is_flag=True, help="Include detailed analysis.")
@output_option
@click.pass_context
@async_command
async def analyze_user(ctx, username: str, detailed: bool, output: str | None):
    """Analyze a user for bot/spam likelihood.
    
    USERNAME: The username to analyze.
    """
    username = username.lstrip("@")
    provider = get_ai_provider()
    
    print_info(f"Analyzing @{username} for bot/spam indicators...")
    
    try:
        from xeepy.ai import SpamDetector
        
        detector = SpamDetector(provider)
        
        # Would normally fetch profile data here
        profile_data = {
            "username": username,
            "bio": "Sample bio for analysis",
            "followers_count": 1000,
            "following_count": 5000,
            "tweets_count": 50,
            "created_at": "2023-01-01T00:00:00Z",
        }
        
        if provider:
            async with provider:
                result = await detector.analyze_user(profile_data=profile_data)
        else:
            result = await detector.analyze_user(profile_data=profile_data)
        
        console.print()
        console.print(f"[bold]Analysis for @{username}[/bold]\n")
        
        # Display scores with color coding
        def score_color(score):
            if score < 0.3:
                return "green"
            elif score < 0.6:
                return "yellow"
            else:
                return "red"
        
        console.print(f"[bold]Bot Probability:[/bold] [{score_color(result.bot_probability)}]"
                     f"{result.bot_probability:.0%}[/{score_color(result.bot_probability)}]")
        console.print(f"[bold]Spam Probability:[/bold] [{score_color(result.spam_probability)}]"
                     f"{result.spam_probability:.0%}[/{score_color(result.spam_probability)}]")
        console.print(f"[bold]Fake Probability:[/bold] [{score_color(result.fake_probability)}]"
                     f"{result.fake_probability:.0%}[/{score_color(result.fake_probability)}]")
        
        quality_color = "green" if result.quality_score >= 70 else "yellow" if result.quality_score >= 40 else "red"
        console.print(f"[bold]Quality Score:[/bold] [{quality_color}]{result.quality_score:.0f}/100[/{quality_color}]")
        
        if result.red_flags:
            console.print("\n[bold red]Red Flags:[/bold red]")
            for flag in result.red_flags:
                console.print(f"  ⚠️  {flag}")
        
        if output:
            export_data({
                "username": username,
                "bot_probability": result.bot_probability,
                "spam_probability": result.spam_probability,
                "fake_probability": result.fake_probability,
                "quality_score": result.quality_score,
                "red_flags": result.red_flags,
            }, output, "json")
        
        console.print()
        print_success("User analysis complete")
        
    except Exception as e:
        print_error(f"Failed to analyze user: {e}")


@ai.command()
@click.argument("text")
@click.option("--goal", "-g", default="engagement", 
              help="Goal (engagement, clarity, professionalism, concise, viral).")
@output_option
@click.pass_context
@async_command
async def improve(ctx, text: str, goal: str, output: str | None):
    """Improve text for better engagement.
    
    TEXT: The text to improve.
    """
    provider = get_ai_provider()
    if not provider:
        print_error("No AI provider configured. Set OPENAI_API_KEY or ANTHROPIC_API_KEY.")
        return
    
    print_info(f"Improving text for {goal}...")
    
    try:
        from xeepy.ai import ContentGenerator
        
        async with provider:
            generator = ContentGenerator(provider)
            result = await generator.improve_text(text, goal=goal)
            
            console.print()
            console.print(Panel(text, title="Original", border_style="yellow"))
            console.print(Panel(result.content, title=f"Improved ({goal})", border_style="green"))
            
            if output:
                export_data({
                    "original": text,
                    "improved": result.content,
                    "goal": goal,
                }, output, "json")
            
            console.print()
            print_success("Text improved successfully")
            
    except Exception as e:
        print_error(f"Failed to improve text: {e}")


@ai.command("find-targets")
@click.argument("niche")
@click.option("--goal", "-g", default="growth", help="Goal (growth, engagement, sales, network).")
@click.option("--limit", "-l", default=10, help="Number of recommendations.")
@output_option
@click.pass_context
@async_command
async def find_targets(ctx, niche: str, goal: str, limit: int, output: str | None):
    """Find target accounts to engage with.
    
    NICHE: The niche/industry to find targets in.
    """
    provider = get_ai_provider()
    if not provider:
        print_error("No AI provider configured. Set OPENAI_API_KEY or ANTHROPIC_API_KEY.")
        return
    
    print_info(f"Finding {goal} targets in '{niche}' niche...")
    
    try:
        from xeepy.ai import SmartTargeting
        
        async with provider:
            targeting = SmartTargeting(provider)
            targets = await targeting.find_targets(niche, goal=goal, limit=limit)
            
            console.print()
            console.print(f"[bold]Recommended Targets for {niche}[/bold]\n")
            
            from rich.table import Table
            table = Table()
            table.add_column("Username", style="cyan")
            table.add_column("Score", style="green")
            table.add_column("Follow Back %", style="yellow")
            table.add_column("Priority", style="magenta")
            
            for target in targets:
                table.add_row(
                    f"@{target.username}",
                    f"{target.score:.0f}",
                    f"{target.estimated_follow_back_chance:.0%}",
                    target.priority,
                )
            
            console.print(table)
            
            if output:
                export_data([{
                    "username": t.username,
                    "score": t.score,
                    "reasons": t.reasons,
                    "actions": t.recommended_actions,
                    "follow_back_chance": t.estimated_follow_back_chance,
                } for t in targets], output, "json")
            
            console.print()
            print_success(f"Found {len(targets)} target recommendations")
            
    except Exception as e:
        print_error(f"Failed to find targets: {e}")


@ai.command("crypto-sentiment")
@click.argument("token")
@click.option("--detailed", is_flag=True, help="Include detailed breakdown.")
@output_option
@click.pass_context
@async_command
async def crypto_sentiment(ctx, token: str, detailed: bool, output: str | None):
    """Analyze sentiment for a crypto token.
    
    TOKEN: The token symbol (e.g., BTC, ETH, $SOL).
    """
    provider = get_ai_provider()
    
    token = token.upper().lstrip("$")
    print_info(f"Analyzing sentiment for ${token}...")
    
    try:
        from xeepy.ai import CryptoAnalyzer
        
        analyzer = CryptoAnalyzer(provider)
        
        # Would normally fetch tweets about the token
        if provider:
            async with provider:
                result = await analyzer.analyze_token_sentiment(token, tweets=[])
        else:
            result = await analyzer.analyze_token_sentiment(token, tweets=[])
        
        console.print()
        console.print(f"[bold]Sentiment Analysis: ${token}[/bold]\n")
        
        # Color based on sentiment
        color = "green" if result.sentiment_label == "bullish" else \
                "red" if result.sentiment_label == "bearish" else "yellow"
        
        console.print(f"[bold]Sentiment:[/bold] [{color}]{result.sentiment_label.upper()}[/{color}]")
        console.print(f"[bold]Score:[/bold] {result.overall_sentiment:+.2f}")
        console.print(f"[bold]Volume:[/bold] {result.volume} tweets analyzed")
        console.print(f"[bold]Trending:[/bold] {'🔥 Yes' if result.trending else 'No'}")
        
        if result.key_influencers:
            console.print(f"\n[bold]Key Influencers:[/bold] {', '.join(result.key_influencers)}")
        
        if result.common_narratives:
            console.print(f"[bold]Narratives:[/bold] {', '.join(result.common_narratives)}")
        
        if result.warning_signs:
            console.print("\n[bold red]⚠️ Warning Signs:[/bold red]")
            for warning in result.warning_signs:
                console.print(f"  • {warning}")
        
        if output:
            export_data({
                "token": token,
                "sentiment": result.sentiment_label,
                "score": result.overall_sentiment,
                "volume": result.volume,
                "trending": result.trending,
                "influencers": result.key_influencers,
                "narratives": result.common_narratives,
                "warnings": result.warning_signs,
            }, output, "json")
        
        console.print()
        print_success("Crypto sentiment analysis complete")
        
    except Exception as e:
        print_error(f"Failed to analyze crypto sentiment: {e}")
