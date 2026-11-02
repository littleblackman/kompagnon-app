<script setup lang="ts">
import TodoList from './TodoList.vue';
import NotesList from './NotesList.vue';

defineProps({
  open: { type: Boolean, default: false }
});

const emit = defineEmits(['close', 'open-scene']);
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
              Todo &amp; notes de travail
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
            <TodoList class="mb-6 border-b border-gray-100 pb-6" @open-scene="emit('open-scene', $event)" />
            <NotesList @open-scene="emit('open-scene', $event)" />
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>
