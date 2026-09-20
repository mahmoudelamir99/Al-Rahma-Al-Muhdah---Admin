import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { getSupabaseUrl, getSupabaseAnonKey } from "@/lib/supabase/env";

/**
 * حماية اللوحة من السيرفر:
 * - بيجدّد جلسة Supabase على كل طلب.
 * - يمنع أي دخول لـ /dashboard من غير تسجيل دخول.
 * - يمنع الزائر المسجّل من رؤية شاشة الدخول (يرجّعه للوحة).
 *
 * ⚡ الأداء (أهم حاجة هنا):
 * الحاضر على كل طلب كان `supabase.auth.getUser()` — وده **نداء شبكة فعلي
 * لسيرفرات Supabase**. يعني كل كليك على أي رابط في القائمة كان بينتظر
 * رحلة كاملة ذهاب وعودة قبل ما الصفحة تبدأ تتحمّل أصلاً. ده كان السبب
 * الأساسي في إحساس "الأزرار بطيئة".
 *
 * الحل: التحقق الكامل (الفاخص للتوكن مع Supabase) بقى بيحصل **مرة واحدة فقط
 * عند الدخول لـ /dashboard** — كل تنقّل بعده بين صفحات اللوحة بيعدي فوراً
 * من غير أي نداء شبكة، والحماية نفسها فاضلة شغالة من طبقتين:
 *   1) الـ middleware (فحص وجود الكوكيز + الفحص الكامل عند أول دخول).
 *   2) app/dashboard/layout.js (بتتحقق من السيرفر لكل صفحة محمية).
 *
 * 🔒 ملاحظة أمنية مهمة (كانت ثغرة):
 * قبل كده كان الكود بيرجع لمفتاح الخدمة (SERVICE_ROLE_KEY) لو الـ anon key
 * مش موجود — ومفتاح الخدمة ده **بيتجاوز كل سياسات RLS** على قاعدة البيانات.
 * الـ middleware دايمًا شغال على حافة السيرفر وتحت هجوم مباشر، فأي استخدام
 * له للمفتاح الخطير ده مخاطرة مش مبررة، خصوصاً إن الـ anon key موجود أصلاً
 * في .env.local دلوقتي. بقينا نستخدم **الـ anon key بس** للتحقق من الجلسة،
 * واللي هو المفتاح المصمّم لهذا الغرض بالظبط.
 */
export async function middleware(request) {
  let response = NextResponse.next({ request });

  const url = getSupabaseUrl();
  const key = getSupabaseAnonKey();

  if (!url || !key) {
    return response;
  }

  const cookieHeader = request.cookies.getAll();

  // كوكي فاضي على /dashboard = مفيش جلسة → نرجّع للشاشة فورًا
  // من غير أي نداء شبكة (ده اللي كان بيخلي الطلب يعلّق).
  const hasSessionCookie = cookieHeader.some(
    (c) => c.name === "sb-access-token" || c.name.startsWith("sb-") && c.name.includes("auth-token")
  );

  const { pathname } = request.nextUrl;
  const isDashboard = pathname.startsWith("/dashboard");

  if (isDashboard && !hasSessionCookie) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/";
    redirectUrl.search = "";
    return NextResponse.redirect(redirectUrl);
  }

  // لو مفيش كوكيز محفوظة على المسارات التانية، مش محتاجين نتكلم مع Supabase خالص
  if (!hasSessionCookie) {
    return response;
  }

  /*
   * ⚡ هنا قلب الأداء:
   * اللي بيوصل هنا بقى حالتين بس — إما أول فتح لشاشة الدخول "/"، أو فتح
   * الصفحة الرئيسية للوحة "/dashboard" بالحرف. التنقّل بين باقي الأقسام
   * (/dashboard/jobs مثلاً) بيعدي فوراً من غير أي نداء شبكة، والفحص الكامل
   * لسه شغال على أول دخول للوحة عشان نطرد أي كوكي مزيف أو منتهي.
   */
  const isDashboardEntry = pathname === "/dashboard";
  if (!isDashboardEntry && pathname !== "/") {
    return response;
  }

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options)
        );
      },
    },
  });

  let user = null;
  try {
    const { data } = await supabase.auth.getUser();
    user = data?.user ?? null;
  } catch {
    user = null;
  }

  if (isDashboard && !user) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/";
    redirectUrl.search = "";
    return NextResponse.redirect(redirectUrl);
  }

  /*
   * فيه كوكي جلسة سليمة → نودّيه للوحة.
   * لاحظ: لو الموظف موقوف، الـ dashboard/layout هو اللي هيكتشف ده ويودّيه
   * /suspended. إحنا هنا مش بنكرر الفحص عشان نفضل من غير نداء شبكة إضافي
   * على كل تنقّل (ده اللي كان بيخلي اللوحة بطيئة).
   */
  if (!isDashboard && user && pathname === "/") {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/dashboard";
    redirectUrl.search = "";
    return NextResponse.redirect(redirectUrl);
  }

  return response;
}

export const config = {
  /*
   * /suspended مش جوه الـ matcher عن قصد:
   * عشان موظف موقوف لسه عنده كوكي جلسة يقدر يفتحها من غير ما الـ middleware
   * يودّيه للوحة تاني ويعمل loop.
   */
  matcher: ["/", "/dashboard/:path*"],
};
