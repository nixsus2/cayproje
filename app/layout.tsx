import Link from 'next/link'; // Link bileşenini import et
import './globals.css';

export const metadata = {
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
      <body className="bg-gray-100"> {/* Arka planı body'ye taşıyalım */}
        <header className="bg-white shadow-md sticky top-0 z-10">
          <nav className="container mx-auto px-4 py-3 flex justify-between items-center">
            <Link href="/" className="text-xl font-bold text-blue-600">
              Çay Ocağı
            </Link>
            <div className="space-x-4">
              <Link href="/order" className="text-gray-600 hover:text-blue-600">Sipariş Ver</Link>
              <Link href="/my-orders" className="text-gray-600 hover:text-blue-600">Siparişlerim</Link>
              <Link href="/dashboard" className="text-gray-600 hover:text-blue-600">Panel</Link>
              <Link href="/login" className="text-gray-600 hover:text-blue-600">Giriş Yap</Link>
              {/* TODO: Kullanıcı giriş yapmışsa "Çıkış Yap" butonu gösterilebilir */}
            </div>
          </nav>
        </header>
        <main className="container mx-auto p-4 mt-4"> {/* Ana içeriğe biraz padding ve margin ekleyelim */}
          {children}
        </main>
      </body>
    </html>
  );
}
