'use client'; // Direktif sadece bir kez olmalı

import React, { useState, useTransition } from 'react'; // useTransition eklendi
import { supabase } from '@/lib/supabase'; // İstemci tarafı supabase istemcisini import et (getSession için)
// OrderItem'ı da import edelim
import type { Order, OrderItem, OrderStatus, Profile, Product, SugarLevel, DrinkSize } from '@/lib/supabase';
// Server Action'ları import et
import { approveOrderAction, deliverOrderAction } from '@/actions/orderActions';

// OrderCard'a geçilecek props tipi (items array'i içerecek şekilde güncellendi)
// Product bilgisi artık items içinde olacak.
// Profile bilgisi hala yararlı olabilir.
type OrderWithDetails = Order & {
  profiles: Pick<Profile, 'id' | 'username'> | null; // Kullanıcı bilgisi
  // Her item için ürün bilgisini içeren bir dizi bekliyoruz
  items: (OrderItem & { products: Pick<Product, 'id' | 'name'> | null })[];
};

interface OrderCardProps {
  order: OrderWithDetails;
  onStatusChange?: (orderId: string, newStatus: OrderStatus) => void;
  // TODO: Admin yetkisi kontrolü için belki user rolü de prop olarak alınabilir
}

export default function OrderCard({ order, onStatusChange }: OrderCardProps) {
  // const [loading, setLoading] = useState(false); // useTransition kullanacağız
  const [error, setError] = useState('');
  const [isPending, startTransition] = useTransition(); // Pending state için

  const handleApprove = () => {
    setError(''); // Hata mesajını temizle
    startTransition(async () => {
      // Önce access token'ı al
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !session?.access_token) {
          setError('Oturum bilgisi alınamadı.');
          return;
      }
      const accessToken = session.access_token;

      // Action'ı token ile çağır
      const result = await approveOrderAction(order.id, accessToken);
      if (!result.success) {
        setError(result.error || 'Bilinmeyen bir hata oluştu.');
      } else if (onStatusChange && result.updatedStatus) {
        // Action başarılıysa ve callback varsa, durumu güncelle
        onStatusChange(order.id, result.updatedStatus);
      }
      // revalidatePath action içinde yapıldığı için burada tekrar state güncellemeye gerek yok gibi,
      // ancak anlık geri bildirim için onStatusChange hala kullanılabilir.
    });
  };

  const handleDeliver = () => {
    setError(''); // Hata mesajını temizle
    startTransition(async () => {
      // Önce access token'ı al
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
       if (sessionError || !session?.access_token) {
           setError('Oturum bilgisi alınamadı.');
           return;
       }
       const accessToken = session.access_token;

      // Action'ı token ile çağır
      const result = await deliverOrderAction(order.id, accessToken);
      if (!result.success) {
        setError(result.error || 'Bilinmeyen bir hata oluştu.');
      } else if (onStatusChange && result.updatedStatus) {
        onStatusChange(order.id, result.updatedStatus);
      }
    });
  };

  // Zamanı daha okunabilir formatta göster
  const formatTime = (timestamp: string | null | undefined): string => {
    if (!timestamp) return 'Bilinmiyor';
    try {
      return new Date(timestamp).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
    } catch {
      return 'Geçersiz Zaman';
    }
  };

  // Şeker seviyesini metne çevir
  const getSugarText = (level: OrderItem['sugar_level']): string => {
    if (!level) return '';
    // SugarLevel tipini burada kullanalım
    const map: Record<SugarLevel, string> = {
      none: 'Şekersiz',
      low: 'Az Şekerli',
      medium: 'Orta',
      high: 'Şekerli',
    };
    return map[level] || level;
  };

  // Bardak boyutunu metne çevir (Parametre tipini OrderItem['size'] olarak düzelt)
  const getSizeText = (size: OrderItem['size']): string => {
    if (!size) return '';
     // Veritabanı sütunu 'size' (text) olduğu için tipi string kontrolü yapalım
    if (size === 'small') return 'Küçük';
    if (size === 'large') return 'Büyük';
    return size || ''; // Diğer durumlar veya null için boş veya değeri döndür
  };

  // Kullanıcı adını al
  const username = order.profiles?.username || 'Bilinmeyen Kullanıcı';

  // Durum metinleri ve renkleri (yeni enum değerlerine göre)
  const statusTextMap: Record<OrderStatus, string> = {
      pending: 'Bekliyor',
      preparing: 'Hazırlanıyor', // 'approved' yerine
      ready: 'Hazır',
      delivered: 'Teslim Edildi', // 'completed' yerine
      cancelled: 'İptal Edildi'
  };
  const statusText = statusTextMap[order.status] || order.status;

  const statusColorMap: Record<OrderStatus, string> = {
      pending: 'bg-yellow-100 text-yellow-800',
      preparing: 'bg-blue-100 text-blue-800', // 'approved' yerine
      ready: 'bg-purple-100 text-purple-800', // Yeni durum için renk
      delivered: 'bg-green-100 text-green-800', // 'completed' yerine
      cancelled: 'bg-red-100 text-red-800'
  };
  const statusColor = statusColorMap[order.status] || 'bg-gray-100 text-gray-800';

  // Toplam ürün sayısı (items üzerinden hesaplanır)
  const totalQuantity = order.items?.reduce((sum, item) => sum + item.quantity, 0) || 0;

  return (
    <div className="bg-white p-4 rounded-lg shadow border border-gray-200 mb-4">
      {/* Başlık Kısmı */}
      <div className="flex justify-between items-start mb-3">
        <div>
          <p className="font-semibold text-lg">
            Sipariş #{order.id.substring(0, 6)} {/* ID'nin bir kısmını göster */}
          </p>
          <p className="text-sm text-gray-600">Kimden: {username}</p>
          <p className="text-sm text-gray-500">Saat: {formatTime(order.created_at)}</p>
          <p className="text-sm text-gray-500">Toplam Ürün: {totalQuantity}</p>
        </div>
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColor}`}>
          {statusText}
        </span>
      </div>

      {/* Sipariş Kalemleri Listesi */}
      {/* order.items var mı diye kontrol edelim */}
      {order.items && order.items.length > 0 ? (
        <div className="border-t border-gray-200 pt-3 mb-3">
          <h4 className="text-sm font-medium text-gray-800 mb-2">İçerik:</h4>
          <ul className="space-y-2 max-h-40 overflow-y-auto"> {/* Scroll eklendi */}
            {order.items.map((item) => ( // item'a OrderItem tipi verilebilir ama props'tan geliyor zaten
              <li key={item.id} className="text-sm text-gray-700 border-b border-gray-100 pb-1 last:border-b-0">
                <span className="font-medium">{item.quantity}x {item.products?.name || 'Bilinmeyen Ürün'}</span>
                <div className="text-xs text-gray-500 pl-2">
                  {/* item.size ile çağır */}
                  {getSizeText(item.size)}
                  {item.sugar_level ? `, ${getSugarText(item.sugar_level)}` : ''}
                  {item.notes && <span className="block italic">Not: {item.notes}</span>}
                </div>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <p className="text-sm text-gray-500 mb-3">Sipariş içeriği bulunamadı.</p>
      )}


      {error && <p className="text-red-500 text-sm mb-2">{error}</p>}

      {/* Aksiyon Butonları (Duruma göre değişebilir) */}
      {/* TODO: Kullanıcı rolüne göre butonları gösterme/gizleme mantığı eklenebilir */}
      {/* Duruma göre butonları göster */}
      <div className="mt-4 space-y-2">
        {order.status === 'pending' && (
          <button
          onClick={handleApprove}
          disabled={isPending} // isPending durumuna göre disable
          className={`w-full px-4 py-2 rounded-md text-sm font-medium text-white ${
            isPending ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'
          } focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500`}
        >
          {isPending ? 'İşleniyor...' : 'Hazırlamaya Başla'}
          </button>
        )}
        {/* Hazırlanıyor veya Hazır durumunda Teslim Edildi butonu */}
        {(order.status === 'preparing' || order.status === 'ready') && (
          <button
            onClick={handleDeliver}
            disabled={isPending} // isPending durumuna göre disable
            className={`w-full px-4 py-2 rounded-md text-sm font-medium text-white ${
              isPending ? 'bg-gray-400 cursor-not-allowed' : 'bg-green-600 hover:bg-green-700'
            } focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500`}
          >
            {isPending ? 'İşleniyor...' : 'Teslim Edildi'}
          </button>
        )}
        {/* İptal butonu da eklenebilir */}
        {/* {order.status !== 'delivered' && order.status !== 'cancelled' && (
           <button onClick={handleCancel} disabled={loading} className="...">İptal Et</button>
        )} */}
      </div>
    </div>
  );
}
