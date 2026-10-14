import { getSettings } from './settings';
import { fmt } from './money';

// ---------- text helpers (thermal printers only understand plain ASCII reliably) ----------
const ascii = (s) => String(s ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^\x20-\x7E]/g, '?');
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const when = (d) => new Date(d).toLocaleString('en-GB', { timeZone: 'Africa/Algiers', dateStyle: 'short', timeStyle: 'short' });
const num = (sale) => String(sale._id || '').slice(-6).toUpperCase();

function wrap(text, width) {
  const out = [];
  let line = '';
  for (const w of ascii(text).split(' ')) {
    if ((line + ' ' + w).trim().length > width) { if (line) out.push(line); line = w.slice(0, width); }
    else line = (line + ' ' + w).trim();
  }
  if (line) out.push(line);
  return out;
}
const pair = (l, r, cols) => {
  l = ascii(l); r = ascii(r);
  const space = Math.max(1, cols - r.length - 1);
  return l.slice(0, space) + ' '.repeat(Math.max(1, cols - Math.min(l.length, space) - r.length)) + r;
};

// ---------- ESC/POS bytes (Bluetooth / RawBT) ----------
export function escpos(sale, s) {
  const cols = s.paper === '80' ? 48 : 32;
  const enc = new TextEncoder();
  const b = [];
  const raw = (...x) => b.push(...x);
  const line = (t = '') => b.push(...enc.encode(t + '\n'));
  const dash = '-'.repeat(cols);

  raw(0x1b, 0x40); // reset
  raw(0x1b, 0x61, 1); // center
  raw(0x1b, 0x45, 1); // bold on
  raw(0x1d, 0x21, 0x11); // double size
  wrap(s.shopName, Math.floor(cols / 2)).forEach(line);
  raw(0x1d, 0x21, 0x00);
  raw(0x1b, 0x45, 0);
  if (s.phone) line(ascii(s.phone));
  line(when(sale.createdAt) + '  #' + num(sale));
  raw(0x1b, 0x61, 0); // left
  line(dash);
  for (const i of sale.items) {
    wrap(i.name, cols).forEach(line);
    line(pair(`  ${i.qty} x ${fmt(i.soldPrice)}`, fmt(i.soldPrice * i.qty), cols));
  }
  line(dash);
  raw(0x1b, 0x45, 1);
  line(pair('TOTAL', fmt(sale.total), cols));
  raw(0x1b, 0x45, 0);
  line();
  raw(0x1b, 0x61, 1);
  if (s.footer) wrap(s.footer, cols).forEach(line);
  raw(0x1b, 0x64, 4); // feed
  raw(0x1d, 0x56, 0x42, 0x00); // cut (ignored by printers without a cutter)
  return new Uint8Array(b);
}

// ---------- HTML receipt (any printer the device already knows) ----------
function receiptHTML(sale, s) {
  const w = s.paper === '80' ? '72mm' : '48mm';
  const rows = sale.items
    .map((i) => `<div class="n">${esc(i.name)}</div><div class="r"><span>${i.qty} x ${esc(fmt(i.soldPrice))}</span><span>${esc(fmt(i.soldPrice * i.qty))}</span></div>`)
    .join('');
  return `<!doctype html><html><head><meta charset="utf-8"><title>Receipt</title><style>
@page{size:${s.paper === '80' ? '80mm' : '58mm'} auto;margin:0}
body{margin:0;padding:3mm;width:${w};font:12px/1.35 'Courier New',monospace;color:#000}
.c{text-align:center}.t{font-size:16px;font-weight:700}.r{display:flex;justify-content:space-between;gap:6px}
.n{margin-top:4px;word-break:break-word}hr{border:0;border-top:1px dashed #000;margin:6px 0}.tot{font-weight:700;font-size:14px}
</style></head><body>
<div class="c t">${esc(s.shopName)}</div>
${s.phone ? `<div class="c">${esc(s.phone)}</div>` : ''}
<div class="c">${esc(when(sale.createdAt))} #${esc(num(sale))}</div><hr>
${rows}<hr>
<div class="r tot"><span>TOTAL</span><span>${esc(fmt(sale.total))}</span></div>
${s.footer ? `<hr><div class="c">${esc(s.footer)}</div>` : ''}
</body></html>`;
}

function printHTML(html) {
  return new Promise((resolve) => {
    const f = document.createElement('iframe');
    f.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0';
    document.body.appendChild(f);
    const d = f.contentWindow.document;
    d.open(); d.write(html); d.close();
    setTimeout(() => {
      f.contentWindow.focus();
      f.contentWindow.print();
      setTimeout(() => { f.remove(); resolve(); }, 1500);
    }, 250);
  });
}

// ---------- Bluetooth (Web Bluetooth, BLE printers, Chrome on Android/desktop) ----------
const SERVICES = [
  '000018f0-0000-1000-8000-00805f9b34fb',
  'e7810a71-73ae-499d-8c15-faa9aef0c3f2',
  '49535343-fe7d-4ae5-8fa9-9fafd205e455',
  '0000ff00-0000-1000-8000-00805f9b34fb',
  '0000fff0-0000-1000-8000-00805f9b34fb',
  '0000ffe0-0000-1000-8000-00805f9b34fb',
  '0000ae30-0000-1000-8000-00805f9b34fb',
];
let btDevice = null;
let btChar = null;

async function findChar(dev) {
  const server = await dev.gatt.connect();
  for (const svc of await server.getPrimaryServices()) {
    for (const c of await svc.getCharacteristics()) {
      if (c.properties.write || c.properties.writeWithoutResponse) return c;
    }
  }
  return null;
}
export const bluetoothName = () => (btChar ? btDevice?.name || 'Printer' : '');

export async function connectBluetooth() {
  if (!navigator.bluetooth) throw new Error('This browser cannot talk to Bluetooth printers. Use Chrome on Android, or choose Browser print / RawBT.');
  const dev = await navigator.bluetooth.requestDevice({ acceptAllDevices: true, optionalServices: SERVICES });
  const c = await findChar(dev);
  if (!c) throw new Error('No printing channel found. This printer probably uses classic Bluetooth. Use RawBT instead.');
  btDevice = dev;
  btChar = c;
  dev.addEventListener('gattserverdisconnected', () => { btChar = null; });
  return dev.name || 'Printer';
}

async function sendBluetooth(bytes) {
  if (!btChar && btDevice) btChar = await findChar(btDevice).catch(() => null);
  if (!btChar) throw new Error('Printer not connected. Open Settings and tap "Connect printer".');
  for (let i = 0; i < bytes.length; i += 100) {
    const chunk = bytes.slice(i, i + 100);
    if (btChar.properties.writeWithoutResponse) await btChar.writeValueWithoutResponse(chunk);
    else await btChar.writeValue(chunk);
    await new Promise((r) => setTimeout(r, 25));
  }
}

// ---------- RawBT (free Android app, works with classic Bluetooth printers) ----------
function sendRawBT(bytes) {
  let bin = '';
  bytes.forEach((x) => (bin += String.fromCharCode(x)));
  window.location.href = `intent:base64,${btoa(bin)}#Intent;scheme=rawbt;package=ru.a402d.rawbtprinter;end;`;
}

export async function printReceipt(sale) {
  const s = getSettings();
  if (s.method === 'bluetooth') return sendBluetooth(escpos(sale, s));
  if (s.method === 'rawbt') return sendRawBT(escpos(sale, s));
  return printHTML(receiptHTML(sale, s));
}
