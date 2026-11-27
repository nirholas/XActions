// Copyright (c) 2024-2026 nich (@nichxbt). Licensed under the Apache License, Version 2.0.
/**
 * `xactions skills` - put the bundled skills where your agent will read them.
 *
 * The `skills/` directory ships forty-odd SKILL.md files that teach a model
 * which XActions script to run for a job. Reading them requires knowing they
 * exist and where npm put them. This installs them into the places each
 * coding agent already looks:
 *
 *   claude    ~/.claude/skills/<id>/        (--global) or ./.claude/skills/<id>/
 *   project   ./.claude/skills/<id>/        (alias for claude without --global)
 *   cursor    ./.cursor/rules/<id>.mdc      SKILL.md wrapped in .mdc frontmatter
 *   codex     ~/.codex/skills/<id>/         (--global) or ./.codex/skills/<id>/
 *             plus a managed block in ./AGENTS.md pointing at them
 *   windsurf  ./.windsurf/rules/<id>.md     SKILL.md wrapped in Windsurf frontmatter
 *
 * Every write is idempotent: running install twice reports "unchanged", and
 * uninstall removes exactly what install wrote and nothing else.
 *
 * @author nich (@nichxbt) - https://github.com/nirholas
 * @license Apache-2.0
 */

import chalk from 'chalk';
import { createHash } from 'node:crypto';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * The bundled skills directory, resolved against this file rather than the
 * working directory so a global `npm install -g xactions` finds it too.
 */
export const SKILLS_DIR = fileURLToPath(new URL('../../../skills/', import.meta.url));

/** Install targets in the order they are listed to the user. */
export const TARGETS = ['claude', 'project', 'cursor', 'codex', 'windsurf'];

/** Targets that only make sense inside a project; `--global` is ignored for them. */
const PROJECT_ONLY = new Set(['project', 'cursor', 'windsurf']);

/** Markers around the block `codex` installs into AGENTS.md. */
const AGENTS_START = '<!-- xactions-skills:start -->';
const AGENTS_END = '<!-- xactions-skills:end -->';

/**
 * @typedef {object} Skill
 * @property {string} id - Directory name under skills/
 * @property {string} name - Frontmatter `name`, falling back to the index entry
 * @property {string} description - Frontmatter `description`
 * @property {string|null} version
 * @property {string} dir - Absolute path to the skill directory
 * @property {string} file - Absolute path to SKILL.md
 */

/**
 * Parse the YAML frontmatter of a SKILL.md.
 *
 * The files use a flat `key: value` layout with occasional folded values that
 * continue on indented lines, and a `metadata:` map. That is small enough to
 * read without a YAML dependency, and the parser refuses to guess: a line it
 * does not understand is skipped rather than misread.
 *
 * A nested map (`metadata:`) stays an empty string in `data`, so a caller that
 * wants scalars only never sees it, and its one level of `key: value` pairs is
 * returned in `maps` under the map's own name.
 *
 * @param {string} markdown
 * @returns {{data: Record<string, string>, body: string, maps: Record<string, Record<string, string>>}}
 */
export function parseFrontmatter(markdown) {
  const match = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/.exec(markdown);
  if (!match) return { data: {}, body: markdown, maps: {} };

  const data = {};
  /** @type {Record<string, Record<string, string>>} */
  const maps = {};
  let current = null;
  let currentMap = null;
  for (const rawLine of match[1].split(/\r?\n/)) {
    if (!rawLine.trim() || rawLine.trimStart().startsWith('#')) continue;
    const indented = /^\s/.test(rawLine);
    if (indented) {
      if (current) {
        data[current] = `${data[current]} ${rawLine.trim()}`.trim();
      } else if (currentMap) {
        const entry = /^\s+([A-Za-z0-9_-]+):\s*(.*)$/.exec(rawLine);
        if (entry) maps[currentMap][entry[1]] = entry[2].replace(/^["']|["']$/g, '');
      }
      continue;
    }
    const pair = /^([A-Za-z0-9_-]+):\s*(.*)$/.exec(rawLine);
    if (!pair) continue;
    const [, key, value] = pair;
    currentMap = null;
    if (value === '' || value === '|' || value === '>') {
      // A nested map (`metadata:`) or a block scalar. Nested map keys are
      // indented and would otherwise be folded into this key, so a bare map
      // key gets no accumulation; its entries go to `maps` instead.
      current = value === '' ? null : key;
      if (value === '') {
        currentMap = key;
        maps[key] = {};
      }
      data[key] = '';
      continue;
    }
    current = key;
    data[key] = value.replace(/^["']|["']$/g, '');
  }
  return { data, body: markdown.slice(match[0].length), maps };
}

/**
 * Read the catalogue: skills/index.json cross-checked against each SKILL.md.
 *
 * @param {string} [skillsDir=SKILLS_DIR]
 * @returns {Promise<Skill[]>}
 */
export async function listSkills(skillsDir = SKILLS_DIR) {
  const index = JSON.parse(await fs.readFile(path.join(skillsDir, 'index.json'), 'utf-8'));
  const skills = [];
  for (const entry of index.skills) {
    const dir = path.join(skillsDir, entry.id);
    const file = path.join(dir, 'SKILL.md');
    let data = {};
    try {
      ({ data } = parseFrontmatter(await fs.readFile(file, 'utf-8')));
    } catch {
      continue; // listed in the index but not on disk: nothing to install
    }
    skills.push({
      id: entry.id,
      name: data.name || entry.name || entry.id,
      description: data.description || entry.description || '',
      version: entry.version ?? null,
      dir,
      file,
    });
  }
  return skills;
}

/**
 * Resolve user-supplied names (ids, display names, case-insensitive) to skills.
 *
 * @param {Skill[]} skills
 * @param {string[]} names
 * @returns {{found: Skill[], missing: string[]}}
 */
export function resolveSkills(skills, names) {
  const found = [];
  const missing = [];
  for (const raw of names) {
    const wanted = raw.trim().toLowerCase();
    const skill = skills.find(
      (s) => s.id.toLowerCase() === wanted || s.name.toLowerCase() === wanted,
    );
    if (skill && !found.includes(skill)) found.push(skill);
    else if (!skill) missing.push(raw);
  }
  return { found, missing };
}

/**
 * Where a skill lands for a target.
 *
 * @param {string} target
 * @param {Skill|{id: string}} skill
 * @param {{global?: boolean, home?: string, cwd?: string}} [options]
 * @returns {{kind: 'dir'|'file', path: string, global: boolean}}
 */
export function destinationFor(target, skill, { global = false, home = os.homedir(), cwd = process.cwd() } = {}) {
  const useGlobal = global && !PROJECT_ONLY.has(target);
  switch (target) {
    case 'claude':
    case 'project':
      return {
        kind: 'dir',
        path: path.join(useGlobal ? home : cwd, '.claude', 'skills', skill.id),
        global: useGlobal,
      };
    case 'codex':
      return {
        kind: 'dir',
        path: path.join(useGlobal ? home : cwd, '.codex', 'skills', skill.id),
        global: useGlobal,
      };
    case 'cursor':
      return { kind: 'file', path: path.join(cwd, '.cursor', 'rules', `${skill.id}.mdc`), global: false };
    case 'windsurf':
      return { kind: 'file', path: path.join(cwd, '.windsurf', 'rules', `${skill.id}.md`), global: false };
    default:
      throw new Error(`Unknown target "${target}". Choose one of: ${TARGETS.join(', ')}.`);
  }
}

/**
 * Wrap a SKILL.md for a rules-file target. The body keeps every relative
 * script path it mentions, so the wrapper says where those paths resolve.
 *
 * @param {'cursor'|'windsurf'} target
 * @param {Skill} skill
 * @param {string} markdown - Raw SKILL.md content
 * @returns {string}
 */
export function wrapForTarget(target, skill, markdown) {
  const { body } = parseFrontmatter(markdown);
  const description = skill.description.replace(/\r?\n/g, ' ').replace(/"/g, '\\"');
  const source = `> Source: XActions skill \`${skill.id}\`. Relative paths below resolve against \`${skill.dir}\`.\n\n`;
  if (target === 'cursor') {
    return `---\ndescription: "${description}"\nglobs: []\nalwaysApply: false\n---\n\n${source}${body.trimStart()}`;
  }
  return `---\ntrigger: model_decision\ndescription: "${description}"\n---\n\n${source}${body.trimStart()}`;
}

/**
 * A stable digest of a directory tree, so an unchanged install can be reported
 * as such instead of being rewritten.
 * @param {string} dir
 * @returns {Promise<string|null>} Null when the directory does not exist
 */
async function digestTree(dir) {
  const hash = createHash('sha256');
  let entries;
  try {
    entries = await fs.readdir(dir, { withFileTypes: true, recursive: true });
  } catch {
    return null;
  }
  const files = entries
    .filter((e) => e.isFile())
    .map((e) => path.join(e.parentPath ?? e.path, e.name))
    .sort();
  for (const file of files) {
    hash.update(path.relative(dir, file));
    hash.update('\0');
    hash.update(await fs.readFile(file));
    hash.update('\0');
  }
  return hash.digest('hex');
}

/**
 * @param {string} file
 * @returns {Promise<string|null>}
 */
async function readIfExists(file) {
  try {
    return await fs.readFile(file, 'utf-8');
  } catch {
    return null;
  }
}

/**
 * Install one skill for one target.
 *
 * @param {string} target
 * @param {Skill} skill
 * @param {{global?: boolean, home?: string, cwd?: string}} [options]
 * @returns {Promise<{skill: string, target: string, path: string, action: 'installed'|'updated'|'unchanged'}>}
 */
export async function installSkill(target, skill, options = {}) {
  const dest = destinationFor(target, skill, options);
  await fs.mkdir(path.dirname(dest.path), { recursive: true });

  if (dest.kind === 'dir') {
    const before = await digestTree(dest.path);
    const source = await digestTree(skill.dir);
    if (before === source) return { skill: skill.id, target, path: dest.path, action: 'unchanged' };
    await fs.rm(dest.path, { recursive: true, force: true });
    await fs.cp(skill.dir, dest.path, { recursive: true });
    return { skill: skill.id, target, path: dest.path, action: before === null ? 'installed' : 'updated' };
  }

  const content = wrapForTarget(target, skill, await fs.readFile(skill.file, 'utf-8'));
  const before = await readIfExists(dest.path);
  if (before === content) return { skill: skill.id, target, path: dest.path, action: 'unchanged' };
  await fs.writeFile(dest.path, content);
  return { skill: skill.id, target, path: dest.path, action: before === null ? 'installed' : 'updated' };
}

/**
 * Remove one skill for one target.
 *
 * @param {string} target
 * @param {Skill|{id: string}} skill
 * @param {{global?: boolean, home?: string, cwd?: string}} [options]
 * @returns {Promise<{skill: string, target: string, path: string, action: 'removed'|'absent'}>}
 */
export async function uninstallSkill(target, skill, options = {}) {
  const dest = destinationFor(target, skill, options);
  try {
    await fs.access(dest.path);
  } catch {
    return { skill: skill.id, target, path: dest.path, action: 'absent' };
  }
  await fs.rm(dest.path, { recursive: true, force: true });
  return { skill: skill.id, target, path: dest.path, action: 'removed' };
}

/**
 * Rewrite the managed block in AGENTS.md so it lists exactly the installed
 * Codex skills. An empty list removes the block; a file that then contains
 * nothing else is deleted.
 *
 * @param {{cwd?: string, home?: string, global?: boolean}} options
 * @returns {Promise<{path: string, action: 'installed'|'updated'|'unchanged'|'removed'|'absent'}>}
 */
export async function syncAgentsMd({ cwd = process.cwd(), home = os.homedir(), global = false } = {}) {
  const skillsRoot = path.join(global ? home : cwd, '.codex', 'skills');
  const file = path.join(cwd, 'AGENTS.md');
  let installed = [];
  try {
    const entries = await fs.readdir(skillsRoot, { withFileTypes: true });
    installed = entries.filter((e) => e.isDirectory()).map((e) => e.name).sort();
  } catch {
    installed = [];
  }

  const existing = await readIfExists(file);
  const blockPattern = new RegExp(`\\n?${AGENTS_START}[\\s\\S]*?${AGENTS_END}\\n?`);
  const stripped = existing === null ? '' : existing.replace(blockPattern, '\n').replace(/\n{3,}/g, '\n\n');

  if (installed.length === 0) {
    if (existing === null) return { path: file, action: 'absent' };
    if (!blockPattern.test(existing)) return { path: file, action: 'unchanged' };
    if (stripped.trim() === '') {
      await fs.rm(file, { force: true });
    } else {
      await fs.writeFile(file, `${stripped.trimEnd()}\n`);
    }
    return { path: file, action: 'removed' };
  }

  const lines = installed.map((id) => `- \`${path.join(skillsRoot, id, 'SKILL.md')}\``);
  const block = [
    AGENTS_START,
    '## XActions skills',
    '',
    'Read the matching SKILL.md before working on an X/Twitter task:',
    '',
    ...lines,
    AGENTS_END,
  ].join('\n');
  const next = `${stripped.trimEnd()}${stripped.trim() ? '\n\n' : ''}${block}\n`;
  if (existing === next) return { path: file, action: 'unchanged' };
  await fs.writeFile(file, next);
  return { path: file, action: existing === null ? 'installed' : 'updated' };
}

/**
 * Which targets a skill is installed for, on this machine and in this project.
 *
 * @param {Skill|{id: string}} skill
 * @param {{home?: string, cwd?: string}} [options]
 * @returns {Promise<string[]>} e.g. ['claude (global)', 'cursor']
 */
export async function installedTargets(skill, options = {}) {
  const found = [];
  const seen = new Set();
  const probes = [
    ['claude', true],
    ['claude', false],
    ['cursor', false],
    ['codex', true],
    ['codex', false],
    ['windsurf', false],
  ];
  for (const [target, global] of probes) {
    const dest = destinationFor(target, skill, { ...options, global });
    // Home and project can be the same directory; report that path once.
    if (seen.has(dest.path)) continue;
    seen.add(dest.path);
    try {
      await fs.access(dest.path);
      found.push(global ? `${target} (global)` : target);
    } catch {
      // not installed there
    }
  }
  return found;
}

/**
 * Count installed skills per target, for `xactions doctor`.
 *
 * Only directories and files whose name matches a bundled skill id count, so
 * a user's own Claude skills are not reported as ours.
 *
 * @param {{home?: string, cwd?: string, skillsDir?: string}} [options]
 * @returns {Promise<{claude: number, cursor: number, codex: number, windsurf: number, total: number}>}
 */
export async function countInstalledSkills({ home = os.homedir(), cwd = process.cwd(), skillsDir = SKILLS_DIR } = {}) {
  const skills = await listSkills(skillsDir);
  const counts = { claude: 0, cursor: 0, codex: 0, windsurf: 0, total: 0 };
  for (const skill of skills) {
    const targets = await installedTargets(skill, { home, cwd });
    for (const label of targets) {
      const target = label.split(' ')[0];
      counts[target] += 1;
      counts.total += 1;
    }
  }
  return counts;
}

/**
 * @param {object[]} results
 * @param {boolean} json
 */
function printResults(results, json) {
  if (json) {
    console.log(JSON.stringify(results, null, 2));
    return;
  }
  const mark = {
    installed: chalk.green('+'),
    updated: chalk.cyan('~'),
    unchanged: chalk.gray('='),
    removed: chalk.red('-'),
    absent: chalk.gray('·'),
  };
  for (const r of results) {
    const label = r.skill ? `${r.skill.padEnd(30)} ${r.target.padEnd(9)}` : 'AGENTS.md'.padEnd(40);
    console.log(`  ${mark[r.action]} ${label} ${chalk.gray(r.action.padEnd(9))} ${chalk.dim(r.path)}`);
  }
  const tally = results.reduce((acc, r) => ({ ...acc, [r.action]: (acc[r.action] || 0) + 1 }), {});
  const summary = Object.entries(tally)
    .map(([action, n]) => `${n} ${action}`)
    .join(', ');
  console.log(chalk.gray(`\n  ${summary}\n`));
}

/**
 * Register the command group.
 * @param {import('commander').Command} program
 */
export function registerSkillsCommand(program) {
  const skills = program
    .command('skills')
    .description('List, install and remove the bundled agent skills (Claude Code, Cursor, Codex, Windsurf)');

  skills
    .command('list')
    .description('Show every bundled skill and where it is installed')
    .option('--json', 'Output as JSON')
    .action(async (options) => {
      try {
        const all = await listSkills();
        const rows = [];
        for (const skill of all) {
          rows.push({ ...skill, installed: await installedTargets(skill) });
        }
        if (options.json) {
          console.log(JSON.stringify(rows.map(({ dir, file, ...rest }) => ({ ...rest, path: file })), null, 2));
          return;
        }
        console.log(chalk.bold(`\n  ${rows.length} skills in ${chalk.dim(SKILLS_DIR)}\n`));
        for (const row of rows) {
          const where = row.installed.length ? chalk.green(row.installed.join(', ')) : chalk.gray('not installed');
          console.log(`  ${chalk.cyan(row.id.padEnd(30))} ${where}`);
          console.log(`  ${''.padEnd(30)} ${chalk.gray(row.description.slice(0, 100))}`);
        }
        console.log(chalk.gray('\n  Install with `xactions skills install --all --target claude --global`.\n'));
      } catch (error) {
        console.error(chalk.red(error.message));
        process.exitCode = 1;
      }
    });

  skills
    .command('show <name>')
    .description('Print one skill: its frontmatter and full instructions')
    .option('--json', 'Output as JSON')
    .action(async (name, options) => {
      try {
        const { found, missing } = resolveSkills(await listSkills(), [name]);
        if (missing.length) throw new Error(`No skill named "${name}". Run \`xactions skills list\`.`);
        const skill = found[0];
        const markdown = await fs.readFile(skill.file, 'utf-8');
        if (options.json) {
          const { data, body } = parseFrontmatter(markdown);
          console.log(JSON.stringify({ ...skill, frontmatter: data, body }, null, 2));
          return;
        }
        console.log(markdown);
      } catch (error) {
        console.error(chalk.red(error.message));
        process.exitCode = 1;
      }
    });

  skills
    .command('install [names...]')
    .description('Copy skills into an agent\'s skill or rules directory')
    .option('-a, --all', 'Install every bundled skill')
    .option('-t, --target <target>', `Where to install: ${TARGETS.join(', ')}`, 'claude')
    .option('-g, --global', 'Install under your home directory instead of the current project')
    .option('--json', 'Output as JSON')
    .action(async (names, options) => {
      try {
        if (!TARGETS.includes(options.target)) {
          throw new Error(`Unknown target "${options.target}". Choose one of: ${TARGETS.join(', ')}.`);
        }
        const all = await listSkills();
        let chosen;
        if (options.all) {
          chosen = all;
        } else {
          if (!names.length) throw new Error('Name at least one skill, or pass --all.');
          const { found, missing } = resolveSkills(all, names);
          if (missing.length) throw new Error(`Unknown skill${missing.length > 1 ? 's' : ''}: ${missing.join(', ')}. Run \`xactions skills list\`.`);
          chosen = found;
        }
        if (options.global && PROJECT_ONLY.has(options.target) && !options.json) {
          console.log(chalk.yellow(`  ${options.target} rules are per project, so --global was ignored.`));
        }
        const results = [];
        for (const skill of chosen) {
          results.push(await installSkill(options.target, skill, { global: options.global }));
        }
        if (options.target === 'codex') {
          results.push(await syncAgentsMd({ global: options.global }));
        }
        printResults(results, options.json);
      } catch (error) {
        console.error(chalk.red(error.message));
        process.exitCode = 1;
      }
    });

  skills
    .command('uninstall [names...]')
    .description('Remove installed skills from an agent\'s skill or rules directory')
    .option('-a, --all', 'Remove every bundled skill')
    .option('-t, --target <target>', `Where to remove from: ${TARGETS.join(', ')}`, 'claude')
    .option('-g, --global', 'Remove from your home directory instead of the current project')
    .option('--json', 'Output as JSON')
    .action(async (names, options) => {
      try {
        if (!TARGETS.includes(options.target)) {
          throw new Error(`Unknown target "${options.target}". Choose one of: ${TARGETS.join(', ')}.`);
        }
        const all = await listSkills();
        let chosen;
        if (options.all) {
          chosen = all;
        } else {
          if (!names.length) throw new Error('Name at least one skill, or pass --all.');
          const { found, missing } = resolveSkills(all, names);
          if (missing.length) throw new Error(`Unknown skill${missing.length > 1 ? 's' : ''}: ${missing.join(', ')}. Run \`xactions skills list\`.`);
          chosen = found;
        }
        const results = [];
        for (const skill of chosen) {
          results.push(await uninstallSkill(options.target, skill, { global: options.global }));
        }
        if (options.target === 'codex') {
          results.push(await syncAgentsMd({ global: options.global }));
        }
        printResults(results, options.json);
      } catch (error) {
        console.error(chalk.red(error.message));
        process.exitCode = 1;
      }
    });
}
