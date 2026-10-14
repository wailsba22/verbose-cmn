'use client';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import Scanner from '@/components/Scanner';
import Modal from '@/components/Modal';
import { useApp } from '@/components/Providers';
import { fmt } from '@/lib/money';
import { playSound } from '@/lib/sound';

export default function SalePage() {
  const { cart, total, count, addProduct, removeItem, setQty, setPrice, notify } = useApp();
  const [camera, setCamera] = useState(true);
  const [q, setQ] = useState('');
  const [results, setResults] = useState([]);
  const [popular, setPopular] = useState([]);
  const [edit, setEdit] = useState(null); // { item, value, warn }
  const timer = useRef();

  useEffect(() => {
    fetch('/api/products?filter=popular').then((r) => r.json()).then((d) => setPopular(d.items || [])).catch(() => {});
  }, []);

  async function onScan(code) {
    const r = await fetch(`/api/products?barcode=${encodeURIComponent(code)}`);
    const d = await r.json();
    if (d.items?.[0]) addProduct(d.items[0]);
    else {
      playSound('error');
      notify(`No product with barcode ${code}`, 'err');
    }
  }

  useEffect(() => {
    clearTimeout(timer.current);
    if (!q.trim()) return setResults([]);
    timer.current = setTimeout(async () => {
      const r = await fetch(`/api/products?q=${encodeURIComponent(q.trim())}&limit=6`);
      const d = await r.json();
      setResults(d.items || []);
    }, 150);
    return () => clearTimeout(timer.current);
  }, [q]);

  // USB barcode scanners type the code and press Enter. A single match is added right away.
  function onEnter(e) {
    if (e.key !== 'Enter') return;
    const exact = results.find((p) => p.barcodes.includes(q.trim())) || (results.length === 1 ? results[0] : null);
    if (exact) pick(exact);
  }
  function pick(p) {
    addProduct(p);
    setQ('');
    setResults([]);
  }

  function applyPrice() {
    const v = Number(edit.value);
    if (edit.value === '' || !(v >= 0)) return;
    if (v < edit.item.buyPrice && !edit.warn) return setEdit({ ...edit, warn: true });
    setPrice(edit.item.productId, v);
    setEdit(null);
  }

  return (
    <>
      <div className="topline">
        <span className="muted">New sale</span>
        <Link href="/settings" className="icon" aria-label="Settings">
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z" /></svg>
        </Link>
      </div>

      <section className="cam">
        {camera ? <Scanner id="sale-reader" onScan={onScan} beep={false} /> : <div className="cam-off">Camera is off</div>}
        <button className="cam-toggle" onClick={() => setCamera((c) => !c)}>{camera ? 'Turn off' : 'Turn on camera'}</button>
      </section>

      <div className="search">
        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><circle cx="11" cy="11" r="6.5" /><path d="m16 16 4.5 4.5" /></svg>
        <input value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={onEnter} placeholder="Type a name or part of a barcode" inputMode="search" />
        {q && <button className="clear" onClick={() => setQ('')} aria-label="Clear search">×</button>}
      </div>
      {results.length > 0 && (
        <ul className="results">
          {results.map((p) => (
            <li key={p._id}>
              <button onClick={() => pick(p)} disabled={p.quantity <= 0}>
                <span>{p.name}</span>
                <span className="muted">{p.quantity <= 0 ? 'Out of stock' : `${fmt(p.sellPrice)} · ${p.quantity} left`}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
      {q.trim() && results.length === 0 && <p className="hint">No match. Check the spelling or add it from the Add tab.</p>}

      {!q && popular.length > 0 && (
        <div className="quick" aria-label="Quick add">
          {popular.map((p) => (
            <button key={p._id} className="chip-btn" onClick={() => addProduct(p)}>
              <span>{p.name}</span>
              <b>{fmt(p.sellPrice)}</b>
            </button>
          ))}
        </div>
      )}

      <ul className="cart">
        {cart.map((i) => {
          const changed = i.price !== i.listPrice;
          return (
            <li key={i.productId} className="cart-row">
              <div className="cart-top">
                <strong>{i.name}</strong>
                <button className="btn ghost small danger" onClick={() => removeItem(i.productId)}>Take out</button>
              </div>
              <div className="cart-bottom">
                <div className="price">
                  {changed && <s>{fmt(i.listPrice)}</s>}
                  <b className={changed ? 'discount' : ''}>{fmt(i.price)}</b>
                  <button className="icon" onClick={() => setEdit({ item: i, value: String(i.price), warn: false })} aria-label={`Lower price of ${i.name}`}>
                    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="m4 20 1-4L16.5 4.5a2 2 0 0 1 3 3L8 19l-4 1Z" /></svg>
                  </button>
                </div>
                <div className="stepper">
                  <button onClick={() => setQty(i.productId, i.qty - 1)} disabled={i.qty <= 1} aria-label="Less">−</button>
                  <span>{i.qty}</span>
                  <button onClick={() => setQty(i.productId, i.qty + 1)} disabled={i.qty >= i.stock} aria-label="More">+</button>
                </div>
                <div className="line">{fmt(i.price * i.qty)}</div>
              </div>
            </li>
          );
        })}
      </ul>
      {!cart.length && !q && <p className="empty">Point the camera at a barcode to start a sale.</p>}

      <div className="totalbar">
        <span>{count} {count === 1 ? 'item' : 'items'}</span>
        <strong>{fmt(total)}</strong>
      </div>

      {edit && (
        <Modal title={edit.warn ? 'Price is below cost' : `New price for ${edit.item.name}`} onClose={() => setEdit(null)}>
          {edit.warn ? (
            <p className="warn">This price is lower than what you paid for this product. You will lose money on this sale. Continue?</p>
          ) : (
            <input className="field" autoFocus type="number" inputMode="decimal" min="0" value={edit.value} onChange={(e) => setEdit({ ...edit, value: e.target.value })} onKeyDown={(e) => e.key === 'Enter' && applyPrice()} placeholder="Price in DA" />
          )}
          <div className="actions">
            <button className="btn ghost" onClick={() => (edit.warn ? setEdit({ ...edit, warn: false }) : setEdit(null))}>{edit.warn ? 'Change price' : 'Cancel'}</button>
            <button className={`btn ${edit.warn ? 'danger-fill' : ''}`} onClick={applyPrice}>{edit.warn ? 'Continue anyway' : 'Apply price'}</button>
          </div>
        </Modal>
      )}
    </>
  );
}
