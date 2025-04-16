import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import type { Profile, UserRole } from '@/lib/supabase'; // Tipleri import et

// ÖNEMLİ: Bu API rotası sunucu tarafında çalıştığı için,
// Supabase istemcisini Service Role Key ile başlatmamız GEREKİR.
// Bu anahtarı ortam değişkenlerinden güvenli bir şekilde alın.
// ASLA istemci tarafında (NEXT_PUBLIC_ ile başlayan) anahtarları kullanmayın!
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''; // .env.local dosyasında tanımlanmalı

// Service Role Key ile özel Supabase istemcisi oluştur
// Bu istemci, kullanıcı yetkilerini atlayarak işlem yapabilir (dikkatli kullanılmalı!)
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

export async function POST(request: Request) {
  // TODO: İstek yapan kullanıcının Admin olup olmadığını doğrula!
  // Bu adım, Supabase Auth ile oturum yönetimi ve rol kontrolü gerektirir.
  // Şimdilik bu kontrolü atlıyoruz, ancak gerçek uygulamada KRİTİKTİR.

  try {
    const { email, password, username, role, shop_name } = await request.json();

    // Gerekli alanların kontrolü
    if (!email || !password || !username || !role) {
      return NextResponse.json({ error: 'Eksik bilgi: email, password, username ve role gereklidir.' }, { status: 400 });
    }

    // Rolün geçerli olup olmadığını kontrol et
    const validRoles: UserRole[] = ['customer', 'owner', 'admin'];
    if (!validRoles.includes(role)) {
      return NextResponse.json({ error: 'Geçersiz rol belirtildi.' }, { status: 400 });
    }

    // 1. Supabase Auth içinde yeni kullanıcı oluştur
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: email,
      password: password,
      email_confirm: true, // Otomatik olarak onaylanmış kabul edelim
      // user_metadata: { username: username } // İsteğe bağlı: meta veriye eklenebilir
    });

    if (authError) {
      console.error('Supabase Auth user creation error:', authError);
      // Kullanıcı zaten varsa farklı bir hata dönebilir, bunu ele alabiliriz
      if (authError.message.includes('User already registered')) {
         return NextResponse.json({ error: 'Bu e-posta adresi zaten kayıtlı.' }, { status: 409 }); // Conflict
      }
      return NextResponse.json({ error: `Kullanıcı oluşturulamadı: ${authError.message}` }, { status: 500 });
    }

    if (!authData || !authData.user) {
       throw new Error('Auth user data is missing after creation.');
    }

    const newUserId = authData.user.id;

    // 2. 'profiles' tablosuna yeni profil oluştur
    const profilePayload: Omit<Profile, 'created_at' | 'updated_at'> = {
      id: newUserId,
      username: username,
      role: role,
      shop_name: role === 'owner' ? shop_name : undefined, // Sadece sahip için dükkan adı
    };

    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .insert(profilePayload);

    if (profileError) {
      // Daha detaylı hata loglaması ekleyelim
      console.error('Supabase profile creation error object:', JSON.stringify(profileError, null, 2));
      // Profil oluşturma başarısız olursa, oluşturulan Auth kullanıcısını silmeyi düşünebiliriz (rollback)
      // await supabaseAdmin.auth.admin.deleteUser(newUserId); // Dikkatli kullanılmalı
      // Hata mesajını daha genel tutalım veya profileError'dan bir şey almaya çalışalım
      const errorMessage = profileError.message || JSON.stringify(profileError);
      return NextResponse.json({ error: `Profil oluşturulamadı: ${errorMessage}` }, { status: 500 });
    }

    // Başarılı yanıt
    return NextResponse.json({ message: 'Kullanıcı başarıyla oluşturuldu.', userId: newUserId }, { status: 201 });

  } catch (error) {
    console.error('Register API error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Bilinmeyen bir sunucu hatası oluştu.';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
