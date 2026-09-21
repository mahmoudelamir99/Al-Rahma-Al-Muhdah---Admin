"use server";

import { revalidatePath } from "next/cache";
import { getSupabaseAdmin, APPLICATIONS_TABLE } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { APPLICATION_STATUSES } from "@/lib/applications";
import { ALLOWED_COMPLETION_KEYS, FORM_FIELDS, SELECT_OPTIONS } from "@/lib/formFields";
import { revalidateJobsOnSite } from "@/lib/revalidateSite";

/* ==========================================================================
   عمليات الـ HR على الطلبات.
   --------------------------------------------------------------------------
   ⚡ نقطة حاسمة (بند التزامن في Sprint 3):
   أي تغيير في الحالة أو الملاحظات بيتكتب في قاعدة البيانات فوراً، والموقع
   الأساسي بيقرا من نفس الجدول، فالعامل بيشوف التغيير في "تتبع الطلب" على طول.

   وبننادي على webhook الموقع عشان نفضّي أي كاش — نفس الأسلوب اللي استخدمناه
   في قسم الوظائف. وفوق كده، اللي بيتكتب هنا نص واحد (الحالة + الملاحظات)،
   فالموقع بيقراه مباشرة من القاعدة من غير تخزين مؤقت أصلاً.
   ========================================================================== */

/*
 * التزامن مع الموقع الأساسي بقى في مكان مركزي واحد (lib/revalidateSite.js)،
 * فمفيش نسخ متكررة من رابط الـ webhook ولا السرّ — وأي فشل بيتسجل بلوج.
 */
const MAX_NOTES = 2000;

const VALID_STATUSES = new Set(APPLICATION_STATUSES.map((s) => s.value));

/** بنتأكد إن اللي بينادي مسؤول مسجّل */
async function requireAdmin() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { ok: false, error: "الجلسة انتهت. سجّل دخول تاني." };
  return { ok: true, user };
}

/**
 * تحديث حالة الطلب و/أو ملاحظات الـ HR.
 * ---------------------------------------------------------------------------
 * بتقبل تحديث جزئي: لو بعت status بس، الملاحظات بتفضل زي ما هي، والعكس.
 *
 * منطق مهم بخصوص "سبب الرفض":
 * إن رفض المسؤول الطلب، الملاحظات بتتنسخ كمان في rejection_reason — لأن
 * صفحة تتبع الطلب في الموقع بتقرا العمود ده لعرض سبب الرفض في صندوق أحمر.
 * كده العامل بيشوف السبب في المكان الصح سواء كانت ملاحظة عادية أو سبب رفض.
 */
export async function updateApplicationHr({ id, status, hrNotes, completionFields } = {}) {
  const auth = await requireAdmin();
  if (!auth.ok) return { ok: false, error: auth.error };
  if (!id) return { ok: false, error: "معرّف الطلب غير موجود." };

  const updates = {};

  /*
   * حقول الاستكمال: أسماء الحقول اللي الـ HR علّم عليها إن فيها مشكلة.
   * بنفلترها على القائمة المعتمدة بس (حماية من أي إدخال عشوائي)،
   * وبنشيل المتكرر تلقائياً.
   */
  if (completionFields !== undefined) {
    const list = Array.isArray(completionFields) ? completionFields : [];
    const clean = [...new Set(list.filter((k) => ALLOWED_COMPLETION_KEYS.has(k)))];
    updates.completion_fields = clean;
  }

  if (status !== undefined) {
    if (!VALID_STATUSES.has(status)) {
      return { ok: false, error: "حالة الطلب غير معروفة." };
    }
    updates.status = status;

    /*
     * لما الحالة تخرج من "مطلوب استكمال بيانات"، الحقول المحددة بتتفضّي
     * تلقائياً — لأن الفورم في الموقع بيفتح الحقول دي للعامل، ولو سيبناهم
     * كان الفورم هيفضل متفتح لحاجة خلاص اتحلت أو اتقبلت.
     */
    if (status !== "needs_info" && completionFields === undefined) {
      updates.completion_fields = [];
    }
  }

  /*
   * حماية منطقية: الحقول المحددة ملهاش معنى غير في حالة "مطلوبكمال
   * بيانات". لو الواجهة بعت الحقول من غير الحالة الصح، بنرفض بدل ما
   * نخزّن بيانات متناقضة.
   */
  if (
    updates.completion_fields !== undefined &&
    updates.completion_fields.length > 0 &&
    updates.status !== "needs_info" &&
    status !== undefined
  ) {
    return { ok: false, error: "تحديد الحقول متاح في حالة «مطلوب استكمال بيانات» بس." };
  }

  if (hrNotes !== undefined) {
    const notes = String(hrNotes ?? "").trim();
    if (notes.length > MAX_NOTES) {
      return { ok: false, error: `الملاحظات طويلة جداً (أقصى ${MAX_NOTES} حرف).` };
    }
    updates.hr_notes = notes || null;

    // سبب الرفض بيتعرض في صندوق مخصص في صفحة التتبع
    if (updates.status === "rejected" || status === "rejected") {
      updates.rejection_reason = notes || null;
    }
  }

  if (Object.keys(updates).length === 0) {
    return { ok: false, error: "مفيش أي تغيير للحفظ." };
  }

  // نسجّل مين غيّر الحالة وامتى (مراجعة داخلية)
  updates.reviewed_by = auth.user.email || null;
  updates.reviewed_at = new Date().toISOString();

  // لو الحالة اتحولت من rejected لحاجة تانية، بنفضّي سبب الرفض القديم
  if (updates.status && updates.status !== "rejected" && updates.hr_notes === undefined) {
    updates.rejection_reason = null;
  }

  try {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from(APPLICATIONS_TABLE)
      .update(updates)
      .eq("id", id)
      .select("id, status, hr_notes, rejection_reason, completion_fields, reviewed_by, reviewed_at")
      .single();

    if (error) {
      // العمود لسه مش موجود (قبل تشغيل supabase/applications.sql)
      if (error.code === "42703") {
        return {
          ok: false,
          error:
            "الأعمدة الجديدة مش موجودة في قاعدة البيانات. شغّل ملف supabase/applications.sql من Supabase → SQL Editor.",
        };
      }
      return { ok: false, error: `تعذّر الحفظ: ${error.message}` };
    }

    revalidatePath("/dashboard/applications");
    revalidatePath("/dashboard");
    await revalidateJobsOnSite();

    return { ok: true, application: data, message: "تم حفظ التغييرات." };
  } catch (err) {
    return { ok: false, error: `حصل خطأ غير متوقع: ${err?.message || err}` };
  }
}

/** تغيير الحالة لوحدها (اختصار للأزرار السريعة) */
export async function setApplicationStatus(id, status) {
  return updateApplicationHr({ id, status });
}

/* ==========================================================================
   التعديل اليدوي للـ HR — "تعديل بيانات العامل"
   --------------------------------------------------------------------------
   الهدف (الحل الجذري للكارثة المنطقية): لو الـHR جاب الرقم القومي من العامل
   في التليفون — أو العامل نفسه مستحيل يدخل على "تتبع الطلب" (لأنه كان بلا
   رقم قومي) — يقدر الـHR يكتب البيانات بنفسه من اللوحة وتتحفظ في قاعدة
   البيانات **مباشرة من غير ما العامل يرجع للموقع أصلاً**.

   كل الحقول قابلة للتعديل يدوياً بما فيها حقول الهوية (الرقم القومي/التليفون
   /الاسم)، لأن الـHR هو المرجع النهائي للبيانات.
   ========================================================================== */

/** إعدادات كل حقل: نوعه + طوله + إلزاميته + قواعد التحقق الخاصة */
const HR_FIELD_RULES = {
  full_name: { required: true, max: 120 },
  phone_number: { required: true, max: 20, regex: /^01[0125][0-9]{8}$/, error: "رقم التليفون غير صحيح (مثال: 01012345678)." },
  national_id: { required: true, max: 14, regex: /^\d{14}$/, error: "الرقم القومي لازم يكون 14 رقم بالظبط." },
  age: { required: false, numeric: true, min: 18, max: 70, error: "السن لازم يكون بين 18 و 70 سنة." },
  city: { max: 80 },
  specialization: { max: 120 },
  previous_companies: { max: 300 },
  selected_job: { max: 150 },
};

/** أسماء الأعمدة المسموح للـ HR يعدّلها يدوياً */
const HR_EDITABLE_KEYS = FORM_FIELDS.map((f) => f.key);

/**
 * حفظ تعديلات الـ HR اليدوية على بيانات الطلب.
 * بنفلتر الحقول على قائمة الفورم المعتمدة فقط (حماية من التلاعب)،
 * وبننفّذ نفس قواعد الـ Validation بتاعة فورم التقديم الأساسي.
 */
export async function updateApplicationByHr({ id, fields } = {}) {
  const auth = await requireAdmin();
  if (!auth.ok) return { ok: false, error: auth.error };
  if (!id) return { ok: false, error: "معرّف الطلب غير موجود." };
  if (!fields || typeof fields !== "object") {
    return { ok: false, error: "مفيش بيانات للحفظ." };
  }

  const clean = {};
  const fieldErrors = {};

  for (const [key, rawValue] of Object.entries(fields)) {
    // مفتاح مش من حقول الفورم المعتمدة → بنتجاهله بهدوء
    if (!HR_EDITABLE_KEYS.includes(key)) continue;

    const rule = HR_FIELD_RULES[key] || {};
    const value = String(rawValue ?? "").trim();

    // حقل اختياري فاضي → null (نفس منطق فورم التقديم)
    if (!value) {
      if (rule.required) {
        fieldErrors[key] = "مطلوب";
      } else {
        clean[key] = null;
      }
      continue;
    }

    if (rule.max && value.length > rule.max) {
      fieldErrors[key] = `أطول من المسموح (${rule.max} حرف)`;
      continue;
    }
    if (rule.regex && !rule.regex.test(value)) {
      fieldErrors[key] = rule.error || "القيمة غير صحيحة";
      continue;
    }
    if (rule.numeric) {
      const num = Number.parseInt(value, 10);
      if (Number.isNaN(num) || num < (rule.min ?? 0) || num > (rule.max ?? Infinity)) {
        fieldErrors[key] = rule.error || "القيمة غير صحيحة";
        continue;
      }
      clean[key] = num;
      continue;
    }
    // حقل select → نتأكد إن القيمة من ضمن الخيارات المتاحة
    const options = SELECT_OPTIONS[key];
    if (Array.isArray(options) && !options.includes(value)) {
      fieldErrors[key] = "اختر قيمة من القائمة.";
      continue;
    }

    clean[key] = value;
  }

  if (Object.keys(clean).length === 0 && Object.keys(fieldErrors).length === 0) {
    return { ok: false, error: "مفيش أي تغيير للحفظ." };
  }
  if (Object.keys(fieldErrors).length > 0) {
    return { ok: false, error: "في بيانات غير صحيحة، راجعها وحاول تاني.", fieldErrors };
  }

  clean.reviewed_by = auth.user.email || null;
  clean.reviewed_at = new Date().toISOString();

  try {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from(APPLICATIONS_TABLE)
      .update(clean)
      .eq("id", id)
      .select("id, full_name, phone_number, national_id, selected_job, status")
      .single();

    if (error) {
      return { ok: false, error: `تعذّر الحفظ: ${error.message}` };
    }

    revalidatePath("/dashboard/applications");
    revalidatePath("/dashboard");
    await revalidateJobsOnSite();

    return { ok: true, application: data, message: "تم حفظ بيانات العامل." };
  } catch (err) {
    return { ok: false, error: `حصل خطأ غير متوقع: ${err?.message || err}` };
  }
}
