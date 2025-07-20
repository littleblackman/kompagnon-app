<script setup>
import { useRoute } from 'vue-router';
import { useAuthStore } from '~/store/auth';
import { useProjectStore } from '~/store/project';
import { onMounted, computed } from "vue";
import ProjectSubMenu from "@/components/Project/SubMenu.vue";
import ProjectForm from '@/components/ProjectForm.vue';

definePageMeta({
  middleware: 'auth'
})

const auth = useAuthStore();
auth.requireAuth();

const projectStore = useProjectStore();
const route = useRoute();
const slug = route.params.slug;

// Charger le projet au montage
onMounted(() => projectStore.fetchProject(slug));
const project = computed(() => projectStore.project);
</script>

<template>
  <div v-if="!project">Chargement...</div>
  <div v-else>
    <ProjectSubMenu :project-slug="slug" />
    <div class="flex" style="height: 60vh;">
      
      <ProjectForm 
        :is-edit="true"
        :project="project"
      />
      
      <!-- Colonne image -->
      <div class="w-1/2 h-screen overflow-hidden" style="height: 92vh;">
        <img src="/images/tana.jpg"
             class="w-full h-full object-cover"
             alt="Tana le Kompagnon idéal">
      </div>
      
    </div>
  </div>
</template>