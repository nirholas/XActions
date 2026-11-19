// Copyright (c) 2024-2026 nich (@nichxbt). Licensed under the Apache License, Version 2.0.
/**
 * Session tokens: the bearer JWTs the API issues on login and accepts on every
 * authenticated request.
 *
 * Every JWT the API signs uses the same JWT_SECRET, so a signature alone does
 * not say what a token is for. The OAuth state value once carried `userId` and
 * was accepted as a session bearer token, and /api/auth/refresh swapped it for
 * a seven-day session. Session tokens now carry `typ: 'session'` and nothing
 * else is accepted where a session is expected.
 *
 * Tokens issued before `typ` existed are accepted for a transition while they
 * live out their seven days, but only when they look like a session: a userId
 * and none of the fields an OAuth state carried (`flow`, `codeVerifier`). No
 * other untyped token was ever signed with JWT_SECRET, and nothing issues an
 * untyped token now, so the legacy branch closes itself within a week.
 *
 * @author nich (@nichxbt)
 * @license Apache-2.0
 */

import jwt from 'jsonwebtoken';
import { requireJwtSecret } from './secrets.js';

export const SESSION_TYP = 'session';
const SESSION_TTL = '7d';

/** Whether decoded JWT claims describe a session (typed, or legacy untyped). */
export function isSessionClaims(claims) {
  if (!claims || typeof claims !== 'object' || typeof claims.userId !== 'string' || !claims.userId) return false;
  if (claims.typ === SESSION_TYP) return true;
  return claims.typ === undefined && claims.flow === undefined && claims.codeVerifier === undefined;
}

/**
 * Sign a seven-day session token for a user.
 * @param {{ id: string, username?: string }} user
 */
export function signSessionToken(user) {
  return jwt.sign({ userId: user.id, username: user.username, typ: SESSION_TYP }, requireJwtSecret(), {
    expiresIn: SESSION_TTL,
  });
}

/**
 * Verify a session token and return its claims.
 * Throws a JsonWebTokenError for a token of any other type.
 *
 * @param {string} token
 * @param {{ ignoreExpiration?: boolean }} [options]
 */
export function verifySessionToken(token, options = {}) {
  const claims = jwt.verify(token, requireJwtSecret(), { ignoreExpiration: Boolean(options.ignoreExpiration) });
  if (!isSessionClaims(claims)) throw new jwt.JsonWebTokenError('not a session token');
  return claims;
}
