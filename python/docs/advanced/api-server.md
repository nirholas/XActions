# Running XTools as REST API Service

Deploy XTools as a FastAPI REST service for programmatic access to X/Twitter automation.

## Quick Start

```python
from fastapi import FastAPI, HTTPException, BackgroundTasks
from pydantic import BaseModel
from xtools import XTools

app = FastAPI(title="XTools API", version="1.0.0")
xtools_client = None

@app.on_event("startup")
async def startup():
    global xtools_client
    xtools_client = XTools(headless=True)
    await xtools_client.auth.load_cookies("session.json")

@app.on_event("shutdown")
async def shutdown():
    if xtools_client:
        await xtools_client.close()
```

## Scraping Endpoints

```python
class ScrapeRequest(BaseModel):
    url: str = None
    username: str = None
    limit: int = 100

@app.post("/api/scrape/replies")
async def scrape_replies(request: ScrapeRequest):
    """Scrape replies from a tweet."""
    try:
        replies = await xtools_client.scrape.replies(request.url, limit=request.limit)
        return {"status": "success", "data": replies, "count": len(replies)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/scrape/profile")
async def scrape_profile(request: ScrapeRequest):
    """Get user profile information."""
    profile = await xtools_client.scrape.profile(request.username)
    return {"status": "success", "data": profile.dict()}

@app.post("/api/scrape/followers")
async def scrape_followers(request: ScrapeRequest):
    """Get user's followers list."""
    followers = await xtools_client.scrape.followers(request.username, limit=request.limit)
    return {"status": "success", "data": followers}
```

!!! tip "Use Background Tasks for Long Operations"
    For operations that take longer than a few seconds, use FastAPI's BackgroundTasks.

## Action Endpoints

```python
class FollowRequest(BaseModel):
    username: str

class EngageRequest(BaseModel):
    tweet_url: str
    text: str = None

@app.post("/api/actions/follow")
async def follow_user(request: FollowRequest):
    """Follow a user."""
    await xtools_client.follow.user(request.username)
    return {"status": "success", "message": f"Followed @{request.username}"}

@app.post("/api/actions/like")
async def like_tweet(request: EngageRequest):
    """Like a tweet."""
    await xtools_client.engage.like(request.tweet_url)
    return {"status": "success", "message": "Tweet liked"}
```

## Background Jobs

```python
from uuid import uuid4
jobs = {}

@app.post("/api/jobs/unfollow-non-followers")
async def start_unfollow_job(background_tasks: BackgroundTasks):
    """Start background unfollow job."""
    job_id = str(uuid4())
    jobs[job_id] = {"status": "running", "result": None}
    background_tasks.add_task(run_unfollow_job, job_id)
    return {"job_id": job_id, "status": "started"}

async def run_unfollow_job(job_id: str):
    try:
        result = await xtools_client.unfollow.non_followers(max_unfollows=50)
        jobs[job_id] = {"status": "completed", "result": result}
    except Exception as e:
        jobs[job_id] = {"status": "failed", "result": str(e)}

@app.get("/api/jobs/{job_id}")
async def get_job_status(job_id: str):
    if job_id not in jobs:
        raise HTTPException(status_code=404, detail="Job not found")
    return jobs[job_id]
```

!!! warning "Authentication Required"
    Add API key authentication for production deployments:
    ```python
    from fastapi.security import APIKeyHeader
    api_key = APIKeyHeader(name="X-API-Key")
    ```

## Running the Server

```bash
# Development
uvicorn api:app --reload --port 8000

# Production with gunicorn
gunicorn api:app -w 4 -k uvicorn.workers.UvicornWorker -b 0.0.0.0:8000
```

## Docker Deployment

```dockerfile
FROM python:3.11-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt && playwright install chromium --with-deps
COPY . .
CMD ["uvicorn", "api:app", "--host", "0.0.0.0", "--port", "8000"]
```

!!! info "API Documentation"
    FastAPI auto-generates OpenAPI docs at `/docs` (Swagger UI) and `/redoc`.
