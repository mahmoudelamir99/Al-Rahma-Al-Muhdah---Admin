import { SkeletonListPage } from "@/components/Skeletons";

/** هيكل تحميل صفحة طلبات التوظيف */
export default function Loading() {
  return <SkeletonListPage rows={7} columns={7} />;
}
