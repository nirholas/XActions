# Testing XTools Integrations

Learn how to test your XTools automation scripts using pytest and async testing patterns.

## Setup Testing Environment

Install testing dependencies:

```bash
pip install pytest pytest-asyncio pytest-mock aioresponses
```

Configure pytest for async tests in `pyproject.toml`:

```toml
[tool.pytest.ini_options]
asyncio_mode = "auto"
testpaths = ["tests"]
```

## Basic Test Structure

```python
import pytest
from unittest.mock import AsyncMock, MagicMock
from xtools import XTools

@pytest.fixture
async def xtools_client():
    """Create a mocked XTools client for testing."""
    client = XTools(headless=True)
    client.browser = AsyncMock()
    yield client
    await client.close()

@pytest.mark.asyncio
async def test_scrape_replies(xtools_client):
    """Test reply scraping returns expected structure."""
    xtools_client.scrape.replies = AsyncMock(return_value=[
        {"id": "123", "text": "Test reply", "author": "user1"}
    ])
    
    replies = await xtools_client.scrape.replies("https://x.com/user/status/123")
    
    assert len(replies) == 1
    assert replies[0]["text"] == "Test reply"
```

!!! tip "Use Fixtures for Reusability"
    Create pytest fixtures for common setup tasks like authentication and browser initialization to keep tests DRY.

## Mocking Browser Interactions

```python
import pytest
from unittest.mock import AsyncMock, patch

@pytest.mark.asyncio
async def test_follow_user():
    """Test follow action with mocked browser."""
    with patch("xtools.core.browser.BrowserManager") as mock_browser:
        mock_page = AsyncMock()
        mock_browser.return_value.get_page.return_value = mock_page
        
        from xtools.actions.follow import FollowActions
        follow = FollowActions(mock_browser.return_value)
        
        await follow.user("testuser")
        
        mock_page.goto.assert_called()
        mock_page.click.assert_called()
```

## Testing Rate Limiting

```python
import pytest
import time
from xtools.core.rate_limiter import RateLimiter

@pytest.mark.asyncio
async def test_rate_limiter_blocks_excess_requests():
    """Verify rate limiter enforces request limits."""
    limiter = RateLimiter(max_requests=2, window_seconds=1)
    
    await limiter.acquire()  # Request 1
    await limiter.acquire()  # Request 2
    
    start = time.time()
    await limiter.acquire()  # Request 3 - should wait
    elapsed = time.time() - start
    
    assert elapsed >= 0.9  # Should have waited ~1 second
```

!!! warning "Async Test Timeouts"
    Always set reasonable timeouts for async tests to prevent hanging:
    ```python
    @pytest.mark.asyncio
    @pytest.mark.timeout(30)
    async def test_with_timeout():
        ...
    ```

## Integration Test Example

```python
import pytest
import os

@pytest.mark.integration
@pytest.mark.skipif(
    not os.getenv("XTOOLS_TEST_COOKIES"),
    reason="Integration tests require authentication"
)
@pytest.mark.asyncio
async def test_real_profile_scrape():
    """Integration test with real X/Twitter."""
    from xtools import XTools
    
    async with XTools() as x:
        await x.auth.load_cookies(os.getenv("XTOOLS_TEST_COOKIES"))
        profile = await x.scrape.profile("twitter")
        
        assert profile.username == "twitter"
        assert profile.followers_count > 0
```

## Running Tests

```bash
# Run all tests
pytest

# Run with coverage
pytest --cov=xtools --cov-report=html

# Run only unit tests (skip integration)
pytest -m "not integration"

# Run specific test file
pytest tests/test_scrapers.py -v
```

!!! info "CI/CD Integration"
    For GitHub Actions, use the `pytest-github-actions-annotate-failures` plugin to display test failures directly in PR annotations.
