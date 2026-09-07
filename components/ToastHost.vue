<script setup lang="ts">
import { CheckCircleIcon, ExclamationCircleIcon, InformationCircleIcon, XMarkIcon } from '@heroicons/vue/24/outline';
import { useToast } from '~/composables/useToast';

const { toasts, dismiss } = useToast();

const ICONS = {
  success: CheckCircleIcon,
  error: ExclamationCircleIcon,
  info: InformationCircleIcon,
};

const STYLES = {
  success: 'border-green-200 bg-green-50 text-green-800',
  error: 'border-red-200 bg-red-50 text-red-800',
  info: 'border-amber-200 bg-amber-50 text-amber-800',
};
</script>

<template>
  <Teleport to="body">
    <!-- z inférieur aux modales : un message ne doit pas masquer une décision -->
    <div class="fixed bottom-4 left-4 z-[190] flex flex-col gap-2 print:hidden">
      <TransitionGroup
        enter-active-class="transition duration-200 ease-out"
        enter-from-class="opacity-0 translate-y-2"
        enter-to-class="opacity-100 translate-y-0"
        leave-active-class="transition duration-150 ease-in absolute"
        leave-from-class="opacity-100"
        leave-to-class="opacity-0 -translate-x-2"
      >
        <div
          v-for="toast in toasts"
          :key="toast.id"
          :class="['flex items-start gap-3 max-w-sm rounded-lg border px-4 py-3 shadow-lg', STYLES[toast.kind]]"
          role="status"
        >
          <component :is="ICONS[toast.kind]" class="mt-0.5 h-5 w-5 flex-shrink-0" />
          <p class="flex-1 text-sm leading-snug">{{ toast.message }}</p>
          <button
            @click="dismiss(toast.id)"
            class="-mr-1 -mt-1 rounded p-1 opacity-50 hover:opacity-100 transition-opacity"
            aria-label="Fermer"
          >
            <XMarkIcon class="h-4 w-4" />
          </button>
        </div>
      </TransitionGroup>
    </div>
  </Teleport>
</template>
