'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useApp } from './Providers';

const I = {
  box: <path d="M3 7.5 12 3l9 4.5v9L12 21l-9-4.5v-9Zm9 4.5 9-4.5M12 12v9M12 12 3 7.5" />,
  plus: <path d="M12 5v14M5 12h14" />,
  chart: <path d="M4 20V10m6 10V4m6 16v-7m4 7H2" />,
  log: <path d="M6 3h12v18l-3-2-3 2-3-2-3 2V3Zm3 5h6m-6 4h6" />,
  check: <path d="m5 12.5 4.5 4.5L19 7.5" />,
  scan: <path d="M4 8V5a1 1 0 0 1 1-1h3m8 0h3a1 1 0 0 1 1 1v3M4 16v3a1 1 0 0 0 1 1h3m8 0h3a1 1 0 0 0 1-1v-3M7 12h10" />,
};
const Icon = ({ d }) => (
  <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {I[d]}
  </svg>
);

export default function Nav() {
  const path = usePathname();
  const { checkout, saving, count } = useApp();
  const onMain = path === '/';
  const tab = (href, icon, label) => (
    <Link href={href} className={`tab ${path.startsWith(href) ? 'on' : ''}`}>
      <Icon d={icon} />
      <span>{label}</span>
    </Link>
  );

  return (
    <nav className="nav" aria-label="Main">
      {tab('/inventory', 'box', 'Inventory')}
      {tab('/add', 'plus', 'Add')}
      <div className="center-slot">
        {onMain ? (
          <button className="center save" onClick={checkout} disabled={saving} aria-label="Save sale">
            <Icon d="check" />
            <span>{saving ? '…' : 'Save'}</span>
          </button>
        ) : (
          <Link href="/" className="center" aria-label="Go to sale screen">
            <Icon d="scan" />
            <span>Sell</span>
            {count > 0 && <i className="badge">{count}</i>}
          </Link>
        )}
      </div>
      {tab('/analytics', 'chart', 'Analytics')}
      {tab('/sales', 'log', 'Sales log')}
    </nav>
  );
}
