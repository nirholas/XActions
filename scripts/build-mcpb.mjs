#!/usr/bin/env node
// Copyright (c) 2024-2026 nich (@nichxbt). Licensed under the Apache License, Version 2.0.
/**
 * Build the XActions MCP Bundle (`.mcpb`) for Claude Desktop.
 *
 * An `.mcpb` is a zip carrying a local MCP server plus a `manifest.json` that
 * tells the host how to launch it and which settings to collect first. A user
 * drags the file onto Settings > Extensions, fills in the fields the manifest
 * declares, and the server runs. No npm install, no JSON config editing, no
 * absolute paths typed by hand.
 *
 * What this script assembles, under `dist/mcpb/`:
 *
 *   manifest.json      generated here from package.json and the live TOOLS array
 *   icon.png           public/icon-512.png
 *   package.json       the same one npm publishes, so the entry point resolves
 *   src/, types/       the server and everything it imports
 *   api/config/x402-config.js   the one api/ file package.json ships
 *   node_modules/      production dependencies only, install scripts skipped
 *   README.md, LICENSE
 *
 * Dependencies are installed with `npm ci --omit=dev --omit=optional
 * --ignore-scripts` and `PUPPETEER_SKIP_DOWNLOAD=1`. Skipping install scripts
 * keeps a browser download out of the bundle: the browser-driven tools fetch
 * Chromium into the user's own puppeteer cache on first use, and every HTTP
 * tool works without it. `@prisma/client` is imported lazily by one workflow
 * store and is not needed to start the server, so no `prisma generate` runs.
 *
 * Packing and validation are done by the official CLI (`@anthropic-ai/mcpb`),
 * fetched through npx so nothing new lands in package.json.
 *
 * Usage:
 *   node scripts/build-mcpb.mjs                 # full build -> dist/xactions-<version>.mcpb
 *   node scripts/build-mcpb.mjs --manifest-only # write + validate the manifest, do not pack
 *   node scripts/build-mcpb.mjs --skip-install  # reuse the staged node_modules
 *   node scripts/build-mcpb.mjs --out build     # write somewhere other than dist/
 *
 * @author nich (@nichxbt) - https://github.com/nirholas
 * @license Apache-2.0
 */

import { execFileSync } from 'node:child_process';
import { cpSync, mkdirSync, readFileSync, rmSync, statSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

const args = process.argv.slice(2);
const hasFlag = (name) => args.includes(`--${name}`);
const flagValue = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  return i !== -1 && args[i + 1] ? args[i + 1] : fallback;
};

const outDir = join(root, flagValue('out', 'dist'));
const stageDir = join(outDir, 'mcpb');
const manifestOnly = hasFlag('manifest-only');
const skipInstall = hasFlag('skip-install');

/** The MCPB manifest schema version this build targets. */
const MANIFEST_VERSION = '0.3';

/** Files and directories copied verbatim into the bundle. */
const PAYLOAD = [
  'package.json',
  'package-lock.json',
  'src',
  'types',
  'api/config/x402-config.js',
  // package.json overrides deepmerge with this patched copy, and the lockfile
  // installs it as a link to vendor/deepmerge. Without it the link dangles and
  // the pack step fails on it.
  'vendor/deepmerge',
  'README.md',
  'LICENSE',
];

const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));

/**
 * Run a command, streaming its output, and fail the build if it fails.
 * @param {string} cmd
 * @param {string[]} cmdArgs
 * @param {{cwd?: string, env?: NodeJS.ProcessEnv}} [options]
 */
function run(cmd, cmdArgs, options = {}) {
  execFileSync(cmd, cmdArgs, { stdio: 'inherit', cwd: root, ...options });
}

/**
 * Read the live tool list from the MCP server so the manifest can never drift
 * from what the server actually advertises.
 *
 * Only the first sentence of each description is kept: the host shows this
 * list in its extension detail view, and the full schemas are already sent
 * over the wire on `tools/list`.
 *
 * @returns {Promise<{name: string, description: string}[]>}
 */
async function readTools() {
  const mod = await import(join(root, 'src/mcp/server.js'));
  const tools = mod.TOOLS || mod.default?.TOOLS;
  if (!Array.isArray(tools) || tools.length === 0) {
    throw new Error('src/mcp/server.js exported no TOOLS array, so the manifest would ship an empty tool list');
  }
  return tools.map((tool) => ({
    name: tool.name,
    description: String(tool.description || '').split(/(?<=\.)\s/)[0].trim() || tool.name,
  }));
}

/**
 * Build the manifest object.
 *
 * `user_config` is the reason this format is worth shipping: Claude Desktop
 * renders one field per entry at install time and substitutes the answers into
 * `mcp_config.env`, so the session cookie is collected by the host (masked,
 * stored in the OS keychain) instead of being pasted into a config file.
 *
 * @param {{name: string, description: string}[]} tools
 * @returns {object}
 */
function buildManifest(tools) {
  return {
    manifest_version: MANIFEST_VERSION,
    name: 'xactions',
    display_name: 'XActions',
    version: pkg.version,
    description: 'X/Twitter automation for Claude: scrape profiles, followers and tweets, search, post, engage, and analyze accounts. No X API key.',
    long_description:
      'XActions exposes the whole X/Twitter surface as MCP tools. Public reads (profiles, tweets, threads, media, account reports) work with no login at all. ' +
      'Adding your `auth_token` cookie unlocks search, followers, following, likes, bookmarks and DMs, plus every write tool. ' +
      'Writes can be held as drafts for your approval before they run, and the tool list can be narrowed to the groups you actually want so it does not crowd the context window.',
    author: {
      name: 'nichxbt',
      url: 'https://github.com/nirholas',
    },
    homepage: 'https://xactions.app',
    documentation: 'https://github.com/nirholas/XActions/blob/main/docs/mcp-setup.md',
    support: 'https://github.com/nirholas/XActions/issues',
    icon: 'icon.png',
    repository: {
      type: 'git',
      url: 'https://github.com/nirholas/XActions',
    },
    license: pkg.license || 'Apache-2.0',
    keywords: ['twitter', 'x', 'social-media', 'automation', 'scraping', 'analytics'],
    server: {
      type: 'node',
      entry_point: 'src/mcp/server.js',
      mcp_config: {
        command: 'node',
        args: ['${__dirname}/src/mcp/server.js'],
        env: {
          XACTIONS_MODE: 'local',
          XACTIONS_SESSION_COOKIE: '${user_config.session_cookie}',
          XACTIONS_MCP_TOOLS: '${user_config.tool_groups}',
          XACTIONS_MCP_EXCLUDE: '${user_config.exclude_groups}',
          XACTIONS_MCP_REQUIRE_APPROVAL: '${user_config.require_approval}',
        },
      },
    },
    tools,
    tools_generated: true,
    user_config: {
      session_cookie: {
        type: 'string',
        title: 'X session cookie (auth_token)',
        description:
          'Your x.com auth_token cookie. Find it in DevTools > Application > Cookies > x.com > auth_token. ' +
          'Leave this empty to run on the guest tier, which still reads public profiles, tweets, threads and media.',
        sensitive: true,
        required: false,
      },
      tool_groups: {
        type: 'string',
        title: 'Tool groups to expose',
        description:
          'Comma-separated allowlist, for example "read,analytics". Leave empty for all ' +
          `${tools.length} tools. Groups: read, write, dm, lists, spaces, analytics, ai, grok, automation, monitoring, workflows, persona, graph, data, x402, drafts, auth.`,
        required: false,
        default: '',
      },
      exclude_groups: {
        type: 'string',
        title: 'Tool groups to hide',
        description: 'Comma-separated denylist applied after the allowlist, for example "write,dm". Leave empty to hide nothing.',
        required: false,
        default: '',
      },
      require_approval: {
        type: 'boolean',
        title: 'Hold writes for approval',
        description:
          'When on, every tool that posts, deletes, follows, mutes or sends is saved as a draft instead of running. ' +
          'Review them with x_list_drafts and release one with x_approve_draft.',
        required: false,
        default: false,
      },
    },
    compatibility: {
      claude_desktop: '>=0.10.0',
      platforms: ['darwin', 'win32', 'linux'],
      runtimes: {
        node: pkg.engines?.node || '>=20',
      },
    },
  };
}

/** Copy the payload files into the staging directory. */
function stagePayload() {
  rmSync(stageDir, { recursive: true, force: true });
  mkdirSync(stageDir, { recursive: true });

  for (const entry of PAYLOAD) {
    const from = join(root, entry);
    if (!existsSync(from)) {
      throw new Error(`package.json ships "${entry}" but it is missing from the working tree`);
    }
    const to = join(stageDir, entry);
    mkdirSync(dirname(to), { recursive: true });
    cpSync(from, to, { recursive: true });
  }

  stageIcon();
}

/** Copy the bundle icon, which validation requires even on a manifest-only run. */
function stageIcon() {
  cpSync(join(root, 'public/icon-512.png'), join(stageDir, 'icon.png'));
}

/** Install production dependencies inside the staging directory. */
function installDependencies() {
  run('npm', ['ci', '--omit=dev', '--omit=optional', '--ignore-scripts', '--no-audit', '--no-fund'], {
    cwd: stageDir,
    env: { ...process.env, PUPPETEER_SKIP_DOWNLOAD: '1', NODE_ENV: 'production' },
  });
}

/**
 * Prove a directory of files is actually a runnable server, rather than
 * trusting that the right names are in the right places. A bundle that unpacks
 * cleanly and then fails on launch is worse than a build error.
 *
 * @param {string} dir - Directory holding src/ and node_modules/
 * @param {string} label - What is being checked, for the log line
 */
function verifyServerIn(dir, label) {
  const script = [
    "const m = await import('./src/mcp/server.js');",
    'const tools = m.TOOLS || m.default?.TOOLS;',
    "if (!Array.isArray(tools) || tools.length === 0) { console.error('no tools'); process.exit(1); }",
    `console.log(\`${label} loads \${tools.length} tools\`);`,
  ].join(' ');
  run(process.execPath, ['--input-type=module', '-e', script], { cwd: dir });
}

/**
 * Unpack the finished `.mcpb` somewhere clean and start the server from it.
 *
 * This is the check that matters: the pack step applies its own ignore rules,
 * so the only proof that they did not drop a module the server imports is to
 * run the thing that came out of the zip.
 *
 * @param {string} bundle - Path to the packed bundle
 */
function verifyBundle(bundle) {
  const checkDir = join(outDir, 'mcpb-verify');
  rmSync(checkDir, { recursive: true, force: true });
  run('npx', ['--yes', '@anthropic-ai/mcpb@2', 'unpack', bundle, checkDir]);
  verifyServerIn(checkDir, 'packed bundle');
  rmSync(checkDir, { recursive: true, force: true });
}

/** Report the size of a built file in MB. */
function sizeMb(file) {
  return (statSync(file).size / (1024 * 1024)).toFixed(1);
}

const tools = await readTools();
const manifest = buildManifest(tools);

if (manifestOnly) {
  mkdirSync(stageDir, { recursive: true });
  stageIcon();
} else {
  stagePayload();
}

const manifestPath = join(stageDir, 'manifest.json');
writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
console.log(`manifest: ${relative(root, manifestPath)} (${tools.length} tools)`);

run('npx', ['--yes', '@anthropic-ai/mcpb@2', 'validate', manifestPath]);

if (manifestOnly) {
  console.log('manifest-only build: validated, nothing packed');
  process.exit(0);
}

if (skipInstall) {
  if (!existsSync(join(stageDir, 'node_modules'))) {
    throw new Error('--skip-install was passed but dist/mcpb/node_modules does not exist; run once without it');
  }
} else {
  installDependencies();
}

verifyServerIn(stageDir, 'staged server');

const bundlePath = join(outDir, `xactions-${pkg.version}.mcpb`);
rmSync(bundlePath, { force: true });
run('npx', ['--yes', '@anthropic-ai/mcpb@2', 'pack', stageDir, bundlePath]);

verifyBundle(bundlePath);

console.log(`bundle: ${relative(root, bundlePath)} (${sizeMb(bundlePath)} MB)`);
