"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

function IconLogout({ className = "" }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path d="M15 4.8h2.6A2.4 2.4 0 0120 7.2v9.6a2.4 2.4 0 01-2.4 2.4H15" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M10.5 8.2L6.9 12l3.6 3.8M6.9 12H16" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** زرار الخروج — بيقفل الجلسة ويرجّع لشاشة الدخول */
export default function LogoutButton({ variant = "full" }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleLogout() {
    if (loading) return;
    setLoading(true);
    try {
      const supabase = createSupabaseBrowserClient();
      await supabase.auth.signOut();
    } catch {
      // حتى لو فشل النداء، بنرجّع المستخدم لشاشة الدخول
    }
    router.replace("/");
    router.refresh();
  }

  if (variant === "icon") {
    return (
      <button
        type="button"
        onClick={handleLogout}
        disabled={loading}
        aria-label="تسجيل الخروج"
        title="تسجيل الخروج"
        className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-surface-300 text-rose-600 transition-colors duration-150 hover:bg-rose-50 hover:text-rose-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-300/40 disabled:opacity-60"
      >
        <IconLogout className="h-[18px] w-[18px]" />
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={handleLogout}
      disabled={loading}
      className="flex w-full items-center justify-center gap-2 rounded-2xl bg-surface-300/70 px-4 py-3 text-[14px] font-bold text-rose-600 transition-colors duration-150 hover:bg-rose-50 hover:text-rose-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-300/40 disabled:opacity-60"
    >
      <IconLogout className="h-[18px] w-[18px]" />
      {loading ? "جاري الخروج…" : "تسجيل الخروج"}
    </button>
  );
}
