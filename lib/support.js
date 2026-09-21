import { getSupabaseAdmin } from "@/lib/supabase/admin";

/**
 * قراءة طلبات الدعم الفني في لوحة التحكم.
 * ---------------------------------------------------------------------------
 * بترجّع كل الطلبات مرتبة بالأحدث، وحالة "قيد الانتظار" بتتعرض الأول
 * في الواجهة (الفلترة في المتصفح).
 */

/*
 * الثوابت النقية (التسميات/الحالات) اتنقلت لـ `lib/supportMeta.js` عشان
 * مكوّنات العميل تستوردها من غير ما تجرّ معاها الاستيراد السيري
 * `getSupabaseAdmin` (اللي بيرمي Exception في المتصفح). بنعيد تصديرها هنا
 * عشان أي كود سيرفر لسه مستورد من `lib/support` ميكسرش.
 */
export { SUPPORT_TABLE, REQUEST_TYPE_LABELS, SUPPORT_STATUSES, supportStatusMeta } from "./supportMeta";
import { SUPPORT_TABLE } from "./supportMeta";

/** كل طلبات الدعم مرتبة بالأحدث */
export async function listSupportRequests() {
  const supabase = getSupabaseAdmin();

  const { data, error } = await supabase
    .from(SUPPORT_TABLE)
    .select(
      [
        "id",
        "created_at",
        "employee_id",
        "employee_email",
        "employee_name",
        "employee_role",
        "request_type",
        "new_email",
        "status",
        "reviewed_by",
        "reviewed_at",
        "review_note",
        "internal_note",
        "message",
      ].join(", ")
    )
    .order("created_at", { ascending: false });

  if (error) {
    // الجدول لسه مش متشغّل (قبل تشغيل site-settings.sql)
    if (error.code === "42P01") {
      return { ok: false, missing: true, requests: [] };
    }
    /*
     * 🛡️ عمود internal_note اتضاف في Sprint 3. لو السكربت لسه ما اتنفّذش على
     * البيئة، الاستعلام بيفشل كله (42703) والصفحة تقع. عشان كده بنرجع نقرا
     * الأعمدة القديمة من غير العمود الجديد، والملاحظة الإدارية تفضل فاضية
     * لحد ما السكربت يتنفّذ — بنفس أسلوب الحماية اللي في قراءة إعدادات الموقع.
     */
    if (error.code === "42703") {
      const fallback = await supabase
        .from(SUPPORT_TABLE)
        .select(
          [
            "id",
            "created_at",
            "employee_id",
            "employee_email",
            "employee_name",
            "employee_role",
            "request_type",
            "new_email",
            "status",
            "reviewed_by",
            "reviewed_at",
            "review_note",
            "message",
          ].join(", ")
        )
        .order("created_at", { ascending: false });

      if (fallback.error) throw new Error(fallback.error.message);
      const rows = (fallback.data || []).map((row) => ({
        ...row,
        internal_note: null,
        new_email: row.request_type === "email" ? row.new_email : null,
      }));
      return { ok: true, requests: rows };
    }
    throw new Error(error.message);
  }

  /*
   * 🔐 حماية: عمود new_email بيخزّن كلمة المرور الجديدة **مشفّرة** في حالة
   * طلبات الباسوورد. الإيميل الجديد في طلبات الإيميل هو نص عادي.
   * بنمرّر للواجهة الإيميل الجديد بس في حالة طلبات الإيميل، ومش بنبعت
   * كلمة المرور المشفّرة للمتصفح خالص.
   */
  const requests = (data || []).map((row) => ({
    ...row,
    new_email: row.request_type === "email" ? row.new_email : null,
  }));

  return { ok: true, requests };
}
