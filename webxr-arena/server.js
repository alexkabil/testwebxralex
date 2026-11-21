'use strict';

const fs = require('fs');
const path = require('path');
const http = require('http');
const https = require('https');
const { execSync } = require('child_process');
const express = require('express');
const { WebSocketServer } = require('ws');

const HTTP_PORT = process.env.HTTP_PORT || 8080;
const HTTPS_PORT = process.env.HTTPS_PORT || 8443;
const CERT_DIR = path.join(__dirname, 'certs');
const CERT_FILE = path.join(CERT_DIR, 'server.crt');
const KEY_FILE = path.join(CERT_DIR, 'server.key');

function ensureSelfSignedCert() {
    if (fs.existsSync(CERT_FILE) && fs.existsSync(KEY_FILE)) return true;
    fs.mkdirSync(CERT_DIR, { recursive: true });
    try {
      execSync(
        `openssl req -x509 -newkey rsa:2048 -nodes -keyout "${KEY_FILE}" -out "${CERT_FILE}" -days 825 -subj "/CN=webxr-arena.local" -addext "subjectAltName=DNS:webxr-arena.local,IP:127.0.0.1"`,
        { stdio: 'pipe' }
      );
      console.log('[cert] certificat auto-signé généré dans ./certs via openssl (WebXR exige HTTPS ou localhost)');
      return true;
    } catch {}
    try {
      const selfsigned = require('selfsigned');
      const pems = selfsigned.generate(
        [{ name: 'commonName', value: 'webxr-arena.local' }],
        {
          days: 825,
          keySize: 2048,
          extensions: [
            { name: 'subjectAltName', altNames: [{ type: 2, value: 'webxr-arena.local' }, { type: 7, ip: '127.0.0.1' }] }
          ]
        }
      );
      fs.writeFileSync(KEY_FILE, pems.private);
      fs.writeFileSync(CERT_FILE, pems.cert);
      console.log('[cert] certificat auto-signé généré dans ./certs via selfsigned (openssl absent) — WebXR exige HTTPS ou localhost');
      return true;
    } catch (e) {
      console.warn('[cert] impossible de générer un certificat auto-signé :', e.message);
      return false;
    }
  }

const PALETTE = [
  '#ff5252', '#ff9800', '#ffeb3b', '#8bc34a', '#00e676', '#00e5ff',
  '#2979ff', '#651fff', '#d500f9', '#ff4081', '#ffee58', '#69f0ae',
  '#40c4ff', '#e040fb', '#ff6e40', '#18ffff'
];

const players = new Map(); // id -> { id, color, ws, head, controllers, lastSeen }
const monitors = new Set();
let nextId = 1;

function makeId() {
  return 'P' + nextId++;
}

function snapshot() {
  return [...players.values()].map((p) => ({
    id: p.id,
    color: p.color,
    head: p.head,
    controllers: p.controllers,
    lastSeen: p.lastSeen
  }));
}

function send(ws, msg) {
  if (ws && ws.readyState === 1) ws.send(JSON.stringify(msg));
}

function broadcast(msg, exceptId) {
  const data = JSON.stringify(msg);
  for (const p of players.values()) {
    if (p.id !== exceptId && p.ws.readyState === 1) p.ws.send(data);
  }
  for (const m of monitors) {
    if (m.readyState === 1) m.send(data);
  }
}

function attachWs(wss) {
  wss.on('connection', (ws, req) => {
    const url = new URL(req.url, 'http://localhost');
    const role = url.searchParams.get('role') || 'player';

    if (role === 'monitor') {
      monitors.add(ws);
      send(ws, { type: 'welcome', role: 'monitor', players: snapshot() });
      ws.on('close', () => monitors.delete(ws));
      return;
    }

    const id = makeId();
    const color = PALETTE[(nextId - 2) % PALETTE.length];
    const player = { id, color, ws, head: null, controllers: [], lastSeen: Date.now() };
    players.set(id, player);

    send(ws, { type: 'welcome', role: 'player', id, color, players: snapshot().filter((p) => p.id !== id) });
    broadcast({ type: 'join', id, color }, id);
    console.log(`[join] ${id} (${color}) — ${players.size} joueur(s) en ligne`);

    ws.on('message', (raw) => {
      let msg;
      try { msg = JSON.parse(raw); } catch { return; }
      if (msg.type === 'state') {
        player.head = msg.head || null;
        player.controllers = Array.isArray(msg.controllers) ? msg.controllers : [];
        player.lastSeen = Date.now();
        broadcast({ type: 'player', id, color, head: player.head, controllers: player.controllers, ts: player.lastSeen }, id);
      } else if (msg.type === 'ping') {
        send(ws, { type: 'pong', ts: Date.now() });
      }
    });

    ws.on('close', () => {
      players.delete(id);
      broadcast({ type: 'leave', id });
      console.log(`[leave] ${id} — ${players.size} joueur(s) en ligne`);
    });
    ws.on('error', () => {});
  });
}

const app = express();
app.use(express.static(path.join(__dirname, 'public')));

app.get('/api/players', (req, res) => {
  res.json({ now: Date.now(), players: snapshot() });
});

app.get('/health', (req, res) => res.json({ ok: true, players: players.size }));

app.get('/monitor', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'monitor.html'));
});

const httpServer = http.createServer(app);
const wssHttp = new WebSocketServer({ server: httpServer, path: '/ws' });
attachWs(wssHttp);

httpServer.listen(HTTP_PORT, '0.0.0.0', () => {
  console.log(`[http]  http://0.0.0.0:${HTTP_PORT}  (dashboard: /monitor — pas de WebXR en HTTP non-localhost)`);
});

if (ensureSelfSignedCert()) {
  const httpsServer = https.createServer(
    { cert: fs.readFileSync(CERT_FILE), key: fs.readFileSync(KEY_FILE) },
    app
  );
  const wssHttps = new WebSocketServer({ server: httpsServer, path: '/ws' });
  attachWs(wssHttps);
  httpsServer.listen(HTTPS_PORT, '0.0.0.0', () => {
    console.log(`[https] https://0.0.0.0:${HTTPS_PORT}  (client WebXR pour casques : / )`);
  });
} else {
  console.warn('[https] démarrage en HTTP uniquement — WebXR ne fonctionnera pas sur les casques sans HTTPS/localhost');
}

setInterval(() => {
  const now = Date.now();
  for (const [id, p] of players) {
    if (now - p.lastSeen > 15000 && p.ws.readyState === 1) {
      p.ws.terminate();
      players.delete(id);
      broadcast({ type: 'leave', id });
      console.log(`[timeout] ${id}`);
    }
  }
}, 5000);