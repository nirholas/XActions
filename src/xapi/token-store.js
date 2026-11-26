// Copyright (c) 2024-2026 nich (@nichxbt). Licensed under the Apache License, Version 2.0.
/**
 * Where `xactions xapi auth login` keeps the OAuth 2.0 user token between
 * runs: `$XACTIONS_HOME/xapi-oauth2.json` (default `~/.xactions`), written
 * with mode 0600 so only the owner can read it. A refreshed token replaces
 * the stored one, so a refresh token that X rotates is never lost.
 *
 * Environment variables always win over the file: a client built by
 * `clientFromStore()` uses X_OAUTH2_ACCESS_TOKEN when it is set.
 *
 * @module xactions/xapi/token-store
 */

import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { XApiClient } from './client.js';

/** Absolute path of the token file, resolved per call so XACTIONS_HOME set later is honoured. */
export function tokenFilePath(env = process.env) {
  return path.join(env.XACTIONS_HOME || path.join(os.homedir(), '.xactions'), 'xapi-oauth2.json');
}

/**
 * @returns {Promise<{accessToken: string, refreshToken: string|null, expiresAt: number|null, scopes: string[], clientId?: string, savedAt?: string}|null>}
 */
export async function loadTokens(env = process.env) {
  try {
    const json = JSON.parse(await fs.readFile(tokenFilePath(env), 'utf8'));
    return json?.accessToken ? json : null;
  } catch (err) {
    if (err.code === 'ENOENT') return null;
    throw err;
  }
}

/** Persist a token. The client secret is never written. */
export async function saveTokens(token, env = process.env) {
  const file = tokenFilePath(env);
  await fs.mkdir(path.dirname(file), { recursive: true, mode: 0o700 });
  const { clientSecret: _omit, ...rest } = token;
  const tmp = `${file}.${process.pid}.tmp`;
  await fs.writeFile(tmp, JSON.stringify({ ...rest, savedAt: new Date().toISOString() }, null, 2), { mode: 0o600 });
  await fs.rename(tmp, file);
  await fs.chmod(file, 0o600);
  return file;
}

export async function clearTokens(env = process.env) {
  try {
    await fs.unlink(tokenFilePath(env));
    return true;
  } catch (err) {
    if (err.code === 'ENOENT') return false;
    throw err;
  }
}

/**
 * A client from the environment, topped up with the stored OAuth 2.0 token
 * when the environment has none. Refreshed tokens are written back.
 */
export async function clientFromStore(env = process.env, extra = {}) {
  const client = XApiClient.fromEnv(env, extra);
  if (!client.oauth2) {
    const stored = await loadTokens(env);
    if (stored) {
      client.oauth2 = {
        ...stored,
        clientId: stored.clientId ?? env.X_CLIENT_ID ?? env.TWITTER_CLIENT_ID,
        clientSecret: env.X_CLIENT_SECRET ?? env.TWITTER_CLIENT_SECRET,
      };
      const previous = client.onTokenRefresh;
      client.onTokenRefresh = async (token) => {
        await saveTokens(token, env);
        if (previous) await previous(token);
      };
    }
  }
  return client;
}
