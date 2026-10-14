import { getSettings } from './settings';

let ctx;
export function unlockAudio() {
  try {
    ctx = ctx || new (window.AudioContext || window.webkitAudioContext)();
    if (ctx.state === 'suspended') ctx.resume();
  } catch {}
}

function tone(freq, start, dur, type = 'square', vol = 0.25) {
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = type;
  o.frequency.value = freq;
  g.gain.setValueAtTime(vol, ctx.currentTime + start);
  g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + start + dur);
  o.connect(g);
  g.connect(ctx.destination);
  o.start(ctx.currentTime + start);
  o.stop(ctx.currentTime + start + dur + 0.02);
}

// kind: 'ok' (barcode read / item added), 'error' (not found / no stock), 'done' (sale saved)
export function playSound(kind = 'ok') {
  if (typeof window === 'undefined' || getSettings().sound === false) return;
  try {
    unlockAudio();
    if (kind === 'ok') tone(1250, 0, 0.11);
    else if (kind === 'error') { tone(220, 0, 0.16, 'sawtooth', 0.3); tone(180, 0.18, 0.22, 'sawtooth', 0.3); }
    else if (kind === 'done') { tone(880, 0, 0.1, 'sine', 0.3); tone(1320, 0.12, 0.18, 'sine', 0.3); }
    navigator.vibrate?.(kind === 'error' ? [80, 50, 80] : 40);
  } catch {}
}
