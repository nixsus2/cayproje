'use client'; // Direktif sadece bir kez olmalı

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export default function HomePage() {
  const router = useRouter();

  useEffect(() => {
    const checkAuthAndRedirect = async () => {
      const { data: { session } } = await supabase.auth.getSession();

      if (session?.user) {
        // Kullanıcı giriş yapmışsa sipariş sayfasına yönlendir
        // TODO: Rol kontrolü eklenip admin/owner ise /dashboard'a yönlendirilebilir.
        router.replace('/order');
      } else {
        // Kullanıcı giriş yapmamışsa login sayfasına yönlendir
        router.replace('/login');
      }
    };

    checkAuthAndRedirect();
  }, [router]);

  // Yönlendirme sırasında boş bir sayfa veya yükleniyor mesajı gösterilebilir
  return (
    <div className="flex justify-center items-center min-h-[calc(100vh-100px)]">
       <p>Yönlendiriliyor...</p>
    </div>
  );
}
