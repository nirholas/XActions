"""
Tests for Bookmark Actions

Unit tests for bookmark engagement actions.
"""

import pytest
from unittest.mock import AsyncMock, MagicMock, patch
import tempfile
import os
from xeepy.actions.types import BookmarkResult


class TestBookmarkTweet:
    """Tests for BookmarkTweet action."""
    
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
    async def test_bookmark_success(self, mock_browser, mock_rate_limiter):
        """Test successful bookmark."""
        from xeepy.actions.engagement.bookmark import BookmarkTweet
        
        action = BookmarkTweet(mock_browser, mock_rate_limiter)
        result = await action.execute("https://x.com/user/status/12345")
        
        assert result is not None
        assert isinstance(result, BookmarkResult)
    
    @pytest.mark.asyncio
    async def test_bookmark_dry_run(self, mock_browser, mock_rate_limiter):
        """Test dry run mode."""
        from xeepy.actions.engagement.bookmark import BookmarkTweet
        
        action = BookmarkTweet(mock_browser, mock_rate_limiter, dry_run=True)
        result = await action.execute("https://x.com/user/status/12345")
        
        assert result.success is True
        mock_browser.page.click.assert_not_called()
    
    @pytest.mark.asyncio
    async def test_bookmark_skip_already_bookmarked(self, mock_browser, mock_rate_limiter):
        """Test skipping already bookmarked."""
        from xeepy.actions.engagement.bookmark import BookmarkTweet
        
        # Simulate already bookmarked state
        mock_button = MagicMock()
        mock_button.inner_text = AsyncMock(return_value="Remove from Bookmarks")
        mock_browser.page.query_selector = AsyncMock(return_value=mock_button)
        
        action = BookmarkTweet(mock_browser, mock_rate_limiter, skip_if_bookmarked=True)
        result = await action.execute("https://x.com/user/status/12345")
        
        assert result.was_already_bookmarked is True
    
    @pytest.mark.asyncio
    async def test_bulk_bookmark(self, mock_browser, mock_rate_limiter):
        """Test bulk bookmark operation."""
        from xeepy.actions.engagement.bookmark import BookmarkTweet
        
        action = BookmarkTweet(mock_browser, mock_rate_limiter, dry_run=True)
        
        urls = [
            "https://x.com/user/status/1",
            "https://x.com/user/status/2",
            "https://x.com/user/status/3"
        ]
        
        results = await action.bulk_bookmark(urls)
        
        assert len(results) == 3
        assert all(isinstance(r, BookmarkResult) for r in results)


class TestRemoveBookmark:
    """Tests for RemoveBookmark action."""
    
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
    async def test_remove_bookmark_success(self, mock_browser, mock_rate_limiter):
        """Test successful bookmark removal."""
        from xeepy.actions.engagement.bookmark import RemoveBookmark
        
        action = RemoveBookmark(mock_browser, mock_rate_limiter)
        result = await action.execute("https://x.com/user/status/12345")
        
        assert result is not None
        assert isinstance(result, BookmarkResult)
    
    @pytest.mark.asyncio
    async def test_remove_bookmark_dry_run(self, mock_browser, mock_rate_limiter):
        """Test dry run mode."""
        from xeepy.actions.engagement.bookmark import RemoveBookmark
        
        action = RemoveBookmark(mock_browser, mock_rate_limiter, dry_run=True)
        result = await action.execute("https://x.com/user/status/12345")
        
        assert result.success is True
    
    @pytest.mark.asyncio
    async def test_bulk_remove(self, mock_browser, mock_rate_limiter):
        """Test bulk remove operation."""
        from xeepy.actions.engagement.bookmark import RemoveBookmark
        
        action = RemoveBookmark(mock_browser, mock_rate_limiter, dry_run=True)
        
        urls = [
            "https://x.com/user/status/1",
            "https://x.com/user/status/2"
        ]
        
        results = await action.bulk_remove(urls)
        
        assert len(results) == 2


class TestExportBookmarks:
    """Tests for ExportBookmarks action."""
    
    @pytest.fixture
    def mock_browser(self):
        """Create mock browser manager."""
        browser = MagicMock()
        browser.page = AsyncMock()
        browser.page.goto = AsyncMock()
        browser.page.wait_for_selector = AsyncMock()
        browser.page.query_selector_all = AsyncMock(return_value=[])
        browser.page.evaluate = AsyncMock(return_value=0)
        return browser
    
    @pytest.fixture
    def mock_rate_limiter(self):
        """Create mock rate limiter."""
        limiter = MagicMock()
        limiter.acquire = AsyncMock(return_value=True)
        return limiter
    
    @pytest.mark.asyncio
    async def test_export_json(self, mock_browser, mock_rate_limiter):
        """Test JSON export."""
        from xeepy.actions.engagement.bookmark import ExportBookmarks
        
        action = ExportBookmarks(mock_browser, mock_rate_limiter)
        
        with tempfile.TemporaryDirectory() as tmpdir:
            output_path = os.path.join(tmpdir, "bookmarks.json")
            result = await action.execute(output_path, format="json")
            
            assert result is not None
    
    @pytest.mark.asyncio
    async def test_export_csv(self, mock_browser, mock_rate_limiter):
        """Test CSV export."""
        from xeepy.actions.engagement.bookmark import ExportBookmarks
        
        action = ExportBookmarks(mock_browser, mock_rate_limiter)
        
        with tempfile.TemporaryDirectory() as tmpdir:
            output_path = os.path.join(tmpdir, "bookmarks.csv")
            result = await action.execute(output_path, format="csv")
            
            assert result is not None
    
    @pytest.mark.asyncio
    async def test_export_txt(self, mock_browser, mock_rate_limiter):
        """Test TXT export."""
        from xeepy.actions.engagement.bookmark import ExportBookmarks
        
        action = ExportBookmarks(mock_browser, mock_rate_limiter)
        
        with tempfile.TemporaryDirectory() as tmpdir:
            output_path = os.path.join(tmpdir, "bookmarks.txt")
            result = await action.execute(output_path, format="txt")
            
            assert result is not None


class TestBookmarkManager:
    """Tests for BookmarkManager class."""
    
    @pytest.fixture
    def mock_browser(self):
        """Create mock browser manager."""
        browser = MagicMock()
        browser.page = AsyncMock()
        browser.page.goto = AsyncMock()
        browser.page.wait_for_selector = AsyncMock()
        browser.page.click = AsyncMock()
        browser.page.query_selector = AsyncMock(return_value=MagicMock())
        browser.page.query_selector_all = AsyncMock(return_value=[])
        return browser
    
    @pytest.fixture
    def mock_rate_limiter(self):
        """Create mock rate limiter."""
        limiter = MagicMock()
        limiter.acquire = AsyncMock(return_value=True)
        return limiter
    
    @pytest.mark.asyncio
    async def test_manager_initialization(self, mock_browser, mock_rate_limiter):
        """Test BookmarkManager initialization."""
        from xeepy.actions.engagement.bookmark import BookmarkManager
        
        manager = BookmarkManager(mock_browser, mock_rate_limiter)
        
        assert manager is not None
    
    @pytest.mark.asyncio
    async def test_manager_add_bookmark(self, mock_browser, mock_rate_limiter):
        """Test adding bookmark via manager."""
        from xeepy.actions.engagement.bookmark import BookmarkManager
        
        manager = BookmarkManager(mock_browser, mock_rate_limiter, dry_run=True)
        result = await manager.add_bookmark("https://x.com/user/status/12345")
        
        assert isinstance(result, BookmarkResult)
    
    @pytest.mark.asyncio
    async def test_manager_remove_bookmark(self, mock_browser, mock_rate_limiter):
        """Test removing bookmark via manager."""
        from xeepy.actions.engagement.bookmark import BookmarkManager
        
        manager = BookmarkManager(mock_browser, mock_rate_limiter, dry_run=True)
        result = await manager.remove_bookmark("https://x.com/user/status/12345")
        
        assert isinstance(result, BookmarkResult)


class TestBookmarkResult:
    """Tests for BookmarkResult dataclass."""
    
    def test_bookmark_result_success(self):
        """Test successful BookmarkResult."""
        result = BookmarkResult(
            success=True,
            tweet_id="12345",
            tweet_url="https://x.com/user/status/12345",
            action="add"
        )
        
        assert result.success is True
        assert result.action == "add"
        assert result.error is None
    
    def test_bookmark_result_remove(self):
        """Test remove BookmarkResult."""
        result = BookmarkResult(
            success=True,
            tweet_id="12345",
            tweet_url="https://x.com/user/status/12345",
            action="remove"
        )
        
        assert result.action == "remove"
    
    def test_bookmark_result_failure(self):
        """Test failed BookmarkResult."""
        result = BookmarkResult(
            success=False,
            tweet_id="12345",
            tweet_url="https://x.com/user/status/12345",
            action="add",
            error="Failed to bookmark"
        )
        
        assert result.success is False
        assert result.error == "Failed to bookmark"
    
    def test_bookmark_result_already_bookmarked(self):
        """Test already bookmarked result."""
        result = BookmarkResult(
            success=True,
            tweet_id="12345",
            tweet_url="https://x.com/user/status/12345",
            action="add",
            was_already_bookmarked=True
        )
        
        assert result.was_already_bookmarked is True
