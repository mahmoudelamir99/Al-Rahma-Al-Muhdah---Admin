import { getSupabaseAdmin, APPLICATIONS_TABLE } from "@/lib/supabase/admin";

export const JOBS_TABLE = "jobs";

/**
 * كل الوظائف مرتبة بالأحدث.
 *
 * ⚡ ملاحظة أداء مهمة:
 * قبل كده كنا بنجيب **كل صفوف جدول الطلبات** بـ select("selected_job") من
 * غير limit، وبعدين نعدّها في الجافاسكريبت. مع نمو جدول الطلبات ده بيبقى
 * نقل بيانات ضخم + معالجة في السيرفر على كل فتح للصفحة، وده كان بيسقّع
 * اللوحة. دلوقتي بنطلب من Supabase **العدد بس** (count: "exact") لكل وظيفة
 * على حدة — الرحلة نفسها أسرع، والذاكرة المستخدمة أقل، والنقل أكتر بكتير
 * لأنه مش بينقل صفوف خالص (رقم واحد بس).
 */
export async function listJobs() {
  const supabase = getSupabaseAdmin();

  const { data: jobs, error } = await supabase
    .from(JOBS_TABLE)
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    const missing = ["42P01", "PGRST205"].includes(error.code);
    throw new Error(missing ? "جدول الوظائف غير موجود. نفّذ production-all.sql في Supabase SQL Editor." : error.message);
  }

  const rows = jobs || [];
  if (rows.length === 0) return [];

  // عدد المتقدمين الفعلي لكل وظيفة — أرقام بس، مفيش نقل صفوف
  const counts = await Promise.all(
    rows.map(async (job) => {
      const title = (job.title || "").trim();
      if (!title) return 0;
      const { count, error: countError } = await supabase
        .from(APPLICATIONS_TABLE)
        .select("*", { count: "exact", head: true })
        .eq("selected_job", title);
      // لو جدول الطلبات لسه مش متاح، منكسرش الصفحة — نرجّع صفر
      return countError ? 0 : count || 0;
    })
  );

  return rows.map((job, index) => ({
    ...job,
    applicants: counts[index] || 0,
  }));
}

/** إحصائيات سريعة للرئيسية */
export async function getJobsStats() {
  const jobs = await listJobs();

  return {
    total: jobs.length,
    available: jobs.filter((j) => j.status === "available").length,
    closed: jobs.filter((j) => j.status === "closed").length,
    requiredTotal: jobs.reduce((sum, j) => sum + (j.required_count || 0), 0),
    applicantsTotal: jobs.reduce((sum, j) => sum + (j.applicants || 0), 0),
  };
}
