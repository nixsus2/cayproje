import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'

export function createSupabaseServerClient() {
  const cookieStore = cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        // Tekrar async/await deneyelim
        async get(name: string) {
          const cookieStore = await cookies();
          return cookieStore.get(name)?.value;
        },
        async set(name: string, value: string, options: CookieOptions) {
          try {
            const cookieStore = await cookies();
            cookieStore.set({ name, value, ...options });
          } catch (error) {
            // The `set` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
        async remove(name: string, options: CookieOptions) {
          try {
            // If the cookie is removed, update the cookies for the request and response
            const cookieStore = await cookies();
            cookieStore.set({ name, value: '', ...options });
          } catch (error) {
            // The `delete` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
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
    const { createClient } = require('@supabase/supabase-js'); // Dinamik import
     return createClient(
         process.env.NEXT_PUBLIC_SUPABASE_URL!,
         process.env.SUPABASE_SERVICE_ROLE_KEY!,
         {
           auth: {
             autoRefreshToken: false,
             persistSession: false
           }
         }
       );
}
