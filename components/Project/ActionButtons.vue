<script setup lang="ts">
import { ref } from '#imports'
import type { Part, Sequence, Scene } from '~/types'
import PartModal from './PartModal.vue'
import SequenceModal from './SequenceModal.vue'
import SceneModal from './SceneModal.vue'

interface Props {
  projectId: number
}

const props = defineProps<Props>()

const modalType = ref<'part' | 'sequence' | 'scene' | null>(null)
const modalOpen = ref(false)

const openModal = (type: 'part' | 'sequence' | 'scene') => {
  modalType.value = type
  modalOpen.value = true
}

const closeModal = () => {
  modalOpen.value = false
  modalType.value = null
}
</script>

<template>
  <div>
    <!-- Barre flottante globale -->
    <div class="fixed bottom-4 right-4 flex flex-col gap-3 z-50">
      <button
        @click="openModal('part')"
        class="bg-amber-600 hover:bg-amber-700 text-white font-bold py-2 px-4 rounded-full shadow-lg"
      >
        + Partie
      </button>
      <button
        @click="openModal('sequence')"
        class="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-full shadow-lg"
      >
        + Séquence
      </button>
      <button
        @click="openModal('scene')"
        class="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-full shadow-lg"
      >
        + Scène
      </button>
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
    />
    <SceneModal
      v-if="modalOpen && modalType === 'scene'"
      :projectId="projectId"
      @close="closeModal"
    />
  </div>
</template> 