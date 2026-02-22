# domVis

An interactive web app that visualizes the DOM tree of any web page as a navigable hierarchical diagram.

---

## Features

- **Hierarchical tree diagram** — shows the actual parent-child DOM structure (not a decorative fractal)
- **Zoom & pan** — scroll/pinch to zoom, drag to pan (Google Maps-style via `d3.zoom`)
- **Click to inspect** — click any node to see its tag name, id, class, attributes, depth, and child count in the sidebar
- **Tree metrics** — total nodes, max depth, max width, and average width computed server-side
- **Error handling** — invalid URLs and fetch failures surface a readable message in the canvas

---

## Architecture

```
Browser → POST /api/url → Express server → axios.get(url) → cheerio parses HTML
                                         → buildTree()    → JSON node tree
                                         → computeMetrics() → stats
         ← { success, tree, metrics } ←
D3 v7 renders hierarchy with zoom/pan + click-to-inspect sidebar
```

### Backend (`server.js`)
- **`buildTree(node, depth)`** — recursively traverses cheerio's parsed DOM; skips `script`, `style`, `noscript`, `link`, `meta`, `head`; returns nodes with `{ name, tag, id, className, attributes, depth, children }`
- **`computeMetrics(root)`** — BFS level-by-level to compute `totalNodes`, `maxDepth`, `maxWidth`, `avgWidth`
- **`POST /api/url`** — accepts `{ url }`, returns `{ success, tree, metrics }` or a descriptive error

### Frontend
| File | Role |
|---|---|
| `index.html` | Two-column layout: 260px sidebar + flex canvas; D3 v7 via CDN |
| `style/style.css` | Dark theme; CSS custom properties; flex layout |
| `script/data.js` | `fetchTree()`, `renderMetrics()`, `renderNodeInfo()`, `clearNodeInfo()` |
| `script/init.js` | D3 v7 hierarchy + `d3.tree().nodeSize([28,60])` layout; `d3.zoom()` pan/zoom; click handler |

---

## Stack

- **Node.js** + **Express** — HTTP server, static file serving
- **axios** — fetches external URLs server-side
- **cheerio** — parses HTML and traverses the DOM on the server
- **D3 v7** — hierarchy layout, bezier link curves, zoom/pan, color scale

---

## Running locally

```bash
npm install
node server.js
# Open http://localhost:8080
```

Enter any URL (e.g. `https://example.com`) and click **Visualize**.

---

## Status

Working. The full visualization pipeline is functional:
- Server fetches, parses, and returns structured JSON trees
- D3 renders the hierarchy with zoom/pan and click-to-inspect
- Sidebar shows live metrics and per-node details

---

*Built by [Rohit Zambre](https://www.rohitzambre.com)*
