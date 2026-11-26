#!/usr/bin/env node
// Copyright (c) 2024-2026 nich (@nichxbt). Licensed under the Apache License, Version 2.0.
/**
 * Regenerate the official X API v2 operation catalog.
 *
 * X publishes a machine-readable contract for API v2 at
 * https://api.x.com/2/openapi.json and a one-file copy of its developer docs at
 * https://docs.x.com/llms-full.txt. This script reads both and writes
 * `src/xapi/catalog.generated.js`, the table the XActions X API client, the
 * `xactions xapi` command and the `x_api_*` MCP tools are driven by.
 *
 * What is kept, and what is deliberately left out:
 *
 *   kept     the functional interface: operation IDs, HTTP methods, paths,
 *            parameter names, locations, types, formats, patterns, ranges and
 *            allowed values, request body property names and types, the
 *            authentication schemes and OAuth 2.0 scopes each operation
 *            accepts, whether it streams, how it paginates, and the URL of the
 *            official reference page for it.
 *   dropped  every prose string: summaries, descriptions, examples and the
 *            scope explanations. The spec is published under the X Developer
 *            Agreement and the docs are X's copyright, so XActions reproduces
 *            neither. A user who wants the explanation follows `docsUrl` to
 *            the official page. The interface facts are what a client needs
 *            to interoperate with the API, and they are all it carries.
 *
 * Usage:
 *   node scripts/sync-x-api.mjs              # fetch and rewrite
 *   node scripts/sync-x-api.mjs --check      # exit 1 if the catalog is stale
 *   node scripts/sync-x-api.mjs --json       # machine-readable report
 *   node scripts/sync-x-api.mjs --spec openapi.json --docs llms-full.txt
 *
 * Exit codes: 0 up to date or written, 1 drift found under --check, 2 fetch or
 * write failure.
 *
 * @author nich (@nichxbt) - https://github.com/nirholas
 * @see https://xactions.app
 * @license Apache-2.0
 */

import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');

export const SPEC_URL = 'https://api.x.com/2/openapi.json';
export const DOCS_URL = 'https://docs.x.com/llms-full.txt';
export const DOCS_INDEX_URL = 'https://docs.x.com/x-api/llms.txt';
export const DEFAULT_OUTPUT = path.join(ROOT, 'src/xapi/catalog.generated.js');

const METHODS = ['get', 'post', 'put', 'patch', 'delete'];
const SCHEMA_KEYS = [
  'type', 'format', 'pattern', 'minimum', 'maximum', 'exclusiveMinimum', 'exclusiveMaximum',
  'minLength', 'maxLength', 'minItems', 'maxItems', 'uniqueItems', 'default', 'nullable',
];

// ---------------------------------------------------------------------------
// Fetching
// ---------------------------------------------------------------------------

async function fetchText(url, fetchImpl) {
  const res = await fetchImpl(url, { headers: { accept: 'application/json, text/plain, */*' } });
  if (!res.ok) throw new Error(`GET ${url} answered ${res.status}`);
  return res.text();
}

async function loadSources(options) {
  const fetchImpl = options.fetch ?? globalThis.fetch;
  const specText = options.spec ? await fs.readFile(options.spec, 'utf8') : await fetchText(SPEC_URL, fetchImpl);
  const docsText = options.docs ? await fs.readFile(options.docs, 'utf8') : await fetchText(DOCS_URL, fetchImpl);
  const indexText = options.docsIndex
    ? await fs.readFile(options.docsIndex, 'utf8')
    : options.docs
      ? ''
      : await fetchText(DOCS_INDEX_URL, fetchImpl);
  return { specText, docsText, indexText };
}

// ---------------------------------------------------------------------------
// Spec reading
// ---------------------------------------------------------------------------

function resolveRef(spec, ref) {
  if (!ref.startsWith('#/')) throw new Error(`External $ref not supported: ${ref}`);
  let node = spec;
  for (const part of ref.slice(2).split('/')) {
    node = node?.[part.replace(/~1/g, '/').replace(/~0/g, '~')];
    if (node === undefined) throw new Error(`Unresolvable $ref ${ref}`);
  }
  return node;
}

function deref(spec, node, seen = new Set()) {
  let current = node;
  while (current && current.$ref) {
    if (seen.has(current.$ref)) return {};
    seen.add(current.$ref);
    current = resolveRef(spec, current.$ref);
  }
  return current ?? {};
}

/**
 * Reduce a JSON schema to its interface facts. Descriptions, titles and
 * examples are dropped. Object properties are kept to `depth` levels.
 */
export function simplifySchema(spec, schema, depth = 2, seen = new Set()) {
  if (!schema) return {};
  const refName = schema.$ref ? schema.$ref.split('/').pop() : null;
  if (refName && seen.has(refName)) return { type: 'object', ref: refName };
  const nextSeen = refName ? new Set([...seen, refName]) : seen;
  const node = deref(spec, schema);
  const out = {};

  for (const combinator of ['allOf', 'oneOf', 'anyOf']) {
    if (!Array.isArray(node[combinator])) continue;
    const parts = node[combinator].map((s) => simplifySchema(spec, s, depth, nextSeen));
    if (combinator === 'allOf') {
      for (const part of parts) mergeInto(out, part);
    } else {
      const types = [...new Set(parts.map((p) => p.type).filter(Boolean))];
      if (types.length === 1 && !out.type) out.type = types[0];
      const props = parts.flatMap((p) => p.properties ?? []);
      if (props.length > 0) {
        out.type = 'object';
        const byName = new Map();
        for (const prop of props) if (!byName.has(prop.name)) byName.set(prop.name, { ...prop, required: false });
        out.properties = mergeProperties(out.properties, [...byName.values()]);
      }
      out[combinator === 'oneOf' ? 'oneOf' : 'anyOf'] = parts.length;
    }
  }

  for (const key of SCHEMA_KEYS) if (node[key] !== undefined) out[key] = node[key];
  if (Array.isArray(node.enum)) out.enum = [...node.enum];
  if (node.items) out.items = simplifySchema(spec, node.items, depth, nextSeen);
  if (!out.type && node.properties) out.type = 'object';

  if (node.properties && depth > 0) {
    const required = new Set(node.required ?? []);
    const props = Object.entries(node.properties).map(([name, sub]) => {
      const simple = simplifySchema(spec, sub, depth - 1, nextSeen);
      return { name, required: required.has(name), ...simple };
    });
    out.properties = mergeProperties(out.properties, props);
  }
  return out;
}

function mergeProperties(existing = [], incoming = []) {
  const byName = new Map(existing.map((p) => [p.name, p]));
  for (const prop of incoming) byName.set(prop.name, { ...(byName.get(prop.name) ?? {}), ...prop });
  return [...byName.values()];
}

function mergeInto(target, part) {
  for (const [key, value] of Object.entries(part)) {
    if (key === 'properties') target.properties = mergeProperties(target.properties, value);
    else if (target[key] === undefined) target[key] = value;
  }
}

/** "getPostsById" becomes "get posts by id". */
export function labelFromOperationId(id) {
  return id
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2')
    .toLowerCase();
}

/**
 * Map "METHOD /path" to the official reference page by reading the
 * `Source: <url>` line and the `<method> <path>` line under it that every
 * generated reference page in llms-full.txt carries. When two pages document
 * one operation, the page the X API index lists wins.
 */
export function parseDocsMap(docsText, indexText = '') {
  const indexed = new Set();
  for (const m of indexText.matchAll(/\((https:\/\/docs\.x\.com\/[^)\s]+?)(?:\.md)?\)/g)) indexed.add(m[1]);
  const map = new Map();
  const re = /^Source: (https:\/\/docs\.x\.com\/\S+)\s*\n\s*\n(get|post|put|patch|delete) (\/\S+)\s*$/gim;
  for (const m of docsText.matchAll(re)) {
    const url = m[1].replace(/\.md$/, '');
    const key = `${m[2].toUpperCase()} ${m[3]}`;
    const current = map.get(key);
    if (!current || (!indexed.has(current) && indexed.has(url))) map.set(key, url);
  }
  return map;
}

function readParameter(spec, raw) {
  const param = deref(spec, raw);
  const schema = simplifySchema(spec, param.schema, 1);
  const out = { name: param.name, in: param.in, required: Boolean(param.required) };
  for (const [k, v] of Object.entries(schema)) if (k !== 'properties') out[k] = v;
  if (param.style && param.style !== (param.in === 'query' ? 'form' : 'simple')) out.style = param.style;
  if (param.explode !== undefined && param.in === 'query' && param.explode === true && schema.type === 'array') out.explode = true;
  return out;
}

function readAuth(security, scopesKnown) {
  const auth = { bearer: false, oauth2User: null, oauth1User: false };
  for (const requirement of security ?? []) {
    for (const [scheme, scopes] of Object.entries(requirement)) {
      if (scheme === 'BearerToken') auth.bearer = true;
      else if (scheme === 'UserToken') auth.oauth1User = true;
      else if (scheme === 'OAuth2UserToken') {
        auth.oauth2User = [...new Set([...(auth.oauth2User ?? []), ...scopes])].sort();
        for (const s of scopes) scopesKnown.add(s);
      }
    }
  }
  return auth;
}

function readBody(spec, requestBody) {
  if (!requestBody) return null;
  const body = deref(spec, requestBody);
  const contentTypes = Object.keys(body.content ?? {});
  const primary = contentTypes[0];
  const schema = primary ? simplifySchema(spec, body.content[primary].schema, 2) : {};
  const out = { contentTypes, required: Boolean(body.required) };
  if (schema.type) out.type = schema.type;
  if (schema.properties) out.properties = schema.properties;
  if (schema.oneOf) out.oneOf = schema.oneOf;
  return out;
}

/**
 * Turn the spec (and the docs page map) into the catalog object.
 */
export function buildCatalog(spec, docsMap) {
  const scopesKnown = new Set();
  const operations = [];
  for (const [p, item] of Object.entries(spec.paths ?? {})) {
    const shared = item.parameters ?? [];
    for (const method of METHODS) {
      const op = item[method];
      if (!op) continue;
      if (p === '/2/openapi.json') continue;
      const params = [...shared, ...(op.parameters ?? [])].map((raw) => readParameter(spec, raw));
      const names = new Set(params.map((x) => x.name));
      const pagination = names.has('pagination_token') ? 'pagination_token' : names.has('next_token') ? 'next_token' : null;
      const key = `${method.toUpperCase()} ${p}`;
      operations.push({
        id: op.operationId,
        label: labelFromOperationId(op.operationId),
        method: method.toUpperCase(),
        path: p,
        tag: op.tags?.[0] ?? 'General',
        streaming: Boolean(op['x-twitter-streaming']),
        write: method !== 'get',
        pagination,
        auth: readAuth(op.security, scopesKnown),
        params,
        body: readBody(spec, op.requestBody),
        docsUrl: docsMap.get(key) ?? op.externalDocs?.url ?? null,
      });
    }
  }
  operations.sort((a, b) => a.tag.localeCompare(b.tag) || a.path.localeCompare(b.path) || a.method.localeCompare(b.method));

  const oauth = spec.components?.securitySchemes?.OAuth2UserToken?.flows?.authorizationCode ?? {};
  for (const s of Object.keys(oauth.scopes ?? {})) scopesKnown.add(s);
  return {
    spec: {
      title: spec.info?.title ?? 'X API v2',
      version: String(spec.info?.version ?? ''),
      server: spec.servers?.[0]?.url ?? 'https://api.x.com',
    },
    oauth2: {
      authorizationUrl: oauth.authorizationUrl ?? 'https://x.com/i/oauth2/authorize',
      tokenUrl: oauth.tokenUrl ?? 'https://api.x.com/2/oauth2/token',
      scopes: [...scopesKnown].sort(),
    },
    operations,
  };
}

// ---------------------------------------------------------------------------
// Rendering
// ---------------------------------------------------------------------------

/**
 * Render the catalog as an ES module. Allowed-value lists repeat across
 * hundreds of parameters (every `user.fields` list is the same), so each
 * distinct list is emitted once in `E` and referenced by index.
 */
export function renderCatalog(catalog, meta) {
  const pool = new Map();
  const intern = (list) => {
    const key = JSON.stringify(list);
    if (!pool.has(key)) pool.set(key, pool.size);
    return `__E${pool.get(key)}__`;
  };
  const walk = (node) => {
    if (Array.isArray(node)) return node.map(walk);
    if (node && typeof node === 'object') {
      const out = {};
      for (const [k, v] of Object.entries(node)) out[k] = k === 'enum' && Array.isArray(v) && v.length > 3 ? intern(v) : walk(v);
      return out;
    }
    return node;
  };
  const ops = catalog.operations.map(walk);
  const unquote = (s) => s.replace(/"__E(\d+)__"/g, 'E[$1]');
  const enums = [...pool.keys()].map((k, i) => `  /* ${i} */ ${k},`).join('\n');
  const opLines = ops.map((op) => `  ${unquote(JSON.stringify(op))},`).join('\n');
  const metaObj = { ...meta, operations: catalog.operations.length, scopes: catalog.oauth2.scopes.length };

  return `// Copyright (c) 2024-2026 nich (@nichxbt). Licensed under the Apache License, Version 2.0.
//
// GENERATED FILE. Do not edit by hand.
// Regenerate with: npm run sync:xapi
// Verify with:     npm run sync:xapi:check
//
// The interface facts of the official X API v2 (operation IDs, methods, paths,
// parameter names, types and allowed values, request body property names,
// authentication schemes and OAuth 2.0 scopes), read from X's published
// OpenAPI document at ${SPEC_URL}. No prose from the specification or from
// docs.x.com is reproduced here: each operation links to its official
// reference page instead. XActions is not affiliated with or endorsed by
// X Corp. See THIRD-PARTY-NOTICES.md.

/**
 * Where this catalog came from, and when.
 *
 * @type {Readonly<{title: string, version: string, server: string, specUrl: string, specSha256: string, docsUrl: string, fetchedAt: string, operations: number, scopes: number}>}
 */
export const SOURCE = Object.freeze(${JSON.stringify(metaObj, null, 2)});

/**
 * OAuth 2.0 authorization code flow endpoints and every scope name an
 * operation in this catalog accepts.
 */
export const OAUTH2 = Object.freeze(${JSON.stringify(catalog.oauth2, null, 2)});

/** Shared allowed-value lists, referenced by index from OPERATIONS. */
const E = [
${enums}
];

/**
 * Every operation in the API, sorted by tag, then path, then method.
 *
 * @type {ReadonlyArray<import('./types.js').XApiOperation>}
 */
export const OPERATIONS = Object.freeze([
${opLines}
]);
`;
}

// ---------------------------------------------------------------------------
// Rate limits
// ---------------------------------------------------------------------------

export const RATE_LIMITS_PAGE = 'https://docs.x.com/x-api/fundamentals/rate-limits';
const WINDOW_SECONDS = { sec: 1, second: 1, min: 60, '15min': 900, '15mins': 900, hr: 3600, hrs: 3600, '24hr': 86400, '24hrs': 86400, '24h': 86400 };

/** "3,500/15min, 1/sec" into [{requests: 3500, windowSeconds: 900}, {requests: 1, windowSeconds: 1}]. */
export function parseLimitCell(cell) {
  const out = [];
  const text = String(cell).replace(/(\d),(?=\d{3}\b)/g, '$1');
  for (const part of text.split(',').map((s) => s.trim())) {
    const m = /^([\d.]+)\s*\/\s*(\d*)\s*([a-z]+)$/i.exec(part);
    if (!m) continue;
    const unit = `${m[2]}${m[3].toLowerCase()}`;
    const windowSeconds = WINDOW_SECONDS[unit] ?? (m[2] && WINDOW_SECONDS[m[3].toLowerCase()] ? Number(m[2]) * WINDOW_SECONDS[m[3].toLowerCase()] : null);
    if (!windowSeconds) continue;
    out.push({ requests: Number(m[1]), windowSeconds });
  }
  return out;
}

/**
 * Read the per-endpoint rate limit tables from the docs dump. Only numbers,
 * methods and paths are kept: rows look like
 * `| GET | \`/2/tweets/:id\` | 450/15min | 900/15min |`.
 * @returns {Array<{method: string, path: string, limits: Array<{scope: 'app'|'user', requests: number, windowSeconds: number}>}>}
 */
export function parseRateLimits(docsText) {
  const marker = `Source: ${RATE_LIMITS_PAGE}`;
  const start = docsText.indexOf(`${marker}\n`);
  if (start === -1) return [];
  const next = docsText.indexOf('\nSource: ', start + marker.length);
  const section = docsText.slice(start, next === -1 ? undefined : next);
  const seen = new Map();
  for (const line of section.split('\n')) {
    const cells = line.split('|').map((c) => c.trim());
    if (cells.length < 5) continue;
    const method = cells[1]?.toUpperCase();
    const pathMatch = /^`?(\/[^`\s]+)`?$/.exec(cells[2] ?? '');
    if (!METHODS.includes(method?.toLowerCase()) || !pathMatch) continue;
    const routePath = pathMatch[1].replace(/:([A-Za-z_]+)/g, '{$1}');
    const limits = [
      ...parseLimitCell(cells[3]).map((l) => ({ scope: 'app', ...l })),
      ...parseLimitCell(cells[4]).map((l) => ({ scope: 'user', ...l })),
    ];
    if (!limits.length) continue;
    seen.set(`${method} ${routePath}`, { method, path: routePath, limits });
  }
  return [...seen.values()].sort((a, b) => a.path.localeCompare(b.path) || a.method.localeCompare(b.method));
}

export function renderRateLimits(list, meta) {
  const lines = list.map((e) => `  [${JSON.stringify(`${e.method} ${e.path}`)}, ${JSON.stringify(e.limits.map((l) => [l.scope, l.requests, l.windowSeconds]))}],`).join('\n');
  return `// Copyright (c) 2024-2026 nich (@nichxbt). Licensed under the Apache License, Version 2.0.
//
// GENERATED FILE. Do not edit by hand.
// Regenerate with: npm run sync:xapi
//
// Published per-endpoint rate limits of the official X API v2, as numbers
// only, read from ${RATE_LIMITS_PAGE}
// on ${meta.fetchedAt.slice(0, 10)}. X changes these; the Developer Console and the
// x-rate-limit-* response headers are authoritative. Not affiliated with X Corp.

/** Where these numbers came from. */
export const RATE_LIMITS_SOURCE = Object.freeze(${JSON.stringify({ page: RATE_LIMITS_PAGE, fetchedAt: meta.fetchedAt, endpoints: list.length })});

/**
 * [route, [[scope, requests, windowSeconds], ...]] where scope is "app"
 * (app-only bearer) or "user" (any user-context token).
 * @type {ReadonlyArray<[string, ReadonlyArray<[('app'|'user'), number, number]>]>}
 */
export const RATE_LIMIT_ROWS = Object.freeze([
${lines}
]);
`;
}

// ---------------------------------------------------------------------------
// Endpoint reference (docs/x-api/endpoints.md)
// ---------------------------------------------------------------------------

export const DEFAULT_ENDPOINTS_DOC = path.join(ROOT, 'docs/x-api/endpoints.md');

/** A Markdown reference of every operation, grouped by tag. Facts and links only. */
export function renderEndpointsDoc(catalog, meta, rateLimits = []) {
  const limitIndex = new Map(rateLimits.map((e) => [`${e.method} ${e.path.replace(/\{[^}]+\}/g, '{}')}`, e.limits]));
  const fmtWindow = (s) => (s === 1 ? 's' : s % 86400 === 0 ? `${s / 86400}d` : s % 3600 === 0 ? `${s / 3600}h` : `${s / 60}m`);
  const byTag = new Map();
  for (const op of catalog.operations) {
    if (!byTag.has(op.tag)) byTag.set(op.tag, []);
    byTag.get(op.tag).push(op);
  }
  const tags = [...byTag.keys()].sort();
  const anchor = (t) => t.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  let md = `# X API v2 endpoint reference

Generated by \`npm run sync:xapi\` from X's published OpenAPI document (spec ${meta.version}, fetched ${meta.fetchedAt.slice(0, 10)}). ${catalog.operations.length} operations in ${tags.length} areas. Do not edit by hand.

Each entry lists the operation id you pass to \`xactions xapi call\`, \`XApiClient.call()\` or the \`x_api_get\` / \`x_api_write\` MCP tools, the HTTP route, which credentials it accepts, the OAuth 2.0 scopes it needs, its published rate limits (app / user), and a link to the official reference page, which is the authority on behaviour. Run \`xactions xapi describe <id>\` for every parameter and allowed value.

Auth key: **B** app-only bearer token, **U2** OAuth 2.0 user token, **U1** OAuth 1.0a user token. Marks: *stream* holds a connection open, *write* changes state, *paged* follows \`next_token\`.

XActions is not affiliated with or endorsed by X Corp. "X" is used only to name the API this code talks to.

## Areas

${tags.map((t) => `- [${t}](#${anchor(t)}) (${byTag.get(t).length})`).join('\n')}
`;
  for (const tag of tags) {
    md += `\n## ${tag}\n`;
    for (const op of byTag.get(tag)) {
      const auth = [op.auth.bearer && 'B', op.auth.oauth2User && 'U2', op.auth.oauth1User && 'U1'].filter(Boolean).join(', ') || 'none';
      const marks = [op.streaming && 'stream', op.write && 'write', op.pagination && 'paged'].filter(Boolean);
      const limits = limitIndex.get(`${op.method} ${op.path.replace(/\{[^}]+\}/g, '{}')}`);
      const limitText = limits ? limits.map((l) => `${l.requests}/${fmtWindow(l.windowSeconds)} ${l.scope}`).join(', ') : null;
      md += `\n### \`${op.id}\`\n\n`;
      md += `\`${op.method} ${op.path}\`${marks.length ? ` (${marks.map((m) => `*${m}*`).join(', ')})` : ''}\n\n`;
      md += `- Auth: ${auth}${op.auth.oauth2User?.length ? `; scopes \`${op.auth.oauth2User.join('` `')}\`` : ''}\n`;
      const required = op.params.filter((p) => p.required).map((p) => `\`${p.name}\``);
      if (required.length) md += `- Required: ${required.join(', ')}${op.body?.required ? ', JSON body' : ''}\n`;
      else if (op.body?.required) md += '- Required: JSON body\n';
      if (limitText) md += `- Rate limit: ${limitText}\n`;
      if (op.docsUrl) md += `- Reference: ${op.docsUrl}\n`;
    }
  }
  return md;
}

// ---------------------------------------------------------------------------
// Sync
// ---------------------------------------------------------------------------

async function loadCommitted(outPath) {
  try {
    await fs.access(outPath);
  } catch {
    return null;
  }
  const mod = await import(`${pathToFileURL(outPath).href}?t=${Date.now()}`);
  return { source: mod.SOURCE, operations: mod.OPERATIONS };
}

function diffOperations(before, after) {
  const index = (list) => new Map((list ?? []).map((op) => [op.id, JSON.stringify(op)]));
  const a = index(before);
  const b = index(after);
  const added = [...b.keys()].filter((k) => !a.has(k));
  const removed = [...a.keys()].filter((k) => !b.has(k));
  const changed = [...b.keys()].filter((k) => a.has(k) && a.get(k) !== b.get(k));
  return { added, removed, changed };
}

/**
 * Run one sync.
 *
 * @param {object} [options]
 * @param {boolean} [options.check]
 * @param {string} [options.spec] local OpenAPI file instead of the network
 * @param {string} [options.docs] local llms-full.txt instead of the network
 * @param {string} [options.docsIndex] local x-api/llms.txt
 * @param {string} [options.out]
 * @param {typeof globalThis.fetch} [options.fetch]
 * @param {string} [options.now]
 */
export async function sync(options = {}) {
  const out = options.out ?? DEFAULT_OUTPUT;
  const { specText, docsText, indexText } = await loadSources(options);
  const spec = JSON.parse(specText);
  const docsMap = parseDocsMap(docsText, indexText);
  const catalog = buildCatalog(spec, docsMap);
  if (catalog.operations.length === 0) throw new Error('The OpenAPI document yielded no operations');

  const rateLimits = parseRateLimits(docsText);
  const rateLimitsOut = options.rateLimitsOut ?? path.join(path.dirname(out), 'rate-limits.generated.js');
  // A custom --out is a scratch run: only the default run rewrites the committed doc.
  const endpointsOut = options.endpointsOut ?? (options.out && path.resolve(options.out) !== DEFAULT_OUTPUT ? null : DEFAULT_ENDPOINTS_DOC);

  const specSha256 = crypto.createHash('sha256').update(specText).digest('hex');
  const committed = await loadCommitted(out);
  const committedLimits = await loadCommittedRateLimits(rateLimitsOut);
  const freshLimitRows = JSON.stringify(rateLimits.map((e) => [`${e.method} ${e.path}`, e.limits.map((l) => [l.scope, l.requests, l.windowSeconds])]));
  const rateLimitsChanged = rateLimits.length > 0 && freshLimitRows !== committedLimits;
  const fresh = JSON.parse(JSON.stringify(catalog.operations));
  const diff = diffOperations(committed?.operations ?? null, fresh);
  const versionChanged = committed?.source?.version !== catalog.spec.version;
  const drift = !committed || versionChanged || rateLimitsChanged || diff.added.length + diff.removed.length + diff.changed.length > 0;

  const report = {
    output: path.relative(ROOT, out),
    version: catalog.spec.version,
    previousVersion: committed?.source?.version ?? null,
    operations: catalog.operations.length,
    withDocs: catalog.operations.filter((op) => op.docsUrl).length,
    scopes: catalog.oauth2.scopes.length,
    rateLimitEndpoints: rateLimits.length,
    rateLimitsChanged,
    ...diff,
    drift,
    written: false,
  };
  if (options.check) return report;
  const docMissing = endpointsOut ? await fs.access(endpointsOut).then(() => false, () => true) : false;
  if (!drift && !docMissing && committed?.source?.specSha256 === specSha256) return report;

  const meta = {
    title: catalog.spec.title,
    version: catalog.spec.version,
    server: catalog.spec.server,
    specUrl: SPEC_URL,
    specSha256,
    docsUrl: DOCS_INDEX_URL,
    fetchedAt: options.now ?? new Date().toISOString(),
  };
  await fs.mkdir(path.dirname(out), { recursive: true });
  await fs.writeFile(out, renderCatalog(catalog, meta));
  if (rateLimits.length) await fs.writeFile(rateLimitsOut, renderRateLimits(rateLimits, meta));
  if (endpointsOut) {
    await fs.mkdir(path.dirname(endpointsOut), { recursive: true });
    await fs.writeFile(endpointsOut, renderEndpointsDoc(catalog, meta, rateLimits));
  }
  report.written = true;
  return report;
}

async function loadCommittedRateLimits(file) {
  try {
    await fs.access(file);
  } catch {
    return null;
  }
  const mod = await import(`${pathToFileURL(file).href}?t=${Date.now()}`);
  return JSON.stringify(mod.RATE_LIMIT_ROWS);
}

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

function parseArgs(argv) {
  const args = { check: false, json: false, out: DEFAULT_OUTPUT };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--check') args.check = true;
    else if (arg === '--json') args.json = true;
    else if (arg === '--spec') args.spec = path.resolve(argv[++i] ?? '');
    else if (arg === '--docs') args.docs = path.resolve(argv[++i] ?? '');
    else if (arg === '--docs-index') args.docsIndex = path.resolve(argv[++i] ?? '');
    else if (arg === '--out') args.out = path.resolve(argv[++i] ?? '');
    else if (arg === '--help' || arg === '-h') args.help = true;
    else throw new Error(`Unknown argument: ${arg}`);
  }
  return args;
}

const HELP = `sync-x-api  regenerate the official X API v2 operation catalog

  node scripts/sync-x-api.mjs [--check] [--json] [--spec <file>] [--docs <file>] [--docs-index <file>] [--out <file>]

  --check              do not write; exit 1 if the committed catalog differs from X's published spec
  --json               print the report as JSON
  --spec <file>        read the OpenAPI document from <file> instead of ${SPEC_URL}
  --docs <file>        read llms-full.txt from <file> instead of ${DOCS_URL}
  --docs-index <file>  read the X API page index from <file> instead of ${DOCS_INDEX_URL}
  --out <file>         write somewhere other than src/xapi/catalog.generated.js
`;

async function main() {
  let args;
  try {
    args = parseArgs(process.argv.slice(2));
  } catch (err) {
    console.error(err.message);
    console.error(HELP);
    process.exit(2);
  }
  if (args.help) {
    console.log(HELP);
    return;
  }
  let report;
  try {
    report = await sync(args);
  } catch (err) {
    console.error(`sync-x-api: ${err.message}`);
    process.exit(2);
  }
  if (args.json) console.log(JSON.stringify(report, null, 2));
  else {
    console.log(`X API v2 spec ${report.version} (${report.operations} operations, ${report.withDocs} with a reference page, ${report.scopes} scopes)`);
    if (report.previousVersion && report.previousVersion !== report.version) console.log(`  version ${report.previousVersion} -> ${report.version}`);
    for (const id of report.added) console.log(`  + ${id}`);
    for (const id of report.removed) console.log(`  - ${id}`);
    for (const id of report.changed) console.log(`  ~ ${id}`);
    if (args.check) console.log(report.drift ? 'Catalog is stale. Run: npm run sync:xapi' : 'Catalog is up to date.');
    else console.log(report.written ? `Wrote ${report.output}` : 'Catalog already up to date.');
  }
  if (args.check && report.drift) process.exit(1);
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) main();
