/**
 * Follower Scanner Service
 * 
 * Puppeteer-based follower scanning with snapshot diffing.
 * Scrapes current followers, compares to previous snapshot,
 * stores diffs as FollowerChange records.
 * 
 * @module api/services/followerScanner
 * @author nichxbt
 */

import { PrismaClient } from '@prisma/client';
import { scrapeFollowers } from './browserAutomation.js';

const prisma = new PrismaClient();

/**
 * Run a full follower scan for a user
 * @param {string} userId - XActions user ID
 * @param {string} sessionCookie - X/Twitter auth_token
 * @param {string} username - Twitter username to scan
 * @param {Object} options - { limit: 5000 }
 * @returns {Object} Scan result with gained/lost arrays
 */
export async function runFollowerScan(userId, sessionCookie, username, options = {}) {
  const { limit = 5000 } = options;

  console.log(`🔍 Starting follower scan for @${username} (limit: ${limit})`);

  // 1. Scrape current followers via Puppeteer
  const result = await scrapeFollowers(sessionCookie, username, { limit });
  const currentFollowers = result.users || [];

  console.log(`📊 Scraped ${currentFollowers.length} followers for @${username}`);

  // 2. Get previous snapshot
  const previousSnapshot = await prisma.followerSnapshot.findFirst({
    where: { userId, username },
    orderBy: { createdAt: 'desc' },
  });

  // 3. Build lookup maps
  const currentMap = new Map();
  for (const f of currentFollowers) {
    currentMap.set(f.username, {
      username: f.username,
      name: f.name || null,
      avatarUrl: f.profileImage || null,
    });
  }

  let gained = [];
  let lost = [];

  if (previousSnapshot) {
    const previousFollowers = JSON.parse(previousSnapshot.followers);
    const previousMap = new Map();
    for (const f of previousFollowers) {
      previousMap.set(f.username, f);
    }

    const currentSet = new Set(currentMap.keys());
    const previousSet = new Set(previousMap.keys());

    // New followers = in current but not in previous
    gained = [...currentSet]
      .filter(u => !previousSet.has(u))
      .map(u => currentMap.get(u));

    // Lost followers = in previous but not in current
    lost = [...previousSet]
      .filter(u => !currentSet.has(u))
      .map(u => ({
        ...previousMap.get(u),
        followedSince: previousMap.get(u).followedSince || previousSnapshot.createdAt,
      }));
  }

  // 4. Store new snapshot
  const followersJson = currentFollowers.map(f => ({
    username: f.username,
    name: f.name || null,
    avatarUrl: f.profileImage || null,
    followedSince: previousSnapshot
      ? (() => {
          const prev = JSON.parse(previousSnapshot.followers);
          const existing = prev.find(p => p.username === f.username);
          return existing?.followedSince || new Date().toISOString();
        })()
      : new Date().toISOString(),
  }));

  const snapshot = await prisma.followerSnapshot.create({
    data: {
      userId,
      username,
      followers: JSON.stringify(followersJson),
      totalCount: currentFollowers.length,
    },
  });

  // 5. Store individual change records
  const changeRecords = [];

  for (const f of gained) {
    changeRecords.push(
      prisma.followerChange.create({
        data: {
          userId,
          type: 'gained',
          username: f.username,
          name: f.name,
          avatarUrl: f.avatarUrl,
        },
      })
    );
  }

  for (const f of lost) {
    changeRecords.push(
      prisma.followerChange.create({
        data: {
          userId,
          type: 'lost',
          username: f.username,
          name: f.name,
          avatarUrl: f.avatarUrl,
          followedSince: f.followedSince ? new Date(f.followedSince) : null,
        },
      })
    );
  }

  if (changeRecords.length > 0) {
    await Promise.all(changeRecords);
  }

  console.log(`✅ Scan complete for @${username}: +${gained.length} / -${lost.length} (total: ${currentFollowers.length})`);

  return {
    snapshotId: snapshot.id,
    scanDate: snapshot.createdAt,
    totalFollowers: currentFollowers.length,
    gained,
    lost,
    isFirstScan: !previousSnapshot,
  };
}

/**
 * Get scan history for a user
 * @param {string} userId - XActions user ID
 * @param {number} limit - Number of scans to return
 * @returns {Array} Scan history with gained/lost counts
 */
export async function getScanHistory(userId, limit = 30) {
  const snapshots = await prisma.followerSnapshot.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take: limit,
  });

  // For each snapshot, get the changes that were detected at that time
  const history = await Promise.all(
    snapshots.map(async (snap) => {
      // Find changes detected within a small window of the snapshot
      const gained = await prisma.followerChange.count({
        where: {
          userId,
          type: 'gained',
          detectedAt: {
            gte: new Date(snap.createdAt.getTime() - 60000), // 1 min before
            lte: new Date(snap.createdAt.getTime() + 60000), // 1 min after
          },
        },
      });

      const lost = await prisma.followerChange.count({
        where: {
          userId,
          type: 'lost',
          detectedAt: {
            gte: new Date(snap.createdAt.getTime() - 60000),
            lte: new Date(snap.createdAt.getTime() + 60000),
          },
        },
      });

      return {
        scanDate: snap.createdAt,
        totalFollowers: snap.totalCount,
        gained,
        lost,
      };
    })
  );

  return history;
}

/**
 * Get aggregated stats for a user
 * @param {string} userId - XActions user ID
 * @returns {Object} Aggregated follower stats
 */
export async function getFollowerStats(userId) {
  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  // Latest snapshot for current count
  const latestSnapshot = await prisma.followerSnapshot.findFirst({
    where: { userId },
    orderBy: { createdAt: 'desc' },
  });

  // 7-day stats
  const [gained7d, lost7d] = await Promise.all([
    prisma.followerChange.count({
      where: { userId, type: 'gained', detectedAt: { gte: sevenDaysAgo } },
    }),
    prisma.followerChange.count({
      where: { userId, type: 'lost', detectedAt: { gte: sevenDaysAgo } },
    }),
  ]);

  // 30-day stats
  const [gained30d, lost30d] = await Promise.all([
    prisma.followerChange.count({
      where: { userId, type: 'gained', detectedAt: { gte: thirtyDaysAgo } },
    }),
    prisma.followerChange.count({
      where: { userId, type: 'lost', detectedAt: { gte: thirtyDaysAgo } },
    }),
  ]);

  // Today stats
  const startOfDay = new Date(now);
  startOfDay.setHours(0, 0, 0, 0);

  const [gainedToday, lostToday] = await Promise.all([
    prisma.followerChange.count({
      where: { userId, type: 'gained', detectedAt: { gte: startOfDay } },
    }),
    prisma.followerChange.count({
      where: { userId, type: 'lost', detectedAt: { gte: startOfDay } },
    }),
  ]);

  // Growth rate (30d)
  const snapshotThirtyDaysAgo = await prisma.followerSnapshot.findFirst({
    where: { userId, createdAt: { gte: thirtyDaysAgo } },
    orderBy: { createdAt: 'asc' },
  });

  const currentFollowers = latestSnapshot?.totalCount || 0;
  const followersThirtyDaysAgo = snapshotThirtyDaysAgo?.totalCount || currentFollowers;
  const growthRate = followersThirtyDaysAgo > 0
    ? ((currentFollowers - followersThirtyDaysAgo) / followersThirtyDaysAgo * 100).toFixed(2)
    : 0;

  return {
    currentFollowers,
    lastScanAt: latestSnapshot?.createdAt || null,
    gainedToday,
    lostToday,
    netToday: gainedToday - lostToday,
    gained7d,
    lost7d,
    netChange7d: gained7d - lost7d,
    gained30d,
    lost30d,
    netChange30d: gained30d - lost30d,
    growthRate: parseFloat(growthRate),
  };
}

/**
 * Get recent changes (gained/lost) with full details
 * @param {string} userId - XActions user ID
 * @param {string} type - 'gained', 'lost', or 'all'
 * @param {number} limit - Max records
 * @returns {Array} Recent follower changes
 */
export async function getRecentChanges(userId, type = 'all', limit = 50) {
  const where = { userId };
  if (type !== 'all') where.type = type;

  const changes = await prisma.followerChange.findMany({
    where,
    orderBy: { detectedAt: 'desc' },
    take: limit,
  });

  return changes.map(c => ({
    id: c.id,
    type: c.type,
    username: c.username,
    name: c.name,
    avatarUrl: c.avatarUrl,
    detectedAt: c.detectedAt,
    followedSince: c.followedSince,
    followDuration: c.followedSince
      ? Math.floor((c.detectedAt.getTime() - new Date(c.followedSince).getTime()) / (1000 * 60 * 60 * 24))
      : null,
  }));
}

/**
 * Get follower count history for charting
 * @param {string} userId - XActions user ID
 * @param {number} days - Number of days to look back
 * @returns {Array} Daily follower counts
 */
export async function getFollowerCountHistory(userId, days = 30) {
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  const snapshots = await prisma.followerSnapshot.findMany({
    where: {
      userId,
      createdAt: { gte: since },
    },
    orderBy: { createdAt: 'asc' },
    select: {
      totalCount: true,
      createdAt: true,
    },
  });

  return snapshots.map(s => ({
    date: s.createdAt,
    count: s.totalCount,
  }));
}
