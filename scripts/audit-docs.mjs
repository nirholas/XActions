#!/usr/bin/env node
// Copyright (c) 2024-2026 nich (@nichxbt). Licensed under the Apache License, Version 2.0.
/**
 * Documentation auditor.
 *
 * Markdown rots quietly. A renamed file leaves a link that still looks fine in
 * a diff, and the first person to notice is a stranger who clicked it and left.
 * This walks every tracked `.md` file and fails the build on:
 *
 *   1. **Dead relative links** — a link to a file that does not exist.
 *   2. **Dead anchors** — `file.md#section` where no such heading exists.
 *   3. **Missing referenced scripts** — `node scripts/foo.js` in a fenced
 *      command block where `scripts/foo.js` is gone.
 *   4. **Stale version strings** — a doc claiming a version other than the one
 *      in package.json.
 *
 * Usage:
 *   node scripts/audit-docs.mjs            # audit everything
 *   node scripts/audit-docs.mjs --quiet    # only print the summary
 *   node scripts/audit-docs.mjs docs/      # limit to a subtree
 *
 * Exit code is the number of problem categories that found something, so CI
 * fails on any regression.
 *
 * @author nich (@nichxbt) - https://github.com/nirholas
 * @see https://xactions.app
 * @license Apache-2.0
 */

import { readFileSync, existsSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join, resolve, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

/** Directories never worth auditing: vendored, generated, or archived. */
const SKIP_DIRS = new Set([
  'node_modules',
  // Scratch. `tmp/` is gitignored, so a working note someone left there is not
  // published anywhere and must not turn the docs gate red for everyone else.
  'tmp',
  '.git',
  'dist',
  'build',
  'coverage',
  'pages-out',
  'archive',
  '.wrangler',
  'venv',
  '.venv',
]);

const args = process.argv.slice(2);
const quiet = args.includes('--quiet');
const roots = args.filter((a) => !a.startsWith('--'));

const { version: PKG_VERSION } = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8'));

/**
 * Count the tools the MCP server actually registers.
 *
 * Read statically rather than by importing the server, which would pull in
 * Puppeteer and turn a docs check into a full dependency install. The count is
 * the length of the `TOOLS` array literal in src/mcp/server.js.
 *
 * This claim drifted badly: the README said "140+", docs/README.md said 87, a
 * skill said "68+", and the server's own startup banner said 140 while serving
 * 144. Four numbers, one array.
 *
 * @returns {number|null} Tool count, or null if the array cannot be located
 */
function countMcpTools() {
  let source;
  try {
    source = readFileSync(join(ROOT, 'src', 'mcp', 'server.js'), 'utf8');
  } catch {
    return null;
  }

  const start = source.indexOf('const TOOLS = [');
  if (start === -1) return null;

  const end = source.indexOf('\n];', start);
  if (end === -1) return null;

  return (source.slice(start, end).match(/^\s{2}\{\s*$/gm) || []).length || null;
}

const MCP_TOOL_COUNT = countMcpTools();

/**
 * The other counts docs habitually quote, each derived from the thing it
 * describes rather than from another document. Every one of these drifted at
 * some point: the docs claimed 111 CLI commands against 56, 31 skills against
 * 49, and 29 route modules against 40. A number nobody can recompute is a
 * number that rots.
 */
function countDirs(rel) {
  const dir = join(ROOT, rel);
  if (!existsSync(dir)) return null;
  return readdirSync(dir, { withFileTypes: true }).filter((e) => e.isDirectory()).length;
}

function countFiles(rel, suffix) {
  const dir = join(ROOT, rel);
  if (!existsSync(dir)) return null;
  return readdirSync(dir).filter((f) => f.endsWith(suffix)).length;
}

/**
 * Top-level commands, meaning the ones `xactions --help` lists.
 *
 * src/cli/help-groups.js declares itself the single source of truth for that
 * screen and reconciles its own list against the registered commands at
 * runtime, so its GROUPS arrays are the honest count. Parsing `.command(`
 * calls instead conflates top-level commands with subcommands hanging off
 * other receivers and produces a number no reader can reproduce.
 */
function countTopLevelCommands() {
  const file = join(ROOT, 'src/cli/help-groups.js');
  if (!existsSync(file)) return null;
  const src = readFileSync(file, 'utf8');
  const names = new Set();
  for (const block of src.matchAll(/commands:\s*\[([^\]]*)\]/g)) {
    for (const name of block[1].matchAll(/'([a-z][a-z0-9-]*)'/g)) names.add(name[1]);
  }
  return names.size || null;
}

/**
 * Browser console scripts: the entries in browser/index.json, which
 * scripts/build-script-manifest.mjs builds from browser/. Legacy copies in
 * scripts/ and src/automation/ are not separate scripts and are not counted.
 */
function countBrowserScripts() {
  const file = join(ROOT, 'browser/index.json');
  if (!existsSync(file)) return null;
  return JSON.parse(readFileSync(file, 'utf8')).count ?? null;
}

const BROWSER_SCRIPT_COUNT = countBrowserScripts();
const SKILL_COUNT = countDirs('skills');
const ROUTE_MODULE_COUNT = countFiles('api/routes', '.js');
const CLI_COMMAND_COUNT = countTopLevelCommands();

/**
 * Collect the top-level commands the CLI actually defines.
 *
 * Read statically from the `.command('name ...')` calls in the CLI sources
 * rather than by running `--help`, so this check stays dependency-free.
 *
 * Docs that invent a plausible-sounding command are worse than docs with a
 * dead link: the reader assumes they typed it wrong. This catches
 * `xactions unfollow --non-followers` when no `unfollow` command exists.
 *
 * Subcommands (`xactions client profile`, `xactions agent setup`) are included
 * by name, so a nested command is never reported as missing.
 *
 * Both src/cli/index.js and every module under src/cli/commands/ are scanned.
 * Scanning index.js alone made this check report `doctor`, `connect`, and
 * `report` as nonexistent from the moment those moved into their own modules:
 * a false positive on a real command trains people to ignore the audit, which
 * is worse than not running it.
 *
 * @returns {Set<string>|null}
 */
function collectCliCommands() {
  const sources = [];

  try {
    sources.push(readFileSync(join(ROOT, 'src', 'cli', 'index.js'), 'utf8'));
  } catch {
    return null;
  }

  try {
    const commandsDir = join(ROOT, 'src', 'cli', 'commands');
    for (const entry of readdirSync(commandsDir)) {
      if (entry.endsWith('.js')) {
        sources.push(readFileSync(join(commandsDir, entry), 'utf8'));
      }
    }
  } catch {
    // No commands directory is fine: everything still lives in index.js.
  }

  const commands = new Set();
  for (const source of sources) {
    for (const match of source.matchAll(/\.command\(\s*'([\w-]+)/g)) {
      commands.add(match[1]);
    }
    // An alias is a real invocation. Without this, documenting the shorthand
    // the CLI itself advertises (`xactions dl`) is reported as inventing a
    // command that does not exist.
    for (const match of source.matchAll(/\.alias\(\s*'([\w-]+)'\s*\)/g)) {
      commands.add(match[1]);
    }
  }

  // Commander provides `help` itself, so no `.command('help')` call exists.
  commands.add('help');

  return commands.size > 0 ? commands : null;
}

const CLI_COMMANDS = collectCliCommands();

// ---------------------------------------------------------------------------
// Collection
// ---------------------------------------------------------------------------

/**
 * Recursively collect markdown files under a directory.
 * @param {string} dir
 * @param {string[]} [found]
 * @returns {string[]} Absolute paths
 */
function collectMarkdown(dir, found = []) {
  let entries;
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    return found;
  }

  for (const entry of entries) {
    if (entry.name.startsWith('.') && entry.name !== '.github') continue;
    if (SKIP_DIRS.has(entry.name)) continue;

    const full = join(dir, entry.name);
    if (entry.isDirectory()) collectMarkdown(full, found);
    else if (entry.name.endsWith('.md')) found.push(full);
    // llms.txt and llms-full.txt are the files agents fetch first. They carry
    // the same counts as the README and drifted from it unseen for releases.
    else if (dir === ROOT && /^llms(-full)?\.txt$/.test(entry.name)) found.push(full);
  }

  return found;
}

/**
 * Slugify a markdown heading the way GitHub does, so `#anchor` links can be
 * checked against real headings.
 * @param {string} heading
 * @returns {string}
 */
function slugify(heading) {
  return heading
    .trim()
    .toLowerCase()
    .replace(/<[^>]*>/g, '')
    .replace(/[^\w\s-]/g, '')
    // One hyphen per space, not one per run of spaces. GitHub drops the
    // punctuation between two words and hyphenates the spaces that surround it,
    // so "controlPanel.js — Floating Panel" becomes
    // "controlpaneljs--floating-panel" with a double hyphen.
    .replace(/\s/g, '-');
}

/**
 * Extract the set of anchor slugs a markdown file exposes.
 * @param {string} content
 * @returns {Set<string>}
 */
function anchorsOf(content) {
  const anchors = new Set();

  for (const match of content.matchAll(/^#{1,6}\s+(.+)$/gm)) {
    anchors.add(slugify(match[1]));
  }
  // Explicit HTML anchors, e.g. <a name="foo"> or <a id="foo">
  for (const match of content.matchAll(/<a\s+(?:name|id)=["']([^"']+)["']/g)) {
    anchors.add(match[1].toLowerCase());
  }

  return anchors;
}

/**
 * Blank out fenced code blocks and inline code spans.
 *
 * Sample code is full of things that look like markdown links but are not:
 * `automationRunners[id](settings)`, `array[0](arg)`, shell pipelines. Scanning
 * them produces false positives that train people to ignore this auditor, which
 * is worse than not having it. Newlines are preserved so reported line numbers
 * stay correct.
 *
 * @param {string} content
 * @returns {string}
 */
function stripCode(content) {
  return content
    .replace(/```[\s\S]*?```/g, (block) => '\n'.repeat((block.match(/\n/g) || []).length))
    .replace(/~~~[\s\S]*?~~~/g, (block) => '\n'.repeat((block.match(/\n/g) || []).length))
    .replace(/`[^`\n]*`/g, '');
}

const anchorCache = new Map();

/**
 * Anchors for a file on disk, memoised.
 * @param {string} absPath
 * @returns {Set<string>}
 */
function anchorsFor(absPath) {
  if (!anchorCache.has(absPath)) {
    try {
      anchorCache.set(absPath, anchorsOf(readFileSync(absPath, 'utf8')));
    } catch {
      anchorCache.set(absPath, new Set());
    }
  }
  return anchorCache.get(absPath);
}

/**
 * Everything a line is "about": its paragraph (the run of non-blank lines it
 * sits in) and every heading it is nested under, so "### Do not load all 152
 * tools" inherits "## The MCP lane" two levels up.
 * @param {string[]} lines
 * @param {number} index
 * @returns {string}
 */
function contextOf(lines, index) {
  let start = index;
  let end = index;
  while (start > 0 && lines[start - 1].trim() !== '') start -= 1;
  while (end < lines.length - 1 && lines[end + 1].trim() !== '') end += 1;
  const parts = lines.slice(start, end + 1);

  let level = 7;
  for (let i = index; i >= 0 && level > 1; i -= 1) {
    const heading = /^(#{1,6})\s/.exec(lines[i]);
    if (heading && heading[1].length < level) {
      parts.push(lines[i]);
      level = heading[1].length;
    }
  }
  return parts.join(' ');
}

// ---------------------------------------------------------------------------
// Checks
// ---------------------------------------------------------------------------

const deadLinks = [];
const deadAnchors = [];
const missingScripts = [];
const staleVersions = [];
const staleToolCounts = [];
const staleCounts = [];
const unknownCommands = [];

const files = roots.length > 0
  ? roots.flatMap((r) => {
      const abs = resolve(ROOT, r);
      return statSync(abs).isDirectory() ? collectMarkdown(abs) : [abs];
    })
  : collectMarkdown(ROOT);

for (const file of files) {
  const content = readFileSync(file, 'utf8');
  const rel = relative(ROOT, file);
  const lines = content.split('\n');
  const prose = stripCode(content);

  // prompts/ is a corpus of build instructions: the files and commands it
  // names are the output of following the prompt, not things that exist yet.
  const isBuildPrompt = rel.startsWith('prompts/');

  // -- 1 & 2. Links and anchors ------------------------------------------
  for (const match of prose.matchAll(/\[([^\]]*)\]\(([^)\s]+)\)/g)) {
    const target = match[2];

    // External, in-page, and protocol links are out of scope: this auditor
    // stays offline so it can run in CI without flaking on someone else's
    // downtime.
    if (/^(https?:|mailto:|tel:|data:|#)/.test(target)) continue;
    // Template placeholders inside code samples, e.g. [text](${url}) or
    // regex fragments quoted in prose.
    if (/[${}\\[\]|*+]/.test(target)) continue;

    const [pathPart, anchor] = target.split('#');
    if (!pathPart) continue;

    const abs = resolve(dirname(file), decodeURIComponent(pathPart));
    const line = lines.findIndex((l) => l.includes(`](${target})`)) + 1;

    if (!existsSync(abs)) {
      deadLinks.push({ file: rel, line, target });
      continue;
    }

    if (anchor && abs.endsWith('.md') && !anchorsFor(abs).has(anchor.toLowerCase())) {
      deadAnchors.push({ file: rel, line, target });
    }
  }

  // -- 3. Referenced scripts ---------------------------------------------
  for (const match of isBuildPrompt ? [] : content.matchAll(/(?:node|bash|sh)\s+((?:scripts|src|examples|bin)\/[\w./-]+\.(?:m?js|sh))/g)) {
    const scriptPath = match[1];
    if (existsSync(join(ROOT, scriptPath))) continue;

    const line = lines.findIndex((l) => l.includes(scriptPath)) + 1;
    missingScripts.push({ file: rel, line, script: scriptPath });
  }

  // -- 4. Version claims --------------------------------------------------
  // Only flag explicit product-version claims ("XActions v3.1.0"), not every
  // semver in a changelog or a dependency range. Release notes and launch
  // posts (and dated audit snapshots under docs/audits/) are historical records: "XActions v3.1.0" in one of those is correct
  // forever and must not be rewritten.
  const historical = /(^|\/)(CHANGELOG|ROADMAP)\.md$|(^|\/)(launch|releases|changelog|audits)\//i.test(rel);

  for (const match of historical ? [] : content.matchAll(/XActions\s+v(\d+\.\d+\.\d+)/g)) {
    if (match[1] === PKG_VERSION) continue;
    const line = lines.findIndex((l) => l.includes(match[0])) + 1;
    staleVersions.push({ file: rel, line, claimed: match[1] });
  }

  // -- 6. CLI commands ----------------------------------------------------
  // Only look at commands written as commands: inside a fenced block, inside
  // backticks, or on a `$`-prefixed shell line. "the xactions package" in a
  // sentence is prose, not an instruction someone will type.
  // prompts/ describes commands a build should create, not ones that exist.
  if (CLI_COMMANDS && !isBuildPrompt) {
    const invocations = [
      ...content.matchAll(/```(?:bash|sh|shell|console)?\n([\s\S]*?)```/g),
    ].flatMap((block) => [...block[1].matchAll(/(?:^|\n|\$\s*)(?:npx\s+)?xactions\s+([a-z][\w-]*)/g)]);

    const inlined = [...content.matchAll(/`(?:npx\s+)?xactions\s+([a-z][\w-]*)[^`]*`/g)];

    for (const match of [...invocations, ...inlined]) {
      const command = match[1];
      if (CLI_COMMANDS.has(command)) continue;

      const line = lines.findIndex((l) => l.includes(`xactions ${command}`)) + 1;
      unknownCommands.push({ file: rel, line, command });
    }
  }

  // -- 5. MCP tool-count claims -------------------------------------------
  if (MCP_TOOL_COUNT && !historical) {
    lines.forEach((text, index) => {
      // Only lines that are talking about MCP. "108 tools" in a paragraph about
      // the browser command palette is a different number about a different
      // thing, and rewriting it would make the docs wrong. Prose wraps, so a
      // line counts as talking about MCP when its paragraph or any heading it
      // sits under does: "The server advertises 152 tools" sat in AGENTS.md
      // for a release because "MCP" was on a different line.
      if (!/\bMCP\b|tools\/list/i.test(contextOf(lines, index))) return;

      // A count can end one line and its noun start the next: "a Node
      // library, 152\nMCP tools". Read the line with the next one's first
      // words appended, and only report numbers that sit on this line.
      const joined = `${text} ${(lines[index + 1] ?? '').trim().split(/\s+/).slice(0, 2).join(' ')}`;

      // The negative lookbehind keeps "x402" from reading as a claim of 402
      // tools.
      for (const match of joined.matchAll(/(?<![\w.])(\d+)\+?\s+(?:MCP\s+)?tools?\b/gi)) {
        if (match.index >= text.length) continue;
        const claimed = Number(match[1]);
        // Small numbers describe competing servers in comparison tables.
        if (claimed < 20 || claimed === MCP_TOOL_COUNT) continue;
        staleToolCounts.push({ file: rel, line: index + 1, claimed });
      }
    });

    // The same idea for the counts that are not about MCP. Each pattern is
    // anchored on the noun so a number about something else is left alone.
    const countChecks = [
      { actual: SKILL_COUNT, label: 'agent skills', re: /(?<![\w.])(\d+)\+?\s+(?:agent\s+)?skills\b/gi, min: 5 },
      { actual: ROUTE_MODULE_COUNT, label: 'route modules', re: /(?<![\w.])(\d+)\+?\s+(?:REST\s+)?route\s+modules\b/gi, min: 5 },
      // "56-command CLI" is the same claim as "56 CLI commands".
      { actual: CLI_COMMAND_COUNT, label: 'CLI commands', re: /(?<![\w.])(\d+)\+?(?:\s+(?:CLI\s+)?commands\b|-command\b)/gi, min: 10 },
      { actual: BROWSER_SCRIPT_COUNT, label: 'browser scripts', re: /(?<![\w.])(\d+)\+?\s+(?:standalone\s+)?(?:free\s+)?browser\s+(?:console\s+)?scripts\b/gi, min: 10 },
    ];
    lines.forEach((text, index) => {
      for (const check of countChecks) {
        if (check.actual === null) continue;
        for (const match of text.matchAll(check.re)) {
          const claimed = Number(match[1]);
          if (claimed < check.min || claimed === check.actual) continue;
          // "158 commands and subcommands" is a different, also-true number.
          if (check.label === 'CLI commands' && /subcommand/i.test(text)) continue;
          staleCounts.push({ file: rel, line: index + 1, claimed, label: check.label, actual: check.actual });
        }
      }
    });
  }
}

// ---------------------------------------------------------------------------
// Report
// ---------------------------------------------------------------------------

/**
 * Print one category of findings.
 * @param {string} title
 * @param {object[]} findings
 * @param {(f: object) => string} format
 */
function report(title, findings, format) {
  // The same broken reference often appears several times in one file. Report
  // it once so the output stays scannable.
  const seen = new Set();
  const unique = findings.filter((f) => {
    const key = `${f.file}|${format(f)}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  if (unique.length === 0) {
    if (!quiet) console.log(`  ok    ${title}`);
    return 0;
  }

  console.log(`\n  FAIL  ${title} (${unique.length})`);
  for (const finding of unique.slice(0, 60)) {
    console.log(`        ${finding.file}:${finding.line}  ${format(finding)}`);
  }
  if (unique.length > 60) console.log(`        … and ${unique.length - 60} more`);

  return unique.length;
}

console.log(`\nDocumentation audit — ${files.length} markdown files, XActions v${PKG_VERSION}\n`);

const counts = [
  report('relative links resolve', deadLinks, (f) => f.target),
  report('heading anchors resolve', deadAnchors, (f) => f.target),
  report('referenced scripts exist', missingScripts, (f) => f.script),
  report('version claims match package.json', staleVersions, (f) => `claims v${f.claimed}`),
  report(
    `MCP tool-count claims match src/mcp/server.js (${MCP_TOOL_COUNT ?? 'unknown'})`,
    staleToolCounts,
    (f) => `claims ${f.claimed} tools`,
  ),
  report('documented CLI commands exist', unknownCommands, (f) => `xactions ${f.command}`),
  report(
    `skill, route, command and browser script counts match the tree (${SKILL_COUNT} skills, ${ROUTE_MODULE_COUNT} routes, ${CLI_COMMAND_COUNT} commands, ${BROWSER_SCRIPT_COUNT} browser scripts)`,
    staleCounts,
    (f) => `claims ${f.claimed} ${f.label}, actual ${f.actual}`,
  ),
];

// --fix rewrites the counts this audit knows how to derive. Detection and repair
// share the findings above, so the fixer can never disagree with the checker about
// what is stale or rewrite a number the checker deliberately skipped.
if (process.argv.includes('--fix')) {
  const edits = new Map();

  const queue = (finding, actual) => {
    if (!actual) return;
    if (!edits.has(finding.file)) edits.set(finding.file, []);
    edits.get(finding.file).push({ line: finding.line, claimed: finding.claimed, actual });
  };

  for (const f of staleToolCounts) queue(f, MCP_TOOL_COUNT);
  for (const f of staleCounts) queue(f, f.actual);

  let changedFiles = 0;
  let changedLines = 0;

  for (const [rel, items] of edits) {
    const full = join(ROOT, rel);
    let text;
    try {
      text = readFileSync(full, 'utf8');
    } catch {
      continue;
    }
    const lines = text.split('\n');
    let touched = false;

    for (const { line, claimed, actual } of items) {
      const i = line - 1;
      if (i < 0 || i >= lines.length) continue;
      // Replace the claimed number only where it is a standalone count, keeping
      // any "+" suffix off: "151+ tools" becomes "152 tools", not "152+ tools",
      // because the number is now exact.
      const next = lines[i].replace(
        new RegExp(`(?<![\\w.])${claimed}\\+?(?=\\s|-command\\b|$)`, 'g'),
        String(actual),
      );
      if (next !== lines[i]) {
        lines[i] = next;
        touched = true;
        changedLines += 1;
      }
    }

    if (touched) {
      writeFileSync(full, lines.join('\n'));
      changedFiles += 1;
      console.log(`  updated ${rel}`);
    }
  }

  console.log(
    changedLines > 0
      ? `\nRewrote ${changedLines} count(s) across ${changedFiles} file(s). Re-run to confirm.\n`
      : '\nNothing to fix.\n',
  );
  process.exit(0);
}

const failedCategories = counts.filter((n) => n > 0).length;

if (failedCategories === 0) {
  console.log('\nAll checks passed.\n');
  process.exit(0);
}

console.log(
  `\n${counts.reduce((a, b) => a + b, 0)} problems across ${failedCategories} categories.\n`,
);
process.exit(failedCategories);
