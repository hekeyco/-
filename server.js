// 증강 알까기 온라인 서버
// - public/ 폴더의 게임(index.html)을 그대로 보여 주고
// - /ws 로 WebSocket 방을 열어, 같은 방 사람들끼리 각자의 상태(presence)를 주고받게 합니다.
// 게임 규칙 계산은 모두 브라우저에서 하므로 서버는 "방 + 상태 전달"만 합니다.
const http = require('http');
const fs = require('fs');
const path = require('path');
const { WebSocketServer } = require('ws');

const PORT = Number(process.env.PORT) || 3000;
const PUB = path.join(__dirname, 'public');
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.png': 'image/png', '.svg': 'image/svg+xml', '.ico': 'image/x-icon', '.json': 'application/json', '.webmanifest': 'application/manifest+json' };

const ROOM_NAME = /^[a-z0-9-]{1,40}$/;
const PEER_ID = /^[a-z0-9]{8,20}$/;
const MAX_PEERS = 6;          // 한 방 최대 인원 (2명 + 관전)
const MAX_ROOMS = 2000;
const MAX_PRESENCE = 16000;   // 한 사람 상태의 최대 크기(바이트)
const GRACE_MS = 20000;       // 연결이 끊겨도 이 시간 동안은 자리를 남겨 둠 (재접속 대비)

/* ---------- 정적 파일 ---------- */
const server = http.createServer((req, res) => {
  let url;
  try { url = new URL(req.url, 'http://localhost'); } catch (e) { res.writeHead(400); return res.end(); }
  if (url.pathname === '/healthz') { res.writeHead(200, { 'content-type': 'text/plain' }); return res.end('ok'); }
  if (req.method !== 'GET' && req.method !== 'HEAD') { res.writeHead(405); return res.end(); }
  let rel;
  try { rel = decodeURIComponent(url.pathname); } catch (e) { res.writeHead(400); return res.end(); }
  if (rel === '/' || rel === '') rel = '/index.html';
  const file = path.normalize(path.join(PUB, rel));
  if (!file.startsWith(PUB + path.sep)) { res.writeHead(403); return res.end(); }
  fs.readFile(file, (err, buf) => {
    if (err) { res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' }); return res.end('없는 페이지입니다'); }
    res.writeHead(200, { 'content-type': TYPES[path.extname(file)] || 'application/octet-stream', 'cache-control': 'no-cache',
      'x-content-type-options': 'nosniff' });
    res.end(req.method === 'HEAD' ? undefined : buf);
  });
});

/* ---------- 방 ---------- */
// rooms: 방 이름 -> Map(peerId -> { ws, presence, at, away, timer })
const rooms = new Map();
const peersOf = room => [...room.entries()].map(([peer, p]) => ({ peer, presence: p.presence, at: p.at, away: p.away }));
function broadcast(name) {
  const room = rooms.get(name);
  if (!room) return;
  const msg = JSON.stringify({ t: 'peers', room: name, peers: peersOf(room) });
  for (const p of room.values()) if (p.ws && p.ws.readyState === 1) p.ws.send(msg);
}
function drop(name, peer) {
  const room = rooms.get(name);
  if (!room) return;
  const p = room.get(peer);
  if (p && p.timer) clearTimeout(p.timer);
  room.delete(peer);
  if (room.size === 0) rooms.delete(name); else broadcast(name);
}
const isObj = v => v !== null && typeof v === 'object' && !Array.isArray(v);

const wss = new WebSocketServer({ server, path: '/ws', maxPayload: 32 * 1024 });
wss.on('connection', ws => {
  ws.alive = true;
  ws.on('pong', () => { ws.alive = true; });
  let me = null;               // { name, peer }
  let budget = 60, last = Date.now();

  const away = () => {
    if (!me) return;
    const room = rooms.get(me.name), p = room && room.get(me.peer);
    if (!p || p.ws !== ws) return;
    const { name, peer } = me;
    p.ws = null; p.away = true;
    p.timer = setTimeout(() => drop(name, peer), GRACE_MS);
    broadcast(name);
  };

  ws.on('message', data => {
    const now = Date.now();
    budget = Math.min(60, budget + (now - last) / 50); last = now;   // 평균 초당 20개까지
    if (budget < 1) return;
    budget -= 1;
    let m;
    try { m = JSON.parse(data); } catch (e) { return; }
    if (!isObj(m)) return;

    if (m.t === 'join') {
      if (typeof m.room !== 'string' || !ROOM_NAME.test(m.room) || typeof m.peer !== 'string' || !PEER_ID.test(m.peer)) return;
      if (me && (me.name !== m.room || me.peer !== m.peer)) { const old = me; me = null; drop(old.name, old.peer); }
      let room = rooms.get(m.room);
      if (!room) {
        if (rooms.size >= MAX_ROOMS) return ws.send(JSON.stringify({ t: 'full', room: m.room }));
        room = new Map(); rooms.set(m.room, room);
      }
      const prev = room.get(m.peer);
      if (!prev && room.size >= MAX_PEERS) return ws.send(JSON.stringify({ t: 'full', room: m.room }));
      if (prev && prev.timer) clearTimeout(prev.timer);
      if (prev && prev.ws && prev.ws !== ws) { try { prev.ws.close(4000, 'replaced'); } catch (e) {} }
      let presence = isObj(m.presence) ? m.presence : (prev ? prev.presence : {});
      if (JSON.stringify(presence).length > MAX_PRESENCE) presence = {};
      room.set(m.peer, { ws, presence, at: now, away: false, timer: null });
      me = { name: m.room, peer: m.peer };
      broadcast(m.room);
    } else if (m.t === 'presence') {
      if (!me || m.room !== me.name || !isObj(m.patch)) return;
      const p = rooms.get(me.name) && rooms.get(me.name).get(me.peer);
      if (!p || p.ws !== ws) return;
      const next = Object.assign({}, p.presence);
      for (const k of Object.keys(m.patch)) { if (m.patch[k] === null) delete next[k]; else next[k] = m.patch[k]; }
      if (JSON.stringify(next).length > MAX_PRESENCE) return;
      p.presence = next; p.at = now;
      broadcast(me.name);
    } else if (m.t === 'leave') {
      if (!me) return;
      const old = me; me = null;
      const p = rooms.get(old.name) && rooms.get(old.name).get(old.peer);
      if (p && p.ws === ws) drop(old.name, old.peer);
    }
  });
  ws.on('close', away);
  ws.on('error', () => {});
});

// 30초마다 살아 있는지 확인 (응답 없는 연결은 정리)
const beat = setInterval(() => {
  for (const ws of wss.clients) {
    if (!ws.alive) { ws.terminate(); continue; }
    ws.alive = false;
    try { ws.ping(); } catch (e) {}
  }
}, 30000);
wss.on('close', () => clearInterval(beat));

server.listen(PORT, () => console.log(`증강 알까기 서버가 http://localhost:${PORT} 에서 돌아가고 있습니다`));
