import { createClient } from "@supabase/supabase-js";
import { getSupabaseUrl, getSupabaseServiceRoleKey } from "./env";

/**
 * عميل Supabase للسيرفر بمفتاح الخدمة (Service Role Key).
 * - سرّي — ممنوع يتستورد في أي ملف "use client".
 * - نفس قاعدة بيانات الموقع الأساسي (نفس المشروع على Supabase).
 */
const ADMIN_EMAIL = "mahmoudelamir9901@gmail.com";

// 🛑 حاجز أمان: لو أي مكوّن عميل استورد الملف ده بالغلط، نفشل بصوت عالي
// بدل ما نبعت مفتاح الخدمة للـ Client. ده بيحمي من تسريب المفتاح.
if (typeof window !== "undefined") {
  throw new Error(
    "lib/supabase/admin.js بيتقرأ منه مفتاح الخدمة السرّي وممنوع يتستورد في أي مكوّن \"use client\". استخدم createSupabaseBrowserClient من lib/supabase/client.js للعميل، والـ Server Actions للسيرفر."
  );
}

let cached = null;

export function getSupabaseAdmin() {
  if (cached) return cached;

  const url = getSupabaseUrl();
  const serviceRoleKey = getSupabaseServiceRoleKey();

  if (!url || !serviceRoleKey) {
    throw new Error(
      "إعدادات Supabase ناقصة في بيئة الإنتاج: تأكد من وجود NEXT_PUBLIC_SUPABASE_URL و SUPABASE_SERVICE_ROLE_KEY في إعدادات Vercel ثم اعمل Redeploy."
    );
  }

  cached = createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  return cached;
}

/** هل المستخدم الحالي هو المدير العام؟ */
export function isSuperAdmin(user) {
  return Boolean(user?.email) && user.email.toLowerCase() === ADMIN_EMAIL;
}

export const SUPER_ADMIN_EMAIL = ADMIN_EMAIL;
export const APPLICATIONS_TABLE = "job_applications";
export const CONTACT_MESSAGES_TABLE = "contact_messages";
export const ADMINS_TABLE = "admins";
