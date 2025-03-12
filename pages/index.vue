<script setup>
definePageMeta({
  layout: 'home'
});
import { navigateTo } from '#app';
import { watch } from 'vue';
import { useAuthStore } from '~/store/auth';
const auth = useAuthStore()

watch(() => auth.user, (user) => {
  if (user) {
    navigateTo('/dashboard');
  }
}, { immediate: true });
</script>

<template>
  <div class="flex min-h-screen">
    <!-- Colonne formulaire -->
    <div class="w-1/2 flex flex-col items-center pt-60">

      <div>
        <img src="/public/logo-kpgn.png" alt="logo kompagnon">
      </div>


      <h1 class="text-3xl font-bold">Kompagnon</h1>

      <div v-if="auth.user" class="mt-4">
        <h2 class="text-xl">Bienvenue, {{ auth.user.email }}</h2>
      </div>

      <div v-else class="mt-4">
        <p>Veuillez vous connecter</p>
        <NuxtLink to="/login" class="text-blue-600 underline">Connexion</NuxtLink>
      </div>
    </div>

    <!-- Colonne image -->
    <div class="w-1/2">
      <img src="/public/images/tana.jpg" class="w-full h-full object-cover" alt="Tana le Kompagnon idéal">
    </div>
  </div>
</template>