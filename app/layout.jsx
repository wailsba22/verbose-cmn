import './globals.css';
import Providers from '@/components/Providers';
import Nav from '@/components/Nav';

export const metadata = { title: 'Stock', description: 'Simple stock and sales manager for small shops' };
export const viewport = { width: 'device-width', initialScale: 1, themeColor: '#0b6b4a' };

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <Providers>
          <main className="page">{children}</main>
          <Nav />
        </Providers>
      </body>
    </html>
  );
}
