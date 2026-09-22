/**
 * هياكل تحميل (Loading Skeletons) للوحة التحكم.
 * ---------------------------------------------------------------------------
 * السبب: اللوحة بتقرا من Supabase، وأحياناً السيرفر بيعمل Cold Start فالصفحة
 * بتاخد كام ثانية وشاشة تفضل بيضا. الـ loading.js في الـ App Router بيظهر
 * دي فوراً بمجرد التنقّل، فالمستخدم يشوف الهيكل في اللحظة بدل الشاشة الفاضية.
 *
 * تصميم: بنقلّد شكل المحتوى الحقيقي (ترويسة + كروت / جدول) عشان الانتقال
 * من الهيكل للمحتوى يبقى ناعم ومش مفاجئ. الأنيميشن نبضة لطيفة (بulse).
 */

/* بلوك واحد رمادي بنبضه — الوحدة الأساسية اللي كل الهياكل بتبنى منها */
export function Skeleton({ className = "" }) {
  return <div className={`animate-pulse rounded-xl bg-brand-900/10 ${className}`} />;
}

/* ترويسة القسم (المربع اللي فيه الأيقونة + العنوان + الوصف) */
export function SkeletonPageHeader() {
  return (
    <section className="glass-light rounded-3xl p-6 sm:p-7">
      <div className="flex items-start gap-4">
        <Skeleton className="h-12 w-12 shrink-0 rounded-2xl" />
        <div className="min-w-0 flex-1 space-y-3">
          <Skeleton className="h-5 w-48 max-w-full" />
          <Skeleton className="h-3.5 w-full max-w-[34rem]" />
          <Skeleton className="h-3.5 w-3/4 max-w-[26rem]" />
        </div>
      </div>
    </section>
  );
}

/* شريط بحث + شرايح فلترة */
export function SkeletonToolbar() {
  return (
    <div className="glass-light rounded-3xl p-4 sm:p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <Skeleton className="h-11 flex-1" />
        <Skeleton className="h-11 w-full sm:w-56" />
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        {[1, 2, 3, 4, 5].map((i) => (
          <Skeleton key={i} className="h-8 w-24 rounded-full" />
        ))}
      </div>
    </div>
  );
}

/* جدول وهمي — لصفحات الطلبات والأرشيف والموظفين */
export function SkeletonTable({ rows = 6, columns = 6 }) {
  return (
    <div className="overflow-hidden rounded-3xl glass-light">
      <div className="border-b border-surface-400 bg-surface-300/60 px-4 py-3">
        <div className="flex gap-4">
          {Array.from({ length: columns }).map((_, i) => (
            <Skeleton key={i} className="h-3.5 flex-1" />
          ))}
        </div>
      </div>
      <div className="divide-y divide-surface-400/60">
        {Array.from({ length: rows }).map((_, r) => (
          <div key={r} className="flex items-center gap-4 px-4 py-4">
            <Skeleton className="h-9 w-9 shrink-0 rounded-full" />
            {Array.from({ length: columns - 1 }).map((_, c) => (
              <Skeleton key={c} className="h-3.5 flex-1" />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

/* شبكة كروت — للرئيسية والقسم CMS وإدارة الوظائف */
export function SkeletonCards({ count = 4, height = "h-32" }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="glass-light rounded-2xl p-5">
          <Skeleton className="h-10 w-10 rounded-2xl" />
          <Skeleton className="mt-4 h-4 w-2/3" />
          <Skeleton className={`mt-3 w-full ${height}`} />
        </div>
      ))}
    </div>
  );
}

/* هيكل صفحة كامل: ترويسة + أداة + جدول (الأكثر استخداماً) */
export function SkeletonListPage({ withToolbar = true, rows = 6, columns = 6 }) {
  return (
    <div className="space-y-6">
      <SkeletonPageHeader />
      {withToolbar && <SkeletonToolbar />}
      <SkeletonTable rows={rows} columns={columns} />
    </div>
  );
}
