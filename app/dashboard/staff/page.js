import StaffPanel from "@/components/staff/StaffPanel";
import { IconUsers, IconAlert } from "@/components/icons";
import { listStaff } from "@/lib/staff";
import { requireSuperAdminContext } from "@/lib/rbac";
import { redirect } from "next/navigation";

export const metadata = { title: "الموظفين والصلاحيات | لوحة التحكم" };

export default async function StaffPage() {
  const access = await requireSuperAdminContext();
  if (!access.ok) redirect(access.denied ? "/dashboard?denied=1" : "/");
  const result = await listStaff();

  return (
    <div className="space-y-6">
      <section className="glass-light rounded-3xl p-6 sm:p-8">
        <div className="flex items-start gap-4">
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-brand-50 text-brand-700"><IconUsers className="h-5 w-5" /></span>
          <div className="min-w-0"><h1 className="text-lg font-extrabold text-brand-900 sm:text-xl">الموظفين والصلاحيات</h1></div>
        </div>
      </section>
      {result.missing ? <section className="rounded-3xl border-amber-200 bg-amber-50 p-6"><div className="flex items-start gap-3"><IconAlert className="h-5 w-5 text-amber-700" /><p className="text-sm font-bold text-amber-900">شغّل تعديلات staff-rbac.sql على جدول admins الأول.</p></div></section> : <StaffPanel initialStaff={result.staff || []} />}
    </div>
  );
}
