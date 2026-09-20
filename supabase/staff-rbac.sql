-- ============================================================
-- الموظفين والصلاحيات — RBAC
-- شغّل الملف ده في Supabase SQL Editor
-- ============================================================

alter table public.admins
  add column if not exists display_name text;

alter table public.admins
  add column if not exists phone_number text;

alter table public.admins
  add column if not exists avatar_url text;

alter table public.admins
  add column if not exists is_active boolean not null default true;

alter table public.admins
  add column if not exists permissions jsonb not null default '{}'::jsonb;

alter table public.admins
  add column if not exists updated_at timestamptz not null default now();

alter table public.admins
  add column if not exists session_version bigint not null default 1;

comment on column public.admins.permissions is
  'صلاحيات الموظف حسب مفاتيح الأقسام: jobs, applications, cms, support, staff';

-- توسيع الأدوار: مدير عام / HR / مدخل بيانات / دور إداري عام.
alter table public.admins
  drop constraint if exists admins_role_check;
alter table public.admins
  add constraint admins_role_check check (role in ('super_admin', 'admin', 'hr', 'data_entry'));

-- تحديث السوبر أدمن بصلاحيات كاملة وحالة مفعّلة.
update public.admins
set is_active = true,
    permissions = '{"jobs":true,"applications":true,"cms":true,"support":true,"staff":true}'::jsonb,
    updated_at = now()
where lower(email) = lower('mahmoudelamir9901@gmail.com');

create index if not exists admins_active_idx on public.admins (is_active);

-- ============================================================
-- إشعار تنفيذ طلب الدعم محفوظ في auth.users.user_metadata:
-- support_notice = { message, created_at }
-- لا يحتاج جدولًا إضافيًا.
-- ============================================================
