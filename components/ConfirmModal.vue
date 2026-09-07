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
        v-if="isOpen"
        class="fixed inset-0 z-[200] flex items-center justify-center p-4"
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-modal-title"
      >
        <!-- Backdrop -->
        <div class="absolute inset-0 bg-black/50" @click="onCancel" />

        <!-- Modal -->
        <Transition
          enter-active-class="transition duration-150 ease-out"
          enter-from-class="opacity-0 scale-95"
          enter-to-class="opacity-100 scale-100"
        >
          <div v-if="isOpen" class="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 z-10">
            <!-- Icône -->
            <div class="flex items-center gap-4 mb-4">
              <div :class="['w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0', options.danger ? 'bg-red-100' : 'bg-amber-100']">
                <ExclamationTriangleIcon :class="['w-5 h-5', options.danger ? 'text-red-600' : 'text-amber-600']" />
              </div>
              <h3 id="confirm-modal-title" class="text-base font-semibold text-gray-900">{{ options.title }}</h3>
            </div>

            <!-- Message -->
            <p v-if="options.message" class="text-sm text-gray-500 mb-4 pl-14">{{ options.message }}</p>

            <!-- Détails -->
            <ul v-if="options.details?.length" class="mb-4 pl-14 space-y-1">
              <li
                v-for="(detail, i) in options.details"
                :key="i"
                class="text-sm text-gray-500 flex gap-2"
              >
                <span :class="options.danger ? 'text-red-400' : 'text-amber-400'">•</span>
                <span>{{ detail }}</span>
              </li>
            </ul>

            <!-- Saisie de confirmation -->
            <div v-if="options.requireText" class="mb-4 pl-14">
              <label :for="inputId" class="block text-sm text-gray-500 mb-1">
                Tapez <strong class="font-semibold text-gray-700">{{ options.requireText }}</strong> pour confirmer
              </label>
              <input
                :id="inputId"
                ref="inputRef"
                v-model="inputValue"
                type="text"
                autocomplete="off"
                class="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent"
              />
            </div>

            <div v-if="!options.message && !options.details?.length && !options.requireText" class="mb-6" />

            <!-- Boutons -->
            <div class="flex gap-3 justify-end mt-2">
              <button
                ref="cancelRef"
                @click="onCancel"
                class="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
              >
                {{ options.cancelLabel }}
              </button>
              <button
                @click="onConfirm"
                :disabled="!canConfirm"
                :class="[
                  'px-4 py-2 text-sm font-medium text-white rounded-lg transition-colors',
                  !canConfirm
                    ? 'bg-gray-300 cursor-not-allowed'
                    : options.danger ? 'bg-red-600 hover:bg-red-700' : 'bg-amber-500 hover:bg-amber-600'
                ]"
              >
                {{ options.confirmLabel }}
              </button>
            </div>
          </div>
        </Transition>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { nextTick, ref, watch } from 'vue';
import { ExclamationTriangleIcon } from '@heroicons/vue/24/outline';
import { useConfirm } from '~/composables/useConfirm';

const { isOpen, options, inputValue, canConfirm, onConfirm, onCancel } = useConfirm();

const inputId = 'confirm-modal-input';
const inputRef = ref<HTMLInputElement | null>(null);
const cancelRef = ref<HTMLButtonElement | null>(null);
let previousActive: HTMLElement | null = null;

// Capture + stopPropagation : SceneModal écoute déjà keydown sur window.
// Sans ça, une touche traitée ici serait aussi traitée par la modale du dessous.
const onKeydown = (e: KeyboardEvent) => {
  if (e.key === 'Escape') {
    e.stopPropagation();
    e.preventDefault();
    onCancel();
  } else if (e.key === 'Enter' && canConfirm.value) {
    e.stopPropagation();
    e.preventDefault();
    onConfirm();
  }
};

watch(isOpen, async (open) => {
  if (!import.meta.client) return;

  if (open) {
    previousActive = document.activeElement as HTMLElement | null;
    window.addEventListener('keydown', onKeydown, true);
    await nextTick();
    // Focus par défaut sur Annuler : pour une action destructrice, la touche
    // la plus accessible ne doit pas être celle qui détruit.
    (inputRef.value ?? cancelRef.value)?.focus();
  } else {
    window.removeEventListener('keydown', onKeydown, true);
    previousActive?.focus?.();
    previousActive = null;
  }
});
</script>
