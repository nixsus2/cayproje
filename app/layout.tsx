import Link from 'next/link'; // Link bileşenini import et
import Image from 'next/image'; // Image bileşenini import et
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
    <html lang="tr" className="h-full"> {/* Ensure html takes full height */}
      <body className="bg-gray-100 flex flex-col min-h-full"> {/* Add flex properties to body */}
        <header className="bg-white shadow-md sticky top-0 z-10">
          <nav className="container mx-auto px-4 py-3 flex justify-between items-center">
            {/* Logo ve Marka Adı */}
            <Link href="/" className="flex items-center space-x-2"> {/* Flex container */}
              <Image
                src="/logo.png" // public klasöründeki dosya yolu
                alt="ÇayAbi Logo"
                width={32} // Uygun genişliği ayarlayın
                height={32} // Uygun yüksekliği ayarlayın
                className="h-8 w-8" // Tailwind ile boyutlandırma (isteğe bağlı)
              />
              <span className="text-xl font-bold text-blue-600">
                Çay Ocağı
              </span>
            </Link>
            {/* Navigasyon Linkleri */}
            <div className="space-x-4">
              <Link href="/order" className="text-gray-600 hover:text-blue-600">Sipariş Ver</Link>
              <Link href="/my-orders" className="text-gray-600 hover:text-blue-600">Siparişlerim</Link>
              <Link href="/dashboard" className="text-gray-600 hover:text-blue-600">Panel</Link>
              <Link href="/login" className="text-gray-600 hover:text-blue-600">Giriş Yap</Link>
              {/* TODO: Kullanıcı giriş yapmışsa "Çıkış Yap" butonu gösterilebilir */}
            </div>
          </nav>
        </header>
        <main className="container mx-auto p-4 mt-4 flex-grow"> {/* Add flex-grow to main content */}
          {children}
        </main>
        {/* Footer Başlangıcı */}
        <footer className="bg-gray-200 text-center py-4 mt-auto"> {/* Use mt-auto to push footer down */}
          <p className="text-sm text-gray-600">
            Geleneği Teknolojiyle Harmanladık: ÇayAbi
          </p>
        </footer>
        {/* Footer Bitişi */}
      </body>
    </html>
  );
}
