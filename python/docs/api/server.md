# APIServer

FastAPI-based REST API server for Xeepy.

## Import

```python
from xeepy.api.server import APIServer, create_app
```

## Class Signature

```python
class APIServer:
    def __init__(
        self,
        host: str = "0.0.0.0",
        port: int = 8000,
        cookies: Optional[Union[Dict, str]] = None,
        debug: bool = False
    )
```

## Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `host` | `str` | `"0.0.0.0"` | Server host |
| `port` | `int` | `8000` | Server port |
| `cookies` | `Optional[Union[Dict, str]]` | `None` | Auth cookies |
| `debug` | `bool` | `False` | Enable debug mode |

## Methods

| Method | Returns | Description |
|--------|---------|-------------|
| `start()` | `None` | Start the server |
| `stop()` | `None` | Stop the server |

## Factory Function

```python
def create_app(
    cookies: Optional[Union[Dict, str]] = None
) -> FastAPI
```

Create FastAPI application instance.

## API Endpoints

### Scraping

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/v1/profile/{username}` | GET | Get user profile |
| `/api/v1/tweets/{username}` | GET | Get user tweets |
| `/api/v1/followers/{username}` | GET | Get followers |
| `/api/v1/following/{username}` | GET | Get following |
| `/api/v1/replies/{tweet_id}` | GET | Get tweet replies |
| `/api/v1/search` | GET | Search tweets |

### Actions

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/v1/follow/{username}` | POST | Follow user |
| `/api/v1/unfollow/{username}` | POST | Unfollow user |
| `/api/v1/like/{tweet_id}` | POST | Like tweet |
| `/api/v1/retweet/{tweet_id}` | POST | Retweet |
| `/api/v1/tweet` | POST | Post tweet |

### Monitoring

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/v1/unfollowers` | GET | Get unfollower report |
| `/api/v1/analytics/{username}` | GET | Get analytics |

## Usage Examples

### Start Server

```python
from xeepy.api.server import APIServer

server = APIServer(
    host="0.0.0.0",
    port=8000,
    cookies="cookies.json"
)

server.start()
```

### CLI Start

```bash
xeepy api start --port 8000 --cookies cookies.json
```

### Create Custom App

```python
from xeepy.api.server import create_app
import uvicorn

app = create_app(cookies="cookies.json")

# Add custom routes
@app.get("/custom")
async def custom_endpoint():
    return {"message": "Custom endpoint"}

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
```

### API Client Examples

#### Get Profile

```bash
curl http://localhost:8000/api/v1/profile/elonmusk
```

```python
import httpx

async def get_profile(username: str):
    async with httpx.AsyncClient() as client:
        response = await client.get(
            f"http://localhost:8000/api/v1/profile/{username}"
        )
        return response.json()
```

Response:
```json
{
  "username": "elonmusk",
  "name": "Elon Musk",
  "bio": "...",
  "followers_count": 150000000,
  "following_count": 500,
  "tweet_count": 25000
}
```

#### Get Tweets

```bash
curl "http://localhost:8000/api/v1/tweets/elonmusk?limit=10"
```

```python
async def get_tweets(username: str, limit: int = 10):
    async with httpx.AsyncClient() as client:
        response = await client.get(
            f"http://localhost:8000/api/v1/tweets/{username}",
            params={"limit": limit}
        )
        return response.json()
```

#### Get Followers

```bash
curl "http://localhost:8000/api/v1/followers/username?limit=100"
```

#### Search Tweets

```bash
curl "http://localhost:8000/api/v1/search?q=python&limit=20"
```

```python
async def search_tweets(query: str, limit: int = 20):
    async with httpx.AsyncClient() as client:
        response = await client.get(
            "http://localhost:8000/api/v1/search",
            params={"q": query, "limit": limit}
        )
        return response.json()
```

#### Follow User

```bash
curl -X POST http://localhost:8000/api/v1/follow/username
```

```python
async def follow_user(username: str):
    async with httpx.AsyncClient() as client:
        response = await client.post(
            f"http://localhost:8000/api/v1/follow/{username}"
        )
        return response.json()
```

#### Post Tweet

```bash
curl -X POST http://localhost:8000/api/v1/tweet \
  -H "Content-Type: application/json" \
  -d '{"text": "Hello from Xeepy API!"}'
```

```python
async def post_tweet(text: str):
    async with httpx.AsyncClient() as client:
        response = await client.post(
            "http://localhost:8000/api/v1/tweet",
            json={"text": text}
        )
        return response.json()
```

#### Like Tweet

```bash
curl -X POST http://localhost:8000/api/v1/like/123456789
```

### Authentication

#### API Key Authentication

```python
from xeepy.api.server import create_app
from fastapi import Depends, HTTPException, Header

app = create_app(cookies="cookies.json")

API_KEY = "your-secret-api-key"

async def verify_api_key(x_api_key: str = Header(...)):
    if x_api_key != API_KEY:
        raise HTTPException(status_code=401, detail="Invalid API key")
    return x_api_key

# Protected endpoint
@app.get("/api/v1/protected")
async def protected_endpoint(api_key: str = Depends(verify_api_key)):
    return {"message": "Authenticated!"}
```

```bash
curl -H "X-API-Key: your-secret-api-key" \
  http://localhost:8000/api/v1/protected
```

### Rate Limiting

```python
from xeepy.api.server import create_app
from slowapi import Limiter
from slowapi.util import get_remote_address

limiter = Limiter(key_func=get_remote_address)
app = create_app(cookies="cookies.json")
app.state.limiter = limiter

@app.get("/api/v1/rate-limited")
@limiter.limit("10/minute")
async def rate_limited_endpoint():
    return {"message": "Rate limited endpoint"}
```

### Docker Deployment

```dockerfile
FROM python:3.10-slim

WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt

COPY . .

CMD ["uvicorn", "xeepy.api.server:create_app", "--host", "0.0.0.0", "--port", "8000"]
```

```bash
docker build -t xeepy-api .
docker run -p 8000:8000 -v ./cookies.json:/app/cookies.json xeepy-api
```

### OpenAPI Documentation

Access Swagger UI at: `http://localhost:8000/docs`

Access ReDoc at: `http://localhost:8000/redoc`

### Error Handling

```python
from xeepy.api.server import create_app
from fastapi import HTTPException

app = create_app(cookies="cookies.json")

@app.exception_handler(Exception)
async def global_exception_handler(request, exc):
    return JSONResponse(
        status_code=500,
        content={"error": str(exc)}
    )
```

### Health Check

```bash
curl http://localhost:8000/health
```

Response:
```json
{
  "status": "healthy",
  "version": "1.0.0"
}
```

### CORS Configuration

```python
from xeepy.api.server import create_app
from fastapi.middleware.cors import CORSMiddleware

app = create_app(cookies="cookies.json")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

### WebSocket Support

```python
from xeepy.api.server import create_app
from fastapi import WebSocket

app = create_app(cookies="cookies.json")

@app.websocket("/ws/tweets/{username}")
async def tweet_stream(websocket: WebSocket, username: str):
    await websocket.accept()
    
    # Stream new tweets
    while True:
        # Fetch new tweets
        # await websocket.send_json(tweet.to_dict())
        pass
```

## See Also

- [GraphQLClient](graphql.md) - GraphQL API
- [AuthManager](core/auth.md) - Authentication
- [Xeepy](core/xeepy.md) - Main class
