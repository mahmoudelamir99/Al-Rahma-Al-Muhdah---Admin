/**
 * set-admin-password.mjs
 * ------------------------------------------------------------------
 * يثبّت كلمة مرور المدير العام على Supabase.
 *
 * التشغيل (الباسوورد يتقسّم لأجزاء عشان يتجنب أي بتر في النقل):
 *   node set-admin-password.mjs Ma@500 500
 * ------------------------------------------------------------------
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { createClient } from "@supabase/supabase-js";

const __dirname = dirname(fileURLToPath(import.meta.url));

function loadEnv() {
  const env = {};
  try {
    const raw = readFileSync(join(__dirname, "..", ".env.local"), "utf8");
    for (const line of raw.split(/\r?\n/)) {
      const t = line.trim();
      if (!t || t.startsWith("#")) continue;
      const i = t.indexOf("=");
      if (i > 0) env[t.slice(0, i).trim()] = t.slice(i + 1).trim();
    }
  } catch { }
  return { ...env, ...process.env };
}

const env = loadEnv();
const url = env.SUPABASE_URL || env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY;
const email = (env.SUPER_ADMIN_EMAIL || "mahmoudelamir9901@gmail.com").toLowerCase();

// الباسوورد = كل الـ arguments متجمّعة
const password = process.argv.slice(2).join("");

if (!password) {
  console.error("❌ اكتب الباسوورد: node set-admin-password.mjs Ma@500 500");
  process.exit(1);
}

const supabase = createClient(url, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const { data: list, error: listError } = await supabase.auth.admin.listUsers({
  page: 1,
  perPage: 1000,
});

if (listError) {
  console.error("❌ فشل قراءة المستخدمين:", listError.message);
  process.exit(1);
}

const user = list.users.find((u) => u.email?.toLowerCase() === email);

if (!user) {
  console.error("❌ المستخدم مش موجود:", email);
  process.exit(1);
}

const { error: updateError } = await supabase.auth.admin.updateUserById(user.id, {
  password,
  email_confirm: true,
});

if (updateError) {
  console.error("❌ فشل تثبيت كلمة المرور:", updateError.message);
  process.exit(1);
}

// تأكيد فعلي: نسجّل دخول بالمفتاح العام بالباسوورد الجديد
const anonKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
let verified = false;
let verifyStatus = 0;

if (anonKey) {
  const res = await fetch(`${url}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { apikey: anonKey, "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  verifyStatus = res.status;
  verified = res.ok;
}

console.log(
  JSON.stringify(
    {
      email,
      password_length: password.length,
      password_updated: true,
      login_verified: verified,
      login_http_status: verifyStatus,
    },
    null,
    2
  )
);
