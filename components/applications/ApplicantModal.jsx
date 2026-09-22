"use client";

import { useEffect, useState, useTransition } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { IconClose, IconLoader, IconAlert, IconChat, IconUser, IconTrash } from "@/components/icons";
import { APPLICATION_STATUSES, statusMeta } from "@/lib/applicationsMeta";
import { updateApplicationHr, updateApplicationByHr, softDeleteApplication } from "@/lib/actions/applications";
import { FORM_FIELDS, READONLY_KEYS, SELECT_OPTIONS } from "@/lib/formFields";
import { formatDateTime, formatNumber } from "@/lib/format";

/* ==========================================================================
   نافذة التفاصيل الكاملة لمتقدّم (Applicant Profile)
   --------------------------------------------------------------------------
   بتقسيم واضح:
     1) الترويسة: الاسم + الوظيفة + شارة الحالة الحالية
     2) بيانات العامل كاملة (كل حقل اتسجل في فورم التقديم)
     3) لوحة الـ HR: تغيير الحالة + ملاحظات
   ========================================================================== */

/** ألوان شارات الحالة — متوافقة مع ألوان Tailwind المستخدمة في اللوحة */
const TONE_CLASSES = {
  amber: "bg-amber-50 text-amber-800 ring-amber-200",
  blue: "bg-sky-50 text-sky-800 ring-sky-200",
  purple: "bg-violet-50 text-violet-800 ring-violet-200",
  emerald: "bg-emerald-50 text-emerald-800 ring-emerald-200",
  rose: "bg-rose-50 text-rose-800 ring-rose-200",
  slate: "bg-surface-300 text-brand-900/75 ring-surface-400",
};

const DOT_CLASSES = {
  amber: "bg-amber-500",
  blue: "bg-sky-500",
  purple: "bg-violet-500",
  emerald: "bg-emerald-500",
  rose: "bg-rose-500",
  slate: "bg-brand-900/40",
};

export function StatusBadge({ status, size = "sm" }) {
  const meta = statusMeta(status);
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full ring-1 ring-inset font-bold ${TONE_CLASSES[meta.tone]} ${size === "lg" ? "px-3 py-1.5 text-[13px]" : "px-2.5 py-1 text-[12.5px]"
        }`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${DOT_CLASSES[meta.tone]}`} aria-hidden="true" />
      {meta.label}
    </span>
  );
}


/** صف بيانات واحد (عنوان + قيمة) */
function DataRow({ label, value, dir, wide }) {
  return (
    <div className={wide ? "sm:col-span-2" : ""}>
      <dt className="text-[11.5px] font-bold uppercase tracking-wider text-brand-900/55">{label}</dt>
      <dd
        className="mt-0.5 break-words text-[14px] font-semibold text-brand-900"
        dir={dir}
      >
        {value || <span className="font-normal text-brand-900/45">—</span>}
      </dd>
    </div>
  );
}

/** الحالة الابتدائية للفورم الداخلي */
function toDraft(application) {
  return {
    status: application?.status || "pending",
    hrNotes: application?.hr_notes || application?.rejection_reason || "",
    completionFields: Array.isArray(application?.completion_fields)
      ? application.completion_fields
      : [],
  };
}

/** الحالة الابتدائية لفورم التعديل اليدوي (بيانات العامل كما هي في القاعدة) */
function toEditValues(application) {
  const values = {};
  for (const field of FORM_FIELDS) {
    const raw = application?.[field.key];
    values[field.key] = raw === null || raw === undefined ? "" : String(raw);
  }
  return values;
}

/** حقل واحد في فورم التعديل اليدوي — نص / رقم / قائمة */
function EditField({ field, value, onChange }) {
  const options = SELECT_OPTIONS[field.key];
  const isLongText = field.key === "address" || field.key === "previous_companies";

  const base =
    "mt-1 w-full rounded-xl border px-3 py-2.5 text-[13.5px] font-semibold text-brand-900 outline-none transition " +
    "border-surface-400 bg-surface-100 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20";

  return (
    <label className="block text-[12.5px] font-bold text-brand-900/80">
      {field.label}
      {options ? (
        <select value={value} onChange={(e) => onChange(field.key, e.target.value)} className={base} aria-label={field.label}>
          <option value="">اختر...</option>
          {options.map((option) => (
            <option key={option} value={option}>
              {field.key === "expected_salary" ? `${formatNumber(option)} ج.م` : option}
            </option>
          ))}
        </select>
      ) : isLongText ? (
        <textarea rows={2} value={value} onChange={(e) => onChange(field.key, e.target.value)} className={`${base} resize-y`} aria-label={field.label} />
      ) : (
        <input
          type={field.type === "tel" ? "tel" : field.type === "number" ? "number" : "text"}
          value={value}
          onChange={(e) => onChange(field.key, e.target.value)}
          className={base}
          aria-label={field.label}
          dir={field.key === "phone_number" || field.key === "national_id" ? "ltr" : undefined}
        />
      )}
    </label>
  );
}

/** الحقول المتاحة للتحديد — كل حقول الفورم ماعدا حقول الهوية */
const SELECTABLE_FIELDS = FORM_FIELDS.filter((f) => !READONLY_KEYS.has(f.key));

export default function ApplicantModal({ application, onClose, onUpdated, onDeleted, archived = false }) {
  const [draft, setDraft] = useState(() => toDraft(application));
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const [isPending, startTransition] = useTransition();

  /* ---- حالة نقل الطلب للأرشيف (Soft Delete) ---- */
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  /* ---- حالة فورم التعديل اليدوي لبيانات العامل ---- */
  const [editOpen, setEditOpen] = useState(false);
  const [editValues, setEditValues] = useState(() => toEditValues(application));
  const [editErrors, setEditErrors] = useState({});
  const [editSaved, setEditSaved] = useState(false);

  /** معلومات مختصرة للقراءة (بيتم تحديثها بعد أي حفظ) */
  const [info, setInfo] = useState(() => ({
    full_name: application?.full_name || "",
    national_id: application?.national_id || "",
    phone_number: application?.phone_number || "",
  }));

  const isCustomJob = application?.selected_job === "غير ذلك";
  const isNeedsInfo = draft.status === "needs_info";

  const originalFields = Array.isArray(application?.completion_fields)
    ? application.completion_fields
    : [];
  const fieldsChanged =
    draft.completionFields.length !== originalFields.length ||
    draft.completionFields.some((k) => !originalFields.includes(k));

  const dirty =
    draft.status !== (application?.status || "pending") ||
    draft.hrNotes !== (application?.hr_notes || application?.rejection_reason || "") ||
    fieldsChanged;

  /** لوجيك التحديد: تبديل حقل واحد */
  function toggleField(key) {
    setDraft((d) => ({
      ...d,
      completionFields: d.completionFields.includes(key)
        ? d.completionFields.filter((k) => k !== key)
        : [...d.completionFields, key],
    }));
  }

  /** تعديل قيمة حقل في فورم البيانات اليدوي + مسح خطاه */
  function setEditValue(key, value) {
    setEditValues((current) => ({ ...current, [key]: value }));
    setEditErrors((current) => ({ ...current, [key]: undefined }));
  }

  /** حفظ تعديلات الـ HR اليدوية على بيانات العامل مباشرة في القاعدة */
  function saveEdit() {
    if (isPending) return;
    setError("");
    setEditErrors({});
    startTransition(async () => {
      const result = await updateApplicationByHr({ id: application.id, fields: editValues });
      if (!result?.ok) {
        setEditErrors(result?.fieldErrors || {});
        setError(result?.error || "تعذّر حفظ بيانات العامل، جرّب تاني.");
        return;
      }
      // بنحدّث اللي ظاهر فوق فوراً من غير إعادة تحميل
      setInfo((current) => ({ ...current, ...editValues }));
      onUpdated?.({ ...application, ...editValues, ...result.application });
      setEditSaved(true);
      setEditOpen(false);
      setTimeout(() => setEditSaved(false), 2500);
    });
  }

  /** تحديد/إلغاء كل الحقول */
  function toggleAll(checked) {
    setDraft((d) => ({
      ...d,
      completionFields: checked ? SELECTABLE_FIELDS.map((f) => f.key) : [],
    }));
  }

  /* قفل بـ Escape + منع سكرول الصفحة الخلفية */
  useEffect(() => {
    const onKey = (event) => {
      if (event.key === "Escape" && !isPending) onClose();
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [isPending, onClose]);

  function save() {
    if (isPending || !dirty) return;
    setError("");
    startTransition(async () => {
      const result = await updateApplicationHr({
        id: application.id,
        status: draft.status,
        hrNotes: draft.hrNotes,
        // الحقول المحددة بتتبعت في حالة "مطلوب استكمال" بس
        completionFields: draft.status === "needs_info" ? draft.completionFields : [],
      });

      if (!result?.ok) {
        setError(result?.error || "تعذّر الحفظ، جرّب تاني.");
        return;
      }

      setSaved(true);
      onUpdated?.(result.application);
      setTimeout(() => setSaved(false), 2500);
    });
  }

  /** نقل الطلب للأرشيف (Soft Delete) — البيانات تفضل محفوظة وقابلة للاستعادة */
  function confirmDelete() {
    if (deleteBusy) return;
    setDeleteError("");
    setDeleteBusy(true);
    (async () => {
      const result = await softDeleteApplication(application.id);
      if (!result?.ok) {
        setDeleteError(result?.error || "تعذّر نقل الطلب للأرشيف.");
        setDeleteBusy(false);
        return;
      }
      // بنبلّغ الجدول يشيل الصف من القائمة الرئيسية فوراً
      onDeleted?.(application.id);
      setDeleteBusy(false);
      onClose();
    })();
  }

  if (!application) return null;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-start justify-center overflow-y-auto p-4 sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-label={`تفاصيل طلب ${application.full_name}`}
    >
      <div
        className="fixed inset-0 bg-brand-950/35"
        onClick={() => !isPending && onClose()}
        aria-hidden="true"
      />

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.18, ease: "easeOut" }}
        className="relative z-10 my-auto w-full max-w-3xl rounded-3xl border-surface-400 bg-surface-100 shadow-lift"
      >
        {/* ================= الترويسة ================= */}
        <div className="flex items-start justify-between gap-3 border-b border-surface-400 px-5 py-4 sm:px-6">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-[17px] font-extrabold text-brand-900">{info.full_name || "—"}</h2>
              <StatusBadge status={application.status} />
            </div>
            <p className="mt-1 text-[12.5px] font-semibold text-brand-900/65">
              قدّم على: <span className="text-brand-900">{application.selected_job || "—"}</span>
              {" · "}
              {formatDateTime(application.created_at)}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isPending}
            aria-label="إغلاق"
            className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-surface-300 text-brand-900/80 transition-colors duration-150 hover:bg-surface-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-400/40 disabled:opacity-50"
          >
            <IconClose className="h-[18px] w-[18px]" />
          </button>
        </div>

        {/* max-h أكبر عشان لوحة الـ HR تبان من غير سكرول زايد */}
        <div className="max-h-[78vh] overflow-y-auto px-5 py-5 sm:px-6">
          {/* ============ تنبيه: وظيفة مكتوبة بإيد المتقدم ============ */}
          {isCustomJob && (
            <div className="mb-5 flex items-start gap-3 rounded-2xl border-violet-200 bg-violet-50 px-4 py-3.5">
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-violet-100 text-violet-700">
                <IconAlert className="h-4 w-4" />
              </span>
              <div className="min-w-0">
                <p className="text-[13.5px] font-extrabold text-violet-900">
                  المتقدم كتب الوظيفة بنفسه (غير ذلك)
                </p>
                <p className="mt-0.5 text-[12.5px] font-semibold leading-relaxed text-violet-800/85">
                  الوظيفة المطلوبة مش من القائمة المتاحة — راجعها قبل ما تقر.
                </p>
              </div>
            </div>
          )}

          {/* ================= بيانات العامل الكاملة ================= */}
          <section aria-labelledby="applicant-data-heading">
            <h3
              id="applicant-data-heading"
              className="text-[13px] font-extrabold uppercase tracking-wider text-brand-900/55"
            >
              بيانات المتقدم
            </h3>

            {/*
              ملاحظة تخطيط: بفصل الحقول في مجموعات منطقية (أساسية / تعليم
              / موقف وخبرة) بدل شبكة عشوائية. العمود بيبقر حسب عرض الشاشة،
              والحقول الطويلة (العنوان/الشركات) بتاخد الصف كامل — كده مفيش
              أي خلية فاضية بتبان مكسورة زي ما كان بيحصل قبل كده.
            */}
            <div className="mt-3 space-y-4">
              {/* المجموعة 1: البيانات الأساسية */}
              <dl className="grid grid-cols-1 gap-x-5 gap-y-4 rounded-2xl border-surface-400 bg-surface-200/60 p-4 sm:grid-cols-2 sm:p-5 lg:grid-cols-4">
                <DataRow label="الاسم بالكامل" value={info.full_name} />
                <DataRow label="السن" value={application.age} />
                <DataRow label="النوع" value={application.gender} />
                <DataRow label="الحالة الاجتماعية" value={application.marital_status} />
                <DataRow label="رقم التليفون" value={info.phone_number} dir="ltr" />
                <DataRow label="الرقم القومي" value={info.national_id} dir="ltr" />
                <DataRow label="المحافظة" value={application.governorate} />
                <DataRow label="المدينة" value={application.city} />
                <DataRow label="العنوان" value={application.address} wide />
              </dl>

              {/* المجموعة 2: المؤهل والخبرة */}
              <dl className="grid grid-cols-1 gap-x-5 gap-y-4 rounded-2xl border-surface-400 bg-surface-200/60 p-4 sm:grid-cols-2 sm:p-5 lg:grid-cols-4">
                <DataRow label="المؤهل" value={application.education_level} />
                <DataRow label="التخصص" value={application.specialization} />
                <DataRow label="سنوات الخبرة" value={application.experience_years} />
                <DataRow label="الموقف من التجنيد" value={application.military_status} />
                <DataRow
                  label="أقل مرتب متوقع"
                  value={
                    application.expected_salary
                      ? `${formatNumber(application.expected_salary)} ج.م`
                      : null
                  }
                />
                <DataRow label="تاريخ التقديم" value={formatDateTime(application.created_at)} />
                <DataRow label="الشركات السابقة" value={application.previous_companies} wide />
                <DataRow label="الوظيفة المطلوبة" value={application.selected_job} wide />
              </dl>
            </div>
          </section>

          {/* ================= لوحة الـ HR ================= */}
          <section
            aria-labelledby="hr-panel-heading"
            className="mt-6 rounded-2xl border-brand-200 bg-brand-50/60 p-4 sm:p-5"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 id="hr-panel-heading" className="flex items-center gap-2 text-[14px] font-extrabold text-brand-900">
                <span className="grid h-7 w-7 place-items-center rounded-lg bg-brand-100 text-brand-700">
                  <IconChat className="h-4 w-4" />
                </span>
                لوحة الموارد البشرية
              </h3>

              {/* زر التعديل اليدوي — متاح دايماً (مش شرط العامل يرد) */}
              <button
                type="button"
                onClick={() => setEditOpen((open) => !open)}
                disabled={isPending}
                aria-expanded={editOpen}
                className="flex items-center gap-1.5 rounded-xl border-brand-300 bg-surface-100 px-3 py-2 text-[13px] font-bold text-brand-800 transition-colors duration-150 hover:bg-brand-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/30 disabled:opacity-55"
              >
                <IconUser className="h-4 w-4" />
                {editOpen ? "إغلاق التعديل اليدوي" : "تعديل بيانات العامل"}
              </button>
            </div>

            {/* ================= التعديل اليدوي لبيانات العامل ================= */}
            <AnimatePresence initial={false}>
              {editOpen && (
                <motion.div
                  key="hr-edit-form"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.2, ease: "easeOut" }}
                  className="overflow-hidden"
                >
                  <div className="mt-4 rounded-2xl border-emerald-300 bg-emerald-50/70 p-4">
                    <p className="text-[13px] font-extrabold text-emerald-900">تعديل بيانات العامل يدوياً</p>
                    <p className="mt-0.5 text-[12px] font-semibold text-emerald-900/80">
                      عدّل أي بيان هنا (زي الرقم القومي الناقص) واحفظه مباشرة في قاعدة البيانات —
                      بدون انتظار العامل يرجع للموقع.
                    </p>

                    <div className="mt-3.5 grid gap-3 sm:grid-cols-2">
                      {FORM_FIELDS.map((field) => (
                        <div key={field.key} className={field.key === "selected_job" || field.key === "address" ? "sm:col-span-2" : ""}>
                          <EditField field={field} value={editValues[field.key]} onChange={setEditValue} />
                          {editErrors[field.key] && (
                            <p className="mt-1 text-[11.5px] font-bold text-rose-700">{editErrors[field.key]}</p>
                          )}
                        </div>
                      ))}
                    </div>

                    <div className="mt-4 flex-wrap items-center gap-3">
                      <button
                        type="button"
                        onClick={saveEdit}
                        disabled={isPending}
                        className="flex items-center justify-center gap-2 rounded-xl bg-emerald-700 px-5 py-2.5 text-[13.5px] font-bold text-white transition-colors duration-150 hover:bg-emerald-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/50 disabled:cursor-not-allowed disabled:opacity-55"
                      >
                        {isPending ? (
                          <>
                            <IconLoader className="h-4 w-4 animate-spin" />
                            <span>جاري الحفظ…</span>
                          </>
                        ) : (
                          "حفظ بيانات العامل"
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setEditValues(toEditValues(application));
                          setEditErrors({});
                        }}
                        disabled={isPending}
                        className="rounded-xl bg-surface-300 px-4 py-2.5 text-[13px] font-bold text-brand-900/80 transition-colors duration-150 hover:bg-surface-400 disabled:opacity-55"
                      >
                        استرجاع الأصلي
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {editSaved && (
              <motion.span
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-3 inline-flex items-center gap-1.5 rounded-xl bg-emerald-50 px-3 py-2 text-[12.5px] font-bold text-emerald-800 ring-1 ring-inset ring-emerald-200"
              >
                ✓ تم حفظ بيانات العامل في قاعدة البيانات
              </motion.span>
            )}

            {/* -------- اختيار الحالة -------- */}
            <fieldset className="mt-4">
              <legend className="text-[12.5px] font-bold text-brand-900/80">حالة الطلب</legend>
              <div className="mt-2 grid gap-2 sm:grid-cols-2">
                {APPLICATION_STATUSES.map((s) => {
                  const active = draft.status === s.value;
                  return (
                    <button
                      key={s.value}
                      type="button"
                      onClick={() => setDraft((d) => ({ ...d, status: s.value }))}
                      disabled={isPending}
                      aria-pressed={active}
                      className={`flex items-center gap-2.5 rounded-xl border px-3.5 py-2.5 text-right text-[13.5px] font-bold transition-colors duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/30 disabled:opacity-60 ${active
                          ? "border-brand-500 bg-brand-600 text-white shadow-sm"
                          : "border-surface-400 bg-surface-100 text-brand-900/80 hover:border-brand-300 hover:bg-brand-50"
                        }`}
                    >
                      <span
                        className={`h-2 w-2 shrink-0 rounded-full ${active ? "bg-white" : DOT_CLASSES[s.tone]
                          }`}
                        aria-hidden="true"
                      />
                      {s.label}
                    </button>
                  );
                })}
              </div>
            </fieldset>

            {/*
              -------- حقول الاستكمال (تظهر في حالة "مطلوب استكمال بيانات" بس) --------
              علّم على الحقول اللي فيها مشكلة. الحقول دي هي اللي هتفتح
              للعامل في الموقع عشان يعدّلها — والباقي بيفضل متجمّد.
            */}
            <AnimatePresence initial={false}>
              {isNeedsInfo && (
                <motion.div
                  key="completion-fields"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.2, ease: "easeOut" }}
                  className="overflow-hidden"
                >
                  <div className="mt-4 rounded-2xl border-amber-300 bg-amber-50/70 p-4">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-[13px] font-extrabold text-amber-900">
                          الحقول المطلوب استكمالها
                        </p>
                        <p className="mt-0.5 text-[12px] font-semibold text-amber-900/80">
                          علّم على الحقول اللي فيها مشكلة — هي دي بس اللي هتفتح للمتقدم
                          على الموقع عشان يعدّلها. الباقي هيفضل متجمّد.
                        </p>
                      </div>

                      {/* تحديد/إلغاء الكل */}
                      <div className="flex shrink-0 items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => toggleAll(true)}
                          disabled={isPending}
                          className="rounded-lg bg-surface-300 px-2.5 py-1.5 text-[12px] font-bold text-brand-900/80 transition-colors duration-150 hover:bg-surface-400 disabled:opacity-50"
                        >
                          تحديد الكل
                        </button>
                        <button
                          type="button"
                          onClick={() => toggleAll(false)}
                          disabled={isPending || draft.completionFields.length === 0}
                          className="rounded-lg bg-surface-300 px-2.5 py-1.5 text-[12px] font-bold text-brand-900/80 transition-colors duration-150 hover:bg-surface-400 disabled:opacity-50"
                        >
                          إلغاء الكل
                        </button>
                      </div>
                    </div>

                    {/* ==== مربعات التحديد ==== */}
                    <div className="mt-3.5 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                      {SELECTABLE_FIELDS.map((field) => {
                        const checked = draft.completionFields.includes(field.key);
                        return (
                          <label
                            key={field.key}
                            className={`flex cursor-pointer items-center gap-2.5 rounded-xl border px-3 py-2.5 transition-colors duration-150 ${
                              checked
                                ? "border-amber-400 bg-amber-100"
                                : "border-surface-400 bg-surface-100 hover:border-amber-300"
                            } ${isPending ? "cursor-not-allowed opacity-60" : ""}`}
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              disabled={isPending}
                              onChange={() => toggleField(field.key)}
                              value={field.key}
                              className="h-4 w-4 shrink-0 accent-amber-600"
                            />
                            <span className="min-w-0 truncate text-[13px] font-bold text-brand-900">
                              {field.label}
                            </span>
                          </label>
                        );
                      })}
                    </div>

                    <p className="mt-3 text-[12px] font-bold text-amber-900/80">
                      {draft.completionFields.length === 0
                        ? "⚠ لسه ماخترتش أي حقل — المتقدم هيملأ بيانات جديدة كاملة."
                        : `✓ هيتفتح للمتقدم ${draft.completionFields.length} حقل للتعديل.`}
                    </p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* -------- ملاحظات الـ HR -------- */}
            <div className="mt-4">
              <label htmlFor="hr-notes" className="block text-[12.5px] font-bold text-brand-900/80">
                ملاحظات الـ HR
              </label>
              <p className="mt-0.5 text-[12px] font-semibold text-brand-900/60">
                اكتب سبب الرفض أو الورق الناقص — الملاحظات بتظهر للمتقدم في صفحة «تتبع الطلب» على الموقع.
              </p>
              <textarea
                id="hr-notes"
                rows={3}
                maxLength={2000}
                value={draft.hrNotes}
                onChange={(e) => setDraft((d) => ({ ...d, hrNotes: e.target.value }))}
                disabled={isPending}
                placeholder="مثال: مطلوب صورة البطاقة + شهادة الخبرة…"
                className="field-light field-area mt-2"
              />
              <p className="mt-1 text-left text-[11.5px] text-brand-900/50" dir="ltr">
                {draft.hrNotes.length} / 2000
              </p>
            </div>

            {/* -------- تنبيه الرفض -------- */}
            {draft.status === "rejected" && (
              <p className="mt-3 rounded-xl border-rose-200 bg-rose-50 px-3.5 py-2.5 text-[12.5px] font-semibold text-rose-800">
                الملاحظات هتسجّل كـ «سبب رفض» وبتظهر للمتقدم في صندوق مخصص.
              </p>
            )}

            {/* -------- أخطاء -------- */}
            <AnimatePresence>
              {error && (
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  role="alert"
                  className="mt-3 rounded-xl border-rose-200 bg-rose-50 px-3.5 py-2.5 text-[13px] font-bold text-rose-800"
                >
                  {error}
                </motion.p>
              )}
            </AnimatePresence>

            {/* -------- الحفظ -------- */}
            <div className="mt-4 flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={save}
                disabled={isPending || !dirty}
                className="btn-shine flex items-center justify-center gap-2 rounded-xl bg-brand-700 px-6 py-2.5 text-[14px] font-bold text-white transition-colors duration-150 hover:bg-brand-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-400/50 disabled:cursor-not-allowed disabled:opacity-55"
              >
                {isPending ? (
                  <>
                    <IconLoader className="relative z-10 h-4 w-4 animate-spin" />
                    <span className="relative z-10">جاري الحفظ…</span>
                  </>
                ) : (
                  <span className="relative z-10">حفظ التغييرات</span>
                )}
              </button>

              {saved && (
                <motion.span
                  initial={{ opacity: 0, x: 8 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="flex items-center gap-1.5 rounded-xl bg-emerald-50 px-3 py-2 text-[13px] font-bold text-emerald-800 ring-1 ring-inset ring-emerald-200"
                >
                  ✓ تم الحفظ وظهر للمتقدم على الموقع
                </motion.span>
              )}

              {!dirty && !saved && (
                <span className="text-[12.5px] font-semibold text-brand-900/55">
                  مفيش تغييرات لسه.
                </span>
              )}
            </div>

            {application.reviewed_by && (
              <p className="mt-3 border-t border-brand-200 pt-3 text-[12px] font-semibold text-brand-900/60">
                آخر مراجعة: {application.reviewed_by} · {formatDateTime(application.reviewed_at)}
              </p>
            )}

            {/* -------- منطقة الخطر: نقل الطلب للأرشيف (مخفية في وضع الأرشيف) -------- */}
            {!archived && (
            <div className="mt-4 rounded-2xl border-rose-200 bg-rose-50/60 p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[13px] font-extrabold text-rose-900">نقل الطلب للأرشيف</p>
                  <p className="mt-0.5 text-[12px] font-semibold leading-relaxed text-rose-900/75">
                    الطلب مش هيتحذف نهائًا — بينتقل للأرشيف وتقدر تستعيده في أي وقت.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => { setDeleteError(""); setDeleteOpen(true); }}
                  disabled={isPending || deleteBusy}
                  className="flex shrink-0 items-center gap-1.5 rounded-xl border-rose-300 bg-white px-3.5 py-2 text-[13px] font-bold text-rose-700 transition-colors duration-150 hover:bg-rose-100 disabled:opacity-50"
                >
                  <IconTrash className="h-4 w-4" />
                  حذف
                </button>
              </div>

              {/* تأكيد الحذف — خطوة واحدة مقصودة تمنع الحذف بالغلط */}
              <AnimatePresence initial={false}>
                {deleteOpen && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.18, ease: "easeOut" }}
                    className="overflow-hidden"
                  >
                    <div className="mt-3 rounded-xl border-rose-200 bg-white p-3.5">
                      <p className="text-[13px] font-bold text-rose-900">
                        متأكد إنك عايز تنقل الطلب للأرشيف؟
                      </p>
                      {deleteError && (
                        <p role="alert" className="mt-2 rounded-lg bg-rose-50 px-3 py-2 text-[12.5px] font-bold text-rose-800">
                          {deleteError}
                        </p>
                      )}
                      <div className="mt-3 flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={confirmDelete}
                          disabled={deleteBusy}
                          className="flex items-center justify-center gap-2 rounded-xl bg-rose-600 px-4 py-2 text-[13px] font-bold text-white transition-colors duration-150 hover:bg-rose-700 disabled:opacity-60"
                        >
                          {deleteBusy ? (
                            <>
                              <IconLoader className="h-4 w-4 animate-spin" />
                              جاري النقل…
                            </>
                          ) : (
                            "نعم، نقل للأرشيف"
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteOpen(false)}
                          disabled={deleteBusy}
                          className="rounded-xl bg-surface-300 px-4 py-2 text-[13px] font-bold text-brand-900/80 transition-colors duration-150 hover:bg-surface-400 disabled:opacity-60"
                        >
                          إلغاء
                        </button>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            )}
          </section>
        </div>
      </motion.div>
    </div>
  );
}
