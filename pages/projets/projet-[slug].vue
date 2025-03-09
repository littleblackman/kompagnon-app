<script setup>
import { useRoute } from 'vue-router';
import { useAuthStore } from '~/store/auth';
import { ref, computed, watch, onMounted } from "vue";
import { StarIcon } from "@heroicons/vue/24/solid/index.js";

const auth = useAuthStore();
const route = useRoute();
const slug = route.params.slug;

const data = ref(null);
const pending = ref(true);
const error = ref(null);

const metadata = ref(null);
const metadataPending = ref(true);
const metadataError = ref(null);

const criterias = ref([]);
const personnages = ref([]);
const status = ref([]);

const fetchMetadata = async () => {
  try {
    metadataPending.value = true;
    const metadataResponse = await fetch(`http://localhost:8000/api/metadata`, {
      headers: {
        Authorization: `Bearer ${auth.token}`
      }
    });
    if(!metadataResponse.ok) {
      throw new Error(`Erreur ${metadataResponse.status}: ${metadataResponse.statusText}`);
    }
    metadata.value = await metadataResponse.json();
  } catch (err) {
    metadataError.value = err.message;
  } finally {
    metadataPending.value = false;
  }
};

// Récupération des données du projet
const fetchProject = async () => {
  try {
    pending.value = true;
    const response = await fetch(`http://localhost:8000/api/project/${slug}`, {
      headers: {
        Authorization: `Bearer ${auth.token}`
      }
    });

    if (!response.ok) {
      throw new Error(`Erreur ${response.status}: ${response.statusText}`);
    }
    data.value = await response.json();
  } catch (err) {
    error.value = err.message;
  } finally {
    pending.value = false;
  }
};

onMounted(() => {
  fetchProject();
  fetchMetadata();
});

const project = computed(() => data.value || null);
const metadatas = computed(() => metadata.value || null);

watch(metadatas, (newValue) => {
  if(newValue) {
    personnages.value = newValue.personnages;
    criterias.value = newValue.criterias;
    status.value = newValue.status;
  }
});

// show personnage inline for a sequence
const showPersonnages = (sequencePersonnages) => {
  if (!sequencePersonnages || !Array.isArray(sequencePersonnages)) {
    return 'Aucun personnage';
  }

  return sequencePersonnages
      .filter(sp => sp.personnage)
      .map(sp => `${sp.personnage.firstName} ${sp.personnage.lastName}`)
      .join(', ') || 'Aucun personnage';
};


// get the rating of a criteria for a sequence
const getCriteriaRating = (partId, sequenceId, criteriaId) => {
  const part = project.value.parts.find(p => p.id === partId);
  const sequence = part.sequences.find(s => s.id === sequenceId);
  const sequenceCriterias = sequence.sequenceCriterias;
  if (!sequenceCriterias) {
    return 0;
  }
  const sequenceCriteria = sequenceCriterias.find(sc => sc.id === criteriaId);
  if(!sequenceCriteria) {
    return 0
  }
  return sequenceCriteria.rating;
};
</script>

<template>
  <div v-if="pending">Chargement...</div>
  <div v-else-if="error">Erreur : {{ error }}</div>
  <div v-else-if="project">
    <h1 class="font-extrabold text-3xl">{{ project.name }}</h1>
    <p v-html="project.description" class="italic mb-10"></p>

    <ul class="mt-6">
      <li v-for="part in project.parts" :key="part.id">
        <h2 class="font-bold text-2xl">{{ part.name }}</h2>
        <hr class="border-2" />
        <p v-html="part.description"></p>

        <ul class="">
          <li v-for="sequence in part.sequences" :key="sequence.id" class="pl-6 pr-3 pt-6 pb-6" style="background-color: white">
            <h3 class="font-bold">{{ sequence.name }}</h3>

            <div class="flex">

              <div class="text-justify w-3/4 mr-3">
                <div class="bg-primary">
                  <i>Personnages: {{ showPersonnages(sequence.sequencePersonnages)}}</i>
                </div>
                <p v-html="sequence.description"></p>
              </div>

              <div>

                <table class="w-full border-collapse">
                  <tbody>
                  <tr v-for="criteria in criterias" :key="criteria.id">
                    <td class="text-xs p-2 align-top w-[100px] break-words">
                      {{ criteria.name }}
                    </td>
                    <td class="p-2">
                      <div class="flex items-center whitespace-nowrap">
                      <span v-for="n in 10" :key="n">
                        <StarIcon
                            class="w-4 h-4"
                            :class="n <= getCriteriaRating(part.id, sequence.id, criteria.id) ? 'text-yellow-500' : 'text-gray-200'"
                        />
                      </span>
                      </div>
                    </td>
                  </tr>
                  </tbody>
                </table>

              </div>
            </div>



          </li>
        </ul>
      </li>
    </ul>
  </div>
</template>

<style scoped>
h1, h2, h3, h4, h5, h6 {
  margin-top: 20px;
}
</style>
