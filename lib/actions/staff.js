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

  /*
   * 🐛 إصلاح الـ Update Payload:
   * الـ UI بيبعت الكائن المتداخل { jobs: { view: true, ... }, ... }.
   * normalizePermissions بتضمن إن أي مفتاح ناقص أو قيمة غريبة بتتحول لـ false
   * بدل ما تتخزّن كـ undefined جوه الـ JSON — لأن undefined بتختفي من الـ JSON
   * وبتخلي الشكل غير متسق، وساعتها الـ checkboxes بتطلع فاضية تاني.
   */
  const clean = normalizePermissions(permissions);

  const { data: updated, error } = await getSupabaseAdmin()
    .from("admins")
    .update({ permissions: clean, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select("id");

  if (error) return { ok: false, error: `تعذّر حفظ الصلاحيات: ${error.message}` };
  if (!updated || updated.length === 0) return { ok: false, error: "الموظف غير موجود — ممكن يكون اتحذف." };

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

/* ---------------------------- حذف موظف ---------------------------- */
/**
 * حذف نهائي: بنمسح الحساب من Supabase Auth + الصف من جدول admins.
 * الترتيب مهم: بنمسح الصف من الجدول الأول (مصدر الحقيقة للصلاحيات)، وبعدين
 * حساب الـ Auth. لو مسحنا الـ Auth الأول وفشل مسح الصف، هيبقى عندنا صف
 * "يتيم" بلا حساب ويظهر في القائمة من غير ما ينفع يعدّل.
 */
export async function deleteStaff(id) {
  const auth = await requireSuperAdminContext();
  if (!auth.ok) return { ok: false, error: auth.error };

  if (!id) return { ok: false, error: "معرّف الموظف غير موجود." };
  if (id === auth.user.id) return { ok: false, error: "مينفعش تحذف حسابك أنت." };

  const admin = getSupabaseAdmin();

  // بنتأكد الأول إن الصف مش بتاع المدير العام (حماية إضافية على السيرفر)
  const { data: row, error: readError } = await admin
    .from("admins")
    .select("id,email,role,display_name")
    .eq("id", id)
    .maybeSingle();

  if (readError) return { ok: false, error: `تعذّر قراءة بيانات الموظف: ${readError.message}` };
  if (!row) return { ok: false, error: "الموظف غير موجود — ممكن يكون اتحذف بالفعل." };

  const SUPER_ADMIN_EMAIL = (process.env.SUPER_ADMIN_EMAIL || "").toLowerCase();
  const isSuper = row.role === "super_admin" || (SUPER_ADMIN_EMAIL && row.email?.toLowerCase() === SUPER_ADMIN_EMAIL);
  if (isSuper) return { ok: false, error: "مينفعش تحذف حساب المدير العام." };

  // 1) مسح الصف من جدول admins
  const { error: rowError } = await admin.from("admins").delete().eq("id", id);
  if (rowError) return { ok: false, error: `تعذّر حذف بيانات الموظف: ${rowError.message}` };

  // 2) مسح حساب الـ Auth — لو فشلت، الصف اتشال خلاص وده مش كارثة (الحساب يبقى معطّل)
  const { error: authError } = await admin.auth.admin.deleteUser(id);
  if (authError) {
    console.error("[deleteStaff] فشل حذف حساب الـ Auth:", authError.message);
    revalidatePath("/dashboard/staff");
    return {
      ok: true,
      message: "تم حذف الموظف من اللوحة، لكن حساب الدخول محتاج مسح يدوي من Supabase → Authentication.",
    };
  }

  revalidatePath("/dashboard/staff");
  return { ok: true, message: "تم حذف الموظف وحساب الدخول نهائيًا." };
}
