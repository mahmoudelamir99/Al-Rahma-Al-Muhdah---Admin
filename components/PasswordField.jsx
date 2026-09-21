"use client";

import { useState } from "react";

/* ==========================================================================
   حقل كلمة مرور موحّد (Sprint 2): تناسق الشكل + أيقونة "العين" للتبديل.
   --------------------------------------------------------------------------
   بيعمل كل حاجة في مكان واحد:
     - شكل الحقل الموحّد (.field-light .field-input) فمفيش تفاوت في المقاسات.
     - أيقونة العين (إظهار/إخفاء) على اليسار.
     - dir="ltr" افتراضي لأن الباسورد لاتيني.
   ========================================================================== */

function IconEye({ className = "" }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path
        d="M2.8 12S6.4 5.8 12 5.8 21.2 12 21.2 12 17.6 18.2 12 18.2 2.8 12 2.8 12z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="12" r="3.1" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  );
}

function IconEyeOff({ className = "" }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path
        d="M2.8 12S6.4 5.8 12 5.8c1.6 0 3 .4 4.3 1.1M21.2 12s-3.6 6.2-9.2 6.2c-1.6 0-3-.4-4.3-1.1"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M4 4l16 16" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

/**
 * @param {string} value
 * @param {(value: string) => void} onChange
 * @param {string} placeholder
 * @param {boolean} disabled
 * @param {string} id — اختياري لربط label
 * @param {string} autoComplete
 */
export default function PasswordField({
  value,
  onChange,
  placeholder = "",
  disabled = false,
  id,
  autoComplete = "new-password",
  ariaLabel,
}) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="relative">
      <input
        id={id}
        type={visible ? "text" : "password"}
        dir="ltr"
        autoComplete={autoComplete}
        aria-label={ariaLabel}
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        // حشوة يسار أكبر عشان الأيقونة متغطّيش النص
        className="field-light field-input text-left pl-11"
      />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        disabled={disabled}
        aria-label={visible ? "إخفاء كلمة المرور" : "إظهار كلمة المرور"}
        title={visible ? "إخفاء كلمة المرور" : "إظهار كلمة المرور"}
        tabIndex={-1}
        className="absolute inset-y-0 left-2.5 my-auto grid h-8 w-8 place-items-center rounded-lg text-brand-900/45 transition-colors duration-150 hover:bg-surface-300 hover:text-brand-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40 disabled:opacity-40"
      >
        {visible ? <IconEyeOff className="h-[18px] w-[18px]" /> : <IconEye className="h-[18px] w-[18px]" />}
      </button>
    </div>
  );
}
