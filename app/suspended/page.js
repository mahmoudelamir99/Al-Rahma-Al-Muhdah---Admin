import Link from "next/link";
import { IconAlert, IconLock } from "@/components/icons";

export const metadata = { title: "الحساب موقوف | لوحة التحكم" };

/**
 * صفحة "الحساب موقوف".
 *
 * الموظف اللي is_active = false بتيجي هنا بدل ما يتطرد للشاشة الرئيسية من
 * غير أي تفسير. الصفحة ثابتة (Static) ومفيش فيها أي منطق — مجرد رسالة واضحة
 * + زرار تسجيل خروج، عشان ميحصلش أي loop مع الـ middleware.
 */
export default function SuspendedPage() {
  return (
    <main className="grid min-h-[100dvh] place-items-center bg-surface-200 px-4">
      <div className="w-full max-w-md rounded-3xl border-amber-200 bg-white p-7 text-center shadow-lift sm:p-9">
        <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-amber-100 text-amber-700">
          <IconAlert className="h-6 w-6" />
        </span>

        <h1 className="mt-5 text-lg font-extrabold text-brand-900 sm:text-xl">
          تم إيقاف حسابك
        </h1>

        <p className="mt-3 text-[14px] font-semibold leading-relaxed text-brand-900/75">
          تم إيقاف حسابك، راجع الإدارة.
          <br />
          لو شايف إن ده حصل بالغلط، كلّم المدير العام لإعادة تفعيل الحساب.
        </p>

        <div className="mt-6 flex-col gap-2.5 sm:flex-row sm:justify-center">
          <a
            href="/auth/logout"
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-brand-700 px-5 py-2.5 text-[13.5px] font-bold text-white transition-colors hover:bg-brand-800"
          >
            <IconLock className="h-4 w-4" />
            تسجيل الخروج
          </a>
          <Link
            href="/"
            className="inline-flex items-center justify-center rounded-xl bg-surface-300 px-5 py-2.5 text-[13.5px] font-bold text-brand-900/80 transition-colors hover:bg-surface-400"
          >
            رجوع لشاشة الدخول
          </Link>
        </div>
      </div>
    </main>
  );
}
