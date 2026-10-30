// Copyright (c) 2024-2026 nich (@nichxbt). Licensed under the Apache License, Version 2.0.
/**
 * Tests: the `xactions-mcp` wrapper package (packages/xactions-mcp) starts a
 * working stdio MCP server.
 *
 * src/mcp/server.js only starts itself when it is the process entry point, so
 * importing it must be followed by an explicit main() call. The wrapper used to
 * rely on the import alone and `npx xactions-mcp` hung without answering.
 *
 * The wrapper resolves `xactions/mcp` as a dependency. NODE_PATH points that
 * lookup at this checkout, so the test runs what the next publish ships.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { spawn } from 'node:child_process';
import { mkdtempSync, rmSync, symlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const root = new URL('../..', import.meta.url).pathname;
const bin = join(root, 'packages', 'xactions-mcp', 'bin.js');

let modules;

beforeAll(() => {
	modules = mkdtempSync(join(tmpdir(), 'xactions-mcp-wrapper-'));
	symlinkSync(root, join(modules, 'xactions'), 'dir');
});

afterAll(() => rmSync(modules, { recursive: true, force: true }));

/** Sends each request once the previous one is answered; resolves with every response. */
function converse(requests, { timeout = 30000 } = {}) {
	const child = spawn(process.execPath, [bin], {
		env: { ...process.env, NODE_PATH: modules, MCP_TRANSPORT: 'stdio' },
		stdio: ['pipe', 'pipe', 'pipe'],
	});
	return new Promise((resolve, reject) => {
		const responses = [];
		let buffer = '';
		let stderr = '';
		const timer = setTimeout(() => {
			child.kill();
			reject(new Error(`no response to ${requests[responses.length].method} within ${timeout}ms. stderr:\n${stderr}`));
		}, timeout);
		const next = () => {
			if (responses.length === requests.length) {
				clearTimeout(timer);
				child.kill();
				resolve(responses);
				return;
			}
			child.stdin.write(JSON.stringify(requests[responses.length]) + '\n');
		};
		child.stderr.on('data', (chunk) => { stderr += chunk; });
		child.stdout.on('data', (chunk) => {
			buffer += chunk;
			let newline;
			while ((newline = buffer.indexOf('\n')) !== -1) {
				const line = buffer.slice(0, newline).trim();
				buffer = buffer.slice(newline + 1);
				if (!line) continue;
				const message = JSON.parse(line);
				if (message.id === undefined) continue;
				responses.push(message);
				next();
			}
		});
		child.on('error', reject);
		next();
	});
}

describe('xactions-mcp wrapper', () => {
	it('answers initialize and lists tools over stdio', async () => {
		const [init, list] = await converse([
			{ jsonrpc: '2.0', id: 1, method: 'initialize', params: { protocolVersion: '2025-06-18', capabilities: {}, clientInfo: { name: 'wrapper-test', version: '1.0.0' } } },
			{ jsonrpc: '2.0', id: 2, method: 'tools/list' },
		]);
		expect(init.result.serverInfo.name).toBeTruthy();
		expect(list.result.tools.length).toBeGreaterThan(0);
		expect(list.result.tools.every((tool) => typeof tool.name === 'string')).toBe(true);
	}, 60000);
});
