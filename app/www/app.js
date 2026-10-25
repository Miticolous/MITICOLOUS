/* Rev Hunter — cliente leve (PWA). Sem dependências. */
'use strict';

const $ = (s) => document.querySelector(s);

const state = { servers: [], selected: 0, connected: false, ws: null, rx: 0, tx: 0, hb: null };

const FALLBACK = [
  { name: 'Brasil 1', flag: 'BR', host: 'br1.exemplo.com', port: 443, protocol: 'vless', uuid: '' },
  { name: 'Estados Unidos 1', flag: 'US', host: 'us1.exemplo.com', port: 443, protocol: 'vless', uuid: '' }
];

function flagEmoji(cc) {
  if (!cc || String(cc).length !== 2) return '🌐';
  try {
    return String.fromCodePoint(...String(cc).toUpperCase().split('').map((c) => 127397 + c.charCodeAt(0)));
  } catch (e) { return '🌐'; }
}

function fmtBytes(n) {
  if (!n) return '0 B';
  const u = ['B', 'KB', 'MB', 'GB'];
  const i = Math.min(Math.floor(Math.log(n) / Math.log(1024)), u.length - 1);
  return (n / Math.pow(1024, i)).toFixed(1) + ' ' + u[i];
}

async function loadServers() {
  let remote = [];
  try {
    const r = await fetch('servers.json', { cache: 'no-store' });
    if (r.ok) {
      const j = await r.json();
      remote = (Array.isArray(j) ? j : (j.servers || [])).map((s) => Object.assign({}, s, { _custom: false }));
    }
  } catch (e) { /* offline */ }
  if (!remote.length) remote = FALLBACK.map((s) => Object.assign({}, s, { _custom: false }));
  state.servers = remote.concat(customServers());
  renderServers();
}

const LS_KEY = 'revhunter.servers';

function customServers() {
  try { return JSON.parse(localStorage.getItem(LS_KEY) || '[]').map((s) => Object.assign({}, s, { _custom: true })); }
  catch (e) { return []; }
}

function saveCustom(list) {
  try { localStorage.setItem(LS_KEY, JSON.stringify(list.map((s) => { const c = Object.assign({}, s); delete c._custom; return c; }))); }
  catch (e) { /* storage cheio/indisponível */ }
}

function addServer() {
  const host = ($('#f-host').value || '').trim();
  const out = $('#add-status');
  if (!host || !/^[a-zA-Z0-9.-]+$/.test(host)) { out.textContent = 'Informe um host válido.'; return; }
  const s = {
    name: ($('#f-name').value || '').trim() || host,
    host: host,
    port: parseInt($('#f-port').value, 10) || 443,
    protocol: $('#f-proto').value,
    uuid: ($('#f-uuid').value || '').trim(),
    sni: ($('#f-sni').value || '').trim(),
    path: ($('#f-path').value || '').trim(),
    wsPath: ($('#f-path').value || '').trim()
  };
  const list = customServers().concat([s]);
  saveCustom(list);
  state.servers = state.servers.filter((x) => !x._custom).concat(list.map((x) => Object.assign({}, x, { _custom: true })));
  renderServers();
  out.textContent = 'Servidor adicionado: ' + s.name;
}

function removeServer(host, name) {
  const list = customServers().filter((s) => !(s.host === host && s.name === name));
  saveCustom(list);
  state.servers = state.servers.filter((x) => !x._custom).concat(list.map((x) => Object.assign({}, x, { _custom: true })));
  if (state.selected >= state.servers.length) state.selected = 0;
  renderServers();
}

function renderServers() {
  const box = $('#servers-list');
  const picker = $('#server-picker');
  box.innerHTML = '';
  picker.innerHTML = '';
  state.servers.forEach((s, i) => {
    const el = document.createElement('div');
    el.className = 'server-item' + (i === state.selected ? ' selected' : '');
    el.innerHTML =
      '<div class="server-flag" style="display:flex;align-items:center;justify-content:center;font-size:13px">' + flagEmoji(s.flag) + '</div>' +
      '<div><div class="server-name">' + (s.name || 'Servidor ' + (i + 1)) + '</div>' +
      '<div style="font-size:11px;color:var(--muted)">' + (s.protocol || 'vless') + ' · ' + (s.host || '?') + ':' + (s.port || '?') + '</div></div>' +
      '<div class="latency" data-lat="' + i + '">—</div>';
    el.onclick = () => { state.selected = i; renderServers(); };
    box.appendChild(el);
    if (s._custom) {
      const rm = document.createElement('button');
      rm.textContent = '×';
      rm.title = 'Remover servidor';
      rm.style.cssText = 'background:none;border:none;color:#ef4444;font-size:18px;line-height:1;cursor:pointer;padding:0 4px';
      rm.onclick = (ev) => { ev.stopPropagation(); removeServer(s.host, s.name); };
      el.appendChild(rm);
    }
    const p = el.cloneNode(true);
    p.onclick = el.onclick;
    picker.appendChild(p);
  });
  picker.classList.toggle('hidden', $('#mode').value !== 'manual');
  measureLatencies();
}

async function measureLatencies() {
  for (let i = 0; i < state.servers.length; i++) {
    const s = state.servers[i];
    if (!s.host) continue;
    const t0 = performance.now();
    let ms = null;
    try {
      await fetch('http://' + s.host + ':' + s.port + '/', { mode: 'no-cors', cache: 'no-store', signal: AbortSignal.timeout(4000) });
      ms = Math.round(performance.now() - t0);
    } catch (e) { /* inalcancavel */ }
    document.querySelectorAll('[data-lat="' + i + '"]').forEach((el) => { el.textContent = ms === null ? '—' : ms + ' ms'; });
  }
}

function buildUri(s) {
  const proto = s.protocol || 'vless';
  const name = encodeURIComponent(s.name || s.host || 'server');
  if (proto === 'vless' || proto === 'vmess' || proto === 'trojan') {
    const q = [];
    if (s.security) q.push('security=' + s.security);
    if (s.sni) q.push('sni=' + encodeURIComponent(s.sni));
    if (s.path) q.push('path=' + encodeURIComponent(s.path));
    if (s.hostHeader) q.push('host=' + encodeURIComponent(s.hostHeader));
    const qs = q.length ? '?' + q.join('&') : '';
    return proto + '://' + (s.uuid || s.password || '') + '@' + s.host + ':' + s.port + qs + '#' + name;
  }
  if (proto === 'ss') {
    return 'ss://' + btoa((s.method || 'aes-256-gcm') + ':' + (s.password || '') + '@' + s.host + ':' + s.port) + '#' + name;
  }
  if (proto === 'ssh') return 'ssh://' + (s.username || 'root') + '@' + s.host + ':' + (s.port || 22) + '#' + name;
  return proto + '://' + s.host + ':' + s.port + '#' + name;
}

function setStatus(t) { $('#status').textContent = t; }
function updateData() { $('#data').textContent = fmtBytes(state.tx) + ' ↑ / ' + fmtBytes(state.rx) + ' ↓'; }

function connect() {
  const s = state.servers[state.selected];
  if (!s || !s.host) { setStatus('Escolha um servidor válido.'); return; }
  setStatus('Conectando em ' + s.host + '...');
  let ws;
  try { ws = new WebSocket('wss://' + s.host + ':' + s.port + (s.wsPath || '/')); }
  catch (e) { setStatus('Falha ao abrir conexão.'); return; }
  state.ws = ws;
  const to = setTimeout(() => { try { ws.close(); } catch (e) {} if (!state.connected) setStatus('Tempo esgotado ao conectar.'); }, 8000);
  ws.onopen = () => {
    clearTimeout(to);
    state.connected = true;
    $('#connect-btn').classList.add('connected');
    $('#connect-btn').textContent = 'Desconectar';
    $('#vpn-toggle').checked = true;
    setStatus('Conectado · ' + (s.name || s.host));
    state.hb = setInterval(() => { if (ws.readyState === 1) { ws.send('ping'); state.tx += 4; updateData(); } }, 10000);
  };
  ws.onmessage = (m) => { state.rx += String(m.data || '').length || 1; updateData(); };
  ws.onerror = () => { if (!state.connected) setStatus('Erro de conexão com ' + s.host); };
  ws.onclose = () => {
    clearTimeout(to);
    if (state.hb) clearInterval(state.hb);
    state.connected = false;
    state.ws = null;
    $('#connect-btn').classList.remove('connected');
    $('#connect-btn').textContent = 'Conectar';
    $('#vpn-toggle').checked = false;
    setStatus('Desconectado');
  };
}

function disconnect() { if (state.ws) { try { state.ws.close(); } catch (e) {} } }

function exportConfig() {
  const s = state.servers[state.selected];
  if (!s) { setStatus('Nenhum servidor selecionado.'); return; }
  const uri = buildUri(s);
  const el = $('#cfg');
  el.textContent = uri;
  el.classList.remove('hidden');
  if (navigator.clipboard) navigator.clipboard.writeText(uri).catch(() => {});
  setStatus('Configuração exportada (copiada).');
}

$('#connect-btn').onclick = () => (state.connected ? disconnect() : connect());
$('#vpn-toggle').onchange = (e) => { e.target.checked ? connect() : disconnect(); };
$('#export-btn').onclick = exportConfig;
$('#mode').onchange = () => { $('#server-picker').classList.toggle('hidden', $('#mode').value !== 'manual'); };

if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});
loadServers();