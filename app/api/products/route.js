export const dynamic = 'force-dynamic';
import Product from '@/models/Product';
import Sale from '@/models/Sale';
import { handler, ok, fail } from '@/lib/api';
import { generateEAN13, barcodeVariants, MAX_BARCODES } from '@/lib/barcode';

const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export const GET = handler(async (req) => {
  const sp = new URL(req.url).searchParams;
  const q = sp.get('q')?.trim();
  const barcode = sp.get('barcode')?.trim();
  const filter = sp.get('filter');
  const limit = Math.min(Number(sp.get('limit')) || 30, 100);
  const skip = Number(sp.get('skip')) || 0;

  // Quick-add suggestions: what this shop sold most recently
  if (filter === 'popular') {
    const since = new Date(Date.now() - 60 * 86400000);
    const agg = await Sale.aggregate([
      { $match: { createdAt: { $gte: since } } },
      { $unwind: '$items' },
      { $group: { _id: '$items.product', units: { $sum: '$items.qty' } } },
      { $sort: { units: -1 } },
      { $limit: 16 },
    ]);
    const prods = await Product.find({ _id: { $in: agg.map((a) => a._id) }, quantity: { $gt: 0 } }).lean();
    const byId = new Map(prods.map((p) => [String(p._id), p]));
    const items = agg.map((a) => byId.get(String(a._id))).filter(Boolean).slice(0, 8);
    return ok({ items, total: items.length });
  }

  const where = {};
  if (barcode) where.barcodes = { $in: barcodeVariants(barcode) };
  if (q) {
    // every word must match the name or a barcode, in any order
    where.$and = q.split(/\s+/).filter(Boolean).slice(0, 5).map((t) => {
      const rx = new RegExp(esc(t), 'i');
      return { $or: [{ name: rx }, { barcodes: rx }] };
    });
  }
  if (filter === 'low') where.$expr = { $lte: ['$quantity', '$lowStockAt'] };

  const sort = filter === 'low' ? { quantity: 1, name: 1 } : { name: 1 };
  const [items, total] = await Promise.all([
    Product.find(where).sort(sort).skip(skip).limit(limit).lean(),
    Product.countDocuments(where),
  ]);
  return ok({ items, total });
});

export const POST = handler(async (req) => {
  const b = await req.json();
  const name = String(b.name || '').trim();
  const buyPrice = Number(b.buyPrice);
  const sellPrice = Number(b.sellPrice);
  if (!name) return fail('Product name is required');
  if (!(buyPrice >= 0) || !(sellPrice >= 0)) return fail('Enter valid buy and sell prices');

  const codes = [...new Set((b.barcodes || []).map((c) => String(c).trim()).filter(Boolean))].slice(0, MAX_BARCODES);
  if (codes.length) {
    const dups = await Product.find({ barcodes: { $in: codes.flatMap(barcodeVariants) } }).select('name barcodes').lean();
    if (dups.length) return fail('A barcode is already registered', 409, { duplicates: dups });
  }
  if (!codes.length) {
    let c;
    do c = generateEAN13();
    while (await Product.exists({ barcodes: c }));
    codes.push(c);
  }
  const p = await Product.create({
    name,
    barcodes: codes,
    buyPrice,
    sellPrice,
    quantity: Math.max(0, Math.floor(Number(b.quantity) || 0)),
    lowStockAt: Math.max(0, Math.floor(Number(b.lowStockAt ?? 5))),
  });
  return ok(p, 201);
});
