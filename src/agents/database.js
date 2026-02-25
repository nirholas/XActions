// XActions — Database & Metrics Module
// SQLite-based action logging and metrics for the Thought Leader Agent
// by nichxbt

import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

// Default model costs per million tokens (USD)
const MODEL_COSTS = {
  'deepseek/deepseek-chat': { input: 0.14, output: 0.28 },
  'anthropic/claude-3.5-haiku': { input: 0.80, output: 4.00 },
  'anthropic/claude-sonnet-4': { input: 3.00, output: 15.00 },
};

/**
 * SQLite-based action logger, metrics tracker, and analytics engine.
 */
class AgentDatabase {
  /**
   * @param {string} [dbPath] - Path to SQLite database file. Defaults to data/agent.db
   */
  constructor(dbPath) {
    const resolvedPath = dbPath || path.resolve('data', 'agent.db');
    const dir = path.dirname(resolvedPath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

    this.db = new Database(resolvedPath);
    this.db.pragma('journal_mode = WAL');
    this.db.pragma('foreign_keys = ON');
    this._initTables();
  }

  /** Create tables if they don't exist. */
  _initTables() {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS actions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        type TEXT NOT NULL,
        target_id TEXT,
        metadata TEXT,
        timestamp TEXT NOT NULL DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS follows (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT NOT NULL,
        niche TEXT,
        followed_at TEXT NOT NULL DEFAULT (datetime('now')),
        unfollowed_at TEXT
      );

      CREATE TABLE IF NOT EXISTS content (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        type TEXT NOT NULL,
        text TEXT NOT NULL,
        posted_at TEXT NOT NULL DEFAULT (datetime('now')),
        impressions INTEGER DEFAULT 0,
        likes INTEGER DEFAULT 0,
        replies INTEGER DEFAULT 0
      );

      CREATE TABLE IF NOT EXISTS metrics (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        date TEXT NOT NULL UNIQUE,
        followers INTEGER DEFAULT 0,
        following INTEGER DEFAULT 0,
        tweets INTEGER DEFAULT 0,
        likes_given INTEGER DEFAULT 0,
        follows_given INTEGER DEFAULT 0,
        comments_given INTEGER DEFAULT 0
      );

      CREATE TABLE IF NOT EXISTS llm_usage (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        date TEXT NOT NULL,
        model TEXT NOT NULL,
        calls INTEGER DEFAULT 0,
        input_tokens INTEGER DEFAULT 0,
        output_tokens INTEGER DEFAULT 0,
        cost_usd REAL DEFAULT 0.0
      );

      CREATE INDEX IF NOT EXISTS idx_actions_type ON actions(type);
      CREATE INDEX IF NOT EXISTS idx_actions_timestamp ON actions(timestamp);
      CREATE INDEX IF NOT EXISTS idx_actions_target ON actions(target_id);
      CREATE INDEX IF NOT EXISTS idx_follows_username ON follows(username);
      CREATE INDEX IF NOT EXISTS idx_content_posted ON content(posted_at);
      CREATE INDEX IF NOT EXISTS idx_llm_usage_date ON llm_usage(date);
    `);
  }

  // ─── Action Logging ──────────────────────────────────────────

  /**
   * Log an action.
   * @param {string} type - Action type (like, follow, comment, post, search, etc.)
   * @param {string} [targetId] - ID of the target (tweet ID, username, etc.)
   * @param {Object} [metadata] - Additional data to store as JSON
   */
  logAction(type, targetId, metadata) {
    const stmt = this.db.prepare(
      'INSERT INTO actions (type, target_id, metadata) VALUES (?, ?, ?)',
    );
    stmt.run(type, targetId || null, metadata ? JSON.stringify(metadata) : null);
  }

  /**
   * Get the count of actions performed today, optionally filtered by type.
   * @param {string} [type] - Action type filter
   * @returns {number}
   */
  getActionsToday(type) {
    const today = new Date().toISOString().split('T')[0];
    if (type) {
      const row = this.db.prepare(
        "SELECT COUNT(*) as count FROM actions WHERE type = ? AND date(timestamp) = ?",
      ).get(type, today);
      return row.count;
    }
    const row = this.db.prepare(
      "SELECT COUNT(*) as count FROM actions WHERE date(timestamp) = ?",
    ).get(today);
    return row.count;
  }

  /**
   * Check if an action was already performed on a target (prevent re-engaging).
   * @param {string} type
   * @param {string} targetId
   * @returns {boolean}
   */
  isDuplicate(type, targetId) {
    const row = this.db.prepare(
      'SELECT COUNT(*) as count FROM actions WHERE type = ? AND target_id = ?',
    ).get(type, targetId);
    return row.count > 0;
  }

  /**
   * Get recent actions, optionally filtered by type.
   * @param {number} [limit=50]
   * @param {string} [type]
   * @returns {Array<Object>}
   */
  getRecentActions(limit = 50, type) {
    if (type) {
      return this.db.prepare(
        'SELECT * FROM actions WHERE type = ? ORDER BY timestamp DESC LIMIT ?',
      ).all(type, limit);
    }
    return this.db.prepare(
      'SELECT * FROM actions ORDER BY timestamp DESC LIMIT ?',
    ).all(limit);
  }

  // ─── Follow Tracking ─────────────────────────────────────────

  /**
   * Track a new follow.
   * @param {string} username
   * @param {string} [niche]
   */
  trackFollow(username, niche) {
    const stmt = this.db.prepare(
      'INSERT INTO follows (username, niche) VALUES (?, ?)',
    );
    stmt.run(username, niche || null);
  }

  /**
   * Mark a user as unfollowed.
   * @param {string} username
   */
  trackUnfollow(username) {
    const stmt = this.db.prepare(
      "UPDATE follows SET unfollowed_at = datetime('now') WHERE username = ? AND unfollowed_at IS NULL",
    );
    stmt.run(username);
  }

  /**
   * Get all currently-followed users.
   * @returns {Array<Object>}
   */
  getFollowing() {
    return this.db.prepare(
      'SELECT * FROM follows WHERE unfollowed_at IS NULL ORDER BY followed_at DESC',
    ).all();
  }

  // ─── Content Tracking ────────────────────────────────────────

  /**
   * Record a piece of content that was posted.
   * @param {string} type - 'tweet' | 'thread' | 'quote' | 'reply'
   * @param {string} text
   * @returns {number} Content ID
   */
  recordContent(type, text) {
    const info = this.db.prepare(
      'INSERT INTO content (type, text) VALUES (?, ?)',
    ).run(type, text);
    return info.lastInsertRowid;
  }

  /**
   * Update content metrics (impressions, likes, replies).
   * @param {number} contentId
   * @param {{ impressions?: number, likes?: number, replies?: number }} data
   */
  updateContentMetrics(contentId, data) {
    const sets = [];
    const values = [];
    if (data.impressions !== undefined) { sets.push('impressions = ?'); values.push(data.impressions); }
    if (data.likes !== undefined) { sets.push('likes = ?'); values.push(data.likes); }
    if (data.replies !== undefined) { sets.push('replies = ?'); values.push(data.replies); }
    if (sets.length === 0) return;
    values.push(contentId);
    this.db.prepare(`UPDATE content SET ${sets.join(', ')} WHERE id = ?`).run(...values);
  }

  /**
   * Get recent posts for LLM context (to avoid repeating content).
   * @param {number} [limit=20]
   * @returns {Array<Object>}
   */
  getRecentPosts(limit = 20) {
    return this.db.prepare(
      'SELECT * FROM content ORDER BY posted_at DESC LIMIT ?',
    ).all(limit);
  }

  // ─── Daily Metrics ────────────────────────────────────────────

  /**
   * Record or update daily metrics snapshot.
   * @param {{ followers?: number, following?: number, tweets?: number, likes_given?: number, follows_given?: number, comments_given?: number }} data
   */
  recordDailyMetrics(data) {
    const today = new Date().toISOString().split('T')[0];
    const existing = this.db.prepare('SELECT * FROM metrics WHERE date = ?').get(today);

    if (existing) {
      const sets = [];
      const values = [];
      for (const [key, value] of Object.entries(data)) {
        if (value !== undefined) {
          sets.push(`${key} = ?`);
          values.push(value);
        }
      }
      if (sets.length > 0) {
        values.push(today);
        this.db.prepare(`UPDATE metrics SET ${sets.join(', ')} WHERE date = ?`).run(...values);
      }
    } else {
      this.db.prepare(
        'INSERT INTO metrics (date, followers, following, tweets, likes_given, follows_given, comments_given) VALUES (?, ?, ?, ?, ?, ?, ?)',
      ).run(
        today,
        data.followers || 0,
        data.following || 0,
        data.tweets || 0,
        data.likes_given || 0,
        data.follows_given || 0,
        data.comments_given || 0,
      );
    }
  }

  // ─── LLM Usage Tracking ──────────────────────────────────────

  /**
   * Record LLM token usage. Aggregates by date + model.
   * @param {string} model - Model identifier (e.g., 'deepseek/deepseek-chat')
   * @param {number} inputTokens
   * @param {number} outputTokens
   */
  recordLLMUsage(model, inputTokens, outputTokens) {
    const today = new Date().toISOString().split('T')[0];
    const cost = this._calculateCost(model, inputTokens, outputTokens);

    const existing = this.db.prepare(
      'SELECT * FROM llm_usage WHERE date = ? AND model = ?',
    ).get(today, model);

    if (existing) {
      this.db.prepare(
        'UPDATE llm_usage SET calls = calls + 1, input_tokens = input_tokens + ?, output_tokens = output_tokens + ?, cost_usd = cost_usd + ? WHERE date = ? AND model = ?',
      ).run(inputTokens, outputTokens, cost, today, model);
    } else {
      this.db.prepare(
        'INSERT INTO llm_usage (date, model, calls, input_tokens, output_tokens, cost_usd) VALUES (?, ?, 1, ?, ?, ?)',
      ).run(today, model, inputTokens, outputTokens, cost);
    }
  }

  /**
   * Get LLM usage stats for a date range.
   * @param {number} [days=7]
   * @returns {Array<Object>}
   */
  getLLMUsage(days = 7) {
    return this.db.prepare(
      "SELECT * FROM llm_usage WHERE date >= date('now', '-' || ? || ' days') ORDER BY date DESC, model",
    ).all(days);
  }

  /**
   * Get total LLM cost for a period.
   * @param {number} [days=30]
   * @returns {number} Total cost in USD
   */
  getLLMCost(days = 30) {
    const row = this.db.prepare(
      "SELECT COALESCE(SUM(cost_usd), 0) as total FROM llm_usage WHERE date >= date('now', '-' || ? || ' days')",
    ).get(days);
    return row.total;
  }

  _calculateCost(model, inputTokens, outputTokens) {
    const costs = MODEL_COSTS[model] || { input: 1.0, output: 3.0 };
    return (inputTokens / 1_000_000) * costs.input + (outputTokens / 1_000_000) * costs.output;
  }

  // ─── Growth Report ────────────────────────────────────────────

  /**
   * Generate a growth report for the past N days.
   * @param {number} [days=7]
   * @returns {{ followers: Array, engagement: Array, content: Array }}
   */
  getGrowthReport(days = 7) {
    const followers = this.db.prepare(
      "SELECT date, followers, following FROM metrics WHERE date >= date('now', '-' || ? || ' days') ORDER BY date",
    ).all(days);

    const engagement = this.db.prepare(
      "SELECT date, likes_given, follows_given, comments_given FROM metrics WHERE date >= date('now', '-' || ? || ' days') ORDER BY date",
    ).all(days);

    const content = this.db.prepare(
      "SELECT type, COUNT(*) as count, AVG(likes) as avg_likes, AVG(impressions) as avg_impressions FROM content WHERE posted_at >= datetime('now', '-' || ? || ' days') GROUP BY type",
    ).all(days);

    return { followers, engagement, content };
  }

  // ─── Agent State ──────────────────────────────────────────────

  /**
   * Get a summary of today's activity for rate-limit checking.
   * @returns {{ likes: number, follows: number, comments: number, posts: number, total: number }}
   */
  getTodaySummary() {
    const today = new Date().toISOString().split('T')[0];
    const counts = this.db.prepare(`
      SELECT type, COUNT(*) as count FROM actions
      WHERE date(timestamp) = ?
      GROUP BY type
    `).all(today);

    const summary = { likes: 0, follows: 0, comments: 0, posts: 0, total: 0 };
    for (const row of counts) {
      summary.total += row.count;
      if (row.type === 'like') summary.likes = row.count;
      else if (row.type === 'follow') summary.follows = row.count;
      else if (row.type === 'comment' || row.type === 'reply') summary.comments = row.count;
      else if (row.type === 'post' || row.type === 'tweet' || row.type === 'thread') summary.posts = row.count;
    }
    return summary;
  }

  /**
   * Close the database connection.
   */
  close() {
    this.db.close();
  }
}

export { AgentDatabase };
