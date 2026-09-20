/*
 * Sprint 2 — تزامن بيانات الوظائف
 * ---------------------------------------------------------------------------
 * بيقرأ مشروع Supabase الحقي (نفس المشروع للموقع والأدمن) و:
 *   1) يتأكد إن جدول `jobs` والأعمدة المطلوبة موجودين (بيفشل برسالة واضحة
 *      لو لسه محتاج تشغّل supabase/jobs.sql في SQL Editor).
 *   2) يزرع الوظائف القديمة المكتوبة في كود الموقع (data/jobs.js).
 *   3) يزرع الوظائف اللي عليها طلبات حقيقية في جدول الطلبات لكن مش موجودة
 *      في القائمة القديمة (زي "فني تبريد وتكييف") عشان عدد المتقدمين يبان.
 *   4) مبيلمسش أي وظيفة موجودة بالفعل — العملية آمنة وتقدر تشغّلها أكثر من مرة.
 */
import fs from "node:fs";
import { createClient } from "@supabase/supabase-js";

const root = "k:/WEBSIT/Alrahma";
const env = fs.readFileSync(`${root}/.env.local`, "utf8");
const get = (k) => (env.match(new RegExp(`^${k}=(.*)$`, "m")) || [])[1]?.trim();

const supabase = createClient(get("SUPABASE_URL"), get("SUPABASE_SERVICE_ROLE_KEY"), {
  auth: { persistSession: false, autoRefreshToken: false },
});

/* ---------------- 1) الوظائف القديمة من كود الموقع ---------------- */
const LEGACY = [
  {
    title: "فني كهرباء",
    company: "ليوني",
    company_logo: "LEONI",
    company_tone: "bg-red-600",
    description:
      "مطلوب فني كهرباء لديه خبرة في التركيبات والصيانة للعمل بإحدى الشركات العالمية.",
    salary_from: 8000,
    salary_to: 10000,
    required_count: 5,
    status: "available",
    location: "القاهرة - مدينة نصر",
    schedule: "8 ساعات / ورديات",
    employment_type: "دوام كامل",
    experience: "سنتان على الأقل",
    qualification: "دبلوم صنايع",
  },
  {
    title: "مهندس مدني",
    company: "LG",
    company_logo: "LG",
    company_tone: "bg-rose-600",
    description:
      "مطلوب مهندس مدني للإشراف على مشروعات إنشائية كبرى مع فرصة تدريب وتطوير.",
    salary_from: 15000,
    salary_to: 20000,
    required_count: 4,
    status: "available",
    location: "الجيزة - 6 أكتوبر",
    schedule: "9 ساعات / صباحي",
    employment_type: "دوام كامل",
    experience: "3 سنوات",
    qualification: "بكالوريوس هندسة مدنية",
  },
  {
    title: "عامل إنتاج",
    company: "ليوني",
    company_logo: "LEONI",
    company_tone: "bg-red-600",
    description:
      "مطلوب عمال إنتاج للعمل بمصنع بمنطقة العاشر من رمضان، يشترط الالتزام والجدية.",
    salary_from: 6000,
    salary_to: 7500,
    required_count: 8,
    status: "available",
    location: "العاشر من رمضان",
    schedule: "12 ساعة / ورديات",
    employment_type: "دوام كامل",
    experience: "لا يشترط",
    qualification: "لا يشترط",
  },
  {
    title: "سائق نقل ثقيل",
    company: "LG",
    company_logo: "LG",
    company_tone: "bg-rose-600",
    description:
      "مطلوب سائق نقل ثقيل يحمل رخصة أولى ودرجة، خبرة لا تقل عن سنتين.",
    salary_from: 9000,
    salary_to: 12000,
    required_count: 5,
    status: "available",
    location: "الإسكندرية",
    schedule: "10 ساعات / ورديات",
    employment_type: "دوام كامل",
    experience: "سنتان",
    qualification: "رخصة أولى ودرجة",
  },
];

/* ---------------- 2) وظائف عليها طلبات حقيقية بس مش في الكود القديم ---------------- */
const EXTRA = [
  {
    title: "فني تبريد وتكييف",
    company: "ليوني",
    company_logo: "LEONI",
    company_tone: "bg-red-600",
    description:
      "مطلوب فني تبريد وتكييف بخبرة في التركيب والصيانة للعمل بإحدى الشركات العالمية.",
    salary_from: 7000,
    salary_to: 9500,
    required_count: 3,
    status: "available",
    location: "العاشر من رمضان",
    schedule: "8 ساعات / ورديات",
    employment_type: "دوام كامل",
    experience: "سنتان على الأقل",
    qualification: "دبلوم صنايع",
  },
];

const out = {};

/* ---------------- 3) فحص الجدول ---------------- */
const { error: probeError } = await supabase.from("jobs").select("id").limit(1);
if (probeError) {
  console.log(
    JSON.stringify(
      {
        ok: false,
        step: "probe",
        error: probeError.message,
        hint: "شغّل ملف supabase/jobs.sql في Supabase → SQL Editor الأول.",
      },
      null,
      2
    )
  );
  process.exit(1);
}
out.tableExists = true;

/* ---------------- 4) الزرع ---------------- */
const { data: existing, error: listError } = await supabase.from("jobs").select("title");
if (listError) {
  console.log(JSON.stringify({ ok: false, step: "list", error: listError.message }, null, 2));
  process.exit(1);
}

const existingTitles = new Set((existing || []).map((r) => (r.title || "").trim()));
out.alreadyInTable = [...existingTitles];

const toInsert = [...LEGACY, ...EXTRA].filter((j) => !existingTitles.has(j.title.trim()));
out.toInsert = toInsert.map((j) => j.title);

if (toInsert.length) {
  const { error: insertError } = await supabase.from("jobs").insert(toInsert);
  if (insertError) {
    console.log(JSON.stringify({ ok: false, step: "insert", error: insertError.message }, null, 2));
    process.exit(1);
  }
  out.inserted = toInsert.length;
} else {
  out.inserted = 0;
}

/* ---------------- 5) تقرير نهائي ---------------- */
const { data: all, error: finalError } = await supabase
  .from("jobs")
  .select("title, company, required_count, status, salary_from, salary_to")
  .order("created_at", { ascending: true });

if (finalError) {
  console.log(JSON.stringify({ ok: false, step: "final", error: finalError.message }, null, 2));
  process.exit(1);
}

const { data: apps } = await supabase.from("job_applications").select("selected_job");
const counts = {};
for (const a of apps || []) {
  const k = (a.selected_job || "").trim();
  if (k) counts[k] = (counts[k] || 0) + 1;
}

out.finalRows = (all || []).map((j) => ({
  title: j.title,
  company: j.company,
  required: j.required_count,
  status: j.status,
  salary: `${j.salary_from ?? "-"} - ${j.salary_to ?? "-"}`,
  applicants: counts[j.title.trim()] || 0,
}));
out.totalJobs = (all || []).length;
out.orphanApplications = Object.keys(counts).filter(
  (t) => !(all || []).some((j) => (j.title || "").trim() === t)
);

console.log(JSON.stringify(out, null, 2));
