"""
Tests for Like Actions

Unit tests for like engagement actions.
"""

import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from xeepy.actions.types import TweetElement, LikeResult, LikeFilters, AutoLikeConfig


class TestLikeTweet:
    """Tests for LikeTweet action."""
    
    @pytest.fixture
    def mock_browser(self):
        """Create mock browser manager."""
        browser = MagicMock()
        browser.page = AsyncMock()
        browser.page.goto = AsyncMock()
        browser.page.wait_for_selector = AsyncMock()
        browser.page.click = AsyncMock()
        browser.page.query_selector = AsyncMock(return_value=None)
        return browser
    
    @pytest.fixture
    def mock_rate_limiter(self):
        """Create mock rate limiter."""
        limiter = MagicMock()
        limiter.acquire = AsyncMock(return_value=True)
        limiter.check_rate_limit = MagicMock(return_value=True)
        return limiter
    
    @pytest.mark.asyncio
    async def test_like_tweet_success(self, mock_browser, mock_rate_limiter):
        """Test successful tweet like."""
        from xeepy.actions.engagement.like import LikeTweet
        
        # Setup mock to simulate like button
        mock_button = MagicMock()
        mock_button.get_attribute = AsyncMock(return_value="Like")
        mock_browser.page.query_selector = AsyncMock(return_value=mock_button)
        
        action = LikeTweet(mock_browser, mock_rate_limiter)
        result = await action.execute("https://x.com/user/status/12345")
        
        assert result is not None
        assert isinstance(result, LikeResult)
    
    @pytest.mark.asyncio
    async def test_like_tweet_dry_run(self, mock_browser, mock_rate_limiter):
        """Test dry run mode doesn't actually like."""
        from xeepy.actions.engagement.like import LikeTweet
        
        action = LikeTweet(mock_browser, mock_rate_limiter, dry_run=True)
        result = await action.execute("https://x.com/user/status/12345")
        
        assert result.success is True
        assert result.was_already_liked is False
        # Click should not be called in dry run
        mock_browser.page.click.assert_not_called()
    
    @pytest.mark.asyncio
    async def test_like_tweet_skip_already_liked(self, mock_browser, mock_rate_limiter):
        """Test skipping already liked tweets."""
        from xeepy.actions.engagement.like import LikeTweet
        
        # Simulate already liked
        mock_button = MagicMock()
        mock_button.get_attribute = AsyncMock(return_value="Liked")
        mock_browser.page.query_selector = AsyncMock(return_value=mock_button)
        
        action = LikeTweet(mock_browser, mock_rate_limiter, skip_if_liked=True)
        result = await action.execute("https://x.com/user/status/12345")
        
        assert result.was_already_liked is True


class TestLikeByKeyword:
    """Tests for LikeByKeyword action."""
    
    @pytest.fixture
    def mock_browser(self):
        """Create mock browser manager."""
        browser = MagicMock()
        browser.page = AsyncMock()
        browser.page.goto = AsyncMock()
        browser.page.wait_for_selector = AsyncMock()
        browser.page.query_selector_all = AsyncMock(return_value=[])
        return browser
    
    @pytest.fixture
    def mock_rate_limiter(self):
        """Create mock rate limiter."""
        limiter = MagicMock()
        limiter.acquire = AsyncMock(return_value=True)
        return limiter
    
    @pytest.mark.asyncio
    async def test_like_by_keyword_basic(self, mock_browser, mock_rate_limiter):
        """Test basic keyword search and like."""
        from xeepy.actions.engagement.like import LikeByKeyword
        
        action = LikeByKeyword(mock_browser, mock_rate_limiter)
        results = await action.execute("python programming", max_tweets=5)
        
        assert isinstance(results, list)
        # Verify search was performed
        mock_browser.page.goto.assert_called()
    
    @pytest.mark.asyncio
    async def test_like_by_keyword_with_filters(self, mock_browser, mock_rate_limiter):
        """Test keyword search with filters."""
        from xeepy.actions.engagement.like import LikeByKeyword
        
        filters = LikeFilters(
            min_likes=10,
            min_followers=1000,
            exclude_retweets=True
        )
        
        action = LikeByKeyword(mock_browser, mock_rate_limiter, filters=filters)
        results = await action.execute("AI", max_tweets=3)
        
        assert isinstance(results, list)


class TestAutoLiker:
    """Tests for AutoLiker action."""
    
    @pytest.fixture
    def mock_browser(self):
        """Create mock browser manager."""
        browser = MagicMock()
        browser.page = AsyncMock()
        browser.page.goto = AsyncMock()
        browser.page.wait_for_selector = AsyncMock()
        browser.page.query_selector_all = AsyncMock(return_value=[])
        return browser
    
    @pytest.fixture  
    def mock_rate_limiter(self):
        """Create mock rate limiter."""
        limiter = MagicMock()
        limiter.acquire = AsyncMock(return_value=True)
        limiter.check_rate_limit = MagicMock(return_value=True)
        return limiter
    
    def test_auto_like_config_defaults(self):
        """Test AutoLikeConfig default values."""
        config = AutoLikeConfig(keywords=["test"])
        
        assert config.keywords == ["test"]
        assert config.max_likes_per_hour == 30
        assert config.min_delay == 30.0
        assert config.max_delay == 120.0
    
    def test_auto_like_config_validation(self):
        """Test AutoLikeConfig validation."""
        config = AutoLikeConfig(
            keywords=["python", "coding"],
            max_likes_per_hour=50,
            min_delay=60.0,
            max_delay=180.0,
            skip_retweets=True
        )
        
        assert len(config.keywords) == 2
        assert config.max_likes_per_hour == 50
        assert config.skip_retweets is True
    
    @pytest.mark.asyncio
    async def test_auto_liker_initialization(self, mock_browser, mock_rate_limiter):
        """Test AutoLiker initialization."""
        from xeepy.actions.engagement.like import AutoLiker
        
        config = AutoLikeConfig(keywords=["test"])
        liker = AutoLiker(mock_browser, mock_rate_limiter, config)
        
        assert liker.config == config
        assert liker._running is False


class TestLikeFilters:
    """Tests for LikeFilters."""
    
    def test_filter_defaults(self):
        """Test default filter values."""
        filters = LikeFilters()
        
        assert filters.min_likes == 0
        assert filters.max_likes is None
        assert filters.min_followers == 0
        assert filters.exclude_retweets is False
        assert filters.exclude_replies is False
    
    def test_filter_custom_values(self):
        """Test custom filter values."""
        filters = LikeFilters(
            min_likes=100,
            max_likes=10000,
            min_followers=5000,
            exclude_retweets=True,
            exclude_replies=True,
            include_keywords=["python", "AI"],
            exclude_keywords=["spam"]
        )
        
        assert filters.min_likes == 100
        assert filters.max_likes == 10000
        assert filters.min_followers == 5000
        assert filters.exclude_retweets is True
        assert "python" in filters.include_keywords
        assert "spam" in filters.exclude_keywords


class TestTweetElement:
    """Tests for TweetElement dataclass."""
    
    def test_tweet_element_creation(self):
        """Test TweetElement creation."""
        tweet = TweetElement(
            tweet_id="12345",
            author_username="testuser",
            author_display_name="Test User",
            text="Hello world!",
            url="https://x.com/testuser/status/12345",
            like_count=100,
            retweet_count=50,
            reply_count=25,
            view_count=1000
        )
        
        assert tweet.tweet_id == "12345"
        assert tweet.author_username == "testuser"
        assert tweet.text == "Hello world!"
        assert tweet.like_count == 100
    
    def test_tweet_element_optional_fields(self):
        """Test TweetElement with optional fields."""
        tweet = TweetElement(
            tweet_id="12345",
            author_username="user",
            text="Test"
        )
        
        assert tweet.author_display_name is None
        assert tweet.like_count is None
        assert tweet.hashtags is None


class TestLikeResult:
    """Tests for LikeResult dataclass."""
    
    def test_like_result_success(self):
        """Test successful LikeResult."""
        result = LikeResult(
            success=True,
            tweet_id="12345",
            tweet_url="https://x.com/user/status/12345"
        )
        
        assert result.success is True
        assert result.tweet_id == "12345"
        assert result.error is None
    
    def test_like_result_failure(self):
        """Test failed LikeResult."""
        result = LikeResult(
            success=False,
            tweet_id="12345",
            tweet_url="https://x.com/user/status/12345",
            error="Rate limited"
        )
        
        assert result.success is False
        assert result.error == "Rate limited"
    
    def test_like_result_already_liked(self):
        """Test already liked result."""
        result = LikeResult(
            success=True,
            tweet_id="12345",
            tweet_url="https://x.com/user/status/12345",
            was_already_liked=True
        )
        
        assert result.success is True
        assert result.was_already_liked is True
