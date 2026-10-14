// Store-internal EAN-13 (prefix 200 = reserved for in-store use)
export function generateEAN13() {
  let d = '200';
  for (let i = 0; i < 9; i++) d += Math.floor(Math.random() * 10);
  let sum = 0;
  for (let i = 0; i < 12; i++) sum += Number(d[i]) * (i % 2 ? 3 : 1);
  return d + ((10 - (sum % 10)) % 10);
}

export const MAX_BARCODES = 7;

// Cameras often read the same product as UPC-A (12 digits) or EAN-13 with a leading 0.
// Try both forms so a scan still finds the product.
export function barcodeVariants(code) {
  const c = String(code).trim();
  const v = new Set([c]);
  if (/^\d{12}$/.test(c)) v.add('0' + c);
  if (/^0\d{12}$/.test(c)) v.add(c.slice(1));
  return [...v];
}
