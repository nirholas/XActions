import { describe, it, expect } from 'vitest';
import { createRequire } from 'node:module';

// deepmerge <= 4.3.1 lets an own "__proto__" key (any JSON.parse output) replace
// the prototype of the merged result (GHSA-gcqx-w48m-w2h4, no upstream fix).
// puppeteer-extra pulls it in, so package.json overrides it with vendor/deepmerge.

// Resolve deepmerge the way its real consumers do, so the test proves they get the patched copy.
const require = createRequire(import.meta.url);
const consumers = ['puppeteer-extra', 'puppeteer-extra-plugin-user-preferences'];
const fromConsumer = (name) => createRequire(require.resolve(name));
const deepmerge = fromConsumer(consumers[0])('deepmerge');

describe('deepmerge (vendored, GHSA-gcqx-w48m-w2h4)', () => {
	it('vendored source is tracked by git, so clones and the Docker build get it', () => {
		const vendored = require('node:path').join(import.meta.dirname, '..', 'vendor', 'deepmerge', 'index.js');
		const tracked = require('node:child_process').execFileSync('git', ['ls-files', '--error-unmatch', vendored], { encoding: 'utf8' });
		expect(tracked.trim()).toMatch(/vendor\/deepmerge\/index\.js$/);
	});

	it.each(consumers)('%s resolves the vendored copy', (name) => {
		const resolved = fromConsumer(name).resolve('deepmerge');
		expect(fromConsumer(name)(resolved)).toBe(deepmerge);
		expect(require('node:fs').realpathSync(resolved)).toMatch(/vendor[\\/]deepmerge[\\/]index\.js$/);
	});

	it('does not let a parsed __proto__ key in the target poison the result', () => {
		const target = JSON.parse('{"__proto__": {"polluted": "target"}, "keep": 1}');
		const out = deepmerge(target, {});
		expect(Object.getPrototypeOf(out)).toBe(Object.prototype);
		expect(out.polluted).toBeUndefined();
		expect(out.keep).toBe(1);
	});

	it('does not let a parsed __proto__ key in the source poison the result', () => {
		const target = Object.create(null);
		target.a = 1;
		const out = deepmerge(target, JSON.parse('{"__proto__": {"polluted": "source"}}'));
		expect(Object.getPrototypeOf(out)).toBe(Object.prototype);
		expect(out.polluted).toBeUndefined();
		expect(out.a).toBe(1);
	});

	it('leaves the global Object prototype untouched', () => {
		deepmerge({}, JSON.parse('{"__proto__": {"globalPolluted": true}}'));
		expect({}.globalPolluted).toBeUndefined();
	});

	it('keeps normal deep merge behaviour', () => {
		expect(deepmerge({ a: { b: 1 }, l: [1] }, { a: { c: 2 }, l: [2] })).toEqual({ a: { b: 1, c: 2 }, l: [1, 2] });
		expect(deepmerge.all([{ a: 1 }, { b: 2 }, { a: 3 }])).toEqual({ a: 3, b: 2 });
	});
});
