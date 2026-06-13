#!/usr/bin/env node
/**
 * dev-proxy.mjs
 *
 * Binds PORT immediately (satisfying Replit's health-check) then starts
 * Expo Metro on an internal port and proxies all traffic once it is ready.
 *
 * Resilience built in:
 *  - Finds a free internal port for Metro (avoids EADDRINUSE from orphaned processes)
 *  - Does NOT exit the proxy if Metro crashes; instead it retries after 3 s
 *  - Forwards HTTP + WebSocket (HMR) once Metro is ready
 *  - Passes SIGTERM/SIGINT through to the Metro child
 */

import { createServer, request as httpRequest } from 'http';
import { spawn, execSync } from 'child_process';
import { connect as netConnect } from 'net';
import { createServer as createNetServer } from 'net';

const PORT = parseInt(process.env.PORT || '24951', 10);

// ─── Find a free internal port ───────────────────────────────────────────────

async function findFreePort(startAt) {
  return new Promise((resolve, reject) => {
    const srv = createNetServer();
    srv.listen(startAt, '127.0.0.1', () => {
      const { port } = srv.address();
      srv.close(() => resolve(port));
    });
    srv.on('error', () => findFreePort(startAt + 1).then(resolve).catch(reject));
  });
}

// ─── Loading page ─────────────────────────────────────────────────────────────

const LOADING_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta http-equiv="refresh" content="5">
  <title>DENARIXX — Loading</title>
  <style>
    *{box-sizing:border-box;margin:0;padding:0}
    body{display:flex;align-items:center;justify-content:center;min-height:100vh;
         background:#0B1020;color:#00E5FF;font-family:system-ui,sans-serif;
         flex-direction:column;gap:20px}
    h1{font-size:2rem;letter-spacing:.15em;font-weight:700}
    p{color:#7D8FA0;font-size:.95rem}
    @keyframes pulse{0%,100%{opacity:1}50%{opacity:.25}}
    span{animation:pulse 1.2s ease-in-out infinite;display:inline-block}
    span:nth-child(2){animation-delay:.2s}
    span:nth-child(3){animation-delay:.4s}
  </style>
</head>
<body>
  <h1>DENARIXX</h1>
  <p>Compiling mobile preview<span>.</span><span>.</span><span>.</span></p>
</body>
</html>`;

// ─── State ────────────────────────────────────────────────────────────────────

let metroPort = null;
let metroReady = false;
let metroProcess = null;

// ─── HTTP proxy ───────────────────────────────────────────────────────────────

function proxyHTTP(clientReq, clientRes) {
  const proxyReq = httpRequest(
    {
      host: '127.0.0.1',
      port: metroPort,
      path: clientReq.url,
      method: clientReq.method,
      headers: { ...clientReq.headers, host: `localhost:${metroPort}` },
    },
    (proxyRes) => {
      clientRes.writeHead(proxyRes.statusCode ?? 200, proxyRes.headers);
      proxyRes.pipe(clientRes, { end: true });
    }
  );
  clientReq.pipe(proxyReq, { end: true });
  proxyReq.on('error', () => {
    if (!clientRes.headersSent) clientRes.writeHead(502).end('Bad Gateway');
  });
}

// ─── WebSocket (HMR) upgrade proxy ────────────────────────────────────────────

function proxyWebSocket(req, socket, head) {
  const upstream = netConnect({ host: '127.0.0.1', port: metroPort }, () => {
    const hdrs = Object.entries(req.headers).map(([k, v]) => `${k}: ${v}`).join('\r\n');
    upstream.write(`${req.method} ${req.url} HTTP/1.1\r\n${hdrs}\r\n\r\n`);
    if (head.length) upstream.write(head);
    upstream.pipe(socket, { end: true });
    socket.pipe(upstream, { end: true });
  });
  upstream.on('error', () => socket.destroy());
  socket.on('error', () => upstream.destroy());
}

// ─── Proxy server (binds PORT immediately) ────────────────────────────────────

const server = createServer((req, res) => {
  if (metroReady) {
    proxyHTTP(req, res);
  } else {
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(LOADING_HTML);
  }
});

server.on('upgrade', (req, socket, head) => {
  if (metroReady) proxyWebSocket(req, socket, head);
  else socket.destroy();
});

server.listen(PORT, () => {
  process.stdout.write(`[proxy] Listening on port ${PORT}\n`);
  bootstrap();
});

// ─── Bootstrap: find free metro port then start Metro ─────────────────────────

async function bootstrap() {
  metroPort = await findFreePort(PORT + 1);
  process.stdout.write(`[proxy] Metro will start on internal port ${metroPort}\n`);
  startMetro();
  pollMetro();
}

// ─── Metro child process (with retry on crash) ────────────────────────────────

function startMetro() {
  if (metroProcess) return;

  const env = { ...process.env, PORT: String(metroPort) };
  const args = ['exec', 'expo', 'start', '--localhost', '--port', String(metroPort)];

  const child = spawn('pnpm', args, { env, stdio: 'inherit', shell: false });
  metroProcess = child;

  child.on('exit', (code) => {
    process.stdout.write(`[proxy] Metro exited (code ${code}) — retrying in 3 s\n`);
    metroProcess = null;
    metroReady = false;
    // Retry after a short delay (don't bring down the proxy)
    setTimeout(() => startMetro(), 3000);
  });

  const fwd = (sig) => () => { try { child.kill(sig); } catch (_) {} };
  process.on('SIGTERM', fwd('SIGTERM'));
  process.on('SIGINT', fwd('SIGINT'));
}

// ─── Poll Metro until it responds ─────────────────────────────────────────────

function pollMetro() {
  const iv = setInterval(() => {
    if (!metroPort) return;
    const req = httpRequest(
      { host: '127.0.0.1', port: metroPort, path: '/', timeout: 4000 },
      (res) => {
        if (!metroReady && (res.statusCode ?? 0) < 500) {
          process.stdout.write(`[proxy] Metro ready on port ${metroPort}\n`);
          metroReady = true;
        }
        res.resume();
      }
    );
    req.on('error', () => {});
    req.on('timeout', () => req.destroy());
    req.end();
  }, 5000);
}
