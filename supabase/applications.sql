-- ============================================================
--  الرحمة المهداة للتوظيف — Sprint 3 : إدارة طلبات التوظيف
--  شغّل السكربت ده في Supabase → SQL Editor (Run)
-- ============================================================
--
--  الهدف: تمكين فريق الـ HR من تسجيل ملاحظات على الطلب، بحيث
--  العامل يشوفها فوراً في ميزة "تتبع الطلب" على الموقع الأساسي.
--  السكربت آمن ويتشغّل أكتر من مرة (كل الأوامر if not exists).
-- ============================================================

-- ------------------------------------------------------------
--  1) ملاحظات الـ HR
--     نص حر بيكتب فيه المسؤول سبب الرفض أو الورق الناقص.
--     بيظهر للعامل في صفحة تتبع الطلب مباشرة.
-- ------------------------------------------------------------
alter table public.job_applications
  add column if not exists hr_notes text;

comment on column public.job_applications.hr_notes is
  'ملاحظات فريق الموارد البشرية — بتظهر للعامل في صفحة تتبع الطلب';


-- ------------------------------------------------------------
--  2) اسم المسؤول اللي غيّر الحالة + وقت التغيير
--     مفيدة للمراجعة الداخلية (مين قبل/رفض الطلب وامتى).
--     العميل ما طلبهاش صراحةً، بس هي ضرورية لأي نظام HR حقي،
--     وبتتسجل تلقائياً من اللوحة مش يدوياً.
-- ------------------------------------------------------------
alter table public.job_applications
  add column if not exists reviewed_by text;

alter table public.job_applications
  add column if not exists reviewed_at timestamptz;

comment on column public.job_applications.reviewed_by is
  'إيميل المسؤول اللي غيّر حالة الطلب آخر مرة';

comment on column public.job_applications.reviewed_at is
  'وقت آخر تغيير على حالة الطلب';


-- ------------------------------------------------------------
--  3) توحيد قيد الحالات (Status Constraint)
--     لو الجدول فيه قيد على عمود status، بنشيله ونضيف واحد
--     بيدعم كل الحالات الأربع المطلوبة + ملغي للتوافق مع
--     زر "إلغاء الطلب" الموجود في صفحة تتبع الطلب.
-- ------------------------------------------------------------
alter table public.job_applications
  drop constraint if exists job_applications_status_check;

alter table public.job_applications
  add constraint job_applications_status_check
  check (
    status in (
      'pending',      -- جديد / في انتظار المراجعة
      'reviewed',     -- قيد المراجعة
      'accepted',     -- مقبول
      'rejected',     -- مرفوض
      'needs_info',   -- مطلوب استكمال بيانات
      'cancelled'     -- ملغي (من العامل نفسه)
    )
  );


-- ------------------------------------------------------------
--  4) حقول الاستكمال المطلوبة من العامل
--     array من أسماء الحقول اللي الـ HR علّم عليها إن فيها مشكلة.
--     العامل في صفحة "تتبع الطلب" بيلاقي الفورم متجمّد ما عدا الحقول
--     دي — هي بس اللي بيفتحها ويعدّلها ويعيد الإرسال.
--
--     العمود موجود أصلاً في الجدول (text[]) من Sprint سابق، فاللي هنا
--     تأكيد + قيمة افتراضية صح لو حد أنشأ الجدول من غيرها.
-- ------------------------------------------------------------
alter table public.job_applications
  add column if not exists completion_fields text[] not null default '{}';

comment on column public.job_applications.completion_fields is
  'أسماء حقول الفورم اللي الـ HR طلب من العامل استكمالها (بيتفتح للعامل بس)';

-- ------------------------------------------------------------
--  6) نظام الأرشيف (Soft Delete)
--     الحذف بقى "ناعم": بنسجّل وقت الحذف ومين اللي حذف بدل ما الصف
--     يتمسح نهائي، فالبيانات تفضل محفوظة في "الأرشيف" ويقدر المدير
--     العام يستعيدها أو يحذفها نهائيًا.
--     مفتاح التوافق: deleted_at = null يعني الطلب في القائمة الرئيسية.
-- ------------------------------------------------------------
alter table public.job_applications
  add column if not exists deleted_at timestamptz;

alter table public.job_applications
  add column if not exists deleted_by text;

comment on column public.job_applications.deleted_at is
  'وقت حذف الطلب ناعماً (null = موجود في القائمة الرئيسية، مش null = في الأرشيف)';

comment on column public.job_applications.deleted_by is
  'إيميل الموظف اللي حذف الطلب — بيظهر في الأرشيف للمراجعة';


-- ------------------------------------------------------------
--  5) فهارس
-- ------------------------------------------------------------
create index if not exists job_applications_status_idx
  on public.job_applications (status);

create index if not exists job_applications_national_id_idx
  on public.job_applications (national_id);

-- فهرس للأرشيف: بنفلتر على deleted_at كثير (القائمة الرئيسية والأرشيف)
create index if not exists job_applications_deleted_at_idx
  on public.job_applications (deleted_at);


-- ============================================================
--  خلاص. بعد التشغيل، اللوحة هتقدر تحفظ الحالة والملاحظات،
--  والموقع هيعرضهم للعامل فوراً في "تتبع الطلب".
-- ============================================================
