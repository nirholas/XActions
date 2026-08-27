// Copyright (c) 2024-2026 nich (@nichxbt). Licensed under the Apache License, Version 2.0.
import { PrismaClient } from '@prisma/client';
import * as automation from './browserAutomation.js';

const prisma = new PrismaClient();

/**
 * Create a snapshot of account state
 * @param {string} ownerHash - Tenant scope (hash of the caller's session cookie); pass null to leave unscoped.
 */
export async function createSnapshot(sessionCookie, username, type = 'full', ownerHash = null) {
  const data = {};

  if (type === 'full' || type === 'profile') {
    data.profile = await automation.scrapeProfile(sessionCookie, username);
  }

  if (type === 'full' || type === 'followers') {
    const followers = await automation.scrapeFollowers(sessionCookie, username, { limit: 5000 });
    data.followers = followers.users.map(f => f.username);
    data.followerCount = followers.users.length;
  }

  if (type === 'full' || type === 'following') {
    const following = await automation.scrapeFollowing(sessionCookie, username, { limit: 5000 });
    data.following = following.users.map(f => f.username);
    data.followingCount = following.users.length;
  }

  // Store in database
  const snapshot = await prisma.accountSnapshot.create({
    data: {
      username,
      type,
      data: JSON.stringify(data),
      ownerHash,
      createdAt: new Date()
    }
  });

  return {
    id: snapshot.id,
    username,
    type,
    ...data,
    createdAt: snapshot.createdAt
  };
}

/**
 * Get latest snapshot for a user, scoped to the caller
 * @param {string} ownerHash - Tenant scope; pass null to match only unscoped legacy rows.
 */
export async function getLatestSnapshot(username, type = 'full', ownerHash = null) {
  const snapshot = await prisma.accountSnapshot.findFirst({
    where: { username, type, ownerHash },
    orderBy: { createdAt: 'desc' }
  });

  if (!snapshot) return null;

  return {
    id: snapshot.id,
    username,
    type,
    ...JSON.parse(snapshot.data),
    createdAt: snapshot.createdAt
  };
}

/**
 * Compare two snapshots — both must belong to the requesting tenant.
 * @param {string} ownerHash - Tenant scope; pass null to match only unscoped legacy rows.
 */
export async function compareSnapshots(snapshotId1, snapshotId2, ownerHash = null) {
  const [snap1, snap2] = await Promise.all([
    prisma.accountSnapshot.findFirst({ where: { id: snapshotId1, ownerHash } }),
    prisma.accountSnapshot.findFirst({ where: { id: snapshotId2, ownerHash } })
  ]);

  if (!snap1 || !snap2) {
    throw new Error('Snapshot not found');
  }

  const data1 = JSON.parse(snap1.data);
  const data2 = JSON.parse(snap2.data);

  const changes = {
    timespan: {
      from: snap1.createdAt,
      to: snap2.createdAt
    },
    followers: {
      gained: [],
      lost: []
    },
    following: {
      added: [],
      removed: []
    },
    profile: {
      changes: []
    }
  };

  // Compare followers
  if (data1.followers && data2.followers) {
    const set1 = new Set(data1.followers);
    const set2 = new Set(data2.followers);

    changes.followers.gained = data2.followers.filter(f => !set1.has(f));
    changes.followers.lost = data1.followers.filter(f => !set2.has(f));
  }

  // Compare following
  if (data1.following && data2.following) {
    const set1 = new Set(data1.following);
    const set2 = new Set(data2.following);

    changes.following.added = data2.following.filter(f => !set1.has(f));
    changes.following.removed = data1.following.filter(f => !set2.has(f));
  }

  // Compare profile fields
  if (data1.profile && data2.profile) {
    for (const field of ['bio', 'name', 'location', 'website']) {
      if (data1.profile[field] !== data2.profile[field]) {
        changes.profile.changes.push({
          field,
          from: data1.profile[field],
          to: data2.profile[field]
        });
      }
    }
  }

  return changes;
}

/**
 * Get all snapshots for a user, scoped to the caller
 * @param {string} ownerHash - Tenant scope; pass null to match only unscoped legacy rows.
 */
export async function listSnapshots(username, limit = 10, ownerHash = null) {
  const snapshots = await prisma.accountSnapshot.findMany({
    where: { username, ownerHash },
    orderBy: { createdAt: 'desc' },
    take: limit
  });

  return snapshots.map(s => ({
    id: s.id,
    username: s.username,
    type: s.type,
    createdAt: s.createdAt
  }));
}

/**
 * Save an already-collected snapshot (skips the scraping createSnapshot does)
 * @param {string} ownerHash - Tenant scope; pass null to leave unscoped.
 */
export async function saveSnapshot(username, data, type = 'full', ownerHash = null) {
  const snapshot = await prisma.accountSnapshot.create({
    data: {
      username,
      type,
      data: JSON.stringify(data),
      ownerHash,
      createdAt: new Date()
    }
  });

  return {
    id: snapshot.id,
    username,
    type,
    ...data,
    createdAt: snapshot.createdAt
  };
}

/**
 * Delete all snapshots for a user, scoped to the caller
 * @param {string} ownerHash - Tenant scope; pass null to match only unscoped legacy rows.
 */
export async function deleteSnapshots(username, ownerHash = null) {
  const result = await prisma.accountSnapshot.deleteMany({
    where: { username, ownerHash }
  });

  return result.count;
}

/**
 * List distinct monitored accounts with their latest snapshot info, scoped to the caller
 * @param {string} [options.ownerHash] - Tenant scope; pass null to match only unscoped legacy rows.
 */
export async function listMonitoredAccounts({ limit = 50, ownerHash = null } = {}) {
  const grouped = await prisma.accountSnapshot.groupBy({
    by: ['username'],
    where: { ownerHash },
    _count: { _all: true },
    _max: { createdAt: true },
    orderBy: { _max: { createdAt: 'desc' } },
    take: limit
  });

  return Promise.all(grouped.map(async (g) => {
    const latest = await prisma.accountSnapshot.findFirst({
      where: { username: g.username, ownerHash },
      orderBy: { createdAt: 'desc' }
    });
    const data = latest ? JSON.parse(latest.data) : {};

    return {
      username: g.username,
      lastSnapshotAt: g._max.createdAt,
      snapshotCount: g._count._all,
      latestFollowerCount: data.followerCount ?? null,
      latestFollowingCount: data.followingCount ?? null
    };
  }));
}
