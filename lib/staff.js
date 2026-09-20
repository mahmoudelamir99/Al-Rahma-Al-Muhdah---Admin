import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { PERMISSION_KEYS } from "@/lib/rbacConfig";

export async function listStaff() {
  const { data, error } = await getSupabaseAdmin().from("admins").select("id,email,display_name,phone_number,avatar_url,role,is_active,permissions,created_at,updated_at").order("created_at", { ascending: true });
  if (error) {
    if (error.code === "42703" || error.code === "42P01") return { ok: false, missing: true, staff: [] };
    throw new Error(error.message);
  }
  return { ok: true, staff: (data || []).map((row) => ({ ...row, permissions: Object.fromEntries(PERMISSION_KEYS.map((key) => [key, row.permissions?.[key] === true])) })) };
}
