import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

/**
 * عميل المصادقة للسيرفر (Server Components / Server Actions / Route Handlers).
 * بيقرأ ويكتب جلسة الدخول من كوكيز Next، فالصفحات المحمية بتتأكد من السيرفر.
 *
 * ملاحظة عن المفاتيح: بنستخدم NEXT_PUBLIC_SUPABASE_ANON_KEY لو موجود،
 * ولو مش موجود بنرجع لمفتاح الخدمة عشان اللوحة تشتغل من غير تعطيل.
 */
export async function createSupabaseServerClient() {
  const cookieStore = await cookies();

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    throw new Error(
      "إعدادات Supabase ناقصة: تأكد من NEXT_PUBLIC_SUPABASE_URL و NEXT_PUBLIC_SUPABASE_ANON_KEY في إعدادات Vercel/.env.local"
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
