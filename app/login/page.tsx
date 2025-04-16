'use client'; // Süslü parantezler kaldırıldı

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link'; // Link importu eklendi
import { supabase } from '@/lib/supabase'; // Güncellenmiş Supabase importu
import type { Profile, UserRole } from '@/lib/supabase'; // Tipleri import et

export default function Login() {
  const router = useRouter();
  const [email, setEmail] = useState(''); // Kullanıcı adı yerine email
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Kullanıcı rolüne göre yönlendirme fonksiyonu
  const redirectToDashboard = (role: UserRole) => {
    switch (role) {
      case 'admin':
        router.push('/admin');
        break;
      case 'owner':
        router.push('/dashboard'); // Sahip paneli
        break;
      case 'customer':
        router.push('/order'); // Müşteri sipariş ekranı
        break;
      default:
        router.push('/'); // Varsayılan ana sayfa
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // Supabase Auth ile giriş yapmayı dene
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: email,
        password: password,
      });

      if (authError) {
        console.error('Supabase Auth Error:', authError);
        if (authError.message.includes('Invalid login credentials')) {
          setError('Geçersiz e-posta veya şifre.');
        } else {
          setError('Giriş sırasında bir hata oluştu.');
        }
        throw authError;
      }

      if (!authData || !authData.user) {
        setError('Kullanıcı bilgileri alınamadı.');
        throw new Error('User data not found after login.');
      }

      // Giriş başarılı, şimdi kullanıcının profilini (ve rolünü) çekelim
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', authData.user.id)
        .single<Profile>(); // Tipi belirtiyoruz

      if (profileError || !profileData) {
        console.error('Profile fetch error:', profileError);
        // Profil bulunamazsa veya hata olursa kullanıcıyı bilgilendir ve çıkış yaptır
        setError('Kullanıcı profili bulunamadı. Lütfen yönetici ile iletişime geçin.');
        await supabase.auth.signOut(); // Güvenlik için çıkış yap
        throw profileError || new Error('Profile not found');
      }

      // Profile bulundu, role göre yönlendir
      redirectToDashboard(profileData.role);

    } catch (err) {
      // Hataları zaten yukarıda ele aldık, burada sadece loglama yapabiliriz
      console.error('Login process error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-gray-100 flex items-center justify-center">
      <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md">
        <h1 className="text-2xl font-bold text-center mb-6">Çayabi - Giriş Yap</h1>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700">
              E-posta Adresi
            </label>
            <input
              type="email" // Tip email olarak değiştirildi
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              required
              autoComplete="email"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700">
              Şifre
            </label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              required
              autoComplete="current-password"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className={`w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${
              loading ? 'opacity-50 cursor-not-allowed' : ''
            }`}
          >
            {loading ? 'Giriş yapılıyor...' : 'Giriş Yap'}
          </button>
        </form>

        <p className="mt-4 text-center text-sm text-gray-600">
          Hesabınız yok mu?{' '}
          <Link href="/register" className="font-medium text-blue-600 hover:text-blue-500">
            Hesap Oluşturun
          </Link>
        </p>
      </div>
    </main>
  );
}
