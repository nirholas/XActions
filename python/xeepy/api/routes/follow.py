"""
Follow/Unfollow API routes.
"""

from __future__ import annotations

from datetime import datetime
from typing import Any

from fastapi import APIRouter, HTTPException, Query, BackgroundTasks
from pydantic import BaseModel, Field

router = APIRouter()


# Request/Response models
class FollowRequest(BaseModel):
    """Follow request."""
    username: str = Field(description="Username to follow")


class FollowResponse(BaseModel):
    """Follow response."""
    success: bool
    username: str
    message: str


class BulkFollowRequest(BaseModel):
    """Bulk follow request."""
    usernames: list[str] = Field(description="List of usernames to follow")
    delay_seconds: float = Field(default=2.0, ge=0, le=60)


class FollowByKeywordRequest(BaseModel):
    """Follow by keyword request."""
    keywords: list[str] = Field(description="Keywords to search for")
    max_follows: int = Field(default=50, ge=1, le=500)
    min_followers: int = Field(default=100, ge=0)
    max_followers: int = Field(default=100000, ge=0)
    verified_only: bool = Field(default=False)


class FollowersOfRequest(BaseModel):
    """Follow followers of account request."""
    username: str = Field(description="Account whose followers to follow")
    max_follows: int = Field(default=100, ge=1, le=500)
    min_followers: int = Field(default=50, ge=0)
    skip_private: bool = Field(default=True)


class UnfollowRequest(BaseModel):
    """Unfollow request."""
    username: str = Field(description="Username to unfollow")


class UnfollowNonFollowersRequest(BaseModel):
    """Unfollow non-followers request."""
    max_unfollows: int = Field(default=100, ge=1, le=500)
    whitelist: list[str] = Field(default_factory=list)
    min_days_following: int = Field(default=7, ge=0)


class UnfollowInactiveRequest(BaseModel):
    """Unfollow inactive users request."""
    days_inactive: int = Field(default=90, ge=30)
    max_unfollows: int = Field(default=100, ge=1, le=500)
    whitelist: list[str] = Field(default_factory=list)


class SmartUnfollowRequest(BaseModel):
    """Smart unfollow request."""
    preserve_engagement: bool = Field(default=True)
    preserve_recent_days: int = Field(default=30)
    target_ratio: float | None = Field(default=None)
    max_unfollows: int = Field(default=50, ge=1, le=200)


class JobResponse(BaseModel):
    """Background job response."""
    job_id: str
    status: str
    action: str
    target_count: int
    created_at: datetime


class FollowStats(BaseModel):
    """Follow statistics."""
    total_following: int
    total_followers: int
    ratio: float
    non_followers: int
    inactive_following: int


# Follow endpoints
@router.post("/user", response_model=FollowResponse)
async def follow_user(request: FollowRequest):
    """
    Follow a specific user.
    
    - **username**: Username to follow (without @)
    """
    # Placeholder
    return FollowResponse(
        success=True,
        username=request.username,
        message=f"Successfully followed @{request.username}",
    )


@router.post("/bulk", response_model=JobResponse)
async def bulk_follow(
    request: BulkFollowRequest,
    background_tasks: BackgroundTasks,
):
    """
    Follow multiple users.
    
    Runs as a background job with configurable delay between follows.
    """
    import uuid
    
    job_id = str(uuid.uuid4())
    
    return JobResponse(
        job_id=job_id,
        status="pending",
        action="bulk_follow",
        target_count=len(request.usernames),
        created_at=datetime.utcnow(),
    )


@router.post("/by-keyword", response_model=JobResponse)
async def follow_by_keyword(
    request: FollowByKeywordRequest,
    background_tasks: BackgroundTasks,
):
    """
    Follow users who tweet about specific keywords.
    
    Searches for tweets with keywords and follows the authors.
    """
    import uuid
    
    job_id = str(uuid.uuid4())
    
    return JobResponse(
        job_id=job_id,
        status="pending",
        action="follow_by_keyword",
        target_count=request.max_follows,
        created_at=datetime.utcnow(),
    )


@router.post("/followers-of", response_model=JobResponse)
async def follow_followers_of(
    request: FollowersOfRequest,
    background_tasks: BackgroundTasks,
):
    """
    Follow the followers of a target account.
    
    Useful for targeting a competitor's audience.
    """
    import uuid
    
    job_id = str(uuid.uuid4())
    
    return JobResponse(
        job_id=job_id,
        status="pending",
        action="follow_followers_of",
        target_count=request.max_follows,
        created_at=datetime.utcnow(),
    )


# Unfollow endpoints
@router.delete("/user", response_model=FollowResponse)
async def unfollow_user(request: UnfollowRequest):
    """
    Unfollow a specific user.
    
    - **username**: Username to unfollow
    """
    # Placeholder
    return FollowResponse(
        success=True,
        username=request.username,
        message=f"Successfully unfollowed @{request.username}",
    )


@router.post("/unfollow/non-followers", response_model=JobResponse)
async def unfollow_non_followers(
    request: UnfollowNonFollowersRequest,
    background_tasks: BackgroundTasks,
):
    """
    Unfollow users who don't follow you back.
    
    Respects whitelist and minimum following duration.
    """
    import uuid
    
    job_id = str(uuid.uuid4())
    
    return JobResponse(
        job_id=job_id,
        status="pending",
        action="unfollow_non_followers",
        target_count=request.max_unfollows,
        created_at=datetime.utcnow(),
    )


@router.post("/unfollow/inactive", response_model=JobResponse)
async def unfollow_inactive(
    request: UnfollowInactiveRequest,
    background_tasks: BackgroundTasks,
):
    """
    Unfollow users who haven't been active.
    
    - **days_inactive**: Minimum days since last tweet
    """
    import uuid
    
    job_id = str(uuid.uuid4())
    
    return JobResponse(
        job_id=job_id,
        status="pending",
        action="unfollow_inactive",
        target_count=request.max_unfollows,
        created_at=datetime.utcnow(),
    )


@router.post("/unfollow/smart", response_model=JobResponse)
async def smart_unfollow(
    request: SmartUnfollowRequest,
    background_tasks: BackgroundTasks,
):
    """
    Intelligently unfollow to optimize your account.
    
    Uses smart criteria while preserving valuable connections.
    """
    import uuid
    
    job_id = str(uuid.uuid4())
    
    return JobResponse(
        job_id=job_id,
        status="pending",
        action="smart_unfollow",
        target_count=request.max_unfollows,
        created_at=datetime.utcnow(),
    )


# Analysis endpoints
@router.get("/stats", response_model=FollowStats)
async def get_follow_stats():
    """Get follow/unfollow statistics."""
    # Placeholder
    return FollowStats(
        total_following=1500,
        total_followers=1000,
        ratio=1.5,
        non_followers=800,
        inactive_following=200,
    )


@router.get("/non-followers")
async def get_non_followers(
    limit: int = Query(default=100, ge=1, le=500),
    offset: int = Query(default=0, ge=0),
):
    """Get list of users who don't follow you back."""
    # Placeholder
    return {
        "data": [
            {"username": f"non_follower_{i}", "followed_at": "2024-01-01"}
            for i in range(min(limit, 20))
        ],
        "total": 800,
        "limit": limit,
        "offset": offset,
    }


@router.get("/jobs/{job_id}")
async def get_job_status(job_id: str):
    """Get status of a follow/unfollow job."""
    # Placeholder
    return {
        "job_id": job_id,
        "status": "completed",
        "action": "bulk_follow",
        "progress": {
            "completed": 50,
            "total": 50,
            "failed": 2,
        },
        "results": {
            "followed": 48,
            "already_following": 0,
            "failed": 2,
        },
    }
