# Distributed Scraping

Scale XTools across multiple machines for high-volume data collection.

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                      Coordinator                             │
│  ┌─────────────┐  ┌──────────────┐  ┌───────────────────┐   │
│  │ Task Queue  │  │   Results    │  │   Worker Manager  │   │
│  │   (Redis)   │  │   Storage    │  │                   │   │
│  └─────────────┘  └──────────────┘  └───────────────────┘   │
└────────────────────────┬────────────────────────────────────┘
                         │
         ┌───────────────┼───────────────┐
         │               │               │
    ┌────┴────┐    ┌────┴────┐    ┌────┴────┐
    │ Worker 1│    │ Worker 2│    │ Worker 3│
    │ (XTools)│    │ (XTools)│    │ (XTools)│
    └─────────┘    └─────────┘    └─────────┘
```

## Task Queue Setup

Use Redis for distributed task coordination:

```python
from xtools.distributed import TaskQueue, Task
import redis.asyncio as redis

# Initialize task queue
async def setup_queue():
    redis_client = await redis.from_url("redis://localhost:6379")
    queue = TaskQueue(redis_client, name="xtools-tasks")
    return queue

# Producer: Add tasks to queue
async def enqueue_tasks():
    queue = await setup_queue()
    
    usernames = ["user1", "user2", "user3", ...]
    
    for username in usernames:
        task = Task(
            type="scrape_followers",
            payload={"username": username, "limit": 1000},
            priority=1
        )
        await queue.enqueue(task)
    
    print(f"Enqueued {len(usernames)} tasks")
```

## Worker Implementation

```python
from xtools import XTools
from xtools.distributed import Worker, TaskQueue

class ScraperWorker(Worker):
    """Distributed scraping worker."""
    
    def __init__(self, worker_id: str, queue: TaskQueue):
        self.worker_id = worker_id
        self.queue = queue
        self.xtools = None
    
    async def start(self):
        """Start processing tasks."""
        self.xtools = await XTools().__aenter__()
        
        while True:
            task = await self.queue.dequeue()
            if task:
                await self.process_task(task)
    
    async def process_task(self, task):
        """Process a single task."""
        try:
            if task.type == "scrape_followers":
                result = await self.xtools.scrape.followers(
                    task.payload["username"],
                    limit=task.payload["limit"]
                )
                await self.queue.complete(task, result)
                
            elif task.type == "scrape_profile":
                result = await self.xtools.scrape.profile(
                    task.payload["username"]
                )
                await self.queue.complete(task, result)
                
        except Exception as e:
            await self.queue.fail(task, str(e))
    
    async def stop(self):
        if self.xtools:
            await self.xtools.__aexit__(None, None, None)

# Run worker
async def run_worker(worker_id: str):
    queue = await setup_queue()
    worker = ScraperWorker(worker_id, queue)
    await worker.start()
```

!!! info "Worker Scaling"
    Run multiple workers on different machines with unique worker IDs.

## Coordinator Service

```python
from xtools.distributed import Coordinator
import asyncio

class ScrapingCoordinator(Coordinator):
    """Manages distributed scraping tasks."""
    
    def __init__(self, queue: TaskQueue):
        self.queue = queue
        self.results = {}
    
    async def scrape_many_profiles(self, usernames: list):
        """Distribute profile scraping across workers."""
        # Enqueue all tasks
        task_ids = []
        for username in usernames:
            task = Task(
                type="scrape_profile",
                payload={"username": username}
            )
            task_id = await self.queue.enqueue(task)
            task_ids.append(task_id)
        
        # Wait for all results
        results = await self.queue.wait_for_results(task_ids)
        return results
    
    async def monitor_progress(self):
        """Monitor worker progress."""
        while True:
            stats = await self.queue.get_stats()
            print(f"Pending: {stats['pending']}")
            print(f"Processing: {stats['processing']}")
            print(f"Completed: {stats['completed']}")
            print(f"Failed: {stats['failed']}")
            await asyncio.sleep(5)
```

## Result Aggregation

```python
from xtools.distributed import ResultStore
from xtools.storage import Database

class DistributedResultStore(ResultStore):
    """Store and aggregate results from workers."""
    
    def __init__(self, db_url: str):
        self.db = Database(db_url)
    
    async def store(self, task_id: str, result: dict):
        """Store result from worker."""
        await self.db.insert("results", {
            "task_id": task_id,
            "data": result,
            "timestamp": datetime.now()
        })
    
    async def aggregate(self, task_type: str):
        """Aggregate all results of a task type."""
        results = await self.db.query(
            "SELECT * FROM results WHERE task_type = ?",
            [task_type]
        )
        return [r["data"] for r in results]
```

## Configuration

```yaml
# distributed.yaml
coordinator:
  host: 0.0.0.0
  port: 8000

redis:
  url: redis://redis:6379
  
workers:
  count: 5
  per_machine: 2
  
queue:
  name: xtools-tasks
  max_retries: 3
  retry_delay: 60
  
storage:
  type: postgresql
  url: postgresql://user:pass@db:5432/xtools
```

```python
from xtools.distributed import load_config, start_cluster

config = load_config("distributed.yaml")

# Start coordinator
await start_cluster(config, role="coordinator")

# Start worker (on different machine)
await start_cluster(config, role="worker")
```

## Load Balancing

```python
from xtools.distributed import LoadBalancer

balancer = LoadBalancer(
    strategy="least_loaded",  # or "round_robin", "random"
    health_check_interval=30
)

# Register workers
balancer.register_worker("worker-1", "http://worker1:8000")
balancer.register_worker("worker-2", "http://worker2:8000")

# Distribute tasks
async def distribute_task(task):
    worker = await balancer.get_worker()
    await worker.submit(task)
```

!!! warning "Network Partitions"
    Handle network failures gracefully with retries and task reassignment.

## Monitoring Dashboard

```python
from xtools.distributed import Dashboard
from fastapi import FastAPI

app = FastAPI()
dashboard = Dashboard(queue, result_store)

@app.get("/stats")
async def get_stats():
    return {
        "workers": await dashboard.worker_stats(),
        "tasks": await dashboard.task_stats(),
        "throughput": await dashboard.throughput_stats()
    }

@app.get("/workers")
async def list_workers():
    return await dashboard.list_workers()

# Run: uvicorn dashboard:app --host 0.0.0.0 --port 8080
```

## Fault Tolerance

```python
from xtools.distributed import FaultTolerantQueue

queue = FaultTolerantQueue(
    redis_url="redis://localhost:6379",
    max_retries=3,
    retry_backoff="exponential",
    dead_letter_queue="xtools-dlq"
)

# Failed tasks go to dead letter queue after max retries
async def process_dead_letters():
    dlq = await queue.get_dead_letters()
    for task in dlq:
        print(f"Failed task: {task.id}, Error: {task.error}")
        # Manual intervention or different processing
```

!!! tip "Idempotency"
    Design tasks to be idempotent—safe to retry without side effects.
