/**/**





























































}  }    });      conversationId: conversationId || raw.conversation_id || '',      mediaUrls,      createdAt,      recipientId: data.recipient_id || raw.recipient_id || '',      senderId: data.sender_id || raw.sender_id || '',      text: data.text || '',      id: raw.id || data.id || '',    return new Message({    }      mediaUrls.push(attachment.media_url_https || attachment.media_url || '');    if (attachment) {    const attachment = data.attachment?.media;    const mediaUrls = [];    const createdAt = data.time ? new Date(parseInt(data.time, 10)) : null;    const data = raw.message_data || raw;    if (!raw) return null;  static fromRaw(raw, conversationId = '') {   */   * @returns {Message|null}   * @param {string} [conversationId=''] - The conversation this message belongs to   * @param {Object} raw - Raw DM message entry   *   * Parse a raw Twitter DM entry into a Message.  /**  }    this.conversationId = data.conversationId || '';    /** @type {string} */    this.mediaUrls = data.mediaUrls || [];    /** @type {string[]} */    this.createdAt = data.createdAt || null;    /** @type {Date|null} */    this.recipientId = data.recipientId || '';    /** @type {string} */    this.senderId = data.senderId || '';    /** @type {string} */    this.text = data.text || '';    /** @type {string} */    this.id = data.id || '';    /** @type {string} */  constructor(data = {}) {   */   * @param {Object} [data={}]  /**export class Message { */ * Represents a direct message./** */ * @license MIT * @author nich (@nichxbt) - https://github.com/nirholas * * Represents a Twitter Direct Message. * XActions Client — Message Data Model * XActions Client — Message Data Model
 * Represents a Twitter Direct Message.
 *
 * @author nich (@nichxbt)
 * @license MIT
 */

/**
 * Represents a single direct message.
 */
export class Message {
  /**
   * @param {Object} [data]
   */
  constructor(data = {}) {
    /** @type {string} */
    this.id = data.id || '';
    /** @type {string} */
    this.text = data.text || '';
    /** @type {string} */
    this.senderId = data.senderId || '';
    /** @type {string} */
    this.recipientId = data.recipientId || '';
    /** @type {Date|null} */
    this.createdAt = data.createdAt || null;
    /** @type {string[]} */
    this.mediaUrls = data.mediaUrls || [];
    /** @type {string} */
    this.conversationId = data.conversationId || '';
  }

  /**
   * Parse a raw DM entry from Twitter's conversation_timeline response.
   *
   * @param {Object} raw - Raw message data
   * @param {string} [conversationId] - Parent conversation ID
   * @returns {Message|null}
   */
  static fromRaw(raw, conversationId = '') {
    if (!raw) return null;

    const msgData = raw.message_data || raw;
    const mediaUrls = [];

    if (msgData.attachment?.media) {
      const m = msgData.attachment.media;
      mediaUrls.push(m.media_url_https || m.media_url || '');
    }
    if (msgData.entities?.urls) {
      for (const u of msgData.entities.urls) {
        if (u.expanded_url) mediaUrls.push(u.expanded_url);
      }
    }

    let createdAt = null;
    if (msgData.time || raw.time) {
      createdAt = new Date(parseInt(msgData.time || raw.time, 10));
    } else if (msgData.created_timestamp) {
      createdAt = new Date(parseInt(msgData.created_timestamp, 10));
    }

    return new Message({
      id: raw.id || msgData.id || '',
      text: msgData.text || '',
      senderId: msgData.sender_id || '',
      recipientId: msgData.recipient_id || '',
      createdAt,
      mediaUrls,
      conversationId: conversationId || raw.conversation_id || '',
    });
  }
}

export default Message;
