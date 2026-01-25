/**
 * XActions Dashboard Configuration
 * 
 * This file provides API configuration for all dashboard pages.
 * Include this file in any page that makes API calls.
 */

const CONFIG = {
  // API Base URL - auto-detects environment
  API_BASE: window.location.hostname === 'localhost' 
    ? 'http://localhost:3001/api'
    : '/api',
  
  // WebSocket URL for real-time updates
  WS_URL: window.location.hostname === 'localhost'
    ? 'http://localhost:3001'
    : window.location.origin,
  
  // Railway API URL (if needed for cross-origin)
  RAILWAY_URL: 'https://xactions-api.up.railway.app',
  
  // App version
  VERSION: '1.0.0',
  
  // Default rate limiting delays (ms)
  DELAYS: {
    MIN: 1500,
    MAX: 3000,
    BETWEEN_REQUESTS: 2000
  },
  
  // Pagination defaults
  PAGINATION: {
    DEFAULT_LIMIT: 100,
    MAX_LIMIT: 1000
  }
};

/**
 * Make an authenticated API request
 * @param {string} endpoint - API endpoint (e.g., '/user/profile')
 * @param {object} options - Fetch options
 * @returns {Promise<object>} - Response data
 */
async function apiRequest(endpoint, options = {}) {
  const authToken = localStorage.getItem('authToken');
  
  const defaultOptions = {
    headers: {
      'Content-Type': 'application/json',
      ...(authToken && { 'Authorization': `Bearer ${authToken}` })
    }
  };
  
  const mergedOptions = {
    ...defaultOptions,
    ...options,
    headers: {
      ...defaultOptions.headers,
      ...(options.headers || {})
    }
  };
  
  const url = endpoint.startsWith('http') 
    ? endpoint 
    : `${CONFIG.API_BASE}${endpoint}`;
  
  const response = await fetch(url, mergedOptions);
  const data = await response.json();
  
  if (!response.ok) {
    throw new Error(data.error || data.message || 'Request failed');
  }
  
  return data;
}

/**
 * Make an AI API request (for server-side automation)
 * @param {string} endpoint - AI API endpoint
 * @param {object} body - Request body
 * @returns {Promise<object>} - Response data
 */
async function aiApiRequest(endpoint, body = {}) {
  return apiRequest(`/ai${endpoint}`, {
    method: 'POST',
    body: JSON.stringify(body)
  });
}

/**
 * Poll operation status
 * @param {string} operationId - The operation ID to poll
 * @param {function} onProgress - Callback for progress updates
 * @param {function} onComplete - Callback when complete
 * @param {function} onError - Callback on error
 */
async function pollOperationStatus(operationId, onProgress, onComplete, onError) {
  const poll = async () => {
    try {
      const data = await apiRequest(`/ai/action/status/${operationId}`);
      
      if (onProgress && data.progress) {
        onProgress(data.progress);
      }
      
      if (data.status === 'completed') {
        if (onComplete) onComplete(data);
        return;
      }
      
      if (data.status === 'failed') {
        if (onError) onError(data.error || 'Operation failed');
        return;
      }
      
      // Continue polling
      setTimeout(poll, 2000);
    } catch (error) {
      if (onError) onError(error.message);
    }
  };
  
  poll();
}

/**
 * Format numbers for display (e.g., 1500 -> 1.5K)
 */
function formatNumber(num) {
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
  if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
  return num.toString();
}

/**
 * Format date for display
 */
function formatDate(dateStr) {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
}

/**
 * Format time ago (e.g., "5 minutes ago")
 */
function timeAgo(dateStr) {
  const date = new Date(dateStr);
  const seconds = Math.floor((new Date() - date) / 1000);
  
  const intervals = {
    year: 31536000,
    month: 2592000,
    week: 604800,
    day: 86400,
    hour: 3600,
    minute: 60
  };
  
  for (const [unit, secondsInUnit] of Object.entries(intervals)) {
    const interval = Math.floor(seconds / secondsInUnit);
    if (interval >= 1) {
      return `${interval} ${unit}${interval > 1 ? 's' : ''} ago`;
    }
  }
  
  return 'just now';
}

/**
 * Check if user is authenticated
 */
function isAuthenticated() {
  return !!localStorage.getItem('authToken');
}

/**
 * Redirect to login if not authenticated
 */
function requireAuth() {
  if (!isAuthenticated()) {
    window.location.href = '/login';
    return false;
  }
  return true;
}

/**
 * Show a toast notification
 */
function showToast(message, type = 'info') {
  // Remove existing toasts
  document.querySelectorAll('.toast').forEach(t => t.remove());
  
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `
    <span class="toast-icon">${type === 'success' ? '✅' : type === 'error' ? '❌' : 'ℹ️'}</span>
    <span class="toast-message">${message}</span>
  `;
  
  // Add styles if not present
  if (!document.getElementById('toast-styles')) {
    const styles = document.createElement('style');
    styles.id = 'toast-styles';
    styles.textContent = `
      .toast {
        position: fixed;
        bottom: 20px;
        right: 20px;
        background: #16181c;
        border: 1px solid #2f3336;
        border-radius: 12px;
        padding: 12px 20px;
        display: flex;
        align-items: center;
        gap: 10px;
        z-index: 10000;
        animation: slideIn 0.3s ease;
        color: #e7e9ea;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      }
      .toast-success { border-color: #00ba7c; }
      .toast-error { border-color: #f4212e; }
      @keyframes slideIn {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
      }
    `;
    document.head.appendChild(styles);
  }
  
  document.body.appendChild(toast);
  
  setTimeout(() => {
    toast.style.animation = 'slideIn 0.3s ease reverse';
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

// Export for module usage (if using modules)
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { CONFIG, apiRequest, aiApiRequest, pollOperationStatus, formatNumber, formatDate, timeAgo, isAuthenticated, requireAuth, showToast };
}
