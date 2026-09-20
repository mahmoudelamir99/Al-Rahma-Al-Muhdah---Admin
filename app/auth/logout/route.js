export const dynamic = "force-dynamic";

/**
 * خروج آمن: يمسح كوكيز جلسة Supabase ويرجّع للشاشة الأمامية.
 * (بديل مضمون لزرار الخروج لو الجلسة اتعطلت في المتصفح)
 */
export async function GET(request) {
  const response = Response.redirect(new URL("/", request.url), 303);

  const cookieHeader = request.headers.get("cookie") || "";
  const names = cookieHeader
    .split(";")
    .map((part) => part.split("=")[0].trim())
    .filter((name) => name.startsWith("sb-"));

  for (const name of names) {
    response.headers.append(
      "Set-Cookie",
      `${name}=; Path=/; Max-Age=0; SameSite=Lax`
    );
  }

  return response;
}
