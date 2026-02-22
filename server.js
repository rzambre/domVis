var http = require('http');
var express = require('express');
var path = require('path');
var bodyParser = require('body-parser');
var axios = require('axios');
var cheerio = require('cheerio');

var app = express();
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

var SKIP_TAGS = new Set(['script', 'style', 'noscript', 'link', 'meta', 'head']);

function buildTree(node, depth) {
  if (!node || node.type !== 'tag') return null;
  if (SKIP_TAGS.has(node.name.toLowerCase())) return null;

  var attribs = node.attribs || {};
  var id = attribs.id || '';
  var className = attribs.class || '';
  var attributes = {};
  Object.keys(attribs).forEach(function(key) {
    if (key !== 'id' && key !== 'class') {
      attributes[key] = attribs[key];
    }
  });

  var children = (node.children || [])
    .map(function(c) { return buildTree(c, depth + 1); })
    .filter(Boolean);

  return {
    name: node.name.toUpperCase(),
    tag: node.name.toLowerCase(),
    id: id,
    className: className,
    attributes: attributes,
    depth: depth,
    children: children
  };
}

function computeMetrics(root) {
  if (!root) return { totalNodes: 0, maxDepth: 0, maxWidth: 0, avgWidth: 0, widthByLevel: [] };

  var totalNodes = 0;
  var widthByLevel = [];
  var queue = [root];

  while (queue.length > 0) {
    var levelSize = queue.length;
    widthByLevel.push(levelSize);
    totalNodes += levelSize;
    var nextQueue = [];
    for (var i = 0; i < levelSize; i++) {
      var node = queue[i];
      if (node.children && node.children.length > 0) {
        node.children.forEach(function(child) { nextQueue.push(child); });
      }
    }
    queue = nextQueue;
  }

  var maxDepth = widthByLevel.length - 1;
  var maxWidth = Math.max.apply(null, widthByLevel);
  var avgWidth = parseFloat((widthByLevel.reduce(function(s, w) { return s + w; }, 0) / widthByLevel.length).toFixed(1));

  return { totalNodes: totalNodes, maxDepth: maxDepth, maxWidth: maxWidth, avgWidth: avgWidth, widthByLevel: widthByLevel };
}

app.post('/api/url', async function(req, res) {
  var url = req.body.url;
  if (!url) {
    return res.status(400).json({ success: false, error: 'No URL provided.' });
  }

  // Prepend https:// if missing
  if (!/^https?:\/\//i.test(url)) {
    url = 'https://' + url;
  }

  try {
    var response = await axios.get(url, {
      timeout: 10000,
      maxRedirects: 5,
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; domVis/0.1)' }
    });
    var $ = cheerio.load(response.data);
    var tree = buildTree($('html')[0], 0);
    var metrics = computeMetrics(tree);
    res.json({ success: true, tree: tree, metrics: metrics });
  } catch (err) {
    var msg = err.response
      ? 'HTTP ' + err.response.status + ': ' + err.response.statusText
      : err.message;
    res.status(500).json({ success: false, error: msg });
  }
});

app.set('port', process.env.PORT || 8080);
app.use(express.static(path.join(__dirname, '/')));

http.createServer(app).listen(app.get('port'), function() {
  console.log('domVis server listening on port ' + app.get('port'));
});
