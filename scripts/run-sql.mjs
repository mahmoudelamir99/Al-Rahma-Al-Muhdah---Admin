/**
 * run-sql.mjs
 * -------------------------------------------------------------
 * بينفّذ أي ملف SQL على Supabase مباشرة (بدون لوحة تحكم).
 * بيستخدم الـ SQL الرسمي المتاح على:
 *   POST https://<ref>.supabase.co/rest/v1/rpc/... مش متاح
 * فبنستخدم الـ Management API لو التوكن موجود، أو نطبع الملف للنسخ اليدوي.
 *
 * التشغيل:
 *   node scripts/run-sql.mjs supabase/jobs.sql
 * -------------------------------------------------------------
 */
import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRef = "nuwynonbaeipucyjigtq";

const env = {};
for (const line of readFileSync(join(__dirname, "..", ".env.local"), "utf8").split(/\r?\n/)) {
  const t = line.trim();
  if (!t || t.startsWith("#")) continue;
  const i = t.indexOf("=");
  if (i > 0) env[t.slice(0, i).trim()] = t.slice(i + 1).trim();
}

const file = process.argv[2];
if (!file) {
  console.error("اكتب مسار ملف SQL: node scripts/run-sql.mjs supabase/jobs.sql");
  process.exit(1);
}

const sqlPath = join(__dirname, "..", file);
if (!existsSync(sqlPath)) {
  console.error("الملف مش موجود:", sqlPath);
  process.exit(1);
}

const query = readFileSync(sqlPath, "utf8");

// --- الطريقة: Supabase Management API (محتاجة Personal Access Token) ---
const token = process.env.SUPABASE_ACCESS_TOKEN;

if (!token) {
  console.log(
    JSON.stringify(
      {
        ok: false,
        reason: "مفيش SUPABASE_ACCESS_TOKEN — لازم تنفّذ الملف يدوي من SQL Editor",
        sql_file: file,
        sql_length: query.length,
      },
      null,
      2
    )
  );
  process.exit(0);
}

const res = await fetch(`https://api.supabase.com/v1/projects/${projectRef}/database/query`, {
  method: "POST",
  headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
  body: JSON.stringify({ query }),
});

const text = await res.text();
console.log(JSON.stringify({ ok: res.ok, status: res.status, body: text.slice(0, 600) }, null, 2));
