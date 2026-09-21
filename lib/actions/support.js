"use server";

import crypto from "node:crypto";
import { revalidatePath } from "next/cache";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

/* ==========================================================================
   طلبات الدعم الفني (Support Requests) + إدارة الحساب بنظام الطلبات
   --------------------------------------------------------------------------
   اللوجيك المعتمد من الإدارة:
     - الموظف **مش** بيغيّر الإيميل/الباسوورد بنفسه مباشرة.
     - بيكتب الباسوورد القديم + الجديد (أو الإيميل الجديد) ويدوس
       «إرسال طلب للدعم الفني».
     - الطلب بيتسجل بحالة pending (قيد الانتظار).
     - السوبر أدمن يراجع الطلب، ولو وافق → السيستم ينفّذ التغيير فعلياً.

   🔐 ملاحظة أمنية مهمة:
     - الباسورد الجديد بيتخزّن **مشفّراً** (AES-256-GCM) مش نص مكشوف.
     - بعد ما السوبر أدمن يوافق وينفّذ التغيير، بنمسح الباسورد المشفّر
       من الصف فوراً (updateUserById نجحت، مفيش داعي نحتفظ بيه).
     - مفتاح التشفير من متغير البيئة SETTINGS_ENCRYPTION_KEY، ولو مش
       موجود بنشتقّه من SUPABASE_SERVICE_ROLE_KEY (اللي هو سرّي أصلاً
       ومش موجود في المتصفح) عشان يشتغل محلياً من غير إعداد إضافي.
   ========================================================================== */

const SUPPORT_TABLE = "support_requests";
const MAX_MESSAGE = 1000;

/* ---------------------------- التشفير ---------------------------- */

/** مفتاح 32 بايت مشتقّ (SHA-256) — مستقر بين التشغيلات */
function encryptionKey() {
  const secret =
    process.env.SETTINGS_ENCRYPTION_KEY ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    "alrahma-local-dev-key";
  return crypto.createHash("sha256").update(String(secret)).digest();
}

/** تشفير نص → "iv.tag.ciphertext" (base64) */
function encryptSecret(plain) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", encryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(String(plain), "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString("base64")}.${tag.toString("base64")}.${encrypted.toString("base64")}`;
}

/** فك تشفير نص مشفّر */
function decryptSecret(payload) {
  try {
    const [ivB64, tagB64, dataB64] = String(payload).split(".");
    const decipher = crypto.createDecipheriv(
      "aes-256-gcm",
      encryptionKey(),
      Buffer.from(ivB64, "base64")
    );
    decipher.setAuthTag(Buffer.from(tagB64, "base64"));
    return Buffer.concat([
      decipher.update(Buffer.from(dataB64, "base64")),
      decipher.final(),
    ]).toString("utf8");
  } catch {
    return null;
  }
}

/* ---------------------------- أدوات ---------------------------- */

async function requireAdmin() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "الجلسة انتهت. سجّل دخول تاني." };
  return { ok: true, user };
}

async function requireSuperAdmin() {
  const auth = await requireAdmin();
  if (!auth.ok) return auth;
  const email = (auth.user.email || "").toLowerCase();
  const superEmail = (process.env.SUPER_ADMIN_EMAIL || "").toLowerCase();
  if (superEmail && email !== superEmail) {
    return { ok: false, error: "القسم ده مخصص للمدير العام فقط." };
  }
  return { ok: true, user: auth.user };
}

/** اسم الموظف من جدول admins (لو مش موجود بنستخدم الإيميل) */
async function resolveEmployeeMeta(user) {
  const email = (user?.email || "").toLowerCase();
  try {
    const { data } = await getSupabaseAdmin()
      .from("admins")
      .select("email, role")
      .eq("email", email)
      .maybeSingle();
    return {
      employee_name: null,
      employee_role: data?.role || "admin",
    };
  } catch {
    return { employee_name: null, employee_role: "admin" };
  }
}

function normalizeEmail(value) {
  return String(value ?? "").trim().toLowerCase();
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/* ==========================================================================
   1) الموظف: إرسال طلب تغيير باسوورد
   ========================================================================== */
/*
 * 🗑️ إزالة حقول "كلمة المرور الحالية" من طلبات الموظف (Sprint 3):
 * ---------------------------------------------------------------------------
 * المنطق: الموظف بيبعت **طلب** للإدارة، والإدارة هي اللي تنفّذه. فمش منطقي
 * نطلب منه الباسورد القديم — خصوصاً لو هو ناسيه (وده أصلاً سبب الطلب في كتير
 * من الأحيان). عشان كده شلنا التحقق من الباسورد القديم بالكامل من مسار الطلب،
 * وسيبنا الجديد + تأكيده بس.
 *
 * ملاحظة: المسار المباشر للسوبر أدمن (updateOwnPasswordDirect) لسه بيطلب
 * الباسورد القديم — لأنه تعديل فوري على حسابه بنفسه، فالتأكيد فيه منطقي وأمني.
 */
export async function requestPasswordChange({ newPassword, confirmPassword, message } = {}) {
  const auth = await requireAdmin();
  if (!auth.ok) return { ok: false, error: auth.error };

  const next = String(newPassword ?? "");
  const confirm = String(confirmPassword ?? "");

  if (!next) return { ok: false, error: "اكتب كلمة المرور الجديدة." };

  // التحقق من قوة كلمة المرور الجديدة (نفس سياسة Supabase الدنيا)
  if (next.length < 8) return { ok: false, error: "كلمة المرور الجديدة لازم تكون 8 أحرف على الأقل." };
  if (!/[A-Za-z]/.test(next) || !/[0-9]/.test(next)) {
    return { ok: false, error: "كلمة المرور الجديدة لازم تحتوي حروف وأرقام." };
  }
  if (next !== confirm) return { ok: false, error: "كلمة المرور الجديدة وتأكيدها مش متطابقين." };

  const meta = await resolveEmployeeMeta(auth.user);

  try {
    const { error } = await getSupabaseAdmin()
      .from(SUPPORT_TABLE)
      .insert({
        employee_id: auth.user.id,
        employee_email: auth.user.email,
        employee_name: meta.employee_name,
        employee_role: meta.employee_role,
        request_type: "password",
        // الباسورد الجديد مشفّر (مش نص مكشوف) — يمسح بعد التنفيذ
        new_email: encryptSecret(next),
        message: String(message ?? "").trim().slice(0, MAX_MESSAGE) || null,
        status: "pending",
      });

    if (error) {
      if (error.code === "42P01") {
        return {
          ok: false,
          error: "جدول طلبات الدعم مش موجود. شغّل ملف supabase/site-settings.sql من SQL Editor.",
        };
      }
      return { ok: false, error: `تعذّر إرسال الطلب: ${error.message}` };
    }

    revalidatePath("/dashboard/support");
    return { ok: true, message: "تم إرسال طلبك للدعم الفني. في انتظار موافقة الإدارة." };
  } catch (err) {
    return { ok: false, error: `حصل خطأ غير متوقع: ${err?.message || err}` };
  }
}

/* ==========================================================================
   2) الموظف: إرسال طلب تغيير البريد الإلكتروني
   ========================================================================== */
export async function requestEmailChange({ currentPassword, newEmail, message } = {}) {
  const auth = await requireAdmin();
  if (!auth.ok) return { ok: false, error: auth.error };

  const current = String(currentPassword ?? "");
  const email = normalizeEmail(newEmail);

  if (!current) return { ok: false, error: "اكتب كلمة المرور الحالية للتأكيد." };
  if (!EMAIL_REGEX.test(email)) return { ok: false, error: "اكتب بريد إلكتروني صحيح." };
  if (email === normalizeEmail(auth.user.email)) {
    return { ok: false, error: "البريد الجديد هو نفسه الحالي." };
  }

  // تحقق من الباسورد القديم
  const supabase = await createSupabaseServerClient();
  const { error: signInError } = await supabase.auth.signInWithPassword({
    email: auth.user.email,
    password: current,
  });
  if (signInError) {
    return { ok: false, error: "كلمة المرور الحالية غير صحيحة." };
  }

  const meta = await resolveEmployeeMeta(auth.user);

  try {
    const { error } = await getSupabaseAdmin()
      .from(SUPPORT_TABLE)
      .insert({
        employee_id: auth.user.id,
        employee_email: auth.user.email,
        employee_name: meta.employee_name,
        employee_role: meta.employee_role,
        request_type: "email",
        new_email: email,
        message: String(message ?? "").trim().slice(0, MAX_MESSAGE) || null,
        status: "pending",
      });

    if (error) {
      if (error.code === "42P01") {
        return {
          ok: false,
          error: "جدول طلبات الدعم مش موجود. شغّل ملف supabase/site-settings.sql من SQL Editor.",
        };
      }
      return { ok: false, error: `تعذّر إرسال الطلب: ${error.message}` };
    }

    revalidatePath("/dashboard/support");
    return { ok: true, message: "تم إرسال طلبك للدعم الفني. في انتظار موافقة الإدارة." };
  } catch (err) {
    return { ok: false, error: `حصل خطأ غير متوقع: ${err?.message || err}` };
  }
}

/* ==========================================================================
   3) السوبر أدمن: الموافقة على الطلب → تنفيذ التغيير فعلياً
   ========================================================================== */
export async function approveSupportRequest(id) {
  const auth = await requireSuperAdmin();
  if (!auth.ok) return { ok: false, error: auth.error };
  if (!id) return { ok: false, error: "معرّف الطلب غير موجود." };

  const admin = getSupabaseAdmin();

  // نجيب الطلب
  const { data: request, error: fetchError } = await admin
    .from(SUPPORT_TABLE)
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (fetchError) return { ok: false, error: `تعذّر قراءة الطلب: ${fetchError.message}` };
  if (!request) return { ok: false, error: "الطلب غير موجود." };
  if (request.status !== "pending") return { ok: false, error: "الطلب ده اتراجع قبل كده." };
  if (!request.employee_id) return { ok: false, error: "الطلب مش مرتبط بحساب موظف." };

  // تنفيذ التغيير فعلياً على حساب Auth
  try {
    if (request.request_type === "password") {
      const newPassword = decryptSecret(request.new_email);
      if (!newPassword) {
        return { ok: false, error: "تعذّر فك تشفير كلمة المرور الجديدة." };
      }
      const { error: updateError } = await admin.auth.admin.updateUserById(request.employee_id, {
        password: newPassword,
      });
      if (updateError) return { ok: false, error: `تعذّر تنفيذ تغيير كلمة المرور: ${updateError.message}` };
    } else if (request.request_type === "email") {
      const { error: updateError } = await admin.auth.admin.updateUserById(request.employee_id, {
        email: request.new_email,
        email_confirm: true,
      });
      if (updateError) return { ok: false, error: `تعذّر تنفيذ تغيير البريد: ${updateError.message}` };
    } else {
      return { ok: false, error: "نوع الطلب غير معروف." };
    }
  } catch (err) {
    return { ok: false, error: `حصل خطأ أثناء التنفيذ: ${err?.message || err}` };
  }

  // إشعار يُعرض للموظف بعد دخوله بالباسورد الجديد، مع إبطال كل الجلسات القديمة.
  const { data: employeeAuth, error: employeeFetchError } = await admin.auth.admin.getUserById(request.employee_id);
  if (employeeFetchError || !employeeAuth?.user) {
    return { ok: false, error: "تم تنفيذ التغيير لكن تعذّر تجهيز إشعار الموظف." };
  }
  const { error: noticeError } = await admin.auth.admin.updateUserById(request.employee_id, {
    app_metadata: {
      ...(employeeAuth.user.app_metadata || {}),
      support_notice: {
        message: "تم تنفيذ طلبك بنجاح من قبل الدعم الفني",
        created_at: new Date().toISOString(),
      },
    },
  });
  if (noticeError) return { ok: false, error: `تم التغيير لكن تعذّر حفظ إشعار الموظف: ${noticeError.message}` };
  // علامة طرد للجلسة الحالية: الـ layout بيقرأها من بيانات المستخدم
  // عند أول طلب بعد الموافقة، والموظف يدخل بالباسورد الجديد ويشوف الإشعار.
  const { error: logoutError } = await admin.auth.admin.updateUserById(request.employee_id, {
    app_metadata: {
      ...(employeeAuth.user.app_metadata || {}),
      force_logout_at: new Date().toISOString(),
      support_notice: {
        message: "تم تنفيذ طلبك بنجاح من قبل الدعم الفني",
        created_at: new Date().toISOString(),
      },
    },
  });
  if (logoutError) return { ok: false, error: `تم التغيير لكن تعذّر تجهيز طرد الجلسة: ${logoutError.message}` };

  // تحديث حالة الطلب + مسح أي بيانات حساسة
  const { error: markError } = await admin
    .from(SUPPORT_TABLE)
    .update({
      status: "approved",
      reviewed_by: auth.user.email || null,
      reviewed_at: new Date().toISOString(),
      // 🔐 مسح الباسورد المشفّر بعد التنفيذ (مفيش داعي نحتفظ بيه)
      new_email: request.request_type === "email" ? request.new_email : null,
    })
    .eq("id", id);

  if (markError) return { ok: false, error: `تم التنفيذ بس تعذّر تحديث الحالة: ${markError.message}` };

  revalidatePath("/dashboard/support");
  return { ok: true, message: "تم تنفيذ الطلب بنجاح." };
}

/* ==========================================================================
   4) السوبر أدمن: رفض الطلب
   ========================================================================== */
export async function acknowledgeSupportNotice() {
  const auth = await requireAdmin();
  if (!auth.ok) return { ok: false };
  const admin = getSupabaseAdmin();
  const { data, error } = await admin.auth.admin.getUserById(auth.user.id);
  if (error || !data?.user) return { ok: false };
  const nextMetadata = { ...(data.user.app_metadata || {}) };
  delete nextMetadata.support_notice;
  const { error: updateError } = await admin.auth.admin.updateUserById(auth.user.id, { app_metadata: nextMetadata });
  return { ok: !updateError };
}

export async function rejectSupportRequest(id, note = "") {
  const auth = await requireSuperAdmin();
  if (!auth.ok) return { ok: false, error: auth.error };
  if (!id) return { ok: false, error: "معرّف الطلب غير موجود." };

  const admin = getSupabaseAdmin();

  const { data: request } = await admin.from(SUPPORT_TABLE).select("id, status").eq("id", id).maybeSingle();
  if (!request) return { ok: false, error: "الطلب غير موجود." };
  if (request.status !== "pending") return { ok: false, error: "الطلب ده اتراجع قبل كده." };

  const { error } = await admin
    .from(SUPPORT_TABLE)
    .update({
      status: "rejected",
      reviewed_by: auth.user.email || null,
      reviewed_at: new Date().toISOString(),
      review_note: String(note ?? "").trim().slice(0, MAX_MESSAGE) || null,
      // 🔐 مسح الباسورد المشفّر عند الرفض كذلك
      new_email: null,
    })
    .eq("id", id);

  if (error) return { ok: false, error: `تعذّر رفض الطلب: ${error.message}` };

  revalidatePath("/dashboard/support");
  return { ok: true, message: "تم رفض الطلب." };
}

/* ==========================================================================
   5) السوبر أدمن: تعديل حساب نفسه **مباشرة** (بدون نظام الطلبات)
   --------------------------------------------------------------------------
   المدير العام مش محتاج يبعت طلب لنفسه — بيعدّل الإيميل/الباسوورد بتاعه
   ويدوس حفظ، والتغيير بيتنفّذ فوراً على حساب Auth.
   (الموظفين العاديين لسه تحت نظام الطلبات فوق.)
   ========================================================================== */

/** حماية: اللي بينادي لازم يكون السوبر أدمن بنفسه */
async function requireSelfSuperAdmin() {
  const auth = await requireAdmin();
  if (!auth.ok) return auth;
  const email = (auth.user.email || "").toLowerCase();
  const superEmail = (process.env.SUPER_ADMIN_EMAIL || "").toLowerCase();
  if (superEmail && email !== superEmail) {
    return { ok: false, error: "التعديل المباشر متاح للمدير العام فقط." };
  }
  return { ok: true, user: auth.user };
}

/**
 * تعديل مباشر لكلمة مرور السوبر أدمن.
 * لازم الباسورد الحالي يكون صح (تحقق حقي قبل التطبيق).
 */
export async function updateOwnPasswordDirect({ currentPassword, newPassword, confirmPassword } = {}) {
  const auth = await requireSelfSuperAdmin();
  if (!auth.ok) return { ok: false, error: auth.error };

  const current = String(currentPassword ?? "");
  const next = String(newPassword ?? "");
  const confirm = String(confirmPassword ?? "");

  if (!current) return { ok: false, error: "اكتب كلمة المرور الحالية الأول." };
  if (!next || next.length < 8) return { ok: false, error: "كلمة المرور الجديدة لازم تكون 8 أحرف على الأقل." };
  if (!/[A-Za-z]/.test(next) || !/[0-9]/.test(next)) {
    return { ok: false, error: "كلمة المرور الجديدة لازم تحتوي حروف وأرقام." };
  }
  if (next !== confirm) return { ok: false, error: "كلمة المرور الجديدة وتأكيدها مش متطابقين." };
  if (next === current) return { ok: false, error: "كلمة المرور الجديدة لازم تكون مختلفة عن الحالية." };

  // ✅ التحقق إن الباسورد الحالي صح
  const supabase = await createSupabaseServerClient();
  const { error: signInError } = await supabase.auth.signInWithPassword({
    email: auth.user.email,
    password: current,
  });
  if (signInError) return { ok: false, error: "كلمة المرور الحالية غير صحيحة." };

  // تنفيذ التغيير فوراً بمفتاح الخدمة
  const { error } = await getSupabaseAdmin().auth.admin.updateUserById(auth.user.id, {
    password: next,
  });
  if (error) return { ok: false, error: `تعذّر تنفيذ التغيير: ${error.message}` };

  return { ok: true, message: "تم تغيير كلمة المرور فوراً." };
}

/**
 * تعديل مباشر للبريد الإلكتروني للسوبر أدمن.
 * لازم الباسورد الحالي يكون صح قبل التطبيق.
 */
export async function updateOwnEmailDirect({ currentPassword, newEmail } = {}) {
  const auth = await requireSelfSuperAdmin();
  if (!auth.ok) return { ok: false, error: auth.error };

  const current = String(currentPassword ?? "");
  const email = normalizeEmail(newEmail);

  if (!EMAIL_REGEX.test(email)) return { ok: false, error: "اكتب بريد إلكتروني صحيح." };
  if (!current) return { ok: false, error: "اكتب كلمة المرور الحالية للتأكيد." };
  if (email === normalizeEmail(auth.user.email)) {
    return { ok: false, error: "البريد الجديد هو نفسه الحالي." };
  }

  // ✅ التحقق إن الباسورد الحالي صح
  const supabase = await createSupabaseServerClient();
  const { error: signInError } = await supabase.auth.signInWithPassword({
    email: auth.user.email,
    password: current,
  });
  if (signInError) return { ok: false, error: "كلمة المرور الحالية غير صحيحة." };

  // تنفيذ التغيير فوراً
  const { error } = await getSupabaseAdmin().auth.admin.updateUserById(auth.user.id, {
    email,
    email_confirm: true,
  });
  if (error) return { ok: false, error: `تعذّر تنفيذ التغيير: ${error.message}` };

  revalidatePath("/dashboard/account");
  return { ok: true, message: "تم تغيير البريد الإلكتروني فوراً. استخدم البريد الجديد في الدخول القادم." };
}

/* ==========================================================================
   6) السوبر أدمن: التراجع (Undo) — إرجاع الطلب لـ «قيد الانتظار»
   --------------------------------------------------------------------------
   المدير العام يقدر يرجع أي طلب مقبول أو مرفوض لحالة "قيد الانتظار" تاني،
   عشان ياخد قرار جديد. مفيد لو رفض بالغلط أو حب يراجع طلب وافق عليه.

   ⚠️ ملاحظة مهمة (شفافية):
   - لما الطلب يتقبل/يرفض، بياناته الحساسة بتتمسح (الباسورد المشفّر). فالتراجع
     **مش** بيعيد تنفيذ التغيير، هو بس بيفتح الطلب للمراجعة من جديد من غير
     الحمولة القديمة. الواجهة بتوضّح ده للمدير العام.
   ========================================================================== */
export async function revertSupportRequest(id) {
  const auth = await requireSuperAdmin();
  if (!auth.ok) return { ok: false, error: auth.error };
  if (!id) return { ok: false, error: "معرّف الطلب غير موجود." };

  const admin = getSupabaseAdmin();

  const { data: request, error: fetchError } = await admin
    .from(SUPPORT_TABLE)
    .select("id, status")
    .eq("id", id)
    .maybeSingle();

  if (fetchError) return { ok: false, error: `تعذّر قراءة الطلب: ${fetchError.message}` };
  if (!request) return { ok: false, error: "الطلب غير موجود." };
  if (request.status === "pending") {
    return { ok: false, error: "الطلب أصلاً قيد الانتظار." };
  }

  /*
   * بنرجّع الحالة لـ pending. بنمسح بيانات المراجعة لأن الطلب بقى "لسه ما اتراجعش"،
   * بس بنسيب الملاحظة الإدارية زي ما هي (مرجع داخلي).
   */
  const { error } = await admin
    .from(SUPPORT_TABLE)
    .update({
      status: "pending",
      reviewed_by: null,
      reviewed_at: null,
      review_note: null,
    })
    .eq("id", id);

  if (error) return { ok: false, error: `تعذّر التراجع عن الطلب: ${error.message}` };

  revalidatePath("/dashboard/support");
  return { ok: true, message: "تم إرجاع الطلب إلى «قيد الانتظار»." };
}

/* ==========================================================================
   7) السوبر أدمن: حفظ ملاحظة إدارية داخلية على الطلب
   --------------------------------------------------------------------------
   ملاحظة للتوثيق الداخلي بس — مش بتظهر للموظف في أي مكان.
   ========================================================================== */
export async function saveSupportInternalNote(id, note = "") {
  const auth = await requireSuperAdmin();
  if (!auth.ok) return { ok: false, error: auth.error };
  if (!id) return { ok: false, error: "معرّف الطلب غير موجود." };

  const clean = String(note ?? "").trim().slice(0, MAX_MESSAGE) || null;

  const { data: updated, error } = await getSupabaseAdmin()
    .from(SUPPORT_TABLE)
    .update({ internal_note: clean })
    .eq("id", id)
    .select("id");

  if (error) return { ok: false, error: `تعذّر حفظ الملاحظة: ${error.message}` };
  if (!updated || updated.length === 0) return { ok: false, error: "الطلب غير موجود." };

  revalidatePath("/dashboard/support");
  return { ok: true, message: "تم حفظ الملاحظة الإدارية." };
}
