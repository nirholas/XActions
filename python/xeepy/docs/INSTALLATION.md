# Xeepy Installation Guide

## Requirements

- Python 3.10 or higher
- pip package manager
- Optional: An AI provider API key (OpenAI or Anthropic)

## Quick Install

### From Source

```bash
# Clone the repository
git clone https://github.com/yourusername/xeepy.git
cd xeepy

# Create a virtual environment (recommended)
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install the package
pip install -e .
```

### From PyPI (when published)

```bash
pip install xeepy
```

## Installation Options

### Basic Installation

Includes CLI and core functionality:

```bash
pip install -e .
```

### With AI Features

```bash
pip install -e ".[ai]"
```

This installs:
- `openai` - OpenAI/GPT integration
- `anthropic` - Claude integration

### With API Server

```bash
pip install -e ".[api]"
```

This installs:
- `fastapi` - REST API framework
- `uvicorn` - ASGI server

### Full Installation

```bash
pip install -e ".[all]"
```

Includes all optional dependencies.

## Dependencies

### Core Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| click | >=8.0 | CLI framework |
| rich | >=13.0 | Terminal formatting |
| pydantic | >=2.0 | Data validation |
| pydantic-settings | >=2.0 | Configuration |
| loguru | >=0.7 | Logging |
| pyyaml | >=6.0 | YAML configuration |
| httpx | >=0.25 | HTTP client |

### Optional Dependencies

| Package | Version | Group | Purpose |
|---------|---------|-------|---------|
| openai | >=1.0 | ai | OpenAI API |
| anthropic | >=0.7 | ai | Anthropic API |
| fastapi | >=0.100 | api | REST API |
| uvicorn | >=0.23 | api | ASGI server |
| vaderSentiment | >=3.3 | ai | Fallback sentiment |

## Configuration

After installation, set up your configuration:

### 1. Create Configuration File

```bash
xeepy init
```

This creates `config.yaml` with default settings.

### 2. Set Environment Variables

For AI features, set your API key:

```bash
# For OpenAI
export OPENAI_API_KEY=sk-your-key-here

# For Anthropic
export ANTHROPIC_API_KEY=sk-ant-your-key-here
```

You can also create a `.env` file:

```env
OPENAI_API_KEY=sk-your-key-here
ANTHROPIC_API_KEY=sk-ant-your-key-here
XEEPY_DEBUG=false
```

### 3. Verify Installation

```bash
# Check CLI is working
xeepy --version

# Check status
xeepy status

# Test AI (requires API key)
xeepy ai sentiment "Hello world"
```

## Platform-Specific Notes

### Linux

No special requirements. Install Python 3.10+ from your package manager:

```bash
# Ubuntu/Debian
sudo apt update
sudo apt install python3.10 python3.10-venv python3-pip

# Fedora
sudo dnf install python3.10
```

### macOS

Install Python via Homebrew:

```bash
brew install python@3.10
```

### Windows

1. Download Python 3.10+ from [python.org](https://python.org)
2. During installation, check "Add Python to PATH"
3. Open PowerShell or Command Prompt:

```powershell
pip install -e .
```

## Docker Installation

```dockerfile
FROM python:3.11-slim

WORKDIR /app
COPY . .

RUN pip install -e ".[all]"

# For CLI
CMD ["xeepy", "--help"]

# For API server
# CMD ["uvicorn", "xeepy.api.server:app", "--host", "0.0.0.0"]
```

Build and run:

```bash
docker build -t xeepy .
docker run -it xeepy xeepy --help
```

## Troubleshooting

### ModuleNotFoundError

Ensure you've installed the package:

```bash
pip install -e .
```

### API Key Errors

Verify your API key is set:

```bash
echo $OPENAI_API_KEY  # Should show your key
```

### Permission Errors

On Linux/macOS, you may need:

```bash
pip install --user -e .
```

Or use a virtual environment (recommended).

### SSL Errors

Update certificates:

```bash
pip install --upgrade certifi
```

## Updating

```bash
# Pull latest code
git pull origin main

# Reinstall
pip install -e .
```

## Uninstalling

```bash
pip uninstall xeepy
```

## Next Steps

- Read the [CLI Reference](CLI_REFERENCE.md)
- Check out [Examples](EXAMPLES.md)
- Configure your [settings](CONFIGURATION.md)
