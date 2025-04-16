import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Çay Siparişleri',
  description: 'Çay sipariş yönetim sistemi',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="tr">
      <body>
        <main className="min-h-screen bg-gray-50">
          {children}
        </main>
      </body>
    </html>
  );
}
