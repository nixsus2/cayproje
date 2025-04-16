import { type NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server'; // Yardımcı fonksiyonu kullanıyoruz
// Diğer importlar kaldırıldı (şimdilik)
// import type { Order, OrderItem, Product } from '@/lib/supabase';

// type OrderWithItems = Order & {
//   items: (OrderItem & { products: Pick<Product, 'id' | 'name'> | null })[];
// };

export async function GET(request: NextRequest) {
  // Yardımcı fonksiyonu kullanarak Supabase istemcisini oluştur
  const supabase = createSupabaseServerClient();

  try {
    // Sadece kullanıcı oturumunu doğrulamayı dene
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      console.error("Auth Error in /api/orders/me:", userError);
      const errorDetail = userError ? `: ${userError.message}` : '';
      // Hata durumunda kullanıcı nesnesi yerine hata mesajını döndür
      return NextResponse.json({ error: `Yetkisiz erişim: Geçerli bir oturum bulunamadı${errorDetail}`, user: null }, { status: 401 });
    }

    // Başarılı olursa kullanıcı nesnesini döndür
    console.log("User found in /api/orders/me:", user.id);
    return NextResponse.json({ user: user }, { status: 200 });

    // Sipariş çekme kodu geçici olarak kaldırıldı
    /*
    const { data: ordersData, error: ordersError } = await supabase
      .from('orders')
      .select(`*, items:order_items (*, products ( id, name ))`)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (ordersError) {
      console.error('Error fetching user orders with items:', ordersError);
      return NextResponse.json({ error: `Siparişler alınamadı: ${ordersError.message}` }, { status: 500 });
    }

    const typedOrders = ordersData as OrderWithItems[] | null;
    return NextResponse.json(typedOrders || [], { status: 200 });
    */

  } catch (error) {
    console.error('Get My Orders API error (catch block):', error);
    const errorMessage = error instanceof Error ? error.message : 'Bilinmeyen bir sunucu hatası oluştu.';
    return NextResponse.json({ error: errorMessage, user: null }, { status: 500 });
  }
}
