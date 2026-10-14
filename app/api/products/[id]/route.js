export const dynamic = 'force-dynamic';
import Product from '@/models/Product';
import { handler, ok, fail } from '@/lib/api';
import { MAX_BARCODES } from '@/lib/barcode';

export const GET = handler(async (_req, { params }) => {
  const p = await Product.findById(params.id).lean();
  return p ? ok(p) : fail('Product not found', 404);
});

export const PUT = handler(async (req, { params }) => {
  const b = await req.json();
  const update = {};
  if (b.name !== undefined) {
    if (!String(b.name).trim()) return fail('Product name is required');
    update.name = String(b.name).trim();
  }
  for (const k of ['buyPrice', 'sellPrice', 'quantity', 'lowStockAt']) {
    if (b[k] !== undefined) {
      const n = Number(b[k]);
      if (!(n >= 0)) return fail('Numbers cannot be negative');
      update[k] = n;
    }
  }
  if (b.barcodes !== undefined) {
    const codes = [...new Set(b.barcodes.map((c) => String(c).trim()).filter(Boolean))].slice(0, MAX_BARCODES);
    if (!codes.length) return fail('Keep at least one barcode');
    const dups = await Product.find({ _id: { $ne: params.id }, barcodes: { $in: codes } }).select('name barcodes').lean();
    if (dups.length) return fail('A barcode is already used by another product', 409, { duplicates: dups });
    update.barcodes = codes;
  }
  const p = await Product.findByIdAndUpdate(params.id, update, { new: true, runValidators: true }).lean();
  return p ? ok(p) : fail('Product not found', 404);
});

export const DELETE = handler(async (_req, { params }) => {
  await Product.findByIdAndDelete(params.id);
  return ok({ deleted: true });
});
