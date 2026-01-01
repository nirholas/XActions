const express = require('express');
const axios = require('axios');
const { PrismaClient } = require('@prisma/client');
const { authMiddleware } = require('../middleware/auth');
const crypto = require('crypto');

const router = express.Router();
const prisma = new PrismaClient();

// Twitter OAuth 2.0 configuration
const TWITTER_CLIENT_ID = process.env.TWITTER_CLIENT_ID;
const TWITTER_CLIENT_SECRET = process.env.TWITTER_CLIENT_SECRET;
const CALLBACK_URL = `${process.env.API_URL}/api/twitter/callback`;

// Initiate Twitter OAuth
router.get('/connect', authMiddleware, (req, res) => {
  const state = crypto.randomBytes(16).toString('hex');
  const codeVerifier = crypto.randomBytes(32).toString('base64url');
  const codeChallenge = crypto
    .createHash('sha256')
    .update(codeVerifier)
    .digest('base64url');

  // Store state and code verifier in session/database
  req.session = req.session || {};
  req.session.oauthState = state;
  req.session.codeVerifier = codeVerifier;
  req.session.userId = req.user.id;

  const authUrl = new URL('https://twitter.com/i/oauth2/authorize');
  authUrl.searchParams.append('response_type', 'code');
  authUrl.searchParams.append('client_id', TWITTER_CLIENT_ID);
  authUrl.searchParams.append('redirect_uri', CALLBACK_URL);
  authUrl.searchParams.append('scope', 'tweet.read users.read follows.read follows.write offline.access');
  authUrl.searchParams.append('state', state);
  authUrl.searchParams.append('code_challenge', codeChallenge);
  authUrl.searchParams.append('code_challenge_method', 'S256');

  res.json({ authUrl: authUrl.toString(), state });
});

// OAuth callback
router.get('/callback', async (req, res) => {
  try {
    const { code, state } = req.query;

    // Verify state (in production, check against stored session)
    if (!code || !state) {
      return res.status(400).json({ error: 'Missing code or state' });
    }

    // Exchange code for access token
    const tokenResponse = await axios.post(
      'https://api.twitter.com/2/oauth2/token',
      new URLSearchParams({
        code,
        grant_type: 'authorization_code',
        client_id: TWITTER_CLIENT_ID,
        redirect_uri: CALLBACK_URL,
        code_verifier: req.session?.codeVerifier || 'dummy_verifier' // Should be from session
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

    const { access_token, refresh_token, expires_in } = tokenResponse.data;

    // Get user info from Twitter
    const userResponse = await axios.get('https://api.twitter.com/2/users/me', {
      headers: {
        Authorization: `Bearer ${access_token}`
      }
    });

    const twitterUser = userResponse.data.data;

    // Update user in database
    await prisma.user.update({
      where: { id: req.session?.userId || req.query.userId }, // Should be from session
      data: {
        twitterId: twitterUser.id,
        twitterUsername: twitterUser.username,
        twitterAccessToken: access_token,
        twitterRefreshToken: refresh_token,
        twitterTokenExpiry: new Date(Date.now() + expires_in * 1000)
      }
    });

    // Redirect to dashboard
    res.redirect(`${process.env.FRONTEND_URL}/dashboard?twitter_connected=true`);
  } catch (error) {
    console.error('Twitter OAuth callback error:', error.response?.data || error);
    res.redirect(`${process.env.FRONTEND_URL}/dashboard?error=twitter_connection_failed`);
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
    console.error('Twitter disconnect error:', error);
    res.status(500).json({ error: 'Failed to disconnect Twitter account' });
  }
});

// Refresh Twitter token
async function refreshTwitterToken(user) {
  try {
    const response = await axios.post(
      'https://api.twitter.com/2/oauth2/token',
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
    console.error('Token refresh error:', error);
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
    baseURL: 'https://api.twitter.com/2',
    headers: {
      Authorization: `Bearer ${accessToken}`
    }
  });
}

module.exports = router;
module.exports.getTwitterClient = getTwitterClient;
