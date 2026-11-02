<script setup lang="ts">
import type { NuxtError } from '#app'

/**
 * Page d'erreur de Nuxt : route inconnue (404) ou erreur fatale.
 * Volontairement autonome, sans layout : si l'erreur vient du layout,
 * le réutiliser ici la reproduirait.
 */
const props = defineProps<{ error: NuxtError }>()

const status = computed(() => props.error?.statusCode ?? 500)

const content = computed(() => {
  switch (status.value) {
    case 404:
      return {
        title: 'Cette page n\'existe pas',
        text: 'Le lien est peut-être ancien, ou le projet a été renommé. Vos textes, eux, n\'ont pas bougé.',
      }
    case 403:
      return {
        title: 'Accès réservé',
        text: 'Cette page n\'est pas ouverte à votre compte.',
      }
    default:
      return {
        title: 'Quelque chose s\'est mal passé',
        text: 'L\'erreur a été signalée automatiquement. Ce que vous aviez enregistré est en sécurité ; rechargez la page pour reprendre.',
      }
  }
})

const isDev = import.meta.dev

useHead({ title: `${content.value.title} · Kompagnon` })

const goHome = () => clearError({ redirect: '/dashboard' })
const reload = () => window.location.reload()
</script>

<template>
  <div class="min-h-screen bg-gray-50 flex items-center justify-center px-4 py-12">
    <div class="w-full max-w-lg text-center">
      <img src="/logo-kpgn.png" alt="Kompagnon" class="h-12 mx-auto mb-8 opacity-90" />

      <p class="text-6xl md:text-7xl font-bold text-amber-500 mb-4 tabular-nums">{{ status }}</p>
      <h1 class="text-2xl md:text-3xl font-bold text-gray-900 mb-3">{{ content.title }}</h1>
      <p class="text-gray-600 mb-8 leading-relaxed">{{ content.text }}</p>

      <div class="flex flex-col sm:flex-row gap-3 justify-center">
        <button
          @click="goHome"
          class="min-h-[44px] px-6 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-colors font-medium"
        >
          Retour au tableau de bord
        </button>
        <button
          v-if="status !== 404"
          @click="reload"
          class="min-h-[44px] px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors"
        >
          Recharger la page
        </button>
      </div>

      <!-- En local seulement : le détail technique -->
      <details v-if="isDev && status !== 404" class="mt-10 text-left bg-white border border-gray-200 rounded-lg p-4">
        <summary class="cursor-pointer text-sm font-medium text-gray-700">Détail technique</summary>
        <p class="mt-3 text-sm text-red-700 break-words">{{ error.message }}</p>
        <pre v-if="error.stack" class="mt-2 text-xs text-gray-600 overflow-x-auto whitespace-pre-wrap">{{ error.stack }}</pre>
      </details>
    </div>
  </div>
</template>
