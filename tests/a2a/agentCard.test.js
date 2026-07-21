// Copyright (c) 2024-2026 nich (@nichxbt). Licensed under the Apache License, Version 2.0.
/**
 * Tests — src/a2a/agentCard.js
 * @author nich (@nichxbt)
 */

import {
  generateAgentCard,
  generateMinimalCard,
  diffCards,
  clearCardCache,
} from '../../src/a2a/agentCard.js';

afterEach(() => {
  clearCardCache();
});

describe('generateAgentCard', () => {
  it('returns a valid agent card object', () => {
    const card = generateAgentCard({ baseUrl: 'http://localhost:3100' });
    expect(card.name).toBe('XActions Agent');
    expect(card.url).toBe('http://localhost:3100');
    expect(card.version).toBe('3.1.0');
    expect(card.provider).toBeDefined();
    expect(card.provider.organization).toContain('XActions');
    expect(Array.isArray(card.skills)).toBe(true);
    expect(card.capabilities).toBeDefined();
  });

  it('includes skills from the registry', () => {
    const card = generateAgentCard({ baseUrl: 'http://localhost:3100' });
    expect(card.skills.length).toBeGreaterThan(10);
  });

  it('caches subsequent calls', () => {
    const a = generateAgentCard({ baseUrl: 'http://localhost:3100' });
    const b = generateAgentCard({ baseUrl: 'http://localhost:3100' });
    expect(a).toEqual(b);
  });

  it('accepts capability overrides', () => {
    const card = generateAgentCard({
      baseUrl: 'http://x.com',
      enableStreaming: false,
      enablePush: true,
    });
    expect(card.capabilities.streaming).toBe(false);
    expect(card.capabilities.pushNotifications).toBe(true);
  });

  it('always uses XActions Agent as the name', () => {
    // generateAgentCard hardcodes name to 'XActions Agent'
    const card = generateAgentCard({
      baseUrl: 'http://test.com',
    });
    expect(card.name).toBe('XActions Agent');
  });
});

describe('generateMinimalCard', () => {
  it('strips skills from a full card', () => {
    const full = generateAgentCard({ baseUrl: 'http://localhost:3100' });
    const mini = generateMinimalCard(full);
    expect(mini.name).toBe(full.name);
    expect(mini.url).toBe(full.url);
    expect(mini.skills).toBeUndefined();
  });
});

describe('diffCards', () => {
  it('detects no changes for identical cards', () => {
    const card = generateAgentCard({ baseUrl: 'http://localhost:3100' });
    clearCardCache();
    const card2 = generateAgentCard({ baseUrl: 'http://localhost:3100' });
    const diff = diffCards(card, card2);
    expect(diff.changed).toHaveLength(0);
    expect(diff.added).toHaveLength(0);
    expect(diff.removed).toHaveLength(0);
  });

  it('detects name change', () => {
    const a = { name: 'A', url: 'http://a.com', version: '1', skills: [] };
    const b = { name: 'B', url: 'http://a.com', version: '1', skills: [] };
    const diff = diffCards(a, b);
    expect(diff.changed.length).toBeGreaterThan(0);
    expect(diff.changed.some(c => c.field === 'name')).toBe(true);
  });

  it('detects url change', () => {
    const a = { name: 'X', url: 'http://a.com', version: '1', skills: [] };
    const b = { name: 'X', url: 'http://b.com', version: '1', skills: [] };
    const diff = diffCards(a, b);
    expect(diff.changed.length).toBeGreaterThan(0);
    expect(diff.changed.some(c => c.field === 'url')).toBe(true);
  });
});

describe('clearCardCache', () => {
  it('clears so regeneration works', () => {
    // generateAgentCard always uses 'XActions Agent' as the name,
    // but clearCardCache ensures the card is regenerated fresh
    generateAgentCard({ baseUrl: 'http://localhost:3100' });
    clearCardCache();
    const card = generateAgentCard({ baseUrl: 'http://localhost:9999' });
    expect(card.url).toBe('http://localhost:9999');
  });
});
