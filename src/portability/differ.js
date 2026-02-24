/**
 * XActions Export Differ
 * Compares two account exports and generates a diff report.
 *
 * Detects: new/lost followers, deleted tweets, engagement changes.
 * Outputs: summary JSON + readable Markdown report.
 *
 * @author nich (@nichxbt) - https://github.com/nirholas
 * @license MIT
 */

import { promises as fs } from 'fs';
import path from 'path';

// ============================================================================
// Helpers
// ============================================================================

async function loadJSON(dir, filename) {
  try {
    const raw = await fs.readFile(path.join(dir, filename), 'utf-8');
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function setFromUsers(users) {
  const map = new Map();
  for (const u of users || []) {
    const key = (u.username || u.handle || '').toLowerCase();
    if (key) map.set(key, u);
  }
  return map;
}

function setFromTweets(tweets) {
  const map = new Map();
  for (const t of tweets || []) {
    const key = t.id || t.url || t.text?.slice(0, 80);
    if (key) map.set(String(key), t);
  }
  return map;
}

// ============================================================================
// Diff Engine
// ============================================================================

/**
 * Compare two exports
 *
 * @param {string} dirA - Older export directory
 * @param {string} dirB - Newer export directory
 * @returns {object} { summary, followers, following, tweets, report }
 */
export async function diffExports(dirA, dirB) {
  // Verify directories exist
  for (const d of [dirA, dirB]) {
    try {
      await fs.access(d);
    } catch {
      throw new Error(`Export directory not found: ${d}`);
    }
  }

  const result = {
    dirA,
    dirB,
    generatedAt: new Date().toISOString(),
    followers: { gained: [], lost: [], unchanged: 0 },
    following: { added: [], removed: [], unchanged: 0 },
    tweets: { new: [], deleted: [], engagementChanges: [] },
    profile: { changes: [] },
    summary: {},
  };

  // ---- Profile Diff ----
  const profileA = await loadJSON(dirA, 'profile.json');
  const profileB = await loadJSON(dirB, 'profile.json');

  if (profileA && profileB) {
    const fields = ['name', 'bio', 'location', 'website', 'followers', 'following'];
    for (const f of fields) {
      const va = profileA[f];
      const vb = profileB[f];
      if (String(va) !== String(vb)) {
        result.profile.changes.push({ field: f, before: va, after: vb });
      }
    }
  }

  // ---- Followers Diff ----
  const followersA = await loadJSON(dirA, 'followers.json');
  const followersB = await loadJSON(dirB, 'followers.json');

  if (followersA && followersB) {
    const mapA = setFromUsers(followersA);
    const mapB = setFromUsers(followersB);

    for (const [key, user] of mapB) {
      if (!mapA.has(key)) {
        result.followers.gained.push(user);
      }
    }
    for (const [key, user] of mapA) {
      if (!mapB.has(key)) {
        result.followers.lost.push(user);
      }
    }
    const allKeys = new Set([...mapA.keys(), ...mapB.keys()]);
    result.followers.unchanged = allKeys.size - result.followers.gained.length - result.followers.lost.length;
  }

  // ---- Following Diff ----
  const followingA = await loadJSON(dirA, 'following.json');
  const followingB = await loadJSON(dirB, 'following.json');

  if (followingA && followingB) {
    const mapA = setFromUsers(followingA);
    const mapB = setFromUsers(followingB);

    for (const [key, user] of mapB) {
      if (!mapA.has(key)) {
        result.following.added.push(user);
      }
    }
    for (const [key, user] of mapA) {
      if (!mapB.has(key)) {
        result.following.removed.push(user);
      }
    }
    const allKeys = new Set([...mapA.keys(), ...mapB.keys()]);
    result.following.unchanged = allKeys.size - result.following.added.length - result.following.removed.length;
  }

  // ---- Tweets Diff ----
  const tweetsA = await loadJSON(dirA, 'tweets.json');
  const tweetsB = await loadJSON(dirB, 'tweets.json');

  if (tweetsA && tweetsB) {
    const mapA = setFromTweets(tweetsA);
    const mapB = setFromTweets(tweetsB);

    for (const [key, tweet] of mapB) {
      if (!mapA.has(key)) {
        result.tweets.new.push(tweet);
      } else {
        // Check engagement changes
        const oldT = mapA.get(key);
        const likeDiff = (tweet.likes ?? 0) - (oldT.likes ?? 0);
        const rtDiff = (tweet.retweets ?? 0) - (oldT.retweets ?? 0);
        const replyDiff = (tweet.replies ?? 0) - (oldT.replies ?? 0);

        if (likeDiff !== 0 || rtDiff !== 0 || replyDiff !== 0) {
          result.tweets.engagementChanges.push({
            id: key,
            text: (tweet.text || '').slice(0, 100),
            likes: { before: oldT.likes ?? 0, after: tweet.likes ?? 0, diff: likeDiff },
            retweets: { before: oldT.retweets ?? 0, after: tweet.retweets ?? 0, diff: rtDiff },
            replies: { before: oldT.replies ?? 0, after: tweet.replies ?? 0, diff: replyDiff },
          });
        }
      }
    }

    for (const [key, tweet] of mapA) {
      if (!mapB.has(key)) {
        result.tweets.deleted.push(tweet);
      }
    }
  }

  // ---- Summary ----
  result.summary = {
    followersGained: result.followers.gained.length,
    followersLost: result.followers.lost.length,
    netFollowerChange: result.followers.gained.length - result.followers.lost.length,
    followingAdded: result.following.added.length,
    followingRemoved: result.following.removed.length,
    newTweets: result.tweets.new.length,
    deletedTweets: result.tweets.deleted.length,
    engagementChanges: result.tweets.engagementChanges.length,
    profileChanges: result.profile.changes.length,
  };

  return result;
}

// ============================================================================
// Report Generation
// ============================================================================

/**
 * Generate a readable Markdown diff report
 */
export function generateReport(diff) {
  const s = diff.summary;
  let md = `# XActions Export Diff Report\n\n`;
  md += `**Generated:** ${diff.generatedAt}\n`;
  md += `**Export A:** \`${diff.dirA}\`\n`;
  md += `**Export B:** \`${diff.dirB}\`\n\n`;
  md += `---\n\n`;

  // Summary table
  md += `## Summary\n\n`;
  md += `| Metric | Value |\n|--------|-------|\n`;
  md += `| Followers gained | +${s.followersGained} |\n`;
  md += `| Followers lost | -${s.followersLost} |\n`;
  md += `| Net follower change | ${s.netFollowerChange >= 0 ? '+' : ''}${s.netFollowerChange} |\n`;
  md += `| Following added | +${s.followingAdded} |\n`;
  md += `| Following removed | -${s.followingRemoved} |\n`;
  md += `| New tweets | ${s.newTweets} |\n`;
  md += `| Deleted tweets | ${s.deletedTweets} |\n`;
  md += `| Engagement changes | ${s.engagementChanges} |\n`;
  md += `| Profile changes | ${s.profileChanges} |\n\n`;

  // Profile changes
  if (diff.profile.changes.length > 0) {
    md += `## Profile Changes\n\n`;
    for (const c of diff.profile.changes) {
      md += `- **${c.field}**: \`${c.before}\` → \`${c.after}\`\n`;
    }
    md += '\n';
  }

  // New followers
  if (diff.followers.gained.length > 0) {
    md += `## New Followers (+${diff.followers.gained.length})\n\n`;
    for (const u of diff.followers.gained.slice(0, 50)) {
      md += `- @${u.username || u.handle || 'unknown'}`;
      if (u.name) md += ` — ${u.name}`;
      md += '\n';
    }
    if (diff.followers.gained.length > 50) {
      md += `- ... and ${diff.followers.gained.length - 50} more\n`;
    }
    md += '\n';
  }

  // Lost followers
  if (diff.followers.lost.length > 0) {
    md += `## Lost Followers (-${diff.followers.lost.length})\n\n`;
    for (const u of diff.followers.lost.slice(0, 50)) {
      md += `- @${u.username || u.handle || 'unknown'}`;
      if (u.name) md += ` — ${u.name}`;
      md += '\n';
    }
    if (diff.followers.lost.length > 50) {
      md += `- ... and ${diff.followers.lost.length - 50} more\n`;
    }
    md += '\n';
  }

  // Deleted tweets
  if (diff.tweets.deleted.length > 0) {
    md += `## Deleted Tweets (${diff.tweets.deleted.length})\n\n`;
    for (const t of diff.tweets.deleted.slice(0, 20)) {
      md += `- ${(t.text || '').slice(0, 120)}`;
      if (t.timestamp) md += ` *(${t.timestamp})*`;
      md += '\n';
    }
    if (diff.tweets.deleted.length > 20) {
      md += `- ... and ${diff.tweets.deleted.length - 20} more\n`;
    }
    md += '\n';
  }

  // Top engagement changes
  if (diff.tweets.engagementChanges.length > 0) {
    md += `## Top Engagement Changes\n\n`;
    const sorted = [...diff.tweets.engagementChanges].sort(
      (a, b) => Math.abs(b.likes.diff) - Math.abs(a.likes.diff)
    );
    for (const c of sorted.slice(0, 15)) {
      const sign = (n) => (n >= 0 ? `+${n}` : String(n));
      md += `- "${c.text}..."\n`;
      md += `  ❤️ ${sign(c.likes.diff)} | 🔁 ${sign(c.retweets.diff)} | 💬 ${sign(c.replies.diff)}\n`;
    }
    md += '\n';
  }

  md += `---\n\n*Generated by [XActions](https://github.com/nirholas/XActions)*\n`;
  return md;
}

/**
 * Run diff and write report files
 */
export async function diffAndReport(dirA, dirB, outputDir) {
  const diff = await diffExports(dirA, dirB);
  const report = generateReport(diff);

  const out = outputDir || dirB;
  await fs.writeFile(path.join(out, 'diff.json'), JSON.stringify(diff, null, 2));
  await fs.writeFile(path.join(out, 'diff-report.md'), report);

  return { diff, report, files: [path.join(out, 'diff.json'), path.join(out, 'diff-report.md')] };
}

export default diffExports;
