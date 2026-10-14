'use client';
import { useEffect, useRef, useState } from 'react';
import { playSound } from '@/lib/sound';

// Live camera view. Reads many barcode types (EAN/UPC, Code 128/39/93, ITF, Codabar, DataMatrix,
// QR, PDF417, Aztec, GS1 DataBar) and uses the phone's built-in detector when it has one (much faster).
// Calls onScan(code) per read; the same code is ignored for 1.2 s so it isn't counted twice.
export default function Scanner({ onScan, id = 'reader', height = 190, beep = true }) {
  const cb = useRef(onScan);
  cb.current = onScan;
  const beepRef = useRef(beep);
  beepRef.current = beep;
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let scanner;
    let started = false;
    let cancelled = false;
    let last = { code: '', at: 0 };
    setError('');

    (async () => {
      const { Html5Qrcode, Html5QrcodeSupportedFormats: F } = await import('html5-qrcode');
      if (cancelled) return;
      scanner = new Html5Qrcode(id, {
        verbose: false,
        useBarCodeDetectorIfSupported: true,
        formatsToSupport: [F.EAN_13, F.EAN_8, F.UPC_A, F.UPC_E, F.UPC_EAN_EXTENSION, F.CODE_128, F.CODE_39, F.CODE_93, F.ITF, F.CODABAR, F.RSS_14, F.RSS_EXPANDED, F.DATA_MATRIX, F.QR_CODE, F.PDF_417, F.AZTEC],
      });
      const onRead = (text) => {
        const now = Date.now();
        if (text === last.code && now - last.at < 1200) return;
        last = { code: text, at: now };
        if (beepRef.current) playSound('ok');
        cb.current(text);
      };
      const base = { fps: 15 }; // no qrbox = the whole frame is searched, so odd or tilted codes still read
      try {
        try {
          await scanner.start(
            { facingMode: 'environment' },
            { ...base, videoConstraints: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 }, advanced: [{ focusMode: 'continuous' }] } },
            onRead,
            () => {}
          );
        } catch (e) {
          if (cancelled) return;
          await scanner.start({ facingMode: 'environment' }, base, onRead, () => {});
        }
        started = true;
        if (cancelled) {
          await scanner.stop().catch(() => {});
          scanner.clear();
        }
      } catch (e) {
        if (!cancelled) setError('Camera unavailable. Allow camera access (the site must use HTTPS or localhost).');
      }
    })();

    return () => {
      cancelled = true;
      if (scanner && started) scanner.stop().then(() => scanner.clear()).catch(() => {});
    };
  }, [id, attempt]);

  return (
    <div className="scanner" style={{ height }}>
      <div id={id} />
      <i className="frame" aria-hidden="true" />
      {error && (
        <div className="scanner-error">
          <p>{error}</p>
          <button className="btn small" onClick={() => setAttempt((a) => a + 1)}>Try again</button>
        </div>
      )}
    </div>
  );
}
