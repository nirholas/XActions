/**
 * XActions — Visual Workflow Builder JS
 * Canvas-based drag-and-drop editor, serializes workflows to JSON
 */

(function () {
  'use strict';

  // ── Constants ─────────────────────────────────────────
  const BLOCK_W = 180;
  const BLOCK_H = 70;
  const CONN_RADIUS = 8;
  const GRID_SIZE = 20;

  const BLOCK_TYPES = {
    trigger: {
      label: 'Trigger',
      color: '#ffad1f',
      items: [
        { type: 'schedule', label: 'Schedule (Cron)', icon: '⏰', fields: [{ key: 'cron', label: 'Cron Expression', placeholder: '*/30 * * * *' }] },
        { type: 'event', label: 'Event', icon: '⚡', fields: [{ key: 'event', label: 'Event Name', placeholder: 'new_tweet' }] }
      ]
    },
    action: {
      label: 'Action',
      color: '#1d9bf0',
      items: [
        { type: 'scrape', label: 'Scrape', icon: '🔍', fields: [{ key: 'target', label: 'Target', placeholder: '@username' }, { key: 'dataType', label: 'Data Type', placeholder: 'profile' }] },
        { type: 'follow', label: 'Follow', icon: '👤', fields: [{ key: 'target', label: 'Target', placeholder: '@username' }] },
        { type: 'like', label: 'Like', icon: '❤️', fields: [{ key: 'tweetUrl', label: 'Tweet URL', placeholder: 'https://x.com/...' }] },
        { type: 'post', label: 'Post Tweet', icon: '✍️', fields: [{ key: 'text', label: 'Tweet Text', placeholder: 'Hello world' }] },
        { type: 'summarize', label: 'AI Summarize', icon: '🤖', fields: [{ key: 'input', label: 'Input Variable', placeholder: '{{profile.bio}}' }, { key: 'provider', label: 'Provider', placeholder: 'openrouter' }] }
      ]
    },
    condition: {
      label: 'Condition',
      color: '#00ba7c',
      items: [
        { type: 'if', label: 'If / Else', icon: '🔀', fields: [{ key: 'expression', label: 'Condition', placeholder: 'profile.followers > 1000' }] },
        { type: 'filter', label: 'Filter', icon: '🔎', fields: [{ key: 'expression', label: 'Filter Expression', placeholder: 'tweet.text.includes("keyword")' }] }
      ]
    }
  };

  // ── State ─────────────────────────────────────────────
  let blocks = [];
  let connections = [];
  let nextId = 1;
  let selected = null;
  let dragging = null;
  let dragOffset = { x: 0, y: 0 };
  let connecting = null; // { fromId }
  let canvasOffset = { x: 0, y: 0 };
  let workflowName = 'Untitled Workflow';

  // ── DOM ───────────────────────────────────────────────
  const canvas = document.getElementById('wf-canvas');
  const ctx = canvas.getContext('2d');
  const propsPanel = document.getElementById('props-panel');
  const propsTitle = document.getElementById('props-title');
  const propsBody = document.getElementById('props-body');
  const workflowNameInput = document.getElementById('workflow-name');
  const saveBtn = document.getElementById('wf-save');
  const loadBtn = document.getElementById('wf-load');
  const runBtn = document.getElementById('wf-run');
  const clearBtn = document.getElementById('wf-clear');
  const exportBtn = document.getElementById('wf-export');
  const palette = document.getElementById('block-palette');

  // ── Init ──────────────────────────────────────────────
  function init() {
    resizeCanvas();
    buildPalette();
    bindEvents();
    render();
  }

  function resizeCanvas() {
    const rect = canvas.parentElement.getBoundingClientRect();
    canvas.width = rect.width;
    canvas.height = rect.height;
  }

  // ── Palette ───────────────────────────────────────────
  function buildPalette() {
    palette.innerHTML = '';
    for (const [category, def] of Object.entries(BLOCK_TYPES)) {
      const group = document.createElement('div');
      group.className = 'palette-group';
      group.innerHTML = `<div class="palette-group__title" style="color:${def.color}">${def.label}</div>`;
      for (const item of def.items) {
        const btn = document.createElement('button');
        btn.className = 'palette-btn';
        btn.style.borderColor = def.color;
        btn.innerHTML = `<span>${item.icon}</span> ${item.label}`;
        btn.addEventListener('click', () => addBlock(category, item));
        group.appendChild(btn);
      }
      palette.appendChild(group);
    }
  }

  // ── Block management ──────────────────────────────────
  function addBlock(category, item) {
    const id = nextId++;
    const block = {
      id,
      category,
      type: item.type,
      label: item.label,
      icon: item.icon,
      color: BLOCK_TYPES[category].color,
      fields: item.fields.map(f => ({ ...f, value: '' })),
      x: 100 + Math.random() * 300,
      y: 80 + Math.random() * 200
    };
    // Snap to grid
    block.x = Math.round(block.x / GRID_SIZE) * GRID_SIZE;
    block.y = Math.round(block.y / GRID_SIZE) * GRID_SIZE;
    blocks.push(block);
    selectBlock(block);
    render();
  }

  function removeBlock(id) {
    blocks = blocks.filter(b => b.id !== id);
    connections = connections.filter(c => c.from !== id && c.to !== id);
    if (selected && selected.id === id) { selected = null; hideProps(); }
    render();
  }

  // ── Selection & properties ────────────────────────────
  function selectBlock(block) {
    selected = block;
    showProps(block);
    render();
  }

  function showProps(block) {
    propsPanel.classList.add('visible');
    propsTitle.textContent = `${block.icon} ${block.label}`;
    let html = '';
    for (const field of block.fields) {
      html += `
        <div class="form-group">
          <label class="form-label">${field.label}</label>
          <input class="form-input" data-field="${field.key}" value="${field.value || ''}" placeholder="${field.placeholder || ''}">
        </div>`;
    }
    html += `<button class="btn btn--danger btn--sm" id="delete-block">🗑 Delete Block</button>`;
    propsBody.innerHTML = html;

    // Bind field changes
    propsBody.querySelectorAll('[data-field]').forEach(input => {
      input.addEventListener('input', (e) => {
        const f = block.fields.find(f => f.key === e.target.dataset.field);
        if (f) f.value = e.target.value;
      });
    });

    document.getElementById('delete-block').addEventListener('click', () => removeBlock(block.id));
  }

  function hideProps() {
    propsPanel.classList.remove('visible');
  }

  // ── Rendering ─────────────────────────────────────────
  function render() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawGrid();
    drawConnections();
    drawBlocks();
  }

  function drawGrid() {
    ctx.strokeStyle = '#1a1a1a';
    ctx.lineWidth = 0.5;
    for (let x = 0; x < canvas.width; x += GRID_SIZE) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, canvas.height); ctx.stroke();
    }
    for (let y = 0; y < canvas.height; y += GRID_SIZE) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(canvas.width, y); ctx.stroke();
    }
  }

  function drawBlocks() {
    for (const block of blocks) {
      const isSelected = selected && selected.id === block.id;

      // Shadow
      ctx.shadowColor = 'rgba(0,0,0,0.4)';
      ctx.shadowBlur = isSelected ? 12 : 6;
      ctx.shadowOffsetY = 2;

      // Body
      ctx.fillStyle = '#16181c';
      ctx.strokeStyle = isSelected ? '#e7e9ea' : block.color;
      ctx.lineWidth = isSelected ? 2.5 : 1.5;
      roundRect(ctx, block.x, block.y, BLOCK_W, BLOCK_H, 10);
      ctx.fill();
      ctx.stroke();

      ctx.shadowColor = 'transparent';
      ctx.shadowBlur = 0;
      ctx.shadowOffsetY = 0;

      // Color stripe top
      ctx.fillStyle = block.color;
      ctx.fillRect(block.x + 1, block.y + 1, BLOCK_W - 2, 4);

      // Icon + label
      ctx.fillStyle = '#e7e9ea';
      ctx.font = '13px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.textBaseline = 'middle';
      ctx.fillText(`${block.icon}  ${block.label}`, block.x + 12, block.y + 30);

      // Type tag
      ctx.fillStyle = '#71767b';
      ctx.font = '10px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.fillText(block.category.toUpperCase(), block.x + 12, block.y + 52);

      // Connection points (bottom center = output, top center = input)
      drawConnPoint(block.x + BLOCK_W / 2, block.y + BLOCK_H, block.color); // output
      drawConnPoint(block.x + BLOCK_W / 2, block.y, block.color); // input
    }
  }

  function drawConnPoint(cx, cy, color) {
    ctx.beginPath();
    ctx.arc(cx, cy, CONN_RADIUS / 2, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  function drawConnections() {
    for (const conn of connections) {
      const from = blocks.find(b => b.id === conn.from);
      const to = blocks.find(b => b.id === conn.to);
      if (!from || !to) continue;

      const x1 = from.x + BLOCK_W / 2;
      const y1 = from.y + BLOCK_H;
      const x2 = to.x + BLOCK_W / 2;
      const y2 = to.y;

      ctx.beginPath();
      ctx.moveTo(x1, y1);
      // Bezier curve
      const cp = Math.abs(y2 - y1) / 2;
      ctx.bezierCurveTo(x1, y1 + cp, x2, y2 - cp, x2, y2);
      ctx.strokeStyle = '#555';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Arrow
      const angle = Math.atan2(y2 - (y2 - cp), x2 - x2);
      ctx.beginPath();
      ctx.moveTo(x2, y2);
      ctx.lineTo(x2 - 6, y2 - 10);
      ctx.lineTo(x2 + 6, y2 - 10);
      ctx.closePath();
      ctx.fillStyle = '#555';
      ctx.fill();
    }

    // Active connection drag line
    if (connecting && connecting.mouseX !== undefined) {
      const from = blocks.find(b => b.id === connecting.fromId);
      if (from) {
        ctx.beginPath();
        ctx.moveTo(from.x + BLOCK_W / 2, from.y + BLOCK_H);
        ctx.lineTo(connecting.mouseX, connecting.mouseY);
        ctx.strokeStyle = '#1d9bf0';
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 5]);
        ctx.stroke();
        ctx.setLineDash([]);
      }
    }
  }

  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }

  // ── Hit testing ───────────────────────────────────────
  function blockAt(x, y) {
    for (let i = blocks.length - 1; i >= 0; i--) {
      const b = blocks[i];
      if (x >= b.x && x <= b.x + BLOCK_W && y >= b.y && y <= b.y + BLOCK_H) return b;
    }
    return null;
  }

  function isOutputPoint(block, mx, my) {
    const cx = block.x + BLOCK_W / 2;
    const cy = block.y + BLOCK_H;
    return Math.hypot(mx - cx, my - cy) < CONN_RADIUS * 2;
  }

  function isInputPoint(block, mx, my) {
    const cx = block.x + BLOCK_W / 2;
    const cy = block.y;
    return Math.hypot(mx - cx, my - cy) < CONN_RADIUS * 2;
  }

  // ── Mouse events ──────────────────────────────────────
  function getMousePos(e) {
    const rect = canvas.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }

  function onMouseDown(e) {
    const pos = getMousePos(e);
    const block = blockAt(pos.x, pos.y);

    if (block) {
      // Check output point for connection start
      if (isOutputPoint(block, pos.x, pos.y)) {
        connecting = { fromId: block.id };
        return;
      }
      // Otherwise start drag
      dragging = block;
      dragOffset = { x: pos.x - block.x, y: pos.y - block.y };
      selectBlock(block);
    } else {
      selected = null;
      hideProps();
      render();
    }
  }

  function onMouseMove(e) {
    const pos = getMousePos(e);

    if (dragging) {
      dragging.x = Math.round((pos.x - dragOffset.x) / GRID_SIZE) * GRID_SIZE;
      dragging.y = Math.round((pos.y - dragOffset.y) / GRID_SIZE) * GRID_SIZE;
      render();
      return;
    }

    if (connecting) {
      connecting.mouseX = pos.x;
      connecting.mouseY = pos.y;
      render();
      return;
    }

    // Cursor feedback
    const block = blockAt(pos.x, pos.y);
    if (block && (isOutputPoint(block, pos.x, pos.y) || isInputPoint(block, pos.x, pos.y))) {
      canvas.style.cursor = 'crosshair';
    } else if (block) {
      canvas.style.cursor = 'grab';
    } else {
      canvas.style.cursor = 'default';
    }
  }

  function onMouseUp(e) {
    const pos = getMousePos(e);

    if (connecting) {
      const block = blockAt(pos.x, pos.y);
      if (block && block.id !== connecting.fromId && isInputPoint(block, pos.x, pos.y)) {
        // Check for duplicate
        const exists = connections.some(c => c.from === connecting.fromId && c.to === block.id);
        if (!exists) {
          connections.push({ from: connecting.fromId, to: block.id });
        }
      }
      connecting = null;
      render();
      return;
    }

    dragging = null;
  }

  // ── Serialization ─────────────────────────────────────
  function toJSON() {
    return {
      name: workflowNameInput.value || workflowName,
      blocks: blocks.map(b => ({
        id: b.id,
        category: b.category,
        type: b.type,
        label: b.label,
        x: b.x,
        y: b.y,
        config: Object.fromEntries(b.fields.map(f => [f.key, f.value]))
      })),
      connections: connections.map(c => ({ from: c.from, to: c.to }))
    };
  }

  function fromJSON(json) {
    blocks = [];
    connections = [];
    nextId = 1;
    workflowNameInput.value = json.name || 'Untitled';

    for (const b of json.blocks) {
      const catDef = BLOCK_TYPES[b.category];
      if (!catDef) continue;
      const itemDef = catDef.items.find(i => i.type === b.type) || catDef.items[0];
      blocks.push({
        id: b.id,
        category: b.category,
        type: b.type,
        label: b.label || itemDef.label,
        icon: itemDef.icon,
        color: catDef.color,
        fields: (itemDef.fields || []).map(f => ({
          ...f,
          value: (b.config && b.config[f.key]) || ''
        })),
        x: b.x,
        y: b.y
      });
      if (b.id >= nextId) nextId = b.id + 1;
    }

    connections = (json.connections || []).map(c => ({ from: c.from, to: c.to }));
    selected = null;
    hideProps();
    render();
  }

  // ── Save / Load / Run ─────────────────────────────────
  async function saveWorkflow() {
    const json = toJSON();
    try {
      // Try saving to API first
      await apiRequest('/workflows', {
        method: 'POST',
        body: JSON.stringify(json)
      });
      showToast('Workflow saved to server', 'success');
    } catch {
      // Fallback: save to localStorage
      const saved = JSON.parse(localStorage.getItem('xactions_workflows') || '[]');
      const idx = saved.findIndex(w => w.name === json.name);
      if (idx >= 0) saved[idx] = json; else saved.push(json);
      localStorage.setItem('xactions_workflows', JSON.stringify(saved));
      showToast('Workflow saved locally', 'success');
    }
  }

  async function loadWorkflow() {
    // Try API first
    let workflows = [];
    try {
      const data = await apiRequest('/workflows');
      workflows = data.workflows || [];
    } catch {
      workflows = JSON.parse(localStorage.getItem('xactions_workflows') || '[]');
    }

    if (workflows.length === 0) {
      showToast('No saved workflows found', 'error');
      return;
    }

    // Simple selection via prompt
    const names = workflows.map((w, i) => `${i + 1}. ${w.name}`).join('\n');
    const choice = prompt('Select workflow to load:\n' + names);
    if (!choice) return;
    const idx = parseInt(choice) - 1;
    if (idx >= 0 && idx < workflows.length) {
      fromJSON(workflows[idx]);
      showToast('Workflow loaded', 'success');
    }
  }

  async function runWorkflow() {
    const json = toJSON();
    if (json.blocks.length === 0) {
      showToast('Add blocks to the workflow first', 'error');
      return;
    }
    try {
      await apiRequest('/workflows/run', {
        method: 'POST',
        body: JSON.stringify(json)
      });
      showToast('Workflow execution started', 'success');
    } catch (err) {
      showToast('Run failed: ' + err.message, 'error');
    }
  }

  function clearCanvas() {
    if (blocks.length > 0 && !confirm('Clear all blocks?')) return;
    blocks = [];
    connections = [];
    selected = null;
    nextId = 1;
    hideProps();
    render();
  }

  function exportJSON() {
    const json = toJSON();
    const blob = new Blob([JSON.stringify(json, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = (json.name || 'workflow').replace(/\s+/g, '-').toLowerCase() + '.json';
    a.click();
    URL.revokeObjectURL(url);
    showToast('Exported workflow JSON', 'success');
  }

  // ── Events ────────────────────────────────────────────
  function bindEvents() {
    canvas.addEventListener('mousedown', onMouseDown);
    canvas.addEventListener('mousemove', onMouseMove);
    canvas.addEventListener('mouseup', onMouseUp);
    window.addEventListener('resize', () => { resizeCanvas(); render(); });

    saveBtn.addEventListener('click', saveWorkflow);
    loadBtn.addEventListener('click', loadWorkflow);
    runBtn.addEventListener('click', runWorkflow);
    clearBtn.addEventListener('click', clearCanvas);
    exportBtn.addEventListener('click', exportJSON);

    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selected && document.activeElement.tagName !== 'INPUT' && document.activeElement.tagName !== 'TEXTAREA') {
          removeBlock(selected.id);
        }
      }
    });

    // File import via drag-drop on canvas
    canvas.addEventListener('dragover', (e) => { e.preventDefault(); });
    canvas.addEventListener('drop', (e) => {
      e.preventDefault();
      const file = e.dataTransfer.files[0];
      if (file && file.name.endsWith('.json')) {
        const reader = new FileReader();
        reader.onload = () => {
          try {
            fromJSON(JSON.parse(reader.result));
            showToast('Imported workflow', 'success');
          } catch { showToast('Invalid workflow JSON', 'error'); }
        };
        reader.readAsText(file);
      }
    });
  }

  // ── Boot ──────────────────────────────────────────────
  document.addEventListener('DOMContentLoaded', init);
})();
