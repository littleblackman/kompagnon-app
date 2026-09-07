<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from '#imports'
import { useProjectStore } from '~/store/project'
import {
  ChevronDoubleUpIcon,
  ChevronDoubleDownIcon,
  PlusIcon
} from '@heroicons/vue/24/outline'
import PartModal from './PartModal.vue'
import SequenceModal from './SequenceModal.vue'
import SceneModal from './SceneModal.vue'

interface Props {
  projectId: number
}

defineProps<Props>()
const projectStore = useProjectStore()

const modalType = ref<'part' | 'sequence' | 'scene' | null>(null)
const modalOpen = ref(false)
const isMenuOpen = ref(false)
const menuRef = ref<HTMLElement | null>(null)

// Une scène ne peut pas naître hors d'une séquence : le menu global n'ayant
// aucun contexte, on demande la séquence cible avant d'ouvrir l'éditeur.
const sequencePickerOpen = ref(false)
const pickedSequenceId = ref<number | null>(null)

const targetSequence = computed(() =>
  projectStore.sequences.find(s => s.id === pickedSequenceId.value) ?? null
)

const blankScene = computed(() => ({
  id: undefined,
  name: '',
  description: '',
  content: '',
  status: [],
  sequenceId: pickedSequenceId.value
}))

// Insérer à la fin de la séquence choisie
const lastSceneId = computed(() => {
  const scenes = [...(targetSequence.value?.scenes ?? [])].sort((a, b) => a.position - b.position)
  return scenes.length ? scenes[scenes.length - 1].id : null
})

const collapseAll = () => projectStore.collapseAllParts()
const expandAll = () => projectStore.expandAllParts()

/**
 * Repère l'élément le plus proche du haut de la fenêtre pour créer là où
 * l'utilisateur est en train de lire, plutôt qu'au début du projet.
 * Les titres portent déjà les ancres `part-{id}` et `sequence-{id}`.
 */
const detectVisibleId = (prefix: 'part' | 'sequence'): number | null => {
  if (!import.meta.client) return null

  const nodes = document.querySelectorAll(`[id^="${prefix}-"]`)
  if (!nodes.length) return null

  const anchor = window.innerHeight * 0.3
  let best: number | null = null
  let bestDistance = Infinity

  for (const node of nodes) {
    const id = Number(node.id.slice(prefix.length + 1))
    if (!Number.isInteger(id) || id <= 0) continue

    const rect = (node as HTMLElement).getBoundingClientRect()
    if (rect.height === 0) continue // replié ou masqué

    const distance = Math.abs(rect.top - anchor)
    if (distance < bestDistance) {
      bestDistance = distance
      best = id
    }
  }

  return best
}

// Contexte repéré à l'ouverture, pour créer à l'endroit où l'on lit
const visiblePartId = ref<number | null>(null)
const insertAfterPartId = ref<number | null>(null)
const insertAfterSequenceId = ref<number | null>(null)

const openModal = (type: 'part' | 'sequence' | 'scene') => {
  isMenuOpen.value = false

  if (type === 'scene') {
    const visible = detectVisibleId('sequence')
    if (visible) {
      // On crée directement dans la séquence en cours de lecture
      pickedSequenceId.value = visible
      modalType.value = 'scene'
      modalOpen.value = true
      return
    }
    // Aucune séquence repérable : on demande
    pickedSequenceId.value = projectStore.sequences[0]?.id ?? null
    sequencePickerOpen.value = true
    return
  }

  if (type === 'part') {
    insertAfterPartId.value = detectVisibleId('part')
  }

  if (type === 'sequence') {
    const partId = detectVisibleId('part')
    visiblePartId.value = partId

    // N'insérer après la séquence visible que si elle appartient bien à cette
    // partie, sinon le point d'insertion viendrait d'ailleurs dans le projet.
    const sequenceId = detectVisibleId('sequence')
    const part = projectStore.parts.find(p => p.id === partId)
    const belongs = (part?.sequences ?? []).some(s => s.id === sequenceId)
    insertAfterSequenceId.value = belongs ? sequenceId : null
  }

  modalType.value = type
  modalOpen.value = true
}

const confirmSequencePick = () => {
  if (!pickedSequenceId.value) return
  sequencePickerOpen.value = false
  modalType.value = 'scene'
  modalOpen.value = true
}

const closeModal = () => {
  modalOpen.value = false
  modalType.value = null
  pickedSequenceId.value = null
  visiblePartId.value = null
  insertAfterPartId.value = null
  insertAfterSequenceId.value = null
}

const handleSaveSequence = async ({ sequence, afterSequenceId }) => {
  try {
    await projectStore.saveSequence(sequence, sequence.part_id, afterSequenceId)
    closeModal()
  } catch (error) {
    console.error("Erreur lors de la sauvegarde :", error)
  }
}

// Fermer le menu au clic extérieur — sinon il reste ouvert par-dessus le contenu
const onClickOutside = (e: MouseEvent) => {
  if (isMenuOpen.value && menuRef.value && !menuRef.value.contains(e.target as Node)) {
    isMenuOpen.value = false
  }
}
onMounted(() => document.addEventListener('click', onClickOutside))
onUnmounted(() => document.removeEventListener('click', onClickOutside))
</script>

<template>
  <div>
    <!-- Menu flottant -->
    <div ref="menuRef" class="fixed bottom-4 right-4 flex flex-col gap-3 z-50 print:hidden">
      <button
        @click="isMenuOpen = !isMenuOpen"
        :title="isMenuOpen ? 'Fermer le menu' : 'Ajouter / naviguer'"
        class="bg-amber-600 hover:bg-amber-700 text-white font-bold p-3 rounded-full shadow-lg transition-transform"
        :class="isMenuOpen ? 'rotate-45' : ''"
      >
        <PlusIcon class="w-6 h-6" />
      </button>

      <div v-if="isMenuOpen" class="absolute bottom-16 right-0 bg-white rounded-lg shadow-xl p-2 w-48">
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

        <div>
          <h3 class="text-xs font-semibold text-gray-500 px-2 mb-1">Création</h3>
          <button
            @click="openModal('part')"
            class="w-full text-left px-2 py-1 text-sm hover:bg-gray-100 rounded"
          >
            + Partie
          </button>
          <button
            @click="openModal('sequence')"
            :disabled="!projectStore.parts.length"
            :class="['w-full text-left px-2 py-1 text-sm rounded',
                     projectStore.parts.length ? 'hover:bg-gray-100' : 'text-gray-300 cursor-not-allowed']"
            :title="projectStore.parts.length ? '' : 'Créez d\'abord une partie'"
          >
            + Séquence
          </button>
          <button
            @click="openModal('scene')"
            :disabled="!projectStore.sequences.length"
            :class="['w-full text-left px-2 py-1 text-sm rounded',
                     projectStore.sequences.length ? 'hover:bg-gray-100' : 'text-gray-300 cursor-not-allowed']"
            :title="projectStore.sequences.length ? '' : 'Créez d\'abord une séquence'"
          >
            + Scène
          </button>
        </div>
      </div>
    </div>

    <!-- Choix de la séquence cible avant de créer une scène -->
    <Teleport to="body">
      <div
        v-if="sequencePickerOpen"
        class="fixed inset-0 z-[150] flex items-center justify-center p-4"
      >
        <div class="absolute inset-0 bg-black/50" @click="sequencePickerOpen = false" />
        <div class="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 z-10">
          <h3 class="text-base font-semibold text-gray-900 mb-4">Dans quelle séquence ?</h3>

          <select v-model="pickedSequenceId" class="w-full border rounded-lg p-2 text-sm mb-6">
            <optgroup v-for="part in projectStore.parts" :key="part.id" :label="part.name">
              <option v-for="seq in part.sequences ?? []" :key="seq.id" :value="seq.id">
                {{ seq.name }}
              </option>
            </optgroup>
          </select>

          <div class="flex gap-3 justify-end">
            <button
              @click="sequencePickerOpen = false"
              class="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg"
            >
              Annuler
            </button>
            <button
              @click="confirmSequencePick"
              :disabled="!pickedSequenceId"
              :class="['px-4 py-2 text-sm font-medium text-white rounded-lg',
                       pickedSequenceId ? 'bg-amber-500 hover:bg-amber-600' : 'bg-gray-300 cursor-not-allowed']"
            >
              Continuer
            </button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- Modales -->
    <PartModal
      v-if="modalOpen && modalType === 'part'"
      :part="null"
      :projectId="projectId"
      :insert-after-id="insertAfterPartId"
      @close="closeModal"
    />
    <SequenceModal
      v-if="modalOpen && modalType === 'sequence'"
      :sequence="null"
      :projectId="projectId"
      :part-id="visiblePartId"
      :insert-after-id="insertAfterSequenceId"
      @close="closeModal"
      @save="handleSaveSequence"
    />
    <SceneModal
      v-if="modalOpen && modalType === 'scene' && targetSequence"
      :scene="blankScene"
      :projectId="projectId"
      :sequenceId="targetSequence.id"
      :availableScenes="targetSequence.scenes ?? []"
      :insert-after-id="lastSceneId"
      @close="closeModal"
      @save="closeModal"
    />
  </div>
</template>
