<template>
  <div class="bg-white shadow-sm border-b sticky top-0 z-10">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <nav class="flex justify-between items-center py-3 gap-2 min-w-0">

        <!-- Retour -->
        <NuxtLink
          to="/projets/tous"
          class="nav-link shrink-0"
          data-controller="tooltip"
          title="Retour à mes projets"
        >
          <ArrowLeftIcon class="w-5 h-5" />
          <span class="hidden lg:inline">Retour</span>
        </NuxtLink>

        <!-- Liens de navigation (icônes seules sur mobile) -->
        <div class="flex items-center gap-1 min-w-0 overflow-x-auto no-scrollbar">
          <NuxtLink :to="`/projets/projet-${projectSlug}`" class="nav-link" :class="{ 'active': $route.path.includes('projet-') }" data-controller="tooltip" title="Écrire">
            <PencilIcon class="w-5 h-5" />
            <span class="hidden lg:inline">Écrire</span>
          </NuxtLink>
          <NuxtLink :to="`/projets/voir-${projectSlug}`" class="nav-link" :class="{ 'active': $route.path.includes('voir-') }" data-controller="tooltip" title="Voir">
            <EyeIcon class="w-5 h-5" />
            <span class="hidden lg:inline">Voir</span>
          </NuxtLink>
          <NuxtLink :to="`/projets/personnages-${projectSlug}`" class="nav-link" :class="{ 'active': $route.path.includes('personnages-') }" data-controller="tooltip" title="Personnages">
            <UserGroupIcon class="w-5 h-5" />
            <span class="hidden lg:inline">Personnages</span>
          </NuxtLink>
          <NuxtLink :to="`/projets/analyse-${projectSlug}`" class="nav-link" :class="{ 'active': $route.path.includes('analyse-') }" data-controller="tooltip" title="Analyse">
            <ChartBarIcon class="w-5 h-5" />
            <span class="hidden lg:inline">Analyse</span>
          </NuxtLink>
          <NuxtLink :to="`/projets/reference-${projectSlug}`" class="nav-link" :class="{ 'active': $route.path.includes('reference-') }" data-controller="tooltip" title="Référence">
            <BookOpenIcon class="w-5 h-5" />
            <span class="hidden lg:inline">Référence</span>
          </NuxtLink>
          <NuxtLink :to="`/projets/modifier-${projectSlug}`" class="nav-link" :class="{ 'active': $route.path.includes('modifier-') }" data-controller="tooltip" title="Paramètres">
            <CogIcon class="w-5 h-5" />
            <span class="hidden lg:inline">Paramètres</span>
          </NuxtLink>
        </div>

        <!-- Compteur (masqué sur mobile) -->
        <div class="hidden lg:block text-sm text-gray-600 font-mono shrink-0">
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
  flex-shrink: 0;
  color: #6b7280;
  /* Sans libellé, l'onglet n'a pas besoin d'autant de respiration */
  padding: 0.625rem 0.75rem;
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

@media (min-width: 1024px) {
  .nav-link {
    padding: 0.75rem 1rem;
  }
}

/* La barre peut défiler si besoin, sans afficher d'ascenseur */
.no-scrollbar {
  scrollbar-width: none;
  -ms-overflow-style: none;
}

.no-scrollbar::-webkit-scrollbar {
  display: none;
}
</style>