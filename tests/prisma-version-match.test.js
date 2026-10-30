import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

const major = (range) => Number(String(range).replace(/^[^\d]*/, '').split('.')[0]);
const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));

describe('prisma toolchain', () => {
	it('keeps @prisma/client and the prisma CLI on the same major version', () => {
		const client = pkg.dependencies['@prisma/client'];
		const cli = (pkg.devDependencies || {}).prisma ?? pkg.dependencies.prisma;
		expect(major(client)).toBe(major(cli));
	});

	it('generates the client without error', async () => {
		const { execFileSync } = await import('node:child_process');
		expect(() =>
			execFileSync('npx', ['prisma', 'generate'], { stdio: 'pipe', env: { ...process.env, DATABASE_URL: 'postgresql://u:p@localhost:5432/d' } }),
		).not.toThrow();
	}, 120000);
});
