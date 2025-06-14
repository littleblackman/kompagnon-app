<script setup>
useHead({
  title: 'Kompagnon App - Écrivez vos projets',
  meta: [
    { name: 'description', content: 'Application Kompagnon pour gérer efficacement vos projets d’écriture' },
    { charset: 'utf-8' },
    { name: 'viewport', content: 'width=device-width, initial-scale=1' }
  ],
  link: [
    { rel: 'icon', type: 'image/png', href: '/logo-kpgn.png' }
  ]
})

import { useAuthStore } from '~/store/auth'
import { HomeIcon, UserIcon, EnvelopeIcon, PowerIcon } from '@heroicons/vue/24/solid'

const auth = useAuthStore()
</script>

<template>
  <div class="flex h-screen overflow-hidden bg-light text-color">

    <!-- Sidebar -->
    <aside class="w-20 flex flex-col items-center py-6 sidebar">
      <nav class="space-y-8 flex flex-col items-center justify-between">

        <NuxtLink to="/projets/tous" title="Projets">
          <HomeIcon class="icon-style" />
        </NuxtLink>

        <NuxtLink to="/contact" title="Contact">
          <EnvelopeIcon class="icon-style" />
        </NuxtLink>

        <div v-if="auth.user" :title="auth.user.email">
          <UserIcon class="icon-style" />
        </div>
        <NuxtLink v-else to="/login" title="Connexion">
          <PowerIcon class="icon-style" />
        </NuxtLink>

        <NuxtLink v-if="auth.user" to="/logout" title="Déconnexion">
          <PowerIcon class="icon-style" />
        </NuxtLink>
      </nav>
    </aside>

    <!-- Main -->
    <main class="flex-1 flex flex-col overflow-auto bg-light text-color">

      <!-- Header -->

      <header class="header bg-cta">
        <h1 class="font-bold text-2xl text-left">
          <NuxtLink to="/">Kompagnon</NuxtLink>
        </h1>
      </header>

      <!-- Contenu -->
      <div class="flex-1">
        <slot />
      </div>

    </main>

  </div>
</template>