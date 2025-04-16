'use server' // Bu dosyanın Server Actions içerdiğini belirtir

import { revalidatePath } from 'next/cache'
import { createClient } from '@supabase/supabase-js'
import { createSupabaseServerClient, createSupabaseAdminClient } from '@/lib/supabase/server'
import type { OrderStatus, Profile, Order, OrderItem, DrinkSize, SugarLevel } from '@/lib/supabase'

// Tip tanımı (Server Action'dan dönecek sonuç için)
type ActionResult = {
  success: boolean;
  error?: string;
  updatedStatus?: OrderStatus;
  newOrderId?: string; // Yeni sipariş ID'sini döndürelim
}

// Sepet öğesi tipi (istemciden gelecek)
interface CartItemInput {
  productId: string;
  quantity: number;
  size?: DrinkSize;
  sugarLevel?: SugarLevel;
  notes?: string;
}

// Auth client (anon key ile, sadece token doğrulamak için)
const supabaseAnon = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// Yeni Sipariş Oluşturma Server Action
export async function createOrderAction(items: CartItemInput[], accessToken: string | null): Promise<ActionResult> {
    const supabase = createSupabaseServerClient(); // Oturum kontrolü için
    const supabaseAdmin = createSupabaseAdminClient(); // Admin işlemleri için

    if (items.length === 0) {
        return { success: false, error: 'Sepet boş.' };
    }

    try {
        // 1. Token ile kullanıcıyı doğrula
        if (!accessToken) {
            return { success: false, error: 'Yetkisiz erişim: Erişim token bulunamadı.' };
        }
        const { data: { user }, error: userError } = await supabaseAnon.auth.getUser(accessToken);
        if (userError || !user) {
          console.error("Auth Error (createOrderAction - token):", userError);
          return { success: false, error: 'Yetkisiz erişim: Geçersiz token.' };
        }
        const userId = user.id;
        console.log(`createOrderAction: Received items for user ${userId}:`, JSON.stringify(items, null, 2)); // Gelen item'ları logla

        // --- Veritabanı İşlemleri ---
        // NOT: Supabase normalde tek bir insert çağrısıyla ilişkili kayıtları eklemeyi desteklemez.
        // Bu yüzden önce order, sonra order_items ekleyeceğiz. RLS politikası nedeniyle
        // order_items eklerken admin client kullanmak daha güvenli olabilir.

        // 2. Ana sipariş kaydını oluştur (Admin client ile RLS'yi atlayalım)
        const { data: newOrderData, error: orderInsertError } = await supabaseAdmin
            .from('orders')
            .insert({ user_id: userId, status: 'pending' })
            .select('id') // Sadece ID'yi alalım
            .single(); // Generic tip argümanı kaldırıldı

        if (orderInsertError || !newOrderData?.id) {
            console.error('Order creation error (action):', orderInsertError);
            return { success: false, error: `Ana sipariş oluşturulamadı: ${orderInsertError?.message}` };
        }
        const newOrderId = newOrderData.id;

        // 3. Sipariş kalemlerini oluştur (Admin client ile RLS'yi atlayalım)
        const itemsToInsert = items.map(item => ({
            order_id: newOrderId,
            product_id: item.productId,
            quantity: item.quantity,
            size: item.size, // Tekrar eklendi
            sugar_level: item.sugarLevel, // Tekrar eklendi
            notes: item.notes, // Tekrar eklendi
        }));
        console.log(`createOrderAction: Inserting order_items for order ${newOrderId}:`, JSON.stringify(itemsToInsert, null, 2)); // Eklenecek item'ları logla

        const { error: itemsInsertError } = await supabaseAdmin
            .from('order_items')
            .insert(itemsToInsert);

        if (itemsInsertError) {
            console.error('Order items insertion error (action):', itemsInsertError);
            // Başarısız olursa ana siparişi silmeyi deneyebiliriz (rollback)
            await supabaseAdmin.from('orders').delete().match({ id: newOrderId });
            return { success: false, error: `Sipariş kalemleri eklenemedi: ${itemsInsertError.message}` };
        }

        console.log(`createOrderAction: Successfully inserted ${itemsToInsert.length} items for order ${newOrderId}`); // Başarı logu
        // Başarılı - Dashboard'u yenilemek için revalidate et
        revalidatePath('/dashboard');
        // Müşterinin kendi sipariş sayfasını da yenile
        revalidatePath('/my-orders');

        return { success: true, newOrderId: newOrderId };

    } catch (error) {
        console.error('Create Order Action error:', error);
        const errorMessage = error instanceof Error ? error.message : 'Bilinmeyen bir sunucu hatası oluştu.';
        return { success: false, error: errorMessage };
    }
}


// Siparişi 'preparing' durumuna güncelleyen Server Action
export async function approveOrderAction(orderId: string, accessToken: string | null): Promise<ActionResult> {
  // Admin client'ı oluştur
  const supabaseAdmin = createSupabaseAdminClient();

  try {
    // 1. Token ile kullanıcıyı doğrula
    if (!accessToken) {
        return { success: false, error: 'Yetkisiz erişim: Erişim token bulunamadı.' };
    }
    // Anon client ile token'ı kullanarak kullanıcıyı al
    const { data: { user }, error: userError } = await supabaseAnon.auth.getUser(accessToken);
    if (userError || !user) {
      console.error("Auth Error (approveOrderAction - token):", userError);
      return { success: false, error: 'Yetkisiz erişim: Geçersiz token.' };
    }

    // 2. Kullanıcının rolünü Admin client ile kontrol et
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();
    if (profileError || !profile) {
       console.error("Profile fetch error (approveOrderAction):", profileError);
      return { success: false, error: 'Yetkisiz erişim: Profil bulunamadı.' };
    }
    if (profile.role !== 'owner' && profile.role !== 'admin') {
      return { success: false, error: 'Yetkisiz erişim: Bu işlem için yetkiniz yok.' };
    }

    // 3. Siparişi Admin client ile güncelle
    const nextStatus: OrderStatus = 'preparing';
    const { data: updatedOrder, error: updateError } = await supabaseAdmin
      .from('orders')
      .update({ status: nextStatus, updated_at: new Date().toISOString() })
      .eq('id', orderId)
      .eq('status', 'pending')
      .select('status') // Sadece güncellenen durumu alalım
      .single();

    if (updateError) {
      console.error('Error approving order (action):', updateError);
      if (updateError.code === 'PGRST116') {
         return { success: false, error: 'Onaylanacak sipariş bulunamadı veya zaten işlenmiş.' };
      }
      return { success: false, error: `Sipariş onaylanamadı: ${updateError.message}` };
    }
    if (!updatedOrder) {
        return { success: false, error: 'Onaylanacak sipariş bulunamadı veya zaten işlenmiş.' };
    }

    // Dashboard sayfasının yeniden doğrulanmasını tetikle (isteğe bağlı ama iyi pratik)
    revalidatePath('/dashboard');

    return { success: true, updatedStatus: updatedOrder.status as OrderStatus };

  } catch (error) {
    console.error('Approve Order Action error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Bilinmeyen bir sunucu hatası oluştu.';
    return { success: false, error: errorMessage };
  }
}

// Siparişi 'delivered' durumuna güncelleyen Server Action
export async function deliverOrderAction(orderId: string, accessToken: string | null): Promise<ActionResult> {
    // Admin client'ı oluştur
    const supabaseAdmin = createSupabaseAdminClient();

    try {
      // 1. Token ile kullanıcıyı doğrula
      if (!accessToken) {
          return { success: false, error: 'Yetkisiz erişim: Erişim token bulunamadı.' };
      }
      // Anon client ile token'ı kullanarak kullanıcıyı al
      const { data: { user }, error: userError } = await supabaseAnon.auth.getUser(accessToken);
      if (userError || !user) {
        console.error("Auth Error (deliverOrderAction - token):", userError);
        return { success: false, error: 'Yetkisiz erişim: Geçersiz token.' };
      }

      // 2. Kullanıcının rolünü Admin client ile kontrol et
      const { data: profile, error: profileError } = await supabaseAdmin
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();
      if (profileError || !profile) {
         console.error("Profile fetch error (deliverOrderAction):", profileError);
        return { success: false, error: 'Yetkisiz erişim: Profil bulunamadı.' };
      }
      if (profile.role !== 'owner' && profile.role !== 'admin') {
        return { success: false, error: 'Yetkisiz erişim: Bu işlem için yetkiniz yok.' };
      }

      // 3. Siparişi Admin client ile güncelle
      const nextStatus: OrderStatus = 'delivered';
      const { data: updatedOrder, error: updateError } = await supabaseAdmin
        .from('orders')
        .update({ status: nextStatus, updated_at: new Date().toISOString() })
        .eq('id', orderId)
        .in('status', ['preparing', 'ready'])
        .select('status')
        .single();

      if (updateError) {
        console.error('Error delivering order (action):', updateError);
        if (updateError.code === 'PGRST116') {
           return { success: false, error: 'Teslim edilecek sipariş bulunamadı veya zaten teslim edilmiş/iptal edilmiş.' };
        }
        return { success: false, error: `Sipariş teslim edilemedi: ${updateError.message}` };
      }
       if (!updatedOrder) {
           return { success: false, error: 'Teslim edilecek sipariş bulunamadı veya zaten teslim edilmiş/iptal edilmiş.' };
       }

      // Dashboard sayfasının yeniden doğrulanmasını tetikle
      revalidatePath('/dashboard');

      return { success: true, updatedStatus: updatedOrder.status as OrderStatus };

    } catch (error) {
      console.error('Deliver Order Action error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Bilinmeyen bir sunucu hatası oluştu.';
      return { success: false, error: errorMessage };
    }
  }
