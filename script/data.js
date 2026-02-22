/**
 * data.js — API helpers and sidebar renderers for domVis.
 */

/**
 * Fetches the DOM tree and metrics for a given URL from the backend.
 * @param {string} url
 * @returns {Promise<{tree: object, metrics: object}>}
 */
async function fetchTree(url) {
  const response = await fetch('/api/url', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url })
  });
  const data = await response.json();
  if (!data.success) {
    throw new Error(data.error || 'Unknown server error');
  }
  return { tree: data.tree, metrics: data.metrics };
}

/**
 * Renders tree-level metrics into the sidebar #metrics-content element.
 * @param {object} metrics - { totalNodes, maxDepth, maxWidth, avgWidth }
 */
function renderMetrics(metrics) {
  const el = document.getElementById('metrics-content');
  el.innerHTML = `
    <div class="metric-row">
      <span class="metric-label">Total nodes</span>
      <span class="metric-value">${metrics.totalNodes}</span>
    </div>
    <div class="metric-row">
      <span class="metric-label">Max depth</span>
      <span class="metric-value">${metrics.maxDepth}</span>
    </div>
    <div class="metric-row">
      <span class="metric-label">Max width</span>
      <span class="metric-value">${metrics.maxWidth}</span>
    </div>
    <div class="metric-row">
      <span class="metric-label">Avg width</span>
      <span class="metric-value">${metrics.avgWidth}</span>
    </div>
  `;
}

/**
 * Renders information about a clicked node into the sidebar #node-content element.
 * @param {object} nodeData - { name, tag, id, className, attributes, depth }
 */
function renderNodeInfo(nodeData) {
  const el = document.getElementById('node-content');

  const attrEntries = Object.entries(nodeData.attributes || {});
  const attrHTML = attrEntries.length
    ? attrEntries.map(([k, v]) => `
        <div class="node-attr-row">
          <span class="attr-key">${escapeHtml(k)}=</span>
          <span class="attr-value">"${escapeHtml(String(v))}"</span>
        </div>
      `).join('')
    : '';

  const idHTML = nodeData.id
    ? `<div class="node-attr-row"><span class="attr-key">id=</span><span class="attr-value">"${escapeHtml(nodeData.id)}"</span></div>`
    : '';

  const classHTML = nodeData.className
    ? `<div class="node-attr-row"><span class="attr-key">class=</span><span class="attr-value">"${escapeHtml(nodeData.className)}"</span></div>`
    : '';

  el.innerHTML = `
    <div class="node-tag">&lt;${escapeHtml(nodeData.name)}&gt;</div>
    <div class="metric-row">
      <span class="metric-label">Depth</span>
      <span class="metric-value">${nodeData.depth}</span>
    </div>
    <div class="metric-row">
      <span class="metric-label">Children</span>
      <span class="metric-value">${(nodeData.children || []).length}</span>
    </div>
    ${idHTML}
    ${classHTML}
    ${attrHTML}
  `;
}

/**
 * Resets the node info panel to its placeholder state.
 */
function clearNodeInfo() {
  const el = document.getElementById('node-content');
  el.innerHTML = '<span class="placeholder-text">Click a node to inspect it.</span>';
}

/**
 * Escapes HTML special characters to prevent XSS when inserting text into innerHTML.
 */
function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
