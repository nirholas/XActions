// Copyright (c) 2024-2026 nich (@nichxbt). Licensed under the Apache License, Version 2.0.
/**
 * The dev container configurations in .devcontainer/.
 *
 * Nothing in CI builds the container, so these tests pin the parts that break
 * silently: a base image off the Node line `engines.node` asks for, a
 * credential committed into a file every fork copies, the editor extension
 * list drifting away from .vscode/extensions.json, and a first-run message
 * that grows past the three lines a new contributor will actually read.
 *
 * @author nich (@nichxbt)
 * @license Apache-2.0
 */
import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { spawnSync } from 'node:child_process';

const root = new URL('../..', import.meta.url).pathname;
const dir = join(root, '.devcontainer');
const read = (path) => readFileSync(join(root, path), 'utf8');
const readJson = (path) => JSON.parse(read(path));

const pkg = readJson('package.json');
const defaultConfig = readJson('.devcontainer/devcontainer.json');
const fullConfig = readJson('.devcontainer/full/devcontainer.json');
const compose = read('.devcontainer/full/compose.yaml');
const dockerfile = read('.devcontainer/Dockerfile');

/** Every file under .devcontainer/, as repository-relative paths. */
function devcontainerFiles(path = dir) {
  return readdirSync(path).flatMap((name) => {
    const full = join(path, name);
    return statSync(full).isDirectory() ? devcontainerFiles(full) : [relative(root, full)];
  });
}

describe('base image', () => {
  it('is the maintained devcontainers Node image, pinned to an image major and a Node major', () => {
    expect(dockerfile).toMatch(/^FROM mcr\.microsoft\.com\/devcontainers\/javascript-node:\d+-\d+-[a-z]+$/m);
  });

  it('is on the Node major that engines.node names as its floor', () => {
    const nodeMajor = dockerfile.match(/javascript-node:\d+-(\d+)-/)[1];
    const floorMajor = pkg.engines.node.match(/>=\s*(\d+)/)[1];
    expect(nodeMajor).toBe(floorMajor);
  });

  it('installs a system Chromium for Puppeteer instead of downloading one', () => {
    expect(dockerfile).toMatch(/apt-get install[^\n]*\\\n(?:[^\n]*\\\n)*\s+chromium\b/);
    expect(dockerfile).toMatch(/PUPPETEER_EXECUTABLE_PATH=\/usr\/bin\/chromium/);
    expect(dockerfile).toMatch(/PUPPETEER_SKIP_DOWNLOAD=true/);
  });
});

describe('default configuration', () => {
  it('builds from the shared Dockerfile with the GitHub CLI feature', () => {
    expect(defaultConfig.build.dockerfile).toBe('Dockerfile');
    expect(Object.keys(defaultConfig.features)).toContain('ghcr.io/devcontainers/features/github-cli:1');
  });

  it('installs dependencies and links the CLI after creation', () => {
    expect(defaultConfig.postCreateCommand).toBe('bash .devcontainer/post-create.sh');
    const script = read('.devcontainer/post-create.sh');
    expect(script).toMatch(/^npm ci$/m);
    expect(script).toMatch(/^npm link$/m);
  });

  it('starts no services', () => {
    expect(defaultConfig.dockerComposeFile).toBeUndefined();
    expect(defaultConfig.forwardPorts ?? []).toEqual([]);
  });
});

describe('full configuration', () => {
  it('runs the workspace container from the compose file and forwards the API port', () => {
    expect(fullConfig.dockerComposeFile).toBe('compose.yaml');
    expect(fullConfig.service).toBe('app');
    expect(fullConfig.forwardPorts).toContain(3001);
    expect(compose).toMatch(/^\s+dockerfile: Dockerfile$/m);
  });

  it('adds PostgreSQL and Redis on the versions production runs', () => {
    const production = read('docker-compose.yml');
    for (const image of ['postgres', 'redis']) {
      const tag = production.match(new RegExp(`image: (${image}:\\S+)`))[1];
      expect(compose).toContain(`image: ${tag}`);
    }
  });

  it('points the API at both services, by URL and by the host and port the queue modules read', () => {
    expect(compose).toMatch(/DATABASE_URL: postgresql:\/\/xactions@postgres:5432\/xactions\?schema=public/);
    expect(compose).toMatch(/REDIS_URL: redis:\/\/redis:6379/);
    expect(compose).toMatch(/REDIS_HOST: redis/);
    expect(compose).toMatch(/REDIS_PORT: "6379"/);
  });

  it('migrates the database after creation', () => {
    expect(fullConfig.postCreateCommand).toBe('bash .devcontainer/post-create.sh --full');
    expect(read('.devcontainer/post-create.sh')).toMatch(/npx prisma migrate deploy/);
  });

  it('publishes no database or Redis port beyond the compose network', () => {
    expect(compose).not.toMatch(/^\s+ports:/m);
  });
});

describe('editor setup', () => {
  const recommended = readJson('.vscode/extensions.json').recommendations;

  it('recommends the extensions for the tools this repository uses', () => {
    expect(recommended).toEqual(
      expect.arrayContaining(['dbaeumer.vscode-eslint', 'editorconfig.editorconfig', 'vitest.explorer', 'prisma.prisma']),
    );
  });

  it('installs exactly what .vscode/extensions.json recommends, in both configurations', () => {
    expect(defaultConfig.customizations.vscode.extensions).toEqual(recommended);
    expect(fullConfig.customizations.vscode.extensions).toEqual(recommended);
  });
});

describe('first-run message', () => {
  it('is three lines: the quickstart, the tests, and where AGENTS.md is', () => {
    expect(defaultConfig.postAttachCommand).toBe('bash .devcontainer/first-run.sh');
    expect(fullConfig.postAttachCommand).toBe('bash .devcontainer/first-run.sh');
    const run = spawnSync('bash', [join(dir, 'first-run.sh')], { encoding: 'utf8' });
    expect(run.status).toBe(0);
    const lines = run.stdout.trimEnd().split('\n');
    expect(lines).toHaveLength(3);
    expect(lines[0]).toMatch(/xactions quickstart/);
    expect(lines[1]).toMatch(/npm test/);
    expect(lines[2]).toMatch(/AGENTS\.md/);
  });
});

describe('every file under .devcontainer/', () => {
  const files = devcontainerFiles();

  it('carries no credential', () => {
    for (const file of files) {
      const text = read(file);
      expect(text, file).not.toMatch(/PASSWORD\s*[:=]\s*\S/i);
      expect(text, file).not.toMatch(/(SECRET|TOKEN|COOKIE|API_KEY)\s*[:=]\s*["']?[A-Za-z0-9_-]{8,}/);
      expect(text, file).not.toMatch(/auth_token=|ct0=/);
    }
  });

  it('uses neither the em-dash nor the en-dash', () => {
    for (const file of files) expect(read(file), file).not.toMatch(/[–—]/);
  });

  it('has shell scripts that parse', () => {
    for (const file of files.filter((f) => f.endsWith('.sh'))) {
      const check = spawnSync('bash', ['-n', join(root, file)], { encoding: 'utf8' });
      expect(check.status, `${file}: ${check.stderr}`).toBe(0);
    }
  });

  it('includes the README that explains the two configurations', () => {
    expect(existsSync(join(dir, 'README.md'))).toBe(true);
  });
});
