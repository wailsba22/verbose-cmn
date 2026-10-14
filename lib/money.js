export const fmt = (n) =>
  Math.round((Number(n) || 0) * 100) / 100 === Math.round(Number(n) || 0)
    ? Math.round(Number(n) || 0).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ') + ' DA'
    : (Math.round((Number(n) || 0) * 100) / 100).toFixed(2) + ' DA';

// Algeria is UTC+1 all year
export const TZ_OFFSET_MS = 3600000;
export const dayKey = (d) => new Date(new Date(d).getTime() + TZ_OFFSET_MS).toISOString().slice(0, 10);
export const monthKey = (d) => dayKey(d).slice(0, 7);
export const dayStart = (key) => new Date(new Date(key + 'T00:00:00Z').getTime() - TZ_OFFSET_MS);

export function totals(items) {
  let total = 0, profit = 0, units = 0;
  for (const i of items) {
    total += i.soldPrice * i.qty;
    profit += (i.soldPrice - i.buyPrice) * i.qty;
    units += i.qty;
  }
  return { total, profit, units };
}
