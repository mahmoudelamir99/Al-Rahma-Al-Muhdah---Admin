import { redirect } from "next/navigation";
import { getCurrentAdminContext } from "@/lib/rbac";
import AdminShell from "@/components/AdminShell";
import SupportNotice from "@/components/SupportNotice";

/**
 * هيكل اللوحة — محمي على مستويين:
 *  1. middleware بيمنع أي دخول من غير جلسة.
 *  2. التحقق اللي هنا بيعيد التأكيد من السيرفر (دفاع في العمق).
 */
export const metadata = {
  title: "لوحة التحكم | الرحمة المهداة للتوظيف",
};

export default async function DashboardLayout({ children }) {
  const context = await getCurrentAdminContext();

  /*
   * ترتيب الطرد مقصود:
   *  - forceLogout → الحساب اتصفر باسوورد/اتغير، فالطرد عن طريق /auth/logout.
   *  - suspended  → الموظف is_active = false → صفحة رسالة واضحة.
   *  - غير كده   → شاشة الدخول زي المعتاد.
   */
  if (!context.ok) {
    if (context.forceLogout) redirect("/auth/logout");
    if (context.suspended) redirect("/suspended");
    redirect("/");
  }

  return (
    <AdminShell
      user={{ email: context.user.email, displayName: context.admin?.display_name }}
      admin={context.admin}
      isSuperAdmin={context.isSuperAdmin}
    >
      <SupportNotice notice={context.user.app_metadata?.support_notice} />
      {children}
    </AdminShell>
  );
}
