// Copyright (c) 2024-2026 nich (@nichxbt). Licensed under the Apache License, Version 2.0.
/**
 * The prompts and resources the local MCP server offers.
 *
 * Prompts: every skill in `skills/` becomes an MCP prompt, so a client that
 * cannot install skill directories still gets them (Claude Code shows each as
 * a slash command, other clients as a menu entry). Name and description come
 * from the SKILL.md frontmatter, the body is the skill itself, and a skill that
 * declares `metadata.arguments` (`account`, `topic`) takes those as optional
 * prompt arguments. A prompt is listed only when every MCP tool its skill names
 * is loaded under the current filter, so a client is never handed instructions
 * for tools it cannot call.
 *
 * Resources: every file in each skill directory, the skills index, the browser
 * script manifest when it exists, and the session status (`xactions doctor`
 * as JSON, offline at `xactions://status`, with the x.com probes at
 * `xactions://status/live`).
 *
 * Nothing here copies skill text into source: the files are read from disk at
 * start-up, once per skills directory, and served as they are. Resource reads
 * resolve a URI by exact lookup in the list built at start-up, never by joining
 * it onto a path, so a URI cannot reach outside the skills directory.
 *
 * @author nich (@nichxbt) - https://github.com/nirholas
 * @license Apache-2.0
 */

import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { extname, join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ErrorCode, McpError } from '@modelcontextprotocol/sdk/types.js';
import { parseFrontmatter } from '../cli/commands/skills.js';

/** The skills shipped with the package, resolved against this file so an npm install finds them. */
export const DEFAULT_SKILLS_DIR = fileURLToPath(new URL('../../skills/', import.meta.url));

/** The browser script manifest. A git checkout has it; the npm package ships no browser/ directory. */
export const DEFAULT_SCRIPT_MANIFEST = fileURLToPath(new URL('../../browser/index.json', import.meta.url));

export const SKILLS_INDEX_URI = 'xactions://skills/index.json';
export const SCRIPT_MANIFEST_URI = 'xactions://browser-scripts/index.json';
export const STATUS_URI = 'xactions://status';
export const STATUS_LIVE_URI = 'xactions://status/live';

/**
 * The prompt arguments a skill can declare in `metadata.arguments`. All are
 * optional: every skill reads sensibly without them.
 */
export const SKILL_ARGUMENTS = Object.freeze({
  account: Object.freeze({ name: 'account', label: 'Target account', description: 'The X account to work on, with or without the @.' }),
  topic: Object.freeze({ name: 'topic', label: 'Topic', description: 'The topic, keyword or niche to work on.' }),
});

const MIME_TYPES = Object.freeze({ '.md': 'text/markdown', '.json': 'application/json', '.txt': 'text/plain' });

/**
 * @typedef {object} SkillFile
 * @property {string} uri
 * @property {string} rel - path inside the skill directory, `/` separated
 * @property {string} path - absolute path on disk
 * @property {string} mimeType
 * @property {number} size
 */

/**
 * @typedef {object} SkillPrompt
 * @property {string} id - directory name
 * @property {string} name - frontmatter `name`, the prompt name
 * @property {string} title - display name from skills/index.json
 * @property {string} description - frontmatter `description`
 * @property {string} body - SKILL.md after the frontmatter
 * @property {string[]} arguments - declared argument names, in order
 * @property {string[]} tools - MCP tool names the body mentions
 * @property {SkillFile[]} files
 */

/**
 * @typedef {object} SkillCatalog
 * @property {string} dir
 * @property {SkillPrompt[]} skills
 * @property {SkillFile | null} index
 */

/** @param {string} dir @returns {string[]} */
function walk(dir) {
  return readdirSync(dir, { withFileTypes: true })
    .sort((a, b) => a.name.localeCompare(b.name))
    .flatMap((entry) => (entry.isDirectory() ? walk(join(dir, entry.name)) : entry.isFile() ? [join(dir, entry.name)] : []));
}

/** @param {string} path @param {string} uri @param {string} rel @returns {SkillFile} */
function fileEntry(path, uri, rel) {
  return { uri, rel, path, mimeType: MIME_TYPES[extname(path)] || 'text/plain', size: statSync(path).size };
}

/** @type {Map<string, SkillCatalog>} */
const catalogCache = new Map();

/**
 * Read the skills directory: skills/index.json, each SKILL.md, and every file
 * beside it. A missing directory or index gives an empty catalogue rather than
 * a server that will not start.
 *
 * @param {string} [dir=DEFAULT_SKILLS_DIR]
 * @param {Iterable<string>} [knownTools] - tool names to look for in skill bodies
 * @returns {SkillCatalog}
 */
export function loadSkillCatalog(dir = DEFAULT_SKILLS_DIR, knownTools = []) {
  const known = new Set(knownTools);
  const indexPath = join(dir, 'index.json');
  if (!existsSync(indexPath)) return { dir, skills: [], index: null };

  const index = JSON.parse(readFileSync(indexPath, 'utf8'));
  const skills = [];
  for (const entry of index.skills || []) {
    const skillDir = join(dir, entry.id);
    const skillFile = join(skillDir, 'SKILL.md');
    if (!existsSync(skillFile)) continue;
    const { data, body, maps } = parseFrontmatter(readFileSync(skillFile, 'utf8'));
    const declared = String(maps.metadata?.arguments || '').split(/[\s,]+/).filter(Boolean);
    const unknown = declared.filter((a) => !SKILL_ARGUMENTS[a]);
    if (unknown.length) {
      throw new Error(`${relative(process.cwd(), skillFile)}: metadata.arguments names ${unknown.join(', ')}; known arguments are ${Object.keys(SKILL_ARGUMENTS).join(', ')}`);
    }
    skills.push({
      id: entry.id,
      name: data.name || entry.id,
      title: entry.name || data.name || entry.id,
      description: data.description || entry.description || '',
      body,
      arguments: declared,
      tools: [...new Set(body.match(/\bx_[a-z0-9_]+\b/g) || [])].filter((n) => known.has(n)),
      files: walk(skillDir).map((path) => {
        const rel = relative(skillDir, path).split(sep).join('/');
        return fileEntry(path, `xactions://skills/${entry.id}/${rel}`, rel);
      }),
    });
  }
  return { dir, skills, index: fileEntry(indexPath, SKILLS_INDEX_URI, 'index.json') };
}

/**
 * The catalogue for a directory, read once per process. The HTTP transport
 * builds a server per session, and none of them should re-read fifty files.
 *
 * @param {string} [dir=DEFAULT_SKILLS_DIR]
 * @param {Iterable<string>} [knownTools]
 * @returns {SkillCatalog}
 */
export function getSkillCatalog(dir = DEFAULT_SKILLS_DIR, knownTools = []) {
  if (!catalogCache.has(dir)) catalogCache.set(dir, loadSkillCatalog(dir, knownTools));
  return catalogCache.get(dir);
}

/**
 * The tools a skill names that the filter does not load.
 *
 * @param {SkillPrompt} skill
 * @param {(name: string) => boolean} isAllowed
 * @returns {string[]}
 */
function missingTools(skill, isAllowed) {
  return skill.tools.filter((name) => !isAllowed(name));
}

/**
 * `prompts/list`: the skills whose tools are all loaded.
 *
 * @param {SkillCatalog} catalog
 * @param {(name: string) => boolean} isAllowed
 */
export function listPrompts(catalog, isAllowed) {
  return catalog.skills
    .filter((skill) => missingTools(skill, isAllowed).length === 0)
    .map((skill) => ({
      name: skill.name,
      title: skill.title,
      description: skill.description,
      ...(skill.arguments.length ? {
        arguments: skill.arguments.map((a) => ({ name: a, description: SKILL_ARGUMENTS[a].description, required: false })),
      } : {}),
    }));
}

/**
 * `prompts/get`: the skill as one user message. Supplied arguments go first,
 * the skill body follows unchanged, and any reference files are named as
 * resources at the end.
 *
 * @param {SkillCatalog} catalog
 * @param {(name: string) => boolean} isAllowed
 * @param {string} name
 * @param {Record<string, string>} [args]
 */
export function getPrompt(catalog, isAllowed, name, args = {}) {
  const skill = catalog.skills.find((s) => s.name === name);
  if (!skill) {
    throw new McpError(ErrorCode.InvalidParams, `Unknown prompt: ${name}`, { prompt: name });
  }
  const missing = missingTools(skill, isAllowed);
  if (missing.length) {
    throw new McpError(
      ErrorCode.InvalidParams,
      `Prompt "${name}" needs tools this server's filter does not load: ${missing.join(', ')}. Add them with --tools, or start a preset that has them.`,
      { prompt: name, missingTools: missing },
    );
  }

  const preface = skill.arguments
    .map((a) => {
      const raw = String(args?.[a] ?? '').trim();
      if (!raw) return null;
      const value = a === 'account' ? `@${raw.replace(/^@+/, '')}` : raw;
      return `${SKILL_ARGUMENTS[a].label}: ${value}`;
    })
    .filter(Boolean);

  const references = skill.files.filter((f) => f.rel !== 'SKILL.md');
  const parts = [];
  if (preface.length) parts.push(`${preface.join('\n')}\n\n`);
  parts.push(skill.body);
  if (references.length) {
    parts.push(`\n\n---\nThis skill's reference files can be read as resources on this MCP server:\n${references.map((f) => `- ${f.uri}`).join('\n')}\n`);
  }

  return {
    description: skill.description,
    messages: [{ role: 'user', content: { type: 'text', text: parts.join('') } }],
  };
}

/**
 * Every resource the server offers, in a stable order.
 *
 * @param {{ catalog: SkillCatalog, scriptManifestPath?: string }} sources
 * @returns {Array<{uri: string, name: string, title: string, description: string, mimeType: string, size?: number, path?: string}>}
 */
export function listResourceEntries({ catalog, scriptManifestPath = DEFAULT_SCRIPT_MANIFEST }) {
  const entries = [
    {
      uri: STATUS_URI,
      name: 'status',
      title: 'Session status',
      description: 'xactions doctor as JSON, local checks only: Node, browser, the MCP server and its filter, skills, the query-ID cache, the saved session and the account pool. Never contains cookie values.',
      mimeType: 'application/json',
    },
    {
      uri: STATUS_LIVE_URI,
      name: 'status-live',
      title: 'Session status, checked against x.com',
      description: 'The same report plus the live checks: a guest read, a timeline read and whether the saved session still signs in. Takes a few seconds and calls x.com.',
      mimeType: 'application/json',
    },
  ];

  if (catalog.index) {
    entries.push({
      uri: catalog.index.uri,
      name: 'skills/index.json',
      title: 'Skills index',
      description: 'Every bundled skill with its id, name, version and description.',
      mimeType: catalog.index.mimeType,
      size: catalog.index.size,
      path: catalog.index.path,
    });
  }

  if (scriptManifestPath && existsSync(scriptManifestPath)) {
    entries.push({
      uri: SCRIPT_MANIFEST_URI,
      name: 'browser/index.json',
      title: 'Browser script manifest',
      description: 'Every browser console script: what it does, the x.com page to run it on, whether it writes, and its options.',
      mimeType: 'application/json',
      size: statSync(scriptManifestPath).size,
      path: scriptManifestPath,
    });
  }

  for (const skill of catalog.skills) {
    for (const file of skill.files) {
      entries.push({
        uri: file.uri,
        name: `${skill.id}/${file.rel}`,
        title: file.rel === 'SKILL.md' ? `${skill.title} skill` : `${skill.title}: ${file.rel}`,
        description: file.rel === 'SKILL.md' ? skill.description : `Reference file for the ${skill.id} skill.`,
        mimeType: file.mimeType,
        size: file.size,
        path: file.path,
      });
    }
  }
  return entries;
}

/**
 * `resources/list`: the entries without their paths on disk.
 *
 * @param {{ catalog: SkillCatalog, scriptManifestPath?: string }} sources
 */
export function listResources(sources) {
  return listResourceEntries(sources).map(({ path: _path, ...resource }) => resource);
}

/**
 * `resources/read`.
 *
 * @param {string} uri
 * @param {{ catalog: SkillCatalog, scriptManifestPath?: string, status: (options: {live: boolean}) => Promise<object> }} sources
 * @returns {Promise<{contents: Array<{uri: string, mimeType: string, text: string}>}>}
 */
export async function readResource(uri, sources) {
  if (uri === STATUS_URI || uri === STATUS_LIVE_URI) {
    const report = await sources.status({ live: uri === STATUS_LIVE_URI });
    return { contents: [{ uri, mimeType: 'application/json', text: JSON.stringify(report, null, 2) }] };
  }
  const entry = listResourceEntries(sources).find((r) => r.uri === uri && r.path);
  if (!entry) {
    // The current spec asks for Invalid Params with the URI, not an empty list.
    throw new McpError(ErrorCode.InvalidParams, 'Resource not found', { uri });
  }
  return { contents: [{ uri, mimeType: entry.mimeType, text: readFileSync(entry.path, 'utf8') }] };
}
