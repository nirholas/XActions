/**
 * XActions Client — Message Data Model
 *
 * Represents a direct message from Twitter's DM API.
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
   * Create a Message from a raw Twitter DM API entry.
   *
   * @param {Object} raw - Raw DM message object
   * @param {string} [conversationId=''] - Conversation ID context
   * @returns {Message|null} Parsed message, or null if unparseable
   */
  static fromRaw(raw, conversationId = '') {
    if (!raw) return null;

    const msg = new Message();
    msg.id = raw.id?.toString() || '';
    msg.conversationId = conversationId;

    const msgData = raw.message_data || raw;
    msg.text = msgData.text || '';
    msg.senderId = msgData.sender_id?.toString() || raw.sender_id?.toString() || '';
    msg.recipientId = msgData.recipient_id?.toString() || '';

    if (raw.time) {
      msg.createdAt = new Date(Number(raw.time));
    } else if (raw.created_at) {
      msg.createdAt = new Date(raw.created_at);
    }

    // Extract media URLs from attachments or entities
    const media = msgData.attachment?.media || msgData.entities?.media;
    if (media) {
      const items = Array.isArray(media) ? media : [media];
      msg.mediaUrls = items
        .map((m) => m.media_url_https || m.media_url || '')
        .filter(Boolean);
    }

    return msg;
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
