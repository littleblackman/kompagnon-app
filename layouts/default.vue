<script setup>
import { useAuthStore } from '~/store/auth'
import { HomeIcon, UserIcon, FireIcon, EnvelopeIcon, PowerIcon } from '@heroicons/vue/24/solid'

const auth = useAuthStore()

</script>

<template>
  <div class="min-h-screen flex flex-col bg-gray-100">
    <!-- Navbar -->
    <header class="header">
      <div class="container mx-auto flex justify-between">
        <h1 class="text-lg font-bold">
          <NuxtLink to="/">Kompagnon</NuxtLink>
        </h1>
        <nav class="flex justify-between">
          <NuxtLink to="/projets/tous" class="px-4" title="Projets">
            <FireIcon class="w-12 h-12"/>
          </NuxtLink>
          <NuxtLink to="/contact" class="px-4">
            <EnvelopeIcon class="w-12 h-12"/>
          </NuxtLink>
          <div v-if="auth.user" class="px-4">
            <UserIcon class="w-12 h-12" title="{{ auth.user.email }}"/>
          </div>
            <PowerIcon  v-else class="w-12 h-12 px-4" title="Connexion"/>
          <NuxtLink v-if="auth.user" to="/logout" class="px-4" title="Déconnexion">
            <PowerIcon class="w-12 h-12"/>
          </NuxtLink>
        </nav>
      </div>
    </header>


    <!-- Contenu -->
    <main class="flex-1 container mx-auto p-4">
      <slot />
    </main>

    <!-- Footer -->
    <footer class="footer">
      © 2025 - Kompagnon-App
    </footer>
  </div>
</template>