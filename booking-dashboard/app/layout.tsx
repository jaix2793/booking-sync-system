import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Booking Sync Dashboard',
  description: 'Real-time booking synchronisation dashboard',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
