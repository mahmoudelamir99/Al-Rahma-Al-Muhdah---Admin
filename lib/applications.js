import { getSupabaseAdmin, APPLICATIONS_TABLE } from "@/lib/supabase/admin";

/**
 * بيانات طلبات التوظيف في لوحة التحكم.
 * ---------------------------------------------------------------------------
 * قراءة كاملة لجدول الطلبات مرتبة بالأحدث. الجدول ده مستخدم في:
 *   - جدول العرض (components/applications/ApplicationsTable)
 *   - عدّادات الحالات في شريط الفلترة
 *   - مودال التفاصيل الكاملة
 *
 * ملاحظة أداء: بنقرأ كل الأعمدة مرة واحدة ونسلّمها للعميل. عدد الطلبات هنا
 * محدود (طلبات تقديم حقيقية)، والفلترة والبحث بيحصلوا في المتصفح فوراً
 * بلا أي رحلة شبكة إضافية — ده اللي بيخلي البحث والإحساس سريع جداً.
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

/** كل الطلبات مرتبة بالأحدث */
export async function listApplications() {
  const supabase = getSupabaseAdmin();

  const { data, error } = await supabase
    .from(APPLICATIONS_TABLE)
    .select(
      [
        "id",
        "created_at",
        "full_name",
        "phone_number",
        "national_id",
        "age",
        "gender",
        "marital_status",
        "governorate",
        "city",
        "address",
        "education_level",
        "specialization",
        "military_status",
        "experience_years",
        "previous_companies",
        "expected_salary",
        "selected_job",
        "status",
        "hr_notes",
        "rejection_reason",
        "completion_fields",
        "reviewed_by",
        "reviewed_at",
      ].join(", ")
    )
    .order("created_at", { ascending: false });

  if (error) {
    // لو الأعمدة الجديدة لسه مش موجودة (قبل تشغيل supabase/applications.sql)،
    // بنرجع لقراءة الأعمدة الأساسية عشان الصفحة ما تكسرش.
    if (error.code === "42703") {
      return listApplicationsFallback(supabase);
    }
    throw new Error(error.message);
  }

  return data || [];
}

/** قراءة احتياطية بالأعمدة الأساسية فقط (قبل تشغيل ملف SQL) */
async function listApplicationsFallback(supabase) {
  const { data, error } = await supabase
    .from(APPLICATIONS_TABLE)
    .select(
      [
        "id",
        "created_at",
        "full_name",
        "phone_number",
        "national_id",
        "age",
        "gender",
        "marital_status",
        "governorate",
        "city",
        "address",
        "education_level",
        "specialization",
        "military_status",
        "experience_years",
        "previous_companies",
        "expected_salary",
        "selected_job",
        "status",
        "rejection_reason",
      ].join(", ")
    )
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);

  // بنوحّد الشكل: الأعمدة الناقصة بترجع null عشان الكومبوننتات تتعامل معاها
  return (data || []).map((row) => ({
    ...row,
    hr_notes: null,
    reviewed_by: null,
    reviewed_at: null,
    completion_fields: [],
  }));
}

/** عدّادات الحالات — بتُستخدم في شريط الفلترة */
export function countByStatus(applications = []) {
  const counts = { all: applications.length };
  for (const s of APPLICATION_STATUSES) counts[s.value] = 0;
  for (const app of applications) {
    const key = app.status || "pending";
    counts[key] = (counts[key] || 0) + 1;
  }
  return counts;
}

/** أسماء الوظائف المتاحة للفلترة (بدون تكرار) */
export function uniqueJobs(applications = []) {
  return [...new Set(applications.map((a) => (a.selected_job || "").trim()).filter(Boolean))].sort();
}
