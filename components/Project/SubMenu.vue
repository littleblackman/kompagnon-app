<template>
  <div class="bg-white shadow-sm border-b sticky top-0 z-10">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <nav class="flex justify-between items-center py-3 gap-2">

        <!-- Retour -->
        <NuxtLink
          to="/projets/tous"
          class="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors shrink-0"
        >
          <ArrowLeftIcon class="w-5 h-5" />
          <span class="hidden sm:inline text-sm font-medium">Retour</span>
        </NuxtLink>

        <!-- Liens de navigation (icônes seules sur mobile) -->
        <div class="flex items-center gap-1">
          <NuxtLink :to="`/projets/projet-${projectSlug}`" class="nav-link" :class="{ 'active': $route.path.includes('projet-') }" data-controller="tooltip" title="Écrire">
            <PencilIcon class="w-5 h-5" />
            <span class="hidden sm:inline">Écrire</span>
          </NuxtLink>
          <NuxtLink :to="`/projets/voir-${projectSlug}`" class="nav-link" :class="{ 'active': $route.path.includes('voir-') }" data-controller="tooltip" title="Voir">
            <EyeIcon class="w-5 h-5" />
            <span class="hidden sm:inline">Voir</span>
          </NuxtLink>
          <NuxtLink :to="`/projets/personnages-${projectSlug}`" class="nav-link" :class="{ 'active': $route.path.includes('personnages-') }" data-controller="tooltip" title="Personnages">
            <UserGroupIcon class="w-5 h-5" />
            <span class="hidden sm:inline">Personnages</span>
          </NuxtLink>
          <NuxtLink :to="`/projets/analyse-${projectSlug}`" class="nav-link" :class="{ 'active': $route.path.includes('analyse-') }" data-controller="tooltip" title="Analyse">
            <ChartBarIcon class="w-5 h-5" />
            <span class="hidden sm:inline">Analyse</span>
          </NuxtLink>
          <NuxtLink :to="`/projets/reference-${projectSlug}`" class="nav-link" :class="{ 'active': $route.path.includes('reference-') }" data-controller="tooltip" title="Référence">
            <BookOpenIcon class="w-5 h-5" />
            <span class="hidden sm:inline">Référence</span>
          </NuxtLink>
          <NuxtLink :to="`/projets/modifier-${projectSlug}`" class="nav-link" :class="{ 'active': $route.path.includes('modifier-') }" data-controller="tooltip" title="Paramètres">
            <CogIcon class="w-5 h-5" />
            <span class="hidden sm:inline">Paramètres</span>
          </NuxtLink>
        </div>

        <!-- Compteur (masqué sur mobile) -->
        <div class="hidden sm:block text-sm text-gray-600 font-mono shrink-0">
          {{ projectStore.stats.wordCount.toLocaleString() }} mots
        </div>

      </nav>
    </div>
  </div>
</template>

<script setup lang="ts">
import { PencilIcon, CogIcon, EyeIcon, UserGroupIcon, ArrowLeftIcon, BookOpenIcon, ChartBarIcon } from '@heroicons/vue/24/solid';
import { useProjectStore } from '~/store/project';

interface Props {
  projectSlug: string;
}

defineProps<Props>();

const projectStore = useProjectStore();
</script>

<style scoped>
.nav-link {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: #6b7280;
  padding: 0.75rem 1rem;
  border-radius: 0.5rem;
  font-size: 0.875rem;
  font-weight: 500;
  transition: all 0.2s ease;
  text-decoration: none;
}

.nav-link:hover {
  color: #111827;
  background-color: #f9fafb;
}

.nav-link.active {
  color: #d97706;
  background-color: #fef3c7;
}
</style>