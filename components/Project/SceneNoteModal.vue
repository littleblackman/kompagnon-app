<script setup lang="ts">
import { nextTick, ref, watch } from 'vue';

const props = defineProps({
  open: { type: Boolean, default: false },
  /** Nom de la scène, pour situer la note sans en-tête lourd */
  sceneName: { type: String, default: '' },
  modelValue: { type: String, default: '' }
});

const emit = defineEmits(['update:modelValue', 'close']);

const draft = ref('');
const textareaRef = ref<HTMLTextAreaElement | null>(null);

watch(() => props.open, async (open) => {
  if (!open) return;
  draft.value = props.modelValue ?? '';
  await nextTick();
  textareaRef.value?.focus();
});

// Fermer vaut enregistrer : on ne demande pas de valider un post-it.
const close = () => {
  emit('update:modelValue', draft.value);
  emit('close');
};
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
      <div
        v-if="open"
        class="fixed inset-0 z-[180] flex items-center justify-center p-4"
        @keydown.escape="close"
      >
        <!-- Voile léger : le post-it flotte, il ne condamne pas la page -->
        <div class="absolute inset-0 bg-black/20" @click="close" />

        <Transition
          enter-active-class="transition duration-200 ease-out"
          enter-from-class="opacity-0 scale-95 -rotate-2"
          enter-to-class="opacity-100 scale-100 -rotate-1"
        >
          <div
            v-if="open"
            class="relative z-10 w-full max-w-sm -rotate-1 rounded-sm bg-amber-100 p-5 shadow-2xl"
          >
            <!-- Pas d'en-tête ni de bordure : juste le papier -->
            <p v-if="sceneName" class="mb-2 text-[11px] uppercase tracking-wide text-amber-700/70">
              {{ sceneName }}
            </p>

            <textarea
              ref="textareaRef"
              v-model="draft"
              rows="8"
              placeholder="À retravailler, vérifier la chronologie…"
              class="w-full resize-none border-0 bg-transparent p-0 text-[15px] leading-relaxed
                     text-amber-950 placeholder-amber-600/50 focus:outline-none focus:ring-0"
            ></textarea>

            <button
              type="button"
              @click="close"
              class="absolute right-2 top-2 rounded-full p-1 text-amber-700/40
                     hover:bg-amber-200/70 hover:text-amber-800 transition-colors"
              aria-label="Fermer la note"
            >
              <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            <p class="mt-2 text-[11px] text-amber-700/60">
              Enregistrée à la fermeture. Jamais exportée.
            </p>
          </div>
        </Transition>
      </div>
    </Transition>
  </Teleport>
</template>
