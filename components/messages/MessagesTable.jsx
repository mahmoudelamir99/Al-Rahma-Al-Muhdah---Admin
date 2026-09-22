"use client";

import { useMemo, useState } from "react";
import { IconMail, IconAlert, IconTrash, IconLoader } from "@/components/icons";
import { formatDateTime } from "@/lib/format";
import { deleteContactMessage } from "@/lib/actions/contactMessages";

/* ==========================================================================
   جدول رسائل الزوار (نموذج "تواصل معنا" في الموقع)
   --------------------------------------------------------------------------
   - بحث فوري بالاسم أو التليفون أو نص الرسالة
   - الضغط على أي صف يفتح الرسالة كاملة (المودال الداخلي)
   - زرار حذف لكل رسالة (محمي بصلاحية messages.delete على السيرفر)
   ========================================================================== */

/** شارة حالة الرسالة (new / read / replied) */
function StatusBadge({ status }) {
  const meta = {
    new: { label: "جديدة", cls: "bg-amber-50 text-amber-800 ring-amber-200" },
    read: { label: "مقروءة", cls: "bg-sky-50 text-sky-800 ring-sky-200" },
    replied: { label: "تم الرد", cls: "bg-emerald-50 text-emerald-800 ring-emerald-200" },
  }[status] || { label: "جديدة", cls: "bg-amber-50 text-amber-800 ring-amber-200" };

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[12.5px] font-bold ring-1 ring-inset ${meta.cls}`}>
      {meta.label}
    </span>
  );
}

export default function MessagesTable({ messages = [], canDelete = false }) {
  const [query, setQuery] = useState("");
  const [rows, setRows] = useState(Array.isArray(messages) ? messages : []);
  const [selected, setSelected] = useState(null);
  const [busyId, setBusyId] = useState(null);
  const [confirmId, setConfirmId] = useState(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  /** الفلترة والبحث — في المتصفح فورًا */
  const filtered = useMemo(() => {
    const q = query.trim().replace(/\s/g, "");
    if (!q) return rows;
    return rows.filter((m) => {
      const phone = String(m.phone_number || "").replace(/\s/g, "");
      const name = String(m.full_name || "");
      const body = String(m.message || "");
      return phone.includes(q) || name.includes(query.trim()) || body.includes(query.trim());
    });
  }, [rows, query]);

  /** حذف رسالة */
  async function remove(id) {
    if (busyId) return;
    setError("");
    setNotice("");
    setBusyId(id);
    const result = await deleteContactMessage(id);
    setBusyId(null);
    setConfirmId(null);

    if (!result?.ok) {
      setError(result?.error || "تعذّر حذف الرسالة.");
      return;
    }
    setRows((current) => current.filter((row) => row.id !== id));
    setSelected(null);
    setNotice("تم حذف الرسالة.");
  }

  return (
    <div className="space-y-5">
      {/* ================= شريط البحث ================= */}
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
              placeholder="ابحث بالاسم أو رقم التليفون أو نص الرسالة…"
              aria-label="بحث في رسائل الزوار"
              className="field-light field-input pr-11"
            />
          </div>
          {query && (
            <button
              type="button"
              onClick={() => setQuery("")}
              className="shrink-0 rounded-2xl bg-surface-300 px-4 py-2.5 text-[13.5px] font-bold text-brand-900/80 transition-colors duration-150 hover:bg-surface-400"
            >
              إلغاء البحث
            </button>
          )}
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

      {/* ================= الجدول — للشاشات الكبيرة ================= */}
      <div className="hidden overflow-hidden rounded-3xl glass-light lg:block">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[60rem] border-collapse text-right">
            <thead>
              <tr className="border-b border-surface-400 bg-surface-300/60">
                <th scope="col" className="px-4 py-3 text-[12px] font-bold uppercase tracking-wider text-brand-900/75">الاسم</th>
                <th scope="col" className="px-4 py-3 text-[12px] font-bold uppercase tracking-wider text-brand-900/75">رقم التليفون</th>
                <th scope="col" className="px-4 py-3 text-[12px] font-bold uppercase tracking-wider text-brand-900/75">سبب التواصل</th>
                <th scope="col" className="px-4 py-3 text-[12px] font-bold uppercase tracking-wider text-brand-900/75">الرسالة</th>
                <th scope="col" className="px-4 py-3 text-[12px] font-bold uppercase tracking-wider text-brand-900/75">التاريخ</th>
                <th scope="col" className="px-4 py-3 text-center text-[12px] font-bold uppercase tracking-wider text-brand-900/75">الحالة</th>
                <th scope="col" className="px-4 py-3 text-center text-[12px] font-bold uppercase tracking-wider text-brand-900/75">إجراء</th>
              </tr>
            </thead>

            <tbody>
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-14 text-center">
                    <span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-surface-300 text-brand-900/55">
                      <IconMail className="h-5 w-5" />
                    </span>
                    <p className="mt-3 text-[14.5px] font-bold text-brand-900/85">
                      {rows.length === 0 ? "مفيش رسائل بعد" : "مفيش نتائج مطابقة"}
                    </p>
                    <p className="mt-1 text-[13px] font-semibold text-brand-900/65">
                      {rows.length === 0
                        ? "الرسائل بتظهر هنا أول ما الزوار يبعتوا من نموذج «تواصل معنا» في الموقع."
                        : "جرّب تغيّر كلمة البحث."}
                    </p>
                  </td>
                </tr>
              )}

              {filtered.map((m) => (
                <tr
                  key={m.id}
                  onClick={() => setSelected(m)}
                  className="cursor-pointer border-b border-surface-400/70 transition-colors duration-150 last:border-0 hover:bg-brand-50/50"
                >
                  {/* الاسم */}
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-3">
                      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-brand-700 text-[13px] font-bold text-white">
                        {(m.full_name || "؟").trim().charAt(0)}
                      </span>
                      <p className="max-w-[12rem] truncate text-[14px] font-bold text-brand-900">{m.full_name}</p>
                    </div>
                  </td>

                  {/* التليفون */}
                  <td className="whitespace-nowrap px-4 py-3.5 text-[13.5px] font-semibold text-brand-900" dir="ltr">
                    {m.phone_number || "—"}
                  </td>

                  {/* سبب التواصل */}
                  <td className="px-4 py-3.5">
                    <span className="block max-w-[12rem] truncate text-[13px] font-semibold text-brand-900/85" title={m.reason}>
                      {m.reason || "—"}
                    </span>
                  </td>

                  {/* نص الرسالة (مختصر) */}
                  <td className="px-4 py-3.5">
                    <span className="block max-w-[18rem] truncate text-[13px] font-semibold text-brand-900/75" title={m.message}>
                      {m.message || "—"}
                    </span>
                  </td>

                  {/* التاريخ */}
                  <td className="whitespace-nowrap px-4 py-3.5 text-[13px] font-semibold text-brand-900/80">
                    {formatDateTime(m.created_at)}
                  </td>

                  {/* الحالة */}
                  <td className="px-4 py-3.5 text-center">
                    <StatusBadge status={m.status} />
                  </td>

                  {/* إجراء (حذف) */}
                  <td className="px-4 py-3.5" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center justify-center">
                      {canDelete ? (
                        confirmId === m.id ? (
                          <span className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => remove(m.id)}
                              disabled={busyId === m.id}
                              className="rounded-xl bg-rose-600 px-3 py-1.5 text-[12.5px] font-bold text-white transition-colors duration-150 hover:bg-rose-700 disabled:opacity-50"
                            >
                              {busyId === m.id ? <IconLoader className="h-4 w-4 animate-spin" /> : "تأكيد"}
                            </button>
                            <button
                              type="button"
                              onClick={() => setConfirmId(null)}
                              disabled={busyId === m.id}
                              className="rounded-xl bg-surface-300 px-3 py-1.5 text-[12.5px] font-bold text-brand-900/80 transition-colors duration-150 hover:bg-surface-400 disabled:opacity-50"
                            >
                              إلغاء
                            </button>
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => { setError(""); setNotice(""); setConfirmId(m.id); }}
                            aria-label={`حذف رسالة ${m.full_name}`}
                            className="flex items-center gap-1.5 rounded-xl bg-rose-50 px-3 py-1.5 text-[12.5px] font-bold text-rose-700 ring-1 ring-inset ring-rose-200 transition-colors duration-150 hover:bg-rose-100"
                          >
                            <IconTrash className="h-4 w-4" />
                            حذف
                          </button>
                        )
                      ) : (
                        <span className="text-[12px] font-semibold text-brand-900/45">عرض فقط</span>
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
            إجمالي الرسائل: <span className="font-bold text-brand-900">{rows.length}</span>
            {" · "}
            الظاهر: <span className="font-bold text-brand-900">{filtered.length}</span>
          </p>
        </div>
      </div>

      {/* ================= كروت الموبايل — بديل الجدول ================= */}
      <div className="space-y-3 lg:hidden">
        {filtered.length === 0 && (
          <div className="glass-light rounded-3xl px-4 py-12 text-center">
            <span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-surface-300 text-brand-900/55">
              <IconMail className="h-5 w-5" />
            </span>
            <p className="mt-3 text-[14.5px] font-bold text-brand-900/85">
              {rows.length === 0 ? "مفيش رسائل بعد" : "مفيش نتائج مطابقة"}
            </p>
            <p className="mt-1 text-[13px] font-semibold text-brand-900/65">
              {rows.length === 0
                ? "الرسائل بتظهر هنا أول ما الزوار يبعتوا من نموذج «تواصل معنا»."
                : "جرّب تغيّر كلمة البحث."}
            </p>
          </div>
        )}

        {filtered.map((m) => (
          <article key={m.id} className="glass-light rounded-2xl p-4">
            {/* الرأس: الاسم + الحالة */}
            <div className="flex items-start gap-3">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-brand-700 text-[14px] font-bold text-white">
                {(m.full_name || "؟").trim().charAt(0)}
              </span>
              <div className="min-w-0 flex-1">
                <p className="break-words text-[15px] font-extrabold text-brand-900">{m.full_name || "—"}</p>
                <p className="mt-0.5 text-[12px] font-semibold text-brand-900/60">{formatDateTime(m.created_at)}</p>
              </div>
              <StatusBadge status={m.status} />
            </div>

            {/* التفاصيل */}
            <dl className="mt-3 space-y-2 rounded-xl bg-surface-200/60 p-3">
              <div className="flex items-center justify-between gap-3">
                <dt className="text-[12px] font-bold text-brand-900/55">رقم التليفون</dt>
                <dd className="text-[13.5px] font-bold text-brand-900" dir="ltr">{m.phone_number || "—"}</dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-[12px] font-bold text-brand-900/55">سبب التواصل</dt>
                <dd className="min-w-0 truncate text-[13px] font-semibold text-brand-900/85" title={m.reason}>{m.reason || "—"}</dd>
              </div>
            </dl>

            {/* نص الرسالة (مختصر) */}
            <p className="mt-3 line-clamp-3 break-words rounded-xl bg-white/70 p-3 text-[13.5px] font-semibold leading-7 text-brand-900/85">
              {m.message || "—"}
            </p>

            {/* الأزرار */}
            <div className="mt-3 flex items-stretch gap-2">
              <button
                type="button"
                onClick={() => setSelected(m)}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-brand-700 py-2.5 text-[13.5px] font-bold text-white transition-colors duration-150 hover:bg-brand-800"
              >
                عرض الرسالة
              </button>

              {canDelete && (
                confirmId === m.id ? (
                  <>
                    <button
                      type="button"
                      onClick={() => remove(m.id)}
                      disabled={busyId === m.id}
                      className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-rose-600 py-2.5 text-[13.5px] font-bold text-white transition-colors duration-150 hover:bg-rose-700 disabled:opacity-60"
                    >
                      {busyId === m.id ? <IconLoader className="h-4 w-4 animate-spin" /> : "تأكيد الحذف"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmId(null)}
                      disabled={busyId === m.id}
                      className="shrink-0 rounded-xl bg-surface-300 px-4 py-2.5 text-[13.5px] font-bold text-brand-900/80 transition-colors duration-150 hover:bg-surface-400 disabled:opacity-60"
                    >
                      إلغاء
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={() => { setError(""); setNotice(""); setConfirmId(m.id); }}
                    aria-label={`حذف رسالة ${m.full_name}`}
                    className="flex shrink-0 items-center justify-center gap-1.5 rounded-xl bg-rose-50 px-4 py-2.5 text-[13.5px] font-bold text-rose-700 ring-1 ring-inset ring-rose-200 transition-colors duration-150 hover:bg-rose-100"
                  >
                    <IconTrash className="h-4 w-4" />
                    حذف
                  </button>
                )
              )}
            </div>
          </article>
        ))}

        {/* تذييل الكروت */}
        {filtered.length > 0 && (
          <p className="px-1 pt-1 text-center text-[13px] font-semibold text-brand-900/70">
            إجمالي الرسائل: <span className="font-bold text-brand-900">{rows.length}</span>
            {" · "}
            الظاهر: <span className="font-bold text-brand-900">{filtered.length}</span>
          </p>
        )}
      </div>

      {/* ================= مودال تفاصيل الرسالة ================= */}
      {selected && (
        <div
          className="fixed inset-0 z-[60] flex items-start justify-center overflow-y-auto p-4 sm:items-center"
          role="dialog"
          aria-modal="true"
          aria-label={`رسالة من ${selected.full_name}`}
        >
          <div className="fixed inset-0 bg-brand-950/35" onClick={() => setSelected(null)} aria-hidden="true" />
          <div className="relative z-10 my-auto w-full max-w-2xl rounded-3xl border-surface-400 bg-surface-100 shadow-lift">
            <div className="flex items-start justify-between gap-3 border-b border-surface-400 px-5 py-4 sm:px-6">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-[17px] font-extrabold text-brand-900">{selected.full_name}</h2>
                  <StatusBadge status={selected.status} />
                </div>
                <p className="mt-1 text-[12.5px] font-semibold text-brand-900/65">
                  {formatDateTime(selected.created_at)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelected(null)}
                aria-label="إغلاق"
                className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-surface-300 text-lg text-brand-900/80 transition-colors duration-150 hover:bg-surface-400"
              >
                ×
              </button>
            </div>

            <div className="max-h-[75vh] overflow-y-auto px-5 py-5 sm:px-6">
              <dl className="grid grid-cols-1 gap-x-5 gap-y-4 rounded-2xl border-surface-400 bg-surface-200/60 p-4 sm:grid-cols-2 sm:p-5">
                <div>
                  <dt className="text-[11.5px] font-bold uppercase tracking-wider text-brand-900/55">رقم التليفون</dt>
                  <dd className="mt-0.5 text-[14px] font-semibold text-brand-900" dir="ltr">
                    {selected.phone_number || "—"}
                  </dd>
                </div>
                <div>
                  <dt className="text-[11.5px] font-bold uppercase tracking-wider text-brand-900/55">سبب التواصل</dt>
                  <dd className="mt-0.5 text-[14px] font-semibold text-brand-900">{selected.reason || "—"}</dd>
                </div>
              </dl>

              <div className="mt-4">
                <p className="text-[11.5px] font-bold uppercase tracking-wider text-brand-900/55">نص الرسالة</p>
                <p className="mt-2 whitespace-pre-wrap break-words rounded-2xl border-surface-400 bg-white p-4 text-[14px] font-semibold leading-8 text-brand-900">
                  {selected.message || "—"}
                </p>
              </div>

              {canDelete && (
                <div className="mt-4 flex items-center justify-between gap-3 rounded-2xl border-rose-200 bg-rose-50/60 p-4">
                  <p className="text-[13px] font-extrabold text-rose-900">حذف الرسالة نهائيًا</p>
                  <button
                    type="button"
                    onClick={() => remove(selected.id)}
                    disabled={busyId === selected.id}
                    className="flex items-center gap-1.5 rounded-xl bg-rose-600 px-4 py-2 text-[13px] font-bold text-white transition-colors duration-150 hover:bg-rose-700 disabled:opacity-60"
                  >
                    {busyId === selected.id ? <IconLoader className="h-4 w-4 animate-spin" /> : <IconTrash className="h-4 w-4" />}
                    حذف
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
