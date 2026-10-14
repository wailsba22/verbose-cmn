'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { fmt } from '@/lib/money';

const TABS = [
  ['monthly', 'Monthly'],
  ['daily', 'Daily'],
  ['stock', 'Out of stock'],
  ['best', 'Best sellers'],
];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const monthLabel = (k) => `${MONTHS[Number(k.slice(5)) - 1]} ${k.slice(0, 4)}`;
const dayLabel = (k) => {
  const d = new Date(k + 'T12:00:00Z');
  return d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' });
};

function Bars({ rows, label }) {
  const max = Math.max(1, ...rows.map((r) => r.revenue));
  return (
    <ul className="bars">
      {rows.map((r) => (
        <li key={r.key}>
          <div className="bar-head"><strong>{label(r.key)}</strong><span>{fmt(r.revenue)}</span></div>
          <div className="track"><div className="fill" style={{ width: `${(r.revenue / max) * 100}%` }} /><div className="fill profit" style={{ width: `${(Math.max(0, r.profit) / max) * 100}%` }} /></div>
          <div className="bar-foot muted">
            <span>{r.sales} sales · {r.units} items</span>
            <span className={r.profit < 0 ? 'neg' : 'pos'}>Profit {fmt(r.profit)}</span>
          </div>
        </li>
      ))}
    </ul>
  );
}

export default function AnalyticsPage() {
  const [tab, setTab] = useState('monthly');
  const [data, setData] = useState(null);
  const [days, setDays] = useState(30);

  useEffect(() => {
    let stale = false;
    setData(null);
    const url = tab === 'stock'
      ? '/api/products?filter=low&limit=100'
      : `/api/analytics?type=${tab}${tab === 'best' ? `&days=${days}` : ''}`;
    fetch(url)
      .then((r) => r.json())
      .then((d) => { if (!stale) setData({ ...d, _tab: tab }); });
    return () => { stale = true; };
  }, [tab, days]);

  return (
    <>
      <h1>Analytics</h1>
      <div className="tabs" role="tablist">
        {TABS.map(([k, l]) => (
          <button key={k} role="tab" aria-selected={tab === k} className={tab === k ? 'on' : ''} onClick={() => setTab(k)}>{l}</button>
        ))}
      </div>

      {(!data || data._tab !== tab) && <p className="empty">Loading…</p>}

      {data?._tab === 'monthly' && tab === 'monthly' && (() => {
        const cur = data.rows[0];
        return (
          <>
            <div className="stats">
              <div><span>Sales this month</span><b>{cur ? cur.sales : 0}</b></div>
              <div><span>Items sold</span><b>{cur ? cur.units : 0}</b></div>
              <div><span>Revenue</span><b>{fmt(cur?.revenue || 0)}</b></div>
              <div><span>Profit</span><b>{fmt(cur?.profit || 0)}</b></div>
              <div><span>Products</span><b>{data.products}</b></div>
              <div><span>Stock value (cost)</span><b>{fmt(data.stockValue)}</b></div>
            </div>
            <p className="legend muted"><i className="sw a" /> Revenue <i className="sw b" /> Profit</p>
            {data.rows.length ? <Bars rows={data.rows} label={monthLabel} /> : <p className="empty">No sales yet. Your months will appear here.</p>}
          </>
        );
      })()}

      {data?._tab === 'daily' && tab === 'daily' && (
        <>
          <p className="legend muted"><i className="sw a" /> Revenue <i className="sw b" /> Profit · last 30 days</p>
          <Bars rows={data.rows} label={dayLabel} />
        </>
      )}

      {data?._tab === 'stock' && tab === 'stock' && (() => {
        const out = data.items.filter((p) => p.quantity <= 0);
        const low = data.items.filter((p) => p.quantity > 0);
        const row = (p) => (
          <li key={p._id}><Link href={`/inventory/${p._id}`} className="item"><div className="grow"><strong>{p.name}</strong><div className="muted">Warns at {p.lowStockAt}</div></div><span className={`qty ${p.quantity <= 0 ? 'out' : 'low'}`}>{p.quantity <= 0 ? 'Out' : p.quantity}</span></Link></li>
        );
        return (
          <>
            <h2>Out of stock ({out.length})</h2>
            {out.length ? <ul className="list">{out.map(row)}</ul> : <p className="empty">Nothing is out of stock.</p>}
            <h2>Running low ({low.length})</h2>
            {low.length ? <ul className="list">{low.map(row)}</ul> : <p className="empty">No product is below its warning level.</p>}
          </>
        );
      })()}

      {data?._tab === 'best' && tab === 'best' && (
        <>
          <div className="seg">
            {[[7, '7 days'], [30, '30 days'], [365, '1 year'], [0, 'All time']].map(([d, l]) => (
              <button key={d} className={days === d ? 'on' : ''} onClick={() => setDays(d)}>{l}</button>
            ))}
          </div>
          {data.rows.length ? (
            <ol className="rank">
              {data.rows.map((r, i) => (
                <li key={r.product}>
                  <span className="pos-n">{i + 1}</span>
                  <div className="grow"><strong>{r.name}</strong><div className="muted">{fmt(r.revenue)} revenue · {fmt(r.profit)} profit</div></div>
                  <b>{r.units}</b>
                </li>
              ))}
            </ol>
          ) : <p className="empty">No sales in this period.</p>}
        </>
      )}
    </>
  );
}