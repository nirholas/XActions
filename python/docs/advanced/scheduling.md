# Task Scheduling and Automation

Schedule XTools tasks for automated execution with precise timing control.

## Basic Scheduling with APScheduler

```python
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger
from xtools import XTools

scheduler = AsyncIOScheduler()

async def check_unfollowers():
    """Scheduled task to check unfollowers."""
    async with XTools() as x:
        await x.auth.load_cookies("session.json")
        report = await x.monitor.unfollowers()
        if report.unfollowers:
            print(f"New unfollowers: {[u.username for u in report.unfollowers]}")

scheduler.add_job(check_unfollowers, CronTrigger(hour="*/6"), id="unfollower_check")
scheduler.start()
```

!!! tip "Install APScheduler"
    ```bash
    pip install apscheduler
    ```

## Scheduling Tweet Posts

```python
from datetime import datetime, timedelta

async def schedule_tweet(text: str, scheduled_time: datetime):
    """Schedule a tweet for future posting."""
    async with XTools() as x:
        await x.auth.load_cookies("session.json")
        await x.schedule.tweet(text, scheduled_time)

async def schedule_content_calendar():
    tweets = [
        ("Good morning! ☀️", datetime.now() + timedelta(hours=8)),
        ("Lunch break thoughts 🍕", datetime.now() + timedelta(hours=12)),
        ("Evening reflection 🌙", datetime.now() + timedelta(hours=20)),
    ]
    for text, time in tweets:
        await schedule_tweet(text, time)
```

## Recurring Engagement Jobs

```python
import random

async def auto_engage_job():
    """Automated engagement with keyword-based content."""
    async with XTools() as x:
        await x.auth.load_cookies("session.json")
        keywords = ["#Python", "#AsyncIO", "#WebDev"]
        keyword = random.choice(keywords)
        await x.engage.auto_like(keywords=[keyword], limit=10, delay_range=(5, 15))

for hour in [9, 14, 20]:
    scheduler.add_job(
        auto_engage_job,
        CronTrigger(hour=hour, minute=random.randint(0, 59)),
        id=f"engage_{hour}"
    )
```

!!! warning "Vary Scheduling Times"
    Predictable automation patterns can trigger detection. Add randomization to schedules.

## Job Queue with Redis

```python
from redis import asyncio as aioredis
import json
from datetime import datetime

class JobQueue:
    def __init__(self, redis_url: str = "redis://localhost"):
        self.redis = aioredis.from_url(redis_url)
        self.queue_name = "xtools:jobs"
    
    async def enqueue(self, job_type: str, params: dict):
        job = {"type": job_type, "params": params, "created_at": datetime.now().isoformat()}
        await self.redis.rpush(self.queue_name, json.dumps(job))
    
    async def process_jobs(self):
        while True:
            job_data = await self.redis.blpop(self.queue_name, timeout=5)
            if job_data:
                job = json.loads(job_data[1])
                await self.execute_job(job)
    
    async def execute_job(self, job: dict):
        async with XTools() as x:
            await x.auth.load_cookies("session.json")
            if job["type"] == "follow":
                await x.follow.user(job["params"]["username"])
            elif job["type"] == "like":
                await x.engage.like(job["params"]["url"])
```

## Time-Window Operations

```python
from datetime import time

def is_active_hours() -> bool:
    now = datetime.now().time()
    return time(8, 0) <= now <= time(22, 0)

async def smart_scheduler():
    async with XTools() as x:
        await x.auth.load_cookies("session.json")
        while True:
            if is_active_hours():
                await x.engage.auto_like(keywords=["#tech"], limit=5)
                await asyncio.sleep(1800)
            else:
                await asyncio.sleep(3600)
```

!!! info "Respect User Time Zones"
    When scheduling engagement, consider your target audience's active hours.

## Graceful Shutdown

```python
import signal
import asyncio

async def main():
    scheduler = AsyncIOScheduler()
    scheduler.add_job(check_unfollowers, CronTrigger(hour="*/6"))
    scheduler.start()
    
    loop = asyncio.get_event_loop()
    for sig in (signal.SIGTERM, signal.SIGINT):
        loop.add_signal_handler(sig, lambda: asyncio.create_task(shutdown(scheduler)))
    
    await asyncio.Event().wait()

async def shutdown(scheduler):
    scheduler.shutdown(wait=True)
    print("Scheduler stopped gracefully")
```
