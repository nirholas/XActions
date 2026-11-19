// Copyright (c) 2024-2026 nich (@nichxbt). Licensed under the Apache License, Version 2.0.
/**
 * requireSubscription and checkUsageLimit must fail closed: a database error
 * answers 503 rather than granting the tier or unlimited usage.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const prisma = vi.hoisted(() => ({
  subscription: { findUnique: vi.fn() },
  operation: { count: vi.fn() },
}));
vi.mock('../../src/utils/prisma.js', () => ({ prisma }));

const { requireSubscription, checkUsageLimit } = await import('../../api/middleware/auth.js');

function run(mw) {
  const res = {
    statusCode: 200,
    body: undefined,
    status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; return this; },
  };
  const next = vi.fn();
  return mw({ user: { id: 'u1' } }, res, next).then(() => ({ res, next }));
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

describe('requireSubscription', () => {
  it('lets an active subscriber at the required tier through', async () => {
    prisma.subscription.findUnique.mockResolvedValue({ status: 'active', tier: 'pro' });
    const { res, next } = await run(requireSubscription('pro'));
    expect(next).toHaveBeenCalledOnce();
    expect(res.statusCode).toBe(200);
  });

  it('answers 403 below the required tier', async () => {
    prisma.subscription.findUnique.mockResolvedValue(null);
    const { res, next } = await run(requireSubscription('pro'));
    expect(next).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(403);
  });

  it('answers 503, not access, when the database fails', async () => {
    prisma.subscription.findUnique.mockRejectedValue(new Error('connection refused'));
    const { res, next } = await run(requireSubscription('pro'));
    expect(next).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(503);
  });
});

describe('checkUsageLimit', () => {
  it('lets a caller under the daily limit through', async () => {
    prisma.subscription.findUnique.mockResolvedValue(null); // free tier
    prisma.operation.count.mockResolvedValue(3);
    const { next } = await run(checkUsageLimit('scrapesPerDay'));
    expect(next).toHaveBeenCalledOnce();
  });

  it('answers 429 at the daily limit', async () => {
    prisma.subscription.findUnique.mockResolvedValue(null);
    prisma.operation.count.mockResolvedValue(10_000);
    const { res, next } = await run(checkUsageLimit('scrapesPerDay'));
    expect(next).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(429);
  });

  it('answers 503, not unlimited usage, when the database fails', async () => {
    prisma.subscription.findUnique.mockResolvedValue(null);
    prisma.operation.count.mockRejectedValue(new Error('timeout'));
    const { res, next } = await run(checkUsageLimit('scrapesPerDay'));
    expect(next).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(503);
  });
});
