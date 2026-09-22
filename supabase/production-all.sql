-- ============================================================
-- الرحمة المهداة — Production Bootstrap SQL
-- شغّل الملف ده مرة واحدة في Supabase SQL Editor.
-- لا يحتوي أي مفاتيح سرية.
-- ============================================================

create extension if not exists pgcrypto;

-- ------------------------------------------------------------
-- 1) الوظائف
-- ------------------------------------------------------------
create table if not exists public.jobs (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  title text not null,
  company text,
  company_logo text,
  company_tone text,
  description text,
  experience text,
  qualification text,
  salary_from integer,
  salary_to integer,
  required_count integer not null default 1,
  status text not null default 'available',
  location text,
  schedule text,
  employment_type text default 'دوام كامل'
);

alter table public.jobs drop constraint if exists jobs_status_check;
alter table public.jobs add constraint jobs_status_check check (status in ('available','closed'));
alter table public.jobs drop constraint if exists jobs_required_count_check;
alter table public.jobs add constraint jobs_required_count_check check (required_count >= 0);
alter table public.jobs drop constraint if exists jobs_salary_check;
alter table public.jobs add constraint jobs_salary_check check (salary_from is null or salary_to is null or salary_to >= salary_from);

create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;
drop trigger if exists jobs_touch_updated_at on public.jobs;
create trigger jobs_touch_updated_at before update on public.jobs for each row execute function public.touch_updated_at();
create index if not exists jobs_status_idx on public.jobs(status);
create index if not exists jobs_created_at_idx on public.jobs(created_at desc);
create index if not exists jobs_title_idx on public.jobs(title);
alter table public.jobs enable row level security;

-- ------------------------------------------------------------
-- 2) طلبات التوظيف
-- ------------------------------------------------------------
create table if not exists public.job_applications (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  full_name text not null,
  phone_number text not null,
  national_id text,
  age integer not null,
  gender text not null,
  marital_status text not null,
  governorate text not null,
  city text not null,
  address text,
  education_level text not null,
  specialization text,
  military_status text not null,
  experience_years text not null,
  previous_companies text,
  expected_salary text not null,
  selected_job text not null,
  status text not null default 'pending',
  rejection_reason text,
  cancellation_reason text,
  completion_fields text[] not null default '{}',
  hr_notes text,
  reviewed_by text,
  reviewed_at timestamptz
);

alter table public.job_applications add column if not exists address text;
alter table public.job_applications add column if not exists national_id text;
alter table public.job_applications add column if not exists rejection_reason text;
alter table public.job_applications add column if not exists cancellation_reason text;
alter table public.job_applications add column if not exists completion_fields text[] not null default '{}';
alter table public.job_applications add column if not exists hr_notes text;
alter table public.job_applications add column if not exists reviewed_by text;
alter table public.job_applications add column if not exists reviewed_at timestamptz;

-- الأرشيف (Soft Delete): deleted_at بيحدد إذا كان الطلب محذوف ناعماً
-- (موجود في الأرشيف) ولا لسه في القائمة الرئيسية.
alter table public.job_applications add column if not exists deleted_at timestamptz;
alter table public.job_applications add column if not exists deleted_by text;

alter table public.job_applications drop constraint if exists job_applications_age_check;
alter table public.job_applications add constraint job_applications_age_check check (age between 18 and 70);
alter table public.job_applications drop constraint if exists job_applications_status_check;
alter table public.job_applications add constraint job_applications_status_check check (status in ('pending','reviewed','needs_info','accepted','rejected','cancelled'));
alter table public.job_applications drop constraint if exists job_applications_national_id_check;
alter table public.job_applications add constraint job_applications_national_id_check check (national_id is null or national_id ~ '^[0-9]{14}$');
create index if not exists job_applications_created_at_idx on public.job_applications(created_at desc);
create index if not exists job_applications_status_idx on public.job_applications(status);
create index if not exists job_applications_national_id_idx on public.job_applications(national_id);
create index if not exists job_applications_job_idx on public.job_applications(selected_job);
create index if not exists job_applications_deleted_at_idx on public.job_applications(deleted_at);
alter table public.job_applications enable row level security;

-- ------------------------------------------------------------
-- 3) رسائل التواصل
-- ------------------------------------------------------------
create table if not exists public.contact_messages (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  full_name text not null,
  phone_number text not null,
  reason text not null,
  message text not null,
  status text not null default 'new'
);
alter table public.contact_messages drop constraint if exists contact_messages_status_check;
alter table public.contact_messages add constraint contact_messages_status_check check (status in ('new','read','replied'));
create index if not exists contact_messages_created_at_idx on public.contact_messages(created_at desc);
create index if not exists contact_messages_status_idx on public.contact_messages(status);
alter table public.contact_messages enable row level security;

-- ------------------------------------------------------------
-- 4) إعدادات الموقع / CMS
-- ------------------------------------------------------------
create table if not exists public.site_settings (
  id integer primary key default 1,
  whatsapp_enabled boolean not null default true,
  map_enabled boolean not null default true,
  terms_text text,
  hero_title text,
  hero_subtitle text,
  hero_video_url text,
  about_text text,
  contact_phones text,
  contact_email text,
  contact_address text,
  social_links jsonb not null default '{}'::jsonb,
  features_enabled boolean not null default true,
  feature_1_title text,
  feature_1_text text,
  feature_2_title text,
  feature_2_text text,
  feature_3_title text,
  feature_3_text text,
  updated_at timestamptz not null default now(),
  updated_by text,
  constraint site_settings_singleton check (id = 1)
);
insert into public.site_settings(id) values(1) on conflict(id) do nothing;

-- ترقية آمنة لو الجدول كان موجود قبل إضافة قسم المميزات
alter table public.site_settings add column if not exists features_enabled boolean not null default true;
alter table public.site_settings add column if not exists feature_1_title text;
alter table public.site_settings add column if not exists feature_1_text text;
alter table public.site_settings add column if not exists feature_2_title text;
alter table public.site_settings add column if not exists feature_2_text text;
alter table public.site_settings add column if not exists feature_3_title text;
alter table public.site_settings add column if not exists feature_3_text text;

alter table public.site_settings enable row level security;

-- ------------------------------------------------------------
-- 5) حسابات وصلاحيات الأدمن
-- ------------------------------------------------------------
create table if not exists public.admins (
  id uuid primary key,
  email text not null unique,
  role text not null default 'admin',
  created_at timestamptz not null default now()
);
alter table public.admins drop constraint if exists admins_role_check;
alter table public.admins add constraint admins_role_check check (role in ('super_admin','admin','hr','data_entry'));
alter table public.admins add column if not exists display_name text;
alter table public.admins add column if not exists phone_number text;
alter table public.admins add column if not exists avatar_url text;
alter table public.admins add column if not exists is_active boolean not null default true;
alter table public.admins add column if not exists permissions jsonb not null default '{}'::jsonb;
alter table public.admins add column if not exists updated_at timestamptz not null default now();
alter table public.admins add column if not exists session_version bigint not null default 1;
create index if not exists admins_active_idx on public.admins(is_active);
alter table public.admins enable row level security;

-- ------------------------------------------------------------
-- 6) طلبات الدعم الفني
-- ------------------------------------------------------------
create table if not exists public.support_requests (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  employee_id uuid,
  employee_email text not null,
  employee_name text,
  employee_role text,
  request_type text not null,
  new_email text,
  status text not null default 'pending',
  reviewed_by text,
  reviewed_at timestamptz,
  review_note text,
  message text
);
alter table public.support_requests drop constraint if exists support_requests_type_check;
alter table public.support_requests add constraint support_requests_type_check check (request_type in ('password','email'));
alter table public.support_requests drop constraint if exists support_requests_status_check;
alter table public.support_requests add constraint support_requests_status_check check (status in ('pending','approved','rejected'));
create index if not exists support_requests_created_at_idx on public.support_requests(created_at desc);
create index if not exists support_requests_status_idx on public.support_requests(status);
alter table public.support_requests enable row level security;

-- ------------------------------------------------------------
-- 7) الأجهزة (إن كانت لوحة الإنتاج تستخدمها)
-- ------------------------------------------------------------
create table if not exists public.admin_devices (
  id uuid primary key default gen_random_uuid(),
  device_id text not null unique,
  fingerprint text,
  user_agent text,
  platform text,
  language text,
  timezone text,
  screen text,
  label text,
  status text not null default 'pending',
  approved_by text,
  approved_at timestamptz,
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  last_ip text
);
alter table public.admin_devices drop constraint if exists admin_devices_status_check;
alter table public.admin_devices add constraint admin_devices_status_check check (status in ('pending','approved','blocked'));
create index if not exists admin_devices_status_idx on public.admin_devices(status);
alter table public.admin_devices enable row level security;

-- تأكيد السوبر أدمن لو صفه موجود بالفعل.
update public.admins
set is_active = true,
    permissions = '{"jobs":{"view":true,"create":true,"update":true,"delete":true},"applications":{"view":true,"create":true,"update":true,"delete":true},"cms":{"view":true,"create":true,"update":true,"delete":true},"support":{"view":true,"create":true,"update":true,"delete":true},"staff":{"view":true,"create":true,"update":true,"delete":true}}'::jsonb,
    updated_at = now()
where lower(email) = lower('mahmoudelamir9901@gmail.com');

-- ملاحظة: المستخدم نفسه لازم يكون موجودًا في Authentication → Users.
-- بعد تشغيل الملف، تأكد أن NEXT_PUBLIC_SUPABASE_URL وNEXT_PUBLIC_SUPABASE_ANON_KEY
-- وSUPABASE_SERVICE_ROLE_KEY مضبوطة في Vercel Production ثم اعمل Redeploy.

-- ------------------------------------------------------------
-- بيانات وظائف أساسية اختيارية (تُضاف فقط لو الاسم غير موجود)
-- ------------------------------------------------------------
insert into public.jobs
  (title, company, company_logo, company_tone, description, salary_from, salary_to, required_count, status, location, schedule, employment_type, experience, qualification)
select * from (values
  ('فني كهرباء','ليوني','LEONI','bg-red-600','مطلوب فني كهرباء لديه خبرة في التركيبات والصيانة للعمل بإحدى الشركات العالمية.',8000,10000,5,'available','القاهرة - مدينة نصر','8 ساعات / ورديات','دوام كامل','سنتان على الأقل','دبلوم صنايع'),
  ('مهندس مدني','LG','LG','bg-rose-600','مطلوب مهندس مدني للإشراف على مشروعات إنشائية كبرى.',15000,20000,4,'available','الجيزة - 6 أكتوبر','9 ساعات / صباحي','دوام كامل','3 سنوات','بكالوريوس هندسة مدنية'),
  ('عامل إنتاج','ليوني','LEONI','bg-red-600','مطلوب عمال إنتاج للعمل بمصنع بمنطقة العاشر من رمضان.',6000,7500,8,'available','العاشر من رمضان','12 ساعة / ورديات','دوام كامل','لا يشترط','لا يشترط'),
  ('سائق نقل ثقيل','LG','LG','bg-rose-600','مطلوب سائق نقل ثقيل يحمل رخصة أولى ودرجة.',9000,12000,5,'available','الإسكندرية','10 ساعات / ورديات','دوام كامل','سنتان','رخصة أولى ودرجة'),
  ('فني تبريد وتكييف','ليوني','LEONI','bg-red-600','مطلوب فني تبريد وتكييف بخبرة في التركيب والصيانة.',7000,9500,3,'available','العاشر من رمضان','8 ساعات / ورديات','دوام كامل','سنتان على الأقل','دبلوم صنايع')
) as seed(title, company, company_logo, company_tone, description, salary_from, salary_to, required_count, status, location, schedule, employment_type, experience, qualification)
where not exists (select 1 from public.jobs j where j.title = seed.title);
