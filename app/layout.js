import "./globals.css";

export const metadata = {
  title: "لوحة التحكم | الرحمة المهداة للتوظيف",
  description: "لوحة تحكم الإدارة — دخول مقفول للمصرّح لهم فقط.",
  robots: {
    index: false,
    follow: false,
    nocache: true,
    googleBot: { index: false, follow: false },
  },
  icons: {
    icon: [{ url: "/icon.svg", type: "image/svg+xml" }],
  },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#eef0f1",
};

export default function RootLayout({ children }) {
  return (
    <html lang="ar" dir="rtl">
      <head>
        {/*
          خط Cairo العربي — أوزان واضحة وسميكة بس (600 / 700 / 800).
          شلنا الوزن 400: الخط العادي بيطلع رفيع وناعم على شاشات اللوحة
          وبيجهد العين في الجداول والنماذج الطويلة، خصوصاً في العربي.
        */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Cairo:wght@600;700;800&display=swap"
          rel="stylesheet"
        />
        <style>{`:root{--font-cairo:'Cairo',system-ui,sans-serif}`}</style>
      </head>
      {/*
        ملاحظة: مفيش كلاس antialiased — هو اللي كان بيعمل حروف رفيعة باهتة.
        الوضوح متضبط من globals.css (font-smoothing: auto + وزن 600).
      */}
      <body className="font-sans bg-surface-200 text-brand-800">{children}</body>
    </html>
  );
}
