'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import type { Order, User } from '@/lib/supabase';

type OrderWithUser = Order & { user: User };

export default function AdminDashboard() {
  const router = useRouter();
  const [orders, setOrders] = useState<OrderWithUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notificationSound] = useState<HTMLAudioElement | null>(
    typeof window !== 'undefined' ? new Audio('/sounds/notification.mp3') : null
  );

  useEffect(() => {
    // Admin kontrolü
    const isAdmin = localStorage.getItem('adminAuth');
    if (!isAdmin) {
      router.push('/admin/login');
      return;
    }

    fetchOrders();
    
    // Gerçek zamanlı güncellemeler için subscription
    const subscription = supabase
      .channel('orders')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'orders' }, () => {
        // Yeni sipariş geldiğinde ses çal
        notificationSound?.play();
        fetchOrders();
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'orders' }, () => {
        fetchOrders();
      })
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [notificationSound]);

  const fetchOrders = async () => {
    try {
      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          user:users(*)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Siparişleri duruma göre sırala
      const sortedOrders = (data as OrderWithUser[]).sort((a, b) => {
        const statusOrder = {
          'pending': 0,
          'preparing': 1,
          'completed': 2,
          'cancelled': 3
        };
        return statusOrder[a.status] - statusOrder[b.status];
      });

      setOrders(sortedOrders);
    } catch (err) {
      console.error('Error fetching orders:', err);
      setError('Siparişler yüklenirken bir hata oluştu.');
    } finally {
      setLoading(false);
    }
  };

  const updateOrderStatus = async (orderId: string, status: Order['status']) => {
    try {
      const { error } = await supabase
        .from('orders')
        .update({ status, updated_at: new Date().toISOString() })
        .eq('id', orderId);

      if (error) throw error;
    } catch (err) {
      console.error('Error updating order:', err);
      setError('Sipariş durumu güncellenirken bir hata oluştu.');
    }
  };

  const getStatusColor = (status: Order['status']) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'preparing':
        return 'bg-blue-100 text-blue-800';
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('adminAuth');
    router.push('/admin/login');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-xl">Yükleniyor...</div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-gray-100">
      <div className="bg-white shadow">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold">Çay Ocağı Yönetim Paneli</h1>
          <button
            onClick={handleLogout}
            className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
          >
            Çıkış Yap
          </button>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        <div className="grid gap-4">
          {orders.map((order) => (
            <div key={order.id} className="bg-white rounded-lg shadow-md p-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h2 className="text-xl font-semibold">{order.user.shop_name}</h2>
                  <p className="text-gray-600">{order.drink_type === 'tea' ? 'Çay' : 'Kahve'} × {order.quantity}</p>
                  <p className="text-gray-600">Şeker: {order.sugar_count}</p>
                  {order.notes && <p className="text-gray-600">Not: {order.notes}</p>}
                  <p className="text-sm text-gray-500">
                    {new Date(order.created_at).toLocaleString('tr-TR')}
                  </p>
                </div>
                <span className={`px-3 py-1 rounded-full text-sm ${getStatusColor(order.status)}`}>
                  {order.status === 'pending' && 'Bekliyor'}
                  {order.status === 'preparing' && 'Hazırlanıyor'}
                  {order.status === 'completed' && 'Tamamlandı'}
                  {order.status === 'cancelled' && 'İptal Edildi'}
                </span>
              </div>

              <div className="flex gap-2">
                {order.status === 'pending' && (
                  <button
                    onClick={() => updateOrderStatus(order.id, 'preparing')}
                    className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
                  >
                    Hazırlamaya Başla
                  </button>
                )}
                {order.status === 'preparing' && (
                  <button
                    onClick={() => updateOrderStatus(order.id, 'completed')}
                    className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
                  >
                    Tamamlandı
                  </button>
                )}
                {(order.status === 'pending' || order.status === 'preparing') && (
                  <button
                    onClick={() => updateOrderStatus(order.id, 'cancelled')}
                    className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
                  >
                    İptal Et
                  </button>
                )}
              </div>
            </div>
          ))}

          {orders.length === 0 && (
            <div className="bg-white rounded-lg shadow-md p-6 text-center text-gray-600">
              Henüz sipariş bulunmuyor.
            </div>
          )}
        </div>
      </div>
    </main>
  );
} 