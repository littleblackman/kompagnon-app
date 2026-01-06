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
const eventsByType = ref<any[]>([])
const originalEventsByType = ref<any[]>([]) // Sauvegarde de l'ordre par défaut
const selectedCharacters = ref<any[]>([])
const expandedEventTypes = ref<Set<number>>(new Set()) // Pour gérer l'ouverture/fermeture des optionnels
const selectedEvents = ref<Set<number>>(new Set()) // Events sélectionnés (IDs)
const selectedEventTypes = ref<Set<number>>(new Set()) // EventTypes sélectionnés (IDs)

// Basculer la sélection d'un EventType (sélectionne tous les events essentiels)
const toggleEventType = (eventType: any) => {
  if (selectedEventTypes.value.has(eventType.id)) {
    // Désélectionner l'EventType et ses events essentiels
    selectedEventTypes.value.delete(eventType.id)
    eventType.events?.filter((e: any) => !e.isOptional).forEach((event: any) => {
      selectedEvents.value.delete(event.id)
    })
  } else {
    // Sélectionner l'EventType et tous ses events essentiels
    selectedEventTypes.value.add(eventType.id)
    eventType.events?.filter((e: any) => !e.isOptional).forEach((event: any) => {
      selectedEvents.value.add(event.id)
    })
  }
}

// Basculer la sélection d'un Event individuel
const toggleEvent = (eventId: number) => {
  if (selectedEvents.value.has(eventId)) {
    selectedEvents.value.delete(eventId)
  } else {
    selectedEvents.value.add(eventId)
  }
}

// Vérifier si un EventType est complètement sélectionné (tous ses events essentiels)
const isEventTypeFullySelected = (eventType: any) => {
  const essentialEvents = eventType.events?.filter((e: any) => !e.isOptional) || []
  if (essentialEvents.length === 0) return false
  return essentialEvents.every((event: any) => selectedEvents.value.has(event.id))
}

// Basculer l'affichage des événements optionnels
const toggleOptionalEvents = (eventTypeId: number) => {
  if (expandedEventTypes.value.has(eventTypeId)) {
    expandedEventTypes.value.delete(eventTypeId)
  } else {
    expandedEventTypes.value.add(eventTypeId)
  }
}

// Compter les événements optionnels d'un EventType
const countOptionalEvents = (events: any[]) => {
  return events.filter((e: any) => e.isOptional).length
}

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
    'Aventure': '🗺️',
    'Comédie': '😄',
    'Épique': '🏛️',
    'Fantastique': '🔮',
    'Historique': '📜',
    'Horreur': '👻',
    'Policier': '🚔',
    'Western': '🤠',
  }
  return icons[genreName] || '📚'
}

// Sélection de genre
const selectGenre = (genre: any) => {
  selectedGenre.value = genre
  selectedSubgenre.value = null
  selectedNarrativeStructure.value = null
  events.value = []
  eventsByType.value = []
  narrativeStructures.value = []
  dramaticFunctions.value = []
  selectedCharacters.value = []
}

// Sélection de subgenre
const selectSubgenre = async (subgenre: any) => {
  selectedSubgenre.value = subgenre
  selectedNarrativeStructure.value = null
  events.value = []
  selectedCharacters.value = []

  try {
    const data: any = await $fetch(`${config.public.apiBase}/subgenre/${subgenre.id}`, {
      headers: { 'X-AUTH-TOKEN': authStore.token || '' }
    })

    // Sauvegarder l'ordre par défaut du subgenre
    originalEventsByType.value = data.eventTypes || []
    eventsByType.value = [...originalEventsByType.value]
    dramaticFunctions.value = data.dramaticFunctions || []

    // Les narrative structures viennent du metadata store (pas du subgenre)
    narrativeStructures.value = metadataStore.narrativeStructures || []
  } catch (error) {
    console.error('❌ Erreur lors du chargement du subgenre:', error)
  }
}

// Computed: Structure narrative personnalisée organisée par sections nommées
// Format: [{sectionName: "Montée", events: [...tous les events de DISRUPTION + ESCALATION]}, ...]
const customNarrativeStructure = computed(() => {
  if (!selectedNarrativeStructure.value || selectedEvents.value.size === 0) {
    return []
  }

  const structure = selectedNarrativeStructure.value
  const narrativePartOrder = structure.narrativePartOrder || {}
  const sections: any[] = []

  // Parcourir chaque section du narrative_part_order
  // Ex: {"Montée": ["DISRUPTION", "ESCALATION"], "Bascule": ["TURN"], ...}
  Object.entries(narrativePartOrder).forEach(([sectionName, partCodes]: [string, any]) => {
    const sectionEvents: any[] = []

    // Pour chaque NarrativePart code de cette section
    if (Array.isArray(partCodes)) {
      partCodes.forEach((partCode: string) => {
        // Trouver tous les EventTypes qui appartiennent à cette NarrativePart
        const eventTypesForPart = originalEventsByType.value.filter((et: any) =>
          et.narrativePart?.code === partCode
        )

        // Collecter tous les events sélectionnés de ces EventTypes
        eventTypesForPart.forEach((eventType: any) => {
          if (eventType.events) {
            const selectedEventsForType = eventType.events.filter((event: any) =>
              selectedEvents.value.has(event.id)
            )
            sectionEvents.push(...selectedEventsForType)
          }
        })
      })
    }

    // Ajouter la section seulement si elle contient des events
    if (sectionEvents.length > 0) {
      sections.push({
        sectionName,
        narrativePartCodes: partCodes,
        events: sectionEvents
      })
    }
  })

  return sections
})

// Sélection de structure narrative
const selectNarrativeStructure = (structure: any) => {
  selectedNarrativeStructure.value = structure
}

// Gestion des personnages
const toggleCharacterForFunction = (dramaticFunction: any, characterName: string) => {
  const existingIndex = selectedCharacters.value.findIndex(
    char => char.dramaticFunctionId === dramaticFunction.id
  )

  if (existingIndex >= 0) {
    // Mettre à jour le personnage existant
    selectedCharacters.value[existingIndex].name = characterName
  } else {
    // Ajouter un nouveau personnage
    selectedCharacters.value.push({
      dramaticFunctionId: dramaticFunction.id,
      dramaticFunctionName: dramaticFunction.name,
      name: characterName,
      narrativeArcId: null
    })
  }
}

const toggleNarrativeArcForFunction = (dramaticFunctionId: number, arcId: number | null) => {
  const existingIndex = selectedCharacters.value.findIndex(
    char => char.dramaticFunctionId === dramaticFunctionId
  )

  if (existingIndex >= 0) {
    selectedCharacters.value[existingIndex].narrativeArcId = arcId
  }
}

const getCharacterForFunction = (dramaticFunctionId: number) => {
  const character = selectedCharacters.value.find(
    char => char.dramaticFunctionId === dramaticFunctionId
  )
  return character?.name || ''
}

const getNarrativeArcForFunction = (dramaticFunctionId: number) => {
  const character = selectedCharacters.value.find(
    char => char.dramaticFunctionId === dramaticFunctionId
  )
  return character?.narrativeArcId || null
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
    const projectData: any = {
      name: formData.value.name,
      description: formData.value.description,
      type_id: formData.value.type_id as number
    }

    // Ajouter les données de structure narrative si elles existent
    if (selectedGenre.value) {
      projectData.genre_id = selectedGenre.value.id
    }

    if (selectedSubgenre.value) {
      projectData.subgenre_id = selectedSubgenre.value.id
    }

    if (selectedNarrativeStructure.value) {
      projectData.narrative_structure_id = selectedNarrativeStructure.value.id

      // Ajouter les sections narratives pour créer Parts et Sequences
      if (customNarrativeStructure.value.length > 0) {
        projectData.narrativeSections = customNarrativeStructure.value.map(section => ({
          sectionName: section.sectionName,
          narrativePartCodes: section.narrativePartCodes,
          events: section.events.map((event: any) => ({
            id: event.id,
            name: event.name,
            description: event.description,
            isOptional: event.isOptional || false
          }))
        }))
      }
    }

    // Ajouter les personnages si ils existent
    if (selectedCharacters.value.length > 0) {
      projectData.characters = selectedCharacters.value.map(char => ({
        name: char.name,
        dramaticFunctionId: char.dramaticFunctionId,
        narrativeArcId: char.narrativeArcId || null
      }))
    }

    const result: any = await projectStore.createProject(projectData)

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

            <!-- Description du genre sélectionné -->
            <div v-if="selectedGenre" class="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-lg">
              <h4 class="font-semibold text-gray-900 mb-2">À propos du {{ selectedGenre.name }}</h4>
              <p class="text-sm text-gray-700">{{ selectedGenre.description }}</p>
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

          <!-- Affichage des EventTypes et Events (après sélection du sous-genre) -->
          <div v-if="selectedSubgenre && eventsByType.length > 0" class="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg border-2 border-blue-200 p-6">
            <div class="flex items-start gap-3 mb-6">
              <div class="w-10 h-10 bg-blue-500 text-white rounded-full flex items-center justify-center font-bold flex-shrink-0">
                📖
              </div>
              <div>
                <h3 class="text-xl font-semibold text-gray-900 mb-1">
                  Éléments narratifs
                  <span v-if="selectedNarrativeStructure" class="text-amber-600">
                    - {{ selectedNarrativeStructure.name }}
                  </span>
                  <span v-else class="text-gray-600">- {{ selectedSubgenre.name }}</span>
                </h3>
                <p class="text-sm text-gray-600">
                  <span v-if="selectedNarrativeStructure">
                    Ordre réorganisé selon la structure narrative sélectionnée
                  </span>
                  <span v-else>
                    Types d'événements (parties) et séquences du sous-genre
                  </span>
                </p>
              </div>
            </div>

            <div class="space-y-4">
              <div
                v-for="(eventType, index) in eventsByType"
                :key="eventType.id"
                class="bg-white rounded-lg border border-blue-200 overflow-hidden"
              >
                <!-- EventType Header -->
                <div class="bg-gradient-to-r from-blue-100 to-indigo-100 px-5 py-3 border-b border-blue-200">
                  <div class="flex items-center gap-3">
                    <div class="w-8 h-8 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0">
                      {{ index + 1 }}
                    </div>
                    <h4 class="font-bold text-gray-900 text-base flex-1">{{ eventType.name }}</h4>
                    <!-- Checkbox pour sélectionner l'EventType entier -->
                    <label class="flex items-center gap-2 cursor-pointer group">
                      <input
                        type="checkbox"
                        :checked="isEventTypeFullySelected(eventType)"
                        @change="toggleEventType(eventType)"
                        class="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-2 focus:ring-blue-500 cursor-pointer"
                      />
                      <span class="text-sm text-gray-700 group-hover:text-gray-900 font-medium">
                        Sélectionner tout
                      </span>
                    </label>
                  </div>
                </div>

                <!-- Events List -->
                <div class="p-4">
                  <ul v-if="eventType.events && eventType.events.length > 0" class="space-y-2">
                    <!-- Événements essentiels (toujours visibles) -->
                    <li
                      v-for="event in eventType.events.filter((e: any) => !e.isOptional)"
                      :key="event.id"
                      class="flex items-start gap-3 text-sm group hover:bg-blue-50 p-2 rounded-lg -mx-2 transition-colors"
                    >
                      <input
                        type="checkbox"
                        :checked="selectedEvents.has(event.id)"
                        @change="toggleEvent(event.id)"
                        class="w-4 h-4 mt-1 text-blue-600 border-gray-300 rounded focus:ring-2 focus:ring-blue-500 cursor-pointer flex-shrink-0"
                      />
                      <span class="w-1.5 h-1.5 rounded-full mt-2 flex-shrink-0 bg-blue-600"></span>
                      <div class="flex-1">
                        <div class="flex items-center gap-2">
                          <span class="font-medium text-gray-900">{{ event.name }}</span>
                          <span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-800 border border-amber-300">
                            Essentiel
                          </span>
                        </div>
                        <div v-if="event.description" class="text-xs text-gray-600 mt-0.5">
                          {{ event.description }}
                        </div>
                      </div>
                    </li>

                    <!-- Bouton pour déplier les événements optionnels -->
                    <li v-if="countOptionalEvents(eventType.events) > 0">
                      <button
                        type="button"
                        @click="toggleOptionalEvents(eventType.id)"
                        class="w-full flex items-center justify-between px-3 py-2 text-sm text-gray-600 hover:text-gray-900 bg-gray-50 hover:bg-gray-100 rounded-lg border border-gray-200 transition-colors"
                      >
                        <span class="flex items-center gap-2">
                          <svg
                            class="w-4 h-4 transition-transform"
                            :class="expandedEventTypes.has(eventType.id) ? 'rotate-90' : ''"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
                          </svg>
                          <span class="font-medium">
                            {{ expandedEventTypes.has(eventType.id) ? 'Masquer' : 'Voir' }} les suggestions optionnelles
                          </span>
                        </span>
                        <span class="text-xs bg-gray-200 px-2 py-0.5 rounded-full">
                          {{ countOptionalEvents(eventType.events) }}
                        </span>
                      </button>
                    </li>

                    <!-- Événements optionnels (dépliables) -->
                    <template v-if="expandedEventTypes.has(eventType.id)">
                      <li
                        v-for="event in eventType.events.filter((e: any) => e.isOptional)"
                        :key="event.id"
                        class="flex items-start gap-3 text-sm ml-4 pl-4 border-l-2 border-gray-200 group hover:bg-gray-50 p-2 rounded-lg -mx-2 transition-colors"
                      >
                        <input
                          type="checkbox"
                          :checked="selectedEvents.has(event.id)"
                          @change="toggleEvent(event.id)"
                          class="w-4 h-4 mt-1 text-blue-600 border-gray-300 rounded focus:ring-2 focus:ring-blue-500 cursor-pointer flex-shrink-0"
                        />
                        <span class="w-1.5 h-1.5 rounded-full mt-2 flex-shrink-0 bg-gray-400"></span>
                        <div class="flex-1">
                          <div class="flex items-center gap-2">
                            <span class="font-medium text-gray-700">{{ event.name }}</span>
                            <span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-600 border border-gray-300">
                              Optionnel
                            </span>
                          </div>
                          <div v-if="event.description" class="text-xs text-gray-600 mt-0.5">
                            {{ event.description }}
                          </div>
                        </div>
                      </li>
                    </template>
                  </ul>
                  <p v-else class="text-sm text-gray-500 italic">
                    Aucun événement défini pour ce type
                  </p>
                </div>
              </div>
            </div>

            <div class="mt-4 p-3 bg-blue-100 border border-blue-300 rounded-md">
              <p class="text-xs text-blue-800">
                💡 <span class="font-medium">Note:</span>
                <span v-if="selectedNarrativeStructure">
                  L'ordre des événements a été réorganisé selon la structure narrative <span class="font-medium">{{ selectedNarrativeStructure.name }}</span>.
                  Vous pouvez changer de structure narrative ci-dessous pour voir différents ordres.
                </span>
                <span v-else>
                  Voici les types d'événements (parties) et séquences du sous-genre <span class="font-medium">{{ selectedSubgenre.name }}</span>.
                  Sélectionnez une structure narrative ci-dessous pour les réorganiser selon un ordre spécifique.
                </span>
              </p>
            </div>

            <!-- Affichage de la sélection -->
            <div v-if="selectedEvents.size > 0" class="mt-4 p-4 bg-green-50 border border-green-300 rounded-lg">
              <div class="flex items-center justify-between mb-2">
                <h4 class="text-sm font-semibold text-green-900">
                  ✓ Événements sélectionnés
                </h4>
                <span class="text-xs bg-green-200 text-green-800 px-2 py-1 rounded-full font-medium">
                  {{ selectedEvents.size }} événement(s)
                </span>
              </div>
              <p class="text-xs text-green-700">
                Ces événements seront utilisés comme base pour votre structure narrative.
              </p>
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
                <p class="text-sm text-gray-500">Cliquez sur une structure pour réorganiser les événements ci-dessus</p>
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

          <!-- Prévisualisation de la structure personnalisée -->
          <div v-if="selectedNarrativeStructure && customNarrativeStructure.length > 0" class="bg-gradient-to-br from-purple-50 to-pink-50 rounded-lg border-2 border-purple-200 p-6">
            <div class="flex items-start gap-3 mb-6">
              <div class="w-10 h-10 bg-purple-500 text-white rounded-full flex items-center justify-center font-bold flex-shrink-0">
                ✨
              </div>
              <div>
                <h3 class="text-xl font-semibold text-gray-900 mb-1">
                  Votre plan narratif personnalisé
                </h3>
                <p class="text-sm text-gray-600">
                  Structure <span class="font-medium text-purple-700">{{ selectedNarrativeStructure.name }}</span> avec vos événements sélectionnés
                </p>
              </div>
            </div>

            <div class="space-y-4">
              <div
                v-for="(section, index) in customNarrativeStructure"
                :key="section.sectionName"
                class="bg-white rounded-lg border border-purple-200 overflow-hidden shadow-sm"
              >
                <!-- Section Header -->
                <div class="bg-gradient-to-r from-purple-100 to-pink-100 px-5 py-3 border-b border-purple-200">
                  <div class="flex items-center gap-3">
                    <div class="w-8 h-8 bg-purple-500 text-white rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0">
                      {{ index + 1 }}
                    </div>
                    <h4 class="font-bold text-gray-900 text-base flex-1">{{ section.sectionName }}</h4>
                    <span class="text-xs bg-purple-200 text-purple-800 px-2 py-1 rounded-full font-medium">
                      {{ section.events.length }} événement(s)
                    </span>
                  </div>
                </div>

                <!-- Events List -->
                <div class="p-4">
                  <ul class="space-y-2">
                    <li
                      v-for="event in section.events"
                      :key="event.id"
                      class="flex items-start gap-3 text-sm"
                    >
                      <span
                        class="w-1.5 h-1.5 rounded-full mt-2 flex-shrink-0"
                        :class="event.isOptional ? 'bg-gray-400' : 'bg-purple-600'"
                      ></span>
                      <div class="flex-1">
                        <div class="flex items-center gap-2">
                          <span class="font-medium text-gray-900">{{ event.name }}</span>
                          <span
                            v-if="!event.isOptional"
                            class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-800 border border-amber-300"
                          >
                            Essentiel
                          </span>
                          <span
                            v-else
                            class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-600 border border-gray-300"
                          >
                            Optionnel
                          </span>
                        </div>
                        <div v-if="event.description" class="text-xs text-gray-600 mt-0.5">
                          {{ event.description }}
                        </div>
                      </div>
                    </li>
                  </ul>
                </div>
              </div>
            </div>

            <div class="mt-4 p-3 bg-purple-100 border border-purple-300 rounded-md">
              <p class="text-xs text-purple-800">
                💡 <span class="font-medium">Ce plan sera utilisé pour créer la structure de votre projet.</span>
                Chaque section (ex: "Montée") deviendra une <strong>partie</strong>, et chaque événement dans cette section deviendra une <strong>séquence</strong> que vous pourrez développer.
              </p>
            </div>
          </div>

          <!-- Étape 4: Personnages selon les fonctions dramatiques (après le plan personnalisé) -->
          <div v-if="selectedNarrativeStructure && customNarrativeStructure.length > 0 && dramaticFunctions.length > 0" class="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div class="flex items-center mb-4">
              <div class="w-10 h-10 bg-indigo-500 text-white rounded-full flex items-center justify-center font-bold mr-3">
                4
              </div>
              <div>
                <h3 class="text-xl font-semibold text-gray-900">Personnages principaux (optionnel)</h3>
                <p class="text-sm text-gray-500">
                  Définissez vos personnages selon les fonctions dramatiques de <strong>{{ selectedSubgenre.name }}</strong>
                </p>
              </div>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div
                v-for="dramaticFunction in dramaticFunctions"
                :key="dramaticFunction.id"
                class="p-4 border-2 border-gray-200 rounded-lg hover:border-indigo-300 transition-all"
              >
                <div class="mb-3">
                  <div class="flex items-center gap-2 mb-1">
                    <span class="font-medium text-gray-900">{{ dramaticFunction.name }}</span>
                    <span v-if="!dramaticFunction.isEssential" class="px-2 py-0.5 text-xs bg-gray-100 text-gray-600 rounded">
                      optionnel
                    </span>
                    <span v-else class="px-2 py-0.5 text-xs bg-indigo-100 text-indigo-700 rounded">
                      essentiel
                    </span>
                  </div>
                  <div class="text-xs text-gray-500 mb-3">{{ dramaticFunction.description }}</div>
                </div>

                <div class="space-y-3">
                  <!-- Nom du personnage -->
                  <div class="relative">
                    <label class="block text-xs font-medium text-gray-700 mb-1">Nom du personnage</label>
                    <input
                      :value="getCharacterForFunction(dramaticFunction.id)"
                      @input="(e) => toggleCharacterForFunction(dramaticFunction, (e.target as HTMLInputElement).value)"
                      type="text"
                      :placeholder="`Nom de votre ${dramaticFunction.name.toLowerCase()}`"
                      class="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    />
                    <div v-if="getCharacterForFunction(dramaticFunction.id)" class="absolute right-2 top-7 text-indigo-500">
                      ✓
                    </div>
                  </div>

                  <!-- Arc narratif (si le personnage a un nom) -->
                  <div v-if="getCharacterForFunction(dramaticFunction.id) && dramaticFunction.narrativeArcs && dramaticFunction.narrativeArcs.length > 0">
                    <label class="block text-xs font-medium text-gray-700 mb-1">
                      Arc narratif (optionnel)
                      <span class="text-gray-500 font-normal">- {{ dramaticFunction.narrativeArcs.length }} disponible(s)</span>
                    </label>
                    <select
                      :value="getNarrativeArcForFunction(dramaticFunction.id)"
                      @change="(e) => toggleNarrativeArcForFunction(dramaticFunction.id, (e.target as HTMLSelectElement).value ? parseInt((e.target as HTMLSelectElement).value) : null)"
                      class="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    >
                      <option :value="null">Choisir un arc (optionnel)</option>
                      <option
                        v-for="arc in dramaticFunction.narrativeArcs"
                        :key="arc.id"
                        :value="arc.id"
                      >
                        {{ arc.name }} ({{ arc.tendency === 'positive' ? '↗️' : arc.tendency === 'negative' ? '↘️' : '↔️' }})
                      </option>
                    </select>
                  </div>
                </div>
              </div>
            </div>

            <!-- Résumé des personnages -->
            <div v-if="selectedCharacters.length > 0" class="mt-6 p-4 bg-indigo-50 border-l-4 border-indigo-500 rounded-r-lg">
              <h4 class="font-medium text-gray-900 mb-2">🎭 Vos personnages :</h4>
              <div class="space-y-3">
                <div
                  v-for="character in selectedCharacters"
                  :key="character.dramaticFunctionId"
                  class="flex items-start gap-2 text-sm bg-white p-3 rounded-md border border-indigo-200"
                >
                  <div class="flex-1">
                    <div class="flex items-center gap-2">
                      <strong class="text-indigo-900">{{ character.name }}</strong>
                      <span class="text-indigo-600">→</span>
                      <em class="text-indigo-700">{{ character.dramaticFunctionName }}</em>
                    </div>
                    <div v-if="character.narrativeArcId" class="ml-4 mt-2 pl-3 border-l-2 border-indigo-300">
                      <div class="text-xs font-semibold text-indigo-700">
                        Arc: {{ dramaticFunctions.find((df: any) => df.id === character.dramaticFunctionId)?.narrativeArcs?.find((arc: any) => arc.id === character.narrativeArcId)?.name || 'N/A' }}
                      </div>
                      <div class="text-xs text-gray-600 mt-1 italic">
                        {{ dramaticFunctions.find((df: any) => df.id === character.dramaticFunctionId)?.narrativeArcs?.find((arc: any) => arc.id === character.narrativeArcId)?.description || '' }}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Note sur les modifications ultérieures -->
            <div class="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
              <p class="text-xs text-blue-800">
                💡 <span class="font-medium">Note:</span> Vous pourrez modifier, ajouter ou supprimer des personnages et leurs arcs narratifs à tout moment depuis la page de détail de chaque personnage.
              </p>
            </div>
          </div>

          <!-- Étape 5: Événements narratifs (COMMENTÉ AUSSI) -->
          <div v-if="selectedNarrativeStructure && events.length > 0" class="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div class="flex items-center mb-4">
              <div class="w-10 h-10 bg-blue-500 text-white rounded-full flex items-center justify-center font-bold mr-3">
                5
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
        <div v-if="selectedNarrativeStructure && customNarrativeStructure.length > 0" class="bg-blue-50 border-l-4 border-blue-500 rounded-r-lg p-6 mb-6">
          <div class="flex items-start gap-3">
            <div class="text-2xl">ℹ️</div>
            <div>
              <h3 class="font-semibold text-gray-900 mb-2">À propos de la génération automatique</h3>
              <p class="text-sm text-gray-700 mb-3">
                Nous allons créer automatiquement la structure de votre récit basée sur <strong>{{ selectedNarrativeStructure.name }}</strong> :
              </p>
              <ul class="text-sm text-gray-700 mb-3 space-y-1 list-disc list-inside">
                <li><strong>{{ customNarrativeStructure.length }} partie(s)</strong> correspondant aux sections de la structure narrative</li>
                <li><strong>{{ customNarrativeStructure.reduce((acc, section) => acc + section.events.length, 0) }} séquence(s)</strong> réparties dans ces parties</li>
              </ul>
              <p class="text-sm text-gray-700 mb-3">
                Chaque section (ex: "Montée", "Bascule") deviendra une <strong>partie</strong>, et chaque événement sélectionné deviendra une <strong>séquence</strong> que vous pourrez ensuite développer et personnaliser.
              </p>
              <p v-if="selectedCharacters.length > 0" class="text-sm text-gray-700">
                Les <strong>{{ selectedCharacters.length }} personnage(s)</strong> que vous avez définis seront également créés avec leurs fonctions dramatiques respectives.
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
            {{ isLoading ? '⏳ Création en cours...' : 
               selectedCharacters.length > 0 ? 
               `✨ Créer le projet avec ${selectedCharacters.length} personnage(s)` : 
               '✨ Créer le projet avec cette structure' }}
          </button>
        </div>
      </div>

    </div>
  </div>
</template>

<style scoped>
/* Styles additionnels si nécessaire */
</style>
