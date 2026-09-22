"use client";

/**
 * مجموعة أيقونات SVG خفيفة (بدون أي مكتبة خارجية).
 * كلها بنفس الوصفة: stroke بسيط عشان تبان نضيفة على الزجاج الغامق.
 */
const base = "h-[18px] w-[18px]";

export function IconGrid({ className = base }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <rect x="3.5" y="3.5" width="7" height="7" rx="2" stroke="currentColor" strokeWidth="1.6" />
      <rect x="13.5" y="3.5" width="7" height="7" rx="2" stroke="currentColor" strokeWidth="1.6" />
      <rect x="3.5" y="13.5" width="7" height="7" rx="2" stroke="currentColor" strokeWidth="1.6" />
      <rect x="13.5" y="13.5" width="7" height="7" rx="2" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  );
}

export function IconInbox({ className = base }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path d="M3.5 13.2l2.1-7a2 2 0 011.9-1.4h9a2 2 0 011.9 1.4l2.1 7" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M3.5 13.2h4l1 2.2h7l1-2.2h4v3.9a2.4 2.4 0 01-2.4 2.4H5.9a2.4 2.4 0 01-2.4-2.4v-3.9z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
    </svg>
  );
}

/** بريد — رسائل الزوار */
export function IconMail({ className = base }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <rect x="3" y="5" width="18" height="14" rx="2.4" stroke="currentColor" strokeWidth="1.6" />
      <path d="m3.6 7 8.4 5.6L20.4 7" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** أرشيف — صندوق ملفات (ليستة التنقل وصفحة الأرشيف) */
export function IconArchive({ className = base }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <rect x="3.5" y="4" width="17" height="5" rx="1.8" stroke="currentColor" strokeWidth="1.6" />
      <path d="M5 9v8.6A2.4 2.4 0 007.4 20h9.2A2.4 2.4 0 0019 17.6V9" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M10 13h4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

/** حذف — سلة مهملات */
export function IconTrash({ className = base }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path d="M4.5 6.5h15" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M9 6.5V5a1.5 1.5 0 011.5-1.5h3A1.5 1.5 0 0115 5v1.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M6.5 6.5l.8 12A2 2 0 009.3 20.4h5.4a2 2 0 002-1.9l.8-12" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M10.5 10v6M13.5 10v6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

/** استعادة — سهم بيلف (إرجاع من الأرشيف) */
export function IconRestore({ className = base }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path d="M4.5 12a7.5 7.5 0 107.5-7.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M12 1.8v5.4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M9.2 4.5L12 1.8l2.8 2.7" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function IconChat({ className = base }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path d="M20.5 11.6c0 4-3.8 7.2-8.5 7.2-1 0-1.9-.1-2.8-.4l-4 1.8 1.2-3.6A6.9 6.9 0 013.5 11.6c0-4 3.8-7.2 8.5-7.2s8.5 3.2 8.5 7.2z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M8.6 11.6h.01M12 11.6h.01M15.4 11.6h.01" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
    </svg>
  );
}

export function IconGear({ className = base }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <circle cx="12" cy="12" r="3.1" stroke="currentColor" strokeWidth="1.6" />
      <path d="M19.4 14.2a7.6 7.6 0 000-4.4l1.5-1.1-2-3.4-1.7.7a7.7 7.7 0 00-3.8-2.2L13 2h-4l-.4 1.8a7.7 7.7 0 00-3.8 2.2l-1.7-.7-2 3.4 1.5 1.1a7.6 7.6 0 000 4.4l-1.5 1.1 2 3.4 1.7-.7a7.7 7.7 0 003.8 2.2L9 22h4l.4-1.8a7.7 7.7 0 003.8-2.2l1.7.7 2-3.4-1.5-1.1z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
    </svg>
  );
}

export function IconMenu({ className = "h-5 w-5" }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path d="M4 7h16M4 12h16M4 17h11" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

export function IconClose({ className = "h-5 w-5" }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path d="M6.5 6.5l11 11M17.5 6.5l-11 11" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

export function IconBell({ className = base }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path d="M6.8 10.2a5.2 5.2 0 0110.4 0c0 3.2 1.2 4.6 1.2 4.6H5.6s1.2-1.4 1.2-4.6z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M10.3 17.9a2 2 0 003.4 0" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

export function IconShield({ className = base }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path d="M12 2.6l7.4 3.1v5.5c0 4.6-3 8.3-7.4 9.8-4.4-1.5-7.4-5.2-7.4-9.8V5.7L12 2.6z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M8.8 12.1l2.3 2.3 4.1-4.4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function IconArrowLeft({ className = base }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path d="M14.5 6.5L9 12l5.5 5.5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function IconExternal({ className = base }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path d="M13.5 5.5H18.5V10.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M18.5 5.5L11.5 12.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M16.5 14.2v3.3a2 2 0 01-2 2H6.5a2 2 0 01-2-2V9.5a2 2 0 012-2h3.3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

export function IconLayout({ className = base }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <rect x="3.5" y="3.5" width="17" height="17" rx="3" stroke="currentColor" strokeWidth="1.6" />
      <path d="M3.5 9.2h17" stroke="currentColor" strokeWidth="1.6" />
      <path d="M9.6 9.2v11.3" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  );
}

export function IconBriefcase({ className = base }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <rect x="3" y="7.5" width="18" height="12.5" rx="3" stroke="currentColor" strokeWidth="1.6" />
      <path d="M8.8 7.5V6.2a2 2 0 012-2h2.4a2 2 0 012 2v1.3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M3 12.4h18" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  );
}

export function IconHeadset({ className = base }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path d="M4.6 14.2v-2.4a7.4 7.4 0 0114.8 0v2.4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <rect x="2.8" y="13.6" width="3.6" height="6" rx="1.6" stroke="currentColor" strokeWidth="1.6" />
      <rect x="17.6" y="13.6" width="3.6" height="6" rx="1.6" stroke="currentColor" strokeWidth="1.6" />
      <path d="M19.4 19.6v.4a2.4 2.4 0 01-2.4 2.4h-2.6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

export function IconUsers({ className = base }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <circle cx="9.4" cy="8.6" r="3.3" stroke="currentColor" strokeWidth="1.6" />
      <path d="M3.6 20c0-3.2 2.6-5.4 5.8-5.4s5.8 2.2 5.8 5.4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M16.4 6.1a3 3 0 010 5.6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M17.6 14.9c2.1.5 3.6 2.2 3.6 4.6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

export function IconUser({ className = base }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <circle cx="12" cy="8.4" r="3.8" stroke="currentColor" strokeWidth="1.6" />
      <path d="M4.8 20.4c0-3.6 3.1-6.1 7.2-6.1s7.2 2.5 7.2 6.1" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

export function IconLoader({ className = base }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" aria-hidden="true">
      <path d="M12 3.4a8.6 8.6 0 108.6 8.6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

export function IconAlert({ className = base }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.6" />
      <path d="M12 7.6v5.2" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
      <circle cx="12" cy="16.3" r="1.1" fill="currentColor" />
    </svg>
  );
}

export function IconLock({ className = base }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <rect x="4.5" y="10" width="15" height="10.5" rx="3" stroke="currentColor" strokeWidth="1.6" />
      <path d="M8 10V7.8a4 4 0 018 0V10" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <circle cx="12" cy="15.2" r="1.4" fill="currentColor" />
    </svg>
  );
}

/** يحوّل اسم الأيقونة (من adminConfig) لمكوّن */
export function NavIcon({ name, className }) {
  const map = {
    grid: IconGrid,
    layout: IconLayout,
    briefcase: IconBriefcase,
    inbox: IconInbox,
    archive: IconArchive,
    mail: IconMail,
    headset: IconHeadset,
    users: IconUsers,
    user: IconUser,
    chat: IconChat,
    gear: IconGear,
  };
  const Cmp = map[name] || IconGrid;
  return <Cmp className={className} />;
}
