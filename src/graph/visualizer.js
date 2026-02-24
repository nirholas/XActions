/**
 * XActions Social Graph Visualizer
 * Exports graph data for D3.js, Gephi (GEXF), and standalone HTML
 *
 * @author nich (@nichxbt) - https://github.com/nirholas
 * @license MIT
 */

import { computeInfluenceScores } from './analyzer.js';
import { detectClusters } from './analyzer.js';

// ============================================================================
// D3.js Export
// ============================================================================

/**
 * Export graph to D3.js force-directed format
 * @returns {{ nodes: Array, links: Array }}
 */
export function toD3(graph, options = {}) {
  const scores = computeInfluenceScores(graph);
  const clusters = detectClusters(graph);

  // Build cluster lookup
  const clusterMap = new Map();
  for (const cluster of clusters) {
    for (const member of cluster.members) {
      clusterMap.set(member, cluster.id);
    }
  }

  const nodes = Array.from(graph.nodes.values()).map((node) => ({
    id: node.username,
    name: node.name || node.username,
    followers: node.followers || 0,
    following: node.following || 0,
    bio: (node.bio || '').slice(0, 200),
    verified: node.verified || false,
    depth: node.depth || 0,
    influence: scores.get(node.username) || 0,
    cluster: clusterMap.get(node.username) ?? -1,
    isSeed: node.username === graph.seed,
    profileImage: node.profileImage || '',
  }));

  const links = graph.edges.map((edge) => ({
    source: edge.source,
    target: edge.target,
    type: edge.type,
    weight: edge.weight || 1,
  }));

  return { nodes, links, metadata: graph.metadata };
}

// ============================================================================
// GEXF Export (Gephi)
// ============================================================================

/**
 * Export graph to GEXF format for Gephi
 */
export function toGEXF(graph) {
  const scores = computeInfluenceScores(graph);

  const escapeXml = (str) =>
    String(str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');

  let gexf = `<?xml version="1.0" encoding="UTF-8"?>
<gexf xmlns="http://gexf.net/1.3" version="1.3">
  <meta lastmodifieddate="${new Date().toISOString().split('T')[0]}">
    <creator>XActions</creator>
    <description>Social graph for @${escapeXml(graph.seed)}</description>
  </meta>
  <graph defaultedgetype="directed">
    <attributes class="node">
      <attribute id="0" title="followers" type="integer"/>
      <attribute id="1" title="following" type="integer"/>
      <attribute id="2" title="influence" type="float"/>
      <attribute id="3" title="bio" type="string"/>
      <attribute id="4" title="verified" type="boolean"/>
    </attributes>
    <nodes>
`;

  for (const node of graph.nodes.values()) {
    const influence = scores.get(node.username) || 0;
    gexf += `      <node id="${escapeXml(node.username)}" label="${escapeXml(node.name || node.username)}">
        <attvalues>
          <attvalue for="0" value="${node.followers || 0}"/>
          <attvalue for="1" value="${node.following || 0}"/>
          <attvalue for="2" value="${influence}"/>
          <attvalue for="3" value="${escapeXml(node.bio)}"/>
          <attvalue for="4" value="${node.verified || false}"/>
        </attvalues>
      </node>
`;
  }

  gexf += `    </nodes>
    <edges>
`;

  graph.edges.forEach((edge, i) => {
    gexf += `      <edge id="${i}" source="${escapeXml(edge.source)}" target="${escapeXml(edge.target)}" weight="${edge.weight || 1}"/>
`;
  });

  gexf += `    </edges>
  </graph>
</gexf>`;

  return gexf;
}

// ============================================================================
// Standalone HTML Visualization
// ============================================================================

/**
 * Generate a self-contained HTML file with an interactive D3.js force graph
 */
export function toHTML(graph) {
  const d3Data = toD3(graph);

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Social Graph: @${graph.seed} — XActions</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { background: #000; color: #e7e9ea; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; overflow: hidden; }
  #controls { position: fixed; top: 16px; left: 16px; z-index: 10; background: rgba(22,24,28,0.95); border: 1px solid #2f3336; border-radius: 12px; padding: 16px; min-width: 260px; }
  #controls h2 { font-size: 16px; margin-bottom: 8px; color: #1d9bf0; }
  #controls p { font-size: 12px; color: #71767b; margin-bottom: 4px; }
  #controls input { width: 100%; padding: 6px 10px; margin: 8px 0; border: 1px solid #2f3336; border-radius: 8px; background: #16181c; color: #e7e9ea; font-size: 13px; }
  #controls label { font-size: 12px; color: #71767b; display: flex; align-items: center; gap: 6px; margin: 4px 0; cursor: pointer; }
  #controls input[type="checkbox"] { width: auto; margin: 0; }
  .legend { margin-top: 12px; }
  .legend-item { display: flex; align-items: center; gap: 6px; font-size: 11px; margin: 3px 0; }
  .legend-dot { width: 10px; height: 10px; border-radius: 50%; flex-shrink: 0; }
  #tooltip { position: fixed; display: none; background: rgba(22,24,28,0.95); border: 1px solid #2f3336; border-radius: 8px; padding: 12px; font-size: 12px; max-width: 280px; z-index: 20; pointer-events: none; }
  #tooltip .name { font-weight: 700; color: #e7e9ea; margin-bottom: 4px; }
  #tooltip .username { color: #1d9bf0; margin-bottom: 6px; }
  #tooltip .bio { color: #71767b; margin-bottom: 6px; }
  #tooltip .stats { color: #71767b; }
  #tooltip .stats span { color: #e7e9ea; font-weight: 600; }
  svg { width: 100vw; height: 100vh; }
  .link { stroke-opacity: 0.15; }
  .link:hover { stroke-opacity: 0.6; }
</style>
</head>
<body>
<div id="controls">
  <h2>📊 @${graph.seed}</h2>
  <p>${d3Data.nodes.length} accounts · ${d3Data.links.length} connections</p>
  <input type="text" id="search" placeholder="Search accounts...">
  <label><input type="checkbox" id="showLabels" checked> Show labels</label>
  <label><input type="checkbox" id="colorClusters" checked> Color by cluster</label>
  <div class="legend" id="legend"></div>
</div>
<div id="tooltip">
  <div class="name"></div>
  <div class="username"></div>
  <div class="bio"></div>
  <div class="stats"></div>
</div>
<svg></svg>

<script src="https://cdn.jsdelivr.net/npm/d3@7/dist/d3.min.js"></script>
<script>
const graphData = ${JSON.stringify(d3Data)};

const svg = d3.select('svg');
const width = window.innerWidth;
const height = window.innerHeight;
svg.attr('viewBox', [0, 0, width, height]);

const clusterColors = ['#1d9bf0','#f91880','#ffd400','#00ba7c','#7856ff','#ff7a00','#00d4aa','#f4212e','#794bc4','#17bf63'];
const defaultColor = '#536471';

const g = svg.append('g');

// Zoom
svg.call(d3.zoom().scaleExtent([0.1, 8]).on('zoom', (e) => g.attr('transform', e.transform)));

const simulation = d3.forceSimulation(graphData.nodes)
  .force('link', d3.forceLink(graphData.links).id(d => d.id).distance(80).strength(0.3))
  .force('charge', d3.forceManyBody().strength(-120).distanceMax(400))
  .force('center', d3.forceCenter(width / 2, height / 2))
  .force('collision', d3.forceCollide().radius(d => nodeRadius(d) + 2));

const link = g.append('g')
  .selectAll('line')
  .data(graphData.links)
  .join('line')
  .attr('class', 'link')
  .attr('stroke', '#2f3336')
  .attr('stroke-width', d => d.weight || 0.5);

const node = g.append('g')
  .selectAll('circle')
  .data(graphData.nodes)
  .join('circle')
  .attr('r', nodeRadius)
  .attr('fill', nodeColor)
  .attr('stroke', d => d.isSeed ? '#1d9bf0' : 'none')
  .attr('stroke-width', d => d.isSeed ? 3 : 0)
  .attr('cursor', 'pointer')
  .call(d3.drag().on('start', dragStart).on('drag', dragging).on('end', dragEnd));

const label = g.append('g')
  .selectAll('text')
  .data(graphData.nodes)
  .join('text')
  .text(d => d.isSeed ? d.name : (d.influence > 30 ? d.name : ''))
  .attr('font-size', d => d.isSeed ? 13 : 10)
  .attr('fill', '#e7e9ea')
  .attr('text-anchor', 'middle')
  .attr('dy', d => -nodeRadius(d) - 4)
  .style('pointer-events', 'none');

function nodeRadius(d) {
  if (d.isSeed) return 16;
  return Math.max(4, Math.min(14, 3 + Math.sqrt(d.influence)));
}

function nodeColor(d) {
  if (d.isSeed) return '#1d9bf0';
  if (document.getElementById('colorClusters')?.checked && d.cluster >= 0) {
    return clusterColors[d.cluster % clusterColors.length];
  }
  return defaultColor;
}

// Tooltip
const tooltip = d3.select('#tooltip');
node.on('mouseover', (e, d) => {
  tooltip.style('display', 'block')
    .style('left', (e.pageX + 12) + 'px')
    .style('top', (e.pageY - 12) + 'px');
  tooltip.select('.name').text(d.name);
  tooltip.select('.username').text('@' + d.id);
  tooltip.select('.bio').text(d.bio || '');
  tooltip.select('.stats').html(\`<span>\${fmt(d.followers)}</span> followers · <span>\${fmt(d.following)}</span> following · Influence: <span>\${d.influence.toFixed(1)}</span>\`);
}).on('mouseout', () => tooltip.style('display', 'none'));

function fmt(n) { return n >= 1e6 ? (n/1e6).toFixed(1)+'M' : n >= 1e3 ? (n/1e3).toFixed(1)+'K' : n; }

simulation.on('tick', () => {
  link.attr('x1', d => d.source.x).attr('y1', d => d.source.y)
      .attr('x2', d => d.target.x).attr('y2', d => d.target.y);
  node.attr('cx', d => d.x).attr('cy', d => d.y);
  label.attr('x', d => d.x).attr('y', d => d.y);
});

function dragStart(e, d) { if (!e.active) simulation.alphaTarget(0.3).restart(); d.fx = d.x; d.fy = d.y; }
function dragging(e, d) { d.fx = e.x; d.fy = e.y; }
function dragEnd(e, d) { if (!e.active) simulation.alphaTarget(0); d.fx = null; d.fy = null; }

// Search
document.getElementById('search').addEventListener('input', (e) => {
  const q = e.target.value.toLowerCase();
  node.attr('opacity', d => (!q || d.id.includes(q) || (d.name||'').toLowerCase().includes(q)) ? 1 : 0.1);
  label.attr('opacity', d => (!q || d.id.includes(q) || (d.name||'').toLowerCase().includes(q)) ? 1 : 0.05);
  link.attr('opacity', q ? 0.03 : 0.15);
});

// Toggle labels
document.getElementById('showLabels').addEventListener('change', (e) => {
  label.attr('display', e.target.checked ? null : 'none');
});

// Toggle cluster colors
document.getElementById('colorClusters').addEventListener('change', () => {
  node.attr('fill', nodeColor);
});

// Build legend
const clusters = [...new Set(graphData.nodes.filter(n => n.cluster >= 0).map(n => n.cluster))].sort((a,b) => a - b);
const legendEl = document.getElementById('legend');
if (clusters.length > 1) {
  clusters.slice(0, 8).forEach(c => {
    const count = graphData.nodes.filter(n => n.cluster === c).length;
    legendEl.innerHTML += \`<div class="legend-item"><div class="legend-dot" style="background:\${clusterColors[c % clusterColors.length]}"></div>Cluster \${c+1} (\${count})</div>\`;
  });
}
</script>
</body>
</html>`;
}

export default { toD3, toGEXF, toHTML };
