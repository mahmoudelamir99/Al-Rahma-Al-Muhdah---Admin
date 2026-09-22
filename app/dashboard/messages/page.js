import MessagesTable from "@/components/messages/MessagesTable";
import { listContactMessages } from "@/lib/contactMessages";
import { IconMail, IconAlert } from "@/components/icons";
import { requirePermissionAction } from "@/lib/rbac";
import { redirect } from "next/navigation";

export const metadata = { title: "رسائل الزوار | لوحة التحكم" };

/*
 * كاش قصير زي باقي أقسام اللوحة — الحذف بينادي revalidatePath فالصفحة تتحدّث فورًا.
 */
export const revalidate = 15;

export default async function MessagesPage() {
  // العرض محمي بصلاحية messages.view، والحذف بصلاحية messages.delete
  const access = await requirePermissionAction("messages", "view");
  if (!access.ok) redirect(access.denied ? "/dashboard?denied=1" : "/");

  const canDelete = access.isSuperAdmin || access.admin?.permissions?.messages?.delete === true;

  let messages = [];
  let error = null;

  try {
    const result = await listContactMessages();
    if (result?.missing) {
      error = "جدول الرسائل (contact_messages) مش متشغّل على قاعدة البيانات. شغّل ملف supabase/production-all.sql.";
    } else {
      messages = result?.messages || [];
    }
  } catch (err) {
    error = err?.message || "تعذّر تحميل الرسائل.";
  }

  return (
    <div className="space-y-6">
      {/* ترويسة القسم */}
      <section className="glass-light rounded-3xl p-6 sm:p-7">
        <div className="flex items-start gap-4">
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-brand-50 text-brand-700">
            <IconMail className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <h1 className="text-lg font-extrabold text-brand-900 sm:text-xl">رسائل الزوار</h1>
            <p className="mt-2 max-w-[42rem] text-[14px] font-semibold leading-relaxed text-brand-900/75">
              الرسائل اللي بيبعتها الزوار من نموذج «تواصل معنا» في الموقع. اضغط على أي
              رسالة لعرض نصها كامل، وتقدر تحذف الرسائل القديمة لتنظيف القائمة.
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
              <h2 className="text-[15.5px] font-extrabold text-amber-900">تعذّر تحميل الرسائل</h2>
              <p className="mt-2 break-words rounded-xl bg-surface-300/80 px-3 py-2 text-[12px] font-semibold text-amber-900/90">
                {error}
              </p>
            </div>
          </div>
        </section>
      ) : (
        <MessagesTable messages={messages} canDelete={canDelete} />
      )}
    </div>
  );
}
