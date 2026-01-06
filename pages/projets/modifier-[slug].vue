<script setup lang="ts">
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '~/store/auth'
import { useProjectStore } from '~/store/project'
import { useMetadataStore } from '~/store/metadata'
import { onMounted, computed, ref } from 'vue'
import ProjectSubMenu from '@/components/Project/SubMenu.vue'
import RichTextEditor from '@/components/RichTextEditor.vue'
import { TrashIcon } from '@heroicons/vue/24/solid'

definePageMeta({
  middleware: 'auth'
})

const auth = useAuthStore()
auth.requireAuth()

const projectStore = useProjectStore()
const metadataStore = useMetadataStore()
const route = useRoute()
const router = useRouter()
const slug = route.params.slug as string
const config = useRuntimeConfig()
const authStore = useAuthStore()

// Charger le projet et les métadonnées au montage
onMounted(async () => {
  await projectStore.fetchProject(slug)
  if (!metadataStore.loaded) {
    await metadataStore.fetchMetadata()
  }

  // Initialiser le formulaire avec les données du projet
  if (project.value) {
    formData.value = {
      name: project.value.name || '',
      description: project.value.description || '',
      type_id: project.value.type?.id || null,
      genre_id: project.value.referenceNarrativeComponents?.genre_id || null,
      subgenre_id: project.value.referenceNarrativeComponents?.subgenre_id || null,
      narrative_structure_id: project.value.referenceNarrativeComponents?.narrative_structure_id || null
    }

    // Charger les structures narratives si un sous-genre est déjà sélectionné
    if (formData.value.subgenre_id) {
      await loadNarrativeStructures(formData.value.subgenre_id)
    }
  }
})

const project = computed(() => projectStore.project)
const types = computed(() => metadataStore.types)
const genres = computed(() => metadataStore.genres)
const subgenres = computed(() => {
  if (!formData.value.genre_id) return []
  const genre = metadataStore.genres.find(g => g.id === formData.value.genre_id)
  return genre?.subgenres || []
})

// État pour les structures narratives chargées depuis l'API
const narrativeStructures = ref<any[]>([])

// Charger les structures narratives quand le sous-genre change
const loadNarrativeStructures = async (subgenreId: number) => {
  try {
    const data: any = await $fetch(`${config.public.apiBase}/subgenre/${subgenreId}`, {
      headers: { 'X-AUTH-TOKEN': authStore.token || '' }
    })
    narrativeStructures.value = data.narrativeStructures || []
  } catch (error) {
    console.error('Erreur lors du chargement des structures narratives:', error)
    narrativeStructures.value = []
  }
}

// Données du formulaire
const formData = ref({
  name: '',
  description: '',
  type_id: null as number | null,
  genre_id: null as number | null,
  subgenre_id: null as number | null,
  narrative_structure_id: null as number | null
})

const isLoading = ref(false)
const errorMessage = ref('')
const isDeleting = ref(false)
const showDeleteModal = ref(false)
const deleteConfirmText = ref('')

// Gestion du changement de genre
const onGenreChange = () => {
  formData.value.subgenre_id = null
  formData.value.narrative_structure_id = null
  narrativeStructures.value = []
}

// Gestion du changement de sous-genre
const onSubgenreChange = async () => {
  formData.value.narrative_structure_id = null
  if (formData.value.subgenre_id) {
    await loadNarrativeStructures(formData.value.subgenre_id)
  } else {
    narrativeStructures.value = []
  }
}

// Soumission du formulaire
const submitForm = async () => {
  if (!formData.value.name || !formData.value.type_id) {
    errorMessage.value = 'Veuillez remplir tous les champs obligatoires'
    return
  }

  isLoading.value = true
  errorMessage.value = ''

  try {
    const updateData: any = {
      id: project.value?.id,
      name: formData.value.name,
      description: formData.value.description,
      type_id: formData.value.type_id as number
    }

    // Ajouter les références narratives si elles existent
    if (formData.value.genre_id) {
      updateData.genre_id = formData.value.genre_id
    }
    if (formData.value.subgenre_id) {
      updateData.subgenre_id = formData.value.subgenre_id
    }
    if (formData.value.narrative_structure_id) {
      updateData.narrative_structure_id = formData.value.narrative_structure_id
    }

    const result = await projectStore.updateProject(updateData)

    if (result?.slug) {
      router.push(`/projets/projet-${result.slug}`)
    }
  } catch (error) {
    console.error('Erreur lors de la sauvegarde:', error)
    errorMessage.value = 'Erreur lors de la sauvegarde du projet'
  } finally {
    isLoading.value = false
  }
}

// Fonctions de suppression
const openDeleteModal = () => {
  showDeleteModal.value = true
  deleteConfirmText.value = ''
}

const closeDeleteModal = () => {
  showDeleteModal.value = false
  deleteConfirmText.value = ''
}

const deleteProject = async () => {
  if (!project.value?.id) return

  if (deleteConfirmText.value !== 'SUPPRIMER') {
    return
  }

  isDeleting.value = true
  errorMessage.value = ''

  try {
    await projectStore.deleteProject(project.value.id)
    router.push('/projets/tous')
  } catch (error) {
    console.error('Erreur lors de la suppression:', error)
    errorMessage.value = 'Erreur lors de la suppression du projet'
  } finally {
    isDeleting.value = false
    closeDeleteModal()
  }
}

const canDelete = computed(() => deleteConfirmText.value === 'SUPPRIMER')
</script>

<template>
  <div v-if="!project">
    <ProjectSubMenu :project-slug="slug" />
    <div class="max-w-4xl mx-auto p-8">
      <p class="text-gray-600">Chargement...</p>
    </div>
  </div>
  <div v-else>
    <ProjectSubMenu :project-slug="slug" />
    <div class="max-w-4xl mx-auto p-8">
      <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
        <h1 class="text-3xl font-bold text-gray-900 mb-2">Paramètres du projet</h1>
        <p class="text-gray-600 mb-8">Modifiez les informations de votre projet</p>

        <form @submit.prevent="submitForm" class="space-y-6">
          <!-- Nom du projet -->
          <div>
            <label for="name" class="block text-sm font-medium text-gray-700 mb-2">
              Nom du projet *
            </label>
            <input
              id="name"
              v-model="formData.name"
              type="text"
              required
              class="w-full px-4 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
              placeholder="Nom de votre projet"
            />
          </div>

          <!-- Type -->
          <div>
            <label for="type" class="block text-sm font-medium text-gray-700 mb-2">
              Type de projet *
            </label>
            <select
              id="type"
              v-model="formData.type_id"
              required
              class="w-full px-4 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
            >
              <option :value="null">Sélectionnez un type</option>
              <option v-for="type in types" :key="type.id" :value="type.id">
                {{ type.name }}
              </option>
            </select>
          </div>

          <!-- Description -->
          <div>
            <label for="description" class="block text-sm font-medium text-gray-700 mb-2">
              Description
            </label>
            <RichTextEditor
              v-model="formData.description"
              placeholder="Décrivez votre projet..."
              :height="150"
            />
          </div>

          <!-- Section Composantes narratives de référence -->
          <div class="border-t border-gray-200 pt-6 mt-8">
            <h2 class="text-lg font-semibold text-gray-900 mb-4">
              Composantes narratives de référence
            </h2>
            <p class="text-sm text-gray-600 mb-6">
              Ces éléments constituent le cadre de référence de votre projet. Ils peuvent être modifiés ici.
            </p>

            <!-- Genre -->
            <div class="mb-4">
              <label for="genre" class="block text-sm font-medium text-gray-700 mb-2">
                Genre
              </label>
              <select
                id="genre"
                v-model="formData.genre_id"
                @change="onGenreChange"
                class="w-full px-4 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
              >
                <option :value="null">Aucun genre sélectionné</option>
                <option v-for="genre in genres" :key="genre.id" :value="genre.id">
                  {{ genre.name }}
                </option>
              </select>
            </div>

            <!-- Sous-genre -->
            <div v-if="formData.genre_id && subgenres.length > 0" class="mb-4">
              <label for="subgenre" class="block text-sm font-medium text-gray-700 mb-2">
                Sous-genre
              </label>
              <select
                id="subgenre"
                v-model="formData.subgenre_id"
                @change="onSubgenreChange"
                class="w-full px-4 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
              >
                <option :value="null">Aucun sous-genre sélectionné</option>
                <option v-for="subgenre in subgenres" :key="subgenre.id" :value="subgenre.id">
                  {{ subgenre.name }}
                </option>
              </select>
            </div>

            <!-- Structure narrative -->
            <div v-if="formData.subgenre_id && narrativeStructures.length > 0" class="mb-4">
              <label for="narrative_structure" class="block text-sm font-medium text-gray-700 mb-2">
                Structure narrative
              </label>
              <select
                id="narrative_structure"
                v-model="formData.narrative_structure_id"
                class="w-full px-4 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
              >
                <option :value="null">Aucune structure narrative sélectionnée</option>
                <option v-for="structure in narrativeStructures" :key="structure.id" :value="structure.id">
                  {{ structure.name }}
                </option>
              </select>
            </div>
          </div>

          <!-- Message d'erreur -->
          <div v-if="errorMessage" class="bg-red-50 border border-red-200 rounded-lg p-4">
            <p class="text-red-800 text-sm">{{ errorMessage }}</p>
          </div>

          <!-- Boutons -->
          <div class="flex gap-4 pt-6">
            <button
              type="submit"
              :disabled="isLoading"
              class="flex-1 bg-amber-600 text-white py-3 px-6 rounded-lg hover:bg-amber-700 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed font-medium transition-colors"
            >
              {{ isLoading ? 'Sauvegarde en cours...' : 'Mettre à jour le projet' }}
            </button>

            <button
              type="button"
              @click="openDeleteModal"
              class="flex items-center justify-center gap-2 bg-red-600 text-white py-3 px-6 rounded-lg hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 font-medium transition-colors"
            >
              <TrashIcon class="w-5 h-5" />
              Supprimer
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- Modal de confirmation de suppression -->
    <div
      v-if="showDeleteModal"
      class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      @click.self="closeDeleteModal"
    >
      <div class="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
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
                  <li>Toutes les <strong>parties</strong></li>
                  <li>Toutes les <strong>séquences</strong></li>
                  <li>Toutes les <strong>scènes</strong> et leur contenu</li>
                  <li>Tous les <strong>personnages</strong></li>
                  <li>Toutes les données liées</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        <div class="mb-6">
          <label for="confirmText" class="block text-sm font-medium text-gray-700 mb-2">
            Pour confirmer, tapez <span class="font-bold text-red-600">SUPPRIMER</span> :
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

        <div v-if="errorMessage" class="mb-4 text-red-600 text-sm">
          {{ errorMessage }}
        </div>

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
            {{ isDeleting ? 'Suppression...' : 'Supprimer' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Styles additionnels si nécessaire */
</style>
