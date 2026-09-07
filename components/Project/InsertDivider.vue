<script setup lang="ts">
import { computed } from 'vue';
import { PlusIcon } from '@heroicons/vue/24/outline';

const props = defineProps({
  /** Ce qu'on insère : « Scène », « Séquence », « Partie » */
  label: {
    type: String,
    required: true
  },
  /**
   * Rendu compact : un simple « + » et le libellé en tooltip.
   * Pour les listes denses (scènes), où une pastille texte entre chaque
   * élément alourdirait la lecture.
   */
  dense: {
    type: Boolean,
    default: false
  }
});

defineEmits(['insert']);

const tooltip = computed(() => `Insérer une ${props.label.toLowerCase()} ici`);
</script>

<template>
  <!--
    Zone d'insertion entre deux éléments : une ligne fine et un simple « + ».
    Le libellé passe dans l'infobulle maison, activée par
    data-controller="tooltip".
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
      data-controller="tooltip" :title="tooltip"
      :aria-label="tooltip"
      :class="[
        'inline-flex items-center justify-center rounded-full',
        'border border-amber-200 bg-white text-amber-500 whitespace-nowrap',
        'group-hover/divider:border-amber-400 group-hover/divider:text-amber-700',
        'group-hover/divider:bg-amber-50 transition-colors',
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400',
        dense ? 'h-5 w-5' : 'gap-1 px-2 py-0.5 text-[11px] font-medium'
      ]"
    >
      <PlusIcon class="h-3 w-3" />
      <span v-if="!dense">{{ label }}</span>
    </button>

    <span class="h-px flex-1 bg-amber-200 group-hover/divider:bg-amber-400 transition-colors"></span>
  </div>
</template>

