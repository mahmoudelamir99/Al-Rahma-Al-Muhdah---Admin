"use server";

import { revalidatePath } from "next/cache";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { requireSuperAdminContext } from "@/lib/rbac";
import { normalizePermissions } from "@/lib/rbacConfig";

const cleanEmail = (value) => String(value ?? "").trim().toLowerCase();
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/*
 * 🗑️ تمت إزالة \"الدور\" (HR / مدير / مدخل بيانات) من فورم الإضافة (Sprint 3):
 * الاعتماد بقى على الـ Checkboxes بتاعة الصلاحيات بس. الدور الداخلي بيبقى
 * ثابت "admin" (مش "super_admin" طبعاً — ده محجوز للمدير العام). الصلاحيات
 * الفعلية هي اللي بتحدد الموظف يقدر يعمل إيه، مش مسمى الدور.
 */
export async function createStaff({ displayName, email, password, phoneNumber, avatarUrl, permissions = {} } = {}) {
  const auth = await requireSuperAdminContext();
  if (!auth.ok) return { ok: false, error: auth.error };
  const clean = cleanEmail(email);
  if (!String(displayName ?? "").trim()) return { ok: false, error: "اسم الموظف مطلوب." };
  if (!emailPattern.test(clean)) return { ok: false, error: "البريد الإلكتروني غير صحيح." };
  if (!password || password.length < 8) return { ok: false, error: "كلمة المرور المبدئية لازم تكون 8 أحرف على الأقل." };

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
    role: "admin",
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

/* ==========================================================================
   تعديل موظف — تعديل حر لكل بياناته (Sprint 3)
   --------------------------------------------------------------------------
   المدير العام يقدر يعدّل: الاسم، الإيميل، التليفون، الصورة، والصلاحيات —
   من غير أي تقييد. الفرق عن updateStaffPermissions إن دي بتعدل البيانات
   الأساسية كمان، مش الصلاحيات بس.

   لو الإيميل اتغيّر، بنحدّثه في مكانين:
     1) حساب الدخول في Supabase Auth (عشان يستخدم الإيميل الجديد في الدخول).
     2) صف الموظف في جدول admins.
   وبنحرص إن الإيميل الجديد ميتكررش مع موظف تاني.
   ========================================================================== */
export async function updateStaff(id, { displayName, email, phoneNumber, avatarUrl, permissions } = {}) {
  const auth = await requireSuperAdminContext();
  if (!auth.ok) return { ok: false, error: auth.error };
  if (!id) return { ok: false, error: "معرّف الموظف غير موجود." };
  if (id === auth.user.id) {
    return { ok: false, error: "بتعدّل بياناتك من صفحة «حسابي» مش من هنا." };
  }

  const admin = getSupabaseAdmin();

  // نتأكد إن الموظف موجود + نجيب إيميله الحالي
  const { data: row, error: readError } = await admin
    .from("admins")
    .select("id,email,role")
    .eq("id", id)
    .maybeSingle();
  if (readError) return { ok: false, error: `تعذّر قراءة بيانات الموظف: ${readError.message}` };
  if (!row) return { ok: false, error: "الموظف غير موجود — ممكن يكون اتحذف." };
  if (row.role === "super_admin") return { ok: false, error: "مينفعش تعدّل حساب المدير العام من هنا." };

  const updates = {};

  // 1) الاسم
  if (displayName !== undefined) {
    const name = String(displayName ?? "").trim();
    if (!name) return { ok: false, error: "اسم الموظف مطلوب." };
    updates.display_name = name;
  }

  // 2) التليفون (اختياري)
  if (phoneNumber !== undefined) {
    updates.phone_number = String(phoneNumber ?? "").trim() || null;
  }

  // 3) الصورة (اختياري)
  if (avatarUrl !== undefined) {
    updates.avatar_url = String(avatarUrl ?? "").trim() || null;
  }

  // 4) الصلاحيات
  if (permissions !== undefined) {
    updates.permissions = normalizePermissions(permissions);
  }

  // 5) الإيميل — يحتاج تحديث Auth كذلك
  let newEmail = null;
  if (email !== undefined) {
    const clean = cleanEmail(email);
    if (!emailPattern.test(clean)) return { ok: false, error: "البريد الإلكتروني غير صحيح." };
    if (clean !== cleanEmail(row.email)) {
      // نتأكد إن الإيميل الجديد مش مستخدم مع موظف تاني
      const { data: existing } = await admin.from("admins").select("id").eq("email", clean).maybeSingle();
      if (existing && existing.id !== id) {
        return { ok: false, error: "البريد الإلكتروني ده مستخدم بالفعل مع موظف تاني." };
      }
      newEmail = clean;
      updates.email = clean;
    }
  }

  if (Object.keys(updates).length === 0) {
    return { ok: false, error: "مفيش أي تغيير للحفظ." };
  }

  // لو في إيميل جديد → نحدّث حساب الدخول الأول
  if (newEmail) {
    const { error: authError } = await admin.auth.admin.updateUserById(id, {
      email: newEmail,
      email_confirm: true,
      user_metadata: { display_name: updates.display_name ?? undefined },
    });
    if (authError) return { ok: false, error: `تعذّر تحديث بيانات الدخول: ${authError.message}` };
  } else if (updates.display_name) {
    // نحدّث الاسم في ميتاداتا الحساب كذلك لو اتغيّر
    await admin.auth.admin.updateUserById(id, {
      user_metadata: { display_name: updates.display_name },
    });
  }

  const { data: updated, error } = await admin
    .from("admins")
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select("id");

  if (error) return { ok: false, error: `تعذّر حفظ التعديلات: ${error.message}` };
  if (!updated || updated.length === 0) return { ok: false, error: "الموظف غير موجود — ممكن يكون اتحذف." };

  revalidatePath("/dashboard/staff");
  return { ok: true, message: "تم حفظ تعديلات الموظف." };
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
