"use client";

import { useEffect, useState, useTransition } from "react";
import { createStaff, setStaffActive, updateStaff, deleteStaff } from "@/lib/actions/staff";
import {
  PERMISSION_KEYS,
  PERMISSION_LABELS,
  ACTION_KEYS,
  ACTION_LABELS,
  EMPTY_PERMISSIONS,
  normalizePermissions,
} from "@/lib/rbacConfig";
import FileUpload from "@/components/FileUpload";
import PasswordField from "@/components/PasswordField";

/** نسخة مستقلة من الصلاحيات الفاضية عشان كل فورم يبقى معزول */
const emptyPermissions = () => JSON.parse(JSON.stringify(EMPTY_PERMISSIONS));

/** قائمة صلاحيات (Checkboxes) — بتُستخدم في الإضافة والتعديل */
function PermissionList({ permissions, onChange, disabled }) {
  const normalized = normalizePermissions(permissions);
  return (
    <div className="space-y-2">
      {PERMISSION_KEYS.map((section) => (
        <div key={section} className="rounded-xl bg-surface-300/70 p-3">
          <p className="mb-2 text-[12.5px] font-extrabold text-brand-900">
            {PERMISSION_LABELS[section]}
          </p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {ACTION_KEYS.map((action) => (
              <label
                key={action}
                className="flex items-center gap-1.5 text-[12px] font-bold text-brand-900/75"
              >
                <input
                  type="checkbox"
                  checked={normalized[section][action]}
                  disabled={disabled}
                  onChange={(e) =>
                    onChange({
                      ...normalized,
                      [section]: { ...normalized[section], [action]: e.target.checked },
                    })
                  }
                  className="h-4 w-4 accent-brand-700"
                />
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
  const [form, setForm] = useState({
    displayName: "",
    email: "",
    password: "",
    phoneNumber: "",
    avatarUrl: "",
    permissions: emptyPermissions(),
  });
  const [editingMember, setEditingMember] = useState(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [pending, startTransition] = useTransition();

  function changeForm(key, value) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function addStaff() {
    setError("");
    setNotice("");
    startTransition(async () => {
      const result = await createStaff(form);
      if (!result?.ok) {
        setError(result?.error || "تعذّر إنشاء الموظف.");
        return;
      }
      setNotice(result.message);
      setForm({
        displayName: "",
        email: "",
        password: "",
        phoneNumber: "",
        avatarUrl: "",
        permissions: emptyPermissions(),
      });
      window.location.reload();
    });
  }

  function toggleActive(member) {
    setError("");
    setNotice("");
    startTransition(async () => {
      const result = await setStaffActive(member.id, !member.is_active);
      if (!result?.ok) {
        setError(result?.error || "تعذّر تغيير حالة الموظف.");
        return;
      }
      setStaff((rows) =>
        rows.map((row) => (row.id === member.id ? { ...row, is_active: !member.is_active } : row))
      );
      setNotice(result.message);
    });
  }

  /*
   * حذف الموظف — خطوة خطيرة، فبنطلب تأكيد صريح الأول.
   * بنستخدم window.confirm عشان يفضل نفس أسلوب الصفحة (مفيش مكتبة مودال هنية)،
   * والنص بيرّحب إن الحساب الدخول نفسه هيتمسح مش بس الصف.
   */
  function removeStaff(member) {
    if (pending) return;
    const label = member.display_name || member.email;
    const confirmed = window.confirm(
      `تحذير: هتحذف "${label}" نهائيًا.\n\nحساب الدخول هيمسح من Supabase Auth وكذلك صلاحياته من قاعدة البيانات.\nمفيش رجوع في الخطوة دي.\n\nمتأكد؟`
    );
    if (!confirmed) return;

    setError("");
    setNotice("");
    startTransition(async () => {
      const result = await deleteStaff(member.id);
      if (!result?.ok) {
        setError(result?.error || "تعذّر حذف الموظف.");
        return;
      }
      // بنشيله من القائمة فورًا من غير ما نستنى إعادة التحميل
      setStaff((rows) => rows.filter((row) => row.id !== member.id));
      setNotice(result.message);
    });
  }

  return (
    <div className="space-y-5">
      {/* ===== إضافة موظف ===== */}
      <section className="rounded-2xl border-brand-200 bg-brand-50/60 p-4 sm:p-5">
        <h2 className="text-[15px] font-extrabold text-brand-900">إضافة موظف جديد</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <input
            value={form.displayName}
            onChange={(e) => changeForm("displayName", e.target.value)}
            placeholder="اسم الموظف"
            className="field-light field-input"
            disabled={pending}
          />
          <input
            value={form.email}
            onChange={(e) => changeForm("email", e.target.value)}
            type="email"
            dir="ltr"
            placeholder="البريد الإلكتروني"
            className="field-light field-input text-left"
            disabled={pending}
          />
          <PasswordField
            value={form.password}
            onChange={(v) => changeForm("password", v)}
            placeholder="كلمة المرور المبدئية"
            disabled={pending}
          />
          <input
            value={form.phoneNumber}
            onChange={(e) => changeForm("phoneNumber", e.target.value)}
            type="tel"
            dir="ltr"
            placeholder="رقم التليفون"
            className="field-light field-input text-left"
            disabled={pending}
          />
          <div className="sm:col-span-3">
            <p className="mb-1.5 text-[12.5px] font-bold text-brand-900/75">الصورة الشخصية</p>
            <FileUpload
              kind="image"
              folder="avatars"
              value={form.avatarUrl}
              onChange={(url) => changeForm("avatarUrl", url)}
              disabled={pending}
              hint="اختياري — بتظهر بجانب بيانات الموظف."
            />
          </div>
        </div>
        <p className="mt-3 text-[12px] font-semibold text-brand-900/60">
          مفيش اختيار «دور/صلاحية» هنا — صلاحيات الموظف بتتحدد من الـ Checkboxes تحت بس.
        </p>
        <p className="mt-4 text-[13px] font-extrabold text-brand-900">صلاحيات الموظف</p>
        <div className="mt-2">
          <PermissionList
            permissions={form.permissions}
            onChange={(permissions) => changeForm("permissions", permissions)}
            disabled={pending}
          />
        </div>
        <button
          type="button"
          onClick={addStaff}
          disabled={pending}
          className="mt-4 rounded-xl bg-brand-700 px-5 py-2.5 text-sm font-bold text-white hover:bg-brand-800 disabled:opacity-60"
        >
          {pending ? "جاري الإنشاء…" : "إنشاء الموظف"}
        </button>
      </section>

      {(error || notice) && (
        <p
          role={error ? "alert" : undefined}
          className={`rounded-xl px-3.5 py-2.5 text-[13px] font-bold ${error ? "bg-rose-50 text-rose-800" : "bg-emerald-50 text-emerald-800"
            }`}
        >
          {error || `✓ ${notice}`}
        </p>
      )}

      {/* ===== قائمة الموظفين ===== */}
      <section className="grid gap-3">
        {staff.map((member) => {
          const isSuper =
            member.role === "super_admin" ||
            member.email?.toLowerCase() === "mahmoudelamir9901@gmail.com";
          return (
            <article
              key={member.id}
              className="rounded-2xl border-surface-400 bg-white/80 p-4 shadow-sm"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h3 className="text-[15px] font-extrabold text-brand-900">
                    {member.display_name || (isSuper ? "المدير العام" : member.email)}
                  </h3>
                  {member.avatar_url && (
                    <img src={member.avatar_url} alt="" className="mt-2 h-10 w-10 rounded-full object-cover" />
                  )}
                  {member.phone_number && (
                    <p className="mt-1 text-[12px] font-semibold text-brand-900/60" dir="ltr">
                      {member.phone_number}
                    </p>
                  )}
                  <p className="mt-0.5 text-[13px] font-semibold text-brand-900/65" dir="ltr">
                    {member.email}
                  </p>
                  <p className="mt-1 text-[12px] font-bold text-brand-900/55">
                    {isSuper
                      ? "مدير عام — صلاحيات مطلقة"
                      : member.is_active
                        ? "موظف مفعّل"
                        : "موظف موقوف"}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {!isSuper && (
                    <button
                      type="button"
                      onClick={() => toggleActive(member)}
                      disabled={pending}
                      className={`rounded-xl px-3 py-2 text-[12px] font-bold ${member.is_active
                          ? "bg-rose-50 text-rose-700"
                          : "bg-emerald-50 text-emerald-700"
                        }`}
                    >
                      {member.is_active ? "إيقاف الحساب" : "تفعيل الحساب"}
                    </button>
                  )}
                  {!isSuper && (
                    <button
                      type="button"
                      onClick={() => setEditingMember(member)}
                      disabled={pending}
                      className="rounded-xl bg-brand-700 px-3 py-2 text-[12px] font-bold text-white transition-colors hover:bg-brand-800 disabled:opacity-60"
                    >
                      تعديل
                    </button>
                  )}
                  {!isSuper && (
                    <button
                      type="button"
                      onClick={() => removeStaff(member)}
                      disabled={pending}
                      className="rounded-xl bg-rose-600 px-3 py-2 text-[12px] font-bold text-white transition-colors hover:bg-rose-700 disabled:opacity-60"
                    >
                      حذف
                    </button>
                  )}
                </div>
              </div>
            </article>
          );
        })}
        {staff.length === 0 && (
          <p className="rounded-2xl bg-surface-300/70 p-6 text-center text-sm font-bold text-brand-900/65">
            مفيش موظفين لسه.
          </p>
        )}
      </section>

      {editingMember && (
        <MemberEditModal
          member={editingMember}
          onClose={() => setEditingMember(null)}
          onSaved={(message) => {
            setEditingMember(null);
            setNotice(message);
            window.location.reload();
          }}
        />
      )}
    </div>
  );
}

/* ==========================================================================
   مودال تعديل الموظف — بيملاّ الفورم ببياناته القديمة ويتيح تعديل أي حاجة
   (الاسم، الإيميل، التليفون، الصورة، والصلاحيات) من غير أي تقييد.
   ========================================================================== */
function MemberEditModal({ member, onClose, onSaved }) {
  const [values, setValues] = useState({
    displayName: member.display_name || "",
    email: member.email || "",
    phoneNumber: member.phone_number || "",
    avatarUrl: member.avatar_url || "",
    permissions: normalizePermissions(member.permissions),
  });
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  const set = (key, value) => setValues((current) => ({ ...current, [key]: value }));

  // قفل بـ Escape + منع تمرير الصفحة
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape" && !pending) onClose();
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [pending, onClose]);

  function save() {
    if (pending) return;
    setError("");
    startTransition(async () => {
      const result = await updateStaff(member.id, values);
      if (!result?.ok) {
        setError(result?.error || "تعذّر حفظ التعديلات.");
        return;
      }
      onSaved(result.message || "تم حفظ تعديلات الموظف.");
    });
  }

  const label = "block text-[12.5px] font-bold text-brand-900/80";

  return (
    <div
      className="fixed inset-0 z-[70] flex items-start justify-center overflow-y-auto p-4 sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-label="تعديل بيانات الموظف"
    >
      <div
        className="fixed inset-0 bg-brand-950/35"
        onClick={() => !pending && onClose()}
        aria-hidden="true"
      />
      <div className="relative z-10 my-auto w-full max-w-2xl rounded-3xl border-surface-400 bg-surface-100 p-5 shadow-lift sm:p-6">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="text-[16px] font-extrabold text-brand-900">تعديل بيانات الموظف</h3>
            <p className="mt-0.5 text-[12.5px] font-semibold text-brand-900/60" dir="ltr">
              {member.email}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={pending}
            aria-label="إغلاق"
            className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-surface-300 text-brand-900/60 hover:bg-surface-400 disabled:opacity-50"
          >
            ×
          </button>
        </div>

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <label className={label}>
            اسم الموظف
            <input
              value={values.displayName}
              onChange={(e) => set("displayName", e.target.value)}
              className="field-light field-input mt-1.5"
              disabled={pending}
            />
          </label>
          <label className={label}>
            البريد الإلكتروني
            <input
              value={values.email}
              onChange={(e) => set("email", e.target.value)}
              type="email"
              dir="ltr"
              className="field-light field-input mt-1.5 text-left"
              disabled={pending}
            />
          </label>
          <label className={label}>
            رقم التليفون
            <input
              value={values.phoneNumber}
              onChange={(e) => set("phoneNumber", e.target.value)}
              type="tel"
              dir="ltr"
              className="field-light field-input mt-1.5 text-left"
              disabled={pending}
            />
          </label>
          <div>
            <p className={label}>الصورة الشخصية</p>
            <div className="mt-1.5">
              <FileUpload
                kind="image"
                folder="avatars"
                value={values.avatarUrl}
                onChange={(url) => set("avatarUrl", url)}
                disabled={pending}
              />
            </div>
          </div>
        </div>

        <p className="mt-4 text-[13px] font-extrabold text-brand-900">الصلاحيات</p>
        <div className="mt-2">
          <PermissionList
            permissions={values.permissions}
            onChange={(p) => set("permissions", p)}
            disabled={pending}
          />
        </div>

        {error && (
          <p
            role="alert"
            className="mt-3 rounded-xl bg-rose-50 px-3.5 py-2.5 text-[13px] font-bold text-rose-800"
          >
            {error}
          </p>
        )}

        <div className="mt-4 flex-wrap gap-2.5">
          <button
            type="button"
            onClick={save}
            disabled={pending}
            className="btn-shine flex items-center justify-center gap-2 rounded-xl bg-brand-700 px-5 py-2.5 text-[14px] font-bold text-white transition-colors hover:bg-brand-800 disabled:opacity-60"
          >
            {pending ? "جاري الحفظ…" : "حفظ التعديلات"}
          </button>
          <button
            type="button"
            onClick={onClose}
            disabled={pending}
            className="rounded-xl bg-surface-300 px-5 py-2.5 text-[14px] font-bold text-brand-900/75 hover:bg-surface-400 disabled:opacity-60"
          >
            إلغاء
          </button>
        </div>
      </div>
    </div>
  );
}
