import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { normalizePermissions } from "@/lib/rbacConfig";

export async function listStaff() {
  const { data, error } = await getSupabaseAdmin().from("admins").select("id,email,display_name,phone_number,avatar_url,role,is_active,permissions,created_at,updated_at").order("created_at", { ascending: true });
  if (error) {
    if (["42703", "42P01", "PGRST205"].includes(error.code)) return { ok: false, missing: true, staff: [] };
    throw new Error(error.message);
  }

  /*
   * 🐛 الإصلاح المهم هنا (كانت الـ checkboxes بتفضل فاضية):
   * قبل كده كان مكتوب `row.permissions?.[key] === true` — والمقارنة دي بتشتغل
   * بس لو القيمة boolean. لكن الصلاحيات مخزّنة في قاعدة البيانات ككائن متداخل
   * بالشكل { jobs: { view: true, create: false, ... } }, فالمقارنة بترجع
   * false دايمًا، والـ UI بيطلع فاضي حتى بعد الحفظ.
   *
   * الحل: نمرر القيمة على normalizePermissions اللي بتبني الشكل المتداخل
   * الصحيح (وبتدعم كذلك الشكل القديم المضغوط section: true لو موجود).
   */
  return {
    ok: true,
    staff: (data || []).map((row) => ({ ...row, permissions: normalizePermissions(row.permissions) })),
  };
}
