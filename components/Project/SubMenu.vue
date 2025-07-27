<template>
  <div class="bg-white shadow-sm border-b sticky top-0 z-10">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <nav class="flex justify-between items-center py-4">
        <div></div>
        <div class="flex justify-center space-x-8">
        <NuxtLink 
          :to="`/projets/projet-${projectSlug}`"
          class="nav-link"
          :class="{ 'active': $route.path.includes('projet-') }"
        >
          <PencilIcon class="w-5 h-5" />
          <span>Écrire</span>
        </NuxtLink>
        
        <NuxtLink 
          :to="`/projets/voir-${projectSlug}`"
          class="nav-link"
          :class="{ 'active': $route.path.includes('voir-') }"
        >
          <EyeIcon class="w-5 h-5" />
          <span>Voir</span>
        </NuxtLink>
        
        <NuxtLink 
          :to="`/projets/personnages-${projectSlug}`"
          class="nav-link"
          :class="{ 'active': $route.path.includes('personnages-') }"
        >
          <UserGroupIcon class="w-5 h-5" />
          <span>Personnages</span>
        </NuxtLink>

         <NuxtLink 
          :to="`/projets/modifier-${projectSlug}`"
          class="nav-link"
          :class="{ 'active': $route.path.includes('modifier-') }"
        >
          <CogIcon class="w-5 h-5" />
          <span>Paramètres</span>
        </NuxtLink>
        </div>
        
        <!-- Compteur de mots/caractères -->
        <div class="text-sm text-gray-600 font-mono">
          <span>{{ projectStore.stats.wordCount.toLocaleString() }} mots</span>
          <span class="mx-2">•</span>
          <span>{{ projectStore.stats.charCount.toLocaleString() }} SEC</span>
        </div>
        
      </nav>
    </div>
  </div>
</template>

<script setup lang="ts">
import { PencilIcon, CogIcon, EyeIcon, UserGroupIcon } from '@heroicons/vue/24/solid';
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