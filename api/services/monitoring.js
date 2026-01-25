import { PrismaClient } from '@prisma/client';
import * as automation from './browserAutomation.js';

const prisma = new PrismaClient();

/**
 * Create a snapshot of account state
 */
export async function createSnapshot(sessionCookie, username, type = 'full') {
  const data = {};
  
  if (type === 'full' || type === 'profile') {
    data.profile = await automation.scrapeProfile(sessionCookie, username);
  }
  
  if (type === 'full' || type === 'followers') {
    const followers = await automation.scrapeFollowers(sessionCookie, username, { limit: 5000 });
    data.followers = followers.items.map(f => f.username);
    data.followerCount = followers.items.length;
  }
  
  if (type === 'full' || type === 'following') {
    const following = await automation.scrapeFollowing(sessionCookie, username, { limit: 5000 });
    data.following = following.items.map(f => f.username);
    data.followingCount = following.items.length;
  }
  
  // Store in database
  const snapshot = await prisma.accountSnapshot.create({
    data: {
      username,
      type,
      data: JSON.stringify(data),
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
 * Get latest snapshot for a user
 */
export async function getLatestSnapshot(username, type = 'full') {
  const snapshot = await prisma.accountSnapshot.findFirst({
    where: { username, type },
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
 * Compare two snapshots
 */
export async function compareSnapshots(snapshotId1, snapshotId2) {
  const [snap1, snap2] = await Promise.all([
    prisma.accountSnapshot.findUnique({ where: { id: snapshotId1 } }),
    prisma.accountSnapshot.findUnique({ where: { id: snapshotId2 } })
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
 * Get all snapshots for a user
 */
export async function listSnapshots(username, limit = 10) {
  const snapshots = await prisma.accountSnapshot.findMany({
    where: { username },
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
