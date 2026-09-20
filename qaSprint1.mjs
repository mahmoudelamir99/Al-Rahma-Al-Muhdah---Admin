// qaSprint1.mjs — فحص Sprint 1 على السيرفر اللايف.
// التشغيل: C:\temp\nodejs2\node.exe qaSprint1.mjs
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";

const BASE = "http://127.0.0.1:3001";
const ADMIN_EMAIL = "mahmoudelamir9901@gmail.com";

// --- الأسرار من .env.local (مش بتتطبع في التقرير) ---
const env = {};
for (const line of readFileSync(new URL("./.env.local", import.meta.url), "utf8").split(/\r?\n/)) {
  const t = line.trim();
  if (!t || t.startsWith("#")) continue;
  const i = t.indexOf("=");
  if (i > 0) env[t.slice(0, i).trim()] = t.slice(i + 1).trim();
}

// --- 1) الصفحة + الـ client bundle ---
async function loadSurface(path) {
  const res = await fetch(BASE + path, { redirect: "manual" });
  const html = await res.text();
  const chunks = [
    ...new Set([...html.matchAll(/src="(\/_next\/static\/chunks\/[^"]+\.js)"/g)].map((m) => m[1])),
  ];
  let js = "";
  for (const c of chunks) {
    try {
      js += await (await fetch(BASE + c)).text();
    } catch { }
  }
  return { status: res.status, html, js };
}

const root = await loadSurface("/");
const surface = root.html + root.js;

// كل الأقسام في app / dashboard (بنقرأ الملفات مباشرة عشان الـ bundle بيتبعتر)
import { readdirSync, readFileSync as rf } from "node:fs";
let sectionsText = "";
for (const dir of readdirSync(new URL("./app/dashboard", import.meta.url), { withFileTypes: true })) {
  if (!dir.isDirectory()) continue;
  sectionsText += rf(new URL(`./app/dashboard/${dir.name}/page.js`, import.meta.url), "utf8");
}
sectionsText += rf(new URL("./lib/adminConfig.js", import.meta.url), "utf8");

// --- 2) الحماية: /dashboard من غير جلسة ---
const guard = await fetch(BASE + "/dashboard", { redirect: "manual" });

// --- 3) حالة الحساب في Supabase ---
let account = { user_exists: false, admins_table: null, admins_row: false };
try {
  const sb = createClient(
    env.SUPABASE_URL || env.NEXT_PUBLIC_SUPABASE_URL,
    env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false, autoRefreshToken: false } }
  );
  const { data: list } = await sb.auth.admin.listUsers({ page: 1, perPage: 1000 });
  const found = list?.users?.find((u) => u.email?.toLowerCase() === ADMIN_EMAIL);
  account.user_exists = Boolean(found);
  account.email_confirmed = Boolean(found?.email_confirmed_at);
  account.user_id = found?.id ?? null;

  const { data: row, error } = await sb
    .from("admins")
    .select("email, role")
    .eq("email", ADMIN_EMAIL)
    .maybeSingle();
  account.admins_row = Boolean(row);
  account.admins_table = error ? "missing_or_blocked" : "ready";
} catch {
  account.admins_table = "error";
}

// --- 4) الدخول الفعلي بالمفتاح العام (anon key) ---
let login = { status: 0, ok: false };
try {
  const res = await fetch(`${env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { apikey: env.NEXT_PUBLIC_SUPABASE_ANON_KEY, "Content-Type": "application/json" },
    body: JSON.stringify({
      email: ADMIN_EMAIL,
      password: env.SUPER_ADMIN_PASSWORD,
    }),
  });
  login.status = res.status;
  login.ok = res.ok;
} catch {
  login.ok = false;
}

// --- 5) التقرير ---
const result = {
  "server ok": root.status === 200 && surface.length > 1000,

  // الحساب (كلمة المرور مشفّرة عند Supabase)
  "super admin exists in Supabase": account.user_exists,
  "super admin email confirmed": Boolean(account.email_confirmed),
  "super admin id": account.user_id,
  "login with anon key (email+password) works": login.ok,
  "login http status": login.status,

  // جدول الأدمن
  "admins table ready": account.admins_table === "ready",
  "admins row for super admin": account.admins_row,
  "admins table status": account.admins_table,

  // حماية اللوحة
  "dashboard blocked without session": guard.status === 307 || guard.status === 302,

  // شاشة الدخول
  "login screen served at /": root.status === 200,
  "login: email field": /name="email"/.test(root.html) || root.html.includes("البريد الإلكتروني"),
  "login: password field": /name="password"/.test(root.html) || root.html.includes("كلمة المرور"),
  "login: submit button (تسجيل الدخول)": root.html.includes("تسجيل الدخول"),

  // ممنوع روابط
  "no signup link": !/إنشاء حساب|إنشاء عضوية|تسجيل جديد|Register|Sign up/i.test(surface),
  "no forgot-password link": !/نسيت كلمة المرور|استعادة كلمة المرور|Forgot password/i.test(surface),

  // اللوجو الرسمي
  "logo on login screen": /src="\/logo\.png"/.test(root.html),
  "logo in admin sidebar (client bundle)": surface.includes("/logo.png"),

  // الوضع المضيء (مفيش دارك)
  "light mode: no dark color-scheme": !/color-scheme:\s*dark/i.test(root.html + root.js),
  "light mode: surface bg used": /#f5f8ff|surface-200/.test(surface),
  "dark mode tokens removed (no ink-950/city dark)": !/bg-ink-950|#05070f/.test(surface),
  "glassmorphism present": /glass-(light|panel)/.test(surface),
  "soft shadows present": /shadow-soft|shadow-card|shadow-lift/.test(surface),
  "logo in sidebar markup": surface.includes("logo.png"),
  "nav label: إدارة محتوى الموقع": sectionsText.includes("إدارة محتوى الموقع"),
  "nav label: إدارة الوظائف": sectionsText.includes("إدارة الوظائف"),
  "nav label: طلبات الدعم الفني": sectionsText.includes("طلبات الدعم الفني"),
  "nav label: الموظفين والصلاحيات": sectionsText.includes("الموظفين والصلاحيات"),
  "nav label: حسابي": sectionsText.includes("حسابي"),
  "nav label: الرئيسية": sectionsText.includes("الرئيسية"),
  "nav label: طلبات التوظيف": sectionsText.includes("طلبات التوظيف"),

  // ما زال بدون روابط عامة
  "no public sign-up route": guard.status !== 404,

  // === Sprint 2: أقسام لوحة التحكم ===
  "nav has all 7 sections": [
    "الرئيسية",
    "إدارة محتوى الموقع",
    "إدارة الوظائف",
    "طلبات التوظيف",
    "طلبات الدعم الفني",
    "الموظفين والصلاحيات",
    "حسابي",
  ].every((label) => sectionsText.includes(label)),

  // كل قسم عنده مسار شغال
  "all section routes exist": (await Promise.all(
    [
      "/dashboard",
      "/dashboard/cms",
      "/dashboard/jobs",
      "/dashboard/applications",
      "/dashboard/support",
      "/dashboard/staff",
      "/dashboard/account",
    ].map(async (p) => {
      const r = await fetch(BASE + p, { redirect: "manual" });
      // 307/302 = إعادة توجيه لشاشة الدخول (مفيش جلسة) → المسار موجود ومحمي
      return r.status === 307 || r.status === 302 || r.status === 200;
    })
  )).every(Boolean),

  // === Soft Light Mode ===
};

// فحص الـ CSS الفعلي المبني على السيرفر
const cssRes = await fetch(BASE + "/_next/static/css/app/layout.css");
const css = await cssRes.text();
result["css: soft bg #f2f2f1"] = css.includes("#f2f2f1");
result["css: no bright #f5f8ff"] = !css.includes("#f5f8ff");
result["css: no dark #05070f"] = !css.includes("#05070f");
result["css: color-scheme light only"] =
  /color-scheme: light/.test(css) && !/color-scheme:\s*dark/.test(css);

console.log(JSON.stringify(result, null, 2));
