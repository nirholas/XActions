"""
Tests for Retweet Actions

Unit tests for retweet engagement actions.
"""

import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from xeepy.actions.types import RetweetResult, AutoRetweetConfig


class TestRetweetTweet:
    """Tests for RetweetTweet action."""
    
    @pytest.fixture
    def mock_browser(self):
        """Create mock browser manager."""
        browser = MagicMock()
        browser.page = AsyncMock()
        browser.page.goto = AsyncMock()
        browser.page.wait_for_selector = AsyncMock()
        browser.page.click = AsyncMock()
        browser.page.query_selector = AsyncMock(return_value=MagicMock())
        return browser
    
    @pytest.fixture
    def mock_rate_limiter(self):
        """Create mock rate limiter."""
        limiter = MagicMock()
        limiter.acquire = AsyncMock(return_value=True)
        return limiter
    
    @pytest.mark.asyncio
    async def test_retweet_success(self, mock_browser, mock_rate_limiter):
        """Test successful retweet."""
        from xeepy.actions.engagement.retweet import RetweetTweet
        
        mock_button = MagicMock()
        mock_button.get_attribute = AsyncMock(return_value="Repost")
        mock_browser.page.query_selector = AsyncMock(return_value=mock_button)
        
        action = RetweetTweet(mock_browser, mock_rate_limiter)
        result = await action.execute("https://x.com/user/status/12345")
        
        assert result is not None
        assert isinstance(result, RetweetResult)
    
    @pytest.mark.asyncio
    async def test_retweet_dry_run(self, mock_browser, mock_rate_limiter):
        """Test dry run mode."""
        from xeepy.actions.engagement.retweet import RetweetTweet
        
        action = RetweetTweet(mock_browser, mock_rate_limiter, dry_run=True)
        result = await action.execute("https://x.com/user/status/12345")
        
        assert result.success is True
        mock_browser.page.click.assert_not_called()
    
    @pytest.mark.asyncio
    async def test_retweet_skip_already_retweeted(self, mock_browser, mock_rate_limiter):
        """Test skipping already retweeted."""
        from xeepy.actions.engagement.retweet import RetweetTweet
        
        mock_button = MagicMock()
        mock_button.get_attribute = AsyncMock(return_value="Retweeted")
        mock_browser.page.query_selector = AsyncMock(return_value=mock_button)
        
        action = RetweetTweet(mock_browser, mock_rate_limiter, skip_if_retweeted=True)
        result = await action.execute("https://x.com/user/status/12345")
        
        assert result.was_already_retweeted is True


class TestQuoteTweet:
    """Tests for QuoteTweet action."""
    
    @pytest.fixture
    def mock_browser(self):
        """Create mock browser manager."""
        browser = MagicMock()
        browser.page = AsyncMock()
        browser.page.goto = AsyncMock()
        browser.page.wait_for_selector = AsyncMock()
        browser.page.click = AsyncMock()
        browser.page.fill = AsyncMock()
        browser.page.query_selector = AsyncMock(return_value=MagicMock())
        return browser
    
    @pytest.fixture
    def mock_rate_limiter(self):
        """Create mock rate limiter."""
        limiter = MagicMock()
        limiter.acquire = AsyncMock(return_value=True)
        return limiter
    
    @pytest.mark.asyncio
    async def test_quote_tweet_success(self, mock_browser, mock_rate_limiter):
        """Test successful quote tweet."""
        from xeepy.actions.engagement.retweet import QuoteTweet
        
        action = QuoteTweet(mock_browser, mock_rate_limiter)
        result = await action.execute(
            "https://x.com/user/status/12345",
            "This is great insight!"
        )
        
        assert result is not None
        assert isinstance(result, RetweetResult)
    
    @pytest.mark.asyncio
    async def test_quote_tweet_dry_run(self, mock_browser, mock_rate_limiter):
        """Test quote tweet dry run."""
        from xeepy.actions.engagement.retweet import QuoteTweet
        
        action = QuoteTweet(mock_browser, mock_rate_limiter, dry_run=True)
        result = await action.execute(
            "https://x.com/user/status/12345",
            "Nice!"
        )
        
        assert result.success is True
    
    @pytest.mark.asyncio
    async def test_quote_tweet_empty_text(self, mock_browser, mock_rate_limiter):
        """Test quote tweet with empty text."""
        from xeepy.actions.engagement.retweet import QuoteTweet
        
        action = QuoteTweet(mock_browser, mock_rate_limiter)
        result = await action.execute(
            "https://x.com/user/status/12345",
            ""
        )
        
        # Empty quote text should fail
        assert result.success is False


class TestAutoRetweet:
    """Tests for AutoRetweet action."""
    
    @pytest.fixture
    def mock_browser(self):
        """Create mock browser manager."""
        browser = MagicMock()
        browser.page = AsyncMock()
        return browser
    
    @pytest.fixture
    def mock_rate_limiter(self):
        """Create mock rate limiter."""
        limiter = MagicMock()
        limiter.acquire = AsyncMock(return_value=True)
        return limiter
    
    def test_auto_retweet_config_defaults(self):
        """Test AutoRetweetConfig default values."""
        config = AutoRetweetConfig(keywords=["test"])
        
        assert config.max_retweets_per_hour == 20
        assert config.min_delay == 45.0
        assert config.max_delay == 150.0
        assert config.prefer_quote_tweets is False
    
    def test_auto_retweet_config_custom(self):
        """Test AutoRetweetConfig custom values."""
        config = AutoRetweetConfig(
            keywords=["AI", "ML"],
            max_retweets_per_hour=15,
            min_delay=60.0,
            max_delay=180.0,
            prefer_quote_tweets=True,
            quote_templates=["Great insight on {topic}!"]
        )
        
        assert len(config.keywords) == 2
        assert config.prefer_quote_tweets is True
        assert len(config.quote_templates) == 1
    
    @pytest.mark.asyncio
    async def test_auto_retweet_initialization(self, mock_browser, mock_rate_limiter):
        """Test AutoRetweet initialization."""
        from xeepy.actions.engagement.retweet import AutoRetweet
        
        config = AutoRetweetConfig(keywords=["test"])
        retweeter = AutoRetweet(mock_browser, mock_rate_limiter, config)
        
        assert retweeter.config == config
        assert retweeter._running is False


class TestRetweetResult:
    """Tests for RetweetResult dataclass."""
    
    def test_retweet_result_success(self):
        """Test successful RetweetResult."""
        result = RetweetResult(
            success=True,
            tweet_id="12345",
            tweet_url="https://x.com/user/status/12345",
            is_quote_tweet=False
        )
        
        assert result.success is True
        assert result.is_quote_tweet is False
        assert result.error is None
    
    def test_retweet_result_quote(self):
        """Test quote RetweetResult."""
        result = RetweetResult(
            success=True,
            tweet_id="12345",
            tweet_url="https://x.com/user/status/12345",
            is_quote_tweet=True,
            quote_text="Great thread!"
        )
        
        assert result.is_quote_tweet is True
        assert result.quote_text == "Great thread!"
    
    def test_retweet_result_failure(self):
        """Test failed RetweetResult."""
        result = RetweetResult(
            success=False,
            tweet_id="12345",
            tweet_url="https://x.com/user/status/12345",
            error="Account suspended"
        )
        
        assert result.success is False
        assert result.error == "Account suspended"
    
    def test_retweet_result_already_retweeted(self):
        """Test already retweeted result."""
        result = RetweetResult(
            success=True,
            tweet_id="12345",
            tweet_url="https://x.com/user/status/12345",
            was_already_retweeted=True
        )
        
        assert result.was_already_retweeted is True
