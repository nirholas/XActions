// Copyright (c) 2024-2026 nich (@nichxbt). Licensed under the Apache License, Version 2.0.
/**
 * Tests for DM operations — sendDM, sendDMByUsername, getInbox,
 * getConversation, deleteMessage, markRead.
 *
 * All tests use mocked fetch — no real network requests.
 *
 * @author nichxbt
 * @license Apache-2.0
 */

import { describe, it, expect, vi } from 'vitest';
import {
  sendDM,
  sendDMByUsername,
  getInbox,
  getConversation,
  deleteMessage,
  markRead,
} from '../../src/scrapers/twitter/http/dm.js';

// ============================================================================
// Mock Client
// ============================================================================

/**
 * Build a mock TwitterHttpClient with configurable responses.
 * @param {object} [overrides]
 * @param {boolean} [overrides.authenticated=true]
 * @param {Function} [overrides.requestImpl] — custom request() implementation
 * @param {Function} [overrides.graphqlImpl] — custom graphql() implementation
 * @returns {object}
 */
function createMockClient(overrides = {}) {
  const auth = overrides.authenticated !== false;
  return {
    isAuthenticated: vi.fn().mockReturnValue(auth),
    getCsrfToken: vi.fn().mockReturnValue('mock_ct0'),
    request: overrides.requestImpl || vi.fn().mockResolvedValue({}),
    graphql: overrides.graphqlImpl || vi.fn().mockResolvedValue({}),
    rest: vi.fn().mockResolvedValue({}),
  };
}

// ============================================================================
// Test Data
// ============================================================================

/** dm/new2.json's answer: the created message as an inbox entry. */
const MOCK_DM_SENT = {
  entries: [
    {
      message: {
        id: '111222333',
        time: '1700000000000',
        conversation_id: '123-999',
        message_data: { id: '111222333', sender_id: '999', text: 'Hello!' },
      },
    },
  ],
};

/** Answers verify_credentials (the sender is 999) and the DM send. */
function dmRequest(sent = MOCK_DM_SENT) {
  return vi.fn(async (url) => (url.includes('verify_credentials') ? { id_str: '999' } : sent));
}

const MOCK_INBOX = {
  inbox_initial_state: {
    conversations: {
      'conv-001': {
        conversation_id: 'conv-001',
        type: 'ONE_TO_ONE',
        participants: [{ user_id: '100' }, { user_id: '200' }],
        unread_count: 2,
      },
      'conv-002': {
        conversation_id: 'conv-002',
        type: 'GROUP_DM',
        participants: [{ user_id: '100' }, { user_id: '300' }, { user_id: '400' }],
        unread_count: 0,
      },
    },
    entries: [
      {
        message: {
          conversation_id: 'conv-001',
          time: '1700000001000',
          sender_id: '200',
          message_data: {
            text: 'Hey there',
            sender_id: '200',
          },
        },
      },
      {
        message: {
          conversation_id: 'conv-002',
          time: '1700000002000',
          sender_id: '300',
          message_data: {
            text: 'Group hello',
            sender_id: '300',
          },
        },
      },
    ],
    users: {
      '100': { screen_name: 'alice', name: 'Alice', profile_image_url_https: 'https://pbs.twimg.com/alice.jpg' },
      '200': { screen_name: 'bob', name: 'Bob', profile_image_url_https: 'https://pbs.twimg.com/bob.jpg' },
      '300': { screen_name: 'charlie', name: 'Charlie', profile_image_url_https: 'https://pbs.twimg.com/charlie.jpg' },
      '400': { screen_name: 'dave', name: 'Dave', profile_image_url_https: 'https://pbs.twimg.com/dave.jpg' },
    },
    cursor: 'cursor_abc',
  },
};

const MOCK_CONVERSATION = {
  conversation_timeline: {
    entries: [
      {
        message: {
          id: 'msg-001',
          time: '1700000001000',
          sender_id: '200',
          message_data: {
            text: 'Hello from Bob',
            sender_id: '200',
          },
          reactions: [{ key: '❤️', sender_id: '100' }],
        },
      },
      {
        message: {
          id: 'msg-002',
          time: '1700000002000',
          sender_id: '100',
          message_data: {
            text: 'Hi Bob!',
            sender_id: '100',
            attachment: {
              media: {
                type: 'photo',
                media_url_https: 'https://pbs.twimg.com/dm_image.jpg',
              },
            },
          },
        },
      },
    ],
    min_entry_id: 'msg-001',
  },
};

const MOCK_USER_RESPONSE = {
  data: {
    user: {
      result: {
        __typename: 'User',
        rest_id: '12345',
        legacy: { screen_name: 'testuser', name: 'Test User' },
      },
    },
  },
};

// ============================================================================
// Tests
// ============================================================================

describe('DM Operations', () => {
  // --------------------------------------------------------------------------
  // 1. sendDM request body format
  // --------------------------------------------------------------------------

  describe('sendDM()', () => {
    it('sends the web client\'s new2 body in the sender and recipient\'s conversation', async () => {
      const client = createMockClient({ requestImpl: dmRequest() });

      const result = await sendDM(client, '123', 'Hello!');

      expect(client.request).toHaveBeenCalledTimes(2);
      expect(client.request.mock.calls[0][0]).toContain('/1.1/account/verify_credentials.json');
      const [url, opts] = client.request.mock.calls[1];
      expect(url).toContain('/1.1/dm/new2.json');
      expect(opts.method).toBe('POST');
      expect(opts.body).toMatchObject({
        conversation_id: '123-999',
        recipient_ids: false,
        text: 'Hello!',
        dm_users: false,
      });
      expect(opts.body.request_id).toMatch(/^[0-9a-f-]{36}$/);
      expect(opts.body).not.toHaveProperty('media_id');

      expect(result).toEqual({
        messageId: '111222333',
        conversationId: '123-999',
        createdAt: new Date(1700000000000).toISOString(),
      });
    });

    it('skips the account lookup when the sender id is given, and keeps the request id', async () => {
      const client = createMockClient({ requestImpl: dmRequest() });
      await sendDM(client, '5', 'hi', { senderId: '40', requestId: 'fixed-id' });
      expect(client.request).toHaveBeenCalledOnce();
      expect(client.request.mock.calls[0][1].body).toMatchObject({ conversation_id: '5-40', request_id: 'fixed-id' });
    });

    it('throws when X does not confirm the message, and refuses a message to itself', async () => {
      const refused = createMockClient({ requestImpl: dmRequest({ errors: [{ code: 349, message: 'You cannot send messages to this user.' }] }) });
      await expect(sendDM(refused, '123', 'hi')).rejects.toThrow('X did not send the message: You cannot send messages to this user.');
      const self = createMockClient({ requestImpl: dmRequest() });
      await expect(sendDM(self, '999', 'hi')).rejects.toThrow(/itself/);
    });

    it('should throw when recipientId is missing', async () => {
      const client = createMockClient();
      await expect(sendDM(client, '', 'Hello')).rejects.toThrow(/recipientId/);
    });

    it('should throw when text is empty', async () => {
      const client = createMockClient();
      await expect(sendDM(client, '123', '')).rejects.toThrow(/non-empty/);
    });
  });

  // --------------------------------------------------------------------------
  // 2. sendDMByUsername — resolves username first
  // --------------------------------------------------------------------------

  describe('sendDMByUsername()', () => {
    it('should resolve username to user ID and then send DM', async () => {
      const client = createMockClient({
        graphqlImpl: vi.fn().mockResolvedValue(MOCK_USER_RESPONSE),
        requestImpl: dmRequest(),
      });

      const result = await sendDMByUsername(client, 'testuser', 'Hey!');

      // Should have called graphql to resolve username
      expect(client.graphql).toHaveBeenCalledOnce();
      const [, opName, vars] = client.graphql.mock.calls[0];
      expect(opName).toBe('UserByScreenName');
      expect(vars.screen_name).toBe('testuser');

      // Then sent the DM into the conversation with the resolved ID
      const [, opts] = client.request.mock.calls.find(([url]) => url.includes('/dm/new2.json'));
      expect(opts.body.conversation_id).toBe('999-12345');

      expect(result.messageId).toBe('111222333');
    });

    it('should strip @ from username', async () => {
      const client = createMockClient({
        graphqlImpl: vi.fn().mockResolvedValue(MOCK_USER_RESPONSE),
        requestImpl: dmRequest(),
      });

      await sendDMByUsername(client, '@testuser', 'Hey!');

      const [, , vars] = client.graphql.mock.calls[0];
      expect(vars.screen_name).toBe('testuser');
    });

    it('should throw NotFoundError when user does not exist', async () => {
      const client = createMockClient({
        graphqlImpl: vi.fn().mockResolvedValue({ data: { user: {} } }),
      });

      await expect(
        sendDMByUsername(client, 'nonexistent', 'Hello'),
      ).rejects.toThrow(/not found/i);
    });
  });

  // --------------------------------------------------------------------------
  // 3. getInbox — inbox parsing
  // --------------------------------------------------------------------------

  describe('getInbox()', () => {
    it('should parse inbox conversations correctly', async () => {
      const client = createMockClient({
        requestImpl: vi.fn().mockResolvedValue(MOCK_INBOX),
      });

      const { conversations, cursor } = await getInbox(client);

      expect(conversations).toHaveLength(2);

      // First conversation
      const conv1 = conversations.find((c) => c.conversationId === 'conv-001');
      expect(conv1).toBeDefined();
      expect(conv1.type).toBe('one_to_one');
      expect(conv1.unreadCount).toBe(2);
      expect(conv1.participants).toHaveLength(2);
      expect(conv1.participants[0].username).toBe('alice');
      expect(conv1.participants[1].username).toBe('bob');

      // Second conversation (group)
      const conv2 = conversations.find((c) => c.conversationId === 'conv-002');
      expect(conv2).toBeDefined();
      expect(conv2.type).toBe('group');
      expect(conv2.participants).toHaveLength(3);

      // Cursor
      expect(cursor).toBe('cursor_abc');
    });

    it('should pass cursor for pagination', async () => {
      const client = createMockClient({
        requestImpl: vi.fn().mockResolvedValue({ inbox_initial_state: { conversations: {}, entries: [], users: {} } }),
      });

      await getInbox(client, { cursor: 'page_2' });

      const [url] = client.request.mock.calls[0];
      expect(url).toContain('cursor=page_2');
    });

    it('should respect limit option', async () => {
      const client = createMockClient({
        requestImpl: vi.fn().mockResolvedValue(MOCK_INBOX),
      });

      const { conversations } = await getInbox(client, { limit: 1 });
      expect(conversations).toHaveLength(1);
    });

    it('should issue a GET request', async () => {
      const client = createMockClient({
        requestImpl: vi.fn().mockResolvedValue({ inbox_initial_state: { conversations: {}, entries: [], users: {} } }),
      });

      await getInbox(client);

      const [, opts] = client.request.mock.calls[0];
      expect(opts.method).toBe('GET');
    });
  });

  // --------------------------------------------------------------------------
  // 4. getConversation — message parsing
  // --------------------------------------------------------------------------

  describe('getConversation()', () => {
    it('should parse conversation messages correctly', async () => {
      const client = createMockClient({
        requestImpl: vi.fn().mockResolvedValue(MOCK_CONVERSATION),
      });

      const { messages, cursor } = await getConversation(client, 'conv-001');

      expect(messages).toHaveLength(2);

      // First message
      expect(messages[0].id).toBe('msg-001');
      expect(messages[0].text).toBe('Hello from Bob');
      expect(messages[0].senderId).toBe('200');
      expect(messages[0].createdAt).toBeTruthy();
      expect(messages[0].reactions).toHaveLength(1);
      expect(messages[0].reactions[0].emoji).toBe('❤️');
      expect(messages[0].reactions[0].senderId).toBe('100');
      expect(messages[0].media).toBeNull();

      // Second message with media
      expect(messages[1].id).toBe('msg-002');
      expect(messages[1].text).toBe('Hi Bob!');
      expect(messages[1].media).toHaveLength(1);
      expect(messages[1].media[0].type).toBe('photo');
      expect(messages[1].media[0].url).toContain('dm_image.jpg');

      // Cursor
      expect(cursor).toBe('msg-001');
    });

    it('should throw when conversationId is missing', async () => {
      const client = createMockClient();
      await expect(getConversation(client, '')).rejects.toThrow(/conversationId/);
    });

    it('should pass cursor for pagination', async () => {
      const client = createMockClient({
        requestImpl: vi.fn().mockResolvedValue({ conversation_timeline: { entries: [] } }),
      });

      await getConversation(client, 'conv-001', { cursor: 'msg-050' });

      const [url] = client.request.mock.calls[0];
      expect(url).toContain('max_id=msg-050');
    });

    it('should respect limit option', async () => {
      const client = createMockClient({
        requestImpl: vi.fn().mockResolvedValue(MOCK_CONVERSATION),
      });

      const { messages } = await getConversation(client, 'conv-001', { limit: 1 });
      expect(messages).toHaveLength(1);
    });
  });

  // --------------------------------------------------------------------------
  // 5. Auth requirement
  // --------------------------------------------------------------------------

  describe('Authentication required', () => {
    const unauthClient = createMockClient({ authenticated: false });

    it('sendDM should throw AuthError', async () => {
      await expect(sendDM(unauthClient, '123', 'hi')).rejects.toThrow(/Authentication required/);
    });

    it('sendDMByUsername should throw AuthError', async () => {
      await expect(sendDMByUsername(unauthClient, 'user', 'hi')).rejects.toThrow(/Authentication required/);
    });

    it('getInbox should throw AuthError', async () => {
      await expect(getInbox(unauthClient)).rejects.toThrow(/Authentication required/);
    });

    it('getConversation should throw AuthError', async () => {
      await expect(getConversation(unauthClient, 'conv-1')).rejects.toThrow(/Authentication required/);
    });

    it('deleteMessage should throw AuthError', async () => {
      await expect(deleteMessage(unauthClient, 'msg-1')).rejects.toThrow(/Authentication required/);
    });

    it('markRead should throw AuthError', async () => {
      await expect(markRead(unauthClient, 'conv-1', 'msg-1')).rejects.toThrow(/Authentication required/);
    });
  });

  // --------------------------------------------------------------------------
  // 6. Media attachment in DM
  // --------------------------------------------------------------------------

  describe('Media attachment', () => {
    it('should include media attachment when mediaId is provided', async () => {
      const client = createMockClient({
        requestImpl: dmRequest(),
      });

      await sendDM(client, '123', 'Check this out', { mediaId: 'media_456', senderId: '999' });

      const [, opts] = client.request.mock.calls[0];
      expect(opts.body.media_id).toBe('media_456');
    });

    it('should NOT include attachment when no mediaId', async () => {
      const client = createMockClient({
        requestImpl: dmRequest(),
      });

      await sendDM(client, '123', 'Just text', { senderId: '999' });

      const [, opts] = client.request.mock.calls[0];
      expect(opts.body).not.toHaveProperty('media_id');
    });
  });

  // --------------------------------------------------------------------------
  // 7. deleteMessage
  // --------------------------------------------------------------------------

  describe('deleteMessage()', () => {
    it('should send DELETE request with message ID', async () => {
      const client = createMockClient({
        requestImpl: vi.fn().mockResolvedValue({}),
      });

      const result = await deleteMessage(client, 'msg-789');

      expect(client.request).toHaveBeenCalledOnce();
      const [url, opts] = client.request.mock.calls[0];

      expect(url).toContain('/1.1/direct_messages/events/destroy.json');
      expect(url).toContain('id=msg-789');
      expect(opts.method).toBe('DELETE');

      expect(result).toEqual({ success: true });
    });

    it('should throw when messageId is missing', async () => {
      const client = createMockClient();
      await expect(deleteMessage(client, '')).rejects.toThrow(/messageId/);
    });
  });

  // --------------------------------------------------------------------------
  // 8. markRead
  // --------------------------------------------------------------------------

  describe('markRead()', () => {
    it('should send POST to mark_read endpoint', async () => {
      const client = createMockClient({
        requestImpl: vi.fn().mockResolvedValue({}),
      });

      const result = await markRead(client, 'conv-001', 'msg-999');

      expect(client.request).toHaveBeenCalledOnce();
      const [url, opts] = client.request.mock.calls[0];

      expect(url).toContain('/1.1/dm/conversation/conv-001/mark_read.json');
      expect(opts.method).toBe('POST');
      expect(opts.body).toContain('last_read_event_id=msg-999');

      expect(result).toEqual({ success: true });
    });

    it('should throw when conversationId is missing', async () => {
      const client = createMockClient();
      await expect(markRead(client, '', 'msg-1')).rejects.toThrow(/conversationId/);
    });

    it('should throw when lastMessageId is missing', async () => {
      const client = createMockClient();
      await expect(markRead(client, 'conv-1', '')).rejects.toThrow(/lastMessageId/);
    });
  });
});
