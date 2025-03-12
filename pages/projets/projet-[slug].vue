<script setup>
import { useRoute } from 'vue-router';
import { useAuthStore } from '~/store/auth';
import { ref, computed, watch, onMounted } from "vue";
import PartList from "@/components/Project/PartList.vue";

const auth = useAuthStore();
auth.requireAuth();

const route = useRoute();
const slug = route.params.slug;

const data = ref(null);
const pending = ref(true);
const error = ref(null);
const metadata = ref(null);

const fetchData = async () => {
  try {
    pending.value = true;
    const [metadataResponse, projectResponse] = await Promise.all([
      fetch(`http://localhost:8000/api/metadata`, {
        headers: { Authorization: `Bearer ${auth.token}` }
      }),
      fetch(`http://localhost:8000/api/project/${slug}`, {
        headers: { Authorization: `Bearer ${auth.token}` }
      })
    ]);

    if (!metadataResponse.ok || !projectResponse.ok) {
      throw new Error(`Erreur ${metadataResponse.status} ou ${projectResponse.status}`);
    }

    metadata.value = await metadataResponse.json();
    data.value = await projectResponse.json();
  } catch (err) {
    error.value = err.message;
  } finally {
    pending.value = false;
  }
};

onMounted(fetchData);

const project = computed(() => data.value || null);
const metadatas = computed(() => metadata.value || null);

const criterias = computed(() => metadatas.value?.criterias ?? []);
const personnages = computed(() => metadatas.value?.personnages ?? []);
const status = computed(() => metadatas.value?.status ?? []);

</script>

<template>
  <div v-if="pending">Chargement...</div>
  <div v-else-if="error">Erreur : {{ error }}</div>
  <div v-else-if="project">
    <h1 class="font-extrabold text-3xl">{{ project.name }}</h1>
    <p v-html="project.description" class="italic mb-10"></p>

    <PartList :parts="project.parts" :criterias="criterias" :status="status" :personnages="personnages" :projectId="project.id"/>

  </div>
</template>

<style scoped>
h1, h2, h3, h4, h5, h6 {
  margin-top: 20px;
}
</style>
