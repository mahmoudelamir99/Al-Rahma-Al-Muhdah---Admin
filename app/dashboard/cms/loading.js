import { Skeleton, SkeletonPageHeader } from "@/components/Skeletons";

/** هيكل تحميل صفحة إدارة محتوى الموقع (فورم طويل بمجموعات حقول) */
export default function Loading() {
  return (
    <div className="space-y-6">
      <SkeletonPageHeader />

      {/* مجموعة الحقول — بنقلّد الشكل: توجّلز + حقول نصية + منطقة نص كبيرة */}
      <section className="glass-light rounded-3xl p-6 sm:p-7">
        <div className="grid gap-4 sm:grid-cols-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="h-3.5 w-32" />
              <Skeleton className="h-10 w-full" />
            </div>
          ))}
        </div>
        <Skeleton className="mt-4 h-28 w-full" />
      </section>
    </div>
  );
}
