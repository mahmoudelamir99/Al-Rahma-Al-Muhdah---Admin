import Link from "next/link";
import { NAV_ITEMS } from "@/lib/adminConfig";
import { NavIcon, IconGrid } from "@/components/icons";
import { getJobsStats } from "@/lib/jobs";
import { getCurrentAdminContext } from "@/lib/rbac";
import { PERMISSION_LABELS } from "@/lib/rbacConfig";

/*
 * 🛑 الصفحة دي **خاصة بكل مستخدم** — بتقرأ اسم الموظف وإيميله وصلاحياته من
 * الجلسة. قبل كده كانت `revalidate = 30` (كاش ثابت)، وده كان بيخلّي Next
 * يخزّن الرد الأول ويقدّمه لكل الموظفين — فكان أي موظف يشوف بيانات اللي قبله
 * (وده اللي كان بيعرض بياناتي أنا لِكل الناس).
 *
 * عشان كده بنخرّجها من الكاش تمامًا. الإحصائيات جوّاها بتتحمّل بسرعة
 * (استعلام أرقام بس) وبنحمّلها بس لِمن عنده صلاحية وظائف. أداء Not secachable
 * هنا ضرورته صحيحة: الخصوصية أهم من كاش بعلّي المعنى.
 */
export const dynamic = "force-dynamic";
export const revalidate = 0;

// كل الأقسام ما عدا الرئيسية نفسها (دي الصفحة اللي إحنا فيها)
const CARDS = NAV_ITEMS.filter((item) => item.href !== "/dashboard");

/**
 * ⚡ الأداء: الصياغة اللي كانت هنا كانت بتضيّع وقت كبير.
 *  - بنجيب سياق الموظف (الاسم/الإيميل/الصلاحيات) من السيرفر مرة واحدة.
 *  - بنحسب اسم العرض + الصلاحية من نفس بيانات الجلسة، مفيش أي بيانات ثابتة.
 */
function displayRole(context) {
  if (context.isSuperAdmin) return "مدير عام (Super Admin)";
  return "موظف";
}

/** هل الموظف عنده صلاحية عرض على قسم معيّن؟ */
function canView(admin, isSuperAdmin, section) {
  return isSuperAdmin || admin?.permissions?.[section]?.view === true;
}

/** وصف صلاحيات الموظف: الأقسام اللي عنده صلاحية عرض عليها */
function allowedSectionLabels(admin, isSuperAdmin) {
  if (isSuperAdmin) return PERMISSION_LABELS;
  const labels = [];
  for (const [key, label] of Object.entries(PERMISSION_LABELS)) {
    if (admin?.permissions?.[key]?.view === true) labels.push(label);
  }
  return labels;
}

export default async function DashboardPage() {
  // بيانات الموظف الفعلي المسجّل دخول — من الجلسة، مش ثابتة في الكود
  const context = await getCurrentAdminContext();
  const admin = context.ok ? context.admin : null;
  const displayName = (admin?.display_name || context.user?.email || "").trim();
  const email = context.user?.email || "—";
  const roleLabel = displayRole(context);
  const sectionLabels = allowedSectionLabels(admin, context.isSuperAdmin);

  /*
   * الأقسام المعروضة ككروت: الموظف يشوف بس الأقسام اللي ليه صلاحية عرض
   * عليها. المدير العام يشوف الكل. الرئيسية مستبعدة لأنها الصفحة الحالية.
   */
  const cards = CARDS.filter((item) =>
    canView(admin, context.isSuperAdmin, item.href.replace("/dashboard/", ""))
  );

  /*
   * إحصائيات الوظائف: بنحمّلها بس لو الموظف عنده صلاحية وظائف (أو مدير عام)،
   * ولو الجدول لسه مش موجود بترجّع أصفار من غير ما تكسر الصفحة.
   */
  const showStats = canView(admin, context.isSuperAdmin, "jobs");
  let stats = { total: 0, available: 0, closed: 0, requiredTotal: 0, applicantsTotal: 0 };
  if (showStats) {
    try {
      stats = await getJobsStats();
    } catch {
      // نتجاهل — الصفحة تفضل شغالة
    }
  }

  const STAT_CARDS = [
    { label: "إجمالي الوظائف", value: stats.total },
    { label: "وظائف متاحة", value: stats.available },
    { label: "وظائف مغلقة", value: stats.closed },
    { label: "إجمالي المطلوب", value: stats.requiredTotal },
    { label: "إجمالي المتقدمين", value: stats.applicantsTotal },
  ];

  return (
    <div className="space-y-6">
      {/* ترحيب */}
      <section className="glass-light rounded-3xl p-6 sm:p-7">
        <p className="flex items-center gap-2 text-[12px] font-bold text-gold-600">
          <IconGrid className="h-4 w-4" />
          نظرة عامة
        </p>
          <h1 className="mt-3 text-xl font-extrabold leading-snug text-brand-900 sm:text-2xl">
            أهلاً بيك يا <span className="text-gradient-gold">{displayName || "—"}</span>
          </h1>

          <div className="divider-gold my-5" />

          <dl className="grid gap-4 sm:grid-cols-2">
            <div>
              <dt className="text-[11.5px] font-bold uppercase tracking-wider text-brand-900/60">
                الحساب المسجّل
              </dt>
              <dd className="mt-1 text-[14px] font-bold text-brand-900" dir="ltr">
                {email}
              </dd>
            </div>
            <div>
              <dt className="text-[11.5px] font-bold uppercase tracking-wider text-brand-900/60">
                الصلاحية
              </dt>
              <dd className="mt-1 text-[14px] font-bold text-copper-600">{roleLabel}</dd>
            </div>
          </dl>

          {!context.isSuperAdmin && (
            <div className="mt-4">
              <dt className="text-[11.5px] font-bold uppercase tracking-wider text-brand-900/60">
                الأقسام المتاحة ليك
              </dt>
              <dd className="mt-1.5 flex-wrap gap-1.5">
                {sectionLabels.length > 0 ? (
                  sectionLabels.map((label) => (
                    <span
                      key={label}
                      className="rounded-full bg-brand-50 px-2.5 py-1 text-[12px] font-bold text-brand-800"
                    >
                      {label}
                    </span>
                  ))
                ) : (
                  <span className="text-[13px] font-semibold text-brand-900/60">
                    مفيش صلاحيات ممنوحة ليك — راجع الإدارة.
                  </span>
                )}
              </dd>
            </div>
          )}
        </section>

      {/* إحصائيات سريعة — للموظفين أصحاب صلاحية الوظائف بس */}
      {showStats && (
        <section className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-5">
          {STAT_CARDS.map(({ label, value }) => (
            <div key={label} className="glass-light rounded-3xl p-5">
              <p className="text-[12px] font-bold uppercase tracking-wider text-brand-900/60">
                {label}
              </p>
              <p className="mt-2 text-[1.6rem] font-extrabold leading-none text-brand-900">{value}</p>
            </div>
          ))}
        </section>
      )}

      {/* أقسام اللوحة — بتتعرض حسب صلاحيات الموظف */}
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {cards.map(({ href, label, hint, icon }) => (
          <Link
            key={href}
            href={href}
            className="group glass-light flex items-start gap-4 rounded-3xl p-5 transition-shadow duration-150 ease-out hover:shadow-card focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40"
          >
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-brand-50 text-brand-700 transition-colors duration-150 group-hover:bg-brand-600 group-hover:text-white">
              <NavIcon name={icon} className="h-5 w-5" />
            </span>
            <span className="min-w-0">
              <span className="block text-[15px] font-extrabold text-brand-900">{label}</span>
              <span className="mt-1 block text-[13px] font-semibold leading-relaxed text-brand-900/70">
                {hint}
              </span>
            </span>
          </Link>
        ))}
      </section>
    </div>
  );
}
