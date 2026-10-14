'use client';
import { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';
import { printReceipt } from '@/lib/receipt';
import { getSettings } from '@/lib/settings';
import { playSound, unlockAudio } from '@/lib/sound';

const Ctx = createContext(null);
export const useApp = () => useContext(Ctx);

export default function Providers({ children }) {
  const [cart, setCart] = useState([]);
  const [toast, setToast] = useState(null);
  const [saving, setSaving] = useState(false);
  const timer = useRef();
  const cartRef = useRef([]);
  cartRef.current = cart;

  useEffect(() => {
    const u = () => unlockAudio();
    window.addEventListener('pointerdown', u, { once: true });
    window.addEventListener('keydown', u, { once: true });
    return () => { window.removeEventListener('pointerdown', u); window.removeEventListener('keydown', u); };
  }, []);

  const notify = useCallback((msg, type = 'ok', action = null) => {
    setToast({ msg, type, action, k: Date.now() });
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setToast(null), action ? 8000 : 2600);
  }, []);

  const printSale = useCallback(
    async (sale) => {
      try {
        await printReceipt(sale);
      } catch (e) {
        if (e?.name !== 'NotFoundError') notify(e.message || 'Printing failed', 'err');
      }
    },
    [notify]
  );

  const addProduct = useCallback(
    (p) => {
      if (p.quantity <= 0) { playSound('error'); return notify(`${p.name} is out of stock`, 'err'); }
      const existing = cartRef.current.find((x) => x.productId === p._id);
      if (existing && existing.qty >= existing.stock) { playSound('error'); return notify(`Only ${existing.stock} of ${p.name} in stock`, 'err'); }
      playSound('ok');
      setCart((c) => {
        const i = c.findIndex((x) => x.productId === p._id);
        if (i >= 0) {
          const n = [...c];
          n[i] = { ...n[i], qty: n[i].qty + 1 };
          return n;
        }
        return [
          { productId: p._id, name: p.name, barcode: p.barcodes?.[0] || '', buyPrice: p.buyPrice, listPrice: p.sellPrice, price: p.sellPrice, qty: 1, stock: p.quantity },
          ...c,
        ];
      });
      notify(`Added ${p.name}`);
    },
    [notify]
  );

  const patch = (id, fn) => setCart((c) => c.map((x) => (x.productId === id ? fn(x) : x)));
  const removeItem = (id) => setCart((c) => c.filter((x) => x.productId !== id));
  const setQty = (id, qty) => patch(id, (x) => ({ ...x, qty: Math.max(1, Math.min(x.stock, qty)) }));
  const setPrice = (id, price) => patch(id, (x) => ({ ...x, price }));
  const total = cart.reduce((s, i) => s + i.price * i.qty, 0);
  const count = cart.reduce((s, i) => s + i.qty, 0);

  const checkout = async () => {
    if (saving) return false;
    if (!cartRef.current.length) {
      playSound('error');
      notify('Scan or search a product first', 'err');
      return false;
    }
    setSaving(true);
    try {
      const r = await fetch('/api/sales', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: cartRef.current.map((i) => ({ productId: i.productId, qty: i.qty, price: i.price })) }),
      });
      const sale = await r.json();
      if (!r.ok) throw new Error(sale.error);
      setCart([]);
      playSound('done');
      if (getSettings().autoPrint) {
        notify('Sale saved');
        printSale(sale);
      } else {
        notify('Sale saved', 'ok', { label: 'Print receipt', onClick: () => printSale(sale) });
      }
      return true;
    } catch (e) {
      playSound('error');
      notify(e.message, 'err');
      return false;
    } finally {
      setSaving(false);
    }
  };

  return (
    <Ctx.Provider value={{ cart, total, count, addProduct, removeItem, setQty, setPrice, checkout, saving, notify, printSale }}>
      {children}
      {toast && (
        <div key={toast.k} className={`toast ${toast.type}`} role="status">
          <span>{toast.msg}</span>
          {toast.action && (
            <button onClick={() => { toast.action.onClick(); setToast(null); }}>{toast.action.label}</button>
          )}
        </div>
      )}
    </Ctx.Provider>
  );
}
