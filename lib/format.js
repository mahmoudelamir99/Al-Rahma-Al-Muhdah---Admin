/**
 * تنسيق التواريخ والأرقام بشكل ثابت (Deterministic) — بيتنادى من السيرفر والعميل
 * وبيطلع نفس النص بالحرف في الحالتين.
 *
 * 🐛 المشكلة اللي الملف ده بيحلها (Hydration Mismatch):
 * `new Intl.DateTimeFormat("ar-EG", ...)` و `toLocaleDateString` بتعتمد على
 * توقيت الجهاز وبيانات الـ ICU المتاحة. السيرفر (Node على Vercel عادةً UTC)
 * والمتصفح (توقيت المستخدم) بيطلعوا نصين مختلفين لنفس التاريخ، فـ React
 * بيلاقي الـ HTML الجاي من السيرفر مش مطابق للي المفروض يتعمله render →
 * "Client-side exception" أو تحذير hydration.
 *
 * الحل: إحنا بنبني النص بإيدينا من مكونات التاريخ (year/month/day) — من غير أي
 * Intl ومن غير أي اعتماد على توقيت الجهاز. نفس النتيجة في أي بيئة.
 *
 * كمان بنقرأ التواريخ بـ UTC (getUTC*) عشان لو السيرفر على UTC والمتصفح على
 * توقيت مصر (+2) والنص اتولد 11 مساءً، الفرق ده كان بيخلي اليوم يختلف.
 */

const ARABIC_MONTHS = [
  "يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو",
  "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر",
];

/** نحول أي قيمة لقيمة تاريخ صحيحة، أو null لو غير قابلة للقراءة */
function toValidDate(value) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

/**
 * "15 مارس 2026" — تاريخ بس (من غير وقت)، بتوقيت مصر.
 * مهم: بنحوّل لتوقيت مصر قبل ما ناخد اليوم، عشان طلب اتقدّم 1 صباحًا
 * بتوقيت مصر (= 22:00 UTC اليوم اللي قبله) يظهر بالتاريخ الصح مش بيوم فايت.
 * الحساب ثابت في السيرفر والمتصفح — مفيش hydration mismatch.
 */
export function formatDate(value) {
  const date = toValidDate(value);
  if (!date) return "—";
  const shifted = new Date(date.getTime() + cairoOffsetHours(date) * 60 * 60 * 1000);
  return `${shifted.getUTCDate()} ${ARABIC_MONTHS[shifted.getUTCMonth()]} ${shifted.getUTCFullYear()}`;
}

/**
 * مصر بتغيّر التوقيت مرتين في السنة (توقيت صيفي من آخر جمعة في أبريل).
 * القاعدة اللي بنشتغل عليها: من أول جمعة في أبريل للساعة الأخيرة من أكتوبر → +3،
 * وباقي السنة → +2. الحساب ده ثابت (Deterministic) يعني نفس النتيجة بالحرف
 * في السيرفر والمتصفح — وده اللي بيمنع الـ hydration mismatch.
 *
 * ملاحظة: بنقرأ التاريخ نفسه (بـ UTC) مش توقيت الجهاز، فمينفعش يكون فيه اختلاف.
 */
function cairoOffsetHours(date) {
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth(); // 0 = يناير
  // بره فترة التوقيت الصيفي (نوفمبر–مارس) → +2 ثابت
  if (month < 3 || month > 9) return 2;
  // بره فترة التوقيت الصيفي (أبريل–سبتمبر) → +3 ثابت
  if (month > 3 && month < 9) return 3;

  // أبريل وأكتوبر — بنحسب معادلة "الجمعة الأولى" المصرية
  const lastDay = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  let firstFriday = null;
  for (let day = 1; day <= 7; day += 1) {
    if (new Date(Date.UTC(year, month, day)).getUTCDay() === 5) {
      firstFriday = day;
      break;
    }
  }
  const dayOfMonth = date.getUTCDate();

  // April: +3 بيبدأ من أول جمعة، قبلها +2
  if (month === 3) return dayOfMonth >= firstFriday ? 3 : 2;

  // October: +3 بينتهي آخر يوم خميس، يعني من يوم الجمعة الأخيرة ببقى +2
  const lastFriday = Math.max(1, lastDay - ((new Date(Date.UTC(year, month, lastDay)).getUTCDay() + 2) % 7));
  return dayOfMonth < lastFriday ? 3 : 2;
}

/**
 * "15 مارس 2026، 14:30" — بتوقيت مصر (UTC+2 أو +3 حسب التوقيت الصيفي).
 * الحساب ثابت فالنتيجة واحدة في السيرفر والمتصفح (مفيش hydration mismatch).
 */
export function formatDateTime(value) {
  const date = toValidDate(value);
  if (!date) return "—";

  // بنزود فرق توقيت مصر يدويًا على قيم UTC — من غير أي اعتماد على توقيت الجهاز
  const shifted = new Date(date.getTime() + cairoOffsetHours(date) * 60 * 60 * 1000);

  const hh = String(shifted.getUTCHours()).padStart(2, "0");
  const mm = String(shifted.getUTCMinutes()).padStart(2, "0");

  return `${formatDate(shifted)}، ${hh}:${mm}`;
}

/**
 * "8,000" — فاصلة الآلاف بشكل ثابت من غير Intl.
 * (Number.prototype.toLocaleString بياخد نتيجة مختلفة حسب الـ locale أحيانًا)
 */
export function formatNumber(value) {
  if (value === null || value === undefined || value === "") return "";
  const n = Number(value);
  if (!Number.isFinite(n)) return "";
  const negative = n < 0;
  const [whole, fraction] = Math.abs(n).toString().split(".");
  const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return `${negative ? "-" : ""}${grouped}${fraction ? `.${fraction}` : ""}`;
}
