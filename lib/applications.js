import { getSupabaseAdmin, APPLICATIONS_TABLE } from "@/lib/supabase/admin";

/* ==========================================================================
   بيانات طلبات التوظيف في لوحة التحكم — القائمة الرئيسية + الأرشيف.
   --------------------------------------------------------------------------
   القائمة الرئيسية: الطلبات اللي لسه موجودة (deleted_at is null).
   الأرشيف: الطلبات المحذوفة ناعماً (deleted_at is not null).
   ========================================================================== */

/*
 * الحالات النقية والدوال (statusMeta) اتنقلت لـ `lib/applicationsMeta.js`
 * عشان مكوّنات العميل تستوردها من غير ما تجرّ الاستيراد السيري
 * `getSupabaseAdmin` (اللي بيرمي Exception في المتصفح). بنعيد تصديرها هنا
 * عشان أي كود سيرفر لسه مستورد من `lib/applications` ميكسرش.
 */
export { APPLICATION_STATUSES, statusMeta } from "./applicationsMeta";
import { APPLICATION_STATUSES } from "./applicationsMeta";

const FULL_APPLICATION_COLUMNS = [
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
  "deleted_at",
  "deleted_by",
].join(", ");

/**
 * الطلبات في القائمة الرئيسية = اللي لسه موجودة (مش محذوفة ناعماً).
 * الترتيب بالأحدث، والفلترة والبحث بيحصلوا في المتصفح بعد كده.
 */
export async function listApplications() {
  return readApplications({ archived: false });
}

/**
 * الطلبات في الأرشيف = اللي اتحدفت ناعماً (deleted_at is not null).
 * مرتبة بالأحدث حذفاً عشان الموظف يلاقي آخر اللي اتحذف فوق.
 */
export async function listArchivedApplications() {
  return readApplications({ archived: true });
}

/** قراءة موحّدة (رئيسية أو أرشيف) مع نفس منطق الـ fallback */
async function readApplications({ archived }) {
  const supabase = getSupabaseAdmin();

  let query = supabase.from(APPLICATIONS_TABLE).select(FULL_APPLICATION_COLUMNS);

  /*
   * فلتر الأرشيف:
   *  - القائمة الرئيسية: deleted_at is null (الطلبات الحاضرة).
   *  - الأرشيف: deleted_at not null (الطلبات المحذوفة).
   */
  query = archived ? query.not("deleted_at", "is", null) : query.is("deleted_at", null);

  query = archived
    ? query.order("deleted_at", { ascending: false })
    : query.order("created_at", { ascending: false });

  const { data, error } = await query;

  if (error) {
    // لو الأعمدة الجديدة لسه مش موجودة (قبل تشغيل supabase/applications.sql)،
    // بنرجع لقراءة الأعمدة الأساسية عشان الصفحة ما تكسرش.
    if (error.code === "42703") {
      return listApplicationsFallback(supabase, archived);
    }
    if (["42P01", "PGRST205"].includes(error.code)) {
      throw new Error("جدول طلبات التوظيف غير موجود. نفّذ production-all.sql في Supabase SQL Editor.");
    }
    throw new Error(error.message);
  }

  return data || [];
}

/**
 * قراءة احتياطية بالأعمدة الأساسية فقط (قبل تشغيل ملف SQL).
 * لو عمود deleted_at نفسه مش موجود، مفيش "أرشيف" — فالقائمة الرئيسية بترجع
 * كل الطلبات، والأرشيف بيفضل فاضي (بدل ما الصفحات توقع).
 */
async function listApplicationsFallback(supabase, archived = false) {
  if (archived) return [];

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
    deleted_at: null,
    deleted_by: null,
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
