<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useProjectStore } from '~/store/project'
import { useMetadataStore } from '~/store/metadata'
import { useAuthStore } from '~/store/auth'
import RichTextEditor from '@/components/RichTextEditor.vue'

definePageMeta({
  middleware: 'auth'
})

const router = useRouter()
const projectStore = useProjectStore()
const metadataStore = useMetadataStore()
const authStore = useAuthStore()
const config = useRuntimeConfig()

authStore.requireAuth()

// États du formulaire
const formData = ref({
  name: '',
  description: '',
  type_id: null as number | null
})

const isLoading = ref(false)
const errorMessage = ref('')

// États de l'aide à la création
const showHelperSystem = ref(false)
const selectedGenre = ref<any>(null)
const selectedSubgenre = ref<any>(null)
const selectedNarrativeStructure = ref<any>(null)
const narrativeStructures = ref<any[]>([])
const dramaticFunctions = ref<any[]>([])
const events = ref<any[]>([])

// Charger les métadonnées
onMounted(async () => {
  if (!metadataStore.loaded) {
    await metadataStore.fetchMetadata()
  }
})

const types = computed(() => metadataStore.types)
const genres = computed(() => {
  return metadataStore.genres.map(genre => ({
    ...genre,
    icon: getGenreIcon(genre.name)
  }))
})

// Icônes de genres
const getGenreIcon = (genreName: string) => {
  const icons: Record<string, string> = {
    'Thriller': '🔪',
    'Romance': '💕',
    'Fantasy': '⚔️',
    'Science-Fiction': '🚀',
    'Mystère': '🔍',
    'Drame': '🎭',
  }
  return icons[genreName] || '📚'
}

// Sélection de genre
const selectGenre = (genre: any) => {
  selectedGenre.value = genre
  selectedSubgenre.value = null
  selectedNarrativeStructure.value = null
  events.value = []
  narrativeStructures.value = []
  dramaticFunctions.value = []
}

// Sélection de subgenre
const selectSubgenre = async (subgenre: any) => {
  selectedSubgenre.value = subgenre
  selectedNarrativeStructure.value = null
  events.value = []
  narrativeStructures.value = []

  try {
    const data: any = await $fetch(`${config.public.apiBase}/subgenre/${subgenre.id}`, {
      headers: { 'X-AUTH-TOKEN': authStore.token || '' }
    })

    narrativeStructures.value = data.narrativeStructures || []
    dramaticFunctions.value = data.dramaticFunctions || []
  } catch (error) {
    console.error('❌ Erreur lors du chargement du subgenre:', error)
  }
}

// Sélection de structure narrative
const selectNarrativeStructure = (structure: any) => {
  selectedNarrativeStructure.value = structure
  events.value = structure.events || []
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
    const result: any = await projectStore.createProject({
      name: formData.value.name,
      description: formData.value.description,
      type_id: formData.value.type_id as number
    })

    if (result?.slug) {
      router.push(`/projets/projet-${result.slug}`)
    }
  } catch (error) {
    console.error('Erreur lors de la création:', error)
    errorMessage.value = 'Erreur lors de la création du projet'
  } finally {
    isLoading.value = false
  }
}
</script>

<template>
  <div class="min-h-screen bg-gray-50">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

      <!-- Titre principal -->
      <div class="mb-8 text-center">
        <h1 class="text-4xl font-bold text-gray-900 mb-2">
          ✨ Créer un nouveau projet
        </h1>
        <p class="text-gray-600">
          Commencez par renseigner les informations de base, puis laissez-vous guider pour structurer votre récit
        </p>
      </div>

      <!-- Section 1: Formulaire de base -->
      <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-8 mb-8">
        <h2 class="text-2xl font-semibold text-gray-900 mb-6">📝 Informations du projet</h2>

        <form @submit.prevent="submitForm" class="space-y-6">
          <!-- Nom et Type sur la même ligne -->
          <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label for="name" class="block text-sm font-medium text-gray-700 mb-2">
                Nom du projet *
              </label>
              <input
                id="name"
                v-model="formData.name"
                type="text"
                required
                class="w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                placeholder="Ex: La Quête du Royaume Perdu"
              />
            </div>

            <div>
              <label for="type" class="block text-sm font-medium text-gray-700 mb-2">
                Type de projet *
              </label>
              <select
                id="type"
                v-model="formData.type_id"
                required
                class="w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
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
              Description (optionnelle)
            </label>
            <RichTextEditor
              v-model="formData.description"
              placeholder="Décrivez brièvement votre projet..."
              :height="150"
            />
          </div>

          <!-- Message d'erreur -->
          <div v-if="errorMessage" class="p-4 bg-red-50 border-l-4 border-red-500 rounded-r-lg">
            <p class="text-sm text-red-700">{{ errorMessage }}</p>
          </div>

        </form>
      </div>

      <!-- Boutons d'action -->
      <div class="flex flex-col gap-4 mb-8">
        <!-- Bouton 1: Aide à la création (toujours visible) -->
        <button
          v-if="!showHelperSystem"
          type="button"
          @click="showHelperSystem = true"
          class="w-full px-6 py-4 bg-gradient-to-r from-blue-500 to-blue-600 text-white font-semibold rounded-lg hover:from-blue-600 hover:to-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all shadow-md hover:shadow-lg"
        >
          💡 Voulez-vous un coup de main pour créer les parties du récit ?
        </button>

        <!-- Bouton 2: Créer le projet (position conditionnelle) -->
        <button
          v-if="!showHelperSystem"
          type="button"
          @click="submitForm"
          :disabled="isLoading"
          class="w-full px-8 py-3 bg-amber-600 text-white font-semibold rounded-lg hover:bg-amber-700 focus:outline-none focus:ring-2 focus:ring-amber-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {{ isLoading ? '⏳ Création en cours...' : '✨ Créer le projet' }}
        </button>
      </div>

      <!-- Section 2: Aide à la création (affichée quand showHelperSystem = true) -->
      <div v-if="showHelperSystem" class="space-y-8">
        <div class="bg-gradient-to-br from-amber-50 to-orange-50 rounded-lg shadow-sm border-2 border-amber-200 p-8">
          <div class="text-center mb-8">
            <h2 class="text-3xl font-bold text-gray-900 mb-2">
              🌳 Aide à la création de structure
            </h2>
            <p class="text-gray-600">
              Laissez-vous guider pour créer la structure narrative de votre projet
            </p>
          </div>

        <div class="space-y-6">

          <!-- Étape 1: Genre -->
          <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div class="flex items-center mb-4">
              <div class="w-10 h-10 bg-amber-500 text-white rounded-full flex items-center justify-center font-bold mr-3">
                1
              </div>
              <div>
                <h3 class="text-xl font-semibold text-gray-900">Quel genre d'histoire ?</h3>
                <p class="text-sm text-gray-500">Sélectionnez un genre</p>
              </div>
            </div>

            <div class="overflow-x-auto pb-4 -mx-6 px-6">
              <div class="flex gap-4 min-w-max">
                <button
                  v-for="genre in genres"
                  :key="genre.id"
                  @click="selectGenre(genre)"
                  type="button"
                  class="flex-shrink-0 w-48 p-6 border-2 rounded-lg hover:border-amber-500 hover:bg-amber-50 transition-all"
                  :class="selectedGenre?.id === genre.id ? 'border-amber-500 bg-amber-50' : 'border-gray-200'"
                >
                  <div class="text-4xl mb-3 text-center">{{ genre.icon }}</div>
                  <div class="font-medium text-gray-900 text-center mb-2">{{ genre.name }}</div>
                  <div class="text-xs text-gray-500 text-center line-clamp-2">{{ genre.description }}</div>
                </button>
              </div>
            </div>
          </div>

          <!-- Étape 2: Sous-genres -->
          <div v-if="selectedGenre" class="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div class="flex items-center mb-4">
              <div class="w-10 h-10 bg-amber-500 text-white rounded-full flex items-center justify-center font-bold mr-3">
                2
              </div>
              <div>
                <h3 class="text-xl font-semibold text-gray-900">Type de {{ selectedGenre.name }} ?</h3>
                <p class="text-sm text-gray-500">Choisissez un sous-genre</p>
              </div>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <button
                v-for="subgenre in selectedGenre.subgenres"
                :key="subgenre.id"
                @click="selectSubgenre(subgenre)"
                type="button"
                class="p-4 border-2 rounded-lg hover:border-amber-500 hover:bg-amber-50 transition-all text-left"
                :class="selectedSubgenre?.id === subgenre.id ? 'border-amber-500 bg-amber-50' : 'border-gray-200'"
              >
                <div class="font-medium text-gray-900">{{ subgenre.name }}</div>
                <div class="text-xs text-gray-500 mt-1">{{ subgenre.description }}</div>
              </button>
            </div>
          </div>

          <!-- Étape 3: Structures narratives -->
          <div v-if="selectedSubgenre && narrativeStructures.length > 0" class="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div class="flex items-center mb-4">
              <div class="w-10 h-10 bg-amber-500 text-white rounded-full flex items-center justify-center font-bold mr-3">
                3
              </div>
              <div>
                <h3 class="text-xl font-semibold text-gray-900">Structures narratives recommandées</h3>
                <p class="text-sm text-gray-500">Sélectionnez une structure (classées par compatibilité)</p>
              </div>
            </div>

            <div class="overflow-x-auto pb-4 -mx-6 px-6">
              <div class="flex gap-4 min-w-max">
                <button
                  v-for="structure in narrativeStructures"
                  :key="structure.id"
                  @click="selectNarrativeStructure(structure)"
                  type="button"
                  class="flex-shrink-0 w-64 p-6 border-2 rounded-lg hover:border-amber-500 hover:bg-amber-50 transition-all relative"
                  :class="selectedNarrativeStructure?.id === structure.id ? 'border-amber-500 bg-amber-50' : 'border-gray-200'"
                >
                  <!-- Badge pourcentage -->
                  <div class="absolute top-3 right-3 px-3 py-1 bg-gradient-to-r from-amber-500 to-orange-500 text-white text-sm font-bold rounded-full">
                    {{ structure.recommendedPercentage }}%
                  </div>

                  <!-- Badge "Par défaut" -->
                  <div v-if="structure.isDefault" class="absolute top-3 left-3 px-2 py-0.5 bg-blue-500 text-white text-xs font-bold rounded">
                    ⭐ Défaut
                  </div>

                  <div class="font-bold text-gray-900 mb-2 mt-2 text-center">{{ structure.name }}</div>
                  <div class="text-xs text-gray-500 text-center mb-3 line-clamp-3">{{ structure.description }}</div>
                  <div class="text-xs text-amber-600 font-medium text-center">
                    📍 {{ structure.totalBeats }} points pivots
                  </div>
                </button>
              </div>
            </div>
          </div>

          <!-- Étape 4: Événements narratifs -->
          <div v-if="selectedNarrativeStructure && events.length > 0" class="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div class="flex items-center mb-4">
              <div class="w-10 h-10 bg-blue-500 text-white rounded-full flex items-center justify-center font-bold mr-3">
                4
              </div>
              <div>
                <h3 class="text-xl font-semibold text-gray-900">Événements narratifs</h3>
                <p class="text-sm text-gray-500">
                  Structure : <strong>{{ selectedNarrativeStructure.name }}</strong>
                  • {{ events.length }} événement(s)
                </p>
              </div>
            </div>

            <!-- Description de la structure -->
            <div v-if="selectedNarrativeStructure.description" class="mb-6 p-4 bg-blue-50 border-l-4 border-blue-500 rounded-r-lg">
              <p class="text-sm text-gray-700 leading-relaxed">
                {{ selectedNarrativeStructure.description }}
              </p>
            </div>

            <div class="space-y-2">
              <div
                v-for="(event, index) in events"
                :key="event.id"
                class="p-4 rounded-lg border-2 transition-all"
                :class="event.isOptional ? 'bg-gray-50 border-gray-200' : 'bg-white border-gray-300'"
              >
                <div class="flex items-start gap-3">
                  <div class="flex-shrink-0 w-8 h-8 bg-amber-500 text-white rounded-full flex items-center justify-center text-sm font-bold">
                    {{ index + 1 }}
                  </div>
                  <div class="flex-1 min-w-0">
                    <div class="flex items-center gap-2 mb-1">
                      <div class="font-medium text-gray-900">{{ event.name }}</div>
                      <span v-if="event.isOptional" class="px-2 py-0.5 text-xs bg-amber-100 text-amber-700 rounded">
                        optionnel
                      </span>
                    </div>
                    <div class="text-sm text-gray-600">{{ event.description }}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>

        <!-- Disclaimer + Bouton Créer le projet (en bas quand l'aide est affichée) -->
        <div v-if="selectedNarrativeStructure" class="bg-blue-50 border-l-4 border-blue-500 rounded-r-lg p-6 mb-6">
          <div class="flex items-start gap-3">
            <div class="text-2xl">ℹ️</div>
            <div>
              <h3 class="font-semibold text-gray-900 mb-2">À propos de la génération automatique</h3>
              <p class="text-sm text-gray-700">
                Nous allons créer automatiquement les <strong>parties</strong> et <strong>séquences</strong> de votre récit basées sur la structure narrative <strong>{{ selectedNarrativeStructure.name }}</strong> que vous avez sélectionnée.
                Chaque événement narratif deviendra une séquence que vous pourrez ensuite développer et personnaliser.
              </p>
            </div>
          </div>
        </div>

        <!-- Bouton Créer le projet (tout en bas) -->
        <div class="flex justify-center">
          <button
            type="button"
            @click="submitForm"
            :disabled="isLoading"
            class="px-12 py-4 bg-gradient-to-r from-amber-500 to-orange-500 text-white text-lg font-bold rounded-lg hover:from-amber-600 hover:to-orange-600 focus:outline-none focus:ring-2 focus:ring-amber-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg hover:shadow-xl"
          >
            {{ isLoading ? '⏳ Création en cours...' : '✨ Créer le projet avec cette structure' }}
          </button>
        </div>
      </div>

    </div>
  </div>
</template>

<style scoped>
/* Styles additionnels si nécessaire */
</style>
