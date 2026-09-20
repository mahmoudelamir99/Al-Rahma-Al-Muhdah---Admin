"use client";

import { useState, useTransition } from "react";
import { updateSiteSettings } from "@/lib/actions/siteSettings";

const TEXT_FIELDS = [
  ["heroTitle", "عنوان الواجهة الرئيسية"],
  ["heroSubtitle", "النص الفرعي"],
  ["heroVideoUrl", "رابط فيديو الخلفية"],
  ["aboutText", "وصف من نحن"],
  ["contactPhones", "أرقام التليفونات"],
  ["contactEmail", "البريد الإلكتروني"],
  ["contactAddress", "العنوان"],
];
const SOCIAL_FIELDS = [["facebook", "فيسبوك"], ["linkedin", "لينكد إن"], ["instagram", "إنستجرام"], ["youtube", "يوتيوب"]];

function Field({ label, value, onChange, multiline = false, type = "text" }) {
  const props = { value: value || "", onChange: (e) => onChange(e.target.value), className: "field-light mt-1.5 w-full rounded-xl px-3.5 py-2.5 text-sm", dir: type === "url" || type === "email" ? "ltr" : undefined, type };
  return <label className="block text-[13px] font-bold text-brand-900/85">{label}{multiline ? <textarea {...props} rows={5} className={`${props.className} resize-y leading-7`} /> : <input {...props} />}</label>;
}

function Toggle({ label, checked, onChange }) {
  return <label className="flex items-center justify-between gap-3 rounded-xl bg-surface-300/70 p-3 text-sm font-bold text-brand-900"><span>{label}</span><input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="h-5 w-5 accent-brand-700" /></label>;
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
  });
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const set = (key, value) => setValues((current) => ({ ...current, [key]: value }));
  const save = () => { setError(""); setMessage(""); startTransition(async () => { const result = await updateSiteSettings(values); if (!result?.ok) setError(result.error || "تعذر الحفظ"); else setMessage("تم حفظ الإعدادات"); }); };
  return <div className="space-y-5">
    <div className="grid gap-3 sm:grid-cols-2"><Toggle label="أيقونة الواتساب" checked={values.whatsappEnabled} onChange={(v) => set("whatsappEnabled", v)} /><Toggle label="خريطة جوجل" checked={values.mapEnabled} onChange={(v) => set("mapEnabled", v)} /></div>
    <section className="rounded-2xl bg-surface-200/70 p-4"><h2 className="text-sm font-extrabold text-brand-900">الواجهة الرئيسية</h2><div className="mt-3 grid gap-4 sm:grid-cols-2">{TEXT_FIELDS.slice(0, 3).map(([key, label]) => <Field key={key} label={label} value={values[key]} onChange={(v) => set(key, v)} type={key === "heroVideoUrl" ? "url" : "text"} />)}</div></section>
    <section className="rounded-2xl bg-surface-200/70 p-4"><h2 className="text-sm font-extrabold text-brand-900">من نحن وبيانات التواصل</h2><div className="mt-3 grid gap-4 sm:grid-cols-2">{TEXT_FIELDS.slice(3).map(([key, label]) => <Field key={key} label={label} value={values[key]} onChange={(v) => set(key, v)} multiline={key === "aboutText" || key === "contactAddress"} type={key === "contactEmail" ? "email" : "text"} />)}</div></section>
    <section className="rounded-2xl bg-surface-200/70 p-4"><h2 className="text-sm font-extrabold text-brand-900">السوشيال ميديا</h2><div className="mt-3 grid gap-4 sm:grid-cols-2">{SOCIAL_FIELDS.map(([key, label]) => <Field key={key} label={label} value={values.socialLinks[key]} onChange={(v) => set("socialLinks", { ...values.socialLinks, [key]: v })} type="url" />)}</div></section>
    <section className="rounded-2xl bg-surface-200/70 p-4"><Field label="الشروط والأحكام" value={values.termsText} onChange={(v) => set("termsText", v)} multiline /></section>
    {(error || message) && <p role={error ? "alert" : undefined} className={`rounded-xl p-3 text-sm font-bold ${error ? "bg-rose-50 text-rose-800" : "bg-emerald-50 text-emerald-800"}`}>{error || `✓ ${message}`}</p>}
    <button type="button" onClick={save} disabled={pending} className="rounded-xl bg-brand-700 px-6 py-3 text-sm font-bold text-white disabled:opacity-60">{pending ? "جاري الحفظ…" : "حفظ الإعدادات"}</button>
  </div>;
}
