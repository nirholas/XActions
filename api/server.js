import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import morgan from 'morgan';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer } from 'http';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Validate required environment variables in production
if (process.env.NODE_ENV === 'production') {
  const required = ['DATABASE_URL', 'JWT_SECRET'];
  const missing = required.filter(key => !process.env[key]);
  if (missing.length > 0) {
    console.error(`❌ Missing required environment variables: ${missing.join(', ')}`);
    process.exit(1);
  }
  // Warn about default secrets
  if (process.env.JWT_SECRET?.includes('change-this')) {
    console.warn('⚠️  Warning: Using default JWT_SECRET - please set a secure value!');
  }
}

import authRoutes from './routes/auth.js';
import userRoutes from './routes/user.js';
import operationRoutes from './routes/operations.js';
import twitterRoutes from './routes/twitter.js';
import sessionAuthRoutes from './routes/session-auth.js';
import licenseRoutes from './routes/license.js';
import adminRoutes from './routes/admin.js';
import webhookRoutes from './routes/webhooks.js';
// AI API routes - modular structure optimized for AI agent consumption
import aiRoutes from './routes/ai/index.js';
// Feature routes - comprehensive X/Twitter feature coverage
import profileRoutes from './routes/profile.js';
import postingRoutes from './routes/posting.js';
import engagementRoutes from './routes/engagement.js';
import discoveryRoutes from './routes/discovery.js';
import messagesRoutes from './routes/messages.js';
import bookmarksRoutes from './routes/bookmarks.js';
import creatorRoutes from './routes/creator.js';
import spacesRoutes from './routes/spaces.js';
import settingsRoutes from './routes/settings.js';
import streamRoutes from './routes/streams.js';
import automationsRoutes from './routes/automations.js';
import analyticsRoutes from './routes/analytics.js';
import workflowRoutes from './routes/workflows.js';
import agentRoutes from './routes/agent.js';
import portabilityRoutes from './routes/portability.js';
import graphRoutes from './routes/graph.js';
import threadRoutes from './routes/thread.js';
import unfollowersRoutes from './routes/unfollowers.js';
import videoRoutes from './routes/video.js';
// Competitive feature routes (09-A through 09-P)
import historyRoutes from './routes/history.js';
import scheduleRoutes from './routes/schedule.js';
import crmRoutes from './routes/crm.js';
import datasetsRoutes from './routes/datasets.js';
import notificationsRoutes from './routes/notifications.js';
import teamsRoutes from './routes/teams.js';
import optimizerRoutes from './routes/optimizer.js';
import { startScheduler } from './services/unfollowerScheduler.js';
import { initializeSocketIO } from './realtime/socketHandler.js';
import { initializeLicensing, brandingMiddleware } from './services/licensing.js';

// Plugin system
import { initializePlugins, getPluginRoutes } from '../src/plugins/index.js';

// Optional: x402 micropayment support for remote AI API (disabled by default)
import { x402Middleware, x402HealthCheck, x402Pricing } from './middleware/x402.js';
import aiDetectorMiddleware from './middleware/ai-detector.js';
import { validateConfig as validateX402Config } from './config/x402-config.js';

const app = express();
const httpServer = createServer(app);

// Initialize Socket.io for real-time browser-to-browser communication
const io = initializeSocketIO(httpServer);

// Make io accessible to routes (for analytics alerts, etc.)
app.set('io', io);

// Make io available to route handlers via app.set
app.set('io', io);

// 42 is the answer to life, the universe, and everything
// But 3001 is the answer to local development
const PORT = process.env.PORT || 3001;

// Security middleware - allow inline scripts for dashboard pages
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "https://cdn.socket.io", "https://cdn.jsdelivr.net"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "wss:", "https:"],
      fontSrc: ["'self'", "https:", "data:"],
      objectSrc: ["'none'"],
      frameSrc: ["'self'"]
    }
  }
}));

// Gzip/brotli compression — reduces HTML/JSON response size ~70%
app.use(compression({ level: 6, threshold: 1024 }));

app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? ['https://xactions.app', process.env.FRONTEND_URL].filter(Boolean)
    : true, // Allow all origins in development
  credentials: true
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});
app.use('/api/', limiter);

// Stricter rate limit for auth endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Only 10 login/register attempts per 15 min
  message: { error: 'Too many attempts, please try again later' }
});
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);

// Logging
app.use(morgan('combined'));

// Body parsing
app.use(express.json({ limit: '10kb' })); // Prevent large payload attacks
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

// AI Agent Detection - adds req.isAI and req.agentType
app.use(aiDetectorMiddleware);

// Optional x402 micropayment middleware (only active if X402_PAY_TO_ADDRESS is set)
app.use(x402Middleware);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', service: 'xactions-api', timestamp: new Date().toISOString() });
});

// SEO files - robots.txt, sitemap.xml, manifest.json
app.get('/robots.txt', (req, res) => {
  res.type('text/plain').sendFile(path.join(__dirname, '../public/robots.txt'));
});

app.get('/sitemap.xml', (req, res) => {
  res.type('application/xml').sendFile(path.join(__dirname, '../public/sitemap.xml'));
});

app.get('/manifest.json', (req, res) => {
  res.type('application/json').sendFile(path.join(__dirname, '../public/manifest.json'));
});

// AI API endpoints
app.get('/api/ai/health', x402HealthCheck);
app.get('/api/ai/pricing', x402Pricing);
app.use('/api/ai', aiRoutes);

// Serve dashboard static files with cache headers
app.use(express.static(path.join(__dirname, '../dashboard'), {
  maxAge: '1h',        // Cache HTML for 1 hour (content changes frequently)
  etag: true,          // Enable ETag for conditional requests
  lastModified: true,
  setHeaders: (res, filePath) => {
    // Long cache for immutable assets (if any)
    if (filePath.endsWith('.png') || filePath.endsWith('.jpg') || filePath.endsWith('.svg') || filePath.endsWith('.ico') || filePath.endsWith('.woff2')) {
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    }
  }
}));

// Branding middleware - injects "Powered by XActions" if no license
app.use(brandingMiddleware());

// Routes
// Payment routes archived - XActions is now 100% free and open-source
app.use('/webhooks', webhookRoutes); // Receive payment notifications
app.use('/api/auth', authRoutes);
app.use('/api/user', userRoutes);
app.use('/api/operations', operationRoutes);
app.use('/api/twitter', twitterRoutes);
app.use('/api/session', sessionAuthRoutes);
app.use('/api/license', licenseRoutes);
app.use('/api/admin', adminRoutes);
// Feature routes
app.use('/api/profile', profileRoutes);
app.use('/api/posting', postingRoutes);
app.use('/api/engagement', engagementRoutes);
app.use('/api/discovery', discoveryRoutes);
app.use('/api/messages', messagesRoutes);
app.use('/api/bookmarks', bookmarksRoutes);
app.use('/api/creator', creatorRoutes);
app.use('/api/spaces', spacesRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/workflows', workflowRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/portability', portabilityRoutes);
app.use('/api/graph', graphRoutes);
app.use('/api/unfollowers', unfollowersRoutes);
app.use('/api/thread', threadRoutes);
app.use('/api/video', videoRoutes);
app.use('/api/agent', agentRoutes);
// Competitive feature routes (09-A through 09-P)
app.use('/api/analytics', historyRoutes); // history, growth, overlap endpoints augment existing analytics
app.use('/api/schedule', scheduleRoutes);
app.use('/api/crm', crmRoutes);
app.use('/api/datasets', datasetsRoutes);
app.use('/api/notifications', notificationsRoutes);
app.use('/api/teams', teamsRoutes);
app.use('/api/optimizer', optimizerRoutes);

// Plugin routes — mounted under /api/plugins/<plugin-name>/
function mountPluginRoutes() {
  const routes = getPluginRoutes();
  for (const route of routes) {
    const pluginName = route._plugin || 'unknown';
    const mountPath = `/api/plugins/${pluginName}${route.path}`;
    const method = (route.method || 'get').toLowerCase();
    if (typeof app[method] === 'function' && typeof route.handler === 'function') {
      app[method](mountPath, route.handler);
    }
  }
}
app.use('/api/automations', automationsRoutes);
app.use('/api/streams', streamRoutes);

// Dashboard routes
// '/' serves the main dashboard — login.html is at /login
// Auth check happens client-side (config.js requireAuth)
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../dashboard/index.html'));
});

app.get('/dashboard', (req, res) => {
  res.sendFile(path.join(__dirname, '../dashboard/index.html'));
});

// Pricing page now redirects to docs - XActions is 100% free
app.get('/pricing', (req, res) => {
  res.redirect('/docs');
});

app.get('/docs', (req, res) => {
  res.sendFile(path.join(__dirname, '../dashboard/docs/index.html'));
});
app.get('/graph', (req, res) => {
  res.sendFile(path.join(__dirname, '../dashboard/graph.html'));
});
// Documentation sub-pages — serves 167 auto-generated SEO pages
// 3-level paths: /docs/guides/developer/:slug
app.get('/docs/:section/:subsection/:slug', (req, res) => {
  const section = req.params.section.replace(/[^a-zA-Z0-9-]/g, '');
  const subsection = req.params.subsection.replace(/[^a-zA-Z0-9-]/g, '');
  const slug = req.params.slug.replace(/[^a-zA-Z0-9-_]/g, '');
  const filePath = path.join(__dirname, `../dashboard/docs/${section}/${subsection}/${slug}.html`);
  res.sendFile(filePath, (err) => {
    if (err) {
      res.status(404).sendFile(path.join(__dirname, '../dashboard/404.html'));
    }
  });
});
// 2-level paths: /docs/guides/:slug, /docs/skills/:slug, /docs/tutorials/:slug, etc.
app.get('/docs/:section/:slug', (req, res) => {
  const section = req.params.section.replace(/[^a-zA-Z0-9-]/g, '');
  const slug = req.params.slug.replace(/[^a-zA-Z0-9-_]/g, '');
  const filePath = path.join(__dirname, `../dashboard/docs/${section}/${slug}.html`);
  res.sendFile(filePath, (err) => {
    if (err) {
      res.status(404).sendFile(path.join(__dirname, '../dashboard/404.html'));
    }
  });
});

// Flat docs: /docs/:slug (71 pages from docs/examples/*.md)
app.get('/docs/:slug', (req, res) => {
  const slug = req.params.slug.replace(/[^a-zA-Z0-9-]/g, '');
  const filePath = path.join(__dirname, `../dashboard/docs/${slug}.html`);
  res.sendFile(filePath, (err) => {
    if (err) {
      res.status(404).sendFile(path.join(__dirname, '../dashboard/404.html'));
    }
  });
});

app.get('/features', (req, res) => {
  res.sendFile(path.join(__dirname, '../dashboard/features.html'));
});

app.get('/about', (req, res) => {
  res.sendFile(path.join(__dirname, '../dashboard/about.html'));
});

app.get('/faq', (req, res) => {
  res.sendFile(path.join(__dirname, '../dashboard/faq.html'));
});

app.get('/mcp', (req, res) => {
  res.sendFile(path.join(__dirname, '../dashboard/mcp.html'));
});

app.get('/ai', (req, res) => {
  res.sendFile(path.join(__dirname, '../dashboard/ai.html'));
});

app.get('/ai-api', (req, res) => {
  res.sendFile(path.join(__dirname, '../dashboard/ai-api.html'));
});

app.get('/privacy', (req, res) => {
  res.sendFile(path.join(__dirname, '../dashboard/privacy.html'));
});

app.get('/terms', (req, res) => {
  res.sendFile(path.join(__dirname, '../dashboard/terms.html'));
});

app.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, '../dashboard/login.html'));
});

app.get('/run', (req, res) => {
  res.sendFile(path.join(__dirname, '../dashboard/run.html'));
});

app.get('/tutorials', (req, res) => {
  res.sendFile(path.join(__dirname, '../dashboard/tutorials.html'));
});

// Tutorials subdirectory
app.get('/tutorials/:page', (req, res) => {
  const page = req.params.page.replace(/[^a-zA-Z0-9-]/g, ''); // Sanitize
  const filePath = path.join(__dirname, `../dashboard/tutorials/${page}.html`);
  res.sendFile(filePath, (err) => {
    if (err) {
      res.sendFile(path.join(__dirname, '../dashboard/404.html'));
    }
  });
});

app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, '../dashboard/admin.html'));
});

app.get('/analytics', (req, res) => {
  res.sendFile(path.join(__dirname, '../dashboard/analytics.html'));
});

app.get('/automations', (req, res) => {
  res.sendFile(path.join(__dirname, '../dashboard/automations.html'));
});

app.get('/agent', (req, res) => {
  res.sendFile(path.join(__dirname, '../dashboard/agent.html'));
});

app.get('/monitor', (req, res) => {
  res.sendFile(path.join(__dirname, '../dashboard/monitor.html'));
});

app.get('/unfollowers', (req, res) => {
  res.sendFile(path.join(__dirname, '../dashboard/unfollowers.html'));
});

app.get('/workflows', (req, res) => {
  res.sendFile(path.join(__dirname, '../dashboard/workflows.html'));
});

app.get('/thread', (req, res) => {
  res.sendFile(path.join(__dirname, '../dashboard/thread.html'));
});

// SEO-friendly thread URL: /thread/1234567890
app.get('/thread/:tweetId', (req, res) => {
  res.sendFile(path.join(__dirname, '../dashboard/thread.html'));
});

app.get('/video', (req, res) => {
  res.sendFile(path.join(__dirname, '../dashboard/video.html'));
});

app.get('/analytics-dashboard', (req, res) => {
  res.sendFile(path.join(__dirname, '../dashboard/analytics-dashboard.html'));
});

app.get('/calendar', (req, res) => {
  res.sendFile(path.join(__dirname, '../dashboard/calendar.html'));
});

app.get('/thread-composer', (req, res) => {
  res.sendFile(path.join(__dirname, '../dashboard/thread-composer.html'));
});

app.get('/team', (req, res) => {
  res.sendFile(path.join(__dirname, '../dashboard/team.html'));
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    error: {
      message: err.message || 'Internal server error',
      status: err.status || 500
    }
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Use httpServer instead of app.listen for Socket.io support
httpServer.listen(PORT, async () => {
  console.log(`🚀 XActions API Server running on port ${PORT}`);
  console.log(`🔌 WebSocket server ready for real-time connections`);
  console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
  
  // Initialize plugin system and mount plugin routes
  try {
    const pluginCount = await initializePlugins();
    if (pluginCount > 0) {
      mountPluginRoutes();
      console.log(`📦 Plugins loaded: ${pluginCount}`);
    }
  } catch (error) {
    console.warn('⚠️  Plugin system initialization warning:', error.message);
  }
  
  // Optional: Validate x402 micropayment config (only relevant if self-hosting with payments)
  try {
    const x402Validation = validateX402Config(false);
    if (x402Validation.valid) {
      console.log(`  ├─ x402 micropayments: enabled`);
    }
    // Silently skip if not configured — x402 is optional
  } catch (error) {
    // x402 is optional — don't crash if not configured
    if (process.env.DEBUG) console.warn('x402 config:', error.message);
  }
  
  // Initialize licensing and telemetry
  await initializeLicensing();

  // Start unfollower auto-scan scheduler
  startScheduler(io);
});

export default app;

