// Copyright (c) 2024-2026 nich (@nichxbt). Licensed under the Apache License, Version 2.0.
/**
 * Tests: types/xapi.d.ts against the runtime surface of src/xapi/index.js
 *
 * `xactions/xapi` resolves its types from types/xapi.d.ts (package.json
 * exports, "types" condition). A hand-written declaration file drifts, so
 * this pins the declared names to the runtime exports in both directions:
 * every runtime export has a declaration, and every declared value exists at
 * runtime. Interfaces and type aliases are exempt from the second check
 * because they have no runtime value.
 *
 * It also compiles tests/types/xapi-consumer.ts with the repo's TypeScript,
 * so a declaration that parses but does not type-check fails here too.
 *
 * @author nich (@nichxbt)
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '../..');
const DTS_PATH = path.join(ROOT, 'types/xapi.d.ts');
const TYPE_ONLY_KINDS = new Set(['interface', 'type']);

function parseDeclaredExports(source) {
  const declared = new Map();
  const declPattern = /^export\s+(?:declare\s+)?(function|const|let|var|class|abstract class|interface|type|enum|namespace)\s+([A-Za-z_$][\w$]*)/gm;
  for (const match of source.matchAll(declPattern)) {
    declared.set(match[2], match[1] === 'abstract class' ? 'class' : match[1]);
  }
  return declared;
}

const runtime = await import('../../src/xapi/index.js');
const runtimeNames = Object.keys(runtime).sort();
const declared = parseDeclaredExports(readFileSync(DTS_PATH, 'utf8'));
const pkg = JSON.parse(readFileSync(path.join(ROOT, 'package.json'), 'utf8'));

describe('types/xapi.d.ts matches the runtime exports of src/xapi/index.js', () => {
  it('is the types condition of the ./xapi export', () => {
    expect(pkg.exports['./xapi']).toEqual({ types: './types/xapi.d.ts', default: './src/xapi/index.js' });
  });

  it('declares a type for every runtime export', () => {
    expect(runtimeNames.length).toBeGreaterThan(30);
    const missing = runtimeNames.filter((name) => !declared.has(name));
    expect(missing).toEqual([]);
  });

  it('declares no value that does not exist at runtime', () => {
    const phantom = [...declared]
      .filter(([, kind]) => !TYPE_ONLY_KINDS.has(kind))
      .map(([name]) => name)
      .filter((name) => !(name in runtime));
    expect(phantom).toEqual([]);
  });

  it('declares each runtime value with a matching kind', () => {
    const wrong = runtimeNames.filter((name) => {
      const kind = declared.get(name);
      const value = runtime[name];
      if (typeof value === 'function') return /^class\s/.test(Function.prototype.toString.call(value)) ? kind !== 'class' : kind !== 'function';
      return kind !== 'const';
    });
    expect(wrong).toEqual([]);
  });

  it('type-checks a consumer that uses the declared surface', () => {
    const require = createRequire(import.meta.url);
    const tsPkg = require.resolve('typescript/package.json');
    const tsc = path.join(path.dirname(tsPkg), JSON.parse(readFileSync(tsPkg, 'utf8')).bin.tsc);
    const run = () =>
      execFileSync(process.execPath, [tsc, '--noEmit', '--strict', '--target', 'es2022', '--module', 'nodenext', '--moduleResolution', 'nodenext', '--skipLibCheck', 'false', path.join(__dirname, 'xapi-consumer.ts')], {
        cwd: ROOT,
        encoding: 'utf8',
        stdio: 'pipe',
      });
    let output = '';
    try {
      run();
    } catch (err) {
      output = `${err.stdout ?? ''}${err.stderr ?? ''}`;
    }
    expect(output).toBe('');
  }, 60_000);
});
