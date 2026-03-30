// Copyright (c) 2024-2026 nich (@nichxbt). Business Source License 1.1.
/**
 * apiFetch — drop-in replacement for fetch() that intercepts 402 responses
 * and shows a payment modal instead of swallowing the error silently.
 *
 * Usage (replace bare fetch calls in dashboard pages):
 *   import { apiFetch } from './paymentModal.js';
 *   const res = await apiFetch('/api/ai/scrape/profile', { method: 'POST', body: ... });
 *   if (res.paymentRequired) return; // modal is already showing
 */

/**
 * Fetch wrapper that handles 402 Payment Required automatically.
 * Passes auth token from localStorage and merges caller headers.
 *
 * @param {string} url
 * @param {RequestInit} [options]
 * @returns {Promise<Response | { ok: false, status: 402, paymentRequired: true, body: object }>}
 */
export async function apiFetch(url, options = {}) {
  const token = localStorage.getItem('authToken') || localStorage.getItem('token');
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  const response = await fetch(url, { ...options, headers });

  if (response.status === 402) {
    const body = await response.json().catch(() => ({}));
    show402Modal(body, url);
    return { ok: false, status: 402, paymentRequired: true, body };
  }

  return response;
}

/**
 * Render a 402 payment modal over the current page.
 * Uses CSS variables so it inherits the dashboard theme automatically.
 */
function show402Modal(paymentInfo, endpoint) {
  document.getElementById('xactions-payment-modal')?.remove();

  const price   = paymentInfo?.x402?.price   || paymentInfo?.amount   || 'required';
  const network = paymentInfo?.x402?.network || paymentInfo?.network  || 'Base (USDC)';
  const payTo   = paymentInfo?.x402?.payTo   || paymentInfo?.payTo   || '';
  const label   = endpoint.split('/').slice(-2).join('/'); // e.g. "scrape/profile"

  const modal = document.createElement('div');
  modal.id = 'xactions-payment-modal';
  modal.style.cssText = [
    'position:fixed;inset:0',
    'background:rgba(0,0,0,0.72)',
    'z-index:100000',
    'display:flex;align-items:center;justify-content:center',
    'font-family:var(--font,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif)',
    'animation:xaFadeIn 0.15s ease',
  ].join(';');

  modal.innerHTML = `
    <style>
      @keyframes xaFadeIn { from { opacity:0; transform:scale(.97) } to { opacity:1; transform:scale(1) } }
      #xactions-payment-modal .xa-card {
        background: var(--bg-secondary, #16181c);
        border: 1px solid var(--border, #2f3336);
        border-radius: 16px;
        padding: 28px 32px;
        max-width: 400px;
        width: 90%;
        color: var(--text-primary, #e7e9ea);
      }
      #xactions-payment-modal h2 {
        margin: 0 0 6px;
        font-size: 1.15rem;
        font-weight: 700;
      }
      #xactions-payment-modal p {
        margin: 0 0 18px;
        font-size: 0.875rem;
        color: var(--text-secondary, #71767b);
        line-height: 1.4;
      }
      #xactions-payment-modal .xa-info {
        background: var(--bg-tertiary, #202327);
        border-radius: 10px;
        padding: 14px 16px;
        margin-bottom: 20px;
        display: grid;
        gap: 8px;
        font-size: 0.875rem;
      }
      #xactions-payment-modal .xa-row {
        display: flex;
        justify-content: space-between;
        align-items: baseline;
        gap: 8px;
      }
      #xactions-payment-modal .xa-label {
        color: var(--text-secondary, #71767b);
        white-space: nowrap;
      }
      #xactions-payment-modal .xa-val {
        font-weight: 600;
        text-align: right;
        word-break: break-all;
      }
      #xactions-payment-modal code {
        font-family: ui-monospace,"SFMono-Regular",monospace;
        font-size: 0.78rem;
        color: var(--text-secondary, #71767b);
      }
      #xactions-payment-modal .xa-actions {
        display: flex;
        gap: 10px;
      }
      #xactions-payment-modal .xa-btn {
        flex: 1;
        padding: 11px;
        border-radius: 9999px;
        font-weight: 700;
        font-size: 0.9rem;
        cursor: pointer;
        text-align: center;
        text-decoration: none;
        border: none;
        transition: opacity .15s;
      }
      #xactions-payment-modal .xa-btn:hover { opacity: .85; }
      #xactions-payment-modal .xa-primary {
        background: var(--accent, #1d9bf0);
        color: #fff;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      #xactions-payment-modal .xa-secondary {
        background: transparent;
        border: 1px solid var(--border, #2f3336) !important;
        color: var(--text-primary, #e7e9ea);
      }
    </style>
    <div class="xa-card">
      <h2>Payment Required</h2>
      <p>This endpoint requires an x402 micropayment. Pay once per request in USDC.</p>
      <div class="xa-info">
        <div class="xa-row">
          <span class="xa-label">Price</span>
          <span class="xa-val">${price} USDC</span>
        </div>
        <div class="xa-row">
          <span class="xa-label">Network</span>
          <span class="xa-val">${network}</span>
        </div>
        <div class="xa-row">
          <span class="xa-label">Endpoint</span>
          <code class="xa-val">…/${label}</code>
        </div>
        ${payTo ? `<div class="xa-row"><span class="xa-label">Pay to</span><code class="xa-val">${payTo.slice(0,6)}…${payTo.slice(-4)}</code></div>` : ''}
      </div>
      <div class="xa-actions">
        <a href="/ai-api" class="xa-btn xa-primary">Set Up Payments</a>
        <button class="xa-btn xa-secondary" id="xa-dismiss">Dismiss</button>
      </div>
    </div>`;

  document.body.appendChild(modal);

  modal.addEventListener('click', e => { if (e.target === modal) modal.remove(); });
  modal.querySelector('#xa-dismiss').addEventListener('click', () => modal.remove());
}
