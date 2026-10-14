const KEY = 'stock-settings';
export const DEFAULTS = { shopName: 'My Shop', phone: '', footer: 'Thank you!', paper: '58', method: 'browser', autoPrint: false, sound: true };

export function getSettings() {
  if (typeof window === 'undefined') return DEFAULTS;
  try {
    return { ...DEFAULTS, ...JSON.parse(localStorage.getItem(KEY) || '{}') };
  } catch {
    return DEFAULTS;
  }
}
export function saveSettings(patch) {
  const next = { ...getSettings(), ...patch };
  try { localStorage.setItem(KEY, JSON.stringify(next)); } catch {}
  return next;
}
