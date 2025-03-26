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
    <div class="w-1/2 flex flex-col items-center">

      <div>
        <img src="/public/logo-kpgn.png" alt="logo kompagnon">
      </div>


      <h1 class="text-3xl font-bold">Kompagnon</h1>

      <div class="text-justify mt-4 max-w-196">
        <p>
          ✨ Bienvenue sur Kompagnon<br/>
          Kompagnon, c’est l’allié des écrivains, scénaristes et créateurs de récits.<br/>
          Une plateforme pensée pour t’aider à structurer ton projet narratif de A à Z.<br/>
          <br/>
          🧠 Écris par couches : commence par l’idée générale, construis ton intrigue, développe tes scènes et affine chaque dialogue.<br/>
          <br/>
          📅 Gère ton temps narratif : grâce à une timeline interactive, visualise, déplace, et restructure tes séquences en un clic.<br/>
          <br/>
          📊 Suis ta progression : nombre de mots, avancement des chapitres, objectifs créatifs… tout est là pour t’aider à rester motivé.<br/>
          <br/>
          🔁 Teste, réécris, recommence : Kompagnon t’accompagne dans les itérations, sans jamais perdre de vue la vision d’ensemble.<br/>
          <br/>
          🛠️ Open source & collaboratif :<br/>
          Le projet est libre, transparent et évolutif. Tu peux l’explorer, contribuer ou t’en inspirer.<br/>
          <a href="https://github.com/littleblackman/kompagnon-api" target="_blank">Kompagnon – Backend API (Symfony + API Platform)</a><br/>
          <a href="https://github.com/littleblackman/kompagnon-app" target="_blank">Kompagnon – Frontend App (Nuxt 3 + Tailwind)</a><br/>
          <br/>
          <br/>
          📩 Pour plus d’infos ou une démo personnalisée : <b>sandyrazafitrimo@gmail.com</b>
        </p>

      </div>


      <div v-if="auth.user" class="mt-4">
        <h2 class="text-xl">Bienvenue, {{ auth.user.email }}</h2>
      </div>
      <div v-else class="mt-4">
        <NuxtLink to="/login" class="text-blue-600 underline">Connexion</NuxtLink>
      </div>
    </div>

    <!-- Colonne image -->
    <div class="w-1/2">
      <img src="/public/images/tana.jpg" class="w-full h-full object-cover" alt="Tana le Kompagnon idéal">
    </div>
  </div>
</template>