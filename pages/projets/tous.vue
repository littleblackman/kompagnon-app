<script setup>
definePageMeta({
  middleware: 'auth'
})
const config = useRuntimeConfig();

import { useAuthStore } from '~/store/auth';
import { computed } from 'vue';
import { PlusIcon } from '@heroicons/vue/24/solid';

const auth = useAuthStore()
auth.requireAuth();

const { data, pending, error } = useFetch(`${config.public.apiBase}/projects`, {
  key: 'projects',
  headers: {
    'X-AUTH-TOKEN': auth.token || ''
  }
})

const projects = computed(() => data.value || [])
</script>

<template>
  <div class="min-h-screen bg-gray-50 py-8">
    <div class="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
      <div class="mb-8">
        <h1 class="text-3xl font-bold text-gray-900 mb-2">Liste des projets</h1>
        <p class="text-gray-600">Gérez et organisez tous vos projets créatifs</p>
      </div>

      <!-- Bouton Créer un projet -->
      <div class="mb-8">
        <NuxtLink
          to="/projets/creer"
          class="create-project-btn"
        >
          <PlusIcon class="w-5 h-5" />
          <span>Créer un nouveau projet</span>
        </NuxtLink>
      </div>

      <div v-if="projects" class="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <div v-for="project in projects" :key="project.id" class="project-card">
          <NuxtLink :to="{ path:`/projets/projet-${project.slug }`}" class="block h-full">
            <div class="card-content">
              <h2 class="project-title">{{ project.name }}</h2>
              <p class="project-type">{{ project.type.name }}</p>
              <div class="project-description" v-html="project.description.slice(0, 200)+'...'"></div>
            </div>
          </NuxtLink>
        </div>
      </div>
      <div v-else class="text-center py-12">
        <p class="text-gray-500">Chargement...</p>
      </div>
    </div>
  </div>
</template>

<style scoped>
.container {
  max-width: 600px;
  margin: 0 auto;
  padding: 20px;
}

.create-project-btn {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  background: linear-gradient(135deg, #79AC78, #618261);
  color: white;
  padding: 0.75rem 1.5rem;
  border-radius: 8px;
  text-decoration: none;
  font-weight: 500;
  box-shadow: 0 2px 8px rgba(121, 172, 120, 0.3);
  transition: all 0.3s ease;
}

.create-project-btn:hover {
  background: linear-gradient(135deg, #618261, #4a6b4a);
  box-shadow: 0 4px 15px rgba(121, 172, 120, 0.4);
  transform: translateY(-2px);
}

.project-card {
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  transition: all 0.3s ease;
  overflow: hidden;
}

.project-card:hover {
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15);
  transform: translateY(-2px);
}

.card-content {
  padding: 24px;
}

.project-title {
  font-size: 1.5rem;
  font-weight: bold;
  color: #1f2937;
  margin-bottom: 8px;
}

.project-type {
  color: #79AC78;
  font-weight: 500;
  margin-bottom: 16px;
  font-size: 0.9rem;
}

.project-description {
  color: #6b7280;
  line-height: 1.6;
  font-style: italic;
}

.link {
  text-decoration: none;
  color: #79AC78;
  transition: color 0.3s ease-in-out;
}

.link:hover {
  color: #FF9B9B;
  transform: scale(1.4);
}
</style>
