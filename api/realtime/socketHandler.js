import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';

// Payment routes archived - XActions is now 100% free and open-source
// All credit checks have been removed - unlimited operations for all users

const prisma = new PrismaClient();

// Store active sessions
const activeSessions = new Map(); // odessId -> { odess, dashboard, user, status }
const adminSockets = new Set(); // Admin sockets watching all sessions

export function initializeSocketIO(httpServer) {
  const io = new Server(httpServer, {
    cors: {
      origin: process.env.FRONTEND_URL || '*',
      methods: ['GET', 'POST'],
      credentials: true
    }
  });

  // Middleware to authenticate socket connections
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token;
      const role = socket.handshake.auth.role; // 'agent', 'dashboard', or 'admin'

      if (!token && role !== 'agent') {
        return next(new Error('Authentication required'));
      }

      if (token) {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await prisma.user.findUnique({
          where: { id: decoded.userId }
        });

        if (!user) {
          return next(new Error('User not found'));
        }

        socket.user = user;
      }

      socket.role = role || 'dashboard';
      next();
    } catch (error) {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    console.log(`🔌 Socket connected: ${socket.id} (${socket.role})`);

    // Handle different connection types
    if (socket.role === 'agent') {
      handleAgentConnection(io, socket);
    } else if (socket.role === 'dashboard') {
      handleDashboardConnection(io, socket);
    } else if (socket.role === 'admin') {
      handleAdminConnection(io, socket);
    }

    socket.on('disconnect', () => {
      console.log(`🔌 Socket disconnected: ${socket.id}`);
      handleDisconnection(io, socket);
    });
  });

  return io;
}

// ===== AGENT (x.com tab) =====
function handleAgentConnection(io, socket) {
  const sessionId = socket.handshake.auth.sessionId;
  
  if (!sessionId) {
    socket.emit('error', { message: 'Session ID required' });
    socket.disconnect();
    return;
  }

  // Store agent socket
  const session = activeSessions.get(sessionId);
  if (session) {
    session.agent = socket;
    session.status = 'connected';
    
    // Notify dashboard that agent connected
    if (session.dashboard) {
      session.dashboard.emit('agent:connected', { sessionId });
    }
    
    // Notify admins
    broadcastToAdmins(io, 'session:updated', getSessionInfo(sessionId));
  }

  // Agent reports progress
  socket.on('progress', (data) => {
    const session = activeSessions.get(sessionId);
    if (session) {
      session.progress = data;
      
      // Forward to dashboard
      if (session.dashboard) {
        session.dashboard.emit('progress', data);
      }
      
      // Forward to admins
      broadcastToAdmins(io, 'session:progress', {
        sessionId,
        userId: session.user?.id,
        username: session.user?.username,
        ...data
      });
    }
  });

  // Agent reports action completed
  socket.on('action', (data) => {
    const session = activeSessions.get(sessionId);
    if (session) {
      // Forward to dashboard
      if (session.dashboard) {
        session.dashboard.emit('action', data);
      }
      
      // Forward to admins
      broadcastToAdmins(io, 'session:action', {
        sessionId,
        userId: session.user?.id,
        username: session.user?.username,
        ...data
      });
    }
  });

  // Agent reports completion
  socket.on('complete', async (data) => {
    const session = activeSessions.get(sessionId);
    if (session) {
      session.status = 'completed';
      
      // Record operation (XActions is now free - no credit deduction)
      if (session.user && session.operation) {
        await prisma.operation.create({
          data: {
            userId: session.user.id,
            type: session.operation,
            status: 'completed',
            result: JSON.stringify(data)
          }
        });
      }
      
      // Notify dashboard
      if (session.dashboard) {
        session.dashboard.emit('complete', data);
      }
      
      // Notify admins
      broadcastToAdmins(io, 'session:complete', {
        sessionId,
        userId: session.user?.id,
        username: session.user?.username,
        ...data
      });
    }
  });

  // Agent reports error
  socket.on('error', (data) => {
    const session = activeSessions.get(sessionId);
    if (session) {
      session.status = 'error';
      
      if (session.dashboard) {
        session.dashboard.emit('error', data);
      }
      
      broadcastToAdmins(io, 'session:error', {
        sessionId,
        userId: session.user?.id,
        ...data
      });
    }
  });

  socket.emit('connected', { sessionId, message: 'Agent connected to XActions' });
}

// ===== DASHBOARD (user's control panel) =====
function handleDashboardConnection(io, socket) {
  // Generate session ID for this user
  const sessionId = `session_${socket.user.id}_${Date.now()}`;
  
  // Create session
  activeSessions.set(sessionId, {
    dashboard: socket,
    agent: null,
    user: socket.user,
    status: 'waiting', // waiting for agent to connect
    operation: null,
    progress: null,
    createdAt: new Date()
  });

  socket.sessionId = sessionId;

  // Send session ID to dashboard (they'll use this in the agent script)
  socket.emit('session:created', { 
    sessionId,
    agentScript: generateAgentScript(sessionId)
  });

  // Notify admins of new session
  broadcastToAdmins(io, 'session:new', getSessionInfo(sessionId));

  // Dashboard requests to start an operation
  socket.on('start:operation', async (data) => {
    const { operation, config } = data;
    const session = activeSessions.get(sessionId);
    
    if (!session) {
      socket.emit('error', { message: 'Session not found' });
      return;
    }

    // XActions is now 100% free - no credit checks required
    session.operation = operation;
    session.config = config;
    session.status = 'running';

    // Send command to agent
    if (session.agent) {
      session.agent.emit('execute', { operation, config });
      socket.emit('operation:started', { operation });
      
      broadcastToAdmins(io, 'session:started', {
        sessionId,
        userId: socket.user.id,
        username: socket.user.username,
        operation,
        config
      });
    } else {
      socket.emit('error', { 
        message: 'Agent not connected. Make sure the script is running on x.com',
        agentDisconnected: true
      });
    }
  });

  // Dashboard requests to stop operation
  socket.on('stop:operation', () => {
    const session = activeSessions.get(sessionId);
    if (session?.agent) {
      session.agent.emit('stop');
      session.status = 'stopped';
    }
  });
}

// ===== ADMIN (monitoring all sessions) =====
function handleAdminConnection(io, socket) {
  // Verify admin status
  if (!socket.user?.isAdmin) {
    socket.emit('error', { message: 'Admin access required' });
    socket.disconnect();
    return;
  }

  adminSockets.add(socket);
  
  // Send current active sessions
  const sessions = Array.from(activeSessions.entries()).map(([id, session]) => ({
    sessionId: id,
    userId: session.user?.id,
    username: session.user?.username,
    status: session.status,
    operation: session.operation,
    progress: session.progress,
    createdAt: session.createdAt,
    hasAgent: !!session.agent,
    hasDashboard: !!session.dashboard
  }));

  socket.emit('sessions:list', sessions);
}

// ===== HELPERS =====
function handleDisconnection(io, socket) {
  // Remove from admin sockets
  adminSockets.delete(socket);

  // Handle agent disconnection
  for (const [sessionId, session] of activeSessions) {
    if (session.agent === socket) {
      session.agent = null;
      session.status = 'agent_disconnected';
      
      if (session.dashboard) {
        session.dashboard.emit('agent:disconnected');
      }
      
      broadcastToAdmins(io, 'session:updated', getSessionInfo(sessionId));
    }
    
    if (session.dashboard === socket) {
      session.dashboard = null;
      
      // If both disconnected, clean up session after a delay
      if (!session.agent) {
        setTimeout(() => {
          if (!activeSessions.get(sessionId)?.dashboard && !activeSessions.get(sessionId)?.agent) {
            activeSessions.delete(sessionId);
            broadcastToAdmins(io, 'session:removed', { sessionId });
          }
        }, 30000); // Clean up after 30 seconds
      }
    }
  }
}

function broadcastToAdmins(io, event, data) {
  for (const socket of adminSockets) {
    socket.emit(event, data);
  }
}

function getSessionInfo(sessionId) {
  const session = activeSessions.get(sessionId);
  if (!session) return null;
  
  return {
    sessionId,
    userId: session.user?.id,
    username: session.user?.username,
    status: session.status,
    operation: session.operation,
    progress: session.progress,
    createdAt: session.createdAt,
    hasAgent: !!session.agent,
    hasDashboard: !!session.dashboard
  };
}

function generateAgentScript(sessionId) {
  const wsUrl = process.env.API_URL || 'http://localhost:3001';
  
  return `// XActions Agent - Paste this in your x.com console
(function() {
  const XACTIONS_SESSION = '${sessionId}';
  const XACTIONS_WS = '${wsUrl}';
  
  // Load Socket.io client
  const script = document.createElement('script');
  script.src = 'https://cdn.socket.io/4.7.2/socket.io.min.js';
  script.onload = function() {
    // Connect to XActions
    const socket = io(XACTIONS_WS, {
      auth: { role: 'agent', sessionId: XACTIONS_SESSION }
    });
    
    socket.on('connect', () => {
      console.log('✅ Connected to XActions');
      showNotification('Connected to XActions Dashboard!');
    });
    
    socket.on('execute', async (data) => {
      console.log('🚀 Executing:', data.operation);
      try {
        await executeOperation(socket, data.operation, data.config);
      } catch (error) {
        socket.emit('error', { message: error.message });
      }
    });
    
    socket.on('stop', () => {
      window.XACTIONS_STOP = true;
      console.log('⏹️ Stop requested');
    });
    
    window.XACTIONS_SOCKET = socket;
  };
  document.head.appendChild(script);
  
  function showNotification(msg) {
    const div = document.createElement('div');
    div.style.cssText = 'position:fixed;top:20px;right:20px;background:#1d9bf0;color:white;padding:16px 24px;border-radius:12px;z-index:99999;font-family:system-ui;font-weight:600;box-shadow:0 4px 12px rgba(0,0,0,0.3);';
    div.textContent = msg;
    document.body.appendChild(div);
    setTimeout(() => div.remove(), 3000);
  }
  
  // Operation implementations will be injected by the server
  async function executeOperation(socket, operation, config) {
    window.XACTIONS_STOP = false;
    
    const operations = {
      unfollowNonFollowers: unfollowNonFollowersOp,
      unfollowEveryone: unfollowEveryoneOp,
      detectUnfollowers: detectUnfollowersOp
    };
    
    if (operations[operation]) {
      await operations[operation](socket, config);
    } else {
      socket.emit('error', { message: 'Unknown operation: ' + operation });
    }
  }
  
  // === UNFOLLOW NON-FOLLOWERS ===
  async function unfollowNonFollowersOp(socket, config) {
    const sleep = ms => new Promise(r => setTimeout(r, ms));
    const max = config.maxUnfollows || 100;
    let unfollowed = 0;
    
    socket.emit('progress', { status: 'starting', message: 'Finding non-followers...' });
    
    // Navigate to following page
    const username = document.querySelector('[data-testid="UserName"]')?.textContent?.match(/@(\\w+)/)?.[1];
    if (!username) {
      socket.emit('error', { message: 'Could not detect your username. Make sure you are on x.com' });
      return;
    }
    
    window.location.href = 'https://x.com/' + username + '/following';
    await sleep(2000);
    
    while (unfollowed < max && !window.XACTIONS_STOP) {
      const cells = document.querySelectorAll('[data-testid="UserCell"]');
      let found = false;
      
      for (const cell of cells) {
        if (window.XACTIONS_STOP) break;
        
        // Check if they don't follow back (no "Follows you" badge)
        const followsYou = cell.querySelector('[data-testid="userFollowIndicator"]');
        if (followsYou) continue; // Skip - they follow back
        
        // Find unfollow button
        const btn = cell.querySelector('[data-testid$="-unfollow"]');
        if (!btn) continue;
        
        const handle = cell.querySelector('a[href^="/"]')?.href?.split('/').pop() || 'unknown';
        
        btn.click();
        await sleep(500);
        
        // Confirm unfollow
        const confirm = document.querySelector('[data-testid="confirmationSheetConfirm"]');
        if (confirm) {
          confirm.click();
          await sleep(300);
        }
        
        unfollowed++;
        found = true;
        
        socket.emit('action', { type: 'unfollow', handle, count: unfollowed });
        socket.emit('progress', { 
          status: 'running',
          current: unfollowed, 
          max,
          percent: Math.round((unfollowed / max) * 100),
          message: 'Unfollowed @' + handle
        });
        
        await sleep(1500 + Math.random() * 1000);
        break;
      }
      
      if (!found) {
        // Scroll to load more
        window.scrollBy(0, 500);
        await sleep(1000);
      }
    }
    
    socket.emit('complete', { 
      operation: 'unfollowNonFollowers',
      unfollowed,
      stopped: window.XACTIONS_STOP
    });
  }
  
  // === UNFOLLOW EVERYONE ===
  async function unfollowEveryoneOp(socket, config) {
    const sleep = ms => new Promise(r => setTimeout(r, ms));
    const max = config.maxUnfollows || 500;
    let unfollowed = 0;
    
    socket.emit('progress', { status: 'starting', message: 'Starting mass unfollow...' });
    
    const username = document.querySelector('[data-testid="UserName"]')?.textContent?.match(/@(\\w+)/)?.[1];
    if (!username) {
      socket.emit('error', { message: 'Could not detect your username' });
      return;
    }
    
    window.location.href = 'https://x.com/' + username + '/following';
    await sleep(2000);
    
    while (unfollowed < max && !window.XACTIONS_STOP) {
      const btn = document.querySelector('[data-testid$="-unfollow"]');
      if (!btn) {
        window.scrollBy(0, 500);
        await sleep(1000);
        continue;
      }
      
      const cell = btn.closest('[data-testid="UserCell"]');
      const handle = cell?.querySelector('a[href^="/"]')?.href?.split('/').pop() || 'unknown';
      
      btn.click();
      await sleep(500);
      
      const confirm = document.querySelector('[data-testid="confirmationSheetConfirm"]');
      if (confirm) {
        confirm.click();
        await sleep(300);
      }
      
      unfollowed++;
      
      socket.emit('action', { type: 'unfollow', handle, count: unfollowed });
      socket.emit('progress', { 
        status: 'running',
        current: unfollowed, 
        max,
        percent: Math.round((unfollowed / max) * 100),
        message: 'Unfollowed @' + handle
      });
      
      await sleep(1500 + Math.random() * 1000);
    }
    
    socket.emit('complete', { 
      operation: 'unfollowEveryone',
      unfollowed,
      stopped: window.XACTIONS_STOP
    });
  }
  
  // === DETECT UNFOLLOWERS ===
  async function detectUnfollowersOp(socket, config) {
    const sleep = ms => new Promise(r => setTimeout(r, ms));
    
    socket.emit('progress', { status: 'starting', message: 'Scanning followers...' });
    
    const username = document.querySelector('[data-testid="UserName"]')?.textContent?.match(/@(\\w+)/)?.[1];
    if (!username) {
      socket.emit('error', { message: 'Could not detect your username' });
      return;
    }
    
    // Get current followers
    window.location.href = 'https://x.com/' + username + '/followers';
    await sleep(2000);
    
    const followers = new Set();
    let lastSize = 0;
    let stuckCount = 0;
    
    while (stuckCount < 5 && !window.XACTIONS_STOP) {
      const cells = document.querySelectorAll('[data-testid="UserCell"]');
      cells.forEach(cell => {
        const handle = cell.querySelector('a[href^="/"]')?.href?.split('/').pop();
        if (handle) followers.add(handle);
      });
      
      socket.emit('progress', { 
        status: 'running',
        current: followers.size,
        message: 'Found ' + followers.size + ' followers...'
      });
      
      if (followers.size === lastSize) {
        stuckCount++;
      } else {
        stuckCount = 0;
        lastSize = followers.size;
      }
      
      window.scrollBy(0, 800);
      await sleep(1000);
    }
    
    // Check against stored followers (from localStorage)
    const stored = JSON.parse(localStorage.getItem('xactions_followers') || '[]');
    const unfollowers = stored.filter(h => !followers.has(h));
    
    // Save current followers
    localStorage.setItem('xactions_followers', JSON.stringify([...followers]));
    
    socket.emit('complete', { 
      operation: 'detectUnfollowers',
      totalFollowers: followers.size,
      unfollowers: unfollowers,
      unfollowerCount: unfollowers.length,
      isFirstRun: stored.length === 0
    });
  }
  
  console.log('⚡ XActions Agent loaded. Connecting to dashboard...');
})();`;
}

export { activeSessions, adminSockets };
