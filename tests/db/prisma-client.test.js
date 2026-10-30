/**
 * The shared Prisma client (src/utils/prisma.js).
 *
 * Prisma 7 needs a driver adapter on every PrismaClient and no longer reads
 * DATABASE_URL or .env by itself, so a bare `new PrismaClient()` throws as soon
 * as its module loads. Every module uses the one shared client instead.
 *
 * The database cases run against the real PostgreSQL that DATABASE_URL points
 * at (CI provides one), and are skipped when it is unset.
 */

import { describe, it, expect, afterAll, vi } from 'vitest';
import { execFileSync } from 'node:child_process';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import pg from 'pg';

const root = new URL('../..', import.meta.url).pathname;
const SHARED = 'src/utils/prisma.js';
const databaseUrl = process.env.DATABASE_URL;

function* sourceFiles(dir) {
	for (const name of readdirSync(dir)) {
		if (name === 'node_modules') continue;
		const path = join(dir, name);
		if (statSync(path).isDirectory()) yield* sourceFiles(path);
		else if (/\.(c|m)?js$/.test(name)) yield path;
	}
}

describe('Prisma client construction', () => {
	it('happens only in the shared module', () => {
		const offenders = ['api', 'src', 'scripts', 'prisma', 'bin']
			.flatMap((dir) => [...sourceFiles(join(root, dir))])
			.map((file) => relative(root, file))
			.filter((file) => file !== SHARED && /new PrismaClient\s*\(/.test(readFileSync(join(root, file), 'utf8')));
		expect(offenders).toEqual([]);
	});

	it('loads without DATABASE_URL and fails the first query with a message that names it', async () => {
		const { prisma } = await import('../../src/utils/prisma.js');
		const saved = process.env.DATABASE_URL;
		delete process.env.DATABASE_URL;
		try {
			await expect(prisma.user.count()).rejects.toThrow(/DATABASE_URL is not set/);
		} finally {
			if (saved !== undefined) process.env.DATABASE_URL = saved;
			await prisma.$disconnect();
		}
	});
});

describe.skipIf(!databaseUrl)('Prisma client against PostgreSQL', () => {
	const altSchema = `prisma_client_test_${process.pid}`;
	const withSchema = (schema) => {
		const url = new URL(databaseUrl);
		url.searchParams.set('schema', schema);
		return url.toString();
	};

	afterAll(async () => {
		const client = new pg.Client({ connectionString: databaseUrl });
		await client.connect();
		await client.query(`DROP SCHEMA IF EXISTS "${altSchema}" CASCADE`);
		await client.end();
	});

	it('writes and reads a row', async () => {
		const { prisma } = await import('../../src/utils/prisma.js');
		const username = `prisma_client_test_${Date.now()}`;
		try {
			const created = await prisma.user.create({ data: { username } });
			const found = await prisma.user.findUnique({ where: { username } });
			expect(found.id).toBe(created.id);
			await prisma.user.delete({ where: { id: created.id } });
			expect(await prisma.user.findUnique({ where: { username } })).toBeNull();
		} finally {
			await prisma.$disconnect();
		}
	});

	it('uses the schema named by ?schema= in DATABASE_URL', async () => {
		execFileSync('npx', ['prisma', 'migrate', 'deploy'], { cwd: root, stdio: 'pipe', env: { ...process.env, DATABASE_URL: withSchema(altSchema) } });

		// Prisma fixes the schema when a client first connects, so this needs a client of its own.
		vi.resetModules();
		const { prisma } = await import('../../src/utils/prisma.js');
		const saved = process.env.DATABASE_URL;
		process.env.DATABASE_URL = withSchema(altSchema);
		const username = `prisma_schema_test_${Date.now()}`;
		try {
			await prisma.user.create({ data: { username } });
		} finally {
			process.env.DATABASE_URL = saved;
			await prisma.$disconnect();
		}

		const client = new pg.Client({ connectionString: databaseUrl });
		await client.connect();
		try {
			const inAlt = await client.query(`SELECT 1 FROM "${altSchema}"."User" WHERE username = $1`, [username]);
			const inPublic = await client.query('SELECT 1 FROM public."User" WHERE username = $1', [username]);
			expect(inAlt.rowCount).toBe(1);
			expect(inPublic.rowCount).toBe(0);
		} finally {
			await client.end();
		}
	}, 120000);
});
