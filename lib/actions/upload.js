"use server";

import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { getCurrentAdminContext } from "@/lib/rbac";

/* ==========================================================================
   رفع الملفات على Supabase Storage (صور الموظفين + فيديو الواجهة + اللوجوهات).
   --------------------------------------------------------------------------
   ليه Server Action ومش رفع مباشر من المتصفح؟
    1) الأمان: الرفع بمفتاح الخدمة (service_role) اللي بيتجاوز RLS، فمفيش أي
       كتابة من المتصفح خالص ومش محتاجين نضبط سياسات كتابة على الـ bucket.
    2) التحقق: بنفحص نوع الملف وحجمه على السيرفر قبل ما يوصل للتخزين.
    3) التجربة: المفتاح العام (anon) مبيحتاجش صلاحيات storage في المتصفح.
   ========================================================================== */

/*
 * ⚠️ في ملف "use server" كل المصدَّرات لازم تكون دوال async — عشان كده الثوابت
 * دي مش مصدّرة (مهي بلوك مكتبة تانية).
 */
const MEDIA_BUCKET = "media";

/** أقصى حجم ملف: 50 ميجا (نفس الحد المضبوط على الـ bucket) */
const MAX_FILE_BYTES = 50 * 1024 * 1024;

/** المسارات المسموح الرفع فيها — قائمة بيضاء مقصودة */
const ALLOWED_FOLDERS = new Set(["avatars", "hero", "logos", "cms"]);

/** امتداد كل نوع MIME مسموح */
const EXTENSION_BY_MIME = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/jpg": "jpg",
  "image/webp": "webp",
  "image/gif": "gif",
  "image/svg+xml": "svg",
  "video/mp4": "mp4",
  "video/webm": "webm",
  "video/ogg": "ogv",
  "video/quicktime": "mov",
};

/**
 * الرفع الفعلي.
 * @param {FormData} formData — فيها `file` (الملف) و `folder` (مجلد الرفع)
 * @returns {{ ok: true, url: string, path: string } | { ok: false, error: string }}
 */
export async function uploadMedia(formData) {
  // 1) لازم اللي بيرفع يكون موظف مسجّل
  const context = await getCurrentAdminContext();
  if (!context.ok) {
    return { ok: false, error: context.error || "الجلسة انتهت. سجّل دخول تاني." };
  }

  const file = formData?.get?.("file");
  const folder = String(formData?.get?.("folder") || "cms").trim();

  if (!file || typeof file === "string" || !file.size) {
    return { ok: false, error: "اختار ملف الأول." };
  }
  if (!ALLOWED_FOLDERS.has(folder)) {
    return { ok: false, error: "مجلد الرفع غير مسموح." };
  }
  if (file.size > MAX_FILE_BYTES) {
    return { ok: false, error: "حجم الملف أكبر من 50 ميجا." };
  }

  const mime = String(file.type || "").toLowerCase();
  const extension = EXTENSION_BY_MIME[mime];
  if (!extension) {
    return {
      ok: false,
      error: "نوع الملف مش مدعوم. المسموح: صور (png/jpg/webp/gif/svg) أو فيديو (mp4/webm/ogv).",
    };
  }

  /*
   * اسم فريد للملف: الوقت الحالي + سلسلة عشوائية.
   * ده بيمنع أي تعارض في الأسماء، وبيضمن إن الرابط الجديد مبيتخزّنش في كاش
   * المتصفح بنفس الاسم (المشكلة الشهيرة إن الصورة القديمة تفضل ظاهرة).
   */
  const unique = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  const path = `${folder}/${unique}.${extension}`;

  try {
    const bytes = await file.arrayBuffer();
    const { error } = await getSupabaseAdmin()
      .storage.from(MEDIA_BUCKET)
      .upload(path, bytes, {
        contentType: mime,
        cacheControl: "3600",
        upsert: false,
      });

    if (error) {
      // لو الـ bucket مش موجود، نساعد المستخدم برسالة واضحة
      if (/bucket/i.test(error.message) || error.statusCode === "404") {
        return {
          ok: false,
          error: "bucket التخزين مش موجود. شغّل ملف supabase/storage.sql من Supabase → SQL Editor.",
        };
      }
      return { ok: false, error: `تعذّر رفع الملف: ${error.message}` };
    }

    const { data } = getSupabaseAdmin().storage.from(MEDIA_BUCKET).getPublicUrl(path);
    return { ok: true, url: data?.publicUrl || "", path };
  } catch (error) {
    return { ok: false, error: `حصل خطأ غير متوقع أثناء الرفع: ${error?.message || error}` };
  }
}
