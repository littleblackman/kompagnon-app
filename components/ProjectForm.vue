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
const showDeleteModal = ref(false);
const deleteConfirmText = ref('');

// Soumission du formulaire
const submitForm = async () => {
  if (!formData.value.name || !formData.value.type_id) {
    errorMessage.value = 'Veuillez remplir tous les champs obligatoires';
    return;
  }

  isLoading.value = true;
  errorMessage.value = '';

  try {
    let result: any;

    if (props.isEdit && props.project?.id) {
      // Mise à jour
      result = await projectStore.updateProject({
        id: props.project.id,
        name: formData.value.name,
        description: formData.value.description,
        type_id: formData.value.type_id as number
      });
    } else {
      // Création
      result = await projectStore.createProject({
        name: formData.value.name,
        description: formData.value.description,
        type_id: formData.value.type_id as number
      });
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

// Fonction d'ouverture de la modal de suppression
const openDeleteModal = () => {
  showDeleteModal.value = true;
  deleteConfirmText.value = '';
};

// Fonction de fermeture de la modal
const closeDeleteModal = () => {
  showDeleteModal.value = false;
  deleteConfirmText.value = '';
};

// Fonction de suppression
const deleteProject = async () => {
  if (!props.project?.id) return;

  // Vérifier que l'utilisateur a tapé "SUPPRIMER"
  if (deleteConfirmText.value !== 'SUPPRIMER') {
    return;
  }

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
    closeDeleteModal();
  }
};

// Vérifier si le bouton de suppression peut être cliqué
const canDelete = computed(() => deleteConfirmText.value === 'SUPPRIMER');
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
          @click="openDeleteModal"
          class="flex items-center gap-2 bg-red-600 text-white py-2 px-4 rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500"
        >
          <TrashIcon class="w-4 h-4" />
          Supprimer le projet
        </button>
      </div>
    </form>

    <!-- Modal de confirmation de suppression -->
    <div
      v-if="showDeleteModal"
      class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      @click.self="closeDeleteModal"
    >
      <div class="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
        <!-- En-tête -->
        <div class="flex items-start gap-4 mb-4">
          <div class="flex-shrink-0 w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
            <TrashIcon class="w-6 h-6 text-red-600" />
          </div>
          <div class="flex-1">
            <h3 class="text-xl font-bold text-gray-900 mb-2">
              Supprimer le projet
            </h3>
            <p class="text-sm text-gray-600">
              {{ project?.name }}
            </p>
          </div>
        </div>

        <!-- Disclaimer -->
        <div class="bg-red-50 border-l-4 border-red-500 p-4 mb-6">
          <div class="flex items-start">
            <div class="flex-shrink-0">
              <svg class="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd" />
              </svg>
            </div>
            <div class="ml-3">
              <h4 class="text-sm font-semibold text-red-800 mb-1">
                ⚠️ Attention : Cette action est irréversible !
              </h4>
              <div class="text-sm text-red-700 space-y-1">
                <p>En supprimant ce projet, vous perdrez définitivement :</p>
                <ul class="list-disc list-inside ml-2 space-y-1">
                  <li>Toutes les <strong>parties</strong> du projet</li>
                  <li>Toutes les <strong>séquences</strong></li>
                  <li>Toutes les <strong>scènes</strong> et leur contenu</li>
                  <li>Tous les <strong>personnages</strong> associés</li>
                  <li>Toutes les données liées au projet</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        <!-- Validation par texte -->
        <div class="mb-6">
          <label for="confirmText" class="block text-sm font-medium text-gray-700 mb-2">
            Pour confirmer, tapez <span class="font-bold text-red-600">SUPPRIMER</span> ci-dessous :
          </label>
          <input
            id="confirmText"
            v-model="deleteConfirmText"
            type="text"
            class="w-full px-3 py-2 border-2 border-gray-300 rounded-md focus:outline-none focus:border-red-500"
            placeholder="Tapez SUPPRIMER"
            @keyup.enter="canDelete && deleteProject()"
          />
        </div>

        <!-- Message d'erreur -->
        <div v-if="errorMessage" class="mb-4 text-red-600 text-sm">
          {{ errorMessage }}
        </div>

        <!-- Boutons d'action -->
        <div class="flex gap-3">
          <button
            type="button"
            @click="closeDeleteModal"
            :disabled="isDeleting"
            class="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500 disabled:opacity-50"
          >
            Annuler
          </button>
          <button
            type="button"
            @click="deleteProject"
            :disabled="!canDelete || isDeleting"
            class="flex-1 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed font-semibold"
          >
            {{ isDeleting ? 'Suppression en cours...' : 'Supprimer définitivement' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Styles additionnels si nécessaire */
</style>