<script setup lang="ts">
import { nextTick, ref, watch } from 'vue';
import { usePrompt } from '~/composables/usePrompt';

const { isOpen, options, value, onConfirm, onCancel } = usePrompt();

const inputRef = ref<HTMLInputElement | null>(null);
let previousActive: HTMLElement | null = null;

// Capture + stopPropagation : d'autres écrans écoutent déjà keydown sur window
const onKeydown = (e: KeyboardEvent) => {
  if (e.key === 'Escape') {
    e.stopPropagation();
    e.preventDefault();
    onCancel();
  } else if (e.key === 'Enter') {
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
    inputRef.value?.focus();
    inputRef.value?.select();
  } else {
    window.removeEventListener('keydown', onKeydown, true);
    previousActive?.focus?.();
    previousActive = null;
  }
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
      <div
        v-if="isOpen"
        class="fixed inset-0 z-[200] flex items-center justify-center p-4"
        role="dialog"
        aria-modal="true"
      >
        <div class="absolute inset-0 bg-black/50" @click="onCancel" />

        <div class="relative z-10 w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl">
          <h3 class="mb-2 text-base font-semibold text-gray-900">{{ options.title }}</h3>
          <p v-if="options.message" class="mb-4 text-sm text-gray-500">{{ options.message }}</p>

          <input
            ref="inputRef"
            v-model="value"
            type="text"
            :placeholder="options.placeholder"
            :class="['mb-6 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm',
                     'focus:border-transparent focus:outline-none focus:ring-2 focus:ring-amber-400',
                     options.uppercase && 'uppercase']"
          />

          <div class="flex justify-end gap-3">
            <button
              @click="onCancel"
              class="rounded-lg bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-200"
            >
              {{ options.cancelLabel }}
            </button>
            <button
              @click="onConfirm"
              :disabled="!value.trim()"
              :class="['rounded-lg px-4 py-2 text-sm font-medium text-white transition-colors',
                       value.trim() ? 'bg-amber-500 hover:bg-amber-600' : 'cursor-not-allowed bg-gray-300']"
            >
              {{ options.confirmLabel }}
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>
