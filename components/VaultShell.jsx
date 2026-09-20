"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

/* ==========================================================================
   أيقونات SVG صغيرة (بدون أي مكتبة خارجية)
   ========================================================================== */
function IconMail({ className = "" }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <rect x="3" y="5" width="18" height="14" rx="3" stroke="currentColor" strokeWidth="1.6" />
      <path d="M4 7.5l7.1 5.1a1.6 1.6 0 001.8 0L20 7.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

function IconLock({ className = "" }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <rect x="4.5" y="10" width="15" height="10.5" rx="3" stroke="currentColor" strokeWidth="1.6" />
      <path d="M8 10V7.8a4 4 0 018 0V10" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <circle cx="12" cy="15.2" r="1.4" fill="currentColor" />
    </svg>
  );
}

function IconEye({ className = "" }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path d="M2.8 12S6.4 5.8 12 5.8 21.2 12 21.2 12 17.6 18.2 12 18.2 2.8 12 2.8 12z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
      <circle cx="12" cy="12" r="3.1" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  );
}

function IconEyeOff({ className = "" }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path d="M2.8 12S6.4 5.8 12 5.8c1.6 0 3 .4 4.3 1.1M21.2 12s-3.6 6.2-9.2 6.2c-1.6 0-3-.4-4.3-1.1" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M4 4l16 16" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

function IconAlert({ className = "" }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.6" />
      <path d="M12 7.6v5.2" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
      <circle cx="12" cy="16.3" r="1.1" fill="currentColor" />
    </svg>
  );
}

function IconLoader({ className = "" }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" aria-hidden="true">
      <path d="M12 3.4a8.6 8.6 0 108.6 8.6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

/* ==========================================================================
   شاشة الدخول (The Vault) — وضع مضيء فخم
   خانتين فقط + زرار دخول — مفيش روابط خالص.
   ========================================================================== */
export default function VaultShell() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [shake, setShake] = useState(0);
  const [capsOn, setCapsOn] = useState(false);
  const emailRef = useRef(null);

  useEffect(() => {
    emailRef.current?.focus();
  }, []);

  async function handleSubmit(event) {
    event.preventDefault();
    if (loading) return;

    setError("");

    if (!email.trim() || !password) {
      setError("من فضلك اكتب البريد الإلكتروني وكلمة المرور.");
      setShake((n) => n + 1);
      return;
    }

    setLoading(true);
    try {
      const supabase = createSupabaseBrowserClient();
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });

      if (signInError) {
        setError("بيانات الدخول غير صحيحة.");
        setShake((n) => n + 1);
        setLoading(false);
        return;
      }

      window.location.replace("/dashboard");
    } catch {
      setError("تعذّر الاتصال بالسيرفر. جرّب تاني.");
      setShake((n) => n + 1);
      setLoading(false);
    }
  }

  return (
    <main className="relative flex min-h-[100dvh] w-full items-center justify-center overflow-hidden bg-surface-200 px-4 py-10">
      {/* الخلفية المضيئة */}
      <div className="aura-layer" aria-hidden="true" />
      <div className="grid-layer" aria-hidden="true" />
      <div
        className="pointer-events-none absolute inset-0 bg-gradient-to-b from-white/45 via-transparent to-surface-300/50"
        aria-hidden="true"
      />

      <motion.section
        key={shake}
        animate={shake ? { x: [0, -9, 9, -6, 6, 0] } : undefined}
        transition={{ duration: 0.42, ease: "easeInOut" }}
        className="relative w-full max-w-[28rem]"
      >
        <div className="glass-panel relative overflow-hidden rounded-[30px] p-7 sm:p-10">
          {/* لمعة أعلى الكارت */}
          <span
            className="pointer-events-none absolute inset-x-10 -top-px h-px bg-gradient-to-r from-transparent via-copper-400/60 to-transparent"
            aria-hidden="true"
          />

          {/* ============ اللوجو الرسمي ============ */}
          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
            className="flex flex-col items-center"
          >
            <div className="relative">
              {/* هالة ذهبية ناعمة خلف اللوجو */}
              <span className="absolute -inset-4 rounded-full bg-copper-200/25" aria-hidden="true" />
              <img
                src="/logo.png"
                alt="الرحمة المهداة للتوظيف"
                width={200}
                height={200}
                className="relative h-24 w-auto object-contain sm:h-28"
              />
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.08, ease: [0.22, 1, 0.36, 1] }}
            className="mt-5 text-center"
          >
            <h1 className="text-[1.45rem] font-extrabold leading-snug text-brand-950 sm:text-[1.6rem]">
              تسجيل الدخول
            </h1>
          </motion.div>

          <div className="divider-gold my-6" />

          {/* ============ الفورم ============ */}
          <motion.form
            onSubmit={handleSubmit}
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.16, ease: [0.22, 1, 0.36, 1] }}
            className="space-y-4"
            noValidate
          >
            {/* البريد الإلكتروني */}
            <div>
              <label
                htmlFor="email"
                className="mb-2 block text-[13.5px] font-bold text-brand-900"
              >
                البريد الإلكتروني
              </label>
              <div className="relative">
                <span className="pointer-events-none absolute inset-y-0 right-3.5 grid place-items-center text-brand-900/35">
                  <IconMail className="h-[18px] w-[18px]" />
                </span>
                <input
                  id="email"
                  ref={emailRef}
                  type="email"
                  name="email"
                  dir="ltr"
                  autoComplete="username"
                  inputMode="email"
                  spellCheck={false}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="field-light w-full rounded-2xl py-3.5 pl-4 pr-11 text-left text-[15.5px] font-semibold"
                />
              </div>
            </div>

            {/* كلمة المرور */}
            <div>
              <label
                htmlFor="password"
                className="mb-2 block text-[13.5px] font-bold text-brand-900"
              >
                كلمة المرور
              </label>
              <div className="relative">
                <span className="pointer-events-none absolute inset-y-0 right-3.5 grid place-items-center text-brand-900/35">
                  <IconLock className="h-[18px] w-[18px]" />
                </span>
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  name="password"
                  dir="ltr"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyUp={(e) => setCapsOn(e.getModifierState?.("CapsLock") ?? false)}
                  onBlur={() => setCapsOn(false)}
                  placeholder="••"
                  className="field-light w-full rounded-2xl py-3.5 pl-11 pr-11 text-left text-[15.5px] font-semibold"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? "إخفاء كلمة المرور" : "إظهار كلمة المرور"}
                  className="absolute inset-y-0 left-2.5 my-auto grid h-8 w-8 place-items-center rounded-xl text-brand-900/45 transition-colors duration-150 hover:bg-surface-300 hover:text-brand-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40"
                >
                  {showPassword ? (
                    <IconEyeOff className="h-[18px] w-[18px]" />
                  ) : (
                    <IconEye className="h-[18px] w-[18px]" />
                  )}
                </button>
              </div>

              <AnimatePresence>
                {capsOn && (
                  <motion.p
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    className="mt-2 text-[12.5px] font-bold text-copper-700"
                  >
                    تنبيه: زر Caps Lock مفعّل.
                  </motion.p>
                )}
              </AnimatePresence>
            </div>

            {/* الخطأ */}
            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.25, ease: "easeOut" }}
                  className="overflow-hidden"
                >
                  <p
                    role="alert"
                    className="flex items-center gap-2 rounded-2xl border-rose-200 bg-rose-50 px-3.5 py-2.5 text-[13.5px] font-bold text-rose-800"
                  >
                    <IconAlert className="h-4 w-4 shrink-0" />
                    {error}
                  </p>
                </motion.div>
              )}
            </AnimatePresence>

            {/* الزرار */}
            <button
              type="submit"
              disabled={loading}
              className="btn-shine mt-2 flex w-full items-center justify-center gap-2.5 rounded-2xl bg-brand-800 px-5 py-3.5 text-[15.5px] font-bold text-white transition-colors duration-150 ease-out hover:bg-brand-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-copper-400/50 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {loading ? (
                <>
                  <IconLoader className="h-[18px] w-[18px] animate-spin" />
                  جاري التحقق…
                </>
              ) : (
                <>
                  <IconLock className="h-[18px] w-[18px]" />
                  تسجيل الدخول
                </>
              )}
            </button>
          </motion.form>

          {/* تذييل الكارت */}
        </div>


      </motion.section>
    </main>
  );
}
