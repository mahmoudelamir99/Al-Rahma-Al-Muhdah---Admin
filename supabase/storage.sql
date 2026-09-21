-- ============================================================================
--  Supabase Storage — Bucket الملفات (صور الموظفين + فيديو الواجهة + لوجوهات)
--  شغّل السكربت ده في Supabase → SQL Editor (Run)
-- ============================================================================
--
--  الفكرة:
--  اللوحة بترفع الملفات مباشرة على Supabase Storage من غير ما نحتاج حقول
--  "رابط الصورة/رابط الفيديو" اليدوية. الرفع بيتعمل من Server Action بمفتاح
--  الخدمة (service_role) اللي بيتجاوز RLS، فمفيش أي كتابة من المتصفح خالص.
--
--  الـ Bucket اسمه `media` و**عام للقراءة** (public) — لأن صور الموظفين وفيديو
--  الواجهة بيظهروا على الموقع الأساسي للزوار، فلازم تكون روابطهم مباشرة.
--
--  ⚠️ ملاحظة أمنية: القراءة العامة مخصصة للملفات دي بس. الكتابة ممنوعة تماماً
--  من المتصفح (مفيش insert/update/delete policy للزوار) — كل الرفع من السيرفر.
-- ============================================================================

-- 1) إنشاء الـ Bucket (لو موجود بيتحدّث بدل ما يكرر)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'media',
  'media',
  true,
  52428800, -- 50 ميجا كحد أقصى للملف الواحد (كفاية لفيديو)
  array[
    'image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/svg+xml', 'image/gif',
    'video/mp4', 'video/webm', 'video/ogg', 'video/quicktime'
  ]
)
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;


-- 2) سياسة القراءة العامة — أي زائر يقدر يشوف الملفات (لأن الـ bucket عام)
drop policy if exists "public_read_media" on storage.objects;
create policy "public_read_media"
  on storage.objects
  for select
  to anon, authenticated
  using (bucket_id = 'media');


-- ============================================================================
--  خلاص. بعد التشغيل، اللوحة تقدر ترفع الملفات على bucket اسمه `media`.
-- ============================================================================

-- تأكيد سريع
select id, name, public, file_size_limit from storage.buckets where id = 'media';
