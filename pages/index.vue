<script lang="ts" setup>
import { computed, onMounted } from 'vue';
import { useAuthStore } from "~/store/auth";
import { useAnalyticsStore } from "~/store/analytics";
import { ChartBarIcon, FilmIcon, DocumentTextIcon, UserGroupIcon } from '@heroicons/vue/24/outline';

const auth = useAuthStore();
auth.requireAuth();

const analyticsStore = useAnalyticsStore();

// Statistiques réactives depuis le store
const stats = computed(() => analyticsStore.statistics);
const isLoading = computed(() => analyticsStore.isLoading);

onMounted(async () => {
  await analyticsStore.refreshIfNeeded();
});
</script>

<template>
  <div class="min-h-screen bg-gray-50">
    <!-- Header -->
    <div class="bg-white shadow-sm border-b">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div class="flex items-center justify-between">
          <div>
            <h1 class="text-3xl font-bold text-gray-900">Tableau de bord</h1>
            <p class="mt-2 text-lg text-gray-600">Vue d'ensemble de vos projets et contenus</p>
          </div>
          <ChartBarIcon class="w-12 h-12 text-amber-500" />
        </div>
      </div>
    </div>

    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <!-- Description -->
      <div class="bg-white rounded-lg shadow-sm border p-6 mb-8">
        <h2 class="text-xl font-semibold text-gray-900 mb-4">Bienvenue sur Kompagnon</h2>
        <div class="prose text-gray-700">
          <p class="mb-4">
            <strong>Kompagnon</strong> est votre assistant numérique pour la gestion de projets créatifs. 
            Cette plateforme vous accompagne dans l'organisation et le développement de vos projets 
            théâtraux, cinématographiques et artistiques.
          </p>
          <p class="mb-4">
            Structurez votre travail créatif grâce à une hiérarchie intuitive : 
            <span class="font-medium text-amber-600">Projets → Parties → Séquences → Scènes</span>, 
            gérez vos personnages avec un système d'avatars et de niveaux, et suivez l'évolution 
            de votre contenu en temps réel.
          </p>
          <p>
            Le tableau de bord ci-dessous vous offre une vue globale de votre activité créative 
            et vous permet de naviguer rapidement vers vos contenus les plus récents.
          </p>
        </div>
      </div>

      <!-- Statistiques -->
      <div v-if="isLoading" class="text-center py-8">
        <div class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-amber-500"></div>
        <p class="mt-2 text-gray-600">Chargement des statistiques...</p>
      </div>

      <div v-else>
        <!-- Cartes de statistiques -->
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
          <!-- Projets -->
          <div class="bg-white rounded-lg shadow-sm border p-6">
            <div class="flex items-center justify-between">
              <div>
                <p class="text-sm font-medium text-gray-600">Projets</p>
                <p class="text-3xl font-bold text-gray-900">{{ stats.totalProjects }}</p>
              </div>
              <FilmIcon class="w-10 h-10 text-blue-500" />
            </div>
            <p class="mt-2 text-sm text-gray-500">Projets créés au total</p>
          </div>

          <!-- Parties -->
          <div class="bg-white rounded-lg shadow-sm border p-6">
            <div class="flex items-center justify-between">
              <div>
                <p class="text-sm font-medium text-gray-600">Parties</p>
                <p class="text-3xl font-bold text-gray-900">{{ stats.totalParts }}</p>
              </div>
              <DocumentTextIcon class="w-10 h-10 text-green-500" />
            </div>
            <p class="mt-2 text-sm text-gray-500">Sections structurelles</p>
          </div>

          <!-- Séquences -->
          <div class="bg-white rounded-lg shadow-sm border p-6">
            <div class="flex items-center justify-between">
              <div>
                <p class="text-sm font-medium text-gray-600">Séquences</p>
                <p class="text-3xl font-bold text-gray-900">{{ stats.totalSequences }}</p>
              </div>
              <ChartBarIcon class="w-10 h-10 text-purple-500" />
            </div>
            <p class="mt-2 text-sm text-gray-500">Unités narratives</p>
          </div>

          <!-- Scènes -->
          <div class="bg-white rounded-lg shadow-sm border p-6">
            <div class="flex items-center justify-between">
              <div>
                <p class="text-sm font-medium text-gray-600">Scènes</p>
                <p class="text-3xl font-bold text-gray-900">{{ stats.totalScenes }}</p>
              </div>
              <UserGroupIcon class="w-10 h-10 text-amber-500" />
            </div>
            <p class="mt-2 text-sm text-gray-500">Unités d'action</p>
          </div>

          <!-- Personnages -->
          <div class="bg-white rounded-lg shadow-sm border p-6">
            <div class="flex items-center justify-between">
              <div>
                <p class="text-sm font-medium text-gray-600">Personnages</p>
                <p class="text-3xl font-bold text-gray-900">{{ stats.totalPersonnages }}</p>
              </div>
              <UserGroupIcon class="w-10 h-10 text-rose-500" />
            </div>
            <p class="mt-2 text-sm text-gray-500">Créations de caractères</p>
          </div>
        </div>

        <!-- Scènes récentes -->
        <div class="bg-white rounded-lg shadow-sm border p-6">
          <h3 class="text-lg font-semibold text-gray-900 mb-4">Scènes récentes</h3>
          
          <div v-if="stats.recentScenes.length === 0" class="text-center py-8">
            <DocumentTextIcon class="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p class="text-gray-500">Aucune scène créée pour le moment</p>
            <p class="text-sm text-gray-400 mt-1">Commencez par créer votre premier projet</p>
          </div>

          <div v-else class="space-y-4">
            <div 
              v-for="scene in stats.recentScenes" 
              :key="scene.id"
              class="border-l-4 border-amber-400 pl-4 py-2 hover:bg-gray-50 transition-colors"
            >
              <div class="flex items-center justify-between">
                <div>
                  <h4 class="font-medium text-gray-900">{{ scene.name }}</h4>
                  <p class="text-sm text-gray-600">
                    {{ scene.projectName }} → {{ scene.sequenceName }}
                  </p>
                  <div 
                    v-if="scene.description" 
                    class="text-sm text-gray-500 mt-1"
                    v-html="scene.description.substring(0, 100) + (scene.description.length > 100 ? '...' : '')"
                  ></div>
                </div>
                <div class="text-right">
                  <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
                    Scène #{{ scene.position }}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Actions rapides -->
        <div class="mt-8 text-center">
          <div class="flex flex-col sm:flex-row gap-4 justify-center">
            <NuxtLink 
              to="/projets/tous"
              class="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-amber-600 hover:bg-amber-700 transition-colors"
            >
              <FilmIcon class="w-5 h-5 mr-2" />
              Voir tous les projets
            </NuxtLink>
            <NuxtLink 
              to="/projets/creer"
              class="inline-flex items-center px-6 py-3 border border-gray-300 text-base font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 transition-colors"
            >
              <DocumentTextIcon class="w-5 h-5 mr-2" />
              Créer un projet
            </NuxtLink>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>