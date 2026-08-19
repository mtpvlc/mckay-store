import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'McKay Shop',
  description: 'Product catalogue',
  icons: { icon: '/mckay-logo.png' },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
