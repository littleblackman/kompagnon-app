<script setup lang="ts">
import { PlusIcon } from '@heroicons/vue/24/outline';

defineProps({
  /** Ce qu'on insère : « Scène », « Séquence », « Partie » */
  label: {
    type: String,
    required: true
  },
  /** Rendu compact pour les listes denses (scènes) */
  dense: {
    type: Boolean,
    default: false
  }
});

defineEmits(['insert']);
</script>

<template>
  <!--
    Zone d'insertion discrète, entre deux éléments.
    Invisible au repos sur desktop, mais toujours visible au doigt :
    le survol n'existe pas sur mobile.
  -->
  <div
    :class="[
      'group relative print:hidden',
      dense ? 'h-4 -my-1' : 'h-5 -my-1.5'
    ]"
  >
    <div
      class="absolute inset-x-0 top-1/2 -translate-y-1/2 flex items-center gap-2
             opacity-100 sm:opacity-0 sm:group-hover:opacity-100 focus-within:opacity-100
             transition-opacity duration-150"
    >
      <span class="h-px flex-1 bg-amber-200/70"></span>
      <button
        type="button"
        @click="$emit('insert')"
        :title="`Insérer une ${label.toLowerCase()} ici`"
        class="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-white
               px-2 py-0.5 text-[11px] font-medium text-amber-700 whitespace-nowrap
               hover:bg-amber-50 hover:border-amber-300
               focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
      >
        <PlusIcon class="h-3 w-3" />
        {{ label }}
      </button>
      <span class="h-px flex-1 bg-amber-200/70"></span>
    </div>
  </div>
</template>
