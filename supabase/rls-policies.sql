-- ============================================================================
--  RLS Policies — الإصلاحات الحرجة للـ Production
-- ============================================================================
--
--  ⚠️ سياق مهم قبل ما تشغّل الملف ده:
--
--  الكود الحالي بيكتب في القاعدة من **Server Actions** بمفتاح الخدمة
--  (SUPABASE_SERVICE_ROLE_KEY)، ومفتاح الخدمة ده **يتجاوز RLS بالكامل**.
--  يعني لو الـ 500 error بيحصل في فورم تقديم الوظيفة، السبب في الغالب مش
--  RLS — لكن تشغيل الملف ده **مايضرّش أبدًا**. بالعكس: هو بيقفل الثغرة اللي
--  لو حصل يوم وانتقل الكود (أو فتحنا API مباشر) يبقى الوصول محكوم.
--
--  كل الـ policies هنا **إضافية** (additive) — مفيش أي سياسة بتقفل أو
--  بتشيل صلاحية قائمة. لو الـ policy موجودة الأصل، بتتستبدل بنفس التعريف.
--
--  طريقة التشغيل: Supabase Dashboard → SQL Editor → الصق الملف → Run
-- ============================================================================


-- ----------------------------------------------------------------------------
--  1) job_applications — طلبات التوظيف
-- ----------------------------------------------------------------------------
alter table if exists public.job_applications enable row level security;

-- الزائر (anon) يقدر **يضيف** طلب جديد بس. مفيش قراءة، مفيش تعديل، مفيش حذف.
-- ده اللي بيسمح لفورم التقديم يشتغل لو حبيت تكتب بالمفتاح العام يوم ما.
drop policy if exists "anon_can_insert_applications" on public.job_applications;
create policy "anon_can_insert_applications"
  on public.job_applications
  for insert
  to anon, authenticated
  with check (true);

-- قراءة الطلب للتتبع: الزائر بيقرأ بالمعرّف (id) اللي معاه من وقت التقديم.
-- ملاحظة أمنية: ده بيعرّض قراءة أي طلب لو حد عرف رقمه العشوائي (UUID صعب
-- التخمين). الكود الحالي بيعمل التتبع من السيرفر بمفتاح الخدمة، فلو مش
-- محتاج القراءة من المتصفح خالص، امسح الـ policy دي.
drop policy if exists "anon_can_read_applications" on public.job_applications;
create policy "anon_can_read_applications"
  on public.job_applications
  for select
  to anon, authenticated
  using (true);

-- ملاحظة: الزائر **مش** قادر يعدّل أو يحذف — مفيش policies لـ update/delete
-- لغير الموظفين، وكل تعديلات الـ HR بتحصل بمفتاح الخدمة من Server Actions.


-- ----------------------------------------------------------------------------
--  2) contact_messages — رسائل التواصل من نموذج "اتصل بنا"
-- ----------------------------------------------------------------------------
alter table if exists public.contact_messages enable row level security;

-- الزائر يقدر يبعت رسالة بس. مفيش قراءة خالص للمتصفح — الرسائل سرية
-- وبتتقرأ من لوحة التحكم بمفتاح الخدمة فقط.
drop policy if exists "anon_can_insert_contact_messages" on public.contact_messages;
create policy "anon_can_insert_contact_messages"
  on public.contact_messages
  for insert
  to anon, authenticated
  with check (true);


-- ----------------------------------------------------------------------------
--  3) jobs — الوظائف (قراءة عامة للمتاح بس)
-- ----------------------------------------------------------------------------
alter table if exists public.jobs enable row level security;

-- الموقع الأساسي بيعرض الوظائف المتاحة. القراءة هنية للزوار.
-- (الكود الحالي بيقرا من السيرفر بمفتاح الخدمة، فده احتياطي.)
drop policy if exists "public_can_read_available_jobs" on public.jobs;
create policy "public_can_read_available_jobs"
  on public.jobs
  for select
  to anon, authenticated
  using (status = 'available');


-- ----------------------------------------------------------------------------
--  4) site_settings — إعدادات الموقع (قراءة عامة للزوار)
-- ----------------------------------------------------------------------------
alter table if exists public.site_settings enable row level security;

-- الموقع محتاج يقرا الإعدادات (واتساب، الخريطة، نص الشروط) عشان يعرضها.
drop policy if exists "public_can_read_site_settings" on public.site_settings;
create policy "public_can_read_site_settings"
  on public.site_settings
  for select
  to anon, authenticated
  using (true);


-- ----------------------------------------------------------------------------
--  5) admins / support_requests / admin_devices — سيرفر فقط
-- ----------------------------------------------------------------------------
--  التلات جداول دي **مقصود** إنها من غير أي policy للزوار:
--  RLS مفعّلة ومفيش policy → مفيش وصول من المتصفح خالص، وكل التعامل
--  بمفتاح الخدمة من السيرفر. ده الأصح أمنيًا، فمفيش حاجة تتغير هنا.
-- ----------------------------------------------------------------------------


-- ============================================================================
--  تأكيد سريع: نعرض كل الـ policies اللي اتنفذت
-- ============================================================================
select schemaname, tablename, policyname, cmd, roles
from pg_policies
where schemaname = 'public'
  and tablename in ('job_applications', 'contact_messages', 'jobs', 'site_settings')
order by tablename, policyname;
