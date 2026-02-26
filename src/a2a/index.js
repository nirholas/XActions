/**
 * XActions A2A — Public API (barrel export)
 *
 * Re-exports every A2A module, provides the one-liner factory
 * `createA2AAgent(options)`, and handles standalone startup when
 * executed directly with `node src/a2a/index.js`.
 *
 * @author nich (@nichxbt)
 * @license MIT
 */

// ── Re-exports ──────────────────────────────────────────────────────────────
export * from './types.js';
export { convertMcpToolToA2aSkill, getSkillCategories, searchSkills, getSkillById, getAllSkills, refreshSkills } from './skillRegistry.js';
export { generateAgentCard, serveAgentCard, generateMinimalCard, diffCards, fetchRemoteAgentCard, clearCardCache } from './agentCard.js';
export { TaskStore, TaskExecutor, createTaskManager } from './taskManager.js';
export { createBridge } from './bridge.js';
export { StreamManager, bridgeTaskStream, attachStreamEndpoint, connectToAgentStream } from './streaming.js';
export { PushNotificationServer, PushNotificationClient, SubscriptionManager } from './push.js';
export { createAuthMiddleware, generateApiKey, verifyApiKey, createJWT, verifyJWT, storeCredential, applyAuth, PERMISSIONS } from './auth.js';
export { AgentRegistry, SkillMatcher, TrustScorer, createDiscovery } from './discovery.js';
export { TaskDecomposer, Delegator, Orchestrator, createOrchestrator } from './orchestrator.js';
export { createA2AServer } from './server.js';

// ── Convenience Factory ─────────────────────────────────────────────────────

/**
 * Create a fully wired A2A agent with one call.
 *
 * @param {object} [options={}]
 * @param {number} [options.port=3100]
 * @param {string} [options.sessionCookie]
 * @param {boolean} [options.enableAuth=true]
 * @param {boolean} [options.enableRateLimit=true]
 * @param {string} [options.mode='local']
 * @param {string} [options.apiUrl]
 * @returns {{ start: function, shutdown: function, app: import('express').Application, taskStore: *, bridge: *, orchestrator: *, discovery: * }}
 */
export function createA2AAgent(options = {}) {
  const { createA2AServer: create } = await_lazy();
  return create(options);
}

// Lazy import helper to avoid circular deps at module-init time
function await_lazy() {
  // server.js pulls in everything it needs, so just re-use it
  return { createA2AServer };
}

// ── Standalone startup ───────────────────────────────────────────────────────

const isMain = process.argv[1]?.endsWith('a2a/index.js') || process.argv[1]?.endsWith('a2a/index');

if (isMain) {
  (async () => {
    const args = parseArgs(process.argv.slice(2));

    if (args.help) {
      printUsage();
      process.exit(0);
    }

    console.log('⚡ XActions A2A Agent — starting...');

    const agent = createA2AServer({
      port: args.port,
      sessionCookie: args.cookie || process.env.X_SESSION_COOKIE,
      enableAuth: !args.noAuth,
    });

    await agent.start(args.port);

    // Graceful shutdown
    const onSignal = () => {
      console.log('\n🛑 Shutting down A2A agent...');
      agent.shutdown();
      process.exit(0);
    };
    process.on('SIGINT', onSignal);
    process.on('SIGTERM', onSignal);
  })();
}

// ── CLI Argument Parser ──────────────────────────────────────────────────────

function parseArgs(argv) {
  const args = { port: 3100, cookie: '', noAuth: false, help: false };
  for (let i = 0; i < argv.length; i++) {
    switch (argv[i]) {
      case '--port': case '-p': args.port = parseInt(argv[++i], 10); break;
      case '--cookie': case '-c': args.cookie = argv[++i]; break;
      case '--no-auth': args.noAuth = true; break;
      case '--help': case '-h': args.help = true; break;
    }
  }
  return args;
}

function printUsage() {
  console.log(`
  XActions A2A Agent

  Usage:
    node src/a2a/index.js [options]

  Options:
    -p, --port <port>    Port to listen on (default: 3100)
    -c, --cookie <val>   X session cookie for browser automation
    --no-auth            Disable authentication
    -h, --help           Show this help
  `);
}

// ── CLI Integration Helper ──────────────────────────────────────────────────

/**
 * Register A2A sub-commands on a Commander program.
 * Called by the main CLI in src/cli/index.js.
 *
 * @param {import('commander').Command} program
 */
export function registerA2ACommands(program) {
  const a2a = program.command('a2a').description('A2A multi-agent protocol');

  a2a.command('start')
    .description('Start the A2A agent server')
    .option('-p, --port <port>', 'Port', '3100')
    .option('-c, --cookie <cookie>', 'X session cookie')
    .option('--no-auth', 'Disable auth')
    .action(async (opts) => {
      const agent = createA2AServer({
        port: parseInt(opts.port, 10),
        sessionCookie: opts.cookie || process.env.X_SESSION_COOKIE,
        enableAuth: opts.auth !== false,
      });
      await agent.start();

      const onSignal = () => { agent.shutdown(); process.exit(0); };
      process.on('SIGINT', onSignal);
      process.on('SIGTERM', onSignal);
    });

  a2a.command('status')
    .description('Check A2A agent health')
    .option('-u, --url <url>', 'Agent URL', 'http://localhost:3100')
    .action(async (opts) => {
      try {
        const res = await fetch(`${opts.url}/a2a/health`);
        const data = await res.json();
        console.log(JSON.stringify(data, null, 2));
      } catch (err) {
        console.error(`Agent unreachable: ${err.message}`);
        process.exitCode = 1;
      }
    });

  a2a.command('skills')
    .description('List available skills')
    .option('-u, --url <url>', 'Agent URL', 'http://localhost:3100')
    .option('-q, --query <query>', 'Search query')
    .action(async (opts) => {
      try {
        const qs = opts.query ? `?q=${encodeURIComponent(opts.query)}` : '';
        const res = await fetch(`${opts.url}/a2a/skills${qs}`);
        const data = await res.json();
        for (const s of data.skills) {
          console.log(`  ${s.id}  —  ${s.name}`);
        }
        console.log(`\n  ${data.total} skills`);
      } catch (err) {
        console.error(`Failed: ${err.message}`);
        process.exitCode = 1;
      }
    });

  a2a.command('agents')
    .description('List discovered agents')
    .option('-u, --url <url>', 'Agent URL', 'http://localhost:3100')
    .action(async (opts) => {
      try {
        const res = await fetch(`${opts.url}/a2a/agents`);
        const data = await res.json();
        if (data.agents.length === 0) {
          console.log('  No agents discovered.');
        } else {
          for (const a of data.agents) {
            console.log(`  ${a.card?.name || a.url}  —  ${a.url}`);
          }
        }
        console.log(`\n  ${data.total} agents`);
      } catch (err) {
        console.error(`Failed: ${err.message}`);
        process.exitCode = 1;
      }
    });

  a2a.command('discover <url>')
    .description('Discover and register a remote agent')
    .action(async (url) => {
      try {
        const res = await fetch('http://localhost:3100/a2a/agents/discover', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ urls: [url] }),
        });
        const data = await res.json();
        console.log(JSON.stringify(data, null, 2));
      } catch (err) {
        console.error(`Failed: ${err.message}`);
        process.exitCode = 1;
      }
    });

  a2a.command('task <description>')
    .description('Send a task to the A2A agent')
    .option('-u, --url <url>', 'Agent URL', 'http://localhost:3100')
    .action(async (description, opts) => {
      try {
        const res = await fetch(`${opts.url}/a2a/tasks`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            jsonrpc: '2.0',
            method: 'tasks/send',
            params: {
              message: {
                role: 'user',
                parts: [{ type: 'text', text: description }],
              },
            },
            id: `cli-${Date.now()}`,
          }),
        });
        const data = await res.json();
        console.log(JSON.stringify(data, null, 2));
      } catch (err) {
        console.error(`Failed: ${err.message}`);
        process.exitCode = 1;
      }
    });
}
