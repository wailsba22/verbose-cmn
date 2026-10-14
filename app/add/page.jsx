'use client';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import Scanner from '@/components/Scanner';
import Modal from '@/components/Modal';
import { useApp } from '@/components/Providers';
import { MAX_BARCODES } from '@/lib/barcode';
import { playSound } from '@/lib/sound';

const empty = { name: '', buyPrice: '', sellPrice: '', quantity: '', lowStockAt: '5' };
const ORDER = ['name', 'buyPrice', 'sellPrice', 'quantity', 'lowStockAt'];

export default function AddPage() {
  const { notify } = useApp();
  const [form, setForm] = useState(empty);
  const [codes, setCodes] = useState([]);
  const [camera, setCamera] = useState(false);
  const [manual, setManual] = useState('');
  const [manualDup, setManualDup] = useState(null);
  const [dup, setDup] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(null);
  const refs = useRef({});
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  // Enter (or "Next" on the phone keyboard) jumps to the next box and scrolls it into view
  const field = (k) => ({
    ref: (el) => { refs.current[k] = el; },
    enterKeyHint: k === ORDER[ORDER.length - 1] ? 'done' : 'next',
    value: form[k],
    onChange: set(k),
    onKeyDown: (e) => {
      if (e.key !== 'Enter') return;
      e.preventDefault();
      const i = ORDER.indexOf(k);
      if (i < ORDER.length - 1) focusField(ORDER[i + 1]);
      else save();
    },
  });
  function focusField(k) {
    const el = refs.current[k];
    if (!el) return;
    el.focus();
    el.scrollIntoView({ block: 'center', behavior: 'smooth' });
  }

  // warn while typing if the code is already used
  useEffect(() => {
    setManualDup(null);
    const c = manual.trim();
    if (c.length < 4) return;
    const t = setTimeout(async () => {
      const d = await fetch(`/api/products/check?codes=${encodeURIComponent(c)}`).then((r) => r.json()).catch(() => null);
      if (d?.matches?.length) setManualDup(d.matches[0]);
    }, 250);
    return () => clearTimeout(t);
  }, [manual]);

  async function addCode(code) {
    code = code.trim();
    if (!code || codes.includes(code)) return false;
    if (codes.length >= MAX_BARCODES) { playSound('error'); notify(`You can add up to ${MAX_BARCODES} barcodes`, 'err'); return false; }
    const r = await fetch(`/api/products/check?codes=${encodeURIComponent(code)}`);
    const d = await r.json();
    if (d.matches?.length) { playSound('error'); setDup(d.matches[0]); return false; }
    setCodes((c) => (c.includes(code) || c.length >= MAX_BARCODES ? c : [...c, code]));
    return true;
  }
  async function addManual() {
    const ok = await addCode(manual);
    setManual('');
    if (ok) focusField('name');
  }

  async function save() {
    if (!form.name.trim()) { focusField('name'); return notify('Enter the product name', 'err'); }
    if (form.buyPrice === '') { focusField('buyPrice'); return notify('Enter the buy price', 'err'); }
    if (form.sellPrice === '') { focusField('sellPrice'); return notify('Enter the sell price', 'err'); }
    setSaving(true);
    try {
      const r = await fetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, barcodes: codes }),
      });
      const d = await r.json();
      if (r.status === 409 && d.duplicates) return setDup(d.duplicates[0]);
      if (!r.ok) throw new Error(d.error);
      playSound('done');
      setSaved(d);
      setForm(empty);
      setCodes([]);
      setCamera(false);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (e) {
      notify(e.message, 'err');
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <h1>Add product</h1>

      {saved && (
        <div className="notice">
          <div>
            <strong>{saved.name}</strong> was added.
            <div className="muted">Barcode: {saved.barcodes.join(', ')}</div>
          </div>
          <Link href={`/inventory/${saved._id}`} className="btn small ghost">View</Link>
        </div>
      )}

      <section className="card">
        <div className="card-head">
          <h2>Barcodes <span className="muted">{codes.length}/{MAX_BARCODES}</span></h2>
          <button className="btn small" onClick={() => setCamera((c) => !c)}>{camera ? 'Close camera' : 'Open camera'}</button>
        </div>
        {camera && <Scanner id="add-reader" onScan={addCode} height={170} />}
        <div className="chips">
          {codes.map((c) => (
            <span key={c} className="chip">{c}<button onClick={() => setCodes(codes.filter((x) => x !== c))} aria-label={`Remove ${c}`}>×</button></span>
          ))}
          {!codes.length && <span className="muted">No barcode yet. If you add none, one is created when you save.</span>}
        </div>
        {codes.length < MAX_BARCODES && (
          <>
            <div className="inline">
              <input className="field" value={manual} onChange={(e) => setManual(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && addManual()} enterKeyHint="next" placeholder="Type or scan a code" />
              <button className="btn ghost" onClick={addManual}>Add</button>
            </div>
            {manualDup && (
              <p className="warn">Already used by <Link href={`/inventory/${manualDup._id}`}>{manualDup.name}</Link>.</p>
            )}
          </>
        )}
      </section>

      <section className="card">
        <label className="lbl">Product name<input className="field" {...field('name')} placeholder="e.g. Hamoud Selecto 1L" /></label>
        <div className="two">
          <label className="lbl">Buy price (DA)<input className="field" type="number" inputMode="decimal" min="0" {...field('buyPrice')} /></label>
          <label className="lbl">Sell price (DA)<input className="field" type="number" inputMode="decimal" min="0" {...field('sellPrice')} /></label>
        </div>
        <div className="two">
          <label className="lbl">Quantity in stock<input className="field" type="number" inputMode="numeric" min="0" {...field('quantity')} /></label>
          <label className="lbl">Warn me at<input className="field" type="number" inputMode="numeric" min="0" {...field('lowStockAt')} /></label>
        </div>
        {form.buyPrice !== '' && form.sellPrice !== '' && Number(form.sellPrice) < Number(form.buyPrice) && (
          <p className="warn">The sell price is lower than the buy price.</p>
        )}
      </section>

      <div className="bottom-action">
        <button className="btn wide" onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save product'}</button>
      </div>

      {dup && (
        <Modal title="Barcode already registered" onClose={() => setDup(null)}>
          <p>This barcode already belongs to <strong>{dup.name}</strong>.</p>
          <div className="actions">
            <button className="btn ghost" onClick={() => setDup(null)}>Close</button>
            <Link className="btn" href={`/inventory/${dup._id}`}>Open in inventory</Link>
          </div>
        </Modal>
      )}
    </>
  );
}
