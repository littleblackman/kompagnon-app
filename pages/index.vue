<script lang="ts" setup>
import { FilmIcon, SparklesIcon, ChartBarIcon, UserGroupIcon } from '@heroicons/vue/24/outline';
import { useAuthStore } from '~/store/auth';
import { onMounted } from 'vue';

// Utiliser le layout minimaliste (sans menu latéral ni header)
definePageMeta({
  layout: 'home'
});

// Rediriger vers dashboard si déjà connecté
const authStore = useAuthStore();

onMounted(() => {
  if (authStore.token) {
    navigateTo('/dashboard');
  }
});
</script>

<template>
  <div class="min-h-screen bg-gradient-to-br from-amber-50 via-white to-amber-50">
    <!-- Header -->
    <header class="bg-white shadow-sm border-b">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div class="flex items-center justify-between">
          <div class="flex items-center space-x-3">
            <img src="/logo-kpgn.png" alt="Logo Kompagnon" class="w-10 h-10" />
            <h1 class="text-2xl font-bold text-gray-900">Kompagnon</h1>
          </div>
          <div class="flex items-center space-x-4">
            <NuxtLink
              to="/login"
              class="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 transition-colors"
            >
              Connexion
            </NuxtLink>
            <NuxtLink
              to="/login"
              class="px-4 py-2 text-sm font-medium text-white bg-amber-600 rounded-md hover:bg-amber-700 transition-colors"
            >
              Commencer
            </NuxtLink>
          </div>
        </div>
      </div>
    </header>

    <!-- Hero Section -->
    <section class="py-20 px-4">
      <div class="max-w-6xl mx-auto">
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <!-- Contenu texte -->
          <div class="text-center lg:text-left">
            <div class="inline-flex items-center justify-center p-2 bg-amber-100 rounded-full mb-6">
              <SparklesIcon class="w-6 h-6 text-amber-600" />
            </div>
            <h2 class="text-5xl font-bold text-gray-900 mb-6">
              Votre assistant créatif pour projets artistiques
            </h2>
            <p class="text-xl text-gray-600 mb-8">
              Kompagnon vous accompagne dans l'organisation et le développement de vos projets
              théâtraux, cinématographiques et artistiques. Structurez vos idées, gérez vos personnages
              et donnez vie à vos créations.
            </p>
            <div class="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
              <NuxtLink
                to="/login"
                class="inline-flex items-center justify-center px-8 py-4 text-lg font-medium text-white bg-amber-600 rounded-lg hover:bg-amber-700 shadow-lg hover:shadow-xl transition-all"
              >
                <FilmIcon class="w-6 h-6 mr-2" />
                Démarrer maintenant
              </NuxtLink>
              <a
                href="#features"
                class="inline-flex items-center justify-center px-8 py-4 text-lg font-medium text-gray-700 bg-white border-2 border-gray-300 rounded-lg hover:border-gray-400 hover:bg-gray-50 transition-all"
              >
                En savoir plus
              </a>
            </div>
          </div>

          <!-- Photo du chien -->
          <div class="flex justify-center lg:justify-end">
            <div class="relative">
              <div class="absolute inset-0 bg-gradient-to-br from-amber-400 to-amber-600 rounded-2xl transform rotate-3"></div>
              <img
                src="/images/tana.jpg"
                alt="Tana le Kompagnon idéal"
                class="relative rounded-2xl shadow-2xl w-80 h-auto object-cover"
              />
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- Features Section -->
    <section id="features" class="py-20 px-4 bg-white">
      <div class="max-w-7xl mx-auto">
        <div class="text-center mb-16">
          <h3 class="text-3xl font-bold text-gray-900 mb-4">
            Tout ce dont vous avez besoin pour créer
          </h3>
          <p class="text-lg text-gray-600">
            Une plateforme complète pour organiser et développer vos projets créatifs
          </p>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          <!-- Feature 1 -->
          <div class="text-center p-6">
            <div class="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-xl mb-4">
              <FilmIcon class="w-8 h-8 text-blue-600" />
            </div>
            <h4 class="text-xl font-semibold text-gray-900 mb-3">Structure hiérarchique</h4>
            <p class="text-gray-600">
              Organisez vos projets en parties, séquences et scènes pour une vision claire de votre création.
            </p>
          </div>

          <!-- Feature 2 -->
          <div class="text-center p-6">
            <div class="inline-flex items-center justify-center w-16 h-16 bg-rose-100 rounded-xl mb-4">
              <UserGroupIcon class="w-8 h-8 text-rose-600" />
            </div>
            <h4 class="text-xl font-semibold text-gray-900 mb-3">Gestion de personnages</h4>
            <p class="text-gray-600">
              Créez des fiches détaillées avec avatars, biographies et niveaux d'importance pour tous vos personnages.
            </p>
          </div>

          <!-- Feature 3 -->
          <div class="text-center p-6">
            <div class="inline-flex items-center justify-center w-16 h-16 bg-purple-100 rounded-xl mb-4">
              <ChartBarIcon class="w-8 h-8 text-purple-600" />
            </div>
            <h4 class="text-xl font-semibold text-gray-900 mb-3">Analyse narrative</h4>
            <p class="text-gray-600">
              Schéma actantiel avec IA, détection automatique de personnages et analyse dramaturgique avancée.
            </p>
          </div>

          <!-- Feature 4 -->
          <div class="text-center p-6">
            <div class="inline-flex items-center justify-center w-16 h-16 bg-amber-100 rounded-xl mb-4">
              <SparklesIcon class="w-8 h-8 text-amber-600" />
            </div>
            <h4 class="text-xl font-semibold text-gray-900 mb-3">Éditeur riche</h4>
            <p class="text-gray-600">
              Rédigez vos contenus avec un éditeur de texte enrichi et des outils de mise en forme professionnels.
            </p>
          </div>
        </div>
      </div>
    </section>

    <!-- CTA Section -->
    <section class="py-20 px-4">
      <div class="max-w-4xl mx-auto text-center bg-gradient-to-r from-amber-500 to-amber-600 rounded-2xl p-12 shadow-2xl">
        <h3 class="text-3xl font-bold text-white mb-4">
          Prêt à donner vie à vos idées ?
        </h3>
        <p class="text-xl text-amber-50 mb-8">
          Rejoignez Kompagnon et commencez à structurer vos projets créatifs dès aujourd'hui.
        </p>
        <NuxtLink
          to="/login"
          class="inline-flex items-center justify-center px-8 py-4 text-lg font-medium text-amber-600 bg-white rounded-lg hover:bg-gray-50 shadow-lg hover:shadow-xl transition-all"
        >
          Commencer gratuitement
        </NuxtLink>
      </div>
    </section>

    <!-- Footer -->
    <footer class="bg-gray-900 text-white py-12 px-4">
      <div class="max-w-7xl mx-auto">
        <div class="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div>
            <div class="flex items-center space-x-2 mb-4">
              <img src="/logo-kpgn.png" alt="Logo Kompagnon" class="w-8 h-8" />
              <span class="text-xl font-bold">Kompagnon</span>
            </div>
            <p class="text-gray-400">
              Votre assistant numérique pour la gestion de projets créatifs.
            </p>
          </div>
          <div>
            <h5 class="font-semibold mb-4">Navigation</h5>
            <ul class="space-y-2 text-gray-400">
              <li>
                <NuxtLink to="/login" class="hover:text-white transition-colors">
                  Connexion
                </NuxtLink>
              </li>
              <li>
                <NuxtLink to="/contact" class="hover:text-white transition-colors">
                  Contact
                </NuxtLink>
              </li>
            </ul>
          </div>
          <div>
            <h5 class="font-semibold mb-4">Fonctionnalités</h5>
            <ul class="space-y-2 text-gray-400">
              <li>Gestion de projets</li>
              <li>Personnages & avatars</li>
              <li>Analyse narrative IA</li>
              <li>Mode lecture avancé</li>
            </ul>
          </div>
        </div>
        <div class="border-t border-gray-800 mt-8 pt-8 text-center text-gray-400">
          <p>&copy; 2025 Kompagnon. Tous droits réservés.</p>
        </div>
      </div>
    </footer>
  </div>
</template>
