/**
 * Tests — src/a2a/skillRegistry.js
 * @author nich (@nichxbt)
 */

import {
  convertMcpToolToA2aSkill,
  getSkillCategories,
  searchSkills,
  getSkillById,
  getAllSkills,
  refreshSkills,
} from '../../src/a2a/skillRegistry.js';

describe('convertMcpToolToA2aSkill', () => {
  it('converts an MCP tool to an A2A skill', () => {
    const tool = {
      name: 'x_get_profile',
      description: 'Get a Twitter profile by username',
      inputSchema: {
        type: 'object',
        properties: { username: { type: 'string' } },
        required: ['username'],
      },
    };
    const skill = convertMcpToolToA2aSkill(tool);
    expect(skill.id).toBe('xactions.x_get_profile');
    expect(skill.name).toBe('x_get_profile');
    expect(skill.description).toContain('profile');
    expect(skill.inputSchema).toEqual(tool.inputSchema);
    expect(skill.tags).toBeDefined();
  });

  it('assigns correct category tags', () => {
    const tool = { name: 'x_scrape_followers', description: 'Scrape follower list' };
    const skill = convertMcpToolToA2aSkill(tool);
    expect(skill.tags).toEqual(expect.arrayContaining(['scraping']));
  });

  it('handles tools with no description', () => {
    const skill = convertMcpToolToA2aSkill({ name: 'x_noop' });
    expect(skill.id).toBe('xactions.x_noop');
    expect(skill.description).toBe('');
  });
});

describe('getAllSkills', () => {
  it('returns an array of skills', () => {
    const skills = getAllSkills();
    expect(Array.isArray(skills)).toBe(true);
    expect(skills.length).toBeGreaterThan(10);
  });

  it('each skill has id, name, description', () => {
    const skills = getAllSkills();
    for (const s of skills.slice(0, 5)) {
      expect(s.id).toBeDefined();
      expect(s.name).toBeDefined();
    }
  });
});

describe('getSkillById', () => {
  it('finds a known skill', () => {
    const skill = getSkillById('xactions.x_get_profile');
    expect(skill).toBeDefined();
    expect(skill.name).toBe('x_get_profile');
  });

  it('returns undefined for unknown skill', () => {
    expect(getSkillById('xactions.nonexistent')).toBeUndefined();
  });
});

describe('searchSkills', () => {
  it('finds skills by keyword', () => {
    const results = searchSkills({ query: 'profile' });
    expect(results.length).toBeGreaterThan(0);
    expect(results.some(s => s.id.includes('profile') || s.description?.includes('profile'))).toBe(true);
  });

  it('returns empty for garbage query', () => {
    const results = searchSkills({ query: 'zzzzzzz_not_a_tool_zzzzzzz' });
    expect(results).toHaveLength(0);
  });

  it('filters by category', () => {
    const results = searchSkills({ category: 'scraping' });
    expect(results.length).toBeGreaterThan(0);
  });
});

describe('getSkillCategories', () => {
  it('returns category names', () => {
    const cats = getSkillCategories();
    expect(Array.isArray(cats)).toBe(true);
    expect(cats.length).toBeGreaterThan(5);
  });
});

describe('refreshSkills', () => {
  it('does not throw', async () => {
    await expect(refreshSkills()).resolves.not.toThrow();
  });
});
