export const PERMISSION_KEYS = ["jobs", "applications", "cms", "support", "staff"];
export const ACTION_KEYS = ["view", "create", "update", "delete"];
export const ACTION_LABELS = { view: "عرض", create: "إضافة", update: "تعديل", delete: "حذف" };
export const PERMISSION_LABELS = {
  jobs: "إدارة الوظائف",
  applications: "طلبات التوظيف",
  cms: "إدارة محتوى الموقع",
  support: "طلبات الدعم الفني",
  staff: "الموظفين والصلاحيات",
};
export const EMPTY_PERMISSIONS = Object.fromEntries(
  PERMISSION_KEYS.map((section) => [section, Object.fromEntries(ACTION_KEYS.map((action) => [action, false]))])
);
export const ALL_PERMISSIONS = Object.fromEntries(
  PERMISSION_KEYS.map((section) => [section, Object.fromEntries(ACTION_KEYS.map((action) => [action, true]))])
);

export function normalizePermissions(value) {
  return Object.fromEntries(PERMISSION_KEYS.map((section) => {
    const source = value?.[section];
    if (source === true) return [section, Object.fromEntries(ACTION_KEYS.map((action) => [action, true]))];
    return [section, Object.fromEntries(ACTION_KEYS.map((action) => [action, source?.[action] === true]))];
  }));
}
export const PATH_PERMISSIONS = {
  "/dashboard/jobs": "jobs",
  "/dashboard/applications": "applications",
  "/dashboard/cms": "cms",
  "/dashboard/support": "support",
  "/dashboard/staff": "staff",
};
export function permissionForPath(pathname) {
  return Object.entries(PATH_PERMISSIONS).find(([path]) => pathname === path || pathname.startsWith(`${path}/`))?.[1] || null;
}
