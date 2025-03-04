<template>
  <div class="text-center">
    <h1 class="text-4xl font-bold">Bienvenue sur Kompagnon 🚀</h1>
    <div v-if="auth.user">
      <h2 class="text-2xl font-semibold mt-4">Bienvenue, {{ auth.user.email }}</h2>
    </div>
    <div v-else>
      <p class="mt-2">Veuillez vous connecter</p>
      <NuxtLink to="/login" class="text-blue-500 underline">Connexion</NuxtLink>
    </div>
  </div>
</template>

<script setup>
definePageMeta({
  layout: 'default'
})
import { useAuthStore } from '~/store/auth'
const auth = useAuthStore()
</script>
