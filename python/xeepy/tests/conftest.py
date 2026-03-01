"""Shared test fixtures for Xeepy test suite."""

from __future__ import annotations

import asyncio
import json
import os
from datetime import datetime, timezone
from pathlib import Path
from typing import TYPE_CHECKING, Any, AsyncGenerator, Generator
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

if TYPE_CHECKING:
    from xeepy.ai.providers.base import AIProvider
    from xeepy.models.tweet import Tweet
    from xeepy.models.user import User


# =============================================================================
# Event Loop Fixtures
# =============================================================================


@pytest.fixture(scope="session")
def event_loop() -> Generator[asyncio.AbstractEventLoop, None, None]:
    """Create an event loop for the test session."""
    loop = asyncio.new_event_loop()
    yield loop
    loop.close()


# =============================================================================
# Mock Data Fixtures
# =============================================================================


@pytest.fixture
def sample_tweet_data() -> dict[str, Any]:
    """Sample tweet data for testing."""
    return {
        "id": "1234567890123456789",
        "text": "This is a sample tweet for testing! #python #xeepy",
        "author_id": "9876543210",
        "author_username": "testuser",
        "author_name": "Test User",
        "created_at": datetime.now(timezone.utc).isoformat(),
        "like_count": 42,
        "retweet_count": 10,
        "reply_count": 5,
        "quote_count": 2,
        "bookmark_count": 3,
        "view_count": 1000,
        "language": "en",
        "source": "Twitter Web App",
        "conversation_id": "1234567890123456789",
        "hashtags": ["python", "xeepy"],
        "mentions": [],
        "urls": [],
        "media": [],
    }


@pytest.fixture
def sample_user_data() -> dict[str, Any]:
    """Sample user data for testing."""
    return {
        "id": "9876543210",
        "username": "testuser",
        "name": "Test User",
        "description": "A test user for Xeepy testing",
        "location": "San Francisco, CA",
        "url": "https://example.com",
        "created_at": "2020-01-15T12:00:00Z",
        "followers_count": 1500,
        "following_count": 500,
        "tweet_count": 2500,
        "listed_count": 25,
        "verified": False,
        "protected": False,
        "profile_image_url": "https://pbs.twimg.com/profile_images/test.jpg",
        "profile_banner_url": "https://pbs.twimg.com/profile_banners/test.jpg",
    }


@pytest.fixture
def sample_tweets(sample_tweet_data: dict[str, Any]) -> list[dict[str, Any]]:
    """Generate a list of sample tweets."""
    tweets = []
    for i in range(10):
        tweet = sample_tweet_data.copy()
        tweet["id"] = str(int(sample_tweet_data["id"]) + i)
        tweet["text"] = f"Sample tweet number {i + 1} #test"
        tweet["like_count"] = 10 + i * 5
        tweets.append(tweet)
    return tweets


@pytest.fixture
def sample_users(sample_user_data: dict[str, Any]) -> list[dict[str, Any]]:
    """Generate a list of sample users."""
    users = []
    for i in range(10):
        user = sample_user_data.copy()
        user["id"] = str(int(sample_user_data["id"]) + i)
        user["username"] = f"testuser{i + 1}"
        user["name"] = f"Test User {i + 1}"
        user["followers_count"] = 100 + i * 50
        users.append(user)
    return users


# =============================================================================
# Mock AI Provider Fixtures
# =============================================================================


@pytest.fixture
def mock_ai_provider() -> AsyncMock:
    """Create a mock AI provider."""
    from xeepy.ai.providers.base import AIResponse

    provider = AsyncMock()
    provider.generate = AsyncMock(
        return_value=AIResponse(
            content="This is a mock AI response for testing purposes.",
            model="mock-model-v1",
            usage={"prompt_tokens": 10, "completion_tokens": 20, "total_tokens": 30},
        )
    )
    provider.__aenter__ = AsyncMock(return_value=provider)
    provider.__aexit__ = AsyncMock(return_value=None)
    return provider


@pytest.fixture
def mock_openai_provider() -> AsyncMock:
    """Create a mock OpenAI provider."""
    from xeepy.ai.providers.base import AIResponse

    provider = AsyncMock()
    provider.model = "gpt-4-turbo-preview"
    provider.generate = AsyncMock(
        return_value=AIResponse(
            content="OpenAI mock response",
            model="gpt-4-turbo-preview",
            usage={"prompt_tokens": 15, "completion_tokens": 25, "total_tokens": 40},
        )
    )
    provider.__aenter__ = AsyncMock(return_value=provider)
    provider.__aexit__ = AsyncMock(return_value=None)
    return provider


@pytest.fixture
def mock_anthropic_provider() -> AsyncMock:
    """Create a mock Anthropic provider."""
    from xeepy.ai.providers.base import AIResponse

    provider = AsyncMock()
    provider.model = "claude-3-sonnet-20240229"
    provider.generate = AsyncMock(
        return_value=AIResponse(
            content="Anthropic mock response",
            model="claude-3-sonnet-20240229",
            usage={"input_tokens": 12, "output_tokens": 22},
        )
    )
    provider.__aenter__ = AsyncMock(return_value=provider)
    provider.__aexit__ = AsyncMock(return_value=None)
    return provider


# =============================================================================
# Mock Browser/Playwright Fixtures
# =============================================================================


@pytest.fixture
def mock_page() -> MagicMock:
    """Create a mock Playwright page."""
    page = MagicMock()
    page.goto = AsyncMock()
    page.wait_for_selector = AsyncMock()
    page.query_selector = AsyncMock()
    page.query_selector_all = AsyncMock(return_value=[])
    page.evaluate = AsyncMock()
    page.screenshot = AsyncMock()
    page.content = AsyncMock(return_value="<html></html>")
    page.url = "https://x.com"
    page.close = AsyncMock()
    return page


@pytest.fixture
def mock_browser() -> MagicMock:
    """Create a mock Playwright browser."""
    browser = MagicMock()
    browser.new_page = AsyncMock()
    browser.new_context = AsyncMock()
    browser.close = AsyncMock()
    browser.is_connected = MagicMock(return_value=True)
    return browser


@pytest.fixture
def mock_browser_manager(mock_browser: MagicMock, mock_page: MagicMock) -> MagicMock:
    """Create a mock browser manager."""
    manager = MagicMock()
    manager.browser = mock_browser
    manager.page = mock_page
    manager.get_page = AsyncMock(return_value=mock_page)
    manager.new_page = AsyncMock(return_value=mock_page)
    manager.close = AsyncMock()
    manager.__aenter__ = AsyncMock(return_value=manager)
    manager.__aexit__ = AsyncMock(return_value=None)
    return manager


# =============================================================================
# Mock HTTP Response Fixtures
# =============================================================================


@pytest.fixture
def mock_http_response() -> MagicMock:
    """Create a mock HTTP response."""
    response = MagicMock()
    response.status_code = 200
    response.json = MagicMock(return_value={"data": "test"})
    response.text = '{"data": "test"}'
    response.headers = {"content-type": "application/json"}
    return response


@pytest.fixture
def mock_graphql_response(sample_tweet_data: dict[str, Any]) -> dict[str, Any]:
    """Create a mock GraphQL API response."""
    return {
        "data": {
            "tweet": {
                "result": {
                    "__typename": "Tweet",
                    "rest_id": sample_tweet_data["id"],
                    "legacy": {
                        "full_text": sample_tweet_data["text"],
                        "favorite_count": sample_tweet_data["like_count"],
                        "retweet_count": sample_tweet_data["retweet_count"],
                    },
                }
            }
        }
    }


# =============================================================================
# Temporary File/Directory Fixtures
# =============================================================================


@pytest.fixture
def temp_config_file(tmp_path: Path) -> Path:
    """Create a temporary config file."""
    config = {
        "browser": {
            "headless": True,
            "timeout": 30000,
        },
        "rate_limiting": {
            "enabled": True,
            "requests_per_minute": 30,
        },
        "ai": {
            "provider": "openai",
            "model": "gpt-4",
        },
    }
    config_path = tmp_path / "config.yaml"
    import yaml

    config_path.write_text(yaml.dump(config))
    return config_path


@pytest.fixture
def temp_cookies_file(tmp_path: Path) -> Path:
    """Create a temporary cookies file."""
    cookies = [
        {"name": "ct0", "value": "test_csrf_token", "domain": ".x.com"},
        {"name": "auth_token", "value": "test_auth_token", "domain": ".x.com"},
    ]
    cookies_path = tmp_path / "cookies.json"
    cookies_path.write_text(json.dumps(cookies))
    return cookies_path


@pytest.fixture
def temp_export_dir(tmp_path: Path) -> Path:
    """Create a temporary export directory."""
    export_dir = tmp_path / "exports"
    export_dir.mkdir()
    return export_dir


# =============================================================================
# Database Fixtures
# =============================================================================


@pytest.fixture
async def temp_database(tmp_path: Path) -> AsyncGenerator[Path, None]:
    """Create a temporary SQLite database."""
    db_path = tmp_path / "test.db"
    yield db_path
    if db_path.exists():
        db_path.unlink()


# =============================================================================
# Environment Variable Fixtures
# =============================================================================


@pytest.fixture
def mock_env_vars() -> Generator[None, None, None]:
    """Set up mock environment variables."""
    original_env = os.environ.copy()
    os.environ.update(
        {
            "XEEPY_OPENAI_API_KEY": "test-openai-key",
            "XEEPY_ANTHROPIC_API_KEY": "test-anthropic-key",
            "XEEPY_DISCORD_WEBHOOK": "https://discord.com/api/webhooks/test",
            "XEEPY_TELEGRAM_BOT_TOKEN": "test-telegram-token",
            "XEEPY_TELEGRAM_CHAT_ID": "123456789",
        }
    )
    yield
    os.environ.clear()
    os.environ.update(original_env)


# =============================================================================
# CLI Testing Fixtures
# =============================================================================


@pytest.fixture
def cli_runner():
    """Create a Click CLI test runner."""
    from click.testing import CliRunner

    return CliRunner()


@pytest.fixture
def cli_runner_isolated(cli_runner):
    """Create an isolated CLI runner with temp directory."""
    with cli_runner.isolated_filesystem():
        yield cli_runner


# =============================================================================
# API Testing Fixtures
# =============================================================================


@pytest.fixture
def api_test_client():
    """Create a FastAPI test client."""
    from fastapi.testclient import TestClient

    from xeepy.api.server import app

    return TestClient(app)


@pytest.fixture
async def async_api_client():
    """Create an async FastAPI test client."""
    from httpx import ASGITransport, AsyncClient

    from xeepy.api.server import app

    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as client:
        yield client


# =============================================================================
# Rate Limiter Fixtures
# =============================================================================


@pytest.fixture
def mock_rate_limiter() -> MagicMock:
    """Create a mock rate limiter."""
    limiter = MagicMock()
    limiter.acquire = AsyncMock(return_value=True)
    limiter.wait = AsyncMock()
    limiter.is_limited = MagicMock(return_value=False)
    limiter.reset = MagicMock()
    return limiter


# =============================================================================
# Notification Fixtures
# =============================================================================


@pytest.fixture
def mock_webhook_response() -> MagicMock:
    """Create a mock webhook response."""
    response = MagicMock()
    response.status_code = 204  # Discord returns 204 on success
    response.ok = True
    return response


# =============================================================================
# Sentiment Analysis Fixtures
# =============================================================================


@pytest.fixture
def positive_texts() -> list[str]:
    """Sample positive texts for sentiment testing."""
    return [
        "I absolutely love this product! Amazing quality!",
        "Best purchase I've ever made. Highly recommended!",
        "This is fantastic! Exceeded all my expectations!",
        "So happy with this! Great job team!",
        "Incredible experience. Will definitely use again!",
    ]


@pytest.fixture
def negative_texts() -> list[str]:
    """Sample negative texts for sentiment testing."""
    return [
        "This is terrible. Worst experience ever.",
        "Completely disappointed. Total waste of money.",
        "Awful product. Do not buy this garbage.",
        "Horrible customer service. Never again.",
        "This is a scam. Stay away!",
    ]


@pytest.fixture
def neutral_texts() -> list[str]:
    """Sample neutral texts for sentiment testing."""
    return [
        "The meeting is scheduled for 3pm.",
        "Please find the attached document.",
        "The office is located on Main Street.",
        "We received your message.",
        "The update has been installed.",
    ]


# =============================================================================
# Crypto Analysis Fixtures
# =============================================================================


@pytest.fixture
def crypto_tweets() -> list[str]:
    """Sample crypto-related tweets for testing."""
    return [
        "$BTC is looking bullish! 🚀 Moon soon!",
        "Just bought more $ETH. HODL gang! 💎🙌",
        "Warning: This looks like a rugpull. DYOR!",
        "New airdrop alert! Don't miss this gem!",
        "Technical analysis shows support at $40k",
    ]


@pytest.fixture
def spam_tweets() -> list[str]:
    """Sample spam tweets for testing."""
    return [
        "🚨 FREE CRYPTO GIVEAWAY 🚨 Send 1 ETH get 2 back!",
        "Click here to claim your FREE Bitcoin! bit.ly/scam",
        "I made $10,000 in one day! DM me to learn how!",
        "Follow @bot1 @bot2 @bot3 for FREE iPhone!",
        "URGENT: Your account will be suspended! Click now!",
    ]


# =============================================================================
# Cleanup Fixtures
# =============================================================================


@pytest.fixture(autouse=True)
async def cleanup_async_resources():
    """Clean up async resources after each test."""
    yield
    # Force garbage collection of any lingering coroutines
    await asyncio.sleep(0)
