"use client";

import { useMemo, useState } from "react";
import { IconInbox, IconAlert } from "@/components/icons";
import { APPLICATION_STATUSES } from "@/lib/applications";
import { formatDate } from "@/lib/format";
import ApplicantModal, { StatusBadge } from "./ApplicantModal";

/* ==========================================================================
   جدول طلبات التوظيف
   --------------------------------------------------------------------------
   - بحث فوري بالرقم القومي أو رقم التليفون أو الاسم
   - فلترة بالحالة + بالوظيفة
   - الضغط على أي صف بيفتح نافذة التفاصيل الكاملة + لوحة الـ HR
   - الفلترة كلها في المتصفح (البيانات محمّلة مرة واحدة) → إحساس فوري
   ========================================================================== */

export default function ApplicationsTable({ applications = [] }) {
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [jobFilter, setJobFilter] = useState("all");
  const [selected, setSelected] = useState(null);
  // 🛡️ حزام أمان: لو الوارد مش مصفوفة، بنشتغل على [] عشان الصفحة ما تنهارش
  const [rows, setRows] = useState(Array.isArray(applications) ? applications : []);

  /* أسماء الوظائف للفلترة — مشتقة من الطلبات نفسها */
  const jobOptions = useMemo(() => {
    const set = new Set(rows.map((a) => (a.selected_job || "").trim()).filter(Boolean));
    return [...set].sort();
  }, [rows]);

  /* عدّادات الحالات */
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
      const matchJob = jobFilter === "all" || (a.selected_job || "").trim() === jobFilter;

      let matchQuery = true;
      if (q) {
        const nationalId = String(a.national_id || "").replace(/\s/g, "");
        const phone = String(a.phone_number || "").replace(/\s/g, "");
        const name = String(a.full_name || "");
        matchQuery =
          nationalId.includes(q) || phone.includes(q) || name.includes(query.trim());
      }

      return matchStatus && matchJob && matchQuery;
    });
  }, [rows, query, statusFilter, jobFilter]);

  /* لما الـ HR يحفظ، بنحدّث الصف في القائمة فوراً من غير إعادة تحميل */
  function handleUpdated(updated) {
    if (!updated?.id) return;
    setRows((current) =>
      current.map((row) => (row.id === updated.id ? { ...row, ...updated } : row))
    );
    setSelected((current) => (current ? { ...current, ...updated } : current));
  }

  const resetFilters = () => {
    setQuery("");
    setStatusFilter("all");
    setJobFilter("all");
  };

  const hasFilters = query || statusFilter !== "all" || jobFilter !== "all";

  return (
    <div className="space-y-5">
      {/* ================= شريط البحث ================= */}
      <div className="glass-light rounded-3xl p-4 sm:p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          {/* البحث */}
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
              placeholder="ابحث بالرقم القومي أو رقم التليفون أو الاسم…"
              aria-label="بحث في الطلبات"
              className="field-light w-full rounded-2xl py-2.5 pl-4 pr-11 text-[14px]"
            />
          </div>

          {/* فلتر الوظيفة */}
          <select
            value={jobFilter}
            onChange={(e) => setJobFilter(e.target.value)}
            aria-label="فلترة حسب الوظيفة"
            className="field-light w-full rounded-2xl px-3.5 py-2.5 text-[14px] sm:w-56"
          >
            <option value="all">كل الوظائف</option>
            {jobOptions.map((job) => (
              <option key={job} value={job}>
                {job}
              </option>
            ))}
          </select>

          {hasFilters && (
            <button
              type="button"
              onClick={resetFilters}
              className="shrink-0 rounded-2xl bg-surface-300 px-4 py-2.5 text-[13.5px] font-bold text-brand-900/80 transition-colors duration-150 hover:bg-surface-400"
            >
              إلغاء الفلترة
            </button>
          )}
        </div>

        {/* ================= شرايح الحالة ================= */}
        <div className="mt-4 flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setStatusFilter("all")}
            aria-pressed={statusFilter === "all"}
            className={`rounded-full px-3.5 py-1.5 text-[13px] font-bold transition-colors duration-150 ${statusFilter === "all"
                ? "bg-brand-700 text-white"
                : "bg-surface-300 text-brand-900/75 hover:bg-surface-400"
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
                className={`rounded-full px-3.5 py-1.5 text-[13px] font-bold transition-colors duration-150 disabled:opacity-45 ${active
                    ? "bg-brand-700 text-white"
                    : "bg-surface-300 text-brand-900/75 hover:bg-surface-400"
                  }`}
              >
                {s.label} ({n})
              </button>
            );
          })}
        </div>
      </div>

      {/* ================= الجدول ================= */}
      <div className="overflow-hidden rounded-3xl glass-light">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[58rem] border-collapse text-right">
            <thead>
              <tr className="border-b border-surface-400 bg-surface-300/60">
                <th scope="col" className="px-4 py-3 text-[12px] font-bold uppercase tracking-wider text-brand-900/75">المتقدم</th>
                <th scope="col" className="px-4 py-3 text-[12px] font-bold uppercase tracking-wider text-brand-900/75">الوظيفة</th>
                <th scope="col" className="px-4 py-3 text-[12px] font-bold uppercase tracking-wider text-brand-900/75">رقم التليفون</th>
                <th scope="col" className="px-4 py-3 text-[12px] font-bold uppercase tracking-wider text-brand-900/75">الرقم القومي</th>
                <th scope="col" className="px-4 py-3 text-[12px] font-bold uppercase tracking-wider text-brand-900/75">تاريخ التقديم</th>
                <th scope="col" className="px-4 py-3 text-center text-[12px] font-bold uppercase tracking-wider text-brand-900/75">الحالة</th>
                <th scope="col" className="px-4 py-3 text-center text-[12px] font-bold uppercase tracking-wider text-brand-900/75">تفاصيل</th>
              </tr>
            </thead>

            <tbody>
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-14 text-center">
                    <span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-surface-300 text-brand-900/55">
                      <IconInbox className="h-5 w-5" />
                    </span>
                    <p className="mt-3 text-[14.5px] font-bold text-brand-900/85">
                      {rows.length === 0 ? "مفيش طلبات تقديم بعد" : "مفيش نتائج مطابقة"}
                    </p>
                    <p className="mt-1 text-[13px] font-semibold text-brand-900/65">
                      {rows.length === 0
                        ? "الطلبات هتظهر هنا أول ما المتقدمين يقدّموا من الموقع."
                        : "جرّب تغيّر كلمة البحث أو الفلتر."}
                    </p>
                  </td>
                </tr>
              )}

              {filtered.map((app) => {
                const custom = app.selected_job === "غير ذلك";
                return (
                  <tr
                    key={app.id}
                    onClick={() => setSelected(app)}
                    className="cursor-pointer border-b border-surface-400/70 transition-colors duration-150 last:border-0 hover:bg-brand-50/50"
                  >
                    {/* المتقدم */}
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-3">
                        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-brand-700 text-[13px] font-bold text-white">
                          {(app.full_name || "؟").trim().charAt(0)}
                        </span>
                        <div className="min-w-0">
                          <p className="truncate text-[14px] font-bold text-brand-900">{app.full_name}</p>
                          <p className="truncate text-[12px] font-semibold text-brand-900/60">
                            {app.governorate || "—"}
                          </p>
                        </div>
                      </div>
                    </td>

                    {/* الوظيفة */}
                    <td className="px-4 py-3.5">
                      <div className="flex min-w-0 items-center gap-2">
                        <span className="truncate text-[13.5px] font-semibold text-brand-900" title={app.selected_job}>
                          {app.selected_job || "—"}
                        </span>
                        {custom && (
                          <span
                            title="وظيفة كتبها المتقدم بنفسه"
                            className="shrink-0 rounded-md bg-violet-50 px-1.5 py-0.5 text-[11px] font-bold text-violet-800 ring-1 ring-inset ring-violet-200"
                          >
                            مكتوبة يدوي
                          </span>
                        )}
                      </div>
                    </td>

                    {/* التليفون */}
                    <td className="whitespace-nowrap px-4 py-3.5 text-[13.5px] font-semibold text-brand-900" dir="ltr">
                      {app.phone_number || "—"}
                    </td>

                    {/* الرقم القومي */}
                    <td className="whitespace-nowrap px-4 py-3.5 text-[13px] font-semibold text-brand-900/85" dir="ltr">
                      {app.national_id || "—"}
                    </td>

                    {/* التاريخ */}
                    <td className="whitespace-nowrap px-4 py-3.5 text-[13px] font-semibold text-brand-900/80">
                      {formatDate(app.created_at)}
                    </td>

                    {/* الحالة */}
                    <td className="px-4 py-3.5 text-center">
                      <StatusBadge status={app.status} />
                    </td>

                    {/* تفاصيل */}
                    <td className="px-4 py-3.5 text-center">
                      <span className="rounded-xl bg-surface-300 px-3 py-1.5 text-[13px] font-bold text-brand-800">
                        عرض
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* تذييل */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-surface-400 bg-surface-300/50 px-4 py-3">
          <p className="text-[13px] font-semibold text-brand-900/70">
            إجمالي الطلبات: <span className="font-bold text-brand-900">{rows.length}</span>
            {" · "}
            الظاهر: <span className="font-bold text-brand-900">{filtered.length}</span>
          </p>
          {hasFilters && (
            <p className="flex items-center gap-1.5 text-[12.5px] font-semibold text-brand-900/60">
              <IconAlert className="h-3.5 w-3.5" />
              فلترة مفعّلة
            </p>
          )}
        </div>
      </div>

      {/* ================= نافذة التفاصيل ================= */}
      {selected && (
        <ApplicantModal
          application={selected}
          onClose={() => setSelected(null)}
          onUpdated={handleUpdated}
        />
      )}
    </div>
  );
}
