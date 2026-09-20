import VaultShell from "@/components/VaultShell";

/**
 * شاشة الدخول — الـ middleware بيحوّل المستخدم المسجّل بالفعل للوحة.
 */
export const metadata = {
  title: "الدخول | لوحة تحكم الرحمة المهداة",
};

export default function LoginPage() {
  return <VaultShell />;
}
