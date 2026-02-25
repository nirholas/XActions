// XActions — LLM Brain Module
// Tiered LLM client for intelligent decision-making
// by nichxbt

/**
 * @typedef {Object} LLMConfig
 * @property {'openrouter'|'openai'|'ollama'} provider
 * @property {string} [apiKey]
 * @property {string} [baseUrl]
 * @property {{ fast: string, mid: string, smart: string }} models
 */

const DEFAULT_MODELS = {
  fast: 'deepseek/deepseek-chat',
  mid: 'anthropic/claude-3.5-haiku',
  smart: 'anthropic/claude-sonnet-4',
};

const PROVIDER_URLS = {
  openrouter: 'https://openrouter.ai/api/v1/chat/completions',
  openai: 'https://api.openai.com/v1/chat/completions',
  ollama: 'http://localhost:11434/v1/chat/completions',
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * Tiered LLM client for scoring, replying, content creation, and strategy analysis.
 */
class LLMBrain {
  /**
   * @param {LLMConfig} config
   */
  constructor(config = {}) {
    this.provider = config.provider || 'openrouter';
    this.apiKey = config.apiKey || process.env.OPENROUTER_API_KEY || process.env.OPENAI_API_KEY || '';
    this.baseUrl = config.baseUrl || PROVIDER_URLS[this.provider] || PROVIDER_URLS.openrouter;
    this.models = { ...DEFAULT_MODELS, ...(config.models || {}) };

    /** @type {Map<string, { count: number, resetAt: number }>} Rate limit counters per model */
    this._rateLimits = new Map();
    /** @type {{ [model: string]: { calls: number, inputTokens: number, outputTokens: number } }} */
    this._usageToday = {};
    this._usageDate = new Date().toISOString().split('T')[0];

    /** @type {((model: string, inputTokens: number, outputTokens: number) => void)|null} */
    this.onUsage = null; // External usage callback (e.g., database recorder)
  }

  // ─── Core LLM Call ────────────────────────────────────────────

  /**
   * Send a chat completion request to the configured LLM provider.
   * @param {'fast'|'mid'|'smart'} tier - Which model tier to use
   * @param {Array<{ role: string, content: string }>} messages
   * @param {{ temperature?: number, maxTokens?: number }} [options]
   * @returns {Promise<{ text: string, inputTokens: number, outputTokens: number }>}
   */
  async _call(tier, messages, options = {}) {
    const model = this.models[tier];
    await this._checkRateLimit(model);

    const body = {
      model,
      messages,
      temperature: options.temperature ?? 0.7,
      max_tokens: options.maxTokens ?? 1024,
    };

    let lastError;
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const headers = { 'Content-Type': 'application/json' };
        if (this.apiKey) headers['Authorization'] = `Bearer ${this.apiKey}`;
        if (this.provider === 'openrouter') {
          headers['HTTP-Referer'] = 'https://xactions.app';
          headers['X-Title'] = 'XActions Agent';
        }

        const res = await fetch(this.baseUrl, { method: 'POST', headers, body: JSON.stringify(body) });

        if (res.status === 429 || res.status >= 500) {
          const waitMs = Math.pow(2, attempt) * 1000 + Math.random() * 1000;
          console.log(`⏳ LLM ${res.status} — retrying in ${Math.round(waitMs)}ms (attempt ${attempt + 1}/3)`);
          lastError = new Error(`LLM API returned ${res.status}`);
          await sleep(waitMs);
          continue;
        }

        if (!res.ok) {
          const errText = await res.text().catch(() => 'unknown');
          throw new Error(`LLM API error ${res.status}: ${errText}`);
        }

        const data = await res.json();
        const text = data.choices?.[0]?.message?.content?.trim() || '';
        const inputTokens = data.usage?.prompt_tokens || 0;
        const outputTokens = data.usage?.completion_tokens || 0;

        this._recordUsage(model, inputTokens, outputTokens);
        this._bumpRateLimit(model);

        return { text, inputTokens, outputTokens };
      } catch (err) {
        lastError = err;
        if (attempt < 2) {
          const waitMs = Math.pow(2, attempt) * 1000 + Math.random() * 1000;
          console.log(`⏳ LLM error — retrying in ${Math.round(waitMs)}ms: ${err.message}`);
          await sleep(waitMs);
        }
      }
    }

    throw lastError;
  }

  // ─── Rate Limiting ────────────────────────────────────────────

  async _checkRateLimit(model) {
    const limit = this._rateLimits.get(model);
    if (!limit) return;
    if (Date.now() > limit.resetAt) {
      this._rateLimits.delete(model);
      return;
    }
    if (limit.count >= 10) {
      const waitMs = limit.resetAt - Date.now();
      console.log(`⏳ Rate limit for ${model} — waiting ${Math.round(waitMs / 1000)}s`);
      await sleep(waitMs);
      this._rateLimits.delete(model);
    }
  }

  _bumpRateLimit(model) {
    const existing = this._rateLimits.get(model);
    if (existing && Date.now() < existing.resetAt) {
      existing.count++;
    } else {
      this._rateLimits.set(model, { count: 1, resetAt: Date.now() + 60_000 });
    }
  }

  // ─── Usage Tracking ───────────────────────────────────────────

  _recordUsage(model, inputTokens, outputTokens) {
    const today = new Date().toISOString().split('T')[0];
    if (today !== this._usageDate) {
      this._usageToday = {};
      this._usageDate = today;
    }
    if (!this._usageToday[model]) {
      this._usageToday[model] = { calls: 0, inputTokens: 0, outputTokens: 0 };
    }
    this._usageToday[model].calls++;
    this._usageToday[model].inputTokens += inputTokens;
    this._usageToday[model].outputTokens += outputTokens;

    if (this.onUsage) {
      try { this.onUsage(model, inputTokens, outputTokens); } catch { /* noop */ }
    }
  }

  /**
   * Get today's cumulative token usage per model.
   * @returns {{ [model: string]: { calls: number, inputTokens: number, outputTokens: number } }}
   */
  getUsageToday() {
    return { ...this._usageToday };
  }

  // ─── Public Methods ───────────────────────────────────────────

  /**
   * Score a tweet's relevance to a niche (0-100).
   * Uses the fast model for cost efficiency.
   * @param {string} tweetText
   * @param {string[]} nicheKeywords
   * @returns {Promise<number>} Score from 0 to 100
   */
  async scoreRelevance(tweetText, nicheKeywords) {
    try {
      const { text } = await this._call('fast', [
        {
          role: 'system',
          content: 'You are a relevance scorer. Given a tweet and niche keywords, return ONLY a single integer 0-100 representing how relevant the tweet is to the niche. 0 = completely irrelevant, 100 = perfectly on-topic. Return ONLY the number, nothing else.',
        },
        {
          role: 'user',
          content: `Niche keywords: ${nicheKeywords.join(', ')}\n\nTweet: "${tweetText}"`,
        },
      ], { temperature: 0.1, maxTokens: 8 });

      const score = parseInt(text.replace(/\D/g, ''), 10);
      if (isNaN(score) || score < 0 || score > 100) return 50;
      return score;
    } catch (err) {
      console.log(`⚠️ scoreRelevance error: ${err.message} — returning default 50`);
      return 50;
    }
  }

  /**
   * Generate a contextual reply to a tweet.
   * Uses the mid model for quality/cost balance.
   * @param {{ text: string, author: string }} tweet
   * @param {{ name: string, tone: string, expertise: string[], opinions: string[], avoid: string[] }} persona
   * @param {string} [threadContext] - Previous tweets in thread for context
   * @returns {Promise<string>}
   */
  async generateReply(tweet, persona, threadContext) {
    const systemPrompt = [
      `You are ${persona.name}, with this voice: ${persona.tone}.`,
      `Your expertise: ${persona.expertise.join(', ')}.`,
      `Key opinions: ${persona.opinions.join('; ')}.`,
      `NEVER use: ${persona.avoid.join(', ')}.`,
      '',
      'Rules for replies:',
      '- 1-2 sentences max',
      '- No hashtags',
      '- Never start with "Great point", "Great take", "Love this", or similar generic openers',
      '- Be specific and add value — reference something concrete from the tweet',
      '- Vary your style: sometimes ask a question, sometimes share an insight, sometimes agree with a nuance',
      '- Sound like a real person, not a bot',
      '- Return ONLY the reply text, nothing else',
    ].join('\n');

    const userMsg = threadContext
      ? `Thread context:\n${threadContext}\n\nReply to @${tweet.author}: "${tweet.text}"`
      : `Reply to @${tweet.author}: "${tweet.text}"`;

    const { text } = await this._call('mid', [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userMsg },
    ], { temperature: 0.85, maxTokens: 150 });

    return text.replace(/^["']|["']$/g, '').trim();
  }

  /**
   * Generate original content (tweet, thread, or quote commentary).
   * Uses the smart model for highest quality.
   * @param {{ type: 'tweet'|'thread'|'quote', persona: Object, niche: Object, trends?: string[], recentPosts?: Array }} params
   * @returns {Promise<{ type: string, text: string|string[] }>}
   */
  async generateContent({ type, persona, niche, trends, recentPosts }) {
    const recentTexts = (recentPosts || []).slice(0, 10).map((p) => p.text).join('\n- ');

    const systemPrompt = [
      `You are ${persona.name}. Voice: ${persona.tone}.`,
      `Expertise: ${persona.expertise.join(', ')}.`,
      `Strong opinions: ${persona.opinions.join('; ')}.`,
      `AVOID: ${persona.avoid.join(', ')}.`,
      '',
      'Content creation rules:',
      '- Sound authentic and personal, not corporate',
      '- No hashtags unless absolutely natural',
      '- No engagement bait ("RT if you agree", "Like if...")',
      '- Be opinionated — take a clear stance',
      '- Reference real trends or experiences when possible',
      '- DO NOT repeat ideas from recent posts',
    ].join('\n');

    let userMsg;
    if (type === 'tweet') {
      userMsg = [
        'Write a single tweet (≤280 characters).',
        `Niche: ${niche.name}`,
        trends?.length ? `Current trends: ${trends.join(', ')}` : '',
        recentTexts ? `Recent posts to avoid repeating:\n- ${recentTexts}` : '',
        '',
        'Return ONLY the tweet text.',
      ].filter(Boolean).join('\n');
    } else if (type === 'thread') {
      userMsg = [
        'Write a Twitter thread (3-6 tweets). First tweet is the hook.',
        `Niche: ${niche.name}`,
        trends?.length ? `Current trends: ${trends.join(', ')}` : '',
        recentTexts ? `Recent posts to avoid repeating:\n- ${recentTexts}` : '',
        '',
        'Return each tweet on its own line, separated by ---',
      ].filter(Boolean).join('\n');
    } else if (type === 'quote') {
      userMsg = [
        'Write a quote-tweet commentary (≤280 characters). Add your unique angle.',
        `Niche: ${niche.name}`,
        '',
        'Return ONLY the commentary text.',
      ].filter(Boolean).join('\n');
    }

    const { text } = await this._call('smart', [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userMsg },
    ], { temperature: 0.9, maxTokens: type === 'thread' ? 1500 : 300 });

    if (type === 'thread') {
      const tweets = text.split(/\n*---\n*/).map((t) => t.trim()).filter(Boolean);
      return { type: 'thread', text: tweets };
    }

    return { type, text: text.replace(/^["']|["']$/g, '').trim() };
  }

  /**
   * Analyze agent metrics and generate strategic recommendations.
   * Uses the smart model.
   * @param {{ followers: Array, engagement: Array, content: Array, llmCost: number }} metrics
   * @returns {Promise<string>}
   */
  async analyzeStrategy(metrics) {
    const { text } = await this._call('smart', [
      {
        role: 'system',
        content: 'You are a social media growth strategist analyzing an automated X/Twitter account. Provide 3-5 specific, actionable recommendations based on the metrics. Be data-driven and concise.',
      },
      {
        role: 'user',
        content: `Weekly performance data:\n${JSON.stringify(metrics, null, 2)}\n\nProvide strategic recommendations.`,
      },
    ], { temperature: 0.7, maxTokens: 800 });

    return text;
  }

  /**
   * Check if content is consistent with the persona voice.
   * Uses the fast model.
   * @param {string} text - Content to check
   * @param {{ name: string, tone: string, expertise: string[], avoid: string[] }} persona
   * @returns {Promise<{ consistent: boolean, issues: string[] }>}
   */
  async checkPersonaConsistency(text, persona) {
    try {
      const { text: response } = await this._call('fast', [
        {
          role: 'system',
          content: [
            'Check if the following text matches this persona:',
            `Name: ${persona.name}`,
            `Tone: ${persona.tone}`,
            `Expertise: ${persona.expertise.join(', ')}`,
            `Must avoid: ${persona.avoid.join(', ')}`,
            '',
            'Return JSON: { "consistent": true/false, "issues": ["issue1", ...] }',
            'Return ONLY valid JSON.',
          ].join('\n'),
        },
        { role: 'user', content: text },
      ], { temperature: 0.1, maxTokens: 200 });

      const parsed = JSON.parse(response);
      return {
        consistent: Boolean(parsed.consistent),
        issues: Array.isArray(parsed.issues) ? parsed.issues : [],
      };
    } catch {
      return { consistent: true, issues: [] };
    }
  }
}

export { LLMBrain };
