import tailwindcss from "@tailwindcss/vite";

export default defineNuxtConfig({
  pages: true,

  css: [
    '~/assets/css/main.css'
  ],

  vite: {
    plugins: [
      tailwindcss(),
    ],
  },

  compatibilityDate: "2025-02-11",
})