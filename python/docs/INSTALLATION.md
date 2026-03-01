# Documentation: Installation Guide

> Complete installation guide for Xeepy on all platforms.

---

## Table of Contents

- [Requirements](#requirements)
- [Quick Install](#quick-install)
- [Platform-Specific Instructions](#platform-specific-instructions)
- [Development Installation](#development-installation)
- [Docker Installation](#docker-installation)
- [Troubleshooting](#troubleshooting)

---

## Requirements

### System Requirements

| Requirement | Minimum | Recommended |
|-------------|---------|-------------|
| Python | 3.10 | 3.11+ |
| RAM | 2 GB | 4 GB+ |
| Disk Space | 500 MB | 1 GB |
| Browser | Chromium | Chromium |

### Dependencies

Core dependencies are automatically installed:

- `playwright` - Browser automation
- `aiohttp` - Async HTTP client
- `pydantic` - Data validation
- `rich` - CLI interface
- `typer` - CLI framework

Optional dependencies:

- `openai` - OpenAI GPT integration
- `anthropic` - Claude integration
- `ollama` - Local LLM support

---

## Quick Install

### From PyPI (Recommended)

```bash
# Install Xeepy
pip install xeepy

# Install browser (required)
playwright install chromium

# Verify installation
xeepy --version
```

### From Source

```bash
# Clone repository
git clone https://github.com/nirholas/Get-Tweet-Replies-With-Python-Tweepy.git
cd Get-Tweet-Replies-With-Python-Tweepy

# Install
pip install .

# Install browser
playwright install chromium
```

---

## Platform-Specific Instructions

### macOS

```bash
# Ensure Python 3.10+ is installed
python3 --version

# If not, install via Homebrew
brew install python@3.11

# Install Xeepy
pip3 install xeepy

# Install browser
playwright install chromium

# Verify
xeepy --version
```

### Windows

```powershell
# Ensure Python 3.10+ is installed
python --version

# If not, download from python.org or use winget
winget install Python.Python.3.11

# Install Xeepy
pip install xeepy

# Install browser
playwright install chromium

# Verify
xeepy --version
```

### Linux (Ubuntu/Debian)

```bash
# Install Python 3.10+ if needed
sudo apt update
sudo apt install python3.11 python3.11-venv python3-pip

# Install Xeepy
pip3 install xeepy

# Install browser and dependencies
playwright install chromium
playwright install-deps chromium

# Verify
xeepy --version
```

### Linux (Fedora/RHEL)

```bash
# Install Python
sudo dnf install python3.11 python3-pip

# Install Xeepy
pip3 install xeepy

# Install browser
playwright install chromium

# Verify
xeepy --version
```

### Linux (Arch)

```bash
# Install Python
sudo pacman -S python python-pip

# Install Xeepy
pip install xeepy

# Install browser
playwright install chromium

# Verify
xeepy --version
```

---

## Development Installation

For contributing or modifying Xeepy:

```bash
# Clone repository
git clone https://github.com/nirholas/Get-Tweet-Replies-With-Python-Tweepy.git
cd Get-Tweet-Replies-With-Python-Tweepy

# Create virtual environment
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# Install in development mode with all dependencies
pip install -e ".[dev,ai]"

# Install browser
playwright install chromium

# Install pre-commit hooks
pre-commit install

# Run tests
pytest

# Verify
xeepy --version
```

### Dev Dependencies

The `[dev]` extra includes:

- `pytest` - Testing framework
- `pytest-asyncio` - Async test support
- `pytest-cov` - Coverage reporting
- `black` - Code formatter
- `ruff` - Linter
- `pre-commit` - Git hooks
- `mypy` - Type checking

---

## Docker Installation

### Using Pre-built Image

```bash
# Pull image (when available)
docker pull nirholas/xeepy:latest

# Run with session volume
docker run -it -v ~/.xeepy:/root/.xeepy nirholas/xeepy
```

### Building Locally

```dockerfile
# Dockerfile
FROM mcr.microsoft.com/playwright/python:v1.40.0-jammy

WORKDIR /app

# Install Xeepy
COPY . .
RUN pip install .

# Install browser
RUN playwright install chromium

ENTRYPOINT ["xeepy"]
```

```bash
# Build
docker build -t xeepy .

# Run
docker run -it -v ~/.xeepy:/root/.xeepy xeepy --help
```

### Docker Compose

```yaml
# docker-compose.yml
version: '3.8'
services:
  xeepy:
    build: .
    volumes:
      - ~/.xeepy:/root/.xeepy
      - ./data:/app/data
    environment:
      - OPENAI_API_KEY=${OPENAI_API_KEY}
```

---

## Virtual Environment Setup

### Using venv (Recommended)

```bash
# Create environment
python -m venv xeepy-env

# Activate
# macOS/Linux:
source xeepy-env/bin/activate
# Windows:
xeepy-env\Scripts\activate

# Install
pip install xeepy
playwright install chromium

# Deactivate when done
deactivate
```

### Using conda

```bash
# Create environment
conda create -n xeepy python=3.11

# Activate
conda activate xeepy

# Install
pip install xeepy
playwright install chromium

# Deactivate
conda deactivate
```

### Using pipx (for CLI only)

```bash
# Install pipx if needed
pip install pipx

# Install Xeepy
pipx install xeepy

# Inject playwright
pipx inject xeepy playwright
playwright install chromium
```

---

## AI Features Installation

### OpenAI Integration

```bash
# Install with OpenAI support
pip install "xeepy[ai]"

# Or install openai separately
pip install openai

# Set API key
export OPENAI_API_KEY="sk-..."
```

### Anthropic Integration

```bash
# Install with AI support
pip install "xeepy[ai]"

# Or install anthropic separately
pip install anthropic

# Set API key
export ANTHROPIC_API_KEY="sk-ant-..."
```

### Local LLMs (Ollama)

```bash
# Install Ollama
curl https://ollama.ai/install.sh | sh

# Pull a model
ollama pull llama2

# Xeepy will auto-detect local Ollama
```

---

## Troubleshooting

### Browser Installation Failed

```bash
# Try with dependencies
playwright install-deps chromium
playwright install chromium

# Or use system chromium
pip install xeepy[chromium]
```

### Permission Denied

```bash
# Use user installation
pip install --user xeepy

# Or fix permissions
sudo chown -R $USER ~/.cache/ms-playwright
```

### SSL Certificate Errors

```bash
# Update certificates
pip install --upgrade certifi

# Or skip SSL verification (not recommended)
export PYTHONHTTPSVERIFY=0
```

### Module Not Found

```bash
# Ensure correct Python
which python
python --version

# Reinstall
pip uninstall xeepy
pip install xeepy
```

### Playwright Errors

```bash
# Update Playwright
pip install --upgrade playwright
playwright install chromium

# Check browser exists
ls ~/.cache/ms-playwright/
```

### Rate Limit Errors

Xeepy includes rate limiting. If you see rate limit errors:

1. Wait and retry
2. Check your configuration
3. Reduce operation frequency

---

## Verify Installation

```bash
# Check version
xeepy --version

# Run test command
xeepy --help

# Test Python import
python -c "from xeepy import Xeepy; print('OK')"
```

---

## Uninstallation

```bash
# Remove package
pip uninstall xeepy

# Remove browser (optional)
playwright uninstall chromium

# Remove configuration (optional)
rm -rf ~/.xeepy
```

---

## Next Steps

After installation:

1. [Quick Start Guide](QUICKSTART.md) - Get started in 5 minutes
2. [CLI Reference](CLI_REFERENCE.md) - Learn CLI commands
3. [Examples](EXAMPLES.md) - See code examples
4. [AI Features](AI_FEATURES.md) - Set up AI integration
