/**
 * XActions Account Exporter
 * Orchestrates full account export: profile, tweets, followers, following, bookmarks, likes
 *
 * Output goes to exports/<username>_<YYYY-MM-DD>/
 * Formats: JSON (raw), CSV (spreadsheet), Markdown (readable)
 * Generates index.html archive viewer via archive-viewer.js
 *
 * @author nich (@nichxbt) - https://github.com/nirholas
 * @license MIT
 */

import { promises as fs } from 'fs';
import path from 'path';

// ============================================================================
// Helpers
// ============================================================================

function today() {
  return new Date().toISOString().slice(0, 10);
}

function sanitize(username) {
  return username.replace(/^@/, '').replace(/[^a-zA-Z0-9_]/g, '');
}

/**
 * Convert array of objects to CSV string
 */
function toCSV(data) {
  if (!data || data.length === 0) return '';
  const headers = Object.keys(data[0]);
  const escape = (v) => {
    const s = String(v ?? '');
    return s.includes(',') || s.includes('"') || s.includes('\n')
      ? `"${s.replace(/"/g, '""')}"`
      : s;
  };
  const rows = data.map((row) => headers.map((h) => escape(row[h])).join(','));
  return [headers.join(','), ...rows].join('\n');
}

/**
 * Convert tweets array to readable Markdown
 */
function tweetsToMarkdown(tweets, username) {
  let md = `# Tweets by @${username}\n\nExported ${today()} via XActions\n\n---\n\n`;
  for (const t of tweets) {
    md += `### ${t.timestamp || 'Unknown date'}\n\n`;
    md += `${t.text || ''}\n\n`;
    if (t.likes || t.retweets || t.replies) {
      md += `❤️ ${t.likes ?? 0} | 🔁 ${t.retweets ?? 0} | 💬 ${t.replies ?? 0}`;
      if (t.views) md += ` | 👁️ ${t.views}`;
      md += '\n\n';
    }
    if (t.url) md += `[View on X](${t.url})\n\n`;
    md += '---\n\n';
  }
  return md;
}

/**
 * Convert followers/following to Markdown
 */
function usersToMarkdown(users, title) {
  let md = `# ${title}\n\nExported ${today()} via XActions\n\nTotal: ${users.length}\n\n---\n\n`;
  for (const u of users) {
    md += `### @${u.username || u.handle || 'unknown'}`;
    if (u.name) md += ` — ${u.name}`;
    md += '\n\n';
    if (u.bio) md += `${u.bio}\n\n`;
    if (u.verified) md += '✅ Verified\n\n';
    md += '---\n\n';
  }
  return md;
}

/**
 * Convert profile to Markdown
 */
function profileToMarkdown(profile) {
  let md = `# @${profile.username || 'unknown'}\n\n`;
  if (profile.name) md += `**${profile.name}**\n\n`;
  if (profile.bio) md += `${profile.bio}\n\n`;
  md += '| Stat | Value |\n|------|-------|\n';
  if (profile.followers != null) md += `| Followers | ${profile.followers} |\n`;
  if (profile.following != null) md += `| Following | ${profile.following} |\n`;
  if (profile.location) md += `| Location | ${profile.location} |\n`;
  if (profile.website) md += `| Website | ${profile.website} |\n`;
  if (profile.joined) md += `| Joined | ${profile.joined} |\n`;
  md += `\nExported ${today()} via XActions\n`;
  return md;
}

/**
 * Convert bookmarks to Markdown
 */
function bookmarksToMarkdown(bookmarks) {
  let md = `# Bookmarks\n\nExported ${today()} via XActions\n\nTotal: ${bookmarks.length}\n\n---\n\n`;
  for (const b of bookmarks) {
    if (b.author) md += `**@${b.author}**\n\n`;
    md += `${b.text || ''}\n\n`;
    if (b.likes || b.retweets) {
      md += `❤️ ${b.likes ?? 0} | 🔁 ${b.retweets ?? 0}\n\n`;
    }
    if (b.link) md += `[View](${b.link})\n\n`;
    md += '---\n\n';
  }
  return md;
}

// ============================================================================
// Checkpoint Management (resume-on-failure)
// ============================================================================

async function loadCheckpoint(dir) {
  try {
    const data = await fs.readFile(path.join(dir, '.checkpoint.json'), 'utf-8');
    return JSON.parse(data);
  } catch {
    return { completed: [], partial: {} };
  }
}

async function saveCheckpoint(dir, checkpoint) {
  await fs.writeFile(
    path.join(dir, '.checkpoint.json'),
    JSON.stringify(checkpoint, null, 2)
  );
}

// ============================================================================
// Main Exporter
// ============================================================================

/**
 * Export phases in order
 */
const PHASES = ['profile', 'tweets', 'followers', 'following', 'bookmarks', 'likes'];

/**
 * Full account export
 *
 * @param {object} options
 * @param {object} options.page - Puppeteer page (already authenticated)
 * @param {string} options.username - Twitter username (without @)
 * @param {string[]} [options.formats=['json','csv','md']] - Output formats
 * @param {string[]} [options.only] - Subset of phases to export (default: all)
 * @param {number} [options.limit=Infinity] - Max items per phase
 * @param {string} [options.outputDir] - Custom output directory
 * @param {function} [options.onProgress] - Callback: ({phase, completed, total, currentItem})
 * @param {object} options.scrapers - Scraper module (import from src/scrapers/index.js)
 * @returns {object} Export summary
 */
export async function exportAccount(options) {
  const {
    page,
    username: rawUsername,
    formats = ['json', 'csv', 'md'],
    only,
    limit = Infinity,
    outputDir: customDir,
    onProgress,
    scrapers,
  } = options;

  const username = sanitize(rawUsername);
  const dir = customDir || path.join(process.cwd(), 'exports', `${username}_${today()}`);
  await fs.mkdir(dir, { recursive: true });

  const checkpoint = await loadCheckpoint(dir);
  const phases = only
    ? PHASES.filter((p) => only.includes(p))
    : PHASES;

  const summary = { username, dir, date: today(), phases: {}, errors: [] };
  const data = {};

  const report = (phase, completed, total, currentItem) => {
    if (onProgress) onProgress({ phase, completed, total, currentItem });
  };

  for (const phase of phases) {
    if (checkpoint.completed.includes(phase)) {
      // Already exported — load from disk for archive viewer
      try {
        const raw = await fs.readFile(path.join(dir, `${phase}.json`), 'utf-8');
        data[phase] = JSON.parse(raw);
        summary.phases[phase] = { count: Array.isArray(data[phase]) ? data[phase].length : 1, skipped: true };
      } catch {
        // Re-scrape if file missing
        checkpoint.completed = checkpoint.completed.filter((p) => p !== phase);
      }
      continue;
    }

    report(phase, 0, 1, `Starting ${phase}...`);

    try {
      switch (phase) {
        case 'profile': {
          data.profile = await scrapers.scrapeProfile(page, username);
          summary.phases.profile = { count: 1 };
          break;
        }
        case 'tweets': {
          data.tweets = await scrapers.scrapeTweets(page, username, {
            limit: limit === Infinity ? 500 : limit,
            includeReplies: false,
            onProgress: (done, total) => report('tweets', done, total, `Tweet ${done}/${total}`),
          });
          summary.phases.tweets = { count: data.tweets.length };
          break;
        }
        case 'followers': {
          data.followers = await scrapers.scrapeFollowers(page, username, {
            limit: limit === Infinity ? 5000 : limit,
            onProgress: (done, total) => report('followers', done, total, `Follower ${done}/${total}`),
          });
          summary.phases.followers = { count: data.followers.length };
          break;
        }
        case 'following': {
          data.following = await scrapers.scrapeFollowing(page, username, {
            limit: limit === Infinity ? 5000 : limit,
            onProgress: (done, total) => report('following', done, total, `Following ${done}/${total}`),
          });
          summary.phases.following = { count: data.following.length };
          break;
        }
        case 'bookmarks': {
          data.bookmarks = await scrapers.scrapeBookmarks(page, {
            limit: limit === Infinity ? 1000 : limit,
          });
          summary.phases.bookmarks = { count: data.bookmarks.length };
          break;
        }
        case 'likes': {
          // scrapeLikes requires a tweet URL; for account export we skip likes
          // unless the scraper supports scraping a user's liked tweets
          if (scrapers.scrapeLikedTweets) {
            data.likes = await scrapers.scrapeLikedTweets(page, username, {
              limit: limit === Infinity ? 1000 : limit,
            });
          } else {
            data.likes = [];
          }
          summary.phases.likes = { count: (data.likes || []).length };
          break;
        }
      }

      // Write phase data
      const phaseData = data[phase];
      if (phaseData) {
        // JSON
        if (formats.includes('json')) {
          await fs.writeFile(
            path.join(dir, `${phase}.json`),
            JSON.stringify(phaseData, null, 2)
          );
        }

        // CSV (arrays only)
        if (formats.includes('csv') && Array.isArray(phaseData) && phaseData.length > 0) {
          await fs.writeFile(path.join(dir, `${phase}.csv`), toCSV(phaseData));
        }

        // Markdown
        if (formats.includes('md')) {
          let md = '';
          switch (phase) {
            case 'profile':
              md = profileToMarkdown(phaseData);
              break;
            case 'tweets':
              md = tweetsToMarkdown(phaseData, username);
              break;
            case 'followers':
              md = usersToMarkdown(phaseData, `Followers of @${username}`);
              break;
            case 'following':
              md = usersToMarkdown(phaseData, `@${username} Following`);
              break;
            case 'bookmarks':
              md = bookmarksToMarkdown(phaseData);
              break;
            case 'likes':
              md = tweetsToMarkdown(phaseData, `${username}'s Likes`);
              break;
          }
          if (md) {
            await fs.writeFile(path.join(dir, `${phase}.md`), md);
          }
        }
      }

      // Checkpoint
      checkpoint.completed.push(phase);
      await saveCheckpoint(dir, checkpoint);

      report(phase, 1, 1, `${phase} done`);
    } catch (err) {
      summary.errors.push({ phase, error: err.message });
      report(phase, 0, 1, `Error: ${err.message}`);
      // Continue with next phase
    }
  }

  // Generate archive viewer HTML
  try {
    const { generateArchiveHTML } = await import('./archive-viewer.js');
    const html = generateArchiveHTML({
      profile: data.profile || {},
      tweets: data.tweets || [],
      followers: data.followers || [],
      following: data.following || [],
      bookmarks: data.bookmarks || [],
      likes: data.likes || [],
    });
    await fs.writeFile(path.join(dir, 'index.html'), html);
    summary.archiveViewer = path.join(dir, 'index.html');
  } catch (err) {
    summary.errors.push({ phase: 'archive-viewer', error: err.message });
  }

  // Write summary
  await fs.writeFile(
    path.join(dir, 'summary.json'),
    JSON.stringify(summary, null, 2)
  );

  // Clean up checkpoint on full success
  if (summary.errors.length === 0) {
    try {
      await fs.unlink(path.join(dir, '.checkpoint.json'));
    } catch { /* ignore */ }
  }

  return summary;
}

export default exportAccount;
