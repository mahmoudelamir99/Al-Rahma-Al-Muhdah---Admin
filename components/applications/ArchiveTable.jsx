"use client";

import { useMemo, useState } from "react";
import { IconArchive, IconAlert, IconRestore, IconTrash, IconLoader } from "@/components/icons";
import { APPLICATION_STATUSES } from "@/lib/applicationsMeta";
import { formatDateTime } from "@/lib/format";
import { StatusBadge } from "./ApplicantModal";
import ApplicantModal from "./ApplicantModal";
import { restoreApplication, hardDeleteApplication } from "@/lib/actions/applications";

/* ==========================================================================
   جدول الأرشيف — الطلبات المحذوفة ناعماً (Soft Delete)
   --------------------------------------------------------------------------
   - بحث فوري بالاسم/التليفون/الرقم القومي + فلترة بالحالة (زي القائمة الرئيسية)
   - زرار "استعادة" لأي موظف → الطلب يرجع للقائمة الرئيسية فوراً
   - زرار "حذف نهائي" للمدير العام فقط (Super Admin) — الواجهة بتخفيه
     عن غير المدير العام، والسيرفر بيرفضه كمان لو حد ناداه مباشرةً.
   ========================================================================== */

export default function ArchiveTable({ applications = [], isSuperAdmin = false }) {
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [rows, setRows] = useState(Array.isArray(applications) ? applications : []);
  const [selected, setSelected] = useState(null);
  const [busyId, setBusyId] = useState(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [confirmHardId, setConfirmHardId] = useState(null);

  /* عدّادات الحالات في الأرشيف */
  const counts = useMemo(() => {
    const c = { all: rows.length };
    for (const s of APPLICATION_STATUSES) c[s.value] = 0;
    for (const a of rows) {
      const k = a.status || "pending";
      c[k] = (c[k] || 0) + 1;
    }
    return c;
  }, [rows]);

  /* الفلترة والبحث */
  const filtered = useMemo(() => {
    const q = query.trim().replace(/\s/g, "");
    return rows.filter((a) => {
      const matchStatus = statusFilter === "all" || a.status === statusFilter;
      let matchQuery = true;
      if (q) {
        const nationalId = String(a.national_id || "").replace(/\s/g, "");
        const phone = String(a.phone_number || "").replace(/\s/g, "");
        const name = String(a.full_name || "");
        matchQuery = nationalId.includes(q) || phone.includes(q) || name.includes(query.trim());
      }
      return matchStatus && matchQuery;
    });
  }, [rows, query, statusFilter]);

  /** استعادة طلب — أي موظف */
  async function restore(id) {
    if (busyId) return;
    setError("");
    setNotice("");
    setBusyId(id);
    const result = await restoreApplication(id);
    setBusyId(null);

    if (!result?.ok) {
      setError(result?.error || "تعذّر استعادة الطلب.");
      return;
    }
    setRows((current) => current.filter((row) => row.id !== id));
    setSelected(null);
    setNotice("تم استعادة الطلب للقائمة الرئيسية.");
  }

  /** حذف نهائي — المدير العام فقط */
  async function hardDelete(id) {
    if (busyId) return;
    setError("");
    setNotice("");
    setBusyId(id);
    const result = await hardDeleteApplication(id);
    setBusyId(null);
    setConfirmHardId(null);

    if (!result?.ok) {
      setError(result?.error || "تعذّر الحذف النهائي.");
      return;
    }
    setRows((current) => current.filter((row) => row.id !== id));
    setSelected(null);
    setNotice("تم حذف الطلب نهائيًا من قاعدة البيانات.");
  }

  const hasFilters = query || statusFilter !== "all";

  return (
    <div className="space-y-5">
      {/* ================= شريط البحث والفلترة ================= */}
      <div className="glass-light rounded-3xl p-4 sm:p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <span className="pointer-events-none absolute inset-y-0 right-3.5 grid place-items-center text-brand-900/45">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" className="h-4 w-4" aria-hidden="true">
                <circle cx="11" cy="11" r="7" />
                <path d="m20 20-3.5-3.5" />
              </svg>
            </span>
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="ابحث في الأرشيف بالرقم القومي أو رقم التليفون أو الاسم…"
              aria-label="بحث في الأرشيف"
              className="field-light field-input pr-11"
            />
          </div>

          {hasFilters && (
            <button
              type="button"
              onClick={() => { setQuery(""); setStatusFilter("all"); }}
              className="shrink-0 rounded-2xl bg-surface-300 px-4 py-2.5 text-[13.5px] font-bold text-brand-900/80 transition-colors duration-150 hover:bg-surface-400"
            >
              إلغاء الفلترة
            </button>
          )}
        </div>

        {/* شرايح الحالة */}
        <div className="mt-4 flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setStatusFilter("all")}
            aria-pressed={statusFilter === "all"}
            className={`rounded-full px-3.5 py-1.5 text-[13px] font-bold transition-colors duration-150 ${statusFilter === "all" ? "bg-brand-700 text-white" : "bg-surface-300 text-brand-900/75 hover:bg-surface-400"
              }`}
          >
            الكل ({counts.all})
          </button>

          {APPLICATION_STATUSES.map((s) => {
            const n = counts[s.value] || 0;
            const active = statusFilter === s.value;
            return (
              <button
                key={s.value}
                type="button"
                onClick={() => setStatusFilter(s.value)}
                aria-pressed={active}
                disabled={n === 0 && !active}
                className={`rounded-full px-3.5 py-1.5 text-[13px] font-bold transition-colors duration-150 disabled:opacity-45 ${active ? "bg-brand-700 text-white" : "bg-surface-300 text-brand-900/75 hover:bg-surface-400"
                  }`}
              >
                {s.label} ({n})
              </button>
            );
          })}
        </div>
      </div>

      {/* رسائل النجاح والخطأ */}
      {notice && (
        <p className="rounded-2xl border-emerald-200 bg-emerald-50 px-4 py-3 text-[13.5px] font-bold text-emerald-800">
          ✓ {notice}
        </p>
      )}
      {error && (
        <p role="alert" className="flex items-center gap-2 rounded-2xl border-rose-200 bg-rose-50 px-4 py-3 text-[13.5px] font-bold text-rose-800">
          <IconAlert className="h-4 w-4 shrink-0" />
          {error}
        </p>
      )}

      {/* ================= الجدول ================= */}
      <div className="overflow-hidden rounded-3xl glass-light">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[62rem] border-collapse text-right">
            <thead>
              <tr className="border-b border-surface-400 bg-surface-300/60">
                <th scope="col" className="px-4 py-3 text-[12px] font-bold uppercase tracking-wider text-brand-900/75">المتقدم</th>
                <th scope="col" className="px-4 py-3 text-[12px] font-bold uppercase tracking-wider text-brand-900/75">الوظيفة</th>
                <th scope="col" className="px-4 py-3 text-[12px] font-bold uppercase tracking-wider text-brand-900/75">رقم التليفون</th>
                <th scope="col" className="px-4 py-3 text-[12px] font-bold uppercase tracking-wider text-brand-900/75">الحالة</th>
                <th scope="col" className="px-4 py-3 text-[12px] font-bold uppercase tracking-wider text-brand-900/75">تاريخ الحذف</th>
                <th scope="col" className="px-4 py-3 text-[12px] font-bold uppercase tracking-wider text-brand-900/75">حذفه</th>
                <th scope="col" className="px-4 py-3 text-center text-[12px] font-bold uppercase tracking-wider text-brand-900/75">إجراءات</th>
              </tr>
            </thead>

            <tbody>
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-14 text-center">
                    <span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-surface-300 text-brand-900/55">
                      <IconArchive className="h-5 w-5" />
                    </span>
                    <p className="mt-3 text-[14.5px] font-bold text-brand-900/85">
                      {rows.length === 0 ? "الأرشيف فاضي" : "مفيش نتائج مطابقة"}
                    </p>
                    <p className="mt-1 text-[13px] font-semibold text-brand-900/65">
                      {rows.length === 0
                        ? "الطلبات المحذوفة هتظهر هنا، وتقدر تستعيدها في أي وقت."
                        : "جرّب تغيّر كلمة البحث أو الفلتر."}
                    </p>
                  </td>
                </tr>
              )}

              {filtered.map((app) => (
                <tr
                  key={app.id}
                  className="border-b border-surface-400/70 transition-colors duration-150 last:border-0 hover:bg-brand-50/50"
                >
                  {/* المتقدم */}
                  <td className="cursor-pointer px-4 py-3.5" onClick={() => setSelected(app)}>
                    <div className="flex items-center gap-3">
                      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-brand-900/25 text-[13px] font-bold text-brand-900">
                        {(app.full_name || "؟").trim().charAt(0)}
                      </span>
                      <div className="min-w-0">
                        <p className="truncate text-[14px] font-bold text-brand-900">{app.full_name}</p>
                        <p className="truncate text-[12px] font-semibold text-brand-900/60">{app.governorate || "—"}</p>
                      </div>
                    </div>
                  </td>

                  {/* الوظيفة */}
                  <td className="px-4 py-3.5">
                    <span className="block max-w-[14rem] truncate text-[13.5px] font-semibold text-brand-900" title={app.selected_job}>
                      {app.selected_job || "—"}
                    </span>
                  </td>

                  {/* التليفون */}
                  <td className="whitespace-nowrap px-4 py-3.5 text-[13.5px] font-semibold text-brand-900" dir="ltr">
                    {app.phone_number || "—"}
                  </td>

                  {/* الحالة */}
                  <td className="px-4 py-3.5">
                    <StatusBadge status={app.status} />
                  </td>

                  {/* تاريخ الحذف */}
                  <td className="whitespace-nowrap px-4 py-3.5 text-[13px] font-semibold text-brand-900/80">
                    {app.deleted_at ? formatDateTime(app.deleted_at) : "—"}
                  </td>

                  {/* مين حذفه */}
                  <td className="max-w-[12rem] px-4 py-3.5">
                    <span className="block truncate text-[12.5px] font-semibold text-brand-900/70" dir="ltr" title={app.deleted_by || ""}>
                      {app.deleted_by || "—"}
                    </span>
                  </td>

                  {/* الإجراءات */}
                  <td className="px-4 py-3.5">
                    <div className="flex items-center justify-center gap-2">
                      <button
                        type="button"
                        onClick={() => restore(app.id)}
                        disabled={busyId === app.id}
                        className="flex items-center gap-1.5 rounded-xl bg-emerald-50 px-3 py-1.5 text-[12.5px] font-bold text-emerald-800 ring-1 ring-inset ring-emerald-200 transition-colors duration-150 hover:bg-emerald-100 disabled:opacity-50"
                      >
                        {busyId === app.id ? <IconLoader className="h-4 w-4 animate-spin" /> : <IconRestore className="h-4 w-4" />}
                        استعادة
                      </button>

                      {isSuperAdmin && (
                        confirmHardId === app.id ? (
                          <span className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => hardDelete(app.id)}
                              disabled={busyId === app.id}
                              className="rounded-xl bg-rose-600 px-3 py-1.5 text-[12.5px] font-bold text-white transition-colors duration-150 hover:bg-rose-700 disabled:opacity-50"
                            >
                              تأكيد نهائي
                            </button>
                            <button
                              type="button"
                              onClick={() => setConfirmHardId(null)}
                              disabled={busyId === app.id}
                              className="rounded-xl bg-surface-300 px-3 py-1.5 text-[12.5px] font-bold text-brand-900/80 transition-colors duration-150 hover:bg-surface-400 disabled:opacity-50"
                            >
                              إلغاء
                            </button>
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => { setError(""); setNotice(""); setConfirmHardId(app.id); }}
                            disabled={busyId === app.id}
                            className="flex items-center gap-1.5 rounded-xl bg-rose-50 px-3 py-1.5 text-[12.5px] font-bold text-rose-700 ring-1 ring-inset ring-rose-200 transition-colors duration-150 hover:bg-rose-100 disabled:opacity-50"
                          >
                            <IconTrash className="h-4 w-4" />
                            حذف نهائي
                          </button>
                        )
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* تذييل */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-surface-400 bg-surface-300/50 px-4 py-3">
          <p className="text-[13px] font-semibold text-brand-900/70">
            إجمالي الأرشيف: <span className="font-bold text-brand-900">{rows.length}</span>
            {" · "}
            الظاهر: <span className="font-bold text-brand-900">{filtered.length}</span>
          </p>
          <p className="flex items-center gap-1.5 text-[12.5px] font-semibold text-brand-900/60">
            <IconAlert className="h-3.5 w-3.5" />
            {isSuperAdmin ? "تقدر تحذف نهائيًا بحذر" : "الاستعادة متاحة لك"}
          </p>
        </div>
      </div>

      {/* عرض تفاصيل الطلب من الأرشيف (قراءة) */}
      {selected && (
        <ApplicantModal
          application={selected}
          archived
          onClose={() => setSelected(null)}
          onUpdated={(updated) => {
            setRows((current) => current.map((r) => (r.id === updated.id ? { ...r, ...updated } : r)));
            setSelected((current) => (current ? { ...current, ...updated } : current));
          }}
        />
      )}
    </div>
  );
}
