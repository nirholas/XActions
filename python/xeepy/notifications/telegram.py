"""
Telegram notification handler.

Send notifications to Telegram chats/channels via Bot API.
"""

import json
from dataclasses import dataclass
from datetime import datetime
from typing import Any, Dict, List, Optional, Union

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


@dataclass
class TelegramConfig:
    """Telegram bot configuration"""
    bot_token: str
    chat_ids: List[Union[int, str]]  # Can be user IDs or @channel names
    parse_mode: str = "HTML"  # HTML or Markdown
    disable_web_preview: bool = False
    disable_notification: bool = False
    
    @classmethod
    def from_env(cls, prefix: str = "XEEPY_TELEGRAM") -> "TelegramConfig":
        """
        Load Telegram configuration from environment variables.
        
        Expected variables:
        - {prefix}_BOT_TOKEN
        - {prefix}_CHAT_IDS (comma-separated)
        """
        import os
        
        chat_ids_str = os.environ.get(f"{prefix}_CHAT_IDS", "")
        chat_ids = []
        for cid in chat_ids_str.split(","):
            cid = cid.strip()
            if cid:
                # Try to convert to int, keep as string if not possible
                try:
                    chat_ids.append(int(cid))
                except ValueError:
                    chat_ids.append(cid)
        
        return cls(
            bot_token=os.environ.get(f"{prefix}_BOT_TOKEN", ""),
            chat_ids=chat_ids,
        )
    
    @property
    def api_base(self) -> str:
        """Get Telegram Bot API base URL"""
        return f"https://api.telegram.org/bot{self.bot_token}"


class TelegramNotifier:
    """
    Telegram notification handler.
    
    Sends notifications to Telegram chats or channels using the Bot API.
    
    Example:
        config = TelegramConfig(
            bot_token="123456:ABC-DEF...",
            chat_ids=[123456789, "@my_channel"],
        )
        notifier = TelegramNotifier(config)
        await notifier.notify("unfollower_detected", "User @example unfollowed you")
    """
    
    # Event emojis
    EVENT_EMOJIS = {
        "unfollower_detected": "🚨",
        "new_follower": "✅",
        "keyword_match": "🔍",
        "account_change": "⚠️",
        "daily_report": "📊",
        "error": "❌",
        "default": "📬",
    }
    
    def __init__(self, config: TelegramConfig):
        """
        Initialize Telegram notifier.
        
        Args:
            config: Telegram configuration
        """
        self.config = config
    
    def _format_message_html(
        self,
        event: str,
        message: str,
        data: Optional[Dict[str, Any]] = None,
    ) -> str:
        """Format message as HTML for Telegram"""
        emoji = self.EVENT_EMOJIS.get(event, self.EVENT_EMOJIS["default"])
        title = event.replace("_", " ").title()
        
        lines = [
            f"<b>{emoji} {title}</b>",
            "",
            message,
        ]
        
        if data:
            lines.append("")
            for key, value in data.items():
                key_formatted = key.replace("_", " ").title()
                
                if isinstance(value, list):
                    if len(value) <= 5:
                        value = ", ".join(str(v) for v in value)
                    else:
                        value = ", ".join(str(v) for v in value[:5]) + f" (+{len(value) - 5} more)"
                
                lines.append(f"<b>{key_formatted}:</b> {value}")
        
        lines.extend([
            "",
            f"<i>⏰ {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}</i>",
        ])
        
        return "\n".join(lines)
    
    def _format_message_markdown(
        self,
        event: str,
        message: str,
        data: Optional[Dict[str, Any]] = None,
    ) -> str:
        """Format message as Markdown for Telegram"""
        emoji = self.EVENT_EMOJIS.get(event, self.EVENT_EMOJIS["default"])
        title = event.replace("_", " ").title()
        
        lines = [
            f"*{emoji} {title}*",
            "",
            message,
        ]
        
        if data:
            lines.append("")
            for key, value in data.items():
                key_formatted = key.replace("_", " ").title()
                
                if isinstance(value, list):
                    if len(value) <= 5:
                        value = ", ".join(str(v) for v in value)
                    else:
                        value = ", ".join(str(v) for v in value[:5]) + f" (+{len(value) - 5} more)"
                
                # Escape special Markdown characters in value
                value = str(value).replace("_", "\\_").replace("*", "\\*")
                lines.append(f"*{key_formatted}:* {value}")
        
        lines.extend([
            "",
            f"_⏰ {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}_",
        ])
        
        return "\n".join(lines)
    
    def _format_message(
        self,
        event: str,
        message: str,
        data: Optional[Dict[str, Any]] = None,
    ) -> str:
        """Format message based on parse mode"""
        if self.config.parse_mode == "HTML":
            return self._format_message_html(event, message, data)
        else:
            return self._format_message_markdown(event, message, data)
    
    async def _send_request(
        self,
        method: str,
        params: dict,
    ) -> dict:
        """Send request to Telegram Bot API"""
        url = f"{self.config.api_base}/{method}"
        
        if HAS_AIOHTTP:
            async with aiohttp.ClientSession() as session:
                async with session.post(url, json=params) as response:
                    return await response.json()
        elif HAS_HTTPX:
            async with httpx.AsyncClient() as client:
                response = await client.post(url, json=params)
                return response.json()
        else:
            # Synchronous fallback
            import urllib.request
            
            data = json.dumps(params).encode("utf-8")
            request = urllib.request.Request(
                url,
                data=data,
                headers={"Content-Type": "application/json"},
                method="POST",
            )
            
            with urllib.request.urlopen(request, timeout=30) as response:
                return json.loads(response.read().decode("utf-8"))
    
    async def notify(
        self,
        event: str,
        message: str,
        data: Optional[Dict[str, Any]] = None,
    ) -> bool:
        """
        Send a Telegram notification.
        
        Args:
            event: Event type identifier
            message: Notification message
            data: Additional data to include
            
        Returns:
            True if sent to at least one chat successfully
        """
        if not self.config.chat_ids:
            return False
        
        text = self._format_message(event, message, data)
        
        success = False
        for chat_id in self.config.chat_ids:
            try:
                result = await self._send_request("sendMessage", {
                    "chat_id": chat_id,
                    "text": text,
                    "parse_mode": self.config.parse_mode,
                    "disable_web_page_preview": self.config.disable_web_preview,
                    "disable_notification": self.config.disable_notification,
                })
                
                if result.get("ok"):
                    success = True
                else:
                    print(f"Telegram send failed for {chat_id}: {result.get('description')}")
                    
            except Exception as e:
                print(f"Telegram notification failed for {chat_id}: {e}")
        
        return success
    
    async def send_message(
        self,
        text: str,
        chat_id: Optional[Union[int, str]] = None,
        parse_mode: Optional[str] = None,
    ) -> bool:
        """
        Send a custom message.
        
        Args:
            text: Message text
            chat_id: Target chat (None = all configured chats)
            parse_mode: Override parse mode
            
        Returns:
            True if sent successfully
        """
        chat_ids = [chat_id] if chat_id else self.config.chat_ids
        
        if not chat_ids:
            return False
        
        success = False
        for cid in chat_ids:
            try:
                result = await self._send_request("sendMessage", {
                    "chat_id": cid,
                    "text": text,
                    "parse_mode": parse_mode or self.config.parse_mode,
                    "disable_web_page_preview": self.config.disable_web_preview,
                    "disable_notification": self.config.disable_notification,
                })
                
                if result.get("ok"):
                    success = True
                    
            except Exception as e:
                print(f"Telegram message failed for {cid}: {e}")
        
        return success
    
    async def send_photo(
        self,
        photo_url: str,
        caption: Optional[str] = None,
        chat_id: Optional[Union[int, str]] = None,
    ) -> bool:
        """
        Send a photo.
        
        Args:
            photo_url: URL of the photo
            caption: Photo caption (optional)
            chat_id: Target chat (None = all configured chats)
            
        Returns:
            True if sent successfully
        """
        chat_ids = [chat_id] if chat_id else self.config.chat_ids
        
        if not chat_ids:
            return False
        
        success = False
        for cid in chat_ids:
            try:
                params = {
                    "chat_id": cid,
                    "photo": photo_url,
                }
                
                if caption:
                    params["caption"] = caption
                    params["parse_mode"] = self.config.parse_mode
                
                result = await self._send_request("sendPhoto", params)
                
                if result.get("ok"):
                    success = True
                    
            except Exception as e:
                print(f"Telegram photo failed for {cid}: {e}")
        
        return success
    
    async def send_document(
        self,
        document_url: str,
        caption: Optional[str] = None,
        filename: Optional[str] = None,
        chat_id: Optional[Union[int, str]] = None,
    ) -> bool:
        """
        Send a document.
        
        Args:
            document_url: URL of the document
            caption: Document caption (optional)
            filename: Override filename (optional)
            chat_id: Target chat (None = all configured chats)
            
        Returns:
            True if sent successfully
        """
        chat_ids = [chat_id] if chat_id else self.config.chat_ids
        
        if not chat_ids:
            return False
        
        success = False
        for cid in chat_ids:
            try:
                params = {
                    "chat_id": cid,
                    "document": document_url,
                }
                
                if caption:
                    params["caption"] = caption
                    params["parse_mode"] = self.config.parse_mode
                
                result = await self._send_request("sendDocument", params)
                
                if result.get("ok"):
                    success = True
                    
            except Exception as e:
                print(f"Telegram document failed for {cid}: {e}")
        
        return success
    
    async def get_bot_info(self) -> Optional[dict]:
        """Get information about the bot"""
        try:
            result = await self._send_request("getMe", {})
            if result.get("ok"):
                return result.get("result")
        except Exception as e:
            print(f"Failed to get bot info: {e}")
        
        return None
    
    async def verify_config(self) -> dict:
        """
        Verify that the configuration is valid.
        
        Returns:
            Dictionary with verification results
        """
        results = {
            "bot_valid": False,
            "bot_info": None,
            "chat_results": {},
        }
        
        # Verify bot token
        bot_info = await self.get_bot_info()
        if bot_info:
            results["bot_valid"] = True
            results["bot_info"] = bot_info
        
        # Test sending to each chat
        for chat_id in self.config.chat_ids:
            try:
                # Use getChat to verify access without sending a message
                result = await self._send_request("getChat", {"chat_id": chat_id})
                results["chat_results"][str(chat_id)] = {
                    "valid": result.get("ok", False),
                    "info": result.get("result") if result.get("ok") else result.get("description"),
                }
            except Exception as e:
                results["chat_results"][str(chat_id)] = {
                    "valid": False,
                    "error": str(e),
                }
        
        return results
