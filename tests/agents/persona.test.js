// XActions — Persona Tests
// by nichxbt

import { describe, it, expect, beforeEach } from 'vitest';
import { Persona } from '../../src/agents/persona.js';

describe('Persona', () => {
  let persona;

  beforeEach(() => {
    persona = new Persona({
      name: 'Alex',
      handle: '@alexbuilds',
      niche: 'AI & developer tools',
      tone: 'curious, technical but accessible, witty',
      expertise: ['LLM engineering', 'devtools', 'AI agents'],
      opinions: ['Open source wins', 'AI augments devs'],
      avoid: ['corporate jargon', 'hashtag spam', 'engagement bait'],
      exampleTweets: [
        'Just spent 3 hours debugging a prompt. The future of programming is proofreading.',
        'Hot take: Most AI wrappers would be better as a bash script.',
      ],
      replyStyles: { question: 20, agreement: 25, insight: 35, humor: 15, pushback: 5 },
    });
  });

  describe('getContext', () => {
    it('should return a non-empty string', () => {
      const context = persona.getContext();
      expect(typeof context).toBe('string');
      expect(context.length).toBeGreaterThan(0);
    });

    it('should include persona name', () => {
      const context = persona.getContext();
      expect(context).toContain('Alex');
    });

    it('should include handle', () => {
      const context = persona.getContext();
      expect(context).toContain('@alexbuilds');
    });

    it('should include expertise', () => {
      const context = persona.getContext();
      expect(context).toContain('LLM engineering');
      expect(context).toContain('devtools');
    });

    it('should include avoid list', () => {
      const context = persona.getContext();
      expect(context).toContain('corporate jargon');
    });

    it('should include example posts', () => {
      const context = persona.getContext();
      expect(context).toContain('debugging a prompt');
    });
  });

  describe('getExamplePosts', () => {
    it('should return example posts', () => {
      const examples = persona.getExamplePosts(5);
      expect(examples.length).toBe(2);
    });

    it('should limit the number of examples', () => {
      for (let i = 0; i < 10; i++) {
        persona.addExample(`Example post ${i}`);
      }
      const examples = persona.getExamplePosts(3);
      expect(examples.length).toBe(3);
    });

    it('should prioritize examples with better metrics', () => {
      persona.addExample('Low performer', { likes: 1 });
      persona.addExample('High performer', { likes: 100 });
      const examples = persona.getExamplePosts(1);
      expect(examples[0]).toBe('High performer');
    });
  });

  describe('addExample', () => {
    it('should add an example', () => {
      const initialCount = persona.getExamplePosts(100).length;
      persona.addExample('New example post');
      expect(persona.getExamplePosts(100).length).toBe(initialCount + 1);
    });

    it('should cap at 50 examples', () => {
      for (let i = 0; i < 60; i++) {
        persona.addExample(`Post ${i}`);
      }
      // 2 initial + 60 added = 62, but capped at 50
      expect(persona._voiceExamples.length).toBeLessThanOrEqual(50);
    });
  });

  describe('validateContent', () => {
    it('should pass valid content', () => {
      const result = persona.validateContent('AI agents are changing how we build software.');
      expect(result.valid).toBe(true);
      expect(result.issues).toEqual([]);
    });

    it('should reject content over 280 characters', () => {
      const longText = 'A'.repeat(300);
      const result = persona.validateContent(longText);
      expect(result.valid).toBe(false);
      expect(result.issues.some((i) => i.includes('character limit'))).toBe(true);
    });

    it('should reject empty content', () => {
      const result = persona.validateContent('   ');
      expect(result.valid).toBe(false);
      expect(result.issues.some((i) => i.includes('empty'))).toBe(true);
    });

    it('should detect banned phrases', () => {
      const result = persona.validateContent('Let me use some corporate jargon here');
      expect(result.valid).toBe(false);
      expect(result.issues.some((i) => i.includes('corporate jargon'))).toBe(true);
    });

    it('should detect engagement bait', () => {
      const result = persona.validateContent('Let me use some engagement bait');
      expect(result.valid).toBe(false);
    });

    it('should detect bot-like patterns', () => {
      const result = persona.validateContent('Great point by @someone about AI');
      expect(result.valid).toBe(false);
      expect(result.issues.some((i) => i.includes('bot pattern'))).toBe(true);
    });

    it('should detect excessive hashtags', () => {
      const result = persona.validateContent('#AI #ML #LLM #coding #startup stuff');
      expect(result.valid).toBe(false);
      expect(result.issues.some((i) => i.includes('hashtag'))).toBe(true);
    });

    it('should allow content with 1-2 hashtags', () => {
      const result = persona.validateContent('Building something cool with #AI and #LLMs');
      // Only fails if "hashtag spam" is detected in the text (but it's in avoid, not the text)
      const hashtagIssues = result.issues.filter((i) => i.includes('hashtag'));
      expect(hashtagIssues.length).toBe(0);
    });
  });

  describe('getRandomCommentStyle', () => {
    it('should return a valid style', () => {
      const validStyles = ['question', 'agreement', 'insight', 'humor', 'pushback'];
      for (let i = 0; i < 20; i++) {
        const style = persona.getRandomCommentStyle();
        expect(validStyles).toContain(style);
      }
    });

    it('should respect weight distribution over many samples', () => {
      const counts = { question: 0, agreement: 0, insight: 0, humor: 0, pushback: 0 };
      const runs = 1000;
      for (let i = 0; i < runs; i++) {
        counts[persona.getRandomCommentStyle()]++;
      }
      // Insight (35%) should be more common than pushback (5%)
      expect(counts.insight).toBeGreaterThan(counts.pushback);
    });
  });

  describe('toJSON', () => {
    it('should return serializable config', () => {
      const json = persona.toJSON();
      expect(json.name).toBe('Alex');
      expect(json.handle).toBe('@alexbuilds');
      expect(json.tone).toContain('curious');
      expect(json.expertise).toContain('LLM engineering');
      expect(Array.isArray(json.exampleTweets)).toBe(true);
    });
  });
});
