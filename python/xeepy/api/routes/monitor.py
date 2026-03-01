"""
Monitoring API routes.
"""

from __future__ import annotations

from datetime import datetime
from typing import Any

from fastapi import APIRouter, HTTPException, Query, BackgroundTasks
from pydantic import BaseModel, Field

router = APIRouter()


# Response models
class UnfollowerReport(BaseModel):
    """Unfollower report."""
    snapshot_date: datetime
    current_followers: int
    previous_followers: int
    new_followers: int
    unfollowers: list[dict[str, Any]]
    net_change: int


class GrowthReport(BaseModel):
    """Growth report."""
    period: str
    followers_start: int
    followers_end: int
    followers_change: int
    followers_change_pct: float
    engagement: dict[str, float]
    best_posting_times: list[str]


class AccountStats(BaseModel):
    """Account statistics."""
    username: str
    followers: int
    following: int
    tweets: int
    changes_24h: dict[str, int]
    changes_7d: dict[str, int]


class MentionResponse(BaseModel):
    """Mention response."""
    id: str
    author: str
    text: str
    created_at: datetime


class KeywordMonitor(BaseModel):
    """Keyword monitoring response."""
    keyword: str
    mentions_1h: int
    mentions_24h: int
    sentiment: str | None = None
    trending: bool = False


class AlertConfig(BaseModel):
    """Alert configuration."""
    alert_type: str = Field(description="Type of alert")
    enabled: bool = Field(default=True)
    threshold: int | None = Field(default=None)
    webhook_url: str | None = Field(default=None)


# Unfollower monitoring
@router.get("/unfollowers", response_model=UnfollowerReport)
async def get_unfollowers(
    compare_snapshot: str | None = Query(default=None, description="Snapshot ID to compare with"),
):
    """
    Get unfollower report.
    
    Compares current followers with previous snapshot.
    """
    # Placeholder
    return UnfollowerReport(
        snapshot_date=datetime.utcnow(),
        current_followers=10000,
        previous_followers=10050,
        new_followers=20,
        unfollowers=[
            {"username": f"unfollower_{i}", "unfollowed_at": datetime.utcnow().isoformat()}
            for i in range(5)
        ],
        net_change=-30,
    )


@router.post("/unfollowers/snapshot")
async def create_follower_snapshot():
    """Create a new follower snapshot for comparison."""
    import uuid
    
    return {
        "snapshot_id": str(uuid.uuid4()),
        "created_at": datetime.utcnow(),
        "follower_count": 10000,
        "message": "Snapshot created successfully",
    }


@router.get("/unfollowers/snapshots")
async def list_snapshots(
    limit: int = Query(default=10, ge=1, le=50),
):
    """List available follower snapshots."""
    return {
        "snapshots": [
            {
                "id": f"snapshot_{i}",
                "created_at": datetime.utcnow().isoformat(),
                "follower_count": 10000 - i * 10,
            }
            for i in range(min(limit, 5))
        ]
    }


# Growth analytics
@router.get("/growth", response_model=GrowthReport)
async def get_growth_report(
    period: str = Query(default="7d", description="Period: 1d, 7d, 30d"),
):
    """
    Get account growth report.
    
    Shows follower growth, engagement trends, and insights.
    """
    # Placeholder
    return GrowthReport(
        period=period,
        followers_start=9500,
        followers_end=10000,
        followers_change=500,
        followers_change_pct=5.26,
        engagement={
            "avg_likes": 50,
            "avg_retweets": 10,
            "avg_replies": 5,
            "engagement_rate": 2.5,
        },
        best_posting_times=["9am", "12pm", "6pm"],
    )


# Account monitoring
@router.get("/account/{username}", response_model=AccountStats)
async def get_account_stats(username: str):
    """Get statistics for a monitored account."""
    # Placeholder
    return AccountStats(
        username=username,
        followers=100000,
        following=500,
        tweets=5000,
        changes_24h={"followers": 150, "following": 5, "tweets": 10},
        changes_7d={"followers": 800, "following": 20, "tweets": 50},
    )


@router.post("/account/{username}/track")
async def track_account(
    username: str,
    interval_minutes: int = Query(default=60, ge=15, le=1440),
):
    """Add an account to tracking."""
    return {
        "username": username,
        "tracking": True,
        "interval_minutes": interval_minutes,
        "message": f"Now tracking @{username}",
    }


@router.delete("/account/{username}/track")
async def untrack_account(username: str):
    """Remove an account from tracking."""
    return {
        "username": username,
        "tracking": False,
        "message": f"Stopped tracking @{username}",
    }


@router.get("/accounts/tracked")
async def list_tracked_accounts():
    """List all tracked accounts."""
    return {
        "accounts": [
            {"username": f"tracked_{i}", "interval_minutes": 60}
            for i in range(3)
        ]
    }


# Keyword monitoring
@router.get("/keywords", response_model=list[KeywordMonitor])
async def get_keyword_stats(
    keywords: list[str] = Query(description="Keywords to check"),
):
    """Get statistics for monitored keywords."""
    # Placeholder
    return [
        KeywordMonitor(
            keyword=kw,
            mentions_1h=5 + i * 2,
            mentions_24h=100 + i * 50,
            sentiment="positive" if i % 2 == 0 else "neutral",
            trending=i == 0,
        )
        for i, kw in enumerate(keywords)
    ]


class KeywordMonitorRequest(BaseModel):
    """Keyword monitor request."""
    keywords: list[str]
    alert_threshold: int = Field(default=10, ge=1)
    include_sentiment: bool = Field(default=True)


@router.post("/keywords/monitor")
async def start_keyword_monitoring(
    request: KeywordMonitorRequest,
    background_tasks: BackgroundTasks,
):
    """Start monitoring keywords."""
    import uuid
    
    return {
        "monitor_id": str(uuid.uuid4()),
        "keywords": request.keywords,
        "status": "active",
        "alert_threshold": request.alert_threshold,
    }


# Mentions monitoring
@router.get("/mentions", response_model=list[MentionResponse])
async def get_mentions(
    limit: int = Query(default=20, ge=1, le=100),
    since: datetime | None = Query(default=None),
):
    """Get recent mentions."""
    # Placeholder
    return [
        MentionResponse(
            id=f"mention_{i}",
            author=f"user_{i}",
            text=f"Hey @you, this is mention {i}",
            created_at=datetime.utcnow(),
        )
        for i in range(min(limit, 10))
    ]


# Alerts configuration
@router.get("/alerts")
async def get_alert_configs():
    """Get current alert configurations."""
    return {
        "alerts": [
            {
                "type": "unfollower",
                "enabled": True,
                "threshold": 5,
            },
            {
                "type": "mention_spike",
                "enabled": True,
                "threshold": 10,
            },
            {
                "type": "new_follower",
                "enabled": False,
                "min_followers": 1000,
            },
        ]
    }


@router.post("/alerts")
async def configure_alert(config: AlertConfig):
    """Configure an alert."""
    return {
        "success": True,
        "alert": config.model_dump(),
        "message": f"Alert '{config.alert_type}' configured",
    }


@router.delete("/alerts/{alert_type}")
async def delete_alert(alert_type: str):
    """Delete an alert configuration."""
    return {
        "success": True,
        "message": f"Alert '{alert_type}' removed",
    }


# Webhook configuration
@router.post("/webhooks")
async def configure_webhook(
    url: str,
    events: list[str] = Query(default=["unfollower", "mention"]),
):
    """Configure a webhook for notifications."""
    import uuid
    
    return {
        "webhook_id": str(uuid.uuid4()),
        "url": url,
        "events": events,
        "status": "active",
    }


@router.get("/webhooks")
async def list_webhooks():
    """List configured webhooks."""
    return {
        "webhooks": [
            {
                "id": "webhook_1",
                "url": "https://example.com/webhook",
                "events": ["unfollower", "mention"],
                "status": "active",
            }
        ]
    }
