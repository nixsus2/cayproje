import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import type { Profile, SystemSettings } from '@/lib/supabase';

// Supabase URL ve Key'leri alalım (fonksiyon içinde kullanılacak)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;


export async function POST(request: Request) {
  // İstemcileri fonksiyon içinde oluştur
  const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  });
  const supabaseAnon = createClient(supabaseUrl, supabaseAnonKey);

  // Token'ı al (await ile) - await geri eklendi
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
    // 1. Kullanıcı oturumunu ve rolünü doğrula
    const { data: { user }, error: userError } = await supabaseAnon.auth.getUser(token);
    if (userError || !user) {
      return NextResponse.json({ error: 'Yetkisiz erişim: Geçersiz oturum.' }, { status: 401 });
    }

    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single<Pick<Profile, 'role'>>();

    if (profileError || !profile) {
      return NextResponse.json({ error: 'Yetkisiz erişim: Profil bulunamadı.' }, { status: 403 });
    }
    // Sadece 'admin' rolü bu işlemi yapabilir
    if (profile.role !== 'admin') {
      return NextResponse.json({ error: 'Yetkisiz erişim: Bu işlem için yetkiniz yok.' }, { status: 403 });
    }

    // 2. Mevcut sistem durumunu al (system_settings tablosunda id=1 varsayımıyla)
    const { data: currentSettings, error: fetchError } = await supabaseAdmin
        .from('system_settings')
        .select('is_ordering_active')
        .eq('id', 1) // Varsayılan ID
        .single<Pick<SystemSettings, 'is_ordering_active'>>();

    if (fetchError || !currentSettings) {
        console.error("Error fetching system settings:", fetchError);
        // Eğer ayar yoksa, varsayılan olarak oluşturmayı düşünebiliriz veya hata verebiliriz.
        // Şimdilik hata verelim.
         return NextResponse.json({ error: 'Sistem ayarları bulunamadı veya alınamadı.' }, { status: 500 });
    }

    const newStatus = !currentSettings.is_ordering_active;

    // 3. Sistem durumunu güncelle
    const { data: updatedSettings, error: updateError } = await supabaseAdmin
      .from('system_settings')
      .update({ is_ordering_active: newStatus, updated_at: new Date().toISOString() })
      .eq('id', 1)
      .select('is_ordering_active') // Güncellenmiş durumu döndür
      .single();

    if (updateError) {
      console.error('Error updating system settings:', updateError);
      return NextResponse.json({ error: `Sistem durumu güncellenemedi: ${updateError.message}` }, { status: 500 });
    }

    // Başarılı yanıt
    return NextResponse.json({
        message: `Sistem durumu başarıyla ${newStatus ? 'aktif' : 'pasif'} hale getirildi.`,
        is_ordering_active: newStatus
    }, { status: 200 });

  } catch (error) {
    console.error('Toggle System API error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Bilinmeyen bir sunucu hatası oluştu.';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

// GET metodu ekleyerek mevcut durumu sorgulamak için kullanılabilir
export async function GET(request: Request) {
    // Token'ı al (await ile) - GET isteği için de yetkilendirme gerekebilir
    const cookieStore = await cookies();
    const authTokenCookieName = `sb-${supabaseUrl.split('.')[0].split('//')[1]}-auth-token`;
    let token: string | undefined;
    try { token = cookieStore.get(authTokenCookieName)?.value; } catch (error) {}

    // Yetkilendirme kontrolü (opsiyonel, duruma göre herkes görebilir veya sadece yetkililer)
    // if (!token) { ... }
    // const { data: { user }, error: userError } = await supabaseAnon.auth.getUser(token);
    // if (userError || !user) { ... }

    try {
        // Admin istemcisini fonksiyon içinde oluştur
        const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
          auth: { autoRefreshToken: false, persistSession: false }
        });

        const { data: settings, error } = await supabaseAdmin // Herkesin görmesi için Anon client da olabilir
            .from('system_settings')
            .select('is_ordering_active')
            .eq('id', 1)
            .single<Pick<SystemSettings, 'is_ordering_active'>>();

        if (error || !settings) {
            // Ayar yoksa varsayılan bir durum döndür (örn: true) veya hata
            console.error("Error fetching system status:", error);
            // Varsayılan olarak aktif kabul edelim
            return NextResponse.json({ is_ordering_active: true }, { status: 200 });
            // Veya hata döndür:
            // return NextResponse.json({ error: 'Sistem durumu alınamadı.' }, { status: 500 });
        }
        return NextResponse.json({ is_ordering_active: settings.is_ordering_active }, { status: 200 });

    } catch (error) {
        console.error('Get System Status API error:', error);
        return NextResponse.json({ error: 'Sistem durumu alınırken sunucu hatası oluştu.' }, { status: 500 });
    }
}
