'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image'; // Image importu eklendi
import { supabase } from '@/lib/supabase';
import type { Profile, UserRole } from '@/lib/supabase';

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
    // Arka plan rengini ve padding'i ayarlayalım
    <main className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-100 flex items-center justify-center p-4">
      <div className="bg-white p-8 rounded-xl shadow-lg w-full max-w-md">
        {/* Logo Eklendi */}
        <div className="flex justify-center mb-6">
          <Image
            src="/logo.png"
            alt="ÇayAbi Logo"
            width={80} // Daha büyük logo boyutu
            height={80}
            priority // Login ekranında önemli olduğu için öncelikli yükle
          />
        </div>
        {/* Başlık */}
        <h1 className="text-3xl font-bold text-center text-gray-800 mb-6">ÇayAbi Giriş</h1> {/* Slogan kaldırıldığı için mb artırıldı */}

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg mb-4 text-sm"> {/* Daha yumuşak köşe ve text boyutu */}
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-600"> {/* Daha açık renk label */}
              E-posta Adresi
            </label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              // Daha belirgin focus ve yumuşak köşeler
              className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
              required
              autoComplete="email"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-600">
              Şifre
            </label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
              required
              autoComplete="current-password"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            // Daha dolgun buton, yumuşak köşe, geçiş efekti
            className={`w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition duration-150 ease-in-out ${
              loading ? 'opacity-70 cursor-not-allowed' : '' // Daha belirgin pasif durum
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
