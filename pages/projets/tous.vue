<script setup>
definePageMeta({
  middleware: 'auth'
})
const config = useRuntimeConfig();

import { useAuthStore } from '~/store/auth';
import { computed } from 'vue';
import { PencilIcon, EyeIcon, WrenchIcon  } from '@heroicons/vue/24/solid'

const auth = useAuthStore()
auth.requireAuth();

const { data, pending, error } = useFetch(`${config.public.apiBase}/projects`, {
  key: 'projects',
  headers: {
    Authorization: `Bearer ${auth.token}`
  }
})

const projects = computed(() => data.value || [])
</script>

<template>
  <div class="flex" style="height: 80vh;">
    <div class="w-1∕2 p-10">
      <h1 class="text-2xl font-bold mb-4">Liste des projets</h1>
      <ul v-if="projects" class="list-disc pl-5">
        <li v-for="project in projects" :key="project.id" class="mb-2">
          <div class="flex flex-wrap justify-between">
            <h2><strong>{{ project.name }}</strong> - {{ project.type.name }}</h2>

            <nav class="flex flex-wrap">
              <NuxtLink :to="{ path:`/projets/projet-${project.slug }`}" class="px-2">
                <PencilIcon class="w-4 h-4 link" />
              </NuxtLink>
              <NuxtLink :to="{ path:`/projets/voir-${project.slug }`}" class="px-2">
                <EyeIcon class="w-4 h-4 link" />
              </NuxtLink>
              <NuxtLink :to="{ path:`/projets/modifier-${project.slug }`}"class="px-2">
                <WrenchIcon class="w-4 h-4 link"/>
              </NuxtLink>
            </nav>
          </div>

          <i v-html="project.description.slice(0, 200)+'...'"></i>
        </li>
      </ul>
      <p v-else>Chargement...</p>
    </div>

    <div class="w-1∕2">
      <img src="/public/images/tete-de-mort-et-coq.webp" class="w-full h-full object-cover" alt="Tana le Kompagnon idéal">
    </div>

  </div>
</template>

<style scoped>
.container {
  max-width: 600px;
  margin: 0 auto;
  padding: 20px;
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
