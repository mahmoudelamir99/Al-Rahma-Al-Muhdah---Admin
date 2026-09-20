"use client";

import { useState } from "react";
import { acknowledgeSupportNotice } from "@/lib/actions/support";

export default function SupportNotice({ notice }) {
  const [visible, setVisible] = useState(Boolean(notice?.message));
  if (!visible || !notice?.message) return null;

  async function dismiss() {
    setVisible(false);
    await acknowledgeSupportNotice();
  }

  return (
    <div role="status" className="fixed bottom-5 left-5 z-[100] flex max-w-[min(26rem,calc(100vw-2rem))] items-start gap-3 rounded-2xl border-emerald-200 bg-emerald-50 px-4 py-3 text-emerald-900 shadow-lift">
      <span className="text-lg" aria-hidden="true">✓</span>
      <div className="min-w-0 flex-1">
        <p className="text-[13.5px] font-extrabold">تم تنفيذ طلبك</p>
        <p className="mt-0.5 text-[12.5px] font-semibold leading-6">{notice.message}</p>
      </div>
      <button type="button" onClick={dismiss} aria-label="إغلاق الإشعار" className="text-lg font-bold text-emerald-800">×</button>
    </div>
  );
}
