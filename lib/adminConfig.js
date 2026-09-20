export const ADMIN_BRAND = {
  name: "الرحمة المهداة للتوظيف",
  shortName: "الرحمة",
  panelName: "لوحة التحكم",
  siteUrl: "http://localhost:3000",
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
