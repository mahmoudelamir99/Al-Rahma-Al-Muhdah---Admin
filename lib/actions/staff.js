"use server";

import { revalidatePath } from "next/cache";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { requireSuperAdminContext } from "@/lib/rbac";
import { normalizePermissions } from "@/lib/rbacConfig";

const cleanEmail = (value) => String(value ?? "").trim().toLowerCase();
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function createStaff({ displayName, email, password, phoneNumber, avatarUrl, role = "admin", permissions = {} } = {}) {
  const auth = await requireSuperAdminContext();
  if (!auth.ok) return { ok: false, error: auth.error };
  const clean = cleanEmail(email);
  if (!String(displayName ?? "").trim()) return { ok: false, error: "اسم الموظف مطلوب." };
  if (!emailPattern.test(clean)) return { ok: false, error: "البريد الإلكتروني غير صحيح." };
  if (!password || password.length < 8) return { ok: false, error: "كلمة المرور المبدئية لازم تكون 8 أحرف على الأقل." };
  if (!["admin", "hr", "data_entry"].includes(role)) return { ok: false, error: "الدور غير صحيح." };

  const selectedPermissions = normalizePermissions(permissions);
  const admin = getSupabaseAdmin();
  const { data: created, error: authError } = await admin.auth.admin.createUser({
    email: clean,
    password,
    email_confirm: true,
    user_metadata: { display_name: String(displayName).trim() },
  });
  if (authError) return { ok: false, error: `تعذّر إنشاء الحساب: ${authError.message}` };

  const { error: rowError } = await admin.from("admins").insert({
    id: created.user.id,
    email: clean,
    display_name: String(displayName).trim(),
    phone_number: String(phoneNumber ?? "").trim() || null,
    avatar_url: String(avatarUrl ?? "").trim() || null,
    role,
    is_active: true,
    permissions: selectedPermissions,
  });
  if (rowError) {
    await admin.auth.admin.deleteUser(created.user.id);
    return { ok: false, error: `تعذّر حفظ صلاحيات الموظف: ${rowError.message}` };
  }

  revalidatePath("/dashboard/staff");
  return { ok: true, message: "تم إنشاء الموظف بنجاح." };
}

export async function updateStaffPermissions(id, permissions) {
  const auth = await requireSuperAdminContext();
  if (!auth.ok) return { ok: false, error: auth.error };
  if (!id || id === auth.user.id) return { ok: false, error: "صلاحيات المدير العام غير قابلة للتعديل." };
  const clean = normalizePermissions(permissions);
  const { error } = await getSupabaseAdmin().from("admins").update({ permissions: clean, updated_at: new Date().toISOString() }).eq("id", id);
  if (error) return { ok: false, error: `تعذّر حفظ الصلاحيات: ${error.message}` };
  revalidatePath("/dashboard/staff");
  return { ok: true, message: "تم حفظ الصلاحيات." };
}

export async function setStaffActive(id, isActive) {
  const auth = await requireSuperAdminContext();
  if (!auth.ok) return { ok: false, error: auth.error };
  if (!id || id === auth.user.id) return { ok: false, error: "مينفعش إيقاف المدير العام." };
  const admin = getSupabaseAdmin();
  const { error } = await admin.from("admins").update({ is_active: Boolean(isActive), updated_at: new Date().toISOString() }).eq("id", id);
  if (error) return { ok: false, error: `تعذّر تغيير حالة الموظف: ${error.message}` };
  if (!isActive) {
    await admin.from("admins").update({ session_version: Date.now() }).eq("id", id);
  }
  revalidatePath("/dashboard/staff");
  return { ok: true, message: isActive ? "تم تفعيل الموظف." : "تم إيقاف الموظف وطرده من الجلسات." };
}
