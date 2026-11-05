const express = require('express');
const http = require('http');
const path = require('path');
const { createStickBrawlServer } = require('./games/stickbrawl');
const { createTronServer } = require('./games/tron');

const app = express();
app.disable('x-powered-by');

// Basic HTTP Security Headers
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  next();
});

const server = http.createServer(app);
const PORT = process.env.PORT || 3000;

// ==========================================
// INITIALIZE GAME MODULES
// ==========================================
const stickbrawl = createStickBrawlServer();
const tron = createTronServer();

// ==========================================
// STATIC ROUTES (PORTAL & GAMES)
// ==========================================
app.use('/stickbrawl', express.static(path.join(__dirname, 'games/stickbrawl/public')));
app.use('/tron', express.static(path.join(__dirname, 'games/tron/public')));
app.use('/', express.static(path.join(__dirname, 'portal')));

// Health & Live Stats API
app.get('/health', (req, res) => {
  res.json({ status: 'ok', games: ['stickbrawl', 'tron'] });
});

app.get('/api/stats', (req, res) => {
  res.json({
    stickbrawl: stickbrawl.getStats(),
    tron: tron.getStats()
  });
});

// ==========================================
// WEBSOCKET MULTIPLEXER (MULTI-GAME ROUTER)
// ==========================================
server.on('upgrade', (request, socket, head) => {
  const url = request.url || '/';

  if (url.startsWith('/ws/tron')) {
    tron.wss.handleUpgrade(request, socket, head, (ws) => {
      tron.wss.emit('connection', ws, request);
    });
  } else if (url.startsWith('/ws/stickbrawl') || url === '/') {
    stickbrawl.wss.handleUpgrade(request, socket, head, (ws) => {
      stickbrawl.wss.emit('connection', ws, request);
    });
  } else {
    socket.destroy();
  }
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Sofix Game Hub çalışıyor: http://0.0.0.0:${PORT}`);
  console.log(`- Ana Portal: http://0.0.0.0:${PORT}/`);
  console.log(`- StickBrawl Arena: http://0.0.0.0:${PORT}/stickbrawl/`);
  console.log(`- Tron Neon Grid 3D: http://0.0.0.0:${PORT}/tron/`);
});
