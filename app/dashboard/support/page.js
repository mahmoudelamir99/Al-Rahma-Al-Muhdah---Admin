import SupportTable from "@/components/support/SupportTable";
import { listSupportRequests } from "@/lib/support";
import { IconHeadset, IconAlert } from "@/components/icons";
import { getCurrentAdminContext, requirePermission } from "@/lib/rbac";
import { redirect } from "next/navigation";

export const metadata = { title: "طلبات الدعم الفني | لوحة التحكم" };

export default async function SupportPage() {
  const access = await requirePermission("support");
  if (!access.ok) redirect(access.denied ? "/dashboard?denied=1" : "/");
  let requests = [];
  let missingTable = false;
  let error = null;

  try {
    const result = await listSupportRequests();
    requests = result.requests || [];
    missingTable = !!result.missing;
  } catch (err) {
    error = err?.message || "تعذّر تحميل الطلبات.";
  }

  /*
   * هل المستخدم الحالي هو المدير العام؟ (المراجعة للمدير العام بس)
   * 🐛 إصلاح: قبل كده كان بيفحص إيميل متغير SUPERV_ADMIN_EMAIL بس، وده
   * مش متسق مع `requireSuperAdminContext` اللي بيعد حساب role=super_admin
   * كمان كمدير عام. النتيجة إن مدير عام حقي (بدور super_admin في القاعدة
   * بس مش نفس الإيميل المضبوط في الـ env) ما كانش يقدر يراجع الطلبات.
   * دلوقتي بنستخدم نفس السياق المركزي (getCurrentAdminContext).
   */
  const context = await getCurrentAdminContext();
  const canReview = Boolean(context.ok && context.isSuperAdmin);

  return (
    <div className="space-y-6">
      <section className="glass-light rounded-3xl p-6 sm:p-7">
        <div className="flex items-start gap-4">
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-brand-50 text-brand-700">
            <IconHeadset className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <h1 className="text-lg font-extrabold text-brand-900 sm:text-xl">طلبات الدعم الفني</h1>
            <p className="mt-2 max-w-[42rem] text-[14px] font-semibold leading-relaxed text-brand-900/75">
              طلبات الموظفين على النظام (تغيير كلمة المرور أو البريد الإلكتروني).
              افتح أي طلب عشان تشوف بيانات الموظف كاملة قبل ما تدوس «موافقة وتنفيذ»
              أو «رفض».
            </p>
          </div>
        </div>
      </section>

      {missingTable ? (
        <section className="rounded-3xl border-amber-200 bg-amber-50 p-6">
          <div className="flex items-start gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-amber-100 text-amber-700">
              <IconAlert className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <h2 className="text-[15.5px] font-extrabold text-amber-900">جدول طلبات الدعم مش موجود</h2>
              <p className="mt-2 text-[13.5px] font-semibold leading-relaxed text-amber-900/85">
                شغّل ملف <span dir="ltr" className="font-bold">supabase/site-settings.sql</span> من
                Supabase → SQL Editor، وبعدها احدّث الصفحة.
              </p>
            </div>
          </div>
        </section>
      ) : error ? (
        <section className="rounded-3xl border-amber-200 bg-amber-50 p-6">
          <p className="break-words text-[13px] font-semibold text-amber-900/90" dir="ltr">{error}</p>
        </section>
      ) : (
        <SupportTable requests={requests} canReview={canReview} />
      )}
    </div>
  );
}
