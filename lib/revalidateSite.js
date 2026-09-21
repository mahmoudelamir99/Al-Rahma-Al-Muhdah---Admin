/**
 * تزامن فوري بين لوحة التحكم (بورت 3001) والموقع الأساسي (بورت 3000).
 * ---------------------------------------------------------------------------
 * المشروعين منفصلين، فـ `revalidatePath` جوه اللوحة بيفضّي كاش اللوحة بس ومش
 * بيأثر على الموقع خالص. عشان تعديلات الوظائف أو محتوى الموقع (CMS) تظهر
 * للزوار فورًا، اللوحة بتنادي الـ webhook بتاع الموقع بعد أي حفظ.
 *
 * 🐛 سبب مشكلة "الوظائف مش بتسمع / الواتساب مش بيختفي":
 * الـ Webhook كان بيروح على `NEXT_PUBLIC_SITE_URL`، والمتغير ده مكان مضبوط
 * في `.env.local`، فكان بيرجع افتراضيًا لـ `http://localhost:3000` — وده
 * شغال محليًا وبس. على الإنتاج (Vercel) الرابط ده غلط، فالطلب بيفشل في
 * صمت (كان الفشل بيتجاهل بدون أي لوج)، والتعديل ما كان بيظهرش على الموقع
 * غير بعد ما مدة الكاش (30 ثانية) تخلص.
 *
 * الحل هنا مركزي وواضح:
 *  1) مكان واحد بس بيحسب رابط الموقع (مش 3 نسخ متكررة).
 *  2) لو الرابط مش مضبوط أو الطلب فشل → بنسجّل لوج واضح بدل التجاهل الصامت.
 */

const RAW_SITE_URL = (
  process.env.SITE_REVALIDATE_URL ||
  process.env.NEXT_PUBLIC_SITE_URL ||
  ""
).trim();

export const SITE_WEBHOOK_URL = RAW_SITE_URL.replace(/\/+$/, "");
const REVALIDATE_SECRET = (process.env.SITE_REVALIDATE_SECRET || "").trim();

/**
 * بنبلّغ الموقع الأساسي بمسار معيّن عشان يفشّل كاشه.
 * - لو الرابط مش مضبوط، بنسجّل تحذير وبنرجع بدل ما نعمل طلب على localhost
 *   بالغلط في الإنتاج.
 * - أي فشل شبكة أو رد مش ناجح بيتسجل بلوج — عشان لو التزامن وقع يبان السبب
 *   فورًا في لوجات Vercel بدل ما يفضل مستخبي.
 */
export async function revalidateSite(endpoint) {
  if (!SITE_WEBHOOK_URL) {
    console.warn(
      "[revalidateSite] NEXT_PUBLIC_SITE_URL أو SITE_REVALIDATE_URL مش مضبوط — مفيش إشعار للموقع بالكاش. حدّده في .env.local وفي إعدادات Vercel."
    );
    return { ok: false, skipped: true };
  }

  try {
    const response = await fetch(`${SITE_WEBHOOK_URL}${endpoint}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(REVALIDATE_SECRET ? { "x-revalidate-secret": REVALIDATE_SECRET } : {}),
      },
      // مهم: من غير cache، ولازم ما يعلّقش اللوحة لو الموقع واقف
      cache: "no-store",
      signal: AbortSignal.timeout(3000),
    });

    if (!response.ok) {
      console.warn(
        `[revalidateSite] الموقع رجّع ${response.status} لـ ${endpoint} — التعديل هيظهر بعد انتهاء الكاش كحد أقصى.`
      );
      return { ok: false, status: response.status };
    }

    return { ok: true };
  } catch (error) {
    // الموقع مش شغال أو الرابط غلط — بنسجّل ونكمل، مشكلة تكسر اللوحة
    console.warn(
      `[revalidateSite] تعذّر الوصول للموقع (${SITE_WEBHOOK_URL}): ${error?.message || error}`
    );
    return { ok: false, error: String(error?.message || error) };
  }
}

/** وظائف/طلبات → بتأثر على الصفحة الرئيسية وصفحة الوظائف */
export function revalidateJobsOnSite() {
  return revalidateSite("/api/revalidate-jobs");
}

/** إعدادات CMS → بتأثر على الرئيسية وصفحة الشروط */
export function revalidateSettingsOnSite() {
  return revalidateSite("/api/revalidate-settings");
}
