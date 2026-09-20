/**
 * قراءة مفاتيح Supabase في مكان واحد — بتشتغل صح في Build وقت التشغيل.
 *
 * ⚠️ قاعدتان مهمتان اتعلمناها بالعافية:
 *
 * 1) إحنا بنكتب process.env.X بالحرف جوه الدالة (مش بنمرّر الكائن نفسه ولا
 *    بنعمل Destructuring على مستوى الملف). Next.js بيستبدل التعابير دي نصيًا
 *    أثناء الـ Build، فلو كتبت `const env = process.env` وبعدين `env.X`
 *    الـ Build بيسيبها فاضية وبتوصل undefined في الـ Production.
 *
 * 2) الرابط لازم يتشال منه آخر "/" — الرابط اللي بيتكتب في Vercel كتير بيكون
 *    آخره سلاش (https://xxx.supabase.co/)، والـ Supabase بيعمل تركيب للمسار
 *    زي `${url}/auth/v1/...` فبيطلع سلاشين وييجي Malformed URL ويرجّع
 *    "Invalid API key" حتى لو المفتاح نفسه سليم تمامًا.
 */

/** يشيل أي سلاشات زيادة من آخر الرابط + المسافات. */
export function normalizeSupabaseUrl(value) {
  if (typeof value !== "string") return "";
  return value.trim().replace(/\/+$/, "");
}

/**
 * رابط الـ Supabase جاهز للاستخدام، من غير سلاش في الآخر.
 * بيتقرأ من NEXT_PUBLIC_SUPABASE_URL مباشرة (القراءة المباشرة ضرورية للـ Build).
 */
export function getSupabaseUrl() {
  return normalizeSupabaseUrl(process.env.NEXT_PUBLIC_SUPABASE_URL);
}

/** المفتاح العام (anon) — بيتقرأ مباشرة عشان الـ Build يستبدله صح. */
export function getSupabaseAnonKey() {
  return (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "").trim();
}

/**
 * مفتاح الخدمة (service_role) — سيرفر فقط. ممنوع يوصل للمتصفح.
 * بيتقرأ من SUPABASE_SERVICE_ROLE_KEY مباشرة (وده اسمه الصحيح في Supabase).
 */
export function getSupabaseServiceRoleKey() {
  return (process.env.SUPABASE_SERVICE_ROLE_KEY || "").trim();
}

/** هل التطبيق متظبط بالمفتاح العام؟ بنستخدمها للتحقق المبكر. */
export function hasPublicSupabaseConfig() {
  return Boolean(getSupabaseUrl() && getSupabaseAnonKey());
}
