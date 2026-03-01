"""
Xeepy REST API Server.

FastAPI-based REST API for Xeepy functionality.
"""

from __future__ import annotations

import os
from contextlib import asynccontextmanager
from datetime import datetime
from typing import Any

from fastapi import FastAPI, HTTPException, Depends, Security, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import APIKeyHeader
from pydantic import BaseModel, Field
from loguru import logger

# Import routers
from xeepy.api.routes import scrape, follow, engage, monitor, ai


class Settings:
    """API settings."""
    
    API_KEY: str = os.getenv("XEEPY_API_KEY", "")
    DEBUG: bool = os.getenv("XEEPY_DEBUG", "false").lower() == "true"
    RATE_LIMIT: int = int(os.getenv("XEEPY_RATE_LIMIT", "60"))
    CORS_ORIGINS: list[str] = os.getenv("XEEPY_CORS_ORIGINS", "*").split(",")


settings = Settings()

# API Key security
api_key_header = APIKeyHeader(name="X-API-Key", auto_error=False)


async def verify_api_key(api_key: str | None = Security(api_key_header)) -> str:
    """Verify API key if configured."""
    if not settings.API_KEY:
        # No API key configured, allow all requests
        return "anonymous"
    
    if api_key and api_key == settings.API_KEY:
        return api_key
    
    raise HTTPException(
        status_code=403,
        detail="Invalid or missing API key",
    )


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifespan context manager for startup/shutdown."""
    logger.info("Xeepy API starting up...")
    yield
    logger.info("Xeepy API shutting down...")


def create_app() -> FastAPI:
    """Create and configure the FastAPI application."""
    
    app = FastAPI(
        title="Xeepy API",
        description="""
# Xeepy - X/Twitter Automation Toolkit API

⚠️ **EDUCATIONAL PURPOSES ONLY** - Do not run against X/Twitter.

This API provides programmatic access to Xeepy functionality including:

- **Scraping**: Profile, followers, tweets, replies, threads
- **Follow/Unfollow**: Smart operations with filters
- **Engagement**: Auto-like, auto-comment, retweet
- **Monitoring**: Unfollower detection, growth tracking
- **AI Features**: Content generation, sentiment analysis, spam detection
        """,
        version="0.1.0",
        lifespan=lifespan,
        docs_url="/docs",
        redoc_url="/redoc",
    )
    
    # CORS middleware
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.CORS_ORIGINS,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    
    # Include routers
    app.include_router(scrape.router, prefix="/api/v1/scrape", tags=["Scraping"])
    app.include_router(follow.router, prefix="/api/v1/follow", tags=["Follow"])
    app.include_router(engage.router, prefix="/api/v1/engage", tags=["Engagement"])
    app.include_router(monitor.router, prefix="/api/v1/monitor", tags=["Monitoring"])
    app.include_router(ai.router, prefix="/api/v1/ai", tags=["AI Features"])
    
    return app


# Response models
class HealthResponse(BaseModel):
    """Health check response."""
    status: str = Field(description="API status")
    version: str = Field(description="API version")
    timestamp: datetime = Field(description="Current timestamp")


class StatusResponse(BaseModel):
    """Status response."""
    authenticated: bool = Field(description="Whether request is authenticated")
    features: list[str] = Field(description="Available features")
    rate_limit: int = Field(description="Rate limit per minute")


# Create app instance
app = create_app()


@app.get("/", response_model=HealthResponse)
async def root():
    """Health check endpoint."""
    return HealthResponse(
        status="healthy",
        version="0.1.0",
        timestamp=datetime.utcnow(),
    )


@app.get("/health", response_model=HealthResponse)
async def health_check():
    """Health check endpoint."""
    return HealthResponse(
        status="healthy",
        version="0.1.0",
        timestamp=datetime.utcnow(),
    )


@app.get("/status", response_model=StatusResponse)
async def status(api_key: str = Depends(verify_api_key)):
    """Get API status and available features."""
    return StatusResponse(
        authenticated=api_key != "anonymous",
        features=[
            "scrape",
            "follow",
            "unfollow",
            "engage",
            "monitor",
            "ai",
        ],
        rate_limit=settings.RATE_LIMIT,
    )


def run_server(
    host: str = "0.0.0.0",
    port: int = 8000,
    reload: bool = False,
) -> None:
    """Run the API server."""
    import uvicorn
    
    uvicorn.run(
        "xeepy.api.server:app",
        host=host,
        port=port,
        reload=reload,
    )


if __name__ == "__main__":
    run_server(reload=True)
