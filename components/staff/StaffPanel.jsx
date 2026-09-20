"use client";

import { useState, useTransition } from "react";
import { createStaff, setStaffActive, updateStaffPermissions } from "@/lib/actions/staff";
import { PERMISSION_KEYS, PERMISSION_LABELS, ACTION_KEYS, ACTION_LABELS, EMPTY_PERMISSIONS, normalizePermissions } from "@/lib/rbacConfig";

const emptyPermissions = () => JSON.parse(JSON.stringify(EMPTY_PERMISSIONS));

function PermissionList({ permissions, onChange, disabled }) {
  const normalized = normalizePermissions(permissions);
  return (
    <div className="space-y-2">
      {PERMISSION_KEYS.map((section) => (
        <div key={section} className="rounded-xl bg-surface-300/70 p-3">
          <p className="mb-2 text-[12.5px] font-extrabold text-brand-900">{PERMISSION_LABELS[section]}</p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {ACTION_KEYS.map((action) => (
              <label key={action} className="flex items-center gap-1.5 text-[12px] font-bold text-brand-900/75">
                <input type="checkbox" checked={normalized[section][action]} disabled={disabled} onChange={(e) => onChange({ ...normalized, [section]: { ...normalized[section], [action]: e.target.checked } })} className="h-4 w-4 accent-brand-700" />
                {ACTION_LABELS[action]}
              </label>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

export default function StaffPanel({ initialStaff = [] }) {
  const [staff, setStaff] = useState(initialStaff);
  const [form, setForm] = useState({ displayName: "", email: "", password: "", phoneNumber: "", avatarUrl: "", role: "hr", permissions: emptyPermissions() });
  const [editing, setEditing] = useState(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [pending, startTransition] = useTransition();

  function changeForm(key, value) { setForm((current) => ({ ...current, [key]: value })); }

  function addStaff() {
    setError(""); setNotice("");
    startTransition(async () => {
      const result = await createStaff(form);
      if (!result?.ok) { setError(result?.error || "تعذّر إنشاء الموظف."); return; }
      setNotice(result.message);
      setForm({ displayName: "", email: "", password: "", phoneNumber: "", avatarUrl: "", role: "hr", permissions: emptyPermissions() });
      window.location.reload();
    });
  }

  function savePermissions(member) {
    setError(""); setNotice("");
    startTransition(async () => {
      const result = await updateStaffPermissions(member.id, member.permissions);
      if (!result?.ok) { setError(result?.error || "تعذّر حفظ الصلاحيات."); return; }
      setNotice(result.message); setEditing(null);
    });
  }

  function toggleActive(member) {
    setError(""); setNotice("");
    startTransition(async () => {
      const result = await setStaffActive(member.id, !member.is_active);
      if (!result?.ok) { setError(result?.error || "تعذّر تغيير حالة الموظف."); return; }
      setStaff((rows) => rows.map((row) => row.id === member.id ? { ...row, is_active: !member.is_active } : row));
      setNotice(result.message);
    });
  }

  return (
    <div className="space-y-5">
      <section className="rounded-2xl border-brand-200 bg-brand-50/60 p-4 sm:p-5">
        <h2 className="text-[15px] font-extrabold text-brand-900">إضافة موظف جديد</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <input value={form.displayName} onChange={(e) => changeForm("displayName", e.target.value)} placeholder="اسم الموظف" className="field-light rounded-xl px-3 py-2.5 text-sm" disabled={pending} />
          <input value={form.email} onChange={(e) => changeForm("email", e.target.value)} type="email" dir="ltr" placeholder="البريد الإلكتروني" className="field-light rounded-xl px-3 py-2.5 text-sm" disabled={pending} />
          <input value={form.password} onChange={(e) => changeForm("password", e.target.value)} type="password" dir="ltr" placeholder="كلمة المرور المبدئية" className="field-light rounded-xl px-3 py-2.5 text-sm" disabled={pending} />
          <input value={form.phoneNumber} onChange={(e) => changeForm("phoneNumber", e.target.value)} type="tel" dir="ltr" placeholder="رقم التليفون" className="field-light rounded-xl px-3 py-2.5 text-sm" disabled={pending} />
          <input value={form.avatarUrl} onChange={(e) => changeForm("avatarUrl", e.target.value)} type="url" dir="ltr" placeholder="رابط الصورة الشخصية" className="field-light rounded-xl px-3 py-2.5 text-sm" disabled={pending} />
          <select value={form.role} onChange={(e) => changeForm("role", e.target.value)} className="field-light rounded-xl px-3 py-2.5 text-sm" disabled={pending}>
            <option value="hr">HR</option>
            <option value="data_entry">مدخل بيانات</option>
            <option value="admin">موظف إداري</option>
          </select>
        </div>
        <p className="mt-4 text-[13px] font-extrabold text-brand-900">صلاحيات الموظف</p>
        <div className="mt-2"><PermissionList permissions={form.permissions} onChange={(permissions) => changeForm("permissions", permissions)} disabled={pending} /></div>
        <button type="button" onClick={addStaff} disabled={pending} className="mt-4 rounded-xl bg-brand-700 px-5 py-2.5 text-sm font-bold text-white hover:bg-brand-800 disabled:opacity-60">{pending ? "جاري الإنشاء…" : "إنشاء الموظف"}</button>
      </section>

      {(error || notice) && <p role={error ? "alert" : undefined} className={`rounded-xl px-3.5 py-2.5 text-[13px] font-bold ${error ? "bg-rose-50 text-rose-800" : "bg-emerald-50 text-emerald-800"}`}>{error || `✓ ${notice}`}</p>}

      <section className="grid gap-3">
        {staff.map((member) => {
          const isSuper = member.role === "super_admin" || member.email?.toLowerCase() === "mahmoudelamir9901@gmail.com";
          const draft = editing?.id === member.id ? editing : member;
          return (
            <article key={member.id} className="rounded-2xl border-surface-400 bg-white/80 p-4 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h3 className="text-[15px] font-extrabold text-brand-900">{member.display_name || (isSuper ? "المدير العام" : member.email)}</h3>
                  {member.avatar_url && <img src={member.avatar_url} alt="" className="mt-2 h-10 w-10 rounded-full object-cover" />}
                  {member.phone_number && <p className="mt-1 text-[12px] font-semibold text-brand-900/60" dir="ltr">{member.phone_number}</p>}
                  <p className="mt-0.5 text-[13px] font-semibold text-brand-900/65" dir="ltr">{member.email}</p>
                  <p className="mt-1 text-[12px] font-bold text-brand-900/55">{isSuper ? "مدير عام — صلاحيات مطلقة" : member.is_active ? "موظف مفعّل" : "موظف موقوف"}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {!isSuper && <button type="button" onClick={() => toggleActive(member)} disabled={pending} className={`rounded-xl px-3 py-2 text-[12px] font-bold ${member.is_active ? "bg-rose-50 text-rose-700" : "bg-emerald-50 text-emerald-700"}`}>{member.is_active ? "إيقاف الحساب" : "تفعيل الحساب"}</button>}
                  {!isSuper && (editing?.id === member.id ? <button type="button" onClick={() => savePermissions(draft)} disabled={pending} className="rounded-xl bg-brand-700 px-3 py-2 text-[12px] font-bold text-white">حفظ الصلاحيات</button> : <button type="button" onClick={() => setEditing({ ...member, permissions: { ...member.permissions } })} disabled={pending} className="rounded-xl bg-surface-300 px-3 py-2 text-[12px] font-bold text-brand-900/80">تعديل الصلاحيات</button>)}
                </div>
              </div>
              {!isSuper && <div className="mt-4"><PermissionList permissions={draft.permissions || emptyPermissions()} onChange={(permissions) => setEditing({ ...draft, permissions })} disabled={pending && editing?.id === member.id} /></div>}
            </article>
          );
        })}
        {staff.length === 0 && <p className="rounded-2xl bg-surface-300/70 p-6 text-center text-sm font-bold text-brand-900/65">مفيش موظفين لسه.</p>}
      </section>
    </div>
  );
}
