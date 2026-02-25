/**
 * XActions Apify/Phantombuster Export Compatibility
 * Import/export adapters for migrating data between tools.
 *
 * Kills: Lock-in for Apify and Phantombuster users
 *
 * @author nich (@nichxbt) - https://github.com/nirholas
 * @license MIT
 */

import fsp from 'fs/promises';
import path from 'path';

// ============================================================================
// Apify Adapter
// ============================================================================

/**
 * Apify field mappings:
 * Profile: profileUrl, fullName, biography, followersCount, followingCount, tweetsCount, isVerified, joinDate, location, website
 * Tweet: tweetUrl, tweetText, retweetCount, likeCount, replyCount, quoteCount, viewCount, createdAt
 * Followers: userName, fullName, followsYou, followedByYou, followersCount, followingCount
 */

export function importApifyDataset(data) {
  const items = Array.isArray(data) ? data : (typeof data === 'string' ? JSON.parse(data) : []);
  if (items.length === 0) return { type: 'unknown', items: [], fieldMapping: {}, unmappedFields: [] };

  const sample = items[0];
  const fields = Object.keys(sample);

  // Auto-detect type
  let type = 'unknown';
  let mapping = {};

  if (fields.includes('profileUrl') || fields.includes('biography') || fields.includes('fullName') && fields.includes('followersCount')) {
    type = 'profile';
    mapping = {
      profileUrl: 'url', fullName: 'displayName', biography: 'bio', followersCount: 'followersCount',
      followingCount: 'followingCount', tweetsCount: 'tweetCount', isVerified: 'verified',
      joinDate: 'joinDate', location: 'location', website: 'website', userName: 'username',
    };
  } else if (fields.includes('tweetUrl') || fields.includes('tweetText')) {
    type = 'tweet';
    mapping = {
      tweetUrl: 'url', tweetText: 'text', retweetCount: 'retweets', likeCount: 'likes',
      replyCount: 'replies', quoteCount: 'quotes', viewCount: 'views', createdAt: 'createdAt',
      userName: 'username', tweetId: 'tweetId',
    };
  } else if (fields.includes('followsYou') || fields.includes('followedByYou')) {
    type = 'followers';
    mapping = {
      userName: 'username', fullName: 'displayName', followsYou: 'isFollower', followedByYou: 'isFollowing',
      followersCount: 'followersCount', followingCount: 'followingCount', biography: 'bio',
    };
  }

  const normalized = items.map(item => {
    const result = {};
    const extra = {};
    for (const [key, value] of Object.entries(item)) {
      if (mapping[key]) {
        result[mapping[key]] = value;
      } else {
        extra[key] = value;
      }
    }
    if (Object.keys(extra).length > 0) result._extra = extra;
    return result;
  });

  const unmappedFields = [...new Set(items.flatMap(item => Object.keys(item).filter(k => !mapping[k])))];

  return { type, items: normalized, fieldMapping: mapping, unmappedFields };
}

export function exportAsApifyDataset(items, type = 'profile') {
  const reverseMapping = {
    profile: {
      username: 'userName', displayName: 'fullName', bio: 'biography', followersCount: 'followersCount',
      followingCount: 'followingCount', tweetCount: 'tweetsCount', verified: 'isVerified',
      joinDate: 'joinDate', location: 'location', website: 'website', url: 'profileUrl',
    },
    tweet: {
      text: 'tweetText', retweets: 'retweetCount', likes: 'likeCount', replies: 'replyCount',
      quotes: 'quoteCount', views: 'viewCount', createdAt: 'createdAt', url: 'tweetUrl',
      username: 'userName', tweetId: 'tweetId',
    },
    followers: {
      username: 'userName', displayName: 'fullName', isFollower: 'followsYou', isFollowing: 'followedByYou',
      followersCount: 'followersCount', followingCount: 'followingCount', bio: 'biography',
    },
  };

  const mapping = reverseMapping[type] || {};
  return items.map(item => {
    const result = {};
    for (const [key, value] of Object.entries(item)) {
      if (key === '_extra') continue;
      result[mapping[key] || key] = value;
    }
    return result;
  });
}

// ============================================================================
// Phantombuster Adapter
// ============================================================================

/**
 * Phantombuster field mappings:
 * Followers Collector: twitterUrl, name, description, followers, following, tweets, verified
 * Profile Scraper: twitterUrl, name, bio, location, website, followers, following
 * Auto Follow: url, action, timestamp, status
 */

export function importPhantomResult(data) {
  let items;
  if (typeof data === 'string') {
    // Try JSON first
    try {
      items = JSON.parse(data);
    } catch {
      // Parse CSV
      items = parseCSV(data);
    }
  } else {
    items = Array.isArray(data) ? data : [data];
  }

  if (items.length === 0) return { type: 'unknown', items: [], fieldMapping: {} };

  const sample = items[0];
  const fields = Object.keys(sample);

  let type = 'unknown';
  let mapping = {};

  if (fields.includes('action') && fields.includes('timestamp')) {
    type = 'action-log';
    mapping = { url: 'url', action: 'action', timestamp: 'timestamp', status: 'status' };
  } else if (fields.includes('twitterUrl') || fields.includes('profileUrl')) {
    type = 'profile';
    mapping = {
      twitterUrl: 'url', profileUrl: 'url', name: 'displayName', description: 'bio', bio: 'bio',
      followers: 'followersCount', following: 'followingCount', tweets: 'tweetCount',
      verified: 'verified', location: 'location', website: 'website',
    };
  }

  // Extract username from URL
  const normalized = items.map(item => {
    const result = {};
    const extra = {};
    for (const [key, value] of Object.entries(item)) {
      if (mapping[key]) {
        result[mapping[key]] = value;
      } else {
        extra[key] = value;
      }
    }
    // Extract username from Twitter URL
    if (result.url && !result.username) {
      const match = result.url.match(/(?:twitter|x)\.com\/([^/?]+)/);
      if (match) result.username = match[1];
    }
    if (Object.keys(extra).length > 0) result._extra = extra;
    return result;
  });

  return { type, items: normalized, fieldMapping: mapping };
}

export function exportAsPhantomResult(items, phantomType = 'profile') {
  const mapping = {
    profile: {
      url: 'twitterUrl', displayName: 'name', bio: 'description', followersCount: 'followers',
      followingCount: 'following', tweetCount: 'tweets', verified: 'verified',
      location: 'location', website: 'website', username: 'screenName',
    },
  };

  const fieldMap = mapping[phantomType] || {};
  const converted = items.map(item => {
    const result = {};
    for (const [key, value] of Object.entries(item)) {
      if (key === '_extra') continue;
      result[fieldMap[key] || key] = value;
    }
    if (!result.twitterUrl && item.username) {
      result.twitterUrl = `https://x.com/${item.username}`;
    }
    return result;
  });

  // Return as CSV string (Phantombuster default)
  return arrayToCSV(converted);
}

// ============================================================================
// Generic / Social Blade Adapter
// ============================================================================

export function exportAsSocialBlade(historyData) {
  // Social Blade CSV format: Date, Followers, Following, Tweets
  const lines = ['Date,Followers,Following,Tweets'];
  const snapshots = historyData.accountSnapshots || historyData || [];

  for (const s of snapshots) {
    const date = s.snapshot_at?.split('T')[0] || s.date || '';
    lines.push(`${date},${s.followers_count || 0},${s.following_count || 0},${s.tweet_count || 0}`);
  }

  return lines.join('\n');
}

export function autoDetectCSV(data) {
  const items = typeof data === 'string' ? parseCSV(data) : data;
  if (items.length === 0) return { detectedType: 'unknown', fieldMapping: {}, items: [], confidence: 0 };

  const sample = items[0];
  const fields = Object.keys(sample).map(f => f.toLowerCase());
  let type = 'unknown';
  let confidence = 0;
  const fieldMapping = {};

  // Username detection
  const usernameFields = ['username', 'handle', 'screen_name', 'user', 'screenname', 'twitter', 'twitterhandle'];
  for (const f of fields) {
    const key = Object.keys(sample).find(k => k.toLowerCase() === f);
    if (usernameFields.includes(f)) { fieldMapping[key] = 'username'; confidence += 30; break; }
  }

  // Follower count detection
  const followerFields = ['followers', 'followercount', 'followers_count', 'followerscount'];
  for (const f of fields) {
    const key = Object.keys(sample).find(k => k.toLowerCase() === f);
    if (followerFields.includes(f)) { fieldMapping[key] = 'followersCount'; confidence += 20; break; }
  }

  // Tweet text detection
  const textFields = ['text', 'tweet', 'tweettext', 'tweet_text', 'content', 'message'];
  for (const f of fields) {
    const key = Object.keys(sample).find(k => k.toLowerCase() === f);
    if (textFields.includes(f)) { fieldMapping[key] = 'text'; confidence += 20; type = 'tweet'; break; }
  }

  // Bio detection
  const bioFields = ['bio', 'biography', 'description', 'about'];
  for (const f of fields) {
    const key = Object.keys(sample).find(k => k.toLowerCase() === f);
    if (bioFields.includes(f)) { fieldMapping[key] = 'bio'; confidence += 10; break; }
  }

  if (type === 'unknown' && fieldMapping[Object.keys(fieldMapping)[0]] === 'username') {
    type = 'profile';
  }

  const normalized = items.map(item => {
    const result = {};
    const extra = {};
    for (const [key, value] of Object.entries(item)) {
      if (fieldMapping[key]) {
        result[fieldMapping[key]] = value;
      } else {
        extra[key] = value;
      }
    }
    if (Object.keys(extra).length > 0) result._extra = extra;
    return result;
  });

  return { detectedType: type, fieldMapping, items: normalized, confidence: Math.min(100, confidence) };
}

// ============================================================================
// Unified Import/Export
// ============================================================================

export async function importData(filePath, from = 'auto') {
  const content = await fsp.readFile(filePath, 'utf-8');
  const ext = path.extname(filePath).toLowerCase();

  let data;
  if (ext === '.json') {
    data = JSON.parse(content);
  } else {
    data = content; // CSV or text
  }

  if (from === 'apify') return importApifyDataset(data);
  if (from === 'phantombuster') return importPhantomResult(data);

  // Auto-detect
  if (ext === '.json' && Array.isArray(data)) {
    const sample = data[0] || {};
    const fields = Object.keys(sample);
    if (fields.includes('profileUrl') || fields.includes('tweetUrl') || fields.includes('followsYou')) {
      return importApifyDataset(data);
    }
    if (fields.includes('twitterUrl') || fields.includes('action')) {
      return importPhantomResult(data);
    }
    return importApifyDataset(data); // default
  }

  // CSV auto-detect
  return autoDetectCSV(content);
}

export function exportData(items, to, type = 'profile') {
  if (to === 'apify') return JSON.stringify(exportAsApifyDataset(items, type), null, 2);
  if (to === 'phantombuster') return exportAsPhantomResult(items, type);
  if (to === 'socialblade') return exportAsSocialBlade(items);
  if (to === 'csv') return arrayToCSV(items);
  return JSON.stringify(items, null, 2);
}

export function convertFormat(data, fromFormat, toFormat, type = 'profile') {
  let imported;
  if (fromFormat === 'apify') imported = importApifyDataset(data);
  else if (fromFormat === 'phantombuster') imported = importPhantomResult(data);
  else imported = autoDetectCSV(typeof data === 'string' ? data : JSON.stringify(data));

  return exportData(imported.items, toFormat, imported.type || type);
}

// ============================================================================
// CSV Helpers
// ============================================================================

function parseCSV(content) {
  const lines = content.split('\n').filter(l => l.trim());
  if (lines.length < 2) return [];

  const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
  const items = [];

  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    const item = {};
    headers.forEach((h, idx) => { item[h] = values[idx] || ''; });
    items.push(item);
  }

  return items;
}

function parseCSVLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;
  for (const char of line) {
    if (char === '"') { inQuotes = !inQuotes; continue; }
    if (char === ',' && !inQuotes) { result.push(current.trim()); current = ''; continue; }
    current += char;
  }
  result.push(current.trim());
  return result;
}

function arrayToCSV(items) {
  if (!items || items.length === 0) return '';
  const allKeys = new Set();
  items.forEach(item => Object.keys(item).filter(k => k !== '_extra').forEach(k => allKeys.add(k)));
  const headers = [...allKeys];
  const lines = [headers.join(',')];
  for (const item of items) {
    lines.push(headers.map(h => {
      const val = item[h];
      if (val === undefined || val === null) return '';
      const str = String(val);
      return str.includes(',') || str.includes('"') ? `"${str.replace(/"/g, '""')}"` : str;
    }).join(','));
  }
  return lines.join('\n');
}

// by nichxbt
