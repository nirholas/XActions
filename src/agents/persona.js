// XActions — Persona Manager
// Manages persona consistency across all generated content
// by nichxbt

const COMMENT_STYLES = ['question', 'agreement', 'insight', 'humor', 'pushback'];

/**
 * @typedef {Object} PersonaConfig
 * @property {string} name
 * @property {string} [handle]
 * @property {string} [niche]
 * @property {string} tone
 * @property {string[]} expertise
 * @property {string[]} opinions
 * @property {string[]} avoid
 * @property {string[]} [exampleTweets]
 * @property {{ question?: number, agreement?: number, insight?: number, humor?: number, pushback?: number }} [replyStyles]
 */

/**
 * Persona manager — provides persona context to LLM calls and validates content.
 */
class Persona {
  /**
   * @param {PersonaConfig} config
   */
  constructor(config) {
    this.name = config.name || 'Agent';
    this.handle = config.handle || '';
    this.niche = config.niche || '';
    this.tone = config.tone || 'knowledgeable and approachable';
    this.expertise = config.expertise || [];
    this.opinions = config.opinions || [];
    this.avoid = config.avoid || [];
    this.exampleTweets = [...(config.exampleTweets || [])];
    this.replyStyles = {
      question: 20,
      agreement: 30,
      insight: 30,
      humor: 15,
      pushback: 5,
      ...(config.replyStyles || {}),
    };

    /** @type {Array<{ text: string, metrics?: Object, addedAt: string }>} */
    this._voiceExamples = this.exampleTweets.map((t) => ({
      text: t,
      addedAt: new Date().toISOString(),
    }));
  }

  /**
   * Get persona description formatted for LLM system prompts.
   * @returns {string}
   */
  getContext() {
    const parts = [
      `You are ${this.name}${this.handle ? ` (${this.handle})` : ''}.`,
    ];
    if (this.niche) parts.push(`Niche: ${this.niche}.`);
    parts.push(`Tone: ${this.tone}.`);
    if (this.expertise.length) parts.push(`Areas of expertise: ${this.expertise.join(', ')}.`);
    if (this.opinions.length) parts.push(`Key opinions/stances: ${this.opinions.join('; ')}.`);
    if (this.avoid.length) parts.push(`NEVER use or do: ${this.avoid.join(', ')}.`);

    const examples = this.getExamplePosts(3);
    if (examples.length > 0) {
      parts.push('');
      parts.push('Example posts in your voice:');
      for (const ex of examples) {
        parts.push(`- "${ex}"`);
      }
    }

    return parts.join('\n');
  }

  /**
   * Get recent example posts for style reference.
   * @param {number} [n=5]
   * @returns {string[]}
   */
  getExamplePosts(n = 5) {
    // Prioritize examples with good metrics, then most recent
    const sorted = [...this._voiceExamples].sort((a, b) => {
      const aScore = a.metrics?.likes || 0;
      const bScore = b.metrics?.likes || 0;
      if (bScore !== aScore) return bScore - aScore;
      return new Date(b.addedAt) - new Date(a.addedAt);
    });
    return sorted.slice(0, n).map((e) => e.text);
  }

  /**
   * Add a successful post as a voice example.
   * @param {string} text
   * @param {{ likes?: number, impressions?: number, replies?: number }} [metrics]
   */
  addExample(text, metrics) {
    this._voiceExamples.push({
      text,
      metrics: metrics || null,
      addedAt: new Date().toISOString(),
    });
    // Keep max 50 examples
    if (this._voiceExamples.length > 50) {
      this._voiceExamples = this._voiceExamples.slice(-50);
    }
  }

  /**
   * Validate content against persona rules.
   * @param {string} text
   * @returns {{ valid: boolean, issues: string[] }}
   */
  validateContent(text) {
    const issues = [];

    // Check character limit
    if (text.length > 280) {
      issues.push(`Over character limit: ${text.length}/280`);
    }

    // Check for empty content
    if (!text.trim()) {
      issues.push('Content is empty');
    }

    // Check for banned phrases/patterns
    const lowerText = text.toLowerCase();
    for (const avoided of this.avoid) {
      const lowerAvoided = avoided.toLowerCase();
      if (lowerText.includes(lowerAvoided)) {
        issues.push(`Contains avoided phrase: "${avoided}"`);
      }
    }

    // Check for common bot indicators
    const botPatterns = [
      /^great (point|take|thread|post)/i,
      /^love this/i,
      /^this is (so )?amazing/i,
      /\bRT if you\b/i,
      /\blike if you\b/i,
      /\bfollow me\b/i,
      /\bcheck out my\b/i,
    ];
    for (const pattern of botPatterns) {
      if (pattern.test(text)) {
        issues.push(`Matches bot pattern: ${pattern.source}`);
      }
    }

    // Check for excessive hashtags
    const hashtags = (text.match(/#\w+/g) || []);
    if (hashtags.length > 2) {
      issues.push(`Too many hashtags (${hashtags.length}) — keep ≤2`);
    }

    // Check for excessive emojis
    const emojiRegex = /[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu;
    const emojis = text.match(emojiRegex) || [];
    if (emojis.length > 4) {
      issues.push(`Too many emojis (${emojis.length}) — keep ≤4`);
    }

    return { valid: issues.length === 0, issues };
  }

  /**
   * Get a random comment style weighted by persona's reply style distribution.
   * @returns {'question'|'agreement'|'insight'|'humor'|'pushback'}
   */
  getRandomCommentStyle() {
    const weights = this.replyStyles;
    const total = Object.values(weights).reduce((sum, w) => sum + w, 0);
    let r = Math.random() * total;

    for (const style of COMMENT_STYLES) {
      r -= weights[style] || 0;
      if (r <= 0) return style;
    }
    return 'insight'; // fallback
  }

  /**
   * Export persona config for serialization.
   * @returns {PersonaConfig}
   */
  toJSON() {
    return {
      name: this.name,
      handle: this.handle,
      niche: this.niche,
      tone: this.tone,
      expertise: this.expertise,
      opinions: this.opinions,
      avoid: this.avoid,
      exampleTweets: this.getExamplePosts(10),
      replyStyles: this.replyStyles,
    };
  }
}

export { Persona };
