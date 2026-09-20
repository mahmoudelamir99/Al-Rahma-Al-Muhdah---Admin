/**
 * قالب موحّد لقسم لسه ما اتنفذش.
 * كل قسم بيستدعي القالب ده بالمحتوى بتاعه، فالملف بيفضل قصير وواضح.
 */
export default function SectionPlaceholder({ title, description, Icon, points = [] }) {
  return (
    <div className="space-y-6">
      <section className="glass-light rounded-3xl p-6 sm:p-8">
        <div className="flex items-start gap-4">
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-brand-50 text-brand-700">
            <Icon className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <h1 className="text-lg font-extrabold text-brand-900 sm:text-xl">{title}</h1>
            <p className="mt-2 max-w-[42rem] text-[14px] font-semibold leading-relaxed text-brand-900/75">
              {description}
            </p>
          </div>
        </div>

        {points.length > 0 && (
          <>
            <div className="divider-soft my-6" />
            <ul className="grid gap-2.5 sm:grid-cols-2">
              {points.map((point) => (
                <li
                  key={point}
                  className="flex items-start gap-2.5 rounded-2xl bg-surface-300/70 px-3.5 py-3 text-[13.5px] font-semibold text-brand-900/85"
                >
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-copper-500" />
                  {point}
                </li>
              ))}
            </ul>
          </>
        )}
      </section>
    </div>
  );
}
