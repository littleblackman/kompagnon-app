<script setup lang="ts">
import { useRoute } from 'vue-router';
import { useAuthStore } from '~/store/auth';
import { useProjectStore } from '~/store/project';
import { onMounted, computed } from "vue";
import PartList from "@/components/Project/PartList.vue";

const auth = useAuthStore();
auth.requireAuth();

const projectStore = useProjectStore();
const route = useRoute();
const slug = route.params.slug;

// ✅ Charger le projet une seule fois au montage
onMounted(() => projectStore.fetchProject(slug));
const project = computed(() => projectStore.project);
const parts = computed(() => projectStore.parts);

</script>

<template>
  <div v-if="!project">Chargement...</div>
  <div v-else>
    <h1 class="font-extrabold text-3xl">{{ project.name }}</h1>
    <p v-html="project.description" class="italic mb-10"></p>

    <PartList :parts="parts" :projectId="project.id"/>
  </div>
</template>
