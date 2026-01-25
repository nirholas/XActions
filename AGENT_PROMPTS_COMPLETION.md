

## Agent 5: Dashboard & Site Integration

**Goal:** Ensure the dashboard pages properly integrate with the API.

### Files to Review/Update:

**1. `/workspaces/XActions/dashboard/index.html` (Dashboard home)**

Should:
- Check authentication on load
- Show user's operation history
- Display recent activity
- Link to all features

**2. `/workspaces/XActions/dashboard/run.html` (One-click runner)**

Should have buttons/forms for:
- Unfollow non-followers
- Unfollow everyone
- Detect unfollowers
- Each button calls the appropriate API endpoint

Example integration:
```javascript
async function runUnfollowNonFollowers() {
  const sessionCookie = document.getElementById('sessionCookie').value;
  const limit = document.getElementById('limit').value || 100;
  
  const response = await fetch('/api/ai/action/unfollow-non-followers', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sessionCookie, limit, dryRun: false })
  });
  
  const data = await response.json();
  if (data.success) {
    showStatus(`Operation started: ${data.operationId}`);
    pollStatus(data.operationId);
  } else {
    showError(data.message);
  }
}

async function pollStatus(operationId) {
  const response = await fetch(`/api/ai/action/status/${operationId}`);
  const data = await response.json();
  
  updateProgressBar(data.progress);
  
  if (data.status === 'running') {
    setTimeout(() => pollStatus(operationId), 2000);
  } else if (data.status === 'completed') {
    showSuccess(`Completed! ${data.result.unfollowed} users unfollowed.`);
  }
}
```

**3. `/workspaces/XActions/dashboard/features.html`**

Each feature card should have:
- Working "View Script" that shows the browser console code
- Working "Copy" button
- Link to detailed tutorial
- Status badge (Free, Pro, etc.)

**4. API Base URL Configuration**

Create `/workspaces/XActions/dashboard/js/config.js`:
```javascript
const CONFIG = {
  API_BASE: window.location.hostname === 'localhost' 
    ? 'http://localhost:3001'
    : 'https://api.xactions.app',  // Or your Railway URL
  WS_URL: window.location.hostname === 'localhost'
    ? 'ws://localhost:3001'
    : 'wss://api.xactions.app'
};
```

Include this in all dashboard pages that make API calls.

**5. Update navigation in all dashboard pages**

Ensure consistent nav links across all pages:
- Home → /
- Features → /features
- Tutorials → /tutorials
- Docs → /docs
- Run → /run
- Dashboard → /dashboard
- About → /about

### Success Criteria:
- [ ] Dashboard loads without console errors
- [ ] API calls use correct base URL
- [ ] Features page lists all features
- [ ] Run page can execute operations
- [ ] Navigation is consistent across pages
- [ ] WebSocket connection works for real-time updates

---

## Execution Order

1. **Agent 1** (Vercel Routes) - Quick fix, unblocks testing
2. **Agent 2** (Browser Automation) - Required for API to work
3. **Agent 3** (Job Queue) - Required for async operations
4. **Agent 4** (Monitoring) - Adds monitoring features
5. **Agent 5** (Dashboard Integration) - Makes it all usable

Agents 2, 3, 4 can run in parallel after Agent 1.
Agent 5 should run last to integrate everything.

---

## Testing Checklist

After all agents complete:

```bash
# 1. Syntax check
node --check api/server.js
node --check api/services/browserAutomation.js
node --check api/services/monitoring.js
node --check api/services/jobQueue.js

# 2. Start server
npm start

# 3. Test endpoints
curl http://localhost:3001/api/health
curl http://localhost:3001/api/ai/
curl http://localhost:3001/api/ai/pricing

# 4. Test with session cookie
curl -X POST http://localhost:3001/api/ai/scrape/profile \
  -H "Content-Type: application/json" \
  -d '{"username": "elonmusk", "sessionCookie": "your_auth_token"}'

# 5. Deploy and test routes
vercel --prod
curl https://xactions.app/features  # Should return 200
curl https://xactions.app/tutorials  # Should return 200
```
