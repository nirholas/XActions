// Copyright (c) 2024-2026 nich (@nichxbt). Licensed under the Apache License, Version 2.0.
/**
 * Passwords through the real register and login routes, with bcryptjs doing
 * the hashing. bcryptjs 3 writes `$2b$` hashes where 2.x wrote `$2a$`; every
 * account registered before the upgrade holds a `$2a$` hash and must still
 * sign in.
 *
 * @author nich (@nichxbt) - https://github.com/nirholas
 * @license Apache-2.0
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import express from 'express';
import request from 'supertest';

process.env.JWT_SECRET = process.env.JWT_SECRET || 'auth-password-test-jwt-secret';

const prisma = vi.hoisted(() => ({ user: { findFirst: vi.fn(), create: vi.fn() } }));
vi.mock('../../src/utils/prisma.js', () => ({ prisma }));

const { default: router } = await import('../../api/routes/auth.js');
const app = express().use(express.json()).use('/api/auth', router);

// Written by bcryptjs 2.4.3, the version before the upgrade, for this password.
const PASSWORD = 'correct horse battery';
const LEGACY_HASH = '$2a$10$eb6COiUMLfRlZ7q8fvyOme8tAtfnbP3mC5d2RhaX3Qp0WbN9VoGDW';

const storedUser = (password) => ({ id: 'u1', username: 'alice', email: null, credits: 0, password, subscription: null });

describe('password hashing', () => {
	beforeEach(() => vi.clearAllMocks());

	it('register stores a bcrypt hash, never the password, and login accepts it', async () => {
		prisma.user.findFirst.mockResolvedValueOnce(null);
		prisma.user.create.mockImplementation(async ({ data }) => ({ id: 'u1', ...data, subscription: null }));

		const registered = await request(app).post('/api/auth/register').send({ username: 'alice', password: PASSWORD });
		expect(registered.status).toBe(201);

		const { password: hash } = prisma.user.create.mock.calls[0][0].data;
		expect(hash).not.toContain(PASSWORD);
		expect(hash).toMatch(/^\$2b\$10\$[./A-Za-z0-9]{53}$/);

		prisma.user.findFirst.mockResolvedValue(storedUser(hash));
		const ok = await request(app).post('/api/auth/login').send({ identifier: 'alice', password: PASSWORD });
		expect(ok.status).toBe(200);
		expect(typeof ok.body.token).toBe('string');

		const wrong = await request(app).post('/api/auth/login').send({ identifier: 'alice', password: 'not the password' });
		expect(wrong.status).toBe(401);
	});

	it('accepts a $2a$ hash written by bcryptjs 2.x', async () => {
		prisma.user.findFirst.mockResolvedValue(storedUser(LEGACY_HASH));

		const ok = await request(app).post('/api/auth/login').send({ identifier: 'alice', password: PASSWORD });
		expect(ok.status).toBe(200);

		const wrong = await request(app).post('/api/auth/login').send({ identifier: 'alice', password: `${PASSWORD}!` });
		expect(wrong.status).toBe(401);
	});
});
