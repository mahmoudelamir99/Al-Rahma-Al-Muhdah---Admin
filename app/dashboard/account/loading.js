import { Skeleton, SkeletonPageHeader } from "@/components/Skeletons";

/** هيكل تحميل صفحة الحساب (فورم بيانات الموظف) */
export default function Loading() {
  return (
    <div className="space-y-6">
      <SkeletonPageHeader />
      <section className="glass-light rounded-3xl p-6 sm:p-7">
        <div className="grid gap-4 sm:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="h-3.5 w-28" />
              <Skeleton className="h-10 w-full" />
            </div>
          ))}
        </div>
        <Skeleton className="mt-5 h-10 w-40 rounded-xl" />
      </section>
    </div>
  );
}
