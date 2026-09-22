"use server";

import { revalidatePath } from "next/cache";
import { getSupabaseAdmin, CONTACT_MESSAGES_TABLE } from "@/lib/supabase/admin";
import { requirePermissionAction } from "@/lib/rbac";

/* ==========================================================================
   عمليات رسائل الزوار (contact_messages).
   --------------------------------------------------------------------------
   القراءة/العرض محمية بصلاحية `messages.view` في الصفحة نفسها.
   الحذف هنا محمي بصلاحية `messages.delete` على السيرفر — مش بس إخفاء
   للزرار في الواجهة.
   ========================================================================== */

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** حذف رسالة واحدة نهائيًا — محمي بصلاحية حذف الرسائل */
export async function deleteContactMessage(id) {
  const auth = await requirePermissionAction("messages", "delete");
  if (!auth.ok) return { ok: false, error: auth.error };

  // حزام أمان: لو الـ id وصل فاضي/غير صحيح، ممكن `.eq` يتجاهل الشرط
  if (typeof id !== "string" || !UUID_REGEX.test(id.trim())) {
    return { ok: false, error: "معرّف الرسالة غير صحيح." };
  }

  try {
    const { data, error } = await getSupabaseAdmin()
      .from(CONTACT_MESSAGES_TABLE)
      .delete()
      .eq("id", id.trim())
      .select("id");

    if (error) return { ok: false, error: `تعذّر حذف الرسالة: ${error.message}` };
    if (!data || data.length === 0) {
      return { ok: false, error: "الرسالة مش موجودة (ممكن تكون اتحذفت من مكان تاني)." };
    }

    revalidatePath("/dashboard/messages");
    revalidatePath("/dashboard");
    return { ok: true, message: "تم حذف الرسالة." };
  } catch (err) {
    return { ok: false, error: `حصل خطأ غير متوقع: ${err?.message || err}` };
  }
}
