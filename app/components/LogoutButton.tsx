'use client';

import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase'; // İstemci tarafı Supabase istemcisini import et

export default function LogoutButton() {
  const router = useRouter();

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error('Çıkış yaparken hata:', error);
      // Kullanıcıya bir hata mesajı gösterilebilir
    } else {
      // Çıkış başarılı olduktan sonra sayfayı yenilemek,
      // layout'un sunucu tarafında yeniden render edilmesini ve
      // oturum durumuna göre doğru linklerin gösterilmesini sağlar.
      router.refresh();
      // İsteğe bağlı olarak kullanıcıyı giriş sayfasına yönlendirebilirsiniz:
      // router.push('/login');
    }
  };

  return (
    <button
      onClick={handleLogout}
      className="text-red-600 hover:text-red-800 font-medium" // Buton stilini belirle
    >
      Çıkış Yap
    </button>
  );
}
