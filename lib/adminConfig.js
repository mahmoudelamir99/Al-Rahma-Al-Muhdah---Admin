/*
 * رابط الموقع الأساسي — بيتقرأ من NEXT_PUBLIC_SITE_URL عشان يشتغل على اللايف.
 * لازم يبدأ بـ NEXT_PUBLIC_ عشان يوصل للمتصفح (الزرار ده <a> في العميل).
 * لو المتغير مش مضبوط، بنرجع localhost للتطوير المحلي بس.
 */
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(/\/+$/, "");

export const ADMIN_BRAND = {
  name: "الرحمة المهداة للتوظيف",
  shortName: "الرحمة",
  panelName: "لوحة التحكم",
  siteUrl: SITE_URL,
};

/** بيانات المدير العام — بتُستخدم في العرض فقط */
export const SUPER_ADMIN_EMAIL = "mahmoudelamir9901@gmail.com";

/**
 * أقسام لوحة التحكم (Sprint 2).
 * كل قسم: مسار + عنوان + وصف قصير + أيقونة.
 */
export const NAV_ITEMS = [
  {
    href: "/dashboard",
    label: "الرئيسية",
    hint: "إحصائيات سريعة",
    icon: "grid",
  },
  {
    href: "/dashboard/cms",
    label: "إدارة محتوى الموقع",
    hint: "النصوص والفيديو والخريطة",
    icon: "layout",
  },
  {
    href: "/dashboard/jobs",
    label: "إدارة الوظائف",
    hint: "إضافة وتعديل وحذف",
    icon: "briefcase",
  },
  {
    href: "/dashboard/applications",
    label: "طلبات التوظيف",
    hint: "بيانات العمال وحالات الطلب",
    icon: "inbox",
  },
  {
    href: "/dashboard/support",
    label: "طلبات الدعم الفني",
    hint: "طلبات الموظفين",
    icon: "headset",
  },
  {
    href: "/dashboard/staff",
    label: "الموظفين والصلاحيات",
    hint: "إضافة موظفين وتحديد الصلاحيات",
    icon: "users",
  },
  {
    href: "/dashboard/account",
    label: "حسابي",
    hint: "بيانات الموظف المسجّل",
    icon: "user",
  },
];
