import { getSupabaseAdmin } from "@/lib/supabase/admin";

/**
 * قراءة طلبات الدعم الفني في لوحة التحكم.
 * ---------------------------------------------------------------------------
 * بترجّع كل الطلبات مرتبة بالأحدث، وحالة "قيد الانتظار" بتتعرض الأول
 * في الواجهة (الفلترة في المتصفح).
 */

export const SUPPORT_TABLE = "support_requests";

/** تسميات أنواع الطلبات */
export const REQUEST_TYPE_LABELS = {
  password: "تغيير كلمة المرور",
  email: "تغيير البريد الإلكتروني",
};

/** تسميات الحالات + ألوانها */
export const SUPPORT_STATUSES = [
  { value: "pending", label: "قيد الانتظار", tone: "amber" },
  { value: "approved", label: "تمت الموافقة", tone: "emerald" },
  { value: "rejected", label: "مرفوض", tone: "rose" },
];

export function supportStatusMeta(value) {
  return SUPPORT_STATUSES.find((s) => s.value === value) || SUPPORT_STATUSES[0];
}

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
        "message",
      ].join(", ")
    )
    .order("created_at", { ascending: false });

  if (error) {
    // الجدول لسه مش متشغّل (قبل تشغيل site-settings.sql)
    if (error.code === "42P01") {
      return { ok: false, missing: true, requests: [] };
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
