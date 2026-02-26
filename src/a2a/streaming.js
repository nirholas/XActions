/**
 * XActions A2A — SSE Streaming
 *
 * Real-time Server-Sent Events streaming for task progress, results,
 * and agent-to-agent communication.
 *
 * @author nich (@nichxbt)
 * @license MIT
 */

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
    const stream = new Stream(taskId);
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
   */
  constructor(taskId) {
    this.taskId = taskId;
    /** @type {Set<import('http').ServerResponse>} */
    this._clients = new Set();
    this._keepAliveInterval = setInterval(() => this.sendKeepAlive(), 30000);
  }

  /**
   * Add an Express response as an SSE client.
   *
   * @param {import('express').Response} res
   */
  addClient(res) {
    // Set SSE headers
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'X-Accel-Buffering': 'no', // Disable nginx buffering
    });
    // Initial comment
    res.write(': connected\n\n');
    this._clients.add(res);

    // Handle client disconnect
    res.on('close', () => {
      this._clients.delete(res);
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
export function bridgeTaskStream(taskStore, streamManager) {
  taskStore.on((event, taskId, data) => {
    const stream = streamManager.getStream(taskId);
    if (!stream || stream.clientCount === 0) return;

    switch (event) {
      case 'transition':
        stream.send('status', {
          taskId,
          state: data.to,
          previousState: data.from,
          message: data.message,
          timestamp: new Date().toISOString(),
        });
        // Auto-close on terminal states
        if (['completed', 'failed', 'canceled'].includes(data.to)) {
          stream.send('done', { taskId, finalState: data.to });
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
 * @param {import('express').Express} app
 * @param {StreamManager} streamManager
 */
export function attachStreamEndpoint(app, streamManager) {
  app.get('/a2a/tasks/:taskId/stream', (req, res) => {
    const { taskId } = req.params;
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
 * @param {string} agentUrl - Base URL of the remote agent
 * @param {string} taskId
 * @returns {{ events: AsyncGenerator, disconnect: function }}
 */
export function connectToAgentStream(agentUrl, taskId) {
  const url = `${agentUrl.replace(/\/$/, '')}/a2a/tasks/${taskId}/stream`;
  let controller = new AbortController();
  let closed = false;

  async function* eventGenerator() {
    let retryDelay = 1000;
    const maxRetry = 30000;

    while (!closed) {
      try {
        const response = await fetch(url, {
          signal: controller.signal,
          headers: { Accept: 'text/event-stream' },
        });

        if (!response.ok) {
          throw new Error(`SSE connect failed: HTTP ${response.status}`);
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        retryDelay = 1000; // Reset on successful connect

        while (!closed) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          let currentEvent = 'message';
          let currentData = '';

          for (const line of lines) {
            if (line.startsWith('event: ')) {
              currentEvent = line.slice(7).trim();
            } else if (line.startsWith('data: ')) {
              currentData = line.slice(6);
            } else if (line === '' && currentData) {
              try {
                yield { event: currentEvent, data: JSON.parse(currentData) };
              } catch {
                yield { event: currentEvent, data: currentData };
              }
              currentEvent = 'message';
              currentData = '';
            }
          }
        }
      } catch (err) {
        if (closed || err.name === 'AbortError') return;
        console.warn(`⚠️  SSE stream error for ${taskId}: ${err.message}. Retrying in ${retryDelay}ms`);
        await new Promise(r => setTimeout(r, retryDelay));
        retryDelay = Math.min(retryDelay * 2, maxRetry);
      }
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
