"use client";

import { useMemo, useState, useTransition } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { IconLoader, IconAlert, IconInbox, IconUser } from "@/components/icons";
import { REQUEST_TYPE_LABELS, SUPPORT_STATUSES, supportStatusMeta } from "@/lib/support";
import { approveSupportRequest, rejectSupportRequest } from "@/lib/actions/support";
import { formatDateTime } from "@/lib/format";

/* ==========================================================================
   جدول طلبات الدعم الفني (للمدير العام)
   --------------------------------------------------------------------------
   بيشوف كل طلبات الموظفين، ولما يفتح الطلب بيعرضله **بيانات الموظف كاملة**
   (الاسم، الإيميل الحالي، الدور/الصلاحية، نوع الطلب، البيانات المطلوبة)
   جنب بعض عشان يتعرّف عليه قبل ما يدوس (موافقة) أو (رفض).
   لو وافق → السيستم ينفّذ التغيير فعلياً.
   ========================================================================== */

const TONE = {
  amber: "bg-amber-50 text-amber-800 ring-amber-200",
  emerald: "bg-emerald-50 text-emerald-800 ring-emerald-200",
  rose: "bg-rose-50 text-rose-800 ring-rose-200",
};

const DOT = {
  amber: "bg-amber-500",
  emerald: "bg-emerald-500",
  rose: "bg-rose-500",
};

const ROLE_LABELS = {
  super_admin: "مدير عام (Super Admin)",
  admin: "موظف (Admin)",
};

/** صف بيان واحد */
function DataRow({ label, value, dir }) {
  return (
    <div>
      <dt className="text-[11px] font-bold uppercase tracking-wider text-brand-900/50">{label}</dt>
      <dd className="mt-0.5 break-words text-[13.5px] font-bold text-brand-900" dir={dir}>
        {value || <span className="font-normal text-brand-900/45">—</span>}
      </dd>
    </div>
  );
}

export default function SupportTable({ requests = [], canReview = true }) {
  // 🛡️ حزام أمان: أي مصدر بيانات مش مصفوفة يتتعامل معاها كقائمة فاضية
  // بدل ما تعمل Client-side exception على الصفحة كلها
  const safeRequests = Array.isArray(requests) ? requests : [];
  const [statusFilter, setStatusFilter] = useState("all");
  const [selected, setSelected] = useState(null);
  const [error, setError] = useState("");
  const [done, setDone] = useState("");
  const [rejectNote, setRejectNote] = useState("");
  const [isPending, startTransition] = useTransition();

  const counts = useMemo(() => {
    const c = { all: safeRequests.length, pending: 0, approved: 0, rejected: 0 };
    for (const r of safeRequests) c[r.status] = (c[r.status] || 0) + 1;
    return c;
  }, [safeRequests]);

  const filtered = useMemo(
    () => (statusFilter === "all" ? safeRequests : safeRequests.filter((r) => r.status === statusFilter)),
    [safeRequests, statusFilter]
  );

  function approve(request) {
    if (isPending) return;
    setError("");
    setDone("");
    startTransition(async () => {
      const result = await approveSupportRequest(request.id);
      if (!result?.ok) {
        setError(result?.error || "تعذّر تنفيذ الطلب، جرّب تاني.");
        return;
      }
      setDone(result.message || "تم تنفيذ الطلب.");
      setSelected(null);
    });
  }

  function reject(request) {
    if (isPending) return;
    setError("");
    setDone("");
    startTransition(async () => {
      const result = await rejectSupportRequest(request.id, rejectNote);
      if (!result?.ok) {
        setError(result?.error || "تعذّر رفض الطلب، جرّب تاني.");
        return;
      }
      setDone(result.message || "تم رفض الطلب.");
      setSelected(null);
      setRejectNote("");
    });
  }

  return (
    <div className="space-y-5">
      {/* ===== شرايح الفلترة ===== */}
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setStatusFilter("all")}
          className={`rounded-full px-3.5 py-1.5 text-[13px] font-bold transition-colors ${statusFilter === "all" ? "bg-brand-700 text-white" : "bg-surface-300 text-brand-900/75 hover:bg-surface-400"
            }`}
        >
          الكل ({counts.all})
        </button>
        {SUPPORT_STATUSES.map((s) => (
          <button
            key={s.value}
            type="button"
            onClick={() => setStatusFilter(s.value)}
            className={`rounded-full px-3.5 py-1.5 text-[13px] font-bold transition-colors disabled:opacity-45 ${statusFilter === s.value ? "bg-brand-700 text-white" : "bg-surface-300 text-brand-900/75 hover:bg-surface-400"
              }`}
            disabled={(counts[s.value] || 0) === 0 && statusFilter !== s.value}
          >
            {s.label} ({counts[s.value] || 0})
          </button>
        ))}
      </div>

      {/* ===== إشعارات ===== */}
      <AnimatePresence>
        {done && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="rounded-xl border-emerald-200 bg-emerald-50 px-3.5 py-2.5 text-[13px] font-bold text-emerald-800"
          >
            ✓ {done}
          </motion.p>
        )}
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
      </AnimatePresence>

      {/* ===== قائمة الطلبات ===== */}
      {filtered.length === 0 ? (
        <div className="rounded-3xl glass-light px-4 py-14 text-center">
          <span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-surface-300 text-brand-900/55">
            <IconInbox className="h-5 w-5" />
          </span>
          <p className="mt-3 text-[14.5px] font-bold text-brand-900/85">
            {safeRequests.length === 0 ? "مفيش طلبات دعم فني لسه" : "مفيش نتائج مطابقة"}
          </p>
          <p className="mt-1 text-[13px] font-semibold text-brand-900/65">
            {safeRequests.length === 0
              ? "الطلبات هتظهر هنا أول ما الموظفين يبعتوها من قسم «حسابي»."
              : "جرّب تغيّر الفلتر."}
          </p>
        </div>
      ) : (
        <div className="grid gap-3">
          {filtered.map((request) => {
            const meta = supportStatusMeta(request.status);
            return (
              <button
                key={request.id}
                type="button"
                onClick={() => {
                  setSelected(request);
                  setError("");
                  setDone("");
                  setRejectNote("");
                }}
                className="glass-light rounded-2xl p-4 text-right transition-shadow duration-150 hover:shadow-lift"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-[14.5px] font-extrabold text-brand-900">
                      {REQUEST_TYPE_LABELS[request.request_type] || request.request_type}
                    </p>
                    <p className="mt-0.5 truncate text-[12.5px] font-semibold text-brand-900/65">
                      من: {request.employee_email}
                    </p>
                  </div>
                  <span
                    className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-[12px] font-bold ring-1 ring-inset ${TONE[meta.tone]}`}
                  >
                    <span className={`h-1.5 w-1.5 rounded-full ${DOT[meta.tone]}`} aria-hidden="true" />
                    {meta.label}
                  </span>
                </div>
                <p className="mt-2 text-[12px] font-semibold text-brand-900/55">
                  {formatDateTime(request.created_at)}
                </p>
              </button>
            );
          })}
        </div>
      )}

      {/* ===== المودال: بيانات الموظف الكاملة + القرار ===== */}
      <AnimatePresence>
        {selected && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[70] flex items-start justify-center overflow-y-auto p-4 sm:items-center"
            role="dialog"
            aria-modal="true"
            aria-label="تفاصيل طلب الدعم الفني"
          >
            <div className="fixed inset-0 bg-brand-950/35" onClick={() => !isPending && setSelected(null)} aria-hidden="true" />

            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              className="relative z-10 my-auto w-full max-w-2xl rounded-3xl border-surface-400 bg-surface-100 p-5 shadow-lift sm:p-6"
            >
              {/* الترويسة */}
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="text-[16px] font-extrabold text-brand-900">
                    {REQUEST_TYPE_LABELS[selected.request_type] || selected.request_type}
                  </h3>
                  <p className="mt-0.5 text-[12.5px] font-semibold text-brand-900/60">
                    {formatDateTime(selected.created_at)}
                  </p>
                </div>
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-surface-300 text-brand-900/60">×</span>
              </div>

              {/* ===== بيانات الموظف الكاملة (المطلوب من الإدارة) ===== */}
              <div className="mt-4 rounded-2xl border-brand-200 bg-brand-50/60 p-4">
                <p className="flex items-center gap-2 text-[13px] font-extrabold text-brand-900">
                  <span className="grid h-7 w-7 place-items-center rounded-lg bg-brand-100 text-brand-700">
                    <IconUser className="h-4 w-4" />
                  </span>
                  بيانات الموظف مقدّم الطلب
                </p>
                <dl className="mt-3 grid-cols-1 gap-x-5 gap-y-3 sm:grid-cols-2">
                  <DataRow label="الاسم" value={selected.employee_name} />
                  <DataRow label="الصلاحية / الوظيفة" value={ROLE_LABELS[selected.employee_role] || selected.employee_role} />
                  <DataRow label="البريد الحالي" value={selected.employee_email} dir="ltr" />
                  <DataRow label="معرّف الحساب" value={selected.employee_id} dir="ltr" />
                </dl>
              </div>

              {/* ===== تفاصيل الطلب ===== */}
              <div className="mt-3 rounded-2xl border-surface-400 bg-surface-200/60 p-4">
                <p className="text-[13px] font-extrabold text-brand-900">تفاصيل الطلب</p>
                <dl className="mt-3 grid-cols-1 gap-x-5 gap-y-3">
                  <DataRow
                    label="نوع الطلب"
                    value={REQUEST_TYPE_LABELS[selected.request_type] || selected.request_type}
                  />
                  {selected.request_type === "email" && (
                    <DataRow label="البريد الجديد المطلوب" value={selected.new_email} dir="ltr" />
                  )}
                  {selected.request_type === "password" && (
                    <div>
                      <dt className="text-[11px] font-bold uppercase tracking-wider text-brand-900/50">
                        كلمة المرور الجديدة
                      </dt>
                      <dd className="mt-0.5 text-[13px] font-bold text-brand-900/70">
                        🔒 مخزّنة مشفّرة — الموافقة بتنفّذ التغيير من غير ما تظهر
                      </dd>
                    </div>
                  )}
                  {selected.message && <DataRow label="ملاحظة الموظف" value={selected.message} />}
                  {selected.status !== "pending" && (
                    <>
                      <DataRow label="راجعه" value={selected.reviewed_by} dir="ltr" />
                      <DataRow label="وقت المراجعة" value={formatDateTime(selected.reviewed_at)} />
                      {selected.review_note && <DataRow label="سبب الرفض" value={selected.review_note} />}
                    </>
                  )}
                </dl>
              </div>

              {/* ===== الإجراءات ===== */}
              {selected.status === "pending" && canReview ? (
                <div className="mt-4">
                  <label className="block text-[12.5px] font-bold text-brand-900/80">
                    سبب الرفض (لو هترفض — اختياري)
                    <input
                      value={rejectNote}
                      onChange={(e) => setRejectNote(e.target.value)}
                      disabled={isPending}
                      className="field-light mt-1.5 w-full rounded-xl px-3.5 py-2.5 text-[14px]"
                      placeholder="مثال: راجع مديرك الأول…"
                    />
                  </label>

                  <div className="mt-4 flex-wrap items-center gap-3">
                    <button
                      type="button"
                      onClick={() => approve(selected)}
                      disabled={isPending}
                      className="btn-shine flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-[14px] font-bold text-white transition-colors hover:bg-emerald-700 disabled:opacity-55"
                    >
                      {isPending ? (
                        <>
                          <IconLoader className="relative z-10 h-4 w-4 animate-spin" />
                          <span className="relative z-10">جاري التنفيذ…</span>
                        </>
                      ) : (
                        <span className="relative z-10">موافقة وتنفيذ</span>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => reject(selected)}
                      disabled={isPending}
                      className="rounded-xl bg-rose-50 px-5 py-2.5 text-[14px] font-bold text-rose-700 ring-1 ring-inset ring-rose-200 transition-colors hover:bg-rose-100 disabled:opacity-55"
                    >
                      رفض الطلب
                    </button>

                    <button
                      type="button"
                      onClick={() => setSelected(null)}
                      disabled={isPending}
                      className="rounded-xl bg-surface-300 px-4 py-2.5 text-[13px] font-bold text-brand-900/75 transition-colors hover:bg-surface-400 disabled:opacity-55"
                    >
                      إغلاق
                    </button>
                  </div>

                  <p className="mt-2 flex items-start gap-1.5 text-[12px] font-semibold text-brand-900/55">
                    <IconAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                    الموافقة بتنفّذ التغيير فوراً على حساب الموظف في قاعدة البيانات.
                  </p>
                </div>
              ) : (
                <div className="mt-4 flex items-center justify-between gap-3">
                  <span className="text-[13px] font-bold text-brand-900/60">
                    {selected.status === "pending" && !canReview
                      ? "المراجعة متاحة للمدير العام بس."
                      : "الطلب اتراجع خلاص."}
                  </span>
                  <button
                    type="button"
                    onClick={() => setSelected(null)}
                    className="rounded-xl bg-surface-300 px-4 py-2.5 text-[13px] font-bold text-brand-900/75 hover:bg-surface-400"
                  >
                    إغلاق
                  </button>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
