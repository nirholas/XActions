/**
 * XActions Historical Analytics Database
 * Time-series storage for account metrics, tweet performance, and engagement trends.
 * Uses SQLite via better-sqlite3 for local persistence.
 *
 * Kills: Social Blade, Followerwonk (historical tracking)
 *
 * @author nich (@nichxbt) - https://github.com/nirholas
 * @license MIT
 */

import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import os from 'os';

// ============================================================================
// Database Setup
// ============================================================================

const DB_DIR = path.join(os.homedir(), '.xactions');
const DB_PATH = path.join(DB_DIR, 'analytics.db');

let _db = null;

function getDb() {
  if (_db) return _db;

  fs.mkdirSync(DB_DIR, { recursive: true });
  _db = new Database(DB_PATH);
  _db.pragma('journal_mode = WAL');
  _db.pragma('foreign_keys = ON');

  // Auto-migrate: create tables if they don't exist
  _db.exec(`
    CREATE TABLE IF NOT EXISTS account_snapshots (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL,
      followers_count INTEGER DEFAULT 0,
      following_count INTEGER DEFAULT 0,
      tweet_count INTEGER DEFAULT 0,
      listed_count INTEGER DEFAULT 0,
      verified INTEGER DEFAULT 0,
      snapshot_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_account_snapshots_username ON account_snapshots(username);
    CREATE INDEX IF NOT EXISTS idx_account_snapshots_time ON account_snapshots(snapshot_at);

    CREATE TABLE IF NOT EXISTS tweet_snapshots (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      tweet_id TEXT NOT NULL,
      username TEXT NOT NULL,
      likes INTEGER DEFAULT 0,
      retweets INTEGER DEFAULT 0,
      replies INTEGER DEFAULT 0,
      quotes INTEGER DEFAULT 0,
      views INTEGER DEFAULT 0,
      bookmark_count INTEGER DEFAULT 0,
      snapshot_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_tweet_snapshots_tweet ON tweet_snapshots(tweet_id);
    CREATE INDEX IF NOT EXISTS idx_tweet_snapshots_time ON tweet_snapshots(snapshot_at);

    CREATE TABLE IF NOT EXISTS engagement_daily (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL,
      date TEXT NOT NULL,
      avg_engagement_rate REAL DEFAULT 0,
      total_impressions INTEGER DEFAULT 0,
      total_engagements INTEGER DEFAULT 0,
      top_tweet_id TEXT,
      UNIQUE(username, date)
    );

    CREATE INDEX IF NOT EXISTS idx_engagement_daily_username ON engagement_daily(username);
    CREATE INDEX IF NOT EXISTS idx_engagement_daily_date ON engagement_daily(date);
  `);

  return _db;
}

// ============================================================================
// Core Functions
// ============================================================================

/**
 * Save account snapshot — inserts a new time-series data point
 */
export function saveAccountSnapshot(username, data) {
  const db = getDb();
  const stmt = db.prepare(`
    INSERT INTO account_snapshots (username, followers_count, following_count, tweet_count, listed_count, verified, snapshot_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
  const now = new Date().toISOString();
  stmt.run(
    username.toLowerCase(),
    data.followers_count || data.followersCount || 0,
    data.following_count || data.followingCount || 0,
    data.tweet_count || data.tweetCount || 0,
    data.listed_count || data.listedCount || 0,
    data.verified ? 1 : 0,
    now
  );
  return { username, snapshot_at: now };
}

/**
 * Save tweet snapshot — stores per-tweet metrics at a point in time
 */
export function saveTweetSnapshot(username, tweetId, metrics) {
  const db = getDb();
  const stmt = db.prepare(`
    INSERT INTO tweet_snapshots (tweet_id, username, likes, retweets, replies, quotes, views, bookmark_count, snapshot_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const now = new Date().toISOString();
  stmt.run(
    tweetId,
    username.toLowerCase(),
    metrics.likes || 0,
    metrics.retweets || 0,
    metrics.replies || 0,
    metrics.quotes || 0,
    metrics.views || 0,
    metrics.bookmark_count || metrics.bookmarkCount || 0,
    now
  );
  return { tweet_id: tweetId, snapshot_at: now };
}

/**
 * Save daily engagement roll-up — upserts for the day
 */
export function saveDailyEngagement(username, stats) {
  const db = getDb();
  const date = stats.date || new Date().toISOString().split('T')[0];
  const stmt = db.prepare(`
    INSERT INTO engagement_daily (username, date, avg_engagement_rate, total_impressions, total_engagements, top_tweet_id)
    VALUES (?, ?, ?, ?, ?, ?)
    ON CONFLICT(username, date) DO UPDATE SET
      avg_engagement_rate = excluded.avg_engagement_rate,
      total_impressions = excluded.total_impressions,
      total_engagements = excluded.total_engagements,
      top_tweet_id = excluded.top_tweet_id
  `);
  stmt.run(
    username.toLowerCase(),
    date,
    stats.avg_engagement_rate || stats.avgEngagementRate || 0,
    stats.total_impressions || stats.totalImpressions || 0,
    stats.total_engagements || stats.totalEngagements || 0,
    stats.top_tweet_id || stats.topTweetId || null
  );
  return { username, date };
}

/**
 * Get account history — returns time-series data with optional interval grouping
 */
export function getAccountHistory(username, { from, to, interval } = {}) {
  const db = getDb();
  const user = username.toLowerCase();
  let query = 'SELECT * FROM account_snapshots WHERE username = ?';
  const params = [user];

  if (from) {
    query += ' AND snapshot_at >= ?';
    params.push(from);
  }
  if (to) {
    query += ' AND snapshot_at <= ?';
    params.push(to);
  }

  query += ' ORDER BY snapshot_at ASC';
  const rows = db.prepare(query).all(...params);

  if (!interval || interval === 'raw') return rows;

  // Group by interval
  const grouped = {};
  for (const row of rows) {
    const key = getIntervalKey(row.snapshot_at, interval);
    if (!grouped[key]) {
      grouped[key] = [];
    }
    grouped[key].push(row);
  }

  // Take latest snapshot per interval
  return Object.entries(grouped).map(([key, snapshots]) => {
    const latest = snapshots[snapshots.length - 1];
    return { ...latest, interval_key: key };
  });
}

/**
 * Get tweet history — per-tweet metric over time
 */
export function getTweetHistory(tweetId, { from, to } = {}) {
  const db = getDb();
  let query = 'SELECT * FROM tweet_snapshots WHERE tweet_id = ?';
  const params = [tweetId];

  if (from) {
    query += ' AND snapshot_at >= ?';
    params.push(from);
  }
  if (to) {
    query += ' AND snapshot_at <= ?';
    params.push(to);
  }

  query += ' ORDER BY snapshot_at ASC';
  return db.prepare(query).all(...params);
}

/**
 * Get growth rate — followers gained/lost per day over N days
 */
export function getGrowthRate(username, days = 30) {
  const db = getDb();
  const user = username.toLowerCase();
  const fromDate = new Date(Date.now() - days * 86400000).toISOString();

  const rows = db.prepare(`
    SELECT * FROM account_snapshots
    WHERE username = ? AND snapshot_at >= ?
    ORDER BY snapshot_at ASC
  `).all(user, fromDate);

  if (rows.length < 2) {
    return {
      username,
      days,
      dataPoints: rows.length,
      message: rows.length < 2 ? 'Not enough data points — need at least 2 snapshots' : undefined,
      dailyGrowth: [],
      totalChange: 0,
      avgPerDay: 0,
    };
  }

  const dailyGrowth = [];
  for (let i = 1; i < rows.length; i++) {
    const prev = rows[i - 1];
    const curr = rows[i];
    const change = curr.followers_count - prev.followers_count;
    const pct = prev.followers_count > 0 ? ((change / prev.followers_count) * 100) : 0;
    dailyGrowth.push({
      date: curr.snapshot_at.split('T')[0],
      followers: curr.followers_count,
      change,
      percentChange: Math.round(pct * 100) / 100,
    });
  }

  const first = rows[0];
  const last = rows[rows.length - 1];
  const totalChange = last.followers_count - first.followers_count;
  const actualDays = Math.max(1, (new Date(last.snapshot_at) - new Date(first.snapshot_at)) / 86400000);
  const avgPerDay = Math.round((totalChange / actualDays) * 100) / 100;

  return {
    username,
    days,
    dataPoints: rows.length,
    period: { from: first.snapshot_at, to: last.snapshot_at },
    totalChange,
    avgPerDay,
    trend: totalChange > 0 ? '📈' : totalChange < 0 ? '📉' : '➡️',
    percentChange: first.followers_count > 0
      ? Math.round((totalChange / first.followers_count) * 10000) / 100
      : 0,
    dailyGrowth,
  };
}

/**
 * Compare multiple accounts over time
 */
export function compareAccounts(usernames, metric = 'followers_count', { from, to } = {}) {
  const results = {};
  for (const username of usernames) {
    const history = getAccountHistory(username, { from, to, interval: 'day' });
    results[username] = history.map(row => ({
      date: row.snapshot_at?.split('T')[0] || row.interval_key,
      value: row[metric] || 0,
    }));
  }

  // Summary
  const summary = {};
  for (const username of usernames) {
    const data = results[username];
    if (data.length >= 2) {
      const first = data[0].value;
      const last = data[data.length - 1].value;
      summary[username] = {
        start: first,
        end: last,
        change: last - first,
        percentChange: first > 0 ? Math.round(((last - first) / first) * 10000) / 100 : 0,
      };
    } else {
      summary[username] = { dataPoints: data.length, message: 'Insufficient data' };
    }
  }

  return { metric, usernames, timeSeries: results, summary };
}

/**
 * Export historical data for a user
 */
export function exportHistory(username, format = 'json') {
  const db = getDb();
  const user = username.toLowerCase();

  const accountData = db.prepare('SELECT * FROM account_snapshots WHERE username = ? ORDER BY snapshot_at ASC').all(user);
  const tweetData = db.prepare('SELECT * FROM tweet_snapshots WHERE username = ? ORDER BY snapshot_at ASC').all(user);
  const engagementData = db.prepare('SELECT * FROM engagement_daily WHERE username = ? ORDER BY date ASC').all(user);

  const data = { username, accountSnapshots: accountData, tweetSnapshots: tweetData, dailyEngagement: engagementData };

  if (format === 'csv') {
    return exportToCsv(accountData);
  }

  return data;
}

// ============================================================================
// Helpers
// ============================================================================

function getIntervalKey(isoDate, interval) {
  const d = new Date(isoDate);
  switch (interval) {
    case 'day':
      return d.toISOString().split('T')[0];
    case 'week': {
      const day = d.getUTCDay();
      const diff = d.getUTCDate() - day + (day === 0 ? -6 : 1);
      const monday = new Date(d);
      monday.setUTCDate(diff);
      return monday.toISOString().split('T')[0];
    }
    case 'month':
      return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
    default:
      return d.toISOString().split('T')[0];
  }
}

function exportToCsv(rows) {
  if (!rows.length) return '';
  const headers = Object.keys(rows[0]);
  const lines = [headers.join(',')];
  for (const row of rows) {
    lines.push(headers.map(h => {
      const val = row[h];
      if (typeof val === 'string' && val.includes(',')) return `"${val}"`;
      return val ?? '';
    }).join(','));
  }
  return lines.join('\n');
}

/**
 * Close database connection (for cleanup)
 */
export function closeDb() {
  if (_db) {
    _db.close();
    _db = null;
  }
}

/**
 * Get the database instance (for reuse by other modules like CRM)
 */
export function getDatabase() {
  return getDb();
}

// by nichxbt
