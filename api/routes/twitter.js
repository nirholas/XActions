import express from 'express';
import axios from 'axios';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';
import { authMiddleware } from '../middleware/auth.js';
import crypto from 'crypto';

const router = express.Router();
const prisma = new PrismaClient();

// Twitter OAuth 2.0 configuration
const TWITTER_CLIENT_ID = process.env.TWITTER_CLIENT_ID;
const TWITTER_CLIENT_SECRET = process.env.TWITTER_CLIENT_SECRET;
const CALLBACK_URL = `${process.env.API_URL}/api/twitter/callback`;

// In-memory OAuth state store (state -> { codeVerifier, flow, userId?, expiresAt })
// Entries auto-expire after 10 minutes
const oauthStateStore = new Map();

function storeOAuthState(state, data) {
  oauthStateStore.set(state, { ...data, expiresAt: Date.now() + 10 * 60 * 1000 });
  // Cleanup expired entries
  for (const [key, value] of oauthStateStore) {
    if (value.expiresAt < Date.now()) oauthStateStore.delete(key);
  }
}

function consumeOAuthState(state) {
  const data = oauthStateStore.get(state);
  if (!data) return null;
  if (data.expiresAt < Date.now()) {
    oauthStateStore.delete(state);
    return null;
  }
  oauthStateStore.delete(state); // Single use — prevents replay
  return data;
}

// Build Twitter OAuth URL
function buildOAuthUrl(state, codeChallenge) {
  const authUrl = new URL('https://x.com/i/oauth2/authorize');
  authUrl.searchParams.append('response_type', 'code');
  authUrl.searchParams.append('client_id', TWITTER_CLIENT_ID);
  authUrl.searchParams.append('redirect_uri', CALLBACK_URL);
  authUrl.searchParams.append('scope', 'tweet.read users.read follows.read follows.write offline.access');
  authUrl.searchParams.append('state', state);
  authUrl.searchParams.append('code_challenge', codeChallenge);
  authUrl.searchParams.append('code_challenge_method', 'S256');
  return authUrl.toString();
}

// Exchange OAuth code for Twitter tokens and user info
async function exchangeCodeForUser(code, codeVerifier) {
  const tokenResponse = await axios.post(
    'https://api.x.com/2/oauth2/token',
    new URLSearchParams({
      code,
      grant_type: 'authorization_code',
      client_id: TWITTER_CLIENT_ID,
      redirect_uri: CALLBACK_URL,
      code_verifier: codeVerifier
    }),
    {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      auth: { username: TWITTER_CLIENT_ID, password: TWITTER_CLIENT_SECRET }
    }
  );

  const { access_token, refresh_token, expires_in } = tokenResponse.data;

  const userResponse = await axios.get('https://api.x.com/2/users/me', {
    headers: { Authorization: `Bearer ${access_token}` }
  });

  return {
    twitterUser: userResponse.data.data,
    tokens: { access_token, refresh_token, expires_in }
  };
}

// Sign in with X — no auth required, redirects to Twitter OAuth
router.get('/login', (req, res) => {
  const state = crypto.randomBytes(16).toString('hex');
  const codeVerifier = crypto.randomBytes(32).toString('base64url');
  const codeChallenge = crypto.createHash('sha256').update(codeVerifier).digest('base64url');

  storeOAuthState(state, { codeVerifier, flow: 'login' });

  res.redirect(buildOAuthUrl(state, codeChallenge));
});

// Connect X to existing account — requires auth
router.get('/connect', authMiddleware, (req, res) => {
  const state = crypto.randomBytes(16).toString('hex');
  const codeVerifier = crypto.randomBytes(32).toString('base64url');
  const codeChallenge = crypto.createHash('sha256').update(codeVerifier).digest('base64url');

  storeOAuthState(state, { codeVerifier, flow: 'connect', userId: req.user.id });

  res.json({ authUrl: buildOAuthUrl(state, codeChallenge), state });
});

// OAuth callback — handles both login and connect flows
router.get('/callback', async (req, res) => {
  try {
    const { code, state } = req.query;

    if (!code || !state) {
      return res.redirect(`${process.env.FRONTEND_URL}/login?error=missing_params`);
    }

    // Verify state and get stored data (single-use, prevents replay)
    const oauthData = consumeOAuthState(state);
    if (!oauthData) {
      return res.redirect(`${process.env.FRONTEND_URL}/login?error=invalid_state`);
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
      // Check if user already exists with this Twitter ID
      let user = await prisma.user.findUnique({ where: { twitterId: twitterUser.id } });

      if (user) {
        // Returning user — update tokens
        user = await prisma.user.update({
          where: { id: user.id },
          data: twitterData
        });
      } else {
        // New user — auto-register with Twitter username
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

      // Issue JWT and redirect to dashboard with token in URL fragment (not query param)
      const token = jwt.sign(
        { userId: user.id, username: user.username },
        process.env.JWT_SECRET,
        { expiresIn: '7d' }
      );

      // Use hash fragment so token isn't sent to server in subsequent requests or logged
      res.redirect(`${process.env.FRONTEND_URL}/login?oauth=success#token=${token}`);
      return;
    }

    // --- Connect flow (existing authenticated user) ---
    if (oauthData.flow === 'connect' && oauthData.userId) {
      await prisma.user.update({
        where: { id: oauthData.userId },
        data: twitterData
      });

      res.redirect(`${process.env.FRONTEND_URL}/dashboard?twitter_connected=true`);
      return;
    }

    res.redirect(`${process.env.FRONTEND_URL}/login?error=invalid_flow`);
  } catch (error) {
    console.error('❌ Twitter OAuth callback error:', error.response?.data || error.message);
    res.redirect(`${process.env.FRONTEND_URL}/login?error=twitter_connection_failed`);
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
        }
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
    throw new Error('Failed to refresh Twitter token');
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
    headers: {
      Authorization: `Bearer ${accessToken}`
    }
  });
}

export default router;
export { getTwitterClient };
