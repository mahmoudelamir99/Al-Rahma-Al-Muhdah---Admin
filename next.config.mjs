/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // إطفاء أيقونة التطوير لعرض نضيف أثناء المراجعة
  devIndicators: false,
  // السماح بالوصول من أي جهاز على الشبكة المحلية أثناء التطوير
  allowedDevOrigins: ["localhost", "127.0.0.1"],
  // فولدر المشروع هو الجذر (فيه package-lock تاني في الفولدر الأب)
  outputFileTracingRoot: process.cwd(),
};

export default nextConfig;
