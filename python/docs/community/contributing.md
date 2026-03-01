# Contributing to Xeepy

Thank you for your interest in contributing to Xeepy! This guide will help you get started.

## Ways to Contribute

### 🐛 Report Bugs

Found a bug? [Open an issue](https://github.com/xeepy/xeepy/issues/new?template=bug_report.md) with:

- Clear description of the problem
- Steps to reproduce
- Expected vs actual behavior
- Xeepy version and Python version
- OS and browser information

### 💡 Suggest Features

Have an idea? [Start a discussion](https://github.com/xeepy/xeepy/discussions/new?category=ideas) with:

- Clear description of the feature
- Use case and motivation
- Possible implementation approach
- Examples from similar tools (if any)

### 📖 Improve Documentation

Documentation improvements are always welcome:

- Fix typos and grammar
- Add code examples
- Clarify confusing sections
- Translate to other languages
- Add tutorials and guides

### 🔧 Submit Code

Ready to code? Follow the process below.

## Development Setup

### Prerequisites

- Python 3.10+
- Git
- Node.js (for docs preview)

### Clone & Install

```bash
# Fork the repo on GitHub, then clone your fork
git clone https://github.com/YOUR_USERNAME/xeepy.git
cd xeepy

# Create virtual environment
python -m venv .venv
source .venv/bin/activate  # Linux/macOS
# or: .venv\Scripts\activate  # Windows

# Install in editable mode with dev dependencies
pip install -e ".[dev]"

# Install Playwright browser
playwright install chromium

# Install pre-commit hooks
pre-commit install
```

### Verify Setup

```bash
# Run tests
pytest

# Run linter
ruff check .

# Run type checker
mypy xeepy

# Build docs
mkdocs serve
```

## Code Style

### Python Style

We use:
- **Ruff** for linting and formatting
- **MyPy** for type checking
- **Black** style formatting (via Ruff)

```bash
# Format code
ruff format .

# Fix lint issues
ruff check --fix .
```

### Type Hints

All public APIs must have type hints:

```python
# Good ✓
async def scrape_replies(
    self,
    tweet_url: str,
    limit: int = 100,
    *,
    include_author: bool = True,
) -> ScrapeResult[Tweet]:
    """Scrape replies to a tweet.
    
    Args:
        tweet_url: URL of the tweet to scrape replies from.
        limit: Maximum number of replies to return.
        include_author: Whether to include the original author's replies.
        
    Returns:
        ScrapeResult containing Tweet objects.
        
    Raises:
        NotFoundError: If the tweet doesn't exist.
        AuthenticationError: If not authenticated.
    """
    ...

# Bad ✗
async def scrape_replies(self, url, limit=100, include_author=True):
    ...
```

### Docstrings

Use Google-style docstrings:

```python
def function(arg1: str, arg2: int) -> bool:
    """Short description of function.
    
    Longer description if needed. Can span multiple
    lines and include examples.
    
    Args:
        arg1: Description of arg1.
        arg2: Description of arg2.
        
    Returns:
        Description of return value.
        
    Raises:
        ValueError: When arg1 is empty.
        
    Examples:
        >>> function("hello", 42)
        True
    """
```

### Naming Conventions

| Type | Convention | Example |
|------|------------|---------|
| Classes | PascalCase | `RepliesScraper` |
| Functions | snake_case | `scrape_replies` |
| Variables | snake_case | `tweet_count` |
| Constants | UPPER_CASE | `MAX_RETRIES` |
| Private | _prefix | `_internal_method` |

## Project Structure

```
xeepy/
├── __init__.py          # Public exports
├── core/                # Core functionality
│   ├── browser.py       # Browser management
│   ├── auth.py          # Authentication
│   ├── rate_limiter.py  # Rate limiting
│   └── config.py        # Configuration
├── scrapers/            # Scraping modules
│   ├── base.py          # Base class
│   └── *.py             # Specific scrapers
├── actions/             # Action modules
│   ├── base.py          # Base class
│   └── *.py             # Specific actions
├── models/              # Data models
├── exceptions.py        # Custom exceptions
└── ...

tests/
├── conftest.py          # Shared fixtures
├── unit/                # Unit tests
├── integration/         # Integration tests
└── e2e/                 # End-to-end tests

docs/
├── index.md             # Documentation home
├── getting-started/     # Getting started guides
├── guides/              # Feature guides
└── api/                 # API reference
```

## Testing

### Running Tests

```bash
# All tests
pytest

# Specific file
pytest tests/unit/test_scrapers.py

# With coverage
pytest --cov=xeepy --cov-report=html

# Only unit tests (fast)
pytest tests/unit

# Integration tests (requires auth)
pytest tests/integration
```

### Writing Tests

```python
# tests/unit/test_scrapers/test_replies.py
import pytest
from xeepy.scrapers.replies import RepliesScraper

class TestRepliesScraper:
    """Tests for RepliesScraper."""
    
    @pytest.fixture
    def scraper(self, mock_browser):
        """Create scraper with mocked browser."""
        return RepliesScraper(mock_browser)
    
    async def test_scrape_replies_success(self, scraper):
        """Should return replies for valid tweet."""
        result = await scraper.scrape("https://x.com/user/status/123")
        assert len(result.items) > 0
        assert all(isinstance(r, Tweet) for r in result.items)
    
    async def test_scrape_replies_not_found(self, scraper):
        """Should raise NotFoundError for invalid tweet."""
        with pytest.raises(NotFoundError):
            await scraper.scrape("https://x.com/user/status/invalid")
    
    @pytest.mark.parametrize("limit", [10, 50, 100])
    async def test_scrape_respects_limit(self, scraper, limit):
        """Should respect the limit parameter."""
        result = await scraper.scrape("...", limit=limit)
        assert len(result.items) <= limit
```

### Test Fixtures

We provide shared fixtures in `conftest.py`:

```python
@pytest.fixture
def mock_browser():
    """Mocked browser manager."""
    ...

@pytest.fixture
def mock_page():
    """Mocked Playwright page."""
    ...

@pytest.fixture
def sample_tweet():
    """Sample Tweet object."""
    ...

@pytest.fixture
async def authenticated_xeepy():
    """Xeepy instance with authentication."""
    ...
```

## Pull Request Process

### 1. Create a Branch

```bash
# Update main
git checkout main
git pull upstream main

# Create feature branch
git checkout -b feature/your-feature-name
```

Branch naming:
- `feature/description` - New features
- `fix/description` - Bug fixes
- `docs/description` - Documentation
- `refactor/description` - Code refactoring

### 2. Make Changes

- Write code following our style guide
- Add/update tests
- Update documentation
- Run tests locally

### 3. Commit

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```bash
# Format
<type>(<scope>): <description>

# Examples
feat(scrapers): add Twitter Spaces scraper
fix(auth): handle session expiration gracefully
docs(readme): add installation instructions
test(actions): add unfollow unit tests
refactor(core): simplify rate limiter logic
```

Types:
- `feat` - New feature
- `fix` - Bug fix
- `docs` - Documentation
- `test` - Tests
- `refactor` - Code refactoring
- `chore` - Maintenance

### 4. Push & Create PR

```bash
git push origin feature/your-feature-name
```

Then create a Pull Request on GitHub with:

- Clear title and description
- Link to related issues
- Screenshots (if UI changes)
- Test results

### 5. Review Process

1. Automated checks run (tests, lint, types)
2. Maintainer reviews code
3. Address feedback
4. Get approval
5. Maintainer merges

## Code Review Guidelines

### For Authors

- Keep PRs small and focused
- Respond to feedback promptly
- Don't take feedback personally
- Ask questions if unclear

### For Reviewers

- Be constructive and kind
- Explain the "why" behind suggestions
- Approve when ready, not perfect
- Use suggestions feature for small fixes

## Release Process

Maintainers handle releases:

1. Update `__version__` in `__init__.py`
2. Update `CHANGELOG.md`
3. Create GitHub release
4. PyPI publish (automated)

## Getting Help

- 💬 [Discord](https://discord.gg/xeepy) - Chat with maintainers
- 🐛 [Issues](https://github.com/xeepy/xeepy/issues) - Bug reports
- 💡 [Discussions](https://github.com/xeepy/xeepy/discussions) - Questions

## Recognition

Contributors are:
- Listed in `CONTRIBUTORS.md`
- Mentioned in release notes
- Thanked in community channels

Thank you for contributing to Xeepy! 🙏
