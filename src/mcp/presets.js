// Copyright (c) 2024-2026 nich (@nichxbt). Licensed under the Apache License, Version 2.0.
/**
 * MCP presets: start the server for a job by name.
 *
 * The full tool list is large, and the groups in tool-groups.js are the right
 * way to cut it down, but a new user should not have to learn group names
 * first. A preset is a named selection of groups and individual tools with one
 * line saying who it is for: `--preset research` instead of
 * `--tools read,analytics`.
 *
 * How a preset composes with the other selectors, in order:
 *
 *   1. The preset resolves to a concrete set of tool names: its `select` tokens
 *      (every tool when it has none), minus its own `exclude` tokens.
 *   2. `--tools` / XACTIONS_MCP_TOOLS adds to that set. It can add back a tool
 *      the preset left out.
 *   3. `--exclude` / XACTIONS_MCP_EXCLUDE removes from the result, and always
 *      wins over 1 and 2.
 *   4. The draft tools stay available whatever the selection, as they always do.
 *
 * Without a preset, `--tools` and `--exclude` behave exactly as before.
 *
 * Approval: a preset whose tool set contains a write tool turns
 * XACTIONS_MCP_REQUIRE_APPROVAL on, unless the user chose a value explicitly
 * (the flag, or the variable set to anything non-empty).
 *
 * @author nich (@nichxbt) - https://github.com/nirholas
 * @license Apache-2.0
 */

import {
  WRITE_TOOLS,
  WRITES_SELECTOR,
  createToolFilter,
  expandSelection,
  parseSelection,
} from './tool-groups.js';

/**
 * @typedef {object} Preset
 * @property {string} name - what the user types after --preset
 * @property {string} summary - one line saying who it is for
 * @property {readonly string[]} [select] - groups and tool names it selects; omitted means every tool
 * @property {readonly string[]} [exclude] - groups, tool names or `writes` it then removes
 */

/** @type {ReadonlyArray<Readonly<Preset>>} */
export const PRESETS = Object.freeze([
  Object.freeze({
    name: 'research',
    summary: 'Reading accounts, posts, threads and search results, and analysing them. Nothing is posted.',
    select: Object.freeze(['read', 'analytics']),
  }),
  Object.freeze({
    name: 'monitor',
    summary: 'Watching accounts, keywords and followers over time, with alerts and reports.',
    select: Object.freeze(['read', 'monitoring', 'analytics']),
  }),
  Object.freeze({
    name: 'community-manager',
    summary: 'Running an account day to day: replies, posts, DMs and lists, every write held for approval.',
    select: Object.freeze(['read', 'write', 'dm', 'lists', 'drafts', 'x_detect_unfollowers', 'x_analyze_sentiment']),
  }),
  Object.freeze({
    name: 'growth',
    summary: 'Growing an account: posting, engagement automation and personas, with timing data.',
    select: Object.freeze(['read', 'write', 'automation', 'persona', 'drafts', 'x_best_time_to_post', 'x_growth_rate']),
  }),
  Object.freeze({
    name: 'data',
    summary: 'Exporting, converting and analysing account data and follower graphs.',
    select: Object.freeze(['read', 'data', 'graph']),
  }),
  Object.freeze({
    name: 'read-only',
    summary: 'Every tool without a side effect on the account, across all groups.',
    exclude: Object.freeze([WRITES_SELECTOR]),
  }),
  Object.freeze({
    name: 'full',
    summary: 'Every tool. The largest context cost; writes are held for approval by default.',
  }),
]);

/** Preset names in the order they are offered. */
export const PRESET_NAMES = Object.freeze(PRESETS.map((p) => p.name));

/** Thrown for a preset name that does not exist. */
export class UnknownPresetError extends Error {
  /** @param {string} name */
  constructor(name) {
    super(`Unknown MCP preset "${name}". Presets: ${PRESET_NAMES.join(', ')}.`);
    this.name = 'UnknownPresetError';
    this.code = 'UNKNOWN_PRESET';
    this.preset = name;
  }
}

/**
 * An MCPB bundle substitutes `${user_config.<key>}` into the server's
 * environment, and leaves the placeholder as it is when the user left an
 * optional field with no default unfilled. Such a value, and an empty one,
 * means the user chose nothing.
 *
 * @param {string | undefined | null} value
 * @returns {string | undefined} the value, or undefined when nothing was chosen
 */
export function chosenValue(value) {
  if (value === undefined || value === null) return undefined;
  const text = String(value).trim();
  if (text === '' || /^\$\{user_config\.[^}]+\}$/.test(text)) return undefined;
  return text;
}

/**
 * Look a preset up by name, ignoring case.
 *
 * @param {string | undefined | null} name
 * @returns {Readonly<Preset> | null} null when no preset was named
 * @throws {UnknownPresetError}
 */
export function getPreset(name) {
  const wanted = chosenValue(name);
  if (!wanted) return null;
  const preset = PRESETS.find((p) => p.name === wanted.toLowerCase());
  if (!preset) throw new UnknownPresetError(wanted);
  return preset;
}

/**
 * The tool names a preset selects from a concrete tool list (step 1 above).
 *
 * @param {Readonly<Preset>} preset
 * @param {Array<{name: string}>} tools
 * @returns {Set<string>}
 */
export function presetToolNames(preset, tools) {
  const selected = preset.select?.length
    ? expandSelection(parseSelection([...preset.select]), tools).names
    : new Set(tools.map((t) => t.name));
  if (preset.exclude?.length) {
    for (const name of expandSelection(parseSelection([...preset.exclude]), tools).names) selected.delete(name);
  }
  return selected;
}

/**
 * Compose a preset with the user's own allowlist and denylist into the
 * include and exclude tokens createToolFilter() takes (steps 1 to 3 above).
 *
 * @param {{ preset: Readonly<Preset> | null, tools?: string | string[], exclude?: string | string[] }} selection
 * @param {Array<{name: string}>} all - every tool the server knows, plugins included
 * @returns {{ include: string | string[] | undefined, exclude: string | string[] | undefined }}
 */
export function composeSelection({ preset, tools, exclude }, all) {
  if (!preset) return { include: tools, exclude };
  return {
    include: [...presetToolNames(preset, all), ...parseSelection(tools)],
    exclude,
  };
}

/**
 * Does a preset select any tool with a side effect on the account?
 *
 * @param {Readonly<Preset>} preset
 * @param {Array<{name: string}>} tools
 * @returns {boolean}
 */
export function presetIncludesWrites(preset, tools) {
  for (const name of presetToolNames(preset, tools)) if (WRITE_TOOLS.has(name)) return true;
  return false;
}

/**
 * Decide whether writes are held as drafts.
 *
 * An explicit choice always wins: the CLI flag, then the environment variable
 * when it holds a value. With neither, a preset that includes writes turns the
 * gate on, and no preset leaves it off, as before.
 *
 * @param {{ flag?: boolean, env?: string, preset: Readonly<Preset> | null, tools: Array<{name: string}> }} input
 * @returns {boolean}
 */
export function resolveApproval({ flag, env, preset, tools }) {
  if (typeof flag === 'boolean') return flag;
  const fromEnv = chosenValue(env);
  if (fromEnv !== undefined) return !['0', 'false', 'no', 'off'].includes(fromEnv.toLowerCase());
  return preset ? presetIncludesWrites(preset, tools) : false;
}

/**
 * What a preset costs a client: how many tools `tools/list` returns, and the
 * size of their JSON (the same measure AGENTS.md uses for the full list).
 *
 * @param {Readonly<Preset>} preset
 * @param {Array<{name: string}>} tools
 * @returns {{ tools: number, bytes: number, requireApproval: boolean }}
 */
export function measurePreset(preset, tools) {
  const requireApproval = presetIncludesWrites(preset, tools);
  const { include, exclude } = composeSelection({ preset }, tools);
  const filter = createToolFilter({ include, exclude, tools });
  // In approval mode the agent is not offered the tool that approves its own drafts.
  const listed = filter.filter(tools).filter((t) => !(requireApproval && t.name === 'x_approve_draft'));
  return { tools: listed.length, bytes: JSON.stringify(listed).length, requireApproval };
}

/** Markers around the generated preset table in the docs. */
export const PRESET_BLOCK_START = '<!-- mcp-presets:start (generated by scripts/sync-mcp-presets.mjs) -->';
export const PRESET_BLOCK_END = '<!-- mcp-presets:end -->';

/**
 * The preset table the docs carry, generated from the live tool list.
 *
 * Sizes are given in table columns, not as "N tools" prose, so the docs audit
 * that checks MCP tool-count claims against the full list leaves them alone.
 *
 * @param {Array<{name: string}>} tools
 * @returns {string}
 */
export function renderPresetTable(tools) {
  const full = JSON.stringify(tools).length;
  const rows = PRESETS.map((p) => {
    const size = measurePreset(p, tools);
    const kb = Math.round(size.bytes / 1024);
    const share = Math.round((size.bytes / full) * 100);
    const selects = p.select?.length ? p.select.map((t) => `\`${t}\``).join(', ') : 'everything';
    const minus = p.exclude?.length ? ` minus ${p.exclude.map((t) => `\`${t}\``).join(', ')}` : '';
    return `| \`${p.name}\` | ${p.summary} | ${selects}${minus} | ${size.tools} | ${kb} KB (${share}%) | ${size.requireApproval ? 'on' : 'off'} |`;
  });
  return [
    '| Preset | For | Selects | Tools listed | Schema | Approval default |',
    '|---|---|---|---|---|---|',
    ...rows,
  ].join('\n');
}

/**
 * The generated table between the markers in a document, or null when the
 * document has no preset block.
 *
 * @param {string} text
 * @returns {string | null}
 */
export function extractPresetBlock(text) {
  const start = text.indexOf(PRESET_BLOCK_START);
  if (start === -1) return null;
  const end = text.indexOf(PRESET_BLOCK_END, start);
  if (end === -1) return null;
  return text.slice(start + PRESET_BLOCK_START.length, end).trim();
}

/**
 * Replace the generated table in a document.
 *
 * @param {string} text
 * @param {string} table
 * @returns {string}
 */
export function replacePresetBlock(text, table) {
  const start = text.indexOf(PRESET_BLOCK_START);
  const end = start === -1 ? -1 : text.indexOf(PRESET_BLOCK_END, start);
  if (start === -1 || end === -1) throw new Error('no mcp-presets block to replace');
  return `${text.slice(0, start + PRESET_BLOCK_START.length)}\n${table}\n${text.slice(end)}`;
}

export default {
  PRESETS,
  PRESET_NAMES,
  UnknownPresetError,
  chosenValue,
  getPreset,
  presetToolNames,
  composeSelection,
  presetIncludesWrites,
  resolveApproval,
  measurePreset,
  renderPresetTable,
  extractPresetBlock,
  replacePresetBlock,
};
