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
      <div v-if="isOpen" class="fixed inset-0 z-[200] flex items-center justify-center p-4">
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
              <h3 class="text-base font-semibold text-gray-900">{{ options.title }}</h3>
            </div>

            <!-- Message -->
            <p v-if="options.message" class="text-sm text-gray-500 mb-6 pl-14">{{ options.message }}</p>
            <div v-else class="mb-6" />

            <!-- Boutons -->
            <div class="flex gap-3 justify-end">
              <button
                @click="onCancel"
                class="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
              >
                {{ options.cancelLabel }}
              </button>
              <button
                @click="onConfirm"
                :class="['px-4 py-2 text-sm font-medium text-white rounded-lg transition-colors', options.danger ? 'bg-red-600 hover:bg-red-700' : 'bg-amber-500 hover:bg-amber-600']"
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
import { ExclamationTriangleIcon } from '@heroicons/vue/24/outline';
import { useConfirm } from '~/composables/useConfirm';

const { isOpen, options, onConfirm, onCancel } = useConfirm();
</script>
