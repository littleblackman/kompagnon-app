<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useProjectStore } from '~/store/project';
import { useMetadataStore } from '~/store/metadata';
import RichTextEditor from '@/components/RichTextEditor.vue';
import { TrashIcon } from '@heroicons/vue/24/solid';

interface Props {
  isEdit: boolean;
  project?: {
    id: number;
    name: string;
    description: string;
    type: { id: number; name: string; };
    slug: string;
  };
}

const props = defineProps<Props>();
const router = useRouter();
const projectStore = useProjectStore();
const metadataStore = useMetadataStore();

// Charger les métadonnées au montage
onMounted(() => {
  if (!metadataStore.loaded) {
    metadataStore.fetchMetadata();
  }
});

const types = computed(() => metadataStore.types);

// Données du formulaire
const formData = ref({
  name: props.project?.name || '',
  description: props.project?.description || '',
  type_id: props.project?.type?.id || null
});

const isLoading = ref(false);
const errorMessage = ref('');
const isDeleting = ref(false);

// Soumission du formulaire
const submitForm = async () => {
  if (!formData.value.name || !formData.value.type_id) {
    errorMessage.value = 'Veuillez remplir tous les champs obligatoires';
    return;
  }

  isLoading.value = true;
  errorMessage.value = '';

  try {
    let result;
    
    if (props.isEdit && props.project?.id) {
      // Mise à jour
      result = await projectStore.updateProject({
        id: props.project.id,
        ...formData.value
      });
    } else {
      // Création
      result = await projectStore.createProject(formData.value);
    }

    // Redirection après succès
    if (result.slug) {
      router.push(`/projets/projet-${result.slug}`);
    }
  } catch (error) {
    console.error('Erreur lors de la sauvegarde:', error);
    errorMessage.value = 'Erreur lors de la sauvegarde du projet';
  } finally {
    isLoading.value = false;
  }
};

// Fonction de suppression
const deleteProject = async () => {
  if (!props.project?.id) return;
  
  const confirmDelete = confirm('Êtes-vous sûr de vouloir supprimer ce projet ? Cette action est irréversible.');
  if (!confirmDelete) return;

  isDeleting.value = true;
  errorMessage.value = '';

  try {
    await projectStore.deleteProject(props.project.id);
    
    // Redirection après suppression
    router.push('/projets/tous');
  } catch (error) {
    console.error('Erreur lors de la suppression:', error);
    errorMessage.value = 'Erreur lors de la suppression du projet';
  } finally {
    isDeleting.value = false;
  }
};
</script>

<template>
  <div class="w-1/2 flex flex-col items-center p-6">
    <h1 class="text-2xl font-bold mb-6">
      {{ isEdit ? 'Paramètres' : 'Créer un nouveau projet' }}
    </h1>

    <form @submit.prevent="submitForm" class="w-full">
      <!-- Nom et Type sur la même ligne -->
      <div class="grid grid-cols-2 gap-4">
        <div>
          <label for="name" class="block text-sm font-medium text-gray-700 mb-2">
            Nom *
          </label>
          <input
            id="name"
            v-model="formData.name"
            type="text"
            required
            class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-amber-500 focus:border-amber-500"
            placeholder="Nom"
          />
        </div>

        <div>
          <label for="type" class="block text-sm font-medium text-gray-700 mb-2">
            Type *
          </label>
          <select
            id="type"
            v-model="formData.type_id"
            required
            class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-amber-500 focus:border-amber-500"
          >
            <option value="">Sélectionnez un type</option>
            <option v-for="type in types" :key="type.id" :value="type.id">
              {{ type.name }}
            </option>
          </select>
        </div>
      </div>

      <!-- Description -->
      <div>
        <label for="description" class="block text-sm font-medium text-gray-700 mb-2">
          Description
        </label>
        <RichTextEditor
          v-model="formData.description"
          placeholder="Décrivez votre projet..."
          :height="120"
        />
      </div>

      <!-- Message d'erreur -->
      <div v-if="errorMessage" class="text-red-600 text-sm">
        {{ errorMessage }}
      </div>

      <!-- Boutons -->
      <div class="flex gap-4">
        <button
          type="submit"
          :disabled="isLoading"
          class="flex-1 bg-amber-600 text-white py-2 px-4 rounded-md hover:bg-amber-700 focus:outline-none focus:ring-2 focus:ring-amber-500 disabled:opacity-50"
        >
          {{ isLoading ? 'Sauvegarde...' : (isEdit ? 'Mettre à jour' : 'Créer le projet') }}
        </button>
        
        <button
          v-if="isEdit && project?.id"
          type="button"
          @click="deleteProject"
          :disabled="isDeleting"
          class="flex items-center gap-2 bg-red-600 text-white py-2 px-4 rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 disabled:opacity-50"
        >
          <TrashIcon class="w-4 h-4" />
          {{ isDeleting ? 'Suppression...' : 'Supprimer' }}
        </button>
      </div>
    </form>
  </div>
</template>

<style scoped>
/* Styles additionnels si nécessaire */
</style>