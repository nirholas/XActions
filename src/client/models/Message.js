/**
 * XActions Client — Message Data Model
 *
 * Represents a Twitter direct message.
 *
 * @author nich (@nichxbt) - https://github.com/nirholas
 * @license MIT
 */

/**
 * Represents a single direct message.
 */
export class Message {
  constructor() {
    /** @type {string} */
    this.id = '';
    /** @type {string} */
    this.text = '';
    /** @type {string} */
    this.senderId = '';
    /** @type {string} */
    this.recipientId = '';
    /** @type {Date|null} */
    this.createdAt = null;
    /** @type {string[]} */
    this.mediaUrls = [];
    /** @type {string} */
    this.conversationId = '';
  }

  /**
   * Parse a DM message from Twitter's inbox API response.
   *
   * @param {Object} raw - Raw message entry from DM conversation timeline
   * @returns {Message|null}
   */
  static fromDmEntry(raw) {
    if (!raw) return null;

    const msg = raw.message?.message_data || raw.message_data;
    if (!msg) return null;

    const message = new Message();
    message.id = raw.message?.id || raw.id || '';
    message.text = msg.text || '';
    message.senderId = msg.sender_id || raw.message?.sender_id || '';
    message.recipientId = msg.recipient_id || '';
    message.conversationId = raw.conversation_id || '';

    if (msg.time || raw.message?.time) {
      const ts = parseInt(msg.time || raw.message?.time, 10);
      if (!isNaN(ts)) {
        message.createdAt = new Date(ts);
      }
    }

    // Media attachments
    const attachment = msg.attachment;
    if (attachment?.media) {
      const media = attachment.media;
      const url = media.media_url_https || media.media_url || '';
      if (url) message.mediaUrls.push(url);
    }

    return message;
  }

  /**
   * JSON-serializable representation.
   * @returns {Object}
   */
  toJSON() {
    return {
      id: this.id,
      text: this.text,
      senderId: this.senderId,
      recipientId: this.recipientId,
      createdAt: this.createdAt?.toISOString() || null,
      mediaUrls: this.mediaUrls,
      conversationId: this.conversationId,
    };
  }
}

/**
 * Represents a DM conversation.
 */
export class Conversation {
  constructor() {
    /** @type {string} */
    this.id = '';
    /** @type {'ONE_TO_ONE'|'GROUP_DM'} */
    this.type = 'ONE_TO_ONE';
    /** @type {string[]} */
    this.participantIds = [];
    /** @type {Message|null} */
    this.lastMessage = null;
    /** @type {Date|null} */
    this.updatedAt = null;
  }

  /**
   * Parse from inbox_initial_state conversation data.
   *
   * @param {string} conversationId
   * @param {Object} raw - Raw conversation object
   * @returns {Conversation|null}
   */
  static fromInbox(conversationId, raw) {
    if (!raw) return null;

    const convo = new Conversation();
    convo.id = conversationId;
    convo.type = raw.type || 'ONE_TO_ONE';
    convo.participantIds = (raw.participants || []).map(
      (p) => p.user_id || p,
    ).filter(Boolean);

    if (raw.sort_timestamp) {
      const ts = parseInt(raw.sort_timestamp, 10);
      if (!isNaN(ts)) convo.updatedAt = new Date(ts);
    }

    return convo;
  }

  toJSON() {
    return {
      id: this.id,
      type: this.type,
      participantIds: this.participantIds,
      lastMessage: this.lastMessage?.toJSON() || null,
      updatedAt: this.updatedAt?.toISOString() || null,
    };
  }
}
