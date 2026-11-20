// Copyright (c) 2024-2026 nich (@nichxbt). Licensed under the Apache License, Version 2.0.
import { describe, it, expect } from 'vitest';
import { importOptional, isMissingPackage, MissingDependencyError, loadStealthPuppeteer } from '../../src/utils/optionalDeps.js';

describe('importOptional', () => {
	it('returns the module when the package is installed', async () => {
		const mod = await importOptional('commander', { feature: 'The CLI' });
		expect(typeof mod.Command).toBe('function');
	});

	it('names the package and the install command when it is missing', async () => {
		const err = await importOptional('xactions-no-such-package-4b1d', { feature: 'Email notifications' }).catch((e) => e);
		expect(err).toBeInstanceOf(MissingDependencyError);
		expect(err.code).toBe('XACTIONS_MISSING_DEPENDENCY');
		expect(err.package).toBe('xactions-no-such-package-4b1d');
		expect(err.message).toBe(
			'Email notifications needs the "xactions-no-such-package-4b1d" package, which is not installed. Install it with: npm install xactions-no-such-package-4b1d',
		);
	});

	it('uses the scoped package name for a subpath, and a custom install command', async () => {
		const err = await importOptional('@xactions-none/pkg/sub/path', { feature: 'X', install: 'npm install a b' }).catch((e) => e);
		expect(err.package).toBe('@xactions-none/pkg');
		expect(err.message).toMatch(/Install it with: npm install a b$/);
	});
});

describe('isMissingPackage', () => {
	it('matches only a missing-module error that names the package', () => {
		const missing = Object.assign(new Error("Cannot find package 'bull' imported from /x/y.js"), { code: 'ERR_MODULE_NOT_FOUND' });
		expect(isMissingPackage(missing, 'bull')).toBe(true);
		// A dependency of the package is what is missing: not the same failure.
		expect(isMissingPackage(missing, 'bul')).toBe(false);
		expect(isMissingPackage(new Error("Cannot find package 'bull'"), 'bull')).toBe(false);
		expect(isMissingPackage(undefined, 'bull')).toBe(false);
	});
});

describe('loadStealthPuppeteer', () => {
	it('loads puppeteer-extra with the stealth plugin once and shares it', async () => {
		const first = await loadStealthPuppeteer();
		expect(typeof first.launch).toBe('function');
		expect(first.plugins.map((plugin) => plugin.name)).toContain('stealth');
		expect(await loadStealthPuppeteer()).toBe(first);
	});
});
