// Copyright (c) 2024-2026 nich (@nichxbt). Licensed under the Apache License, Version 2.0.
// XActions - `xactions skills` tests. Offline: every write goes to a temp dir.

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  SKILLS_DIR,
  TARGETS,
  countInstalledSkills,
  destinationFor,
  installSkill,
  installedTargets,
  listSkills,
  parseFrontmatter,
  resolveSkills,
  syncAgentsMd,
  uninstallSkill,
  wrapForTarget,
} from '../../src/cli/commands/skills.js';

const CLI = fileURLToPath(new URL('../../src/cli/index.js', import.meta.url));

/** Run the real binary with HOME and cwd pointed at a temp directory. */
function cli(args, dir) {
  return execFileSync(process.execPath, [CLI, ...args], {
    cwd: dir,
    env: { ...process.env, HOME: dir, FORCE_COLOR: '0' },
    encoding: 'utf-8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
}

describe('skills', () => {
  let dir;

  beforeEach(async () => {
    dir = await fs.mkdtemp(path.join(os.tmpdir(), 'xactions-skills-'));
  });

  afterEach(async () => {
    await fs.rm(dir, { recursive: true, force: true });
  });

  describe('parseFrontmatter', () => {
    it('reads flat keys and leaves the body intact', () => {
      const { data, body } = parseFrontmatter('---\nname: demo\ndescription: Does a thing. Use when asked.\nlicense: Apache-2.0\n---\n\n# Demo\n\nBody.\n');
      expect(data.name).toBe('demo');
      expect(data.description).toBe('Does a thing. Use when asked.');
      expect(body).toBe('\n# Demo\n\nBody.\n');
    });

    it('folds an indented continuation into the previous key', () => {
      const { data } = parseFrontmatter('---\nname: demo\ndescription: First line\n  second line\n---\n');
      expect(data.description).toBe('First line second line');
    });

    it('does not fold nested map keys into a scalar', () => {
      const { data } = parseFrontmatter('---\ndescription: Top\nmetadata:\n  author: nichxbt\n  version: "1.0"\n---\n');
      expect(data.description).toBe('Top');
      expect(data.metadata).toBe('');
    });

    it('returns nested maps such as metadata separately', () => {
      const { maps } = parseFrontmatter('---\ndescription: Top\nmetadata:\n  author: nichxbt\n  version: "1.0"\n  arguments: account topic\n---\n');
      expect(maps.metadata).toEqual({ author: 'nichxbt', version: '1.0', arguments: 'account topic' });
    });

    it('returns the whole document when there is no frontmatter', () => {
      const { data, body } = parseFrontmatter('# Plain\n');
      expect(data).toEqual({});
      expect(body).toBe('# Plain\n');
    });
  });

  describe('listSkills', () => {
    it('resolves the bundled directory relative to the package', () => {
      expect(SKILLS_DIR.endsWith(`${path.sep}skills${path.sep}`)).toBe(true);
    });

    it('lists every skill in index.json that has a SKILL.md, with name and description', async () => {
      const skills = await listSkills();
      expect(skills.length).toBeGreaterThan(30);
      for (const skill of skills) {
        expect(skill.id).toMatch(/^[a-z0-9-]+$/);
        expect(skill.name.length).toBeGreaterThan(0);
        expect(skill.description.length).toBeGreaterThan(10);
        expect(skill.file.endsWith('SKILL.md')).toBe(true);
      }
    });

    it('resolves names by id or display name, case-insensitively', async () => {
      const skills = await listSkills();
      const { found, missing } = resolveSkills(skills, ['Account-Backup', 'account-backup', 'nope']);
      expect(found.map((s) => s.id)).toEqual(['account-backup']);
      expect(missing).toEqual(['nope']);
    });
  });

  describe('destinationFor', () => {
    const skill = { id: 'demo' };
    const scope = { home: '/h', cwd: '/p' };

    it('maps each target to its directory', () => {
      expect(destinationFor('claude', skill, { ...scope, global: true }).path).toBe('/h/.claude/skills/demo');
      expect(destinationFor('claude', skill, scope).path).toBe('/p/.claude/skills/demo');
      expect(destinationFor('project', skill, { ...scope, global: true }).path).toBe('/p/.claude/skills/demo');
      expect(destinationFor('codex', skill, { ...scope, global: true }).path).toBe('/h/.codex/skills/demo');
      expect(destinationFor('cursor', skill, { ...scope, global: true }).path).toBe('/p/.cursor/rules/demo.mdc');
      expect(destinationFor('windsurf', skill, scope).path).toBe('/p/.windsurf/rules/demo.md');
    });

    it('rejects an unknown target with the list of valid ones', () => {
      expect(() => destinationFor('emacs', skill, scope)).toThrow(TARGETS.join(', '));
    });
  });

  describe('install and uninstall', () => {
    it('copies a whole skill directory for Claude and is idempotent', async () => {
      const [skill] = resolveSkills(await listSkills(), ['growth-automation']).found;
      const scope = { home: dir, cwd: dir, global: true };

      const first = await installSkill('claude', skill, scope);
      expect(first.action).toBe('installed');
      const copied = await fs.readFile(path.join(first.path, 'SKILL.md'), 'utf-8');
      expect(copied).toBe(await fs.readFile(skill.file, 'utf-8'));

      const second = await installSkill('claude', skill, scope);
      expect(second.action).toBe('unchanged');

      // A stale copy is refreshed rather than left alone.
      await fs.writeFile(path.join(first.path, 'SKILL.md'), 'stale');
      const third = await installSkill('claude', skill, scope);
      expect(third.action).toBe('updated');
      expect(await fs.readFile(path.join(first.path, 'SKILL.md'), 'utf-8')).not.toBe('stale');

      expect(await installedTargets(skill, { home: dir, cwd: path.join(dir, 'elsewhere') })).toEqual(['claude (global)']);

      const removed = await uninstallSkill('claude', skill, scope);
      expect(removed.action).toBe('removed');
      expect((await uninstallSkill('claude', skill, scope)).action).toBe('absent');
      await expect(fs.access(first.path)).rejects.toThrow();
    });

    it('wraps SKILL.md as a Cursor .mdc rule with its own frontmatter', async () => {
      const [skill] = resolveSkills(await listSkills(), ['account-backup']).found;
      const result = await installSkill('cursor', skill, { home: dir, cwd: dir });
      const content = await fs.readFile(result.path, 'utf-8');
      expect(content.startsWith('---\ndescription: "')).toBe(true);
      expect(content).toContain('alwaysApply: false');
      expect(content).toContain(`Relative paths below resolve against \`${skill.dir}\``);
      expect(content).toContain('# Account Backup');
      // The original frontmatter must not appear a second time.
      expect(content.match(/^---$/gm).length).toBe(2);
    });

    it('wraps SKILL.md as a Windsurf rule', async () => {
      const [skill] = resolveSkills(await listSkills(), ['account-backup']).found;
      const content = wrapForTarget('windsurf', skill, await fs.readFile(skill.file, 'utf-8'));
      expect(content.startsWith('---\ntrigger: model_decision\n')).toBe(true);
    });

    it('maintains a managed AGENTS.md block for Codex and removes it when empty', async () => {
      const skills = resolveSkills(await listSkills(), ['account-backup', 'a2a-multi-agent']).found;
      const scope = { home: dir, cwd: dir };
      await fs.writeFile(path.join(dir, 'AGENTS.md'), '# My project\n\nKeep this.\n');

      for (const skill of skills) await installSkill('codex', skill, scope);
      expect((await syncAgentsMd(scope)).action).toBe('updated');
      const agents = await fs.readFile(path.join(dir, 'AGENTS.md'), 'utf-8');
      expect(agents).toContain('Keep this.');
      expect(agents).toContain('<!-- xactions-skills:start -->');
      expect(agents).toContain(path.join(dir, '.codex', 'skills', 'account-backup', 'SKILL.md'));
      expect(agents.match(/xactions-skills:start/g).length).toBe(1);

      expect((await syncAgentsMd(scope)).action).toBe('unchanged');

      for (const skill of skills) await uninstallSkill('codex', skill, scope);
      expect((await syncAgentsMd(scope)).action).toBe('removed');
      expect(await fs.readFile(path.join(dir, 'AGENTS.md'), 'utf-8')).toBe('# My project\n\nKeep this.\n');
    });

    it('counts installs per target for doctor', async () => {
      const [skill] = resolveSkills(await listSkills(), ['account-backup']).found;
      await installSkill('claude', skill, { home: dir, cwd: dir, global: true });
      await installSkill('cursor', skill, { home: dir, cwd: dir });
      const counts = await countInstalledSkills({ home: dir, cwd: dir });
      expect(counts).toEqual({ claude: 1, cursor: 1, codex: 0, windsurf: 0, total: 2 });
    });
  });

  describe('binary', () => {
    it('lists skills as JSON', () => {
      const rows = JSON.parse(cli(['skills', 'list', '--json'], dir));
      expect(rows.length).toBeGreaterThan(30);
      expect(rows[0]).toHaveProperty('id');
      expect(rows[0]).toHaveProperty('description');
      expect(rows[0].installed).toEqual([]);
    });

    it('installs into a temp HOME and then lists it as installed', async () => {
      const out = JSON.parse(cli(['skills', 'install', 'account-backup', '--global', '--json'], dir));
      expect(out).toEqual([
        expect.objectContaining({ skill: 'account-backup', target: 'claude', action: 'installed' }),
      ]);
      await fs.access(path.join(dir, '.claude', 'skills', 'account-backup', 'SKILL.md'));

      const rows = JSON.parse(cli(['skills', 'list', '--json'], dir));
      expect(rows.find((r) => r.id === 'account-backup').installed).toEqual(['claude (global)']);

      const again = JSON.parse(cli(['skills', 'install', 'account-backup', '--global', '--json'], dir));
      expect(again[0].action).toBe('unchanged');
    });

    it('shows one skill in full', () => {
      const out = cli(['skills', 'show', 'account-backup'], dir);
      expect(out.startsWith('---\nname: account-backup')).toBe(true);
    });

    it('fails clearly on an unknown skill', () => {
      expect(() => cli(['skills', 'install', 'not-a-skill'], dir)).toThrow(/Unknown skill: not-a-skill/);
    });
  });
});
