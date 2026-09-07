<script setup lang="ts">
import { ref, watch } from 'vue';
import { useProjectStore } from '~/store/project';

const props = defineProps({
  open: { type: Boolean, default: false },
  title: { type: String, default: 'Choisir une séquence' },
  message: { type: String, default: '' },
  confirmLabel: { type: String, default: 'Continuer' },
  /** Séquence à exclure de la liste (celle d'où l'on part, par exemple) */
  excludeId: { type: Number, default: null },
  /** Séquence pré-sélectionnée à l'ouverture */
  initialId: { type: Number, default: null }
});

const emit = defineEmits(['confirm', 'cancel']);

const projectStore = useProjectStore();
const selectedId = ref<number | null>(null);

// Réinitialiser à chaque ouverture, sinon on garde le choix précédent
watch(() => props.open, (open) => {
  if (!open) return;
  selectedId.value = props.initialId
    ?? projectStore.sequences.find(s => s.id !== props.excludeId)?.id
    ?? null;
});

const confirm = () => {
  if (selectedId.value) emit('confirm', selectedId.value);
};
</script>

<template>
  <Teleport to="body">
    <div v-if="open" class="fixed inset-0 z-[150] flex items-center justify-center p-4">
      <div class="absolute inset-0 bg-black/50" @click="emit('cancel')" />

      <div class="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 z-10">
        <h3 class="text-base font-semibold text-gray-900 mb-2">{{ title }}</h3>
        <p v-if="message" class="text-sm text-gray-500 mb-4">{{ message }}</p>

        <select v-model="selectedId" class="w-full border border-gray-300 rounded-lg p-2 text-sm mb-6">
          <optgroup
            v-for="part in projectStore.parts"
            :key="part.id"
            :label="part.name"
          >
            <option
              v-for="sequence in (part.sequences ?? []).filter(s => s.id !== excludeId)"
              :key="sequence.id"
              :value="sequence.id"
            >
              {{ sequence.name }}
            </option>
          </optgroup>
        </select>

        <div class="flex gap-3 justify-end">
          <button
            @click="emit('cancel')"
            class="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
          >
            Annuler
          </button>
          <button
            @click="confirm"
            :disabled="!selectedId"
            :class="['px-4 py-2 text-sm font-medium text-white rounded-lg transition-colors',
                     selectedId ? 'bg-amber-500 hover:bg-amber-600' : 'bg-gray-300 cursor-not-allowed']"
          >
            {{ confirmLabel }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>
