// Copyright (c) 2024-2026 nich (@nichxbt). Licensed under the Apache License, Version 2.0.
import { describe, expect, it } from 'vitest';
import { compareVersions, versionProblems } from '../../scripts/check-release.mjs';

describe('compareVersions', () => {
  it('orders by major, minor, then patch', () => {
    expect(compareVersions('4.0.1', '3.5.0')).toBeGreaterThan(0);
    expect(compareVersions('3.5.0', '4.0.1')).toBeLessThan(0);
    expect(compareVersions('4.10.0', '4.9.9')).toBeGreaterThan(0);
    expect(compareVersions('4.0.1', '4.0.1')).toBe(0);
  });

  it('ranks a prerelease below its release and above the previous release', () => {
    expect(compareVersions('4.1.0-beta.1', '4.1.0')).toBeLessThan(0);
    expect(compareVersions('4.1.0-beta.1', '4.0.1')).toBeGreaterThan(0);
    expect(compareVersions('4.1.0-beta.10', '4.1.0-beta.2')).toBeGreaterThan(0);
    expect(compareVersions('4.1.0-alpha', '4.1.0-beta')).toBeLessThan(0);
  });

  it('rejects strings that are not semver', () => {
    expect(() => compareVersions('latest', '4.0.1')).toThrow(/semver/);
  });
});

describe('versionProblems', () => {
  const registry = { latest: '4.0.1', versions: ['3.5.0', '4.0.0', '4.0.1'] };

  it('refuses the situation main was in: 3.5.0 below a published 4.0.1', () => {
    const [problem] = versionProblems('3.5.0', registry);
    expect(problem).toMatch(/already on npm/);
    expect(versionProblems('3.6.0', registry)[0]).toMatch(/does not sort above npm's latest \(4\.0\.1\)/);
  });

  it('accepts a version above latest', () => {
    expect(versionProblems('4.1.0', registry)).toEqual([]);
    expect(versionProblems('5.0.0-beta.1', registry)).toEqual([]);
  });

  it('accepts the first publish of a new package', () => {
    expect(versionProblems('1.0.0', { versions: [] })).toEqual([]);
  });
});
