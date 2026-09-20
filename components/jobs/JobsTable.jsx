"use client";

import { useMemo, useState } from "react";
import JobModal from "@/components/jobs/JobModal";
import { IconLoader, IconBriefcase } from "@/components/icons";
import { createJob, updateJob, deleteJob } from "@/lib/actions/jobs";

/* تنسيق التاريخ بالعربي */
function formatDate(value) {
  if (!value) return "—";
  try {
    return new Intl.DateTimeFormat("ar-EG", {
      year: "numeric",
      month: "short",
      day: "numeric",
    }).format(new Date(value));
  } catch {
    return "—";
  }
}

/* تنسيق الراتب */
function formatSalary(from, to) {
  const n = (v) => (v == null ? null : Number(v).toLocaleString("en-US"));
  if (from == null && to == null) return "—";
  if (from != null && to != null) return `${n(from)} - ${n(to)} ج.م`;
  return `${n(from ?? to)} ج.م`;
}

function StatusBadge({ status }) {
  const available = status === "available";
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[12.5px] font-bold ${available ? "bg-emerald-50 text-emerald-800" : "bg-surface-300 text-brand-900/75"
        }`}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full ${available ? "bg-emerald-500" : "bg-brand-900/55"}`}
      />
      {available ? "متاح" : "مغلق"}
    </span>
  );
}

export default function JobsTable({ jobs }) {
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [confirmJob, setConfirmJob] = useState(null);
  const [busyId, setBusyId] = useState(null);
  const [toast, setToast] = useState(null);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return jobs.filter((job) => {
      const matchQuery =
        !q ||
        (job.title || "").toLowerCase().includes(q) ||
        (job.company || "").toLowerCase().includes(q);
      const matchStatus = statusFilter === "all" || job.status === statusFilter;
      return matchQuery && matchStatus;
    });
  }, [jobs, query, statusFilter]);

  function showToast(message, tone = "ok") {
    setToast({ message, tone });
    setTimeout(() => setToast(null), 3200);
  }

  function openAdd() {
    setEditing(null);
    setModalOpen(true);
  }

  function openEdit(job) {
    setEditing(job);
    setModalOpen(true);
  }

  /** بيتنادى من المودال — بيفرّق بين إضافة وتعديل */
  async function handleSave(id, form) {
    const result = id ? await updateJob(id, form) : await createJob(form);
    if (result.ok) showToast(result.message);
    return result;
  }

  async function handleDelete() {
    if (!confirmJob) return;
    setBusyId(confirmJob.id);
    const result = await deleteJob(confirmJob.id);
    setBusyId(null);
    setConfirmJob(null);
    showToast(result.ok ? result.message : result.error, result.ok ? "ok" : "err");
  }

  return (
    <div className="space-y-5">
      {/* شريط الأدوات */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 flex-col gap-2.5 sm:flex-row sm:items-center">
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="ابحث باسم الوظيفة أو الشركة…"
            className="field-light w-full rounded-2xl px-3.5 py-2.5 text-[14px] sm:max-w-xs"
          />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="field-light w-full rounded-2xl px-3.5 py-2.5 text-[14px] sm:w-40"
          >
            <option value="all">كل الحالات</option>
            <option value="available">متاح</option>
            <option value="closed">مغلق</option>
          </select>
        </div>

        <button
          type="button"
          onClick={openAdd}
          className="btn-shine flex items-center justify-center gap-2 rounded-2xl bg-brand-700 px-5 py-2.5 text-[14px] font-bold text-white transition-colors duration-150 hover:bg-brand-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-400/50"
        >
          <span className="relative z-10 text-[17px] leading-none">+</span>
          <span className="relative z-10">إضافة وظيفة</span>
        </button>
      </div>

      {/* الجدول */}
      <div className="overflow-hidden rounded-3xl glass-light">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[54rem] border-collapse text-right">
            <thead>
              <tr className="border-b border-surface-400 bg-surface-300/60">
                <th className="px-4 py-3 text-[12px] font-bold uppercase tracking-wider text-brand-900/75">
                  الوظيفة
                </th>
                <th className="px-4 py-3 text-[12px] font-bold uppercase tracking-wider text-brand-900/75">
                  الراتب
                </th>
                <th className="px-4 py-3 text-center text-[12px] font-bold uppercase tracking-wider text-brand-900/75">
                  المطلوب
                </th>
                <th className="px-4 py-3 text-center text-[12px] font-bold uppercase tracking-wider text-brand-900/75">
                  المتقدمون
                </th>
                <th className="px-4 py-3 text-center text-[12px] font-bold uppercase tracking-wider text-brand-900/75">
                  الحالة
                </th>
                <th className="px-4 py-3 text-[12px] font-bold uppercase tracking-wider text-brand-900/75">
                  تاريخ الإضافة
                </th>
                <th className="px-4 py-3 text-center text-[12px] font-bold uppercase tracking-wider text-brand-900/75">
                  إجراءات
                </th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-14 text-center">
                    <span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-surface-300 text-brand-900/60">
                      <IconBriefcase className="h-5 w-5" />
                    </span>
                    <p className="mt-3 text-[14.5px] font-bold text-brand-900/85">
                      {jobs.length === 0 ? "مفيش وظائف مضافة بعد" : "مفيش نتائج مطابقة"}
                    </p>
                    <p className="mt-1 text-[13px] font-semibold text-brand-900/65">
                      {jobs.length === 0
                        ? "ابدأ بإضافة أول وظيفة من زرار «إضافة وظيفة»."
                        : "جرّب تغيّر كلمة البحث أو فلتر الحالة."}
                    </p>
                  </td>
                </tr>
              )}

              {filtered.map((job) => (
                <tr
                  key={job.id}
                  className="border-b border-surface-400/70 transition-colors duration-150 last:border-0 hover:bg-white/70"
                >
                  {/* الوظيفة */}
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-3">
                      <span
                        className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl text-[11px] font-extrabold text-white ${job.company_tone || "bg-brand-600"
                          }`}
                      >
                        {(job.company_logo || job.company || job.title || "؟").slice(0, 3)}
                      </span>
                      <div className="min-w-0">
                        <p className="truncate text-[14px] font-bold text-brand-900">
                          {job.title}
                        </p>
                        <p className="truncate text-[12.5px] font-semibold text-brand-900/65">
                          {job.company || "—"}
                          {job.location ? ` · ${job.location}` : ""}
                        </p>
                      </div>
                    </div>
                  </td>

                  {/* الراتب */}
                  <td className="whitespace-nowrap px-4 py-3.5 text-[13.5px] font-semibold text-brand-900">
                    {formatSalary(job.salary_from, job.salary_to)}
                  </td>

                  {/* المطلوب */}
                  <td className="px-4 py-3.5 text-center text-[13.5px] font-bold text-brand-900">
                    {job.required_count ?? 0}
                  </td>

                  {/* المتقدمون */}
                  <td className="px-4 py-3.5 text-center">
                    <span className="inline-flex min-w-9 justify-center rounded-full bg-brand-100 px-2.5 py-1 text-[13px] font-bold text-brand-800">
                      {job.applicants ?? 0}
                    </span>
                  </td>

                  {/* الحالة */}
                  <td className="px-4 py-3.5 text-center">
                    <StatusBadge status={job.status} />
                  </td>

                  {/* التاريخ */}
                  <td className="whitespace-nowrap px-4 py-3.5 text-[13px] font-semibold text-brand-900/80">
                    {formatDate(job.created_at)}
                  </td>

                  {/* إجراءات */}
                  <td className="px-4 py-3.5">
                    <div className="flex items-center justify-center gap-2">
                      <button
                        type="button"
                        onClick={() => openEdit(job)}
                        className="rounded-xl bg-surface-300 px-3 py-1.5 text-[13px] font-bold text-brand-800 transition-colors duration-150 hover:bg-brand-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-400/40"
                      >
                        تعديل
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmJob(job)}
                        className="rounded-xl bg-surface-300 px-3 py-1.5 text-[13px] font-bold text-rose-600 transition-colors duration-150 hover:bg-rose-50 hover:text-rose-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-300/40"
                      >
                        حذف
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* تذييل الجدول */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-surface-400 bg-surface-300/50 px-4 py-3">
          <p className="text-[13px] font-semibold text-brand-900/70">
            إجمالي الوظائف: <span className="font-bold text-brand-900">{jobs.length}</span>
            {" · "}
            الظاهر: <span className="font-bold text-brand-900">{filtered.length}</span>
          </p>
        </div>
      </div>

      {/* مودال الإضافة/التعديل */}
      <JobModal
        open={modalOpen}
        job={editing}
        onClose={() => setModalOpen(false)}
        onSave={handleSave}
      />

      {/* تأكيد الحذف */}
      {confirmJob && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-brand-950/30"
            onClick={() => !busyId && setConfirmJob(null)}
            aria-hidden="true"
          />
          <div
            role="dialog"
            aria-modal="true"
            className="relative z-10 w-full max-w-md rounded-3xl border-surface-400 bg-surface-100 p-6 shadow-lift"
          >
            <h3 className="text-[16.5px] font-extrabold text-brand-900">تأكيد الحذف</h3>
            <p className="mt-2 text-[14px] font-semibold leading-relaxed text-brand-900/75">
              هتحذف وظيفة <span className="font-bold text-brand-900">«{confirmJob.title}»</span>{" "}
              نهائيًا. الإجراء ده مش ممكن التراجع عنه.
            </p>
            <div className="mt-5 flex-col-reverse gap-2.5 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setConfirmJob(null)}
                disabled={Boolean(busyId)}
                className="rounded-2xl bg-surface-300 px-5 py-2.5 text-[14px] font-bold text-brand-900/90 transition-colors duration-150 hover:bg-surface-400 hover:text-brand-900 disabled:opacity-50"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={Boolean(busyId)}
                className="flex items-center justify-center gap-2 rounded-2xl bg-rose-600 px-6 py-2.5 text-[14px] font-bold text-white transition-colors duration-150 hover:bg-rose-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-300/50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {busyId ? (
                  <>
                    <IconLoader className="h-4 w-4 animate-spin" />
                    جاري الحذف…
                  </>
                ) : (
                  "تأكيد الحذف"
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* التنبيه */}
      {toast && (
        <div
          role="status"
          className={`fixed bottom-5 left-1/2 z-[80] -translate-x-1/2 rounded-2xl px-5 py-3 text-[13.5px] font-bold shadow-lift ${toast.tone === "ok"
              ? "bg-emerald-600 text-white"
              : "bg-rose-600 text-white"
            }`}
        >
          {toast.message}
        </div>
      )}
    </div>
  );
}
