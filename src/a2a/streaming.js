// Copyright (c) 2024-2026 nich (@nichxbt). Licensed under the Apache License, Version 2.0.
/**
 * XActions A2A — SSE Streaming
 *
 * Real-time Server-Sent Events streaming for task progress, results,
 * and agent-to-agent communication.
 *
 * @author nich (@nichxbt)
 * @license Apache-2.0
 */

import { applyAuth } from './auth.js';

// ============================================================================
// StreamManager
// ============================================================================

export class StreamManager {
  constructor() {
    /** @type {Map<string, Stream>} taskId → Stream */
    this._streams = new Map();
  }

  /**
   * Create a new SSE stream for a task.
   *
   * @param {string} taskId
   * @returns {Stream}
   */
  createStream(taskId) {
    if (this._streams.has(taskId)) return this._streams.get(taskId);
    // A stream whose last client leaves is dropped, so its keep-alive timer
    // does not outlive everyone who was listening.
    const stream = new Stream(taskId, () => {
      if (this._streams.get(taskId) === stream) this.closeStream(taskId);
    });
    this._streams.set(taskId, stream);
    return stream;
  }

  /**
   * Get an existing stream.
   *
   * @param {string} taskId
   * @returns {Stream|null}
   */
  getStream(taskId) {
    return this._streams.get(taskId) || null;
  }

  /**
   * Close and remove a stream.
   *
   * @param {string} taskId
   */
  closeStream(taskId) {
    const stream = this._streams.get(taskId);
    if (stream) {
      stream.close();
      this._streams.delete(taskId);
    }
  }

  /**
   * Close all streams (for graceful shutdown).
   */
  closeAll() {
    for (const [id, stream] of this._streams) {
      stream.close();
    }
    this._streams.clear();
  }

  /**
   * Number of active streams.
   */
  get size() {
    return this._streams.size;
  }
}

// ============================================================================
// Stream — Single task SSE stream
// ============================================================================

class Stream {
  /**
   * @param {string} taskId
   * @param {function} [onEmpty] called when the last client disconnects
   */
  constructor(taskId, onEmpty) {
    this.taskId = taskId;
    this._onEmpty = onEmpty;
    /** @type {Set<import('http').ServerResponse>} */
    this._clients = new Set();
    this._keepAliveInterval = setInterval(() => this.sendKeepAlive(), 30000);
    this._keepAliveInterval.unref?.();
  }

  /**
   * Add an Express response as an SSE client.
   *
   * @param {import('express').Response} res
   */
  addClient(res) {
    // Set SSE headers
    // CORS is decided by the server's origin allowlist middleware, which has
    // already set its headers on `res`; the stream adds none of its own.
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no', // Disable nginx buffering
    });
    // Initial comment
    res.write(': connected\n\n');
    this._clients.add(res);

    // Handle client disconnect
    res.on('close', () => {
      this._clients.delete(res);
      if (this._clients.size === 0) this._onEmpty?.();
    });
  }

  /**
   * Remove a client.
   *
   * @param {import('express').Response} res
   */
  removeClient(res) {
    this._clients.delete(res);
  }

  /**
   * Send an SSE event to all connected clients.
   *
   * @param {string} event - Event type (status, progress, artifact, message, error, done)
   * @param {object} data - Event payload
   */
  send(event, data) {
    const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
    for (const client of this._clients) {
      try {
        client.write(payload);
      } catch {
        this._clients.delete(client);
      }
    }
  }

  /**
   * Send a keep-alive comment.
   */
  sendKeepAlive() {
    for (const client of this._clients) {
      try {
        client.write(': keepalive\n\n');
      } catch {
        this._clients.delete(client);
      }
    }
  }

  /**
   * Number of connected clients.
   */
  get clientCount() {
    return this._clients.size;
  }

  /**
   * Close the stream — end all client connections and stop keep-alive.
   */
  close() {
    clearInterval(this._keepAliveInterval);
    for (const client of this._clients) {
      try { client.end(); } catch { /* ignore */ }
    }
    this._clients.clear();
  }
}

// ============================================================================
// TaskStreamBridge — Connect task lifecycle to SSE
// ============================================================================

/**
 * Bridge task lifecycle events to SSE streams.
 *
 * @param {import('./taskManager.js').TaskStore} taskStore
 * @param {StreamManager} streamManager
 */
const TERMINAL_STATES = ['completed', 'failed', 'canceled'];

export function bridgeTaskStream(taskStore, streamManager) {
  taskStore.on((event, taskId, data) => {
    const stream = streamManager.getStream(taskId);
    if (!stream) return;

    switch (event) {
      case 'transition':
        stream.send('status', {
          taskId,
          state: data.to,
          previousState: data.from,
          message: data.message,
          timestamp: new Date().toISOString(),
        });
        // A terminal state is the last event: send done, then end every
        // client connection and drop the stream and its keep-alive timer.
        if (TERMINAL_STATES.includes(data.to)) {
          stream.send('done', { taskId, finalState: data.to });
          streamManager.closeStream(taskId);
        }
        break;

      case 'artifact':
        stream.send('artifact', {
          taskId,
          artifactIndex: data.index ?? 0,
          part: data,
        });
        break;

      case 'message':
        stream.send('message', {
          taskId,
          role: data.role,
          parts: data.parts,
        });
        break;

      default:
        break;
    }
  });
}

/**
 * Attach the SSE stream endpoint to an Express app.
 *
 * With a task store, a stream is only opened for a task that exists (404
 * otherwise), and a task that has already finished gets its final status and
 * `done` at once instead of a connection that never closes.
 *
 * @param {import('express').Express} app
 * @param {StreamManager} streamManager
 * @param {import('./taskManager.js').TaskStore} [taskStore]
 */
export function attachStreamEndpoint(app, streamManager, taskStore) {
  app.get('/a2a/tasks/:taskId/stream', async (req, res) => {
    const { taskId } = req.params;
    if (taskStore) {
      const task = await taskStore.get(taskId);
      if (!task) {
        return res.status(404).json({
          jsonrpc: '2.0',
          error: { code: -32001, message: 'Task not found' },
          id: null,
        });
      }
      const state = task.status?.state;
      if (TERMINAL_STATES.includes(state)) {
        res.writeHead(200, {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'X-Accel-Buffering': 'no',
        });
        res.write(`event: status\ndata: ${JSON.stringify({ taskId, state, message: task.status.message, timestamp: task.status.timestamp })}\n\n`);
        res.write(`event: done\ndata: ${JSON.stringify({ taskId, finalState: state })}\n\n`);
        return res.end();
      }
    }
    const stream = streamManager.createStream(taskId);
    stream.addClient(res);
  });
}

// ============================================================================
// SSE Client — Consume another agent's SSE stream
// ============================================================================

/**
 * Connect to a remote agent's SSE task stream.
 *
 * The generator ends after the remote task's `done` event. A connection the
 * server closes early is retried with exponential backoff; a 4xx other than
 * 429 ends the generator with an error.
 *
 * @param {string} agentUrl - Base URL of the remote agent
 * @param {string} taskId
 * @param {{ initialRetryMs?: number, maxRetryMs?: number }} [options]
 * @returns {{ events: AsyncGenerator, disconnect: function }}
 */
export function connectToAgentStream(agentUrl, taskId, options = {}) {
  const url = `${agentUrl.replace(/\/$/, '')}/a2a/tasks/${taskId}/stream`;
  const { initialRetryMs = 1000, maxRetryMs = 30000 } = options;
  const controller = new AbortController();
  let closed = false;

  const sleep = (ms) => new Promise((resolve) => {
    const timer = setTimeout(resolve, ms);
    controller.signal.addEventListener('abort', () => { clearTimeout(timer); resolve(); }, { once: true });
  });

  async function* eventGenerator() {
    let retryDelay = initialRetryMs;

    while (!closed) {
      let finished = false;
      try {
        const headers = { Accept: 'text/event-stream' };
        await applyAuth(headers, agentUrl);
        const response = await fetch(url, { signal: controller.signal, headers });

        if (!response.ok) {
          // A missing task or a refused credential will not fix itself on a
          // retry; only 429 and 5xx are worth trying again.
          if (response.status !== 429 && response.status < 500) {
            throw Object.assign(new Error(`SSE connect failed: HTTP ${response.status}`), { fatal: true });
          }
          throw new Error(`SSE connect failed: HTTP ${response.status}`);
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        retryDelay = initialRetryMs; // Reset on successful connect

        // Parse state lives for the whole connection, not one network chunk:
        // an event split across two reads is still assembled whole.
        let currentEvent = 'message';
        let dataLines = [];

        while (!closed && !finished) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const rawLine of lines) {
            const line = rawLine.endsWith('\r') ? rawLine.slice(0, -1) : rawLine;
            if (line.startsWith('event:')) {
              currentEvent = line.slice(6).trim();
            } else if (line.startsWith('data:')) {
              dataLines.push(line.slice(5).replace(/^ /, ''));
            } else if (line === '') {
              if (dataLines.length > 0) {
                const raw = dataLines.join('\n');
                let data;
                try { data = JSON.parse(raw); } catch { data = raw; }
                yield { event: currentEvent, data };
                if (currentEvent === 'done') {
                  finished = true;
                  break;
                }
              }
              currentEvent = 'message';
              dataLines = [];
            }
          }
        }
        if (finished) {
          // The task reached a terminal state; there is nothing left to hear.
          closed = true;
          try { await reader.cancel(); } catch { /* already closed */ }
          return;
        }
        if (closed) return;
        // The server closed the stream before `done`: reconnect, with the
        // same backoff as an error so a server that keeps hanging up is not
        // hammered.
      } catch (err) {
        if (closed || err.name === 'AbortError') return;
        if (err.fatal) throw err;
        console.warn(`⚠️  SSE stream error for ${taskId}: ${err.message}. Retrying in ${retryDelay}ms`);
      }
      await sleep(retryDelay);
      retryDelay = Math.min(retryDelay * 2, maxRetryMs);
    }
  }

  return {
    events: eventGenerator(),
    disconnect() {
      closed = true;
      controller.abort();
    },
  };
}
