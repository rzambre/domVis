/**
 * init.js — D3 v7 DOM tree visualization for domVis.
 *
 * Renders a navigable hierarchical tree diagram from JSON returned by the backend.
 * Supports zoom/pan via d3.zoom() and click-to-inspect via the sidebar.
 */

(function () {
  // ── State ────────────────────────────────────────────────────────────────
  let selectedNode = null;

  // ── SVG setup ────────────────────────────────────────────────────────────
  const svg = d3.select('#tree-svg');
  const treeGroup = svg.append('g').attr('class', 'tree-group');
  const linksGroup = treeGroup.append('g').attr('class', 'links');
  const nodesGroup = treeGroup.append('g').attr('class', 'nodes');

  // ── Zoom / pan ────────────────────────────────────────────────────────────
  const zoom = d3.zoom()
    .scaleExtent([0.05, 8])
    .on('zoom', function (event) {
      treeGroup.attr('transform', event.transform);
    });

  svg.call(zoom);

  // Deselect node when clicking on empty SVG background
  svg.on('click', function (event) {
    if (event.target === svg.node() || event.target === treeGroup.node()) {
      deselectNode();
    }
  });

  // ── Color scale ───────────────────────────────────────────────────────────
  const color = d3.scaleOrdinal(d3.schemeTableau10);

  // ── UI wiring ─────────────────────────────────────────────────────────────
  const urlInput = document.getElementById('url-input');
  const btn = document.getElementById('visualize-btn');

  btn.addEventListener('click', startVisualization);
  urlInput.addEventListener('keydown', function (e) {
    if (e.key === 'Enter') startVisualization();
  });

  // ── Main flow ─────────────────────────────────────────────────────────────
  async function startVisualization() {
    const url = urlInput.value.trim();
    if (!url) return;

    setStatus('loading');
    btn.disabled = true;
    deselectNode();

    // Reset metrics panel
    document.getElementById('metrics-content').innerHTML =
      '<span class="placeholder-text">Loading…</span>';

    try {
      const { tree, metrics } = await fetchTree(url);
      renderTree(tree);
      renderMetrics(metrics);
      setStatus('hidden');
    } catch (err) {
      setStatus('error', err.message);
      document.getElementById('metrics-content').innerHTML =
        '<span class="placeholder-text">No tree loaded yet.</span>';
    } finally {
      btn.disabled = false;
    }
  }

  // ── Status overlay ────────────────────────────────────────────────────────
  function setStatus(state, message) {
    const overlay = document.getElementById('status-overlay');
    overlay.classList.remove('hidden');

    if (state === 'hidden') {
      overlay.classList.add('hidden');
      return;
    }

    if (state === 'loading') {
      overlay.innerHTML = '<div class="spinner"></div><span>Fetching and parsing…</span>';
    } else if (state === 'error') {
      overlay.innerHTML = `<span class="error-icon">⚠</span><span>${escapeHtml(message)}</span>`;
    }
  }

  // ── Tree rendering ────────────────────────────────────────────────────────
  function renderTree(treeData) {
    // Clear previous render
    linksGroup.selectAll('*').remove();
    nodesGroup.selectAll('*').remove();

    // Build D3 hierarchy
    const root = d3.hierarchy(treeData, function (d) {
      return d.children && d.children.length ? d.children : null;
    });

    // Fixed-size layout so nodes don't overlap for wide trees
    const layout = d3.tree().nodeSize([28, 60]);
    layout(root);

    // ── Links ──
    const linkGenerator = d3.linkVertical()
      .x(function (d) { return d.x; })
      .y(function (d) { return d.y; });

    linksGroup.selectAll('path.link')
      .data(root.links())
      .join('path')
        .attr('class', 'link')
        .attr('d', linkGenerator);

    // ── Nodes ──
    const node = nodesGroup.selectAll('g.node')
      .data(root.descendants())
      .join('g')
        .attr('class', 'node')
        .attr('transform', function (d) { return `translate(${d.x},${d.y})`; })
        .on('click', onNodeClick);

    node.append('circle')
      .attr('r', function (d) { return d.children ? 6 : 4; })
      .attr('fill', function (d) { return color(String(d.depth % 10)); })
      .attr('stroke', function (d) { return color(String(d.depth % 10)); });

    node.append('text')
      .attr('dy', function (d) { return d.children ? -10 : 13; })
      .attr('text-anchor', 'middle')
      .text(function (d) { return d.data.name; });

    // Center the tree in the viewport
    centerTree(root);
  }

  // ── Fit tree to viewport ──────────────────────────────────────────────────
  function centerTree(root) {
    const canvas = document.getElementById('canvas');
    const W = canvas.clientWidth;
    const H = canvas.clientHeight;

    // Find bounding box of all node positions
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    root.each(function (d) {
      if (d.x < minX) minX = d.x;
      if (d.x > maxX) maxX = d.x;
      if (d.y < minY) minY = d.y;
      if (d.y > maxY) maxY = d.y;
    });

    const treeW = maxX - minX + 60;
    const treeH = maxY - minY + 60;
    const scale = Math.min(W / treeW, H / treeH, 1);
    const tx = W / 2 - scale * (minX + maxX) / 2;
    const ty = 40 * scale - scale * minY;

    svg.call(zoom.transform, d3.zoomIdentity.translate(tx, ty).scale(scale));
  }

  // ── Node click handler ────────────────────────────────────────────────────
  function onNodeClick(event, d) {
    event.stopPropagation();

    if (selectedNode) {
      selectedNode.classed('selected', false);
    }

    const nodeEl = d3.select(this);
    if (selectedNode && selectedNode.datum() === d) {
      // Toggle off
      selectedNode = null;
      clearNodeInfo();
    } else {
      nodeEl.classed('selected', true);
      selectedNode = nodeEl;
      renderNodeInfo(d.data);
    }
  }

  function deselectNode() {
    if (selectedNode) {
      selectedNode.classed('selected', false);
      selectedNode = null;
    }
    clearNodeInfo();
  }
})();
