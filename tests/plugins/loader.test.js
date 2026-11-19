// Copyright (c) 2024-2026 nich (@nichxbt). Licensed under the Apache License, Version 2.0.
/**
 * Tests — src/plugins/loader.js: a versioned install spec resolves to the
 * installed package.
 *
 * @author nich (@nichxbt)
 */

import { describe, it, expect } from 'vitest';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { loadPlugin, packageNameFromSpec } from '../../src/plugins/loader.js';

describe('packageNameFromSpec', () => {
  it('drops the version from plain and scoped specs', () => {
    expect(packageNameFromSpec('xactions-plugin-demo@1.2.3')).toBe('xactions-plugin-demo');
    expect(packageNameFromSpec('xactions-plugin-demo')).toBe('xactions-plugin-demo');
    expect(packageNameFromSpec('@xactions/demo@^2.0.0')).toBe('@xactions/demo');
    expect(packageNameFromSpec('@xactions/demo')).toBe('@xactions/demo');
  });
});

describe('loadPlugin', () => {
  it('loads a package installed from a versioned spec', async () => {
    const work = await fs.mkdtemp(path.join(os.tmpdir(), 'xactions-plugin-'));
    const pkgDir = path.join(work, 'node_modules', 'xactions-plugin-demo');
    await fs.mkdir(pkgDir, { recursive: true });
    await fs.writeFile(path.join(work, 'package.json'), '{"name":"host","version":"1.0.0"}');
    await fs.writeFile(path.join(pkgDir, 'package.json'), JSON.stringify({ name: 'xactions-plugin-demo', version: '1.2.3', main: 'index.js', type: 'module' }));
    await fs.writeFile(path.join(pkgDir, 'index.js'), "export default { name: 'demo', version: '1.2.3' };\n");

    const cwd = process.cwd();
    process.chdir(work);
    try {
      const plugin = await loadPlugin('xactions-plugin-demo@1.2.3');
      expect(plugin).toMatchObject({ name: 'demo', version: '1.2.3' });
    } finally {
      process.chdir(cwd);
      await fs.rm(work, { recursive: true, force: true });
    }
  });
});
