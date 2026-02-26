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
    const card = generateAgentCard({ url: 'http://localhost:3100' });
    expect(card.name).toBe('XActions Agent');
    expect(card.url).toBe('http://localhost:3100');
    expect(card.version).toBe('1.0.0');
    expect(card.provider).toBeDefined();
    expect(card.provider.organization).toContain('XActions');
    expect(Array.isArray(card.skills)).toBe(true);
    expect(card.capabilities).toBeDefined();
  });

  it('includes skills from the registry', () => {
    const card = generateAgentCard({ url: 'http://localhost:3100' });
    expect(card.skills.length).toBeGreaterThan(10);
  });

  it('caches subsequent calls', () => {
    const a = generateAgentCard({ url: 'http://localhost:3100' });
    const b = generateAgentCard({ url: 'http://localhost:3100' });
    expect(a).toEqual(b);
  });

  it('accepts capability overrides', () => {
    const card = generateAgentCard({
      url: 'http://x.com',
      capabilities: { streaming: false, pushNotifications: true },
    });
    expect(card.capabilities.streaming).toBe(false);
    expect(card.capabilities.pushNotifications).toBe(true);
  });

  it('accepts name and description overrides', () => {
    const card = generateAgentCard({
      url: 'http://test.com',
      name: 'Custom Agent',
      description: 'A custom agent',
    });
    expect(card.name).toBe('Custom Agent');
    expect(card.description).toBe('A custom agent');
  });
});

describe('generateMinimalCard', () => {
  it('strips skills from a full card', () => {
    const full = generateAgentCard({ url: 'http://localhost:3100' });
    const mini = generateMinimalCard(full);
    expect(mini.name).toBe(full.name);
    expect(mini.url).toBe(full.url);
    expect(mini.skills).toBeUndefined();
  });
});

describe('diffCards', () => {
  it('detects no changes for identical cards', () => {
    const card = generateAgentCard({ url: 'http://localhost:3100' });
    clearCardCache();
    const card2 = generateAgentCard({ url: 'http://localhost:3100' });
    const diff = diffCards(card, card2);
    expect(diff.changed).toBe(false);
  });

  it('detects name change', () => {
    const a = { name: 'A', url: 'http://a.com', version: '1', skills: [] };
    const b = { name: 'B', url: 'http://a.com', version: '1', skills: [] };
    const diff = diffCards(a, b);
    expect(diff.changed).toBe(true);
    expect(diff.changes).toEqual(expect.arrayContaining([expect.stringContaining('name')]));
  });

  it('detects url change', () => {
    const a = { name: 'X', url: 'http://a.com', version: '1', skills: [] };
    const b = { name: 'X', url: 'http://b.com', version: '1', skills: [] };
    const diff = diffCards(a, b);
    expect(diff.changed).toBe(true);
  });
});

describe('clearCardCache', () => {
  it('clears so regeneration works', () => {
    generateAgentCard({ url: 'http://localhost:3100', name: 'First' });
    clearCardCache();
    const card = generateAgentCard({ url: 'http://localhost:3100', name: 'Second' });
    expect(card.name).toBe('Second');
  });
});
