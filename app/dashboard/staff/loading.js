import { SkeletonListPage } from "@/components/Skeletons";

/** هيكل تحميل صفحة الموظفين والصلاحيات */
export default function Loading() {
  return <SkeletonListPage rows={5} columns={5} />;
}
