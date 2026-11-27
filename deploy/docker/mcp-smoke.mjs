#!/usr/bin/env node
// Copyright (c) 2024-2026 nich (@nichxbt). Licensed under the Apache License, Version 2.0.
/**
 * MCP stdio smoke test: start a server command, send `initialize`, the
 * `notifications/initialized` notification and `tools/list`, and check both
 * answers.
 *
 *   node deploy/docker/mcp-smoke.mjs -- docker run -i --rm xactions-cli:dev mcp
 *   node deploy/docker/mcp-smoke.mjs -- node src/mcp/server.js
 *
 * Plain Node with no dependencies, so a CI runner can drive the container
 * without installing the project first. Exits 0 and prints one summary line
 * when the server names itself and lists at least one tool; exits 1 with the
 * reason and the server's stderr otherwise.
 *
 * @author nich (@nichxbt)
 * @license Apache-2.0
 */

import { spawn } from 'node:child_process';

const TIMEOUT_MS = Number(process.env.MCP_SMOKE_TIMEOUT_MS || 120000);

const sep = process.argv.indexOf('--');
const command = sep === -1 ? [] : process.argv.slice(sep + 1);
if (command.length === 0) {
  console.error('Usage: node deploy/docker/mcp-smoke.mjs -- <server command...>');
  process.exit(2);
}

const child = spawn(command[0], command.slice(1), { stdio: ['pipe', 'pipe', 'pipe'] });
let stderr = '';
child.stderr.on('data', (chunk) => { stderr += chunk; });

/** @type {Map<number, (message: any) => void>} */
const pending = new Map();
let buffer = '';
child.stdout.on('data', (chunk) => {
  buffer += chunk;
  let newline;
  while ((newline = buffer.indexOf('\n')) !== -1) {
    const line = buffer.slice(0, newline).trim();
    buffer = buffer.slice(newline + 1);
    if (!line) continue;
    let message;
    try {
      message = JSON.parse(line);
    } catch {
      fail(`the server wrote a non-JSON line to stdout, which breaks stdio MCP: ${line.slice(0, 200)}`);
      return;
    }
    const resolve = pending.get(message.id);
    if (resolve) {
      pending.delete(message.id);
      resolve(message);
    }
  }
});

child.on('exit', (code, signal) => {
  if (pending.size > 0) fail(`the server exited (code ${code}, signal ${signal}) before answering`);
});
child.on('error', (error) => fail(`could not start ${command[0]}: ${error.message}`));

const timer = setTimeout(() => fail(`no answer within ${TIMEOUT_MS} ms`), TIMEOUT_MS);

function fail(reason) {
  clearTimeout(timer);
  console.error(`MCP smoke test failed: ${reason}`);
  if (stderr.trim()) console.error(`--- server stderr ---\n${stderr.trim()}`);
  child.kill('SIGKILL');
  process.exit(1);
}

let nextId = 1;
function request(method, params) {
  const id = nextId++;
  return new Promise((resolve) => {
    pending.set(id, resolve);
    child.stdin.write(`${JSON.stringify({ jsonrpc: '2.0', id, method, params })}\n`);
  });
}

const init = await request('initialize', {
  protocolVersion: '2025-06-18',
  capabilities: {},
  clientInfo: { name: 'xactions-mcp-smoke', version: '1' },
});
if (init.error || !init.result?.serverInfo?.name) {
  fail(`initialize returned ${JSON.stringify(init.error || init.result)}`);
}
child.stdin.write(`${JSON.stringify({ jsonrpc: '2.0', method: 'notifications/initialized' })}\n`);

const list = await request('tools/list', {});
const tools = list.result?.tools;
if (list.error || !Array.isArray(tools) || tools.length === 0) {
  fail(`tools/list returned ${JSON.stringify(list.error || list.result)}`);
}

clearTimeout(timer);
const { name, version } = init.result.serverInfo;
console.log(`initialize ok: ${name} ${version}, protocol ${init.result.protocolVersion}; tools/list ok: ${tools.length} tools`);
child.stdin.end();
child.kill('SIGTERM');
process.exit(0);
