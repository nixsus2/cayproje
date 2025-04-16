'use client'; // Süslü parantezler kaldırıldı

import React, { useState, useEffect } from 'react'; // React import edildi
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
// OrderItem ve diğer gerekli tipleri import et
import type { Order, OrderItem, OrderStatus, Product, AuthUser, SugarLevel, DrinkSize } from '@/lib/supabase';

// API'den gelen birleştirilmiş sipariş tipi (items içerecek şekilde)
// Her item içinde product bilgisi de olmalı
type OrderWithItems = Order & {
  items: (OrderItem & { products: Pick<Product, 'id' | 'name'> | null })[];
  // Profil bilgisi de eklenebilir, ancak bu sayfada gerekli değil gibi
};

// TODO: Bu sayfayı sadece 'customer' rolündeki kullanıcıların erişebilmesi için koruma altına al.

export default function MyOrdersPage() {
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(null);
  // State tipini OrderWithItems[] olarak güncelle
  const [orders, setOrders] = useState<OrderWithItems[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Zamanı daha okunabilir formatta göster
  const formatDateTime = (timestamp: string | null | undefined): string => {
    if (!timestamp) return 'Bilinmiyor';
    try {
      return new Date(timestamp).toLocaleString('tr-TR', {
        year: 'numeric', month: 'numeric', day: 'numeric',
        hour: '2-digit', minute: '2-digit'
      });
    } catch {
      return 'Geçersiz Zaman';
    }
  };

  // Sipariş durumunu metne çevir (yeni durumlarla)
  const getStatusText = (status: OrderStatus): string => {
    const map: Record<OrderStatus, string> = {
      pending: 'Bekliyor',
      preparing: 'Hazırlanıyor',
      ready: 'Hazır',
      delivered: 'Teslim Edildi',
      cancelled: 'İptal Edildi'
    };
    return map[status] || status;
  };

   // Sipariş durumuna göre renk belirle (yeni durumlarla)
   const getStatusColor = (status: OrderStatus): string => {
     const map: Record<OrderStatus, string> = {
       pending: 'text-yellow-600',
       preparing: 'text-blue-600',
       ready: 'text-purple-600',
       delivered: 'text-green-600',
       cancelled: 'text-red-600'
     };
     return map[status] || 'text-gray-600';
   };

  // Yardımcı fonksiyonlar (OrderCard'dan kopyalandı)
  const getSugarText = (level: OrderItem['sugar_level']): string => {
    if (!level) return '';
    const map: Record<SugarLevel, string> = { none: 'Şekersiz', low: 'Az Şekerli', medium: 'Orta', high: 'Şekerli' };
    return map[level] || level;
  };
  // Parametre tipini OrderItem['size'] olarak düzelt
  const getSizeText = (size: OrderItem['size']): string => {
    if (!size) return '';
    // Veritabanı sütunu 'size' (text) olduğu için tipi string kontrolü yapalım
    if (size === 'small') return 'Küçük';
    if (size === 'large') return 'Büyük';
    return size || ''; // Diğer durumlar veya null için boş veya değeri döndür
  };


  useEffect(() => {
    const fetchMyOrders = async () => {
      setLoading(true);
      setError('');
      try {
        // Önce kullanıcı oturumunu al (gerekirse)
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        if (sessionError || !session?.user) {
          // Oturum yoksa veya hata varsa login sayfasına yönlendir
          console.log('Oturum bulunamadı veya hata:', sessionError);
          router.push('/login');
          return;
        }
        setUser(session.user);

        // Siparişleri doğrudan istemci tarafında çekelim
        const { data: ordersData, error: ordersError } = await supabase
          .from('orders')
          .select(`
            *,
            items:order_items (
              *,
              products ( id, name )
            )
          `)
          .eq('user_id', session.user.id) // Oturumdaki kullanıcı ID'sini kullan
          .order('created_at', { ascending: false });

        if (ordersError) {
          // RLS hatası olup olmadığını kontrol et
          if (ordersError.message.includes('security barrier')) {
             throw new Error(`Siparişler alınamadı: Veritabanı güvenlik kuralları (RLS) engelliyor olabilir.`);
          }
          throw ordersError; // Diğer hataları fırlat
        }

        // Gelen veriyi state'e kaydet
        setOrders((ordersData as OrderWithItems[]) || []);

      } catch (err: any) {
        console.error('Error fetching my orders:', err);
        setError(`Siparişler yüklenemedi: ${err.message}`);
        // Yetkisiz hatası durumunda login'e yönlendirme (opsiyonel)
        // if (err.message.includes('Yetkisiz') || err.message.includes('Unauthorized')) {
        //     router.push('/login');
        // }
      } finally {
        setLoading(false);
      }
    };

    fetchMyOrders();
  }, [router]); // router bağımlılığını ekledik

  return (
    <main className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-3xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">Siparişlerim</h1>
          <div>
            <Link href="/order" className="text-blue-600 hover:underline mr-4">
              Yeni Sipariş Ver
            </Link>
            {user && ( // Kullanıcı varsa çıkış yap butonu göster
              <button
                onClick={async () => {
                  setLoading(true); // Çıkış yaparken loading state'i
                  await supabase.auth.signOut();
                  router.push('/login');
                  // setLoading(false); // Yönlendirme sonrası gerek kalmaz
                }}
                disabled={loading} // Loading sırasında disable
                className="text-sm text-red-600 hover:underline disabled:opacity-50"
              >
                {loading ? 'Çıkış yapılıyor...' : 'Çıkış Yap'}
              </button>
            )}
          </div>
        </div>

        {loading && !orders.length && <p>Siparişleriniz yükleniyor...</p>} {/* Sadece başlangıçta göster */}
        {error && <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4" role="alert">{error}</div>}

        {!loading && !error && (
          <div className="bg-white p-6 rounded-lg shadow">
            {orders.length === 0 ? (
              <p className="text-gray-500">Henüz sipariş vermemişsiniz.</p>
            ) : (
              <ul className="divide-y divide-gray-200">
                {/* orders state'i artık OrderWithItems[] tipinde */}
                {orders.map((order) => (
                  <li key={order.id} className="py-4">
                    <div className="flex justify-between items-start"> {/* items-start eklendi */}
                      <div>
                        <p className="font-semibold text-md mb-1">
                          Sipariş #{order.id.substring(0, 6)} - <span className={getStatusColor(order.status)}>{getStatusText(order.status)}</span>
                        </p>
                        <p className="text-sm text-gray-500 mb-2">
                          Tarih: {formatDateTime(order.created_at)}
                        </p>
                        {/* Sipariş Kalemlerini Listele */}
                        {/* order.items kontrolü eklendi */}
                        <ul className="space-y-1 pl-4 list-disc list-inside">
                          {order.items?.map(item => ( // item'a OrderItem & { products: ... } tipi geliyor
                            <li key={item.id} className="text-sm text-gray-700">
                              {item.quantity}x {item.products?.name || 'Bilinmeyen Ürün'}
                              <span className="text-gray-500 text-xs ml-1">
                                {/* Yardımcı fonksiyonlar kullanıldı (item.size ile) */}
                                ({getSizeText(item.size)}{item.sugar_level ? `, ${getSugarText(item.sugar_level)}` : ''})
                              </span>
                              {item.notes && <span className="block italic text-xs text-gray-500">Not: {item.notes}</span>}
                            </li>
                          ))}
                          {(!order.items || order.items.length === 0) && (
                             <li className="text-sm text-gray-500 italic">Sipariş içeriği boş.</li>
                          )}
                        </ul>
                      </div>
                      {/* Durum sağ üstte zaten gösteriliyor */}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
