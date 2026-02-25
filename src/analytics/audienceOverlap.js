/**
 * XActions Audience Overlap & Venn Analysis
 * Finds shared followers between accounts, identifies unique audiences.
 *
 * Kills: Followerwonk (compare followers, find overlaps)
 *
 * @author nich (@nichxbt) - https://github.com/nirholas
 * @license MIT
 */

// ============================================================================
// Session Cache
// ============================================================================

const followerCache = new Map(); // username → Set<username>

/**
 * Analyze follower overlap between two accounts
 */
export async function analyzeOverlap(username1, username2, options = {}) {
  const { limit = 5000, enrichProfiles = false, sortBy = 'followers' } = options;

  const followersA = await getFollowerSet(username1, limit);
  const followersB = await getFollowerSet(username2, limit);

  const shared = new Set();
  const uniqueToA = new Set();
  const uniqueToB = new Set();

  for (const user of followersA) {
    if (followersB.has(user)) {
      shared.add(user);
    } else {
      uniqueToA.add(user);
    }
  }
  for (const user of followersB) {
    if (!followersA.has(user)) {
      uniqueToB.add(user);
    }
  }

  const overlapPercentA = followersA.size > 0 ? (shared.size / followersA.size) * 100 : 0;
  const overlapPercentB = followersB.size > 0 ? (shared.size / followersB.size) * 100 : 0;
  const overlapPercent = Math.round(((overlapPercentA + overlapPercentB) / 2) * 100) / 100;

  let sharedUsers = [...shared];
  let uniqueToAUsers = [...uniqueToA];
  let uniqueToBUsers = [...uniqueToB];

  // Optionally enrich profiles
  if (enrichProfiles && sharedUsers.length > 0) {
    sharedUsers = await enrichUserProfiles(sharedUsers.slice(0, 100));
    if (sortBy === 'followers') {
      sharedUsers.sort((a, b) => (b.followersCount || 0) - (a.followersCount || 0));
    }
  }

  const result = {
    accountA: { username: username1, followerCount: followersA.size, uniqueCount: uniqueToA.size },
    accountB: { username: username2, followerCount: followersB.size, uniqueCount: uniqueToB.size },
    shared: { count: shared.size, percentage: overlapPercent, users: sharedUsers },
    uniqueToA: { count: uniqueToA.size, users: uniqueToAUsers },
    uniqueToB: { count: uniqueToB.size, users: uniqueToBUsers },
    insights: getAudienceInsights({
      accountA: { username: username1, followerCount: followersA.size },
      accountB: { username: username2, followerCount: followersB.size },
      shared: { count: shared.size, percentage: overlapPercent },
    }),
  };

  return result;
}

/**
 * Compare 3+ accounts pairwise — overlap matrix
 */
export async function multiOverlap(usernames, options = {}) {
  const { limit = 5000 } = options;

  // Fetch all follower sets
  const sets = {};
  for (const username of usernames) {
    sets[username] = await getFollowerSet(username, limit);
  }

  // Pairwise matrix
  const matrix = {};
  for (let i = 0; i < usernames.length; i++) {
    matrix[usernames[i]] = {};
    for (let j = 0; j < usernames.length; j++) {
      if (i === j) {
        matrix[usernames[i]][usernames[j]] = 100;
        continue;
      }
      const setA = sets[usernames[i]];
      const setB = sets[usernames[j]];
      let overlap = 0;
      for (const user of setA) {
        if (setB.has(user)) overlap++;
      }
      const pct = setA.size > 0 ? Math.round((overlap / setA.size) * 10000) / 100 : 0;
      matrix[usernames[i]][usernames[j]] = pct;
    }
  }

  // Core audience — users following ALL accounts
  let coreAudience = null;
  const allSets = Object.values(sets);
  if (allSets.length > 0) {
    coreAudience = new Set(allSets[0]);
    for (let i = 1; i < allSets.length; i++) {
      for (const user of coreAudience) {
        if (!allSets[i].has(user)) coreAudience.delete(user);
      }
    }
  }

  // Niche audience — users following only ONE account
  const nicheAudience = {};
  for (const username of usernames) {
    const niche = new Set();
    for (const user of sets[username]) {
      let followsOthers = false;
      for (const other of usernames) {
        if (other !== username && sets[other].has(user)) {
          followsOthers = true;
          break;
        }
      }
      if (!followsOthers) niche.add(user);
    }
    nicheAudience[username] = { count: niche.size, users: [...niche].slice(0, 100) };
  }

  return {
    usernames,
    matrix,
    coreAudience: { count: coreAudience?.size || 0, users: [...(coreAudience || [])].slice(0, 100) },
    nicheAudience,
  };
}

/**
 * Rank candidates by audience similarity to target
 */
export async function findSimilarAudience(username, candidateUsernames, options = {}) {
  const { limit = 5000 } = options;
  const targetSet = await getFollowerSet(username, limit);

  const rankings = [];
  for (const candidate of candidateUsernames) {
    const candidateSet = await getFollowerSet(candidate, limit);
    let overlap = 0;
    for (const user of targetSet) {
      if (candidateSet.has(user)) overlap++;
    }
    const similarity = targetSet.size > 0 ? Math.round((overlap / targetSet.size) * 10000) / 100 : 0;
    rankings.push({
      username: candidate,
      followerCount: candidateSet.size,
      overlapCount: overlap,
      similarityPercent: similarity,
    });
  }

  rankings.sort((a, b) => b.similarityPercent - a.similarityPercent);
  return { target: username, targetFollowers: targetSet.size, rankings };
}

/**
 * Generate natural-language insights from overlap data
 */
export function getAudienceInsights(overlapResult) {
  const insights = [];
  const { accountA, accountB, shared } = overlapResult;
  const pct = shared.percentage;

  if (pct > 50) {
    insights.push(`🔗 ${pct}% of @${accountA.username}'s followers also follow @${accountB.username} — very high audience overlap suggests identical content niche`);
  } else if (pct > 25) {
    insights.push(`🔗 ${pct}% overlap — significant shared audience, similar content niches`);
  } else if (pct > 10) {
    insights.push(`📊 ${pct}% overlap — moderate audience crossover, related but distinct niches`);
  } else if (pct > 3) {
    insights.push(`📊 Only ${pct}% overlap — these audiences are largely distinct`);
  } else {
    insights.push(`🎯 Minimal overlap (${pct}%) — virtually no shared audience, completely different niches`);
  }

  if (shared.count > 0) {
    insights.push(`👥 ${shared.count.toLocaleString()} shared followers between @${accountA.username} and @${accountB.username}`);
  }

  const sizeRatio = accountA.followerCount > 0 ? accountB.followerCount / accountA.followerCount : 0;
  if (sizeRatio > 5) {
    insights.push(`📐 @${accountB.username} has ${Math.round(sizeRatio)}x more followers — a collab could expose @${accountA.username} to a much larger audience`);
  } else if (sizeRatio < 0.2 && sizeRatio > 0) {
    insights.push(`📐 @${accountA.username} has ${Math.round(1 / sizeRatio)}x more followers — a collab could expose @${accountB.username} to a much larger audience`);
  }

  return insights;
}

// ============================================================================
// Helpers
// ============================================================================

async function getFollowerSet(username, limit) {
  const user = username.toLowerCase().replace('@', '');
  if (followerCache.has(user)) {
    return followerCache.get(user);
  }

  console.log(`🔍 Scraping @${user} followers...`);
  try {
    const scrapers = await import('../scrapers/index.js');
    const browser = await scrapers.createBrowser({ headless: true });
    const page = await scrapers.createPage(browser);
    try {
      const followers = await scrapers.scrapeFollowers(page, user, { limit });
      const set = new Set(followers.map(f => (f.username || f.screen_name || f).toLowerCase()));
      followerCache.set(user, set);
      console.log(`✅ @${user}: ${set.size} followers loaded`);
      return set;
    } finally {
      await browser.close();
    }
  } catch (error) {
    console.error(`❌ Failed to scrape @${user} followers: ${error.message}`);
    return new Set();
  }
}

async function enrichUserProfiles(usernames) {
  // Return basic objects — enrichment would require per-user scraping
  return usernames.map(u => (typeof u === 'string' ? { username: u } : u));
}

/**
 * Clear the follower cache
 */
export function clearCache() {
  followerCache.clear();
}

// by nichxbt
