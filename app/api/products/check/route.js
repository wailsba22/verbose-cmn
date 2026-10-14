export const dynamic = 'force-dynamic';
import Product from '@/models/Product';
import { handler, ok } from '@/lib/api';
import { barcodeVariants } from '@/lib/barcode';

export const GET = handler(async (req) => {
  const codes = (new URL(req.url).searchParams.get('codes') || '').split(',').map((c) => c.trim()).filter(Boolean);
  if (!codes.length) return ok({ matches: [] });
  const matches = await Product.find({ barcodes: { $in: codes.flatMap(barcodeVariants) } }).select('name barcodes').lean();
  return ok({ matches });
});
