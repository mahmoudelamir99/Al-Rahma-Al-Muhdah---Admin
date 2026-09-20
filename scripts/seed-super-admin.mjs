/**
 * seed-super-admin.mjs
 * ------------------------------------------------------------------
 * بيجهّز حساب المدير العام (Super Admin) على Supabase:
 *   1. لو المستخدم مش موجود  → ينشئه بكلمة مرور مشفّرة (bcrypt عند Supabase).
 *   2. لو المستخدم موجود      → يثبّت كلمة المرور المطلوبة.
 *   3. يضيفه في جدول public.admins بدور 'super_admin'.
 *
 * التشغيل (من جوه فولدر Alrahma Admin):
 *   E:\node.exe scripts/seed-super-admin.mjs
 * ------------------------------------------------------------------
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { createClient } from "@supabase/supabase-js";

const __dirname = dirname(fileURLToPath(import.meta.url));

// --- قراءة .env.local بدون أي مكتبة خارجية ---
function loadEnv() {
  const file = join(__dirname, "..", ".env.local");
  const env = {};
  try {
    const raw = readFileSync(file, "utf8");
    for (const line of raw.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const idx = trimmed.indexOf("=");
      if (idx === -1) continue;
      env[trimmed.slice(0, idx).trim()] = trimmed.slice(idx + 1).trim();
    }
  } catch {
    // لو الملف مش موجود نعتمد على متغيرات البيئة
  }
  return { ...env, ...process.env };
}

const env = loadEnv();

const url = env.SUPABASE_URL || env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY;
const email = (env.SUPER_ADMIN_EMAIL || "mahmoudelamir9901@gmail.com").toLowerCase();
const password = env.SUPER_ADMIN_PASSWORD || "Ma@500";

if (!url || !serviceRoleKey) {
  console.error("❌ إعدادات Supabase ناقصة (SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY)");
  process.exit(1);
}

const supabase = createClient(url, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const report = { email, password_set: false, user_id: null, admins_row: false };

// ---------- 1) المستخدم ----------
const { data: created, error: createError } = await supabase.auth.admin.createUser({
  email,
  password,
  email_confirm: true,
});

if (createError) {
  // المستخدم موجود بالفعل → نجيب الـ id ونثبّت كلمة المرور
  const { data: list, error: listError } = await supabase.auth.admin.listUsers({
    page: 1,
    perPage: 1000,
  });

  if (listError) {
    console.error("❌ فشل قراءة المستخدمين:", listError.message);
    process.exit(1);
  }

  const existing = list.users.find((u) => u.email?.toLowerCase() === email);

  if (!existing) {
    console.error("❌ فشل إنشاء المستخدم:", createError.message);
    process.exit(1);
  }

  const { error: updateError } = await supabase.auth.admin.updateUserById(existing.id, {
    password,
    email_confirm: true,
  });

  if (updateError) {
    console.error("❌ فشل تثبيت كلمة المرور:", updateError.message);
    process.exit(1);
  }

  report.user_id = existing.id;
  report.password_set = true;
  console.log(`ℹ️  المستخدم موجود بالفعل → تم تثبيت كلمة المرور (id: ${existing.id})`);
} else {
  report.user_id = created.user.id;
  report.password_set = true;
  console.log(`✅ تم إنشاء حساب المدير العام (id: ${created.user.id})`);
}

// ---------- 2) جدول الأدمن ----------
const { error: adminError } = await supabase.from("admins").upsert(
  { id: report.user_id, email, role: "super_admin" },
  { onConflict: "email" }
);

if (adminError) {
  console.warn(`⚠️  جدول public.admins لسه مش موجود أو منع الوصول (${adminError.message})`);
  console.warn("    شغّل supabase/admins.sql من Supabase → SQL Editor ثم أعِد التشغيل.");
} else {
  report.admins_row = true;
  console.log("✅ تم تسجيله في جدول public.admins بدور super_admin");
}

// ---------- التقرير ----------
console.log("\n=== تقرير الحساب ===");
console.log(JSON.stringify(report, null, 2));
