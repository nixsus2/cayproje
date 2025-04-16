import { createClient, User as SupabaseUser } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// Supabase istemcisini oluştur
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Rol Tipleri
export type UserRole = 'customer' | 'owner' | 'admin';

// Veritabanı Tabloları için Tip Tanımlamaları (Supabase şemasına göre güncellenmeli)

// Genellikle 'profiles' adlı bir tabloda ek kullanıcı bilgilerini tutarız
export type Profile = {
  id: string; // Supabase Auth user ID ile eşleşir
  username: string;
  shop_name?: string; // Sadece 'owner' için geçerli olabilir
  role: UserRole;
  created_at: string;
  updated_at: string;
};

// Sipariş Edilebilecek Ürünler (Örnek: 'products' tablosu)
export type Product = {
  id: string;
  name: string; // 'Çay', 'Türk Kahvesi'
  // Gerekirse fiyat vb. eklenebilir
  created_at: string;
};

// Bardak Boyutları
export type DrinkSize = 'small' | 'large';

// Şeker Seviyeleri
export type SugarLevel = 'none' | 'low' | 'medium' | 'high';

// Sipariş Durumları
// Sipariş Durumları (Enum'a göre güncelleyelim)
export type OrderStatus = 'pending' | 'preparing' | 'ready' | 'delivered' | 'cancelled';

// Siparişler ('orders' tablosu - YENİ ŞEMA)
export type Order = {
  id: string; // uuid
  user_id: string | null; // uuid, nullable olabilir (auth.users referansı)
  status: OrderStatus;
  created_at: string; // timestamp with time zone
  updated_at: string; // timestamp with time zone
  // İlişkili veriler (items) ayrı sorguyla veya join ile alınır
};

// Sipariş Kalemleri ('order_items' tablosu - YENİ TİP)
export type OrderItem = {
    id: string; // uuid
    order_id: string; // uuid (orders.id referansı)
    product_id: string; // uuid (products.id referansı)
    quantity: number; // integer
    size: string | null; // drink_size -> size, tipi text olduğu için string
    sugar_level: SugarLevel | null; // Enum veya null olabilir
    notes: string | null; // text veya null olabilir
    created_at: string; // timestamp with time zone
    // İlişkili veriler (product bilgisi) join ile alınabilir
    // product?: Product;
};


// Sistem Ayarları (Örnek: 'system_settings' tablosu, tek satırlı olabilir)
export type SystemSettings = {
  id: number; // Genellikle 1 gibi sabit bir ID
  is_ordering_active: boolean;
  updated_at: string;
};

// Supabase Auth kullanıcısını da dışa aktarabiliriz (gerekirse)
export type AuthUser = SupabaseUser;
