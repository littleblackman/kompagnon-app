import tailwindcss from "@tailwindcss/vite";

export default defineNuxtConfig({
  ssr: false,
  pages: true,
  components: true,

  css: [
    '~/assets/css/main.css',
    '~/assets/main.scss',
  ],

  vite: {
    plugins: [
      tailwindcss(),
    ],
  },

  runtimeConfig: {
    public: {
      apiBase: process.env.API_BASE || 'http://localhost:8000/api',
    }
  },
  nitro: {
    routeRules: {
      '/api/**': { proxy: 'http://localhost:8000/api/**' }
    }
  },

  compatibilityDate: "2025-02-11",


})