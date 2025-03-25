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
      tinymceApiKey: process.env.NUXT_PUBLIC_TINYMCE_API_KEY || 'rh94623y86575qrj04nyduzxsrhx2n6v9hi1pwz2c4idlt9i',
    }
  },
  nitro: {
    routeRules: {
      '/api/**': { proxy: 'http://localhost:8000/api/**' }
    }
  },

  compatibilityDate: "2025-02-11",


})