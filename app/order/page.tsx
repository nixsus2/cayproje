'use client'; // Süslü parantezler kaldırıldı

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import type { AuthUser } from '@/lib/supabase';
import OrderForm from '../components/OrderForm'; // Göreceli yola düzeltildi

// TODO: Bu sayfayı sadece 'customer' rolündeki kullanıcıların erişebilmesi için koruma altına al.

export default function OrderPage() {
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchUserSession = async () => {
      try {
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();

        if (sessionError) {
          throw sessionError;
        }

        if (!session?.user) {
          // Kullanıcı giriş yapmamışsa login sayfasına yönlendir
          router.push('/login');
          return; // Yönlendirme sonrası işlemi durdur
        }

        setUser(session.user);
        // TODO: Kullanıcının rolünü 'profiles' tablosundan çekip 'customer' olup olmadığını kontrol et.
        // Eğer customer değilse, uygun bir sayfaya yönlendir (örn: /dashboard veya /admin).

      } catch (err: any) {
        console.error('Error fetching user session:', err);
        setError('Kullanıcı bilgileri alınırken bir hata oluştu.');
        // Hata durumunda da login'e yönlendirmek mantıklı olabilir
        // router.push('/login');
      } finally {
        setLoading(false);
      }
    };

    fetchUserSession();
  }, [router]); // router'ı dependency array'e ekle

  if (loading) {
    return (
      <main className="min-h-screen bg-gray-100 flex items-center justify-center">
        <p>Yükleniyor...</p>
      </main>
    );
  }

  if (error) {
    return (
      <main className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          {error} - <a href="/login" className="underline">Giriş yapmayı deneyin</a>
        </div>
      </main>
    );
  }

  // Kullanıcı bilgisi varsa formu göster
  return (
    <main className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-lg mx-auto">
        <div className="flex justify-between items-center mb-6">
           <h1 className="text-2xl font-bold">Yeni Sipariş</h1>
           {/* TODO: "Siparişlerim" ve "Çıkış Yap" linkleri eklenebilir */}
           <button
             onClick={async () => {
               await supabase.auth.signOut();
               router.push('/login');
             }}
             className="text-sm text-red-600 hover:underline"
           >
             Çıkış Yap
           </button>
        </div>

        {user ? (
          <OrderForm userId={user.id} />
        ) : (
          // Bu durum normalde useEffect içindeki yönlendirme ile yakalanmalı
          <p>Sipariş vermek için giriş yapmalısınız.</p>
        )}
      </div>
    </main>
  );
}
