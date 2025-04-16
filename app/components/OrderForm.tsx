{'use client';} // Server Action kullanmak için

import React, { useState, useEffect, useTransition } from 'react'; // useTransition eklendi
import { supabase } from '@/lib/supabase'; // getSession için gerekli
// Tipleri import et
import type { Product, DrinkSize, SugarLevel, Order, OrderItem as DbOrderItem } from '@/lib/supabase';
// Server Action'ı import et
import { createOrderAction } from '@/actions/orderActions';

// Props tipi
interface OrderFormProps {
  // Callback tipi güncellendi, sadece yeni siparişin ID'sini alabiliriz
  onOrderPlaced?: (result: { success: boolean; newOrderId?: string; error?: string }) => void;
  userId: string; // userId hala prop olarak geliyor, action içinde doğrulanacak
}

// Sepetteki veya formdaki bir ürün kalemini temsil eden tip
interface CartItem {
  id: string; // Geçici bir ID
  productId: string;
  productName: string;
  quantity: number;
  size?: DrinkSize;
  sugarLevel?: SugarLevel;
  notes?: string;
}

// Server Action'a gönderilecek input tipiyle eşleşmeli
interface CartItemInput {
    productId: string;
    quantity: number;
    size?: DrinkSize;
    sugarLevel?: SugarLevel;
    notes?: string;
}

export default function OrderForm({ onOrderPlaced, userId }: OrderFormProps) {
  const [products, setProducts] = useState<Product[]>([]);
  const [orderItems, setOrderItems] = useState<CartItem[]>([]);
  const [currentProductId, setCurrentProductId] = useState<string>('');
  const [currentSize, setCurrentSize] = useState<DrinkSize>('small');
  const [currentSugarLevel, setCurrentSugarLevel] = useState<SugarLevel>('medium');
  const [currentQuantity, setCurrentQuantity] = useState<number>(1);
  const [currentNotes, setCurrentNotes] = useState('');
  // const [loading, setLoading] = useState(false); // useTransition kullanacağız
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition(); // Pending state için

  // Ürünleri çekme
  useEffect(() => {
    const fetchProducts = async () => {
      // setLoading(true); // isPending kullanılacak
      setError(null);
      const { data, error: fetchError } = await supabase
        .from('products')
        .select('*')
        .eq('is_available', true);

      if (fetchError) {
        console.error('Error fetching products:', fetchError);
        setError('Ürünler yüklenirken bir hata oluştu.');
        setProducts([]);
      } else {
        const fetchedProducts = data || [];
        setProducts(fetchedProducts);
        if (fetchedProducts.length > 0 && !currentProductId) {
          setCurrentProductId(fetchedProducts[0].id);
        }
      }
      // setLoading(false);
    };
    fetchProducts();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sepete ekleme
  const handleAddItem = () => {
    setError(null);
    if (!currentProductId) {
      setError('Lütfen sepete eklenecek bir ürün seçin.');
      return;
    }
    const product = products.find((p: Product) => p.id === currentProductId);
    if (!product) {
        setError('Seçilen ürün bilgisi bulunamadı.');
        return;
    }
    const newItem: CartItem = {
      id: Date.now().toString(),
      productId: currentProductId,
      productName: product.name,
      quantity: currentQuantity,
      size: currentSize,
      sugarLevel: currentSugarLevel,
      notes: currentNotes || undefined,
    };
    setOrderItems([...orderItems, newItem]);
    setCurrentNotes('');
  };

  // Sepetten çıkarma
  const handleRemoveItem = (itemId: string) => {
    setOrderItems(orderItems.filter(item => item.id !== itemId));
  };

  // Siparişi Server Action ile gönderme
  const handleSubmitOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (orderItems.length === 0) {
      setError('Lütfen sepete en az bir ürün ekleyin.');
      return;
    }

    setError(null);
    setSuccessMessage(null);

    startTransition(async () => {
        // Access token'ı al
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        if (sessionError || !session?.access_token) {
            setError('Oturum bilgisi alınamadı. Lütfen tekrar giriş yapın.');
            return;
        }
        const accessToken = session.access_token;

        // Server Action'a gönderilecek veriyi hazırla
        const itemsToSubmit: CartItemInput[] = orderItems.map(item => ({
            productId: item.productId,
            quantity: item.quantity,
            size: item.size,
            sugarLevel: item.sugarLevel,
            notes: item.notes,
        }));

        // Server Action'ı çağır
        const result = await createOrderAction(itemsToSubmit, accessToken);

        if (!result.success) {
            setError(result.error || 'Sipariş gönderilirken bilinmeyen bir hata oluştu.');
        } else {
            // Başarılı
            setSuccessMessage(`Siparişiniz başarıyla alındı! (ID: ${result.newOrderId?.substring(0,6)})`);
            setOrderItems([]); // Sepeti temizle
            // Formu sıfırla
            setCurrentProductId(products[0]?.id || '');
            setCurrentSize('small');
            setCurrentSugarLevel('medium');
            setCurrentQuantity(1);
            setCurrentNotes('');

            // Callback'i çağır (opsiyonel)
            if (onOrderPlaced) {
                onOrderPlaced(result); // Action sonucunu doğrudan gönderelim
            }
        }
    });
  };

  // Seçili ürünü bul
  const selectedProduct = products.find(p => p.id === currentProductId);

  // ----- JSX -----
  return (
    <div className="space-y-6 bg-white p-6 rounded-lg shadow">
      <h2 className="text-xl font-semibold mb-4">Yeni Sipariş Ver</h2>

      {error && <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4" role="alert">{error}</div>}
      {successMessage && <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4" role="alert">{successMessage}</div>}

      <div className="border p-4 rounded space-y-3">
        <h3 className="text-lg font-medium">Ürün Ekle</h3>
        <div>
          <label htmlFor="currentProduct" className="block text-sm font-medium text-gray-700">Ürün</label>
          <select
            id="currentProduct"
            value={currentProductId}
            onChange={(e) => setCurrentProductId(e.target.value)}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            disabled={isPending || products.length === 0}
          >
            <option value="" disabled>Seçiniz...</option>
            {products.map((product) => (
              <option key={product.id} value={product.id}>
                {product.name}
              </option>
            ))}
            {products.length === 0 && !isPending && <option disabled>Mevcut ürün bulunamadı.</option>}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Bardak Boyu</label>
          <div className="mt-1 flex space-x-4">
            {(['small', 'large'] as DrinkSize[]).map((sizeValue) => (
              <label key={sizeValue} className="inline-flex items-center">
                <input
                  type="radio"
                  name="currentSize"
                  value={sizeValue}
                  checked={currentSize === sizeValue}
                  onChange={() => setCurrentSize(sizeValue)}
                  className="form-radio h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                  disabled={isPending}
                />
                <span className="ml-2 text-sm text-gray-700">{sizeValue === 'small' ? 'Küçük' : 'Büyük'}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Şeker Seviyesi - Sadece Türk Kahvesi için göster */}
        {selectedProduct?.name === 'Türk Kahvesi' && (
          <div>
            <label className="block text-sm font-medium text-gray-700">Şeker</label>
            <div className="mt-1 grid grid-cols-2 gap-2">
              {(['none', 'low', 'medium', 'high'] as SugarLevel[]).map((level) => (
                <label key={level} className="inline-flex items-center">
                <input
                  type="radio"
                  name="currentSugarLevel"
                  value={level}
                  checked={currentSugarLevel === level}
                  onChange={() => setCurrentSugarLevel(level)}
                  className="form-radio h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                  disabled={isPending}
                />
                <span className="ml-2 text-sm text-gray-700">
                  {level === 'none' ? 'Şekersiz' : level === 'low' ? 'Az Şekerli' : level === 'medium' ? 'Orta' : 'Şekerli'}
                  </span>
                </label>
              ))}
            </div>
          </div>
        )}

        {/* --- Yeni Adet Seçici Başlangıcı --- */}
        <div>
          <label className="block text-sm font-medium text-gray-700">Adet</label>
          <div className="mt-1 flex items-center space-x-3">
            <button
              type="button"
              onClick={() => setCurrentQuantity(q => Math.max(1, q - 1))} // Azaltma, min 1
              disabled={isPending || currentQuantity <= 1} // 1 iken pasif
              className="px-3 py-1 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
              aria-label="Adedi azalt"
            >
              -
            </button>
            <span className="text-lg font-medium text-gray-900 w-8 text-center" aria-live="polite">
              {currentQuantity}
            </span>
            <button
              type="button"
              onClick={() => setCurrentQuantity(q => q + 1)} // Artırma
              disabled={isPending}
              className="px-3 py-1 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
              aria-label="Adedi artır"
            >
              +
            </button>
          </div>
        </div>
        {/* --- Yeni Adet Seçici Bitişi --- */}

        <div>
          <label htmlFor="currentNotes" className="block text-sm font-medium text-gray-700">Not (Opsiyonel)</label>
          <textarea
            id="currentNotes"
            value={currentNotes}
            onChange={(e) => setCurrentNotes(e.target.value)}
            rows={2}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            placeholder="Eklemek istediğiniz not..."
            disabled={isPending}
          />
        </div>

        <button
          type="button"
          onClick={handleAddItem}
          disabled={!currentProductId || isPending || products.length === 0}
          className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50"
        >
          Sepete Ekle
        </button>
      </div>

      {orderItems.length > 0 && (
        <div className="border p-4 rounded space-y-2">
          <h3 className="text-lg font-medium">Sepetiniz ({orderItems.reduce((sum, item) => sum + item.quantity, 0)} ürün)</h3>
          <ul className="divide-y divide-gray-200 max-h-60 overflow-y-auto">
            {orderItems.map((item) => (
              <li key={item.id} className="py-2 flex justify-between items-center">
                <div>
                  <span className="font-medium">{item.productName}</span> (x{item.quantity})
                  <p className="text-sm text-gray-500">
                    {item.size ? `${item.size === 'small' ? 'Küçük' : 'Büyük'} boy` : ''}
                    {item.sugarLevel ? `, ${item.sugarLevel === 'none' ? 'Şekersiz' : item.sugarLevel === 'low' ? 'Az' : item.sugarLevel === 'medium' ? 'Orta' : 'Şekerli'}` : ''}
                  </p>
                  {item.notes && <p className="text-sm text-gray-400 italic">Not: {item.notes}</p>}
                </div>
                <button
                  type="button"
                  onClick={() => handleRemoveItem(item.id)}
                  className="text-red-600 hover:text-red-800 text-sm ml-4 px-2 py-1 rounded hover:bg-red-50"
                  disabled={isPending}
                  aria-label={`${item.productName} ürününü sepetten kaldır`}
                >
                  Kaldır
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      <form onSubmit={handleSubmitOrder}>
        <button
          type="submit"
          disabled={isPending || orderItems.length === 0}
          className={`w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 ${
            (isPending || orderItems.length === 0) ? 'opacity-50 cursor-not-allowed' : ''
          }`}
        >
          {isPending ? 'Sipariş Gönderiliyor...' : `Siparişi Tamamla (${orderItems.length} çeşit)`}
        </button>
      </form>
    </div>
  );
}
