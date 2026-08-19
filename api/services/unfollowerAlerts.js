// Copyright (c) 2024-2026 nich (@nichxbt). Licensed under the Apache License, Version 2.0.
/**
 * Unfollower Alerts Service
 * 
 * Detects notable unfollower events and delivers alerts via
 * Socket.IO real-time events and optional webhook POST.
 * 
 * Notable events:
 * - Verified accounts that unfollowed
 * - Accounts with >10k followers that unfollowed
 * - Mass unfollow events (>10 unfollows in one scan)
 * 
 * @module api/services/unfollowerAlerts
 * @author nichxbt
 */

import { PrismaClient } from '@prisma/client';
import dns from 'node:dns/promises';
import { isIP } from 'node:net';

const prisma = new PrismaClient();

/**
 * Check whether an IP address is private, loopback, link-local, or otherwise
 * non-routable (blocks SSRF to internal networks and the cloud metadata endpoint).
 */
function isPrivateOrReservedIp(ip) {
  const version = isIP(ip);
  if (version === 4) {
    const [a, b] = ip.split('.').map(Number);
    if (a === 127) return true; // loopback
    if (a === 10) return true; // 10.0.0.0/8
    if (a === 172 && b >= 16 && b <= 31) return true; // 172.16.0.0/12
    if (a === 192 && b === 168) return true; // 192.168.0.0/16
    if (a === 169 && b === 254) return true; // 169.254.0.0/16 (incl. 169.254.169.254 metadata)
    if (a === 0) return true; // 0.0.0.0/8
    return false;
  }
  if (version === 6) {
    const normalized = ip.toLowerCase();
    if (normalized === '::1') return true; // loopback
    if (normalized.startsWith('fc') || normalized.startsWith('fd')) return true; // fc00::/7 unique local
    if (normalized.startsWith('fe80')) return true; // link-local
    const mapped = normalized.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
    if (mapped) return isPrivateOrReservedIp(mapped[1]);
    return false;
  }
  return true; // not a valid literal IP — treat as unsafe
}

/**
 * Validate a user-supplied webhook URL before it is persisted or fetched.
 * Requires http(s), rejects 'localhost', and resolves the hostname to make
 * sure it doesn't point at a private/loopback/link-local address.
 */
export async function isSafeWebhookUrl(urlString) {
  let parsed;
  try {
    parsed = new URL(urlString);
  } catch {
    return false;
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return false;

  const hostname = parsed.hostname.toLowerCase();
  if (hostname === 'localhost') return false;

  if (isIP(hostname)) {
    return !isPrivateOrReservedIp(hostname);
  }

  try {
    const records = await dns.lookup(hostname, { all: true });
    if (records.length === 0) return false;
    return records.every(({ address }) => !isPrivateOrReservedIp(address));
  } catch {
    return false;
  }
}

/**
 * Check scan results for notable events and send alerts
 * @param {Object} io - Socket.IO server instance
 * @param {string} userId - XActions user ID
 * @param {Object} scanResult - Result from followerScanner.runFollowerScan()
 * @returns {Array} Generated alerts
 */
export async function checkAndAlert(io, userId, scanResult) {
  const { gained, lost, totalFollowers, scanDate } = scanResult;
  const alerts = [];

  if (scanResult.isFirstScan) {
    // No alerts on first scan — no diff to compare
    return alerts;
  }

  // 1. Mass unfollow event (>10 unfollows in one scan)
  if (lost.length > 10) {
    alerts.push({
      type: 'mass_unfollow',
      severity: 'warning',
      title: '⚠️ Mass Unfollow Detected',
      message: `${lost.length} accounts unfollowed you in this scan`,
      data: { count: lost.length, unfollowers: lost.slice(0, 20) },
    });
  }

  // 2. Verified accounts that unfollowed
  const verifiedUnfollowers = lost.filter(u => u.verified);
  if (verifiedUnfollowers.length > 0) {
    alerts.push({
      type: 'verified_unfollow',
      severity: 'info',
      title: '✓ Verified Account Unfollowed',
      message: `${verifiedUnfollowers.length} verified account(s) unfollowed you`,
      data: { accounts: verifiedUnfollowers },
    });
  }

  // 3. High-profile unfollowers (>10k followers)
  // Note: We don't always have follower counts from the scrape,
  // but if we do, flag them
  const highProfileUnfollowers = lost.filter(u => u.followerCount && u.followerCount > 10000);
  if (highProfileUnfollowers.length > 0) {
    alerts.push({
      type: 'highprofile_unfollow',
      severity: 'info',
      title: '📊 High-Profile Unfollow',
      message: `${highProfileUnfollowers.length} account(s) with 10k+ followers unfollowed you`,
      data: { accounts: highProfileUnfollowers },
    });
  }

  // 4. Significant net loss (>5% of followers in one scan)
  if (totalFollowers > 0 && lost.length > totalFollowers * 0.05) {
    alerts.push({
      type: 'significant_loss',
      severity: 'critical',
      title: '🚨 Significant Follower Loss',
      message: `Lost ${lost.length} followers (${((lost.length / totalFollowers) * 100).toFixed(1)}% of total)`,
      data: { lost: lost.length, total: totalFollowers },
    });
  }

  // 5. Growth milestone (gained > 100 in one scan)
  if (gained.length > 100) {
    alerts.push({
      type: 'growth_spike',
      severity: 'success',
      title: '🚀 Growth Spike!',
      message: `${gained.length} new followers detected in this scan`,
      data: { count: gained.length },
    });
  }

  // Emit alerts via Socket.IO
  if (alerts.length > 0) {
    const payload = {
      userId,
      scanDate,
      totalFollowers,
      gained: gained.length,
      lost: lost.length,
      alerts,
    };

    io.to(`user:${userId}`).emit(`unfollower:alerts:${userId}`, payload);
    io.to(`user:${userId}`).emit('unfollower:scan-complete', {
      userId,
      scanDate,
      totalFollowers,
      gained: gained.length,
      lost: lost.length,
    });
  } else {
    // Still emit scan completion even without alerts
    io.to(`user:${userId}`).emit('unfollower:scan-complete', {
      userId,
      scanDate,
      totalFollowers,
      gained: gained.length,
      lost: lost.length,
    });
  }

  // Deliver webhook if configured
  await deliverWebhook(userId, {
    event: 'scan_complete',
    scanDate,
    totalFollowers,
    gained: gained.length,
    lost: lost.length,
    alerts,
  });

  return alerts;
}

/**
 * Deliver alert to user-configured webhook URL
 * @param {string} userId - XActions user ID
 * @param {Object} payload - Alert payload
 */
async function deliverWebhook(userId, payload) {
  try {
    const schedule = await prisma.unfollowerSchedule.findUnique({
      where: { userId },
    });

    if (!schedule?.webhookUrl) return;

    if (!(await isSafeWebhookUrl(schedule.webhookUrl))) {
      console.warn(`⚠️ Webhook delivery blocked for user ${userId}: URL failed SSRF safety check`);
      return;
    }

    const response = await fetch(schedule.webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        source: 'xactions',
        event: 'unfollower_scan',
        timestamp: new Date().toISOString(),
        ...payload,
      }),
      signal: AbortSignal.timeout(10000), // 10s timeout
      redirect: 'manual', // never auto-follow redirects: an attacker-controlled endpoint could 3xx us to a private/metadata address
    });

    if (response.type === 'opaqueredirect' || (response.status >= 300 && response.status < 400)) {
      console.warn(`⚠️ Webhook delivery blocked for user ${userId}: endpoint returned a redirect, which is not followed`);
    } else if (!response.ok) {
      console.warn(`⚠️ Webhook delivery failed for user ${userId}: ${response.status}`);
    } else {
      console.log(`📨 Webhook delivered for user ${userId}`);
    }
  } catch (error) {
    console.warn(`⚠️ Webhook delivery error for user ${userId}:`, error.message);
  }
}

/**
 * Schedule management
 */

const INTERVAL_MS = {
  hourly: 60 * 60 * 1000,
  every6h: 6 * 60 * 60 * 1000,
  daily: 24 * 60 * 60 * 1000,
};

/**
 * Set or update auto-scan schedule
 * @param {string} userId - XActions user ID
 * @param {string} interval - 'hourly', 'every6h', 'daily'
 * @param {string} [webhookUrl] - Optional webhook URL for alerts
 * @returns {Object} Schedule record
 */
export async function setSchedule(userId, interval, webhookUrl = null) {
  if (!INTERVAL_MS[interval]) {
    throw new Error(`Invalid interval: ${interval}. Must be one of: ${Object.keys(INTERVAL_MS).join(', ')}`);
  }

  if (webhookUrl && !(await isSafeWebhookUrl(webhookUrl))) {
    throw new Error('Invalid webhookUrl: must be a public http(s) URL, not a private/internal address');
  }

  const nextRunAt = new Date(Date.now() + INTERVAL_MS[interval]);

  const schedule = await prisma.unfollowerSchedule.upsert({
    where: { userId },
    update: {
      interval,
      active: true,
      nextRunAt,
      webhookUrl,
    },
    create: {
      userId,
      interval,
      active: true,
      nextRunAt,
      webhookUrl,
    },
  });

  console.log(`📅 Schedule set for user ${userId}: ${interval} (next run: ${nextRunAt.toISOString()})`);
  return schedule;
}

/**
 * Stop auto-scanning for a user
 * @param {string} userId - XActions user ID
 * @returns {Object|null} Updated schedule or null
 */
export async function stopSchedule(userId) {
  try {
    const schedule = await prisma.unfollowerSchedule.update({
      where: { userId },
      data: { active: false },
    });
    console.log(`⏹️ Schedule stopped for user ${userId}`);
    return schedule;
  } catch (error) {
    // No schedule to stop
    return null;
  }
}

/**
 * Get current schedule for a user
 * @param {string} userId - XActions user ID
 * @returns {Object|null} Schedule record
 */
export async function getSchedule(userId) {
  return prisma.unfollowerSchedule.findUnique({
    where: { userId },
  });
}

/**
 * Get all active schedules that are due to run
 * Used by the scheduler to find jobs to process
 * @returns {Array} Schedules due for execution
 */
export async function getDueSchedules() {
  return prisma.unfollowerSchedule.findMany({
    where: {
      active: true,
      nextRunAt: { lte: new Date() },
    },
  });
}

/**
 * Mark a schedule as just executed and set next run time
 * @param {string} userId - XActions user ID
 */
export async function markScheduleExecuted(userId) {
  const schedule = await prisma.unfollowerSchedule.findUnique({
    where: { userId },
  });

  if (!schedule) return;

  const intervalMs = INTERVAL_MS[schedule.interval] || INTERVAL_MS.daily;

  await prisma.unfollowerSchedule.update({
    where: { userId },
    data: {
      lastRunAt: new Date(),
      nextRunAt: new Date(Date.now() + intervalMs),
    },
  });
}
