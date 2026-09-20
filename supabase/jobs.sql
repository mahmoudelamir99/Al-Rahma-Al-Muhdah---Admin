-- ============================================================
--  الرحمة المهداة للتوظيف — جدول الوظائف (Jobs)
--  Sprint 2 — قسم إدارة الوظائف
--  شغّل السكربت ده في Supabase → SQL Editor (Run)
-- ============================================================

create table if not exists public.jobs (
  id                uuid primary key default gen_random_uuid(),
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),

  -- البيانات الأساسية
  title             text not null,                    -- اسم الوظيفة
  company           text,                             -- الشركة
  company_logo      text,                             -- اختصار اللوجو (LEONI / LG)
  company_tone      text,                             -- لون شارة الشركة (تيلويند)

  -- الوصف والمتطلبات
  description       text,                             -- وصف الوظيفة
  experience        text,                             -- الخبرة المطلوبة
  qualification     text,                             -- المؤهل المطلوب

  -- الراتب والعدد
  salary_from       integer,                          -- الراتب من
  salary_to         integer,                          -- الراتب إلى
  required_count    integer not null default 1,       -- العدد المطلوب تعيينه

  -- الحالة
  status            text not null default 'available',-- متاحة / مغلقة

  -- تفاصيل إضافية للموقع
  location          text,
  schedule          text,
  employment_type   text default 'دوام كامل'
);

-- قيود منطقية
alter table public.jobs drop constraint if exists jobs_status_check;
alter table public.jobs
  add constraint jobs_status_check check (status in ('available', 'closed'));

alter table public.jobs drop constraint if exists jobs_required_count_check;
alter table public.jobs
  add constraint jobs_required_count_check check (required_count >= 0);

alter table public.jobs drop constraint if exists jobs_salary_check;
alter table public.jobs
  add constraint jobs_salary_check
  check (salary_from is null or salary_to is null or salary_to >= salary_from);

-- تحديث updated_at أوتوماتيك
create or replace function public.touch_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists jobs_touch_updated_at on public.jobs;
create trigger jobs_touch_updated_at
  before update on public.jobs
  for each row execute function public.touch_updated_at();

-- فهارس
create index if not exists jobs_status_idx      on public.jobs (status);
create index if not exists jobs_created_at_idx  on public.jobs (created_at desc);
create index if not exists jobs_title_idx       on public.jobs (title);

-- RLS: مفيش وصول مباشر من المتصفح (كل التعامل بمفتاح الخدمة من السيرفر)
alter table public.jobs enable row level security;


-- ============================================================
--  نقل البيانات القديمة (بند "التزامن" في Sprint 2)
--  الوظائف اللي كانت مكتوبة كـ Hardcoded في كود الموقع الأساسي
--  (data/jobs.js) بقت صفوف حقيقية هنا.
--
--  ⚠️ الزرع بيتجاوز الوظيفة اللي موجودة بنفس الاسم، فالسكربت ده
--  آمن ويتشغّل أكتر من مرة من غير ما يكرر أي صف.
--  الوظيفة الخامسة (فني تبريد وتكييف) مش في الكود القديم، بس فيه
--  عليها طلبات تقديم حقيقية في جدول الطلبات، فبنضمّها عشان عدد
--  المتقدمين يبان صحيح في اللوحة.
-- ============================================================
insert into public.jobs
  (title, company, company_logo, company_tone, description,
   salary_from, salary_to, required_count, status,
   location, schedule, employment_type, experience, qualification)
select * from (values
  ('فني كهرباء', 'ليوني', 'LEONI', 'bg-red-600',
   'مطلوب فني كهرباء لديه خبرة في التركيبات والصيانة للعمل بإحدى الشركات العالمية.',
   8000, 10000, 5, 'available', 'القاهرة - مدينة نصر', '8 ساعات / ورديات', 'دوام كامل',
   'سنتان على الأقل', 'دبلوم صنايع'),
  ('مهندس مدني', 'LG', 'LG', 'bg-rose-600',
   'مطلوب مهندس مدني للإشراف على مشروعات إنشائية كبرى مع فرصة تدريب وتطوير.',
   15000, 20000, 4, 'available', 'الجيزة - 6 أكتوبر', '9 ساعات / صباحي', 'دوام كامل',
   '3 سنوات', 'بكالوريوس هندسة مدنية'),
  ('عامل إنتاج', 'ليوني', 'LEONI', 'bg-red-600',
   'مطلوب عمال إنتاج للعمل بمصنع بمنطقة العاشر من رمضان، يشترط الالتزام والجدية.',
   6000, 7500, 8, 'available', 'العاشر من رمضان', '12 ساعة / ورديات', 'دوام كامل',
   'لا يشترط', 'لا يشترط'),
  ('سائق نقل ثقيل', 'LG', 'LG', 'bg-rose-600',
   'مطلوب سائق نقل ثقيل يحمل رخصة أولى ودرجة، خبرة لا تقل عن سنتين.',
   9000, 12000, 5, 'available', 'الإسكندرية', '10 ساعات / ورديات', 'دوام كامل',
   'سنتان', 'رخصة أولى ودرجة'),
  ('فني تبريد وتكييف', 'ليوني', 'LEONI', 'bg-red-600',
   'مطلوب فني تبريد وتكييف بخبرة في التركيب والصيانة للعمل بإحدى الشركات العالمية.',
   7000, 9500, 3, 'available', 'العاشر من رمضان', '8 ساعات / ورديات', 'دوام كامل',
   'سنتان على الأقل', 'دبلوم صنايع')
) as seed(title, company, company_logo, company_tone, description,
          salary_from, salary_to, required_count, status,
          location, schedule, employment_type, experience, qualification)
where not exists (
  select 1 from public.jobs j where j.title = seed.title
);