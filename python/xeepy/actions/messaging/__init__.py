"""
Direct Message (DM) operations for X/Twitter.

Supports:
- Sending DMs (text and media)
- DM inbox management
- Conversation history
- DM search
- Message/conversation deletion
"""

from __future__ import annotations

import asyncio
import json
import re
from dataclasses import dataclass, field
from datetime import datetime
from pathlib import Path
from typing import Any

from loguru import logger

from xeepy.core.browser import BrowserManager
from xeepy.core.rate_limiter import RateLimiter
from xeepy.core.selectors import Selectors
from xeepy.actions.base import BaseAction, ActionResult


@dataclass
class DirectMessage:
    """
    Represents a Direct Message.
    
    Attributes:
        id: Unique message ID
        conversation_id: Conversation this message belongs to
        sender_id: User ID of sender
        sender_username: Username of sender
        recipient_id: User ID of recipient
        text: Message text content
        timestamp: When the message was sent
        media_url: URL of attached media (if any)
        media_type: Type of media (image, video, gif)
        is_read: Whether message has been read
        reaction: Reaction emoji (if any)
    """
    
    id: str
    conversation_id: str = ""
    sender_id: str = ""
    sender_username: str = ""
    recipient_id: str = ""
    recipient_username: str = ""
    text: str = ""
    timestamp: datetime | None = None
    media_url: str = ""
    media_type: str = ""
    is_read: bool = False
    reaction: str = ""
    
    def to_dict(self) -> dict[str, Any]:
        return {
            "id": self.id,
            "conversation_id": self.conversation_id,
            "sender_id": self.sender_id,
            "sender_username": self.sender_username,
            "recipient_id": self.recipient_id,
            "recipient_username": self.recipient_username,
            "text": self.text,
            "timestamp": self.timestamp.isoformat() if self.timestamp else None,
            "media_url": self.media_url,
            "media_type": self.media_type,
            "is_read": self.is_read,
            "reaction": self.reaction,
        }


@dataclass
class Conversation:
    """
    Represents a DM conversation.
    
    Attributes:
        id: Unique conversation ID
        participants: List of participant user IDs
        participant_usernames: List of participant usernames
        last_message: Most recent message
        last_read_event_id: Last read message ID
        is_group: Whether this is a group conversation
        is_muted: Whether notifications are muted
        messages: List of messages in conversation
        unread_count: Number of unread messages
    """
    
    id: str
    participants: list[str] = field(default_factory=list)
    participant_usernames: list[str] = field(default_factory=list)
    last_message: DirectMessage | None = None
    last_read_event_id: str = ""
    is_group: bool = False
    is_muted: bool = False
    messages: list[DirectMessage] = field(default_factory=list)
    unread_count: int = 0
    
    def to_dict(self) -> dict[str, Any]:
        return {
            "id": self.id,
            "participants": self.participants,
            "participant_usernames": self.participant_usernames,
            "last_message": self.last_message.to_dict() if self.last_message else None,
            "last_read_event_id": self.last_read_event_id,
            "is_group": self.is_group,
            "is_muted": self.is_muted,
            "messages": [m.to_dict() for m in self.messages],
            "unread_count": self.unread_count,
        }


@dataclass
class DMInbox:
    """
    DM inbox metadata.
    
    Attributes:
        conversations: List of conversations
        total_conversations: Total number of conversations
        unread_count: Total unread messages
        cursor: Pagination cursor
    """
    
    conversations: list[Conversation] = field(default_factory=list)
    total_conversations: int = 0
    unread_count: int = 0
    cursor: str = ""
    
    def to_dict(self) -> dict[str, Any]:
        return {
            "conversations": [c.to_dict() for c in self.conversations],
            "total_conversations": self.total_conversations,
            "unread_count": self.unread_count,
        }


class DirectMessageActions(BaseAction):
    """
    Actions for Direct Messages.
    
    Provides methods for sending, receiving, and managing DMs.
    """
    
    def __init__(
        self,
        browser_manager: BrowserManager,
        rate_limiter: RateLimiter | None = None,
    ):
        super().__init__(browser_manager, rate_limiter)
    
    async def send(
        self,
        text: str,
        recipients: list[str],
        media: str | None = None,
    ) -> ActionResult:
        """
        Send a Direct Message.
        
        Args:
            text: Message text
            recipients: List of usernames or user IDs to send to
            media: Path to media file to attach (optional)
            
        Returns:
            ActionResult with sent message details
        """
        result = ActionResult(action="dm_send", target=", ".join(recipients))
        
        try:
            page = await self.browser_manager.get_page()
            
            # Navigate to messages
            await page.goto("https://twitter.com/messages", wait_until="networkidle")
            await asyncio.sleep(2)
            
            # Click new message button
            new_msg_btn = await page.query_selector('[data-testid="NewDM_Button"]')
            if not new_msg_btn:
                new_msg_btn = await page.query_selector('a[href="/messages/compose"]')
            
            if new_msg_btn:
                await new_msg_btn.click()
                await asyncio.sleep(1)
            else:
                await page.goto("https://twitter.com/messages/compose", wait_until="networkidle")
                await asyncio.sleep(1)
            
            # Add recipients
            for recipient in recipients:
                search_input = await page.query_selector('[data-testid="searchPeople"]')
                if not search_input:
                    search_input = await page.query_selector('input[placeholder*="Search"]')
                
                if search_input:
                    await search_input.fill(recipient)
                    await asyncio.sleep(1)
                    
                    # Click on first result
                    result_item = await page.query_selector('[data-testid="TypeaheadUser"]')
                    if result_item:
                        await result_item.click()
                        await asyncio.sleep(0.5)
            
            # Click Next to start conversation
            next_btn = await page.query_selector('[data-testid="nextButton"]')
            if next_btn:
                await next_btn.click()
                await asyncio.sleep(1)
            
            # Handle media upload
            if media and Path(media).exists():
                media_btn = await page.query_selector('[data-testid="dmComposerMediaButton"]')
                if media_btn:
                    file_input = await page.query_selector('input[type="file"]')
                    if file_input:
                        await file_input.set_input_files(media)
                        await asyncio.sleep(2)
            
            # Enter message text
            message_input = await page.query_selector('[data-testid="dmComposerTextInput"]')
            if not message_input:
                message_input = await page.query_selector('[role="textbox"]')
            
            if message_input:
                await message_input.fill(text)
                await asyncio.sleep(0.5)
            
            # Send message
            send_btn = await page.query_selector('[data-testid="dmComposerSendButton"]')
            if send_btn:
                await send_btn.click()
                await asyncio.sleep(1)
                
                result.success = True
                result.message = f"Message sent to {', '.join(recipients)}"
                logger.info(result.message)
            else:
                result.success = False
                result.error = "Could not find send button"
                
        except Exception as e:
            result.success = False
            result.error = str(e)
            logger.error(f"Error sending DM: {e}")
        
        return result
    
    async def inbox(self) -> DMInbox:
        """
        Get DM inbox metadata.
        
        Returns:
            DMInbox with list of conversations
        """
        inbox = DMInbox()
        
        try:
            page = await self.browser_manager.get_page()
            
            # Navigate to messages
            await page.goto("https://twitter.com/messages", wait_until="networkidle")
            await asyncio.sleep(2)
            
            # Get conversation list
            conversations = await page.query_selector_all('[data-testid="conversation"]')
            
            for conv in conversations:
                try:
                    # Get conversation link to extract ID
                    link = await conv.query_selector('a')
                    href = await link.get_attribute("href") if link else ""
                    conv_id = href.split("/")[-1] if href else ""
                    
                    # Get participant info
                    name_el = await conv.query_selector('[data-testid="conversationName"]')
                    name = await name_el.inner_text() if name_el else ""
                    
                    # Get last message preview
                    preview_el = await conv.query_selector('[data-testid="messageEntry"]')
                    preview = await preview_el.inner_text() if preview_el else ""
                    
                    # Check for unread indicator
                    unread_el = await conv.query_selector('[data-testid="unreadIndicator"]')
                    
                    conversation = Conversation(
                        id=conv_id,
                        participant_usernames=[name] if name else [],
                        unread_count=1 if unread_el else 0,
                    )
                    
                    if preview:
                        conversation.last_message = DirectMessage(
                            id="",
                            text=preview,
                        )
                    
                    inbox.conversations.append(conversation)
                    
                except Exception as e:
                    logger.warning(f"Error parsing conversation: {e}")
                    continue
            
            inbox.total_conversations = len(inbox.conversations)
            inbox.unread_count = sum(c.unread_count for c in inbox.conversations)
            
            logger.info(f"Retrieved {inbox.total_conversations} conversations from inbox")
            
        except Exception as e:
            logger.error(f"Error getting DM inbox: {e}")
        
        return inbox
    
    async def history(
        self,
        conversation_ids: list[str] | None = None,
        limit: int = 100,
    ) -> list[Conversation]:
        """
        Get DM history from conversations.
        
        Args:
            conversation_ids: Specific conversation IDs to fetch (None for all)
            limit: Maximum messages per conversation
            
        Returns:
            List of Conversations with messages
        """
        conversations = []
        
        try:
            page = await self.browser_manager.get_page()
            
            # If no specific IDs, get from inbox
            if not conversation_ids:
                inbox = await self.inbox()
                conversation_ids = [c.id for c in inbox.conversations]
            
            for conv_id in conversation_ids:
                if not conv_id:
                    continue
                    
                await self.rate_limiter.wait()
                
                # Navigate to conversation
                await page.goto(
                    f"https://twitter.com/messages/{conv_id}",
                    wait_until="networkidle"
                )
                await asyncio.sleep(2)
                
                conversation = Conversation(id=conv_id)
                
                # Scroll to load more messages
                messages_container = await page.query_selector('[data-testid="DmScrollerContainer"]')
                if messages_container:
                    for _ in range(3):  # Load a few pages
                        await page.evaluate("window.scrollTo(0, 0)")
                        await asyncio.sleep(1)
                
                # Extract messages
                message_els = await page.query_selector_all('[data-testid="messageEntry"]')
                
                for msg_el in message_els[:limit]:
                    try:
                        # Get message text
                        text_el = await msg_el.query_selector('[data-testid="tweetText"]')
                        text = await text_el.inner_text() if text_el else ""
                        
                        # Get sender
                        sender_el = await msg_el.query_selector('[data-testid="User-Name"]')
                        sender = await sender_el.inner_text() if sender_el else ""
                        
                        # Get timestamp
                        time_el = await msg_el.query_selector('time')
                        timestamp = None
                        if time_el:
                            datetime_attr = await time_el.get_attribute("datetime")
                            if datetime_attr:
                                timestamp = datetime.fromisoformat(datetime_attr.replace('Z', '+00:00'))
                        
                        # Check for media
                        media_el = await msg_el.query_selector('img[src*="media"]')
                        media_url = ""
                        if media_el:
                            media_url = await media_el.get_attribute("src") or ""
                        
                        message = DirectMessage(
                            id=str(len(conversation.messages)),
                            conversation_id=conv_id,
                            sender_username=sender,
                            text=text,
                            timestamp=timestamp,
                            media_url=media_url,
                        )
                        conversation.messages.append(message)
                        
                    except Exception as e:
                        logger.warning(f"Error parsing message: {e}")
                        continue
                
                conversations.append(conversation)
                logger.info(f"Retrieved {len(conversation.messages)} messages from conversation {conv_id}")
            
        except Exception as e:
            logger.error(f"Error getting DM history: {e}")
        
        return conversations
    
    async def search(self, query: str) -> list[DirectMessage]:
        """
        Search DMs by keyword.
        
        Args:
            query: Search term
            
        Returns:
            List of matching messages
        """
        messages = []
        
        try:
            page = await self.browser_manager.get_page()
            
            # Navigate to messages
            await page.goto("https://twitter.com/messages", wait_until="networkidle")
            await asyncio.sleep(2)
            
            # Find search input
            search_input = await page.query_selector('[data-testid="SearchBox_Search_Input"]')
            if not search_input:
                search_input = await page.query_selector('input[placeholder*="Search"]')
            
            if search_input:
                await search_input.fill(query)
                await asyncio.sleep(2)
                
                # Get search results
                results = await page.query_selector_all('[data-testid="messageSearchResult"]')
                
                for result in results:
                    try:
                        text_el = await result.query_selector('[data-testid="tweetText"]')
                        text = await text_el.inner_text() if text_el else ""
                        
                        user_el = await result.query_selector('[data-testid="User-Name"]')
                        user = await user_el.inner_text() if user_el else ""
                        
                        message = DirectMessage(
                            id=str(len(messages)),
                            sender_username=user,
                            text=text,
                        )
                        messages.append(message)
                        
                    except Exception as e:
                        continue
                
                logger.info(f"Found {len(messages)} messages matching '{query}'")
            else:
                logger.warning("Could not find search input")
            
        except Exception as e:
            logger.error(f"Error searching DMs: {e}")
        
        return messages
    
    async def delete(
        self,
        conversation_id: str | None = None,
        message_id: str | None = None,
    ) -> ActionResult:
        """
        Delete a DM or entire conversation.
        
        Args:
            conversation_id: Delete entire conversation
            message_id: Delete specific message (requires conversation_id too)
            
        Returns:
            ActionResult indicating success/failure
        """
        result = ActionResult(
            action="dm_delete",
            target=conversation_id or message_id or "",
        )
        
        try:
            page = await self.browser_manager.get_page()
            
            if conversation_id:
                # Navigate to conversation
                await page.goto(
                    f"https://twitter.com/messages/{conversation_id}",
                    wait_until="networkidle"
                )
                await asyncio.sleep(2)
                
                if message_id:
                    # Delete specific message
                    # Find message by ID or position
                    message_els = await page.query_selector_all('[data-testid="messageEntry"]')
                    
                    for msg_el in message_els:
                        # Long press/right click to get context menu
                        await msg_el.click(button="right")
                        await asyncio.sleep(0.5)
                        
                        # Look for delete option
                        delete_btn = await page.query_selector('[data-testid="Dropdown-Item-Delete"]')
                        if delete_btn:
                            await delete_btn.click()
                            await asyncio.sleep(0.5)
                            
                            # Confirm deletion
                            confirm_btn = await page.query_selector('[data-testid="confirmationSheetConfirm"]')
                            if confirm_btn:
                                await confirm_btn.click()
                                await asyncio.sleep(1)
                                
                                result.success = True
                                result.message = f"Deleted message {message_id}"
                                break
                else:
                    # Delete entire conversation
                    # Click conversation settings/more button
                    more_btn = await page.query_selector('[data-testid="conversationMoreButton"]')
                    if more_btn:
                        await more_btn.click()
                        await asyncio.sleep(0.5)
                        
                        # Click delete conversation
                        delete_btn = await page.query_selector('[data-testid="Dropdown-Item-Leave"]')
                        if not delete_btn:
                            delete_btn = await page.query_selector('[data-testid="Dropdown-Item-Delete"]')
                        
                        if delete_btn:
                            await delete_btn.click()
                            await asyncio.sleep(0.5)
                            
                            # Confirm
                            confirm_btn = await page.query_selector('[data-testid="confirmationSheetConfirm"]')
                            if confirm_btn:
                                await confirm_btn.click()
                                await asyncio.sleep(1)
                                
                                result.success = True
                                result.message = f"Deleted conversation {conversation_id}"
            
            if not result.success:
                result.error = "Could not complete deletion"
                
        except Exception as e:
            result.success = False
            result.error = str(e)
            logger.error(f"Error deleting DM: {e}")
        
        return result
    
    async def mark_read(self, conversation_id: str) -> ActionResult:
        """
        Mark a conversation as read.
        
        Args:
            conversation_id: Conversation to mark as read
            
        Returns:
            ActionResult indicating success/failure
        """
        result = ActionResult(action="dm_mark_read", target=conversation_id)
        
        try:
            page = await self.browser_manager.get_page()
            
            # Simply navigating to the conversation marks it as read
            await page.goto(
                f"https://twitter.com/messages/{conversation_id}",
                wait_until="networkidle"
            )
            await asyncio.sleep(2)
            
            result.success = True
            result.message = f"Marked conversation {conversation_id} as read"
            logger.info(result.message)
            
        except Exception as e:
            result.success = False
            result.error = str(e)
            logger.error(f"Error marking DM as read: {e}")
        
        return result


# Create module directory structure
__all__ = [
    "DirectMessage",
    "Conversation", 
    "DMInbox",
    "DirectMessageActions",
]
