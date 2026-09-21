"use server";

import { revalidatePath } from "next/cache";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { requirePermissionAction } from "@/lib/rbac";
import { revalidateSettingsOnSite } from "@/lib/revalidateSite";

/* ==========================================================================
   إعدادات محتوى الموقعSite Settings / CMS).
   --------------------------------------------------------------------------
   صف واحد بس في جدول site_settings بيتحكم في:
     - تشغيل/إيقاف أيقونة الواتساب في الموقع الأساسي.
     - تشغيل/إيقاف خريطة جوجل في الفوتر.
     - نصوص الشروط والأحكام (تتعرض في /terms).
   ========================================================================== */

const SETTINGS_TABLE = "site_settings";

/*
 * التزامن مع الموقع الأساسي بقى في مكان مركزي واحد (lib/revalidateSite.js) —
 * نفس منطق الوظائف بالظبط: مكان واحد للرابط والسرّ، ولوج واضح لو فشل.
 * وده اللي كان بيخلي "زرار الواتساب مش بيختفي" بعد إيقافه من اللوحة.
 */

/** القيم الافتراضية لو الجدول لسه ما اتظبطش */
const DEFAULT_SETTINGS = {
  whatsapp_enabled: true,
  map_enabled: true,
  terms_text: "",
};

/** قراءة الإعدادات الحالية (لو الجدول مش موجود بنرجع الافتراضي) */
export async function getSiteSettings() {
  const supabase = getSupabaseAdmin();
  try {
    const { data, error } = await supabase
      .from(SETTINGS_TABLE)
      .select("whatsapp_enabled, map_enabled, terms_text, hero_title, hero_subtitle, hero_video_url, about_text, contact_phones, contact_email, contact_address, social_links, updated_at, updated_by")
      .eq("id", 1)
      .maybeSingle();

    if (error) throw error;
    return { ok: true, settings: { ...DEFAULT_SETTINGS, ...(data || {}) } };
  } catch (err) {
    /*
     * 🐛 الإصلاح: قبل كده كنا بنرجّع القيم الافتراضية هنا على طول (terms_text = "")
     * فالشروط والأحكام كانت بتظهر فاضية رغم إنها محفوظة — لأن أي عمود CMS ناقص
     * بيفشّل الاستعلام كله. دلوقتي بنرجع لقراءة الأعمدة الأساسية الأول.
     */
    const basic = await supabase
      .from(SETTINGS_TABLE)
      .select("whatsapp_enabled, map_enabled, terms_text")
      .eq("id", 1)
      .maybeSingle();

    if (!basic.error) {
      return {
        ok: true,
        settings: { ...DEFAULT_SETTINGS, ...(basic.data || {}) },
        warning: `بعض أعمدة CMS مش موجودة — ${err?.message || "خطأ غير معروف"}`,
      };
    }

    // الجدول نفسه مش موجود — الصفحة تفضل شغالة بالافتراضي
    return { ok: true, settings: { ...DEFAULT_SETTINGS }, warning: err?.message };
  }
}

/** حفظ الإعدادات (تحديث جزئي آمن) */
export async function updateSiteSettings({ whatsappEnabled, mapEnabled, termsText, heroTitle, heroSubtitle, heroVideoUrl, aboutText, contactPhones, contactEmail, contactAddress, socialLinks } = {}) {
  const auth = await requirePermissionAction("cms", "update");
  if (!auth.ok) return { ok: false, error: auth.error };

  const updates = { updated_at: new Date().toISOString(), updated_by: auth.user.email || null };

  if (typeof whatsappEnabled === "boolean") updates.whatsapp_enabled = whatsappEnabled;
  if (typeof mapEnabled === "boolean") updates.map_enabled = mapEnabled;
  if (typeof termsText === "string") updates.terms_text = termsText.trim().slice(0, 20000) || null;
  const textFields = { hero_title: heroTitle, hero_subtitle: heroSubtitle, hero_video_url: heroVideoUrl, about_text: aboutText, contact_phones: contactPhones, contact_email: contactEmail, contact_address: contactAddress };
  for (const [key, value] of Object.entries(textFields)) if (typeof value === "string") updates[key] = value.trim().slice(0, 5000) || null;
  if (socialLinks && typeof socialLinks === "object") updates.social_links = Object.fromEntries(Object.entries(socialLinks).filter(([, value]) => typeof value === "string" && value.trim()).map(([key, value]) => [key, value.trim().slice(0, 1000)]));

  try {
    const { data, error } = await getSupabaseAdmin()
      .from(SETTINGS_TABLE)
      .upsert({ id: 1, ...updates }, { onConflict: "id" })
      .select("whatsapp_enabled, map_enabled, terms_text, hero_title, hero_subtitle, hero_video_url, about_text, contact_phones, contact_email, contact_address, social_links")
      .single();

    if (error) {
      if (error.code === "42P01") {
        return {
          ok: false,
          error: "جدول الإعدادات مش موجود. شغّل ملف supabase/site-settings.sql من Supabase → SQL Editor.",
        };
      }
      return { ok: false, error: `تعذّر الحفظ: ${error.message}` };
    }

    revalidatePath("/dashboard/cms");
    await revalidateSettingsOnSite();
    return { ok: true, settings: data, message: "تم حفظ الإعدادات." };
  } catch (err) {
    return { ok: false, error: `حصل خطأ غير متوقع: ${err?.message || err}` };
  }
}
