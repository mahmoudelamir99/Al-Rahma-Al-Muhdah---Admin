import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { SUPER_ADMIN_EMAIL } from "@/lib/adminConfig";
import { ALL_PERMISSIONS, normalizePermissions } from "@/lib/rbacConfig";

export function isSuperAdminEmail(email) {
  return Boolean(email) && email.toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase();
}

export async function getCurrentAdminContext() {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.auth.getUser();
  const user = data?.user;
  if (!user) return { ok: false, error: "الجلسة انتهت. سجّل دخول تاني." };

  // لو الدعم نفّذ تغيير باسوورد، أي جلسة قديمة تتطرد قبل عرض أي صفحة.
  const forcedAt = user.app_metadata?.force_logout_at;
  const signedInAt = user.last_sign_in_at;
  if (forcedAt && signedInAt && new Date(signedInAt).getTime() < new Date(forcedAt).getTime()) {
    return { ok: false, forceLogout: true, error: "تم تحديث بيانات الحساب. سجّل دخول بالباسورد الجديد." };
  }

  if (isSuperAdminEmail(user.email)) {
    return { ok: true, user, admin: { id: user.id, email: user.email, display_name: "المدير العام", role: "super_admin", is_active: true, permissions: ALL_PERMISSIONS }, isSuperAdmin: true };
  }

  const { data: admin, error } = await getSupabaseAdmin().from("admins").select("id,email,display_name,role,is_active,permissions").eq("id", user.id).maybeSingle();
  if (error || !admin) return { ok: false, error: "الحساب مش مسجّل كموظف في لوحة التحكم." };
  if (!admin.is_active) return { ok: false, error: "الحساب موقوف. تواصل مع المدير العام." };
  return { ok: true, user, admin: { ...admin, permissions: normalizePermissions(admin.permissions) }, isSuperAdmin: admin.role === "super_admin" || isSuperAdminEmail(admin.email) };
}

export async function requirePermission(permission) {
  return requirePermissionAction(permission, "view");
}

export async function requirePermissionAction(permission, action) {
  const context = await getCurrentAdminContext();
  if (!context.ok) return context;
  if (context.isSuperAdmin || context.admin.permissions?.[permission]?.[action] === true) return context;
  return { ok: false, denied: true, error: "مش مسموح ليك تنفّذ العملية دي." };
}

export async function requireSuperAdminContext() {
  const context = await getCurrentAdminContext();
  if (!context.ok) return context;
  if (!context.isSuperAdmin) return { ok: false, denied: true, error: "القسم ده مخصص للمدير العام فقط." };
  return context;
}
