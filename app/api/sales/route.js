export const dynamic = 'force-dynamic';
import Product from '@/models/Product';
import Sale from '@/models/Sale';
import { handler, ok, fail } from '@/lib/api';
import { totals, dayStart } from '@/lib/money';

export const GET = handler(async (req) => {
  const sp = new URL(req.url).searchParams;
  const date = sp.get('date'); // YYYY-MM-DD
  const limit = Math.min(Number(sp.get('limit')) || 50, 200);
  const where = {};
  if (date) {
    const start = dayStart(date);
    where.createdAt = { $gte: start, $lt: new Date(start.getTime() + 86400000) };
  }
  const sales = await Sale.find(where).sort({ createdAt: -1 }).limit(limit).lean();
  return ok({ sales });
});

export const POST = handler(async (req) => {
  const { items } = await req.json();
  if (!Array.isArray(items) || !items.length) return fail('The cart is empty');

  const products = await Product.find({ _id: { $in: items.map((i) => i.productId) } }).lean();
  const byId = new Map(products.map((p) => [String(p._id), p]));

  const lines = [];
  for (const it of items) {
    const p = byId.get(String(it.productId));
    const qty = Math.floor(Number(it.qty));
    const price = Number(it.price);
    if (!p) return fail('A product in the cart no longer exists');
    if (!(qty > 0) || !(price >= 0)) return fail(`Invalid quantity or price for "${p.name}"`);
    lines.push({
      product: p._id,
      name: p.name,
      barcode: p.barcodes[0] || '',
      qty,
      buyPrice: p.buyPrice,
      listPrice: p.sellPrice,
      soldPrice: price,
    });
  }

  // Take stock out; if any line lacks stock, put back what was already taken.
  const taken = [];
  for (const l of lines) {
    const r = await Product.updateOne({ _id: l.product, quantity: { $gte: l.qty } }, { $inc: { quantity: -l.qty } });
    if (!r.modifiedCount) {
      for (const t of taken) await Product.updateOne({ _id: t.product }, { $inc: { quantity: t.qty } });
      return fail(`Not enough stock for "${l.name}"`, 409);
    }
    taken.push(l);
  }

  const sale = await Sale.create({ items: lines, ...totals(lines) });
  return ok(sale, 201);
});
