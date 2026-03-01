# Webhooks and Event-Driven Integrations

Build event-driven automation with XTools webhooks and real-time notifications.

## Webhook Server Setup

Create a FastAPI webhook receiver for XTools events:

```python
from fastapi import FastAPI, Request, HTTPException
from pydantic import BaseModel
import hmac
import hashlib

app = FastAPI()
WEBHOOK_SECRET = "your-secret-key"

class WebhookPayload(BaseModel):
    event: str
    data: dict
    timestamp: int

def verify_signature(payload: bytes, signature: str) -> bool:
    """Verify webhook signature for security."""
    expected = hmac.new(
        WEBHOOK_SECRET.encode(), payload, hashlib.sha256
    ).hexdigest()
    return hmac.compare_digest(f"sha256={expected}", signature)

@app.post("/webhook/xtools")
async def receive_webhook(request: Request):
    payload = await request.body()
    signature = request.headers.get("X-Signature", "")
    
    if not verify_signature(payload, signature):
        raise HTTPException(status_code=401, detail="Invalid signature")
    
    data = WebhookPayload.parse_raw(payload)
    await process_event(data)
    return {"status": "received"}
```

!!! warning "Always Verify Signatures"
    Never process webhooks without signature verification to prevent spoofing attacks.

## Event Processing

```python
from xtools import XTools

async def process_event(payload: WebhookPayload):
    """Process incoming webhook events."""
    handlers = {
        "new_follower": handle_new_follower,
        "mention": handle_mention,
        "dm_received": handle_dm,
    }
    handler = handlers.get(payload.event)
    if handler:
        await handler(payload.data)

async def handle_new_follower(data: dict):
    """Auto-follow back new followers."""
    async with XTools() as x:
        await x.auth.load_cookies("session.json")
        await x.follow.user(data["username"])

async def handle_mention(data: dict):
    """Auto-reply to mentions with AI."""
    async with XTools() as x:
        await x.auth.load_cookies("session.json")
        from xtools.ai import ContentGenerator
        ai = ContentGenerator(provider="openai")
        reply = await ai.generate_reply(data["text"], style="friendly")
        await x.engage.reply(data["tweet_url"], reply)
```

## Outgoing Webhooks

```python
import aiohttp
import json
from datetime import datetime

class WebhookDispatcher:
    def __init__(self, endpoints: list[str], secret: str):
        self.endpoints = endpoints
        self.secret = secret
    
    async def dispatch(self, event: str, data: dict):
        """Send webhook to all registered endpoints."""
        payload = {
            "event": event,
            "data": data,
            "timestamp": int(datetime.now().timestamp())
        }
        payload_bytes = json.dumps(payload).encode()
        signature = hmac.new(
            self.secret.encode(), payload_bytes, hashlib.sha256
        ).hexdigest()
        
        async with aiohttp.ClientSession() as session:
            for endpoint in self.endpoints:
                await session.post(
                    endpoint, json=payload,
                    headers={"X-Signature": f"sha256={signature}"}
                )
```

!!! tip "Use Message Queues for Reliability"
    For production, consider Redis or RabbitMQ to queue webhook deliveries with retries.

## Discord Integration

```python
from xtools.notifications import DiscordWebhook

async def setup_discord_alerts():
    webhook = DiscordWebhook(url="https://discord.com/api/webhooks/123/abc")
    
    async with XTools() as x:
        report = await x.monitor.unfollowers()
        if report.unfollowers:
            await webhook.send(
                title="👋 Unfollower Alert",
                description=f"{len(report.unfollowers)} users unfollowed",
                color="orange"
            )
```

## Telegram Bot Integration

```python
from xtools.notifications import TelegramBot

bot = TelegramBot(token="BOT_TOKEN", chat_id="CHAT_ID")

async def telegram_alerts():
    async with XTools() as x:
        mentions = await x.scrape.mentions("myusername", limit=10)
        for mention in mentions:
            await bot.send_message(
                f"🔔 New mention from @{mention.author}:\n{mention.text}"
            )
```

!!! info "Rate Limit Notifications"
    Telegram has rate limits. Batch messages or add delays between sends.
