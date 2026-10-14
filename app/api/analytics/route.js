export const dynamic = 'force-dynamic';
import Sale from '@/models/Sale';
import Product from '@/models/Product';
import { handler, ok } from '@/lib/api';
import { dayKey, monthKey, TZ_OFFSET_MS } from '@/lib/money';

const blank = (key) => ({ key, sales: 0, units: 0, revenue: 0, cost: 0, profit: 0 });
function add(row, sale) {
  row.sales += 1;
  for (const i of sale.items) {
    row.units += i.qty;
    row.revenue += i.soldPrice * i.qty;
    row.cost += i.buyPrice * i.qty;
  }
  row.profit = row.revenue - row.cost;
}

export const GET = handler(async (req) => {
  const sp = new URL(req.url).searchParams;
  const type = sp.get('type') || 'monthly';

  if (type === 'monthly') {
    const since = new Date();
    since.setUTCMonth(since.getUTCMonth() - 11, 1);
    since.setUTCHours(0, 0, 0, 0);
    const sales = await Sale.find({ createdAt: { $gte: since } }).lean();
    const rows = new Map();
    for (const s of sales) {
      const k = monthKey(s.createdAt);
      if (!rows.has(k)) rows.set(k, blank(k));
      add(rows.get(k), s);
    }
    const [products, stock] = await Promise.all([
      Product.countDocuments(),
      Product.aggregate([{ $group: { _id: null, value: { $sum: { $multiply: ['$quantity', '$buyPrice'] } }, units: { $sum: '$quantity' } } }]),
    ]);
    return ok({
      rows: [...rows.values()].sort((a, b) => b.key.localeCompare(a.key)),
      products,
      stockValue: stock[0]?.value || 0,
      stockUnits: stock[0]?.units || 0,
    });
  }

  if (type === 'daily') {
    const days = 30;
    const since = new Date(Date.now() - days * 86400000);
    const sales = await Sale.find({ createdAt: { $gte: since } }).lean();
    const rows = new Map();
    for (let i = 0; i < days; i++) {
      const k = dayKey(Date.now() - i * 86400000);
      rows.set(k, blank(k));
    }
    for (const s of sales) {
      const k = dayKey(s.createdAt);
      if (rows.has(k)) add(rows.get(k), s);
    }
    return ok({ rows: [...rows.values()] });
  }

  if (type === 'best') {
    const days = Number(sp.get('days'));
    const where = days > 0 ? { createdAt: { $gte: new Date(Date.now() - days * 86400000) } } : {};
    const sales = await Sale.find(where).lean();
    const map = new Map();
    for (const s of sales)
      for (const i of s.items) {
        const k = String(i.product);
        const r = map.get(k) || { product: k, name: i.name, units: 0, revenue: 0, profit: 0 };
        r.name = i.name;
        r.units += i.qty;
        r.revenue += i.soldPrice * i.qty;
        r.profit += (i.soldPrice - i.buyPrice) * i.qty;
        map.set(k, r);
      }
    return ok({ rows: [...map.values()].sort((a, b) => b.units - a.units).slice(0, 30) });
  }

  return ok({ rows: [] });
});
