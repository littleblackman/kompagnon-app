<template>
  <div>
    <SubMenu :project-slug="projectSlug" />

    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div class="mb-8">
        <h1 class="text-3xl font-bold text-gray-900 mb-2">
          🌳 Aide à la création de structure
        </h1>
        <p class="text-gray-600">
          Laissez-vous guider pour créer la structure narrative de votre projet
        </p>
      </div>

      <!-- Workflow en étapes -->
      <div class="space-y-6">

        <!-- Étape 1: Genre (Scroll horizontal) -->
        <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div class="flex items-center mb-4">
            <div class="w-10 h-10 bg-amber-500 text-white rounded-full flex items-center justify-center font-bold mr-3">
              1
            </div>
            <div>
              <h2 class="text-xl font-semibold text-gray-900">Quel genre d'histoire ?</h2>
              <p class="text-sm text-gray-500">Sélectionnez un genre</p>
            </div>
          </div>

          <div class="overflow-x-auto pb-4 -mx-6 px-6">
            <div class="flex gap-4 min-w-max">
              <button
                v-for="genre in genres"
                :key="genre.id"
                @click="selectGenre(genre)"
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

        <!-- Étape 2: Sous-genres (visible si genre sélectionné) -->
        <div v-if="selectedGenre" class="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div class="flex items-center mb-4">
            <div class="w-10 h-10 bg-amber-500 text-white rounded-full flex items-center justify-center font-bold mr-3">
              2
            </div>
            <div>
              <h2 class="text-xl font-semibold text-gray-900">Type de {{ selectedGenre.name }} ?</h2>
              <p class="text-sm text-gray-500">Choisissez un sous-genre</p>
            </div>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <button
              v-for="subgenre in selectedGenre.subgenres"
              :key="subgenre.id"
              @click="selectSubgenre(subgenre)"
              class="p-4 border-2 rounded-lg hover:border-amber-500 hover:bg-amber-50 transition-all text-left"
              :class="selectedSubgenre?.id === subgenre.id ? 'border-amber-500 bg-amber-50' : 'border-gray-200'"
            >
              <div class="font-medium text-gray-900">{{ subgenre.name }}</div>
              <div class="text-xs text-gray-500 mt-1">{{ subgenre.description }}</div>
            </button>
          </div>
        </div>

        <!-- Étape 3: Structures narratives (Scroll horizontal) -->
        <div v-if="selectedSubgenre && narrativeStructures.length > 0" class="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div class="flex items-center mb-4">
            <div class="w-10 h-10 bg-amber-500 text-white rounded-full flex items-center justify-center font-bold mr-3">
              3
            </div>
            <div>
              <h2 class="text-xl font-semibold text-gray-900">Structures narratives recommandées</h2>
              <p class="text-sm text-gray-500">Sélectionnez une structure (classées par compatibilité)</p>
            </div>
          </div>

          <div class="overflow-x-auto pb-4 -mx-6 px-6">
            <div class="flex gap-4 min-w-max">
              <button
                v-for="structure in narrativeStructures"
                :key="structure.id"
                @click="selectNarrativeStructure(structure)"
                class="flex-shrink-0 w-64 p-6 border-2 rounded-lg hover:border-amber-500 hover:bg-amber-50 transition-all relative"
                :class="selectedNarrativeStructure?.id === structure.id ? 'border-amber-500 bg-amber-50' : 'border-gray-200'"
              >
                <!-- Badge pourcentage -->
                <div class="absolute top-3 right-3 px-3 py-1 bg-gradient-to-r from-amber-500 to-orange-500 text-white text-sm font-bold rounded-full">
                  {{ structure.recommendedPercentage }}%
                </div>

                <!-- Badge "Par défaut" si isDefault -->
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

        <!-- Étape 4: Événements narratifs de la structure sélectionnée -->
        <div v-if="selectedNarrativeStructure && events.length > 0" class="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div class="flex items-center mb-4">
            <div class="w-10 h-10 bg-blue-500 text-white rounded-full flex items-center justify-center font-bold mr-3">
              4
            </div>
            <div>
              <h2 class="text-xl font-semibold text-gray-900">Événements narratifs</h2>
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

        <!-- Bouton de génération -->
        <div v-if="selectedNarrativeStructure" class="bg-gradient-to-r from-amber-50 to-orange-50 rounded-lg border-2 border-amber-200 p-6">
          <div class="text-center">
            <h3 class="text-xl font-semibold text-gray-900 mb-2">Prêt à générer votre structure ?</h3>
            <p class="text-gray-600 mb-6">
              Basé sur vos choix, nous allons créer automatiquement :
            </p>
            <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6 text-left">
              <div class="bg-white rounded-lg p-4">
                <div class="font-medium text-gray-900 mb-1">📚 Structure narrative</div>
                <div class="text-sm text-gray-600">Parts et séquences organisées</div>
              </div>
              <div class="bg-white rounded-lg p-4">
                <div class="font-medium text-gray-900 mb-1">👥 Personnages essentiels</div>
                <div class="text-sm text-gray-600">Fonctions dramatiques assignées</div>
              </div>
              <div class="bg-white rounded-lg p-4">
                <div class="font-medium text-gray-900 mb-1">🎬 Événements clés</div>
                <div class="text-sm text-gray-600">Moments de bascule positionnés</div>
              </div>
            </div>
            <button
              @click="generateStructure"
              :disabled="isGenerating"
              class="px-8 py-3 bg-amber-500 text-white font-semibold rounded-lg hover:bg-amber-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <span v-if="isGenerating">⏳ Génération en cours...</span>
              <span v-else>✨ Générer la structure</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useMetadataStore } from '~/store/metadata'
import { useAuthStore } from '~/store/auth'
import SubMenu from '~/components/Project/SubMenu.vue'

const route = useRoute()
const router = useRouter()
const metadataStore = useMetadataStore()
const authStore = useAuthStore()
const config = useRuntimeConfig()
const projectSlug = computed(() => route.params.slug as string)

// États
const isGenerating = ref(false)
const selectedGenre = ref<any>(null)
const selectedSubgenre = ref<any>(null)
const selectedNarrativeStructure = ref<any>(null)

// Données calculées depuis metadata avec icônes
const genres = computed(() => {
  console.log('🔍 DEBUG genres from store:', metadataStore.genres)
  return metadataStore.genres.map(genre => ({
    ...genre,
    icon: getGenreIcon(genre.name)
  }))
})
const events = ref<any[]>([])
const narrativeStructures = ref<any[]>([])
const dramaticFunctions = ref<any[]>([])

// Méthodes
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

const selectGenre = (genre: any) => {
  selectedGenre.value = genre
  selectedSubgenre.value = null
  selectedNarrativeStructure.value = null
  events.value = []
  narrativeStructures.value = []
  dramaticFunctions.value = []
}

const selectSubgenre = async (subgenre: any) => {
  selectedSubgenre.value = subgenre
  selectedNarrativeStructure.value = null
  events.value = []
  narrativeStructures.value = []

  console.log(`📋 Subgenre "${subgenre.name}" sélectionné (ID: ${subgenre.id})`)

  try {
    // Charger les données du subgenre depuis l'API avec authentification
    const data: any = await $fetch(`${config.public.apiBase}/subgenre/${subgenre.id}`, {
      headers: { 'X-AUTH-TOKEN': authStore.token || '' }
    })

    // Stocker les structures narratives (déjà triées par % décroissant côté API)
    narrativeStructures.value = data.narrativeStructures || []

    // Stocker les dramatic functions
    dramaticFunctions.value = data.dramaticFunctions || []

    console.log(`✅ ${narrativeStructures.value.length} structures narratives chargées`)
    console.log(`✅ ${dramaticFunctions.value.length} fonctions dramatiques chargées`)

  } catch (error) {
    console.error('❌ Erreur lors du chargement du subgenre:', error)
  }
}

const selectNarrativeStructure = (structure: any) => {
  selectedNarrativeStructure.value = structure

  console.log('\n=== SÉLECTION STRUCTURE ===')
  console.log('Structure:', structure.name, `(${structure.recommendedPercentage}%)`)

  // Les events sont déjà dans la structure depuis l'API
  events.value = structure.events || []

  console.log(`📋 ${events.value.length} événements chargés`)
  console.log('Ordre:', events.value.map(e => `${e.position}. ${e.name}${e.isOptional ? ' (opt)' : ''}`))
  console.log('=== FIN ===\n')
}

const generateStructure = async () => {
  isGenerating.value = true

  try {
    // TODO: Appel API pour générer la structure
    await new Promise(resolve => setTimeout(resolve, 2000)) // Simulation

    // Rediriger vers la page d'écriture
    router.push(`/projets/projet-${projectSlug.value}`)
  } catch (error) {
    console.error('Erreur lors de la génération:', error)
  } finally {
    isGenerating.value = false
  }
}

onMounted(async () => {
  console.log('🚀 Page montée, metadata loaded?', metadataStore.loaded)
  console.log('🚀 Genres au montage:', metadataStore.genres.length)

  // Attendre que les metadata soient chargées si ce n'est pas déjà fait
  if (!metadataStore.loaded) {
    console.log('⏳ Chargement des metadata...')
    await metadataStore.fetchMetadata()
    console.log('✅ Metadata chargées, genres:', metadataStore.genres.length)
  }
})
</script>

<style scoped>
/* Styles spécifiques si nécessaire */
</style>
