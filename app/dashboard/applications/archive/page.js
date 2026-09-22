import ArchiveTable from "@/components/applications/ArchiveTable";
import { listArchivedApplications } from "@/lib/applications";
import { IconArchive, IconAlert } from "@/components/icons";
import { requirePermission } from "@/lib/rbac";
import { redirect } from "next/navigation";

export const metadata = { title: "أرشيف الطلبات | لوحة التحكم" };

/*
 * كاش قصير زي صفحة الطلبات — أي استعادة أو حذف بينادي revalidatePath فبتتحدّث.
 */
export const revalidate = 15;

export default async function ApplicationsArchivePage() {
  /*
   * نفس صلاحية قسم طلبات التوظيف — أي موظف عنده عرض الطلبات يقدر يدخل
   * الأرشيف ويشوف ويستعيد. أما "الحذف النهائي" فمحمي على السيرفر
   * بـ requireSuperAdminContext جوه الـ Server Action نفسه.
   */
  const access = await requirePermission("applications");
  if (!access.ok) redirect(access.denied ? "/dashboard?denied=1" : "/");

  const isSuperAdmin = access.isSuperAdmin === true;

  let applications = [];
  let error = null;

  try {
    applications = await listArchivedApplications();
  } catch (err) {
    error = err?.message || "تعذّر تحميل الأرشيف.";
  }

  return (
    <div className="space-y-6">
      {/* ترويسة القسم */}
      <section className="glass-light rounded-3xl p-6 sm:p-7">
        <div className="flex items-start gap-4">
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-brand-50 text-brand-700">
            <IconArchive className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <h1 className="text-lg font-extrabold text-brand-900 sm:text-xl">أرشيف الطلبات</h1>
            <p className="mt-2 max-w-[42rem] text-[14px] font-semibold leading-relaxed text-brand-900/75">
              الطلبات اللي اتحذفت بتحفظ هنا بدل ما تتمسح نهائيًا. تقدر تفتح أي طلب
              وتشوف بياناته، وتستعيده للقائمة الرئيسية فورًا.
              {isSuperAdmin
                ? " كمدير عام، عندك كمان زرار «حذف نهائي» لمسح الطلب من قاعدة البيانات نهائيًا."
                : ""}
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
              <h2 className="text-[15.5px] font-extrabold text-amber-900">تعذّر تحميل الأرشيف</h2>
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
        <ArchiveTable applications={applications} isSuperAdmin={isSuperAdmin} />
      )}
    </div>
  );
}
