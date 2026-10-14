'use client';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import Scanner from '@/components/Scanner';
import { fmt } from '@/lib/money';

const PAGE = 30;

export default function InventoryPage() {
  const [q, setQ] = useState('');
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [camera, setCamera] = useState(false);
  const timer = useRef();

  async function load(skip, replace) {
    setLoading(true);
    const r = await fetch(`/api/products?q=${encodeURIComponent(q.trim())}&limit=${PAGE}&skip=${skip}`);
    const d = await r.json();
    setItems((prev) => (replace ? d.items : [...prev, ...d.items]));
    setTotal(d.total);
    setLoading(false);
  }

  useEffect(() => {
    clearTimeout(timer.current);
    timer.current = setTimeout(() => load(0, true), 250);
    return () => clearTimeout(timer.current);
  }, [q]);

  return (
    <>
      <h1>Inventory</h1>
      <div className="inline">
        <div className="search grow">
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><circle cx="11" cy="11" r="6.5" /><path d="m16 16 4.5 4.5" /></svg>
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name or barcode" />
          {q && <button className="clear" onClick={() => setQ('')} aria-label="Clear">×</button>}
        </div>
        <button className="btn ghost" onClick={() => setCamera((c) => !c)}>{camera ? 'Close' : 'Scan'}</button>
      </div>
      {camera && <Scanner id="inv-reader" height={150} onScan={(c) => { setQ(c); setCamera(false); }} />}

      <p className="muted count">{total} {total === 1 ? 'product' : 'products'}</p>
      <ul className="list">
        {items.map((p) => {
          const out = p.quantity <= 0;
          const low = !out && p.quantity <= p.lowStockAt;
          return (
            <li key={p._id}>
              <Link href={`/inventory/${p._id}`} className="item">
                <div className="grow">
                  <strong>{p.name}</strong>
                  <div className="muted">{p.barcodes[0]}</div>
                </div>
                <div className="right">
                  <span className={`qty ${out ? 'out' : low ? 'low' : ''}`}>{out ? 'Out' : p.quantity}</span>
                  <div className="muted">{fmt(p.sellPrice)}</div>
                </div>
              </Link>
            </li>
          );
        })}
      </ul>
      {!loading && !items.length && <p className="empty">{q ? 'Nothing matches this search.' : 'No products yet. Add your first one from the Add tab.'}</p>}
      {items.length < total && <button className="btn ghost wide" disabled={loading} onClick={() => load(items.length, false)}>{loading ? 'Loading…' : 'Show more'}</button>}
    </>
  );
}
