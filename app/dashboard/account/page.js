import { createSupabaseServerClient } from "@/lib/supabase/server";
import AccountForms from "@/components/account/AccountForms";
import { IconUser } from "@/components/icons";

export const metadata = { title: "حسابي | لوحة التحكم" };

export default async function AccountPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  /*
   * نحدد دور مفتوح الشاشة:
   *   - السوبر أدمن → تعديل مباشر فوري (مفيش طلب لنفسه).
   *   - موظف عادي → نظام الطلبات (طلب للدعم الفني).
   */
  const superEmail = (process.env.SUPER_ADMIN_EMAIL || "").toLowerCase();
  const userEmail = (user?.email || "").toLowerCase();
  const isSuperAdmin = !superEmail || userEmail === superEmail;

  return (
    <div className="space-y-6">
      <section className="glass-light rounded-3xl p-6 sm:p-8">
        <div className="flex items-start gap-4">
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-brand-50 text-brand-700">
            <IconUser className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <h1 className="text-lg font-extrabold text-brand-900 sm:text-xl">حسابي</h1>

          </div>
        </div>

        <div className="divider-soft my-6" />

        <AccountForms email={user?.email || "—"} isSuperAdmin={isSuperAdmin} />
      </section>
    </div>
  );
}
