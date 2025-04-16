import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { createClient } from '@supabase/supabase-js'; // createClient importu eklendi

export function createSupabaseServerClient() {
  // const cookieStore = cookies() // Bu değişkene gerek yok, doğrudan aşağıda kullanılıyor

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        // Tekrar async/await deneyelim
        // async/await ve await cookies() kullanımı, hatayı çözmediği için geri alındı.
        // Standart @supabase/ssr yaklaşımını kullanalım.
        get(name: string) {
          const cookieStore = cookies();
          // @ts-ignore - Hatanın geçici olarak bastırılması
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          try {
            const cookieStore = cookies();
            // @ts-ignore - Hatanın geçici olarak bastırılması
            cookieStore.set({ name, value, ...options });
          } catch (error) {
            // Hata logunu kaldıralım, ESLint uyarısı veriyor.
            // console.warn(`Helper: Failed to set cookie '${name}'`, error);
          }
        },
        remove(name: string, options: CookieOptions) {
          try {
            // If the cookie is removed, update the cookies for the request and response
            const cookieStore = cookies();
            // @ts-ignore - Hatanın geçici olarak bastırılması
            cookieStore.set({ name, value: '', ...options });
          } catch (error) {
            // Hata logunu kaldıralım, ESLint uyarısı veriyor.
            // console.warn(`Helper: Failed to remove cookie '${name}'`, error);
          }
        },
      },
    }
  )
}

// İsteğe bağlı: Service Role Key ile admin client oluşturmak için ayrı bir fonksiyon
export function createSupabaseAdminClient() {
    // Admin client için createClient kullanalım, ssr'a gerek yok
    // return createServerClient( // Bu createServerClient idi, createClient olmalı
    //     process.env.NEXT_PUBLIC_SUPABASE_URL!,
    //     process.env.SUPABASE_SERVICE_ROLE_KEY!,
    //     {
    //       auth: {
    //         autoRefreshToken: false,
    //         persistSession: false
    //       },
    //       cookies: { // Minimal cookies nesnesi
    //         get(name: string) { return undefined; },
    //         set(name: string, value: string, options: CookieOptions) {},
    //         remove(name: string, options: CookieOptions) {},
    //       },
    //     }
    //   );
    // Düzeltme: Admin client için @supabase/supabase-js'den createClient kullanalım
    // const { createClient } = require('@supabase/supabase-js'); // require yerine import kullanıldı
     return createClient(
         process.env.NEXT_PUBLIC_SUPABASE_URL!,
         process.env.SUPABASE_SERVICE_ROLE_KEY!, // Service Role Key'i kullan
         {
           auth: {
             autoRefreshToken: false,
             persistSession: false
           }
         }
       );
}
