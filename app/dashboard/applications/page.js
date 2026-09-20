import ApplicationsTable from "@/components/applications/ApplicationsTable";
import { listApplications } from "@/lib/applications";
import { IconInbox, IconAlert } from "@/components/icons";
import { requirePermission } from "@/lib/rbac";
import { redirect } from "next/navigation";

export const metadata = { title: "طلبات التوظيف | لوحة التحكم" };

/*
 * كاش قصير بدل البناء الكامل مع كل تنقّل (زي باقي أقسام اللوحة).
 * أي تغيير من الـ HR بينادي revalidatePath فالصفحة بتتحدّث فوراً.
 */
export const revalidate = 15;

export default async function ApplicationsPage() {
  const access = await requirePermission("applications");
  if (!access.ok) redirect(access.denied ? "/dashboard?denied=1" : "/");
  let applications = [];
  let error = null;

  try {
    applications = await listApplications();
  } catch (err) {
    error = err?.message || "تعذّر تحميل الطلبات.";
  }

  return (
    <div className="space-y-6">
      {/* ترويسة القسم */}
      <section className="glass-light rounded-3xl p-6 sm:p-7">
        <div className="flex items-start gap-4">
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-brand-50 text-brand-700">
            <IconInbox className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <h1 className="text-lg font-extrabold text-brand-900 sm:text-xl">طلبات التوظيف</h1>
            <p className="mt-2 max-w-[42rem] text-[14px] font-semibold leading-relaxed text-brand-900/75">
              كل الطلبات المستلمة من الموقع الأساسي. اضغط على أي طلب لعرض بيانات
              المتقدم كاملة، وتغيير حالته، وتسجيل ملاحظات فريق الموارد البشرية —
              والتغيير بيظهر للمتقدم فوراً في صفحة «تتبع الطلب».
            </p>
          </div>
        </div>
      </section>

      {/* لو حصل خطأ في القراءة */}
      {error ? (
        <section className="rounded-3xl border-amber-200 bg-amber-50 p-6">
          <div className="flex items-start gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-amber-100 text-amber-700">
              <IconAlert className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <h2 className="text-[15.5px] font-extrabold text-amber-900">تعذّر تحميل الطلبات</h2>
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
        <ApplicationsTable applications={applications} />
      )}
    </div>
  );
}
