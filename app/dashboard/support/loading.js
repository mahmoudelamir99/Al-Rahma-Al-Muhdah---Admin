import { SkeletonListPage } from "@/components/Skeletons";

/** هيكل تحميل صفحة طلبات الدعم الفني */
export default function Loading() {
  return <SkeletonListPage rows={5} columns={5} />;
}
