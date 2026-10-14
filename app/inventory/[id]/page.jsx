'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Modal from '@/components/Modal';
import { useApp } from '@/components/Providers';
import { MAX_BARCODES } from '@/lib/barcode';

export default function ProductPage() {
  const { id } = useParams();
  const router = useRouter();
  const { notify } = useApp();
  const [p, setP] = useState(null);
  const [newCode, setNewCode] = useState('');
  const [confirm, setConfirm] = useState(false);
  const [missing, setMissing] = useState(false);

  useEffect(() => {
    fetch(`/api/products/${id}`).then(async (r) => (r.ok ? setP(await r.json()) : setMissing(true)));
  }, [id]);

  if (missing) return <p className="empty">This product no longer exists. <Link href="/inventory">Back to inventory</Link></p>;
  if (!p) return <p className="empty">Loading…</p>;
  const set = (k) => (e) => setP({ ...p, [k]: e.target.value });

  async function save() {
    const r = await fetch(`/api/products/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: p.name, buyPrice: p.buyPrice, sellPrice: p.sellPrice, quantity: p.quantity, lowStockAt: p.lowStockAt, barcodes: p.barcodes }),
    });
    const d = await r.json();
    if (!r.ok) return notify(d.duplicates ? `Barcode already used by ${d.duplicates[0].name}` : d.error, 'err');
    setP(d);
    notify('Changes saved');
  }
  async function remove() {
    await fetch(`/api/products/${id}`, { method: 'DELETE' });
    router.push('/inventory');
  }
  function addCode() {
    const c = newCode.trim();
    if (c && p.barcodes.length >= MAX_BARCODES) notify(`You can add up to ${MAX_BARCODES} barcodes`, 'err');
    else if (c && !p.barcodes.includes(c)) setP({ ...p, barcodes: [...p.barcodes, c] });
    setNewCode('');
  }

  return (
    <>
      <Link href="/inventory" className="back">‹ Inventory</Link>
      <h1>{p.name || 'Product'}</h1>

      <section className="card">
        <label className="lbl">Product name<input className="field" value={p.name} onChange={set('name')} /></label>
        <div className="two">
          <label className="lbl">Buy price (DA)<input className="field" type="number" min="0" value={p.buyPrice} onChange={set('buyPrice')} /></label>
          <label className="lbl">Sell price (DA)<input className="field" type="number" min="0" value={p.sellPrice} onChange={set('sellPrice')} /></label>
        </div>
        <div className="two">
          <label className="lbl">Quantity in stock<input className="field" type="number" min="0" value={p.quantity} onChange={set('quantity')} /></label>
          <label className="lbl">Warn me at<input className="field" type="number" min="0" value={p.lowStockAt} onChange={set('lowStockAt')} /></label>
        </div>
      </section>

      <section className="card">
        <h2>Barcodes <span className="muted">{p.barcodes.length}/{MAX_BARCODES}</span></h2>
        <div className="chips">
          {p.barcodes.map((c) => (
            <span key={c} className="chip">{c}{p.barcodes.length > 1 && <button onClick={() => setP({ ...p, barcodes: p.barcodes.filter((x) => x !== c) })} aria-label={`Remove ${c}`}>×</button>}</span>
          ))}
        </div>
        <div className="inline">
          <input className="field" value={newCode} onChange={(e) => setNewCode(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && addCode()} placeholder="Add another barcode" />
          <button className="btn ghost" onClick={addCode}>Add</button>
        </div>
      </section>

      <div className="actions spread">
        <button className="btn ghost danger" onClick={() => setConfirm(true)}>Delete product</button>
        <button className="btn" onClick={save}>Save changes</button>
      </div>

      {confirm && (
        <Modal title="Delete this product?" onClose={() => setConfirm(false)}>
          <p>Past sales keep their records, but the product disappears from your inventory.</p>
          <div className="actions">
            <button className="btn ghost" onClick={() => setConfirm(false)}>Keep it</button>
            <button className="btn danger-fill" onClick={remove}>Delete</button>
          </div>
        </Modal>
      )}
    </>
  );
}
