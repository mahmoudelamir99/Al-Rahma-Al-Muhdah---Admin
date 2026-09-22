"use client";

import { useState, useTransition } from "react";
import { updateSiteSettings } from "@/lib/actions/siteSettings";
import FileUpload from "@/components/FileUpload";

/*
 * حقول النصوص بس — فيديو الخلفية بقى رفع ملف مباشر (FileUpload) مش رابط يدوي.
 */
const TEXT_FIELDS = [
  ["heroTitle", "عنوان الواجهة الرئيسية"],
  ["heroSubtitle", "النص الفرعي"],
  ["aboutText", "وصف من نحن"],
  ["contactPhones", "أرقام التليفونات"],
  ["contactEmail", "البريد الإلكتروني"],
  ["contactAddress", "العنوان"],
];

// بخش "من نحن وبيانات التواصل" = من aboutText لآخر القائمة
const ABOUT_CONTACT_FIELDS = TEXT_FIELDS.slice(2);
const SOCIAL_FIELDS = [["facebook", "فيسبوك"], ["linkedin", "لينكد إن"], ["instagram", "إنستجرام"], ["youtube", "يوتيوب"]];

/*
 * مميزات قسم "من نحن" — 3 كروت، كل كارت له عنوان ونص.
 * الأيقونة واللون مش هنا لأنهم ثابتين في الموقع (About.jsx) حسب الترتيب.
 */
const FEATURE_FIELDS = [
  ["feature1Title", "عنوان الميزة 1"],
  ["feature1Text", "نص الميزة 1"],
  ["feature2Title", "عنوان الميزة 2"],
  ["feature2Text", "نص الميزة 2"],
  ["feature3Title", "عنوان الميزة 3"],
  ["feature3Text", "نص الميزة 3"],
];

function Field({ label, value, onChange, multiline = false, type = "text" }) {
  // شكل موحّد لكل الحقول (Sprint 2) — نفس مقاس حقل الرفع والحقول التانية
  const base = "field-light mt-1.5";
  const props = {
    value: value || "",
    onChange: (e) => onChange(e.target.value),
    dir: type === "url" || type === "email" ? "ltr" : undefined,
    type,
  };
  return (
    <label className="block text-[13px] font-bold text-brand-900/85">
      {label}
      {multiline ? (
        <textarea {...props} rows={5} className={`${base} field-area`} />
      ) : (
        <input {...props} className={`${base} field-input`} />
      )}
    </label>
  );
}

function Toggle({ label, checked, onChange }) {
  return (
    <label className="flex items-center justify-between gap-3 rounded-xl bg-surface-300/70 p-3 text-sm font-bold text-brand-900">
      <span className="min-w-0 flex-1">{label}</span>
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="h-5 w-5 shrink-0 accent-brand-700"
      />
    </label>
  );
}

export default function CmsPanel({ initialSettings = {} }) {
  const [values, setValues] = useState({
    whatsappEnabled: initialSettings.whatsapp_enabled ?? true,
    mapEnabled: initialSettings.map_enabled ?? true,
    termsText: initialSettings.terms_text || "",
    heroTitle: initialSettings.hero_title || "",
    heroSubtitle: initialSettings.hero_subtitle || "",
    heroVideoUrl: initialSettings.hero_video_url || "",
    aboutText: initialSettings.about_text || "",
    contactPhones: initialSettings.contact_phones || "",
    contactEmail: initialSettings.contact_email || "",
    contactAddress: initialSettings.contact_address || "",
    socialLinks: initialSettings.social_links || {},
    // قسم المميزات (3 كروت) + مفتاح الإظهار/الإخفاء
    featuresEnabled: initialSettings.features_enabled ?? true,
    feature1Title: initialSettings.feature_1_title || "",
    feature1Text: initialSettings.feature_1_text || "",
    feature2Title: initialSettings.feature_2_title || "",
    feature2Text: initialSettings.feature_2_text || "",
    feature3Title: initialSettings.feature_3_title || "",
    feature3Text: initialSettings.feature_3_text || "",
  });
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const set = (key, value) => setValues((current) => ({ ...current, [key]: value }));
  const save = () => { setError(""); setMessage(""); startTransition(async () => { const result = await updateSiteSettings(values); if (!result?.ok) setError(result.error || "تعذر الحفظ"); else setMessage("تم حفظ الإعدادات"); }); };
  return <div className="space-y-5">
    <div className="grid gap-3 sm:grid-cols-2"><Toggle label="أيقونة الواتساب" checked={values.whatsappEnabled} onChange={(v) => set("whatsappEnabled", v)} /><Toggle label="خريطة جوجل" checked={values.mapEnabled} onChange={(v) => set("mapEnabled", v)} /></div>
      <section className="rounded-2xl bg-surface-200/70 p-4">
      <h2 className="text-sm font-extrabold text-brand-900">الواجهة الرئيسية</h2>
      <div className="mt-3 grid gap-4 sm:grid-cols-2">{TEXT_FIELDS.slice(0, 2).map(([key, label]) => <Field key={key} label={label} value={values[key]} onChange={(v) => set(key, v)} />)}</div>
      <div className="mt-4">
        <p className="text-[13px] font-bold text-brand-900/85">فيديو خلفية الواجهة</p>
        <div className="mt-1.5">
        <FileUpload kind="video" folder="hero" value={values.heroVideoUrl} onChange={(url) => set("heroVideoUrl", url)} hint="ارفع فيديو mp4/webm — يظهر كخلفية للواجهة الرئيسية." />
        </div>
      </div>
    </section>
    <section className="rounded-2xl bg-surface-200/70 p-4"><h2 className="text-sm font-extrabold text-brand-900">من نحن وبيانات التواصل</h2><div className="mt-3 grid gap-4 sm:grid-cols-2">{ABOUT_CONTACT_FIELDS.map(([key, label]) => <Field key={key} label={label} value={values[key]} onChange={(v) => set(key, v)} multiline={key === "aboutText" || key === "contactAddress"} type={key === "contactEmail" ? "email" : "text"} />)}</div></section>
    <section className="rounded-2xl bg-surface-200/70 p-4">
      <h2 className="text-sm font-extrabold text-brand-900">قسم المميزات (تحت من نحن)</h2>
      <p className="mt-1 text-[12.5px] font-semibold text-brand-900/60">
        الكروت الثلاثة اللي بتظهر تحت نص «من نحن» على الموقع. عدّل العنوان والنص، أو اقفل القسم كله من المفتاح تحت.
      </p>
      <div className="mt-3">
        <Toggle label="إظهار قسم المميزات على الموقع" checked={values.featuresEnabled} onChange={(v) => set("featuresEnabled", v)} />
      </div>
      <div className={`mt-4 grid gap-4 transition-opacity sm:grid-cols-2 ${values.featuresEnabled ? "" : "pointer-events-none opacity-50"}`}>
        {FEATURE_FIELDS.map(([key, label]) => (
          <Field key={key} label={label} value={values[key]} onChange={(v) => set(key, v)} />
        ))}
      </div>
    </section>
    <section className="rounded-2xl bg-surface-200/70 p-4"><h2 className="text-sm font-extrabold text-brand-900">السوشيال ميديا</h2><div className="mt-3 grid gap-4 sm:grid-cols-2">{SOCIAL_FIELDS.map(([key, label]) => <Field key={key} label={label} value={values.socialLinks[key]} onChange={(v) => set("socialLinks", { ...values.socialLinks, [key]: v })} type="url" />)}</div></section>
    <section className="rounded-2xl bg-surface-200/70 p-4"><Field label="الشروط والأحكام" value={values.termsText} onChange={(v) => set("termsText", v)} multiline /></section>
    {(error || message) && <p role={error ? "alert" : undefined} className={`rounded-xl p-3 text-sm font-bold ${error ? "bg-rose-50 text-rose-800" : "bg-emerald-50 text-emerald-800"}`}>{error || `✓ ${message}`}</p>}
    <button type="button" onClick={save} disabled={pending} className="rounded-xl bg-brand-700 px-6 py-3 text-sm font-bold text-white disabled:opacity-60">{pending ? "جاري الحفظ…" : "حفظ الإعدادات"}</button>
  </div>;
}
