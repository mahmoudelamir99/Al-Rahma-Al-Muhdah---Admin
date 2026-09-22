import { SkeletonListPage } from "@/components/Skeletons";

/** هيكل تحميل صفحة رسائل الزوار */
export default function Loading() {
  return <SkeletonListPage rows={6} columns={7} />;
}
