// Copyright (c) 2024-2026 nich (@nichxbt). Licensed under the Apache License, Version 2.0.
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

// Every production dependency ships to every install and every Docker image,
// and each one is attack surface and a stream of security bumps. One nothing
// imports is all cost, so the suite fails when a dependency goes unused.
//
// There are two manifests. package.json is what `npm install xactions` gets,
// so its dependencies must be imported by the published code (src/). The
// self-hosted server's dependencies live in api/package.json, an npm workspace
// the root `npm ci` (and the Docker image) installs and npm never publishes.

const root = new URL('..', import.meta.url).pathname;
const readJson = (path) => JSON.parse(readFileSync(join(root, path), 'utf8'));
const pkg = readJson('package.json');
const server = readJson('api/package.json');

// Used as command-line tools by npm scripts, never imported.
const CLI_ONLY = new Set(['prisma']);

function* sourceFiles(dir) {
	for (const name of readdirSync(dir)) {
		if (name === 'node_modules') continue;
		const path = join(dir, name);
		if (statSync(path).isDirectory()) yield* sourceFiles(path);
		else if (/\.(c|m)?js$/.test(name)) yield path;
	}
}

const read = (paths) =>
	paths.flatMap((path) => {
		const full = join(root, path);
		return statSync(full).isDirectory() ? [...sourceFiles(full)].map((file) => readFileSync(file, 'utf8')) : [readFileSync(full, 'utf8')];
	});

const publishedSources = read(['src']);
const serverSources = read(['api', 'src', 'scripts', 'prisma', 'bin', 'prisma.config.js']);

function isImported(name, sources) {
	const escaped = name.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&');
	const imported = new RegExp(`(?:from|import\\(|importOptional\\(|import|require\\()\\s*['"]${escaped}(?:['"/])`);
	return sources.some((source) => imported.test(source));
}

describe('published dependencies (package.json)', () => {
	it.each(Object.keys(pkg.dependencies))('%s is imported by src/', (name) => {
		expect(isImported(name, publishedSources)).toBe(true);
	});

	it('is a workspace root for the server manifest', () => {
		expect(pkg.workspaces).toContain('api');
		expect(server.private).toBe(true);
	});
});

describe('server dependencies (api/package.json)', () => {
	it.each(Object.keys(server.dependencies).filter((name) => !CLI_ONLY.has(name)))('%s is imported by the server', (name) => {
		expect(isImported(name, serverSources)).toBe(true);
	});

	it('CLI-only dependencies are run by an npm script', () => {
		const scripts = Object.values(pkg.scripts).join('\n');
		for (const name of CLI_ONLY) expect(scripts).toMatch(new RegExp(`\\b${name}\\b`));
	});

	it('keeps the server packages out of the published dependencies', () => {
		const published = new Set([...Object.keys(pkg.dependencies), ...Object.keys(pkg.optionalDependencies || {})]);
		const serverOnly = ['prisma', '@prisma/client', '@prisma/adapter-pg', 'stripe', 'bull', 'socket.io', 'helmet', 'jsonwebtoken', 'bcryptjs'];
		expect(serverOnly.filter((name) => published.has(name))).toEqual([]);
	});
});
