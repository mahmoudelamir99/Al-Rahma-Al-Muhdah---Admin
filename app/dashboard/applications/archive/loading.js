import { SkeletonListPage } from "@/components/Skeletons";

/** هيكل تحميل صفحة أرشيف الطلبات */
export default function Loading() {
  return <SkeletonListPage rows={6} columns={7} />;
}
