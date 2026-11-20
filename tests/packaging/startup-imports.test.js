// Copyright (c) 2024-2026 nich (@nichxbt). Licensed under the Apache License, Version 2.0.
import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { builtinModules } from 'node:module';
import { dirname, join, relative, resolve } from 'node:path';

// `npm install xactions --omit=optional` installs only `dependencies`, and an
// optional peer is never installed at all. So everything a published entry
// point (a `bin` or an `exports` target) loads before it runs a single command
// has to be in `dependencies`. A static `import` of puppeteer, bull or
// nodemailer anywhere on that graph stops the CLI from starting on an install
// that left it out, for a user who only wanted HTTP reads. Those packages are
// imported where they are used, through src/utils/optionalDeps.js.

const root = new URL('../..', import.meta.url).pathname;
const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
const allowed = new Set(Object.keys(pkg.dependencies));
const builtins = new Set(builtinModules);

const STATIC_IMPORT = /^\s*(?:import|export)\s+(?:[\w*{}\s,$]+?\s+from\s*)?['"]([^'"]+)['"]/gm;

function resolveRelative(from, spec) {
	const base = resolve(dirname(from), spec);
	return [base, `${base}.js`, join(base, 'index.js')].find((file) => existsSync(file) && statSync(file).isFile());
}

const packageName = (spec) => (spec.startsWith('@') ? spec.split('/').slice(0, 2).join('/') : spec.split('/')[0]);

/** Every bare package reachable through static imports, mapped to one importer. */
function staticPackages(entries) {
	const seen = new Set();
	const found = new Map();
	const stack = [...entries];
	while (stack.length) {
		const file = stack.pop();
		if (seen.has(file) || !file.endsWith('.js')) continue;
		seen.add(file);
		for (const [, spec] of readFileSync(file, 'utf8').matchAll(STATIC_IMPORT)) {
			if (spec.startsWith('.')) {
				const next = resolveRelative(file, spec);
				if (next) stack.push(next);
			} else if (!spec.startsWith('node:') && !builtins.has(spec.split('/')[0])) {
				const name = packageName(spec);
				if (!found.has(name)) found.set(name, relative(root, file));
			}
		}
	}
	return found;
}

const targets = [...Object.values(pkg.exports).map((target) => (typeof target === 'string' ? target : target.default)), ...Object.values(pkg.bin)];
const entries = [...new Set(targets)].map((target) => join(root, target));

describe('published entry points', () => {
	it.each(entries.map((file) => relative(root, file)))('%s statically imports only `dependencies`', (entry) => {
		const outside = [...staticPackages([join(root, entry)])].filter(([name]) => !allowed.has(name)).map(([name, file]) => `${name} (from ${file})`);
		expect(outside).toEqual([]);
	});

	it('the walker sees the startup graph', () => {
		const names = staticPackages([join(root, 'src/cli/index.js')]);
		expect(names.has('commander')).toBe(true);
		expect(names.has('chalk')).toBe(true);
	});
});
