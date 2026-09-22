"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { IconClose, IconLoader } from "@/components/icons";

/* خيارات جاهزة لتسريع الإدخال (مع إمكانية الكتابة الحرة) */
const JOB_SUGGESTIONS = [
  "فني كهرباء",
  "مهندس مدني",
  "عامل إنتاج",
  "سائق نقل ثقيل",
  "لحام ارجون",
  "سائق ريتش",
  "عامل مستودع",
  "فني صيانة",
];

const COMPANY_OPTIONS = ["ليوني", "LG", "الرحمة المهداة", "أخرى"];

/* اقتراحات المكان (محافظات ومناطق شغّالة فعلاً في السوق) */
const LOCATION_OPTIONS = [
  "القاهرة - مدينة نصر",
  "القاهرة - العاشر من رمضان",
  "العاشر من رمضان",
  "الجيزة - 6 أكتوبر",
  "الإسكندرية",
  "الشرقية - العاشر من رمضان",
  "السويس",
  "بورسعيد",
  "المنوفية",
  "الغربية",
];

/* اقتراحات نظام الوردية — بتوفّر كتابة متكررة */
const SCHEDULE_OPTIONS = [
  "8 ساعات / ورديات",
  "8 ساعات / صباحي",
  "9 ساعات / صباحي",
  "10 ساعات / ورديات",
  "12 ساعة / ورديات",
  "وردية ليلية",
  "عمل مرن / عن بعد",
];

const EMPTY = {
  title: "",
  company: "",
  company_logo: "",
  company_tone: "bg-brand-600",
  description: "",
  experience: "",
  qualification: "",
  salary_from: "",
  salary_to: "",
  required_count: "1",
  status: "available",
  location: "",
  schedule: "",
  // نوع الدوام اختياري — بيبدأ فاضي عشان الأدمن مش مجبر يكتبه
  employment_type: "",
};

/**
 * نافذة إضافة/تعديل وظيفة — حقول شاملة.
 * onSave(busy) بترجّع نتيجة { ok, error, message }.
 */
export default function JobModal({ open, job, onClose, onSave }) {
  const [form, setForm] = useState(EMPTY);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const firstFieldRef = useRef(null);

  const isEdit = Boolean(job?.id);

  // نحمّل بيانات الوظيفة عند التعديل، ونصفّر الفورم عند الإضافة
  useEffect(() => {
    if (!open) return;
    if (job) {
      setForm({
        title: job.title ?? "",
        company: job.company ?? "",
        company_logo: job.company_logo ?? "",
        company_tone: job.company_tone ?? "bg-brand-600",
        description: job.description ?? "",
        experience: job.experience ?? "",
        qualification: job.qualification ?? "",
        salary_from: job.salary_from ?? "",
        salary_to: job.salary_to ?? "",
        required_count: String(job.required_count ?? 1),
        status: job.status ?? "available",
        location: job.location ?? "",
        schedule: job.schedule ?? "",
        employment_type: job.employment_type ?? "",
      });
    } else {
      setForm(EMPTY);
    }
    setError("");
    setBusy(false);
    const t = setTimeout(() => firstFieldRef.current?.focus(), 120);
    return () => clearTimeout(t);
  }, [open, job]);

  // قفل بـ Escape
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === "Escape" && !busy) onClose();
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, busy, onClose]);

  if (!open) return null;

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  async function submit(e) {
    e.preventDefault();
    if (busy) return;
    setError("");
    setBusy(true);

    const result = await onSave(isEdit ? job.id : null, form);

    if (!result?.ok) {
      setError(result?.error || "حصل خطأ غير متوقع.");
      setBusy(false);
      return;
    }
    setBusy(false);
    onClose();
  }

  const label = "mb-1.5 block text-[13px] font-bold text-brand-900";
  // شكل موحّد لكل حقول المودال (Sprint 2)
  const field = "field-light field-input";

  // حقل نصي عادي + داتاليست للاقتراحات (بيسرّع الإدخال المتكرر)
  const isAvailable = form.status !== "closed";

  return (
    <div className="fixed inset-0 z-[60] flex items-start justify-center overflow-y-auto p-4 sm:items-center">
      {/* الخلفية */}
      <div
        className="fixed inset-0 bg-brand-950/30"
        onClick={() => !busy && onClose()}
        aria-hidden="true"
      />

      <motion.div
        role="dialog"
        aria-modal="true"
        aria-label={isEdit ? "تعديل وظيفة" : "إضافة وظيفة"}
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.18, ease: "easeOut" }}
        className="relative z-10 my-auto w-full max-w-3xl rounded-3xl border-surface-400 bg-surface-100 shadow-lift"
      >
        {/* الترويسة */}
        <div className="flex items-center justify-between gap-3 border-b border-surface-400 px-5 py-4 sm:px-6">
          <div className="min-w-0">
            <h2 className="text-[17px] font-extrabold text-brand-900">
              {isEdit ? "تعديل وظيفة" : "إضافة وظيفة جديدة"}
            </h2>
            <p className="mt-0.5 text-[12.5px] font-semibold text-brand-900/70">
              {isEdit ? "عدّل البيانات ثم اضغط حفظ." : "املأ البيانات ثم اضغط إضافة."}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            aria-label="إغلاق"
            className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-surface-300 text-brand-900/80 transition-colors duration-150 hover:bg-surface-400 hover:text-brand-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-400/40 disabled:opacity-50"
          >
            <IconClose className="h-[18px] w-[18px]" />
          </button>
        </div>

        {/* الفورم */}
        <form onSubmit={submit} className="max-h-[70vh] overflow-y-auto px-5 py-5 sm:px-6">
          <div className="grid gap-4 sm:grid-cols-2">
            {/* اسم الوظيفة */}
            <div className="sm:col-span-2">
              <label className={label} htmlFor="job-title">
                اسم الوظيفة <span className="text-rose-500">*</span>
              </label>
              <input
                id="job-title"
                ref={firstFieldRef}
                list="job-suggestions"
                value={form.title}
                onChange={set("title")}
                placeholder="اكتب أو اختر من القائمة"
                className={field}
                required
              />
              <datalist id="job-suggestions">
                {JOB_SUGGESTIONS.map((j) => (
                  <option key={j} value={j} />
                ))}
              </datalist>
            </div>

            {/* الشركة */}
            <div>
              <label className={label} htmlFor="job-company">
                الشركة
              </label>
              <input
                id="job-company"
                list="company-options"
                value={form.company}
                onChange={set("company")}
                placeholder="اسم الشركة"
                className={field}
              />
              <datalist id="company-options">
                {COMPANY_OPTIONS.map((c) => (
                  <option key={c} value={c} />
                ))}
              </datalist>
            </div>

            {/* الموقع */}
            <div>
              <label className={label} htmlFor="job-location">
                الموقع (المحافظة / المنطقة)
              </label>
              <input
                id="job-location"
                list="location-options"
                value={form.location}
                onChange={set("location")}
                placeholder="مثال: العاشر من رمضان"
                className={field}
              />
              <datalist id="location-options">
                {LOCATION_OPTIONS.map((l) => (
                  <option key={l} value={l} />
                ))}
              </datalist>
            </div>

            {/* وصف الوظيفة */}
            <div className="sm:col-span-2">
              <label className={label} htmlFor="job-desc">
                وصف الوظيفة
              </label>
              <textarea
                id="job-desc"
                rows={3}
                value={form.description}
                onChange={set("description")}
                placeholder="اكتب وصف مختصر لمهام الوظيفة"
                className="field-light field-area"
              />
            </div>

            {/* المتطلبات */}
            <div>
              <label className={label} htmlFor="job-exp">
                الخبرة المطلوبة
              </label>
              <input
                id="job-exp"
                value={form.experience}
                onChange={set("experience")}
                placeholder="مثال: سنتان على الأقل"
                className={field}
              />
            </div>

            <div>
              <label className={label} htmlFor="job-qual">
                المؤهل المطلوب
              </label>
              <input
                id="job-qual"
                value={form.qualification}
                onChange={set("qualification")}
                placeholder="مثال: دبلوم صنايع"
                className={field}
              />
            </div>

            {/* الراتب */}
            <div>
              <label className={label} htmlFor="job-salary-from">
                الراتب من (ج.م)
              </label>
              <input
                id="job-salary-from"
                type="number"
                min="0"
                inputMode="numeric"
                value={form.salary_from}
                onChange={set("salary_from")}
                placeholder="8000"
                className={field}
              />
            </div>

            <div>
              <label className={label} htmlFor="job-salary-to">
                الراتب إلى (ج.م)
              </label>
              <input
                id="job-salary-to"
                type="number"
                min="0"
                inputMode="numeric"
                value={form.salary_to}
                onChange={set("salary_to")}
                placeholder="10000"
                className={field}
              />
            </div>

            {/* العدد والحالة */}
            <div>
              <label className={label} htmlFor="job-required">
                العدد المطلوب تعيينه <span className="text-rose-500">*</span>
              </label>
              <input
                id="job-required"
                type="number"
                min="0"
                inputMode="numeric"
                value={form.required_count}
                onChange={set("required_count")}
                className={field}
                required
              />
            </div>

            {/*
              حالة الوظيفة — Toggle (متاحة / مغلقة) زي ما اتطلب بالحرف.
              بنستخدم زرار بـ role="switch" عشان يبقى متاح لقارئ الشاشة كمان،
              والتبديل بين الحالتين بكليكة واحدة بدل قائمة منسدلة.
            */}
            <div>
              <span className={label} id="job-status-label">
                حالة الوظيفة
              </span>
              <button
                type="button"
                role="switch"
                aria-checked={isAvailable}
                aria-labelledby="job-status-label"
                onClick={() =>
                  setForm((f) => ({ ...f, status: isAvailable ? "closed" : "available" }))
                }
                className={`flex w-full items-center justify-between gap-3 rounded-2xl border px-3.5 py-2.5 text-[14px] font-bold transition-colors duration-150 focus:outline-none focus-visible:ring-4 focus-visible:ring-brand-500/15 ${
                  isAvailable
                    ? "border-emerald-300 bg-emerald-50 text-emerald-800"
                    : "border-surface-500 bg-surface-300 text-brand-900/75"
                }`}
              >
                <span className="flex items-center gap-2">
                  <span
                    aria-hidden="true"
                    className={`h-2.5 w-2.5 rounded-full ${
                      isAvailable ? "bg-emerald-500" : "bg-brand-900/40"
                    }`}
                  />
                  {isAvailable ? "متاحة" : "مغلقة"}
                </span>

                {/* جسم الـ Toggle */}
                <span
                  aria-hidden="true"
                  className={`relative h-6 w-11 shrink-0 rounded-full transition-colors duration-150 ${
                    isAvailable ? "bg-emerald-500" : "bg-brand-900/25"
                  }`}
                >
                  <span
                    className="absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform duration-150"
                    style={{ transform: `translateX(${isAvailable ? "-1.375rem" : "0"})` }}
                  />
                </span>
              </button>
              <p className="mt-1.5 text-[12px] font-semibold text-brand-900/60">
                {isAvailable
                  ? "الوظيفة ظاهرة للزوار على الموقع."
                  : "الوظيفة مخفية عن الزوار (لسه محفوظة في القاعدة)."}
              </p>
            </div>

            {/* تفاصيل إضافية */}
            {/* ساعات العمل / نظام الوردية */}
            <div>
              <label className={label} htmlFor="job-schedule">
                ساعات العمل / نظام الوردية
              </label>
              <input
                id="job-schedule"
                list="schedule-options"
                value={form.schedule}
                onChange={set("schedule")}
                placeholder="مثال: 8 ساعات / ورديات"
                className={field}
              />
              <datalist id="schedule-options">
                {SCHEDULE_OPTIONS.map((s) => (
                  <option key={s} value={s} />
                ))}
              </datalist>
            </div>

            <div>
              <label className={label} htmlFor="job-type">
                نوع الدوام
              </label>
              <input
                id="job-type"
                value={form.employment_type}
                onChange={set("employment_type")}
                placeholder="مثال: دوام كامل (اختياري)"
                className={field}
              />
            </div>
          </div>

          {/* الخطأ */}
          {error && (
            <p
              role="alert"
              className="mt-4 rounded-2xl border-rose-200 bg-rose-50 px-3.5 py-2.5 text-[13.5px] font-bold text-rose-800"
            >
              {error}
            </p>
          )}
        </form>

        {/* الأزرار */}
        <div className="flex flex-col-reverse gap-2.5 border-t border-surface-400 px-5 py-4 sm:flex-row sm:justify-end sm:px-6">
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
              className="rounded-2xl bg-surface-300 px-5 py-2.5 text-[14px] font-bold text-brand-900/90 transition-colors duration-150 hover:bg-surface-400 hover:text-brand-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-400/40 disabled:opacity-50"
            >
              إلغاء
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={busy}
            className="btn-shine flex items-center justify-center gap-2 rounded-2xl bg-brand-700 px-6 py-2.5 text-[14px] font-bold text-white transition-colors duration-150 hover:bg-brand-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-400/50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {busy ? (
              <>
                <IconLoader className="relative z-10 h-4 w-4 animate-spin" />
                <span className="relative z-10">جاري الحفظ…</span>
              </>
            ) : (
              <span className="relative z-10">
                {isEdit ? "حفظ التعديلات" : "إضافة الوظيفة"}
              </span>
            )}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
