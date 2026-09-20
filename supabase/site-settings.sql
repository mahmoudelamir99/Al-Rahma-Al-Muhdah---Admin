-- ============================================================
--  الرحمة المهداة للتوظيف — إعدادات الموقع + طلبات الدعم الفني
--  شغّل السكربت ده في Supabase → SQL Editor (Run)
--  السكربت آمن ويتشغّل أكتر من مرة (كل الأوامر if not exists).
-- ============================================================


-- ------------------------------------------------------------
--  1) جدول إعدادات الموقع (Site Settings)
--     صف واحد بس (singleton) بالمعرّف id = 1.
--     بيتحكم في: أيقونة الواتساب، خريطة جوجل، نصوص الشروط والأحكام.
-- ------------------------------------------------------------
create table if not exists public.site_settings (
  id                integer primary key default 1,
  whatsapp_enabled  boolean not null default true,
  map_enabled       boolean not null default true,
  terms_text        text,
  updated_at        timestamptz not null default now(),
  updated_by        text,

  -- قيد يضمن إن الجدول فيه صف واحد بس (id لازم يكون 1)
  constraint site_settings_singleton check (id = 1)
);

comment on table public.site_settings is
  'إعدادات محتوى الموقع الأساسي — صف واحد بيتحكم فيه الأدمن من لوحة التحكم';
comment on column public.site_settings.whatsapp_enabled is
  'تشغيل/إيقاف أيقونة الواتساب في الموقع الأساسي';
comment on column public.site_settings.map_enabled is
  'تشغيل/إيقاف خريطة جوجل في الفوتر';
comment on column public.site_settings.terms_text is
  'نص الشروط والأحكام — بيتعرض في صفحة /terms على الموقع';

-- الصف الوحيد الافتراضي (لو مش موجود)
alter table public.site_settings add column if not exists hero_title text;
alter table public.site_settings add column if not exists hero_subtitle text;
alter table public.site_settings add column if not exists hero_video_url text;
alter table public.site_settings add column if not exists about_text text;
alter table public.site_settings add column if not exists contact_phones text;
alter table public.site_settings add column if not exists contact_email text;
alter table public.site_settings add column if not exists contact_address text;
alter table public.site_settings add column if not exists social_links jsonb not null default '{}'::jsonb;

insert into public.site_settings (id)
values (1)
on conflict (id) do nothing;

-- RLS: مفيش وصول مباشر من المتصفح (الكتابة من السيرفر بمفتاح الخدمة)
alter table public.site_settings enable row level security;


-- ------------------------------------------------------------
--  2) جدول طلبات الدعم الفني (Support Requests)
--     طلبات الموظفين على النظام (مش طلبات التوظيف):
--     تغيير كلمة المرور أو البريد الإلكتروني.
--
--     اللوجيك: الموظف بيكتب البيانات ويدوس "إرسال طلب" → الطلب
--     بيتسجل بحالة 'pending'. السوبر أدمن يراجعه، ولو وافق
--     السيستم ينفّذ التغيير فعلياً على حساب Auth.
-- ------------------------------------------------------------
create table if not exists public.support_requests (
  id                uuid primary key default gen_random_uuid(),
  created_at        timestamptz not null default now(),

  -- بيانات الموظف اللي بعت الطلب (تسجل وقت الإرسال عشان تفضل ظاهرة)
  employee_id       uuid,                         -- نفس id بتاع auth.users
  employee_email    text not null,                -- الإيميل وقت الإرسال
  employee_name     text,                         -- الاسم (لو متسجل)
  employee_role     text,                         -- الصلاحية: super_admin | admin

  -- نوع الطلب وبياناته
  request_type      text not null,                -- 'password' | 'email'
  -- العمود ده شغال في الحالتين:
  --   - طلب 'email': بيخزّن البريد الجديد نص عادي.
  --   - طلب 'password': بيخزّن كلمة المرور الجديدة **مشفّرة**
  --     (AES-256-GCM) عشان السوبر أدمن ما يشوفهاش، والنظام يفكّها
  --     وقت الموافقة بس ثم يمسحها فوراً بعد التنفيذ.
  new_email         text,

  -- الحالة والمراجعة
  status            text not null default 'pending',  -- pending | approved | rejected
  reviewed_by       text,
  reviewed_at       timestamptz,
  review_note       text,

  message           text                              -- ملاحظة الموظف الاختيارية
);

-- قيد على نوع الطلب
alter table public.support_requests
  drop constraint if exists support_requests_type_check;
alter table public.support_requests
  add constraint support_requests_type_check
  check (request_type in ('password', 'email'));

-- قيد على الحالة
alter table public.support_requests
  drop constraint if exists support_requests_status_check;
alter table public.support_requests
  add constraint support_requests_status_check
  check (status in ('pending', 'approved', 'rejected'));

-- فهارس للوحة التحكم
create index if not exists support_requests_created_at_idx
  on public.support_requests (created_at desc);
create index if not exists support_requests_status_idx
  on public.support_requests (status);

comment on table public.support_requests is
  'طلبات الموظفين على النظام (تغيير باسوورد/إيميل) — بيراجعها السوبر أدمن';

-- RLS: مفيش وصول مباشر من المتصفح
alter table public.support_requests enable row level security;


-- ============================================================
--  خلاص. بعد التشغيل، اللوحة هتقدر تقرأ/تكتب الإعدادات وتدير
--  طلبات الدعم الفني، والموقع هيقرا الإعدادات مباشرة.
-- ============================================================
