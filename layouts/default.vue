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
import { HomeIcon, UserIcon, FireIcon, EnvelopeIcon, PowerIcon } from '@heroicons/vue/24/solid'

const auth = useAuthStore()
</script>

<template>
  <div class="flex h-screen overflow-hidden">

    <!-- Sidebar -->
    <aside class="w-20 bg-[#2C2C2C] flex flex-col items-center py-6">
      <nav class="space-y-8 flex flex-col items-center justify-between">

        <NuxtLink to="/projets/tous" title="Projets">
          <FireIcon class="w-10 h-10 text-[#FDCF91] hover:text-[#FCAF45] transition"/>
        </NuxtLink>

        <NuxtLink to="/contact" title="Contact">
          <EnvelopeIcon class="w-10 h-10 text-[#FDCF91] hover:text-[#FCAF45] transition"/>
        </NuxtLink>

        <div v-if="auth.user" class="text-[#FDCF91]" :title="auth.user.email">
          <UserIcon class="w-10 h-10"/>
        </div>
        <NuxtLink v-else to="/login" title="Connexion">
          <PowerIcon class="w-10 h-10 text-[#FDCF91] hover:text-[#FCAF45] transition"/>
        </NuxtLink>

        <NuxtLink v-if="auth.user" to="/logout" title="Déconnexion">
          <PowerIcon class="w-10 h-10 text-[#FDCF91] hover:text-[#FF9B9B] transition"/>
        </NuxtLink>
      </nav>
    </aside>

    <!-- Main -->
    <main class="flex-1 flex flex-col bg-[#FFF8F2] overflow-auto">

      <!-- Header -->
      <header class="bg-[#79AC78] p-4">
        <h1 class="text-xl font-bold text-[#FFF8F2]">
          <NuxtLink to="/">Kompagnon</NuxtLink>
        </h1>
      </header>

      <!-- Contenu -->
      <div class="flex-1 p-6 text-[#333333]">
        <slot />
      </div>

    </main>

  </div>
</template>
