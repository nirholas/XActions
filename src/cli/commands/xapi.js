// Copyright (c) 2024-2026 nich (@nichxbt). Licensed under the Apache License, Version 2.0.
/**
 * `xactions xapi` - the official X API v2, every operation, from the shell.
 *
 *   xactions xapi tags
 *   xactions xapi list followers
 *   xactions xapi describe getUsersFollowers
 *   xactions xapi call getUsersByUsername username=XDevelopers user.fields=public_metrics
 *   xactions xapi call searchPostsRecent query="from:XDevelopers -is:retweet" --all --limit 300 --json
 *   xactions xapi call createPosts --body '{"text":"hello"}' --yes
 *   xactions xapi stream streamPosts tweet.fields=created_at --limit 50
 *   xactions xapi upload ./clip.mp4
 *   xactions xapi auth login --scopes tweet.read,users.read,offline.access
 *
 * Every command is driven by src/xapi/catalog.generated.js, so it knows every
 * operation, its params and the credential it needs, and refuses a bad call
 * before it spends a request. Writes need --yes (or --dry-run to see the
 * request that would be sent).
 *
 * @author nich (@nichxbt) - https://github.com/nirholas
 * @license Apache-2.0
 */

import { spawn } from 'node:child_process';
import fs from 'node:fs/promises';
import http from 'node:http';
import path from 'node:path';
import chalk from 'chalk';

import {
  describeOperation,
  listOperations,
  listTags,
  SOURCE,
  XApiError,
} from '../../xapi/index.js';
import {
  buildAuthorizeUrl,
  createPkcePair,
  createState,
  DEFAULT_SCOPES,
  exchangeCode,
  revokeToken,
  SCOPES,
} from '../../xapi/oauth2.js';
import { clearTokens, clientFromStore, loadTokens, saveTokens, tokenFilePath } from '../../xapi/token-store.js';
import { printCompact, resolveOutputMode } from '../../utils/output.js';

const DEFAULT_REDIRECT = 'http://127.0.0.1:3219/callback';

const MIME = {
  '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.gif': 'image/gif', '.webp': 'image/webp',
  '.bmp': 'image/bmp', '.tif': 'image/tiff', '.tiff': 'image/tiff', '.mp4': 'video/mp4', '.mov': 'video/quicktime',
  '.webm': 'video/webm', '.ts': 'video/mp2t', '.srt': 'text/srt', '.vtt': 'text/vtt',
};

/**
 * Parse `key=value` words into a params object. A repeated key becomes a
 * comma list, which is what array params take.
 * @param {string[]} pairs
 */
export function parsePairs(pairs = []) {
  const out = {};
  for (const pair of pairs) {
    const i = pair.indexOf('=');
    if (i <= 0) throw new XApiError(`Expected key=value, got "${pair}"`, { code: 'invalid_params' });
    const key = pair.slice(0, i);
    const value = pair.slice(i + 1);
    out[key] = out[key] === undefined ? value : `${out[key]},${value}`;
  }
  return out;
}

/** --body takes inline JSON, @file.json, or - for stdin. */
export async function readBody(value) {
  if (value === undefined) return undefined;
  let text = value;
  if (value === '-') {
    const chunks = [];
    for await (const c of process.stdin) chunks.push(c);
    text = Buffer.concat(chunks).toString('utf8');
  } else if (value.startsWith('@')) {
    text = await fs.readFile(value.slice(1), 'utf8');
  }
  try {
    return JSON.parse(text);
  } catch (err) {
    throw new XApiError(`--body is not valid JSON: ${err.message}`, { code: 'invalid_params' });
  }
}

/** A numeric option commander already checked, or undefined when absent. */
const optionalNumber = (value) => (value === undefined ? undefined : Number(value));

function authSummary(op) {
  const parts = [];
  if (op.auth.oauth2User) parts.push(`OAuth 2.0 user (${op.auth.oauth2User.join(' ')})`);
  if (op.auth.oauth1User) parts.push('OAuth 1.0a user');
  if (op.auth.bearer) parts.push('app-only bearer');
  return parts.join(' | ') || 'none';
}

function fail(err, mode) {
  if (mode?.json) console.log(JSON.stringify({ error: err instanceof XApiError ? err.toJSON() : { message: err.message } }, null, 2));
  else {
    console.error(chalk.red(err.message));
    if (err.suggestions?.length) console.error(chalk.dim(`Did you mean: ${err.suggestions.join(', ')}`));
    if (err.rateLimit?.resetAt) console.error(chalk.dim(`Rate limit resets at ${err.rateLimit.resetAt}`));
  }
  process.exitCode = err.code === 'invalid_params' || err.code === 'unknown_operation' ? 2 : 1;
}

function redactHeaders(headers) {
  const out = { ...headers };
  if (out.authorization) out.authorization = `${out.authorization.split(' ')[0]} <redacted>`;
  return out;
}

function openInBrowser(url) {
  const cmd = process.platform === 'darwin' ? 'open' : process.platform === 'win32' ? 'cmd' : 'xdg-open';
  const args = process.platform === 'win32' ? ['/c', 'start', '""', url] : [url];
  try {
    const child = spawn(cmd, args, { stdio: 'ignore', detached: true });
    child.on('error', () => {});
    child.unref();
  } catch {
    // No browser launcher on this machine: the URL is already printed.
  }
}

/**
 * Wait for the OAuth redirect on a loopback address.
 * @returns {Promise<{code: string, state: string}>}
 */
function awaitCallback(redirectUri, timeoutMs) {
  const target = new URL(redirectUri);
  return new Promise((resolve, reject) => {
    const server = http.createServer((req, res) => {
      const url = new URL(req.url, redirectUri);
      if (url.pathname !== target.pathname) {
        res.statusCode = 404;
        return res.end('Not found');
      }
      const error = url.searchParams.get('error');
      const code = url.searchParams.get('code');
      res.setHeader('content-type', 'text/html; charset=utf-8');
      if (error || !code) {
        res.end(`<p>Authorization did not complete: ${String(error ?? 'no code').replace(/[<>&]/g, '')}. You can close this tab.</p>`);
        cleanup();
        return reject(new XApiError(`Authorization failed: ${error ?? 'no code returned'}`, { code: 'auth_required' }));
      }
      res.end('<p>XActions is authorized. You can close this tab and return to the terminal.</p>');
      cleanup();
      resolve({ code, state: url.searchParams.get('state') });
    });
    const timer = setTimeout(() => {
      cleanup();
      reject(new XApiError(`No authorization callback within ${Math.round(timeoutMs / 1000)}s`, { code: 'auth_required' }));
    }, timeoutMs);
    function cleanup() {
      clearTimeout(timer);
      server.close();
    }
    server.on('error', (err) => {
      clearTimeout(timer);
      reject(new XApiError(`Cannot listen on ${target.host} for the callback: ${err.message}`, { code: 'auth_required' }));
    });
    server.listen(Number(target.port || 80), target.hostname);
  });
}

/**
 * Register `xactions xapi` on the program.
 * @param {import('commander').Command} program
 */
export function registerXapiCommand(program) {
  const xapi = program
    .command('xapi')
    .description('Official X API v2: every endpoint, by operation id (needs your own developer keys)');

  xapi
    .command('tags')
    .description('API areas and how many operations each has')
    .option('-j, --json', 'Output as JSON')
    .action((options) => {
      const mode = resolveOutputMode(program, options);
      const tags = listTags();
      if (mode.compact) printCompact(tags, { fields: mode.fields });
      else if (mode.json) console.log(JSON.stringify(tags, null, 2));
      else {
        console.log(chalk.bold(`\nX API v2 spec ${SOURCE.version}: ${SOURCE.operations} operations\n`));
        for (const t of tags) console.log(`  ${t.tag.padEnd(20)} ${t.count}`);
        console.log();
      }
    });

  xapi
    .command('list [query...]')
    .description('Find operations by words in their id, path or area')
    .option('-t, --tag <tag>', 'Only this area, for example Posts or Users')
    .option('--writes', 'Only operations that change state')
    .option('--reads', 'Only read operations')
    .option('--streaming', 'Only streaming operations')
    .option('--auth <kind>', 'Only operations that accept bearer, oauth2 or oauth1')
    .option('-j, --json', 'Output as JSON')
    .action((query, options) => {
      const mode = resolveOutputMode(program, options);
      const ops = listOperations({
        query: query.join(' '),
        tag: options.tag,
        write: options.writes ? true : options.reads ? false : undefined,
        streaming: options.streaming ? true : undefined,
        auth: options.auth,
      });
      const rows = ops.map((op) => ({ id: op.id, method: op.method, path: op.path, tag: op.tag, auth: authSummary(op), docs: op.docsUrl }));
      if (mode.compact) printCompact(rows, { fields: mode.fields ?? ['id', 'method', 'path', 'tag'] });
      else if (mode.json) console.log(JSON.stringify(rows, null, 2));
      else {
        if (!rows.length) {
          console.log(chalk.yellow('No operation matches. Try fewer words, or `xactions xapi tags` for the areas.'));
          return;
        }
        for (const r of rows) console.log(`${chalk.cyan(r.id.padEnd(44))} ${r.method.padEnd(6)} ${r.path}`);
        console.log(chalk.dim(`\n${rows.length} operation(s). Details: xactions xapi describe <id>`));
      }
    });

  xapi
    .command('describe <operation>')
    .description('Params, body, auth, scopes, rate limits and the official reference page for one operation')
    .option('-j, --json', 'Output as JSON')
    .action((operation, options) => {
      const mode = resolveOutputMode(program, options);
      try {
        const op = describeOperation(operation);
        if (mode.json || mode.compact) {
          console.log(JSON.stringify(op, null, mode.compact ? 0 : 2));
          return;
        }
        console.log(chalk.bold(`\n${op.id}`), chalk.dim(`(${op.tag})`));
        console.log(`  ${op.method} ${op.path}${op.streaming ? chalk.magenta('  [stream]') : ''}${op.write ? chalk.yellow('  [write]') : ''}`);
        console.log(`  ${chalk.cyan('Auth:')} ${authSummary(op)}`);
        if (op.pagination) console.log(`  ${chalk.cyan('Pages:')} pass meta.next_token as ${op.pagination} (xapi call --all does this)`);
        if (op.rateLimits.length) {
          console.log(`  ${chalk.cyan('Limits:')} ${op.rateLimits.map((l) => `${l.requests}/${l.windowSeconds >= 3600 ? `${l.windowSeconds / 3600}h` : `${l.windowSeconds / 60}m`} per ${l.scope}`).join(', ')}`);
        }
        if (op.params.length) {
          console.log(chalk.cyan('  Params:'));
          for (const p of op.params) {
            const bits = [p.in, p.type === 'array' ? `list of ${p.items?.type ?? 'string'}` : p.type].filter(Boolean);
            if (p.minimum !== undefined || p.maximum !== undefined) bits.push(`${p.minimum ?? ''}..${p.maximum ?? ''}`);
            const allowed = p.enum ?? p.items?.enum;
            console.log(`    ${p.required ? chalk.bold(p.name) : p.name}${p.required ? chalk.red(' *') : ''} ${chalk.dim(bits.join(', '))}`);
            if (allowed) console.log(chalk.dim(`      ${allowed.join(', ')}`));
          }
        }
        if (op.body) {
          console.log(chalk.cyan(`  Body (${op.body.contentTypes.join(', ')})${op.body.required ? chalk.red(' *') : ''}:`));
          for (const prop of op.body.properties ?? []) {
            console.log(`    ${prop.required ? chalk.bold(prop.name) + chalk.red(' *') : prop.name} ${chalk.dim(prop.type ?? '')}${prop.enum ? chalk.dim(`  ${prop.enum.join(', ')}`) : ''}`);
          }
        }
        if (op.docsUrl) console.log(`  ${chalk.cyan('Docs:')} ${op.docsUrl}`);
        console.log();
      } catch (err) {
        fail(err, mode);
      }
    });

  xapi
    .command('call <operation> [params...]')
    .description('Call one operation. Params are key=value; repeat a key for a list')
    .option('-b, --body <json>', 'Request body: inline JSON, @file.json, or - for stdin')
    .option('--auth <kind>', 'Force bearer, oauth2 or oauth1 instead of the automatic choice')
    .option('--all', 'Follow next_token through every page')
    .option('--limit <n>', 'With --all: stop after this many items')
    .option('--max-pages <n>', 'With --all: stop after this many pages')
    .option('--dry-run', 'Print the request that would be sent and stop')
    .option('-y, --yes', 'Allow an operation that changes state (POST, PUT, PATCH, DELETE)')
    .option('-j, --json', 'Print the full response as JSON')
    .action(async (operation, pairs, options) => {
      const mode = resolveOutputMode(program, options);
      try {
        const params = parsePairs(pairs);
        const body = await readBody(options.body);
        const client = await clientFromStore();
        const preview = options.dryRun || !options.yes;
        const plan = client.build(operation, params, { body, auth: options.auth, requireAuth: !preview });
        if (options.dryRun || (plan.op.write && !options.yes)) {
          const shown = { operation: plan.op.id, method: plan.op.method, url: plan.url, auth: plan.auth ?? 'none configured', headers: redactHeaders(plan.headers), body: body instanceof FormData ? '<form data>' : body };
          console.log(JSON.stringify(shown, null, 2));
          if (!options.dryRun) {
            console.error(chalk.yellow(`${plan.op.id} changes state on X. Re-run with --yes to send it.`));
            process.exitCode = 1;
          }
          return;
        }
        if (plan.op.streaming) throw new XApiError(`${plan.op.id} is a stream. Use: xactions xapi stream ${plan.op.id}`, { code: 'invalid_params' });

        const result = options.all
          ? await client.collect(plan.op.id, params, { auth: options.auth, limit: optionalNumber(options.limit), maxPages: optionalNumber(options.maxPages) })
          : await client.call(plan.op.id, params, { body, auth: options.auth });

        if (mode.compact) {
          const rows = Array.isArray(result.data) ? result.data : result.data ? [result.data] : [];
          printCompact(rows, { fields: mode.fields });
        } else if (mode.json) {
          const { body: _raw, ...rest } = result;
          console.log(JSON.stringify(rest, null, 2));
        } else {
          console.log(JSON.stringify({ data: result.data, includes: result.includes, meta: result.meta, errors: result.errors }, null, 2));
          const rl = result.rateLimit;
          if (rl?.remaining !== null && rl?.remaining !== undefined) {
            console.error(chalk.dim(`rate limit: ${rl.remaining}/${rl.limit} left, resets ${rl.resetAt}${result.pages ? `; ${result.pages} page(s)` : ''}`));
          }
        }
      } catch (err) {
        fail(err, mode);
      }
    });

  xapi
    .command('stream <operation> [params...]')
    .description('Hold a streaming operation open and print one JSON message per line')
    .option('--limit <n>', 'Stop after this many messages')
    .option('--max-reconnects <n>', 'Give up after this many reconnects')
    .option('--auth <kind>', 'Force bearer, oauth2 or oauth1')
    .action(async (operation, pairs, options) => {
      const controller = new AbortController();
      const stop = () => controller.abort(new Error('interrupted'));
      process.once('SIGINT', stop);
      try {
        const client = await clientFromStore();
        const limit = optionalNumber(options.limit);
        let n = 0;
        for await (const message of client.stream(operation, parsePairs(pairs), {
          auth: options.auth,
          signal: controller.signal,
          maxReconnects: optionalNumber(options.maxReconnects),
          onEvent: (e) => process.stderr.write(chalk.dim(`[stream] ${e.type}${e.waitMs ? ` in ${e.waitMs}ms` : ''}${e.status ? ` ${e.status}` : ''}${e.error ? ` ${e.error}` : ''}\n`)),
        })) {
          process.stdout.write(`${JSON.stringify(message)}\n`);
          if (limit && ++n >= limit) break;
        }
      } catch (err) {
        fail(err);
      } finally {
        process.removeListener('SIGINT', stop);
      }
    });

  xapi
    .command('upload <file>')
    .description('Upload an image, GIF, video or subtitle file through the chunked v2 media endpoints')
    .option('--category <category>', 'tweet_image, tweet_gif, tweet_video, dm_image, dm_gif, dm_video, subtitles')
    .option('--type <mime>', 'Media type, when the file extension does not say')
    .option('--auth <kind>', 'oauth2 or oauth1')
    .option('-j, --json', 'Output as JSON')
    .action(async (file, options) => {
      const mode = resolveOutputMode(program, options);
      try {
        const mediaType = options.type ?? MIME[path.extname(file).toLowerCase()];
        if (!mediaType) throw new XApiError(`Cannot tell the media type of ${file}. Pass --type, for example --type image/png`, { code: 'invalid_params' });
        const bytes = await fs.readFile(file);
        const client = await clientFromStore();
        const result = await client.uploadMedia(bytes, { mediaType, mediaCategory: options.category, auth: options.auth });
        if (mode.json) console.log(JSON.stringify(result, null, 2));
        else console.log(`media_id=${result.mediaId}${result.mediaKey ? `\tmedia_key=${result.mediaKey}` : ''}`);
      } catch (err) {
        fail(err, mode);
      }
    });

  const auth = xapi.command('auth').description('Credentials for the official API');

  auth
    .command('status')
    .description('Which credentials are configured (never prints them)')
    .option('-j, --json', 'Output as JSON')
    .action(async (options) => {
      const client = await clientFromStore();
      const stored = await loadTokens();
      const status = {
        ...client.credentials(),
        oauth2Source: process.env.X_OAUTH2_ACCESS_TOKEN ? 'env' : stored ? tokenFilePath() : null,
        oauth2ExpiresAt: client.oauth2?.expiresAt ? new Date(client.oauth2.expiresAt).toISOString() : null,
        spec: SOURCE.version,
      };
      if (options.json) {
        console.log(JSON.stringify(status, null, 2));
        return;
      }
      const yes = (v) => (v ? chalk.green('yes') : chalk.dim('no'));
      console.log(`  app-only bearer   ${yes(status.bearer)}  ${chalk.dim('X_BEARER_TOKEN, or X_API_KEY + X_API_SECRET')}`);
      console.log(`  OAuth 1.0a user   ${yes(status.oauth1)}  ${chalk.dim('X_API_KEY, X_API_SECRET, X_ACCESS_TOKEN, X_ACCESS_TOKEN_SECRET')}`);
      console.log(`  OAuth 2.0 user    ${yes(status.oauth2)}  ${chalk.dim(status.oauth2Source ?? 'xactions xapi auth login')}`);
      if (status.oauth2) {
        console.log(`    scopes          ${status.oauth2Scopes?.join(' ') ?? chalk.dim('unknown (token from env)')}`);
        console.log(`    expires         ${status.oauth2ExpiresAt ?? chalk.dim('unknown')}  refreshable: ${yes(status.oauth2Refreshable)}`);
      }
      if (!status.bearer && !status.oauth1 && !status.oauth2) {
        console.log(chalk.yellow('\n  Nothing configured. Create an app at https://developer.x.com, then set X_BEARER_TOKEN for reads,'));
        console.log(chalk.yellow('  or run `xactions xapi auth login` for user-context calls.'));
      }
    });

  auth
    .command('login')
    .description('Authorize a user with OAuth 2.0 + PKCE and store the token')
    .option('--client-id <id>', 'OAuth 2.0 client ID (default X_CLIENT_ID)')
    .option('--scopes <list>', `Comma list, or "all" (default ${DEFAULT_SCOPES.join(',')})`)
    .option('--redirect <uri>', `Loopback callback registered on the app (default ${DEFAULT_REDIRECT})`)
    .option('--timeout <seconds>', 'How long to wait for the browser', '300')
    .option('--no-open', 'Print the URL without opening a browser')
    .action(async (options) => {
      try {
        const clientId = options.clientId ?? process.env.X_CLIENT_ID ?? process.env.TWITTER_CLIENT_ID;
        const clientSecret = process.env.X_CLIENT_SECRET ?? process.env.TWITTER_CLIENT_SECRET;
        if (!clientId) throw new XApiError('Pass --client-id or set X_CLIENT_ID (Keys and tokens > OAuth 2.0 Client ID in the developer console)', { code: 'auth_required' });
        const scopes = !options.scopes ? [...DEFAULT_SCOPES] : options.scopes === 'all' ? [...SCOPES] : options.scopes.split(',').map((s) => s.trim()).filter(Boolean);
        const redirectUri = options.redirect ?? DEFAULT_REDIRECT;
        const host = new URL(redirectUri).hostname;
        if (!['127.0.0.1', 'localhost', '[::1]'].includes(host)) throw new XApiError('--redirect must be a loopback address (127.0.0.1 or localhost) so this command can receive it', { code: 'invalid_params' });
        const pkce = createPkcePair();
        const state = createState();
        const url = buildAuthorizeUrl({ clientId, redirectUri, scopes, state, codeChallenge: pkce.challenge });
        console.log(`Open this URL to authorize (callback ${redirectUri} must be registered on the app):\n\n${url}\n`);
        if (options.open) openInBrowser(url);
        const callback = await awaitCallback(redirectUri, Number(options.timeout) * 1000);
        if (callback.state !== state) throw new XApiError('The callback state did not match. Start the login again.', { code: 'auth_required' });
        const token = await exchangeCode({ clientId, clientSecret, code: callback.code, redirectUri, codeVerifier: pkce.verifier });
        const file = await saveTokens({ ...token, clientId });
        console.log(chalk.green(`Authorized. Token saved to ${file} (scopes: ${token.scopes.join(' ') || scopes.join(' ')})`));
        if (!token.refreshToken) console.log(chalk.dim('No refresh token: add offline.access to --scopes to stay signed in past two hours.'));
      } catch (err) {
        fail(err);
      }
    });

  auth
    .command('logout')
    .description('Revoke the stored OAuth 2.0 token and delete it')
    .action(async () => {
      try {
        const stored = await loadTokens();
        if (!stored) {
          console.log('No stored OAuth 2.0 token.');
          return;
        }
        const clientId = stored.clientId ?? process.env.X_CLIENT_ID;
        if (clientId) {
          await revokeToken({ clientId, clientSecret: process.env.X_CLIENT_SECRET, token: stored.refreshToken ?? stored.accessToken, tokenTypeHint: stored.refreshToken ? 'refresh_token' : 'access_token' }).catch((err) => {
            console.error(chalk.yellow(`Revocation failed (${err.message}); deleting the local copy anyway.`));
          });
        }
        await clearTokens();
        console.log('Signed out of the X API.');
      } catch (err) {
        fail(err);
      }
    });
}
