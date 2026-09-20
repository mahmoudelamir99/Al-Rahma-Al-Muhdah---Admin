"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ADMIN_BRAND, NAV_ITEMS } from "@/lib/adminConfig";
import { permissionForPath } from "@/lib/rbacConfig";
import { NavIcon, IconClose, IconExternal, IconMenu, IconBell } from "@/components/icons";
import LogoutButton from "@/components/LogoutButton";

/** اللوجو الرسمي داخل الـ Sidebar */
function BrandMark() {
  return (
    <div className="flex min-w-0 items-center gap-3">
      <span className="grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-2xl bg-white shadow-soft ring-1 ring-surface-400">
        <img
          src="/logo.png"
          alt={ADMIN_BRAND.name}
          width={48}
          height={48}
          className="h-10 w-10 object-contain"
        />
      </span>
      <span className="min-w-0">
        <span className="block truncate text-[15px] font-extrabold leading-tight text-brand-900">
          {ADMIN_BRAND.shortName}
        </span>
        <span className="block truncate text-[12px] font-semibold leading-tight text-brand-900/70">
          {ADMIN_BRAND.panelName}
        </span>
      </span>
    </div>
  );
}

/*
 * ⚡ الأداء: كل عنصر لينك في القائمة كان motion.span بـ layoutId مشترك
 * (nav-active) على كل عنصر — يعني لكل عنصر قياس مستمر للـ layout، وحساب
 * إعادة ترتيب في كل تغيير، وحركة بخصائص بتسبب layout. ده كان بيسقّل
 * الإحساس بالليّ. بدل كده: خلفية ثابتة + حركة على transform/opacity بس.
 */
const NAV_ITEM_BASE =
  "group relative flex items-center gap-3 rounded-2xl px-3.5 py-3 text-[14.5px] font-bold transition-colors duration-150";

/** محتوى القائمة — مستخدم في الديسكستوب وفي درج الموبايل */
function NavList({ pathname, onNavigate, permissions = {}, isSuperAdmin = false }) {
  return (
    <nav className="space-y-1.5" aria-label="القائمة الرئيسية">
      {NAV_ITEMS.filter((item) => {
        const permission = permissionForPath(item.href);
        return isSuperAdmin || !permission || permissions?.[permission] === true;
      }).map((item) => {
        const active = pathname === item.href;
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            prefetch={false}
            aria-current={active ? "page" : undefined}
            className={`${NAV_ITEM_BASE} ${
              active
                ? "bg-brand-50 text-brand-800"
                : "text-brand-900/75 hover:bg-surface-300/80 hover:text-brand-900"
            }`}
          >
            {active && (
              <span
                aria-hidden="true"
                className="absolute inset-y-2.5 right-0 w-[3px] rounded-full bg-copper-500"
              />
            )}
            <span
              className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl transition-colors duration-150 ${
                active
                  ? "bg-brand-800 text-white"
                  : "bg-surface-300 text-brand-900/70 group-hover:text-brand-800"
              }`}
            >
              <NavIcon name={item.icon} className="h-[18px] w-[18px]" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate">{item.label}</span>
              <span
                className={`block truncate text-[12px] font-semibold ${
                  active ? "text-brand-900/70" : "text-brand-900/60"
                }`}
              >
                {item.hint}
              </span>
            </span>
          </Link>
        );
      })}
    </nav>
  );
}

function SidebarFooter() {
  return (
    <div className="mt-6 space-y-3 border-t border-brand-100 pt-5">
      <a
        href={ADMIN_BRAND.siteUrl}
        target="_blank"
        rel="noreferrer"
        className="flex items-center justify-between gap-2 rounded-2xl bg-surface-300/70 px-3.5 py-3 text-[13px] font-bold text-brand-900/80 transition-colors duration-150 hover:bg-surface-400/70 hover:text-brand-900"
      >
        <span>زيارة الموقع</span>
        <IconExternal className="h-4 w-4 shrink-0 text-brand-900/60" />
      </a>
      <LogoutButton />
    </div>
  );
}

export default function AdminShell({ user, admin, isSuperAdmin = false, children }) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  const closeMobile = useCallback(() => setMobileOpen(false), []);

  // نقفل درج الموبايل أول ما العرض يكبّر
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    const onChange = (event) => {
      if (event.matches) closeMobile();
    };
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [closeMobile]);

  // نقفل الدرج عند تغيير الصفحة
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  // منع سكرول الصفحة الخلفية وقت فتح الدرج
  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

  // قفل بـ Escape
  useEffect(() => {
    if (!mobileOpen) return;
    const onKey = (event) => {
      if (event.key === "Escape") closeMobile();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [mobileOpen, closeMobile]);

  const currentItem = NAV_ITEMS.find((item) => item.href === pathname);
  const initial = (user?.email || "A").trim().charAt(0).toUpperCase();

  return (
    <div className="relative min-h-[100dvh] w-full overflow-x-hidden bg-surface-200">
      {/* خلفية اللوحة — تدرجات ثابتة بدون أي أنيميشن (أداء أسرع) */}
      <div className="pointer-events-none fixed inset-0 aura-layer" aria-hidden="true" />
      <div
        className="pointer-events-none fixed inset-0 bg-gradient-to-b from-white/45 via-transparent to-surface-300/50"
        aria-hidden="true"
      />

      <div className="relative flex w-full">
        {/* ============ Sidebar — ديسكستوب ============ */}
        <aside className="sticky top-0 hidden h-[100dvh] w-[17.5rem] shrink-0 flex-col border-l border-brand-100 bg-white/95 px-4 py-5 lg:flex">
          <BrandMark />

          <div className="mt-7 flex-1 overflow-y-auto pb-2">
            <p className="mb-2.5 px-1 text-[11px] font-bold uppercase tracking-[0.16em] text-brand-900/55">
              التنقل
            </p>
            <NavList pathname={pathname} permissions={admin?.permissions} isSuperAdmin={isSuperAdmin} />
          </div>

          <SidebarFooter />
        </aside>

        {/* ============ Sidebar — درج الموبايل ============ */}
        {mobileOpen && (
          <>
            <div
              onClick={closeMobile}
                className="fixed inset-0 z-40 bg-brand-950/25 lg:hidden"
                aria-hidden="true"
              />
              <aside
                role="dialog"
                aria-modal="true"
                aria-label="قائمة التنقل"
                className="fixed inset-y-0 right-0 z-50 flex w-[17.5rem] max-w-[86vw] flex-col border-l border-brand-100 bg-white px-4 py-5 shadow-lift lg:hidden"
              >
                <div className="flex items-center justify-between gap-3">
                  <BrandMark />
                  <button
                    type="button"
                    onClick={closeMobile}
                    aria-label="إغلاق القائمة"
                    className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-surface-300 text-brand-900/80 transition-colors duration-150 hover:bg-surface-400 hover:text-brand-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40"
                  >
                    <IconClose className="h-[18px] w-[18px]" />
                  </button>
                </div>

                <div className="mt-7 flex-1 overflow-y-auto pb-2">
                  <p className="mb-2.5 px-1 text-[11px] font-bold uppercase tracking-[0.16em] text-brand-900/55">
                    التنقل
                  </p>
                  <NavList pathname={pathname} onNavigate={closeMobile} permissions={admin?.permissions} isSuperAdmin={isSuperAdmin} />
                </div>

                <SidebarFooter />
              </aside>
          </>
        )}

        {/* ============ العمود الرئيسي ============ */}
        <div className="flex min-h-[100dvh] min-w-0 flex-1 flex-col">
          {/* Topbar */}
          <header className="sticky top-0 z-30 border-b border-brand-100 bg-white/95">
            <div className="flex h-16 w-full items-center gap-3 px-4 sm:px-6">
              {/* زرار الهامبرجر — موبايل/تابلت بس */}
              <button
                        type="button"
                        onClick={() => setMobileOpen(true)}
                        aria-label="فتح القائمة"
                        aria-expanded={mobileOpen}
                        className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border-brand-100 bg-surface-300/80 text-brand-900/85 shadow-soft transition-colors duration-150 hover:bg-surface-400 hover:text-brand-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40 lg:hidden"
              >
                <IconMenu className="h-5 w-5" />
              </button>

              {/* عنوان الصفحة الحالية */}
              <div className="min-w-0 flex-1">
                  <p className="truncate text-[15px] font-extrabold leading-tight text-brand-900">
                  {currentItem?.label || "لوحة التحكم"}
                </p>
                <p className="hidden truncate text-[12px] font-semibold leading-tight text-brand-900/70 sm:block">
                  {currentItem?.hint || "إدارة النظام"}
                </p>
              </div>

              {/* جرس (مكانه محفوظ للمرحلة الجاية) */}
              <span className="relative hidden shrink-0 sm:block">
                <button
                  type="button"
                  aria-label="التنبيهات (قريباً)"
                  title="التنبيهات — قريباً"
                  className="grid h-10 w-10 cursor-default place-items-center rounded-xl border-brand-100 bg-surface-300/80 text-brand-900/60 shadow-soft"
                >
                  <IconBell className="h-[18px] w-[18px]" />
                </button>
                <span className="absolute -right-0.5 -top-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-copper-500 px-1 text-[10px] font-bold text-white">
                  0
                </span>
              </span>

              {/* بيانات المستخدم */}
              <div className="flex shrink-0 items-center gap-2.5 rounded-2xl border-brand-100 bg-white py-1.5 pl-1.5 pr-3 shadow-soft">
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-brand-800 text-[13px] font-bold text-white">
                  {initial}
                </span>
                <span className="hidden min-w-0 md:block">
                  <span
                    className="block max-w-[13rem] truncate text-[12.5px] font-bold leading-tight text-brand-900"
                    dir="ltr"
                  >
                    {user?.email || "—"}
                  </span>
                  <span className="block text-[11.5px] font-bold leading-tight text-copper-700">
                    مدير عام
                  </span>
                </span>
                <LogoutButton variant="icon" />
              </div>
            </div>
          </header>

          {/* المحتوى */}
          <main className="w-full flex-1 px-4 py-6 sm:px-6 sm:py-8">
            <div className="mx-auto w-full max-w-[80rem]">
              {children}
            </div>
          </main>

          <footer className="border-t border-brand-100 px-4 py-5 sm:px-6">
            <p className="text-center text-[12px] font-semibold text-brand-900/65">
              {ADMIN_BRAND.name} — {ADMIN_BRAND.panelName} © {new Date().getFullYear()}
            </p>
          </footer>
        </div>
      </div>
    </div>
  );
}
