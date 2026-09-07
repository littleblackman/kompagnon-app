<script setup lang="ts">
import { computed } from 'vue';
import { useProjectStore } from '~/store/project';
import { toRoman } from '~/utils/roman';

defineProps({
  open: { type: Boolean, default: false }
});

const emit = defineEmits(['close', 'open-scene']);

const projectStore = useProjectStore();

/**
 * Toutes les notes du projet, dans l'ordre du récit, avec leur chemin.
 * Sans le chemin, une note sortie de son contexte ne veut plus rien dire.
 */
const notes = computed(() => {
  const rows: Array<{
    sceneId: number;
    sceneName: string;
    path: string;
    note: string;
  }> = [];

  projectStore.parts.forEach((part, partIndex) => {
    (part.sequences ?? []).forEach((sequence) => {
      (sequence.scenes ?? []).forEach((scene: any) => {
        if (!scene.notes?.trim()) return;
        rows.push({
          sceneId: scene.id,
          sceneName: scene.name || 'Sans titre',
          path: `${toRoman(partIndex + 1)}. ${part.name} › ${sequence.name}`,
          note: scene.notes
        });
      });
    });
  });

  return rows;
});
</script>

<template>
  <Teleport to="body">
    <Transition
      enter-active-class="transition duration-150 ease-out"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="transition duration-100 ease-in"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div v-if="open" class="fixed inset-0 z-[170] flex items-center justify-center p-4">
        <div class="absolute inset-0 bg-black/30" @click="emit('close')" />

        <div class="relative z-10 flex max-h-[80vh] w-full max-w-2xl flex-col rounded-2xl bg-white shadow-2xl">
          <div class="flex items-center justify-between border-b border-gray-100 px-6 py-4">
            <h3 class="text-base font-semibold text-gray-900">
              Notes de travail
              <span v-if="notes.length" class="ml-2 text-sm font-normal text-gray-400">
                {{ notes.length }}
              </span>
            </h3>
            <button
              @click="emit('close')"
              class="rounded-full p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
              aria-label="Fermer"
            >
              <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div class="flex-1 overflow-y-auto px-6 py-4">
            <p v-if="!notes.length" class="py-8 text-center text-sm italic text-gray-400">
              Aucune note pour l'instant.
            </p>

            <ul v-else class="space-y-3">
              <li
                v-for="row in notes"
                :key="row.sceneId"
                class="cursor-pointer rounded-sm bg-amber-100/70 p-4 shadow-sm transition-shadow hover:shadow-md"
                @click="emit('open-scene', row.sceneId)"
              >
                <p class="mb-1 text-[11px] uppercase tracking-wide text-amber-700/70">
                  {{ row.path }}
                </p>
                <p class="mb-2 text-sm font-semibold text-amber-950">{{ row.sceneName }}</p>
                <p class="whitespace-pre-wrap text-sm leading-relaxed text-amber-950/90">{{ row.note }}</p>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>
