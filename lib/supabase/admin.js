import { createClient } from "@supabase/supabase-js";

/**
 * عميل Supabase للسيرفر بمفتاح الخدمة (Service Role Key).
 * - سرّي — ممنوع يتستورد في أي ملف "use client".
 * - نفس قاعدة بيانات الموقع الأساسي (نفس المشروع على Supabase).
 */
const ADMIN_EMAIL = "mahmoudelamir9901@gmail.com";

let cached = null;

export function getSupabaseAdmin() {
  if (cached) return cached;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error(
      "إعدادات Supabase ناقصة: تأكد من وجود NEXT_PUBLIC_SUPABASE_URL و SUPABASE_SERVICE_ROLE_KEY في إعدادات Vercel/.env.local"
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
