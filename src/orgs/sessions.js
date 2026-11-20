// Copyright (c) 2024-2026 nich (@nichxbt). Licensed under the Apache License, Version 2.0.
/**
 * Session storage for each account an organization connects.
 *
 * Each account's cookie jar lives in its own file, `sessions/<handle>.json`,
 * readable by the owner only. When `XACTIONS_ORG_KEY` is set, the jar is
 * encrypted with AES-256-GCM under a key derived from that passphrase with
 * scrypt and a per-file salt, so a copied org directory is not a copied set
 * of logins. A file written encrypted refuses to load without the key rather
 * than falling back to anything.
 *
 * There is deliberately no proxy field. Accounts in an organization belong
 * together in public; nothing here exists to make them look unrelated.
 *
 * @author nich (@nichxbt)
 * @license Apache-2.0
 */

import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'node:crypto';
import { chmodSync, existsSync, mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';

/** Environment variable holding the passphrase that encrypts session files. */
export const KEY_ENV = 'XACTIONS_ORG_KEY';

function deriveKey(passphrase, salt) {
  return scryptSync(passphrase, salt, 32);
}

/**
 * Encrypt a cookie jar for storage.
 * @param {Array<{name: string, value: string}>} cookies
 * @param {string} passphrase
 * @returns {object}
 */
export function sealSession(cookies, passphrase) {
  const salt = randomBytes(16);
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', deriveKey(passphrase, salt), iv);
  const data = Buffer.concat([cipher.update(JSON.stringify(cookies), 'utf8'), cipher.final()]);
  return {
    version: 1,
    encryption: 'aes-256-gcm/scrypt',
    salt: salt.toString('base64'),
    iv: iv.toString('base64'),
    tag: cipher.getAuthTag().toString('base64'),
    data: data.toString('base64'),
  };
}

/**
 * Decrypt a sealed jar.
 * @param {object} sealed
 * @param {string} passphrase
 * @returns {Array<{name: string, value: string}>}
 */
export function openSession(sealed, passphrase) {
  const decipher = createDecipheriv(
    'aes-256-gcm',
    deriveKey(passphrase, Buffer.from(sealed.salt, 'base64')),
    Buffer.from(sealed.iv, 'base64'),
  );
  decipher.setAuthTag(Buffer.from(sealed.tag, 'base64'));
  try {
    const plain = Buffer.concat([decipher.update(Buffer.from(sealed.data, 'base64')), decipher.final()]);
    return JSON.parse(plain.toString('utf8'));
  } catch {
    throw new Error(`Could not decrypt the session: ${KEY_ENV} is not the passphrase it was saved with.`);
  }
}

/**
 * Keep only cookies that matter for x.com and drop empty ones.
 * @param {Array<{name: string, value: string, domain?: string}>} cookies
 * @returns {Array<{name: string, value: string, domain?: string}>}
 */
export function cleanJar(cookies) {
  if (!Array.isArray(cookies)) throw new Error('A session must be an array of cookies');
  const jar = cookies.filter((c) => c && c.name && c.value && (!c.domain || /(^|\.)(x|twitter)\.com$/.test(c.domain.replace(/^\./, ''))));
  if (!jar.some((c) => c.name === 'auth_token')) throw new Error('The cookies have no auth_token, so they are not a logged-in x.com session.');
  if (!jar.some((c) => c.name === 'ct0')) throw new Error('The cookies have an auth_token but no ct0; X needs both before it accepts a write. Export the full cookie jar.');
  return jar;
}

/**
 * Write a jar to `file`, encrypted when the key is set.
 * @param {string} file
 * @param {Array<{name: string, value: string}>} cookies
 * @param {{env?: NodeJS.ProcessEnv}} [options]
 * @returns {{encrypted: boolean}}
 */
export function writeSession(file, cookies, { env = process.env } = {}) {
  const jar = cleanJar(cookies);
  const passphrase = env[KEY_ENV];
  const body = passphrase ? sealSession(jar, passphrase) : { version: 1, encryption: 'none', cookies: jar };
  mkdirSync(dirname(file), { recursive: true, mode: 0o700 });
  const tmp = `${file}.${process.pid}.${Date.now()}.tmp`;
  writeFileSync(tmp, JSON.stringify(body, null, 2) + '\n', { encoding: 'utf8', mode: 0o600 });
  renameSync(tmp, file);
  chmodSync(file, 0o600);
  return { encrypted: Boolean(passphrase) };
}

/**
 * Read a jar back.
 * @param {string} file
 * @param {{env?: NodeJS.ProcessEnv}} [options]
 * @returns {Array<{name: string, value: string}>}
 */
export function readSession(file, { env = process.env } = {}) {
  if (!existsSync(file)) throw new Error(`No saved session at ${file}. Connect the account with \`xactions org account add\`.`);
  const body = JSON.parse(readFileSync(file, 'utf8'));
  if (body.encryption === 'none') return body.cookies;
  if (body.encryption === 'aes-256-gcm/scrypt') {
    const passphrase = env[KEY_ENV];
    if (!passphrase) throw new Error(`The session at ${file} is encrypted. Set ${KEY_ENV} to the passphrase it was saved with.`);
    return openSession(body, passphrase);
  }
  throw new Error(`Unrecognised session format in ${file}`);
}

/**
 * Whether the session file at `file` is encrypted, without decrypting it.
 * @param {string} file
 * @returns {boolean|null} null when there is no file
 */
export function isSessionEncrypted(file) {
  if (!existsSync(file)) return null;
  return JSON.parse(readFileSync(file, 'utf8')).encryption !== 'none';
}

/** @param {string} file */
export function deleteSession(file) {
  rmSync(file, { force: true });
}
