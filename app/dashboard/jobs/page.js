import JobsTable from "@/components/jobs/JobsTable";
import { listJobs } from "@/lib/jobs";
import { IconBriefcase, IconAlert } from "@/components/icons";
import { requirePermission } from "@/lib/rbac";
import { redirect } from "next/navigation";

export const metadata = { title: "إدارة الوظائف | لوحة التحكم" };

/* نفس منطق الرئيسية: كاش قصير بدل البناء الكامل في كل تنقّل */
export const revalidate = 15;

export default async function JobsPage() {
  const access = await requirePermission("jobs");
  if (!access.ok) redirect(access.denied ? "/dashboard?denied=1" : "/");
  let jobs = [];
  let error = null;

  try {
    jobs = await listJobs();
  } catch (err) {
    error = err?.message || "تعذّر تحميل الوظائف.";
  }

  return (
    <div className="space-y-6">
      {/* ترويسة القسم */}
      <section className="glass-light rounded-3xl p-6 sm:p-7">
        <div className="flex items-start gap-4">
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-brand-50 text-brand-700">
            <IconBriefcase className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <h1 className="text-lg font-extrabold text-brand-900 sm:text-xl">إدارة الوظائف</h1>
            <p className="mt-2 max-w-[42rem] text-[14px] font-semibold leading-relaxed text-brand-900/75">
              إضافة وتعديل وحذف الوظائف المعروضة على الموقع. عدد المتقدمين بيتحسب
              أوتوماتيك من طلبات التوظيف الفعلية.
            </p>
          </div>
        </div>
      </section>

      {/* لو الجدول لسه مش موجود في Supabase */}
      {error ? (
        <section className="rounded-3xl border-amber-200 bg-amber-50 p-6">
          <div className="flex items-start gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-amber-100 text-amber-700">
              <IconAlert className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <h2 className="text-[15.5px] font-extrabold text-amber-900">
                جدول الوظائف لسه ما اتنفّذش على Supabase
              </h2>
              <p className="mt-1.5 text-[13.5px] font-semibold leading-relaxed text-amber-900/90">
                شغّل ملف <code className="rounded bg-amber-100 px-1.5 py-0.5">supabase/jobs.sql</code>{" "}
                من Supabase → SQL Editor، وبعدين اعمل تحديث للصفحة.
              </p>
              <p
                className="mt-2 break-words rounded-xl bg-surface-300/80 px-3 py-2 text-[12px] font-semibold text-amber-900/90"
                dir="ltr"
              >
                {error}
              </p>
            </div>
          </div>
        </section>
      ) : (
        <JobsTable jobs={jobs} />
      )}
    </div>
  );
}
