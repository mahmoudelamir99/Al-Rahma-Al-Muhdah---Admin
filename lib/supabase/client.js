import { createBrowserClient } from "@supabase/ssr";

/**
 * عميل المصادقة للمتصفح (يُستورد في مكونات "use client" فقط).
 *
 * ⚠️ ملاحظة مهمة: لازم يكون NEXT_PUBLIC_SUPABASE_ANON_KEY متسجّل في .env.local
 * (من Supabase → Project Settings → API) عشان الدخول من شاشة اللوحة يشتغل.
 * الـ anon key بيوصل للمتصفح، وده طبيعي وآمن لأنه هو المفتاح العام المصم لكده.
 */
export function createSupabaseBrowserClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error(
      "إعدادات Supabase ناقصة: تأكد من NEXT_PUBLIC_SUPABASE_URL و NEXT_PUBLIC_SUPABASE_ANON_KEY في .env.local"
    );
  }

  return createBrowserClient(url, anonKey);
}
