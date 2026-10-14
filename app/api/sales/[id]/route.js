export const dynamic = 'force-dynamic';
import Product from '@/models/Product';
import Sale from '@/models/Sale';
import { handler, ok, fail } from '@/lib/api';
import { totals } from '@/lib/money';

// Edit quantities / sold prices of a saved sale. Stock is adjusted by the difference.
export const PUT = handler(async (req, { params }) => {
  const { items } = await req.json();
  const sale = await Sale.findById(params.id);
  if (!sale) return fail('Sale not found', 404);

  const plan = sale.items.map((old) => {
    const e = items.find((i) => String(i.product) === String(old.product));
    return {
      old,
      qty: e ? Math.floor(Number(e.qty)) : old.qty,
      price: e ? Number(e.soldPrice) : old.soldPrice,
    };
  });
  if (plan.some((p) => !(p.qty >= 0) || !(p.price >= 0))) return fail('Invalid quantity or price');
  if (plan.every((p) => p.qty === 0)) return fail('A sale needs at least one item. Delete the sale instead.');

  const applied = [];
  const rollback = async () => {
    for (const a of applied) await Product.updateOne({ _id: a.product }, { $inc: { quantity: a.delta } });
  };
  const next = [];
  for (const p of plan) {
    const delta = p.qty - p.old.qty; // positive = sold more = take more stock
    if (delta > 0) {
      const r = await Product.updateOne({ _id: p.old.product, quantity: { $gte: delta } }, { $inc: { quantity: -delta } });
      if (!r.modifiedCount) {
        await rollback();
        return fail(`Not enough stock for "${p.old.name}"`, 409);
      }
      applied.push({ product: p.old.product, delta: -delta });
    } else if (delta < 0) {
      await Product.updateOne({ _id: p.old.product }, { $inc: { quantity: -delta } });
      applied.push({ product: p.old.product, delta: -delta });
    }
    if (p.qty > 0) next.push({ ...p.old.toObject(), qty: p.qty, soldPrice: p.price });
  }
  sale.items = next;
  Object.assign(sale, totals(next));
  await sale.save();
  return ok(sale);
});

export const DELETE = handler(async (_req, { params }) => {
  const sale = await Sale.findById(params.id);
  if (!sale) return fail('Sale not found', 404);
  for (const i of sale.items) await Product.updateOne({ _id: i.product }, { $inc: { quantity: i.qty } });
  await sale.deleteOne();
  return ok({ deleted: true });
});
