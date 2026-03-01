# Docker Deployment

Deploy XTools in containers for consistent, reproducible environments.

## Basic Dockerfile

```dockerfile
# Dockerfile
FROM python:3.11-slim

# Install system dependencies for Playwright
RUN apt-get update && apt-get install -y \
    wget \
    gnupg \
    && rm -rf /var/lib/apt/lists/*

# Install Playwright browsers
RUN pip install playwright && playwright install chromium --with-deps

# Set working directory
WORKDIR /app

# Copy requirements and install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Run as non-root user
RUN useradd -m xtools && chown -R xtools:xtools /app
USER xtools

# Default command
CMD ["python", "main.py"]
```

## Docker Compose Setup

```yaml
# docker-compose.yml
version: '3.8'

services:
  xtools:
    build: .
    environment:
      - XTOOLS_HEADLESS=true
      - REDIS_URL=redis://redis:6379
    volumes:
      - ./data:/app/data
      - ./cookies:/app/cookies
    depends_on:
      - redis
    
  redis:
    image: redis:7-alpine
    volumes:
      - redis_data:/data
    
  worker:
    build: .
    command: python worker.py
    environment:
      - XTOOLS_HEADLESS=true
      - REDIS_URL=redis://redis:6379
    deploy:
      replicas: 3
    depends_on:
      - redis

volumes:
  redis_data:
```

!!! info "Headless Mode"
    Always use headless mode in containers—there's no display available.

## Optimized Production Dockerfile

```dockerfile
# Dockerfile.prod
FROM python:3.11-slim as builder

WORKDIR /app
COPY requirements.txt .
RUN pip wheel --no-cache-dir --no-deps --wheel-dir /app/wheels -r requirements.txt

# Production image
FROM python:3.11-slim

# Install Playwright dependencies only
RUN apt-get update && apt-get install -y --no-install-recommends \
    libnss3 libnspr4 libatk1.0-0 libatk-bridge2.0-0 \
    libcups2 libdrm2 libxkbcommon0 libxcomposite1 \
    libxdamage1 libxfixes3 libxrandr2 libgbm1 libasound2 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy wheels and install
COPY --from=builder /app/wheels /wheels
RUN pip install --no-cache /wheels/*

# Install Playwright browsers
RUN playwright install chromium

# Copy application
COPY . .

# Security: non-root user
RUN useradd -m -u 1000 xtools && chown -R xtools:xtools /app
USER xtools

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD python -c "import xtools; print('healthy')" || exit 1

CMD ["python", "main.py"]
```

## Multi-Architecture Build

```bash
# Build for multiple architectures
docker buildx build --platform linux/amd64,linux/arm64 \
    -t myregistry/xtools:latest \
    --push .
```

## Environment Configuration

```python
# config.py
import os
from xtools import XTools

async def create_xtools():
    """Create XTools instance from environment."""
    return XTools(
        headless=os.getenv("XTOOLS_HEADLESS", "true").lower() == "true",
        proxy=os.getenv("XTOOLS_PROXY"),
        cookies_path=os.getenv("XTOOLS_COOKIES", "/app/cookies/session.json"),
    )

# main.py
async def main():
    async with await create_xtools() as x:
        await x.auth.load_cookies(os.getenv("XTOOLS_COOKIES"))
        # Your scraping logic here
```

## Kubernetes Deployment

```yaml
# k8s/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: xtools-worker
spec:
  replicas: 5
  selector:
    matchLabels:
      app: xtools-worker
  template:
    metadata:
      labels:
        app: xtools-worker
    spec:
      containers:
      - name: worker
        image: myregistry/xtools:latest
        resources:
          requests:
            memory: "512Mi"
            cpu: "250m"
          limits:
            memory: "1Gi"
            cpu: "500m"
        env:
        - name: REDIS_URL
          valueFrom:
            secretKeyRef:
              name: xtools-secrets
              key: redis-url
        volumeMounts:
        - name: cookies
          mountPath: /app/cookies
      volumes:
      - name: cookies
        secret:
          secretName: xtools-cookies
```

!!! warning "Resource Limits"
    Playwright/Chromium is memory-intensive. Allocate at least 512Mi per container.

## Docker Volume Management

```python
# Persist cookies and data across container restarts
async def setup_persistence():
    """Setup persistent storage in Docker."""
    from pathlib import Path
    
    data_dir = Path("/app/data")
    cookies_dir = Path("/app/cookies")
    
    data_dir.mkdir(exist_ok=True)
    cookies_dir.mkdir(exist_ok=True)
    
    async with XTools() as x:
        cookies_path = cookies_dir / "session.json"
        
        if cookies_path.exists():
            await x.auth.load_cookies(str(cookies_path))
        
        # Perform operations...
        
        # Save session for next run
        await x.auth.save_cookies(str(cookies_path))
```

## Logging Configuration

```python
# logging_config.py
import logging
import sys

def setup_docker_logging():
    """Configure logging for Docker (stdout/stderr)."""
    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
        handlers=[
            logging.StreamHandler(sys.stdout)
        ]
    )
    
    # JSON logging for log aggregation
    try:
        import json_logging
        json_logging.init_non_web()
    except ImportError:
        pass

setup_docker_logging()
```

## CI/CD Pipeline

```yaml
# .github/workflows/docker.yml
name: Docker Build

on:
  push:
    branches: [main]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Build and push
        uses: docker/build-push-action@v5
        with:
          context: .
          push: true
          tags: ghcr.io/${{ github.repository }}:latest
          cache-from: type=gha
          cache-to: type=gha,mode=max
```

## Health Checks and Monitoring

```python
# health.py
from fastapi import FastAPI
from xtools import XTools

app = FastAPI()

@app.get("/health")
async def health_check():
    """Docker health check endpoint."""
    try:
        async with XTools(headless=True) as x:
            # Quick connectivity test
            await x.browser.test_connection()
        return {"status": "healthy"}
    except Exception as e:
        return {"status": "unhealthy", "error": str(e)}

@app.get("/ready")
async def readiness_check():
    """Kubernetes readiness probe."""
    return {"status": "ready"}
```

!!! tip "Graceful Shutdown"
    Handle SIGTERM for clean browser shutdown in containers.
