/**
 * ثوابت واجهة طلبات الدعم الفني — **آمنة للاستخدام في مكوّنات العميل**.
 * ---------------------------------------------------------------------------
 * 🐛 إصلاح حرج (Page crash في صفحة طلبات الدعم):
 * كانت `lib/support.js` بتحتوي على الثوابت دي **جوّه نفس الملف** اللي فيه
 * `listSupportRequests`، والملف ده بيستورد `getSupabaseAdmin` من
 * `lib/supabase/admin.js` — والملف الأخير فيه حاجز أمان بيرمي Exception لو
 * اتشغّل في المتصفح (حماية لمفتاح الخدمة).
 *
 * النتيجة: أي مكوّن عميل بيستورد `lib/support` (زي SupportTable) كان بيجرّ
 * معاه `lib/supabase/admin` للـ client bundle، فبيرمي فوراً أثناء الـ hydration
 * ويسقّع الصفحة كلها (Application error: a client-side exception).
 *
 * الحل: فصلنا الثوابت النقية (مفيش أي استيراد سيرفر) في الملف ده، والعميل
 * بيستورد منها. أما `listSupportRequests` (السيرفرية) فضلت في lib/support.js.
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
