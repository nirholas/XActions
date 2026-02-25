# Dashboard

XActions includes a web dashboard with 30+ pages for managing automations, analytics, and tools — all with a dark theme matching X/Twitter's UI.

---

## Accessing the Dashboard

### Local Development

```bash
# Start the API server (serves dashboard too)
node api/server.js

# Or use the dashboard server directly
node dashboard-server.js
```

Open [http://localhost:3001](http://localhost:3001) in your browser.

### Production

Visit [xactions.app](https://xactions.app) or deploy your own instance (see [deployment.md](deployment.md)).

---

## Pages

### Core

| Page | URL | Description |
|------|-----|-------------|
| Home | `/` | Main dashboard — sidebar navigation, quick actions |
| Login | `/login` | Email/password authentication |
| Admin | `/admin` | Session management, user management, system stats |

### Automation & Tools

| Page | URL | Description |
|------|-----|-------------|
| Automations | `/automations` | Start/stop automation scripts, configure options |
| Run | `/run` | Execute operations with real-time progress |
| Unfollowers | `/unfollowers` | Detect and manage non-followers |
| Workflows | `/workflows` | Visual workflow builder — chain actions with triggers |
| Calendar | `/calendar` | Content calendar — schedule posts and threads |

### Analytics & Monitoring

| Page | URL | Description |
|------|-----|-------------|
| Analytics | `/analytics` | Engagement stats, follower growth, post performance |
| Analytics Dashboard | `/analytics-dashboard` | Advanced analytics with charts and exports |
| Monitor | `/monitor` | Real-time account monitoring with alerts |
| Price Correlation | `/price-correlation` | Tweet-price charts for 15 crypto tokens |
| Social Graph | `/graph` | Interactive network visualization |

### Content

| Page | URL | Description |
|------|-----|-------------|
| Thread Composer | `/thread-composer` | Write, preview, and schedule Twitter threads |
| Thread | `/thread` | Unroll and view threads |
| Video | `/video` | Download Twitter/X videos |

### AI & Integrations

| Page | URL | Description |
|------|-----|-------------|
| AI | `/ai` | AI-powered tweet generation and analysis |
| AI API | `/ai-api` | AI API playground and docs |
| MCP | `/mcp` | MCP server setup and tool reference |
| Agent | `/agent` | Autonomous AI agent control panel |
| Integrations | `/integrations` | Connect external services |

### Team & Settings

| Page | URL | Description |
|------|-----|-------------|
| Team | `/team` | Multi-user team management |
| Status | `/status` | System health and uptime |
| Compare | `/compare` | Feature comparison (XActions vs alternatives) |

### Info Pages

| Page | URL | Description |
|------|-----|-------------|
| Docs | `/docs` | Documentation portal |
| Features | `/features` | Feature showcase |
| Pricing | `/pricing` | Credit packages and pricing |
| Tutorials | `/tutorials` | Step-by-step guides |
| Blog | `/blog` | Updates and articles |
| FAQ | `/faq` | Frequently asked questions |
| Changelog | `/changelog` | Version history |
| Use Cases | `/use-cases` | Example workflows |
| About | `/about` | Project info |
| Contributing | `/contributing` | How to contribute |
| Contact | `/contact` | Support and feedback |
| Privacy | `/privacy` | Privacy policy |
| Terms | `/terms` | Terms of service |
| Security | `/security` | Security policy |

---

## Architecture

The dashboard is a collection of static HTML files in the `dashboard/` directory. Each page is self-contained with inline CSS and JavaScript — no build step required.

```
dashboard/
├── index.html              # Main dashboard with sidebar nav
├── css/                    # Shared styles
├── js/                     # Shared JavaScript
├── data/                   # Static data files
│   └── tweet-price/        # Price correlation data (15 assets)
└── tutorials/              # Tutorial sub-pages
```

### Design System

- **Dark theme** — `#0a0a0f` background, `#131722` cards, `#1d9bf0` accent (X blue)
- **Font stack** — system fonts (`-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto`)
- **Components** — stat cards, data tables, charts (Chart.js / TradingView), tab navigation
- **Responsive** — mobile-friendly with breakpoints at 768px and 1024px

### Navigation

The main dashboard (`index.html`) includes a sidebar with links to all pages, organized by category with SVG icons.

---

## API Integration

Dashboard pages communicate with the Express.js backend at `/api/*`. Key endpoints:

| Dashboard Page | API Endpoint | Method |
|----------------|-------------|--------|
| Automations | `/api/automations` | GET, POST |
| Analytics | `/api/analytics/*` | GET |
| Workflows | `/api/workflows` | GET, POST, PUT, DELETE |
| Streams | `/api/streams` | GET, POST, PATCH, DELETE |
| Graph | `/api/graph` | GET, POST, DELETE |
| Price Correlation | `/api/analytics/price-correlation` | POST |
| Auth | `/api/auth/login`, `/api/auth/register` | POST |

### Real-Time Updates

Pages use Socket.IO for live data:

```js
const socket = io();
socket.on('operation:progress', (data) => { /* update progress bar */ });
socket.on('graph:complete', (data) => { /* reload graph */ });
socket.on('stream:data', (data) => { /* new stream event */ });
```

---

## Customization

### Adding a New Dashboard Page

1. Create `dashboard/your-page.html`
2. Use the standard template (copy structure from an existing page)
3. Add a nav link in `dashboard/index.html` sidebar
4. If it needs API data, add a route in `api/routes/`

### Theming

Override CSS variables at the top of any page:

```css
:root {
  --bg-primary: #0a0a0f;
  --bg-secondary: #131722;
  --bg-card: #1a1e2e;
  --accent: #1d9bf0;
  --text-primary: #d1d4dc;
  --text-secondary: #787b86;
  --border: #2a2e39;
  --green: #26a69a;
  --red: #ef5350;
}
```
