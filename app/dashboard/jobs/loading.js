import { SkeletonPageHeader, SkeletonToolbar, SkeletonTable } from "@/components/Skeletons";

/** هيكل تحميل صفحة إدارة الوظائف */
export default function Loading() {
  return (
    <div className="space-y-6">
      <SkeletonPageHeader />
      <SkeletonToolbar />
      <SkeletonTable rows={5} columns={6} />
    </div>
  );
}
