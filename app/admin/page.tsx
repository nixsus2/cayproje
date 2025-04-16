'use client'; // Süslü parantezler kaldırıldı

import { useState, useEffect } from 'react'; // useEffect eklendi
import { supabase } from '@/lib/supabase'; // Normal Supabase istemcisi
import type { UserRole } from '@/lib/supabase'; // Tipleri import et

// TODO: Bu sayfayı sadece 'admin' rolündeki kullanıcıların erişebilmesi için koruma altına al.
// Bu genellikle bir HOC (Higher-Order Component) veya middleware ile yapılır.

export default function AdminPanel() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [role, setRole] = useState<UserRole>('customer'); // Varsayılan rol
  const [shopName, setShopName] = useState('');
  // Kullanıcı ekleme state'leri
  const [registerLoading, setRegisterLoading] = useState(false);
  const [registerMessage, setRegisterMessage] = useState('');
  const [registerError, setRegisterError] = useState('');

  // Sistem durumu state'leri
  const [isOrderingActive, setIsOrderingActive] = useState<boolean | null>(null);
  const [systemStatusLoading, setSystemStatusLoading] = useState(true);
  const [toggleLoading, setToggleLoading] = useState(false);
  const [systemMessage, setSystemMessage] = useState('');
  const [systemError, setSystemError] = useState('');

  // Yeni Kullanıcı Ekleme Fonksiyonu
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegisterLoading(true);
    setRegisterMessage('');
    setRegisterError('');

    if (role === 'owner' && !shopName) {
        setRegisterError('Sahip rolü için Dükkan Adı gereklidir.');
        setRegisterLoading(false);
        return;
    }

    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // TODO: Yetkilendirme başlığını ekle (örn: Authorization: `Bearer ${accessToken}`)
          // accessToken, giriş yapmış admin kullanıcısının Supabase session'ından alınmalı.
        },
        body: JSON.stringify({
          email,
          password,
          username,
          role,
          shop_name: role === 'owner' ? shopName : undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setRegisterError(data.error || `Bir hata oluştu: ${response.statusText}`);
        throw new Error(data.error || `HTTP error! status: ${response.status}`);
      }

      setRegisterMessage(`Kullanıcı "${username}" başarıyla oluşturuldu!`);
      // Formu temizle
      setEmail('');
      setPassword('');
      setUsername('');
      setRole('customer');
      setShopName('');

    } catch (err) {
      console.error('Registration failed:', err);
      if (!registerError) {
          setRegisterError('Kullanıcı oluşturma sırasında bir hata oluştu.');
      }
    } finally {
      setRegisterLoading(false);
    }
  };

  // Sistem Durumunu Çekme Fonksiyonu
  const fetchSystemStatus = async () => {
    setSystemStatusLoading(true);
    setSystemError('');
    try {
      const response = await fetch('/api/admin/toggle-system'); // GET isteği
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      setIsOrderingActive(data.is_ordering_active);
    } catch (err: any) {
      console.error('Error fetching system status:', err);
      setSystemError(`Sistem durumu alınamadı: ${err.message}`);
      setIsOrderingActive(null); // Hata durumunda null yap
    } finally {
      setSystemStatusLoading(false);
    }
  };

  // Sistemi Aç/Kapat Fonksiyonu
  const handleToggleSystem = async () => {
    setToggleLoading(true);
    setSystemMessage('');
    setSystemError('');
    try {
      const response = await fetch('/api/admin/toggle-system', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // TODO: Yetkilendirme başlığı ekle
        },
        // Body göndermeye gerek yok, API mevcut durumu tersine çevirecek
      });
      const data = await response.json();
      if (!response.ok) {
        setSystemError(data.error || `Bir hata oluştu: ${response.statusText}`);
        throw new Error(data.error || `HTTP error! status: ${response.status}`);
      }
      setIsOrderingActive(data.is_ordering_active); // Yeni durumu state'e yansıt
      setSystemMessage(data.message); // Başarı mesajını göster
    } catch (err: any) {
      console.error('Error toggling system status:', err);
      if (!systemError) {
        setSystemError('Sistem durumu değiştirilirken bir hata oluştu.');
      }
    } finally {
      setToggleLoading(false);
    }
  };

  // Sayfa yüklendiğinde sistem durumunu çek
  useEffect(() => {
    // TODO: Kullanıcı rolünün admin olup olmadığını kontrol et
    fetchSystemStatus();
  }, []);

  return (
    <main className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-2xl mx-auto bg-white p-6 rounded-lg shadow-md">
        <h1 className="text-2xl font-bold mb-6">Admin Paneli</h1>

        {/* Yeni Kullanıcı Ekleme Formu */}
        {/* Yeni Kullanıcı Ekleme Formu */}
        <section className="mb-8 border-b pb-8">
          <h2 className="text-xl font-semibold mb-4">Yeni Kullanıcı Ekle</h2>
          {registerMessage && <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">{registerMessage}</div>}
          {registerError && <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">{registerError}</div>}

          <form onSubmit={handleRegister} className="space-y-4">
             {/* Form alanları aynı kalıyor... */}
             <div>
              <label htmlFor="username" className="block text-sm font-medium text-gray-700">Kullanıcı Adı</label>
              <input
                type="text"
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                required
              />
            </div>
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">E-posta Adresi</label>
              <input
                type="email"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                required
              />
            </div>
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">Şifre</label>
              <input
                type="password"
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                required
                minLength={6} // Supabase varsayılan olarak min 6 karakter ister
              />
            </div>
            <div>
              <label htmlFor="role" className="block text-sm font-medium text-gray-700">Rol</label>
              <select
                id="role"
                value={role}
                onChange={(e) => setRole(e.target.value as UserRole)}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                required
              >
                <option value="customer">Müşteri</option>
                <option value="owner">Çay Ocağı Sahibi</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            {/* Sahip rolü seçilirse Dükkan Adı alanını göster */}
            {role === 'owner' && (
              <div>
                <label htmlFor="shopName" className="block text-sm font-medium text-gray-700">Dükkan Adı</label>
                <input
                  type="text"
                  id="shopName"
                  value={shopName}
                  onChange={(e) => setShopName(e.target.value)}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  required={role === 'owner'} // Sahip için zorunlu
                />
              </div>
            )}
            <button
              type="submit"
              disabled={registerLoading}
              className={`w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 ${
                registerLoading ? 'opacity-50 cursor-not-allowed' : ''
              }`}
            >
              {registerLoading ? 'Ekleniyor...' : 'Kullanıcı Ekle'}
            </button>
          </form>
        </section>

        {/* Sistem Aç/Kapat Bölümü */}
        <section>
          <h2 className="text-xl font-semibold mb-4">Sistem Ayarları</h2>
          {systemMessage && <div className="bg-blue-100 border border-blue-400 text-blue-700 px-4 py-3 rounded mb-4">{systemMessage}</div>}
          {systemError && <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">{systemError}</div>}

          {systemStatusLoading ? (
            <p>Sistem durumu yükleniyor...</p>
          ) : isOrderingActive === null ? (
             <p className="text-red-600">Sistem durumu alınamadı.</p>
          ) : (
            <div className="flex items-center space-x-4">
              <p>
                Sipariş Sistemi Durumu:
                <span className={`ml-2 font-semibold ${isOrderingActive ? 'text-green-600' : 'text-red-600'}`}>
                  {isOrderingActive ? 'Aktif' : 'Pasif'}
                </span>
              </p>
              <button
                onClick={handleToggleSystem}
                disabled={toggleLoading}
                className={`px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white ${
                  toggleLoading ? 'bg-gray-400 cursor-not-allowed' :
                  isOrderingActive ? 'bg-red-600 hover:bg-red-700 focus:ring-red-500' : 'bg-green-600 hover:bg-green-700 focus:ring-green-500'
                } focus:outline-none focus:ring-2 focus:ring-offset-2`}
              >
                {toggleLoading ? 'Değiştiriliyor...' : (isOrderingActive ? 'Sistemi Kapat' : 'Sistemi Aç')}
              </button>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
