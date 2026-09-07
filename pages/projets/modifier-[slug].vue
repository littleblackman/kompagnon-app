<script setup lang="ts">
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '~/store/auth'
import { useProjectStore } from '~/store/project'
import { useMetadataStore } from '~/store/metadata'
import { onMounted, computed, ref } from 'vue'
import ProjectSubMenu from '@/components/Project/SubMenu.vue'
import RichTextEditor from '@/components/RichTextEditor.vue'
import { TrashIcon } from '@heroicons/vue/24/solid'
import { useConfirm } from '~/composables/useConfirm'

const { confirm } = useConfirm()

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
const deleteProject = async () => {
  if (!project.value?.id) return

  const ok = await confirm({
    title: 'Supprimer le projet',
    message: `« ${project.value.name} » sera supprimé définitivement, avec :`,
    details: [
      'toutes les parties, séquences et scènes',
      'le contenu écrit de chaque scène',
      'tous les personnages et leurs images',
      'toutes les données liées'
    ],
    requireText: 'SUPPRIMER',
    danger: true,
    confirmLabel: 'Supprimer'
  })
  if (!ok) return

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
  }
}

// Analyse IA
const showAIAnalysisModal = ref(false)
const isAnalyzing = ref(false)
const aiAnalysisResult = ref<any>(null)
const analysisContentType = ref<'organizational' | 'full'>('organizational')

const openAIAnalysisModal = () => {
  showAIAnalysisModal.value = true
  aiAnalysisResult.value = null
}

const closeAIAnalysisModal = () => {
  showAIAnalysisModal.value = false
  aiAnalysisResult.value = null
  analysisContentType.value = 'organizational'
}

const analyzeWithAI = async () => {
  if (!project.value?.id) return

  isAnalyzing.value = true
  errorMessage.value = ''

  try {
    const result: any = await $fetch(`${config.public.apiBase}/project/${project.value.id}/analyse`, {
      method: 'POST',
      headers: {
        'X-AUTH-TOKEN': authStore.token || '',
        'Content-Type': 'application/json'
      },
      body: {
        useFullContent: analysisContentType.value === 'full'
      }
    })

    if (result.success) {
      aiAnalysisResult.value = result
    } else {
      errorMessage.value = result.message || 'Erreur lors de l\'analyse'
    }
  } catch (error) {
    console.error('Erreur lors de l\'analyse IA:', error)
    errorMessage.value = 'Erreur lors de l\'analyse IA'
  } finally {
    isAnalyzing.value = false
  }
}

const applySuggestions = async () => {
  if (!aiAnalysisResult.value || !project.value?.id) return

  isLoading.value = true
  errorMessage.value = ''

  try {
    const suggestions = aiAnalysisResult.value.suggestions

    await $fetch(`${config.public.apiBase}/project/${project.value.id}/analyse/apply`, {
      method: 'POST',
      headers: {
        'X-AUTH-TOKEN': authStore.token || '',
        'Content-Type': 'application/json'
      },
      body: {
        genreId: suggestions.genre?.id,
        subgenreId: suggestions.subgenre?.id,
        structureId: suggestions.structure?.id
      }
    })

    // Mettre à jour le formulaire local
    if (suggestions.genre) {
      formData.value.genre_id = suggestions.genre.id
    }
    if (suggestions.subgenre) {
      formData.value.subgenre_id = suggestions.subgenre.id
      await loadNarrativeStructures(suggestions.subgenre.id)
    }
    if (suggestions.structure) {
      formData.value.narrative_structure_id = suggestions.structure.id
    }

    // Recharger le projet
    await projectStore.fetchProject(slug)

    closeAIAnalysisModal()
  } catch (error) {
    console.error('Erreur lors de l\'application des suggestions:', error)
    errorMessage.value = 'Erreur lors de l\'application des suggestions'
  } finally {
    isLoading.value = false
  }
}
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
            <div class="flex items-center justify-between mb-4">
              <div>
                <h2 class="text-lg font-semibold text-gray-900">
                  Composantes narratives de référence
                </h2>
                <p class="text-sm text-gray-600 mt-1">
                  Ces éléments constituent le cadre de référence de votre projet. Ils peuvent être modifiés ici.
                </p>
              </div>
              <button
                type="button"
                @click="openAIAnalysisModal"
                class="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition-colors text-sm"
              >
                <span>✨</span>
                Analyser avec IA
              </button>
            </div>
            <div class="mb-6"></div>

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
              @click="deleteProject"
              class="flex items-center justify-center gap-2 bg-red-600 text-white py-3 px-6 rounded-lg hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 font-medium transition-colors"
            >
              <TrashIcon class="w-5 h-5" />
              Supprimer
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- Modal d'analyse IA -->
    <div
      v-if="showAIAnalysisModal"
      class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      @click.self="closeAIAnalysisModal"
    >
      <div class="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div class="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <h3 class="text-xl font-bold text-gray-900 flex items-center gap-2">
            <span>✨</span>
            Analyse IA du projet
          </h3>
          <button
            @click="closeAIAnalysisModal"
            class="text-gray-400 hover:text-gray-600 transition-colors"
          >
            ✕
          </button>
        </div>

        <div class="p-6 space-y-4">
          <!-- Choix du type de contenu -->
          <div v-if="!aiAnalysisResult">
            <label class="block text-sm font-medium text-gray-700 mb-3">
              Quel contenu analyser ?
            </label>
            <div class="space-y-2">
              <label class="flex items-start cursor-pointer p-3 rounded-lg border-2 transition-all"
                :class="analysisContentType === 'organizational' ? 'border-indigo-500 bg-indigo-50' : 'border-gray-200 hover:border-indigo-300'"
              >
                <input
                  type="radio"
                  v-model="analysisContentType"
                  value="organizational"
                  class="mt-1 mr-3 text-indigo-600"
                />
                <div>
                  <div class="font-medium text-gray-900">Notes d'organisation</div>
                  <div class="text-sm text-gray-600 mt-1">
                    Analyse uniquement les descriptions des parties et séquences (vue d'ensemble, intentions narratives)
                  </div>
                </div>
              </label>

              <label class="flex items-start cursor-pointer p-3 rounded-lg border-2 transition-all"
                :class="analysisContentType === 'full' ? 'border-indigo-500 bg-indigo-50' : 'border-gray-200 hover:border-indigo-300'"
              >
                <input
                  type="radio"
                  v-model="analysisContentType"
                  value="full"
                  class="mt-1 mr-3 text-indigo-600"
                />
                <div>
                  <div class="font-medium text-gray-900">Texte complet</div>
                  <div class="text-sm text-gray-600 mt-1">
                    Analyse le contenu complet des scènes en plus des descriptions (recommandé pour une analyse précise)
                  </div>
                </div>
              </label>
            </div>

            <button
              @click="analyzeWithAI"
              :disabled="isAnalyzing"
              class="w-full mt-4 bg-indigo-600 hover:bg-indigo-700 text-white py-3 px-6 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {{ isAnalyzing ? 'Analyse en cours...' : 'Lancer l\'analyse' }}
            </button>
          </div>

          <!-- Résultats de l'analyse -->
          <div v-if="aiAnalysisResult && aiAnalysisResult.success">
            <div class="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
              <p class="text-green-800 text-sm font-medium">✅ Analyse terminée avec succès !</p>
            </div>

            <!-- Niveau de confiance -->
            <div class="mb-4">
              <span class="text-xs font-semibold uppercase tracking-wide text-gray-600">Confiance</span>
              <div class="mt-1">
                <span
                  class="inline-block px-2 py-1 text-xs font-semibold rounded"
                  :class="{
                    'bg-green-100 text-green-800': aiAnalysisResult.confidence === 'high',
                    'bg-yellow-100 text-yellow-800': aiAnalysisResult.confidence === 'medium',
                    'bg-orange-100 text-orange-800': aiAnalysisResult.confidence === 'low'
                  }"
                >
                  {{
                    aiAnalysisResult.confidence === 'high' ? 'Élevée' :
                    aiAnalysisResult.confidence === 'medium' ? 'Moyenne' :
                    'Faible'
                  }}
                </span>
              </div>
            </div>

            <!-- Suggestions -->
            <div class="space-y-3">
              <div v-if="aiAnalysisResult.suggestions.genre" class="p-3 bg-gray-50 rounded-lg">
                <div class="text-xs font-semibold uppercase tracking-wide text-gray-600 mb-1">Genre suggéré</div>
                <div class="font-medium text-gray-900">{{ aiAnalysisResult.suggestions.genre.name }}</div>
              </div>

              <div v-if="aiAnalysisResult.suggestions.subgenre" class="p-3 bg-gray-50 rounded-lg">
                <div class="text-xs font-semibold uppercase tracking-wide text-gray-600 mb-1">Sous-genre suggéré</div>
                <div class="font-medium text-gray-900">{{ aiAnalysisResult.suggestions.subgenre.name }}</div>
                <div class="text-xs text-gray-600 mt-1">Genre: {{ aiAnalysisResult.suggestions.subgenre.genreName }}</div>
              </div>

              <div v-if="aiAnalysisResult.suggestions.structure" class="p-3 bg-gray-50 rounded-lg">
                <div class="text-xs font-semibold uppercase tracking-wide text-gray-600 mb-1">Structure narrative suggérée</div>
                <div class="font-medium text-gray-900">{{ aiAnalysisResult.suggestions.structure.name }}</div>
              </div>
            </div>

            <!-- Explication -->
            <div v-if="aiAnalysisResult.explanation" class="mt-4 p-4 bg-blue-50 border-l-4 border-blue-500">
              <div class="text-xs font-semibold uppercase tracking-wide text-blue-800 mb-2">Explication de l'IA</div>
              <p class="text-sm text-blue-900">{{ aiAnalysisResult.explanation }}</p>
            </div>

            <!-- Bouton appliquer -->
            <div class="mt-6 flex gap-3">
              <button
                @click="closeAIAnalysisModal"
                class="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Annuler
              </button>
              <button
                @click="applySuggestions"
                :disabled="isLoading"
                class="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
              >
                {{ isLoading ? 'Application...' : 'Appliquer les suggestions' }}
              </button>
            </div>
          </div>

          <!-- Erreur -->
          <div v-if="aiAnalysisResult && !aiAnalysisResult.success" class="bg-red-50 border border-red-200 rounded-lg p-4">
            <p class="text-red-800 text-sm">{{ aiAnalysisResult.message }}</p>
          </div>
        </div>
      </div>
    </div>

  </div>
</template>

<style scoped>
/* Styles additionnels si nécessaire */
</style>
