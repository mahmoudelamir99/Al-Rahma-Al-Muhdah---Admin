/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,jsx}",
    "./components/**/*.{js,jsx}",
  ],
  theme: {
    extend: {
      colors: {
        /*
         * الهوية البصرية: رمادي محايد + أكسيد النحاس (Slate & Copper)
         * دي لغة الشركات المؤسية الكبيرة (Deloitte / Siemens / SAP):
         * محايد
         * غالب، لون تمييز واحد رصين، مفيش أي درجات صارخة
         */

        /*
         * 1) الأسطح — Soft Light Mode
         * رمادي دافي مريح للعين، بدرجة أوضح من قبل عشان الكروت تبان فوق
         * الخلفية من غير أي تباين حاد أو انبهار (مفيش أبيض ناصع).
         */
        surface: {
          50: "#fdfdfc",
          100: "#f8f8f7",
          200: "#eef0f1",
          300: "#e2e5e8",
          400: "#d2d7db",
          500: "#c2c7cc",
        },

        // 2) النحاس — لون التمييز الرصين (بدل الذهبي الفاقع)
        //    رقمي واحد بسيط، من غير أي وهج
        copper: {
          50: "#faf6f3",
          100: "#f3e9e2",
          200: "#e6d2c5",
          300: "#d3b3a0",
          400: "#bd8f76",
          500: "#a97458",
          600: "#8d5c45",
          700: "#704838",
          800: "#57382c",
          900: "#402a22",
        },

        // 3) الأساسي (Slate) — رمادي مزرق غامق ورصين، ده اللي بيتحكم في
        //    كل النصوص والأزرار. مقصود يبقى محايد مش أزرق صارخ.
        brand: {
          50: "#f6f7f8",
          100: "#eceef0",
          200: "#d8dce0",
          300: "#b9c0c7",
          400: "#8d979f",
          500: "#67727b",
          600: "#4d5660",
          700: "#3a424b",
          800: "#2b3138",
          900: "#1f2429",
          950: "#14181c",
        },
      },
      fontFamily: {
        sans: ["var(--font-cairo)", "system-ui", "sans-serif"],
      },
      boxShadow: {
        // ظلال هادية بتباع تدرج واحد (نفس لغة Stripe / Linear)
        soft: "0 1px 2px rgba(20, 24, 28, 0.03), 0 4px 12px -8px rgba(20, 24, 28, 0.08)",
        card: "0 1px 2px rgba(20, 24, 28, 0.04), 0 10px 24px -16px rgba(20, 24, 28, 0.12)",
        lift: "0 2px 4px rgba(20, 24, 28, 0.05), 0 16px 36px -20px rgba(20, 24, 28, 0.16)",
        glow: "0 0 0 1px rgba(169, 116, 88, 0.2), 0 12px 28px -16px rgba(169, 116, 88, 0.28)",
      },
      keyframes: {
        "fade-up": {
          "0%": { opacity: "0", transform: "translate3d(0, 22px, 0)" },
          "100%": { opacity: "1", transform: "translate3d(0, 0, 0)" },
        },
      },
      animation: {
        "fade-up": "fade-up 0.6s cubic-bezier(0.22, 1, 0.36, 1) both",
      },
      transitionTimingFunction: {
        premium: "cubic-bezier(0.22, 1, 0.36, 1)",
      },
    },
  },
  plugins: [],
};
