'use client';
import { useEffect, useState } from 'react';
import Modal from '@/components/Modal';
import { useApp } from '@/components/Providers';
import { fmt, dayKey } from '@/lib/money';

const time = (d) => new Date(d).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'Africa/Algiers' });

export default function SalesLogPage() {
  const { notify, printSale } = useApp();
  const [date, setDate] = useState(dayKey(Date.now()));
  const [sales, setSales] = useState(null);
  const [open, setOpen] = useState(null);
  const [draft, setDraft] = useState(null);
  const [del, setDel] = useState(null);

  const load = () => fetch(`/api/sales?date=${date}`).then((r) => r.json()).then((d) => setSales(d.sales));
  useEffect(() => { setSales(null); load(); }, [date]);

  async function saveEdit() {
    const r = await fetch(`/api/sales/${draft._id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items: draft.items.map((i) => ({ product: i.product, qty: i.qty, soldPrice: i.soldPrice })) }),
    });
    const d = await r.json();
    if (!r.ok) return notify(d.error, 'err');
    setDraft(null);
    notify('Sale updated');
    load();
  }
  async function remove() {
    await fetch(`/api/sales/${del._id}`, { method: 'DELETE' });
    setDel(null);
    notify('Sale deleted and stock restored');
    load();
  }
  const upd = (idx, k, v) => setDraft({ ...draft, items: draft.items.map((i, n) => (n === idx ? { ...i, [k]: v } : i)) });

  return (
    <>
      <h1>Sales log</h1>
      <div className="inline">
        <input className="field" type="date" value={date} max={dayKey(Date.now())} onChange={(e) => e.target.value && setDate(e.target.value)} />
      </div>
      {!sales && <p className="empty">Loading…</p>}
      {sales && !sales.length && <p className="empty">No sales on this day.</p>}
      <ul className="list">
        {(sales || []).map((s) => (
          <li key={s._id} className="sale">
            <button className="item" onClick={() => setOpen(open === s._id ? null : s._id)}>
              <div className="grow">
                <strong>{time(s.createdAt)}</strong>
                <div className="muted">{s.units} {s.units === 1 ? 'item' : 'items'}</div>
              </div>
              <div className="right"><b>{fmt(s.total)}</b></div>
            </button>
            {open === s._id && (
              <div className="sale-detail">
                {s.items.map((i, n) => (
                  <div key={n} className="sale-line"><span>{i.qty} × {i.name}</span><span>{fmt(i.soldPrice * i.qty)}</span></div>
                ))}
                <div className="actions spread">
                  <button className="btn ghost small danger" onClick={() => setDel(s)}>Delete</button>
                  <button className="btn ghost small" onClick={() => printSale(s)}>Print receipt</button>
                  <button className="btn small" onClick={() => setDraft(JSON.parse(JSON.stringify(s)))}>Edit sale</button>
                </div>
              </div>
            )}
          </li>
        ))}
      </ul>

      {draft && (
        <Modal title="Edit sale" onClose={() => setDraft(null)}>
          {draft.items.map((i, n) => (
            <div key={n} className="edit-line">
              <strong>{i.name}</strong>
              <div className="two">
                <label className="lbl">Quantity<input className="field" type="number" min="0" value={i.qty} onChange={(e) => upd(n, 'qty', e.target.value)} /></label>
                <label className="lbl">Price (DA)<input className="field" type="number" min="0" value={i.soldPrice} onChange={(e) => upd(n, 'soldPrice', e.target.value)} /></label>
              </div>
            </div>
          ))}
          <p className="muted">Set a quantity to 0 to remove that item. Stock is adjusted automatically.</p>
          <div className="actions">
            <button className="btn ghost" onClick={() => setDraft(null)}>Cancel</button>
            <button className="btn" onClick={saveEdit}>Save changes</button>
          </div>
        </Modal>
      )}
      {del && (
        <Modal title="Delete this sale?" onClose={() => setDel(null)}>
          <p>The items go back into your inventory and the sale is removed from your analytics.</p>
          <div className="actions">
            <button className="btn ghost" onClick={() => setDel(null)}>Keep it</button>
            <button className="btn danger-fill" onClick={remove}>Delete sale</button>
          </div>
        </Modal>
      )}
    </>
  );
}
