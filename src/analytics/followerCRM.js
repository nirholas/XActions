/**
 * XActions Follower CRM & Segmentation
 * Tag, score, segment, and search followers with rich filtering.
 *
 * Kills: Circleboom (smart search), Followerwonk (follower segmentation)
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

  _db.exec(`
    CREATE TABLE IF NOT EXISTS crm_contacts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      display_name TEXT,
      bio TEXT,
      followers_count INTEGER DEFAULT 0,
      following_count INTEGER DEFAULT 0,
      tweet_count INTEGER DEFAULT 0,
      verified INTEGER DEFAULT 0,
      protected INTEGER DEFAULT 0,
      follow_date TEXT,
      unfollow_date TEXT,
      is_follower INTEGER DEFAULT 0,
      is_following INTEGER DEFAULT 0,
      score INTEGER DEFAULT 0,
      last_active TEXT,
      profile_image_url TEXT,
      location TEXT,
      website TEXT,
      updated_at TEXT
    );

    CREATE INDEX IF NOT EXISTS idx_crm_contacts_username ON crm_contacts(username);
    CREATE INDEX IF NOT EXISTS idx_crm_contacts_score ON crm_contacts(score);

    CREATE TABLE IF NOT EXISTS crm_tags (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL,
      color TEXT DEFAULT '#1d9bf0',
      created_at TEXT
    );

    CREATE TABLE IF NOT EXISTS crm_contact_tags (
      contact_id INTEGER NOT NULL,
      tag_id INTEGER NOT NULL,
      PRIMARY KEY (contact_id, tag_id),
      FOREIGN KEY (contact_id) REFERENCES crm_contacts(id),
      FOREIGN KEY (tag_id) REFERENCES crm_tags(id)
    );

    CREATE TABLE IF NOT EXISTS crm_notes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      contact_id INTEGER NOT NULL,
      note TEXT NOT NULL,
      created_at TEXT,
      FOREIGN KEY (contact_id) REFERENCES crm_contacts(id)
    );

    CREATE TABLE IF NOT EXISTS crm_segments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL,
      filter_json TEXT NOT NULL,
      created_at TEXT
    );

    CREATE TABLE IF NOT EXISTS crm_auto_tag_rules (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      rule_json TEXT NOT NULL,
      enabled INTEGER DEFAULT 1,
      created_at TEXT
    );
  `);

  return _db;
}

// ============================================================================
// Core CRM Functions
// ============================================================================

/**
 * Sync followers/following into CRM
 */
export async function syncFollowers(username) {
  const db = getDb();
  const user = username.toLowerCase().replace('@', '');
  const now = new Date().toISOString();

  console.log(`🔄 Syncing followers for @${user}...`);

  let followers = [];
  let following = [];

  try {
    const scrapers = await import('../scrapers/index.js');
    const browser = await scrapers.createBrowser({ headless: true });
    const page = await scrapers.createPage(browser);
    try {
      followers = await scrapers.scrapeFollowers(page, user, { limit: 5000 });
      following = await scrapers.scrapeFollowing(page, user, { limit: 5000 });
    } finally {
      await browser.close();
    }
  } catch (error) {
    console.error(`❌ Scraping failed: ${error.message}`);
    return { error: error.message };
  }

  const followerSet = new Set(followers.map(f => (f.username || f.screen_name || f).toString().toLowerCase()));
  const followingSet = new Set(following.map(f => (f.username || f.screen_name || f).toString().toLowerCase()));

  const upsertStmt = db.prepare(`
    INSERT INTO crm_contacts (username, display_name, bio, followers_count, following_count, tweet_count, verified, is_follower, is_following, profile_image_url, location, website, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(username) DO UPDATE SET
      display_name = COALESCE(excluded.display_name, crm_contacts.display_name),
      bio = COALESCE(excluded.bio, crm_contacts.bio),
      followers_count = excluded.followers_count,
      following_count = excluded.following_count,
      tweet_count = excluded.tweet_count,
      verified = excluded.verified,
      is_follower = excluded.is_follower,
      is_following = excluded.is_following,
      profile_image_url = COALESCE(excluded.profile_image_url, crm_contacts.profile_image_url),
      location = COALESCE(excluded.location, crm_contacts.location),
      website = COALESCE(excluded.website, crm_contacts.website),
      updated_at = excluded.updated_at
  `);

  const allUsers = new Set([...followerSet, ...followingSet]);
  let synced = 0;

  const transaction = db.transaction(() => {
    for (const u of allUsers) {
      const isFollower = followerSet.has(u) ? 1 : 0;
      const isFollowing = followingSet.has(u) ? 1 : 0;

      // Try to find profile data from scraped results
      const profileData = followers.find(f => (f.username || f.screen_name || '').toString().toLowerCase() === u)
        || following.find(f => (f.username || f.screen_name || '').toString().toLowerCase() === u)
        || {};

      upsertStmt.run(
        u,
        profileData.displayName || profileData.display_name || profileData.name || null,
        profileData.bio || profileData.description || null,
        profileData.followersCount || profileData.followers_count || 0,
        profileData.followingCount || profileData.following_count || 0,
        profileData.tweetCount || profileData.tweet_count || 0,
        profileData.verified ? 1 : 0,
        isFollower,
        isFollowing,
        profileData.profileImageUrl || profileData.profile_image_url || null,
        profileData.location || null,
        profileData.website || profileData.url || null,
        now
      );
      synced++;
    }
  });

  transaction();

  // Run auto-tag rules
  const rules = getAutoTagRules();
  if (rules.length > 0) {
    runAutoTagRules(rules);
  }

  console.log(`✅ Synced ${synced} contacts for @${user}`);
  return { synced, followers: followerSet.size, following: followingSet.size };
}

/**
 * Tag a contact
 */
export function tagContact(username, tagName) {
  const db = getDb();
  const user = username.toLowerCase().replace('@', '');

  // Ensure tag exists
  db.prepare('INSERT OR IGNORE INTO crm_tags (name, created_at) VALUES (?, ?)').run(tagName, new Date().toISOString());
  const tag = db.prepare('SELECT id FROM crm_tags WHERE name = ?').get(tagName);
  const contact = db.prepare('SELECT id FROM crm_contacts WHERE username = ?').get(user);

  if (!contact) return { error: `Contact @${user} not found` };
  if (!tag) return { error: `Tag creation failed` };

  db.prepare('INSERT OR IGNORE INTO crm_contact_tags (contact_id, tag_id) VALUES (?, ?)').run(contact.id, tag.id);
  return { username: user, tag: tagName, status: 'tagged' };
}

/**
 * Remove tag from contact
 */
export function untagContact(username, tagName) {
  const db = getDb();
  const user = username.toLowerCase().replace('@', '');
  const contact = db.prepare('SELECT id FROM crm_contacts WHERE username = ?').get(user);
  const tag = db.prepare('SELECT id FROM crm_tags WHERE name = ?').get(tagName);

  if (!contact || !tag) return { error: 'Contact or tag not found' };

  db.prepare('DELETE FROM crm_contact_tags WHERE contact_id = ? AND tag_id = ?').run(contact.id, tag.id);
  return { username: user, tag: tagName, status: 'untagged' };
}

/**
 * Add note to contact
 */
export function addNote(username, note) {
  const db = getDb();
  const user = username.toLowerCase().replace('@', '');
  const contact = db.prepare('SELECT id FROM crm_contacts WHERE username = ?').get(user);
  if (!contact) return { error: `Contact @${user} not found` };

  db.prepare('INSERT INTO crm_notes (contact_id, note, created_at) VALUES (?, ?, ?)').run(contact.id, note, new Date().toISOString());
  return { username: user, note, status: 'added' };
}

/**
 * Manually set contact score
 */
export function scoreContact(username, score) {
  const db = getDb();
  const user = username.toLowerCase().replace('@', '');
  db.prepare('UPDATE crm_contacts SET score = ? WHERE username = ?').run(Math.max(0, Math.min(100, score)), user);
  return { username: user, score };
}

/**
 * Auto-score contact based on heuristics
 */
export function autoScore(username) {
  const db = getDb();
  const user = username.toLowerCase().replace('@', '');
  const contact = db.prepare('SELECT * FROM crm_contacts WHERE username = ?').get(user);
  if (!contact) return { error: `Contact @${user} not found` };

  let score = 0;

  // Follower count (weight 0.2) — log scale
  const followerScore = Math.min(20, Math.log10(Math.max(1, contact.followers_count)) * 5);
  score += followerScore;

  // Tweet frequency (weight 0.2)
  const tweetScore = Math.min(20, Math.log10(Math.max(1, contact.tweet_count)) * 5);
  score += tweetScore;

  // Follows back (weight 0.15)
  if (contact.is_follower && contact.is_following) score += 15;
  else if (contact.is_follower) score += 10;

  // Bio completeness (weight 0.1)
  if (contact.bio && contact.bio.length > 20) score += 10;
  else if (contact.bio) score += 5;

  // Verified (weight 0.1)
  if (contact.verified) score += 10;

  // Has location (weight 0.05)
  if (contact.location) score += 5;

  // Has website (weight 0.05)
  if (contact.website) score += 5;

  // Following ratio (weight 0.15) — follower/following ratio
  const ratio = contact.following_count > 0 ? contact.followers_count / contact.following_count : 1;
  const ratioScore = Math.min(15, ratio * 3);
  score += ratioScore;

  const finalScore = Math.round(Math.min(100, score));
  db.prepare('UPDATE crm_contacts SET score = ? WHERE username = ?').run(finalScore, user);
  return { username: user, score: finalScore, breakdown: { followerScore: Math.round(followerScore), tweetScore: Math.round(tweetScore) } };
}

/**
 * Full-text search across contacts
 */
export function searchContacts(query) {
  const db = getDb();
  const like = `%${query}%`;
  return db.prepare(`
    SELECT c.*, GROUP_CONCAT(t.name) as tags
    FROM crm_contacts c
    LEFT JOIN crm_contact_tags ct ON c.id = ct.contact_id
    LEFT JOIN crm_tags t ON ct.tag_id = t.id
    WHERE c.username LIKE ? OR c.display_name LIKE ? OR c.bio LIKE ?
    GROUP BY c.id
    ORDER BY c.score DESC
    LIMIT 100
  `).all(like, like, like);
}

/**
 * Rich filter contacts
 */
export function filterContacts(filters = {}) {
  const db = getDb();
  const conditions = [];
  const params = [];

  if (filters.minFollowers !== undefined) { conditions.push('c.followers_count >= ?'); params.push(filters.minFollowers); }
  if (filters.maxFollowers !== undefined) { conditions.push('c.followers_count <= ?'); params.push(filters.maxFollowers); }
  if (filters.hasBio) { conditions.push("c.bio IS NOT NULL AND c.bio != ''"); }
  if (filters.bioContains) { conditions.push('c.bio LIKE ?'); params.push(`%${filters.bioContains}%`); }
  if (filters.verified !== undefined) { conditions.push('c.verified = ?'); params.push(filters.verified ? 1 : 0); }
  if (filters.isFollower !== undefined) { conditions.push('c.is_follower = ?'); params.push(filters.isFollower ? 1 : 0); }
  if (filters.isFollowing !== undefined) { conditions.push('c.is_following = ?'); params.push(filters.isFollowing ? 1 : 0); }
  if (filters.minScore !== undefined) { conditions.push('c.score >= ?'); params.push(filters.minScore); }
  if (filters.location) { conditions.push('c.location LIKE ?'); params.push(`%${filters.location}%`); }

  if (filters.tags && filters.tags.length > 0) {
    const placeholders = filters.tags.map(() => '?').join(',');
    conditions.push(`c.id IN (SELECT ct.contact_id FROM crm_contact_tags ct JOIN crm_tags t ON ct.tag_id = t.id WHERE t.name IN (${placeholders}))`);
    params.push(...filters.tags);
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const sortBy = filters.sortBy || 'score';
  const validSorts = ['score', 'followers_count', 'username', 'updated_at'];
  const sort = validSorts.includes(sortBy) ? sortBy : 'score';
  const limit = filters.limit || 50;

  return db.prepare(`
    SELECT c.*, GROUP_CONCAT(DISTINCT t.name) as tags
    FROM crm_contacts c
    LEFT JOIN crm_contact_tags ct ON c.id = ct.contact_id
    LEFT JOIN crm_tags t ON ct.tag_id = t.id
    ${where}
    GROUP BY c.id
    ORDER BY c.${sort} DESC
    LIMIT ?
  `).all(...params, limit);
}

/**
 * Create a saved segment
 */
export function createSegment(name, filters) {
  const db = getDb();
  db.prepare('INSERT OR REPLACE INTO crm_segments (name, filter_json, created_at) VALUES (?, ?, ?)').run(name, JSON.stringify(filters), new Date().toISOString());
  return { name, filters, status: 'created' };
}

/**
 * Run a saved segment
 */
export function getSegment(name) {
  const db = getDb();
  const segment = db.prepare('SELECT * FROM crm_segments WHERE name = ?').get(name);
  if (!segment) return { error: `Segment "${name}" not found` };
  const filters = JSON.parse(segment.filter_json);
  const contacts = filterContacts(filters);
  return { name, filters, contacts, count: contacts.length };
}

/**
 * List all segments
 */
export function listSegments() {
  const db = getDb();
  const segments = db.prepare('SELECT * FROM crm_segments ORDER BY created_at DESC').all();
  return segments.map(s => {
    const filters = JSON.parse(s.filter_json);
    const count = filterContacts({ ...filters, limit: 100000 }).length;
    return { name: s.name, filters, count, created_at: s.created_at };
  });
}

/**
 * Bulk tag contacts
 */
export function bulkTag(filterOrUsernames, tagName) {
  const db = getDb();
  let contacts;

  if (Array.isArray(filterOrUsernames)) {
    contacts = filterOrUsernames.map(u => {
      const user = u.toLowerCase().replace('@', '');
      return db.prepare('SELECT id FROM crm_contacts WHERE username = ?').get(user);
    }).filter(Boolean);
  } else {
    contacts = filterContacts(filterOrUsernames);
  }

  db.prepare('INSERT OR IGNORE INTO crm_tags (name, created_at) VALUES (?, ?)').run(tagName, new Date().toISOString());
  const tag = db.prepare('SELECT id FROM crm_tags WHERE name = ?').get(tagName);

  let tagged = 0;
  const stmt = db.prepare('INSERT OR IGNORE INTO crm_contact_tags (contact_id, tag_id) VALUES (?, ?)');
  const transaction = db.transaction(() => {
    for (const contact of contacts) {
      stmt.run(contact.id, tag.id);
      tagged++;
    }
  });
  transaction();

  return { tag: tagName, tagged };
}

/**
 * Get contact timeline
 */
export function getContactTimeline(username) {
  const db = getDb();
  const user = username.toLowerCase().replace('@', '');
  const contact = db.prepare('SELECT * FROM crm_contacts WHERE username = ?').get(user);
  if (!contact) return { error: `Contact @${user} not found` };

  const notes = db.prepare('SELECT * FROM crm_notes WHERE contact_id = ? ORDER BY created_at DESC').all(contact.id);
  const tags = db.prepare('SELECT t.name, t.color FROM crm_contact_tags ct JOIN crm_tags t ON ct.tag_id = t.id WHERE ct.contact_id = ?').all(contact.id);

  return { contact, notes, tags };
}

/**
 * Export segment to JSON/CSV
 */
export function exportSegment(name, format = 'json') {
  const result = getSegment(name);
  if (result.error) return result;

  if (format === 'csv') {
    const contacts = result.contacts;
    if (!contacts.length) return '';
    const headers = ['username', 'display_name', 'bio', 'followers_count', 'following_count', 'score', 'tags', 'location'];
    const lines = [headers.join(',')];
    for (const c of contacts) {
      lines.push(headers.map(h => {
        const val = c[h];
        if (typeof val === 'string' && (val.includes(',') || val.includes('"'))) return `"${val.replace(/"/g, '""')}"`;
        return val ?? '';
      }).join(','));
    }
    return lines.join('\n');
  }

  return result;
}

/**
 * Add auto-tag rule
 */
export function addAutoTagRule(rule) {
  const db = getDb();
  db.prepare('INSERT INTO crm_auto_tag_rules (rule_json, created_at) VALUES (?, ?)').run(JSON.stringify(rule), new Date().toISOString());
  return { status: 'added', rule };
}

/**
 * Get auto-tag rules
 */
function getAutoTagRules() {
  const db = getDb();
  return db.prepare('SELECT * FROM crm_auto_tag_rules WHERE enabled = 1').all().map(r => ({ ...r, rule: JSON.parse(r.rule_json) }));
}

/**
 * Run auto-tag rules on all contacts
 */
function runAutoTagRules(rules) {
  const db = getDb();
  const contacts = db.prepare('SELECT * FROM crm_contacts').all();

  for (const contact of contacts) {
    for (const { rule } of rules) {
      let matches = true;
      const condition = rule.if || {};

      if (condition.bioContains && (!contact.bio || !contact.bio.toLowerCase().includes(condition.bioContains.toLowerCase()))) {
        matches = false;
      }
      if (condition.minFollowers && contact.followers_count < condition.minFollowers) {
        matches = false;
      }
      if (condition.verified !== undefined && contact.verified !== (condition.verified ? 1 : 0)) {
        matches = false;
      }
      if (condition.isFollower !== undefined && contact.is_follower !== (condition.isFollower ? 1 : 0)) {
        matches = false;
      }

      if (matches && rule.then?.tag) {
        tagContact(contact.username, rule.then.tag);
      }
    }
  }
}

// ============================================================================
// Built-in Auto-Tag Rules
// ============================================================================

export const BUILT_IN_RULES = [
  { if: { minFollowers: 10000 }, then: { tag: 'influencer' } },
  { if: { verified: true }, then: { tag: 'verified' } },
  { if: { isFollower: true, isFollowing: false }, then: { tag: 'fan' } },
];

// by nichxbt
