import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { getSupabaseUrl, getSupabaseAnonKey } from "./env";

/**
 * عميل المصادقة للسيرفر (Server Components / Server Actions / Route Handlers).
 * بيقرأ ويكتب جلسة الدخول من كوكيز Next، فالصفحات المحمية بتتأكد من السيرفر.
 *
 * 🔒 أمان: بيستخدم NEXT_PUBLIC_SUPABASE_ANON_KEY بس — وممنوع هنا
 * أي رجوع (fallback) لمفتاح الخدمة، لأن الملف ده بيُستورد في شجرة الـ build
 * ومن السهل ينتهي به الأمر في باندل العميل. المفتاح العام هو المصمّم للغرض ده.
 */
export async function createSupabaseServerClient() {
  const cookieStore = await cookies();

  const url = getSupabaseUrl();
  const key = getSupabaseAnonKey();

  if (!url || !key) {
    throw new Error(
      "إعدادات Supabase ناقصة في بيئة الإنتاج: تأكد إن NEXT_PUBLIC_SUPABASE_URL و NEXT_PUBLIC_SUPABASE_ANON_KEY مضبوطين في Vercel ثم اعمل Redeploy."
    );
  }

  return createServerClient(url, key, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        } catch {
          // بيحصل لما تُنادى من Server Component (قراءة فقط).
          // الـ middleware هو اللي بيعمل refresh للجلسة، فالتجاهل هنا آمن.
        }
      },
    },
  });
}
