-- ============================================================
--  الرحمة المهداة للتوظيف — لوحة تحكم الإدارة (Admin Panel)
--  المرحلة الثانية / Sprint 1 : جدول صلاحيات الأدمن
--  شغّل السكربت ده في Supabase → SQL Editor (Run)
--  ⚠️ مهم: قبل تشغيله نزّل المستخدمين من
--     Authentication → Users → Download users (عشان الـ id)
-- ============================================================

-- ------------------------------------------------------------
--  1) جدول الأدمن (بيربط حساب Auth بصلاحية الأدمن)
-- ------------------------------------------------------------
create table if not exists public.admins (
  id         uuid primary key,                    -- نفس id بتاع auth.users
  email      text not null unique,
  role       text not null default 'admin',       -- 'super_admin' | 'admin'
  created_at timestamptz not null default now()
);

alter table public.admins
  drop constraint if exists admins_role_check;
alter table public.admins
  add constraint admins_role_check check (role in ('super_admin', 'admin'));

-- ربط بالـ auth.users (لو الجدول الافتراضي موجود في نفس السكيما)
do $$
begin
  if exists (select 1 from information_schema.tables
             where table_schema = 'auth' and table_name = 'users') then
    alter table public.admins
      drop constraint if exists admins_id_fkey;
    alter table public.admins
      add constraint admins_id_fkey
      foreign key (id) references auth.users (id) on delete cascade;
  end if;
end $$;

-- RLS: مفيش أي وصول مباشر من المتصفح (كل التعامل بمفتاح الخدمة من السيرفر)
alter table public.admins enable row level security;


-- ============================================================
--  2) إدراج حساب المدير العام (Super Admin)
--  إحط id من Authentication → Users هنا قبل التشغيل
-- ============================================================
-- insert into public.admins (id, email, role)
-- values ('ضع-الـ-uuid-بتاع-المستخدم-هنا', 'mahmoudelamir9901@gmail.com', 'super_admin')
-- on conflict (email) do update
--   set id = excluded.id,
--       role = 'super_admin';
