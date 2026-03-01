"""
Webhook notification handler.

Send notifications to webhook endpoints (Discord, Slack, custom).
"""

import json
from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum
from typing import Any, Dict, List, Optional

try:
    import aiohttp
    HAS_AIOHTTP = True
except ImportError:
    HAS_AIOHTTP = False

try:
    import httpx
    HAS_HTTPX = True
except ImportError:
    HAS_HTTPX = False


class WebhookType(Enum):
    """Supported webhook types"""
    GENERIC = "generic"
    DISCORD = "discord"
    SLACK = "slack"


@dataclass
class WebhookConfig:
    """Webhook configuration"""
    url: str
    webhook_type: WebhookType = WebhookType.GENERIC
    headers: Dict[str, str] = field(default_factory=dict)
    timeout: int = 30
    
    @classmethod
    def from_url(cls, url: str) -> "WebhookConfig":
        """
        Create config from URL, auto-detecting webhook type.
        
        Args:
            url: Webhook URL
            
        Returns:
            WebhookConfig with detected type
        """
        webhook_type = WebhookType.GENERIC
        
        if "discord.com/api/webhooks" in url:
            webhook_type = WebhookType.DISCORD
        elif "hooks.slack.com" in url:
            webhook_type = WebhookType.SLACK
        
        return cls(url=url, webhook_type=webhook_type)


class WebhookNotifier:
    """
    Webhook notification handler.
    
    Sends notifications to webhook endpoints. Supports Discord, Slack,
    and generic JSON webhooks.
    
    Example:
        notifier = WebhookNotifier("https://discord.com/api/webhooks/...")
        await notifier.notify("unfollower_detected", "User @example unfollowed you")
    """
    
    # Event colors for embeds
    EVENT_COLORS = {
        "unfollower_detected": 0xFF0000,  # Red
        "new_follower": 0x00FF00,  # Green
        "keyword_match": 0x0000FF,  # Blue
        "account_change": 0xFFA500,  # Orange
        "daily_report": 0x9B59B6,  # Purple
        "default": 0x808080,  # Gray
    }
    
    EVENT_ICONS = {
        "unfollower_detected": "🚨",
        "new_follower": "✅",
        "keyword_match": "🔍",
        "account_change": "⚠️",
        "daily_report": "📊",
        "default": "📬",
    }
    
    def __init__(
        self,
        url_or_config: str | WebhookConfig,
    ):
        """
        Initialize webhook notifier.
        
        Args:
            url_or_config: Webhook URL string or WebhookConfig object
        """
        if isinstance(url_or_config, str):
            self.config = WebhookConfig.from_url(url_or_config)
        else:
            self.config = url_or_config
    
    def _build_discord_payload(
        self,
        event: str,
        message: str,
        data: Optional[Dict[str, Any]] = None,
    ) -> dict:
        """Build Discord webhook payload with embed"""
        color = self.EVENT_COLORS.get(event, self.EVENT_COLORS["default"])
        icon = self.EVENT_ICONS.get(event, self.EVENT_ICONS["default"])
        
        embed = {
            "title": f"{icon} {event.replace('_', ' ').title()}",
            "description": message,
            "color": color,
            "timestamp": datetime.utcnow().isoformat(),
            "footer": {
                "text": "Xeepy Monitoring",
            },
        }
        
        # Add fields from data
        if data:
            fields = []
            for key, value in data.items():
                if isinstance(value, list):
                    value = ", ".join(str(v) for v in value[:10])
                    if len(data[key]) > 10:
                        value += f" (+{len(data[key]) - 10} more)"
                
                fields.append({
                    "name": key.replace("_", " ").title(),
                    "value": str(value)[:1024],  # Discord field limit
                    "inline": len(str(value)) < 50,
                })
            
            if fields:
                embed["fields"] = fields[:25]  # Discord limit
        
        return {
            "embeds": [embed],
        }
    
    def _build_slack_payload(
        self,
        event: str,
        message: str,
        data: Optional[Dict[str, Any]] = None,
    ) -> dict:
        """Build Slack webhook payload with blocks"""
        icon = self.EVENT_ICONS.get(event, self.EVENT_ICONS["default"])
        
        blocks = [
            {
                "type": "header",
                "text": {
                    "type": "plain_text",
                    "text": f"{icon} {event.replace('_', ' ').title()}",
                    "emoji": True,
                },
            },
            {
                "type": "section",
                "text": {
                    "type": "mrkdwn",
                    "text": message,
                },
            },
        ]
        
        # Add fields from data
        if data:
            fields = []
            for key, value in data.items():
                if isinstance(value, list):
                    value = ", ".join(str(v) for v in value[:5])
                
                fields.append({
                    "type": "mrkdwn",
                    "text": f"*{key.replace('_', ' ').title()}:*\n{value}",
                })
            
            if fields:
                # Slack allows max 10 fields per section
                for i in range(0, len(fields), 10):
                    blocks.append({
                        "type": "section",
                        "fields": fields[i:i + 10],
                    })
        
        # Add timestamp footer
        blocks.append({
            "type": "context",
            "elements": [
                {
                    "type": "mrkdwn",
                    "text": f"_Sent at {datetime.now().strftime('%Y-%m-%d %H:%M:%S')} by Xeepy_",
                },
            ],
        })
        
        return {
            "blocks": blocks,
        }
    
    def _build_generic_payload(
        self,
        event: str,
        message: str,
        data: Optional[Dict[str, Any]] = None,
    ) -> dict:
        """Build generic JSON payload"""
        return {
            "event": event,
            "message": message,
            "data": data or {},
            "timestamp": datetime.utcnow().isoformat(),
            "source": "xeepy",
        }
    
    def _build_payload(
        self,
        event: str,
        message: str,
        data: Optional[Dict[str, Any]] = None,
    ) -> dict:
        """Build webhook payload based on type"""
        if self.config.webhook_type == WebhookType.DISCORD:
            return self._build_discord_payload(event, message, data)
        elif self.config.webhook_type == WebhookType.SLACK:
            return self._build_slack_payload(event, message, data)
        else:
            return self._build_generic_payload(event, message, data)
    
    async def notify(
        self,
        event: str,
        message: str,
        data: Optional[Dict[str, Any]] = None,
    ) -> bool:
        """
        Send a webhook notification.
        
        Args:
            event: Event type identifier
            message: Notification message
            data: Additional data to include
            
        Returns:
            True if sent successfully, False otherwise
        """
        payload = self._build_payload(event, message, data)
        
        headers = {
            "Content-Type": "application/json",
            **self.config.headers,
        }
        
        try:
            if HAS_AIOHTTP:
                return await self._send_with_aiohttp(payload, headers)
            elif HAS_HTTPX:
                return await self._send_with_httpx(payload, headers)
            else:
                return self._send_with_urllib(payload, headers)
        except Exception as e:
            print(f"Webhook notification failed: {e}")
            return False
    
    async def _send_with_aiohttp(
        self,
        payload: dict,
        headers: dict,
    ) -> bool:
        """Send using aiohttp"""
        async with aiohttp.ClientSession() as session:
            async with session.post(
                self.config.url,
                json=payload,
                headers=headers,
                timeout=aiohttp.ClientTimeout(total=self.config.timeout),
            ) as response:
                return response.status in (200, 201, 204)
    
    async def _send_with_httpx(
        self,
        payload: dict,
        headers: dict,
    ) -> bool:
        """Send using httpx"""
        async with httpx.AsyncClient() as client:
            response = await client.post(
                self.config.url,
                json=payload,
                headers=headers,
                timeout=self.config.timeout,
            )
            return response.status_code in (200, 201, 204)
    
    def _send_with_urllib(
        self,
        payload: dict,
        headers: dict,
    ) -> bool:
        """Send using urllib (synchronous fallback)"""
        import urllib.request
        
        data = json.dumps(payload).encode("utf-8")
        request = urllib.request.Request(
            self.config.url,
            data=data,
            headers=headers,
            method="POST",
        )
        
        with urllib.request.urlopen(request, timeout=self.config.timeout) as response:
            return response.status in (200, 201, 204)
    
    async def send_discord_embed(
        self,
        title: str,
        description: str,
        color: int = 0x0099FF,
        fields: Optional[List[Dict[str, Any]]] = None,
        thumbnail_url: Optional[str] = None,
        image_url: Optional[str] = None,
    ) -> bool:
        """
        Send a custom Discord embed.
        
        Args:
            title: Embed title
            description: Embed description
            color: Embed color (hex)
            fields: List of field dicts with name, value, inline
            thumbnail_url: Thumbnail image URL
            image_url: Main image URL
            
        Returns:
            True if sent successfully
        """
        embed = {
            "title": title,
            "description": description,
            "color": color,
            "timestamp": datetime.utcnow().isoformat(),
        }
        
        if fields:
            embed["fields"] = fields[:25]
        
        if thumbnail_url:
            embed["thumbnail"] = {"url": thumbnail_url}
        
        if image_url:
            embed["image"] = {"url": image_url}
        
        payload = {"embeds": [embed]}
        
        headers = {"Content-Type": "application/json", **self.config.headers}
        
        try:
            if HAS_AIOHTTP:
                return await self._send_with_aiohttp(payload, headers)
            elif HAS_HTTPX:
                return await self._send_with_httpx(payload, headers)
            else:
                return self._send_with_urllib(payload, headers)
        except Exception as e:
            print(f"Discord embed failed: {e}")
            return False
