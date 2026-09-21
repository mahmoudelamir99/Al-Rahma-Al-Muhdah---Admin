/**
 * ثوابت واجهة طلبات التوظيف — **آمنة للاستخدام في مكوّنات العميل**.
 * ---------------------------------------------------------------------------
 * 🐛 إصلاح حرج (نفس مشكلة صفحة الدعم):
 * `lib/applications.js` بيستورد `getSupabaseAdmin` من `lib/supabase/admin.js`
 * (اللي فيه حاجز أمان بيرمي Exception في المتصفح). والحالات/الدوال النقية
 * كانت جوّه نفس الملف، فمكوّنات العميل (ApplicationsTable / ApplicantModal)
 * كانت بتجرّ الاستيراد السيري للـ client bundle وتسقّع الصفحة أثناء الهيدريشن.
 *
 * الحل: الحالات والدوال النقية اتنقلت هنا، والعميل بيستورد منها. أما
 * `listApplications` (السيرفرية) فضلت في lib/applications.js.
 */

/** الحالات المعتمدة — نفسها اللي في قاعدة البيانات والموقع */
export const APPLICATION_STATUSES = [
  { value: "pending", label: "جديد", tone: "amber" },
  { value: "reviewed", label: "قيد المراجعة", tone: "blue" },
  { value: "needs_info", label: "مطلوب استكمال بيانات", tone: "purple" },
  { value: "accepted", label: "مقبول", tone: "emerald" },
  { value: "rejected", label: "مرفوض", tone: "rose" },
  { value: "cancelled", label: "ملغي", tone: "slate" },
];

export function statusMeta(value) {
  return APPLICATION_STATUSES.find((s) => s.value === value) || APPLICATION_STATUSES[0];
}
