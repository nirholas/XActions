// Copyright (c) 2024-2026 nich (@nichxbt). Licensed under the Apache License, Version 2.0.
import express from 'express';
import axios from 'axios';
import jwt from 'jsonwebtoken';
import { prisma } from '../../src/utils/prisma.js';
import { authMiddleware, requireAdmin } from '../middleware/auth.js';
import crypto from 'crypto';
import { requireJwtSecret } from '../utils/secrets.js';
import { signSessionToken } from '../utils/sessionToken.js';

const router = express.Router();

// Twitter OAuth 2.0 configuration
const TWITTER_CLIENT_ID = process.env.TWITTER_CLIENT_ID;
const TWITTER_CLIENT_SECRET = process.env.TWITTER_CLIENT_SECRET;

// Every call to X gives up after this long instead of holding the request open.
const X_API_TIMEOUT_MS = 30_000;

// Derive base URL — works on Vercel (VERCEL_URL), Railway (API_URL), or localhost
function getBaseUrl() {
  if (process.env.API_URL) return process.env.API_URL.trim().replace(/\/$/, '');
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL.trim()}`;
  return 'http://localhost:3001';
}

function getFrontendUrl() {
  if (process.env.FRONTEND_URL) return process.env.FRONTEND_URL.trim().replace(/\/$/, '');
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL.trim()}`;
  return 'http://localhost:3000';
}

// OAuth state.
//
// The `state` parameter is a short-lived JWT typed `oauth_state`, so it can
// never pass for a session token, and it carries no secret: the PKCE verifier
// stays out of the URL (and out of X's logs and the Referer header). The
// verifier goes to the initiating browser in an httpOnly, SameSite=Lax cookie
// scoped to the callback, and the state holds its S256 challenge. The callback
// accepts a state only from the browser holding the matching verifier, so a
// callback URL (or authorize URL) handed to someone else cannot log them in as
// another account or link their X account to someone else's. Nothing is kept
// in server memory, so this works across serverless and replicated instances.
const OAUTH_STATE_TYP = 'oauth_state';
const OAUTH_COOKIE = 'xactions_oauth';
const OAUTH_COOKIE_PATH = '/api/twitter/callback';
const OAUTH_TTL_MS = 10 * 60 * 1000;

function challengeOf(codeVerifier) {
  return crypto.createHash('sha256').update(codeVerifier).digest('base64url');
}

/**
 * Start an OAuth flow: set the verifier cookie on this response and return the
 * signed state and the challenge to send to X.
 */
function beginOAuth(res, data) {
  const codeVerifier = crypto.randomBytes(32).toString('base64url');
  const codeChallenge = challengeOf(codeVerifier);
  res.cookie(OAUTH_COOKIE, codeVerifier, {
    httpOnly: true,
    sameSite: 'lax',
    secure: getBaseUrl().startsWith('https:'),
    path: OAUTH_COOKIE_PATH,
    maxAge: OAUTH_TTL_MS,
  });
  const state = jwt.sign({ ...data, typ: OAUTH_STATE_TYP, cc: codeChallenge }, requireJwtSecret(), {
    expiresIn: OAUTH_TTL_MS / 1000,
  });
  return { state, codeChallenge };
}

function readCookie(req, name) {
  for (const part of String(req.headers.cookie || '').split(';')) {
    const eq = part.indexOf('=');
    if (eq !== -1 && part.slice(0, eq).trim() === name) {
      try {
        return decodeURIComponent(part.slice(eq + 1).trim());
      } catch {
        return null;
      }
    }
  }
  return null;
}

/**
 * The flow a callback belongs to and the verifier to redeem its code with, or
 * null when the state is forged, expired, of another type, or was started in a
 * different browser.
 */
function parseOAuthState(req, state) {
  let data;
  try {
    data = jwt.verify(String(state), requireJwtSecret());
  } catch {
    return null;
  }
  if (data?.typ !== OAUTH_STATE_TYP || typeof data.cc !== 'string') return null;
  const codeVerifier = readCookie(req, OAUTH_COOKIE);
  if (!codeVerifier) return null;
  const expected = Buffer.from(data.cc);
  const actual = Buffer.from(challengeOf(codeVerifier));
  if (expected.length !== actual.length || !crypto.timingSafeEqual(expected, actual)) return null;
  return { ...data, codeVerifier };
}

// Build Twitter OAuth URL
function buildOAuthUrl(state, codeChallenge) {
  const callbackUrl = `${getBaseUrl()}/api/twitter/callback`;
  const authUrl = new URL('https://x.com/i/oauth2/authorize');
  authUrl.searchParams.append('response_type', 'code');
  authUrl.searchParams.append('client_id', TWITTER_CLIENT_ID);
  authUrl.searchParams.append('redirect_uri', callbackUrl);
  authUrl.searchParams.append('scope', 'tweet.read users.read follows.read follows.write offline.access');
  authUrl.searchParams.append('state', state);
  authUrl.searchParams.append('code_challenge', codeChallenge);
  authUrl.searchParams.append('code_challenge_method', 'S256');
  return authUrl.toString();
}

// Exchange OAuth code for Twitter tokens and user info
async function exchangeCodeForUser(code, codeVerifier) {
  const callbackUrl = `${getBaseUrl()}/api/twitter/callback`;
  const tokenResponse = await axios.post(
    'https://api.x.com/2/oauth2/token',
    new URLSearchParams({
      code,
      grant_type: 'authorization_code',
      client_id: TWITTER_CLIENT_ID,
      redirect_uri: callbackUrl,
      code_verifier: codeVerifier
    }),
    {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      auth: { username: TWITTER_CLIENT_ID, password: TWITTER_CLIENT_SECRET },
      timeout: X_API_TIMEOUT_MS
    }
  );

  const { access_token, refresh_token, expires_in } = tokenResponse.data;

  const userResponse = await axios.get('https://api.x.com/2/users/me', {
    headers: { Authorization: `Bearer ${access_token}` },
    timeout: X_API_TIMEOUT_MS
  });

  return {
    twitterUser: userResponse.data.data,
    tokens: { access_token, refresh_token, expires_in }
  };
}

// GET /api/twitter/status
// Documented in api/openapi.js and, until now, never served. Reports whether
// this instance holds a usable X session and which account it belongs to,
// without exposing the cookie itself.
// The X sessions are the operator's, so only an admin may see which accounts
// they belong to.
router.get('/status', authMiddleware, requireAdmin, async (req, res) => {
  try {
    const { getActiveSession, listSessions } = await import('../../src/client/auth/storage.js');
    const [active, sessions] = await Promise.all([getActiveSession(), listSessions()]);
    res.json({
      connected: Boolean(active?.username),
      username: active?.username || null,
      savedSessions: Array.isArray(sessions) ? sessions.map((s) => s.username || s).filter(Boolean) : [],
      oauthConfigured: Boolean(process.env.TWITTER_CLIENT_ID && process.env.TWITTER_CLIENT_SECRET),
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// The login page's own nonce, echoed back with the token so the page can tell
// a token it asked for from one planted in its URL by someone else.
const LOGIN_NONCE = /^[A-Za-z0-9_-]{16,128}$/;

// Sign in with X — no auth required, redirects to Twitter OAuth
router.get('/login', (req, res) => {
  const nonce = typeof req.query.nonce === 'string' ? req.query.nonce : '';
  if (!LOGIN_NONCE.test(nonce)) {
    return res.redirect(`${getFrontendUrl()}/login?error=invalid_state`);
  }
  const { state, codeChallenge } = beginOAuth(res, { flow: 'login', nonce });
  res.redirect(buildOAuthUrl(state, codeChallenge));
});

// Connect X to existing account — requires auth. The verifier cookie is set on
// this response, so the browser that asked is the only one that can finish.
router.get('/connect', authMiddleware, (req, res) => {
  const { state, codeChallenge } = beginOAuth(res, { flow: 'connect', userId: req.user.id });
  res.json({ authUrl: buildOAuthUrl(state, codeChallenge), state });
});

// OAuth callback — handles both login and connect flows
router.get('/callback', async (req, res) => {
  const FRONTEND_URL = getFrontendUrl();
  try {
    const { code, state } = req.query;

    if (!code || !state) {
      return res.redirect(`${FRONTEND_URL}/login?error=missing_params`);
    }

    // Signed state, bound to this browser by the verifier cookie
    const oauthData = parseOAuthState(req, state);
    res.clearCookie(OAUTH_COOKIE, { path: OAUTH_COOKIE_PATH });
    if (!oauthData || (oauthData.flow === 'login' && !LOGIN_NONCE.test(String(oauthData.nonce || '')))) {
      return res.redirect(`${FRONTEND_URL}/login?error=invalid_state`);
    }

    const { twitterUser, tokens } = await exchangeCodeForUser(code, oauthData.codeVerifier);
    const { access_token, refresh_token, expires_in } = tokens;

    const twitterData = {
      twitterId: twitterUser.id,
      twitterUsername: twitterUser.username,
      twitterAccessToken: access_token,
      twitterRefreshToken: refresh_token,
      twitterTokenExpiry: new Date(Date.now() + expires_in * 1000),
      authMethod: 'oauth'
    };

    // --- Login/Signup flow ---
    if (oauthData.flow === 'login') {
      let user = await prisma.user.findUnique({ where: { twitterId: twitterUser.id } });

      if (user) {
        user = await prisma.user.update({
          where: { id: user.id },
          data: twitterData
        });
      } else {
        let username = twitterUser.username;
        const existingUsername = await prisma.user.findUnique({ where: { username } });
        if (existingUsername) {
          username = `${twitterUser.username}_${crypto.randomBytes(3).toString('hex')}`;
        }

        user = await prisma.user.create({
          data: {
            username,
            credits: 0,
            ...twitterData,
            subscription: {
              create: {
                tier: 'free',
                status: 'active',
                startDate: new Date()
              }
            }
          }
        });
      }

      const token = signSessionToken(user);

      res.redirect(`${FRONTEND_URL}/login?oauth=success#token=${token}&nonce=${oauthData.nonce}`);
      return;
    }

    // --- Connect flow (existing authenticated user) ---
    if (oauthData.flow === 'connect' && oauthData.userId) {
      await prisma.user.update({
        where: { id: oauthData.userId },
        data: twitterData
      });

      res.redirect(`${FRONTEND_URL}/dashboard?twitter_connected=true`);
      return;
    }

    res.redirect(`${FRONTEND_URL}/login?error=invalid_flow`);
  } catch (error) {
    console.error('❌ Twitter OAuth callback error:', error.response?.data || error.message);
    res.redirect(`${getFrontendUrl()}/login?error=twitter_connection_failed`);
  }
});

// Disconnect Twitter
router.post('/disconnect', authMiddleware, async (req, res) => {
  try {
    await prisma.user.update({
      where: { id: req.user.id },
      data: {
        twitterId: null,
        twitterUsername: null,
        twitterAccessToken: null,
        twitterRefreshToken: null,
        twitterTokenExpiry: null
      }
    });

    res.json({ message: 'Twitter account disconnected' });
  } catch (error) {
    console.error('❌ Twitter disconnect error:', error.message);
    res.status(500).json({ error: 'Failed to disconnect Twitter account' });
  }
});

// Refresh Twitter token
async function refreshTwitterToken(user) {
  try {
    const response = await axios.post(
      'https://api.x.com/2/oauth2/token',
      new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: user.twitterRefreshToken,
        client_id: TWITTER_CLIENT_ID
      }),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        auth: {
          username: TWITTER_CLIENT_ID,
          password: TWITTER_CLIENT_SECRET
        },
        timeout: X_API_TIMEOUT_MS
      }
    );

    const { access_token, refresh_token, expires_in } = response.data;

    await prisma.user.update({
      where: { id: user.id },
      data: {
        twitterAccessToken: access_token,
        twitterRefreshToken: refresh_token,
        twitterTokenExpiry: new Date(Date.now() + expires_in * 1000)
      }
    });

    return access_token;
  } catch (error) {
    console.error('❌ Token refresh error:', error.message);
    throw new Error('Failed to refresh Twitter token', { cause: error });
  }
}

// Get Twitter API client with auto-refresh
async function getTwitterClient(user) {
  let accessToken = user.twitterAccessToken;

  // Check if token needs refresh
  if (user.twitterTokenExpiry && new Date() >= user.twitterTokenExpiry) {
    accessToken = await refreshTwitterToken(user);
  }

  return axios.create({
    baseURL: 'https://api.x.com/2',
    timeout: X_API_TIMEOUT_MS,
    headers: {
      Authorization: `Bearer ${accessToken}`
    }
  });
}

export default router;
export { getTwitterClient };
