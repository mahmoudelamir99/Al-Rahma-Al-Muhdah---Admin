"use client";

import { useRef, useState } from "react";
import { uploadMedia } from "@/lib/actions/upload";
import { IconLoader } from "@/components/icons";

/* ==========================================================================
   زر رفع ملف (صورة/فيديو) — بديل حقول "رابط الصورة" اليدوية.
   --------------------------------------------------------------------------
   - بياخد الملف ويبعته للـ Server Action اللي يرفعه على Supabase Storage.
   - بيرجّع الرابط الناتج للفورم عن طريق onChange.
   - بيعرض Preview للصورة المختارة (أو اسم الفيديو) مع إمكانية الحذف/الاستبدال.
   ========================================================================== */

/** أيقونة سحابة/رفع خفيفة بدون مكتبة خارجية */
function IconUpload({ className = "" }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path d="M12 16V5m0 0L7.5 9.5M12 5l4.5 4.5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M4.5 15v2.5a2 2 0 002 2h11a2 2 0 002-2V15" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  );
}

function IconTrash({ className = "" }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path d="M5 7h14M10 7V5.5a1.5 1.5 0 011.5-1.5h1A1.5 1.5 0 0114 5.5V7m-8 0l.8 12a2 2 0 002 1.9h6.4a2 2 0 002-1.9L17 7" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/**
 * @param {string} value — الرابط الحالي (لو موجود)
 * @param {(url: string) => void} onChange — بيتنادى بالرابط الجديد (أو "" عند الحذف)
 * @param {string} folder — مجلد الرفع على التخزين (avatars/hero/logos/cms)
 * @param {"image" | "video" | "any"} kind — نوع المعاينة + accept الافتراضي
 * @param {string} hint — نص توضيحي إضافي
 */
export default function FileUpload({
  value = "",
  onChange,
  folder = "cms",
  kind = "image",
  hint = "",
  disabled = false,
}) {
  const inputRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  const accept =
    kind === "video"
      ? "video/mp4,video/webm,video/ogg,video/quicktime"
      : kind === "image"
        ? "image/png,image/jpeg,image/webp,image/gif,image/svg+xml"
        : "image/png,image/jpeg,image/webp,image/gif,image/svg+xml,video/mp4,video/webm,video/ogg";

  async function handlePick(event) {
    const file = event.target.files?.[0];
    // بنصفّر قيمة الحقل عشان اختيار نفس الملف تاني يشتغل
    event.target.value = "";
    if (!file) return;

    setError("");
    setUploading(true);
    try {
      const data = new FormData();
      data.append("file", file);
      data.append("folder", folder);
      const result = await uploadMedia(data);
      if (!result?.ok) {
        setError(result?.error || "تعذّر رفع الملف.");
        return;
      }
      onChange?.(result.url);
    } catch {
      setError("تعذّر الاتصال بالسيرفر أثناء الرفع.");
    } finally {
      setUploading(false);
    }
  }

  const hasValue = Boolean(value);
  const isVideo = kind === "video" || /\.(mp4|webm|ogv|mov)(\?|$)/i.test(value);

  return (
    <div>
      {/* العرض الحالي */}
      {hasValue && (
        <div className="mb-2 flex items-center gap-3 rounded-2xl border-surface-400 bg-surface-300/60 p-2.5">
          {isVideo ? (
            <video
              src={value}
              className="h-14 w-24 shrink-0 rounded-xl bg-black/80 object-cover"
              muted
              playsInline
              preload="metadata"
            />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={value}
              alt="معاينة الملف المرفوع"
              className="h-14 w-14 shrink-0 rounded-xl bg-white object-cover ring-1 ring-surface-400"
            />
          )}
          <div className="min-w-0 flex-1">
            <p className="text-[12px] font-bold text-brand-900/70">تم الرفع بنجاح</p>
            <p className="truncate text-[11.5px] font-semibold text-brand-900/55" dir="ltr">
              {value}
            </p>
          </div>
          <button
            type="button"
            onClick={() => onChange?.("")}
            disabled={disabled || uploading}
            aria-label="حذف الملف المرفوع"
            className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-rose-50 text-rose-700 transition-colors duration-150 hover:bg-rose-100 disabled:opacity-50"
          >
            <IconTrash className="h-[18px] w-[18px]" />
          </button>
        </div>
      )}

      {/* زرار الرفع */}
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={disabled || uploading}
        className="flex w-full items-center justify-center gap-2 rounded-2xl border-dashed border-brand-300 bg-white px-4 py-3 text-[13.5px] font-bold text-brand-800 transition-colors duration-150 hover:border-brand-400 hover:bg-brand-50/60 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {uploading ? (
          <>
            <IconLoader className="h-4 w-4 animate-spin" />
            جاري الرفع…
          </>
        ) : (
          <>
            <IconUpload className="h-[18px] w-[18px]" />
            {hasValue ? "استبدال الملف" : kind === "video" ? "ارفع فيديو" : "ارفع صورة"}
          </>
        )}
      </button>

      <input
        ref={inputRef}
        type="file"
        accept={accept}
        onChange={handlePick}
        className="hidden"
        tabIndex={-1}
      />

      {hint && !error && (
        <p className="mt-1.5 text-[12px] font-semibold text-brand-900/55">{hint}</p>
      )}
      {error && (
        <p role="alert" className="mt-1.5 rounded-xl bg-rose-50 px-3 py-2 text-[12.5px] font-bold text-rose-800">
          {error}
        </p>
      )}
    </div>
  );
}
