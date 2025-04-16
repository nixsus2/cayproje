import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
// Gerekli tüm tipleri import et
import type { Order, OrderItem, Profile, Product, OrderStatus, DrinkSize, SugarLevel } from '@/lib/supabase';

// Admin client (Service Role Key ile)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

// Standart client (Anon Key ile - session doğrulaması için)
const supabaseAnon = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    // { auth: { autoRefreshToken: false, persistSession: false } } // Opsiyonel
);

// Dashboard'da kullanılacak sipariş tipi (items içeren)
// Bu tip, Order, OrderItem ve Product tiplerini @/lib/supabase'dan alır
type DashboardOrder = Order & {
  profiles: Pick<Profile, 'id' | 'username'> | null;
  items: (OrderItem & { products: Pick<Product, 'id' | 'name'> | null })[];
};

// POST isteği için beklenen body tipi (OrderForm'daki CartItem'a benzer)
interface NewOrderItemData {
  productId: string;
  quantity: number;
  drinkSize?: DrinkSize;
  sugarLevel?: SugarLevel;
  notes?: string;
}

// --- GET Handler ---
export async function GET(request: Request) {
  const cookieStore = await cookies();
  const authTokenCookieName = `sb-${supabaseUrl.split('.')[0].split('//')[1]}-auth-token`;
  let token: string | undefined;
  try {
      token = cookieStore.get(authTokenCookieName)?.value;
  } catch (error) {
      console.error("Error reading cookie:", error);
  }

  if (!token) {
    return NextResponse.json({ error: 'Yetkisiz erişim: Oturum token bulunamadı.' }, { status: 401 });
  }

  try {
    // 1. Kullanıcı oturumunu Anon client ve token ile doğrula
    const { data: { user }, error: userError } = await supabaseAnon.auth.getUser(token);

    if (userError || !user) {
      console.error("Auth Error:", userError);
      return NextResponse.json({ error: 'Yetkisiz erişim: Geçersiz oturum.' }, { status: 401 });
    }

    // 2. Kullanıcının rolünü Admin client ile kontrol et
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single<Pick<Profile, 'role'>>();

    if (profileError || !profile) {
       console.error("Profile fetch error:", profileError);
      return NextResponse.json({ error: 'Yetkisiz erişim: Profil bulunamadı.' }, { status: 403 });
    }
    // Sadece 'owner' veya 'admin' rolleri siparişleri görebilsin
    if (profile.role !== 'owner' && profile.role !== 'admin') {
      return NextResponse.json({ error: 'Yetkisiz erişim: Bu işlem için yetkiniz yok.' }, { status: 403 });
    }

    // 3. Siparişleri Admin client ile çek (yeni şemaya uygun)
    const { data: ordersData, error: ordersError } = await supabaseAdmin
      .from('orders') // Yeni 'orders' tablosu
      .select(`
        *,
        profiles ( id, username ),
        items:order_items (
          *,
          products ( id, name )
        )
      `)
       // Gösterilecek durumları güncelle (örn: tamamlanmışlar hariç)
      .in('status', ['pending', 'preparing', 'ready'])
      .order('created_at', { ascending: true }); // Eskiden yeniye sırala

    if (ordersError) {
      console.error('Error fetching orders for dashboard:', ordersError);
      return NextResponse.json({ error: `Siparişler alınamadı: ${ordersError.message}` }, { status: 500 });
    }

    // Dönen veriyi DashboardOrder[] tipine cast et
    const typedOrders = ordersData as DashboardOrder[] | null;
    return NextResponse.json(typedOrders || [], { status: 200 });

  } catch (error) {
    console.error('Get Orders API error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Bilinmeyen bir sunucu hatası oluştu.';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}


// --- POST Handler ---
export async function POST(request: Request) {
  const cookieStore = await cookies();
  const authTokenCookieName = `sb-${supabaseUrl.split('.')[0].split('//')[1]}-auth-token`;
  let token: string | undefined;
  try {
      token = cookieStore.get(authTokenCookieName)?.value;
  } catch (error) {
      console.error("Error reading cookie:", error);
  }

  if (!token) {
    return NextResponse.json({ error: 'Yetkisiz erişim: Oturum token bulunamadı.' }, { status: 401 });
  }

  let userId: string | null = null;
  try {
    // 1. Kullanıcı oturumunu doğrula
    const { data: { user }, error: userError } = await supabaseAnon.auth.getUser(token);

    if (userError || !user) {
      console.error("Auth Error:", userError);
      return NextResponse.json({ error: 'Yetkisiz erişim: Geçersiz oturum.' }, { status: 401 });
    }
    userId = user.id; // Kullanıcı ID'sini al

    // 2. İstek body'sini parse et
    // Body'nin NewOrderItemData[] formatında bir dizi olduğunu varsayıyoruz
    const itemsFromBody: NewOrderItemData[] = await request.json();

    if (!Array.isArray(itemsFromBody) || itemsFromBody.length === 0) {
        return NextResponse.json({ error: 'Geçersiz istek: Sipariş kalemleri eksik veya formatı yanlış.' }, { status: 400 });
    }

    // 3. Veritabanı işlemleri (Admin client ile)
    //    Basitlik adına transaction kullanmıyoruz, ama production'da önerilir.

    // 3a. Yeni siparişi 'orders' tablosuna ekle
    const { data: newOrderData, error: orderInsertError } = await supabaseAdmin
      .from('orders')
      .insert({ user_id: userId, status: 'pending' }) // user_id ve varsayılan status
      .select('id, created_at, updated_at, status, user_id') // Eklenen siparişin detaylarını al (user_id dahil)
      .single<Order>(); // Dönen tipi belirt (Order tipini kullan)

    if (orderInsertError || !newOrderData) {
      console.error('Order creation error:', orderInsertError);
      return NextResponse.json({ error: `Sipariş oluşturulamadı: ${orderInsertError?.message}` }, { status: 500 });
    }

    const newOrderId = newOrderData.id;

    // 3b. Sipariş kalemlerini 'order_items' tablosuna ekle
    const itemsToInsert = itemsFromBody.map(item => ({
      order_id: newOrderId,
      product_id: item.productId,
      quantity: item.quantity,
      drink_size: item.drinkSize,
      sugar_level: item.sugarLevel,
      notes: item.notes,
    }));

    // OrderItem & { products: ... } tipini kullanarak select yapalım
    const { data: insertedItemsData, error: itemsInsertError } = await supabaseAdmin
      .from('order_items')
      .insert(itemsToInsert)
      .select(`*, products (id, name)`) // Eklenen kalemleri ürün bilgisiyle al
      .returns<(OrderItem & { products: Pick<Product, 'id' | 'name'> | null })[]>(); // Dönen tipi belirt

    if (itemsInsertError) {
      console.error('Order items insertion error:', itemsInsertError);
      // Hata durumunda oluşturulan ana siparişi silmeyi dene (best effort)
      await supabaseAdmin.from('orders').delete().match({ id: newOrderId });
      return NextResponse.json({ error: `Sipariş kalemleri eklenemedi: ${itemsInsertError.message}` }, { status: 500 });
    }

    // 4. Başarılı yanıtı oluştur (yeni sipariş ve kalemleri içeren)
    // DashboardOrder tipini kullanarak yanıtı oluştur
    const finalOrderResponse: DashboardOrder = {
        ...newOrderData, // id, user_id, status, created_at, updated_at
        profiles: null, // Profil bilgisi bu aşamada eklenmiyor
        items: insertedItemsData || []
    };

    return NextResponse.json(finalOrderResponse, { status: 201 }); // 201 Created

  } catch (error) {
    console.error('Post Order API error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Bilinmeyen bir sunucu hatası oluştu.';
    // JSON parse hatası olabilir
    if (errorMessage.includes('JSON') || errorMessage.includes('Unexpected token')) {
        return NextResponse.json({ error: 'Geçersiz istek formatı veya JSON parse hatası.' }, { status: 400 });
    }
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
