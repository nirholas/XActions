// XActions — LLM Brain Tests
// by nichxbt

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { LLMBrain } from '../../src/agents/llmBrain.js';

// Mock global fetch
const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

function mockResponse(content, { inputTokens = 10, outputTokens = 5, status = 200 } = {}) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => ({
      choices: [{ message: { content } }],
      usage: { prompt_tokens: inputTokens, completion_tokens: outputTokens },
    }),
    text: async () => content,
  };
}

describe('LLMBrain', () => {
  let brain;

  beforeEach(() => {
    mockFetch.mockReset();
    brain = new LLMBrain({
      provider: 'openrouter',
      apiKey: 'test-key-123',
      models: {
        fast: 'deepseek/deepseek-chat',
        mid: 'anthropic/claude-3.5-haiku',
        smart: 'anthropic/claude-sonnet-4',
      },
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('scoreRelevance', () => {
    it('should return a score between 0 and 100', async () => {
      mockFetch.mockResolvedValue(mockResponse('85'));
      const score = await brain.scoreRelevance('AI is changing the world', ['AI', 'machine learning']);
      expect(score).toBe(85);
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(100);
    });

    it('should use the fast model', async () => {
      mockFetch.mockResolvedValue(mockResponse('72'));
      await brain.scoreRelevance('test tweet', ['test']);

      const call = mockFetch.mock.calls[0];
      const body = JSON.parse(call[1].body);
      expect(body.model).toBe('deepseek/deepseek-chat');
    });

    it('should return 50 on JSON parse error', async () => {
      mockFetch.mockResolvedValue(mockResponse('not a number at all'));
      const score = await brain.scoreRelevance('test', ['test']);
      expect(score).toBe(50);
    });

    it('should return 50 on fetch error', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'));
      const score = await brain.scoreRelevance('test', ['test']);
      expect(score).toBe(50);
    });

    it('should clamp out-of-range scores to 50', async () => {
      mockFetch.mockResolvedValue(mockResponse('999'));
      const score = await brain.scoreRelevance('test', ['test']);
      expect(score).toBe(50);
    });
  });

  describe('generateReply', () => {
    const tweet = { text: 'AI agents are the future of automation', author: 'testuser' };
    const persona = {
      name: 'Alex',
      tone: 'curious, technical',
      expertise: ['AI', 'devtools'],
      opinions: ['Open source wins'],
      avoid: ['corporate jargon'],
    };

    it('should return a non-empty reply string', async () => {
      mockFetch.mockResolvedValue(mockResponse('That is a really interesting angle on AI agents.'));
      const reply = await brain.generateReply(tweet, persona);
      expect(typeof reply).toBe('string');
      expect(reply.length).toBeGreaterThan(0);
    });

    it('should use the mid model', async () => {
      mockFetch.mockResolvedValue(mockResponse('Interesting perspective.'));
      await brain.generateReply(tweet, persona);

      const call = mockFetch.mock.calls[0];
      const body = JSON.parse(call[1].body);
      expect(body.model).toBe('anthropic/claude-3.5-haiku');
    });

    it('should include persona context in system message', async () => {
      mockFetch.mockResolvedValue(mockResponse('Nice.'));
      await brain.generateReply(tweet, persona);

      const call = mockFetch.mock.calls[0];
      const body = JSON.parse(call[1].body);
      const systemMsg = body.messages.find((m) => m.role === 'system');
      expect(systemMsg.content).toContain('Alex');
      expect(systemMsg.content).toContain('corporate jargon');
    });

    it('should strip surrounding quotes from reply', async () => {
      mockFetch.mockResolvedValue(mockResponse('"This is my reply."'));
      const reply = await brain.generateReply(tweet, persona);
      expect(reply.startsWith('"')).toBe(false);
      expect(reply.endsWith('"')).toBe(false);
    });
  });

  describe('generateContent', () => {
    const params = {
      type: 'tweet',
      persona: { name: 'Alex', tone: 'witty', expertise: ['AI'], opinions: [], avoid: [] },
      niche: { name: 'AI' },
    };

    it('should return a tweet object', async () => {
      mockFetch.mockResolvedValue(mockResponse('AI is not just a tool, it is a paradigm shift.'));
      const result = await brain.generateContent(params);
      expect(result.type).toBe('tweet');
      expect(typeof result.text).toBe('string');
    });

    it('should use the smart model', async () => {
      mockFetch.mockResolvedValue(mockResponse('Test content.'));
      await brain.generateContent(params);

      const call = mockFetch.mock.calls[0];
      const body = JSON.parse(call[1].body);
      expect(body.model).toBe('anthropic/claude-sonnet-4');
    });

    it('should return thread as array for thread type', async () => {
      mockFetch.mockResolvedValue(mockResponse('First tweet\n---\nSecond tweet\n---\nThird tweet'));
      const result = await brain.generateContent({ ...params, type: 'thread' });
      expect(result.type).toBe('thread');
      expect(Array.isArray(result.text)).toBe(true);
      expect(result.text.length).toBe(3);
    });
  });

  describe('checkPersonaConsistency', () => {
    const persona = {
      name: 'Alex',
      tone: 'technical',
      expertise: ['AI'],
      avoid: ['corporate jargon'],
    };

    it('should return consistent true for matching content', async () => {
      mockFetch.mockResolvedValue(mockResponse('{"consistent": true, "issues": []}'));
      const result = await brain.checkPersonaConsistency('AI agents are powerful', persona);
      expect(result.consistent).toBe(true);
      expect(result.issues).toEqual([]);
    });

    it('should return issues for mismatched content', async () => {
      mockFetch.mockResolvedValue(mockResponse('{"consistent": false, "issues": ["Too corporate"]}'));
      const result = await brain.checkPersonaConsistency('Synergizing our AI stack', persona);
      expect(result.consistent).toBe(false);
      expect(result.issues.length).toBeGreaterThan(0);
    });

    it('should handle JSON parse errors gracefully', async () => {
      mockFetch.mockResolvedValue(mockResponse('not json'));
      const result = await brain.checkPersonaConsistency('test', persona);
      expect(result.consistent).toBe(true);
      expect(result.issues).toEqual([]);
    });
  });

  describe('retry logic', () => {
    it('should retry on 429 status', async () => {
      mockFetch
        .mockResolvedValueOnce({ ok: false, status: 429, text: async () => 'rate limited' })
        .mockResolvedValueOnce(mockResponse('75'));

      const score = await brain.scoreRelevance('test', ['test']);
      expect(score).toBe(75);
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it('should retry on 500 status', async () => {
      mockFetch
        .mockResolvedValueOnce({ ok: false, status: 500, text: async () => 'server error' })
        .mockResolvedValueOnce(mockResponse('60'));

      const score = await brain.scoreRelevance('test', ['test']);
      expect(score).toBe(60);
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });
  });

  describe('token usage tracking', () => {
    it('should track cumulative usage per model', async () => {
      mockFetch.mockResolvedValue(mockResponse('80', { inputTokens: 100, outputTokens: 20 }));
      await brain.scoreRelevance('test1', ['test']);
      await brain.scoreRelevance('test2', ['test']);

      const usage = brain.getUsageToday();
      const model = brain.models.fast;
      expect(usage[model]).toBeDefined();
      expect(usage[model].calls).toBe(2);
      expect(usage[model].inputTokens).toBe(200);
      expect(usage[model].outputTokens).toBe(40);
    });

    it('should call onUsage callback when set', async () => {
      const onUsage = vi.fn();
      brain.onUsage = onUsage;

      mockFetch.mockResolvedValue(mockResponse('50', { inputTokens: 50, outputTokens: 10 }));
      await brain.scoreRelevance('test', ['test']);

      expect(onUsage).toHaveBeenCalledWith('deepseek/deepseek-chat', 50, 10);
    });
  });

  describe('API request formatting', () => {
    it('should include Authorization header', async () => {
      mockFetch.mockResolvedValue(mockResponse('50'));
      await brain.scoreRelevance('test', ['test']);

      const call = mockFetch.mock.calls[0];
      expect(call[1].headers['Authorization']).toBe('Bearer test-key-123');
    });

    it('should include OpenRouter headers for openrouter provider', async () => {
      mockFetch.mockResolvedValue(mockResponse('50'));
      await brain.scoreRelevance('test', ['test']);

      const call = mockFetch.mock.calls[0];
      expect(call[1].headers['HTTP-Referer']).toBe('https://xactions.app');
      expect(call[1].headers['X-Title']).toBe('XActions Agent');
    });

    it('should POST to the correct URL', async () => {
      mockFetch.mockResolvedValue(mockResponse('50'));
      await brain.scoreRelevance('test', ['test']);

      const call = mockFetch.mock.calls[0];
      expect(call[0]).toBe('https://openrouter.ai/api/v1/chat/completions');
      expect(call[1].method).toBe('POST');
    });
  });
});
