"""
Tests for Comment Actions

Unit tests for comment engagement actions.
"""

import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from xeepy.actions.types import CommentResult, AutoCommentConfig


class TestReplyTweet:
    """Tests for ReplyTweet action."""
    
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
    async def test_reply_tweet_success(self, mock_browser, mock_rate_limiter):
        """Test successful tweet reply."""
        from xeepy.actions.engagement.comment import ReplyTweet
        
        action = ReplyTweet(mock_browser, mock_rate_limiter)
        result = await action.execute(
            "https://x.com/user/status/12345",
            "Great post!"
        )
        
        assert result is not None
        assert isinstance(result, CommentResult)
    
    @pytest.mark.asyncio
    async def test_reply_tweet_dry_run(self, mock_browser, mock_rate_limiter):
        """Test dry run mode."""
        from xeepy.actions.engagement.comment import ReplyTweet
        
        action = ReplyTweet(mock_browser, mock_rate_limiter, dry_run=True)
        result = await action.execute(
            "https://x.com/user/status/12345",
            "Test comment"
        )
        
        assert result.success is True
        # Should not actually submit
        mock_browser.page.click.assert_not_called()
    
    @pytest.mark.asyncio
    async def test_reply_tweet_empty_comment(self, mock_browser, mock_rate_limiter):
        """Test empty comment rejection."""
        from xeepy.actions.engagement.comment import ReplyTweet
        
        action = ReplyTweet(mock_browser, mock_rate_limiter)
        result = await action.execute(
            "https://x.com/user/status/12345",
            ""
        )
        
        assert result.success is False


class TestAutoCommenter:
    """Tests for AutoCommenter action."""
    
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
    
    def test_auto_comment_config_defaults(self):
        """Test AutoCommentConfig default values."""
        config = AutoCommentConfig(
            keywords=["test"],
            templates=["Great post!"]
        )
        
        assert config.max_comments_per_hour == 5
        assert config.min_delay == 120.0
        assert config.max_delay == 300.0
    
    def test_auto_comment_config_custom(self):
        """Test AutoCommentConfig custom values."""
        config = AutoCommentConfig(
            keywords=["python", "coding"],
            templates=["Love this!", "Great insight!"],
            max_comments_per_hour=10,
            min_delay=60.0,
            max_delay=180.0
        )
        
        assert len(config.keywords) == 2
        assert len(config.templates) == 2
        assert config.max_comments_per_hour == 10
    
    @pytest.mark.asyncio
    async def test_auto_commenter_initialization(self, mock_browser, mock_rate_limiter):
        """Test AutoCommenter initialization."""
        from xeepy.actions.engagement.comment import AutoCommenter
        
        config = AutoCommentConfig(
            keywords=["test"],
            templates=["Nice!"]
        )
        commenter = AutoCommenter(mock_browser, mock_rate_limiter, config)
        
        assert commenter.config == config
        assert commenter._running is False


class TestAICommenter:
    """Tests for AICommenter action."""
    
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
    
    @pytest.mark.asyncio
    async def test_ai_commenter_initialization(self, mock_browser, mock_rate_limiter):
        """Test AICommenter initialization."""
        from xeepy.actions.engagement.comment import AICommenter
        
        # Without AI provider - should still initialize
        commenter = AICommenter(mock_browser, mock_rate_limiter)
        
        assert commenter is not None
    
    @pytest.mark.asyncio
    async def test_ai_commenter_fallback_to_template(self, mock_browser, mock_rate_limiter):
        """Test AI commenter falls back to templates without API."""
        from xeepy.actions.engagement.comment import AICommenter
        
        commenter = AICommenter(mock_browser, mock_rate_limiter)
        
        # Without AI provider, should use template fallback
        comment = await commenter._generate_comment("Test tweet text")
        
        # Should return some string
        assert isinstance(comment, str)
        assert len(comment) > 0


class TestCommentResult:
    """Tests for CommentResult dataclass."""
    
    def test_comment_result_success(self):
        """Test successful CommentResult."""
        result = CommentResult(
            success=True,
            tweet_id="12345",
            tweet_url="https://x.com/user/status/12345",
            comment_text="Great post!"
        )
        
        assert result.success is True
        assert result.comment_text == "Great post!"
        assert result.error is None
    
    def test_comment_result_failure(self):
        """Test failed CommentResult."""
        result = CommentResult(
            success=False,
            tweet_id="12345",
            tweet_url="https://x.com/user/status/12345",
            comment_text="Test",
            error="Comment blocked"
        )
        
        assert result.success is False
        assert result.error == "Comment blocked"
    
    def test_comment_result_with_reply_id(self):
        """Test CommentResult with reply ID."""
        result = CommentResult(
            success=True,
            tweet_id="12345",
            tweet_url="https://x.com/user/status/12345",
            comment_text="Nice!",
            reply_tweet_id="67890"
        )
        
        assert result.reply_tweet_id == "67890"
