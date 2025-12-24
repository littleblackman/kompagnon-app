<script setup lang="ts">
import { useRoute } from 'vue-router'
import { useAuthStore } from '~/store/auth'
import { useProjectStore } from '~/store/project'
import { useMetadataStore } from '~/store/metadata'
import { onMounted, computed } from 'vue'
import ProjectSubMenu from '@/components/Project/SubMenu.vue'

definePageMeta({
  middleware: 'auth'
})

const auth = useAuthStore()
auth.requireAuth()

const projectStore = useProjectStore()
const metadataStore = useMetadataStore()
const route = useRoute()
const slug = route.params.slug as string

// Charger le projet et les métadonnées au montage
onMounted(async () => {
  await projectStore.fetchProject(slug)
  if (!metadataStore.loaded) {
    await metadataStore.fetchMetadata()
  }
})

const project = computed(() => projectStore.project)

// Récupérer les informations de référence
const referenceComponents = computed(() => {
  if (!project.value?.referenceNarrativeComponents) return null
  return project.value.referenceNarrativeComponents
})

const genreInfo = computed(() => {
  if (!referenceComponents.value?.genre_id) return null
  return metadataStore.genres.find(g => g.id === referenceComponents.value.genre_id)
})

const subgenreInfo = computed(() => {
  if (!referenceComponents.value?.subgenre_id) return null
  return metadataStore.subgenres.find(s => s.id === referenceComponents.value.subgenre_id)
})

const narrativeStructureInfo = computed(() => {
  if (!referenceComponents.value?.narrative_structure_id) return null
  return metadataStore.narrativeStructures.find(n => n.id === referenceComponents.value.narrative_structure_id)
})

const hasReferenceComponents = computed(() => {
  return genreInfo.value || subgenreInfo.value || narrativeStructureInfo.value
})
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
      <h1 class="text-3xl font-bold text-gray-900 mb-2">
        Cadre narratif de référence
      </h1>
      <p class="text-gray-600 mb-8">
        Les choix narratifs initiaux qui ont servi de base à la création de ce projet
      </p>

      <!-- Si pas de composantes de référence -->
      <div v-if="!hasReferenceComponents" class="bg-amber-50 border border-amber-200 rounded-lg p-6">
        <div class="flex items-start gap-3">
          <svg class="w-6 h-6 text-amber-600 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
          </svg>
          <div>
            <h3 class="font-semibold text-amber-900 mb-1">Aucun cadre de référence défini</h3>
            <p class="text-amber-800 text-sm">
              Ce projet n'a pas été créé avec l'aide à la création, ou les informations de référence n'ont pas été enregistrées.
            </p>
          </div>
        </div>
      </div>

      <!-- Si des composantes existent -->
      <div v-else class="space-y-6">
        <!-- Genre -->
        <div v-if="genreInfo" class="bg-white border border-gray-200 rounded-lg p-6">
          <h2 class="text-lg font-semibold text-gray-900 mb-2 flex items-center gap-2">
            <span class="text-2xl">📚</span>
            Genre
          </h2>
          <p class="text-2xl font-bold text-amber-600 mb-2">{{ genreInfo.name }}</p>
          <p v-if="genreInfo.description" class="text-gray-700">{{ genreInfo.description }}</p>
        </div>

        <!-- Sous-genre -->
        <div v-if="subgenreInfo" class="bg-white border border-gray-200 rounded-lg p-6">
          <h2 class="text-lg font-semibold text-gray-900 mb-2 flex items-center gap-2">
            <span class="text-2xl">🎭</span>
            Sous-genre
          </h2>
          <p class="text-2xl font-bold text-amber-600 mb-2">{{ subgenreInfo.name }}</p>
          <p v-if="subgenreInfo.description" class="text-gray-700">{{ subgenreInfo.description }}</p>
        </div>

        <!-- Structure narrative -->
        <div v-if="narrativeStructureInfo" class="bg-white border border-gray-200 rounded-lg p-6">
          <h2 class="text-lg font-semibold text-gray-900 mb-2 flex items-center gap-2">
            <span class="text-2xl">📖</span>
            Structure narrative
          </h2>
          <p class="text-2xl font-bold text-amber-600 mb-2">{{ narrativeStructureInfo.name }}</p>
          <p v-if="narrativeStructureInfo.description" class="text-gray-700 mb-4">{{ narrativeStructureInfo.description }}</p>

          <!-- Étapes de la structure narrative -->
          <div v-if="narrativeStructureInfo.events && narrativeStructureInfo.events.length > 0" class="mt-4">
            <h3 class="font-semibold text-gray-900 mb-3">Étapes de la structure :</h3>
            <div class="space-y-2">
              <div
                v-for="(event, index) in narrativeStructureInfo.events"
                :key="index"
                class="flex items-start gap-3 p-3 bg-gray-50 rounded-lg"
              >
                <span class="flex-shrink-0 w-6 h-6 bg-amber-500 text-white rounded-full flex items-center justify-center text-xs font-bold">
                  {{ index + 1 }}
                </span>
                <div class="flex-1">
                  <p class="font-medium text-gray-900">{{ event.name }}</p>
                  <p v-if="event.description" class="text-sm text-gray-600 mt-1">{{ event.description }}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Note informative -->
        <div class="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-8">
          <div class="flex items-start gap-3">
            <svg class="w-5 h-5 text-blue-600 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
            </svg>
            <p class="text-sm text-blue-800">
              <strong>Note :</strong> Ces éléments constituent le cadre de référence initial de votre projet.
              Votre récit peut évoluer et dériver de ces choix initiaux - ils servent de point de départ et de repère.
            </p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Styles additionnels si nécessaire */
</style>
