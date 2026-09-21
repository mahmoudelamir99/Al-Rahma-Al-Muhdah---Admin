"use client";

import { useState, useTransition } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { IconLoader } from "@/components/icons";
import PasswordField from "@/components/PasswordField";
import {
  requestEmailChange,
  requestPasswordChange,
  updateOwnEmailDirect,
  updateOwnPasswordDirect,
} from "@/lib/actions/support";

/* ==========================================================================
   فورم "حسابي" — سلوكين حسب دور مفتوح الشاشة:
   --------------------------------------------------------------------------
   1) السوبر أدمن  → تعديل **مباشر**: يكتب الباسورد الحالي والجديد (أو الإيميل
                     الجديد) ويدوس حفظ، والتغيير يتنفّذ فوراً (مفيش طلب).
   2) موظف عادي   → نظام **الطلبات**: يبعت طلب للدعم الفني بحالة (قيد الانتظار)،
                     والمدير العام يراجعه قبل التنفيذ. الموظف مش بيحتاج يكتب
                     الباسورد القديم خالص (ممكن يكون ناسيه) — الجديد وتأكيده بس.
   ========================================================================== */

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function Field({ label, hint, children }) {
  return (
    <label className="block">
      <span className="block text-[13px] font-bold text-brand-900/85">{label}</span>
      {hint && <span className="mt-0.5 block text-[12px] font-semibold text-brand-900/55">{hint}</span>}
      <span className="mt-1.5 block">{children}</span>
    </label>
  );
}

// الشكل الموحّد للحقول (Sprint 2) — من globals.css عشان التناسق يبقى مضمون
const inputClass = "field-light field-input";

export default function AccountForms({ email, isSuperAdmin = false }) {
  const [tab, setTab] = useState("password");

  /* ---- حالة فورم الباسوورد ---- */
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  /* ---- حالة فورم الإيميل ---- */
  const [emailPassword, setEmailPassword] = useState("");
  const [newEmail, setNewEmail] = useState("");

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [done, setDone] = useState("");
  const [isPending, startTransition] = useTransition();

  function resetMessages() {
    setError("");
    setDone("");
  }

  function validatePassword() {
    // السوبر أدمن بس هو اللي بيكتب الباسورد الحالي (تعديل مباشر على نفسه)
    if (isSuperAdmin && !currentPassword) return "اكتب كلمة المرور الحالية.";
    if (!newPassword || newPassword.length < 8) return "كلمة المرور الجديدة لازم تكون 8 أحرف على الأقل.";
    if (!/[A-Za-z]/.test(newPassword) || !/[0-9]/.test(newPassword)) return "كلمة المرور الجديدة لازم تحتوي حروف وأرقام.";
    if (newPassword !== confirmPassword) return "كلمة المرور الجديدة وتأكيدها مش متطابقين.";
    return null;
  }

  function validateEmail() {
    if (!EMAIL_REGEX.test(newEmail.trim())) return "اكتب بريد إلكتروني صحيح.";
    if (!emailPassword) return "اكتب كلمة المرور الحالية للتأكيد.";
    return null;
  }

  function submitPassword() {
    if (isPending) return;
    resetMessages();
    const invalid = validatePassword();
    if (invalid) {
      setError(invalid);
      return;
    }
    startTransition(async () => {
      const payload = { currentPassword, newPassword, confirmPassword };
      // السوبر أدمن: تعديل مباشر / الموظف: إرسال طلب
      const result = isSuperAdmin
        ? await updateOwnPasswordDirect(payload)
        : await requestPasswordChange({ ...payload, message });

      if (!result?.ok) {
        setError(result?.error || "تعذّر التنفيذ، جرّب تاني.");
        return;
      }
      setDone(result.message || (isSuperAdmin ? "تم التغيير." : "تم إرسال طلبك للدعم الفني."));
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setMessage("");
    });
  }

  function submitEmail() {
    if (isPending) return;
    resetMessages();
    const invalid = validateEmail();
    if (invalid) {
      setError(invalid);
      return;
    }
    startTransition(async () => {
      const payload = { currentPassword: emailPassword, newEmail };
      const result = isSuperAdmin
        ? await updateOwnEmailDirect(payload)
        : await requestEmailChange({ ...payload, message });

      if (!result?.ok) {
        setError(result?.error || "تعذّر التنفيذ، جرّب تاني.");
        return;
      }
      setDone(result.message || (isSuperAdmin ? "تم التغيير." : "تم إرسال طلبك للدعم الفني."));
      setEmailPassword("");
      setNewEmail("");
      setMessage("");
    });
  }

  return (
    <div>
      {/* البيانات الحالية */}
      <div className="mb-5 grid gap-3 rounded-2xl bg-surface-300/70 p-4 sm:grid-cols-2">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-wider text-brand-900/45">البريد الحالي</p>
          <p className="mt-1 break-all text-[13.5px] font-bold text-brand-900/85" dir="ltr">{email}</p>
        </div>
        <div>
          <p className="text-[11px] font-bold uppercase tracking-wider text-brand-900/45">الدور</p>
          <p className="mt-1 text-[13.5px] font-bold text-gold-600">
            {isSuperAdmin ? "مدير عام (Super Admin)" : "موظف"}
          </p>
        </div>
      </div>

      {/* التبويبات */}
      <div className="flex gap-2">
        {[
          { id: "password", label: "تغيير كلمة المرور" },
          { id: "email", label: "تغيير البريد الإلكتروني" },
        ].map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => {
              setTab(t.id);
              resetMessages();
            }}
            className={`rounded-xl px-4 py-2 text-[13.5px] font-bold transition-colors duration-150 ${tab === t.id ? "bg-brand-700 text-white" : "bg-surface-300 text-brand-900/75 hover:bg-surface-400"
              }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="mt-5 space-y-4">
        {tab === "password" ? (
          <>
            {/*
             * حقل "كلمة المرور الحالية" بيظهر للسوبر أدمن بس (تعديل مباشر).
             * الموظف العادي بيبعت طلب للإدارة، فمش منطقي نطلب منه الباسورد
             * القديم — ممكن يكون ناسيه أصلاً.
             */}
            {isSuperAdmin && (
              <Field label="كلمة المرور الحالية" hint="لازم تكون صحيحة عشان نقبل التغيير.">
                <PasswordField
                  value={currentPassword}
                  onChange={setCurrentPassword}
                  disabled={isPending}
                  autoComplete="current-password"
                  ariaLabel="كلمة المرور الحالية"
                />
              </Field>
            )}

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="كلمة المرور الجديدة" hint="8 أحرف على الأقل، فيها حروف وأرقام.">
                <PasswordField
                  value={newPassword}
                  onChange={setNewPassword}
                  disabled={isPending}
                  ariaLabel="كلمة المرور الجديدة"
                />
              </Field>
              <Field label="تأكيد كلمة المرور الجديدة">
                <PasswordField
                  value={confirmPassword}
                  onChange={setConfirmPassword}
                  disabled={isPending}
                  ariaLabel="تأكيد كلمة المرور الجديدة"
                />
              </Field>
            </div>
          </>
        ) : (
          <>
            <Field label="البريد الإلكتروني الجديد">
              <input
                type="email"
                dir="ltr"
                inputMode="email"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                disabled={isPending}
                placeholder="name@example.com"
                className={`${inputClass} text-left`}
              />
            </Field>
            <Field label="كلمة المرور الحالية" hint="للتأكيد إنك صاحب الحساب.">
              <PasswordField
                value={emailPassword}
                onChange={setEmailPassword}
                disabled={isPending}
                autoComplete="current-password"
                ariaLabel="كلمة المرور الحالية"
              />
            </Field>
          </>
        )}

        {/* ملاحظة للدعم — للموظف العادي بس */}
        {!isSuperAdmin && (
          <Field label="ملاحظة للدعم الفني (اختياري)">
            <textarea
              rows={2}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              disabled={isPending}
              placeholder="أي توضيح إضافي…"
              className="field-light field-area"
            />
          </Field>
        )}

        {/* الرسائل */}
        <AnimatePresence>
          {error && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              role="alert"
              className="rounded-xl border-rose-200 bg-rose-50 px-3.5 py-2.5 text-[13px] font-bold text-rose-800"
            >
              {error}
            </motion.p>
          )}
          {done && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="rounded-xl border-emerald-200 bg-emerald-50 px-3.5 py-2.5 text-[13px] font-bold text-emerald-800"
            >
              ✓ {done}
            </motion.p>
          )}
        </AnimatePresence>

        <button
          type="button"
          onClick={tab === "password" ? submitPassword : submitEmail}
          disabled={isPending}
          className="btn-shine flex items-center justify-center gap-2 rounded-xl bg-brand-700 px-6 py-2.5 text-[14px] font-bold text-white transition-colors duration-150 hover:bg-brand-800 disabled:cursor-not-allowed disabled:opacity-55"
        >
          {isPending ? (
            <>
              <IconLoader className="relative z-10 h-4 w-4 animate-spin" />
              <span className="relative z-10">{isSuperAdmin ? "جاري الحفظ…" : "جاري الإرسال…"}</span>
            </>
          ) : (
            <span className="relative z-10">{isSuperAdmin ? "حفظ التغييرات" : "إرسال طلب للدعم الفني"}</span>
          )}
        </button>

        <p className="text-[12px] font-semibold leading-6 text-brand-900/55">
          {isSuperAdmin
            ? "التغيير بيتنفّذ فوراً على حسابك في قاعدة البيانات بعد التحقق من كلمة المرور الحالية."
            : "الطلب بيتسجل بحالة «قيد الانتظار»، وبيراجعه المدير العام قبل التنفيذ. مش هيتغير أي حاجة في حسابك غير لما يتم الموافقة."}
        </p>
      </div>
    </div>
  );
}
