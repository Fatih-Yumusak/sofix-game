const express = require('express');
const http = require('http');
const path = require('path');
const { createStickBrawlServer } = require('./games/stickbrawl');

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 3000;

// ==========================================
// INITIALIZE GAME MODULES
// ==========================================
const stickbrawl = createStickBrawlServer();

// ==========================================
// STATIC ROUTES (PORTAL & GAMES)
// ==========================================
app.use('/stickbrawl', express.static(path.join(__dirname, 'games/stickbrawl/public')));
app.use('/', express.static(path.join(__dirname, 'portal')));

// Health & Live Stats API
app.get('/health', (req, res) => {
  res.json({ status: 'ok', games: ['stickbrawl'] });
});

app.get('/api/stats', (req, res) => {
  res.json({
    stickbrawl: stickbrawl.getStats()
  });
});

// ==========================================
// WEBSOCKET MULTIPLEXER (MULTI-GAME ROUTER)
// ==========================================
server.on('upgrade', (request, socket, head) => {
  const url = request.url || '/';

  if (url.startsWith('/ws/stickbrawl') || url === '/') {
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
});
