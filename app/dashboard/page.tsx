'use client'; // Süslü parantezler kaldırıldı

import React, { useState, useEffect, useRef } from 'react'; // useRef eklendi
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import OrderCard from '../components/OrderCard';
// OrderItem ve diğer gerekli tipleri import et
import type { Order, OrderItem, OrderStatus, Profile, Product, AuthUser } from '@/lib/supabase';
import type { RealtimeChannel } from '@supabase/supabase-js'; // RealtimeChannel import edildi

// Dashboard'da kullanılacak sipariş tipi (OrderCard'ın beklediği yapıya uygun)
type DashboardOrder = Order & {
  profiles: Pick<Profile, 'id' | 'username'> | null; // Kullanıcı bilgisi
  items: (OrderItem & { products: Pick<Product, 'id' | 'name'> | null })[]; // Ürün bilgisi içeren item'lar
};

// TODO: Bu sayfayı sadece 'owner' veya 'admin' rolündeki kullanıcıların erişebilmesi için koruma altına al.

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(null);
  // State tipini DashboardOrder[] olarak güncelle (şimdilik any, sonra düzeltilecek)
  const [orders, setOrders] = useState<any[]>([]); // Profilsiz siparişleri tutacak
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const channelRef = useRef<RealtimeChannel | null>(null); // Kanal referansı için useRef
  const notificationSoundRef = useRef<HTMLAudioElement | null>(null); // Ses referansı
  // Profil bilgilerini tutmak için ek state
  const [profilesMap, setProfilesMap] = useState<Record<string, Pick<Profile, 'id' | 'username'>>>({});

  // Bildirim sesini çalma fonksiyonu
  const playNotificationSound = () => {
    if (notificationSoundRef.current) {
      notificationSoundRef.current.play().catch(e => console.error("Ses çalınamadı:", e));
    }
  };

  // Siparişleri ve ilişkili verileri çekme fonksiyonu
  const fetchOrdersAndProfiles = async () => {
    setError('');
    setLoading(true);
    try {
      // 1. Siparişleri ve kalemlerini çek (profil olmadan)
      const { data: ordersData, error: ordersError } = await supabase
        .from('orders')
        .select(`
          *,
          items:order_items (
            *,
            products ( id, name )
          )
        `)
        // Sadece teslim edilmemiş veya iptal edilmemiş siparişleri çek (tırnaklar kaldırıldı)
        .not('status', 'in', '(delivered,cancelled)')
        .order('created_at', { ascending: false });

      if (ordersError) {
        console.error("Error fetching orders:", ordersError);
        throw new Error(`Siparişler çekilemedi: ${ordersError.message}`);
      }

      const fetchedOrders = ordersData || [];

      // 2. Gerekli profil ID'lerini topla
      const userIds = [...new Set(fetchedOrders.map(o => o.user_id).filter(id => id !== null))] as string[];

      // 3. Profilleri çek
      let profilesData: Pick<Profile, 'id' | 'username'>[] = [];
      if (userIds.length > 0) {
        const { data: profilesResult, error: profilesError } = await supabase
          .from('profiles')
          .select('id, username')
          .in('id', userIds);

        if (profilesError) {
          console.error("Error fetching profiles:", profilesError);
          // Profilleri çekemezsek bile devam edebiliriz, kullanıcı adları boş görünür.
        } else {
          profilesData = profilesResult || [];
        }
      }

      // 4. Profilleri bir haritaya dönüştür (erişimi kolaylaştırmak için)
      const profilesMapResult: Record<string, Pick<Profile, 'id' | 'username'>> = {};
      profilesData.forEach(p => {
        profilesMapResult[p.id] = p;
      });
      setProfilesMap(profilesMapResult);

      // 5. Siparişleri state'e kaydet
      setOrders(fetchedOrders);

    } catch (err: any) {
      console.error('Error fetching orders and profiles:', err);
      setError(`Veriler yüklenemedi: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Yeni sipariş geldiğinde çağrılacak fonksiyon (Basitleştirilmiş)
  const handleNewOrder = (payload: any) => {
    console.log('Yeni sipariş geldi! Liste yenileniyor...', payload);
    // Bildirim sesini çal
    playNotificationSound();
    // Tüm sipariş listesini yeniden çek
    // Not: Bu, anlık ekleme kadar hızlı olmayabilir ama daha güvenilirdir.
    fetchOrdersAndProfiles();
  };

  // Kullanıcı oturumunu ve rolünü kontrol et, sonra siparişleri çek ve aboneliği başlat
  useEffect(() => {
    // Ses dosyasını yükle
    notificationSoundRef.current = new Audio('/sounds/notification.mp3');
    notificationSoundRef.current.load(); // Ön yükleme

    const initializeDashboard = async () => {
      setLoading(true);
      setError('');
      try {
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();

        if (sessionError || !session?.user) {
          console.log('Dashboard: Oturum bulunamadı veya hata:', sessionError);
          router.push('/login');
          return;
        }
        setUser(session.user);

        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', session.user.id)
          .single<Pick<Profile, 'role'>>();

        if (profileError || !profile) {
            console.error('Dashboard: Profil alınamadı:', profileError);
            setError('Kullanıcı profili alınamadı veya bulunamadı.');
            setLoading(false);
            return;
        }

        if (profile.role !== 'owner' && profile.role !== 'admin') {
          setError('Bu sayfaya erişim yetkiniz yok.');
          setLoading(false);
          return;
        }

        await fetchOrdersAndProfiles(); // Verileri çek

        // Realtime aboneliğini başlat
        if (!channelRef.current) {
          channelRef.current = supabase
            .channel('public:orders')
            .on(
              'postgres_changes',
              { event: 'INSERT', schema: 'public', table: 'orders' },
              handleNewOrder
            )
            .subscribe((status, err) => {
              if (status === 'SUBSCRIBED') {
                console.log('Siparişler için Realtime aboneliği başarılı!');
              }
              if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
                console.error('Realtime abonelik hatası/kapandı:', status, err);
                setError('Sipariş güncellemeleri alınamıyor. Sayfayı yenileyin.');
              }
            });
        }

      } catch (err: any) {
        console.error('Error initializing dashboard:', err);
        setError('Panel yüklenirken bir hata oluştu.');
        setLoading(false);
      }
    };

    initializeDashboard();

    // Cleanup fonksiyonu
    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current)
          .then(() => console.log('Realtime aboneliği kaldırıldı.'))
          .catch(err => console.error('Realtime aboneliği kaldırılamadı:', err));
        channelRef.current = null;
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]); // profilesMap bağımlılığını kaldırdık, handleNewOrder içinde güncelleniyor

  // Sipariş durumu değiştiğinde listeyi güncellemek için callback
  const handleOrderStatusChange = (orderId: string, newStatus: OrderStatus) => {
    // Eğer durum 'delivered' veya 'cancelled' ise, siparişi listeden çıkar
    if (newStatus === 'delivered' || newStatus === 'cancelled') {
      setOrders(prevOrders => prevOrders.filter(order => order.id !== orderId));
    } else {
      // Diğer durumlarda sadece durumu güncelle
      setOrders(prevOrders =>
        prevOrders.map(order =>
          order.id === orderId ? { ...order, status: newStatus } : order
        )
      );
    }
  };

  return (
    <main className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">Çay Ocağı Paneli</h1>
          {user && (
             <button
               onClick={async () => {
                 await supabase.auth.signOut();
                 if (channelRef.current) {
                   await supabase.removeChannel(channelRef.current);
                   channelRef.current = null;
                 }
                 router.push('/login');
               }}
               className="text-sm text-red-600 hover:underline"
             >
               Çıkış Yap
             </button>
          )}
        </div>

        {loading && <p>Siparişler yükleniyor...</p>}
        {error && <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4" role="alert">{error}</div>}

        {!loading && !error && (
          <div>
            <h2 className="text-xl font-semibold mb-4">Aktif Siparişler</h2>
            {orders.length === 0 ? (
              <p className="text-gray-500">Gösterilecek aktif sipariş yok.</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {orders.map((order) => (
                  <OrderCard
                    key={order.id}
                    // OrderCard'a profil bilgisini map'ten alıp ekleyelim
                    // DashboardOrder tipine uygun hale getirelim
                    order={{
                        ...order,
                        profiles: order.user_id ? profilesMap[order.user_id] || null : null
                    } as DashboardOrder} // Tip dönüşümü
                    onStatusChange={handleOrderStatusChange}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
