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
  if (!context.ok) redirect(context.forceLogout ? "/auth/logout" : "/");

  return (
    <AdminShell user={{ email: context.user.email }} admin={context.admin} isSuperAdmin={context.isSuperAdmin}>
      <SupportNotice notice={context.user.app_metadata?.support_notice} />
      {children}
    </AdminShell>
  );
}
