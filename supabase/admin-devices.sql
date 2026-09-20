-- ============================================================
--  الرحمة المهداة للتوظيف — لوحة تحكم الإدارة (Admin Panel)
--  المرحلة الثانية / Sprint 1 : جلسة الأجهزة المسموح لها بالدخول
--  شغّل السكربت ده في Supabase → SQL Editor (Run)
-- ============================================================
--  الفكرة: التاب ده بيحدد إيه الآلة/التليفون المسموح له يفتح اللوحة.
--  أول جهاز بيدخل اللوحة بيتسجّل أوتوماتيك بحالة "pending"،
--  وبتدخل توافق عليه بـ 'approved' عشان الأجهزة التانية تتقفل.
--  لو التاب فاضي: الدخول مفتوح للمدير العام من أي جهاز.
-- ============================================================

create table if not exists public.admin_devices (
  id             uuid primary key default gen_random_uuid(),
  device_id      text not null unique,          -- بصمة مستقرة للجهاز (من الكوكيز)
  fingerprint    text,                          -- بصمة إضافية من المتصفح (Client Hints)
  user_agent     text,
  platform       text,
  language       text,
  timezone       text,
  screen         text,
  label          text,                          -- اسم مقروء للجهاز
  status         text not null default 'pending',
  approved_by    text,
  approved_at    timestamptz,
  first_seen_at  timestamptz not null default now(),
  last_seen_at   timestamptz not null default now(),
  last_ip        text
);

alter table public.admin_devices
  drop constraint if exists admin_devices_status_check;
alter table public.admin_devices
  add constraint admin_devices_status_check
  check (status in ('pending', 'approved', 'blocked'));

create index if not exists admin_devices_status_idx
  on public.admin_devices (status);

create index if not exists admin_devices_last_seen_idx
  on public.admin_devices (last_seen_at desc);

-- RLS: مفيش أي وصول مباشر من المتصفح
alter table public.admin_devices enable row level security;
