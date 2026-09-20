import { createBrowserClient } from "@supabase/ssr";
import { getSupabaseUrl, getSupabaseAnonKey } from "./env";

/**
 * عميل المصادقة للمتصفح (يُستورد في مكونات "use client" فقط).
 *
 * ⚠️ ملاحظة مهمة: لازم يكون NEXT_PUBLIC_SUPABASE_ANON_KEY متسجّل في .env.local
 * وفي إعدادات Vercel للإنتاج (Production) — من Supabase → Project Settings → API.
 * الـ anon key بيوصل للمتصفح، وده طبيعي وآمن لأنه هو المفتاح العام المصم لكده.
 *
 * ملاحظة الـ Build: القراءة المباشرة لـ process.env بتتعمل جوه lib/supabase/env.js
 * بالحرف — عشان Next.js يستبدلها نصيًا وقت البناء ومتوصلش فاضية في اللايف.
 */
export function createSupabaseBrowserClient() {
  const url = getSupabaseUrl();
  const anonKey = getSupabaseAnonKey();

  if (!url || !anonKey) {
    throw new Error(
      "إعدادات Supabase ناقصة في بيئة الإنتاج: تأكد إن NEXT_PUBLIC_SUPABASE_URL و NEXT_PUBLIC_SUPABASE_ANON_KEY مضبوطين في Vercel ثم اعمل Redeploy."
    );
  }

  return createBrowserClient(url, anonKey);
}
