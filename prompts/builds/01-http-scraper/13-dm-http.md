# Build 01-13 — Direct Messages via HTTP

> **Agent Role:** Implementer  
> **Depends on:** 02-client, 03-auth  
> **Creates:** `src/scrapers/twitter/http/dm.js`  
> **No mock data. No stubs. Complete working code.**

---

## Task

Implement DM operations via Twitter's API: send messages, read conversations, list inbox.

---

## File: `src/scrapers/twitter/http/dm.js`

### Functions

1. **`async sendDM(client, recipientId, text, options = {})`**
   - REST: `POST /1.1/direct_messages/events/new.json`
   - Body:
     ```json
     {
       "event": {
         "type": "message_create",
         "message_create": {
           "target": { "recipient_id": "123" },
           "message_data": {
             "text": "Hello!",
             "attachment": null
           }
         }
       }
     }
     ```
   - Options: `{ mediaId }` for image/video attachments
   - Returns `{ messageId, createdAt }`
   - Requires authentication

2. **`async sendDMByUsername(client, username, text, options = {})`**
   - Resolve username to user ID, then call `sendDM`

3. **`async getInbox(client, options = {})`**
   - REST: `GET /1.1/dm/inbox_initial_state.json`
   - Or GraphQL dm endpoint
   - Returns conversation list:
     ```javascript
     [{
       conversationId: string,
       participants: [{ id, username, name, avatar }],
       lastMessage: { text, createdAt, senderId },
       unreadCount: number,
       type: 'one_to_one' | 'group',
     }]
     ```
   - Options: `{ limit: 50, cursor }`

4. **`async getConversation(client, conversationId, options = {})`**
   - Fetch messages in a conversation
   - Returns array of messages:
     ```javascript
     [{
       id: string,
       text: string,
       senderId: string,
       createdAt: string,
       media: [{ type, url }] | null,
       reactions: [{ emoji, senderId }],
     }]
     ```
   - Options: `{ limit: 100, cursor }`

5. **`async deleteMessage(client, messageId)`**
   - REST: `DELETE /1.1/direct_messages/events/destroy.json?id={messageId}`

6. **`async markRead(client, conversationId, lastMessageId)`**
   - REST: `POST /1.1/dm/conversation/{id}/mark_read.json`

### Rate Limits
- Send DM: ~1000 per 24 hours (shared with other DM actions)
- Read inbox: ~15 per 15 minutes
- Implement appropriate delays for bulk DM sending

---

## Test File: `tests/http-scraper/dm.test.js`

1. Test sendDM request body format
2. Test username resolution before DM
3. Test inbox parsing
4. Test conversation message parsing
5. Test auth requirement
6. Test media attachment in DM

---

## Acceptance Criteria

- [ ] Send DM with text and optional media
- [ ] Read inbox with conversation list
- [ ] Read individual conversation messages
- [ ] Delete and mark-read operations
- [ ] All tests pass
