# Contributing to Xeepy

First off, thank you for considering contributing to Xeepy! 🎉

This document provides guidelines and steps for contributing.

---

## 📋 Table of Contents

- [Code of Conduct](#code-of-conduct)
- [How Can I Contribute?](#how-can-i-contribute)
- [Development Setup](#development-setup)
- [Pull Request Process](#pull-request-process)
- [Style Guidelines](#style-guidelines)
- [Testing](#testing)

---

## 📜 Code of Conduct

### Our Pledge

We pledge to make participation in our project a harassment-free experience for everyone, regardless of age, body size, disability, ethnicity, gender identity and expression, level of experience, nationality, personal appearance, race, religion, or sexual identity and orientation.

### Our Standards

**Examples of behavior that contributes to a positive environment:**
- Using welcoming and inclusive language
- Being respectful of differing viewpoints and experiences
- Gracefully accepting constructive criticism
- Focusing on what is best for the community

**Unacceptable behavior:**
- Trolling, insulting/derogatory comments, and personal attacks
- Public or private harassment
- Publishing others' private information without permission
- Any conduct that could reasonably be considered inappropriate

---

## 🤝 How Can I Contribute?

### Reporting Bugs

Before creating bug reports, please check existing issues. When creating a bug report, include:

- **Clear title** describing the issue
- **Steps to reproduce** the problem
- **Expected behavior** vs actual behavior
- **Screenshots** if applicable
- **Environment details** (OS, Python version, etc.)

### Suggesting Features

Feature suggestions are welcome! Please:

- Use a clear, descriptive title
- Provide a detailed description of the proposed feature
- Explain why this feature would be useful
- Include code examples if possible

### Pull Requests

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Run tests (`pytest`)
5. Commit your changes (`git commit -m 'Add amazing feature'`)
6. Push to the branch (`git push origin feature/amazing-feature`)
7. Open a Pull Request

---

## 🔧 Development Setup

### Prerequisites

- Python 3.10+
- Git
- A code editor (VS Code recommended)

### Setup Steps

```bash
# 1. Fork and clone the repository
git clone https://github.com/YOUR_USERNAME/Get-Tweet-Replies-With-Python-Tweepy.git
cd Get-Tweet-Replies-With-Python-Tweepy

# 2. Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# 3. Install in development mode
pip install -e ".[dev]"

# 4. Install Playwright browsers
playwright install chromium

# 5. Run tests to verify setup
pytest

# 6. Install pre-commit hooks
pre-commit install
```

### Project Structure

```
xeepy/
├── core/           # Core functionality (browser, auth, config)
├── scrapers/       # Data scrapers (replies, followers, etc.)
├── actions/        # Actions (follow, unfollow, engage)
├── monitoring/     # Monitoring (unfollowers, analytics)
├── ai/             # AI features (content generation, sentiment)
├── models/         # Data models (Tweet, User, etc.)
├── storage/        # Storage (database, export)
└── notifications/  # Notification services
```

---

## 📝 Pull Request Process

### Before Submitting

1. **Update documentation** if you changed any behavior
2. **Add tests** for new functionality
3. **Run the full test suite** (`pytest`)
4. **Run linters** (`ruff check .` and `black --check .`)
5. **Update the CHANGELOG** if applicable

### PR Title Format

Use conventional commit format:

- `feat: Add new scraper for Twitter lists`
- `fix: Handle rate limiting edge case`
- `docs: Update API documentation`
- `refactor: Simplify browser initialization`
- `test: Add tests for unfollow module`

### Review Process

1. Maintainers will review your PR
2. Address any requested changes
3. Once approved, maintainers will merge
4. Your contribution will be credited in the release notes!

---

## 🎨 Style Guidelines

### Python Style

We follow **PEP 8** with some modifications:

```python
# Good
async def get_tweet_replies(tweet_url: str, limit: int = 100) -> list[Tweet]:
    """
    Get replies to a tweet.
    
    Args:
        tweet_url: URL of the tweet
        limit: Maximum replies to fetch
        
    Returns:
        List of Tweet objects
    """
    async with self.browser as page:
        replies = await self._scrape_replies(page, tweet_url, limit)
        return replies
```

### Code Formatting

We use **Black** for code formatting and **Ruff** for linting:

```bash
# Format code
black .

# Check linting
ruff check .

# Fix auto-fixable issues
ruff check --fix .
```

### Type Hints

Use type hints for all public functions:

```python
# Good
def process_tweets(tweets: list[Tweet]) -> ProcessedResult: ...

# Bad
def process_tweets(tweets): ...
```

### Docstrings

Use Google-style docstrings:

```python
def scrape_followers(self, username: str, limit: int = 1000) -> list[User]:
    """
    Scrape followers of a user.
    
    Args:
        username: Twitter username (without @)
        limit: Maximum followers to scrape
        
    Returns:
        List of User objects
        
    Raises:
        AuthenticationError: If not logged in
        RateLimitError: If rate limit exceeded
        
    Example:
        >>> followers = await x.scrape.followers("elonmusk", limit=100)
    """
```

---

## 🧪 Testing

### Running Tests

```bash
# Run all tests
pytest

# Run with coverage
pytest --cov=xeepy --cov-report=html

# Run specific test file
pytest tests/test_scrapers.py

# Run specific test
pytest tests/test_scrapers.py::test_reply_scraper
```

### Writing Tests

```python
import pytest
from xeepy import Xeepy

@pytest.fixture
async def xeepy():
    """Create Xeepy instance for testing."""
    async with Xeepy(headless=True) as x:
        yield x

@pytest.mark.asyncio
async def test_reply_scraper(xeepy):
    """Test that reply scraper returns valid data."""
    replies = await xeepy.scrape.replies(
        "https://x.com/test/status/123",
        limit=10
    )
    
    assert len(replies) <= 10
    assert all(hasattr(r, 'text') for r in replies)
    assert all(hasattr(r, 'username') for r in replies)
```

### Test Categories

- **Unit tests**: Test individual functions/methods
- **Integration tests**: Test component interactions
- **E2E tests**: Test full workflows (marked with `@pytest.mark.e2e`)

---

## 🏆 Recognition

Contributors are recognized in:
- The release notes
- The contributors list in README
- The GitHub contributors page

---

## ❓ Questions?

Feel free to:
- Open a discussion on GitHub
- Reach out on Twitter [@nichxbt](https://x.com/nichxbt)
- Check the [FAQ](docs/FAQ.md)

---

Thank you for contributing! 🙏

## Code of Conduct

Please read and follow our [Code of Conduct](CODE_OF_CONDUCT.md).
