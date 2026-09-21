-- ============================================================
--  الرحمة المهداة للتوظيف — بذور (Seed) بيانات محتوى الموقع
--  شغّل السكربت ده في Supabase → SQL Editor (Run)
-- ============================================================
--
--  🐛 سبب السكربت ده:
--  صفحة "إدارة محتوى الموقع" في اللوحة كانت بتظهر فاضية لأن صف
--  site_settings موجود لكن أعمدته فاضية (null). الموقع نفسه كان
--  بيعرض المحتوى الافتراضي المكتوب في الكود (lib/siteConfig.js)،
--  فالفرق بين "اللي اللوحة شايفاه" و"اللي الموقع بيعرضه" كان
--  بيخلّي الأدمن يكتب كل حاجة من الصفر.
--
--  السكربت ده بيملى الصف بالقيم الافتراضية **الحالية** اللي ظاهرة
--  على الموقع بالظبط، عشان فورم الـ CMS يعرضها وتعدّلها بسهولة.
--
--  ⚠️ آمن للتنفيذ أكتر من مرة، ومش بيمسح أي بيانات موجودة بالفعل:
--  كل حقل بيتكتب **بس لو قيمته الحالية فاضية (null أو "")** — يعني لو
--  الأدمن عدّل أي حقل قبل كده، القيمة بتاعته بتفضل زي ما هي.
-- ============================================================

update public.site_settings
set
  -- تشغيل/إيقاف الواتساب والخريطة (نسيبهم زي ما هما لو متغيرين؟ نضمن إنهم موجودين)
  whatsapp_enabled = coalesce(whatsapp_enabled, true),
  map_enabled      = coalesce(map_enabled, true),

  -- الواجهة الرئيسية
  hero_title       = coalesce(nullif(hero_title, ''),    'الرحمة المهداة للتوظيف'),
  hero_subtitle    = coalesce(nullif(hero_subtitle, ''), 'فرص عمل بالشركات العالمية'),
  -- فيديو الواجهة: نقصده نسيبه زي ما هو (لو فاضي الموقع بيستعمل /hero-video.webm الافتراضي)
  hero_video_url   = hero_video_url,

  -- من نحن
  about_text       = coalesce(nullif(about_text, ''), 'شركة الرحمة المهداة للتوظيف هي حلقة الوصل الموثوقة بين الكفاءات والشركات الكبرى في مصر. نسعى جاهدين لتوفير فرص عمل حقيقية ومناسبة للشباب بشكل مجاني تماماً، مع ضمان بيئة عمل آمنة ومستقرة.'),

  -- بيانات التواصل
  contact_phones   = coalesce(nullif(contact_phones, ''), '01066718722'),
  contact_email    = coalesce(nullif(contact_email, ''),  'alrahma.almohdah.recruitment@gmail.com'),
  contact_address  = coalesce(nullif(contact_address, ''), 'العاشر من رمضان، الأردنية، مول الحجاز، الدور الرابع، مكتب رقم ١٠'),

  -- السوشيال ميديا (نبدأ بكائن فاضي لو مش موجود)
  social_links     = coalesce(social_links, '{}'::jsonb),

  updated_at       = now(),
  updated_by       = coalesce(updated_by, 'seed-script')
where id = 1;

-- لو الصف نفسه مش موجود لأي سبب، ننشئه بالقيم الافتراضية كاملة
insert into public.site_settings (
  id, whatsapp_enabled, map_enabled, hero_title, hero_subtitle,
  about_text, contact_phones, contact_email, contact_address, social_links
)
values (
  1, true, true,
  'الرحمة المهداة للتوظيف',
  'فرص عمل بالشركات العالمية',
  'شركة الرحمة المهداة للتوظيف هي حلقة الوصل الموثوقة بين الكفاءات والشركات الكبرى في مصر. نسعى جاهدين لتوفير فرص عمل حقيقية ومناسبة للشباب بشكل مجاني تماماً، مع ضمان بيئة عمل آمنة ومستقرة.',
  '01066718722',
  'alrahma.almohdah.recruitment@gmail.com',
  'العاشر من رمضان، الأردنية، مول الحجاز، الدور الرابع، مكتب رقم ١٠',
  '{}'::jsonb
)
on conflict (id) do nothing;

-- تأكيد النتيجة
select id, whatsapp_enabled, map_enabled, hero_title, hero_subtitle,
       about_text, contact_phones, contact_email, contact_address, social_links
from public.site_settings
where id = 1;
