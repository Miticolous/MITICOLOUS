/* Smoke test do app.js sem navegador: valida carga de servidores, seleção, URI e persistência. */
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');

function makeEl() {
  const el = {
    innerHTML: '', textContent: '', value: '', checked: false,
    children: [],
    classList: { add() {}, remove() {}, toggle() {} },
    appendChild(c) { this.children.push(c); },
    cloneNode() { return makeEl(); },
    style: {}, onclick: null, onchange: null
  };
  return el;
}

const els = {};
function el(id) {
  if (!els[id]) els[id] = makeEl();
  return els[id];
}

const store = {};
const sandbox = {
  console,
  performance,
  AbortSignal,
  setTimeout, clearTimeout, setInterval, clearInterval,
  navigator: {},
  btoa: (s) => Buffer.from(String(s), 'binary').toString('base64'),
  atob: (s) => Buffer.from(String(s), 'base64').toString('binary'),
  localStorage: {
    getItem: (k) => (k in store ? store[k] : null),
    setItem: (k, v) => { store[k] = String(v); },
    removeItem: (k) => { delete store[k]; }
  },
  fetch: async () => ({ ok: false }),
  document: {
    querySelector: (sel) => el(sel.replace('#', '')),
    createElement: () => makeEl(),
    querySelectorAll: () => []
  },
  WebSocket: function () { throw new Error('sem rede no teste'); }
};
sandbox.window = sandbox;

const code = fs.readFileSync(path.join(__dirname, '..', 'www', 'app.js'), 'utf8');
vm.createContext(sandbox);
vm.runInContext(code, sandbox, { filename: 'app.js' });

setTimeout(() => {
  const ev = (expr) => vm.runInContext(expr, sandbox);
  const sv = ev('state.servers');
  if (!Array.isArray(sv) || sv.length < 2) { console.error('FALHOU: lista de servidores vazia'); process.exit(1); }
  if (!sv[0].host) { console.error('FALHOU: servidor sem host'); process.exit(1); }

  const uri = ev("buildUri({ protocol: 'vless', uuid: 'abc-123', host: 'br1.exemplo.com', port: 443, security: 'tls', name: 'Brasil 1' })");
  if (!/^vless:\/\/abc-123@br1\.exemplo\.com:443\?security=tls#Brasil%201$/.test(uri)) {
    console.error('FALHOU: URI inesperada ->', uri); process.exit(1);
  }

  const ss = ev("buildUri({ protocol: 'ss', password: 'pwd', host: 'h.com', port: 8388, name: 'X' })");
  if (!ss.startsWith('ss://') || !ss.endsWith('#X')) { console.error('FALHOU: URI ss ->', ss); process.exit(1); }

  el('f-host').value = 'novo.exemplo.com';
  el('f-name').value = 'Novo';
  el('f-port').value = '8443';
  el('f-proto').value = 'trojan';
  el('f-uuid').value = 'senha123';
  ev('addServer()');
  if (ev("state.servers.filter((s) => s._custom).length") !== 1) { console.error('FALHOU: adicionar servidor'); process.exit(1); }
  if (!store['revhunter.servers'] || JSON.parse(store['revhunter.servers'])[0].host !== 'novo.exemplo.com') {
    console.error('FALHOU: persistência'); process.exit(1);
  }
  ev("removeServer('novo.exemplo.com', 'Novo')");
  if (ev("state.servers.filter((s) => s._custom).length") !== 0) { console.error('FALHOU: remover servidor'); process.exit(1); }

  if (ev('fmtBytes(1536)') !== '1.5 KB') { console.error('FALHOU: fmtBytes', ev('fmtBytes(1536)')); process.exit(1); }
  if (ev("flagEmoji('BR')") !== '🇧🇷') { console.error('FALHOU: flagEmoji'); process.exit(1); }

  console.log('OK: ' + sv.length + ' servidores, URI ' + uri);
  process.exit(0);
}, 100);