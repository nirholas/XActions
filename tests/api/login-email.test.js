// Copyright (c) 2024-2026 nich (@nichxbt). Licensed under the Apache License, Version 2.0.
/**
 * Login must find accounts whose email register stored in normalized form.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import express from 'express';
import request from 'supertest';
import validator from 'validator';

const prisma = vi.hoisted(() => ({ user: { findFirst: vi.fn() } }));
vi.mock('../../src/utils/prisma.js', () => ({ prisma }));

const { default: router, loginEmailForms } = await import('../../api/routes/auth.js');

describe('loginEmailForms', () => {
  it('adds the form register stores for a Gmail address with dots and a tag', () => {
    expect(loginEmailForms('Foo.Bar+news@Gmail.com')).toEqual(['foo.bar+news@gmail.com', 'foobar@gmail.com']);
  });

  it('agrees with what register stores (express-validator normalizeEmail defaults)', () => {
    const typed = 'Foo.Bar+news@Gmail.com';
    expect(loginEmailForms(typed)).toContain(validator.normalizeEmail(typed));
  });

  it('keeps a single form when normalization changes nothing', () => {
    expect(loginEmailForms('someone@example.com')).toEqual(['someone@example.com']);
  });

  it('treats a username as a plain lowercased string', () => {
    expect(loginEmailForms('Nich_XBT')).toEqual(['nich_xbt']);
  });
});

describe('POST /login', () => {
  beforeEach(() => vi.clearAllMocks());

  it('queries the stored normalized email, so the account is found', async () => {
    prisma.user.findFirst.mockResolvedValue(null);
    const app = express().use(express.json()).use('/api/auth', router);

    const res = await request(app).post('/api/auth/login').send({ identifier: 'Foo.Bar@gmail.com', password: 'whatever1' });

    expect(res.status).toBe(401);
    const { where } = prisma.user.findFirst.mock.calls[0][0];
    expect(where.OR[0]).toEqual({ email: { in: ['foo.bar@gmail.com', 'foobar@gmail.com'] } });
    expect(where.OR[1]).toEqual({ username: 'Foo.Bar@gmail.com' });
  });
});
