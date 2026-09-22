import { getSupabaseAdmin, CONTACT_MESSAGES_TABLE } from "@/lib/supabase/admin";

/**
 * بيانات رسائل "تواصل معنا" في لوحة التحكم.
 * ---------------------------------------------------------------------------
 * الرسائل دي بتيجي من فورم التواصل في الموقع الأساسي (sendContactMessage)
 * وبتتخزن في جدول contact_messages. هنا بنقراها للأدمن عشان يديرها.
 *
 * ملاحظة: الجدول فيه (full_name, phone_number, reason, message, created_at,
 * status) — مفيش عمود email لأن فورم الموقع أصلاً مش بيطلب إيميل.
 */

/** كل الرسائل مرتبة بالأحدث */
export async function listContactMessages() {
  const supabase = getSupabaseAdmin();

  const { data, error } = await supabase
    .from(CONTACT_MESSAGES_TABLE)
    .select("id, created_at, full_name, phone_number, reason, message, status")
    .order("created_at", { ascending: false });

  if (error) {
    if (["42P01", "PGRST205"].includes(error.code)) {
      return { ok: false, missing: true, messages: [] };
    }
    throw new Error(error.message);
  }

  return { ok: true, messages: data || [] };
}
