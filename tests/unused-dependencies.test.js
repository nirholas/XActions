import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

// Every production dependency ships to every install and every Docker image,
// and each one is attack surface and a stream of security bumps. One nothing
// imports is all cost, so the suite fails when a dependency goes unused.

const root = new URL('..', import.meta.url).pathname;
const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));

// Used as command-line tools by npm scripts, never imported.
const CLI_ONLY = new Set(['prisma']);
const SOURCE_DIRS = ['api', 'src', 'scripts', 'prisma', 'bin'];

function* sourceFiles(dir) {
	for (const name of readdirSync(dir)) {
		if (name === 'node_modules') continue;
		const path = join(dir, name);
		if (statSync(path).isDirectory()) yield* sourceFiles(path);
		else if (/\.(c|m)?js$/.test(name)) yield path;
	}
}

const sources = SOURCE_DIRS.flatMap((dir) => [...sourceFiles(join(root, dir))].map((file) => readFileSync(file, 'utf8')));

describe('production dependencies', () => {
	it.each(Object.keys(pkg.dependencies).filter((name) => !CLI_ONLY.has(name)))('%s is imported somewhere', (name) => {
		const escaped = name.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&');
		const imported = new RegExp(`(?:from|import\\(|require\\()\\s*['"]${escaped}(?:['"/])`);
		expect(sources.some((source) => imported.test(source))).toBe(true);
	});

	it('CLI-only dependencies are run by an npm script', () => {
		const scripts = Object.values(pkg.scripts).join('\n');
		for (const name of CLI_ONLY) expect(scripts).toMatch(new RegExp(`\\b${name}\\b`));
	});
});
