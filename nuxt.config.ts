import tailwindcss from "@tailwindcss/vite";

export default defineNuxtConfig({
  ssr: false,
  pages: true,

  css: [
    '~/assets/css/main.css',
    '~/assets/main.scss',
  ],

  vite: {
    plugins: [
      tailwindcss(),
    ],
  },

  compatibilityDate: "2025-02-11",


})