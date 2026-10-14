'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useApp } from '@/components/Providers';
import { DEFAULTS, getSettings, saveSettings } from '@/lib/settings';
import { bluetoothName, connectBluetooth, printReceipt } from '@/lib/receipt';
import { playSound } from '@/lib/sound';

export default function SettingsPage() {
  const { notify } = useApp();
  const [s, setS] = useState(DEFAULTS);
  const [bt, setBt] = useState('');

  useEffect(() => { setS(getSettings()); setBt(bluetoothName()); }, []);
  const upd = (patch) => setS(saveSettings(patch));

  async function connect() {
    try {
      setBt(await connectBluetooth());
      notify('Printer connected');
    } catch (e) {
      if (e?.name !== 'NotFoundError') notify(e.message, 'err');
    }
  }
  async function test() {
    const sale = {
      _id: 'TEST00000000',
      createdAt: new Date().toISOString(),
      items: [
        { name: 'Test product', qty: 2, soldPrice: 150 },
        { name: 'Another product with a long name', qty: 1, soldPrice: 1200 },
      ],
      total: 1500,
    };
    try { await printReceipt(sale); } catch (e) { if (e?.name !== 'NotFoundError') notify(e.message, 'err'); }
  }

  const methods = [
    ['browser', 'Browser print', 'Any printer your phone or computer already knows (Wi-Fi, USB, or Bluetooth added in the system settings).'],
    ['bluetooth', 'Bluetooth direct', 'Chrome on Android or desktop, for Bluetooth LE thermal printers. Prints without a dialog.'],
    ['rawbt', 'RawBT app', 'Android only. Install the free RawBT app and pair your printer there. Works with most cheap Bluetooth printers.'],
  ];

  return (
    <>
      <Link href="/" className="back">‹ Sale</Link>
      <h1>Settings</h1>

      <section className="card">
        <h2>Receipt</h2>
        <label className="lbl">Shop name<input className="field" value={s.shopName} onChange={(e) => upd({ shopName: e.target.value })} /></label>
        <label className="lbl">Phone (optional)<input className="field" value={s.phone} onChange={(e) => upd({ phone: e.target.value })} /></label>
        <label className="lbl">Message at the bottom<input className="field" value={s.footer} onChange={(e) => upd({ footer: e.target.value })} /></label>
        <div className="seg">
          {[['58', '58 mm paper'], ['80', '80 mm paper']].map(([v, l]) => (
            <button key={v} className={s.paper === v ? 'on' : ''} onClick={() => upd({ paper: v })}>{l}</button>
          ))}
        </div>
        <label className="check"><input type="checkbox" checked={s.autoPrint} onChange={(e) => upd({ autoPrint: e.target.checked })} /> Print a receipt automatically after each sale</label>
        <p className="muted">Printed receipts use plain letters. Arabic names may show as ? on thermal printers.</p>
      </section>

      <section className="card">
        <h2>How to print</h2>
        <div className="methods">
          {methods.map(([v, l, d]) => (
            <button key={v} className={`method ${s.method === v ? 'on' : ''}`} onClick={() => upd({ method: v })} aria-pressed={s.method === v}>
              <strong>{l}</strong>
              <span className="muted">{d}</span>
            </button>
          ))}
        </div>
        {s.method === 'bluetooth' && (
          <div className="inline">
            <button className="btn ghost" onClick={connect}>{bt ? 'Connect another printer' : 'Connect printer'}</button>
            {bt && <span className="muted">Connected: {bt}</span>}
          </div>
        )}
        <button className="btn wide" onClick={test}>Print test receipt</button>
      </section>

      <section className="card">
        <h2>Sound</h2>
        <label className="check"><input type="checkbox" checked={s.sound} onChange={(e) => { upd({ sound: e.target.checked }); if (e.target.checked) setTimeout(() => playSound('ok'), 50); }} /> Beep when a barcode is scanned</label>
      </section>
    </>
  );
}
