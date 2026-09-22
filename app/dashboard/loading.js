import { SkeletonPageHeader, SkeletonCards } from "@/components/Skeletons";

/**
 * هيكل تحميل صفحة الرئيسية — بيتعرض فوراً لحد ما الإحصائيات تيجي من Supabase.
 * (الصفحة force-dynamic، فمفيش كاش — الـ skeleton هو اللي بيمنع الشاشة البيضا.)
 */
export default function Loading() {
  return (
    <div className="space-y-6">
      <SkeletonPageHeader />
      <SkeletonCards count={3} height="h-20" />
      <SkeletonCards count={6} height="h-24" />
    </div>
  );
}
