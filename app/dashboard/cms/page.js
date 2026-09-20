import CmsPanel from "@/components/cms/CmsPanel";
import { getSiteSettings } from "@/lib/actions/siteSettings";
import { IconLayout } from "@/components/icons";
import { requirePermission } from "@/lib/rbac";
import { redirect } from "next/navigation";

export const metadata = { title: "إدارة محتوى الموقع | لوحة التحكم" };

export default async function CmsPage() {
  const access = await requirePermission("cms");
  if (!access.ok) redirect(access.denied ? "/dashboard?denied=1" : "/");
  const result = await getSiteSettings();
  const settings = result?.settings || {};

  return (
    <div className="space-y-6">
      {/* ترويسة القسم */}
      <section className="glass-light rounded-3xl p-6 sm:p-8">
        <div className="flex items-start gap-4">
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-brand-50 text-brand-700">
            <IconLayout className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <h1 className="text-lg font-extrabold text-brand-900 sm:text-xl">إدارة محتوى الموقع</h1>
            <p className="mt-2 max-w-[42rem] text-[14px] font-semibold leading-relaxed text-brand-900/75">

            </p>
          </div>
        </div>

        <div className="divider-soft my-6" />

        <CmsPanel initialSettings={settings} />
      </section>
    </div>
  );
}
