<script setup lang="ts">
import { ref } from '#imports'
import { useProjectStore } from '~/store/project'
import { 
  ChevronDoubleUpIcon, 
  ChevronDoubleDownIcon,
  PlusIcon,
  FunnelIcon,
  ArrowsUpDownIcon
} from '@heroicons/vue/24/outline'
import type { Part, Sequence, Scene } from '~/types'
import PartModal from './PartModal.vue'
import SequenceModal from './SequenceModal.vue'
import SceneModal from './SceneModal.vue'

interface Props {
  projectId: number
}

const props = defineProps<Props>()
const projectStore = useProjectStore()

const modalType = ref<'part' | 'sequence' | 'scene' | null>(null)
const modalOpen = ref(false)
const isMenuOpen = ref(false)

// Actions de navigation
const collapseAll = () => {
  projectStore.collapseAllParts()
}

const expandAll = () => {
  projectStore.expandAllParts()
}

// Actions de création
const openModal = (type: 'part' | 'sequence' | 'scene') => {
  modalType.value = type
  modalOpen.value = true
  isMenuOpen.value = false
}

const closeModal = () => {
  modalOpen.value = false
  modalType.value = null
}

// Actions de vue
const toggleSort = () => {
  projectStore.toggleSort()
}

const toggleFilter = () => {
  projectStore.toggleFilter()
}

// Gestion de la sauvegarde des séquences
const handleSaveSequence = async ({ sequence, afterSequenceId }) => {
  try {
    await projectStore.saveSequence(sequence, sequence.part_id, afterSequenceId)
    closeModal()
  } catch (error) {
    console.error("Erreur lors de la sauvegarde :", error)
  }
}
</script>

<template>
  <div>
    <!-- Menu flottant -->
    <div class="fixed bottom-4 right-4 flex flex-col gap-3 z-50">
      <!-- Bouton principal -->
      <button
        @click="isMenuOpen = !isMenuOpen"
        class="bg-amber-600 hover:bg-amber-700 text-white font-bold p-3 rounded-full shadow-lg"
      >
        <PlusIcon class="w-6 h-6" />
      </button>

      <!-- Menu déroulant -->
      <div v-if="isMenuOpen" class="absolute bottom-16 right-0 bg-white rounded-lg shadow-xl p-2 w-48">
        <!-- Section Navigation -->
        <div class="border-b pb-2 mb-2">
          <h3 class="text-xs font-semibold text-gray-500 px-2 mb-1">Navigation</h3>
          <button
            @click="collapseAll"
            class="w-full text-left px-2 py-1 text-sm hover:bg-gray-100 rounded flex items-center gap-2"
          >
            <ChevronDoubleUpIcon class="w-4 h-4" />
            Réduire tout
          </button>
          <button
            @click="expandAll"
            class="w-full text-left px-2 py-1 text-sm hover:bg-gray-100 rounded flex items-center gap-2"
          >
            <ChevronDoubleDownIcon class="w-4 h-4" />
            Développer tout
          </button>
        </div>

        <!-- Section Création -->
        <div class="border-b pb-2 mb-2">
          <h3 class="text-xs font-semibold text-gray-500 px-2 mb-1">Création</h3>
          <button
            @click="openModal('part')"
            class="w-full text-left px-2 py-1 text-sm hover:bg-gray-100 rounded"
          >
            + Partie
          </button>
          <button
            @click="openModal('sequence')"
            class="w-full text-left px-2 py-1 text-sm hover:bg-gray-100 rounded"
          >
            + Séquence
          </button>
          <button
            @click="openModal('scene')"
            class="w-full text-left px-2 py-1 text-sm hover:bg-gray-100 rounded"
          >
            + Scène
          </button>
        </div>

        <!-- Section Vue -->
        <div>
          <h3 class="text-xs font-semibold text-gray-500 px-2 mb-1">Vue</h3>
          <button
            @click="toggleSort"
            class="w-full text-left px-2 py-1 text-sm hover:bg-gray-100 rounded flex items-center gap-2"
          >
            <ArrowsUpDownIcon class="w-4 h-4" />
            Trier
          </button>
          <button
            @click="toggleFilter"
            class="w-full text-left px-2 py-1 text-sm hover:bg-gray-100 rounded flex items-center gap-2"
          >
            <FunnelIcon class="w-4 h-4" />
            Filtrer
          </button>
        </div>
      </div>
    </div>

    <!-- Modales -->
    <PartModal
      v-if="modalOpen && modalType === 'part'"
      :projectId="projectId"
      @close="closeModal"
    />
    <SequenceModal
      v-if="modalOpen && modalType === 'sequence'"
      :projectId="projectId"
      @close="closeModal"
      @save="handleSaveSequence"
    />
    <SceneModal
      v-if="modalOpen && modalType === 'scene'"
      :projectId="projectId"
      @close="closeModal"
    />
  </div>
</template> 