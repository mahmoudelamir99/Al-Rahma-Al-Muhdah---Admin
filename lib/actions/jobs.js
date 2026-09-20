"use server";

import { revalidatePath } from "next/cache";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { JOBS_TABLE } from "@/lib/jobs";
import { createSupabaseServerClient } from "@/lib/supabase/server";

/* ==========================================================================
   كل عمليات الوظائف هنا. بتحقق من الجلسة الأول، وبعدين بتنفّذ بمفتاح الخدمة.

   ⚡ التزامن الفوري مع الموقع الأساسي (بند مهم في Sprint 2):
   الموقع بيبني صفحة الوظائف وبيخزّنها مؤقتاً 30 ثانية. عشان أي تعديل من
   اللوحة يظهر للزوار فوراً من غير ما نستنى الفترة دي، بننادي
   `revalidatePath("/")` — دي بتفضّي الكاش بتاع الصفحة الرئيسية على
   السيرفر، فأول زيارة بعدها بتجيب البيانات الجديدة من قاعدة البيانات.

   ملاحظة معمورية: اللوحة والموقع مشروعان منفصلان (بورت 3001 و 3000)،
   و revalidatePath بتأثر على كاش نفس المشروع بس. فبننادي كمان على
   `revalidatePublicSite()` اللي بتكلّم الموقع عبر Webhook لو مضبوط
   في متغير البيئة SITE_REVALIDATE_URL — ولو مش مضبوط، بنعتمد على
   الفترة القصيرة (30 ثانية) وبتبقى مقبولة تماماً في التشغيل المحلي.
   ========================================================================== */

/*
 * رابط الموقع الأساسي للـ Webhook — بنجرّب بالترتيب:
 *   1) SITE_REVALIDATE_URL (متغير مخصّص للـ webhook لو عايز رابط مختلف)
 *   2) NEXT_PUBLIC_SITE_URL (الرابط العام اللي بنستعمله في اللوحة كلها)
 *   3) localhost للتطوير المحلي بس
 * وبنشيل أي سلاش زيادة من الآخر عشان المسار ميطلعش بسلاشين.
 */
const PUBLIC_SITE_URL = (process.env.SITE_REVALIDATE_URL || process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(/\/+$/, "");
const REVALIDATE_SECRET = process.env.SITE_REVALIDATE_SECRET || "";

/** بنبلّغ الموقع الأساسي إن بيانات الوظائف اتغيرت (بيتجاهل الفشل بهدوء) */
async function revalidatePublicSite() {
  try {
    await fetch(`${PUBLIC_SITE_URL}/api/revalidate-jobs`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(REVALIDATE_SECRET ? { "x-revalidate-secret": REVALIDATE_SECRET } : {}),
      },
      // مهم: من غير cache، ولازم ما يعلّقش اللوحة لو الموقع واقف
      cache: "no-store",
      signal: AbortSignal.timeout(2500),
    });
  } catch {
    // الموقع مش شغال أو الـ webhook غير مضبوط — مشكلة تكسر اللوحة
  }
}

/** بننضّف الكاش المحلي + بنبلّغ الموقع */
async function revalidateEverything() {
  revalidatePath("/dashboard/jobs");
  revalidatePath("/dashboard");
  await revalidatePublicSite();
}

async function requireAdmin() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, error: "الجلسة انتهت. سجّل دخول تاني." };
  }

  return { ok: true, user };
}

/** تنظيف القيم الجاية من الفورم */
function normalize(input) {
  const toInt = (value) => {
    if (value === "" || value === null || value === undefined) return null;
    const n = Number(String(value).replace(/[^\d-]/g, ""));
    return Number.isFinite(n) ? n : null;
  };

  const text = (value) => {
    const v = String(value ?? "").trim();
    return v === "" ? null : v;
  };

  return {
    title: text(input.title),
    company: text(input.company),
    company_logo: text(input.company_logo),
    company_tone: text(input.company_tone),
    description: text(input.description),
    experience: text(input.experience),
    qualification: text(input.qualification),
    salary_from: toInt(input.salary_from),
    salary_to: toInt(input.salary_to),
    required_count: toInt(input.required_count) ?? 1,
    status: input.status === "closed" ? "closed" : "available",
    location: text(input.location),
    schedule: text(input.schedule),
    employment_type: text(input.employment_type),
  };
}

function validate(data) {
  if (!data.title) return "اسم الوظيفة مطلوب.";
  if (data.title.length > 120) return "اسم الوظيفة طويل جدًا (أقصى 120 حرف).";
  if (data.required_count < 0) return "العدد المطلوب لا يقبل قيمة سالبة.";
  if (data.salary_from !== null && data.salary_to !== null && data.salary_to < data.salary_from) {
    return "الراتب (إلى) لازم يكون أكبر من أو يساوي الراتب (من).";
  }
  return null;
}

/* ---------------------------- إضافة ---------------------------- */
export async function createJob(input) {
  const auth = await requireAdmin();
  if (!auth.ok) return { ok: false, error: auth.error };

  const data = normalize(input);
  const invalid = validate(data);
  if (invalid) return { ok: false, error: invalid };

  const supabase = getSupabaseAdmin();
  const { error } = await supabase.from(JOBS_TABLE).insert(data);

  if (error) return { ok: false, error: `تعذّرت الإضافة: ${error.message}` };

  await revalidateEverything();
  return { ok: true, message: "تمت إضافة الوظيفة بنجاح." };
}

/* ---------------------------- تعديل ---------------------------- */

/**
 * نتحقق إن المعرّف رقم صحيح موجب.
 * 🛑 مهم جداً: لو الـ id وصل `undefined` أو `null` أو string فاضي، استعلام
 * `.eq("id", undefined)` ممكن يتجاهل الشرط من الأساس — وساعتها بيحصل UPDATE
 * على **كل صفوف الجدول** (mass update). الحاجز ده بيمنع الكارثة دي من المصدر.
 */
function parseJobId(id) {
  if (id === null || id === undefined || id === "") return null;
  const n = Number(id);
  return Number.isInteger(n) && n > 0 ? n : null;
}

export async function updateJob(id, input) {
  const auth = await requireAdmin();
  if (!auth.ok) return { ok: false, error: auth.error };

  const jobId = parseJobId(id);
  if (jobId === null) {
    return { ok: false, error: "معرّف الوظيفة غير صحيح — لازم يكون رقم موجب." };
  }

  const data = normalize(input);
  const invalid = validate(data);
  if (invalid) return { ok: false, error: invalid };

  const supabase = getSupabaseAdmin();

  /*
   * .eq("id", jobId) بيلزم التعديل على صف واحد بالظبط.
   * .select("id") معاه بيرجع الصف اللي اتعدّل فعلاً — فلو رجع صفر صفوف
   * نعرف إن المعرّف مش موجود، ولو رجع أكتر من صف واحد نوقف ونبلّغ بدل ما
   * نكمّل على خطأ. ده حزام أمان فوق حزام.
   */
  const { data: updated, error } = await supabase
    .from(JOBS_TABLE)
    .update(data)
    .eq("id", jobId)
    .select("id");

  if (error) return { ok: false, error: `تعذّر التعديل: ${error.message}` };

  if (!updated || updated.length === 0) {
    return { ok: false, error: "الوظيفة غير موجودة (ممكن تكون اتحذفت من مكان تاني)." };
  }

  // لو لأي سبب اتعدّل أكتر من صف، ده مؤشر خطر — بنبلّغ فوراً
  if (updated.length > 1) {
    console.error(`[updateJob] تعدّل ${updated.length} صف للمعرّف ${jobId} — متوقع صف واحد!`);
    return { ok: false, error: "حصل تعديل على أكتر من وظيفة — العملية اتوقفت. راجع البيانات فوراً." };
  }

  await revalidateEverything();
  return { ok: true, message: "تم تعديل الوظيفة بنجاح." };
}

/* ---------------------------- حذف ---------------------------- */
export async function deleteJob(id) {
  const auth = await requireAdmin();
  if (!auth.ok) return { ok: false, error: auth.error };

  const jobId = parseJobId(id);
  if (jobId === null) {
    return { ok: false, error: "معرّف الوظيفة غير صحيح — لازم يكون رقم موجب." };
  }

  const supabase = getSupabaseAdmin();
  const { error } = await supabase.from(JOBS_TABLE).delete().eq("id", jobId).select("id");

  if (error) return { ok: false, error: `تعذّر الحذف: ${error.message}` };

  await revalidateEverything();
  return { ok: true, message: "تم حذف الوظيفة نهائيًا." };
}
