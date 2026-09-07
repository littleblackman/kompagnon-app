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
    Zone d'insertion entre deux éléments.
    Discrète mais toujours visible : cachée derrière un survol, elle était
    introuvable — il fallait viser une bande de quelques pixels.
    Le contraste monte au survol pour confirmer la cible.
  -->
  <div
    :class="[
      'group/divider relative flex items-center gap-2 print:hidden cursor-pointer',
      dense ? 'py-1' : 'py-1.5'
    ]"
    @click="$emit('insert')"
  >
    <span class="h-px flex-1 bg-amber-200 group-hover/divider:bg-amber-400 transition-colors"></span>

    <button
      type="button"
      @click.stop="$emit('insert')"
      :title="`Insérer une ${label.toLowerCase()} ici`"
      class="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-white
             px-2 py-0.5 text-[11px] font-medium text-amber-600 whitespace-nowrap
             group-hover/divider:border-amber-400 group-hover/divider:text-amber-800
             group-hover/divider:bg-amber-50 transition-colors
             focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
    >
      <PlusIcon class="h-3 w-3" />
      {{ label }}
    </button>

    <span class="h-px flex-1 bg-amber-200 group-hover/divider:bg-amber-400 transition-colors"></span>
  </div>
</template>
